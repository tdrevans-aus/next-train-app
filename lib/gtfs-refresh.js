import { zipSync } from "./vendor/fflate.mjs";
import { buildTrimmedFiles as buildBrisbane } from "../scripts/trim-brisbane-gtfs.mjs";
import { buildTrimmedFiles as buildGoldCoast } from "../scripts/trim-gold-coast-gtfs.mjs";
import { buildTrimmedFiles as buildCanberra } from "../scripts/trim-canberra-gtfs.mjs";
import { buildTrimmedFiles as buildNewcastle } from "../scripts/trim-newcastle-gtfs.mjs";
import { readTfnswApiKey, tfnswAuthHeaders } from "./providers/gtfs/auth.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  probeUpstreamChanged,
  calendarRangeFromTrimmedOutput,
} from "./providers/gtfs/snapshot-manifest.js";
import { isCityStale } from "./providers/gtfs/staleness-registry.js";
import { REFRESH_STATUS_BLOB_PATH } from "./providers/gtfs/blob-fixtures.js";
import { getCity } from "./providers/registry.js";

/**
 * Scheduled refresh: re-fetch each city's upstream GTFS static feed, apply
 * the same route/mode trim + column diet as the corresponding
 * scripts/trim-*-gtfs.mjs tool (statically imported, in-process - no
 * subprocess spawning, no filesystem writes outside /tmp), and publish
 * to the next-train-gtfs Blob store. Replaces the manual "run a script
 * locally, upload by hand" step for the cities whose runtime provider
 * actually reads from Blob (gtfsFixtureBlobUrl).
 *
 * Lives under lib/, not api/, and is invoked from api/health.js rather
 * than its own api/cron/*.js file - the Hobby plan caps a deployment at
 * 12 Serverless Functions and this project is already at that limit, so
 * adding a dedicated function file isn't free. Vercel Cron hits
 * /api/health with an Authorization: Bearer $CRON_SECRET header (which
 * only Vercel's own cron trigger sends), so health.js dispatches into
 * this refresh instead of its normal liveness check when that header
 * matches - no new function, no change to health.js's normal behavior
 * for anyone else calling it.
 *
 * Change-driven (docs/jim-brief-gtfs-snapshot-freshness.md, 7 Sep 2026): each
 * city is HEAD-probed against its recorded manifest (gtfs/<city>.json in the
 * same Blob store) before anything is downloaded. An unchanged ETag/
 * Last-Modified costs one HEAD and nothing else; only a changed upstream (or
 * a city the runtime staleness check has flagged, via the shared staleness
 * registry) triggers the download-trim-publish path and a manifest update.
 * This replaces the old daily-download-regardless behavior — cost is now
 * proportional to how often agencies actually revise timetables, not to
 * city count.
 *
 * NOT covered here (each for its own reason):
 * - sydney: trim is Python-only, no live-fetch path — manual only.
 * - auckland, wellington: their providers fetch live directly
 *   (loadGtfsStatic({ url: DEFAULT_URL })), no Blob dependency at
 *   runtime — their committed qa/fixtures/*.gtfs is a build-time input
 *   for line-map generation, unrelated to this pipeline.
 * - vancouver: retired from release 1 (7 Sep 2026, registry.js). Adapter
 *   kept for a possible future relaunch, but there's no live city to keep
 *   refreshed, so it was dropped from STANDALONE below (10 Sep 2026,
 *   docs/jim-brief-newcastle-stale-snapshot.md) rather than spend a probe
 *   on it every run. It stayed in STANDALONE after that retirement date for
 *   3 days - the prime suspect for an 11 Sep OOM kill mid-run - because the
 *   list was hand-maintained and drifted from the registry; runGtfsRefresh
 *   now also checks getCity(id).status === "live" for every STANDALONE and
 *   SHARED_GROUPS entry before refreshing it, so a future retirement removes
 *   the city from the refresh with only the registry.js edit, no second one
 *   here.
 * - amsterdam, rotterdam: both retired from release 1 (7 Sep 2026,
 *   registry.js) — "static fixture refreshed manually" per their registry
 *   notes. Previously refreshed by scripts/gtfs-refresh-large-feeds.mjs on
 *   a GitHub Actions schedule (their shared OVapi upstream, ~230MB
 *   nationwide multi-modal, OOMs this Hobby-plan function even processing
 *   ONE of the two alone — confirmed live via a real "instance was killed
 *   because it ran out of available memory" error). That workflow and
 *   script were removed 10 Sep 2026
 *   (docs/jim-brief-newcastle-stale-snapshot.md) — it had been failing
 *   daily since 8 Sep on a missing BLOB_READ_WRITE_TOKEN and no live city
 *   needs it; if either city is ever un-retired, republish manually with
 *   the same trim (scripts/trim-amsterdam-gtfs.mjs /
 *   scripts/trim-rotterdam-gtfs.mjs) rather than resurrecting the workflow.
 * - malmo, uppsala: live, blob-backed (gtfsFixtureBlobUrl), and genuinely
 *   NOT covered by this pipeline — flagged as a real gap by Mark's QA
 *   review of PR #356 (docs/mark-note-newcastle-stale-snapshot.md) and
 *   deliberately left out here rather than wired in (10 Sep 2026,
 *   docs/jim-brief-newcastle-fixups.md). Reason: their upstream is
 *   Trafiklab's GTFS Regional API (TRAFIKLAB_API_KEY), which has already
 *   429'd this project once under ordinary request volume
 *   (docs/jim-brief-sweden-static-429-and-key-leak.md) — the whole reason
 *   their static snapshot is fetched at publish time and cached in Blob,
 *   never on the request path. Adding a daily/change-driven HEAD-probe
 *   cron here would spend part of that same rate-limited quota on every
 *   run, for two cities whose upstream changes far less often than a
 *   probe budget can justify. They ARE covered instead by
 *   qa/gtfs-live-blob-snapshot-integrity.mjs's content-integrity check
 *   (same as every other city in COVERED_CITY_IDS there), and are
 *   republished manually with scripts/publish-gtfs-snapshot-to-blob.mjs
 *   <city> — both currently fresh (feed_version 2026-09-06, calendars to
 *   2026-12-12, confirmed 10 Sep 2026). If Trafiklab's rate limit is ever
 *   confirmed generous enough for a routine probe, revisit; "nobody added
 *   them" was the previous, unrecorded state and is not being repeated
 *   here as a reason.
 *
 * @see docs/jim-brief-gtfs-data-platform-scale.md
 * @see docs/jim-brief-gtfs-snapshot-freshness.md
 * @see docs/jim-brief-newcastle-stale-snapshot.md
 * @see docs/jim-brief-newcastle-fixups.md
 *
 * NO top-level `import { put } from "@vercel/blob"` here (confirmed root
 * cause, docs/jim-brief-gtfs-refresh-cron-crash.md, 11 Sep 2026): a bare npm
 * import in a file under lib/ resolves to ERR_MODULE_NOT_FOUND in Vercel's
 * deployed bundle even though the identical package is declared and resolves
 * fine from a file under api/, and even via a fully static import chain
 * (confirmed live on a Vercel preview deployment, not just locally - Node
 * resolves node_modules from the repo root locally regardless, which is
 * exactly why this shipped broken and stayed green in every local/CI run).
 * `put` is threaded in as `putImpl` instead - callers under api/ (which CAN
 * resolve "@vercel/blob") import it and pass it down; callers outside Vercel
 * (scripts/gtfs-refresh-large-feeds.mjs on GitHub Actions, tests) import it
 * themselves too, since putImpl is now required, not merely injectable - see
 * qa/lib-bare-import-gate.mjs, which fails the build if a bare npm import
 * reappears in a lib/ file reachable from api/.
 *
 * NOTE (scripts/gtfs-refresh-large-feeds.mjs removed, 10 Sep 2026,
 * docs/jim-brief-newcastle-stale-snapshot.md): the GitHub Actions workflow it
 * served refreshed only retired Amsterdam/Rotterdam and had been failing
 * daily since 8 Sep on a missing token, so the doc comment above's reference
 * to it as a putImpl caller is now historical - see the retired-cities note
 * below for what to do if either city is ever un-retired.
 */

