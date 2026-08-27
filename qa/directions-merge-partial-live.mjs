/**
 * Partial-live directions merge — static line-map union with live board.
 * Usage: node qa/directions-merge-partial-live.mjs
 */
import {
  resolveDirectionsForStation,
  staticDirectionsForStation,
} from "../lib/cities/perth/static-directions.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSameDirections(actual, expected, message) {
  assert(
    actual.length === expected.length &&
      expected.every((direction) => actual.includes(direction)),
    `${message}: expected [${expected.join(", ")}], got [${actual.join(", ")}]`
  );
}

const elizabethStatic = staticDirectionsForStation("Elizabeth Quay Stn");
assertSameDirections(elizabethStatic, ["Mandurah", "Perth", "Yanchep"], "Elizabeth Quay static");

const partialLive = resolveDirectionsForStation("Elizabeth Quay Stn", [
  { destination: "Perth" },
]);
assertSameDirections(
  partialLive.directions,
  ["Mandurah", "Perth", "Yanchep"],
  "partial live keeps tunnel directions"
);
assert(partialLive.source === "live+static-line-map", "partial live source tag");

const emptyLive = resolveDirectionsForStation("Elizabeth Quay Stn", []);
assertSameDirections(emptyLive.directions, ["Mandurah", "Perth", "Yanchep"], "empty live uses static");
assert(emptyLive.source === "static-line-map", "empty live source tag");

const liveOnly = resolveDirectionsForStation("Unknown Place Stn", [{ destination: "Perth" }]);
assertSameDirections(liveOnly.directions, ["Perth"], "unknown station stays live-only");
assert(liveOnly.source === "live", "unknown station source tag");

const liveExtra = resolveDirectionsForStation("Elizabeth Quay Stn", [
  { destination: "Perth" },
  { destination: "Ellenbrook" },
]);
assert(liveExtra.directions.includes("Ellenbrook"), "live-only extras preserved");
assert(liveExtra.directions.includes("Mandurah"), "static directions preserved with live extra");

console.log("directions-merge-partial-live: ok");
