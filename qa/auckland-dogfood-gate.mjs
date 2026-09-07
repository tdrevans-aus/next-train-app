/**
 * Auckland retired from release 1, 7 Sep 2026 (Tim, docs/jim-brief-release-1-scope-cut.md):
 * static-join city outside launch markets. Adapter + catalog kept, status "retired",
 * 501 from assertCityLive, not in any live list, not in the picker. Wellington also retired.
 * Usage: node qa/auckland-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/auckland/marketing-directions.js";
import { fetchStationBoard } from "../lib/providers/auckland.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const retired = assertCityLive("auckland");
assert(retired?.ok === false, "assertCityLive(auckland) must fail now that it is retired");
assert(retired?.status === 501, "auckland must 501 like any non-live city");
assert(getCity("auckland")?.status === "retired", "auckland registry status must be retired");
assert(getCity("auckland")?.adapterReady === true, "auckland adapterReady stays true — adapter kept");
assert(/retired from release 1/i.test(getCity("auckland")?.notes ?? ""), "notes must record the retirement");
assert(isMultiCity("auckland") === false, "auckland must not be in MULTI_CITY_IDS");
assert(!getCity("nz"), "city=nz must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("wellington")?.ok === false, "Wellington is also retired");
assert(typeof fetchStationBoard === "function", "auckland adapter module must still load");

// Picker: must not list Auckland or New Zealand at all — no comingSoon flag either.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(!/id:\s*"auckland"/.test(citySession), "auckland must not appear in the picker at all");
assert(!/id:\s*"nz"/.test(citySession), "New Zealand must disappear from the picker once empty");
assert(!/MULTI_CITY_IDS = \[[^\]]*auckland/.test(citySession), "auckland must not be in city-session MULTI_CITY_IDS");
assert(!/auckland:\s*\{/.test(citySession.match(/CITY_BOUNDS = \{[\s\S]*?\n  \};/)?.[0] ?? ""), "auckland must not resolve GPS via CITY_BOUNDS");

// Nearby/GPS + live lists in app.js.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*auckland/.test(appJs), "auckland must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*auckland/.test(appJs), "auckland must not be in NEARBY_MULTI_CITY_IDS");

// Dogfood mount map.
const dogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*auckland/.test(dogfood), "auckland must not be in brisbane-dogfood MULTI_CITY_IDS");
assert(!/available:\s*\{[^}]*auckland/.test(dogfood), "auckland must not be in the brisbane-dogfood available map");

// Persisted journeys: an old saved Auckland journey must degrade like an unknown city, not crash.
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
assert(
  !/PERSISTED_CITY_IDS = new Set\(\[[\s\S]*?"auckland"/.test(journeyModel),
  "auckland must be dropped from PERSISTED_CITY_IDS so old saved state degrades safely"
);
assert(
  !/PERSISTED_COUNTRY_IDS = new Set\(\[[^\]]*"nz"/.test(journeyModel),
  "nz must be dropped from PERSISTED_COUNTRY_IDS"
);

// Adapter + catalog data survives intact — this is retirement, not deletion.
const hub = marketingLabelsForStation(HUB);
assert(hub.includes("Eastern Line Manukau"), "Hub must still offer Eastern Line Manukau (adapter kept)");
assert(hub.includes("Southern Line Pukekohe"), "Hub must still offer Southern Line Pukekohe (adapter kept)");
assert(hub.includes("Western Line Swanson"), "Hub must still offer Western Line Swanson (adapter kept)");

console.log(
  "auckland-dogfood-gate: ok (retired from release 1, 501, not in any live/picker list, adapter + catalog kept)"
);
