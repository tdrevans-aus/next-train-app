/**
 * New Zealand — both Auckland and Wellington retired from release 1, 7 Sep 2026 (Tim,
 * docs/jim-brief-release-1-scope-cut.md). No city=nz ever existed. Per-city assertions live in
 * qa/auckland-dogfood-gate.mjs and qa/wellington-dogfood-gate.mjs; this gate is the
 * country-level check that the New Zealand picker entry itself is gone (not just Coming Soon)
 * once both regions are retired.
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

const auckland = assertCityLive("auckland");
assert(auckland?.ok === false, "assertCityLive(auckland) must fail — retired");
assert(getCity("auckland")?.status === "retired", "auckland registry status must be retired");
assert(isMultiCity("auckland") === false, "auckland must not be in MULTI_CITY_IDS");

const wellington = assertCityLive("wellington");
assert(wellington?.ok === false, "assertCityLive(wellington) must fail — retired");
assert(getCity("wellington")?.status === "retired", "wellington registry status must be retired");
assert(getCity("wellington")?.adapterReady === true, "wellington adapterReady must stay true — adapter kept");
assert(isMultiCity("wellington") === false, "wellington must not be in MULTI_CITY_IDS");

for (const id of ["auckland", "wellington"]) {
  const entry = getCity(id);
  assert(entry?.timeZone === "Pacific/Auckland", `${id} timezone must be Pacific/Auckland`);
  assert(entry?.modes?.length === 1 && entry.modes[0] === "train", `${id} modes v1 TRAIN only`);
}

assert(!getCity("nz"), "city=nz must not exist as a registry city");
assert(!CITIES.some((city) => city.id === "nz"), "registry must not contain a combined NZ city");

const aucklandEntry = getCity("auckland");
assert(aucklandEntry.agency === "Auckland Transport", "Auckland agency is AT");
assert((aucklandEntry.envKeys ?? []).includes("AT_API_KEY"), "Auckland uses AT_API_KEY");

const wellingtonEntry = getCity("wellington");
assert(wellingtonEntry.agency === "Metlink", "Wellington is a separate Metlink city");
assert((wellingtonEntry.envKeys ?? []).includes("METLINK_API_KEY"), "Wellington uses METLINK_API_KEY");

// D1 packs, adapters, catalogs stay in the repo — retirement is not deletion.
assert(
  existsSync(join(ROOT, "docs/wellington-d1/published-network.json")),
  "Luke D1 published-network.json must still exist under docs/wellington-d1/"
);
assert(
  existsSync(join(ROOT, "qa/fixtures/wellington/published-network.json")),
  "Luke D1 published-network.json must still be copied into qa/fixtures/wellington/"
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

// Picker: New Zealand disappears entirely once both its regions are retired — no comingSoon flag.
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(!/id:\s*"nz"/.test(citySession), "New Zealand must not appear in the picker at all");
assert(!/id:\s*"auckland"/.test(citySession), "auckland must not appear in the picker at all");
assert(!/id:\s*"wellington"/.test(citySession), "wellington must not appear in the picker at all");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*auckland/.test(appJs), "auckland must not be in LIVE_CITY_IDS");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*wellington/.test(appJs), "wellington must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*auckland/.test(appJs), "auckland must not be in the nearby list");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*wellington/.test(appJs), "wellington must not be in the nearby list");

console.log(
  "nz-planned-gate: ok (auckland + wellington both retired from release 1, no city=nz, New Zealand dropped from the picker, Perth green)"
);
