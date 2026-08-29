/**
 * Stockholm stays planned. Picker Coming Soon. Perth / Amsterdam live-gates untouched.
 * Usage: node qa/stockholm-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const D1_FILES = [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
];
const MARK_PROBES = [
  "T-Centralen",
  "Stockholm City",
  "Odenplan",
  "Stockholm Odenplan",
  "Slussen",
  "Fridhemsplan",
  "Östermalmstorg",
  "Arlanda central",
  "Södertälje centrum",
  "Hjulsta",
  "Norsborg",
];
const TRAFIKLAB_KEYS = ["TRAFIKLAB_GTFS_SWEDEN_KEY", "TRAFIKLAB_GTFS_SWEDEN_RT_KEY"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");
assert(assertCityLive("amsterdam")?.ok === true, "Amsterdam live-gate must stay green");
assert(assertCityLive("melbourne")?.ok === false, "Melbourne stays planned");

const live = assertCityLive("stockholm");
assert(live?.ok === false, "assertCityLive(stockholm) must fail");
assert(live?.status === 501, "stockholm must be 501 planned");

const entry = getCity("stockholm");
assert(entry?.status === "planned", "stockholm registry status must be planned");
assert(entry?.adapterReady === true, "stockholm adapterReady must be true");
assert(entry?.displayName === "Stockholm", "stockholm display name must be Stockholm");
assert(entry?.timeZone === "Europe/Stockholm", "stockholm timezone must be Europe/Stockholm");
assert(entry?.agency === "SL", "Stockholm agency is SL");
assert(
  JSON.stringify(entry.envKeys ?? []) === JSON.stringify(TRAFIKLAB_KEYS),
  "stockholm envKeys must be Trafiklab GTFS Sweden names only"
);
assert(isMultiCity("stockholm") === false, "stockholm must not be in MULTI_CITY_IDS");

assert(!getCity("sweden"), "city=sweden must not exist");
assert(!getCity("goteborg") && !getCity("göteborg"), "do not merge Göteborg into this city");
assert(!getCity("malmo") && !getCity("malmö"), "do not merge Malmö into this city");
assert(
  !CITIES.some((city) => city.id === "sweden" || city.id === "rotterdam"),
  "registry must not invent city=sweden or touch Rotterdam"
);

const d1Dir = join(ROOT, "docs/stockholm-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/stockholm-d1/${name} is the Expansion pack`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/stockholm/published-network.json");
assert(existsSync(fixturePath), "D2: copy docs/stockholm-d1/published-network.json into qa/fixtures/stockholm/");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/stockholm/published-network.json must be a verbatim copy of docs/stockholm-d1 (not GTFS-generated)"
);

const published = JSON.parse(d1Json);
assert(published.city === "stockholm", "D1 city id is stockholm");
assert(published.status === "planned", "D1 pack stays planned");
assert(
  published.printedInnerCityNames?.doNotCollapse?.join("|") ===
    "T-Centralen|Stockholm City|Stockholms central",
  "D1 must lock the three-central names"
);

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/stockholm/stations.json"), "utf8"));
const catalogNames = (catalog.stations ?? []).map((row) => row.name);
for (const name of MARK_PROBES) {
  assert(catalogNames.includes(name), `Mark probe: catalog must include ${name}`);
}
assert(!catalogNames.includes("Stockholms central"), "Mark probe: Stockholms central is not a pickable hub");
assert(!catalogNames.includes("Göteborg") && !catalogNames.some((name) => /gothenburg|goteborg/i.test(name)), "Göteborg is not this city");

const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/id:\s*"se"/.test(session) && /name:\s*"Sweden"/.test(session), "picker country is se (Sweden), not city=sweden");
assert(
  /id:\s*"stockholm",\s*name:\s*"Stockholm",\s*timeZone:\s*"Europe\/Stockholm",\s*comingSoon:\s*true/.test(
    session
  ),
  "picker must list Stockholm as Coming Soon / planned"
);
assert(
  /id:\s*"melbourne",\s*name:\s*"Melbourne",\s*timeZone:\s*"Australia\/Melbourne",\s*comingSoon:\s*true/.test(
    session
  ),
  "Melbourne stays Coming Soon"
);
assert(!/id:\s*"sweden"/.test(session), "do not invent city=sweden in the picker");
assert(!/id:\s*"goteborg"|id:\s*"malmo"|id:\s*"rotterdam"/.test(session), "do not add Göteborg / Malmö / Rotterdam");
assert(!/MULTI_CITY_IDS = \[[^\]]*stockholm/.test(session), "stockholm must not be in city-session MULTI_CITY_IDS");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "stockholm must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*stockholm/.test(appJs), "stockholm must not be in the live nearby list");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*amsterdam/.test(appJs), "Amsterdam must remain in LIVE_CITY_IDS");

console.log(
  "stockholm-planned-gate: ok (planned/501, D1 pack + D2 fixture, picker Coming Soon, Trafiklab env names, Perth/Amsterdam green)"
);
