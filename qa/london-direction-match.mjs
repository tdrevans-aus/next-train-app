/**
 * London chip matching: Circle loop + via Bank + H&C &/and.
 * Usage: node qa/london-direction-match.mjs
 */
import { pickUpcomingTrips } from "../lib/train-times-core.js";
import { marketingLabelsForStation } from "../lib/cities/uk-london-tfl/marketing-directions.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const later = new Date(Date.now() + 120_000);

const trips = [
  { destination: "Circle Edgware Road (Circle)", line: "Circle", liveDeparture: later },
  { destination: "Northern Edgware via Bank", line: "Northern", liveDeparture: later },
  { destination: "Victoria Brixton", line: "Victoria", liveDeparture: later },
  { destination: "Hammersmith & City Barking", line: "Hammersmith & City", liveDeparture: later },
];

const circle = pickUpcomingTrips(trips, "Circle");
assert(circle.length === 1 && circle[0].line === "Circle", "Circle loop chip must match Circle arrivals");

const northern = pickUpcomingTrips(trips, "Northern Edgware");
assert(northern.length === 1, "Northern Edgware chip must match via Bank towards");

const victoria = pickUpcomingTrips(trips, "Victoria Brixton");
assert(victoria.length === 1, "Victoria Brixton must match");

const hc = pickUpcomingTrips(trips, "Hammersmith and City Barking");
assert(hc.length === 1, "H&C chip must match TfL ampersand line name");

const perthSafe = pickUpcomingTrips(
  [
    { destination: "Perth", liveDeparture: later },
    { destination: "Fremantle", liveDeparture: later },
  ],
  "Perth"
);
assert(perthSafe.length === 1 && perthSafe[0].destination === "Perth", "Perth filter stays strict");

const kx = marketingLabelsForStation("King's Cross St. Pancras");
assert(kx.includes("Circle"), "King's Cross chips include Circle loop");
assert(kx.includes("Victoria Brixton"), "King's Cross chips include Victoria Brixton");
assert(
  kx.includes("Hammersmith and City Barking"),
  "King's Cross chips include H&C despite catalog using &"
);
assert(!kx.some((chip) => /^Circle /.test(chip)), "Circle must not get terminus chips");

console.log("london-direction-match: ok");
