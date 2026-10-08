#!/usr/bin/env node
/**
 * Scheduled, change-driven refresh of every GTFS static snapshot that is published to the
 * next-train-gtfs Blob store by hand-run scripts (docs/jim-brief-scheduled-snapshot-refresh.md).
 * The Vercel cron (lib/gtfs-refresh.js) only covers canberra / newcastle / brisbane / gold-coast;
 * Melbourne went stale on 6 Oct 2026 and Prague's snapshot would have expired on 11 Oct because
 * nothing re-ran these publishers. Run daily by .github/workflows/refresh-hand-published-gtfs.yml.
 *
 * Per unit (a city, or Melbourne's two zips which share one upstream):
 *   1. Read gtfs/<city>.json (manifest). Cheap upstream probe (HEAD: ETag / Last-Modified).
 *   2. Refresh only when decideRefresh() says so: no/changed upstream version, a snapshot whose
 *      calendar ends within 7 days, or (probe-less Trafiklab cities) a manifest older than 7 days.
 *   3. Refresh = the city's existing trim script(s) + publish script (child processes, so exactly
 *      the code a human would run), then fetch the published zip back, verify the calendar,
 *      and write the manifest.
 * Unchanged units cost one HEAD plus one tiny manifest read. Any failure, or a snapshot that is
 * still expired after the run, makes the whole run exit 1 (the workflow then fails loudly).
 *
 * Usage: node scripts/refresh-hand-published-gtfs.mjs [--dry-run] [--force] [--cities=a,b]
 * Secrets: BLOB_READ_WRITE_TOKEN always; TRAFIKLAB_API_KEY when malmo/uppsala are selected.
 */
import { spawnSync } from "child_process";
import { appendFileSync } from "fs";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";
import { unzipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  probeUpstreamChanged,
} from "../lib/providers/gtfs/snapshot-manifest.js";
import { REJSEPLANEN_GTFS_STATIC_URL } from "../lib/providers/rejseplanen.js";
import { STATEWIDE_GTFS_URL } from "./trim-melbourne-gtfs.mjs";

export const EXPIRY_WINDOW_DAYS = 7;
export const MAX_AGE_DAYS_WITHOUT_PROBE = 7;

const fixturePublish = (city, trimScript) => [
  ["node", [`scripts/${trimScript}`, `--out=qa/fixtures/${city}/gtfs`]],
  ["node", ["scripts/publish-gtfs-fixture-to-blob.mjs", city, "--allow-live"]],
];

/**
 * One entry per hand-published, live, Blob-backed city (or group sharing an upstream).
 * qa/hand-published-snapshot-coverage-gate.mjs fails if a live city that reads
 * gtfsFixtureBlobUrl() is neither listed here nor in AUTO_REFRESHED_ELSEWHERE.
 */
export const REFRESH_UNITS = [
  {
    id: "prague",
    blobCities: ["prague"],
    probeUrl: "https://data.pid.cz/PID_GTFS.zip",
    commands: fixturePublish("prague", "trim-prague-gtfs.mjs"),
  },
  {
    id: "dublin",
    blobCities: ["dublin"],
    probeUrl: "https://www.transportforireland.ie/transitData/Data/GTFS_LUAS.zip",
    commands: fixturePublish("dublin", "trim-dublin-gtfs.mjs"),
  },
  {
    id: "copenhagen",
    blobCities: ["copenhagen"],
    probeUrl: REJSEPLANEN_GTFS_STATIC_URL,
    commands: fixturePublish("copenhagen", "trim-copenhagen-gtfs.mjs"),
  },
  {
    id: "brussels",
    blobCities: ["brussels"],
    probeUrl: "https://opendata-discovery-gtfs-static.api.production.belgianmobility.io/api/gtfs/feed/stibmivb/static",
    commands: [["node", ["scripts/publish-brussels-gtfs-snapshot-to-blob.mjs"]]],
  },
  {
    id: "melbourne",
    blobCities: ["melbourne", "melbourne-vline"],
    probeUrl: STATEWIDE_GTFS_URL,
    commands: [["node", ["scripts/publish-melbourne-gtfs-to-blob.mjs", "--download"]]],
  },
  // Trafiklab counts requests against a monthly quota, so no HEAD probe: refresh weekly instead.
  {
    id: "malmo",
    blobCities: ["malmo"],
    probeUrl: null,
    requiredEnv: ["TRAFIKLAB_API_KEY"],
    commands: [["node", ["scripts/publish-gtfs-snapshot-to-blob.mjs", "malmo"]]],
  },
  {
    id: "uppsala",
    blobCities: ["uppsala"],
    probeUrl: null,
    requiredEnv: ["TRAFIKLAB_API_KEY"],
    commands: [["node", ["scripts/publish-gtfs-snapshot-to-blob.mjs", "uppsala"]]],
  },
];

/** Blob-backed live cities refreshed by something else (lib/gtfs-refresh.js via the Vercel cron). */
export const AUTO_REFRESHED_ELSEWHERE = ["canberra", "newcastle", "gold-coast"];

