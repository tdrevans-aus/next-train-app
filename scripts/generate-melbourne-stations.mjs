#!/usr/bin/env node
/**
 * Build lib/cities/melbourne/stations.json from docs/melbourne-d1/published-network.json's
 * per-line stations[] arrays (order preserved per line, deduped across lines) plus lat/lng and
 * GTFS stop_id resolution from the Metropolitan Train (folder 2) static GTFS snapshot — same
 * pattern as Boston's 125-station catalog build (docs/boston-d1/jim-handoff.md's Jim->Mark note).
 *
 * Usage: node scripts/generate-melbourne-stations.mjs <folder2-zip-path>
 * The folder2 zip is folder "2/google_transit.zip" extracted from the outer Transport Victoria
 * GTFS Schedule zip (https://opendata.transport.vic.gov.au/dataset/gtfs-schedule) — see
 * docs/melbourne-d1/gtfs-reconciliation.md for the exact download URL. Not committed (large);
 * re-fetch to regenerate.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "fflate";
import { parseCsvLine } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Usage: node scripts/generate-melbourne-stations.mjs <folder2-zip-path>");
  process.exit(1);
}

function readTable(files, name) {
  const key = Object.keys(files).find((k) => k.endsWith(name));
  if (!key) return [];
  const text = new TextDecoder("utf-8").decode(files[key]);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

function stripRailwayStation(name) {
  return String(name || "")
    .replace(/\s*\([^)]*\)\s*$/, "") // trailing parenthetical, e.g. "St Albans Railway Station (St Albans)"
    .replace(/\s+railway station$/i, "")
    .trim();
}

function foldKey(name) {
  return stripRailwayStation(name).trim().toLowerCase();
}

/**
 * Known map-vs-GTFS name-form differences (docs/melbourne-d1/hazard-pack.md H1):
 * the printed map form is the catalog `name`/primary lookup key; the GTFS spelling
 * is recorded as an alias so both resolve to the same station.
 */
const KNOWN_ALIASES = {
  Jolimont: ["Jolimont-MCG"],
};

const network = JSON.parse(
  readFileSync(join(ROOT, "docs/melbourne-d1/published-network.json"), "utf8")
);

const orderedNames = [];
const seen = new Set();
for (const line of network.lines ?? []) {
  for (const name of line.stations ?? []) {
    const key = foldKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    orderedNames.push(name);
  }
}

const outerZip = unzipSync(new Uint8Array(readFileSync(zipPath)));
const stops = readTable(outerZip, "stops.txt");
const parentStops = stops.filter((s) => s.location_type === "1");

const byFoldedName = new Map();
for (const stop of parentStops) {
  byFoldedName.set(foldKey(stop.stop_name), stop);
}

// Real trips.txt/stop_times.txt rows call at platform-level child stops
// (location_type blank), never at the location_type=1 parent directly — the
// parent id alone resolves zero departures. Collect every child whose
// parent_station points at this station's parent id (docs/melbourne-d1/
// hazard-pack.md H1's parent+child structure).
const childrenByParent = new Map();
for (const stop of stops) {
  if (stop.location_type === "" && stop.parent_station) {
    const list = childrenByParent.get(stop.parent_station) ?? [];
    list.push(stop.stop_id);
    childrenByParent.set(stop.parent_station, list);
  }
}

const missing = [];
const stations = orderedNames.map((printedName) => {
  const aliases = KNOWN_ALIASES[printedName] ?? [];
  let stop = byFoldedName.get(foldKey(printedName));
  if (!stop) {
    for (const alias of aliases) {
      stop = byFoldedName.get(foldKey(alias));
      if (stop) break;
    }
  }
  if (!stop) {
    missing.push(printedName);
    return { name: printedName, aliases, stopIds: [] };
  }
  const childIds = childrenByParent.get(stop.stop_id) ?? [];
  return {
    name: printedName,
    aliases,
    stopIds: childIds.length ? childIds : [stop.stop_id],
    lat: Number(stop.stop_lat),
    lng: Number(stop.stop_lon),
  };
});

if (missing.length) {
  console.error("No GTFS parent-station match for:", missing);
}

const out = { stations };
writeFileSync(
  join(ROOT, "lib/cities/melbourne/stations.json"),
  JSON.stringify(out, null, 2) + "\n"
);
console.log(`Wrote ${stations.length} stations (${missing.length} unmatched).`);
