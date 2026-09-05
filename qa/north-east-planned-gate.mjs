/**
 * North East stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/north-east-planned-gate.mjs
 *
 * Tyne and Wear Metro is OUT-PRODUCT (Tim, 5 Sep 2026 — see
 * docs/jim-brief-north-east-metro-out-product.md and
 * docs/united-kingdom-ledger.md §3/§4): no confirmed public real-time feed
 * exists, so per the walk-up rule's East Midlands NET precedent the app does
 * not offer a static-timetable board dressed up as live.
 * fetchMetroStopBoard() throws MetroFeedUnconfirmedError immediately
 * without touching the network — see lib/providers/north-east.js file
 * header. This gate asserts that, plus all the catalog/direction-model
 * wiring, with no network calls at all.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  NORTH_EAST_HUB,
  METRO_HUB_STATION_NAME,
  NORTH_EAST_REGION,
  METRO_LINES,
  SUNDERLAND_SHARED_PLATFORM,
  PELAW_JUNCTION,
  resolveCatalogEntry,
  listCatalogStations,
  listMetroStopsForRegion,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchMetroStopBoard,
  fetchStationBoard,
  marketingLabelsForStation,
  mapMetroDestination,
  linesForStation,
  isForbiddenCollapseName,
  MissingDarwinTokenError,
  MetroFeedUnconfirmedError,
} from "../lib/providers/north-east.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see
// south-yorkshire-planned-gate.mjs). Perth green + north-east correctly
// wired as planned is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("north-east");
assert(live?.ok === false, "assertCityLive(north-east) must fail");
assert(live?.status === 501, "north-east must be 501 planned");

const entry = getCity("north-east");
assert(entry?.status === "planned", "north-east registry status must be planned");
assert(entry?.adapterReady === true, "north-east adapterReady must be true");
assert(
  entry?.displayName === "North East (Tyne and Wear)",
  "north-east display name must be North East (Tyne and Wear)"
);
assert(entry?.timeZone === "Europe/London", "north-east timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "north-east").length === 1, "north-east must appear once in the registry");
// Note: "newcastle" is already a registered city id (Newcastle, Australia — a distinct city, not
// this pack's Newcastle Central hub). Not checked as forbidden here for that reason.
for (const forbiddenId of ["ne", "tyne-and-wear", "north-east-metro"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/north-east-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/north-east-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "north-east", "D1 city id is north-east");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === NORTH_EAST_HUB, `D1 lock must be ${NORTH_EAST_HUB}`);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(NORTH_EAST_REGION);
assert(region?.railCount === 3, `north-east rail count must be 3, got ${region?.railCount}`);
assert(region?.metroCount === 60, `north-east metro count must be 60, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Newcastle Central", "Sunderland", "Berwick-upon-Tweed"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("NCL"), "National Rail catalog must carry NCL");
assert(railCrs.has("BWK"), "National Rail catalog must carry BWK");
assert(!railNames.has("Darlington"), "National Rail catalog must not carry Darlington (unresolved boundary)");
assert(
  getNotInRegion(NORTH_EAST_REGION).includes("Darlington"),
  "Darlington must be recorded as a deliberate exclusion"
);

const metroStops = listMetroStopsForRegion();
const metroNames = new Set(metroStops.map((s) => s.name));
for (const name of [
  "St James",
  "South Shields",
  "South Hylton",
  "Newcastle Airport",
  METRO_HUB_STATION_NAME,
  "Sunderland",
  "Pelaw",
]) {
  assert(metroNames.has(name), `Metro catalog must carry ${name}`);
}
assert(metroStops.length === 60, `Metro catalog must have exactly 60 stops, got ${metroStops.length}`);
assert(!metroNames.has("Newcastle Central"), "Metro catalog must use 'Central Station', not 'Newcastle Central'");

const allStations = listCatalogStations();
assert(allStations.length === 63, `combined catalog must have 63 stations (3 rail + 60 metro), got ${allStations.length}`);

// doNotGroup at Newcastle Central — two catalog entries, DIFFERENT printed names (no collapse risk).
const hubRail = resolveCatalogEntry(NORTH_EAST_HUB, "train");
const hubMetro = resolveCatalogEntry(METRO_HUB_STATION_NAME, "metro");
assert(hubRail?.crs === "NCL", "Newcastle Central must resolve as a National Rail entry (crs NCL)");
assert(hubMetro?.catalogId === "metro:central-station", "Central Station must resolve as the Metro hub entry");
assert(resolveCatalogEntry("newcastle") === null, "the marketing token 'newcastle' must never resolve as a station");
assert(resolveCatalogEntry("ncl") === null, "the marketing token 'ncl' must never resolve as a station");
assert(isForbiddenCollapseName("Tyne and Wear Metro") === true, "'Tyne and Wear Metro' must never resolve as a station");

// Sunderland — genuinely NOT doNotGroup, shared-platform metadata exported for a future
// board-merging pass.
const sunderlandRail = resolveCatalogEntry("Sunderland", "train");
const sunderlandMetro = resolveCatalogEntry("Sunderland", "metro");
assert(sunderlandRail?.crs === "SUN", "Sunderland's National Rail entry must carry crs SUN (live-verified 5 Sep 2026)");
assert(sunderlandMetro?.catalogId === "metro:sunderland", "Sunderland must resolve as a Green Line metro entry");
assert(SUNDERLAND_SHARED_PLATFORM?.name === "Sunderland", "SUNDERLAND_SHARED_PLATFORM must be exported");
assert(
  SUNDERLAND_SHARED_PLATFORM.class.toLowerCase().includes("not donotgroup"),
  "SUNDERLAND_SHARED_PLATFORM must be explicitly documented as NOT a doNotGroup case"
);

// Pelaw — Metro-only junction, no separate National Rail station.
assert(PELAW_JUNCTION?.name === "Pelaw", "PELAW_JUNCTION must be exported");
assert(!railNames.has("Pelaw"), "Pelaw must not appear in the National Rail catalog");
assert(metroNames.has("Pelaw"), "Pelaw must appear in the Metro catalog");
assert(
  linesForStation("Pelaw").sort().join(",") === "Green,Yellow",
  "Pelaw must be served by both Green and Yellow (GTFS-confirmed, resolves the D1 pack's open question)"
);

// Direction model — line + terminus, hub never shows itself, full GTFS-confirmed station lists.
assert(METRO_LINES.find((l) => l.number === "Green")?.stations.length === 31, "Green Line must have 31 confirmed stations");
assert(METRO_LINES.find((l) => l.number === "Yellow")?.stations.length === 41, "Yellow Line must have 41 confirmed unique stations");

const hubLabels = marketingLabelsForStation(METRO_HUB_STATION_NAME);
assert(hubLabels.includes("Green + South Hylton"), "hub must offer Green + South Hylton");
assert(hubLabels.includes("Yellow + St James"), "hub must offer Yellow + St James");
assert(hubLabels.includes("Yellow + South Shields"), "hub must offer Yellow + South Shields");
assert(
  !hubLabels.some((label) => label.includes(METRO_HUB_STATION_NAME)),
  "the metro hub must never appear as its own chip terminus"
);

const stJamesLabels = marketingLabelsForStation("St James");
assert(stJamesLabels.includes("Yellow + South Shields"), "St James must offer Yellow + South Shields");
assert(!stJamesLabels.some((label) => label.includes("St James")), "St James must never show itself as a destination");

assert(
  mapMetroDestination("South Hylton", "Green") === "Green + South Hylton",
  "mapMetroDestination must map a confirmed terminus"
);
assert(mapMetroDestination("Pelaw", "Green") === null, "mapMetroDestination must not fabricate a non-terminus chip");

// National Rail board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()).
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Newcastle Central");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

// Metro board path is out-product — no confirmed public real-time feed exists (walk-up rule,
// East Midlands NET precedent; see lib/providers/north-east.js file header). No network call
// needed: fetchMetroStopBoard() throws before attempting anything.
let metroBlocked = false;
try {
  await fetchMetroStopBoard("Monument");
} catch (err) {
  metroBlocked = err instanceof MetroFeedUnconfirmedError;
}
assert(
  metroBlocked,
  "fetchMetroStopBoard must throw MetroFeedUnconfirmedError — Metro is out-product, no confirmed real-time feed"
);

let dispatchThrew = false;
try {
  await fetchStationBoard("Monument");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Metro");

console.log(
  "north-east-planned-gate: ok (planned/501, adapterReady, D1 pack, 3 rail + 60 GTFS-confirmed Metro stations, Darlington excluded, doNotGroup at Newcastle Central via distinct printed names, Sunderland correctly modelled as NOT doNotGroup, Pelaw confirmed Metro-only and served by both lines, line+terminus direction model with full confirmed station lists, National Rail blocked (account block) and Metro out-product (no confirmed real-time feed), Perth green)"
);
