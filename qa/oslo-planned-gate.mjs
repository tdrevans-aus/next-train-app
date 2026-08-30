/**
 * Oslo stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/oslo-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { OSLO_HUB, resolveCatalogEntry, listCatalogStations, classifyMapGroup } from "../lib/providers/oslo.js";
import {
  marketingLabelsForStation,
  mapOsloDestination,
  stripViaSuffix,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenTerminusToken,
  isOsloSNameFamily,
} from "../lib/cities/oslo/marketing-directions.js";

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
// Helsinki isn't in this registry yet — it's still on its own flip-PR (#164), not merged to
// master. This gate was originally built in a shared working tree where Helsinki appeared live;
// that was working-tree contamination, not master's actual state. No Helsinki assertion here
// until #164 merges — Helsinki's own gate covers its own correctness independently.

const live = assertCityLive("oslo");
assert(live?.ok === false, "assertCityLive(oslo) must fail");
assert(live?.status === 501, "oslo must be 501 planned");

const entry = getCity("oslo");
assert(entry?.status === "planned", "oslo registry status must be planned");
assert(entry?.adapterReady === true, "oslo adapterReady must be true");
assert(entry?.displayName === "Oslo", "oslo display name must be Oslo");
assert(entry?.timeZone === "Europe/Oslo", "oslo timezone must be Europe/Oslo");
assert(CITIES.filter((city) => city.id === "oslo").length === 1, "oslo must appear once in the registry");
assert(!getCity("norway"), "must not be registered as city=norway");

const d1Dir = join(ROOT, "docs/oslo-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/oslo-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/oslo/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/oslo/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/oslo/published-network.json must be a verbatim copy of docs/oslo-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "oslo", "D1 city id is oslo");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === OSLO_HUB, `D1 lock must be ${OSLO_HUB}`);

const tbaneLines = network.lines.filter((line) => line.mapGroup === "T-bane");
assert(tbaneLines.length === 5, "D1 must carry exactly T-bane lines 1-5 — no line 6");
assert(
  tbaneLines.every((line) => ["1", "2", "3", "4", "5"].includes(line.id)),
  "T-bane lines must be only 1-5"
);
const vyLines = network.lines.filter((line) => line.mapGroup === "Vy");
assert(vyLines.length === 8, "D1 must carry exactly the 8 in-scope Vy lines");
const flytogetLines = network.lines.filter((line) => line.mapGroup === "Flytoget");
assert(flytogetLines.length === 2, "D1 must carry exactly FLY1 and FLY2");
for (const line of [...vyLines, ...flytogetLines]) {
  assert(
    line.stations.every((s) => ["Jernbanetorget", "Nationaltheatret"].includes(s)),
    `${line.id} must be scoped to only Jernbanetorget/Nationaltheatret`
  );
}

const stations = listCatalogStations();
assert(stations.length === 101, `catalog must have 101 T-bane stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(OSLO_HUB), `catalog must lock ${OSLO_HUB}`);
for (const name of ["Jernbanetorget", "Nationaltheatret", "Majorstuen", "Gulleråsen", "Helsfyr"]) {
  assert(byName.has(name), `catalog missing shared-approach/overlay station ${name}`);
}
assert(!byName.has("Oslo S") && !byName.has("Sentrum"), "catalog must not carry the rail/marketing name family");
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
  assert(
    typeof station.stationGtfsId === "string" && station.stationGtfsId.startsWith("NSR:StopPlace:"),
    `${station.name} must have a real Entur NSR StopPlace id`
  );
}

// Jernbanetorget carries a second, physically distinct NSR StopPlace for the Vy/Flytoget
// rail cluster (Oslo S) — confirmed live 30 Aug 2026, doNotGroup.
const jernbanetorget = byName.get("Jernbanetorget");
assert(
  typeof jernbanetorget.railStationGtfsId === "string" &&
    jernbanetorget.railStationGtfsId.startsWith("NSR:StopPlace:") &&
    jernbanetorget.railStationGtfsId !== jernbanetorget.stationGtfsId,
  "Jernbanetorget must carry a distinct railStationGtfsId for the Oslo S / Vy / Flytoget cluster"
);
const nationaltheatret = byName.get("Nationaltheatret");
assert(!nationaltheatret.railStationGtfsId, "Nationaltheatret must not need a second stopPlace id — one stopPlace covers T-bane + rail live");

assert(resolveCatalogEntry(OSLO_HUB)?.name === OSLO_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("stortinget")?.name === OSLO_HUB, "resolveCatalogEntry must fold case");
assert(resolveCatalogEntry("Jernbanetorget")?.name === "Jernbanetorget", "resolveCatalogEntry must still resolve Jernbanetorget as a real station");
assert(resolveCatalogEntry("Oslo S") === null, "resolveCatalogEntry must reject the forbidden Oslo S rail-name token");
assert(resolveCatalogEntry("Sentrum") === null, "resolveCatalogEntry must reject the map-blob token Sentrum");
assert(resolveCatalogEntry("City") === null, "resolveCatalogEntry must reject the marketing token City");

// Direction model — line + terminus, never inbound/outbound vs City/Sentrum.
const hubLabels = marketingLabelsForStation(OSLO_HUB);
assert(hubLabels.includes("1 + Frognerseteren"), "hub must offer 1 + Frognerseteren");
assert(hubLabels.includes("1 + Bergkrystallen"), "hub must offer 1 + Bergkrystallen");
assert(hubLabels.includes("5 + Sognsvann"), "hub must offer 5 + Sognsvann");
assert(hubLabels.includes("5 + Vestli"), "hub must offer 5 + Vestli");
assert(!hubLabels.some((label) => /inbound|outbound|to city|sentrum|ringen/i.test(label)), "no inbound/outbound/to City/Sentrum/Ringen chips");

// R21 flag — only R21 + Moss ever appears, never R21 + Oslo S.
const jbLabels = marketingLabelsForStation("Jernbanetorget");
assert(jbLabels.includes("R21 + Moss"), "Jernbanetorget must offer R21 + Moss");
assert(!jbLabels.some((label) => /R21.*Oslo S/i.test(label)), "Jernbanetorget must never offer R21 + Oslo S");
assert(jbLabels.includes("FLY1 + Oslo Airport"), "Jernbanetorget must offer FLY1 + Oslo Airport");
assert(jbLabels.includes("RE10 + Drammen"), "Jernbanetorget must offer RE10 + Drammen");

assert(isOsloSNameFamily("Oslo S") === true, "Oslo S must be in the self-referential name family");
assert(isOsloSNameFamily("Moss") === false, "Moss must not be in the Oslo S name family");

// Entur destinationDisplay.frontText appends a via-stop for a fork leg — confirmed live.
assert(stripViaSuffix("Vestli via Majorstuen") === "Vestli", "stripViaSuffix must drop the via-stop");
assert(stripViaSuffix("Ringen via Majorstuen") === "Ringen", "stripViaSuffix must drop the via-stop");
assert(stripViaSuffix("Kolsås") === "Kolsås", "stripViaSuffix must pass through a plain headsign");
assert(mapOsloDestination("Vestli via Majorstuen", "4") === "4 + Vestli", "mapOsloDestination must combine line + stripped terminus");
assert(mapOsloDestination("Moss", "R21") === "R21 + Moss", "mapOsloDestination must combine line + stripped terminus for Vy");
assert(mapOsloDestination("Oslo Lufthavn", "FLY2") === "FLY2 + Oslo Lufthavn", "mapOsloDestination must pass through non-forbidden terminus text as-is");

// The doNotUse list forbids these as chip termini even though Jernbanetorget/Nationaltheatret
// stay real, boardable stations (see resolveCatalogEntry assertions above).
assert(isForbiddenTerminusToken("Jernbanetorget") === true, "Jernbanetorget must never be a direction chip terminus");
assert(isForbiddenTerminusToken("Nationaltheatret") === true, "Nationaltheatret must never be a direction chip terminus");
assert(isForbiddenCollapseName("Jernbanetorget") === false, "Jernbanetorget must stay resolvable as a station");
assert(isForbiddenCollapseName("Oslo S") === true, "Oslo S must never resolve as a station");

assert(foldKey("Stortinget") === foldKey("STORTINGET"), "foldKey must normalize case");
assert(foldKey("Ellingsrudåsen") === foldKey("ellingsrudasen"), "foldKey must normalize diacritics");

// classifyMapGroup — authority/mode/publicCode allow-lists, per operator (live-confirmed
// shape: Entur distinguishes by authority.id, not GTFS datasetId).
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "3", transportMode: "metro", authority: { id: "RUT:Authority:RUT" } } } }) === "T-bane",
  "classifyMapGroup must accept RUT metro line 3 as T-bane"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "R21", transportMode: "rail", authority: { id: "VYG:Authority:VY" } } } }) === "Vy",
  "classifyMapGroup must accept Vy R21 as Vy"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "FLY1", transportMode: "rail", authority: { id: "FLT:Authority:FLT" } } } }) === "Flytoget",
  "classifyMapGroup must accept Flytoget FLY1 as Flytoget"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "R22", transportMode: "rail", authority: { id: "VYG:Authority:VY" } } } }) === null,
  "classifyMapGroup must reject out-of-scope Vy line R22 (Rakkestad, seen live at Oslo S but not in v1 scope)"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "30", transportMode: "bus", authority: { id: "RUT:Authority:RUT" } } } }) === null,
  "classifyMapGroup must reject Ruter bus"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "13", transportMode: "tram", authority: { id: "RUT:Authority:RUT" } } } }) === null,
  "classifyMapGroup must reject Ruter tram"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "6", transportMode: "metro", authority: { id: "RUT:Authority:RUT" } } } }) === null,
  "classifyMapGroup must reject non-existent line 6"
);

console.log(
  "oslo-planned-gate: ok (planned/501, adapterReady, D1 pack + fixture, 101 T-bane stations, Vy/Flytoget scoped to 2 stations, R21+Moss-only, three-way doNotGroup, Perth/Stockholm/Göteborg/Malmö/Uppsala green)"
);
