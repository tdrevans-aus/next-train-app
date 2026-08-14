/**
 * Fremantle line — collapse Claremont under Fremantle (westbound).
 * Usage: node qa/fremantle-claremont-direction.mjs
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
  { destination: "Fremantle", liveDeparture: future },
  { destination: "Claremont", liveDeparture: new Date(Date.now() + 120_000) },
  { destination: "Perth", liveDeparture: new Date(Date.now() + 180_000) },
];

assert(normalizeDestination("Claremont") === "Fremantle", "Claremont normalizes to Fremantle");
assert(normalizeDestination("Fremantle") === "Fremantle", "Fremantle stays Fremantle");

const directions = uniqueDestinations(trips);
assert(directions.includes("Fremantle"), "uniqueDestinations includes Fremantle");
assert(!directions.includes("Claremont"), "uniqueDestinations drops Claremont");
assert(directions.includes("Perth"), "Perth unchanged");

const fremantleTrips = pickUpcomingTrips(trips, "Fremantle");
assert(fremantleTrips.length === 2, "Fremantle journey includes Claremont-terminated trips");

const claremontTrips = pickUpcomingTrips(trips, "Claremont");
assert(claremontTrips.length === 2, "Claremont filter includes same line-group trains");

console.log("\nPASS  Fremantle / Claremont line grouping\n");
