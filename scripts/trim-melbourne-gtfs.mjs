#!/usr/bin/env node
/**
 * Melbourne (Metropolitan Train + V/Line) GTFS trim: extract folder 2 (metro) and folder 1
 * (V/Line) from the Transport Victoria Open Data Portal's statewide GTFS zip-of-zips and strip
 * each to the six tables lib/providers/gtfs/static-cache.js reads, filtered to the routes the
 * adapter keeps. Pure functions are exported for scripts/publish-melbourne-gtfs-to-blob.mjs and
 * scripts/refresh-hand-published-gtfs.mjs; run directly to write the two trimmed snapshots to a
 * directory (docs/jim-brief-scheduled-snapshot-refresh.md — Melbourne went stale 6 Oct 2026
 * because this was a one-off hand publish nobody re-ran).
 *
 * Usage: node scripts/trim-melbourne-gtfs.mjs [<outer-zip-path> | --download] [--out=<dir>]
 *   writes <dir>/melbourne/*.txt and <dir>/melbourne-vline/*.txt (default <dir>: ./scratch-melbourne)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "fflate";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

export const STATEWIDE_GTFS_URL =
  "https://opendata.transport.vic.gov.au/dataset/3f4e292e-7f8a-4ffe-831f-1953be0fe448/resource/fb152201-859f-4882-9206-b768060b50ad/download/gtfs.zip";

/** Mirrors the filtering lib/providers/melbourne.js applies at load time — this only shrinks
 * the published blob, loadGtfsStatic's own filtering at request time is still authoritative. */
export const MELBOURNE_CONFIG = {
  "2": { city: "melbourne", routeTypes: ["400"], excludeRouteShortNames: ["Replacement Bus", "City Circle"] },
  "1": { city: "melbourne-vline", routeTypes: ["2"], excludeRouteShortNames: [] },
};

function csvField(value) {
  const raw = String(value ?? "");
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function serializeCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvField(row[header])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

function findEntry(files, name) {
  const key = name in files ? name : Object.keys(files).find((entry) => entry.endsWith(`/${name}`));
  return key ?? null;
}

function readTable(files, name) {
  const key = findEntry(files, name);
  if (!key) return null;
  // TextDecoder (not Buffer#toString) strips a leading UTF-8 BOM — this feed's CSVs carry one,
  // and it lands on the first column of each file, silently renaming that header and breaking
  // every cross-table join keyed on it.
  return parseCsv(new TextDecoder("utf-8").decode(files[key]));
}

/** Strip a folder's GTFS files dict to just the routes/trips/stops the adapter config keeps. */
export function stripToConfig(files, config) {
  const routes = readTable(files, "routes.txt");
  const trips = readTable(files, "trips.txt");
  const stopTimes = readTable(files, "stop_times.txt");
  const stops = readTable(files, "stops.txt");
  if (!routes || !trips || !stopTimes || !stops) {
    return files;
  }

  const routeTypeSet = new Set((config.routeTypes ?? []).map(String));
  const excludedShorts = new Set((config.excludeRouteShortNames ?? []).map((n) => n.trim().toUpperCase()));

  const keptRoutes = routes.filter((route) => {
    if (routeTypeSet.size && !routeTypeSet.has(String(route.route_type))) {
      return false;
    }
    return !excludedShorts.has(String(route.route_short_name || "").trim().toUpperCase());
  });
  const keptRouteIds = new Set(keptRoutes.map((r) => r.route_id));
  const keptTrips = trips.filter((trip) => keptRouteIds.has(trip.route_id));
  const keptTripIds = new Set(keptTrips.map((t) => t.trip_id));
  const keptStopTimes = stopTimes.filter((row) => keptTripIds.has(row.trip_id));
  const keptStopIds = new Set(keptStopTimes.map((row) => row.stop_id));
  for (const stop of stops) {
    if (keptStopIds.has(stop.stop_id) && stop.parent_station) {
      keptStopIds.add(stop.parent_station);
    }
  }
  const keptStops = stops.filter((stop) => keptStopIds.has(stop.stop_id));

  // static-cache.js only reads these six tables; shapes.txt etc. are dropped (most of the size win).
  const calendar = readTable(files, "calendar.txt") ?? [];
  const calendarDates = readTable(files, "calendar_dates.txt") ?? [];
  const enc = (headers, rows) => new TextEncoder().encode(serializeCsv(headers, rows));
  const output = {};
  output["routes.txt"] = enc(Object.keys(routes[0] ?? { route_id: "" }), keptRoutes);
  output["trips.txt"] = enc(Object.keys(trips[0] ?? { trip_id: "" }), keptTrips);
  output["stop_times.txt"] = enc(Object.keys(stopTimes[0] ?? { trip_id: "" }), keptStopTimes);
  output["stops.txt"] = enc(Object.keys(stops[0] ?? { stop_id: "" }), keptStops);
  if (calendar.length) {
    output["calendar.txt"] = enc(Object.keys(calendar[0]), calendar);
  }
  if (calendarDates.length) {
    output["calendar_dates.txt"] = enc(Object.keys(calendarDates[0]), calendarDates);
  }
  return output;
}

/** @param {Uint8Array|Buffer} outerBytes statewide zip-of-zips -> { [cityId]: { files, beforeBytes } } */
export function buildMelbourneSnapshots(outerBytes) {
  const outerFiles = unzipSync(new Uint8Array(outerBytes));
  const result = {};
  for (const [folder, config] of Object.entries(MELBOURNE_CONFIG)) {
    const key = Object.keys(outerFiles).find((k) => k.startsWith(`${folder}/`) && k.endsWith("google_transit.zip"));
    if (!key) {
      throw new Error(`No entry for folder ${folder} in the statewide zip`);
    }
    const folderZip = unzipSync(new Uint8Array(outerFiles[key]));
    result[config.city] = { files: stripToConfig(folderZip, config), beforeBytes: outerFiles[key].length };
  }
  return result;
}

export async function resolveOuterZipBytes(arg) {
  if (arg === "--download" || !arg) {
    console.log(`Downloading statewide GTFS zip from ${STATEWIDE_GTFS_URL} (~250MB)...`);
    const res = await fetch(STATEWIDE_GTFS_URL);
    if (!res.ok) {
      throw new Error(`Statewide GTFS download failed: HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  return readFileSync(arg);
}

async function main() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const outDir = outArg ? outArg.slice("--out=".length) : "scratch-melbourne";
  const posArg = process.argv.slice(2).find((a) => !a.startsWith("--out="));
  const snapshots = buildMelbourneSnapshots(await resolveOuterZipBytes(posArg));
  for (const [city, { files }] of Object.entries(snapshots)) {
    const dir = join(outDir, city);
    mkdirSync(dir, { recursive: true });
    for (const [name, bytes] of Object.entries(files)) {
      writeFileSync(join(dir, name), bytes);
    }
    console.log(`Wrote ${city}: ${Object.keys(files).length} tables -> ${dir}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err?.stack || err);
    process.exit(1);
  });
}
