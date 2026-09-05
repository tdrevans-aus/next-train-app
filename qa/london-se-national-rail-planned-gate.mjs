/**
 * London & South East National Rail stays planned (adapter wired, not
 * flipped live). Usage: node qa/london-se-national-rail-planned-gate.mjs
 *
 * FIRST MULTI-GROUP UK REGION: no single hub-lock, seven independent
 * per-terminus station groups (Tim's Option A). This gate asserts:
 *  - all seven groups resolve as independent catalog entries;
 *  - the two internal-doNotGroup groups (London Bridge, Liverpool Street)
 *    each expose the correct number of per-operator sub-boards sharing one
 *    physical CRS, and that fetchNationalRailBoard() passes the new
 *    includeOperators filter (not just excludeOperators) for those boards;
 *  - the two single-exclusion groups (St Pancras International/Eurostar,
 *    Paddington/Night Riviera Sleeper) pass excludeOperators correctly and
 *    ONLY there; King's Cross no longer excludes LNER (resolved to `in`
 *    per the UK ledger, 5 Sep 2026);
 *  - Euston and the seven secondary termini are NOT registered as catalog
 *    entries (deliberately not built per the D1 pack);
 *  - the board path throws MissingDarwinTokenError with no network calls.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  LONDON_SE_NATIONAL_RAIL_REGION,
  LONDON_SE_NATIONAL_RAIL_GROUPS,
  LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  listBoardsForGroup,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/london-se-national-rail.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("london-se-national-rail");
assert(live?.ok === false, "assertCityLive(london-se-national-rail) must fail");
assert(live?.status === 501, "london-se-national-rail must be 501 planned");

const entry = getCity("london-se-national-rail");
assert(entry?.status === "planned", "registry status must be planned");
assert(entry?.adapterReady === true, "adapterReady must be true");
assert(
  entry?.displayName === "London & South East National Rail",
  "display name must be London & South East National Rail"
);
assert(entry?.timeZone === "Europe/London", "timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "london-se-national-rail").length === 1,
  "london-se-national-rail must appear once in the registry"
);
for (const forbiddenId of ["london-se", "london-national-rail", "uk-london-se", "south-east"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/london-se-national-rail-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/london-se-national-rail-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "london-se-national-rail", "D1 city id must be london-se-national-rail");
assert(network.status === "planned", "D1 pack stays planned");
const groupIds = (network.stationGroups ?? []).map((g) => g.id);
for (const groupId of LONDON_SE_NATIONAL_RAIL_GROUPS) {
  assert(groupIds.includes(groupId), `D1 pack must carry station group ${groupId}`);
}
assert(groupIds.length === 7, `D1 pack must define exactly 7 station groups, got ${groupIds.length}`);
assert(!groupIds.includes("euston"), "Euston must NOT be a built station group (no named regional operator)");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(LONDON_SE_NATIONAL_RAIL_REGION);
assert(
  (region?.modes ?? []).join(",") === "train",
  "london-se-national-rail must be train-only in regions.json"
);

const railStations = listNationalRailStations();
// 5 single-board groups + 3 London Bridge sub-boards + 2 Liverpool Street sub-boards = 10.
assert(railStations.length === 10, `catalog must have 10 boards, got ${railStations.length}`);
assert(getNotInRegion(LONDON_SE_NATIONAL_RAIL_REGION).length === 0, "no deliberate exclusions recorded in notInRegion");

const allStations = listCatalogStations();
assert(allStations.length === 10, `combined catalog must have 10 stations (train only), got ${allStations.length}`);

// All seven groups resolve independently — no single-hub assumption anywhere.
assert(LONDON_SE_NATIONAL_RAIL_GROUPS.length === 7, "must document exactly seven station groups");
const waterloo = resolveCatalogEntry("London Waterloo");
assert(waterloo?.crs === "WAT", "Waterloo must resolve with crs WAT");
assert(waterloo?.operators?.includes("South Western Railway"), "Waterloo must be SWR");

const victoria = resolveCatalogEntry("London Victoria");
assert(victoria?.crs === "VIC", "Victoria must resolve with crs VIC");
assert(
  ["Southern", "Gatwick Express"].every((op) => victoria?.operators?.includes(op)),
  "Victoria must carry Southern and Gatwick Express"
);

// Internal doNotGroup — London Bridge (3 operators, 1 CRS) and Liverpool Street (2 operators, 1 CRS).
assert(LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS.length === 2, "exactly two internal doNotGroup groups");
const londonBridgeBoards = listBoardsForGroup("london-bridge");
assert(londonBridgeBoards.length === 3, `London Bridge must have 3 sub-boards, got ${londonBridgeBoards.length}`);
assert(
  londonBridgeBoards.every((b) => b.crs === "LBG" && b.doNotGroup === true),
  "all London Bridge sub-boards must share crs LBG and doNotGroup: true"
);
const londonBridgeOperators = londonBridgeBoards.flatMap((b) => b.operators);
for (const op of ["Southeastern", "Southern", "Thameslink"]) {
  assert(londonBridgeOperators.includes(op), `London Bridge sub-boards must cover operator ${op}`);
}

const liverpoolStreetBoards = listBoardsForGroup("liverpool-street");
assert(
  liverpoolStreetBoards.length === 2,
  `Liverpool Street must have 2 sub-boards, got ${liverpoolStreetBoards.length}`
);
assert(
  liverpoolStreetBoards.every((b) => b.crs === "LST" && b.doNotGroup === true),
  "all Liverpool Street sub-boards must share crs LST and doNotGroup: true"
);
const liverpoolStreetOperators = liverpoolStreetBoards.flatMap((b) => b.operators);
for (const op of ["Greater Anglia", "c2c"]) {
  assert(liverpoolStreetOperators.includes(op), `Liverpool Street sub-boards must cover operator ${op}`);
}

// King's Cross: LNER resolved to IN per the UK ledger, 5 Sep 2026 — no
// excludeOperators anymore (previously excluded pending a verdict).
const kingsCross = resolveCatalogEntry("London King's Cross");
assert(kingsCross?.crs === "KGX", "King's Cross must resolve with crs KGX");
assert(kingsCross?.doNotGroup === false, "King's Cross must not be doNotGroup");
assert(!kingsCross?.excludeOperators?.length, "King's Cross must not exclude any operator (LNER resolved to in)");

// Single-exclusion groups: excludeOperators recorded, no doNotGroup.

const stPancras = resolveCatalogEntry("St Pancras International");
assert(stPancras?.crs === "STP", "St Pancras International must resolve with crs STP");
assert(stPancras?.excludeOperators?.includes("Eurostar"), "St Pancras International must exclude Eurostar");

const paddington = resolveCatalogEntry("London Paddington");
assert(paddington?.crs === "PAD", "Paddington must resolve with crs PAD");
assert(
  paddington?.excludeOperators?.includes("Night Riviera Sleeper"),
  "Paddington must exclude Night Riviera Sleeper"
);

// Not built: Euston and the seven secondary termini must not resolve as catalog entries.
for (const name of [
  "Euston",
  "London Euston",
  "Blackfriars",
  "Cannon Street",
  "Charing Cross",
  "Farringdon",
  "Fenchurch Street",
  "Marylebone",
  "Moorgate",
]) {
  assert(!resolveCatalogEntry(name), `${name} must NOT resolve as a catalog entry — not built in this pack`);
}

// Board eligibility (docs/board-eligibility-rule.md): every excluded service needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/i.test(oracleReport) || /Board eligibility/i.test(oracleReport),
  "oracle report must carry a Board eligibility section");

// The board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
for (const name of [
  "London Waterloo",
  "London Victoria",
  "London Bridge (Southeastern)",
  "London Bridge (Southern)",
  "London Bridge (Thameslink)",
  "Liverpool Street (Greater Anglia)",
  "Liverpool Street (c2c)",
  "London King's Cross",
  "St Pancras International",
  "London Paddington",
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
  await fetchStationBoard("London Bridge (Southeastern)");
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

let eustonThrew = false;
try {
  await fetchStationBoard("Euston");
} catch {
  eustonThrew = true;
}
assert(eustonThrew, "fetchStationBoard(Euston) must throw — Euston is not built");

console.log(
  "london-se-national-rail-planned-gate: ok (planned/501, adapterReady, D1 pack, 7 station groups / 10 boards resolve, London Bridge (3) and Liverpool Street (2) internal doNotGroup sub-boards enforced via includeOperators, St Pancras International/Paddington excludeOperators enforced, King's Cross LNER resolved to in (no excludeOperators) per the UK ledger 5 Sep 2026, Euston and secondary termini correctly unbuilt, National Rail board correctly blocked on MissingDarwinTokenError)"
);
