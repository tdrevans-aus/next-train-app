/**
 * Offline — GTFS snapshot manifest + runtime staleness detection
 * (docs/jim-brief-gtfs-snapshot-freshness.md).
 *
 * (a) manifest round-trip: buildManifest -> writeManifest (stubbed put) ->
 *     readManifest (stubbed fetch) recovers the same fields.
 * (b) probeUpstreamChanged returns "unchanged" on equal ETag and "changed"
 *     on a differing ETag/version, using only a HEAD (no body read).
 * (c) a fixture snapshot whose calendar ended yesterday throws
 *     GtfsSnapshotStaleError from checkSnapshotFreshness / buildBoardForStops.
 * (d) a fixture realtime feed with 30 trip updates of which 5 resolve throws
 *     it; 25 resolving does not.
 * (e) a feed with 10 updates never judges (resolvedShareForRealtime.judgable
 *     === false), so a low resolved share among 10 doesn't throw.
 *
 * Usage: node qa/gtfs-snapshot-freshness.mjs
 */
import {
  buildManifest,
  probeUpstreamChanged,
  calendarRangeFromTrimmedOutput,
} from "../lib/providers/gtfs/snapshot-manifest.js";
import {
  buildBoardForStops,
  checkSnapshotFreshness,
  resolvedShareForRealtime,
  STALE_MIN_JUDGABLE_TRIP_UPDATES,
} from "../lib/providers/gtfs/board.js";
import { GtfsSnapshotStaleError } from "../lib/providers/gtfs/errors.js";
import { indexTripUpdates } from "../lib/providers/gtfs/realtime.js";
import {
  isCityStale,
  getStaleCityReport,
  _resetStalenessRegistryForTests,
} from "../lib/providers/gtfs/staleness-registry.js";

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function ymd(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// (a) Manifest round-trip
// ---------------------------------------------------------------------------
async function testManifestRoundTrip() {
  const manifest = buildManifest({
    upstreamUrl: "https://example.invalid/feed.zip",
    etag: `"abc123"`,
    lastModified: "Mon, 01 Sep 2026 03:00:00 GMT",
    calendarRange: { minDate: "20260101", maxDate: "20261231" },
  });

  let putCalls = 0;
  let storedBody = null;
  const stubPut = async (pathname, body) => {
    putCalls += 1;
    storedBody = body;
    return { url: `https://blob.invalid/${pathname}` };
  };

  const { writeManifest, readManifest, gtfsManifestBlobUrl } = await import(
    "../lib/providers/gtfs/snapshot-manifest.js"
  );

  await writeManifest("faketown", manifest, { putImpl: stubPut });
  assert(putCalls === 1, `manifest round-trip: expected 1 put() call, got ${putCalls}`);

  const stubFetchOk = async (url) => {
    assert(
      url === gtfsManifestBlobUrl("faketown"),
      `manifest round-trip: readManifest fetched the wrong URL (${url})`
    );
    return { ok: true, json: async () => JSON.parse(storedBody) };
  };
  const read = await readManifest("faketown", { fetchImpl: stubFetchOk });
  assert(read.etag === manifest.etag, "manifest round-trip: etag must survive write -> read");
  assert(
    read.lastModified === manifest.lastModified,
    "manifest round-trip: lastModified must survive write -> read"
  );
  assert(
    read.calendarRange?.maxDate === "20261231",
    "manifest round-trip: calendarRange must survive write -> read"
  );

  // readManifest must return null (not throw) when the blob 404s — first-ever publish.
  const stubFetch404 = async () => ({ ok: false, status: 404 });
  const missing = await readManifest("brand-new-city", { fetchImpl: stubFetch404 });
  assert(missing === null, "manifest round-trip: a missing manifest must read back as null");
}

// ---------------------------------------------------------------------------
// (b) probeUpstreamChanged
// ---------------------------------------------------------------------------
async function testProbeUpstreamChanged() {
  const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });

  let headCalls = 0;
  const bodyReadingFetch = async (url, options) => {
    headCalls += 1;
    assert(options?.method === "HEAD", "probe: must issue a HEAD request, never GET/download");
    return { headers: headers({ etag: `"same-etag"` }) };
  };

  const unchangedManifest = buildManifest({ upstreamUrl: "https://x.invalid/feed.zip", etag: `"same-etag"` });
  const unchanged = await probeUpstreamChanged({
    url: "https://x.invalid/feed.zip",
    manifest: unchangedManifest,
    fetchImpl: bodyReadingFetch,
  });
  assert(unchanged.changed === false, `probe: equal ETag must report unchanged (got reason "${unchanged.reason}")`);
  assert(/unchanged \(etag/.test(unchanged.reason), `probe: unchanged reason must name the etag, got "${unchanged.reason}"`);
  assert(headCalls === 1, "probe: must cost exactly one HEAD, never a download");

  const changedFetch = async () => ({ headers: headers({ etag: `"new-etag"` }) });
  const changed = await probeUpstreamChanged({
    url: "https://x.invalid/feed.zip",
    manifest: unchangedManifest,
    fetchImpl: changedFetch,
  });
  assert(changed.changed === true, "probe: a differing ETag must report changed");

  // No manifest on record at all -> treated as changed (first publish).
  const noManifest = await probeUpstreamChanged({
    url: "https://x.invalid/feed.zip",
    manifest: null,
    fetchImpl: changedFetch,
  });
  assert(noManifest.changed === true, "probe: no manifest on record must report changed");

  // feed_version / Last-Modified fallback when the upstream has no ETag.
  const lastModifiedManifest = buildManifest({
    upstreamUrl: "https://x.invalid/feed.zip",
    lastModified: "Mon, 01 Sep 2026 03:00:00 GMT",
  });
  const sameLastModified = await probeUpstreamChanged({
    url: "https://x.invalid/feed.zip",
    manifest: lastModifiedManifest,
    fetchImpl: async () => ({ headers: headers({ "last-modified": "Mon, 01 Sep 2026 03:00:00 GMT" }) }),
  });
  assert(sameLastModified.changed === false, "probe: equal Last-Modified (no ETag) must report unchanged");
}

