/**
 * Offline — Melbourne boards went empty at local midnight on 26 Sep 2026.
 *
 * Friday Night Network trips are filed on Friday's service_id with GTFS times
 * 24:xx–27:xx (00:xx–03:xx Saturday). buildBoardForStops used to key only off
 * the calendar date of `now`, so at 00:00 Saturday those trips disappeared
 * and a live-only city had nothing left to show.
 *
 * Also: Melbourne's live-only filter used to require a stop_time_update at
 * this exact stop. A TripUpdate that names the trip confirms every stop on
 * it; a trip the feed never mentions stays dropped.
 *
 * Usage: node qa/gtfs-service-day-overnight.mjs
 */
import { buildBoardForStops } from "../lib/providers/gtfs/board.js";
import { tripHasRealtimeConfirmation } from "../lib/providers/melbourne.js";

const TIME_ZONE = "Australia/Melbourne";
const STOP = "S1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function emptyRealtime() {
  return {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
    tripIds: new Set(),
    rawTripIds: new Set(),
  };
}

function staticData() {
  const calendar = [
    {
      service_id: "FRI",
      monday: "0",
      tuesday: "0",
      wednesday: "0",
      thursday: "0",
      friday: "1",
      saturday: "0",
      sunday: "0",
      start_date: "20260901",
      end_date: "20261231",
    },
    {
      service_id: "SAT",
      monday: "0",
      tuesday: "0",
      wednesday: "0",
      thursday: "0",
      friday: "0",
      saturday: "1",
      sunday: "0",
      start_date: "20260901",
      end_date: "20261231",
    },
  ];
  const tripsById = new Map([
    ["NIGHT", { trip_id: "NIGHT", service_id: "FRI", trip_headsign: "City", route_id: "R" }],
    ["LATE", { trip_id: "LATE", service_id: "FRI", trip_headsign: "City", route_id: "R" }],
    ["DAY", { trip_id: "DAY", service_id: "SAT", trip_headsign: "City", route_id: "R" }],
  ]);
  const stopTimesByStopId = new Map([
    [
      STOP,
      [
        { trip_id: "NIGHT", departure_time: "24:30:00", arrival_time: "24:30:00", stop_id: STOP, pickup_type: "0" },
        { trip_id: "LATE", departure_time: "27:40:00", arrival_time: "27:40:00", stop_id: STOP, pickup_type: "0" },
        { trip_id: "DAY", departure_time: "11:00:00", arrival_time: "11:00:00", stop_id: STOP, pickup_type: "0" },
      ],
    ],
  ]);
  return {
    calendar,
    calendarDates: [],
    tripsById,
    routesById: new Map([["R", { route_id: "R", route_short_name: "Test", route_long_name: "Test" }]]),
    stopsById: new Map([[STOP, { stop_id: STOP, stop_name: "Test", platform_code: "1" }]]),
    stopTimesByStopId,
  };
}

function tripIds(now) {
  const trips = buildBoardForStops({
    stopIds: [STOP],
    staticData: staticData(),
    realtimeIndex: emptyRealtime(),
    timeZone: TIME_ZONE,
    now,
  });
  return trips.map((trip) => trip.tripId);
}

// Saturday 26 Sep 2026 00:05 AEST (UTC+10). Friday's 24:30 is 00:30, inside
// the 3-hour window. Saturday's 11:00 is not, and the near window is
// non-empty so the 18-hour look-ahead must not pull it in.
const justAfterMidnight = new Date("2026-09-25T14:05:00Z");
const afterMidnight = tripIds(justAfterMidnight);
assert(
  afterMidnight.includes("NIGHT"),
  `00:05 Saturday must keep Friday's 24:30 trip, got ${afterMidnight.join(",") || "(empty)"}`
);
assert(
  !afterMidnight.includes("DAY"),
  `00:05 Saturday must not pull Saturday 11:00 into the 3-hour window, got ${afterMidnight.join(",")}`
);
assert(
  !afterMidnight.includes("LATE"),
  `00:05 Saturday must not pull Friday's 27:40 (03:40) into the 3-hour window, got ${afterMidnight.join(",")}`
);

// Same instant, but the only remaining Friday trip is 27:40 (03:40), outside
// 3 hours and inside the empty-board 18-hour look-ahead.
const lateOnly = staticData();
lateOnly.stopTimesByStopId = new Map([
  [
    STOP,
    lateOnly.stopTimesByStopId.get(STOP).filter((row) => row.trip_id !== "NIGHT"),
  ],
]);
const lateTrips = buildBoardForStops({
  stopIds: [STOP],
  staticData: lateOnly,
  realtimeIndex: emptyRealtime(),
  timeZone: TIME_ZONE,
  now: justAfterMidnight,
}).map((trip) => trip.tripId);
assert(
  lateTrips.includes("LATE"),
  `empty near-window must still find Friday's 27:40 via the long horizon, got ${lateTrips.join(",") || "(empty)"}`
);

// Saturday 10:00 — last night's 24:30/27:40 have departed. Only today's 11:00.
const midMorning = tripIds(new Date("2026-09-26T00:00:00Z"));
assert(
  midMorning.length === 1 && midMorning[0] === "DAY",
  `Saturday 10:00 must be only the 11:00 trip, got ${midMorning.join(",") || "(empty)"}`
);

const confirmedElsewhere = {
  tripId: "02-ALM--68-UZ-2405",
  stopId: "11198",
};
assert(
  tripHasRealtimeConfirmation(confirmedElsewhere, {
    stopUpdates: new Map([["02-ALM--68-UZ-2405:11207", { delaySec: 0 }]]),
    tripDelaySec: new Map(),
    tripIds: new Set(["02-ALM--68-UZ-2405"]),
  }),
  "a TripUpdate that names the trip confirms stops the feed did not list"
);
assert(
  !tripHasRealtimeConfirmation(confirmedElsewhere, {
    stopUpdates: new Map(),
    tripDelaySec: new Map(),
    tripIds: new Set(),
  }),
  "a trip the realtime feed never mentions stays unconfirmed"
);
assert(
  tripHasRealtimeConfirmation(confirmedElsewhere, {
    stopUpdates: new Map([["02-ALM--68-UZ-2405:11198", { delaySec: 30 }]]),
    tripDelaySec: new Map(),
  }),
  "a stop_time_update at this stop still confirms the trip when tripIds is absent"
);

console.log("gtfs-service-day-overnight: ok");
