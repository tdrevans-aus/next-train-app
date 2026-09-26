#!/usr/bin/env node
/**
 * D2 — Trim the NTA's national GTFS_All.zip (all Irish operators, ~160MB) down to Luas
 * (Red + Green light rail) only, so lib/providers/dublin.js's runtime loadGtfsStatic() call
 * never has to fetch/parse the full national feed on the request path (same reasoning as
 * lib/gtfs-refresh.js's Amsterdam/Rotterdam OVapi retirement — a ~230MB nationwide feed OOM'd a
 * Hobby-plan function; NTA's feed is smaller but still far too large for a per-request fetch).
 *
 * Output is published to the next-train-gtfs Vercel Blob store at gtfs/dublin.zip
 * (scripts/publish-gtfs-fixture-to-blob.mjs's pathname convention) — NOT run automatically here
 * (this script only writes local files; publishing needs BLOB_READ_WRITE_TOKEN, not available
 * this session — docs/dublin-d1/jim-handoff.md). Once published, lib/providers/dublin.js reads
 * it via gtfsFixtureBlobUrl("dublin"), same pattern as lib/providers/melbourne.js.
 *
 * Luas's real GTFS route_id / agency_id scheme is UNVERIFIED against a live payload
 * (docs/dublin-d1/published-network.json — gtfsRouteIdsIfKnown deliberately left empty). This
 * trim filters by route_long_name/route_short_name containing "luas" (case-insensitive) as the
 * most conservative signal available without having downloaded the feed — confirm the actual
 * agency_id/route_id values against a real snapshot before relying on this in production, and
 * tighten the filter to agency_id if the NTA feed carries a dedicated Luas agency row.
 *
 * Usage: node scripts/trim-dublin-gtfs.mjs [--url=<gtfs-zip-url>]
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseCsv, filterCsvRows } from "../lib/providers/gtfs/csv.js";
import { unzipSeqEntries } from "../lib/providers/gtfs/seq-shared-unzip.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const OUT_DIR = outArg ? outArg.slice("--out=".length) : join(ROOT, "qa/fixtures/dublin/gtfs");
const DEFAULT_URL = "https://www.transportforireland.ie/transitData/Data/GTFS_All.zip";

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

function isLuasRoute(route) {
  const short = String(route.route_short_name || "").toLowerCase();
  const long = String(route.route_long_name || "").toLowerCase();
  return short.includes("luas") || long.includes("luas") || /\bred\b|\bgreen\b/.test(long);
}

/**
 * Given a raw NTA GTFS_All.zip buffer, return the trimmed+dieted file contents keyed by
 * filename. Kept pure (no fs/network access) so it can be statically imported by
 * lib/gtfs-refresh.js if/when Dublin is added there ahead of a live flip (not done yet — Dublin
 * stays `planned`, and runGtfsRefresh only refreshes registry status:"live" cities).
 *
 * @param {Buffer} buffer
 */
