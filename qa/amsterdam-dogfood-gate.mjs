/**
 * Amsterdam retired from release 1, 7 Sep 2026 (Tim, docs/jim-brief-release-1-scope-cut.md):
 * static-join city outside launch markets. Adapter + catalog kept, status "retired",
 * 501 from assertCityLive, not in any live list, not in the picker. Rotterdam also retired
 * (Netherlands is out entirely). The live OVapi GTFS-RT join test that used to run here is
 * dropped with the retirement — it exercised a live-network fixture fetch that is no longer
 * meaningful to verify for a city no rider can reach.
 * Usage: node qa/amsterdam-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation, HUB } from "../lib/cities/amsterdam/marketing-directions.js";
import { fetchStationBoard } from "../lib/providers/amsterdam.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const retired = assertCityLive("amsterdam");
assert(retired?.ok === false, "assertCityLive(amsterdam) must fail now that it is retired");
assert(retired?.status === 501, "amsterdam must 501 like any non-live city");
assert(getCity("amsterdam")?.status === "retired", "amsterdam registry status must be retired");
assert(getCity("amsterdam")?.adapterReady === true, "amsterdam adapterReady stays true — adapter kept");
assert(/retired from release 1/i.test(getCity("amsterdam")?.notes ?? ""), "notes must record the retirement");
assert(isMultiCity("amsterdam") === false, "amsterdam must not be in MULTI_CITY_IDS");
assert(!getCity("nl"), "city=nl must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("rotterdam")?.ok === false, "Rotterdam is also retired");
assert(typeof fetchStationBoard === "function", "amsterdam adapter module must still load");

// Picker: must not list Amsterdam or Netherlands at all — no comingSoon flag either.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(!/id:\s*"amsterdam"/.test(citySession), "amsterdam must not appear in the picker at all");
assert(!/id:\s*"nl"/.test(citySession), "Netherlands must disappear from the picker once empty");
assert(!/MULTI_CITY_IDS = \[[^\]]*amsterdam/.test(citySession), "amsterdam must not be in city-session MULTI_CITY_IDS");
assert(!/amsterdam:\s*\{/.test(citySession.match(/CITY_BOUNDS = \{[\s\S]*?\n  \};/)?.[0] ?? ""), "amsterdam must not resolve GPS via CITY_BOUNDS");

// Nearby/GPS + live lists in app.js.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*amsterdam/.test(appJs), "amsterdam must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*amsterdam/.test(appJs), "amsterdam must not be in NEARBY_MULTI_CITY_IDS");

// Dogfood mount map.
const dogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*amsterdam/.test(dogfood), "amsterdam must not be in brisbane-dogfood MULTI_CITY_IDS");
assert(!/available:\s*\{[^}]*amsterdam/.test(dogfood), "amsterdam must not be in the brisbane-dogfood available map");

// Persisted journeys: an old saved Amsterdam journey must degrade like an unknown city, not crash.
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
assert(
  !/PERSISTED_CITY_IDS = new Set\(\[[\s\S]*?"amsterdam"/.test(journeyModel),
  "amsterdam must be dropped from PERSISTED_CITY_IDS so old saved state degrades safely"
);
assert(
  !/PERSISTED_COUNTRY_IDS = new Set\(\[[^\]]*"nl"/.test(journeyModel),
  "nl must be dropped from PERSISTED_COUNTRY_IDS"
);

// Adapter + catalog data survives intact — this is retirement, not deletion.
const hub = marketingLabelsForStation(HUB);
assert(hub.includes("M51 + Isolatorweg"), "Hub must still offer M51 + Isolatorweg (adapter kept)");
assert(hub.includes("M52 + Noord"), "Hub must still offer M52 + Noord (adapter kept)");
assert(hub.includes("M54 + Gein"), "Hub must still offer M54 + Gein (adapter kept)");

console.log(
  "amsterdam-dogfood-gate: ok (retired from release 1, 501, not in any live/picker list, adapter + catalog kept)"
);
