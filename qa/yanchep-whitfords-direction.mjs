/**
 * Yanchep line — collapse Whitfords/Clarkson/Butler under Yanchep.
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
  { destination: "Butler", liveDeparture: new Date(Date.now() + 160_000) },
  { destination: "Mandurah", liveDeparture: new Date(Date.now() + 180_000) },
];

assert(normalizeDestination("Whitfords") === "Yanchep", "Whitfords normalizes to Yanchep");
assert(normalizeDestination("Clarkson") === "Yanchep", "Clarkson normalizes to Yanchep");
assert(normalizeDestination("Butler") === "Yanchep", "Butler normalizes to Yanchep");
assert(normalizeDestination("Yanchep") === "Yanchep", "Yanchep stays Yanchep");
assert(normalizeDestination("Claremont") === "Fremantle", "Claremont normalizes to Fremantle");

const directions = uniqueDestinations(trips);
assert(directions.includes("Yanchep"), "uniqueDestinations includes Yanchep");
assert(!directions.includes("Whitfords"), "uniqueDestinations drops Whitfords");
assert(!directions.includes("Clarkson"), "uniqueDestinations drops Clarkson");
assert(!directions.includes("Butler"), "uniqueDestinations drops Butler");
assert(directions.includes("Mandurah"), "other directions unchanged");

const yanchepTrips = pickUpcomingTrips(trips, "Yanchep");
assert(yanchepTrips.length === 4, "Yanchep journey includes Whitfords/Clarkson/Butler shorts");

const mandurahTrips = pickUpcomingTrips(trips, "Mandurah");
assert(mandurahTrips.length === 1, "Mandurah filter unchanged");

console.log("yanchep-whitfords-direction: ok");
