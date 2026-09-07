/**
 * Wellington retired from release 1, 7 Sep 2026 (Tim, docs/jim-brief-release-1-scope-cut.md):
 * static-join city outside launch markets. Adapter + catalog kept, status "retired",
 * 501 from assertCityLive, not in any live list, not in the picker. Auckland also retired.
 * MEL live terminus is Western Hutt Station while Melling Station is closed — do not
 * invent Melling on the kept catalog.
 * Usage: node qa/wellington-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import { HUB, MARKETING_ENDS } from "../lib/cities/wellington/marketing-directions.js";
import { fetchStationBoard } from "../lib/providers/wellington.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const retired = assertCityLive("wellington");
assert(retired?.ok === false, "assertCityLive(wellington) must fail now that it is retired");
assert(retired?.status === 501, "wellington must 501 like any non-live city");
assert(getCity("wellington")?.status === "retired", "wellington registry status must be retired");
assert(getCity("wellington")?.adapterReady === true, "wellington adapterReady stays true — adapter kept");
assert(/retired from release 1/i.test(getCity("wellington")?.notes ?? ""), "notes must record the retirement");
assert(isMultiCity("wellington") === false, "wellington must not be in MULTI_CITY_IDS");
assert(!getCity("nz"), "city=nz must not exist");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("auckland")?.ok === false, "Auckland is also retired");
assert(typeof fetchStationBoard === "function", "wellington adapter module must still load");

// Picker: must not list Wellington or New Zealand at all — no comingSoon flag either.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(!/id:\s*"wellington"/.test(citySession), "wellington must not appear in the picker at all");
assert(!/id:\s*"nz"/.test(citySession), "New Zealand must disappear from the picker once empty");
assert(!/MULTI_CITY_IDS = \[[^\]]*wellington/.test(citySession), "wellington must not be in city-session MULTI_CITY_IDS");
assert(!/wellington:\s*\{/.test(citySession.match(/CITY_BOUNDS = \{[\s\S]*?\n  \};/)?.[0] ?? ""), "wellington must not resolve GPS via CITY_BOUNDS");

// Nearby/GPS + live lists in app.js.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*wellington/.test(appJs), "wellington must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*wellington/.test(appJs), "wellington must not be in NEARBY_MULTI_CITY_IDS");

// Dogfood mount map.
const dogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*wellington/.test(dogfood), "wellington must not be in brisbane-dogfood MULTI_CITY_IDS");
assert(!/available:\s*\{[^}]*wellington/.test(dogfood), "wellington must not be in the brisbane-dogfood available map");

// Persisted journeys: an old saved Wellington journey must degrade like an unknown city, not crash.
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
assert(
  !/PERSISTED_CITY_IDS = new Set\(\[[\s\S]*?"wellington"/.test(journeyModel),
  "wellington must be dropped from PERSISTED_CITY_IDS so old saved state degrades safely"
);
assert(
  !/PERSISTED_COUNTRY_IDS = new Set\(\[[^\]]*"nz"/.test(journeyModel),
  "nz must be dropped from PERSISTED_COUNTRY_IDS"
);

// Adapter + catalog data survives intact — this is retirement, not deletion.
assert(HUB === "Wellington Station", "hub lock is still Wellington Station (adapter kept)");
assert(MARKETING_ENDS.MEL.includes("Western Hutt Station"), "MEL marketing end is still Western Hutt Station");
assert(!MARKETING_ENDS.MEL.includes("Melling Station"), "closed Melling Station must not be invented");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/wellington/stations.json"), "utf8"));
assert(!(catalog.stations ?? []).some((row) => /^melling station$/i.test(row.name)), "catalog must not invent Melling Station");

console.log(
  "wellington-dogfood-gate: ok (retired from release 1, 501, not in any live/picker list, adapter + catalog kept, MEL→Western Hutt)"
);
