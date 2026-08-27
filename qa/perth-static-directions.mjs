/**
 * Static Perth directions + direction-collapse heuristic smoke.
 * Usage: node qa/perth-static-directions.mjs
 *
 * Perth / Perth Underground / Elizabeth Quay stay three strings.
 * TCL official outer is Cockburn Central. Armadale Line terminus is Byford.
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
assert(northFremantle.includes("High Wycombe"), "North Fremantle → High Wycombe (Airport through-run)");

const whitfords = staticDirectionsForStation("Whitfords Stn");
assert(whitfords.includes("Yanchep"), "Whitfords → Yanchep");
assert(whitfords.includes("Perth"), "Whitfords → Perth");

const perthUnderground = staticDirectionsForStation("Perth Underground Stn");
assert(perthUnderground.includes("Yanchep"), "Perth Underground → Yanchep");
assert(perthUnderground.includes("Mandurah"), "Perth Underground → Mandurah");
assert(perthUnderground.includes("Perth"), "Perth Underground city-side terminus chip");
assert(!perthUnderground.includes("Byford"), "Perth Underground is not on Armadale Line");
assert(!perthUnderground.includes("Fremantle"), "Perth Underground is not on Fremantle Line");
assert(!perthUnderground.includes("Midland"), "Perth Underground is not on Midland Line");
assert(!perthUnderground.includes("Ellenbrook"), "Perth Underground is not on Ellenbrook Line");
assert(!perthUnderground.includes("High Wycombe"), "Perth Underground is not on Airport Line");
assert(!perthUnderground.includes("Cockburn Central"), "Perth Underground is not on TCL");

const perthSurface = staticDirectionsForStation("Perth Stn");
assert(perthSurface.includes("Byford"), "Perth (surface) → Byford (Armadale Line)");
assert(perthSurface.includes("Ellenbrook"), "Perth (surface) → Ellenbrook");
assert(perthSurface.includes("High Wycombe"), "Perth (surface) → High Wycombe");
assert(perthSurface.includes("Fremantle"), "Perth (surface) → Fremantle");
assert(perthSurface.includes("Midland"), "Perth (surface) → Midland");
assert(perthSurface.includes("Cockburn Central"), "Perth (surface) → Cockburn Central (TCL)");
assert(!perthSurface.includes("Yanchep"), "Perth Stn is not a Yanchep stop");
assert(!perthSurface.includes("Mandurah"), "Perth Stn is not a Mandurah stop");

const nicholson = staticDirectionsForStation("Nicholson Road Stn");
assert(nicholson.includes("Perth"), "Nicholson Road → Perth");
assert(nicholson.includes("Cockburn Central"), "Nicholson Road → Cockburn Central");
assert(!nicholson.includes("Mandurah"), "TCL does not continue to Mandurah");

const ranford = staticDirectionsForStation("Ranford Road Stn");
assert(ranford.includes("Perth"), "Ranford Road → Perth");
assert(ranford.includes("Cockburn Central"), "Ranford Road → Cockburn Central");

const elizabethQuay = staticDirectionsForStation("Elizabeth Quay Stn");
assert(elizabethQuay.includes("Mandurah"), "Elizabeth Quay → Mandurah");
assert(elizabethQuay.includes("Yanchep"), "Elizabeth Quay → Yanchep");
assert(elizabethQuay.includes("Perth"), "Elizabeth Quay → Perth");
assert(!elizabethQuay.includes("Byford"), "Elizabeth Quay is not on Armadale Line");

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
