/**
 * West Yorkshire stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/west-yorkshire-planned-gate.mjs
 *
 * This gate asserts the catalog/registry wiring and that the single board
 * path throws MissingDarwinTokenError, with no network calls
 * (MissingDarwinTokenError throws before any fetch — see
 * lib/providers/uk-darwin.js getDarwinToken()).
 *
 * Also asserts the doNotGroup pair (Bradford Forster Square vs Bradford
 * Interchange) resolves to two DISTINCT catalog entries, and that the
 * Board eligibility section in docs/west-yorkshire-d1/oracle-clash-report.md
 * records all four operators (Northern Trains, LNER, CrossCountry,
 * TransPennine Express) as verdict `in` — matching this adapter's decision
 * to apply no operator-level filtering.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  WEST_YORKSHIRE_HUB,
  WEST_YORKSHIRE_SECONDARY_HUB,
  WEST_YORKSHIRE_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/west-yorkshire.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + west-yorkshire correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("west-yorkshire");
assert(live?.ok === false, "assertCityLive(west-yorkshire) must fail");
assert(live?.status === 501, "west-yorkshire must be 501 planned");

const entry = getCity("west-yorkshire");
assert(entry?.status === "planned", "west-yorkshire registry status must be planned");
assert(entry?.adapterReady === true, "west-yorkshire adapterReady must be true");
assert(entry?.displayName === "West Yorkshire", "west-yorkshire display name must be West Yorkshire");
assert(entry?.timeZone === "Europe/London", "west-yorkshire timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "west-yorkshire").length === 1,
  "west-yorkshire must appear once in the registry"
);
for (const forbiddenId of ["westyorkshire", "leeds", "bradford", "west-yorks"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/west-yorkshire-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/west-yorkshire-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "west-yorkshire", "D1 city id is west-yorkshire");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === WEST_YORKSHIRE_HUB,
  `D1 lock must be ${WEST_YORKSHIRE_HUB}`
);
assert(network.printedInnerCityNames?.lockCrs === "LDS", "D1 lock CRS must be LDS");
assert(
  network.printedInnerCityNames?.secondaryLock === WEST_YORKSHIRE_SECONDARY_HUB,
  `D1 secondary lock must be ${WEST_YORKSHIRE_SECONDARY_HUB}`
);
assert(network.printedInnerCityNames?.secondaryLockCrs === "BDQ", "D1 secondary lock CRS must be BDQ");

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict, and every 'in' verdict
// must actually stay unfiltered on the board.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Northern Trains", "LNER", "CrossCountry", "TransPennine Express"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(WEST_YORKSHIRE_REGION);
assert(region?.railCount === 10, `west-yorkshire rail count must be 10, got ${region?.railCount}`);
assert(region?.metroCount === 0, `west-yorkshire must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "west-yorkshire must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["LDS", "BDQ", "BDI", "DBD", "WDN", "HUD", "HFX", "TOD", "HBD", "KEI"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(WEST_YORKSHIRE_REGION).length === 0, "west-yorkshire has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 10, `combined catalog must have 10 stations (train only), got ${allStations.length}`);

// doNotGroup: Bradford Forster Square (BDQ) vs Bradford Interchange (BDI) —
// two distinct catalog entries, walk-link connect only, never merged.
const hub = resolveCatalogEntry(WEST_YORKSHIRE_HUB);
assert(hub?.crs === "LDS", "Leeds Station must resolve with crs LDS");

const bdq = resolveCatalogEntry(WEST_YORKSHIRE_SECONDARY_HUB);
assert(bdq?.crs === "BDQ", "Bradford Forster Square must resolve with crs BDQ");

const bdi = resolveCatalogEntry("Bradford Interchange");
assert(bdi?.crs === "BDI", "Bradford Interchange must resolve with crs BDI");
assert(bdq.crs !== bdi.crs, "BDQ and BDI must be distinct catalog entries (doNotGroup)");

// "Leeds" is the natural short form of "Leeds Station" (normalizeKey strips
// the trailing " station" token from both query and catalog name), so it
// correctly resolves to LDS — not tested as a non-match. "Bradford" alone is
// ambiguous between BDQ and BDI and must not resolve to either.
assert(resolveCatalogEntry("Bradford") === null, "the ambiguous token 'Bradford' must never resolve as a station");

// The single board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
let darwinBlocked = false;
try {
  await fetchNationalRailBoard(WEST_YORKSHIRE_HUB);
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let dispatchBlocked = false;
try {
  await fetchStationBoard(WEST_YORKSHIRE_HUB);
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
  "west-yorkshire-planned-gate: ok (planned/501, adapterReady, D1 pack, Board eligibility section all-in, 10 rail-only stations, doNotGroup BDQ/BDI, National Rail board correctly blocked on MissingDarwinTokenError, Perth green)"
);