/**
 * Exported (in addition to being used internally) so
 * qa/gtfs-refresh-retired-city-skip-gate.mjs can prove, by construction and
 * without any network access, that runGtfsRefresh() skips any entry whose
 * registry status isn't "live" — the arrays are spliced to synthetic
 * entries for the duration of that one test and restored immediately after.
 */
export const STANDALONE = [
  { city: "canberra", url: "https://www.transport.act.gov.au/googletransit/google_transit_lr.zip", build: buildCanberra },
  {
    city: "newcastle",
    url: "https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle",
    build: buildNewcastle,
    headers: () => tfnswAuthHeaders(readTfnswApiKey()),
  },
];

/**
 * Groups of cities that share one upstream zip - only kept for pairs whose
 * shared source is small enough that holding it (plus two decompression
 * passes) doesn't risk the same OOM as the OVapi pair above. SEQ_GTFS.zip
 * is ~32MB, confirmed working in production at default memory.
 */
export const SHARED_GROUPS = [
  {
    sharedUrl: "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip",
    headers: {},
    cities: [
      { city: "brisbane", build: buildBrisbane },
      { city: "gold-coast", build: buildGoldCoast },
    ],
  },
];

/**
 * Records the outcome of a runGtfsRefresh() call at a single, non-city-scoped
 * blob path (item 3, docs/jim-brief-gtfs-refresh-cron-crash.md): the daily
 * cron never has its own success/failure surface visible to a human, because
 * it's dispatched from /api/health, which must always return 200 for a
 * healthy platform regardless of whether the *cron branch* succeeded (it's
 * the UptimeRobot liveness check). qa/prod-sweep.mjs reads this file and
 * fails its (non-required, monitoring-only) hourly GitHub Actions run when
 * the recorded run is missing, failed, or too old — visible without ever
 * touching /api/health's response.
 *
 * Best-effort: a failure writing this file is logged, not thrown - it must
 * never turn a real refresh success/failure into a 500 from /api/health.
 *
 * putImpl is required (no dynamic-import fallback) - see publishCity's doc
 * comment below for why a lib/ file must never import "@vercel/blob" itself.
 */
