/**
 * Stockholm stays planned. D1 pack in docs/stockholm-d1/. Perth live-gate untouched.
 * Usage: node qa/stockholm-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const D1_FILES = [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "qa-note.md",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(assertCityLive("perth")?.ok === true, "Perth must stay live");

const live = assertCityLive("stockholm");
assert(live?.ok === false, "assertCityLive(stockholm) must fail");
assert(live?.status === 501, "stockholm must be 501 planned");

const entry = getCity("stockholm");
assert(entry?.status === "planned", "stockholm registry status must be planned");
assert(entry?.adapterReady === true, "stockholm adapterReady must be true");
assert(entry?.timeZone === "Europe/Stockholm", "stockholm timezone must be Europe/Stockholm");
assert(entry?.agency === "SL", "Stockholm agency is SL");
assert(!(entry.envKeys ?? []).length, "SL Transport v1 has no API key");
assert(isMultiCity("stockholm") === false, "stockholm must not be in MULTI_CITY_IDS");

const d1Dir = join(ROOT, "docs/stockholm-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/stockholm-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/stockholm/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(d1Json === readFileSync(fixturePath, "utf8"), "fixture must be verbatim docs/stockholm-d1 copy");

const network = JSON.parse(d1Json);
assert(network.printedInnerCityNames?.lockMetro === "T-Centralen", "metro hub lock T-Centralen");
assert(network.printedInnerCityNames?.lockPendeltag === "Stockholm City", "pendeltåg hub lock Stockholm City");
assert(
  (network.printedInnerCityNames?.doNotCollapse ?? []).includes("Stockholms central"),
  "must not collapse Stockholms central"
);
assert(network.uniqueStationCount === 153, "D1 unique station count must be 153");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/stockholm/stations.json"), "utf8"));
const byName = new Map((catalog.stations ?? []).map((s) => [s.name, s]));
assert(byName.size === 153, "catalog must have 153 stations");
const tCentralen = byName.get("T-Centralen");
const stockholmCity = byName.get("Stockholm City");
assert(tCentralen?.siteId === 9001, "T-Centralen siteId 9001");
assert(stockholmCity?.siteId === 1080, "Stockholm City siteId 1080");
assert(tCentralen?.boardModes?.includes("METRO"), "T-Centralen boardModes METRO");
assert(stockholmCity?.boardModes?.includes("TRAIN"), "Stockholm City boardModes TRAIN");
assert(!byName.has("Stockholms central"), "Stockholms central must not be a v1 catalog hub");

for (const name of network.uniqueStations ?? []) {
  assert(byName.has(name), `catalog missing D1 station ${name}`);
}

const adapterSrc = readFileSync(join(ROOT, "lib/providers/stockholm.js"), "utf8");
assert(adapterSrc.includes("transport.integration.sl.se"), "adapter uses SL Transport");
assert(adapterSrc.includes("ALLOWED_LINE_CODES"), "adapter filters line codes");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "stockholm must not be in LIVE_CITY_IDS");

console.log(
  "stockholm-planned-gate: ok (planned/501, docs/stockholm-d1, hubs T-Centralen≠City≠central, 153 stations, Perth green)"
);
