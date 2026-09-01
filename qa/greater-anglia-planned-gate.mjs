/**
 * Greater Anglia stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/greater-anglia-planned-gate.mjs
 *
 * Greater Anglia has a live static GTFS feed as a reference source (unlike
 * West of England), but this adapter never pulls it for board data — Darwin
 * is the only real-time path, same MissingDarwinTokenError shape as every
 * other Darwin-only UK region. This gate asserts the catalog/registry
 * wiring, the two-secondary-hub shape, Peterborough's LNER exclusion, and
 * that the single board path throws MissingDarwinTokenError, with no
 * network calls (MissingDarwinTokenError throws before any fetch — see
 * lib/providers/uk-darwin.js getDarwinToken()).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  GREATER_ANGLIA_HUB,
  GREATER_ANGLIA_SECONDARY_HUBS,
  GREATER_ANGLIA_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/greater-anglia.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + greater-anglia correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("greater-anglia");
assert(live?.ok === false, "assertCityLive(greater-anglia) must fail");
assert(live?.status === 501, "greater-anglia must be 501 planned");

const entry = getCity("greater-anglia");
assert(entry?.status === "planned", "greater-anglia registry status must be planned");
assert(entry?.adapterReady === true, "greater-anglia adapterReady must be true");
assert(entry?.displayName === "Greater Anglia", "greater-anglia display name must be Greater Anglia");
assert(entry?.timeZone === "Europe/London", "greater-anglia timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "greater-anglia").length === 1,
  "greater-anglia must appear once in the registry"
);
for (const forbiddenId of ["ga", "norwich", "east-anglia", "greater-anglia-trains"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/greater-anglia-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/greater-anglia-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "greater-anglia", "D1 city id is greater-anglia");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === GREATER_ANGLIA_HUB,
  `D1 lock must be ${GREATER_ANGLIA_HUB}`
);
assert(
  JSON.stringify(network.printedInnerCityNames?.secondaryHubs) === JSON.stringify(GREATER_ANGLIA_SECONDARY_HUBS),
  "D1 secondaryHubs must be [Cambridge, Ipswich]"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(GREATER_ANGLIA_REGION);
// The jim-handoff.md list names 14 stations (hub, two secondary hubs, boundary, third-tier
// hub, junction, six branch termini, airport/commuter stations) even though its own prose
// rounds this to "~13" — the actual explicit list is 14, carried through as-is.
assert(region?.railCount === 14, `greater-anglia rail count must be 14, got ${region?.railCount}`);
assert(region?.metroCount === 0, `greater-anglia must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "greater-anglia must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["NRW", "CBG", "IPS", "PBO", "COL", "ELY", "KLY", "THF", "YRD", "SSD", "BST"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(GREATER_ANGLIA_REGION).length === 0, "greater-anglia has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 14, `combined catalog must have 14 stations (train only), got ${allStations.length}`);

// No doNotGroup — hub and both secondary hubs each resolve to a single catalog entry.
const hub = resolveCatalogEntry(GREATER_ANGLIA_HUB);
assert(hub?.crs === "NRW", "Norwich must resolve with crs NRW");
const cambridge = resolveCatalogEntry("Cambridge");
assert(cambridge?.crs === "CBG", "Cambridge must resolve with crs CBG");
const ipswich = resolveCatalogEntry("Ipswich");
assert(ipswich?.crs === "IPS", "Ipswich must resolve with crs IPS");

// Peterborough — flat boundary entry, not a hub, LNER excluded (undecided verdict).
const peterborough = resolveCatalogEntry("Peterborough");
assert(peterborough?.crs === "PBO", "Peterborough must resolve with crs PBO");
assert(
  (peterborough?.excludeOperators ?? []).includes("LNER"),
  "Peterborough must carry excludeOperators: [LNER] (undecided board-eligibility verdict)"
);

// Liverpool Street must NOT be duplicated here — it already lives in London & South East
// National Rail's built pack.
assert(
  resolveCatalogEntry("Liverpool Street") === null,
  "Liverpool Street must not be built in greater-anglia's own catalog — already in london-se-national-rail"
);

// Lowestoft's CRS collision (report gives LST, which is Liverpool Street's real CRS) —
// must stay unverified/null, never LST.
const lowestoft = resolveCatalogEntry("Lowestoft");
assert(lowestoft !== null, "Lowestoft must still resolve by name even with a null crs");
assert(lowestoft?.crs !== "LST", "Lowestoft must never carry LST — that is Liverpool Street's real CRS");
assert(lowestoft?.crs === null, "Lowestoft's crs must stay null/unverified, not guessed");

assert(resolveCatalogEntry("Norwich Station") !== null, "the doNotUse alias must still resolve to the hub entry");

// The single board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
let darwinBlocked = false;
try {
  await fetchNationalRailBoard(GREATER_ANGLIA_HUB);
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let dispatchBlocked = false;
try {
  await fetchStationBoard(GREATER_ANGLIA_HUB);
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
  "greater-anglia-planned-gate: ok (planned/501, adapterReady, D1 pack, 14 rail-only stations, hub Norwich + secondary hubs Cambridge/Ipswich, Peterborough flat boundary with LNER excluded, Liverpool Street not duplicated, Lowestoft CRS collision avoided, National Rail board correctly blocked on MissingDarwinTokenError, Perth green)"
);
