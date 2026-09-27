/**
 * Offline — GTFS-RT StopTimeEvent.time = 0 must be treated as absent, never
 * as a literal 1970-01-01 timestamp (docs/jim-brief-gtfs-rt-zero-departure-time.md).
 *
 * protobuf decodes an unset int64 field as 0. A feed that sends a delay-only
 * stopTimeUpdate (common for NTA, HSL, Entur, Trafiklab) can leave
 * `departure.time` (and/or `arrival.time`) at that zero value, which used to
 * pass a bare `!= null` check and reach a rider as
 * `liveDeparture: "1970-01-01T00:00:00.000Z"`.
 *
 * Cases:
 * (a) time=0, delay=120        -> live = scheduled + 120s
 * (b) time=0, no delay         -> live = scheduled (falls all the way back)
 * (c) time=<real epoch>        -> live = that real time
 * (d) arrival-only update (no departure field at all, arrival.delay set)
 *     -> departure still resolves via the arrival delay
 * (e) a bogus small-but-nonzero time (before 2000-01-01) is also treated as
 *     absent, both at parse time (realtime.js) and as a final board.js guard
 * (f) indexTripUpdates itself never returns a departureSec/arrivalSec of 0
 *     for a `time: 0` StopTimeEvent
 *
 * Usage: node qa/gtfs-rt-zero-time-gate.mjs
 */
import {
  indexTripUpdates,
  readStopTimeEventSec,
  readStopTimeEventDelaySec,
  MIN_VALID_EPOCH_SEC,
} from "../lib/providers/gtfs/realtime.js";
import { buildBoardForStops } from "../lib/providers/gtfs/board.js";

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

// ---------------------------------------------------------------------------
// readStopTimeEventSec / readStopTimeEventDelaySec — unit-level
// ---------------------------------------------------------------------------
function testReadHelpers() {
  assert(readStopTimeEventSec({ time: 0 }) === null, "time=0 must read as absent (null)");
  assert(readStopTimeEventSec(undefined) === null, "missing event must read as absent (null)");
  assert(readStopTimeEventSec({}) === null, "event with no time field must read as absent (null)");
  assert(readStopTimeEventSec({ time: null }) === null, "time=null must read as absent (null)");

  const realEpoch = 1_800_000_000; // ~2027, a real GTFS-RT-shaped epoch second
  assert(
    readStopTimeEventSec({ time: realEpoch }) === realEpoch,
    "a real epoch time must be read through unchanged"
  );
  assert(
    readStopTimeEventSec({ time: String(realEpoch) }) === realEpoch,
    "a string-encoded real epoch time must still be read through"
  );

  // A small nonzero value predating 2000-01-01 is bogus, not a real timestamp.
  assert(
    readStopTimeEventSec({ time: 12345 }) === null,
    "a nonzero time before 2000-01-01 must be treated as absent"
  );
  assert(
    readStopTimeEventSec({ time: MIN_VALID_EPOCH_SEC }) === MIN_VALID_EPOCH_SEC,
    "exactly the 2000-01-01 floor must be accepted as real"
  );

  assert(readStopTimeEventDelaySec({ delay: 120 }) === 120, "delay=120 must read through");
  assert(readStopTimeEventDelaySec({ delay: 0 }) === 0, "delay=0 (on time) must read through, not as absent");
  assert(readStopTimeEventDelaySec(undefined) === null, "missing event must have no delay");
  assert(readStopTimeEventDelaySec({}) === null, "event with no delay field must read as absent");
}

// ---------------------------------------------------------------------------
// indexTripUpdates — a time:0 stopTimeUpdate must not surface as departureSec: 0
// ---------------------------------------------------------------------------
function testIndexTripUpdatesDropsZeroTime() {
  const entities = [
    {
      tripUpdate: {
        trip: { tripId: "trip-zero-time" },
        stopTimeUpdate: [
          { stopId: "stop-1", departure: { time: 0, delay: 120 } },
        ],
      },
    },
    {
      tripUpdate: {
        trip: { tripId: "trip-zero-no-delay" },
        stopTimeUpdate: [{ stopId: "stop-1", departure: { time: 0 } }],
      },
    },
    {
      tripUpdate: {
        trip: { tripId: "trip-real-time" },
        stopTimeUpdate: [{ stopId: "stop-1", departure: { time: 1_800_000_000 } }],
      },
    },
    {
      tripUpdate: {
        trip: { tripId: "trip-arrival-only" },
        stopTimeUpdate: [{ stopId: "stop-1", arrival: { delay: 90 } }],
      },
    },
  ];

  const index = indexTripUpdates(entities);

  const zeroTimeWithDelay = index.stopUpdates.get("trip-zero-time:stop-1");
  assert(zeroTimeWithDelay.departureSec === null, "time=0 must never surface as departureSec (found a value)");
  assert(zeroTimeWithDelay.delaySec === 120, "time=0 with delay=120 must still carry the delay through");

  const zeroTimeNoDelay = index.stopUpdates.get("trip-zero-no-delay:stop-1");
  assert(zeroTimeNoDelay.departureSec === null, "time=0 with no delay must have a null departureSec");
  assert(zeroTimeNoDelay.delaySec === null, "time=0 with no delay must have a null delaySec");

  const realTime = index.stopUpdates.get("trip-real-time:stop-1");
  assert(realTime.departureSec === 1_800_000_000, "a real time must survive indexTripUpdates unchanged");

  const arrivalOnly = index.stopUpdates.get("trip-arrival-only:stop-1");
  assert(arrivalOnly.departureSec === null, "arrival-only update must have no departureSec");
  assert(arrivalOnly.delaySec === 90, "arrival-only update's delay must still resolve as the fallback delay");
}