// ---------------------------------------------------------------------------
// (c) expired calendar -> GtfsSnapshotStaleError
// ---------------------------------------------------------------------------
function fixtureStaticData({ calendarEndYmd, tripsById }) {
  return {
    tripsById: tripsById ?? new Map(),
    calendar: calendarEndYmd
      ? [{ service_id: "WD", start_date: "20260101", end_date: calendarEndYmd, monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1" }]
      : [],
    calendarDates: [],
    stopsById: new Map(),
    stopTimesByStopId: new Map(),
    routesById: new Map(),
    railTripIds: new Set(),
    timeZone: "UTC",
  };
}

function testExpiredCalendarThrows() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staticData = fixtureStaticData({ calendarEndYmd: ymd(yesterday) });
  const realtimeIndex = { tripDelaySec: new Map(), stopUpdates: new Map(), cancelledTrips: new Set(), tripIds: new Set(), rawTripIds: new Set() };

  let threw = null;
  try {
    checkSnapshotFreshness({ cityId: "faketown", staticData, realtimeIndex, now, timeZone: "UTC" });
  } catch (error) {
    threw = error;
  }
  assert(threw instanceof GtfsSnapshotStaleError, "expired calendar: must throw GtfsSnapshotStaleError");
  assert(threw?.name === "GtfsSnapshotStaleError", "expired calendar: error.name must be GtfsSnapshotStaleError");
  assert(isCityStale("faketown"), "expired calendar: staleness registry must record the city");

  // buildBoardForStops must refuse the same way, not just the lower-level check.
  let boardThrew = null;
  try {
    buildBoardForStops({ stopIds: [], staticData, realtimeIndex, timeZone: "UTC", now, cityId: "faketown" });
  } catch (error) {
    boardThrew = error;
  }
  assert(
    boardThrew instanceof GtfsSnapshotStaleError,
    "expired calendar: buildBoardForStops must also throw GtfsSnapshotStaleError"
  );

  // A snapshot with no calendar rows at all is not judgable — must not throw.
  const noCalendarData = fixtureStaticData({ calendarEndYmd: null });
  let noCalendarThrew = null;
  try {
    checkSnapshotFreshness({
      cityId: "no-calendar-city",
      staticData: noCalendarData,
      realtimeIndex,
      now,
      timeZone: "UTC",
    });
  } catch (error) {
    noCalendarThrew = error;
  }
  assert(noCalendarThrew === null, "no calendar rows at all: must not be judged stale (nothing to compare)");
}

// ---------------------------------------------------------------------------
// (d) resolved-share threshold; (e) sample-size floor
// ---------------------------------------------------------------------------
function fakeTripUpdateEntities(count, resolvedCount) {
  const entities = [];
  for (let i = 0; i < count; i += 1) {
    entities.push({
      tripUpdate: {
        trip: { tripId: `trip-${i}` },
        stopTimeUpdate: [{ stopId: "stop-1", arrival: { delaySec: 60 } }],
      },
    });
  }
  return { entities, resolvedTripIds: Array.from({ length: resolvedCount }, (_, i) => `trip-${i}`) };
}

function testResolvedShareThreshold() {
  const now = new Date();
  const tripsById = new Map();

  // 30 trip updates, 5 resolve (< 50%) -> must throw.
  const { entities: entities30 } = fakeTripUpdateEntities(30, 0);
  for (let i = 0; i < 5; i += 1) {
    tripsById.set(`trip-${i}`, { trip_id: `trip-${i}` });
  }
  const realtimeIndex30 = indexTripUpdates(entities30);
  const staticData30 = fixtureStaticData({ calendarEndYmd: null, tripsById });
  const share30 = resolvedShareForRealtime(realtimeIndex30, staticData30);
  assert(share30.total === 30, `resolved share: expected total=30, got ${share30.total}`);
  assert(share30.resolved === 5, `resolved share: expected resolved=5, got ${share30.resolved}`);
  assert(share30.judgable === true, "resolved share: 30 updates must be judgable");

  let threw30 = null;
  try {
    checkSnapshotFreshness({
      cityId: "low-share-city",
      staticData: staticData30,
      realtimeIndex: realtimeIndex30,
      now,
      timeZone: "UTC",
    });
  } catch (error) {
    threw30 = error;
  }
  assert(threw30 instanceof GtfsSnapshotStaleError, "resolved share: 5/30 resolved must throw GtfsSnapshotStaleError");

  // 30 trip updates, 25 resolve (>= 50%) -> must not throw.
  const tripsById25 = new Map();
  for (let i = 0; i < 25; i += 1) {
    tripsById25.set(`trip-${i}`, { trip_id: `trip-${i}` });
  }
  const { entities: entities30b } = fakeTripUpdateEntities(30, 0);
  const realtimeIndex30b = indexTripUpdates(entities30b);
  const staticData30b = fixtureStaticData({ calendarEndYmd: null, tripsById: tripsById25 });
  let threw30b = null;
  try {
    checkSnapshotFreshness({
      cityId: "healthy-share-city",
      staticData: staticData30b,
      realtimeIndex: realtimeIndex30b,
      now,
      timeZone: "UTC",
    });
  } catch (error) {
    threw30b = error;
  }
  assert(threw30b === null, `resolved share: 25/30 resolved must not throw (got ${threw30b?.message})`);
  assert(!isCityStale("healthy-share-city"), "resolved share: a healthy verdict must not leave the city marked stale");

  // (e) 10 updates, 1 resolves -> not judgable, must not throw.
  const { entities: entities10 } = fakeTripUpdateEntities(10, 0);
  const realtimeIndex10 = indexTripUpdates(entities10);
  const tripsById10 = new Map([["trip-0", { trip_id: "trip-0" }]]);
  const staticData10 = fixtureStaticData({ calendarEndYmd: null, tripsById: tripsById10 });
  const share10 = resolvedShareForRealtime(realtimeIndex10, staticData10);
  assert(
    share10.judgable === false,
    `sample floor: ${STALE_MIN_JUDGABLE_TRIP_UPDATES > 10 ? "10 < threshold" : "unexpected"} must not be judgable`
  );
  let threw10 = null;
  try {
    checkSnapshotFreshness({ cityId: "small-sample-city", staticData: staticData10, realtimeIndex: realtimeIndex10, now, timeZone: "UTC" });
  } catch (error) {
    threw10 = error;
  }
  assert(threw10 === null, "sample floor: a 10-update sample with a low resolved count must not throw");
}

// ---------------------------------------------------------------------------
// calendarRangeFromTrimmedOutput sanity (used to stamp the manifest)
// ---------------------------------------------------------------------------
function testCalendarRangeFromTrimmedOutput() {
  const output = {
    "calendar.txt": "service_id,start_date,end_date\nWD,20260101,20261231\n",
    "calendar_dates.txt": "service_id,date,exception_type\nWD,20270101,1\n",
  };
  const range = calendarRangeFromTrimmedOutput(output);
  assert(range.minDate === "20260101", `calendar range: minDate expected 20260101, got ${range.minDate}`);
  assert(range.maxDate === "20270101", `calendar range: maxDate expected 20270101 (calendar_dates extends it), got ${range.maxDate}`);
}

async function main() {
  _resetStalenessRegistryForTests();
  await testManifestRoundTrip();
  await testProbeUpstreamChanged();
  testExpiredCalendarThrows();
  testResolvedShareThreshold();
  testCalendarRangeFromTrimmedOutput();

  const report = getStaleCityReport();
  assert(
    report.some((entry) => entry.cityId === "faketown"),
    "staleness report: must surface the expired-calendar city"
  );
  assert(
    !report.some((entry) => entry.cityId === "healthy-share-city"),
    "staleness report: a healthy city must not linger in the report"
  );

  _resetStalenessRegistryForTests();

  if (failures.length) {
    console.error("gtfs-snapshot-freshness failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    "gtfs-snapshot-freshness: ok (manifest round-trip, probe unchanged/changed, expired-calendar throw, resolved-share threshold + sample floor)"
  );
}

main();
