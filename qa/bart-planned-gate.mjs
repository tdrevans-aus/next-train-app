/**
 * BART stays planned (adapter wired, not flipped live). Perth (Australia) stays live.
 * Usage: node qa/bart-planned-gate.mjs
 *
 * Deliberately does NOT call the live BART Legacy API ETD endpoint (api.bart.gov/api/etd.aspx)
 * — that's a real network call not appropriate for a smoke-tier gate, and BART_API_KEY was not
 * available this session anyway (docs/bart-d1/jim-handoff.md; empty-key probe was HTTP 400 on
 * the D1 pack's own research). Instead this gate unit-tests the catalog/allow-list/
 * direction-model logic (resolveCatalogEntry, listCatalogStations, mapEtdEstimateToTrip,
 * tripsFromEtdRoot, mapLineTerminusDestination, resolveTerminus) against synthetic ETD payloads
 * shaped like the documented api.bart.gov/docs/etd/etd.aspx response, plus asserts that
 * fetchStationBoard throws for an unknown station and for a missing BART_API_KEY, and throws
 * FeedUnconfirmedError for the OAK-only station, all without any network call.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { FeedUnconfirmedError } from "../lib/providers/contract.js";
import {
  BART_HUB,
  BART_TIME_ZONE,
  BART_ETD_URL,
  BART_ETD_COLOR_TO_LINE,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  buildEtdUrl,
  parseEtdMinutes,
  mapEtdEstimateToTrip,
  tripsFromEtdRoot,
  fetchStationBoard,
  MissingBartApiKeyError,
} from "../lib/providers/bart.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  canonicalStationName,
  resolveTerminus,
  mapLineTerminusDestination,
} from "../lib/cities/bart/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

const live = assertCityLive("bart");
assert(live?.ok === false, "assertCityLive(bart) must fail");
assert(live?.status === 501, "bart must be 501 planned");

const entry = getCity("bart");
assert(entry?.status === "planned", "bart registry status must be planned");
assert(entry?.adapterReady === true, "bart adapterReady must be true");
assert(entry?.displayName === "BART", "bart display name must be BART");
assert(entry?.timeZone === "America/Los_Angeles", "bart timezone must be America/Los_Angeles");
assert(CITIES.filter((city) => city.id === "bart").length === 1, "bart must appear once in the registry");
for (const forbiddenId of ["sf", "san-francisco", "bay-area", "oakland", "sfo"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// D1 pack presence.
const d1Dir = join(ROOT, "docs/bart-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/bart-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "bart", "D1 city id must be bart");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === BART_HUB, `D1 lock must be ${BART_HUB}`);
assert(network.lines.length === 6, "D1 must carry exactly 6 lines (5 color + OAK)");

const stations = listCatalogStations();
assert(stations.length === 50, `catalog must have 50 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(BART_HUB), `catalog must lock ${BART_HUB}`);
assert(byName.get(BART_HUB)?.hub === true, "hub entry must carry hub:true");
assert(
  (byName.get(BART_HUB)?.aliases ?? []).length === 0,
  "Embarcadero must not carry an alias — no doNotUse hub-proxy string may collapse into it"
);

// resolveCatalogEntry — exact-match aliasing (map printed name <-> stations-index long form).
assert(resolveCatalogEntry(BART_HUB)?.name === BART_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Montgomery St.")?.name === "Montgomery St", "must resolve Montgomery St. -> Montgomery St");
assert(resolveCatalogEntry("Berryessa / North San Jose")?.name === "Berryessa/North San José", "must resolve stations-index Berryessa form to the map form");
assert(resolveCatalogEntry("SFO")?.name === "San Francisco International Airport (SFO)", "must resolve SFO alias");
assert(resolveCatalogEntry("EMBR")?.name === BART_HUB, "must resolve BART abbreviation EMBR to Embarcadero");
assert(resolveCatalogEntry("Powell St")?.name === "Powell St", "Powell St is a real, separately-catalogued BART station — just never the hub lock");
assert(isForbiddenHubProxy("Powell St") === true, "Powell St must never stand in for the Embarcadero hub identity");
assert(resolveCatalogEntry("Downtown") === null, "Downtown must never resolve as a station");
assert(resolveCatalogEntry("San Francisco") === null, "resolveCatalogEntry must reject the marketing token San Francisco");
assert(resolveCatalogEntry("sf") === null, "resolveCatalogEntry must reject the invented city token sf");
assert(resolveCatalogEntry("bay-area") === null, "resolveCatalogEntry must reject the invented city token bay-area");
assert(isForbiddenCollapseName("City") === true, "City must never resolve as a station on its own");
assert(isForbiddenHubProxy("Montgomery St") === true, "Montgomery St must never stand in for the Embarcadero hub identity");
assert(isForbiddenHubProxy("12th St/Oakland City Center") === true, "12th St/Oakland City Center must never stand in for the Embarcadero hub identity");
assert(isForbiddenHubProxy(BART_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("Berryessa/North San José") !== "", "foldKey must fold diacritics/case");

// doNotCollapse same-family pairs stay distinct catalog entries.
assert(byName.get("Dublin/Pleasanton") && !byName.get("Dublin/Pleasanton").aliases.includes("West Dublin / Pleasanton"), "Dublin/Pleasanton must stay distinct from West Dublin/Pleasanton");
assert(byName.get("West Dublin/Pleasanton")?.lines.includes("blue"), "West Dublin/Pleasanton must be Blue");
assert(byName.get("Pittsburg/Bay Point")?.lines.includes("yellow"), "Pittsburg/Bay Point must be Yellow");
assert(byName.get("Pittsburg Center")?.lines.includes("yellow"), "Pittsburg Center must be Yellow (eBART, same color)");
assert(resolveCatalogEntry("Pittsburg/Bay Point")?.name === "Pittsburg/Bay Point", "must not collapse Pittsburg/Bay Point into Pittsburg Center");
assert(byName.get("12th St/Oakland City Center")?.lines.includes("orange") && !byName.get("19th St/Oakland")?.lines.includes("orange"), "12th St/Oakland City Center is Orange; 19th St/Oakland is not (Oakland wye split)");
assert(byName.get("San Francisco International Airport (SFO)")?.lines.includes("yellow"), "SFO must be Yellow only");
assert(!byName.get("San Francisco International Airport (SFO)")?.lines.includes("red"), "SFO must NOT be Red on this map");
assert(byName.get("Millbrae")?.lines.includes("red"), "Millbrae must be Red");
assert(byName.get("Millbrae")?.lines.includes("yellow"), "Millbrae must also be Yellow (evening south end)");
assert(byName.get("Oakland International Airport (OAK)")?.noEtd === true, "OAK station must be flagged noEtd");
assert(byName.get("Coliseum")?.lines.includes("oak"), "Coliseum must carry the oak line");
assert(!byName.get("Coliseum")?.noEtd, "Coliseum itself must still board (Orange/Blue/Green have real ETD)");

// Line labels + termini (direction-model-memo.md §3 recommendation A — bare color word).
assert(LINE_LABELS.yellow === "Yellow", "Yellow line label is the bare color word");
assert(LINE_LABELS.oak === "OAK", "OAK line label");
assert(LINE_TERMINI.yellow.includes("Antioch") && LINE_TERMINI.yellow.includes("San Francisco International Airport (SFO)") && LINE_TERMINI.yellow.includes("Millbrae"), "Yellow termini must be Antioch/SFO/Millbrae");
assert(LINE_TERMINI.red.includes("Richmond") && LINE_TERMINI.red.includes("Millbrae") && !LINE_TERMINI.red.includes("San Francisco International Airport (SFO)"), "Red termini must be Richmond/Millbrae only, never SFO");
assert(BART_ETD_COLOR_TO_LINE.YELLOW === "yellow" && BART_ETD_COLOR_TO_LINE.ORANGE === "orange", "ETD color map must match published-network.json gtfsRouteIdsIfKnown");
assert(!("OAK" in BART_ETD_COLOR_TO_LINE), "OAK must have no ETD color token");

assert(canonicalStationName("Government Center") === null, "canonicalStationName must not fabricate a Boston station for BART");
assert(resolveTerminus("Antioch", "yellow") === "Antioch", "resolveTerminus must resolve an exact terminus match");
assert(mapLineTerminusDestination("Antioch", "yellow") === "Yellow + Antioch", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Daly City", "blue") === "Blue + Daly City", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Richmond", "orange") === "Orange + Richmond", "direction chip must be line + terminus");
// Embarcadero must NEVER appear as a direction — it isn't in any line's termini list, so an
// unresolvable/hub headsign always falls back to the bare line label.
assert(mapLineTerminusDestination("Embarcadero", "red") === "Red", "Embarcadero must never appear as a direction token");
assert(mapLineTerminusDestination("San Francisco", "orange") === "Orange", "San Francisco/SF must never appear as a direction token");
assert(resolveTerminus("Some Unknown Headsign", "red") === null, "resolveTerminus must not fabricate an unknown terminus");
// Conservative substring fallback for an unverified shortened ETD blind, still scoped to that
// line's small termini set (never fabricates outside it).
assert(resolveTerminus("SFO", "yellow") === "San Francisco International Airport (SFO)", "resolveTerminus must match a shortened ETD blind like SFO to Yellow's SFO terminus");

// ETD URL + payload shaping (api.bart.gov/docs/etd/etd.aspx documented shape), no network.
assert(BART_ETD_URL === "https://api.bart.gov/api/etd.aspx", "ETD URL must point at BART's Legacy API");
const url = buildEtdUrl("EMBR", "test-key");
assert(url.includes("cmd=etd") && url.includes("orig=EMBR") && url.includes("key=test-key") && url.includes("json=y"), "buildEtdUrl must carry cmd/orig/key/json params");

assert(parseEtdMinutes("5") === 5, "parseEtdMinutes must parse a plain integer");
assert(parseEtdMinutes("Leaving") === 0, "parseEtdMinutes must treat Leaving as 0");
assert(parseEtdMinutes("garbage") === 0, "parseEtdMinutes must not throw on unexpected input");

const now = new Date("2026-09-20T12:00:00-07:00");
const trip = mapEtdEstimateToTrip("Antioch", { color: "YELLOW", minutes: "8", platform: "1", cancelflag: "0" }, now);
assert(trip.lineId === "yellow", "mapEtdEstimateToTrip must classify by ETD color");
assert(trip.destination === "Yellow + Antioch", "mapEtdEstimateToTrip must apply the line+terminus direction model");
assert(typeof trip.displayTime === "string" && trip.displayTime !== "", "mapEtdEstimateToTrip must set a string displayTime (PR #332 regression class)");
assert(typeof trip.scheduledDisplayTime === "string" && trip.scheduledDisplayTime !== "", "mapEtdEstimateToTrip must set a string scheduledDisplayTime");
assert(trip.platform === "1", "mapEtdEstimateToTrip must carry platform");
assert(trip.cancelled === false, "mapEtdEstimateToTrip must read cancelflag");

const cancelledTrip = mapEtdEstimateToTrip("Richmond", { color: "RED", minutes: "3", cancelflag: "1" }, now);
assert(cancelledTrip.cancelled === true, "mapEtdEstimateToTrip must mark a cancelled estimate");

const unknownColorTrip = mapEtdEstimateToTrip("Somewhere", { color: "MAGENTA", minutes: "2" }, now);
assert(unknownColorTrip.lineId === null, "an unrecognized ETD color must not be classified into any line");

const syntheticEtdRoot = {
  station: [
    {
      name: "Embarcadero",
      abbr: "EMBR",
      etd: [
        {
          destination: "Antioch",
          estimate: [{ minutes: "4", platform: "2", color: "YELLOW", cancelflag: "0" }],
        },
        {
          destination: "Richmond",
          estimate: [
            { minutes: "6", platform: "1", color: "RED", cancelflag: "0" },
            { minutes: "16", platform: "1", color: "RED", cancelflag: "0" },
          ],
        },
      ],
    },
  ],
};
const trips = tripsFromEtdRoot(syntheticEtdRoot, now);
assert(trips.length === 3, `tripsFromEtdRoot must flatten all estimates, got ${trips.length}`);
assert(trips.every((t) => t.lineId), "every synthetic trip must be classified");
assert(trips.some((t) => t.destination === "Yellow + Antioch"), "must include the Yellow + Antioch trip");
assert(trips.filter((t) => t.destination === "Red + Richmond").length === 2, "must include both Red + Richmond estimates");

// fetchStationBoard — no network for any of these three failure/verdict paths.
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

let missingKeyThrew = false;
try {
  await fetchStationBoard(BART_HUB, { apiKey: "" });
} catch (err) {
  missingKeyThrew = err instanceof MissingBartApiKeyError;
}
assert(missingKeyThrew, "fetchStationBoard must throw MissingBartApiKeyError when no key is configured — no silent timetable fallback");

let oakThrew = null;
try {
  await fetchStationBoard("Oakland International Airport (OAK)", { apiKey: "test-key" });
} catch (err) {
  oakThrew = err;
}
assert(oakThrew instanceof FeedUnconfirmedError, "fetchStationBoard(OAK) must throw FeedUnconfirmedError — no real-time ETD exists for the OAK connector");

console.log(
  "bart-planned-gate: ok (planned/501, adapterReady, D1 pack, 50 stations, hub Embarcadero, doNotCollapse pairs enforced, line+terminus direction model, Embarcadero/SF never a direction token, ETD payload shaping, missing-key and OAK-no-ETD both throw without network, Perth Australia green)"
);