async function writeRefreshStatus(report, { putImpl }) {
  try {
    await putImpl(REFRESH_STATUS_BLOB_PATH, JSON.stringify(report, null, 2), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("gtfs-refresh: failed to write refresh status", error);
  }
}

export async function downloadZip(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*", ...extraHeaders },
  });
  if (!response.ok) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * @param {string} city
 * @param {object} output
 * @param {{ putImpl: (pathname: string, body: Buffer, opts: object) => Promise<{url:string}> }} options
 *   putImpl is required (no dynamic-import fallback): this file lives under
 *   lib/, which cannot resolve a bare `import "@vercel/blob"` in Vercel's
 *   deployed bundle - see the file-level note above. The one caller,
 *   api/health.js's cron branch, imports "@vercel/blob" itself (a file
 *   under api/ CAN resolve it) and threads `put` through runGtfsRefresh.
 */
export async function publishCity(city, output, { putImpl }) {
  const files = Object.keys(output);
  const zipInput = {};
  const encoder = new TextEncoder();
  for (const name of files) {
    zipInput[name] = encoder.encode(output[name]);
  }
  const zipped = zipSync(zipInput, { level: 6 });
  const blob = await putImpl(`gtfs/${city}.zip`, Buffer.from(zipped), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/zip",
  });
  return { files: files.length, zippedBytes: zipped.length, url: blob.url };
}

/**
 * Change-driven refresh for one city: HEAD-probe the upstream against the
 * recorded manifest and skip the download entirely when nothing changed —
 * unless the runtime staleness check has flagged this city (isCityStale),
 * in which case a refresh is forced regardless of what the probe says,
 * because a stale-but-unchanged snapshot means the *join*, not the
 * upstream, is what's wrong, and a fresh publish plus a new manifest is the
 * closest thing to a fix available here.
 *
 * Exported for reuse and for tests exercising the probe-then-publish logic
 * directly.
 *
 * @param {{ city: string, url: string, headers?: Record<string,string>, build: (buffer: Buffer) => { output: object, summary?: object }, putImpl: Function }} params
 *   putImpl - see publishCity's doc comment above.
 */
export async function refreshCityIfChanged({ city, url, headers = {}, build, putImpl }) {
  const manifest = await readManifest(city);
  const probe = await probeUpstreamChanged({ url, headers, manifest });
  const forced = !probe.changed && isCityStale(city);

  if (!probe.changed && !forced) {
    return { city, ok: true, changed: false, reason: probe.reason };
  }

  const buffer = await downloadZip(url, headers);
  const { output, summary } = build(buffer);
  const published = await publishCity(city, output, { putImpl });
  await writeManifest(
    city,
    buildManifest({
      upstreamUrl: url,
      etag: probe.etag,
      lastModified: probe.lastModified,
      calendarRange: calendarRangeFromTrimmedOutput(output),
    }),
    { putImpl }
  );
  return {
    city,
    ok: true,
    changed: true,
    summary,
    ...published,
    reason: forced ? `${probe.reason} (forced: city flagged stale)` : probe.reason,
  };
}

