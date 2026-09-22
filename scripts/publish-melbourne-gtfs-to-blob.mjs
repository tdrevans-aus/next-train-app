#!/usr/bin/env node
/**
 * Extract the Metropolitan Train (folder 2) and V/Line (folder 1) static GTFS
 * feeds from the Transport Victoria Open Data Portal's statewide GTFS Schedule
 * zip-of-zips, strip each to only the routes/trips/stops the matching adapter
 * config keeps (same shrink-before-publish shape as
 * scripts/publish-gtfs-snapshot-to-blob.mjs), and publish to the
 * next-train-gtfs Vercel Blob store at the stable pathnames
 * lib/providers/melbourne.js reads (gtfsFixtureBlobUrl("melbourne") /
 * gtfsFixtureBlobUrl("melbourne-vline")).
 *
 * Usage:
 *   node scripts/publish-melbourne-gtfs-to-blob.mjs <outer-gtfs-zip-path>
 *   node scripts/publish-melbourne-gtfs-to-blob.mjs --download   (fetches the
 *     ~293MB outer zip fresh from the Open Data Portal first)
 *
 * Requires BLOB_READ_WRITE_TOKEN (in .env.local).
 * @see docs/melbourne-d1/gtfs-reconciliation.md
 */
import { readFileSync, writeFileSync } from "fs";
import { put } from "@vercel/blob";
import { unzipSync, zipSync } from "fflate";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

loadEnvLocal();

const STATEWIDE_GTFS_URL =
  "https://opendata.transport.vic.gov.au/dataset/3f4e292e-7f8a-4ffe-831f-1953be0fe448/resource/fb152201-859f-4882-9206-b768060b50ad/download/gtfs.zip";

/** Mirrors the filtering lib/providers/melbourne.js applies at load time — this only shrinks
 * the published blob, loadGtfsStatic's own filtering at request time is still authoritative. */
const CONFIG = {
  "2": { city: "melbourne", routeTypes: ["400"], excludeRouteShortNames: ["Replacement Bus", "City Circle"] },
  "1": { city: "melbourne-vline", routeTypes: ["2"], excludeRouteShortNames: [] },
};

async function resolveOuterZipBytes() {
  const arg = process.argv[2];
  if (arg === "--download" || !arg) {
    console.log(`Downloading statewide GTFS zip from ${STATEWIDE_GTFS_URL} (~293MB)...`);
    const res = await fetch(STATEWIDE_GTFS_URL);
    if (!res.ok) {
      throw new Error(`Statewide GTFS download failed: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync("scratch-gtfs.zip", buf);
    return buf;
  }
  return readFileSync(arg);
}

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
  // TextDecoder (not Buffer#toString) strips a leading UTF-8 BOM — this feed's
  // CSVs carry one, and it lands on whichever column happens to be first in
  // each *individual* file (route_id in routes.txt, trip_id in stop_times.txt,
  // etc). Buffer#toString leaves it in, silently renaming that file's first
  // header to "﻿<name>" and breaking every cross-table join keyed on it.
  return parseCsv(new TextDecoder("utf-8").decode(files[key]));
}

/** Strip a folder's GTFS files dict to just the routes/trips/stops the adapter config keeps. */
function stripToConfig(files, config) {
  const routes = readTable(files, "routes.txt");
  const trips = readTable(files, "trips.txt");
  const stopTimes = readTable(files, "stop_times.txt");
  const stops = readTable(files, "stops.txt");
  if (!routes || !trips || !stopTimes || !stops) {
    return files;
  }

  const routeTypeSet = new Set((config.routeTypes ?? []).map(String));
  const excludedShorts = new Set(
    (config.excludeRouteShortNames ?? []).map((n) => n.trim().toUpperCase())
  );

  const keptRoutes = routes.filter((route) => {
    if (routeTypeSet.size && !routeTypeSet.has(String(route.route_type))) {
      return false;
    }
    if (excludedShorts.has(String(route.route_short_name || "").trim().toUpperCase())) {
      return false;
    }
    return true;
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

  // lib/providers/gtfs/static-cache.js only ever reads these six tables
  // (stops/routes/calendar/calendar_dates via collectGtfsTable, trips/
  // stop_times via streamGtfsTable) — shapes.txt (a ~85-190MB dead weight on
  // this feed, never parsed by anything in this codebase), pathways.txt,
  // levels.txt, transfers.txt, and agency.txt are dropped entirely rather
  // than passed through unchanged, which is most of the actual size win here
  // (route/trip/stop-time filtering alone barely shrinks this feed — see
  // scripts/publish-melbourne-gtfs-to-blob.mjs history).
  const calendar = readTable(files, "calendar.txt") ?? [];
  const calendarDates = readTable(files, "calendar_dates.txt") ?? [];
  const output = {};
  output["routes.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(routes[0] ?? { route_id: "" }), keptRoutes)
  );
  output["trips.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(trips[0] ?? { trip_id: "" }), keptTrips)
  );
  output["stop_times.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(stopTimes[0] ?? { trip_id: "" }), keptStopTimes)
  );
  output["stops.txt"] = new TextEncoder().encode(
    serializeCsv(Object.keys(stops[0] ?? { stop_id: "" }), keptStops)
  );
  if (calendar.length) {
    output["calendar.txt"] = new TextEncoder().encode(serializeCsv(Object.keys(calendar[0]), calendar));
  }
  if (calendarDates.length) {
    output["calendar_dates.txt"] = new TextEncoder().encode(
      serializeCsv(Object.keys(calendarDates[0]), calendarDates)
    );
  }
  return output;
}

async function main() {
  const outerBytes = await resolveOuterZipBytes();
  const outerFiles = unzipSync(new Uint8Array(outerBytes));

  for (const [folder, config] of Object.entries(CONFIG)) {
    const key = Object.keys(outerFiles).find(
      (k) => k.startsWith(`${folder}/`) && k.endsWith("google_transit.zip")
    );
    if (!key) {
      throw new Error(`No entry for folder ${folder} in the statewide zip`);
    }
    const folderZip = unzipSync(new Uint8Array(outerFiles[key]));
    const beforeBytes = outerFiles[key].length;
    const stripped = stripToConfig(folderZip, config);
    const zipped = zipSync(stripped, { level: 6 });

    const pathname = `gtfs/${config.city}.zip`;
    const blob = await put(pathname, Buffer.from(zipped), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/zip",
    });
    console.log(
      `Published ${config.city} (folder ${folder}): ${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ${(zipped.length / 1024 / 1024).toFixed(2)} MB stripped -> ${blob.url}`
    );
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
