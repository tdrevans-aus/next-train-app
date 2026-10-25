/**
 * Offline gate: previous-service-day trips after midnight
 * (docs/jim-brief-gtfs-previous-service-day.md; prior art PR #442).
 *
 * GTFS files late-night trips on the previous service day with times past 24:00. Boards that
 * only collected today's and tomorrow's service days lost them at local midnight (Melbourne
 * Friday Night Network, 25 Sep 2026: 14 directions at 23:54, 0 at 00:00).
 *
 * Usage: node qa/gtfs-service-day-overnight.mjs
 */
import { buildBoardForStops, hasScheduledServiceToday } from "../lib/providers/gtfs/board.js";

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

function cal(serviceId, days) {
  const names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const row = { service_id: serviceId, start_date: "20260101", end_date: "20271231" };
  names.forEach((n, i) => {
    row[n] = days.includes(i + 1) ? "1" : "0";
  });
  return row;
}

/** services: [{id, days (ISO 1=Mon..7=Sun)}], trips: [{id, service, time}] all at STOP. */
function makeStatic(services, trips) {
  return {
    calendar: services.map((s) => cal(s.id, s.days)),
    calendarDates: [],
    tripsById: new Map(
      trips.map((t) => [t.id, { trip_id: t.id, service_id: t.service, trip_headsign: `Dest ${t.id}`, route_id: "R" }])
    ),
    routesById: new Map([["R", { route_id: "R", route_short_name: "T", route_long_name: "Test" }]]),
    stopsById: new Map([[STOP, { stop_id: STOP, stop_name: "Test", platform_code: "1" }]]),
    stopTimesByStopId: new Map([
      [
        STOP,
        trips.map((t) => ({
          trip_id: t.id,
          departure_time: t.time,
          arrival_time: t.time,
          stop_id: STOP,
          pickup_type: "0",
        })),
      ],
    ]),
  };
}

function board(staticData, tz, now, extra = {}) {
  return buildBoardForStops({
    stopIds: [STOP],
    staticData,
    realtimeIndex: emptyRealtime(),
    timeZone: tz,
    now: new Date(now),
    ...extra,
  });
}

const ids = (...args) => board(...args).map((t) => t.tripId);

const MEL = "Australia/Melbourne";
const FRI = { id: "FRI", days: [5] };
const SAT = { id: "SAT", days: [6] };
// Saturday 26 Sep 2026 00:20 AEST = 25 Sep 14:20Z. Friday's service day is "yesterday".
const at0020 = "2026-09-25T14:20:00Z";

const staticNight = makeStatic(
  [FRI, SAT],
  [
    { id: "T2440", service: "FRI", time: "24:40:00" },
    { id: "T2350", service: "FRI", time: "23:50:00" },
    { id: "T2430", service: "FRI", time: "24:30:00" },
    { id: "SAT1000", service: "SAT", time: "10:00:00" },
  ]
);

// 1. yesterday's 24:40 / 24:30 appear at 00:20 (near-horizon path)
const a = ids(staticNight, MEL, at0020);
assert(a.includes("T2440"), `00:20 must show yesterday's 24:40 trip, got ${a.join(",") || "(empty)"}`);
assert(a.includes("T2430"), `00:20 must show yesterday's 24:30 trip, got ${a.join(",")}`);
// 2. the already-departed 23:50 does not; the 10:00 is outside the 3 h window
assert(!a.includes("T2350"), `00:20 must not show yesterday's departed 23:50 trip, got ${a.join(",")}`);
assert(!a.includes("SAT1000"), `00:20 near window must not show 10:00, got ${a.join(",")}`);

// 3. no duplicates across yesterday / today / tomorrow. A daily service is active on all three
//    service days, so the same trip_ids come round every day.
const daily = makeStatic(
  [{ id: "DAILY", days: [1, 2, 3, 4, 5, 6, 7] }],
  [
    { id: "D2440", service: "DAILY", time: "24:40:00" },
    { id: "D0100", service: "DAILY", time: "01:00:00" },
    { id: "D0900", service: "DAILY", time: "09:00:00" },
  ]
);
for (const extra of [{}, { horizonMinutes: 30 * 60 }]) {
  const rows = board(daily, MEL, at0020, extra);
  const keys = rows.map((r) => `${r.tripId}:${r.stopId}:${r.scheduledDeparture}`);
  assert(new Set(keys).size === keys.length, `duplicate trip calls on board: ${keys.join(" | ")}`);
  const fromYesterday = rows.filter((r) => r.tripId === "D2440" && r.scheduledDeparture === "2026-09-25T14:40:00.000Z");
  assert(fromYesterday.length === 1, `yesterday's 24:40 must appear exactly once, got ${fromYesterday.length}`);
}
const near = ids(daily, MEL, at0020);
assert(near.join(",") === "D2440,D0100", `near board at 00:20 expected D2440,D0100 got ${near.join(",")}`);

