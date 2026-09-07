/**
 * Rotterdam retired from release 1, 7 Sep 2026 (Tim, docs/jim-brief-release-1-scope-cut.md):
 * static-join city outside launch markets. Adapter + catalog kept, status "retired",
 * 501 from assertCityLive, not in any live list, not in the picker. Amsterdam also retired
 * (Netherlands is out entirely). The live OVapi GTFS-RT join test that used to run here is
 * dropped with the retirement — it exercised a live-network fixture fetch that is no longer
 * meaningful to verify for a city no rider can reach.
 * Usage: node qa/rotterdam-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/rotterdam/marketing-directions.js";
import { fetchStationBoard } from "../lib/providers/rotterdam.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const retired = assertCityLive("rotterdam");
assert(retired?.ok === false, "assertCityLive(rotterdam) must fail now that it is retired");
assert(retired?.status === 501, "rotterdam must 501 like any non-live city");
assert(getCity("rotterdam")?.status === "retired", "rotterdam registry status must be retired");
assert(getCity("rotterdam")?.adapterReady === true, "rotterdam adapterReady stays true — adapter kept");
assert(/retired from release 1/i.test(getCity("rotterdam")?.notes ?? ""), "notes must record the retirement");
assert(isMultiCity("rotterdam") === false, "rotterdam must not be in MULTI_CITY_IDS");
assert(!getCity("nl"), "city=nl must not exist");
assert(!getCity("the-hague"), "the-hague must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("amsterdam")?.ok === false, "Amsterdam is also retired");
assert(assertCityLive("sydney")?.ok === true, "Sydney stays live");
assert(typeof fetchStationBoard === "function", "rotterdam adapter module must still load");

// Picker: must not list Rotterdam or Netherlands at all — no comingSoon flag either.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(!/id:\s*"rotterdam"/.test(citySession), "rotterdam must not appear in the picker at all");
assert(!/id:\s*"nl"/.test(citySession), "Netherlands must disappear from the picker once empty");
assert(!/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(citySession), "rotterdam must not be in city-session MULTI_CITY_IDS");
assert(!/rotterdam:\s*\{/.test(citySession.match(/CITY_BOUNDS = \{[\s\S]*?\n  \};/)?.[0] ?? ""), "rotterdam must not resolve GPS via CITY_BOUNDS");

// Nearby/GPS + live lists in app.js.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*rotterdam/.test(appJs), "rotterdam must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(appJs), "rotterdam must not be in NEARBY_MULTI_CITY_IDS");

// Dogfood mount map.
const dogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(dogfood), "rotterdam must not be in brisbane-dogfood MULTI_CITY_IDS");
assert(!/available:\s*\{[^}]*rotterdam/.test(dogfood), "rotterdam must not be in the brisbane-dogfood available map");

// Persisted journeys: an old saved Rotterdam journey must degrade like an unknown city, not crash.
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
assert(
  !/PERSISTED_CITY_IDS = new Set\(\[[\s\S]*?"rotterdam"/.test(journeyModel),
  "rotterdam must be dropped from PERSISTED_CITY_IDS so old saved state degrades safely"
);
assert(
  !/PERSISTED_COUNTRY_IDS = new Set\(\[[^\]]*"nl"/.test(journeyModel),
  "nl must be dropped from PERSISTED_COUNTRY_IDS"
);

// Adapter + catalog data survives intact — this is retirement, not deletion.
const hub = marketingLabelsForStation(HUB);
assert(HUB === "Beurs", "hub lock is still Beurs (adapter kept)");
assert(hub.includes("Metro A + Binnenhof"), "Hub must still offer Metro A + Binnenhof (adapter kept)");
assert(hub.includes("Metro E + Den Haag Centraal"), "Hub must still offer Metro E + Den Haag Centraal (adapter kept)");

console.log(
  "rotterdam-dogfood-gate: ok (retired from release 1, 501, not in any live/picker list, adapter + catalog kept)"
);
