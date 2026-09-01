/**
 * Edinburgh stays planned (adapter wired, not flipped live). Perth (Australia)
 * stays live. Usage: node qa/edinburgh-planned-gate.mjs
 *
 * Single National Rail hub-lock (Edinburgh Waverley) with two through-running
 * satellite stations (Haymarket, Slateford) — STRUCTURALLY DIFFERENT from
 * Glasgow's two independent termini ("Option A at n=2"). Plus Edinburgh Trams
 * T50, a conventional point-to-point line with two confirmed termini
 * (Newhaven, Edinburgh Airport) — the standard line+terminus model, NOT
 * Glasgow Subway's closed-loop Outer/Inner Circle model. Asserts the
 * doNotGroup pairs, the Caledonian Sleeper exclusion at Edinburgh Waverley
 * only, the Falkirk High / Edinburgh Park exclusions, the Trams direction
 * model, and that both board paths throw structural errors with no network
 * calls.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  EDINBURGH_REGION,
  EDINBURGH_NATIONAL_RAIL_HUB,
  EDINBURGH_NATIONAL_RAIL_SATELLITES,
  TRAM_TERMINI,
  TRAM_DIRECTIONS,
  TRAM_STATIONS,
  TRAM_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  resolveCatalogEntry,
  listCatalogStations,
  listTramStops,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchTramStopBoard,
  fetchStationBoard,
  marketingLabelsForStation,
  mapTramDestination,
  isTramStation,
  isForbiddenCollapseName,
  MissingDarwinTokenError,
  EdinburghTramsFeedUnverifiedError,
} from "../lib/providers/edinburgh.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city. Perth (Australia) green + edinburgh correctly wired as planned
// is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("edinburgh");
assert(live?.ok === false, "assertCityLive(edinburgh) must fail");
assert(live?.status === 501, "edinburgh must be 501 planned");

const entry = getCity("edinburgh");
assert(entry?.status === "planned", "edinburgh registry status must be planned");
assert(entry?.adapterReady === true, "edinburgh adapterReady must be true");
assert(entry?.displayName === "Edinburgh", "edinburgh display name must be Edinburgh");
assert(entry?.timeZone === "Europe/London", "edinburgh timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "edinburgh").length === 1, "edinburgh must appear once in the registry");
for (const forbiddenId of ["edinburgh-trams", "tfe", "scotland-edinburgh"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/edinburgh-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/edinburgh-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "edinburgh", "D1 city id must be edinburgh");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.lines?.[0]?.stationOrderVerified === false,
  "D1 pack must flag the Trams stop order as unverified"
);
assert(
  network.stationGroups?.find((g) => g.id === "edinburgh-waverley")?.doNotGroup === true,
  "D1 pack must flag doNotGroup at edinburgh-waverley"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(EDINBURGH_REGION);
assert(region?.railCount === 3, `edinburgh rail count must be 3, got ${region?.railCount}`);
assert(region?.metroCount === 22, `edinburgh tram count must be 22, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Edinburgh Waverley", "Haymarket", "Slateford"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
for (const crs of ["EDB", "HYM", "SLA"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(!railNames.has("Falkirk High"), "National Rail catalog must not carry Falkirk High");
assert(!railNames.has("Edinburgh Park"), "National Rail catalog must not carry Edinburgh Park (National Rail station)");
assert(
  getNotInRegion(EDINBURGH_REGION).includes("Falkirk High"),
  "Falkirk High must be recorded as a deliberate exclusion"
);
assert(
  getNotInRegion(EDINBURGH_REGION).includes("Edinburgh Park (National Rail station)"),
  "Edinburgh Park (National Rail station) must be recorded as a deliberate exclusion"
);

// Single-hub shape — one National Rail hub with two through-running satellites, NOT Glasgow's
// "Option A at n=2" two-independent-termini shape.
assert(EDINBURGH_NATIONAL_RAIL_HUB === "edinburgh-waverley", "must document a single National Rail hub");
assert(EDINBURGH_NATIONAL_RAIL_SATELLITES.length === 2, "must document exactly two through-running satellites");
const waverley = resolveCatalogEntry("Edinburgh Waverley", "train");
const haymarketRail = resolveCatalogEntry("Haymarket", "train");
const slateford = resolveCatalogEntry("Slateford", "train");
assert(waverley?.crs === "EDB", "Edinburgh Waverley must resolve with crs EDB");
assert(haymarketRail?.crs === "HYM", "Haymarket must resolve with crs HYM");
assert(slateford?.crs === "SLA", "Slateford must resolve with crs SLA");

const tramStops = listTramStops();
const tramNames = new Set(tramStops.map((s) => s.name));
for (const name of ["Newhaven", "Edinburgh Airport", "Princes Street", "Haymarket"]) {
  assert(tramNames.has(name), `Trams catalog must carry ${name}`);
}
assert(tramStops.length === 22, `Trams catalog must have exactly 22 stops, got ${tramStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 25, `combined catalog must have 25 stations (3 rail + 22 tram), got ${allStations.length}`);

// doNotGroup pairs recorded and enforced structurally (distinct catalog entries, never merged).
assert(DO_NOT_GROUP_PAIRS.length === 2, "must document two doNotGroup pairs");
const waverleyTram = resolveCatalogEntry("Edinburgh Waverley", "metro");
assert(waverleyTram === null, "Trams catalog must not carry an 'Edinburgh Waverley' stop by that exact name");
const haymarketTram = resolveCatalogEntry("Haymarket", "metro");
assert(haymarketTram?.catalogId === "tram:haymarket", "Haymarket must resolve as a Trams entry");
assert(haymarketTram?.name === haymarketRail?.name, "Haymarket tram/rail entries share a printed name but are distinct catalog rows");

// Caledonian Sleeper excluded at Edinburgh Waverley only, enforced via the shared
// excludeOperators option (not just documented).
assert(waverley?.excludeOperators?.includes("Caledonian Sleeper"), "Edinburgh Waverley catalog entry must exclude Caledonian Sleeper");
assert(
  !(haymarketRail?.excludeOperators ?? []).includes("Caledonian Sleeper"),
  "Haymarket must NOT exclude Caledonian Sleeper — it never calls there"
);
assert(
  !(slateford?.excludeOperators ?? []).includes("Caledonian Sleeper"),
  "Slateford must NOT exclude Caledonian Sleeper — it never calls there"
);

// Trams direction model — standard line+terminus, NOT Glasgow Subway's closed-loop model.
assert(TRAM_TERMINI.includes("Newhaven") && TRAM_TERMINI.includes("Edinburgh Airport"), "must use the two confirmed termini");
assert(TRAM_DIRECTIONS.includes("T50 towards Newhaven") && TRAM_DIRECTIONS.includes("T50 towards Edinburgh Airport"), "must use line+terminus labels");
assert(TRAM_STATIONS.length === 22, "TRAM_STATIONS candidate order must carry all 22 stops");
assert(TRAM_STATION_ORDER_VERIFIED === false, "Trams stop order must stay flagged unverified, not silently trusted");
assert(isTramStation("Princes Street") === true, "Princes Street must resolve as a Trams stop");
assert(isTramStation("Edinburgh Waverley") === false, "Edinburgh Waverley (National Rail) must not resolve as a Trams stop");

const princesStreetLabels = marketingLabelsForStation("Princes Street");
assert(princesStreetLabels.includes("T50 towards Newhaven"), "every Trams stop must offer T50 towards Newhaven");
assert(princesStreetLabels.includes("T50 towards Edinburgh Airport"), "every Trams stop must offer T50 towards Edinburgh Airport");
assert(mapTramDestination("Newhaven") === "T50 towards Newhaven", "mapTramDestination must map a confirmed terminus");
assert(mapTramDestination("Somewhere Else") === null, "mapTramDestination must not fabricate an unconfirmed terminus");

assert(resolveCatalogEntry("trams") === null, "the marketing token 'trams' must never resolve as a station");
assert(isForbiddenCollapseName("Edinburgh Trams") === true, "'Edinburgh Trams' must never resolve as a station");

// National Rail board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch.
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Edinburgh Waverley");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

// Trams board path is structurally wired but blocked — EdinburghTramsFeedUnverifiedError, no
// network call attempted.
let tramsBlocked = false;
try {
  await fetchTramStopBoard("Princes Street");
} catch (err) {
  tramsBlocked = err instanceof EdinburghTramsFeedUnverifiedError;
}
assert(tramsBlocked, "fetchTramStopBoard must throw EdinburghTramsFeedUnverifiedError");

let dispatchThrew = false;
try {
  await fetchStationBoard("Princes Street");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Trams");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station");

console.log(
  "edinburgh-planned-gate: ok (planned/501, adapterReady, D1 pack, 3 rail + 22 Trams stations, single-hub shape distinct from Glasgow, Falkirk High + Edinburgh Park excluded, two doNotGroup pairs, Caledonian Sleeper excluded at Waverley only, Trams line+terminus direction model with stop order correctly flagged unverified, National Rail and Trams both correctly blocked, Perth Australia green)"
);
