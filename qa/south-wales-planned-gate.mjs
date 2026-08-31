/**
 * South Wales stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/south-wales-planned-gate.mjs
 *
 * National Rail here has a reference static GTFS dump (Transitland) but it
 * is not used as a board fallback — same Darwin-or-nothing shape as West of
 * England for consistency across the National Rail wave. This gate asserts
 * the catalog/registry wiring and that the single board path throws
 * MissingDarwinTokenError, with no network calls (MissingDarwinTokenError
 * throws before any fetch — see lib/providers/uk-darwin.js getDarwinToken()).
 *
 * Also asserts Transport for Wales Valley Lines is NOT wired in any form —
 * no feed exists for it (a genuine gap, not the account-level Darwin
 * block), per docs/south-wales-d1/jim-handoff.md.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  SOUTH_WALES_HUB,
  SOUTH_WALES_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/south-wales.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + south-wales correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("south-wales");
assert(live?.ok === false, "assertCityLive(south-wales) must fail");
assert(live?.status === 501, "south-wales must be 501 planned");

const entry = getCity("south-wales");
assert(entry?.status === "planned", "south-wales registry status must be planned");
assert(entry?.adapterReady === true, "south-wales adapterReady must be true");
assert(entry?.displayName === "South Wales", "south-wales display name must be South Wales");
assert(entry?.timeZone === "Europe/London", "south-wales timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "south-wales").length === 1,
  "south-wales must appear once in the registry"
);
for (const forbiddenId of ["southwales", "cardiff", "valley-lines", "valleylines", "wales"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/south-wales-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/south-wales-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "south-wales", "D1 city id is south-wales");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === SOUTH_WALES_HUB,
  `D1 lock must be ${SOUTH_WALES_HUB}`
);
assert(network.printedInnerCityNames?.lockCrs === "CDF", "D1 lock CRS must be CDF");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOUTH_WALES_REGION);
assert(region?.railCount === 2, `south-wales rail count must be 2, got ${region?.railCount}`);
assert(region?.metroCount === 0, `south-wales must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "south-wales must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["CDF", "STJ"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(SOUTH_WALES_REGION).length === 0, "south-wales has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 2, `combined catalog must have 2 stations (train only), got ${allStations.length}`);

// No doNotGroup — hub resolves to a single catalog entry.
const hub = resolveCatalogEntry(SOUTH_WALES_HUB);
assert(hub?.crs === "CDF", "Cardiff Central must resolve with crs CDF");
assert(resolveCatalogEntry("Cardiff") === null, "the marketing token 'Cardiff' must never resolve as a station");
assert(resolveCatalogEntry("Cardiff Queen Street") === null, "Cardiff Queen Street must never resolve — it is a different, unbuilt Valley Lines station");
assert(resolveCatalogEntry("Cardiff Bay") === null, "Cardiff Bay must never resolve — it is a different, unbuilt Valley Lines station");

// Transport for Wales Valley Lines must not be wired in any form.
assert(
  network.transportForWalesValleyLines?.status === "not built",
  "D1 pack must record Valley Lines as not built"
);
assert(
  typeof resolveCatalogEntry === "function" && resolveCatalogEntry("Pontypridd") === null,
  "Pontypridd (Valley Lines) must not resolve — no Valley Lines feed exists"
);

// The single board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
let darwinBlocked = false;
try {
  await fetchNationalRailBoard(SOUTH_WALES_HUB);
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let dispatchBlocked = false;
try {
  await fetchStationBoard(SOUTH_WALES_HUB);
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
  "south-wales-planned-gate: ok (planned/501, adapterReady, D1 pack, 2 rail-only stations, no doNotGroup at CDF, Valley Lines not wired, National Rail board correctly blocked on MissingDarwinTokenError, Perth green)"
);
