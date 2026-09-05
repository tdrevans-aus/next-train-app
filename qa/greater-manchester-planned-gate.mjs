/**
 * Greater Manchester stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/greater-manchester-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  GREATER_MANCHESTER_REGION,
  GREATER_MANCHESTER_NR_HUB,
  GREATER_MANCHESTER_NR_SECONDARY_HUB,
  GREATER_MANCHESTER_METROLINK_HUB,
  GREATER_MANCHESTER_METROLINK_SECONDARY_HUB,
  resolveCatalogEntry,
  listCatalogStations,
  listMetrolinkStops,
  listNationalRailStations,
  fetchMetrolinkStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  MetrolinkFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapMetrolinkDestination,
  isForbiddenCollapseName,
} from "../lib/providers/greater-manchester.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (see south-yorkshire-planned-gate.mjs for why). This gate only
// needs to know Perth stays live and greater-manchester itself is correctly
// wired as planned.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("greater-manchester");
assert(live?.ok === false, "assertCityLive(greater-manchester) must fail");
assert(live?.status === 501, "greater-manchester must be 501 planned");

const entry = getCity("greater-manchester");
assert(entry?.status === "planned", "greater-manchester registry status must be planned");
assert(entry?.adapterReady === true, "greater-manchester adapterReady must be true");
assert(entry?.displayName === "Greater Manchester", "greater-manchester display name must be Greater Manchester");
assert(entry?.timeZone === "Europe/London", "greater-manchester timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "greater-manchester").length === 1,
  "greater-manchester must appear once in the registry"
);
for (const forbiddenId of ["gm", "manchester", "metrolink", "greater-manchester-metrolink"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/greater-manchester-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/greater-manchester-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "greater-manchester", "D1 city id is greater-manchester");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.nationalRailLock === GREATER_MANCHESTER_NR_HUB,
  `D1 National Rail lock must be ${GREATER_MANCHESTER_NR_HUB}`
);
assert(
  network.printedInnerCityNames?.metrolinkLock === GREATER_MANCHESTER_METROLINK_HUB,
  `D1 Metrolink lock must be ${GREATER_MANCHESTER_METROLINK_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(GREATER_MANCHESTER_REGION);
assert(region?.railCount === 4, `greater-manchester rail count must be 4, got ${region?.railCount}`);
assert(region?.metroCount === 15, `greater-manchester metro count must be 15, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Manchester Piccadilly", "Manchester Victoria", "Stockport", "Walsden"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("MAN"), "National Rail catalog must carry MAN");
assert(railCrs.has("MCV"), "National Rail catalog must carry MCV");
assert(railCrs.has("SPT"), "National Rail catalog must carry SPT (Stockport, live-verified 5 Sep 2026 — corrected from SMN)");
assert(railCrs.has("WDN"), "National Rail catalog must carry WDN (this region's own oracle report's Walsden code)");
assert(!railCrs.has("WAD"), "National Rail catalog must NOT silently adopt West Yorkshire's WAD code for Walsden");

const metroStops = listMetrolinkStops();
const metroNames = new Set(metroStops.map((s) => s.name));
for (const name of [
  "St Peter's Square",
  "Manchester Victoria",
  "Piccadilly Gardens",
  "Bury",
  "Altrincham",
  "Ashton-under-Lyne",
  "Eccles",
  "Trafford Centre",
  "Cornbrook",
  "Imperial War Museum",
  "Wharfside",
  "Pomona",
  "Rochdale",
  "Manchester Airport",
  "Stockport (tram stop)",
]) {
  assert(metroNames.has(name), `Metrolink catalog must carry ${name}`);
}
assert(metroStops.length === 15, `Metrolink catalog must have exactly 15 stops, got ${metroStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 19, `combined catalog must have 19 stations (4 rail + 15 metro), got ${allStations.length}`);

// doNotGroup — Manchester Victoria resolves as two distinct catalog entries by mode.
const victoriaRail = resolveCatalogEntry(GREATER_MANCHESTER_NR_SECONDARY_HUB, "train");
const victoriaMetro = resolveCatalogEntry(GREATER_MANCHESTER_METROLINK_SECONDARY_HUB, "metro");
assert(victoriaRail?.crs === "MCV", "Manchester Victoria must resolve as a National Rail entry (crs MCV)");
assert(
  victoriaMetro?.catalogId === "metrolink:manchester-victoria",
  "Manchester Victoria must resolve as a distinct Metrolink metro entry"
);

// doNotGroup — Manchester Piccadilly (NR) and Piccadilly Gardens (Metrolink) are separate stationGroups.
const piccadillyRail = resolveCatalogEntry(GREATER_MANCHESTER_NR_HUB, "train");
const piccadillyGardens = resolveCatalogEntry("Piccadilly Gardens", "metro");
assert(piccadillyRail?.crs === "MAN", "Manchester Piccadilly must resolve as a National Rail entry (crs MAN)");
assert(
  piccadillyGardens?.catalogId === "metrolink:piccadilly-gardens",
  "Piccadilly Gardens must resolve as a distinct Metrolink metro entry"
);
assert(
  resolveCatalogEntry("Piccadilly", "metro")?.catalogId === "metrolink:piccadilly-gardens",
  "'Piccadilly' alias must resolve to Piccadilly Gardens, never to the National Rail station"
);

// Forbidden ambiguous marketing tokens must never resolve.
assert(resolveCatalogEntry("Manchester") === null, "the bare token 'Manchester' must never resolve as a station");
assert(isForbiddenCollapseName("Manchester Central") === true, "'Manchester Central' must never resolve as a station");
assert(isForbiddenCollapseName("Victoria Station") === true, "'Victoria Station' must never resolve as a station");

// Direction model — line + terminus, hub never shows itself as its own destination.
const hubLabels = marketingLabelsForStation(GREATER_MANCHESTER_METROLINK_HUB);
assert(hubLabels.length === 0, "St Peter's Square is not itself a line terminus in the report's termini-only data");

const buryLabels = marketingLabelsForStation("Bury");
assert(buryLabels.includes("Green + Altrincham"), "Bury must offer Green + Altrincham");
assert(buryLabels.includes("Yellow + Piccadilly"), "Bury must offer Yellow + Piccadilly");
assert(buryLabels.includes("Purple + Altrincham"), "Bury must offer Purple + Altrincham");
assert(!buryLabels.some((label) => label.includes("+ Bury")), "Bury must never show itself as a destination");

const imperialWarMuseumLabels = marketingLabelsForStation("Imperial War Museum");
assert(
  imperialWarMuseumLabels.length === 0,
  "Imperial War Museum must not generate any direction chip — Red line via-points are a real gap, not guessed"
);

assert(
  mapMetrolinkDestination("Altrincham", "Green") === "Green + Altrincham",
  "mapMetrolinkDestination must map a confirmed terminus"
);
assert(
  mapMetrolinkDestination("Imperial War Museum", "Red") === null,
  "mapMetrolinkDestination must not fabricate an unresolved Red-line via-point chip"
);

// Both board paths are structurally wired but currently blocked — National Rail on the
// account-level Darwin token, Metrolink on the confirmed-absent GTFS-RT feed (see file
// header of lib/providers/greater-manchester.js). Neither should silently return fabricated data.
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Manchester Piccadilly");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let metrolinkBlocked = false;
try {
  await fetchMetrolinkStopBoard("Bury");
} catch (err) {
  metrolinkBlocked = err instanceof MetrolinkFeedUnconfirmedError;
}
assert(
  metrolinkBlocked,
  "fetchMetrolinkStopBoard must throw MetrolinkFeedUnconfirmedError — no confirmed Metrolink real-time feed exists"
);

let dispatchThrew = false;
try {
  await fetchStationBoard("Bury");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Metrolink");

console.log(
  "greater-manchester-planned-gate: ok (planned/501, adapterReady, D1 pack, 4 rail + 15 Metrolink stations, doNotGroup at Manchester Victoria and Manchester Piccadilly/Piccadilly Gardens, WDN Walsden CRS carried without adopting West Yorkshire's WAD, line+terminus direction model with Red line via-points correctly unresolved, both board paths correctly blocked, Perth green)"
);
