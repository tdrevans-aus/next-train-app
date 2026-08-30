/**
 * Malmö stays planned (adapter wired, not flipped live). Perth stays live.
 * Usage: node qa/malmo-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { MALMO_HUB, resolveCatalogEntry, listCatalogStations } from "../lib/providers/malmo.js";
import { marketingLabelsForStation, foldKey } from "../lib/cities/malmo/marketing-directions.js";

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

const live = assertCityLive("malmo");
assert(live?.ok === false, "assertCityLive(malmo) must fail");
assert(live?.status === 501, "malmo must be 501 planned");

const entry = getCity("malmo");
assert(entry?.status === "planned", "malmo registry status must be planned");
assert(entry?.adapterReady === true, "malmo adapterReady must be true");
assert(entry?.displayName === "Malmö", "malmo display name must be Malmö");
assert(entry?.timeZone === "Europe/Stockholm", "malmo timezone must be Europe/Stockholm");
assert(entry?.agency === "Skånetrafiken / Pågatågen", "malmo agency is Skånetrafiken / Pågatågen");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "malmo needs TRAFIKLAB_API_KEY");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY_RT"), "malmo needs TRAFIKLAB_API_KEY_RT");
assert(entry.modes?.includes("train"), "malmo modes v1 are train");
assert(!entry.modes?.includes("tram"), "no active light rail in v1");
assert(!entry.modes?.includes("bus"), "no bus in v1");
assert(CITIES.filter((city) => city.id === "malmo").length === 1, "malmo must appear once in the registry");

const d1Dir = join(ROOT, "docs/malmo-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/malmo-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/malmo/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/malmo/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/malmo/published-network.json must be a verbatim copy of docs/malmo-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "malmo", "D1 city id is malmo");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === MALMO_HUB, `D1 lock must be ${MALMO_HUB}`);
assert(network.lines.length === 10, "D1 must carry all 10 Pågatågen corridors");

const stations = listCatalogStations();
assert(stations.length === 84, `catalog must have 84 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(MALMO_HUB), `catalog must lock ${MALMO_HUB}`);
for (const name of ["Triangeln", "Hyllie", "Svågertorp", "Persborg", "Rosengård", "Östervärn", "Burlöv", "Oxie"]) {
  assert(byName.has(name), `catalog missing ring/doNotGroup station ${name}`);
}
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
}
assert(!byName.has("Malmö Central") && !byName.has("Malmö Centralstation"), "catalog must not carry feed/central names");

assert(resolveCatalogEntry(MALMO_HUB)?.name === MALMO_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("malmö c")?.name === MALMO_HUB, "resolveCatalogEntry must fold case/diacritics");
assert(resolveCatalogEntry("Malmö Centralstation") === null, "resolveCatalogEntry must not collapse the feed rename onto the hub");
assert(resolveCatalogEntry("Öresundståg") === null, "resolveCatalogEntry must reject the forbidden Öresundståg token");

const hubLabels = marketingLabelsForStation(MALMO_HUB);
assert(hubLabels.some((label) => /^Malmöringen mot Kävlinge$/.test(label)), "hub must offer Malmöringen mot Kävlinge");
assert(hubLabels.some((label) => /^Malmöring\. v /.test(label)), "hub must offer the abbreviated ring via-chip");
assert(hubLabels.some((label) => /^Pågatågen mot /.test(label)), "hub must offer plain Pågatågen chips");
assert(!hubLabels.some((label) => /inbound|outbound|to city|malmö central/i.test(label)), "no inbound/outbound/to City/raw headsign chips");

assert(foldKey("Malmö C") === foldKey("MALMÖ C"), "foldKey must normalize case");
assert(foldKey("Malmö C") === foldKey("malmo c"), "foldKey must normalize diacritics");

console.log(
  "malmo-planned-gate: ok (planned/501, adapterReady, D1 pack + fixture, 84 stations, Malmöringen + Pågatågen chips, Perth/Stockholm/Göteborg green)"
);
