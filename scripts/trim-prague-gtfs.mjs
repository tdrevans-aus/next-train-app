#!/usr/bin/env node
/**
 * D2 — Trim PID's static GTFS zip (https://data.pid.cz/PID_GTFS.zip, ~48MB zipped, verified
 * live 200 anonymous per docs/prague-d1/oracle-clash-report.md) down to a small metro-only
 * fixture, so lib/providers/prague.js's runtime loadGtfsStatic() call never has to
 * fetch/parse the full multi-mode feed (tram + bus + trolleybus + regional rail (Esko) +
 * funicular + ferries) on the request path — same reasoning as
 * scripts/trim-dublin-gtfs.mjs / lib/gtfs-refresh.js's Amsterdam/Rotterdam OVapi retirement.
 *
 * This fixture is used ONLY to resolve catalog station names to GTFS stop_id at request time
 * (per docs/prague-d1/jim-handoff.md's instruction to cross-check the D1 station roster against
 * PID stops.txt before any product edit) — Prague's live board content comes from the Golemio
 * API (proprietary JSON keyed by GTFS stop_id via the `ids[]` param), NOT from this static
 * feed's own schedule/stop_times. stop_times.txt is kept small (metro-only) purely so
 * findRailStopIdsForName()'s parent/child station expansion has real data to walk; it is not
 * used to synthesize a schedule.
 *
 * Metro routes are route_type "1" (heavy rail metro) in GTFS. This trim keeps every route_type
 * 1 route regardless of route_short_name, then confirms below (via --check) that the kept
 * short_names are exactly {A, B, C} — Line D is not open (docs/prague-d1/oracle-clash-report.md)
 * so it must never appear in a real snapshot; if it ever does, treat that as new information
 * for Tim, not something to silently include.
 *
 * Output is published to the next-train-gtfs Vercel Blob store at gtfs/prague.zip
 * (scripts/publish-gtfs-fixture-to-blob.mjs's pathname convention). Once published,
 * lib/providers/prague.js reads it via gtfsFixtureBlobUrl("prague"), same pattern as
 * lib/providers/dublin.js / lib/providers/melbourne.js.
 *
 * Usage: node scripts/trim-prague-gtfs.mjs [--url=<gtfs-zip-url>]
 * (or set PRAGUE_GTFS_URL to override the default source URL)
 */

import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseCsv, filterCsvRows } from "../lib/providers/gtfs/csv.js";
import { unzipSeqEntries } from "../lib/providers/gtfs/seq-shared-unzip.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const OUT_DIR = outArg ? outArg.slice("--out=".length) : join(ROOT, "qa/fixtures/prague/gtfs");
const DEFAULT_URL = process.env.PRAGUE_GTFS_URL || "https://data.pid.cz/PID_GTFS.zip";

/**
 * The 58 unique station names from Luke's D1 pack (docs/prague-d1/published-network.json),
 * cross-checked 28 Sep 2026 against a live pull of this feed: every one of the 58 matches
 * exactly one location_type=1 (parent/station) row's stop_name in the full, unfiltered feed —
 * no duplicates, no misses (confirmed by direct query, not assumed). Used below to include a
 * station's parent + child platform stops by NAME even when today's snapshot has zero
 * currently-scheduled metro stop_times for it (see the Flora note below) — resolving names to
 * stop_ids must not depend on which trips happen to run today.
 */
const publishedNetwork = JSON.parse(
  readFileSync(join(ROOT, "docs/prague-d1/published-network.json"), "utf8")
);
const KNOWN_STATION_NAMES = new Set(
  publishedNetwork.lines.flatMap((line) => line.stations)
);

const METRO_ROUTE_TYPE = "1";

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

function isMetroRoute(route) {
  return String(route.route_type ?? "") === METRO_ROUTE_TYPE;
}

