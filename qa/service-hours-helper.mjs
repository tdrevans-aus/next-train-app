/**
 * Unit test for qa/helpers/service-hours.mjs — docs/jim-brief-live-gates-service-hours.md.
 *
 * Pure fixed-clock checks, no network, no dev server: proves the SKIP-LIVE / strict branching
 * logic that copenhagen/melbourne/adelaide/greater-manchester's live gates rely on, at both an
 * outside-service-hours instant (02:00 local, all four cities) and an inside-service-hours
 * instant (11:00 local), independent of whatever hour this script happens to actually run at.
 *
 * Extended (docs/jim-brief-live-gates-service-hours-2.md, follow-up to #491) with the three
 * UK windows added for uk-west-midlands-dogfood-gate.mjs, greater-anglia-dogfood-gate.mjs and
 * liverpool-city-region-dogfood-gate.mjs. Same 02:00/11:00 fixed-instant shape; all three are
 * Europe/London so they share greater-manchester's existing instants.
 *
 * Usage: node qa/service-hours-helper.mjs
 */
import {
  localClock,
  isDocumentedServiceHour,
  skipLiveLine,
  DOCUMENTED_SERVICE_WINDOWS,
} from "./helpers/service-hours.mjs";

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

// A fixed UTC instant for each city where its own local clock reads exactly 02:00 — computed by
// hand from each IANA zone's offset on this date (late Sep 2026: CEST = UTC+2, AEST->AEDT
// transition for AU happened 5 Oct 2026 so both AU zones are still standard time here:
// Melbourne/Adelaide UTC+10/+9:30, London still BST = UTC+1 until late Oct).
const TWO_AM_INSTANTS = {
  copenhagen: new Date("2026-09-24T00:00:00Z"), // 02:00 CEST (UTC+2)
  melbourne: new Date("2026-09-23T16:00:00Z"), // 02:00 AEST (UTC+10)
  adelaide: new Date("2026-09-23T16:30:00Z"), // 02:00 ACST (UTC+9:30)
  "greater-manchester": new Date("2026-09-24T01:00:00Z"), // 02:00 BST (UTC+1)
  // Same Europe/London instant as greater-manchester — all three new windows share the zone.
  "uk-west-midlands-metro": new Date("2026-09-24T01:00:00Z"),
  "greater-anglia-lner-peterborough": new Date("2026-09-24T01:00:00Z"),
  "liverpool-city-region-merseyrail": new Date("2026-09-24T01:00:00Z"),
};

// Same day, but a local instant squarely inside every city's daytime service window.
const ELEVEN_AM_INSTANTS = {
  copenhagen: new Date("2026-09-24T09:00:00Z"), // 11:00 CEST
  melbourne: new Date("2026-09-23T01:00:00Z"), // 11:00 AEST
  adelaide: new Date("2026-09-23T01:30:00Z"), // 11:00 ACST
  "greater-manchester": new Date("2026-09-24T10:00:00Z"), // 11:00 BST
  "uk-west-midlands-metro": new Date("2026-09-24T10:00:00Z"),
  "greater-anglia-lner-peterborough": new Date("2026-09-24T10:00:00Z"),
  "liverpool-city-region-merseyrail": new Date("2026-09-24T10:00:00Z"),
};

for (const city of Object.keys(DOCUMENTED_SERVICE_WINDOWS)) {
  const twoAm = TWO_AM_INSTANTS[city];
  const elevenAm = ELEVEN_AM_INSTANTS[city];
  assert(twoAm instanceof Date, `${city}: must have a fixed 02:00-local test instant`);
  assert(elevenAm instanceof Date, `${city}: must have a fixed 11:00-local test instant`);

  const clockAt2 = localClock(city, twoAm);
  assert(clockAt2.label === "02:00", `${city}: fixed instant must read 02:00 local, got ${clockAt2.label}`);
  assert(
    isDocumentedServiceHour(city, twoAm) === false,
    `${city}: 02:00 local must be outside the documented service window`
  );
  const skipLine = skipLiveLine(city, twoAm);
  assert(
    skipLine === `SKIP-LIVE (outside service hours, ${city} local 02:00)`,
    `${city}: skipLiveLine must print the exact SKIP-LIVE shape, got "${skipLine}"`
  );

  const clockAt11 = localClock(city, elevenAm);
  assert(clockAt11.label === "11:00", `${city}: fixed instant must read 11:00 local, got ${clockAt11.label}`);
  assert(
    isDocumentedServiceHour(city, elevenAm) === true,
    `${city}: 11:00 local must be inside the documented service window`
  );
}

// A city with no configured window/zone must throw rather than silently allow-all or deny-all.
let threwForUnknown = false;
try {
  isDocumentedServiceHour("nowhereville", new Date());
} catch {
  threwForUnknown = true;
}
assert(threwForUnknown, "isDocumentedServiceHour must throw for a city with no documented window");

let clockThrewForUnknown = false;
try {
  localClock("nowhereville", new Date());
} catch {
  clockThrewForUnknown = true;
}
assert(clockThrewForUnknown, "localClock must throw for a city with no configured IANA zone");

if (failures > 0) {
  console.error(`service-hours-helper: ${failures} failure(s)`);
  process.exit(1);
}

console.log(
  "PASS service-hours-helper: fixed-clock 02:00 (SKIP-LIVE) and 11:00 (strict) both prove out for copenhagen/melbourne/adelaide/greater-manchester"
);
