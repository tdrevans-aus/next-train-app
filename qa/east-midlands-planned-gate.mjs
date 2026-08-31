/**
 * East Midlands stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/east-midlands-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import {
  EAST_MIDLANDS_HUB,
  EAST_MIDLANDS_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNetStops,
  listNationalRailStations,
  fetchNetStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  NetFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapNetDestination,
  isForbiddenCollapseName,
} from "../lib/providers/east-midlands.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm tester-live must stay green");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg tester-live must stay green");
assert(assertCityLive("malmo")?.ok === true, "Malmö tester-live must stay green");
assert(assertCityLive("uppsala")?.ok === true, "Uppsala tester-live must stay green");
// Helsinki isn't in this registry yet - it's still on its own unmerged flip-PR (#164). This
// assertion was written in a shared working tree where Helsinki appeared live; that was
// contamination, not master's actual state. No Helsinki assertion here until #164 merges.

const live = assertCityLive("east-midlands");
assert(live?.ok === false, "assertCityLive(east-midlands) must fail");
assert(live?.status === 501, "east-midlands must be 501 planned");

const entry = getCity("east-midlands");
assert(entry?.status === "planned", "east-midlands registry status must be planned");
assert(entry?.adapterReady === true, "east-midlands adapterReady must be true");
assert(entry?.displayName === "East Midlands", "east-midlands display name must be East Midlands");
assert(entry?.timeZone === "Europe/London", "east-midlands timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "east-midlands").length === 1,
  "east-midlands must appear once in the registry"
);
for (const forbiddenId of ["em", "nottingham", "net", "east-midlands-trains"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/east-midlands-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/east-midlands-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "east-midlands", "D1 city id is east-midlands");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === EAST_MIDLANDS_HUB,
  `D1 lock must be ${EAST_MIDLANDS_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(EAST_MIDLANDS_REGION);
assert(region?.railCount === 6, `east-midlands rail count must be 6, got ${region?.railCount}`);
assert(region?.metroCount === 4, `east-midlands metro count must be 4, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["NOT", "LEI", "KET", "WEL", "CHD", "ALF"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(!railCrs.has("TAM"), "National Rail catalog must not carry Tamworth (D2 de-dup boundary with West Midlands)");
assert(getNotInRegion(EAST_MIDLANDS_REGION).includes("Tamworth"), "Tamworth must be recorded as a deliberate exclusion");

const netStops = listNetStops();
const netNames = new Set(netStops.map((s) => s.name));
for (const name of ["Hucknall", "Nottingham Station", "Beeston/Chilwell", "Phoenix Park"]) {
  assert(netNames.has(name), `NET catalog must carry ${name}`);
}
assert(!netNames.has("city centre"), "NET catalog must not carry the unconfirmed 'city centre' placeholder");
assert(netStops.length === 4, `NET catalog must have exactly 4 stops (termini + hub), got ${netStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 10, `combined catalog must have 10 stations (6 rail + 4 metro), got ${allStations.length}`);

// doNotGroup — Nottingham Station resolves as two distinct catalog entries by mode.
const hubRail = resolveCatalogEntry(EAST_MIDLANDS_HUB, "train");
const hubMetro = resolveCatalogEntry(EAST_MIDLANDS_HUB, "metro");
assert(hubRail?.crs === "NOT", "Nottingham Station must resolve as a National Rail entry (crs NOT)");
assert(hubMetro?.catalogId?.startsWith("net:"), "Nottingham Station must resolve as a distinct NET metro entry");
assert(resolveCatalogEntry("nottingham") === null, "the marketing token 'nottingham' must never resolve as a station");
assert(resolveCatalogEntry("net") === null, "the marketing token 'net' must never resolve as a station");
assert(isForbiddenCollapseName("city centre") === true, "'city centre' must never resolve as a station");

// Direction model — line + terminus, hub never shows itself as its own destination.
const hubLabels = marketingLabelsForStation(EAST_MIDLANDS_HUB);
assert(hubLabels.includes("1 + Hucknall"), "hub must offer 1 + Hucknall");
assert(hubLabels.includes("1 + Beeston/Chilwell"), "hub must offer 1 + Beeston/Chilwell");
assert(hubLabels.includes("2 + Phoenix Park"), "hub must offer 2 + Phoenix Park");
assert(
  !hubLabels.some((label) => label.includes(EAST_MIDLANDS_HUB)),
  "the hub must never appear as its own chip terminus"
);
const hucknallLabels = marketingLabelsForStation("Hucknall");
assert(hucknallLabels.includes("1 + Beeston/Chilwell"), "Hucknall must offer 1 + Beeston/Chilwell");
assert(!hucknallLabels.some((label) => label.includes("Hucknall")), "Hucknall must never show itself as a destination");

assert(mapNetDestination("Hucknall", "1") === "1 + Hucknall", "mapNetDestination must map a confirmed terminus");
assert(mapNetDestination("Toton Lane", "1") === null, "mapNetDestination must not fabricate an unconfirmed intermediate-stop chip");

// Both board paths are structurally wired but currently blocked — National Rail on the
// account-level Darwin token, NET on the confirmed-absent GTFS feed (see file header of
// lib/providers/east-midlands.js). Neither should silently return fabricated data.
let darwinBlocked = false;
try {
  await fetchNationalRailBoard("Nottingham Station");
} catch (err) {
  darwinBlocked = err instanceof MissingDarwinTokenError;
}
assert(darwinBlocked, "fetchNationalRailBoard must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists");

let netBlocked = false;
try {
  await fetchNetStopBoard("Hucknall");
} catch (err) {
  netBlocked = err instanceof NetFeedUnconfirmedError;
}
assert(netBlocked, "fetchNetStopBoard must throw NetFeedUnconfirmedError — no confirmed NET GTFS source exists");

let dispatchThrew = false;
try {
  await fetchStationBoard("Hucknall");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for NET");

console.log(
  "east-midlands-planned-gate: ok (planned/501, adapterReady, D1 pack, 6 rail + 4 NET stations, Tamworth excluded, doNotGroup at Nottingham Station, line+terminus direction model, both board paths correctly blocked, Perth/Stockholm/Göteborg/Malmö/Uppsala green)"
);
