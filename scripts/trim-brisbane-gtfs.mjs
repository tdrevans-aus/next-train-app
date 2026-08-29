#!/usr/bin/env node
/**
 * D3 — Trim SEQ GTFS to rail-only fixture for offline Brisbane conformance.
 *
 * Usage: node scripts/trim-brisbane-gtfs.mjs [--url=<gtfs-zip-url>]
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "qa/fixtures/brisbane/gtfs");
const DEFAULT_URL = "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip";
const RAIL_ROUTE_TYPE = "2";
// Explicit column allow-lists — only fields actually read anywhere in
// lib/, scripts/, or qa/ (see docs/jim-brief-gtfs-fixture-diet.md).
const STOP_TIME_COLUMNS = ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type"];
const TRIP_COLUMNS = ["route_id", "service_id", "trip_id", "trip_headsign"];

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

function uniqueBy(rows, keyFn) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(row);
  }
  return out;
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

  const buffer = await response.arrayBuffer();
  const files = unzipSync(new Uint8Array(buffer));

  const routes = parseCsv(readZipText(files, "routes.txt"));
  const trips = parseCsv(readZipText(files, "trips.txt"));
  const stops = parseCsv(readZipText(files, "stops.txt"));
  const stopTimes = parseCsv(readZipText(files, "stop_times.txt"));
  const calendar = parseCsv(readZipText(files, "calendar.txt"));
  const calendarDates = parseCsv(readZipText(files, "calendar_dates.txt"));
  const feedInfo = parseCsv(readZipText(files, "feed_info.txt"));
  const agency = parseCsv(readZipText(files, "agency.txt"));

  const railRouteIds = new Set(
    routes.filter((route) => route.route_type === RAIL_ROUTE_TYPE).map((route) => route.route_id)
  );
  const railRoutes = routes.filter((route) => railRouteIds.has(route.route_id));
  const railTrips = trips.filter((trip) => railRouteIds.has(trip.route_id));
  const railTripIds = new Set(railTrips.map((trip) => trip.trip_id));
  const railStopTimes = stopTimes.filter((row) => railTripIds.has(row.trip_id));

  const usedStopIds = new Set(railStopTimes.map((row) => row.stop_id));
  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));

  for (const stopId of [...usedStopIds]) {
    const stop = stopsById.get(stopId);
    if (!stop?.parent_station) {
      continue;
    }
    usedStopIds.add(stop.parent_station);
    for (const sibling of stops) {
      if (sibling.parent_station === stop.parent_station) {
        usedStopIds.add(sibling.stop_id);
      }
    }
  }

  for (const stop of stops) {
    if (!usedStopIds.has(stop.stop_id)) {
      continue;
    }
    for (const child of stops) {
      if (child.parent_station === stop.stop_id) {
        usedStopIds.add(child.stop_id);
      }
    }
  }

  const railStops = stops.filter((stop) => usedStopIds.has(stop.stop_id));
  const usedServiceIds = new Set(railTrips.map((trip) => trip.service_id));
  const railCalendar = calendar.filter((row) => usedServiceIds.has(row.service_id));
  const railCalendarDates = calendarDates.filter((row) => usedServiceIds.has(row.service_id));

  mkdirSync(OUT_DIR, { recursive: true });

  const outputs = {
    "agency.txt": agency,
    "feed_info.txt": feedInfo,
    "routes.txt": railRoutes,
    "trips.txt": railTrips,
    "stops.txt": railStops,
    "stop_times.txt": railStopTimes,
    "calendar.txt": railCalendar,
    "calendar_dates.txt": railCalendarDates,
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

  const readme = `# Brisbane SEQ GTFS fixture (rail-only)

**Source:** ${url}
**Trimmed:** ${new Date().toISOString().slice(0, 10)}
**Feed span:** ${feedInfo[0]?.feed_start_date ?? "?"} → ${feedInfo[0]?.feed_end_date ?? "?"}

## Regenerate

\`\`\`bash
node scripts/trim-brisbane-gtfs.mjs
node scripts/build-line-map.mjs --city=brisbane
\`\`\`

## Trim rules

- \`route_type === 2\` (rail) only
- Trips, stop_times, calendar rows restricted to included rail services
- Parent stations and all child platform stops retained for used rail stops
`;

  writeFileSync(join(OUT_DIR, "README.md"), readme);

  console.log(`Wrote rail fixture to ${OUT_DIR}`);
  console.log(
    `routes=${railRoutes.length} trips=${railTrips.length} stops=${railStops.length} stop_times=${railStopTimes.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
