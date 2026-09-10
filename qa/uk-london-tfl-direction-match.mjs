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
 * Extended for docs/jim-brief-elizabeth-heathrow-normalization.md (8 Sep 2026): two independent
 * 100%-failure normalization defects found by the full-network audit
 * (docs/london-destination-reconciliation-audit.md).
 *   1. Elizabeth line: TfL's raw `lineName` is the literal string "Elizabeth line", so every parsed
 *      trip read e.g. "Elizabeth line Heathrow Terminal 4" against the catalog's offered "Elizabeth
 *      Heathrow Terminal 4" -- never equal. Fixed by stripping a trailing `/\s+line$/i` from the
 *      line-name portion before concatenation (`stripLineNameSuffix` in uk-tfl.js) -- confirmed live
 *      against every rail-mode lineName TfL's `/Line/Mode/...` metadata currently emits (8 Sep 2026)
 *      that "Elizabeth line" is the *only* one ending in " line"; the five Overground line names
 *      (Mildmay, Windrush, Weaver, Lioness, Suffragette) plus Liberty and Waterloo & City are
 *      unaffected, asserted directly below.
 *   2. Piccadilly Heathrow: `towards` carries a branch-loop label ("Heathrow via T4 Loop", "Heathrow
 *      T123 + 5") for Heathrow-branch trains, and the existing `via`-strip (load-bearing for genuine
 *      cases like "Grange Hill via Woodford", "Hainault via Newbury Park" on the Central line, so
 *      never removed) collapsed both terminals to bare "Heathrow". Fixed with a catalog-driven rule
 *      (`stationOffersDestination` in lib/providers/uk/catalog.js): when the `towards`-derived
 *      destination doesn't resolve to an offered direction at this station but `destinationName`'s
 *      does, prefer `destinationName` -- never a hardcoded terminal-name special case, and it
 *      degrades safely (keeps the `via`-stripped form) when neither resolves.
 *
 * While investigating, found a third, structurally distinct issue in the same defect class but not
 * a text-normalization bug: `lib/cities/uk-london-tfl/stops.json` had Stratford's elizabeth-line/
 * overground-carrying naptanId (910GSTFD) registered under a *different* catalog name, "Stratford
 * (London)", than the tube/DLR entries' plain "Stratford" -- so `resolveTflStops("Stratford")`
 * (name-matched only, per `matchTflEntry`) never included it, and `fetchStopBoard("Stratford")`
 * structurally never fetched the one naptanId carrying Elizabeth-line (and Mildmay) arrivals at all,
 * regardless of any text fix. Corrected the same way the tram-duplicate-stops fix
 * (docs/jim-brief-london-tram-duplicate-stops.md) already handles this exact shape: fold the id into
 * the surviving "Stratford" tube entry's `alsoNaptanIds` and drop the standalone duplicate-name
 * entry, rather than adding new adapter logic. Live-confirmed both Elizabeth *and* Mildmay arrivals
 * now reach the Stratford board.
 *
 * QA fixture (qa/fixtures/uk-london-tfl/elizabeth-piccadilly-heathrow-arrivals.json) is live-captured
 * (8 Sep 2026, TFL_APP_KEY-authenticated, 450-600ms-paced requests) across Stratford, Tottenham Court
 * Road (Elizabeth), Arnos Grove, Hatton Cross, Heathrow Terminals 2 & 3, Cockfosters (Piccadilly
 * Heathrow), and Hainault (Central-line `via` regression). Each station's `capturedAt` is TfL's own
 * earliest per-row `timestamp` field (not a locally-recorded wall-clock value), which avoids a real
 * race this fixture's first draft hit: sequential 450-600ms-paced fetches across 7 stations drift the
 * *local* capture clock tens of seconds past TfL's own data-generation time, which spuriously aged
 * out a near-departure (Cockfosters' Terminal 4 service, 16 seconds out at TfL's own timestamp) by
 * the time a single global "now" was recorded after the whole batch finished.
 *
 * Extended for docs/jim-brief-dlr-dedup-key.md and its two 8 Sep 2026 amendments: `tripDedupKey`
 * and `dedupeTrips` are covered directly (below) with the DLR id-collision fixture and a
 * live-captured `alsoNaptanIds` fan-out fixture (qa/fixtures/uk-london-tfl/fanout-dedup-arrivals.json,
 * captured live at Clapham Junction 8 Sep 2026 — not a mock) that proves `id` genuinely differs
 * between the hub naptanId fetch and its folded-in fetch for the same physical train, while
 * `vehicleId` (also captured in that fixture) is stable across the same two fetches — including
 * inside a 4-way same-key collision, where the *set* of vehicleIds the hub group reports equals
 * the set the folded group reports. AMENDMENT 2 (Mark's 2+1-split counterexample against the
 * prior "largest single-response group" heuristic) is covered by a direct constructed test against
 * `dedupeTrips`, plus the two controls that already passed; the Walthamstow Central
 * platform-ambiguity duplicate ("Also fold in" section of the amendment) is covered against the
 * existing terminus-arrivals.json fixture, which independently reproduces that exact shape.
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
import { pickUpcomingTrips, buildNextTrainResponse, normalizeDestination } from "../lib/train-times-core.js";

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

// --- Elizabeth line / Piccadilly Heathrow normalization
// (docs/jim-brief-elizabeth-heathrow-normalization.md) ---

