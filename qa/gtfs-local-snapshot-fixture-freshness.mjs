/**
 * Offline — proves the local calendar-only GTFS fixtures introduced by
 * docs/jim-brief-blob-transfer-reduction.md (item 1) actually exercise real
 * staleness-detection logic, not just "the file loads without throwing".
 *
 * (a) every one of the 7 live blob/agency-backed cities' local fixtures
 *     (qa/fixtures/gtfs-snapshots/<city>/) currently reads as covering
 *     today — the same positive case qa/<city>-dogfood-gate.mjs relies on.
 * (b) a deliberately expired local fixture (calendar ended 2020-06-01) still
 *     throws through the exact same code path (loadGtfsStaticFromDirectory
 *     -> assertSnapshotNotStaleTodayOrSkip) — by construction, not by
 *     assertion, so a future change that accidentally defangs the check
 *     (e.g. swallowing the wrong error name) fails this gate immediately.
 *
 * Usage: node qa/gtfs-local-snapshot-fixture-freshness.mjs
 */
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadGtfsStaticFromDirectory } from "../lib/providers/gtfs/static-cache.js";
import { loadLocalGtfsSnapshotForStaleCheck } from "./lib/local-gtfs-snapshot.mjs";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";

const CITIES = ["sydney", "brisbane", "canberra", "gold-coast", "newcastle", "malmo", "uppsala"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testEveryCityFixtureCoversToday() {
  for (const city of CITIES) {
    const check = await assertSnapshotNotStaleTodayOrSkip(city, () =>
      loadLocalGtfsSnapshotForStaleCheck(city, "UTC")
    );
    assert(check !== null, `${city}: local fixture must be judgable (not skipped)`);
    assert(check.coversToday === true, `${city}: local fixture must cover today, got ${JSON.stringify(check)}`);
  }
}

async function testExpiredLocalFixtureStillThrows() {
  const dir = mkdtempSync(join(tmpdir(), "gtfs-expired-fixture-"));
  try {
    writeFileSync(
      join(dir, "calendar.txt"),
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n" +
        "WD,1,1,1,1,1,1,1,20200101,20200601\n"
    );
    writeFileSync(join(dir, "calendar_dates.txt"), "service_id,date,exception_type\n");
    writeFileSync(join(dir, "stops.txt"), "stop_id,stop_name,stop_lat,stop_lon\n");
    writeFileSync(join(dir, "routes.txt"), "route_id,agency_id,route_short_name,route_long_name,route_type\n");
    writeFileSync(join(dir, "trips.txt"), "trip_id,route_id,service_id\n");
    writeFileSync(join(dir, "stop_times.txt"), "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n");

    let thrown = null;
    try {
      await assertSnapshotNotStaleTodayOrSkip("expired-fixture-test-city", () =>
        loadGtfsStaticFromDirectory(dir, { timeZone: "UTC" })
      );
    } catch (error) {
      thrown = error;
    }
    assert(thrown !== null, "an expired local fixture (ended 2020-06-01) must throw, not pass silently");
    assert(
      /does not include today/.test(thrown.message),
      `expected a "does not include today" message, got: ${thrown?.message}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  await testEveryCityFixtureCoversToday();
  await testExpiredLocalFixtureStillThrows();
  console.log(
    "gtfs-local-snapshot-fixture-freshness: ok (7 city fixtures cover today; an expired fixture still throws)"
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
