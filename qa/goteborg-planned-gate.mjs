/**
 * Göteborg stays planned. Picker Coming Soon. Adapter ready. Perth / Amsterdam / Rotterdam live-gates untouched.
 * Usage: node qa/goteborg-planned-gate.mjs
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
  "Brunnsparken",
  "Drottningtorget",
  "Korsvägen",
  "Nils Ericsonsplatsen",
  "Liseberg Station",
  "Liseberg Södra",
  "Gamlestads Torg",
  "Göteborg Central",
  "Gamlestaden Station",
  "Liseberg Station (tåg)",
  "Lindholmen",
  "Opaltorget",
  "Älvängen resecentrum",
];

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

const live = assertCityLive("goteborg");
assert(live?.ok === false, "assertCityLive(goteborg) must fail");
assert(live?.status === 501, "goteborg must be 501 planned");

const entry = getCity("goteborg");
assert(entry?.status === "planned", "goteborg registry status must be planned");
assert(entry?.adapterReady === true, "goteborg adapterReady must be true");
assert(entry?.displayName === "Göteborg", "goteborg display name must be Göteborg");
assert(entry?.timeZone === "Europe/Stockholm", "goteborg timezone must be Europe/Stockholm");
assert(entry?.agency === "Västtrafik", "Göteborg agency is Västtrafik");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "goteborg needs TRAFIKLAB_API_KEY");
assert(!entry.modes?.includes("metro"), "goteborg has no metro");
assert(entry.modes?.includes("tram") && entry.modes?.includes("train"), "goteborg modes v1 are tram + train");
assert(isMultiCity("goteborg") === false, "goteborg must not be in MULTI_CITY_IDS");

assert(!getCity("sweden"), "city=sweden must not exist");
assert(!getCity("gothenburg"), "city id is goteborg, not gothenburg");
assert(!getCity("malmo") && !getCity("malmö"), "do not merge Malmö into this city");
assert(!CITIES.some((city) => city.id === "sweden"), "registry must not invent city=sweden");
assert(CITIES.filter((city) => city.id === "goteborg").length === 1, "goteborg must appear once in the registry");

const stockholm = getCity("stockholm");
assert(stockholm?.status === "planned", "Stockholm stays planned / Coming Soon");
assert(stockholm?.id !== "goteborg", "do not merge Göteborg into Stockholm");

const d1Dir = join(ROOT, "docs/goteborg-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/goteborg-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/goteborg/published-network.json");
assert(existsSync(fixturePath), "D2: qa/fixtures/goteborg/published-network.json must exist");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/goteborg/published-network.json must be a verbatim copy of docs/goteborg-d1 (not GTFS-generated)"
);

const published = JSON.parse(d1Json);
assert(published.city === "goteborg", "D1 city id is goteborg");
assert(published.status === "planned", "D1 pack stays planned");
assert(published.printedInnerCityNames?.lock === "Brunnsparken", "D1 lock is Brunnsparken");
assert(published.printedInnerCityNames?.lockPendeltag === "Göteborg Central", "D1 pendeltåg lock is Göteborg Central");

assert(existsSync(join(ROOT, "lib/providers/goteborg.js")), "goteborg adapter must exist");
assert(
  existsSync(join(ROOT, "lib/providers/gtfs/realtime-board.js")),
  "shared realtime-board.js must exist"
);

const adapterSrc = readFileSync(join(ROOT, "lib/providers/goteborg.js"), "utf8");
assert(
  adapterSrc.includes("realtime-board.js"),
  "goteborg adapter must reuse realtime-board.js"
);

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/goteborg/stations.json"), "utf8"));
const catalogNames = (catalog.stations ?? []).map((row) => row.name);
assert(catalogNames.length === 157, `catalog must have 157 unique names, got ${catalogNames.length}`);
assert(new Set(catalogNames).size === 157, "catalog names must be unique");
const tramCount = (catalog.stations ?? []).filter((row) => row.mode === "tram").length;
const trainCount = (catalog.stations ?? []).filter((row) => row.mode === "train").length;
assert(tramCount === 132, `132 unique tram names, got ${tramCount}`);
assert(trainCount === 25, `25 unique train names, got ${trainCount}`);
for (const name of MARK_PROBES) {
  assert(catalogNames.includes(name), `Mark probe: catalog must include ${name}`);
}
assert(!catalogNames.includes("Centralstationen"), "Mark probe: Centralstationen is not a pickable hub");
assert(!catalogNames.includes("Nils Ericson Terminalen"), "Nils Ericson Terminalen is not a v1 stop");
assert(!catalogNames.includes("Stockholm") && !catalogNames.includes("T-Centralen"), "Stockholm is not this city");

const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/id:\s*"se"/.test(session) && /name:\s*"Sweden"/.test(session), "picker country is se (Sweden), not city=sweden");
assert((session.match(/id:\s*"se"/g) || []).length === 1, "Sweden must appear once in the picker");
assert(
  /id:\s*"goteborg",\s*name:\s*"Göteborg",\s*timeZone:\s*"Europe\/Stockholm",\s*comingSoon:\s*true/.test(session),
  "picker must list Göteborg as Coming Soon / planned"
);
assert(
  /id:\s*"stockholm",\s*name:\s*"Stockholm",\s*timeZone:\s*"Europe\/Stockholm",\s*comingSoon:\s*true/.test(session),
  "Stockholm stays Coming Soon beside Göteborg"
);
assert(
  /id:\s*"melbourne",\s*name:\s*"Melbourne",\s*timeZone:\s*"Australia\/Melbourne",\s*comingSoon:\s*true/.test(
    session
  ),
  "Melbourne stays Coming Soon"
);
assert(/id:\s*"rotterdam"/.test(session), "Rotterdam must remain in the NL picker");
assert(!/id:\s*"sweden"/.test(session), "do not invent city=sweden in the picker");
assert(!/id:\s*"gothenburg"|id:\s*"malmo"/.test(session), "do not add gothenburg / Malmö");
assert(!/MULTI_CITY_IDS = \[[^\]]*goteborg/.test(session), "goteborg must not be in city-session MULTI_CITY_IDS");
assert(/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(session), "rotterdam must remain in city-session MULTI_CITY_IDS");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*goteborg/.test(appJs), "goteborg must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*goteborg/.test(appJs), "goteborg must not be in the live nearby list");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*amsterdam/.test(appJs), "Amsterdam must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*perth/.test(appJs), "Perth must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*rotterdam/.test(appJs), "Rotterdam must remain in LIVE_CITY_IDS");

const liveCityApi = readFileSync(join(ROOT, "lib/cities/live-city-api.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*goteborg/.test(liveCityApi), "goteborg must not be in live-city-api MULTI_CITY_IDS");

console.log(
  "goteborg-planned-gate: ok (planned/501, D1+adapterReady, picker Coming Soon, 157 names, Trafiklab key, Perth/Amsterdam/Rotterdam green)"
);
