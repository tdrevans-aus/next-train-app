/**
 * Stockholm stays planned. Picker Coming Soon. D1 pack in docs/stockholm-d1/.
 * Perth / Amsterdam / Rotterdam live-gates untouched.
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
  "qa-note.md",
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
assert(assertCityLive("rotterdam")?.ok === true, "Rotterdam tester-live must stay green");
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
assert(!getCity("malmo") && !getCity("malmö"), "do not start Malmö");
assert(!CITIES.some((city) => city.id === "sweden"), "registry must not invent city=sweden");
const rotterdam = getCity("rotterdam");
assert(rotterdam?.status === "live", "Rotterdam from #112 must remain live");
assert(rotterdam?.agency === "RET", "Rotterdam stays RET (no GVB leak)");
const goteborg = getCity("goteborg");
assert(!goteborg || goteborg.id === "goteborg", "Göteborg if present is a separate city");
assert(goteborg?.id !== "stockholm", "do not merge Göteborg into Stockholm");

const d1Dir = join(ROOT, "docs/stockholm-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/stockholm-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/stockholm/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/stockholm/published-network.json must be a verbatim copy of docs/stockholm-d1 (not GTFS-generated)"
);

const network = JSON.parse(d1Json);
assert(network.city === "stockholm", "D1 city id is stockholm");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lockMetro === "T-Centralen", "metro hub lock T-Centralen");
assert(network.printedInnerCityNames?.lockPendeltag === "Stockholm City", "pendeltåg hub lock Stockholm City");
assert(
  (network.printedInnerCityNames?.doNotCollapse ?? []).includes("Stockholms central"),
  "must not collapse Stockholms central"
);
assert(
  network.printedInnerCityNames?.doNotCollapse?.join("|") ===
    "T-Centralen|Stockholm City|Stockholms central",
  "D1 must lock the three-central names"
);
assert(network.uniqueStationCount === 153, "D1 unique station count must be 153");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/stockholm/stations.json"), "utf8"));
const byName = new Map((catalog.stations ?? []).map((s) => [s.name, s]));
assert(byName.size === 153, "catalog must have 153 stations");
const tCentralen = byName.get("T-Centralen");
const stockholmCity = byName.get("Stockholm City");
assert(tCentralen?.siteId === 9001, "T-Centralen siteId 9001");
assert(stockholmCity?.siteId === 1080, "Stockholm City siteId 1080");
assert(tCentralen?.boardModes?.includes("METRO"), "T-Centralen boardModes METRO");
assert(stockholmCity?.boardModes?.includes("TRAIN"), "Stockholm City boardModes TRAIN");
assert(!byName.has("Stockholms central"), "Stockholms central must not be a v1 catalog hub");

for (const name of network.uniqueStations ?? []) {
  assert(byName.has(name), `catalog missing D1 station ${name}`);
}
for (const name of MARK_PROBES) {
  assert(byName.has(name), `Mark probe: catalog must include ${name}`);
}
assert(!byName.has("Göteborg") && ![...byName.keys()].some((name) => /gothenburg|goteborg/i.test(name)), "Göteborg is not this city");

const adapterSrc = readFileSync(join(ROOT, "lib/providers/stockholm.js"), "utf8");
assert(adapterSrc.includes("transport.integration.sl.se"), "adapter uses SL Transport");
assert(adapterSrc.includes("ALLOWED_LINE_CODES"), "adapter filters line codes");

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
assert(/id:\s*"rotterdam"/.test(session), "Rotterdam must remain in the NL picker");
assert(!/id:\s*"sweden"/.test(session), "do not invent city=sweden in the picker");
assert(!/id:\s*"malmo"/.test(session), "do not start Malmö in the picker");
assert(
  /id:\s*"goteborg",\s*name:\s*"Göteborg",\s*timeZone:\s*"Europe\/Stockholm"/.test(
    session
  ),
  "Göteborg is a separate (now tester-live) sibling, not merged into Stockholm"
);
assert(!/MULTI_CITY_IDS = \[[^\]]*stockholm/.test(session), "stockholm must not be in city-session MULTI_CITY_IDS");
assert(/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(session), "rotterdam must remain in city-session MULTI_CITY_IDS");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "stockholm must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*stockholm/.test(appJs), "stockholm must not be in the live nearby list");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*amsterdam/.test(appJs), "Amsterdam must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*rotterdam/.test(appJs), "Rotterdam must remain in LIVE_CITY_IDS");

console.log(
  "stockholm-planned-gate: ok (planned/501, D1 pack + D2 fixture, picker Coming Soon, Trafiklab env names, Perth/Amsterdam/Rotterdam green)"
);