export function buildTrimmedFiles(buffer) {
  const zipFiles = unzipSeqEntries(buffer);

  const routes = parseCsv(readZipText(zipFiles, "routes.txt"));
  const trips = parseCsv(readZipText(zipFiles, "trips.txt"));
  const stops = parseCsv(readZipText(zipFiles, "stops.txt"));
  const calendar = parseCsv(readZipText(zipFiles, "calendar.txt"));
  const calendarDates = parseCsv(readZipText(zipFiles, "calendar_dates.txt"));
  const feedInfo = parseCsv(readZipText(zipFiles, "feed_info.txt"));
  const agency = parseCsv(readZipText(zipFiles, "agency.txt"));

  const luasRoutes = routes.filter(isLuasRoute);
  const luasRouteIds = new Set(luasRoutes.map((route) => route.route_id));
  const luasTrips = trips.filter((trip) => luasRouteIds.has(trip.route_id));
  const luasTripIds = new Set(luasTrips.map((trip) => trip.trip_id));

  // Streamed: stop_times.txt covers every Irish operator (bus + rail + Luas) — never
  // materialize every row, only the Luas-matching ones.
  const luasStopTimes = filterCsvRows(readZipText(zipFiles, "stop_times.txt"), (row) =>
    luasTripIds.has(row.trip_id)
  );

  const usedStopIds = new Set(luasStopTimes.map((row) => row.stop_id));
  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  for (const stopId of [...usedStopIds]) {
    const stop = stopsById.get(stopId);
    if (stop?.parent_station) {
      usedStopIds.add(stop.parent_station);
    }
  }
  for (const stop of stops) {
    if (usedStopIds.has(stop.stop_id) || (stop.parent_station && usedStopIds.has(stop.parent_station))) {
      usedStopIds.add(stop.stop_id);
    }
  }
  const luasStops = stops.filter((stop) => usedStopIds.has(stop.stop_id));

  const luasAgencyIds = new Set(luasRoutes.map((route) => route.agency_id).filter(Boolean));
  const luasAgency = luasAgencyIds.size ? agency.filter((row) => luasAgencyIds.has(row.agency_id)) : agency;

  const usedServiceIds = new Set(luasTrips.map((trip) => trip.service_id));
  const luasCalendar = calendar.filter((row) => usedServiceIds.has(row.service_id));
  const luasCalendarDates = calendarDates.filter((row) => usedServiceIds.has(row.service_id));

  const outputs = {
    "agency.txt": luasAgency,
    "feed_info.txt": feedInfo,
    "routes.txt": luasRoutes,
    "trips.txt": luasTrips,
    "stops.txt": luasStops,
    "stop_times.txt": luasStopTimes,
    "calendar.txt": luasCalendar,
    "calendar_dates.txt": luasCalendarDates,
  };
  const columnsByFile = {
    "agency.txt": Object.keys(agency[0] ?? {}),
    "feed_info.txt": Object.keys(feedInfo[0] ?? {}),
    "routes.txt": Object.keys(routes[0] ?? {}),
    "trips.txt": Object.keys(trips[0] ?? {}),
    "stops.txt": Object.keys(stops[0] ?? {}),
    "stop_times.txt": Object.keys(
      luasStopTimes[0] ?? { trip_id: "", arrival_time: "", departure_time: "", stop_id: "", stop_sequence: "" }
    ),
    "calendar.txt": Object.keys(calendar[0] ?? {}),
    "calendar_dates.txt": Object.keys(calendarDates[0] ?? {}),
  };

  const output = {};
  for (const [filename, rows] of Object.entries(outputs)) {
    output[filename] = toCsv(rows, columnsByFile[filename]);
  }

  return {
    output,
    summary: `routes=${luasRoutes.length} trips=${luasTrips.length} stops=${luasStops.length} stop_times=${luasStopTimes.length}`,
    feedInfo: feedInfo[0] ?? null,
  };
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

  const buffer = Buffer.from(await response.arrayBuffer());
  const { output, summary, feedInfo } = buildTrimmedFiles(buffer);

  mkdirSync(OUT_DIR, { recursive: true });
  for (const [filename, content] of Object.entries(output)) {
    writeFileSync(join(OUT_DIR, filename), content);
  }

  const readme = `# Dublin (Luas) GTFS fixture (Red + Green only)

**Source:** ${url}
**Trimmed:** ${new Date().toISOString().slice(0, 10)}
**Feed span:** ${feedInfo?.feed_start_date ?? "?"} → ${feedInfo?.feed_end_date ?? "?"}

## Regenerate

\`\`\`bash
node scripts/trim-dublin-gtfs.mjs
node scripts/publish-gtfs-fixture-to-blob.mjs dublin
\`\`\`

## Trim rules

- Routes whose route_short_name/route_long_name mentions "luas", "red", or "green" (UNVERIFIED
  against a live NTA payload — confirm and tighten to agency_id before flip; see file header)
- Trips, stop_times, calendar rows restricted to included Luas services
- Parent stations and all child platform stops retained for used Luas stops
`;
  writeFileSync(join(OUT_DIR, "README.md"), readme);

  console.log(`Wrote Luas fixture to ${OUT_DIR}`);
  console.log(summary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
