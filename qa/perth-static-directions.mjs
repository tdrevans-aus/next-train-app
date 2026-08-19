/**
 * Static Perth directions + direction-collapse heuristic smoke.
 * Usage: node qa/perth-static-directions.mjs
 */
import { staticDirectionsForStation } from "../lib/cities/perth/static-directions.js";
import { proposeDirectionGroups } from "../lib/direction-collapse-heuristic.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const northFremantle = staticDirectionsForStation("North Fremantle Stn");
assert(northFremantle.includes("Fremantle"), "North Fremantle → Fremantle");
assert(northFremantle.includes("Perth"), "North Fremantle → Perth");

const whitfords = staticDirectionsForStation("Whitfords Stn");
assert(whitfords.includes("Yanchep"), "Whitfords → Yanchep");
assert(whitfords.includes("Perth"), "Whitfords → Perth");

const perth = staticDirectionsForStation("Perth Underground Stn");
assert(perth.includes("Yanchep"), "Perth → Yanchep");
assert(perth.includes("Mandurah"), "Perth → Mandurah");
assert(perth.includes("Fremantle"), "Perth → Fremantle");
assert(perth.includes("Midland"), "Perth → Midland");
assert(perth.includes("Armadale"), "Perth → Armadale");
assert(perth.includes("Cockburn"), "Perth → Cockburn (Thornlie–Cockburn Line)");

const nicholson = staticDirectionsForStation("Nicholson Road Stn");
assert(nicholson.includes("Perth"), "Nicholson Road → Perth");
assert(nicholson.includes("Cockburn"), "Nicholson Road → Cockburn");

const ranford = staticDirectionsForStation("Ranford Road Stn");
assert(ranford.includes("Perth"), "Ranford Road → Perth");
assert(ranford.includes("Cockburn"), "Ranford Road → Cockburn");

const elizabethQuay = staticDirectionsForStation("Elizabeth Quay Stn");
assert(elizabethQuay.includes("Mandurah"), "Elizabeth Quay → Mandurah");
assert(elizabethQuay.includes("Perth"), "Elizabeth Quay → Perth");

const proposed = proposeDirectionGroups({
  terminals: ["Whitfords", "Clarkson", "Yanchep", "Butler"],
  lineStationsOrdered: [
    "Perth",
    "Leederville",
    "Stirling",
    "Whitfords",
    "Clarkson",
    "Butler",
    "Yanchep",
  ],
});
assert(proposed.groups.Yanchep, "R1 proposes Yanchep group");
assert(
  proposed.groups.Yanchep.some((m) => /whitfords/i.test(m)),
  "Yanchep group includes Whitfords"
);

const rejectedBranch = proposeDirectionGroups({
  terminals: ["High Wycombe", "Ellenbrook"],
  branchedJunctions: ["Bayswater"],
  coOccurrenceByStation: {
    Bayswater: ["High Wycombe", "Ellenbrook", "Perth"],
    Maylands: ["Perth"],
  },
});
assert(
  rejectedBranch.rejected.length >= 1 || Object.keys(rejectedBranch.groups).length === 0,
  "branch pair not auto-merged unsafely"
);

console.log("perth-static-directions: ok");
