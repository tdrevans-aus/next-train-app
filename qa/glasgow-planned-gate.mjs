/**
 * Glasgow stays planned (adapter wired, not flipped live). Perth (Australia)
 * stays live. Usage: node qa/glasgow-planned-gate.mjs
 *
 * Two independent networks under one city id: Glasgow Subway (SPT, hub-locked
 * closed loop, no termini — first of this shape in the pipeline) and National
 * Rail at two independent, non-hub-locked termini (Glasgow Central, Glasgow
 * Queen Street — "Option A at n=2"). Asserts the doNotGroup pairs, the
 * Caledonian Sleeper exclusion at Glasgow Central only, the Falkirk High
 * exclusion, the Subway direction model (Outer/Inner Circle, no station
 * order required), and that both board paths throw structural errors with no
 * network calls.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  GLASGOW_REGION,
  GLASGOW_NATIONAL_RAIL_GROUPS,
  SUBWAY_HUB,
  SUBWAY_DIRECTIONS,
  SUBWAY_STATIONS,
  SUBWAY_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  resolveCatalogEntry,
  listCatalogStations,
  listSubwayStops,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchSubwayStopBoard,
  fetchStationBoard,
  marketingLabelsForStation,
  mapSubwayDestination,
  isSubwayStation,
  isForbiddenCollapseName,
  MissingDarwinTokenError,
  GlasgowSubwayFeedUnverifiedError,
} from "../lib/providers/glasgow.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city. Perth (Australia) green + glasgow correctly wired as planned is
// enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("glasgow");
assert(live?.ok === false, "assertCityLive(glasgow) must fail");
assert(live?.status === 501, "glasgow must be 501 planned");

const entry = getCity("glasgow");
assert(entry?.status === "planned", "glasgow registry status must be planned");
assert(entry?.adapterReady === true, "glasgow adapterReady must be true");
assert(entry?.displayName === "Glasgow", "glasgow display name must be Glasgow");
assert(entry?.timeZone === "Europe/London", "glasgow timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "glasgow").length === 1, "glasgow must appear once in the registry");
for (const forbiddenId of ["glasgow-subway", "spt", "scotland-glasgow"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/glasgow-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/glasgow-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "glasgow", "D1 city id must be glasgow");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.lines?.[0]?.stationOrderVerified === false,
  "D1 pack must flag the Subway stop order as unverified"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(GLASGOW_REGION);
assert(region?.railCount === 2, `glasgow rail count must be 2, got ${region?.railCount}`);
assert(region?.metroCount === 15, `glasgow metro count must be 15, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Glasgow Central", "Glasgow Queen Street"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("GLC"), "National Rail catalog must carry GLC");
assert(railCrs.has("GLQ"), "National Rail catalog must carry GLQ");
assert(!railNames.has("Falkirk High"), "National Rail catalog must not carry Falkirk High (Edinburgh's territory)");
assert(
  getNotInRegion(GLASGOW_REGION).includes("Falkirk High"),
  "Falkirk High must be recorded as a deliberate exclusion"
);

const subwayStops = listSubwayStops();
const subwayNames = new Set(subwayStops.map((s) => s.name));
for (const name of ["Buchanan Street", "St Enoch", "Partick", "Govan"]) {
  assert(subwayNames.has(name), `Subway catalog must carry ${name}`);
}
assert(subwayStops.length === 15, `Subway catalog must have exactly 15 stops, got ${subwayStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 17, `combined catalog must have 17 stations (2 rail + 15 metro), got ${allStations.length}`);

// "Option A at n=2" — two independent National Rail groups, neither hub-locked to the other
// or to the Subway.
assert(GLASGOW_NATIONAL_RAIL_GROUPS.length === 2, "must document exactly two National Rail groups");
const central = resolveCatalogEntry("Glasgow Central", "train");
const queenStreet = resolveCatalogEntry("Glasgow Queen Street", "train");
assert(central?.crs === "GLC", "Glasgow Central must resolve with crs GLC");
assert(queenStreet?.crs === "GLQ", "Glasgow Queen Street must resolve with crs GLQ");

// doNotGroup pairs recorded and enforced structurally (distinct catalog entries, never merged).
assert(DO_NOT_GROUP_PAIRS.length === 3, "must document three doNotGroup pairs");
const buchananStreet = resolveCatalogEntry("Buchanan Street", "metro");
assert(buchananStreet?.catalogId === "subway:buchanan-street", "Buchanan Street must resolve as the Subway hub entry");
assert(buchananStreet?.name !== queenStreet?.name, "Buchanan Street and Glasgow Queen Street must be distinct catalog entries");
const stEnoch = resolveCatalogEntry("St Enoch", "metro");
assert(stEnoch?.catalogId === "subway:st-enoch", "St Enoch must resolve as a Subway entry");
assert(stEnoch?.name !== central?.name, "St Enoch and Glasgow Central must be distinct catalog entries");

// Caledonian Sleeper excluded at Glasgow Central only, enforced via the shared excludeOperators
// option (not just documented).
assert(central?.excludeOperators?.includes("Caledonian Sleeper"), "Glasgow Central catalog entry must exclude Caledonian Sleeper");
assert(
  !(queenStreet?.excludeOperators ?? []).includes("Caledonian Sleeper"),
  "Glasgow Queen Street must NOT exclude Caledonian Sleeper — it never calls there"
);

// Subway direction model — printed Outer/Inner Circle labels, no station-order dependency.
assert(SUBWAY_HUB === "Buchanan Street", "Subway hub must be Buchanan Street");
assert(SUBWAY_DIRECTIONS.includes("Outer Circle") && SUBWAY_DIRECTIONS.includes("Inner Circle"), "must use printed Outer/Inner Circle labels, not an invented terminus");
assert(SUBWAY_STATIONS.length === 15, "SUBWAY_STATIONS candidate order must carry all 15 stations");
assert(SUBWAY_STATION_ORDER_VERIFIED === false, "Subway stop order must stay flagged unverified, not silently trusted");
assert(isSubwayStation("Hillhead") === true, "Hillhead must resolve as a Subway station");
assert(isSubwayStation("Glasgow Central") === false, "Glasgow Central must not resolve as a Subway station");

const hillheadLabels = marketingLabelsForStation("Hillhead");
assert(hillheadLabels.includes("Subway + Outer Circle"), "every Subway station must offer Subway + Outer Circle");
assert(hillheadLabels.includes("Subway + Inner Circle"), "every Subway station must offer Subway + Inner Circle");
assert(mapSubwayDestination("Outer Circle") === "Subway + Outer Circle", "mapSubwayDestination must map a confirmed direction label");
assert(mapSubwayDestination("Towards Govan") === null, "mapSubwayDestination must not fabricate a terminus-based label");

assert(resolveCatalogEntry("subway") === null, "the marketing token 'subway' must never resolve as a station");
assert(isForbiddenCollapseName("Glasgow Subway") === true, "'Glasgow Subway' must never resolve as a station");

// National Rail board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch.
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Glasgow Central");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

// Subway board path is structurally wired but blocked — GlasgowSubwayFeedUnverifiedError, no
// network call attempted.
let subwayBlocked = false;
try {
  await fetchSubwayStopBoard("Buchanan Street");
} catch (err) {
  subwayBlocked = err instanceof GlasgowSubwayFeedUnverifiedError;
}
assert(subwayBlocked, "fetchSubwayStopBoard must throw GlasgowSubwayFeedUnverifiedError");

let dispatchThrew = false;
try {
  await fetchStationBoard("Buchanan Street");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Subway");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station");

console.log(
  "glasgow-planned-gate: ok (planned/501, adapterReady, D1 pack, 2 rail + 15 Subway stations, Falkirk High excluded, three doNotGroup pairs distinct, Caledonian Sleeper excluded at Central only, Subway Outer/Inner Circle direction model with stop order correctly flagged unverified, National Rail and Subway both correctly blocked, Perth Australia green)"
);
