/**
 * South Yorkshire stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/south-yorkshire-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  SOUTH_YORKSHIRE_HUB,
  SOUTH_YORKSHIRE_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listSupertramStops,
  listNationalRailStations,
  fetchSupertramStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  SupertramFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapSupertramDestination,
  isForbiddenCollapseName,
} from "../lib/providers/south-yorkshire.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (that pattern caused the Helsinki-contamination bug fixed in
// 75c5edd: a gate asserting a city's live status from a shared working tree
// rather than master's actual registry state). This gate only needs to know
// Perth stays live and south-yorkshire itself is correctly wired as planned.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

const live = assertCityLive("south-yorkshire");
assert(live?.ok === false, "assertCityLive(south-yorkshire) must fail");
assert(live?.status === 501, "south-yorkshire must be 501 planned");

const entry = getCity("south-yorkshire");
assert(entry?.status === "planned", "south-yorkshire registry status must be planned");
assert(entry?.adapterReady === true, "south-yorkshire adapterReady must be true");
assert(entry?.displayName === "South Yorkshire", "south-yorkshire display name must be South Yorkshire");
assert(entry?.timeZone === "Europe/London", "south-yorkshire timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "south-yorkshire").length === 1,
  "south-yorkshire must appear once in the registry"
);
for (const forbiddenId of ["sy", "sheffield", "supertram", "south-yorkshire-supertram"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/south-yorkshire-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/south-yorkshire-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "south-yorkshire", "D1 city id is south-yorkshire");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === SOUTH_YORKSHIRE_HUB,
  `D1 lock must be ${SOUTH_YORKSHIRE_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOUTH_YORKSHIRE_REGION);
assert(region?.railCount === 7, `south-yorkshire rail count must be 7, got ${region?.railCount}`);
assert(region?.metroCount === 12, `south-yorkshire metro count must be 12, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Meadowhall Interchange",
  "Rotherham Central",
  "Denby Dale",
  "Darton",
  "South Elmsall",
  "Moorthorpe",
]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("SHF"), "National Rail catalog must carry SHF");
assert(railCrs.has("MHS"), "National Rail catalog must carry MHS");
assert(!railCrs.has("CHD"), "National Rail catalog must not carry Chesterfield (owned by East Midlands)");
assert(!railNames.has("Chesterfield"), "National Rail catalog must not carry Chesterfield by name either");
assert(
  getNotInRegion(SOUTH_YORKSHIRE_REGION).includes("Chesterfield"),
  "Chesterfield must be recorded as a deliberate exclusion"
);

const supertramStops = listSupertramStops();
const supertramNames = new Set(supertramStops.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Malin Bridge",
  "Halfway",
  "Gleadless Townend",
  "Crystal Peaks",
  "Herdings Park",
  "Middlewood",
  "Hillsborough",
  "Sheffield Arena",
  "Meadowhall",
  "Rotherham Central",
  "Parkgate",
]) {
  assert(supertramNames.has(name), `Supertram catalog must carry ${name}`);
}
assert(supertramStops.length === 12, `Supertram catalog must have exactly 12 stops, got ${supertramStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 19, `combined catalog must have 19 stations (7 rail + 12 metro), got ${allStations.length}`);

// doNotGroup — Sheffield Station resolves as two distinct catalog entries by mode.
const hubRail = resolveCatalogEntry(SOUTH_YORKSHIRE_HUB, "train");
const hubMetro = resolveCatalogEntry(SOUTH_YORKSHIRE_HUB, "metro");
assert(hubRail?.crs === "SHF", "Sheffield Station must resolve as a National Rail entry (crs SHF)");
assert(hubMetro?.catalogId?.startsWith("supertram:"), "Sheffield Station must resolve as a distinct Supertram metro entry");
assert(resolveCatalogEntry("sheffield") === null, "the marketing token 'sheffield' must never resolve as a station");
assert(resolveCatalogEntry("supertram") === null, "the marketing token 'supertram' must never resolve as a station");
assert(isForbiddenCollapseName("Sheffield Interchange") === true, "'Sheffield Interchange' must never resolve as a station");

// Meadowhall — through-running switch point, also doNotGroup by mode, not a hub-lock parent.
const meadowhallRail = resolveCatalogEntry("Meadowhall Interchange", "train");
const meadowhallMetro = resolveCatalogEntry("Meadowhall", "metro");
assert(meadowhallRail?.crs === "MHS", "Meadowhall Interchange must resolve as a National Rail entry (crs MHS)");
assert(
  meadowhallMetro?.catalogId === "supertram:meadowhall",
  "Meadowhall must resolve as the Supertram Yellow terminus entry"
);

// Direction model — line + terminus, hub never shows itself as its own destination,
// and no chip is fabricated for an unconfirmed via-point (e.g. Gleadless Townend).
const hubLabels = marketingLabelsForStation(SOUTH_YORKSHIRE_HUB);
assert(hubLabels.includes("Purple + Herdings Park"), "hub must offer Purple + Herdings Park");
assert(hubLabels.includes("Tram-Train + Parkgate"), "hub must offer Tram-Train + Parkgate");
assert(
  !hubLabels.some((label) => label.includes(SOUTH_YORKSHIRE_HUB)),
  "the hub must never appear as its own chip terminus"
);
const halfwayLabels = marketingLabelsForStation("Halfway");
assert(halfwayLabels.includes("Blue + Malin Bridge"), "Halfway must offer Blue + Malin Bridge");
assert(!halfwayLabels.some((label) => label.includes("Halfway")), "Halfway must never show itself as a destination");

const gleadlessLabels = marketingLabelsForStation("Gleadless Townend");
assert(
  gleadlessLabels.length === 0,
  "Gleadless Townend must not generate any direction chip — Purple's branch junction is an unresolved gap, not guessed"
);

assert(
  mapSupertramDestination("Halfway", "Blue") === "Blue + Halfway",
  "mapSupertramDestination must map a confirmed terminus"
);
assert(
  mapSupertramDestination("Gleadless Townend", "Purple") === null,
  "mapSupertramDestination must not fabricate the unresolved Purple branch chip"
);

// Both board paths are structurally wired but currently blocked — National Rail on the
// account-level Darwin token, Supertram on the confirmed-absent GTFS feed (see file header of
// lib/providers/south-yorkshire.js). Neither should silently return fabricated data.
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Sheffield Station");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let supertramBlocked = false;
try {
  await fetchSupertramStopBoard("Halfway");
} catch (err) {
  supertramBlocked = err instanceof SupertramFeedUnconfirmedError;
}
assert(
  supertramBlocked,
  "fetchSupertramStopBoard must throw SupertramFeedUnconfirmedError — no confirmed Supertram GTFS source exists"
);

let dispatchThrew = false;
try {
  await fetchStationBoard("Halfway");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Supertram");

console.log(
  "south-yorkshire-planned-gate: ok (planned/501, adapterReady, D1 pack, 7 rail + 12 Supertram stations, Chesterfield excluded, doNotGroup at Sheffield Station and Meadowhall, line+terminus direction model with Purple's Gleadless Townend branch correctly unresolved, both board paths correctly blocked, Perth green)"
);
