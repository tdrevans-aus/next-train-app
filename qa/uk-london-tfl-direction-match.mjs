/**
 * uk-london-tfl direction-match gate — proves the fix for
 * docs/jim-brief-london-overground-empty-direction.md (Barking Riverside's only offered
 * direction, "Suffragette Gospel Oak", returned "No upcoming trains" even though TfL was
 * publishing 8 valid predictions for it).
 *
 * Root cause (see the brief's "CORRECTION" section): `/StopPoint/{id}/Arrivals` has no usable
 * timing for services *originating* at a terminus on these lines — every Gospel Oak-bound row at
 * Barking Riverside carried an identical placeholder `timeToStation: 2`, already in the past by
 * the time it's parsed, so `pickUpcomingTrips`'s `liveDeparture > now` filter (correctly) dropped
 * all of them. The fix routes the National-Rail-backed Overground stops (910G naptans) to
 * `/StopPoint/{id}/ArrivalDepartures`, which carries real `scheduledTimeOfDeparture` /
 * `estimatedTimeOfDeparture`; tube/DLR/tram stops keep `/Arrivals`, where timings are already
 * correct.
 *
 * Uses a checked-in fixture of raw TfL responses
 * (qa/fixtures/uk-london-tfl/direction-match-arrivals.json), captured live on 7 Sep 2026 —
 * no network access or TFL_APP_KEY required to run this script.
 *
 * Asserts, for Barking Riverside, Gospel Oak, Woodgrange Park and Barking:
 *   1. Every direction the catalog (public/city-directions/uk-london-tfl.json) offers for that
 *      station matches at least one parsed, upcoming trip from the fixture (the walk-up rule: an
 *      offered direction must not be unmatchable by construction).
 *   2. No parsed destination retains a raw "Rail Station" / "Underground Station" / "(London)"
 *      station-type or National-Rail-flavoured suffix.
 *   3. No direction's departures are all clustered within a few seconds of each other — the
 *      placeholder-timing symptom that caused this bug (Barking Riverside's Gospel Oak-bound rows
 *      all carried the same `timeToStation: 2`). A real ~15-minute-frequency service must show
 *      departures spread out, not stacked at one instant.
 *
 * Terminus handling verdict (docs/board-eligibility-rule.md): at Barking Riverside and Gospel
 * Oak — the two termini of the Suffragette line — `ArrivalDepartures` rows whose
 * `destinationName` *is* the station itself (a train terminating there, carrying neither
 * `scheduledTimeOfDeparture` nor `estimatedTimeOfDeparture`) are dropped by
 * `parseTflArrivalDeparture`: they are not a boardable departure in any offered direction.
 *
 * Extended for docs/jim-brief-london-station-name-prefix.md (7 Sep 2026): TfL also emits a
 * leading "London " disambiguation prefix on some destinationNames ("London Liverpool Street",
 * "London Euston") that nothing stripped, so no trip matched any offered direction at Cheshunt,
 * Chingford, Enfield Town, Watford Junction and Walthamstow Central even though real,
 * correctly-timed services were being published. Uses a second checked-in fixture
 * (qa/fixtures/uk-london-tfl/london-prefix-arrivals.json, captured live 7 Sep 2026) for those
 * five stations, plus direct unit-level assertions on parseTflArrival/parseTflArrivalDeparture
 * for both the "London "-prefixed form and the four catalog stations that legitimately begin
 * with "London " (London Bridge, London City Airport, London Euston, London Fields) — a naive
 * `^London\s+` regex fix passes the fixture checks above but fails these.
 *
 * Extended for docs/jim-brief-terminus-no-published-departures.md (7 Sep 2026): tube termini
 * (940G stops) have no `ArrivalDepartures` at all, so `/Arrivals` is the only feed, and it
 * publishes essentially no forward departures — a terminating train's `destinationName`/`towards`
 * is the station itself. The prior sections of this gate cover the Overground `ArrivalDepartures`
 * path; this section covers the tube `/Arrivals`-only terminus case with a fresh live-captured
 * fixture (qa/fixtures/uk-london-tfl/terminus-arrivals.json, captured live 7 Sep 2026,
 * TFL_APP_KEY-authenticated, no network needed to run this gate) for six real tube termini
 * (Walthamstow Central, Brixton, Morden, Epping, Cockfosters, High Barnet). Asserts the three
 * states from the brief's QA section:
 *
 * Extended for docs/jim-brief-dlr-dedup-key.md and its 8 Sep 2026 amendment: `tripDedupKey` and
 * `dedupeTrips` are covered directly (below) with the DLR id-collision fixture and a live-captured
 * `alsoNaptanIds` fan-out fixture (qa/fixtures/uk-london-tfl/fanout-dedup-arrivals.json, captured
 * live at Clapham Junction 8 Sep 2026 — not a mock) that proves `id` genuinely differs between the
 * hub naptanId fetch and its folded-in fetch for the same physical train, so the dedup key must
 * exclude `id` and instead rely on scoping (collapse only *across* fetches, never *within* one).
 *   1. terminus-with-arrivals-only — the offered direction resolves zero upcoming trips AND the
 *      fixture holds real trips terminating here on that line; buildNextTrainResponse's additive
 *      `arrivalsOnly` field must be populated with those trips' real (unmodified) times, and
 *      `upcoming`/`next`/`following` must stay exactly as they'd be without terminatingTrips
 *      (additive, not a reshape).
 *   2. genuinely empty — no trips at all (synthetic, zero-trip input) must leave `arrivalsOnly`
 *      absent and `next` null, i.e. "No upcoming trains" is unaffected.
 *   3. normal board with departures — an existing Overground fixture station (Barking Riverside)
 *      with real upcoming trips must not have `arrivalsOnly` set even though other lines at that
 *      stop also publish terminating rows; and, separately, every other already-covered station in
 *      this gate's fixtures is asserted to have byte-identical `buildNextTrainResponse` output with
 *      and without the new `terminatingTrips` param, proving the change doesn't touch any board it
 *      isn't the fix for (acceptance criterion 4).
 *
 * Usage: node qa/uk-london-tfl-direction-match.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  parseTflArrival,
  parseTflArrivalDeparture,
  resolveTflStop,
  findTerminatingArrivals,
  dedupeTrips,
  tripDedupKey,
} from "../lib/providers/uk-tfl.js";
import { pickUpcomingTrips, buildNextTrainResponse } from "../lib/train-times-core.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const fixture = JSON.parse(
  readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "direction-match-arrivals.json"), "utf8")
);
const londonPrefixFixture = JSON.parse(
  readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "london-prefix-arrivals.json"), "utf8")
);
const directionsByStation = JSON.parse(
  readFileSync(join(ROOT, "public", "city-directions", "uk-london-tfl.json"), "utf8")
);

const now = new Date(fixture.capturedAt);
assert(!Number.isNaN(now.getTime()), "fixture.capturedAt must be a valid timestamp");
const londonPrefixNow = new Date(londonPrefixFixture.capturedAt);
assert(!Number.isNaN(londonPrefixNow.getTime()), "london-prefix fixture.capturedAt must be a valid timestamp");

const STATIONS = ["Barking Riverside", "Gospel Oak", "Woodgrange Park", "Barking"];
const LONDON_PREFIX_STATIONS = [
  "Cheshunt",
  "Chingford",
  "Enfield Town",
  "Watford Junction",
  "Walthamstow Central",
];

const SUFFIX_RE = /\s+(Underground Station|DLR Station|Rail Station|Tram Stop|Station|\(London\))$/i;

// A direction whose departures are all bunched within this window is a placeholder-timing
// symptom, not a real ~15-minute-frequency Overground service.
const PLACEHOLDER_CLUSTER_MS = 10 * 1000;

// This brief's fix (and its scope) is the Overground `ArrivalDepartures` path. Directions on
// these lines must match a real, spread-out prediction in the fixture — that's the actual bug.
// Barking also offers District-line (tube) directions via the unrelated, unchanged `/Arrivals`
// path; one of them, "District Wimbledon", is a real but low-frequency branch (confirmed live
// against /StopPoint/940GZZLUWIM/Arrivals on 7 Sep 2026: current District trains terminate at
// Earl's Court, not Barking) that happens to have zero live predictions at capture time. That's a
// snapshot-timing gap in an existing tube direction, not a regression this brief introduces or is
// scoped to fix — see docs/jim-brief-london-overground-empty-direction.md acceptance criterion 5,
// which limits the "every offered direction must match" rule to Overground stations. Log it as a
// warning rather than failing the gate on an unrelated, pre-existing catalog thinness.
const OVERGROUND_LINE_PREFIXES = ["Suffragette", "Mildmay", "Windrush", "Liberty", "Lioness", "Weaver"];
function isOvergroundDirection(direction) {
  return OVERGROUND_LINE_PREFIXES.some((line) => direction.startsWith(`${line} `));
}

// Recorded verdict (docs/board-eligibility-rule.md), discovered while extending this gate for
// docs/jim-brief-london-station-name-prefix.md — out of that brief's scope, noted here rather
// than silently downgraded: the direction catalog offers every Weaver-line terminus (Cheshunt,
// Chingford, Enfield Town) as a direction from every other Weaver-line station, including
// branch-specific stations (Bruce Grove, Southbury) that can only reach a *sibling* branch's
// terminus via a reversal at Liverpool Street — the live fixture confirms zero rows for these
// cross-branch pairs even though same-branch and Liverpool-Street-bound rows are plentiful. Same
// over-broad-direction-list class as the pre-fix Tramlink/Addiscombe and Metropolitan-branch
// findings in docs/london-terminus-sweep-findings.md (finding 3) — a direction-catalog data
// problem (Luke's lane), not this brief's normalization bug. Not a hardcoded "known bug" list in
// the *product* code (lib/), only in this QA gate's expected-warnings table.
const KNOWN_CROSS_BRANCH_UNREACHABLE = {
  Cheshunt: new Set(["Weaver Chingford", "Weaver Enfield Town"]),
  Chingford: new Set(["Weaver Cheshunt", "Weaver Enfield Town"]),
  "Enfield Town": new Set(["Weaver Cheshunt", "Weaver Chingford"]),
  "Walthamstow Central": new Set(["Weaver Cheshunt", "Weaver Enfield Town"]),
};

let failures = 0;

function parseStationTrips(station, forNow) {
  const trips = [];
  for (const naptanId of Object.keys(station.arrivalDepartures ?? {})) {
    const byLine = station.arrivalDepartures[naptanId];
    for (const lineName of Object.keys(byLine)) {
      for (const row of byLine[lineName]) {
        const trip = parseTflArrivalDeparture(row, lineName, forNow);
        if (trip) {
          trips.push(trip);
        }
      }
    }
  }
  for (const naptanId of Object.keys(station.arrivals ?? {})) {
    for (const row of station.arrivals[naptanId]) {
      const trip = parseTflArrival(row, forNow);
      if (trip) {
        trips.push(trip);
      }
    }
  }
  return trips;
}

function checkStation(stationName, stationFixture, forNow) {
  assert(stationFixture, `fixture missing station: ${stationName}`);

  const trips = parseStationTrips(stationFixture, forNow);
  console.log(`${stationName}: ${trips.length} parsed trips from fixture`);

  // No parsed destination should retain a raw station-type / "(London)" suffix. An unstripped
  // leading "London " disambiguation prefix (docs/jim-brief-london-station-name-prefix.md) isn't
  // checked here directly — it's exactly the string matched against offered directions below, so
  // it shows up as an unmatched direction (FAIL below), not a separate leaked-text concern.
  for (const trip of trips) {
    if (SUFFIX_RE.test(trip.destination)) {
      console.error(`  FAIL suffix leaked through: "${trip.destination}"`);
      failures++;
    }
  }

  const directions = directionsByStation[stationName] ?? [];
  assert(directions.length > 0, `${stationName} must have at least one offered direction in the catalog`);

  for (const direction of directions) {
    const upcoming = pickUpcomingTrips(trips, direction, forNow);
    if (upcoming.length === 0) {
      if (KNOWN_CROSS_BRANCH_UNREACHABLE[stationName]?.has(direction)) {
        console.warn(
          `  WARN direction "${direction}" is a cross-branch Weaver-line pairing with no direct ` +
            `service (reversal at Liverpool Street required) — recorded catalog-data verdict, ` +
            `out of this brief's scope (docs/board-eligibility-rule.md); not failing the gate on it`
        );
      } else if (isOvergroundDirection(direction)) {
        console.error(`  FAIL direction "${direction}" matches 0 parsed upcoming trips (unmatchable by construction)`);
        failures++;
      } else {
        console.warn(
          `  WARN direction "${direction}" (non-Overground, out of this brief's scope) has 0 live ` +
            `predictions in this snapshot — not failing the gate on it`
        );
      }
      continue;
    }

    // Placeholder-timing check: a real multi-departure direction must not have every departure
    // clustered within a few seconds of each other (the Barking Riverside/Gospel Oak symptom —
    // identical `timeToStation: 2` on every Gospel-Oak-bound row).
    if (upcoming.length > 1) {
      const times = upcoming.map((t) => t.liveDeparture.getTime());
      const spread = Math.max(...times) - Math.min(...times);
      if (spread < PLACEHOLDER_CLUSTER_MS) {
        console.error(
          `  FAIL direction "${direction}" has ${upcoming.length} departures all within ` +
            `${spread}ms of each other — looks like placeholder timing, not a real service`
        );
        failures++;
        continue;
      }
    }

    console.log(`  OK   direction "${direction}" -> ${upcoming.length} trips`);
  }
}

for (const stationName of STATIONS) {
  checkStation(stationName, fixture.stations[stationName], now);
}

for (const stationName of LONDON_PREFIX_STATIONS) {
  checkStation(stationName, londonPrefixFixture.stations[stationName], londonPrefixNow);
}

// --- Unit-level assertions directly on parseTflArrivalDeparture/parseTflArrival, per the brief's
// QA section: cheapest, most direct catch for the "London " prefix class, no fixture needed. ---

console.log("\nUnit-level normalization checks:");

function assertDestination(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label} -> "${actual}" (expected "${expected}")`);
  if (!ok) {
    failures++;
  }
}

const unitNow = new Date("2026-09-07T15:00:00Z");
const futureIso = "2026-09-07T15:20:00Z";

// The bug: a leading "London " prefix on a National-Rail-flavoured destinationName must be
// stripped when the bare remainder is a real offered destination and the prefixed form is not.
assertDestination(
  "ArrivalDepartures \"London Liverpool Street Rail Station\" (Weaver)",
  parseTflArrivalDeparture(
    { destinationName: "London Liverpool Street Rail Station", estimatedTimeOfDeparture: futureIso },
    "Weaver",
    unitNow
  ).destination,
  "Weaver Liverpool Street"
);
assertDestination(
  "ArrivalDepartures \"London Euston Rail Station\" (Lioness)",
  parseTflArrivalDeparture(
    { destinationName: "London Euston Rail Station", estimatedTimeOfDeparture: futureIso },
    "Lioness",
    unitNow
  ).destination,
  "Lioness Euston"
);

// The four catalog stations that legitimately begin with "London " must not be corrupted by a
// bare regex strip — this is what a naive `^London\s+` fix would break.
for (const name of ["London Bridge", "London City Airport", "London Fields"]) {
  assertDestination(
    `ArrivalDepartures "${name} Rail Station" (unrelated line) stays prefixed`,
    parseTflArrivalDeparture(
      { destinationName: `${name} Rail Station`, estimatedTimeOfDeparture: futureIso },
      "Test",
      unitNow
    ).destination,
    `Test ${name}`
  );
}
// London Euston as a *station identity* (picker/board lookup) must still resolve to its own,
// distinct naptanId — unaffected by the destination-text normalization above (verify by fixture,
// acceptance criterion 2). See also live output captured in this brief's PR description.
const londonEuston = resolveTflStop("London Euston");
assert(londonEuston && londonEuston.naptanId === "910GEUSTON", 'resolveTflStop("London Euston") must resolve to 910GEUSTON, unaffected by destination normalization');
console.log(`  OK   resolveTflStop("London Euston") -> ${londonEuston.naptanId} (${londonEuston.name})`);
for (const name of ["London Bridge", "London City Airport", "London Fields", "Liverpool Street"]) {
  const stop = resolveTflStop(name);
  assert(stop && stop.name === name, `resolveTflStop("${name}") must resolve to its own catalog entry`);
  console.log(`  OK   resolveTflStop("${name}") -> ${stop.naptanId} (${stop.name})`);
}

// --- Terminus arrivals-only board (docs/jim-brief-terminus-no-published-departures.md) ---

console.log("\nTerminus arrivals-only checks:");

const terminusFixture = JSON.parse(
  readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "terminus-arrivals.json"), "utf8")
);
const terminusNow = new Date(terminusFixture.capturedAt);
assert(!Number.isNaN(terminusNow.getTime()), "terminus fixture.capturedAt must be a valid timestamp");

// State 1: terminus-with-arrivals-only. Real tube termini (940G, /Arrivals-only — no
// ArrivalDepartures exists for these) where the offered direction resolves zero upcoming trips
// but the board holds real trips terminating here on that line.
const TERMINUS_STATIONS = {
  "Walthamstow Central": "Victoria Brixton",
  Brixton: "Victoria Walthamstow Central",
  Morden: "Northern High Barnet",
  Epping: "Central Ealing Broadway",
  Cockfosters: "Piccadilly Uxbridge",
  "High Barnet": "Northern Morden",
};

for (const [stationName, direction] of Object.entries(TERMINUS_STATIONS)) {
  const stationFixture = terminusFixture.stations[stationName];
  assert(stationFixture, `terminus fixture missing station: ${stationName}`);
  const rows = stationFixture.arrivals[stationFixture.naptanId];
  const trips = rows.map((row) => parseTflArrival(row, terminusNow)).filter(Boolean);

  const upcoming = pickUpcomingTrips(trips, direction, terminusNow);
  if (upcoming.length !== 0) {
    console.error(
      `  FAIL ${stationName}: expected 0 upcoming trips for "${direction}" in this fixture (got ${upcoming.length}) — fixture no longer exercises the terminus case`
    );
    failures++;
    continue;
  }

  const terminating = findTerminatingArrivals(trips, stationName, direction, terminusNow);
  if (terminating.length === 0) {
    console.error(
      `  FAIL ${stationName}: expected real trips terminating here on "${direction}"'s line, found none`
    );
    failures++;
    continue;
  }

  const withoutTerminating = buildNextTrainResponse({
    station: stationName,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
    now: terminusNow,
    lastUpdated: terminusNow,
    upcomingTrips: upcoming,
  });
  const withTerminating = buildNextTrainResponse({
    station: stationName,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
    now: terminusNow,
    lastUpdated: terminusNow,
    upcomingTrips: upcoming,
    terminatingTrips: terminating,
  });

  // Additive, not a reshape: upcoming/next/following must be identical whether or not
  // terminatingTrips is passed.
  for (const key of ["next", "following", "upcoming"]) {
    const before = JSON.stringify(withoutTerminating[key]);
    const after = JSON.stringify(withTerminating[key]);
    if (before !== after) {
      console.error(`  FAIL ${stationName}: "${key}" changed when terminatingTrips was passed — must be additive only`);
      failures++;
    }
  }
  assert(withoutTerminating.arrivalsOnly === undefined, `${stationName}: arrivalsOnly must be absent without terminatingTrips`);

  if (!withTerminating.arrivalsOnly || !withTerminating.arrivalsOnly.arrivals?.length) {
    console.error(`  FAIL ${stationName}: expected arrivalsOnly.arrivals to be populated`);
    failures++;
    continue;
  }
  // No estimated/derived time anywhere: every arrival's departure/arrival timestamp must trace
  // back to one of the terminating trips' own liveDeparture (the real TfL-predicted arrival).
  const realTimes = new Set(terminating.map((t) => t.liveDeparture.toISOString()));
  for (const arrival of withTerminating.arrivalsOnly.arrivals) {
    if (!realTimes.has(arrival.departure)) {
      console.error(`  FAIL ${stationName}: arrivalsOnly arrival time "${arrival.departure}" is not one of the real terminating trips' own times`);
      failures++;
    }
  }
  console.log(
    `  OK   ${stationName} ("${direction}"): 0 upcoming, ${terminating.length} terminating -> arrivalsOnly with ${withTerminating.arrivalsOnly.arrivals.length} real arrival(s), message present: ${Boolean(withTerminating.arrivalsOnly.message)}`
  );
}

// State 2: genuinely empty. No trips at all must leave `next` null and `arrivalsOnly` absent —
// "No upcoming trains" is unaffected by this change.
{
  const empty = buildNextTrainResponse({
    station: "Test Empty",
    destination: "Victoria Brixton",
    destinationLabel: "Victoria Brixton",
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
    now: terminusNow,
    lastUpdated: terminusNow,
    upcomingTrips: [],
    terminatingTrips: [],
  });
  assert(empty.next === null, "genuinely-empty board: next must be null");
  assert(empty.arrivalsOnly === undefined, "genuinely-empty board: arrivalsOnly must be absent, not an empty/false object");
  console.log("  OK   genuinely empty board (no trips at all) -> next=null, arrivalsOnly absent");
}

// State 3: normal board with departures. An existing Overground station with real upcoming
// trips must not get arrivalsOnly, and its output must be byte-identical whether or not a caller
// happens to pass terminatingTrips — proving no other board's behaviour changes (acceptance
// criterion 4).
{
  const gospelOakFixture = fixture.stations["Gospel Oak"];
  const gospelOakTrips = parseStationTrips(gospelOakFixture, now);
  const gospelOakDirection = "Suffragette Barking Riverside";
  const gospelOakUpcoming = pickUpcomingTrips(gospelOakTrips, gospelOakDirection, now);
  assert(gospelOakUpcoming.length > 0, "Gospel Oak fixture must still have real upcoming departures for this check to be meaningful");

  const gospelOakTerminating = findTerminatingArrivals(gospelOakTrips, "Gospel Oak", gospelOakDirection, now);

  const before = buildNextTrainResponse({
    station: "Gospel Oak",
    destination: gospelOakDirection,
    destinationLabel: gospelOakDirection,
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: gospelOakUpcoming,
  });
  const after = buildNextTrainResponse({
    station: "Gospel Oak",
    destination: gospelOakDirection,
    destinationLabel: gospelOakDirection,
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: gospelOakUpcoming,
    terminatingTrips: gospelOakTerminating,
  });
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    console.error("  FAIL Gospel Oak (normal board with departures): output changed when terminatingTrips was passed — must be a no-op whenever upcoming is non-empty");
    failures++;
  } else {
    console.log(
      `  OK   Gospel Oak (normal board, ${gospelOakUpcoming.length} upcoming) unaffected — byte-identical with/without terminatingTrips, arrivalsOnly absent: ${before.arrivalsOnly === undefined}`
    );
  }
}

// --- DLR dedup-key checks (docs/jim-brief-dlr-dedup-key.md) ---
//
// Root cause: TfL's DLR /Arrivals feed sometimes reuses the same `id`/`vehicleId` across rows
// with genuinely different destinations (confirmed live at Abbey Road and Beckton Park, 7 Sep
// 2026). fetchStopBoard used to dedupe allTripsMap by trip.id, so 5 of 6 trains at Abbey Road
// were silently dropped. The fix replaces the dedup key with tripDedupKey (line + resolved
// destination + platform + departure time, deliberately excluding id/vehicleId — see the 8 Sep
// 2026 amendment in docs/jim-brief-dlr-dedup-key.md) — mode-agnostic, not DLR-special-cased.

console.log("\nDLR dedup-key checks:");

const dlrFixture = JSON.parse(
  readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "dlr-dedup-arrivals.json"), "utf8")
);
const dlrNow = new Date(dlrFixture.capturedAt);
assert(!Number.isNaN(dlrNow.getTime()), "dlr fixture.capturedAt must be a valid timestamp");

const DLR_COLLISION_STATIONS = {
  "Abbey Road": {
    directions: ["DLR Beckton", "DLR Woolwich Arsenal", "DLR Stratford International"],
    rawRowCount: 6,
  },
  "Beckton Park": {
    directions: ["DLR Tower Gateway", "DLR Beckton"],
    rawRowCount: 6,
  },
};

for (const [stationName, expectation] of Object.entries(DLR_COLLISION_STATIONS)) {
  const stationFixture = dlrFixture.stations[stationName];
  assert(stationFixture, `dlr fixture missing station: ${stationName}`);
  const naptanId = stationFixture.naptanId;
  const rawRows = stationFixture.arrivals[naptanId];
  assert(rawRows.length === expectation.rawRowCount, `${stationName}: expected ${expectation.rawRowCount} raw rows in fixture, found ${rawRows.length}`);

  const parsedTrips = rawRows.map((row) => parseTflArrival(row, dlrNow)).filter(Boolean);
  assert(parsedTrips.length === rawRows.length, `${stationName}: every raw row must parse to a trip (all are valid future DLR predictions)`);

  // Sanity: the fixture really does reproduce the defect's shape — one shared upstream id across
  // more than one distinct destination. If this ever stops being true the fixture has drifted
  // from the live-confirmed defect and this gate would silently stop testing anything.
  const uniqueUpstreamIds = new Set(rawRows.map((row) => row.id));
  const uniqueDestinations = new Set(parsedTrips.map((trip) => trip.destination));
  assert(uniqueUpstreamIds.size === 1, `${stationName}: fixture must reproduce a single shared upstream id (found ${uniqueUpstreamIds.size})`);
  assert(uniqueDestinations.size > 1, `${stationName}: fixture must reproduce >1 distinct destination sharing that id (found ${uniqueDestinations.size})`);

  // BEFORE: the old (pre-fix) dedup key — trip.id, which equals the colliding upstream id/vehicleId
  // here — collapses all rows sharing that id down to one, regardless of destination. Simulated
  // directly (not by calling production code, which no longer does this) purely to report the
  // regression-proof before/after contrast this gate exists to guard.
  const beforeMap = new Map();
  for (const trip of parsedTrips) {
    const existing = beforeMap.get(trip.id);
    if (!existing || trip.liveDeparture < existing.liveDeparture) {
      beforeMap.set(trip.id, trip);
    }
  }
  const beforeCount = beforeMap.size;

  // AFTER: production dedup path — dedupeTrips keyed by tripDedupKey. Passed as a single-fetch
  // list here (mirrors fetchStopBoard fetching one naptanId and getting back rows that collide on
  // TfL's own id) — every genuinely distinct destination/time survives.
  const afterTrips = dedupeTrips([parsedTrips]);

  console.log(
    `  ${stationName}: ${rawRows.length} raw rows, 1 shared upstream id, ${uniqueDestinations.size} distinct destinations -> ` +
      `before (id-keyed): ${beforeCount} surviving trip(s), after (tripDedupKey): ${afterTrips.length} surviving trip(s)`
  );

  if (beforeCount >= rawRows.length) {
    console.error(`  FAIL ${stationName}: fixture doesn't reproduce the old bug (id-keyed dedup should have collapsed rows, got ${beforeCount})`);
    failures++;
  }
  if (afterTrips.length !== rawRows.length) {
    console.error(`  FAIL ${stationName}: expected all ${rawRows.length} rows to survive tripDedupKey dedup, got ${afterTrips.length}`);
    failures++;
  }

  for (const direction of expectation.directions) {
    const upcoming = pickUpcomingTrips(afterTrips, direction, dlrNow);
    if (upcoming.length === 0) {
      console.error(`  FAIL ${stationName}: direction "${direction}" matches 0 trips after the dedup fix (would still be broken)`);
      failures++;
    } else {
      console.log(`  OK   ${stationName}: direction "${direction}" -> ${upcoming.length} trip(s)`);
    }
  }
}

// --- alsoNaptanIds fan-out must still collapse, scoped so it never eats a genuine same-response
// duplicate (docs/jim-brief-london-tram-duplicate-stops.md PR #344; docs/jim-brief-dlr-dedup-key.md
// 8 Sep 2026 amendment) ---
//
// Live-captured, not mocked (qa/fixtures/uk-london-tfl/fanout-dedup-arrivals.json, Clapham
// Junction, 8 Sep 2026, while London Overground service was running) — a mock reusing one id
// across both fetches is exactly what let the fan-out duplication defect through the first time,
// per the brief's amendment. This capture independently proves the amendment's central live
// finding: matching the same physical train across the hub naptanId (910GCLPHMJ1) and its
// alsoNaptanIds fold-in (910GCLPHMJC) by line + destination + expectedArrival, every matched pair
// carries a DIFFERENT `id`, so any dedup key containing `id` can never collapse this fan-out.
{
  console.log("\nalsoNaptanIds fan-out collapse check (live-captured, Clapham Junction):");

  const fanoutFixture = JSON.parse(
    readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "fanout-dedup-arrivals.json"), "utf8")
  );
  const fanoutNow = new Date(fanoutFixture.capturedAt);
  assert(!Number.isNaN(fanoutNow.getTime()), "fanout fixture capturedAt must be a valid timestamp");

  const hubNaptanId = fanoutFixture.station.naptanId;
  const foldedNaptanId = fanoutFixture.station.alsoNaptanIds[0];
  const rawHubRows = fanoutFixture.arrivals[hubNaptanId];
  const rawFoldedRows = fanoutFixture.arrivals[foldedNaptanId];

  const hubTrips = rawHubRows.map((row) => parseTflArrival(row, fanoutNow)).filter(Boolean);
  const foldedTrips = rawFoldedRows.map((row) => parseTflArrival(row, fanoutNow)).filter(Boolean);
  assert(hubTrips.length === rawHubRows.length, "every raw hub row must parse to a trip");
  assert(foldedTrips.length === rawFoldedRows.length, "every raw folded row must parse to a trip");

  // Sanity: the fixture really does reproduce the amendment's live finding — matched pairs (same
  // line + destination + expectedArrival) across the two fetches must carry different ids. If this
  // ever stops being true, the fixture has drifted from the live-confirmed defect.
  let matchedPairs = 0;
  let matchedPairsWithDifferentId = 0;
  for (const hubTrip of hubTrips) {
    const partner = foldedTrips.find(
      (t) => t.line === hubTrip.line && t.destination === hubTrip.destination && t.liveDeparture.getTime() === hubTrip.liveDeparture.getTime()
    );
    if (partner) {
      matchedPairs++;
      if (partner.id !== hubTrip.id) {
        matchedPairsWithDifferentId++;
      }
    }
  }
  assert(matchedPairs > 0, "fixture must contain at least one matched train across the hub and folded fetches");
  assert(
    matchedPairsWithDifferentId === matchedPairs,
    `every matched pair must carry a different id (found ${matchedPairsWithDifferentId}/${matchedPairs}) — otherwise this fixture no longer exercises the live finding`
  );
  console.log(`  live finding reproduced: ${matchedPairs} matched train(s) across both fetches, all ${matchedPairsWithDifferentId} with differing id`);

  // Direct check on tripDedupKey itself: despite the differing id, the scoped key (no id) must
  // still match for a real matched pair — this is exactly what lets dedupeTrips collapse it.
  const firstHubStratford = hubTrips.find((t) => t.destination.includes("Stratford"));
  const firstFoldedStratford = foldedTrips.find((t) => t.destination.includes("Stratford"));
  assert(firstHubStratford && firstFoldedStratford, "fixture must contain a Stratford-bound row in both fetches");
  assert(firstHubStratford.id !== firstFoldedStratford.id, "sanity: these two rows must have different ids (that's the live finding)");
  assert(
    tripDedupKey(firstHubStratford) === tripDedupKey(firstFoldedStratford),
    "tripDedupKey (no id) must match across the hub/folded fetch for the same physical train despite differing id"
  );

  // BEFORE: the pre-8-Sep-fix key (id-inclusive) can never collapse this fan-out, because every
  // row's id is unique across the two fetches (that's the live finding above) — simulated directly
  // since production code no longer does this, purely to demonstrate the live defect that shipped
  // since PR #344 (duplicate rows at every alsoNaptanIds station).
  const combinedRaw = [...hubTrips, ...foldedTrips];
  const beforeIds = new Set(combinedRaw.map((t) => t.id));
  const beforeCount = beforeIds.size; // no collapsing at all: every id is unique

  // AFTER: production dedupeTrips, scoped across the two fetches.
  const merged = dedupeTrips([hubTrips, foldedTrips]);

  console.log(
    `  Clapham Junction: ${combinedRaw.length} raw rows across 2 fetches (${hubTrips.length} hub + ${foldedTrips.length} folded) -> ` +
      `before (id-keyed): ${beforeCount} surviving trip(s) [bug: duplicates not collapsed], after (scoped tripDedupKey): ${merged.length} surviving trip(s)`
  );

  if (beforeCount !== combinedRaw.length) {
    console.error(`  FAIL fixture doesn't reproduce the live defect (id-keyed dedup should not collapse anything here, got ${beforeCount} of ${combinedRaw.length})`);
    failures++;
  }
  if (merged.length !== combinedRaw.length - matchedPairs) {
    console.error(
      `  FAIL expected ${combinedRaw.length - matchedPairs} surviving trips (${combinedRaw.length} raw - ${matchedPairs} collapsed fan-out duplicate(s)), got ${merged.length}`
    );
    failures++;
  }

  // No duplicate destination@displayTime pairs (acceptance criterion 6): group the merged result
  // and assert each group's size never exceeds the largest same-key group seen in any *single*
  // fetch's raw response (i.e. nothing that was only a fan-out duplicate survived twice).
  function groupSize(trips, key) {
    return trips.filter((t) => `${t.line}|${t.destination}|${t.platform}|${t.liveDeparture.getTime()}` === key).length;
  }
  const mergedKeys = new Set(merged.map((t) => `${t.line}|${t.destination}|${t.platform}|${t.liveDeparture.getTime()}`));
  let overCounted = 0;
  for (const key of mergedKeys) {
    const mergedGroupSize = groupSize(merged, key);
    const maxSingleResponseSize = Math.max(groupSize(hubTrips, key), groupSize(foldedTrips, key));
    if (mergedGroupSize > maxSingleResponseSize) {
      overCounted++;
      console.error(`  FAIL key "${key}": ${mergedGroupSize} rows survived merge but no single fetch reported more than ${maxSingleResponseSize} — fan-out duplicate leaked through`);
    }
  }
  if (overCounted === 0) {
    console.log(`  OK   no duplicate destination@time pairs survive the merge (${mergedKeys.size} distinct keys, ${merged.length} trips)`);
  } else {
    failures += overCounted;
  }

  // Within-response preservation (acceptance criterion 7, Walthamstow Central shape): the hub
  // fetch's two "Windrush -> Dalston Junction" rows share line/destination/platform/time and
  // differ only by id — same-response, must both survive uncollapsed.
  const dalstonRows = merged.filter((t) => t.destination.includes("Dalston Junction"));
  if (dalstonRows.length !== 2) {
    console.error(`  FAIL expected the 2 same-response Dalston Junction rows (Walthamstow Central shape) to both survive, got ${dalstonRows.length}`);
    failures++;
  } else {
    console.log(`  OK   2 same-response same-key rows (genuinely distinct trains, differing only by id) both preserved, not collapsed`);
  }
}

// --- Spot-check two more alsoNaptanIds stations (acceptance criterion 8) — East Croydon and West
// Croydon, live-captured 8 Sep 2026 alongside the Clapham Junction fixture above. Tramlink service
// at these two was light at capture time (folded naptans returned 0 rows), so there is nothing to
// collapse — which is itself the assertion: dedupeTrips must not fabricate or drop trips when a
// fold-in fetch is empty, and duplicate count must be zero. ---
{
  console.log("\nalsoNaptanIds spot-check (live-captured, East Croydon / West Croydon):");

  const spotFixture = JSON.parse(
    readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "fanout-dedup-arrivals.json"), "utf8")
  );
  const spotNow = new Date(spotFixture.capturedAt);
  for (const [stationName, spec] of Object.entries(spotFixture.spotCheckStations)) {
    const hubTrips = spec.arrivals[spec.naptanId].map((r) => parseTflArrival(r, spotNow)).filter(Boolean);
    const foldedLists = spec.alsoNaptanIds.map((id) => spec.arrivals[id].map((r) => parseTflArrival(r, spotNow)).filter(Boolean));
    const totalFoldedRows = foldedLists.reduce((sum, list) => sum + list.length, 0);
    const merged = dedupeTrips([hubTrips, ...foldedLists]);
    // No station in this spot-check has any overlapping key between hub and folded rows (folded
    // naptans were quiet at capture time), so the merge must be a pure union — zero duplicates.
    if (merged.length !== hubTrips.length + totalFoldedRows) {
      console.error(
        `  FAIL ${stationName}: expected ${hubTrips.length + totalFoldedRows} trip(s) (union, no overlapping keys captured), got ${merged.length}`
      );
      failures++;
    } else {
      console.log(
        `  OK   ${stationName}: ${hubTrips.length} hub row(s) + ${totalFoldedRows} folded row(s) -> ${merged.length} trip(s), 0 unexpected duplicates`
      );
    }
  }
}

// --- No regression for tube/Overground: dedupeTrips must not introduce new collisions on
// feeds whose ids were already unique (acceptance criterion 4) ---
{
  console.log("\nNo-regression checks (tube, Overground):");

  const gospelOakTrips = parseStationTrips(fixture.stations["Gospel Oak"], now);
  const gospelOakDeduped = dedupeTrips([gospelOakTrips]);
  if (gospelOakDeduped.length !== gospelOakTrips.length) {
    console.error(
      `  FAIL Gospel Oak (Overground): trip count changed after dedupeTrips (${gospelOakTrips.length} -> ${gospelOakDeduped.length}) — regression`
    );
    failures++;
  } else {
    console.log(`  OK   Gospel Oak (Overground): ${gospelOakTrips.length} trips before and after dedupeTrips — unchanged`);
  }

  const walthamstowTrips = terminusFixture.stations["Walthamstow Central"].arrivals[
    terminusFixture.stations["Walthamstow Central"].naptanId
  ]
    .map((row) => parseTflArrival(row, terminusNow))
    .filter(Boolean);
  const walthamstowDeduped = dedupeTrips([walthamstowTrips]);
  if (walthamstowDeduped.length !== walthamstowTrips.length) {
    console.error(
      `  FAIL Walthamstow Central (tube): trip count changed after dedupeTrips (${walthamstowTrips.length} -> ${walthamstowDeduped.length}) — regression`
    );
    failures++;
  } else {
    console.log(`  OK   Walthamstow Central (tube): ${walthamstowTrips.length} trips before and after dedupeTrips — unchanged`);
  }
}

if (failures > 0) {
  console.error(`\nuk-london-tfl-direction-match: FAILED (${failures} problem(s))`);
  process.exit(1);
}

console.log("\nuk-london-tfl-direction-match: ok");
