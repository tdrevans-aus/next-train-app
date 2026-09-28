#!/usr/bin/env node
/**
 * Trim Rejseplanen's national static GTFS (all Danish operators, one shared feed —
 * lib/providers/rejseplanen.js) down to what Copenhagen's board can ever actually show, so
 * lib/providers/copenhagen.js's runtime loadGtfsStatic() call reads a small published snapshot
 * from Blob instead of downloading+parsing the whole national feed on the request path (same
 * fix as Dublin's scripts/trim-dublin-gtfs.mjs and Prague's scripts/trim-prague-gtfs.mjs).
 *
 * docs/jim-brief-copenhagen-snapshot-trim.md (28 Sep 2026): cold `/api/directions` for
 * København H measured 14-19s against the full national feed (PR #504) — the fetch+parse of a
 * feed covering 25+ operators, almost none of which Copenhagen's board ever renders.
 *
 * What's kept, and why it's safe (never trims away an `in` board-eligibility verdict — see
 * docs/copenhagen-d1/oracle-clash-report.md's Board eligibility section):
 *
 * - Metro (M1-M4): kept in FULL — every trip, every stop along every route. All 44 Metro
 *   stations are in-catalog (lib/cities/copenhagen/stations.json), so the board can be
 *   requested for any of them and needs that station's whole stop_times path.
 * - S-tog (A, B, Bx, C, E, H, F) and DSB Regional/InterCity/InterCityLyn/Öresundståg: per
 *   lib/providers/copenhagen.js's own tripAllowed()/mapGroupOf(), these are ONLY ever rendered
 *   on a board at the four named shared stations (Nørreport, Nørrebro, København H, Nordhavn —
 *   see each catalog entry's sharedOperators) — no other catalog station carries them, and no
 *   non-catalog S-tog/DSB-only station (e.g. Hellerup) is ever resolved by
 *   resolveCatalogEntry() in the first place. So only stop_times rows AT those four stations are
 *   kept for these routes — buildBoardForStops (lib/providers/gtfs/board.js) only ever reads
 *   stopTimesByStopId[stopId] for the requested station's own stop_ids, never a trip's full path,
 *   so this loses nothing a board could show while dropping the rest of Denmark's regional
 *   network, which is most of the national feed's bulk.
 *
 * Route/trip classification reuses the SAME functions the live adapter uses
 * (METRO_CODES/STOG_CODES from lib/providers/copenhagen.js, classifyDsbService from
 * lib/cities/copenhagen/marketing-directions.js) rather than re-deriving the logic here, so a
 * trip that would be `in` at runtime is never dropped by a differently-worded trim rule. The
 * four shared stations' stop_ids are resolved with the SAME findRailStopIdsForName() the
 * adapter calls at request time (lib/providers/gtfs/static-cache.js), against the untrimmed
 * feed's full stops.txt, so the trim's station match is byte-for-byte the same lookup the
 * running app already relies on — never a second, hand-written name-matching rule that could
 * drift from it.
 *
 * Output is published to the next-train-gtfs Vercel Blob store at gtfs/copenhagen.zip
 * (scripts/publish-gtfs-fixture-to-blob.mjs's pathname convention). Copenhagen is
 * status: "live" (unlike Dublin/Prague when their trims shipped), so publishing requires
 * `--allow-live` on that script — this is a genuine republish of real upstream data trimmed to
 * a smaller route set, not a synthetic test fixture overwriting production.
 *
 * Usage: node scripts/trim-copenhagen-gtfs.mjs [--url=<gtfs-zip-url>] [--out=<dir>]
 * (or set COPENHAGEN_GTFS_URL to override the default source URL)
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseCsv, filterCsvRows } from "../lib/providers/gtfs/csv.js";
import { unzipSeqEntries } from "../lib/providers/gtfs/seq-shared-unzip.js";
import { findRailStopIdsForName } from "../lib/providers/gtfs/static-cache.js";
import { REJSEPLANEN_GTFS_STATIC_URL } from "../lib/providers/rejseplanen.js";
import { METRO_CODES, STOG_CODES } from "../lib/providers/copenhagen.js";
import { classifyDsbService } from "../lib/cities/copenhagen/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const OUT_DIR = outArg ? outArg.slice("--out=".length) : join(ROOT, "qa/fixtures/copenhagen/gtfs");
const DEFAULT_URL = process.env.COPENHAGEN_GTFS_URL || REJSEPLANEN_GTFS_STATIC_URL;

/** The four stations where S-tog/DSB/Öresundståg are ever shown — see file header. */
export const SHARED_STATION_NAMES = ["Nørreport", "København H", "Nørrebro", "Nordhavn"];

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

