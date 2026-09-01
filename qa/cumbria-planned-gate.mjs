/**
 * Cumbria stays planned (adapter wired, not flipped live). Perth (Australia)
 * stays live. Usage: node qa/cumbria-planned-gate.mjs
 *
 * This region is the simplest UK station-graph shape this wave: ONE tier-1
 * hub lock (Carlisle/CAR) plus TWO tier-2 secondary hubs (Oxenholme Lake
 * District/OXO, Barrow-in-Furness/BIF), contrast Rest of Scotland's four
 * co-equal hubs. This gate asserts the hub/secondary-hub ranking resolves
 * correctly and that Penrith — a major WCML station but NOT a junction —
 * stays regional, not promoted to hub.
 *
 * Also asserts the Caledonian Sleeper out-reservation exclusion is enforced
 * in code (not just documented): fetchNationalRailBoard() passes
 * excludeOperators for Carlisle only, and does NOT pass it for any other
 * Cumbrian station, which the report says Caledonian Sleeper never calls at.
 *
 * Asserts the catalog/registry wiring and that the board path throws
 * MissingDarwinTokenError with no network calls (MissingDarwinTokenError
 * throws before any fetch — see lib/providers/uk-darwin.js getDarwinToken()).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  CUMBRIA_HUB,
  CUMBRIA_SECONDARY_HUBS,
  CUMBRIA_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  excludesCaledonianSleeper,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/cumbria.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live
// city (the pattern that caused the Helsinki-contamination bug). Perth (Australia)
// green + cumbria correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("cumbria");
assert(live?.ok === false, "assertCityLive(cumbria) must fail");
assert(live?.status === 501, "cumbria must be 501 planned");

const entry = getCity("cumbria");
assert(entry?.status === "planned", "cumbria registry status must be planned");
assert(entry?.adapterReady === true, "cumbria adapterReady must be true");
assert(entry?.displayName === "Cumbria", "cumbria display name must be Cumbria");
assert(entry?.timeZone === "Europe/London", "cumbria timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "cumbria").length === 1,
  "cumbria must appear once in the registry"
);
for (const forbiddenId of ["cumbria-lakes", "carlisle", "lake-district", "uk-cumbria"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/cumbria-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/cumbria-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "cumbria", "D1 city id must be cumbria");
assert(network.status === "planned", "D1 pack stays planned");
const hubGroup = (network.stationGroups ?? []).find((g) => g.crs === "CAR");
assert(hubGroup && /tier 1/i.test(hubGroup.role ?? ""), "D1 pack must lock Carlisle (CAR) as the tier-1 hub");
const secondaryHubCrs = (network.stationGroups ?? [])
  .filter((g) => /tier 2/i.test(g.role ?? ""))
  .map((g) => g.crs);
assert(
  ["OXO", "BIF"].every((crs) => secondaryHubCrs.includes(crs)),
  "D1 pack must lock Oxenholme (OXO) and Barrow-in-Furness (BIF) as tier-2 secondary hubs"
);
const penrithGroup = (network.stationGroups ?? []).find((g) => g.crs === "PEN");
assert(
  penrithGroup && !/hub lock/i.test(penrithGroup.role ?? ""),
  "Penrith must stay regional (not promoted to hub) — it is a major WCML station but not a junction"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Northern Trains", "TransPennine Express", "Avanti West Coast", "Caledonian Sleeper"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(CUMBRIA_REGION);
assert(region?.railCount === 7, `cumbria rail count must be 7, got ${region?.railCount}`);
assert(region?.metroCount === 0, `cumbria must have no metro stations, got ${region?.metroCount}`);
assert((region?.modes ?? []).join(",") === "train", "cumbria must be train-only in regions.json");

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["CAR", "OXO", "BIF", "PEN", "WND", "KND", "SLF"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(CUMBRIA_REGION).length === 0, "cumbria has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 7, `combined catalog must have 7 stations (train only), got ${allStations.length}`);

// Single tier-1 hub, two tier-2 secondary hubs — resolve independently.
assert(CUMBRIA_HUB === "Carlisle", "must document Carlisle as the sole tier-1 hub");
assert(CUMBRIA_SECONDARY_HUBS.length === 2, "must document exactly two tier-2 secondary hubs");

const carlisle = resolveCatalogEntry("Carlisle");
assert(carlisle?.crs === "CAR", "Carlisle must resolve with crs CAR");
assert(/hub lock — tier 1/i.test(carlisle.class ?? ""), "Carlisle must be classed as the tier-1 hub lock");

const secondaryHubCrsByName = { "Oxenholme Lake District": "OXO", "Barrow-in-Furness": "BIF" };
for (const [name, crs] of Object.entries(secondaryHubCrsByName)) {
  const hub = resolveCatalogEntry(name);
  assert(hub?.crs === crs, `${name} must resolve with crs ${crs}`);
  assert(/hub lock — tier 2/i.test(hub.class ?? ""), `${name} must be classed as a tier-2 hub lock`);
}

// Penrith must stay regional, never a hub-classed entry.
const penrith = resolveCatalogEntry("Penrith");
assert(penrith?.crs === "PEN", "Penrith must resolve with crs PEN");
assert(!/hub lock/i.test(penrith.class ?? ""), "Penrith must NOT be classed as a hub lock");

// Caledonian Sleeper out-reservation exclusion — per-station, enforced in code.
assert(excludesCaledonianSleeper("Carlisle") === true, "Carlisle must exclude Caledonian Sleeper");
for (const other of ["Oxenholme Lake District", "Barrow-in-Furness", "Penrith", "Windermere", "Kendal", "Settle"]) {
  assert(
    excludesCaledonianSleeper(other) === false,
    `${other} must NOT exclude Caledonian Sleeper — it never calls there`
  );
}

// The board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
for (const stationName of ["Carlisle", "Oxenholme Lake District", "Barrow-in-Furness", "Penrith"]) {
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
  await fetchStationBoard("Carlisle");
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
  "cumbria-planned-gate: ok (planned/501, adapterReady, D1 pack, Board eligibility section all-in, 7 rail-only stations, single tier-1 hub Carlisle + two tier-2 secondary hubs Oxenholme/Barrow-in-Furness, Penrith correctly stays regional, Caledonian Sleeper out-reservation exclusion enforced at Carlisle only, National Rail board correctly blocked on MissingDarwinTokenError, Perth Australia green)"
);
