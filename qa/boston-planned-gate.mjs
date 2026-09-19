/**
 * Boston stays planned (adapter wired, not flipped live). Perth (Australia) stays live.
 * Usage: node qa/boston-planned-gate.mjs
 *
 * Deliberately does NOT live-fetch the MBTA static GTFS feed (cdn.mbta.com/MBTA_GTFS.zip) —
 * that's a real network download not appropriate for a smoke-tier gate. Instead this gate
 * unit-tests the catalog/allow-list/direction-model logic (resolveCatalogEntry,
 * listCatalogStations, resolveStopIds shape, lineIdForTrip, mapLineTerminusDestination,
 * resolveTerminus) against synthetic data shaped like real staticData/buildBoardForStops
 * output, plus asserts that fetchStationBoard throws for an unknown station without any
 * network call (the Unknown-station check runs before the static feed load).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  BOSTON_HUB,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  resolveStopIds,
  lineIdForTrip,
  fetchStationBoard,
  MissingMbtaApiKeyError,
  MBTA_GTFS_STATIC_URL,
} from "../lib/providers/boston.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  canonicalStationName,
  resolveTerminus,
  mapLineTerminusDestination,
  MBTA_ROUTE_ID_TO_LINE,
} from "../lib/cities/boston/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city (the
// pattern that caused the Helsinki-contamination bug). Perth (Australia) green + boston
// correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("boston");
assert(live?.ok === false, "assertCityLive(boston) must fail");
assert(live?.status === 501, "boston must be 501 planned");

const entry = getCity("boston");
assert(entry?.status === "planned", "boston registry status must be planned");
assert(entry?.adapterReady === true, "boston adapterReady must be true");
assert(entry?.displayName === "Boston", "boston display name must be Boston");
assert(entry?.timeZone === "America/New_York", "boston timezone must be America/New_York");
assert(CITIES.filter((city) => city.id === "boston").length === 1, "boston must appear once in the registry");
for (const forbiddenId of ["bos", "mbta", "boston-mbta", "us", "washington", "chicago"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/boston-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/boston-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "boston", "D1 city id must be boston");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === BOSTON_HUB, `D1 lock must be ${BOSTON_HUB}`);
assert(network.lines.length === 8, "D1 must carry exactly 8 passenger services");

const stations = listCatalogStations();
assert(stations.length === 125, `catalog must have 125 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(BOSTON_HUB), `catalog must lock ${BOSTON_HUB}`);
assert(byName.get(BOSTON_HUB)?.hub === true, "hub entry must carry hub:true");
assert(
  (byName.get(BOSTON_HUB)?.aliases ?? []).length === 0,
  "Park Street must not carry an alias — no doNotUse hub-proxy string may collapse into it"
);

// resolveCatalogEntry — exact-match aliasing (map abbreviation <-> official long form).
assert(resolveCatalogEntry(BOSTON_HUB)?.name === BOSTON_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Government Center")?.name === "Gov't Center", "resolveCatalogEntry must resolve the official long form to the map abbreviation");
assert(resolveCatalogEntry("Tufts Medical Center")?.name === "Tufts Medical Ctr", "must resolve Tufts Medical Center -> Tufts Medical Ctr");
assert(resolveCatalogEntry("Massachusetts Avenue")?.name === "Mass. Ave", "must resolve Massachusetts Avenue -> Mass. Ave");
assert(resolveCatalogEntry("Boston") === null, "resolveCatalogEntry must reject the marketing token Boston");
assert(resolveCatalogEntry("bos") === null, "resolveCatalogEntry must reject the invented city token bos");
assert(resolveCatalogEntry("mbta") === null, "resolveCatalogEntry must reject the invented city token mbta");
assert(isForbiddenCollapseName("City") === true, "City must never resolve as a station on its own");
assert(isForbiddenHubProxy("Downtown Crossing") === true, "Downtown Crossing must never stand in for the Park Street hub identity");
assert(isForbiddenHubProxy("Gov't Center") === true, "Gov't Center must never stand in for the Park Street hub identity");
assert(isForbiddenHubProxy(BOSTON_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("Waitematā Station") !== "", "foldKey must fold diacritics/case");

// doNotCollapse same-name-family pairs stay distinct catalog entries.
assert(byName.get("Harvard")?.lines.includes("red"), "Harvard must be Red");
assert(!byName.get("Harvard")?.lines.includes("green-b"), "Harvard must NOT be Green B");
assert(byName.get("Harvard Ave")?.lines.includes("green-b"), "Harvard Ave must be Green B");
assert(byName.get("Central")?.lines.includes("red"), "Central must be Red");
assert(byName.get("Central Ave")?.lines.includes("mattapan"), "Central Ave must be Mattapan");
assert(resolveCatalogEntry("Central")?.name === "Central", "resolveCatalogEntry(Central) must not collapse into Central Ave");
assert(resolveCatalogEntry("Central Ave")?.name === "Central Ave", "resolveCatalogEntry(Central Ave) must not collapse into Central");
assert(byName.get("Washington St")?.lines.includes("green-b"), "Washington St must be Green B");
assert(byName.get("Washington Sq")?.lines.includes("green-c"), "Washington Sq must be Green C");
assert(byName.get("Longwood")?.lines.includes("green-d"), "Longwood must be Green D");
assert(byName.get("Longwood Medical Area")?.lines.includes("green-e"), "Longwood Medical Area must be Green E");
assert(byName.get("Ashmont")?.lines.includes("red"), "Ashmont must be on Red");
assert(byName.get("Ashmont")?.lines.includes("mattapan"), "Ashmont must also be the Mattapan start (not folded away)");

// Line labels + termini (direction-model-memo.md §3 recommendation A).
assert(LINE_LABELS.red === "Red Line", "Red line label");
assert(LINE_LABELS["green-b"] === "Green Line B", "Green B line label");
assert(LINE_LABELS.mattapan === "Mattapan Line", "Mattapan line label");
assert(LINE_TERMINI.red.includes("Alewife") && LINE_TERMINI.red.includes("Ashmont") && LINE_TERMINI.red.includes("Braintree"), "Red termini must be Alewife/Ashmont/Braintree");
assert(LINE_TERMINI["green-b"].includes("Gov't Center"), "Green B termini must include Gov't Center (legend inner end)");
assert(MBTA_ROUTE_ID_TO_LINE.Red === "red" && MBTA_ROUTE_ID_TO_LINE["Green-B"] === "green-b" && MBTA_ROUTE_ID_TO_LINE.Mattapan === "mattapan", "MBTA route_id map must match D1 gtfsRouteIdsIfKnown");

assert(canonicalStationName("Government Center") === "Gov't Center", "canonicalStationName must resolve the official long form");
assert(resolveTerminus("Government Center", "green-b") === "Gov't Center", "resolveTerminus must resolve Green B's Gov't Center terminus from the long-form headsign");
assert(mapLineTerminusDestination("Government Center", "green-b") === "Green Line B + Gov't Center", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Alewife", "red") === "Red Line + Alewife", "direction chip must be line + terminus");
// Park Street must NEVER appear as a direction — it isn't in any line's termini list, so an
// unresolvable/hub headsign always falls back to the bare line label.
assert(mapLineTerminusDestination("Park Street", "red") === "Red Line", "Park Street must never appear as a direction token");
assert(mapLineTerminusDestination("City", "orange") === "Orange Line", "City must never appear as a direction token");
assert(resolveTerminus("Some Unknown Headsign", "red") === null, "resolveTerminus must not fabricate an unknown terminus");

// resolveStopIds — synthetic staticData shaped like gtfs/static-cache.js output, no network.
const syntheticStaticData = {
  stops: [
    { stop_id: "place-pktrm", stop_name: "Park Street", parent_station: "" },
    { stop_id: "70075", stop_name: "Park Street", parent_station: "place-pktrm" },
    { stop_id: "70076", stop_name: "Park Street", parent_station: "place-pktrm" },
    { stop_id: "place-cntsq", stop_name: "Central", parent_station: "" },
    { stop_id: "place-NEC-2276", stop_name: "Central Ave", parent_station: "" },
  ],
  tripsById: new Map([
    ["trip-red-1", { route_id: "Red" }],
    ["trip-green-b-1", { route_id: "Green-B" }],
    ["trip-mattapan-1", { route_id: "Mattapan" }],
    ["trip-commuter-1", { route_id: "CR-Fitchburg" }],
  ]),
};
const parkStreetStopIds = resolveStopIds(syntheticStaticData, byName.get("Park Street"));
assert(parkStreetStopIds.includes("place-pktrm") && parkStreetStopIds.includes("70075") && parkStreetStopIds.includes("70076"), "resolveStopIds must expand Park Street to its child platform stops");
const centralStopIds = resolveStopIds(syntheticStaticData, byName.get("Central"));
assert(centralStopIds.length === 1 && centralStopIds[0] === "place-cntsq", "resolveStopIds(Central) must NOT pick up Central Ave (exact match only, no substring collapse)");
const centralAveStopIds = resolveStopIds(syntheticStaticData, byName.get("Central Ave"));
assert(centralAveStopIds.length === 1 && centralAveStopIds[0] === "place-NEC-2276", "resolveStopIds(Central Ave) must NOT pick up Central");

assert(lineIdForTrip("trip-red-1", syntheticStaticData) === "red", "lineIdForTrip must resolve Red from route_id");
assert(lineIdForTrip("trip-green-b-1", syntheticStaticData) === "green-b", "lineIdForTrip must resolve Green-B from route_id");
assert(lineIdForTrip("trip-mattapan-1", syntheticStaticData) === "mattapan", "lineIdForTrip must resolve Mattapan from route_id");
assert(lineIdForTrip("trip-commuter-1", syntheticStaticData) === null, "lineIdForTrip must reject Commuter Rail route_ids (out of v1 scope)");

// Provider wiring sanity — no network, no key required for the static path (documented).
assert(MBTA_GTFS_STATIC_URL === "https://cdn.mbta.com/MBTA_GTFS.zip", "static GTFS URL must point at MBTA's CDN");
assert(typeof MissingMbtaApiKeyError === "function", "MissingMbtaApiKeyError must be exported for the future live-realtime path");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

console.log(
  "boston-planned-gate: ok (planned/501, adapterReady, D1 pack, 125 stations, hub Park Street, doNotCollapse pairs enforced (Harvard/Harvard Ave, Central/Central Ave, Washington St/Washington Sq, Longwood/Longwood Medical Area), line+terminus direction model, Park Street/City never a direction token, exact-match stop resolution, MBTA route_id classification, Perth Australia green)"
);