// ---------------------------------------------------------------------------
// buildBoardForStops end-to-end — never emits a pre-2000 liveDeparture
// ---------------------------------------------------------------------------
function fixtureStaticData() {
  const stop = { stop_id: "stop-1", platform_code: "" };
  const route = { route_id: "route-1", route_short_name: "T1", route_long_name: "Test Line" };
  const now = new Date();
  const departureTimeOfDay = "23:59:00"; // scheduled well within the near horizon regardless of `now`
  const stopTimes = [
    { trip_id: "trip-zero-time", stop_id: "stop-1", departure_time: departureTimeOfDay, pickup_type: "0" },
    { trip_id: "trip-zero-no-delay", stop_id: "stop-1", departure_time: departureTimeOfDay, pickup_type: "0" },
    { trip_id: "trip-real-time", stop_id: "stop-1", departure_time: departureTimeOfDay, pickup_type: "0" },
    { trip_id: "trip-arrival-only", stop_id: "stop-1", departure_time: departureTimeOfDay, pickup_type: "0" },
  ];
  const tripsById = new Map(
    stopTimes.map((st) => [st.trip_id, { trip_id: st.trip_id, service_id: "WD", route_id: "route-1" }])
  );
  const ymd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  return {
    stopsById: new Map([["stop-1", stop]]),
    stopTimesByStopId: new Map([["stop-1", stopTimes]]),
    tripsById,
    routesById: new Map([["route-1", route]]),
    calendar: [
      {
        service_id: "WD",
        start_date: "20200101",
        end_date: "20991231",
        monday: "1",
        tuesday: "1",
        wednesday: "1",
        thursday: "1",
        friday: "1",
        saturday: "1",
        sunday: "1",
      },
    ],
    calendarDates: [],
    railTripIds: new Set(stopTimes.map((st) => st.trip_id)),
    timeZone: "UTC",
    _ymd: ymd,
  };
}

function testBoardNeverEmitsPre2000() {
  const now = new Date();
  const staticData = fixtureStaticData();

  const entities = [
    {
      tripUpdate: {
        trip: { tripId: "trip-zero-time" },
        stopTimeUpdate: [{ stopId: "stop-1", departure: { time: 0, delay: 120 } }],
      },
    },
    {
      tripUpdate: {
        trip: { tripId: "trip-zero-no-delay" },
        stopTimeUpdate: [{ stopId: "stop-1", departure: { time: 0 } }],
      },
    },
    {
      tripUpdate: {
        trip: { tripId: "trip-real-time" },
        stopTimeUpdate: [
          {
            stopId: "stop-1",
            departure: { time: Math.floor(new Date(now.getTime() + 5 * 60_000).getTime() / 1000) },
          },
        ],
      },
    },
    {
      tripUpdate: {
        trip: { tripId: "trip-arrival-only" },
        stopTimeUpdate: [{ stopId: "stop-1", arrival: { delay: 90 } }],
      },
    },
  ];
  const realtimeIndex = indexTripUpdates(entities);

  const trips = buildBoardForStops({
    stopIds: ["stop-1"],
    staticData,
    realtimeIndex,
    timeZone: "UTC",
    now,
    horizonMinutes: 1440,
  });

  const minValidMs = MIN_VALID_EPOCH_SEC * 1000;
  for (const trip of trips) {
    assert(
      new Date(trip.liveDeparture).getTime() >= minValidMs,
      `buildBoardForStops must never emit a pre-2000 liveDeparture (trip ${trip.tripId} -> ${trip.liveDeparture})`
    );
  }

  const byTrip = new Map(trips.map((t) => [t.tripId, t]));

  const zeroWithDelay = byTrip.get("trip-zero-time");
  assert(zeroWithDelay, "trip-zero-time must appear on the board");
  const expectedZeroWithDelay =
    new Date(zeroWithDelay.scheduledDeparture).getTime() + 120_000;
  assert(
    new Date(zeroWithDelay.liveDeparture).getTime() === expectedZeroWithDelay,
    `time=0 + delay=120 must resolve to scheduled+120s (got ${zeroWithDelay.liveDeparture}, scheduled ${zeroWithDelay.scheduledDeparture})`
  );

  const zeroNoDelay = byTrip.get("trip-zero-no-delay");
  assert(zeroNoDelay, "trip-zero-no-delay must appear on the board");
  assert(
    zeroNoDelay.liveDeparture === zeroNoDelay.scheduledDeparture,
    `time=0 with no delay must fall all the way back to the scheduled time (got live ${zeroNoDelay.liveDeparture}, scheduled ${zeroNoDelay.scheduledDeparture})`
  );

  const arrivalOnly = byTrip.get("trip-arrival-only");
  assert(arrivalOnly, "trip-arrival-only must appear on the board");
  const expectedArrivalOnly = new Date(arrivalOnly.scheduledDeparture).getTime() + 90_000;
  assert(
    new Date(arrivalOnly.liveDeparture).getTime() === expectedArrivalOnly,
    `an arrival-only update must still resolve departure via its delay (got ${arrivalOnly.liveDeparture})`
  );
}

function main() {
  testReadHelpers();
  testIndexTripUpdatesDropsZeroTime();
  testBoardNeverEmitsPre2000();

  if (failures.length) {
    console.error("gtfs-rt-zero-time-gate failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    "gtfs-rt-zero-time-gate: ok (time=0 treated as absent, delay/schedule fallback correct, no pre-2000 liveDeparture)"
  );
}

main();