/**
 * Registry is the single source of truth for *whether* a city is refreshed;
 * STANDALONE/SHARED_GROUPS below only declare *how*. This is what stops the
 * refresh list drifting from the registry the way Vancouver did (retired
 * 7 Sep 2026, still refreshed until 10 Sep - docs/jim-brief-newcastle-stale-
 * snapshot.md) - retiring a city in registry.js is now the only edit needed
 * to remove it from the refresh, with no second, hand-maintained list to
 * remember.
 */
function isRegistryLive(cityId) {
  const city = getCity(cityId);
  return Boolean(city && city.status === "live");
}

/**
 * @param {{ putImpl?: Function }} [options] - see publishCity's doc comment
 *   above. api/health.js's cron branch imports "@vercel/blob" itself (it can
 *   resolve it; this file cannot) and passes `put` in here.
 */
export async function runGtfsRefresh({ putImpl } = {}) {
  const results = [];
  const notLive = [];

  for (const entry of STANDALONE) {
    if (!isRegistryLive(entry.city)) {
      const status = getCity(entry.city)?.status ?? "unknown";
      console.log(`gtfs-refresh: ${entry.city}: skipped (registry status "${status}", not live)`);
      notLive.push({ city: entry.city, status });
      continue;
    }
    try {
      const headers = entry.headers ? entry.headers() : {};
      const result = await refreshCityIfChanged({ city: entry.city, url: entry.url, headers, build: entry.build, putImpl });
      console.log(`gtfs-refresh: ${entry.city}: ${result.reason}`);
      results.push({ ok: true, ...result });
    } catch (error) {
      results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
    }
  }

  for (const group of SHARED_GROUPS) {
    // Probe once per city in the group (they share the upstream URL, but
    // each has its own manifest) — a download only happens if at least one
    // city in the group needs one, and it's shared across the group.
    let sharedBuffer = null;
    let downloadError = null;
    for (const entry of group.cities) {
      if (!isRegistryLive(entry.city)) {
        const status = getCity(entry.city)?.status ?? "unknown";
        console.log(`gtfs-refresh: ${entry.city}: skipped (registry status "${status}", not live)`);
        notLive.push({ city: entry.city, status });
        continue;
      }
      try {
        const manifest = await readManifest(entry.city);
        const probe = await probeUpstreamChanged({ url: group.sharedUrl, headers: group.headers, manifest });
        const forced = !probe.changed && isCityStale(entry.city);
        if (!probe.changed && !forced) {
          console.log(`gtfs-refresh: ${entry.city}: ${probe.reason}`);
          results.push({ city: entry.city, ok: true, changed: false, reason: probe.reason });
          continue;
        }
        if (!sharedBuffer && !downloadError) {
          try {
            sharedBuffer = await downloadZip(group.sharedUrl, group.headers);
          } catch (error) {
            downloadError = error;
          }
        }
        if (downloadError) {
          throw downloadError;
        }
        const { output, summary } = entry.build(sharedBuffer);
        const published = await publishCity(entry.city, output, { putImpl });
        await writeManifest(
          entry.city,
          buildManifest({
            upstreamUrl: group.sharedUrl,
            etag: probe.etag,
            lastModified: probe.lastModified,
            calendarRange: calendarRangeFromTrimmedOutput(output),
          }),
          { putImpl }
        );
        const reason = forced ? `${probe.reason} (forced: city flagged stale)` : probe.reason;
        console.log(`gtfs-refresh: ${entry.city}: ${reason}`);
        results.push({ city: entry.city, ok: true, changed: true, summary, ...published, reason });
      } catch (error) {
        results.push({ city: entry.city, ok: false, error: String(error?.message || error) });
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  const report = {
    ok: failed.length !== results.length,
    ranAt: new Date().toISOString(),
    skipped: [
      "sydney (python-only trim)",
      "auckland (live-fetch, no blob)",
      "wellington (live-fetch, no blob)",
      "amsterdam (retired from release 1, 7 Sep 2026 - static fixture refreshed manually if ever needed)",
      "rotterdam (retired from release 1, 7 Sep 2026 - static fixture refreshed manually if ever needed)",
      "malmo (live, blob-backed, Trafiklab rate-limit risk - see header comment; republished manually)",
      "uppsala (live, blob-backed, Trafiklab rate-limit risk - see header comment; republished manually)",
      ...notLive.map(({ city, status }) => `${city} (registry status "${status}", not live)`),
    ],
    succeeded: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
  };
  await writeRefreshStatus(report, { putImpl });
  return report;
}
