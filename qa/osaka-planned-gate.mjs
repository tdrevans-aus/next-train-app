/**
 * Osaka stays planned. Picker Coming Soon. D1 pack in docs/osaka-d1/.
 * No official public feed. adapterReady false.
 * Perth / Amsterdam / Rotterdam live-gates untouched.
 * Usage: node qa/osaka-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import nextTrain from "../api/next-train.js";
import board from "../api/board.js";
import { METRO_HUB, marketingLabelsForStation } from "../lib/cities/osaka/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const D1_FILES = [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
];
const MARK_PROBES = [
  "Hommachi",
  "Sakaisuji-Hommachi",
  "Umeda",
  "Higashi-Umeda",
  "Nishi-Umeda",
  "Namba",
  "Shinsaibashi",
  "Yotsubashi",
  "Esaka",
  "Yumeshima",
  "Nakamozu",
  "Nagata",
  "Tenjimbashisuji 6-chome",
  "Cosmosquare",
  "Suminoekoen",
];
const FORBIDDEN = [
  "Senri-Chuo",
  "Momoyamadai",
  "Minoh-Kayano",
  "Trade Center-mae",
  "Nakafuto",
  "Port Town-nishi",
  "New Tram",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {},
  };
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");
assert(assertCityLive("amsterdam")?.ok === true, "Amsterdam live-gate must stay green");
assert(assertCityLive("rotterdam")?.ok === true, "Rotterdam tester-live must stay green");
assert(assertCityLive("melbourne")?.ok === false, "Melbourne stays planned");

const live = assertCityLive("osaka");
assert(live?.ok === false, "assertCityLive(osaka) must fail");
assert(live?.status === 501, "osaka must be 501 planned");

const entry = getCity("osaka");
assert(entry?.status === "planned", "osaka registry status must be planned");
assert(entry?.adapterReady !== true, "osaka adapterReady must be omitted or false");
assert(entry?.displayName === "Osaka", "osaka display name must be Osaka");
assert(entry?.timeZone === "Asia/Tokyo", "osaka timezone must be Asia/Tokyo");
assert(entry?.agency === "Osaka Metro", "Osaka agency is Osaka Metro");
assert(!(entry.envKeys ?? []).length, "osaka has no official public feed and no env key");
assert(entry.modes?.includes("metro"), "osaka modes v1 are metro");
assert(!entry.modes?.includes("tram"), "New Tram is out of v1");
assert(/no official public/i.test(entry.integration ?? ""), "registry must say there is no official public feed");
assert(/not an ODPT member/i.test(entry.integration ?? ""), "registry must say Osaka Metro is not an ODPT member");
assert(!/osakametro-train-gtfs|\.zip/i.test(entry.integration ?? ""), "do not invent an ODPT zip");
assert(isMultiCity("osaka") === false, "osaka must not be in MULTI_CITY_IDS");

assert(!getCity("japan"), "city=japan must not exist");
assert(!getCity("osk") && !getCity("osaka-metro") && !getCity("kintetsu"), "do not invent osk / osaka-metro / kintetsu");
assert(!getCity("tokyo"), "do not start Tokyo from this city");
assert(!CITIES.some((city) => city.id === "japan"), "registry must not invent city=japan");
assert(CITIES.filter((city) => city.id === "osaka").length === 1, "osaka must appear once in the registry");
assert(!existsSync(join(ROOT, "lib/providers/osaka.js")), "osaka must not have a live adapter");
assert(!existsSync(join(ROOT, "lib/cities/osaka/dogfood-next-train.js")), "osaka must not have dogfood-next-train.js");
assert(!existsSync(join(ROOT, "public/city-catalogs/osaka.json")), "osaka must not have a public catalog");
assert(!existsSync(join(ROOT, "qa/osaka-network-sweep.mjs")), "D6 network-sweep must not exist — no public feed");
assert(!getCity("fukuoka") && !getCity("nagoya"), "do not start Fukuoka / Nagoya from this city");

const stockholm = getCity("stockholm");
assert(stockholm?.status === "planned", "Stockholm stays planned / Coming Soon");
const goteborg = getCity("goteborg");
assert(goteborg?.status === "planned", "Göteborg stays planned / Coming Soon");
assert(getCity("rotterdam")?.status === "live", "Rotterdam stays live");

const d1Dir = join(ROOT, "docs/osaka-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/osaka-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/osaka/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/osaka/published-network.json must be a verbatim copy of docs/osaka-d1 (not GTFS-generated)"
);
assert(existsSync(join(ROOT, "qa/fixtures/osaka/README.md")), "D2 fixture README must exist");
assert(
  /verbatim|byte-identical/i.test(readFileSync(join(ROOT, "qa/fixtures/osaka/README.md"), "utf8")),
  "D2 fixture README must say the JSON is a verbatim / byte-identical copy"
);

const network = JSON.parse(d1Json);
assert(network.timezone === "Asia/Tokyo", "D1 JSON timezone is lowercase Asia/Tokyo");
assert(network.timeZone === undefined, "D1 JSON must use timezone, not timeZone");
assert(network.city === "osaka", "D1 city id is osaka");
assert(network.displayName === "Osaka", "D1 displayName is Osaka");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === "Hommachi", "metro hub lock Hommachi");
assert(network.uniqueStationCount === 101, "D1 unique station count must be 101");
assert((network.uniqueStations ?? []).length === 101, "D1 uniqueStations must list 101 names");
assert(!(network.uniqueStations ?? []).includes("Senri-Chuo"), "Kitakyu Senri-Chuo is not a D1 station");
assert(!(network.uniqueStations ?? []).includes("Trade Center-mae"), "New Tram-only stops are not D1 stations");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/osaka/stations.json"), "utf8"));
const byName = new Map((catalog.stations ?? []).map((s) => [s.name, s]));
assert(byName.size === 101, `catalog must have 101 stations, got ${byName.size}`);
assert(catalog.dst === false, "Asia/Tokyo has no DST");
assert(catalog.timeZone === "Asia/Tokyo", "catalog timeZone is camelCase Asia/Tokyo");
const lineMap = JSON.parse(readFileSync(join(ROOT, "lib/cities/osaka/line-map.json"), "utf8"));
assert(lineMap.timeZone === "Asia/Tokyo", "line-map timeZone is camelCase Asia/Tokyo");
assert(lineMap.dst === false, "line-map records no DST");
assert(byName.has("Hommachi"), "catalog must lock Hommachi");
assert(byName.get("Hommachi")?.codes?.includes("M18"), "Hommachi must carry official code M18");
assert(byName.get("Hommachi")?.codes?.includes("Y13"), "Hommachi must carry official code Y13");
assert(byName.get("Hommachi")?.codes?.includes("C16"), "Hommachi must carry official code C16");

for (const name of network.uniqueStations ?? []) {
  assert(byName.has(name), `catalog missing D1 station ${name}`);
}
for (const name of MARK_PROBES) {
  assert(byName.has(name), `Mark probe: catalog must include ${name}`);
}
for (const name of FORBIDDEN) {
  assert(!byName.has(name), `catalog must not include ${name}`);
}

const nextRes = mockRes();
await nextTrain(
  { method: "GET", query: { city: "osaka", station: METRO_HUB, direction: "Nakamozu" }, headers: {} },
  nextRes
);
assert(nextRes.statusCode === 501, `/api/next-train?city=osaka must 501, got ${nextRes.statusCode}`);

const boardRes = mockRes();
await board({ method: "GET", query: { city: "osaka", station: METRO_HUB }, headers: {} }, boardRes);
assert(boardRes.statusCode === 501, `/api/board?city=osaka must 501, got ${boardRes.statusCode}`);

const hubChips = marketingLabelsForStation(METRO_HUB);
assert(hubChips.includes("Midosuji + Nakamozu"), "Hommachi chips must include Midosuji + Nakamozu");
assert(!hubChips.some((label) => /inbound|outbound|to city/i.test(label)), "chips are line + terminus, never to City");

const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/id:\s*"jp"/.test(session) && /name:\s*"Japan"/.test(session), "picker country is jp (Japan), not city=japan");
assert(
  /id:\s*"osaka",\s*name:\s*"Osaka",\s*timeZone:\s*"Asia\/Tokyo",\s*comingSoon:\s*true/.test(session),
  "picker must list Osaka as Coming Soon / planned"
);
assert(
  /id:\s*"melbourne",\s*name:\s*"Melbourne",\s*timeZone:\s*"Australia\/Melbourne",\s*comingSoon:\s*true/.test(
    session
  ),
  "Melbourne stays Coming Soon"
);
assert(/id:\s*"rotterdam"/.test(session), "Rotterdam must remain in the NL picker");
assert(/id:\s*"stockholm"/.test(session), "Stockholm stays Coming Soon");
assert(!/id:\s*"japan"/.test(session), "do not invent city=japan in the picker");
assert(!/id:\s*"tokyo"|id:\s*"fukuoka"|id:\s*"nagoya"|id:\s*"osk"|id:\s*"osaka-metro"/.test(session), "do not start Tokyo / Fukuoka / Nagoya / osk");
assert(!/MULTI_CITY_IDS = \[[^\]]*osaka/.test(session), "osaka must not be in city-session MULTI_CITY_IDS");
assert(/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(session), "rotterdam must remain in city-session MULTI_CITY_IDS");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*osaka/.test(appJs), "osaka must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*osaka/.test(appJs), "osaka must not be in the live nearby list");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*amsterdam/.test(appJs), "Amsterdam must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*rotterdam/.test(appJs), "Rotterdam must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*perth/.test(appJs), "Perth must remain in LIVE_CITY_IDS");

const liveCityApi = readFileSync(join(ROOT, "lib/cities/live-city-api.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*osaka/.test(liveCityApi), "osaka must not be in live-city-api MULTI_CITY_IDS");

const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
assert(!/"osaka"/.test(pkg), "do not add osaka scripts or bump version for a planned city");

console.log(
  "osaka-planned-gate: ok (planned/501, D1 pack + D2 fixture, picker Coming Soon, adapterReady false, 101 stations, no official feed, Perth/Amsterdam/Rotterdam green)"
);
