/**
 * Uppsala stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/uppsala-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { UPPSALA_HUB, resolveCatalogEntry, listCatalogStations } from "../lib/providers/uppsala.js";
import { marketingLabelsForStation, foldKey, mapUppsalaDestination } from "../lib/cities/uppsala/marketing-directions.js";

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

const live = assertCityLive("uppsala");
assert(live?.ok === false, "assertCityLive(uppsala) must fail");
assert(live?.status === 501, "uppsala must be 501 planned");

const entry = getCity("uppsala");
assert(entry?.status === "planned", "uppsala registry status must be planned");
assert(entry?.adapterReady === true, "uppsala adapterReady must be true");
assert(entry?.displayName === "Uppsala", "uppsala display name must be Uppsala");
assert(entry?.timeZone === "Europe/Stockholm", "uppsala timezone must be Europe/Stockholm");
assert(entry?.agency === "Mälardalstrafik (Mälartåg)", "uppsala agency is Mälardalstrafik (Mälartåg)");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "uppsala needs TRAFIKLAB_API_KEY");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY_RT"), "uppsala needs TRAFIKLAB_API_KEY_RT");
assert(entry.modes?.includes("train"), "uppsala modes v1 are train");
assert(!entry.modes?.includes("bus"), "no UL buses in v1");
assert(CITIES.filter((city) => city.id === "uppsala").length === 1, "uppsala must appear once in the registry");
// Uppsala is its own separate planned city — must not be merged into stockholm.
assert(getCity("uppsala").agency !== getCity("stockholm").agency, "uppsala (Mälardalstrafik) must not share stockholm's SL agency");

const d1Dir = join(ROOT, "docs/uppsala-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/uppsala-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/uppsala/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/uppsala/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/uppsala/published-network.json must be a verbatim copy of docs/uppsala-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "uppsala", "D1 city id is uppsala");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === UPPSALA_HUB, `D1 lock must be ${UPPSALA_HUB}`);
assert(network.lines.length === 4, "D1 must carry all 4 Mälartåg corridors this feed proves");

const stations = listCatalogStations();
assert(stations.length === 19, `catalog must have 19 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(UPPSALA_HUB), `catalog must lock ${UPPSALA_HUB}`);
for (const name of ["Knivsta", "Arlanda C", "Märsta", "Sala", "Gävle C"]) {
  assert(byName.has(name), `catalog missing station ${name}`);
}
for (const name of ["Västerås", "Eskilstuna", "Stockholm Central", "Flemingsberg", "Örebro"]) {
  assert(!byName.has(name), `catalog must not invent out-of-feed station ${name}`);
}
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
}

assert(resolveCatalogEntry(UPPSALA_HUB)?.name === UPPSALA_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("uppsala c")?.name === UPPSALA_HUB, "resolveCatalogEntry must fold case/diacritics");
assert(resolveCatalogEntry("Uppsala Centralstation") === null, "resolveCatalogEntry must reject the forbidden feed/central name");

// Direction-collapse hazard: branch must resolve from stop_headsign, never direction_id.
assert(
  mapUppsalaDestination({ destination: "Uppsala C", stopHeadsign: "Stockholm Central" }) === "Mälartåg mot Stockholm C",
  "stop_headsign 'Stockholm Central' must map to the abbreviated far end"
);
assert(
  mapUppsalaDestination({ destination: "Uppsala C", stopHeadsign: "Flemingsberg" }) === "Mälartåg mot Flemingsberg",
  "Flemingsberg is a distinct real destination on the same route_id/direction_id as Stockholm Central"
);
assert(
  mapUppsalaDestination({ destination: "Uppsala C", stopHeadsign: "" }) === "Mälartåg mot Uppsala C",
  "inbound direction_id=0 headsign 'Uppsala C' is clean (no self-reference hazard)"
);
assert(
  mapUppsalaDestination({ destination: "Gävle Central" }) === "Mälartåg mot Gävle C",
  "feed stop_name 'Gävle Central' must rename to printed 'Gävle C'"
);

const hubLabels = marketingLabelsForStation(UPPSALA_HUB);
assert(hubLabels.some((label) => /^Mälartåg mot Gävle C$/.test(label)), "hub must offer the Gävle line chip");
assert(hubLabels.some((label) => /^Mälartåg mot Sala$/.test(label)), "hub must offer the Sala line chip");
assert(hubLabels.some((label) => /^Mälartåg mot Stockholm C$/.test(label)), "hub must offer the Märsta/Arlanda beyond-feed far end");
assert(hubLabels.some((label) => /^Mälartåg mot Flemingsberg$/.test(label)), "hub must offer the Arlanda-branch Flemingsberg far end");
assert(!hubLabels.some((label) => /inbound|outbound|to city/i.test(label)), "no inbound/outbound/to City chips");

const lineMap = JSON.parse(readFileSync(join(ROOT, "lib/cities/uppsala/line-map.json"), "utf8"));
assert(lineMap.timeZone === "Europe/Stockholm" && lineMap.dst === true, "line-map must record DST");
assert(JSON.stringify(lineMap.shortTurnGroups ?? {}) === "{}", "shortTurnGroups must stay empty");
const grouped = (lineMap.doNotGroup ?? []).map((row) => `${row.a}::${row.b}`);
assert(grouped.some((row) => row.includes("Uppsala C")), "doNotGroup must cover Uppsala C");
assert(grouped.some((row) => row.includes("Knivsta")), "doNotGroup must cover Knivsta");
assert(grouped.some((row) => row.includes("Arlanda C")), "doNotGroup must cover Arlanda C (not just the hub)");

assert(foldKey("Uppsala C") === foldKey("UPPSALA C"), "foldKey must normalize case");
assert(foldKey("Uppsala C") === foldKey("uppsala c"), "foldKey must normalize diacritics/case");

console.log(
  "uppsala-planned-gate: ok (planned/501, adapterReady, D1 pack + fixture, 19 stations, stop_headsign branch resolution, Perth/Stockholm/Göteborg green)"
);
