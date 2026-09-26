#!/usr/bin/env node
/**
 * D2 — Trim NTA's dedicated Luas GTFS feed (google_transit_luas.zip) down to a small local
 * fixture, so lib/providers/dublin.js's runtime loadGtfsStatic() call never has to fetch/parse a
 * larger feed on the request path (same reasoning as lib/gtfs-refresh.js's Amsterdam/Rotterdam
 * OVapi retirement — a ~230MB nationwide feed OOM'd a Hobby-plan function).
 *
 * Source corrected 26 Sep 2026 (docs/jim-brief-dublin-luas-source-fix.md,
 * docs/dublin-d1/luas-static-source.md): NTA's national GTFS_All.zip does NOT contain Luas —
 * filtering it for "luas" only matches Dublin Bus routes that name Luas stops as points of
 * interest, not actual tram service (route_type 0). Luas is published separately at
 * https://www.transportforireland.ie/transitData/google_transit_luas.zip (no key, CC BY 4.0 —
 * "Contains Irish Government Data licensed under a Creative Commons Attribution 4.0
 * International (CC BY 4.0) licence"). Override with the DUBLIN_GTFS_URL env var or --url= if
 * the source ever needs to change again. Luas has been operated by KeolisAmey since 1 Sep 2026
 * (previously Transdev).
 *
 * Output is published to the next-train-gtfs Vercel Blob store at gtfs/dublin.zip
 * (scripts/publish-gtfs-fixture-to-blob.mjs's pathname convention) — NOT run automatically here
 * (this script only writes local files; publishing needs BLOB_READ_WRITE_TOKEN, not available
 * this session — docs/dublin-d1/jim-handoff.md). Once published, lib/providers/dublin.js reads
 * it via gtfsFixtureBlobUrl("dublin"), same pattern as lib/providers/melbourne.js.
 *
 * Since the source feed should already be Luas-only, this trim keeps all of its tram routes
 * (route_type 0, or the extended tram code 900) rather than filtering by name — confirm the
 * actual agency_id/route_id values against a real snapshot before relying on this in
 * production (docs/dublin-d1/published-network.json — gtfsRouteIdsIfKnown deliberately left
 * empty). qa/verify-dublin-gtfs-snapshot.mjs checks the published result stays small
 * (at most 4 routes, all route_type 0 or 900).
 *
 * Usage: node scripts/trim-dublin-gtfs.mjs [--url=<gtfs-zip-url>]
 * (or set DUBLIN_GTFS_URL to override the default source URL)
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
const DEFAULT_URL =
  process.env.DUBLIN_GTFS_URL || "https://www.transportforireland.ie/transitData/google_transit_luas.zip";

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

// The source feed is Luas-only, so keep every tram route it publishes rather than filtering by
// name: route_type 0 is the standard GTFS tram/light-rail code, 900 is the extended code some
// feeds use in its place.
const TRAM_ROUTE_TYPES = new Set(["0", "900"]);

function isLuasRoute(route) {
  return TRAM_ROUTE_TYPES.has(String(route.route_type ?? ""));
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

- Routes with route_type 0 (tram/light rail) or the extended tram code 900 — the dedicated Luas
  feed should already contain nothing else (confirm against a real snapshot; see file header)
- Trips, stop_times, calendar rows restricted to included Luas services
- Parent stations and all child platform stops retained for used Luas stops

Contains Irish Government Data licensed under a Creative Commons Attribution 4.0 International
(CC BY 4.0) licence.
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