export function ymd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function addDaysYmd(now, days) {
  return ymd(new Date(now.getTime() + days * 86400000));
}

/**
 * Pure refresh decision.
 * @param {{ manifest: object|null, probe: { changed: boolean, reason: string }|null,
 *   calendarMaxDate: string|null, now: Date, force?: boolean,
 *   blobLastModified?: string|null, upstreamLastModified?: string|null }} p
 * @returns {{ refresh: boolean, reason: string, warn?: string }}
 */
export function decideRefresh({ manifest, probe, calendarMaxDate, now, force = false, blobLastModified = null, upstreamLastModified = null }) {
  if (force) {
    return { refresh: true, reason: "forced" };
  }
  const expiresSoon = calendarMaxDate !== null && calendarMaxDate < addDaysYmd(now, EXPIRY_WINDOW_DAYS);
  const expired = calendarMaxDate !== null && calendarMaxDate < ymd(now);

  if (calendarMaxDate === null) {
    return { refresh: true, reason: "published snapshot unreadable or has no calendar" };
  }
  if (expired) {
    return { refresh: true, reason: `published calendar already ended (${calendarMaxDate})` };
  }
  if (!manifest) {
    // Bootstrap: no manifest yet. Refresh only if upstream is demonstrably newer than the blob.
    const up = Date.parse(upstreamLastModified ?? "");
    const blob = Date.parse(blobLastModified ?? "");
    if (probe && Number.isFinite(up) && Number.isFinite(blob) && up > blob) {
      return { refresh: true, reason: `no manifest; upstream (${upstreamLastModified}) newer than published blob (${blobLastModified})` };
    }
    if (expiresSoon) {
      return { refresh: true, reason: `no manifest; published calendar ends ${calendarMaxDate} (< ${EXPIRY_WINDOW_DAYS} days)` };
    }
    if (!probe) {
      return { refresh: false, reason: "no manifest; adopting current published snapshot (probe-less city, weekly cadence starts now)", adopt: true };
    }
    return { refresh: false, reason: "no manifest; upstream not newer than published blob, adopting", adopt: true };
  }
  if (probe) {
    if (probe.changed) {
      return { refresh: true, reason: probe.reason };
    }
    // Upstream unchanged: re-publishing identical data cannot help even if the calendar is short.
    return {
      refresh: false,
      reason: probe.reason,
      warn: expiresSoon
        ? `published calendar ends ${calendarMaxDate} (< ${EXPIRY_WINDOW_DAYS} days) and upstream has not changed`
        : undefined,
    };
  }
  const ageDays = (now.getTime() - Date.parse(manifest.publishedAt ?? "")) / 86400000;
  if (!Number.isFinite(ageDays) || ageDays >= MAX_AGE_DAYS_WITHOUT_PROBE) {
    return { refresh: true, reason: `probe-less city; manifest older than ${MAX_AGE_DAYS_WITHOUT_PROBE} days` };
  }
  if (expiresSoon) {
    return { refresh: true, reason: `published calendar ends ${calendarMaxDate} (< ${EXPIRY_WINDOW_DAYS} days)` };
  }
  return { refresh: false, reason: `probe-less city; manifest ${ageDays.toFixed(1)} days old` };
}

/** Calendar range of a zipped snapshot's bytes. */
export function calendarMaxFromZip(bytes) {
  const files = unzipSync(new Uint8Array(bytes));
  const text = (name) => {
    const key = Object.keys(files).find((k) => k === name || k.endsWith(`/${name}`));
    return key ? new TextDecoder("utf-8").decode(files[key]) : "";
  };
  let max = null;
  let min = null;
  for (const row of parseCsv(text("calendar.txt"))) {
    if (row.end_date && (max === null || row.end_date > max)) max = row.end_date;
    if (row.start_date && (min === null || row.start_date < min)) min = row.start_date;
  }
  for (const row of parseCsv(text("calendar_dates.txt"))) {
    if (row.date && (max === null || row.date > max)) max = row.date;
    if (row.date && (min === null || row.date < min)) min = row.date;
  }
  return { minDate: min, maxDate: max };
}

async function fetchPublished(city) {
  const response = await fetch(`${gtfsFixtureBlobUrl(city)}?t=${Date.now()}`);
  if (!response.ok) {
    return { ok: false, status: response.status, bytes: null, lastModified: null };
  }
  return {
    ok: true,
    status: 200,
    bytes: Buffer.from(await response.arrayBuffer()),
    lastModified: response.headers.get("last-modified"),
  };
}

function runCommands(commands) {
  for (const [cmd, args] of commands) {
    console.log(`$ ${cmd} ${args.join(" ")}`);
    const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
    if (result.status !== 0) {
      throw new Error(`command failed (exit ${result.status}): ${cmd} ${args.join(" ")}`);
    }
  }
}

const putImpl = (pathname, body, opts) => put(pathname, body, opts);

