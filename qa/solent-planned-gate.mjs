/**
 * Solent stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/solent-planned-gate.mjs
 *
 * Same Darwin-or-nothing shape as West of England — no static GTFS fallback
 * exists for National Rail Enquiries data at all. This gate asserts the
 * catalog/registry wiring, the two-hub (one with a secondary board)
 * architecture, and that the single board path throws
 * MissingDarwinTokenError, with no network calls (MissingDarwinTokenError
 * throws before any fetch — see lib/providers/uk-darwin.js getDarwinToken()).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  SOLENT_HUB,
  SOLENT_EAST_HUB,
  SOLENT_EAST_SECONDARY_HUB,
  SOLENT_REGION,
  SOLENT_STATION_GROUPS,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/solent.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + solent correctly wired as
// planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("solent");
assert(live?.ok === false, "assertCityLive(solent) must fail");
assert(live?.status === 501, "solent must be 501 planned");

const entry = getCity("solent");
assert(entry?.status === "planned", "solent registry status must be planned");
assert(entry?.adapterReady === true, "solent adapterReady must be true");
assert(
  entry?.displayName === "Solent (Southampton / Portsmouth)",
  "solent display name must be Solent (Southampton / Portsmouth)"
);
assert(entry?.timeZone === "Europe/London", "solent timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "solent").length === 1, "solent must appear once in the registry");
for (const forbiddenId of ["southampton", "portsmouth", "greater-solent"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/solent-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/solent-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "solent", "D1 city id is solent");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.stationGroups?.map((g) => g.id).join(",") === SOLENT_STATION_GROUPS.join(","),
  "D1 stationGroups must be southampton-central, portsmouth-harbour, portsmouth-southsea in that order"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOLENT_REGION);
assert(region?.railCount === 7, `solent rail count must be 7, got ${region?.railCount}`);
assert(region?.metroCount === 0, `solent must have no metro stations, got ${region?.metroCount}`);
assert((region?.modes ?? []).join(",") === "train", "solent must be train-only in regions.json");

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["SOU", "PMH", "PMS", "FRM", "ESL", "WSB", "WAT"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(SOLENT_REGION).length === 0, "solent has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 7, `combined catalog must have 7 stations (train only), got ${allStations.length}`);

// Two-hub, hub+secondary architecture — three independent catalog resolutions, no doNotGroup merge.
const west = resolveCatalogEntry(SOLENT_HUB);
assert(west?.crs === "SOU", "Southampton Central must resolve with crs SOU");
const east = resolveCatalogEntry(SOLENT_EAST_HUB);
assert(east?.crs === "PMH", "Portsmouth Harbour must resolve with crs PMH");
const eastSecondary = resolveCatalogEntry(SOLENT_EAST_SECONDARY_HUB);
assert(eastSecondary?.crs === "PMS", "Portsmouth & Southsea must resolve with crs PMS");
assert(resolveCatalogEntry("Southampton") === null, "the marketing token 'Southampton' must never resolve as a station");
assert(resolveCatalogEntry("Portsmouth") === null, "the marketing token 'Portsmouth' must never resolve as a station");

// The single board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
for (const hub of [SOLENT_HUB, SOLENT_EAST_HUB, SOLENT_EAST_SECONDARY_HUB]) {
  let darwinBlocked = false;
  try {
    await fetchNationalRailBoard(hub);
  } catch (err) {
    darwinBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(darwinBlocked, `fetchNationalRailBoard(${hub}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
}

let dispatchBlocked = false;
try {
  await fetchStationBoard(SOLENT_HUB);
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
  "solent-planned-gate: ok (planned/501, adapterReady, D1 pack, 7 rail-only stations, two-hub + hub-secondary architecture with no doNotGroup at SOU/PMH/PMS, boundary/junction stations catalogued flat, National Rail board correctly blocked on MissingDarwinTokenError with no GTFS fallback, Perth green)"
);
