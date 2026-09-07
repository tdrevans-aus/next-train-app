/**
 * docs/jim-brief-upcoming-board-depth.md — upcoming departures cap raised 8 -> 12.
 * Verifies buildNextTrainResponse:
 *   - exposes the cap as UPCOMING_TRIP_LIMIT === 12
 *   - truncates a feed with >12 upcoming trips to exactly 12 (no more, no less when >=12 exist)
 *   - skipTrains at the last index (11) still resolves `next` correctly
 *   - `following` is null once skip is past the end of the truncated list, not throwing
 * Usage: node qa/upcoming-board-depth.mjs
 */
import { buildNextTrainResponse, UPCOMING_TRIP_LIMIT } from "../lib/train-times-core.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(UPCOMING_TRIP_LIMIT === 12, `UPCOMING_TRIP_LIMIT must be 12, got ${UPCOMING_TRIP_LIMIT}`);

const now = new Date();

function makeTrip(index) {
  const liveDeparture = new Date(now.getTime() + (index + 1) * 60_000);
  return {
    scheduledDeparture: liveDeparture,
    scheduledDisplayTime: `${index}`,
    liveDeparture,
    displayTime: `${index}`,
    platform: "1",
    destination: "Testville",
    cars: 3,
    line: "Test Line",
    id: `trip-${index}`,
  };
}

// 20 upcoming trips available — well over the cap.
const upcomingTrips = Array.from({ length: 20 }, (_, i) => makeTrip(i));

const baseResponse = buildNextTrainResponse({
  station: "Test Station",
  destination: "Testville",
  destinationLabel: "Testville",
  leaveBeforeMinutes: 5,
  refreshSeconds: 30,
  skipTrains: 0,
  now,
  upcomingTrips,
});

assert(
  baseResponse.upcoming.length === 12,
  `expected exactly 12 upcoming departures from a 20-trip feed, got ${baseResponse.upcoming.length}`
);
assert(
  baseResponse.upcoming.length <= UPCOMING_TRIP_LIMIT,
  "payload must never exceed UPCOMING_TRIP_LIMIT"
);

// skipTrains at the last available index (11) must still resolve `next`.
const lastIndexResponse = buildNextTrainResponse({
  station: "Test Station",
  destination: "Testville",
  destinationLabel: "Testville",
  leaveBeforeMinutes: 5,
  refreshSeconds: 30,
  skipTrains: 11,
  now,
  upcomingTrips,
});

assert(lastIndexResponse.next !== null, "skipTrains=11 must still resolve a `next` trip");
assert(lastIndexResponse.next.displayTime === "11", "skipTrains=11 must resolve the 12th trip (index 11)");
assert(
  lastIndexResponse.following === null,
  "`following` must be null past the end of the truncated 12-item list (skip 11 -> index 12 doesn't exist)"
);

// skipTrains beyond the truncated list must not throw and must yield nulls.
const pastEndResponse = buildNextTrainResponse({
  station: "Test Station",
  destination: "Testville",
  destinationLabel: "Testville",
  leaveBeforeMinutes: 5,
  refreshSeconds: 30,
  skipTrains: 15,
  now,
  upcomingTrips,
});

assert(pastEndResponse.next === null, "skipTrains past the truncated list must resolve `next` to null, not throw");
assert(pastEndResponse.following === null, "`following` must be null when skip is past the end");

// A feed with fewer trips than the cap must not be padded — payload growth is bounded, not forced.
const shortResponse = buildNextTrainResponse({
  station: "Test Station",
  destination: "Testville",
  destinationLabel: "Testville",
  leaveBeforeMinutes: 5,
  refreshSeconds: 30,
  skipTrains: 0,
  now,
  upcomingTrips: upcomingTrips.slice(0, 5),
});

assert(shortResponse.upcoming.length === 5, `a 5-trip feed must return exactly 5, got ${shortResponse.upcoming.length}`);

console.log("PASS — upcoming board depth (cap 12, skipTrains/following behave at the higher indices)");