// 4. hasScheduledServiceToday after midnight. Saturday has service elsewhere in the feed (so the
//    "no active service anywhere => true" fallback cannot mask the verdict) but not at STOP.
const staticElse = makeStatic([FRI, SAT], [{ id: "L", service: "FRI", time: "24:30:00" }]);
staticElse.tripsById.set("ELSE", { trip_id: "ELSE", service_id: "SAT", route_id: "R" });
staticElse.stopTimesByStopId.set("OTHER", [
  { trip_id: "ELSE", departure_time: "10:00:00", stop_id: "OTHER", pickup_type: "0" },
]);
const served = (now) =>
  hasScheduledServiceToday({ stopIds: [STOP], staticData: staticElse, timeZone: MEL, now: new Date(now) });
assert(served(at0020) === true, "00:20: stop served only by yesterday's still-running 24:30 trip must count as served");
assert(
  served("2026-09-25T15:00:00Z") === false,
  "01:00: the 24:30 trip has finished and nothing else serves the stop today, so not served"
);

// 5. daytime unchanged: at Saturday 14:00 last night's trips never appear.
const dayStatic = makeStatic([FRI, SAT], [
  { id: "T2440", service: "FRI", time: "24:40:00" },
  { id: "SAT1500", service: "SAT", time: "15:00:00" },
]);
const sat1400 = "2026-09-26T04:00:00Z";
assert(ids(dayStatic, MEL, sat1400).join(",") === "SAT1500", "Saturday 14:00 must be only SAT1500");
assert(
  ids(dayStatic, MEL, sat1400, { horizonMinutes: 30 * 60 }).join(",") === "SAT1500",
  "Saturday 14:00 with a long horizon must be only SAT1500 (last night's 24:40 has gone)"
);

// 6. DST nights produce correct instants.
// Europe/London: clocks go back Sun 25 Oct 2026 02:00 BST -> 01:00 GMT. Saturday 24 Oct service.
const LON = "Europe/London";
const lon = makeStatic([{ id: "SAT", days: [6] }], [
  { id: "LN1", service: "SAT", time: "24:30:00" },
  { id: "LN2", service: "SAT", time: "26:30:00" },
]);
const lonRows = board(lon, LON, "2026-10-24T23:10:00Z", { horizonMinutes: 5 * 60 });
const lonBy = Object.fromEntries(lonRows.map((r) => [r.tripId, r.scheduledDeparture]));
// 00:30 on the 25th is still BST (UTC+1) => 23:30Z on the 24th
assert(lonBy.LN1 === "2026-10-24T23:30:00.000Z", `London 24:30 must be 23:30Z, got ${lonBy.LN1}`);
// 02:30 on the 25th is after the change (GMT) => 02:30Z
assert(lonBy.LN2 === "2026-10-25T02:30:00.000Z", `London 26:30 must be 02:30Z, got ${lonBy.LN2}`);
// And they surface as yesterday's trips just after midnight local on the 25th (23:10Z = 00:10 BST)
assert(lonRows.length === 2, `London board at 00:10 BST expected 2 rows, got ${lonRows.length}`);

// Australia/Melbourne: DST ends Sun 5 Apr 2026 03:00 AEDT -> 02:00 AEST. Saturday 4 Apr service.
const mel = makeStatic([SAT], [
  { id: "M1", service: "SAT", time: "24:30:00" },
  { id: "M2", service: "SAT", time: "27:30:00" },
]);
const melRows = board(mel, MEL, "2026-04-04T13:20:00Z", { horizonMinutes: 8 * 60 });
const melBy = Object.fromEntries(melRows.map((r) => [r.tripId, r.scheduledDeparture]));
// 00:30 Sun 5 Apr is still AEDT (UTC+11) => 13:30Z Saturday
assert(melBy.M1 === "2026-04-04T13:30:00.000Z", `Melbourne 24:30 must be 13:30Z, got ${melBy.M1}`);
// 03:30 Sun is after the change (AEST, UTC+10) => 17:30Z
assert(melBy.M2 === "2026-04-04T17:30:00.000Z", `Melbourne 27:30 must be 17:30Z, got ${melBy.M2}`);

console.log("gtfs-service-day-overnight: ok");
