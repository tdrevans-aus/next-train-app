/**
 * Auckland and Wellington stay planned. No city=nz. Perth live-gate untouched.
 * Usage: node qa/nz-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

for (const id of ["auckland", "wellington"]) {
  const live = assertCityLive(id);
  assert(live?.ok === false, `assertCityLive(${id}) must fail`);
  assert(live?.status === 501, `${id} must be 501 planned`);
  const entry = getCity(id);
  assert(entry?.status === "planned", `${id} registry status must be planned`);
  assert(entry?.adapterReady === true, `${id} adapterReady must be true`);
  assert(entry?.timeZone === "Pacific/Auckland", `${id} timezone must be Pacific/Auckland`);
  assert(entry?.modes?.length === 1 && entry.modes[0] === "train", `${id} modes v1 TRAIN only`);
  assert(isMultiCity(id) === false, `${id} must not be in MULTI_CITY_IDS until Tim flips live`);
}

assert(!getCity("nz"), "city=nz must not exist");
assert(
  !CITIES.some((city) => city.id === "nz"),
  "registry must not contain a combined NZ city"
);

const auckland = getCity("auckland");
assert(auckland.agency === "Auckland Transport", "Auckland agency is AT");
assert((auckland.envKeys ?? []).includes("AT_API_KEY"), "Auckland uses AT_API_KEY");

const wellington = getCity("wellington");
assert(wellington.agency === "Metlink", "Wellington is a separate Metlink city");
assert((wellington.envKeys ?? []).includes("METLINK_API_KEY"), "Wellington uses METLINK_API_KEY");

assert(
  !existsSync(join(ROOT, "qa/fixtures/wellington/published-network.json")),
  "Wellington published-network.json must stay unwritten until Luke D1"
);
const wellingtonCatalog = JSON.parse(
  readFileSync(join(ROOT, "lib/cities/wellington/stations.json"), "utf8")
);
assert(
  (wellingtonCatalog.stations ?? []).some((row) => row.name === "Wellington Station"),
  "Wellington hub catalog name is Wellington Station"
);
assert(
  !(wellingtonCatalog.stations ?? []).some((row) => /^melling station$/i.test(row.name)),
  "Do not invent Melling Station while MEL terminates Western Hutt"
);

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*auckland/.test(appJs), "auckland must not be in LIVE_CITY_IDS");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*wellington/.test(appJs), "wellington must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*auckland/.test(appJs), "auckland must not be in the city picker nearby list");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*wellington/.test(appJs), "wellington must not be in the city picker nearby list");

console.log(
  "nz-planned-gate: ok (auckland + wellington planned/501, no city=nz, Perth green, not in multi-city UI)"
);
