/**
 * Helsinki stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/helsinki-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { HELSINKI_HUB, resolveCatalogEntry, listCatalogStations } from "../lib/providers/helsinki.js";
import {
  marketingLabelsForStation,
  mapHelsinkiDestination,
  stripViaSuffix,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenTerminusToken,
} from "../lib/cities/helsinki/marketing-directions.js";

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

const live = assertCityLive("helsinki");
assert(live?.ok === false, "assertCityLive(helsinki) must fail");
assert(live?.status === 501, "helsinki must be 501 planned");

const entry = getCity("helsinki");
assert(entry?.status === "planned", "helsinki registry status must be planned");
assert(entry?.adapterReady === true, "helsinki adapterReady must be true");
assert(entry?.displayName === "Helsinki", "helsinki display name must be Helsinki");
assert(entry?.timeZone === "Europe/Helsinki", "helsinki timezone must be Europe/Helsinki");
assert(entry?.agency === "HKL / HSL", "helsinki agency is HKL / HSL");
assert((entry.envKeys ?? []).includes("DIGITRANSIT_SUBSCRIPTION_KEY"), "helsinki needs DIGITRANSIT_SUBSCRIPTION_KEY");
assert(entry.modes?.includes("metro"), "helsinki modes v1 are metro");
assert(!entry.modes?.includes("tram"), "no tram in v1");
assert(!entry.modes?.includes("bus"), "no bus in v1");
assert(!entry.modes?.includes("train"), "no HSL/VR commuter rail in v1 (metro only)");
assert(CITIES.filter((city) => city.id === "helsinki").length === 1, "helsinki must appear once in the registry");
assert(!getCity("finland"), "must not be registered as city=finland");

const d1Dir = join(ROOT, "docs/helsinki-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/helsinki-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/helsinki/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/helsinki/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/helsinki/published-network.json must be a verbatim copy of docs/helsinki-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "helsinki", "D1 city id is helsinki");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === HELSINKI_HUB, `D1 lock must be ${HELSINKI_HUB}`);
assert(network.lines.length === 2, "D1 must carry exactly M1 and M2 — no M3");
assert(
  network.lines.every((line) => ["M1", "M2"].includes(line.id)),
  "D1 lines must be only M1 and M2"
);

const stations = listCatalogStations();
assert(stations.length === 30, `catalog must have 30 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(HELSINKI_HUB), `catalog must lock ${HELSINKI_HUB}`);
// Shared approaches and the former west end all stay real, boardable catalog entries.
for (const name of ["Kamppi", "Helsingin yliopisto", "Matinkylä", "Tapiola", "Itäkeskus"]) {
  assert(byName.has(name), `catalog missing shared-approach station ${name}`);
}
assert(!byName.has("Pasila"), "Pasila has no metro and must never be in the catalog");
assert(!byName.has("Helsinki Central") && !byName.has("Päärautatieasema"), "catalog must not carry the VR/commuter rail name family");
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
  assert(typeof station.stationGtfsId === "string" && station.stationGtfsId.startsWith("HSL:"), `${station.name} must have a real Digitransit stationGtfsId`);
}

assert(resolveCatalogEntry(HELSINKI_HUB)?.name === HELSINKI_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("rautatientori")?.name === HELSINKI_HUB, "resolveCatalogEntry must fold case");
assert(resolveCatalogEntry("Kamppi")?.name === "Kamppi", "resolveCatalogEntry must still resolve Kamppi as a real station (doNotUse is a terminus-token rule, not a station block)");
assert(resolveCatalogEntry("Helsingin yliopisto")?.name === "Helsingin yliopisto", "resolveCatalogEntry must still resolve Helsingin yliopisto as a real station");
assert(resolveCatalogEntry("Helsinki Central") === null, "resolveCatalogEntry must reject the forbidden Helsinki Central token");
assert(resolveCatalogEntry("Helsingin keskusta") === null, "resolveCatalogEntry must reject the map-blob token Helsingin keskusta");
assert(resolveCatalogEntry("Päärautatieasema") === null, "resolveCatalogEntry must reject the railway-name token");

// Direction model — line + terminus, never inbound/outbound vs City.
const hubLabels = marketingLabelsForStation(HELSINKI_HUB);
assert(hubLabels.includes("M1 + Kivenlahti"), "hub must offer M1 + Kivenlahti");
assert(hubLabels.includes("M1 + Vuosaari"), "hub must offer M1 + Vuosaari");
assert(hubLabels.includes("M2 + Tapiola"), "hub must offer M2 + Tapiola");
assert(hubLabels.includes("M2 + Mellunmäki"), "hub must offer M2 + Mellunmäki");
assert(hubLabels.length === 4, `hub must offer exactly 4 chips, got ${hubLabels.length}`);
assert(!hubLabels.some((label) => /inbound|outbound|to city|helsingin keskusta|m3/i.test(label)), "no inbound/outbound/to City/M3 chips");

const tapiolaLabels = marketingLabelsForStation("Tapiola");
assert(tapiolaLabels.includes("M1 + Kivenlahti"), "Tapiola must offer M1 + Kivenlahti (M1 continues west)");
assert(tapiolaLabels.includes("M1 + Vuosaari"), "Tapiola must offer M1 + Vuosaari");
assert(tapiolaLabels.includes("M2 + Mellunmäki"), "Tapiola must offer M2 + Mellunmäki");
assert(!tapiolaLabels.includes("M2 + Tapiola"), "Tapiola must not offer itself as a terminus chip");

// Digitransit headsigns append a via-stop for fork legs — confirmed live 30 Aug 2026.
assert(stripViaSuffix("Kivenlahti via Tapiola") === "Kivenlahti", "stripViaSuffix must drop the via-stop");
assert(stripViaSuffix("Vuosaari via Itäkeskus") === "Vuosaari", "stripViaSuffix must drop the via-stop");
assert(stripViaSuffix("Tapiola") === "Tapiola", "stripViaSuffix must pass through a plain headsign");
assert(mapHelsinkiDestination("Kivenlahti via Tapiola", "M1") === "M1 + Kivenlahti", "mapHelsinkiDestination must combine line + stripped terminus");
assert(mapHelsinkiDestination("Mellunmäki via Itäkeskus", "M2") === "M2 + Mellunmäki", "mapHelsinkiDestination must combine line + stripped terminus");

// The doNotUse list forbids these as chip termini even though Kamppi/Helsingin yliopisto/
// Matinkylä stay real, boardable stations (see resolveCatalogEntry assertions above).
assert(isForbiddenTerminusToken("Kamppi") === true, "Kamppi must never be a direction chip terminus");
assert(isForbiddenTerminusToken("Helsingin yliopisto") === true, "Helsingin yliopisto must never be a direction chip terminus");
assert(isForbiddenTerminusToken("Matinkylä") === true, "Matinkylä must never be a direction chip terminus");
assert(isForbiddenCollapseName("Kamppi") === false, "Kamppi must stay resolvable as a station");
assert(isForbiddenCollapseName("Helsinki Central") === true, "Helsinki Central must never resolve as a station");

assert(foldKey("Rautatientori") === foldKey("RAUTATIENTORI"), "foldKey must normalize case");
assert(foldKey("Mellunmäki") === foldKey("mellunmaki"), "foldKey must normalize diacritics");

console.log(
  "helsinki-planned-gate: ok (planned/501, adapterReady, D1 pack + fixture, 30 stations, M1/M2 line+terminus chips, Rautatientori hub, Perth/Stockholm/Göteborg/Malmö/Uppsala green)"
);
