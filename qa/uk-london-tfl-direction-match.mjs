/**
 * uk-london-tfl direction-match gate — proves the fix for
 * docs/jim-brief-london-overground-empty-direction.md (Barking Riverside's only offered
 * direction, "Suffragette Gospel Oak", returned "No upcoming trains" even though TfL was
 * publishing 8 valid predictions for it).
 *
 * Uses a checked-in fixture of raw TfL StopPoint/Arrivals responses
 * (qa/fixtures/uk-london-tfl/direction-match-arrivals.json), captured live on 7 Sep 2026 —
 * no network access or TFL_APP_KEY required to run this script.
 *
 * Asserts, for Barking Riverside, Gospel Oak, Woodgrange Park and Barking:
 *   1. Every direction the catalog (public/city-directions/uk-london-tfl.json) offers for that
 *      station matches at least one parsed trip from the fixture (the walk-up rule: an offered
 *      direction must not be unmatchable by construction).
 *   2. No parsed destination retains a raw "Rail Station" / "Underground Station" / "(London)"
 *      station-type or National-Rail-flavoured suffix.
 *
 * Terminus handling verdict (docs/board-eligibility-rule.md): at Barking Riverside and Gospel
 * Oak — the two termini of the Suffragette line — TfL's own outbound-from-terminus predictions
 * report every near-term departure with the same near-zero timeToStation, which is already
 * behind the caller's clock by the time the HTTP response is parsed (confirmed live: consistently
 * ~10-30s in the past). These are genuinely walk-up-and-boardable — the train is the very next
 * physical departure — so they belong on the board; pickUpcomingTrips's grace window (see
 * lib/train-times-core.js) is what keeps them from being silently dropped. Arrivals whose
 * destinationName *is* the station itself (a train terminating there) are correctly excluded —
 * they are not a boardable departure in any offered direction.
 *
 * Usage: node qa/uk-london-tfl-direction-match.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parseTflArrival } from "../lib/providers/uk-tfl.js";
import { pickUpcomingTrips } from "../lib/train-times-core.js";

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
const directionsByStation = JSON.parse(
  readFileSync(join(ROOT, "public", "city-directions", "uk-london-tfl.json"), "utf8")
);

const now = new Date(fixture.capturedAt);
assert(!Number.isNaN(now.getTime()), "fixture.capturedAt must be a valid timestamp");

const STATIONS = ["Barking Riverside", "Gospel Oak", "Woodgrange Park", "Barking"];

const SUFFIX_RE = /\s+(Underground Station|DLR Station|Rail Station|Tram Stop|Station|\(London\))$/i;

let failures = 0;

for (const stationName of STATIONS) {
  const station = fixture.stations[stationName];
  assert(station, `fixture missing station: ${stationName}`);

  const trips = [];
  for (const naptanId of station.naptanIds) {
    const rows = station.arrivals[naptanId] ?? [];
    for (const row of rows) {
      const trip = parseTflArrival(row, now);
      if (trip) {
        trips.push(trip);
      }
    }
  }

  console.log(`${stationName}: ${trips.length} parsed trips from fixture`);

  // No parsed destination should retain a raw station-type / "(London)" suffix.
  for (const trip of trips) {
    if (SUFFIX_RE.test(trip.destination)) {
      console.error(`  FAIL suffix leaked through: "${trip.destination}"`);
      failures++;
    }
  }

  const directions = directionsByStation[stationName] ?? [];
  assert(directions.length > 0, `${stationName} must have at least one offered direction in the catalog`);

  for (const direction of directions) {
    const upcoming = pickUpcomingTrips(trips, direction, now);
    if (upcoming.length === 0) {
      console.error(`  FAIL direction "${direction}" matches 0 parsed trips (unmatchable by construction)`);
      failures++;
    } else {
      console.log(`  OK   direction "${direction}" -> ${upcoming.length} trips`);
    }
  }
}

if (failures > 0) {
  console.error(`\nuk-london-tfl-direction-match: FAILED (${failures} problem(s))`);
  process.exit(1);
}

console.log("\nuk-london-tfl-direction-match: ok");