/**
 * Same classification the live adapter uses at trip level (copenhagen.js mapGroupOf), applied
 * here to a raw routes.txt row instead — the fields it inspects (route_short_name,
 * route_long_name, route_desc) are route-level, not trip-level, so classifying once per route
 * is equivalent and far cheaper than once per trip.
 * @returns {"metro"|"restricted"|null}
 */
export function classifyRoute(route) {
  const code = String(route.route_short_name || "").trim().toUpperCase();
  if (METRO_CODES.has(code)) {
    return "metro";
  }
  if (STOG_CODES.has(code)) {
    return "restricted";
  }
  const dsb = classifyDsbService({
    routeShortName: route.route_short_name,
    routeLongName: route.route_long_name,
    routeDesc: route.route_desc,
  });
  return dsb ? "restricted" : null;
}

/**
 * Given a raw Rejseplanen GTFS.zip buffer, return the trimmed+dieted file contents keyed by
 * filename. Kept pure (no fs/network access) so it can be reused by a future change-driven
 * refresh cron the same way Brisbane/Gold Coast's build functions are reused by
 * lib/gtfs-refresh.js — not wired there yet (Copenhagen's upstream has no confirmed rate-limit
 * profile to budget a routine probe against, same open question as malmo/uppsala in that file).
 *
 * @param {Buffer} buffer
 */
