/**
 * FB-23 Q8 — strict platform destination filter (Perth ≠ Fremantle; short-turn groups only).
 * Usage: node qa/fb-23-route-destination-filter.mjs
 */
import { pickUpcomingTrips } from "../lib/train-times-core.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const t1 = new Date(Date.now() + 60_000);
const t2 = new Date(Date.now() + 120_000);
const t3 = new Date(Date.now() + 180_000);
const t4 = new Date(Date.now() + 240_000);

const trips = [
  { destination: "Fremantle", liveDeparture: t1 },
  { destination: "Claremont", liveDeparture: t2 },
  { destination: "Perth", liveDeparture: t3 },
  { destination: "High Wycombe", liveDeparture: t4 },
];

const fremantleBoard = pickUpcomingTrips(trips, "Fremantle");
const perthBoard = pickUpcomingTrips(trips, "Perth");

assert(
  fremantleBoard.length === 2,
  `Fremantle filter should include Claremont short-turn (got ${fremantleBoard.length})`
);
assert(
  fremantleBoard.every((trip) => trip.destination !== "Perth"),
  "Fremantle filter must exclude Perth-terminating trains"
);
assert(perthBoard.length === 1 && perthBoard[0].destination === "Perth", "Perth filter is strict");
assert(
  !pickUpcomingTrips(trips, "Fremantle").some((trip) => trip.destination === "Perth"),
  "Perth must not appear on Fremantle board"
);
assert(
  pickUpcomingTrips(trips, "High Wycombe").length === 1,
  "High Wycombe filter is strict"
);

console.log("PASS — FB-23 Q8 route destination filter");
