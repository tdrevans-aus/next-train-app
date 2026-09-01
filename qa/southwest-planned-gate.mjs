/**
 * Southwest stays planned (adapter wired, not flipped live). Perth (Australia)
 * stays live. Usage: node qa/southwest-planned-gate.mjs
 *
 * Same "no static GTFS at all" gap as West of England / London & South East
 * National Rail — National Rail Enquiries does not publish static GTFS
 * anywhere, so this region is genuinely Darwin-or-nothing until
 * DARWIN_LDB_TOKEN exists. This gate asserts the catalog/registry wiring and
 * that the board paths throw MissingDarwinTokenError, with no network calls
 * (MissingDarwinTokenError throws before any fetch — see
 * lib/providers/uk-darwin.js getDarwinToken()).
 *
 * Also asserts the Night Riviera Sleeper out-reservation exclusion is
 * enforced in code (not just documented): fetchNationalRailBoard() passes
 * excludeOperators for the six stations it calls at (Exeter St Davids,
 * Plymouth, Truro, St Austell, St Erth, Penzance) and does NOT pass it for
 * the through-running-only stations it never calls at (Taunton, Newton
 * Abbot, Totnes) — same mechanism as Rest of Scotland's Caledonian Sleeper
 * exclusion.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  SOUTHWEST_HUB,
  SOUTHWEST_SECONDARY_HUB,
  SOUTHWEST_TERMINUS,
  SOUTHWEST_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  excludesNightRivieraSleeper,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/southwest.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug). Perth
// (Australia) green + southwest correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("southwest");
assert(live?.ok === false, "assertCityLive(southwest) must fail");
assert(live?.status === 501, "southwest must be 501 planned");

const entry = getCity("southwest");
assert(entry?.status === "planned", "southwest registry status must be planned");
assert(entry?.adapterReady === true, "southwest adapterReady must be true");
assert(entry?.displayName === "Southwest", "southwest display name must be Southwest");
assert(entry?.timeZone === "Europe/London", "southwest timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "southwest").length === 1,
  "southwest must appear once in the registry"
);
for (const forbiddenId of ["uk-southwest", "devon-cornwall", "south-west-england"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/southwest-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/southwest-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "southwest", "D1 city id must be southwest");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === SOUTHWEST_HUB,
  `D1 lock must be ${SOUTHWEST_HUB}`
);
assert(
  network.printedInnerCityNames?.secondary === SOUTHWEST_SECONDARY_HUB,
  `D1 secondary must be ${SOUTHWEST_SECONDARY_HUB}`
);
assert(
  network.printedInnerCityNames?.terminus === SOUTHWEST_TERMINUS,
  `D1 terminus must be ${SOUTHWEST_TERMINUS}`
);

// Excluded services (Night Riviera Sleeper) recorded in the D1 pack.
const excludedNames = (network.excludedServices ?? []).map((s) => s.operator);
assert(
  excludedNames.includes("Night Riviera Sleeper"),
  "D1 pack must record Night Riviera Sleeper as an excluded service"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOUTHWEST_REGION);
assert(region?.railCount === 9, `southwest rail count must be 9, got ${region?.railCount}`);
assert(region?.metroCount === 0, `southwest must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "southwest must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["EXD", "PLY", "PNZ", "TAU", "NAB", "TON", "TRU", "SAU", "SER"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(SOUTHWEST_REGION).length === 0, "southwest has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 9, `combined catalog must have 9 stations (train only), got ${allStations.length}`);

// No doNotGroup — hub, secondary hub, and terminus each resolve to a single catalog entry.
const hub = resolveCatalogEntry(SOUTHWEST_HUB);
assert(hub?.crs === "EXD", "Exeter St Davids must resolve with crs EXD");
const secondary = resolveCatalogEntry(SOUTHWEST_SECONDARY_HUB);
assert(secondary?.crs === "PLY", "Plymouth must resolve with crs PLY");
const terminus = resolveCatalogEntry(SOUTHWEST_TERMINUS);
assert(terminus?.crs === "PNZ", "Penzance must resolve with crs PNZ");

// Night Riviera Sleeper out-reservation exclusion — per-station, enforced in code.
for (const name of ["Exeter St Davids", "Plymouth", "Truro", "St Austell", "St Erth", "Penzance"]) {
  assert(
    excludesNightRivieraSleeper(name) === true,
    `${name} must exclude Night Riviera Sleeper`
  );
}
for (const name of ["Taunton", "Newton Abbot", "Totnes"]) {
  assert(
    excludesNightRivieraSleeper(name) === false,
    `${name} must NOT exclude Night Riviera Sleeper — it never calls there`
  );
}

// The board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
for (const stationName of [SOUTHWEST_HUB, SOUTHWEST_SECONDARY_HUB, SOUTHWEST_TERMINUS]) {
  let darwinBlocked = false;
  try {
    await fetchNationalRailBoard(stationName);
  } catch (err) {
    darwinBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
}

let dispatchBlocked = false;
try {
  await fetchStationBoard(SOUTHWEST_HUB);
} catch (err) {
  dispatchBlocked = err instanceof MissingDarwinTokenError;
}
assert(dispatchBlocked, "fetchStationBoard dispatcher must not silently succeed — must surface MissingDarwinTokenError");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station");

console.log(
  "southwest-planned-gate: ok (planned/501, adapterReady, D1 pack, 9 rail-only stations, no doNotGroup at EXD/PLY/PNZ, Night Riviera Sleeper out-reservation exclusion enforced per-station, National Rail board correctly blocked on MissingDarwinTokenError with no GTFS fallback, Perth Australia green)"
);