async function processUnit(unit, { now, force, dryRun }) {
  // Representative city for the manifest/decision: the unit's first blob city; all must be healthy.
  const primary = unit.blobCities[0];
  const manifest = await readManifest(primary);
  const published = await fetchPublished(primary);
  const range = published.ok ? calendarMaxFromZip(published.bytes) : { minDate: null, maxDate: null };

  let probe = null;
  let upstreamLastModified = null;
  if (unit.probeUrl) {
    probe = await probeUpstreamChanged({ url: unit.probeUrl, manifest });
    upstreamLastModified = probe.lastModified;
  }
  const decision = decideRefresh({
    manifest,
    probe,
    calendarMaxDate: range.maxDate,
    now,
    force,
    blobLastModified: published.lastModified,
    upstreamLastModified,
  });
  const line = { id: unit.id, published: `${range.minDate}..${range.maxDate}`, decision: decision.refresh ? "REFRESH" : "skip", reason: decision.reason };

  if (decision.warn) {
    console.log(`::warning::${unit.id}: ${decision.warn}`);
    line.warn = decision.warn;
  }

  if (!decision.refresh) {
    if (decision.adopt && !dryRun) {
      await writeManifest(
        primary,
        buildManifest({
          upstreamUrl: unit.probeUrl ?? "n/a",
          etag: probe?.etag ?? null,
          lastModified: probe?.lastModified ?? null,
          publishedAt: new Date(Date.parse(published.lastModified ?? "") || now.getTime()).toISOString(),
          calendarRange: range,
        }),
        { putImpl }
      );
      line.decision = "skip (manifest adopted)";
    }
    return line;
  }
  if (dryRun) {
    line.decision = "REFRESH (dry run, not published)";
    return line;
  }

  runCommands(unit.commands);

  // Verify every published zip in the unit and record manifests.
  const today = ymd(now);
  const results = [];
  for (const city of unit.blobCities) {
    const after = await fetchPublished(city);
    if (!after.ok) {
      throw new Error(`${city}: published zip not readable after publish (HTTP ${after.status})`);
    }
    const afterRange = calendarMaxFromZip(after.bytes);
    if (afterRange.maxDate === null || afterRange.maxDate < today) {
      throw new Error(`${city}: published calendar ${afterRange.minDate}..${afterRange.maxDate} does not cover today (${today}) — upstream may itself be expired`);
    }
    if (afterRange.maxDate < addDaysYmd(now, EXPIRY_WINDOW_DAYS)) {
      console.log(`::warning::${city}: freshly published calendar ends ${afterRange.maxDate} (< ${EXPIRY_WINDOW_DAYS} days ahead)`);
    }
    await writeManifest(
      city,
      buildManifest({
        upstreamUrl: unit.probeUrl ?? "trafiklab",
        etag: probe?.etag ?? null,
        lastModified: probe?.lastModified ?? null,
        calendarRange: afterRange,
      }),
      { putImpl }
    );
    results.push(`${city} ${afterRange.minDate}..${afterRange.maxDate}`);
  }
  line.decision = "REFRESHED";
  line.published = results.join("; ");
  return line;
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const citiesArg = args.find((a) => a.startsWith("--cities="));
  const selected = citiesArg ? citiesArg.slice("--cities=".length).split(",").filter(Boolean) : null;
  const units = REFRESH_UNITS.filter((u) => !selected || selected.includes(u.id));
  if (selected) {
    const unknown = selected.filter((id) => !REFRESH_UNITS.some((u) => u.id === id));
    if (unknown.length) {
      console.error(`::error::unknown city id(s): ${unknown.join(", ")}`);
      process.exit(1);
    }
  }

  // Missing secrets fail loudly up front — never a silent skip.
  const missing = new Set();
  if (!process.env.BLOB_READ_WRITE_TOKEN) missing.add("BLOB_READ_WRITE_TOKEN");
  for (const unit of units) {
    for (const name of unit.requiredEnv ?? []) {
      if (!process.env[name]) missing.add(name);
    }
  }
  if (missing.size && !dryRun) {
    console.error(`::error::Missing required secret(s): ${[...missing].join(", ")}. Add them as GitHub Actions secrets on this repo.`);
    process.exit(1);
  }

  const now = new Date();
  const lines = [];
  let failed = 0;
  for (const unit of units) {
    console.log(`\n=== ${unit.id} ===`);
    try {
      const line = await processUnit(unit, { now, force, dryRun });
      lines.push(line);
      console.log(`${unit.id}: ${line.decision} — ${line.reason} (published ${line.published})`);
    } catch (error) {
      failed += 1;
      console.log(`::error::${unit.id}: ${error?.message ?? error}`);
      lines.push({ id: unit.id, decision: "FAILED", reason: String(error?.message ?? error), published: "?" });
    }
  }

  const summary = [
    "| unit | decision | published calendar | reason |",
    "|---|---|---|---|",
    ...lines.map((l) => `| ${l.id} | ${l.decision} | ${l.published} | ${String(l.reason).replace(/\|/g, "/")} |`),
  ].join("\n");
  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  if (failed) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`::error::${error?.stack || error}`);
    process.exit(1);
  });
}
