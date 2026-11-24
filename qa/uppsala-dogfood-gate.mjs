/**
 * Uppsala retired 24 Nov 2026 (Tim, "take it out"; docs/jim-brief-uppsala-retire.md): the Trafiklab
 * regional `ul` static feed has had no rail routes since about 22 Nov 2026 and no other regional feed
 * carries Mälartåg/SL-pendeln. Same pattern as qa/auckland-dogfood-gate.mjs: adapter, catalog, D1 pack
 * and dispatch code kept; status "retired", 501 from assertCityLive, not in any live list, not in the
 * picker/manifest. Stockholm and Malmö stay live, so Sweden stays in the picker.
 * Bring-back: rail routes return to `ul` -> refresh snapshot -> re-flip and restore the live-state asserts.
 * Usage: node qa/uppsala-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity, MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";
import { buildCityManifest } from "../lib/cities/city-manifest.js";
import { CITY_COUNTRY } from "../lib/cities/country-regions.js";
import { REFRESH_UNITS } from "../scripts/refresh-hand-published-gtfs.mjs";
import { UPPSALA_HUB } from "../lib/cities/uppsala/marketing-directions.js";
import { listUppsalaDogfoodStations } from "../lib/cities/uppsala/dogfood-next-train.js";
import { fetchStationBoard } from "../lib/providers/uppsala.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Registry: retired, 501, adapter kept, reason recorded.
const retired = assertCityLive("uppsala");
assert(retired?.ok === false, "assertCityLive(uppsala) must fail now that it is retired");
assert(retired?.status === 501, "uppsala must 501 like any non-live city");
const entry = getCity("uppsala");
assert(entry?.status === "retired", "uppsala registry status must be retired");
assert(entry?.adapterReady === true, "uppsala adapterReady stays true — adapter kept");
assert(/Retired 24 Nov 2026/.test(entry?.notes ?? ""), "notes must record the dated retirement");
assert(/no rail routes since about 22 Nov 2026/.test(entry?.notes ?? ""), "notes must record the reason");
assert(/re-flip/.test(entry?.notes ?? ""), "notes must record what brings it back");

// Not in any live list.
assert(isMultiCity("uppsala") === false, "uppsala must not be in MULTI_CITY_IDS");
assert(!MULTI_CITY_IDS.includes("uppsala"), "uppsala must not be in MULTI_CITY_IDS");
const manifest = buildCityManifest();
assert(!manifest.cities.some((c) => c.id === "uppsala"), "uppsala must not be in the /api/cities manifest");
const se = manifest.countries.find((c) => c.id === "se");
assert(se, "Sweden must stay in the picker (Stockholm, Malmö live)");
assert(!se.regions.some((r) => r.id === "uppsala"), "uppsala must not be a Sweden picker region");
assert(se.regions.some((r) => r.id === "stockholm") && se.regions.some((r) => r.id === "malmo"), "Stockholm and Malmö stay in the Sweden picker");
assert(!Object.keys(CITY_COUNTRY).includes("uppsala"), "uppsala must not be in the country-wide picker map");

// The scheduled snapshot refresh no longer includes it (kept as a comment in the script for re-enable).
assert(!REFRESH_UNITS.some((u) => u.id === "uppsala"), "uppsala must not be a scheduled refresh unit");

// Other Swedish cities and Perth unaffected.
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");
assert(assertCityLive("malmo")?.ok === true, "Malmö stays live");

// Adapter, catalog, D1 pack kept.
assert(typeof fetchStationBoard === "function", "uppsala adapter module must still load");
assert(UPPSALA_HUB === "Uppsala C", "hub lock is Uppsala C");
assert(listUppsalaDogfoodStations().length === 19, "uppsala dogfood catalog (19 stations) kept");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(ROOT, "docs/uppsala-d1", name)), `docs/uppsala-d1/${name} must be kept`);
}
const catalogJson = JSON.parse(readFileSync(join(ROOT, "lib/cities/uppsala/stations.json"), "utf8"));
assert((catalogJson.stations ?? []).length === 19, "uppsala catalog kept at 19 stations");

console.log("uppsala-dogfood-gate: ok (retired 24 Nov 2026: 501, not in lists/picker/refresh, Sweden stays in picker, adapter + D1 pack kept)");
