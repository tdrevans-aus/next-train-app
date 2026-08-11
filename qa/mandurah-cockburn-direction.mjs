/**
 * Mandurah line — collapse Cockburn under Mandurah (Bull Creek southbound).
 * Usage: node qa/mandurah-cockburn-direction.mjs
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
  { destination: "Mandurah", liveDeparture: future },
  { destination: "Cockburn", liveDeparture: new Date(Date.now() + 120_000) },
  { destination: "Cockburn Central", liveDeparture: new Date(Date.now() + 150_000) },
  { destination: "Perth", liveDeparture: new Date(Date.now() + 180_000) },
];

assert(normalizeDestination("Cockburn") === "Mandurah", "Cockburn normalizes to Mandurah");
assert(
  normalizeDestination("Cockburn Central") === "Mandurah",
  "Cockburn Central normalizes to Mandurah"
);
assert(normalizeDestination("Mandurah") === "Mandurah", "Mandurah stays Mandurah");
assert(normalizeDestination("Perth") === "Perth", "Perth unchanged");

const directions = uniqueDestinations(trips);
assert(directions.includes("Mandurah"), "uniqueDestinations includes Mandurah");
assert(!directions.includes("Cockburn"), "uniqueDestinations drops Cockburn");
assert(!directions.includes("Cockburn Central"), "uniqueDestinations drops Cockburn Central");
assert(directions.includes("Perth"), "Perth direction unchanged");

const mandurahTrips = pickUpcomingTrips(trips, "Mandurah");
assert(mandurahTrips.length === 3, "Mandurah journey includes Cockburn-terminated trips");

const perthTrips = pickUpcomingTrips(trips, "Perth");
assert(perthTrips.length === 1, "Perth filter unchanged");

console.log("\nPASS  Mandurah / Cockburn line grouping\n");
