/**
 * Yanchep line — collapse Whitfords under Yanchep (direction picker + trip filter).
 * Usage: node qa/yanchep-whitfords-direction.mjs
 */
import {
  normalizeDestination,
  pickUpcomingTrips,
  uniqueDestinations,
} from "../lib/train-times.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const future = new Date(Date.now() + 60_000);
const trips = [
  { destination: "Yanchep", liveDeparture: future },
  { destination: "Whitfords", liveDeparture: new Date(Date.now() + 120_000) },
  { destination: "Clarkson", liveDeparture: new Date(Date.now() + 150_000) },
  { destination: "Mandurah", liveDeparture: new Date(Date.now() + 180_000) },
];

assert(normalizeDestination("Whitfords") === "Yanchep", "Whitfords normalizes to Yanchep");
assert(normalizeDestination("Clarkson") === "Yanchep", "Clarkson normalizes to Yanchep");
assert(normalizeDestination("Yanchep") === "Yanchep", "Yanchep stays Yanchep");

const directions = uniqueDestinations(trips);
assert(directions.includes("Yanchep"), "uniqueDestinations includes Yanchep");
assert(!directions.includes("Whitfords"), "uniqueDestinations drops Whitfords");
assert(!directions.includes("Clarkson"), "uniqueDestinations drops Clarkson");
assert(directions.includes("Mandurah"), "other directions unchanged");

const yanchepTrips = pickUpcomingTrips(trips, "Yanchep");
assert(yanchepTrips.length === 3, "Yanchep journey includes Whitfords + Clarkson-terminated trips");

const mandurahTrips = pickUpcomingTrips(trips, "Mandurah");
assert(mandurahTrips.length === 1, "Mandurah filter unchanged");

console.log("\nPASS  Yanchep line grouping (Whitfords + Clarkson)\n");
