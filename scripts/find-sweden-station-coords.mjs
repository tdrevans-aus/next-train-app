#!/usr/bin/env node
/**
 * One-off tool: resolve real lat/lng coordinates for Göteborg's 157 stations
 * (currently zero) and Stockholm's one gap (Uppsala C) from a real,
 * agency-sourced Swedish national GTFS feed.
 *
 * Cannot be run from the Claude Code sandbox — its network egress proxy blocks
 * every candidate domain (api.resrobot.se, opendata.samtrafiken.se) at the
 * connection level, key or no key. Run this on a machine with normal internet
 * access instead (e.g. via Cursor, or your own terminal):
 *
 *   node scripts/find-sweden-station-coords.mjs
 *
 * Primary source is the public, keyless ResRobot Sweden GTFS zip that
 * Stockholm's own D1 research already verified live (200) on 2026-08-23:
 *   https://api.resrobot.se/gtfs/sweden.zip
 * (Samtrafiken i Sverige AB — the national combined feed, so it should carry
 * Västtrafik and UL stops alongside SL, not just Stockholm.)
 *
 * If that's ever down, set TRAFIKLAB_GTFS_SWEDEN_KEY in the environment and
 * this falls back to the keyed Trafiklab endpoint for the same dataset.
 *
 * Writes:
 *   docs/goteborg-d1/station-coordinates.json  — {name: {lat,lng,source}}, plus "unresolved": [...]
 *   docs/stockholm-d1/uppsala-c-coordinates.json — same shape, single station
 *
 * Never invents a coordinate — a station GTFS can't find by exact name match
 * goes in "unresolved", not a guess. Exact-match only, on purpose: a
 * near-match risk (matching the wrong stop) is worse than a documented gap.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_URL = "https://api.resrobot.se/gtfs/sweden.zip";

function keyedUrl() {
  const key = String(process.env.TRAFIKLAB_GTFS_SWEDEN_KEY || "").trim();
  if (!key) return null;
  // Same query-string-key pattern as lib/providers/gtfs/auth.js's other
  // Trafiklab helpers (trafiklabGtfsStaticUrl).
  return `https://opendata.samtrafiken.se/gtfs-sweden/sweden.zip?key=${encodeURIComponent(key)}`;
}

async function downloadStopsTable() {
  const attempts = [PUBLIC_URL, keyedUrl()].filter(Boolean);
  let lastError;
  for (const url of attempts) {
    try {
      console.log(`Fetching ${url} ...`);
      const response = await fetch(url, {
        headers: { Accept: "application/zip, application/octet-stream, */*" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const files = unzipSync(new Uint8Array(buffer));
      const stopsKey = Object.keys(files).find((name) => name.endsWith("stops.txt"));
      if (!stopsKey) {
        throw new Error("stops.txt not found in archive");
      }
      const text = new TextDecoder("utf-8").decode(files[stopsKey]);
      console.log(`OK — parsed from ${url}`);
      return parseCsv(text);
    } catch (error) {
      console.warn(`Failed (${url}): ${error.message}`);
      lastError = error;
    }
  }
  throw lastError ?? new Error("No GTFS source succeeded");
}

/** Build normalized-name -> averaged {lat,lng} from every stop sharing that name. */
function buildNameIndex(rows) {
  const groups = new Map();
  for (const row of rows) {
    const name = String(row.stop_name || "").trim();
    const lat = Number(row.stop_lat);
    const lng = Number(row.stop_lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { displayName: name, points: [] });
    groups.get(key).points.push({ lat, lng });
  }
  const index = new Map();
  for (const [key, { points }] of groups) {
    const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    index.set(key, { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), stopCount: points.length });
  }
  return index;
}

function resolveNames(names, nameIndex, sourceLabel) {
  const resolved = {};
  const unresolved = [];
  for (const name of names) {
    const hit = nameIndex.get(name.trim().toLowerCase());
    if (hit) {
      resolved[name] = { lat: hit.lat, lng: hit.lng, source: sourceLabel, matchedStops: hit.stopCount };
    } else {
      unresolved.push(name);
    }
  }
  return { resolved, unresolved };
}

async function main() {
  const rows = await downloadStopsTable();
  console.log(`Parsed ${rows.length} stop rows.`);
  const nameIndex = buildNameIndex(rows);
  const sourceLabel = `Swedish national GTFS (Samtrafiken i Sverige AB) stops.txt, fetched ${new Date().toISOString().slice(0, 10)}`;

  // --- Göteborg (157 stations, currently zero coordinates) ---
  const goteborgPath = join(ROOT, "lib/cities/goteborg/stations.json");
  const goteborgCatalog = JSON.parse(readFileSync(goteborgPath, "utf8"));
  const goteborgNames = (goteborgCatalog.stations ?? []).map((s) => s.name);
  const goteborg = resolveNames(goteborgNames, nameIndex, sourceLabel);
  const goteborgOut = join(ROOT, "docs/goteborg-d1/station-coordinates.json");
  writeFileSync(
    goteborgOut,
    JSON.stringify(
      { city: "goteborg", resolved: goteborg.resolved, unresolved: goteborg.unresolved },
      null,
      2
    ) + "\n"
  );
  console.log(
    `Göteborg: resolved ${Object.keys(goteborg.resolved).length}/${goteborgNames.length}, wrote ${goteborgOut}`
  );
  if (goteborg.unresolved.length) {
    console.log(`  Unresolved: ${goteborg.unresolved.join(", ")}`);
  }

  // --- Stockholm (just Uppsala C) ---
  const stockholm = resolveNames(["Uppsala C"], nameIndex, sourceLabel);
  const stockholmOut = join(ROOT, "docs/stockholm-d1/uppsala-c-coordinates.json");
  writeFileSync(
    stockholmOut,
    JSON.stringify(
      { city: "stockholm", resolved: stockholm.resolved, unresolved: stockholm.unresolved },
      null,
      2
    ) + "\n"
  );
  console.log(
    `Stockholm (Uppsala C): resolved ${Object.keys(stockholm.resolved).length}/1, wrote ${stockholmOut}`
  );
  if (stockholm.unresolved.length) {
    console.log(`  Unresolved: ${stockholm.unresolved.join(", ")} — try "Uppsala Centralstation" or "Uppsala centralstation" as alternate spellings if this fails.`);
  }
}

main().catch((error) => {
  console.error("FAILED:", error.message);
  process.exit(1);
});
