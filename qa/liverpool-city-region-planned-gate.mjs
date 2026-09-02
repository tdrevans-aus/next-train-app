/**
 * Liverpool City Region stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/liverpool-city-region-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  LIVERPOOL_CITY_REGION_REGION,
  LIVERPOOL_CITY_REGION_NR_HUB,
  LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB,
  LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB,
  LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB,
  resolveCatalogEntry,
  listCatalogStations,
  listMerseyrailStops,
  listNationalRailStations,
  fetchMerseyrailStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  MerseyrailFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapMerseyrailDestination,
  isForbiddenCollapseName,
} from "../lib/providers/liverpool-city-region.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city. This gate only needs to know Perth stays live and
// liverpool-city-region itself is correctly wired as planned.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("liverpool-city-region");
assert(live?.ok === false, "assertCityLive(liverpool-city-region) must fail");
assert(live?.status === 501, "liverpool-city-region must be 501 planned");

const entry = getCity("liverpool-city-region");
assert(entry?.status === "planned", "liverpool-city-region registry status must be planned");
assert(entry?.adapterReady === true, "liverpool-city-region adapterReady must be true");
assert(entry?.displayName === "Liverpool City Region", "liverpool-city-region display name must be Liverpool City Region");
assert(entry?.timeZone === "Europe/London", "liverpool-city-region timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "liverpool-city-region").length === 1,
  "liverpool-city-region must appear once in the registry"
);
for (const forbiddenId of ["liverpool", "merseyrail", "lcr", "liverpool-merseyrail"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// uk-ellesmere-port was deleted 2 Sep 2026 as a standalone region (hangover, never real);
// Ellesmere Port survives only as this catalog's own Wirral Line terminus (checked below).
assert(!getCity("uk-ellesmere-port"), "uk-ellesmere-port must no longer be registered");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/liverpool-city-region-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/liverpool-city-region-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "liverpool-city-region", "D1 city id is liverpool-city-region");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.nationalRailLock === LIVERPOOL_CITY_REGION_NR_HUB,
  `D1 National Rail lock must be ${LIVERPOOL_CITY_REGION_NR_HUB}`
);
assert(
  network.printedInnerCityNames?.nationalRailSecondaryLock === LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB,
  `D1 National Rail secondary lock must be ${LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB}`
);
assert(
  network.printedInnerCityNames?.merseyrailInterchangeA === LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB,
  `D1 Merseyrail interchange A must be ${LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB}`
);
assert(
  network.printedInnerCityNames?.merseyrailInterchangeB === LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB,
  `D1 Merseyrail interchange B must be ${LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(LIVERPOOL_CITY_REGION_REGION);
assert(region?.railCount === 2, `liverpool-city-region rail count must be 2, got ${region?.railCount}`);
assert(region?.metroCount === 4, `liverpool-city-region metro count must be 4, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Liverpool Lime Street", "Liverpool South Parkway"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("LIV"), "National Rail catalog must carry LIV");
assert(railCrs.has("LPY"), "National Rail catalog must carry LPY");

const metroStops = listMerseyrailStops();
const metroNames = metroStops.map((s) => s.name);
assert(metroNames.filter((n) => n === "Liverpool Lime Street").length === 1, "Merseyrail catalog must carry its own Liverpool Lime Street entry");
for (const name of ["Liverpool Central", "Moorfields", "Ellesmere Port"]) {
  assert(metroNames.includes(name), `Merseyrail catalog must carry ${name}`);
}
assert(metroStops.length === 4, `Merseyrail catalog must have exactly 4 stops, got ${metroStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 6, `combined catalog must have 6 stations (2 rail + 4 metro), got ${allStations.length}`);

// doNotGroup — Liverpool Lime Street resolves as two distinct catalog entries by mode (H1, unresolved structural ambiguity).
const limeStreetRail = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "train");
const limeStreetMetro = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "metro");
assert(limeStreetRail?.crs === "LIV", "Liverpool Lime Street must resolve as a National Rail entry (crs LIV)");
assert(
  limeStreetMetro?.catalogId === "merseyrail:liverpool-lime-street",
  "Liverpool Lime Street must also resolve as a distinct Merseyrail metro entry (doNotGroup, H1 unresolved)"
);

// Forbidden ambiguous marketing tokens must never resolve.
assert(resolveCatalogEntry("Liverpool") === null, "the bare token 'Liverpool' must never resolve as a station");
assert(isForbiddenCollapseName("Liverpool Station") === true, "'Liverpool Station' must never resolve as a station");
assert(isForbiddenCollapseName("Lime Street Station") === true, "'Lime Street Station' must never resolve as a station");

// Direction model — line + terminus, only for confirmed termini; interchanges get no guessed chips.
const ellesmerePortLabels = marketingLabelsForStation("Ellesmere Port");
assert(ellesmerePortLabels.includes("Wirral Line + Liverpool"), "Ellesmere Port must offer Wirral Line + Liverpool");
assert(ellesmerePortLabels.includes("Wirral Line + West Kirby"), "Ellesmere Port must offer Wirral Line + West Kirby");
assert(ellesmerePortLabels.includes("Wirral Line + Chester"), "Ellesmere Port must offer Wirral Line + Chester");
assert(
  !ellesmerePortLabels.some((label) => label.includes("+ Ellesmere Port")),
  "Ellesmere Port must never show itself as a destination"
);

const centralLabels = marketingLabelsForStation("Liverpool Central");
assert(
  centralLabels.length === 0,
  "Liverpool Central must not generate any direction chip — whether all branch destinations call there vs Moorfields is unconfirmed, per direction-model-memo.md"
);
const moorfieldsLabels = marketingLabelsForStation("Moorfields");
assert(moorfieldsLabels.length === 0, "Moorfields must not generate any direction chip — same unresolved-split reason as Liverpool Central");

assert(
  mapMerseyrailDestination("Southport", "Northern Line") === "Northern Line + Southport",
  "mapMerseyrailDestination must map a confirmed terminus"
);
assert(
  mapMerseyrailDestination("Central", "Northern Line") === null,
  "mapMerseyrailDestination must not fabricate an unconfirmed interchange chip"
);

// Both board paths are structurally wired but currently blocked — National Rail on the
// account-level Darwin token, Merseyrail on the confirmed-absent GTFS-RT feed (see file
// header of lib/providers/liverpool-city-region.js). Neither should silently return fabricated data.
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Liverpool Lime Street");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let merseyrailBlocked = false;
try {
  await fetchMerseyrailStopBoard("Liverpool Central");
} catch (err) {
  merseyrailBlocked = err instanceof MerseyrailFeedUnconfirmedError;
}
assert(
  merseyrailBlocked,
  "fetchMerseyrailStopBoard must throw MerseyrailFeedUnconfirmedError — no confirmed Merseyrail real-time feed exists"
);

let dispatchThrew = false;
try {
  await fetchStationBoard("Liverpool Central");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Merseyrail");

console.log(
  "liverpool-city-region-planned-gate: ok (planned/501, adapterReady, D1 pack, 2 rail + 4 Merseyrail stations, doNotGroup at Liverpool Lime Street (H1 unresolved), uk-ellesmere-port deleted, line+terminus direction model with unconfirmed interchange splits correctly unresolved, both board paths correctly blocked, Perth green)"
);
