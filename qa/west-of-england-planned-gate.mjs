/**
 * West of England stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/west-of-england-planned-gate.mjs
 *
 * Unlike every other National Rail region packed so far, West of England has
 * no static GTFS fallback at all — National Rail Enquiries does not publish
 * static GTFS anywhere, so this region is genuinely Darwin-or-nothing until
 * DARWIN_LDB_TOKEN exists. This gate asserts the catalog/registry wiring and
 * that the single board path throws MissingDarwinTokenError, with no network
 * calls (MissingDarwinTokenError throws before any fetch — see
 * lib/providers/uk-darwin.js getDarwinToken()).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  WEST_OF_ENGLAND_HUB,
  WEST_OF_ENGLAND_SECONDARY_HUB,
  WEST_OF_ENGLAND_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/west-of-england.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + west-of-england correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("west-of-england");
assert(live?.ok === false, "assertCityLive(west-of-england) must fail");
assert(live?.status === 501, "west-of-england must be 501 planned");

const entry = getCity("west-of-england");
assert(entry?.status === "planned", "west-of-england registry status must be planned");
assert(entry?.adapterReady === true, "west-of-england adapterReady must be true");
assert(entry?.displayName === "West of England", "west-of-england display name must be West of England");
assert(entry?.timeZone === "Europe/London", "west-of-england timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "west-of-england").length === 1,
  "west-of-england must appear once in the registry"
);
for (const forbiddenId of ["woe", "bristol", "bath", "greater-bristol"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/west-of-england-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/west-of-england-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "west-of-england", "D1 city id is west-of-england");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === WEST_OF_ENGLAND_HUB,
  `D1 lock must be ${WEST_OF_ENGLAND_HUB}`
);
assert(
  network.printedInnerCityNames?.secondary === WEST_OF_ENGLAND_SECONDARY_HUB,
  `D1 secondary must be ${WEST_OF_ENGLAND_SECONDARY_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(WEST_OF_ENGLAND_REGION);
assert(region?.railCount === 6, `west-of-england rail count must be 6, got ${region?.railCount}`);
assert(region?.metroCount === 0, `west-of-england must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "west-of-england must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["BRI", "BTH", "CPW", "GCR", "WSB", "TAU"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(WEST_OF_ENGLAND_REGION).length === 0, "west-of-england has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 6, `combined catalog must have 6 stations (train only), got ${allStations.length}`);

// No doNotGroup — hub and secondary hub each resolve to a single catalog entry.
const hub = resolveCatalogEntry(WEST_OF_ENGLAND_HUB);
assert(hub?.crs === "BRI", "Bristol Temple Meads must resolve with crs BRI");
const secondary = resolveCatalogEntry(WEST_OF_ENGLAND_SECONDARY_HUB);
assert(secondary?.crs === "BTH", "Bath Spa must resolve with crs BTH");
assert(resolveCatalogEntry("Bristol") === null, "the marketing token 'Bristol' must never resolve as a station");
assert(resolveCatalogEntry("Bath") === null, "the marketing token 'Bath' must never resolve as a station");

// The single board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
let darwinBlocked = false;
try {
  await fetchNationalRailBoard(WEST_OF_ENGLAND_HUB);
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let dispatchBlocked = false;
try {
  await fetchStationBoard(WEST_OF_ENGLAND_HUB);
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
  "west-of-england-planned-gate: ok (planned/501, adapterReady, D1 pack, 6 rail-only stations, no doNotGroup at BRI/BTH, boundary through-running stations catalogued flat, National Rail board correctly blocked on MissingDarwinTokenError with no GTFS fallback, Perth green)"
);
