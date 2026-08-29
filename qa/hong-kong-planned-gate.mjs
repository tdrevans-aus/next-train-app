/**
 * Hong Kong stays planned. Picker Coming Soon. D1 pack in docs/hong-kong-d1/.
 * Next Train REST exists and is not wired. adapterReady false.
 * Perth / Amsterdam / Rotterdam live-gates untouched.
 * Usage: node qa/hong-kong-planned-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity } from "../lib/cities/live-city-api.js";
import nextTrain from "../api/next-train.js";
import board from "../api/board.js";
import { METRO_HUB, marketingLabelsForStation } from "../lib/cities/hong-kong/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const D1_FILES = [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
];
const MARK_PROBES = [
  "Admiralty",
  "Central",
  "Tsim Sha Tsui",
  "East Tsim Sha Tsui",
  "Hung Hom",
  "Hong Kong",
  "Kowloon",
  "Exhibition Centre",
  "Lo Wu",
  "Lok Ma Chau",
  "LOHAS Park",
  "Kennedy Town",
  "Chai Wan",
  "South Horizons",
  "Wu Kai Sha",
  "Tuen Mun",
];
const FORBIDDEN = [
  "Airport",
  "AsiaWorld-Expo",
  "AsiaWorld Expo",
  "Disneyland Resort",
  "Hong Kong West Kowloon",
  "Ngong Ping 360",
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

const live = assertCityLive("hong-kong");
assert(live?.ok === false, "assertCityLive(hong-kong) must fail");
assert(live?.status === 501, "hong-kong must be 501 planned");

const entry = getCity("hong-kong");
assert(entry?.status === "planned", "hong-kong registry status must be planned");
assert(entry?.adapterReady !== true, "hong-kong adapterReady must be omitted or false");
assert(entry?.displayName === "Hong Kong", "hong-kong display name must be Hong Kong");
assert(entry?.timeZone === "Asia/Hong_Kong", "hong-kong timezone must be Asia/Hong_Kong");
assert(entry?.agency === "MTR Corporation Limited", "Hong Kong agency is MTR Corporation Limited");
assert(!(entry.envKeys ?? []).length, "hong-kong has no env key");
assert(entry.modes?.includes("metro"), "hong-kong modes v1 are metro");
assert(!entry.modes?.includes("tram"), "Light Rail / tram is out of v1");
assert(/getSchedule\.php/i.test(entry.integration ?? ""), "registry must name the Next Train REST");
assert(/not wired/i.test(entry.integration ?? ""), "registry must say the REST is not wired");
assert(!/gtfs\.zip|pt-headway/i.test(entry.integration ?? ""), "do not invent a TD GTFS live path");
assert(isMultiCity("hong-kong") === false, "hong-kong must not be in MULTI_CITY_IDS");

assert(!getCity("hk"), "city=hk must not exist");
assert(!getCity("mtr") && !getCity("kowloon"), "do not invent mtr / kowloon");
assert(!getCity("china"), "do not start China from this city");
assert(!CITIES.some((city) => city.id === "hk"), "registry must not invent city=hk");
assert(CITIES.filter((city) => city.id === "hong-kong").length === 1, "hong-kong must appear once in the registry");
assert(!existsSync(join(ROOT, "lib/providers/hong-kong.js")), "hong-kong must not have a live adapter");
assert(!existsSync(join(ROOT, "lib/cities/hong-kong/dogfood-next-train.js")), "hong-kong must not have dogfood-next-train.js");
assert(!existsSync(join(ROOT, "public/city-catalogs/hong-kong.json")), "hong-kong must not have a public catalog");
assert(!existsSync(join(ROOT, "qa/hong-kong-network-sweep.mjs")), "D6 network-sweep must not exist — skip as a PR gate");
assert(!getCity("light-rail") && !getCity("airport-express"), "do not start Light Rail / Airport Express as a city");

const stockholm = getCity("stockholm");
assert(stockholm?.status === "planned", "Stockholm stays planned / Coming Soon");
const goteborg = getCity("goteborg");
assert(goteborg?.status === "live", "Göteborg tester-live must stay green");
assert(getCity("rotterdam")?.status === "live", "Rotterdam stays live");

const d1Dir = join(ROOT, "docs/hong-kong-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/hong-kong-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/hong-kong/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/hong-kong/published-network.json must be a verbatim copy of docs/hong-kong-d1 (not GTFS-generated)"
);
assert(existsSync(join(ROOT, "qa/fixtures/hong-kong/README.md")), "D2 fixture README must exist");
assert(
  /verbatim|byte-identical/i.test(readFileSync(join(ROOT, "qa/fixtures/hong-kong/README.md"), "utf8")),
  "D2 fixture README must say the JSON is a verbatim / byte-identical copy"
);
assert(
  /never generate/i.test(readFileSync(join(ROOT, "qa/fixtures/hong-kong/README.md"), "utf8")),
  "D2 fixture README must say never generate from GTFS"
);

const network = JSON.parse(d1Json);
assert(network.timezone === "Asia/Hong_Kong", "D1 JSON timezone is lowercase Asia/Hong_Kong");
assert(network.timeZone === undefined, "D1 JSON must use timezone, not timeZone");
assert(network.city === "hong-kong", "D1 city id is hong-kong");
assert(network.displayName === "Hong Kong", "D1 displayName is Hong Kong");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === "Admiralty", "metro hub lock Admiralty");
assert(network.uniqueStationCount === 95, "D1 unique station count must be 95");
assert((network.uniqueStations ?? []).length === 95, "D1 uniqueStations must list 95 names");
assert((network.uniqueStations ?? []).includes("Lo Wu"), "Lo Wu is an EAL border station — in");
assert((network.uniqueStations ?? []).includes("Lok Ma Chau"), "Lok Ma Chau is an EAL border station — in");
assert((network.uniqueStations ?? []).includes("LOHAS Park"), "LOHAS Park is the TKL branch — in");
assert(!(network.uniqueStations ?? []).includes("Airport"), "Airport Express is not a D1 station");
assert(!(network.uniqueStations ?? []).includes("Disneyland Resort"), "DIS is not a D1 station");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/hong-kong/stations.json"), "utf8"));
const byName = new Map((catalog.stations ?? []).map((s) => [s.name, s]));
assert(byName.size === 95, `catalog must have 95 stations, got ${byName.size}`);
assert(catalog.dst === false, "Asia/Hong_Kong has no DST");
assert(catalog.timeZone === "Asia/Hong_Kong", "catalog timeZone is camelCase Asia/Hong_Kong");
const lineMap = JSON.parse(readFileSync(join(ROOT, "lib/cities/hong-kong/line-map.json"), "utf8"));
assert(lineMap.timeZone === "Asia/Hong_Kong", "line-map timeZone is camelCase Asia/Hong_Kong");
assert(lineMap.dst === false, "line-map records no DST");
assert(byName.has("Admiralty"), "catalog must lock Admiralty");
assert(byName.get("Admiralty")?.siteId === "ADM", "Admiralty siteId must be ADM");
assert(byName.get("Admiralty")?.codes?.includes("ADM"), "Admiralty must carry official code ADM");
assert(byName.get("Central")?.siteId === "CEN", "Central siteId must be CEN");

const blob = `${JSON.stringify(catalog)}\n${JSON.stringify(lineMap)}\n${d1Json}`;
assert(!/\bAEL\b/.test(JSON.stringify(lineMap.lines)), "AEL must be absent from line-map lines");
assert(!/\bDIS\b|\bDRL\b/.test(JSON.stringify(lineMap.lines)), "DIS/DRL must be absent from line-map lines");
assert(!/Light Rail|Airport Express/.test(JSON.stringify(lineMap.lines)), "AEL/LR must be absent from line-map lines");

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
  { method: "GET", query: { city: "hong-kong", station: METRO_HUB, direction: "Chai Wan" }, headers: {} },
  nextRes
);
assert(nextRes.statusCode === 501, `/api/next-train?city=hong-kong must 501, got ${nextRes.statusCode}`);

const boardRes = mockRes();
await board({ method: "GET", query: { city: "hong-kong", station: METRO_HUB }, headers: {} }, boardRes);
assert(boardRes.statusCode === 501, `/api/board?city=hong-kong must 501, got ${boardRes.statusCode}`);

const hubChips = marketingLabelsForStation(METRO_HUB);
assert(hubChips.includes("Island + Chai Wan"), "Admiralty chips must include Island + Chai Wan");
assert(hubChips.includes("East Rail + Lo Wu / Lok Ma Chau"), "Admiralty chips must include East Rail + Lo Wu / Lok Ma Chau");
assert(!hubChips.some((label) => /inbound|outbound|to city/i.test(label)), "chips are line + terminus, never to City");
assert(!hubChips.some((label) => /airport|disneyland|light rail/i.test(label)), "Admiralty chips must not name AEL/DIS/LR");

const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/id:\s*"hk"/.test(session) && /name:\s*"Hong Kong"/.test(session), "picker country is hk (Hong Kong), not city=hk");
assert(
  /id:\s*"hong-kong",\s*name:\s*"Hong Kong",\s*timeZone:\s*"Asia\/Hong_Kong",\s*comingSoon:\s*true/.test(session),
  "picker must list Hong Kong as Coming Soon / planned"
);
assert(
  /id:\s*"melbourne",\s*name:\s*"Melbourne",\s*timeZone:\s*"Australia\/Melbourne",\s*comingSoon:\s*true/.test(
    session
  ),
  "Melbourne stays Coming Soon"
);
assert(/id:\s*"rotterdam"/.test(session), "Rotterdam must remain in the NL picker");
assert(/id:\s*"stockholm"/.test(session), "Stockholm stays Coming Soon");
assert(!/id:\s*"china"|id:\s*"mtr"|id:\s*"kowloon"/.test(session), "do not start China / mtr / kowloon");
assert(!/MULTI_CITY_IDS = \[[^\]]*hong-kong/.test(session), "hong-kong must not be in city-session MULTI_CITY_IDS");
assert(/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(session), "rotterdam must remain in city-session MULTI_CITY_IDS");

const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*hong-kong/.test(appJs), "hong-kong must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*hong-kong/.test(appJs), "hong-kong must not be in the live nearby list");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*amsterdam/.test(appJs), "Amsterdam must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*rotterdam/.test(appJs), "Rotterdam must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*perth/.test(appJs), "Perth must remain in LIVE_CITY_IDS");

const liveCityApi = readFileSync(join(ROOT, "lib/cities/live-city-api.js"), "utf8");
assert(!/MULTI_CITY_IDS = \[[^\]]*hong-kong/.test(liveCityApi), "hong-kong must not be in live-city-api MULTI_CITY_IDS");

const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
assert(!/"hong-kong"/.test(pkg), "do not add hong-kong scripts or bump version for a planned city");

void blob;

console.log(
  "hong-kong-planned-gate: ok (planned/501, D1 pack + D2 fixture, picker Coming Soon, adapterReady false, 95 stations, REST not wired, Perth/Amsterdam/Rotterdam green)"
);
