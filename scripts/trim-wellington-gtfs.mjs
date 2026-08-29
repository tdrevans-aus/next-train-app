#!/usr/bin/env node
/**
 * Trim Metlink GTFS to TRAIN (route_type 2) for Wellington adapter fixtures.
 * Does **not** write published-network.json (wait for Luke D1).
 *
 * Usage: node scripts/trim-wellington-gtfs.mjs [--url=...]
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "qa/fixtures/wellington/gtfs");
const DEFAULT_URL = "https://static.opendata.metlink.org.nz/v1/gtfs/full.zip";
const RAIL_ROUTE_TYPE = "2";
const KEEP_SHORTS = new Set(["KPL", "HVL", "MEL", "JVL", "WRL"]);
// Explicit column allow-lists — only fields actually read anywhere in
// lib/, scripts/, or qa/ (see docs/jim-brief-gtfs-fixture-diet.md).
const STOP_TIME_COLUMNS = ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type"];
const TRIP_COLUMNS = ["route_id", "service_id", "trip_id", "trip_headsign"];

function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "");
}

function readZipText(files, name) {
  const key = name in files ? name : Object.keys(files).find((entry) => entry.endsWith(`/${name}`));
  if (!key) {
    return "";
  }
  return new TextDecoder("utf-8").decode(files[key]);
}

function toCsv(rows, columns) {
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column] ?? "";
          return /[",\n]/.test(value) ? `"${String(value).replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function uniquePreserve(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = String(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}

function displayName(raw) {
  return String(raw || "").trim();
}

async function main() {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const url = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;

  const response = await fetch(url, {
    headers: { Accept: "application/zip, application/octet-stream, */*" },
  });
  if (!response.ok) {
    throw new Error(`GTFS download failed (${response.status}) for ${url}`);
  }

  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const routes = parseCsv(readZipText(files, "routes.txt"));
  const trips = parseCsv(readZipText(files, "trips.txt"));
  const stops = parseCsv(readZipText(files, "stops.txt"));
  const stopTimes = parseCsv(readZipText(files, "stop_times.txt"));
  const calendar = parseCsv(readZipText(files, "calendar.txt"));
  const calendarDates = parseCsv(readZipText(files, "calendar_dates.txt"));
  const feedInfo = parseCsv(readZipText(files, "feed_info.txt"));
  const agency = parseCsv(readZipText(files, "agency.txt"));
  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));

  const railRoutes = routes.filter(
    (route) => route.route_type === RAIL_ROUTE_TYPE && KEEP_SHORTS.has(route.route_short_name)
  );
  const railRouteIds = new Set(railRoutes.map((route) => route.route_id));
  const railTrips = trips.filter((trip) => railRouteIds.has(trip.route_id));
  const railTripIds = new Set(railTrips.map((trip) => trip.trip_id));
  const railStopTimes = stopTimes.filter((row) => railTripIds.has(row.trip_id));

  const usedStopIds = new Set(railStopTimes.map((row) => row.stop_id));
  for (const stopId of [...usedStopIds]) {
    const stop = stopsById.get(stopId);
    if (stop?.parent_station) {
      usedStopIds.add(stop.parent_station);
    }
  }
  for (const stop of stops) {
    if (usedStopIds.has(stop.parent_station) || usedStopIds.has(stop.stop_id)) {
      usedStopIds.add(stop.stop_id);
      if (stop.parent_station) {
        usedStopIds.add(stop.parent_station);
      }
    }
  }

  const railStops = stops.filter((stop) => usedStopIds.has(stop.stop_id));
  const usedServiceIds = new Set(railTrips.map((trip) => trip.service_id));

  mkdirSync(OUT_DIR, { recursive: true });
  const outputs = {
    "agency.txt": agency,
    "feed_info.txt": feedInfo,
    "routes.txt": railRoutes,
    "trips.txt": railTrips,
    "stops.txt": railStops,
    "stop_times.txt": railStopTimes,
    "calendar.txt": calendar.filter((row) => usedServiceIds.has(row.service_id)),
    "calendar_dates.txt": calendarDates.filter((row) => usedServiceIds.has(row.service_id)),
  };
  const columnsByFile = {
    "agency.txt": Object.keys(agency[0] ?? {}),
    "feed_info.txt": Object.keys(feedInfo[0] ?? {}),
    "routes.txt": Object.keys(routes[0] ?? {}),
    "trips.txt": TRIP_COLUMNS,
    "stops.txt": Object.keys(stops[0] ?? {}),
    "stop_times.txt": STOP_TIME_COLUMNS,
    "calendar.txt": Object.keys(calendar[0] ?? {}),
    "calendar_dates.txt": Object.keys(calendarDates[0] ?? {}),
  };
  for (const [filename, rows] of Object.entries(outputs)) {
    writeFileSync(join(OUT_DIR, filename), toCsv(rows, columnsByFile[filename]));
  }

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# Wellington Metlink GTFS fixture (TRAIN)

**Source:** ${url}
**Trimmed:** ${new Date().toISOString().slice(0, 10)}

KPL, HVL, MEL, JVL, WRL only. No bus/ferry/cable car.

Do **not** generate \`qa/fixtures/wellington/published-network.json\` from this feed. Wait for Luke D1.
`
  );

  function parentStop(stop) {
    if (stop?.parent_station && stopsById.get(stop.parent_station)) {
      return stopsById.get(stop.parent_station);
    }
    return stop;
  }

  const catalogGroups = new Map();
  for (const stopId of usedStopIds) {
    const stop = stopsById.get(stopId);
    if (!stop) {
      continue;
    }
    const parent = parentStop(stop);
    const parentServed = railStopTimes.some((row) => {
      const child = stopsById.get(row.stop_id);
      return parentStop(child)?.stop_id === parent?.stop_id;
    });
    if (!parentServed) {
      continue;
    }
    const name = displayName(parent?.stop_name);
    const folded = foldKey(name);
    if (!name) {
      continue;
    }
    const existing = catalogGroups.get(folded);
    const lat = Number(parent?.stop_lat);
    const lng = Number(parent?.stop_lon);
    if (!existing) {
      catalogGroups.set(folded, {
        name,
        aliases: [],
        stopIds: [stopId],
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      });
      continue;
    }
    existing.stopIds = uniquePreserve([...existing.stopIds, stopId]);
  }

  const stations = [...catalogGroups.values()]
    .map((row) => ({
      ...row,
      stopIds: [...row.stopIds].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  mkdirSync(join(ROOT, "lib/cities/wellington"), { recursive: true });
  writeFileSync(
    join(ROOT, "lib/cities/wellington/stations.json"),
    `${JSON.stringify({ stations }, null, 2)}\n`
  );

  console.log(`Wrote rail fixture to ${OUT_DIR}`);
  console.log(
    `routes=${railRoutes.length} trips=${railTrips.length} stops=${railStops.length} catalog=${stations.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
