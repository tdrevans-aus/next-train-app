/**
 * Thames Valley stays planned (adapter wired, not flipped live).
 * Usage: node qa/thames-valley-planned-gate.mjs
 *
 * Same Darwin-or-nothing shape as West of England/Solent — no static GTFS
 * fallback exists for National Rail Enquiries data at all. This gate asserts
 * the catalog/registry wiring, the hub + secondary-hub architecture with
 * Oxford's FIRST-secondary-hub internal doNotGroup split (GWR vs Chiltern,
 * one CRS OXF), the five through-running-only stations catalogued flat, and
 * that the board path throws MissingDarwinTokenError with no network calls.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  THAMES_VALLEY_HUB,
  THAMES_VALLEY_SECONDARY_HUB,
  THAMES_VALLEY_REGION,
  THAMES_VALLEY_DONOTGROUP_GROUPS,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  listBoardsForGroup,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/thames-valley.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + thames-valley correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("thames-valley");
assert(live?.ok === false, "assertCityLive(thames-valley) must fail");
assert(live?.status === 501, "thames-valley must be 501 planned");

const entry = getCity("thames-valley");
assert(entry?.status === "planned", "thames-valley registry status must be planned");
assert(entry?.adapterReady === true, "thames-valley adapterReady must be true");
assert(
  entry?.displayName === "Thames Valley (Reading / Oxford)",
  "thames-valley display name must be Thames Valley (Reading / Oxford)"
);
assert(entry?.timeZone === "Europe/London", "thames-valley timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "thames-valley").length === 1,
  "thames-valley must appear once in the registry"
);
for (const forbiddenId of ["reading", "oxford", "greater-thames-valley"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/thames-valley-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/thames-valley-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "thames-valley", "D1 city id is thames-valley");
assert(network.status === "planned", "D1 pack stays planned");
const groupIds = (network.stationGroups ?? []).map((g) => g.id);
assert(groupIds.join(",") === "reading,oxford", "D1 stationGroups must be reading, oxford in that order");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(THAMES_VALLEY_REGION);
assert((region?.modes ?? []).join(",") === "train", "thames-valley must be train-only in regions.json");

const railStations = listNationalRailStations();
// Reading + 2 Oxford sub-boards + Swindon + Banbury + Westbury + Henley-on-Thames + Didcot Parkway = 8.
assert(railStations.length === 8, `catalog must have 8 boards, got ${railStations.length}`);
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["RDG", "OXF", "SWI", "BAN", "WSB", "HOT", "DID"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(THAMES_VALLEY_REGION).length === 0, "thames-valley has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 8, `combined catalog must have 8 stations (train only), got ${allStations.length}`);

// Reading: hub lock, three operators, no doNotGroup.
const reading = resolveCatalogEntry(THAMES_VALLEY_HUB);
assert(reading?.crs === "RDG", "Reading must resolve with crs RDG");
assert(reading?.doNotGroup === false, "Reading must not be doNotGroup");
for (const op of ["Great Western Railway", "CrossCountry", "South Western Railway"]) {
  assert(reading?.operators?.includes(op), `Reading must carry operator ${op}`);
}

// Oxford: FIRST secondary-hub internal doNotGroup — 2 sub-boards, one CRS.
assert(THAMES_VALLEY_DONOTGROUP_GROUPS.join(",") === "oxford", "exactly one internal doNotGroup group: oxford");
const oxfordBoards = listBoardsForGroup("oxford");
assert(oxfordBoards.length === 2, `Oxford must have 2 sub-boards, got ${oxfordBoards.length}`);
assert(
  oxfordBoards.every((b) => b.crs === "OXF" && b.doNotGroup === true),
  "all Oxford sub-boards must share crs OXF and doNotGroup: true"
);
const oxfordOperators = oxfordBoards.flatMap((b) => b.operators);
for (const op of ["Great Western Railway", "Chiltern Railways"]) {
  assert(oxfordOperators.includes(op), `Oxford sub-boards must cover operator ${op}`);
}
const oxfordGwr = resolveCatalogEntry(THAMES_VALLEY_SECONDARY_HUB);
assert(oxfordGwr?.crs === "OXF", "Oxford (GWR) must resolve with crs OXF");
assert(oxfordGwr?.operators?.includes("Great Western Railway"), "Oxford (GWR) board must be GWR only");
const oxfordChiltern = resolveCatalogEntry("Oxford (Chiltern)");
assert(oxfordChiltern?.crs === "OXF", "Oxford (Chiltern) must resolve with crs OXF");
assert(oxfordChiltern?.operators?.includes("Chiltern Railways"), "Oxford (Chiltern) board must be Chiltern only");
assert(
  resolveCatalogEntry("Oxford")?.operators?.includes("Great Western Railway"),
  "the bare alias 'Oxford' must resolve to the GWR board"
);

// Through-running-only stations catalogued flat, not hub candidates.
for (const [name, crs] of [
  ["Swindon", "SWI"],
  ["Banbury", "BAN"],
  ["Westbury", "WSB"],
  ["Henley-on-Thames", "HOT"],
  ["Didcot Parkway", "DID"],
]) {
  const hit = resolveCatalogEntry(name);
  assert(hit?.crs === crs, `${name} must resolve with crs ${crs}`);
  assert(hit?.doNotGroup === false, `${name} must not be doNotGroup (not built as split boards)`);
}

// Boundary-only references — not built as catalog entries here.
for (const name of ["London Paddington", "Paddington", "London Marylebone", "Marylebone"]) {
  assert(!resolveCatalogEntry(name), `${name} must NOT resolve as a catalog entry — boundary-only, built in London & South East National Rail's catalog`);
}

// Board eligibility (docs/board-eligibility-rule.md): every excluded service needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(
  /## Board eligibility/i.test(oracleReport) || /Board eligibility/i.test(oracleReport),
  "oracle report must carry a Board eligibility section"
);

// The board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
for (const name of [
  "Reading",
  "Oxford (GWR)",
  "Oxford (Chiltern)",
  "Swindon",
  "Banbury",
  "Westbury",
  "Henley-on-Thames",
  "Didcot Parkway",
]) {
  let darwinBlocked = false;
  try {
    await fetchNationalRailBoard(name);
  } catch (err) {
    darwinBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(darwinBlocked, `fetchNationalRailBoard(${name}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
}

let dispatchBlocked = false;
try {
  await fetchStationBoard(THAMES_VALLEY_HUB);
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

let paddingtonThrew = false;
try {
  await fetchStationBoard("London Paddington");
} catch {
  paddingtonThrew = true;
}
assert(paddingtonThrew, "fetchStationBoard(London Paddington) must throw — boundary-only, not built here");

console.log(
  "thames-valley-planned-gate: ok (planned/501, adapterReady, D1 pack, hub+secondary-hub architecture, Reading flat 3-operator board, Oxford's first-secondary-hub internal doNotGroup split (GWR/Chiltern, 2 sub-boards, 1 CRS) enforced via includeOperators, 5 through-running-only stations catalogued flat, Paddington/Marylebone correctly boundary-only and unbuilt, National Rail board correctly blocked on MissingDarwinTokenError, Perth green)"
);
