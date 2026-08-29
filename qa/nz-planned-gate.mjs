/**
 * Auckland and Wellington are both tester-live, separate cities. No city=nz. Perth live-gate untouched.
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

assert(assertCityLive("perth")?.ok === true, "Perth must stay live");

const aucklandLive = assertCityLive("auckland");
assert(aucklandLive?.ok === true, "assertCityLive(auckland) must pass");
assert(getCity("auckland")?.status === "live", "auckland registry status must be live");
assert(isMultiCity("auckland") === true, "auckland must be in MULTI_CITY_IDS");

const wellingtonLive = assertCityLive("wellington");
assert(wellingtonLive?.ok === true, "assertCityLive(wellington) must pass");
assert(getCity("wellington")?.status === "live", "wellington registry status must be live");
assert(getCity("wellington")?.adapterReady === true, "wellington adapterReady must be true");
assert(isMultiCity("wellington") === true, "wellington must be in MULTI_CITY_IDS");

for (const id of ["auckland", "wellington"]) {
  const entry = getCity(id);
  assert(entry?.timeZone === "Pacific/Auckland", `${id} timezone must be Pacific/Auckland`);
  assert(entry?.modes?.length === 1 && entry.modes[0] === "train", `${id} modes v1 TRAIN only`);
}

assert(!getCity("nz"), "city=nz must not exist as a registry city");
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
  existsSync(join(ROOT, "docs/wellington-d1/published-network.json")),
  "Luke D1 published-network.json must exist under docs/wellington-d1/"
);
assert(
  existsSync(join(ROOT, "qa/fixtures/wellington/published-network.json")),
  "Luke D1 published-network.json must be copied into qa/fixtures/wellington/"
);
assert(
  readFileSync(join(ROOT, "docs/wellington-d1/published-network.json"), "utf8") ===
    readFileSync(join(ROOT, "qa/fixtures/wellington/published-network.json"), "utf8"),
  "qa/fixtures/wellington/published-network.json must be a verbatim copy of docs/wellington-d1/published-network.json"
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
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*auckland/.test(appJs), "auckland must be in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*wellington/.test(appJs), "wellington must be in LIVE_CITY_IDS");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*auckland/.test(appJs), "auckland must be in the city picker nearby list");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*wellington/.test(appJs), "wellington must be in the city picker nearby list");

console.log(
  "nz-planned-gate: ok (auckland + wellington both tester-live, separate cities, no city=nz, Perth green)"
);