export function buildTrimmedFiles(buffer) {
  const zipFiles = unzipSeqEntries(buffer);

  const routes = parseCsv(readZipText(zipFiles, "routes.txt"));
  const stops = parseCsv(readZipText(zipFiles, "stops.txt"));
  const calendar = parseCsv(readZipText(zipFiles, "calendar.txt"));
  const calendarDates = parseCsv(readZipText(zipFiles, "calendar_dates.txt"));
  const feedInfo = parseCsv(readZipText(zipFiles, "feed_info.txt"));
  const agency = parseCsv(readZipText(zipFiles, "agency.txt"));

  const routeGroupById = new Map();
  for (const route of routes) {
    const group = classifyRoute(route);
    if (group) {
      routeGroupById.set(route.route_id, group);
    }
  }

  // Resolve the four shared stations' stop_ids against the FULL (untrimmed) stops.txt, using
  // the exact same lookup the live adapter calls at request time — see file header.
  const sharedStationStopIds = new Set();
  for (const name of SHARED_STATION_NAMES) {
    for (const stopId of findRailStopIdsForName({ stops }, name)) {
      sharedStationStopIds.add(stopId);
    }
  }

  // trips.txt: streamed, kept only for trips on an in-scope route — this is the vast majority
  // of the trim's size reduction on top of stop_times, since Rejseplanen's national trips.txt
  // otherwise covers every DK bus/rail/ferry trip.
  const keptTrips = filterCsvRows(readZipText(zipFiles, "trips.txt"), (trip) =>
    routeGroupById.has(trip.route_id)
  );
  const tripGroupById = new Map(keptTrips.map((trip) => [trip.trip_id, routeGroupById.get(trip.route_id)]));

  // stop_times.txt: streamed, single pass. Metro trips keep every stop; S-tog/DSB/Öresundståg
  // trips keep only rows at one of the four shared stations (see file header for why that loses
  // nothing board-visible).
  const keptStopTimes = filterCsvRows(readZipText(zipFiles, "stop_times.txt"), (row) => {
    const group = tripGroupById.get(row.trip_id);
    if (!group) {
      return false;
    }
    if (group === "metro") {
      return true;
    }
    return sharedStationStopIds.has(row.stop_id);
  });

  // A trip only "survives" if at least one of its stop_times rows was kept — a restricted-group
  // trip that never calls at a shared station (the overwhelming majority of DK regional trips)
  // is dropped here even though its route was in scope.
  const keptTripIds = new Set(keptStopTimes.map((row) => row.trip_id));
  const finalTrips = keptTrips.filter((trip) => keptTripIds.has(trip.trip_id));

  const keptRouteIds = new Set(finalTrips.map((trip) => trip.route_id));
  const keptRoutes = routes.filter((route) => keptRouteIds.has(route.route_id));

  const usedStopIds = new Set(keptStopTimes.map((row) => row.stop_id));
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
  const keptStops = stops.filter((stop) => usedStopIds.has(stop.stop_id));

  const keptAgencyIds = new Set(keptRoutes.map((route) => route.agency_id).filter(Boolean));
  const keptAgency = keptAgencyIds.size ? agency.filter((row) => keptAgencyIds.has(row.agency_id)) : agency;

  const usedServiceIds = new Set(finalTrips.map((trip) => trip.service_id));
  const keptCalendar = calendar.filter((row) => usedServiceIds.has(row.service_id));
  const keptCalendarDates = calendarDates.filter((row) => usedServiceIds.has(row.service_id));

  const outputs = {
    "agency.txt": keptAgency,
    "feed_info.txt": feedInfo,
    "routes.txt": keptRoutes,
    "trips.txt": finalTrips,
    "stops.txt": keptStops,
    "stop_times.txt": keptStopTimes,
    "calendar.txt": keptCalendar,
    "calendar_dates.txt": keptCalendarDates,
  };
  const columnsByFile = {
    "agency.txt": Object.keys(agency[0] ?? {}),
    "feed_info.txt": Object.keys(feedInfo[0] ?? {}),
    "routes.txt": Object.keys(routes[0] ?? {}),
    "trips.txt": Object.keys(
      finalTrips[0] ?? { route_id: "", service_id: "", trip_id: "", trip_headsign: "" }
    ),
    "stops.txt": Object.keys(stops[0] ?? {}),
    "stop_times.txt": Object.keys(
      keptStopTimes[0] ?? { trip_id: "", arrival_time: "", departure_time: "", stop_id: "", stop_sequence: "" }
    ),
    "calendar.txt": Object.keys(calendar[0] ?? {}),
    "calendar_dates.txt": Object.keys(calendarDates[0] ?? {}),
  };

  const output = {};
  for (const [filename, rows] of Object.entries(outputs)) {
    output[filename] = toCsv(rows, columnsByFile[filename]);
  }

  const metroRouteCount = keptRoutes.filter((r) => routeGroupById.get(r.route_id) === "metro").length;
  const restrictedRouteCount = keptRoutes.length - metroRouteCount;

  return {
    output,
    summary: `routes=${keptRoutes.length} (metro=${metroRouteCount}, s-tog/dsb/oresundstag=${restrictedRouteCount}) trips=${finalTrips.length} stops=${keptStops.length} stop_times=${keptStopTimes.length}`,
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

  const readme = `# Copenhagen GTFS fixture (Metro + S-tog/DSB/Öresundståg at the four shared stations)

**Source:** ${url}
**Trimmed:** ${new Date().toISOString().slice(0, 10)}
**Feed span:** ${feedInfo?.feed_start_date ?? "?"} → ${feedInfo?.feed_end_date ?? "?"}

## Regenerate

\`\`\`bash
node scripts/trim-copenhagen-gtfs.mjs
node scripts/publish-gtfs-fixture-to-blob.mjs copenhagen --allow-live
\`\`\`

(\`--allow-live\` is required — Copenhagen is status: "live" — see
scripts/publish-gtfs-fixture-to-blob.mjs's guardrail comment.)

## Trim rules

- Metro (M1-M4): every route, trip, and stop kept in full — all 44 stations are in-catalog.
- S-tog (A, B, Bx, C, E, H, F) and DSB Regional/InterCity/InterCityLyn/Öresundståg: routes kept,
  but trips/stop_times restricted to the four shared stations (Nørreport, Nørrebro,
  København H, Nordhavn) — the only stations lib/providers/copenhagen.js ever renders them at.
- Parent stations and all child platform stops retained for every kept stop.
- Route/trip classification reuses lib/providers/copenhagen.js's own METRO_CODES/STOG_CODES and
  lib/cities/copenhagen/marketing-directions.js's classifyDsbService — never a second,
  hand-written rule that could drift from what the adapter actually renders.

${summary}
`;
  writeFileSync(join(OUT_DIR, "README.md"), readme);

  console.log(`Wrote Copenhagen fixture to ${OUT_DIR}`);
  console.log(summary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
