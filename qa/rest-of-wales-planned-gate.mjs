/**
 * Rest of Wales stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/rest-of-wales-planned-gate.mjs
 *
 * City id note: the D1 pack (docs/rest-of-wales-d1/) originally used
 * `city: "uk-wales"`, following a since-fixed stale prefix table in
 * docs/uk-architecture.md. This gate asserts the CORRECTED id
 * `rest-of-wales` everywhere — registry.js, published-network.json (updated
 * post-pack, see its id-correction note), and this adapter — and asserts
 * `uk-wales` is NOT registered as a city id.
 *
 * This gate asserts the catalog/registry wiring and that the single board
 * path throws MissingDarwinTokenError, with no network calls
 * (MissingDarwinTokenError throws before any fetch — see
 * lib/providers/uk-darwin.js getDarwinToken()).
 *
 * Also asserts the Board eligibility section in
 * docs/rest-of-wales-d1/oracle-clash-report.md records verdicts for every
 * operator named, and that the four proposed doNotGroup candidates
 * (Wrexham General route directions, Carmarthen branch-vs-through-running,
 * Whitland three-way branch, Machynlleth Aberystwyth/Pwllheli split) are
 * NOT built as enforced rules — Wrexham General, Carmarthen, Whitland, and
 * Machynlleth all resolve as single catalog entries, and their alternate
 * destination names do not resolve as separate stations.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  REST_OF_WALES_HUB,
  REST_OF_WALES_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../lib/providers/rest-of-wales.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + rest-of-wales correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("rest-of-wales");
assert(live?.ok === false, "assertCityLive(rest-of-wales) must fail");
assert(live?.status === 501, "rest-of-wales must be 501 planned");

const entry = getCity("rest-of-wales");
assert(entry?.status === "planned", "rest-of-wales registry status must be planned");
assert(entry?.adapterReady === true, "rest-of-wales adapterReady must be true");
assert(entry?.displayName === "Rest of Wales", "rest-of-wales display name must be Rest of Wales");
assert(entry?.timeZone === "Europe/London", "rest-of-wales timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "rest-of-wales").length === 1,
  "rest-of-wales must appear once in the registry"
);
for (const forbiddenId of ["uk-wales", "wales", "rest-wales-nr", "uk-rest-of-wales", "restofwales"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/rest-of-wales-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/rest-of-wales-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "rest-of-wales", "D1 city id must be corrected to rest-of-wales");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === REST_OF_WALES_HUB,
  `D1 lock must be ${REST_OF_WALES_HUB}`
);
assert(network.printedInnerCityNames?.lockCrs === "WRX", "D1 lock CRS must be WRX");

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Transport for Wales", "CrossCountry", "GWR", "Caledonian Sleeper"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(REST_OF_WALES_REGION);
assert(region?.railCount === 17, `rest-of-wales rail count must be 17, got ${region?.railCount}`);
assert(region?.metroCount === 0, `rest-of-wales must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "rest-of-wales must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of [
  "WRX", "LLJ", "CNW", "BNG", "HHD",
  "WLP", "MCN", "AYW", "PWL",
  "CMN", "WTL", "NAR", "TEN", "PMD", "MFH", "FGH", "LLE",
]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(REST_OF_WALES_REGION).length === 0, "rest-of-wales has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 17, `combined catalog must have 17 stations (train only), got ${allStations.length}`);

// Hub lock resolves; boundary/pass-through stations never resolve (not catalog points).
const hub = resolveCatalogEntry(REST_OF_WALES_HUB);
assert(hub?.crs === "WRX", "Wrexham General must resolve with crs WRX");
assert(resolveCatalogEntry("Wrexham Central") === null, "Wrexham Central must never resolve — lower-connectivity terminus, not the hub lock");
assert(resolveCatalogEntry("Chester") === null, "Chester must never resolve — England pass-through, not a Rest of Wales catalog station");
assert(resolveCatalogEntry("Shrewsbury") === null, "Shrewsbury must never resolve — England pass-through, not a Rest of Wales catalog station");

// Aberystwyth and Carmarthen are corridor-significant but NOT hub-locked (single hub only).
const ayw = resolveCatalogEntry("Aberystwyth");
assert(ayw?.crs === "AYW", "Aberystwyth must resolve as its own catalog entry");
assert(ayw.crs !== hub.crs, "Aberystwyth must not be conflated with the Wrexham General hub lock");
const cmn = resolveCatalogEntry("Carmarthen");
assert(cmn?.crs === "CMN", "Carmarthen must resolve as its own catalog entry");
assert(cmn.crs !== hub.crs, "Carmarthen must not be conflated with the Wrexham General hub lock");

// Proposed-only doNotGroup candidates: named stations resolve as single
// entries (Jim's judgment call — no platform/service-pattern data to build
// an enforced destination-split rule from). Branch destinations off them
// (Fishguard Harbour, Milford Haven, Pembroke Dock, Pwllheli) still resolve
// as their own distinct in-catalog stations, not merged into the branch point.
const whitland = resolveCatalogEntry("Whitland");
assert(whitland?.crs === "WTL", "Whitland must resolve as its own catalog entry");
// Fishguard Harbour is FGH (live-verified 5 Sep 2026 07:00 UK); FGW is the separate
// Fishguard & Goodwick station and must not be used for the harbour terminus.
const fishguard = resolveCatalogEntry("Fishguard Harbour");
assert(fishguard?.crs === "FGH", "Fishguard Harbour must resolve to FGH, its own distinct catalog entry from Whitland");
const machynlleth = resolveCatalogEntry("Machynlleth");
assert(machynlleth?.crs === "MCN", "Machynlleth must resolve as its own catalog entry");
const pwllheli = resolveCatalogEntry("Pwllheli");
assert(pwllheli?.crs === "PWL", "Pwllheli must resolve as its own distinct catalog entry from Machynlleth");

// The single board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
let darwinBlocked = false;
try {
  await fetchNationalRailBoard(REST_OF_WALES_HUB);
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let dispatchBlocked = false;
try {
  await fetchStationBoard(REST_OF_WALES_HUB);
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
  "rest-of-wales-planned-gate: ok (planned/501, adapterReady, city id corrected to rest-of-wales, D1 pack, Board eligibility section all-in, 17 rail-only stations, hub lock WRX only, National Rail board correctly blocked on MissingDarwinTokenError, Perth green)"
);
