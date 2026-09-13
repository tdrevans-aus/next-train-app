/**
 * Offline — docs/jim-brief-malmo-planned-closure-empty-board.md.
 *
 * A synthetic GTFS static fixture (no network, no Vercel Blob) with three stations sharing one
 * feed:
 *   - "Gap" (stop S1): rail service only on 2026-09-03 and 2026-11-09 — a planned closure in
 *     progress on the fixture's "now" (2026-09-13). `findNextServiceDate` must return the
 *     resumption date, and the full `fetchGtfsRealtimeBoard` pipeline must surface it on the
 *     board object precisely because the board itself is empty.
 *   - "Regular" (stop S2): rail service every day including today — the board is non-empty, so
 *     `nextServiceDate` must stay null (never computed once trips exist).
 *   - "Beyond" (stop S3): rail service only on a date that has already passed (2026-08-01), and
 *     no service anywhere in the feed's calendar range after that — `findNextServiceDate` must
 *     exhaust the feed's calendar range and return null (distinguishing "no more service in this
 *     feed" from "gap in progress").
 *
 * Usage: node qa/planned-closure-empty-board.mjs
 */
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadGtfsStaticFromDirectory } from "../lib/providers/gtfs/static-cache.js";
import { findNextServiceDate } from "../lib/providers/gtfs/board.js";
import { fetchGtfsRealtimeBoard } from "../lib/providers/gtfs/realtime-board.js";

export const TIME_ZONE = "UTC";
export const NOW = new Date("2026-09-13T00:00:00Z");
/** Resumption date baked into the GAP_B calendar_dates.txt row below. */
export const GAP_RESUMES_ON = "2026-11-09";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Exported (round 3, docs/jim-brief-malmo-planned-closure-empty-board.md) so a city gate can
 * drive its own real wrapper (e.g. malmo.js's `fetchStationBoard({ loadStatic })`) with this
 * fixture instead of a live Vercel Blob fetch. `routeLongName`/`routeDesc` are overridable
 * because a city's `filterTrip` (e.g. Malmö's Pågatåg-only `tripAllowed`) may need the
 * synthetic route to read as in-scope — the default ("Test Line", no route_desc) is what the
 * generic tests below use, where no filterTrip is applied.
 */
export function buildFixtureDir({ routeLongName = "Test Line", routeDesc = "" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "planned-closure-fixture-"));

  writeFileSync(
    join(dir, "stops.txt"),
    "stop_id,stop_name,stop_lat,stop_lon\n" +
      "S1,Gap Stop,55.0,13.0\n" +
      "S2,Regular Stop,55.1,13.1\n" +
      "S3,Beyond Stop,55.2,13.2\n"
  );

  writeFileSync(
    join(dir, "routes.txt"),
    "route_id,agency_id,route_short_name,route_long_name,route_type,route_desc\n" +
      `R1,AG,1,${routeLongName},2,${routeDesc}\n`
  );

  writeFileSync(
    join(dir, "trips.txt"),
    "trip_id,route_id,service_id,trip_headsign\n" +
      "T_GAP_A,R1,GAP_A,Gap Early\n" +
      "T_GAP_B,R1,GAP_B,Gap Late\n" +
      "T_REG,R1,REG,Regular\n" +
      "T_BEYOND,R1,BEYOND,Beyond\n"
  );

  writeFileSync(
    join(dir, "stop_times.txt"),
    "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type\n" +
      "T_GAP_A,08:00:00,08:00:00,S1,1,0\n" +
      "T_GAP_B,08:00:00,08:00:00,S1,1,0\n" +
      "T_REG,08:00:00,08:00:00,S2,1,0\n" +
      "T_BEYOND,08:00:00,08:00:00,S3,1,0\n"
  );

  // No weekly calendar.txt rows — every service date is driven explicitly by
  // calendar_dates.txt so the fixture has no hidden day-of-week behaviour.
  writeFileSync(
    join(dir, "calendar.txt"),
    "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
  );

  writeFileSync(
    join(dir, "calendar_dates.txt"),
    "service_id,date,exception_type\n" +
      "GAP_A,20260903,1\n" +
      "GAP_B,20261109,1\n" +
      "REG,20260912,1\n" +
      "REG,20260913,1\n" +
      "REG,20260914,1\n" +
      "REG,20260915,1\n" +
      "REG,20261109,1\n" +
      "BEYOND,20260801,1\n"
  );

  return dir;
}

async function testGapInProgress(staticData) {
  const result = findNextServiceDate({
    stopIds: ["S1"],
    staticData,
    timeZone: TIME_ZONE,
    now: NOW,
  });
  assert(
    result === "2026-11-09",
    `gap-in-progress station: expected "2026-11-09", got ${JSON.stringify(result)}`
  );
}

async function testNoGap(staticData) {
  // Directly: a station with service today has an active date "today", so an isolated call to
  // findNextServiceDate legitimately reports the *next* date after today (regardless of whether
  // today has service) — it is fetchGtfsRealtimeBoard's job to only invoke it when the board
  // itself is empty. That end-to-end guard is what actually matters, so assert it there.
  const board = await fetchGtfsRealtimeBoard("Regular Stop", {
    loadStatic: async () => staticData,
    resolveStopIds: () => ["S2"],
    timeZone: TIME_ZONE,
    now: NOW,
  });
  assert(board.trips.length > 0, "regular station: expected a non-empty board (has service today)");
  assert(
    board.nextServiceDate === null,
    `regular station: expected nextServiceDate null (board not empty), got ${JSON.stringify(board.nextServiceDate)}`
  );
}

async function testBeyondFeedRange(staticData) {
  const result = findNextServiceDate({
    stopIds: ["S3"],
    staticData,
    timeZone: TIME_ZONE,
    now: NOW,
  });
  assert(
    result === null,
    `beyond-feed-range station: expected null, got ${JSON.stringify(result)}`
  );
}

async function testFullPipelineSurfacesNextServiceDate(staticData) {
  const board = await fetchGtfsRealtimeBoard("Gap Stop", {
    loadStatic: async () => staticData,
    resolveStopIds: () => ["S1"],
    timeZone: TIME_ZONE,
    now: NOW,
  });
  assert(board.trips.length === 0, "gap station: expected an empty board during the closure");
  assert(
    board.nextServiceDate === "2026-11-09",
    `gap station: expected board.nextServiceDate "2026-11-09", got ${JSON.stringify(board.nextServiceDate)}`
  );
}

async function main() {
  const dir = buildFixtureDir();
  try {
    const staticData = loadGtfsStaticFromDirectory(dir, { timeZone: TIME_ZONE });
    await testGapInProgress(staticData);
    await testNoGap(staticData);
    await testBeyondFeedRange(staticData);
    await testFullPipelineSurfacesNextServiceDate(staticData);
    console.log(
      "planned-closure-empty-board: ok (gap-in-progress resolves resumption date; a station " +
        "with service today never computes one; a station whose service has ended for good " +
        "resolves null)"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
