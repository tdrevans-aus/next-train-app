/**
 * Stockholm stays planned. Perth live-gate untouched. Not in the city picker.
 * Usage: node qa/stockholm-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

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

assert(
  existsSync(join(ROOT, "qa/fixtures/stockholm/published-network.json")),
  "Luke D1 published-network.json must be copied into qa/fixtures/stockholm/"
);

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "stockholm must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*stockholm/.test(appJs), "stockholm must not be in the city picker nearby list");

console.log("stockholm-planned-gate: ok (planned/501, D1 pack present, Perth green, not in picker)");
