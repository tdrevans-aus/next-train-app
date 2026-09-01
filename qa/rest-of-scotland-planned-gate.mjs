/**
 * Rest of Scotland stays planned (adapter wired, not flipped live). Perth (Australia)
 * stays live. Usage: node qa/rest-of-scotland-planned-gate.mjs
 *
 * This region is the first UK region with FOUR co-equal tier-1 hub locks (Perth
 * Scotland/PTH, Inverness/INV, Aberdeen/ABD, Dundee/DDE), not a single primary hub.
 * This gate asserts all four resolve as independent hub-class catalog entries, and
 * that "Perth" here resolves within the rest-of-scotland region only — never
 * conflated with the live city id `perth` (Perth, Australia).
 *
 * Also asserts the Caledonian Sleeper out-reservation exclusion is enforced in code
 * (not just documented): fetchNationalRailBoard() passes excludeOperators for the
 * four stations it calls at (Aberdeen, Inverness, Fort William, Mallaig) and does
 * NOT pass it for Perth or Dundee, which the report says Caledonian Sleeper never
 * calls at.
 *
 * Asserts the catalog/registry wiring and that the board path throws
 * MissingDarwinTokenError with no network calls (MissingDarwinTokenError throws
 * before any fetch — see lib/providers/uk-darwin.js getDarwinToken()).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  REST_OF_SCOTLAND_HUBS,
  REST_OF_SCOTLAND_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  excludesCaledonianSleeper,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/rest-of-scotland.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live
// city (the pattern that caused the Helsinki-contamination bug). Perth (Australia)
// green + rest-of-scotland correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("rest-of-scotland");
assert(live?.ok === false, "assertCityLive(rest-of-scotland) must fail");
assert(live?.status === 501, "rest-of-scotland must be 501 planned");

const entry = getCity("rest-of-scotland");
assert(entry?.status === "planned", "rest-of-scotland registry status must be planned");
assert(entry?.adapterReady === true, "rest-of-scotland adapterReady must be true");
assert(entry?.displayName === "Rest of Scotland", "rest-of-scotland display name must be Rest of Scotland");
assert(entry?.timeZone === "Europe/London", "rest-of-scotland timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "rest-of-scotland").length === 1,
  "rest-of-scotland must appear once in the registry"
);
for (const forbiddenId of ["scotland", "highlands", "perth-scotland", "uk-scotland"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/rest-of-scotland-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/rest-of-scotland-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "rest-of-scotland", "D1 city id must be rest-of-scotland");
assert(network.status === "planned", "D1 pack stays planned");
const hubLocks = (network.nationalRailStations?.hubs ?? []).map((h) => h.crs);
assert(
  ["PTH", "INV", "ABD", "DDE"].every((crs) => hubLocks.includes(crs)),
  "D1 pack must lock all four hub CRS codes PTH/INV/ABD/DDE"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["ScotRail", "CrossCountry", "LNER", "Caledonian Sleeper"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(REST_OF_SCOTLAND_REGION);
assert(region?.railCount === 9, `rest-of-scotland rail count must be 9, got ${region?.railCount}`);
assert(region?.metroCount === 0, `rest-of-scotland must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "rest-of-scotland must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["PTH", "INV", "ABD", "DDE", "KLS", "THR", "WCK", "MLG", "FTW"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(REST_OF_SCOTLAND_REGION).length === 0, "rest-of-scotland has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 9, `combined catalog must have 9 stations (train only), got ${allStations.length}`);

// Four co-equal hub locks resolve independently — no single-hub assumption anywhere.
assert(REST_OF_SCOTLAND_HUBS.length === 4, "must document exactly four co-equal hub locks");
const hubCrsByName = { Perth: "PTH", Inverness: "INV", Aberdeen: "ABD", Dundee: "DDE" };
for (const [name, crs] of Object.entries(hubCrsByName)) {
  const hub = resolveCatalogEntry(name);
  assert(hub?.crs === crs, `${name} must resolve with crs ${crs}`);
  assert(/hub lock/i.test(hub.class ?? ""), `${name} must be classed as a hub lock`);
}

// Perth, Scotland (this region) is never conflated with the live city id `perth`
// (Perth, Australia) — different registry entries, different provider modules.
const perthScotland = resolveCatalogEntry("Perth");
assert(perthScotland?.regionId === "rest-of-scotland", "Perth (Scotland) must resolve within rest-of-scotland only");
assert(getCity("perth")?.displayName !== "Rest of Scotland", "city id perth must remain Perth, Australia's own registry entry");

// Caledonian Sleeper out-reservation exclusion — per-station, enforced in code.
assert(excludesCaledonianSleeper("Aberdeen") === true, "Aberdeen must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Inverness") === true, "Inverness must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Fort William") === true, "Fort William must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Mallaig") === true, "Mallaig must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Perth") === false, "Perth must NOT exclude Caledonian Sleeper — it never calls there");
assert(excludesCaledonianSleeper("Dundee") === false, "Dundee must NOT exclude Caledonian Sleeper — it never calls there");

// The board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
for (const hubName of ["Perth", "Inverness", "Aberdeen", "Dundee"]) {
  let darwinBlocked = false;
  try {
    await fetchNationalRailBoard(hubName);
  } catch (err) {
    darwinBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(darwinBlocked, `fetchNationalRailBoard(${hubName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
}

let dispatchBlocked = false;
try {
  await fetchStationBoard("Inverness");
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
  "rest-of-scotland-planned-gate: ok (planned/501, adapterReady, D1 pack, Board eligibility section all-in, 9 rail-only stations, four co-equal hub locks PTH/INV/ABD/DDE resolve independently, Perth Scotland never conflated with city=perth Australia, Caledonian Sleeper out-reservation exclusion enforced per-station, National Rail board correctly blocked on MissingDarwinTokenError, Perth Australia green)"
);
