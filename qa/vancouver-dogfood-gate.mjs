/**
 * Vancouver retired from release 1, 7 Sep 2026 (Tim, docs/jim-brief-release-1-scope-cut.md):
 * static-join city outside launch markets. Adapter + catalog kept, status "retired",
 * 501 from assertCityLive, not in any live list, not in the picker.
 * Usage: node qa/vancouver-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/vancouver/marketing-directions.js";
import { fetchStationBoard } from "../lib/providers/vancouver.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const retired = assertCityLive("vancouver");
assert(retired?.ok === false, "assertCityLive(vancouver) must fail now that it is retired");
assert(retired?.status === 501, "vancouver must 501 like any non-live city");
assert(getCity("vancouver")?.status === "retired", "vancouver registry status must be retired");
assert(getCity("vancouver")?.adapterReady === true, "vancouver adapterReady stays true — adapter kept");
assert(/retired from release 1/i.test(getCity("vancouver")?.notes ?? ""), "notes must record the retirement");
assert(isMultiCity("vancouver") === false, "vancouver must not be in MULTI_CITY_IDS");
assert(!getCity("canada"), "city=canada must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(typeof fetchStationBoard === "function", "vancouver adapter module must still load");

// Picker: must not list Vancouver or Canada at all — no comingSoon flag either.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(!/id:\s*"vancouver"/.test(citySession), "vancouver must not appear in the picker at all");
assert(!/id:\s*"ca"/.test(citySession), "Canada must disappear from the picker once empty");
assert(!/MULTI_CITY_IDS = \[[^\]]*vancouver/.test(citySession), "vancouver must not be in city-session MULTI_CITY_IDS");
assert(!/vancouver:\s*\{/.test(citySession.match(/CITY_BOUNDS = \{[\s\S]*?\n  \};/)?.[0] ?? ""), "vancouver must not resolve GPS via CITY_BOUNDS");

// Nearby/GPS + live lists in app.js.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*vancouver/.test(appJs), "vancouver must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*vancouver/.test(appJs), "vancouver must not be in NEARBY_MULTI_CITY_IDS");

// Dogfood mount map.
const dogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*vancouver/.test(dogfood), "vancouver must not be in brisbane-dogfood MULTI_CITY_IDS");
assert(!/available:\s*\{[^}]*vancouver/.test(dogfood), "vancouver must not be in the brisbane-dogfood available map");

// Persisted journeys: an old saved Vancouver journey must degrade like an unknown city, not crash.
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
assert(
  !/PERSISTED_CITY_IDS = new Set\(\[[\s\S]*?"vancouver"/.test(journeyModel),
  "vancouver must be dropped from PERSISTED_CITY_IDS so old saved state degrades safely"
);
assert(
  !/PERSISTED_COUNTRY_IDS = new Set\(\[[^\]]*"ca"/.test(journeyModel),
  "ca must be dropped from PERSISTED_COUNTRY_IDS"
);

// Adapter + catalog data survives intact — this is retirement, not deletion.
const hub = marketingLabelsForStation(HUB);
assert(hub.includes("Expo Line King George"), "Hub must still offer Expo Line King George (adapter kept)");
assert(hub.includes("Canada Line YVR–Airport"), "Hub must still offer Canada Line YVR–Airport (adapter kept)");

console.log(
  "vancouver-dogfood-gate: ok (retired from release 1, 501, not in any live/picker list, adapter + catalog kept)"
);