/**
 * Given a raw PID_GTFS.zip buffer, return the trimmed (metro-only) file contents keyed by
 * filename, plus a summary of the kept route short names (for the --check assertion that only
 * A/B/C ever appear — no Line D).
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

  const metroRoutes = routes.filter(isMetroRoute);
  const metroRouteIds = new Set(metroRoutes.map((route) => route.route_id));
  const metroTrips = trips.filter((trip) => metroRouteIds.has(trip.route_id));
  const metroTripIds = new Set(metroTrips.map((trip) => trip.trip_id));

  // Streamed: stop_times.txt covers every PID mode (metro + tram + bus + trolleybus + regional
  // rail + funicular + ferries) — never materialize every row, only the metro-matching ones.
  const metroStopTimes = filterCsvRows(readZipText(zipFiles, "stop_times.txt"), (row) =>
    metroTripIds.has(row.trip_id)
  );

  const usedStopIds = new Set(metroStopTimes.map((row) => row.stop_id));
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

  // Name-matched union (see KNOWN_STATION_NAMES comment above): a station whose name is on the
  // D1 roster is included by its parent + child platform stops even when no metro trip's
  // stop_times touches it today. Confirmed live 28 Sep 2026: Flora (Metro A, between Jiřího z
  // Poděbrad and Želivského) has zero stop_times referencing either of its platform stop_ids
  // (U118Z101P/U118Z102P) in this snapshot — every sampled Line A trip runs Jiřího z Poděbrad ->
  // Želivského directly, skipping it (a real, current service gap, not a fixture bug) — while
  // still carrying its own parent station row (U118S1, location_type 1) and platform children
  // (parent_station=U118S1) distinct from the same node's bus platforms (U118Z1P-Z4P, which have
  // no parent_station and are correctly excluded). Trip-derived matching alone would silently
  // drop Flora's stop_id from this fixture, breaking name resolution for a station that is
  // still real and still catalogued — see docs/prague-d1/jim-handoff.md's appended finding.
  const parentIdsByName = new Map();
  for (const stop of stops) {
    if (stop.location_type === "1" && KNOWN_STATION_NAMES.has(stop.stop_name)) {
      parentIdsByName.set(stop.stop_name, stop.stop_id);
    }
  }
  const namedParentIds = new Set(parentIdsByName.values());
  for (const stop of stops) {
    if (namedParentIds.has(stop.stop_id) || (stop.parent_station && namedParentIds.has(stop.parent_station))) {
      usedStopIds.add(stop.stop_id);
    }
  }

  const metroStops = stops.filter((stop) => usedStopIds.has(stop.stop_id));
  const missingNames = [...KNOWN_STATION_NAMES].filter((name) => !parentIdsByName.has(name));

  const metroAgencyIds = new Set(metroRoutes.map((route) => route.agency_id).filter(Boolean));
  const metroAgency = metroAgencyIds.size ? agency.filter((row) => metroAgencyIds.has(row.agency_id)) : agency;

  const usedServiceIds = new Set(metroTrips.map((trip) => trip.service_id));
  const metroCalendar = calendar.filter((row) => usedServiceIds.has(row.service_id));
  const metroCalendarDates = calendarDates.filter((row) => usedServiceIds.has(row.service_id));

  const outputs = {
    "agency.txt": metroAgency,
    "feed_info.txt": feedInfo,
    "routes.txt": metroRoutes,
    "trips.txt": metroTrips,
    "stops.txt": metroStops,
    "stop_times.txt": metroStopTimes,
    "calendar.txt": metroCalendar,
    "calendar_dates.txt": metroCalendarDates,
  };
  const columnsByFile = {
    "agency.txt": Object.keys(agency[0] ?? {}),
    "feed_info.txt": Object.keys(feedInfo[0] ?? {}),
    "routes.txt": Object.keys(routes[0] ?? {}),
    "trips.txt": Object.keys(trips[0] ?? {}),
    "stops.txt": Object.keys(stops[0] ?? {}),
    "stop_times.txt": Object.keys(
      metroStopTimes[0] ?? { trip_id: "", arrival_time: "", departure_time: "", stop_id: "", stop_sequence: "" }
    ),
    "calendar.txt": Object.keys(calendar[0] ?? {}),
    "calendar_dates.txt": Object.keys(calendarDates[0] ?? {}),
  };

  const output = {};
  for (const [filename, rows] of Object.entries(outputs)) {
    output[filename] = toCsv(rows, columnsByFile[filename]);
  }

  const routeShortNames = [...new Set(metroRoutes.map((r) => String(r.route_short_name ?? "").trim()))].sort();

  return {
    output,
    summary: `routes=${metroRoutes.length} trips=${metroTrips.length} stops=${metroStops.length} stop_times=${metroStopTimes.length}`,
    routeShortNames,
    missingNames,
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
  const { output, summary, routeShortNames, missingNames, feedInfo } = buildTrimmedFiles(buffer);

  const unexpected = routeShortNames.filter((name) => !["A", "B", "C"].includes(name));
  if (unexpected.length) {
    console.error(
      `Unexpected metro route_short_name(s) found: ${unexpected.join(", ")} (expected only A, B, C — ` +
        "Line D is not open per docs/prague-d1/oracle-clash-report.md; this needs a human decision, " +
        "not a silent include)."
    );
    process.exit(1);
  }
  if (missingNames.length) {
    console.error(
      `${missingNames.length} D1 station name(s) had no exact stop_name match in this GTFS snapshot: ` +
        `${missingNames.join(", ")}. Never guess a stop_id for these — fix the D1 name or investigate ` +
        "the feed before publishing."
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const [filename, content] of Object.entries(output)) {
    writeFileSync(join(OUT_DIR, filename), content);
  }

  const readme = `# Prague (Metro A/B/C) GTFS fixture

**Source:** ${url}
**Trimmed:** ${new Date().toISOString().slice(0, 10)}
**Feed span:** ${feedInfo?.feed_start_date ?? "?"} → ${feedInfo?.feed_end_date ?? "?"}
**Kept route_short_name(s):** ${routeShortNames.join(", ")}

## Regenerate

\`\`\`bash
node scripts/trim-prague-gtfs.mjs
node scripts/publish-gtfs-fixture-to-blob.mjs prague
\`\`\`

## Trim rules

- Routes with GTFS route_type "1" (metro) only — drops tram (0), bus (3), trolleybus (11),
  regional rail / Esko (2), funicular (7), ferry (4)
- Trips, stop_times, calendar rows restricted to included metro services
- Parent stations and all child platform stops retained for used metro stops
- Used for stop_id resolution only (lib/providers/prague.js) — live board content comes from the
  Golemio API, not this static schedule.

Data: Pražská integrovaná doprava (PID) — CC BY 4.0.
`;
  writeFileSync(join(OUT_DIR, "README.md"), readme);

  console.log(`Wrote Prague metro fixture to ${OUT_DIR}`);
  console.log(summary);
  console.log(`route_short_name(s): ${routeShortNames.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