console.log("\nElizabeth line suffix + Piccadilly Heathrow via-loop unit checks:");

const ehNow = new Date("2026-09-08T06:00:00Z");
const ehFuture = "2026-09-08T06:20:00Z";

// Defect 1: "Elizabeth line" lineName must not leak a stray " line" token into the parsed
// destination — the catalog's offered directions are "Elizabeth <terminus>", never "Elizabeth line
// <terminus>".
assertDestination(
  'Elizabeth line "Heathrow Terminal 4 Rail Station" (Stratford)',
  parseTflArrival(
    { modeName: "elizabeth-line", lineName: "Elizabeth line", towards: "", destinationName: "Heathrow Terminal 4 Rail Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Stratford"
  ).destination,
  "Elizabeth Heathrow Terminal 4"
);
assertDestination(
  'Elizabeth line "Shenfield Rail Station" (Tottenham Court Road)',
  parseTflArrival(
    { modeName: "elizabeth-line", lineName: "Elizabeth line", towards: "", destinationName: "Shenfield Rail Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Tottenham Court Road"
  ).destination,
  "Elizabeth Shenfield"
);
// The other two of Stratford's five offered Elizabeth termini (Abbey Wood, Reading) had zero raw
// rows in the live fixture below (an early-Monday-morning service-frequency snapshot gap, not a
// text-matching failure — see the fixture check's WARN for the live evidence) — covered here
// deterministically so criterion 1 doesn't depend on catching a live train at capture time.
assertDestination(
  'Elizabeth line "Abbey Wood Rail Station" (Stratford)',
  parseTflArrival(
    { modeName: "elizabeth-line", lineName: "Elizabeth line", towards: "", destinationName: "Abbey Wood", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Stratford"
  ).destination,
  "Elizabeth Abbey Wood"
);
assertDestination(
  'Elizabeth line "Reading Rail Station" (Stratford)',
  parseTflArrival(
    { modeName: "elizabeth-line", lineName: "Elizabeth line", towards: "", destinationName: "Reading Rail Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Stratford"
  ).destination,
  "Elizabeth Reading"
);

// Every other rail-mode lineName TfL currently emits (confirmed live 8 Sep 2026 against
// /Line/Mode/tube,overground,elizabeth-line,dlr,tram) must be unaffected by the trailing-" line"
// strip — none of them end in " line". The five Overground line names named explicitly in the
// brief, plus Liberty (the sixth Overground brand) and Waterloo & City (the one other tube line
// with an "&"/multi-word name), and DLR/Tram themselves.
const UNAFFECTED_LINE_NAMES = [
  "Mildmay",
  "Windrush",
  "Weaver",
  "Lioness",
  "Suffragette",
  "Liberty",
  "Waterloo & City",
  "DLR",
  "Tram",
  "Bakerloo",
  "Central",
  "Circle",
  "District",
  "Hammersmith & City",
  "Jubilee",
  "Metropolitan",
  "Northern",
  "Piccadilly",
  "Victoria",
];
for (const lineName of UNAFFECTED_LINE_NAMES) {
  const trip = parseTflArrival(
    { modeName: "tube", lineName, towards: "", destinationName: "Test Destination", expectedArrival: ehFuture },
    ehNow
  );
  // normalizeDestination always spells out "&" as "and" (pre-existing, unrelated to this fix) —
  // account for that in the expectation rather than asserting the raw "&" survives.
  const expected = `${lineName.replace(/\s+&\s+/g, " and ")} Test Destination`;
  assertDestination(`lineName "${lineName}" unaffected by the " line" strip`, trip.destination, expected);
}

// Defect 2: `towards` carries a branch-loop label that the (load-bearing, never-removed) `via`
// strip collapses to bare "Heathrow" — must fall back to `destinationName`, which retains the
// terminal number, and Terminal 4 / Terminal 5 must stay distinguished (a fix that collapses both
// to the same string is a fail).
assertDestination(
  'Piccadilly "Heathrow via T4 Loop" (Arnos Grove)',
  parseTflArrival(
    { modeName: "tube", lineName: "Piccadilly", towards: "Heathrow via T4 Loop", destinationName: "Heathrow Terminal 4 Underground Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Arnos Grove"
  ).destination,
  "Piccadilly Heathrow Terminal 4"
);
assertDestination(
  'Piccadilly "Heathrow T123 + 5" (Arnos Grove)',
  parseTflArrival(
    { modeName: "tube", lineName: "Piccadilly", towards: "Heathrow T123 + 5", destinationName: "Heathrow Terminal 5 Underground Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Arnos Grove"
  ).destination,
  "Piccadilly Heathrow Terminal 5"
);
{
  const t4 = parseTflArrival(
    { modeName: "tube", lineName: "Piccadilly", towards: "Heathrow via T4 Loop", destinationName: "Heathrow Terminal 4 Underground Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Cockfosters"
  );
  const t5 = parseTflArrival(
    { modeName: "tube", lineName: "Piccadilly", towards: "Heathrow T123 + 5", destinationName: "Heathrow Terminal 5 Underground Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Cockfosters"
  );
  if (t4.destination === t5.destination) {
    console.error(`  FAIL Terminal 4 and Terminal 5 collapsed to the same destination: "${t4.destination}"`);
    failures++;
  } else {
    console.log(`  OK   Terminal 4 ("${t4.destination}") and Terminal 5 ("${t5.destination}") stay distinguished`);
  }
}

// Regression guard: the `via` strip itself must still work for genuine Central-line cases, and the
// new catalog-driven override must not fire when it shouldn't.
assertDestination(
  'Central "Hainault via Newbury Park" (Hainault) still resolves via the catalog-grouped canonical form',
  parseTflArrival(
    { modeName: "tube", lineName: "Central", towards: "Hainault via Newbury Park", destinationName: "Hainault Underground Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Hainault"
  ).destination,
  "Central Epping"
);
assertDestination(
  'Central "Grange Hill via Woodford" (Grange Hill) — via strip still applies; the via-stripped ' +
    '"Central Grange Hill" now folds onto its canonical Hainault-loop terminus, "Central Epping" ' +
    "(docs/jim-brief-london-catalog-coverage.md Class B), same as the Hainault case above",
  parseTflArrival(
    { modeName: "tube", lineName: "Central", towards: "Grange Hill via Woodford", destinationName: "Grange Hill Underground Station", expectedArrival: ehFuture },
    ehNow,
    undefined,
    "Grange Hill"
  ).destination,
  "Central Epping"
);
// Without a stationName (existing callers/tests that predate this fix), the override must never
// fire — behaviour must be byte-identical to before this brief.
assertDestination(
  'Piccadilly "Heathrow via T4 Loop" with no stationName (backward-compatible default) stays via-stripped, not overridden',
  parseTflArrival(
    { modeName: "tube", lineName: "Piccadilly", towards: "Heathrow via T4 Loop", destinationName: "Heathrow Terminal 4 Underground Station", expectedArrival: ehFuture },
    ehNow
  ).destination,
  "Piccadilly Heathrow"
);

// --- Live-captured fixture: Elizabeth line (Stratford, Tottenham Court Road) and Piccadilly
// Heathrow (Arnos Grove, Hatton Cross, Heathrow Terminals 2 & 3, Cockfosters), plus Hainault for the
// Central-line `via` regression — captured live 8 Sep 2026 (see file header for the capturedAt-race
// note). ---

console.log("\nElizabeth line / Piccadilly Heathrow live-fixture checks:");

const ehFixture = JSON.parse(
  readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "elizabeth-piccadilly-heathrow-arrivals.json"), "utf8")
);

function parseEhStation(stationName) {
  const station = ehFixture.stations[stationName];
  assert(station, `elizabeth/piccadilly fixture missing station: ${stationName}`);
  const now = new Date(station.capturedAt);
  assert(!Number.isNaN(now.getTime()), `${stationName}: capturedAt must be a valid timestamp`);
  const trips = [];
  for (const naptanId of Object.keys(station.arrivals)) {
    for (const row of station.arrivals[naptanId]) {
      const trip = parseTflArrival(row, now, undefined, stationName);
      if (trip) {
        trips.push(trip);
      }
    }
  }
  return { trips, now };
}

// Known-thin-at-capture-time directions: TfL's own raw feed held zero rows for these at capture
// time (confirmed by inspecting the fixture's raw rows directly — not a matching failure, a real
// service-frequency snapshot fact, same class as the existing gate's cross-branch-Weaver /
// low-frequency-District WARN entries above and the audit's §4 category-4 "genuine absence of
// service" verdict). Recorded here, not silently skipped.
const EH_KNOWN_THIN_AT_CAPTURE = {
  Stratford: new Set(["Elizabeth Abbey Wood", "Elizabeth Heathrow Terminal 4", "Elizabeth Reading"]),
  Cockfosters: new Set(["Piccadilly Heathrow Terminal 4"]),
};

const EH_STATIONS = [
  { name: "Stratford", prefixes: ["Elizabeth "] },
  { name: "Tottenham Court Road", prefixes: ["Elizabeth "] },
  { name: "Arnos Grove", prefixes: ["Piccadilly Heathrow"] },
  { name: "Hatton Cross", prefixes: ["Piccadilly Heathrow"] },
  { name: "Heathrow Terminals 2 & 3", prefixes: ["Piccadilly Heathrow"] },
  { name: "Cockfosters", prefixes: ["Piccadilly Heathrow"] },
];

for (const { name, prefixes } of EH_STATIONS) {
  const { trips, now } = parseEhStation(name);

  // No leaked "line"/"via" text anywhere on this board.
  for (const trip of trips) {
    if (/\bvia\b/i.test(trip.destination) || /\bline\b/i.test(trip.destination)) {
      console.error(`  FAIL ${name}: leaked "line"/"via" text in destination: "${trip.destination}"`);
      failures++;
    }
  }

  const directions = (directionsByStation[name] ?? []).filter((d) => prefixes.some((p) => d.startsWith(p)));
  assert(directions.length > 0, `${name} must have at least one relevant offered direction in the catalog`);

  for (const direction of directions) {
    const upcoming = pickUpcomingTrips(trips, direction, now);
    if (upcoming.length === 0) {
      if (EH_KNOWN_THIN_AT_CAPTURE[name]?.has(direction)) {
        console.warn(
          `  WARN ${name}: direction "${direction}" had 0 raw rows in this live capture — a real ` +
            `service-frequency snapshot gap, not a matching failure; not failing the gate on it`
        );
      } else {
        console.error(`  FAIL ${name}: direction "${direction}" matches 0 parsed upcoming trips`);
        failures++;
      }
      continue;
    }
    console.log(`  OK   ${name}: direction "${direction}" -> ${upcoming.length} trip(s)`);
  }
}

// Distinction check: everywhere both Terminal 4 and Terminal 5 raw rows exist in the fixture, their
// parsed destinations must differ (never collapse to the same string).
for (const { name } of EH_STATIONS) {
  const { trips } = parseEhStation(name);
  const t4 = trips.filter((t) => t.destination === "Piccadilly Heathrow Terminal 4");
  const t5 = trips.filter((t) => t.destination === "Piccadilly Heathrow Terminal 5");
  if (t4.length > 0 && t5.length > 0) {
    console.log(`  OK   ${name}: Terminal 4 (${t4.length}) and Terminal 5 (${t5.length}) both present and distinguished`);
  }
  const bareHeathrow = trips.filter((t) => t.destination === "Piccadilly Heathrow");
  if (bareHeathrow.length > 0) {
    console.error(`  FAIL ${name}: ${bareHeathrow.length} trip(s) still parsed to bare "Piccadilly Heathrow" (terminal number lost)`);
    failures++;
  }
}

// Central-line `via` regression, against the live-captured Hainault fixture (real "Hainault via
// Newbury Park" rows).
{
  const { trips, now } = parseEhStation("Hainault");
  const upcoming = pickUpcomingTrips(trips, "Central Epping", now);
  if (upcoming.length === 0) {
    console.error(`  FAIL Hainault: "Central Epping" (via-strip-dependent) matches 0 trips — via-strip regression`);
    failures++;
  } else {
    console.log(`  OK   Hainault: "Central Epping" (via "Hainault via Newbury Park") -> ${upcoming.length} trip(s)`);
  }
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
  // fetch's two raw "Windrush -> Dalston Junction" rows share line/destination/platform/time and
  // differ only by id — same-response, must both survive uncollapsed. Matched by raw destination
  // text (not the parsed/normalized form): since docs/jim-brief-london-catalog-coverage.md folded
  // "Windrush Dalston Junction" onto "Windrush Highbury & Islington" (a real, one-stop-short
  // working — Class B), the parsed trip.destination is now "Windrush Highbury & Islington"; the
  // dedup behaviour under test (2 same-key rows differing only by id both surviving) is unchanged
  // by that catalog fold, so match on the raw fixture row instead of the post-fold string.
  const dalstonRawRows = rawHubRows.filter((r) => r.destinationName?.includes("Dalston Junction"));
  const dalstonMergedKey = dalstonRawRows.length > 0 ? tripDedupKey(parseTflArrival(dalstonRawRows[0], fanoutNow)) : null;
  const dalstonRows = dalstonMergedKey ? merged.filter((t) => tripDedupKey(t) === dalstonMergedKey) : [];
  if (dalstonRawRows.length !== 2 || dalstonRows.length !== 2) {
    console.error(`  FAIL expected the 2 same-response Dalston-Junction-shape rows (Walthamstow Central shape) to both survive, found ${dalstonRawRows.length} raw / ${dalstonRows.length} merged`);
    failures++;
  } else {
    console.log(`  OK   2 same-response same-key rows (genuinely distinct trains, differing only by id) both preserved, not collapsed (now folded to "${dalstonRows[0].destination}")`);
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

// --- No regression for Overground (acceptance criterion 4): dedupeTrips must not introduce new
// collisions on a feed whose rows carry no vehicleId at all (ArrivalDepartures has none — see
// parseTflArrivalDeparture), so every row falls to the tripDedupKey composite path, single
// response, never collapsed. ---
{
  console.log("\nNo-regression checks (Overground):");

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
}

// --- Walthamstow Central (tube) platform-ambiguity duplicate collapse — "Also fold in" section
// of docs/jim-brief-dlr-dedup-key.md's AMENDMENT 2: Mark found TfL hedges an unconfirmed
// platform by duplicating one physical train's prediction under both candidate platforms (the
// "4x Victoria Walthamstow Central@05:10" case at 05:10, 2 real vehicles each reported twice).
// The existing terminus-arrivals.json fixture (captured 7 Sep 2026, unrelated to that brief)
// independently reproduces the exact same shape: nearly every Victoria-line vehicleId here has
// two rows to "Walthamstow Central" itself (a terminating arrival, self-platform-hedged) —
// dedupeTrips must now collapse each such pair by vehicleId, dropping this count materially
// (this is the intended behaviour change, not a regression: these rows were genuine rider-visible
// duplicates before this fix). One vehicleId (205) is a legitimate exception: TfL reports it
// once terminating ("Walthamstow Central") and once continuing onward ("Brixton") — two
// different, real destinations for the same physical train — so findPollutedVehicleIds correctly
// leaves both of its rows uncollapsed. ---
{
  console.log("\nWalthamstow Central (tube) platform-ambiguity collapse check:");

  const walthamstowStation = terminusFixture.stations["Walthamstow Central"];
  const walthamstowNaptanId = walthamstowStation.naptanId;
  const rawRows = walthamstowStation.arrivals[walthamstowNaptanId].filter((row) => row.lineName === "Victoria");
  const walthamstowTrips = rawRows.map((row) => parseTflArrival(row, terminusNow)).filter(Boolean);
  assert(walthamstowTrips.length === rawRows.length, "every raw Victoria-line row must parse to a trip");

  // Sanity: the fixture must still contain vehicleIds duplicated across exactly 2 platforms with
  // the SAME destination (the hedged-platform shape) for this check to mean anything.
  const byVehicleId = new Map();
  for (const trip of walthamstowTrips) {
    if (!byVehicleId.has(trip.vehicleId)) byVehicleId.set(trip.vehicleId, []);
    byVehicleId.get(trip.vehicleId).push(trip);
  }
  const hedgedPlatformVehicleIds = [...byVehicleId.entries()].filter(
    ([, trips]) => trips.length > 1 && new Set(trips.map((t) => t.destination)).size === 1
  );
  const dualPurposeVehicleIds = [...byVehicleId.entries()].filter(
    ([, trips]) => new Set(trips.map((t) => t.destination)).size > 1
  );
  assert(
    hedgedPlatformVehicleIds.length > 0,
    "fixture must contain at least one vehicleId duplicated across platforms with the same destination (the hedged-platform shape) for this check to be meaningful"
  );
  assert(
    dualPurposeVehicleIds.length > 0,
    "fixture must contain at least one vehicleId legitimately attached to >1 destination (terminating + continuing) for the pollution-detection half of this check to be meaningful"
  );

  const expectedAfter =
    hedgedPlatformVehicleIds.length /* 1 survivor per hedged-platform vehicleId */ +
    dualPurposeVehicleIds.reduce((sum, [, trips]) => sum + trips.length, 0) /* all rows kept */ +
    [...byVehicleId.values()].filter((trips) => trips.length === 1).length; /* untouched singles */

  const deduped = dedupeTrips([walthamstowTrips]);
  console.log(
    `  ${rawRows.length} raw Victoria-line rows, ${hedgedPlatformVehicleIds.length} hedged-platform vehicleId group(s), ` +
      `${dualPurposeVehicleIds.length} dual-purpose (terminating+continuing) vehicleId(s) -> ${deduped.length} surviving trip(s)`
  );
  if (deduped.length !== expectedAfter) {
    console.error(
      `  FAIL expected ${expectedAfter} surviving trips (each hedged-platform vehicleId collapsed to 1, dual-purpose and single-row vehicleIds untouched), got ${deduped.length}`
    );
    failures++;
  } else if (deduped.length >= rawRows.length) {
    console.error(`  FAIL expected a real reduction from the raw row count (${rawRows.length}), got ${deduped.length} — fixture may have drifted`);
    failures++;
  } else {
    console.log(`  OK   platform-hedged duplicates collapsed by vehicleId (${rawRows.length} -> ${deduped.length}), dual-purpose vehicleId(s) correctly untouched`);
  }
}

// --- vehicleId stability across naptan fetches — direct sanity check on the live-captured
// fan-out fixture (docs/jim-brief-dlr-dedup-key.md AMENDMENT 2, requirement 1). Matches the hub
// and folded fetch by line + destination + expectedArrival (independent of id/vehicleId), then
// asserts vehicleId is identical for every matched pair despite id differing for all of them —
// including inside the 4-way same-key Stratford collision, where the *set* of vehicleIds in the
// hub group equals the set in the folded group. This is the live evidence `dedupeTrips`'s
// vehicleId path relies on. ---
{
  console.log("\nvehicleId cross-fetch stability check (live-captured, Clapham Junction):");

  const fanoutFixture = JSON.parse(
    readFileSync(join(ROOT, "qa", "fixtures", "uk-london-tfl", "fanout-dedup-arrivals.json"), "utf8")
  );
  const fanoutNow = new Date(fanoutFixture.capturedAt);
  const hubNaptanId = fanoutFixture.station.naptanId;
  const foldedNaptanId = fanoutFixture.station.alsoNaptanIds[0];
  const hubTrips = fanoutFixture.arrivals[hubNaptanId].map((row) => parseTflArrival(row, fanoutNow)).filter(Boolean);
  const foldedTrips = fanoutFixture.arrivals[foldedNaptanId].map((row) => parseTflArrival(row, fanoutNow)).filter(Boolean);

  const rowKey = (t) => `${t.line}|${t.destination}|${t.liveDeparture.getTime()}`;
  const hubGroups = new Map();
  for (const trip of hubTrips) {
    if (!hubGroups.has(rowKey(trip))) hubGroups.set(rowKey(trip), []);
    hubGroups.get(rowKey(trip)).push(trip);
  }
  const foldedGroups = new Map();
  for (const trip of foldedTrips) {
    if (!foldedGroups.has(rowKey(trip))) foldedGroups.set(rowKey(trip), []);
    foldedGroups.get(rowKey(trip)).push(trip);
  }

  let matchedKeys = 0;
  let vehicleIdSetsEqual = 0;
  let idsAllDiffer = 0;
  for (const [key, hubGroup] of hubGroups) {
    const foldedGroup = foldedGroups.get(key);
    if (!foldedGroup) continue;
    matchedKeys++;
    const hubVehicleIds = new Set(hubGroup.map((t) => t.vehicleId));
    const foldedVehicleIds = new Set(foldedGroup.map((t) => t.vehicleId));
    const setsEqual =
      hubVehicleIds.size === foldedVehicleIds.size && [...hubVehicleIds].every((v) => foldedVehicleIds.has(v));
    if (setsEqual) vehicleIdSetsEqual++;
    const hubIds = new Set(hubGroup.map((t) => t.id));
    const foldedIds = new Set(foldedGroup.map((t) => t.id));
    const noOverlappingIds = [...hubIds].every((id) => !foldedIds.has(id));
    if (noOverlappingIds) idsAllDiffer++;
    console.log(
      `  key "${key}" (${hubGroup.length} hub / ${foldedGroup.length} folded row(s)): vehicleId sets equal=${setsEqual}, id sets disjoint=${noOverlappingIds}`
    );
  }

  assert(matchedKeys > 0, "fixture must contain at least one matched key across both fetches");
  if (vehicleIdSetsEqual !== matchedKeys) {
    console.error(`  FAIL expected vehicleId sets to match for all ${matchedKeys} matched keys, matched for ${vehicleIdSetsEqual}`);
    failures++;
  } else {
    console.log(`  OK   vehicleId is stable across the hub/folded naptan fetch for all ${matchedKeys} matched key(s)`);
  }
  if (idsAllDiffer !== matchedKeys) {
    console.error(`  FAIL expected id to differ for all ${matchedKeys} matched keys (that's why id can't be the key), held for ${idsAllDiffer}`);
    failures++;
  } else {
    console.log(`  OK   id differs across the hub/folded naptan fetch for all ${matchedKeys} matched key(s) — confirms id alone is unusable`);
  }
}

// --- Scoping-heuristic 2+1 undercount (docs/jim-brief-dlr-dedup-key.md AMENDMENT 2) — the
// counterexample Mark found against the pre-amendment-2 "largest single-response group"
// heuristic, plus the two controls that already passed. Constructed directly against
// dedupeTrips: these trips carry no vehicleId (the ambiguous case this section exists to guard —
// with a trustworthy vehicleId the cross-fetch merge is a plain identity collapse, not a
// heuristic at all). ---
{
  console.log("\nScoping-heuristic 2+1 counterexample and controls:");

  function syntheticTrip(n) {
    return {
      line: "Test",
      destination: "Test Destination",
      platform: "1",
      liveDeparture: new Date("2026-09-08T12:00:00Z"),
      id: `synthetic-${n}`,
      vehicleId: undefined,
    };
  }

  // 3 distinct trains sharing one key, split 2 (one response) + 1 (a different response, e.g. a
  // folded-in fetch) -> must survive as 3, not undercount to 2.
  {
    const [a, b, c] = [syntheticTrip(1), syntheticTrip(2), syntheticTrip(3)];
    const result = dedupeTrips([[a, b], [c]]);
    if (result.length !== 3) {
      console.error(`  FAIL 2+1 split of 3 distinct trains: expected 3 survivors, got ${result.length}`);
      failures++;
    } else {
      console.log("  OK   2+1 split of 3 distinct trains across 2 fetches -> 3 survive (not undercounted to 2)");
    }
  }

  // Control: the same physical train reported once per fetch (echo) -> must still collapse to 1.
  {
    const [a, aEcho] = [syntheticTrip(1), syntheticTrip(1)];
    const result = dedupeTrips([[a], [aEcho]]);
    if (result.length !== 1) {
      console.error(`  FAIL same train via 2 fetches: expected 1 survivor, got ${result.length}`);
      failures++;
    } else {
      console.log("  OK   same train seen via 2 fetches -> collapses to 1 (control)");
    }
  }

  // Control: 2 distinct trains in one response (no fan-out involved at all) -> both must survive.
  {
    const [a, b] = [syntheticTrip(1), syntheticTrip(2)];
    const result = dedupeTrips([[a, b]]);
    if (result.length !== 2) {
      console.error(`  FAIL 2 distinct trains in one response: expected 2 survivors, got ${result.length}`);
      failures++;
    } else {
      console.log("  OK   2 distinct trains in one response -> both survive (control)");
    }
  }

  // DLR shape: one shared vehicleId reused across 3 rows to genuinely different destinations ->
  // findPollutedVehicleIds must flag it as polluted (untrustworthy) and every row must fall back
  // to the composite tripDedupKey path, where all 3 survive (never collapsed by the shared
  // vehicleId, which is exactly the DLR /Arrivals defect this fix guards against).
  {
    function dlrShapeTrip(destination, n) {
      return {
        line: "DLR",
        destination,
        platform: "1",
        liveDeparture: new Date(`2026-09-08T12:0${n}:00Z`),
        id: `dlr-shared-id`,
        vehicleId: "dlr-shared-vehicle",
      };
    }
    const trips = [dlrShapeTrip("DLR Beckton", 0), dlrShapeTrip("DLR Woolwich Arsenal", 1), dlrShapeTrip("DLR Stratford International", 2)];
    const result = dedupeTrips([trips]);
    if (result.length !== 3) {
      console.error(`  FAIL DLR shape (1 shared vehicleId, 3 distinct destinations): expected 3 survivors, got ${result.length}`);
      failures++;
    } else {
      console.log("  OK   DLR shape: 1 shared vehicleId, 3 distinct destinations -> 3 survive (vehicleId distrusted, falls back to composite key)");
    }
  }

  // Unassigned platform, same vehicle, reported under 2 different platform guesses -> a
  // trustworthy (non-polluted) vehicleId collapses this to 1, per the Walthamstow Central
  // hedged-platform case (TfL duplicating one physical train's prediction under both candidate
  // platforms before assignment is confirmed).
  {
    const a = {
      line: "Victoria",
      destination: "Victoria Walthamstow Central",
      platform: undefined,
      liveDeparture: new Date("2026-09-08T12:05:00Z"),
      id: "walthamstow-a",
      vehicleId: "walthamstow-shared-vehicle",
    };
    const b = {
      line: "Victoria",
      destination: "Victoria Walthamstow Central",
      platform: "2",
      liveDeparture: new Date("2026-09-08T12:05:00Z"),
      id: "walthamstow-b",
      vehicleId: "walthamstow-shared-vehicle",
    };
    const result = dedupeTrips([[a, b]]);
    if (result.length !== 1) {
      console.error(`  FAIL unassigned platform, same vehicle, 2 platform guesses: expected 1 survivor, got ${result.length}`);
      failures++;
    } else {
      console.log("  OK   unassigned platform, same vehicle, 2 platform guesses -> collapses to 1 (trustworthy vehicleId)");
    }
  }
}

// --- Catalog coverage additions (docs/jim-brief-london-catalog-coverage.md) ---
//
// Extends this gate two ways, per that brief's QA section:
//   1. A guard against the exact defect class Class B fixes: no station's offered list may
//      contain two destinations that normalize (via LINE_DESTINATION_GROUPS) to the same
//      canonical direction — that's what a future short-working import would produce.
//   2. Proof that every direction added to the eight worst stations + Acton Town really was
//      seen running live, sourced from docs/london-catalog-gaps.json (16 full-day probe samples,
//      8 Sep 2026, zero 429s) rather than a fresh capture: London Underground/Overground/DLR
//      service is closed at the hour this gate was written (dispatched ~01:20 London time,
//      service resumes ~05:30) — see the PR description. Re-run a fresh live capture once
//      service is open if stronger same-day proof is wanted; this section proves the claim this
//      PR actually made (positive evidence already on file), not a substituted fixture.

console.log("\nCatalog coverage additions — fold-collision guard:");

{
  let collisions = 0;
  for (const [stationName, directions] of Object.entries(directionsByStation)) {
    const byCanonical = new Map();
    for (const direction of directions) {
      const canonical = normalizeDestination(direction);
      if (byCanonical.has(canonical) && byCanonical.get(canonical) !== direction) {
        console.error(
          `  FAIL ${stationName}: offered directions "${byCanonical.get(canonical)}" and "${direction}" ` +
            `both normalize to "${canonical}" — a short working is offered separately from its own canonical direction`
        );
        failures++;
        collisions++;
      } else {
        byCanonical.set(canonical, direction);
      }
    }
  }
  if (collisions === 0) {
    console.log(`  OK   no station offers two destinations that fold onto the same canonical direction (${Object.keys(directionsByStation).length} stations checked)`);
  }
}

console.log("\nCatalog coverage additions — self-reference guard:");

// docs/jim-brief-london-catalog-coverage-fixups.md, item 1: the PR's derivation added
// "Hammersmith and City Hammersmith" at the station "Hammersmith (H&C Line)" — a direction
// pointing back at the station itself. Root cause: the derivation's self-match compared a
// candidate direction's terminus against the *plain* station name and never stripped the
// trailing "(H&C Line)" disambiguator, so at that one station the comparison ran against
// "Hammersmith (H&C Line)" (never equal to "Hammersmith") instead of "Hammersmith" (equal). The
// sibling disambiguated stations ("Hammersmith (Dist&Pic Line)", "Edgware Road (Bakerloo)",
// "Edgware Road (Circle Line)", "Paddington (H&C Line)") were unaffected only because none of
// their own lines' canonical termini happens to equal their own un-stripped station string
// either — coincidence, not evidence the old comparison was doing the strip.
//
// The fix is the rule, not the row: `stationBaseName` strips *any* trailing parenthetical
// disambiguator ("(H&C Line)", "(Dist&Pic Line)", "(London)", "(for ExCel)", …) before a
// self-match comparison, and this assertion runs it across the whole catalog — every station,
// every offered direction — not just the nine changed stations, so it also catches
// "Richmond (London)" offering "Mildmay Richmond" (a pre-existing instance of the same defect
// class, predating this PR, found by running this same rule catalog-wide; corrected in the same
// commit as the Hammersmith fix since acceptance criterion 1 is a whole-catalog invariant, not
// scoped to what this PR touched).
function stationBaseName(stationName) {
  return stationName.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

{
  let selfRefs = 0;
  for (const [stationName, directions] of Object.entries(directionsByStation)) {
    const base = stationBaseName(stationName);
    for (const direction of directions) {
      // Format is always "<Line> <Terminus>" (or a bare line name like "Circle"); a direction
      // is self-referential if its terminus — the trailing word(s) — equals the station's own
      // base name, under any disambiguator form the station name carries.
      const isSelfReferential = direction === base || direction.endsWith(` ${base}`);
      if (isSelfReferential) {
        console.error(
          `  FAIL ${stationName}: offers "${direction}" — a direction naming the station itself ` +
            `(base name "${base}")`
        );
        failures++;
        selfRefs++;
      }
    }
  }
  if (selfRefs === 0) {
    console.log(
      `  OK   no station offers a direction naming itself, under any disambiguator form (${Object.keys(directionsByStation).length} stations checked)`
    );
  }
}

console.log("\nCatalog coverage additions — new/extended LINE_DESTINATION_GROUPS fold checks:");

{
  // [short-working destination, canonical it must fold onto] — every Class B addition this PR
  // made to LINE_DESTINATION_GROUPS in lib/train-times-core.js.
  const NEW_FOLDS = [
    ["Central North Acton", "Central West Ruislip"],
    ["Central White City", "Central West Ruislip"],
    ["Central Ruislip Gardens", "Central West Ruislip"],
    ["Central Grange Hill", "Central Epping"],
    ["Central Newbury Park", "Central Epping"],
    ["Central Debden", "Central Epping"],
    ["District Dagenham East", "District Upminster"],
    ["District Tower Hill", "District Upminster"],
    ["Piccadilly Oakwood", "Piccadilly Cockfosters"],
    ["Piccadilly Arnos Grove", "Piccadilly Cockfosters"],
    ["Piccadilly Wood Green", "Piccadilly Cockfosters"],
    ["Circle Edgware Road (Circle)", "Circle"],
    ["Circle Hammersmith", "Circle"],
    ["Elizabeth Gidea Park", "Elizabeth Shenfield"],
    ["Elizabeth Maidenhead", "Elizabeth Reading"],
    ["Jubilee Wembley Park", "Jubilee Stanmore"],
    ["Jubilee Willesden Green", "Jubilee Stanmore"],
    ["Jubilee North Greenwich", "Jubilee Stratford"],
    ["Jubilee West Ham", "Jubilee Stratford"],
    ["Metropolitan Baker Street", "Metropolitan Aldgate"],
    ["Mildmay Shepherds Bush", "Mildmay Clapham Junction"],
    ["Windrush Dalston Junction", "Windrush Highbury & Islington"],
    ["Windrush Battersea Park", "Windrush Clapham Junction"],
    ["Windrush New Cross ELL", "Windrush New Cross"],
  ];
  for (const [shortWorking, canonical] of NEW_FOLDS) {
    assertDestination(`normalizeDestination("${shortWorking}")`, normalizeDestination(shortWorking), canonical);
  }
}

console.log("\nCatalog coverage additions — Class A confident-evidence check (worst-8 + Acton Town):");

{
  const gaps = JSON.parse(
    readFileSync(join(ROOT, "docs", "london-catalog-gaps.json"), "utf8")
  );
  const COVERAGE_LINES = [
    "Hammersmith and City", "Waterloo and City", "Piccadilly", "Metropolitan", "Bakerloo",
    "District", "Circle", "Central", "Jubilee", "Northern", "Victoria", "Elizabeth",
    "Suffragette", "Windrush", "Mildmay", "Liberty", "Lioness", "Weaver", "DLR", "Tram",
  ].sort((a, b) => b.length - a.length);
  function matchCoverageLine(s) {
    for (const l of COVERAGE_LINES) {
      if (s === l || s.startsWith(`${l} `)) return l;
    }
    return null;
  }

  const CHANGED_STATIONS = [
    "Acton Town", "Liverpool Street", "Embankment", "Farringdon", "Tottenham Court Road",
    "Bond Street", "Paddington", "Canary Wharf", "Gloucester Road",
  ];

  // Lines each station already offered before this PR (docs/jim-brief-london-catalog-coverage.md
  // "before" counts) — anything offered beyond this set must be backed by confident classA
  // evidence below, or the gate fails.
  const PRE_EXISTING_LINES = {
    "Acton Town": new Set(["District"]),
    "Liverpool Street": new Set(["Central"]),
    Embankment: new Set(["Bakerloo"]),
    Farringdon: new Set(["Circle"]),
    "Tottenham Court Road": new Set(["Elizabeth"]),
    "Bond Street": new Set(["Central"]),
    Paddington: new Set(["Bakerloo"]),
    "Canary Wharf": new Set(["DLR"]),
    "Gloucester Road": new Set(["Circle"]),
  };

  // Every station+line pair in the confident (>= half the samples) set — the same threshold this
  // PR used to decide what to add.
  const confirmedByStationLine = new Set();
  for (const row of gaps.classA_lineEntirelyAbsent) {
    if (row.samples >= Math.ceil(row.ofSamples / 2)) {
      const line = matchCoverageLine(row.direction);
      confirmedByStationLine.add(`${row.station}||${line}`);
    }
  }

  for (const stationName of CHANGED_STATIONS) {
    const directions = directionsByStation[stationName] ?? [];
    const linesOffered = new Set(directions.map(matchCoverageLine).filter(Boolean));
    const preExisting = PRE_EXISTING_LINES[stationName] ?? new Set();
    const newLines = [...linesOffered].filter((line) => !preExisting.has(line));
    const unproven = newLines.filter((line) => !confirmedByStationLine.has(`${stationName}||${line}`));
    console.log(
      `  ${stationName}: ${directions.length} offered direction(s), ${newLines.length} line(s) added ` +
        `(${newLines.join(", ") || "none"}), all backed by confident live evidence: ${unproven.length === 0}`
    );
    for (const line of unproven) {
      console.error(`  FAIL ${stationName}: added line "${line}" has no confident (>=half-sample) classA evidence in docs/london-catalog-gaps.json`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\nuk-london-tfl-direction-match: FAILED (${failures} problem(s))`);
  process.exit(1);
}

console.log("\nuk-london-tfl-direction-match: ok");
