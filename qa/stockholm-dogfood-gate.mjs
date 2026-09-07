/**
 * Stockholm is tester-live (flipped by Tim 30 Aug 2026). SL Transport JSON is
 * a realtime feed (`expected` times, no key) — the opposite of Göteborg's
 * schedule-only gap, and asserted as such rather than copied blind.
 * Usage: node qa/stockholm-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  METRO_HUB,
  PENDELTÅG_HUB,
  SJ_HUB,
} from "../lib/cities/stockholm/marketing-directions.js";
import {
  listStockholmDogfoodStations,
  getStockholmDogfoodDirections,
} from "../lib/cities/stockholm/dogfood-next-train.js";

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

// Tester-live (flipped by Tim 30 Aug 2026).
const live = assertCityLive("stockholm");
assert(live?.ok === true, "assertCityLive(stockholm) must pass");
assert(getCity("stockholm")?.status === "live", "stockholm registry status must be live");
assert(getCity("stockholm")?.adapterReady === true, "stockholm adapterReady must be true");
assert(isMultiCity("stockholm") === true, "stockholm must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg is tester-live");

// Registry identity + D1 pack (absorbed from the retired stockholm-planned-gate).
const entry = getCity("stockholm");
assert(entry?.displayName === "Stockholm", "stockholm display name must be Stockholm");
assert(entry?.timeZone === "Europe/Stockholm", "stockholm timezone must be Europe/Stockholm");
assert(entry?.agency === "SL", "Stockholm agency is SL");
assert(
  JSON.stringify(entry.envKeys ?? []) === JSON.stringify(TRAFIKLAB_KEYS),
  "stockholm envKeys must be Trafiklab GTFS Sweden names only"
);
assert(!getCity("sweden"), "city=sweden must not exist");
// Malmö is its own separate planned city (docs/malmo-d1/) — assert non-merger, not non-existence.
assert(!getCity("malmö"), "malmo's registry id must be ascii malmo, not malmö");
if (getCity("malmo")) {
  assert(getCity("malmo").id !== "stockholm", "malmo must be its own registry entry, not merged into stockholm");
  assert(getCity("malmo").agency !== entry.agency, "malmo (Skånetrafiken) must not share stockholm's SL agency");
}
assert(!CITIES.some((city) => city.id === "sweden"), "registry must not invent city=sweden");
const goteborgEntry = getCity("goteborg");
assert(!goteborgEntry || goteborgEntry.id === "goteborg", "Göteborg if present is a separate city");
assert(goteborgEntry?.id !== "stockholm", "do not merge Göteborg into Stockholm");

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
assert(network.printedInnerCityNames?.lockMetro === "T-Centralen", "metro hub lock T-Centralen");
assert(network.printedInnerCityNames?.lockPendeltag === "Stockholm City", "pendeltåg hub lock Stockholm City");
assert(
  (network.printedInnerCityNames?.doNotCollapse ?? []).includes("Stockholms central"),
  "must not collapse Stockholms central"
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

// Visible to the live app: picker + visibility wiring must include stockholm.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "stockholm must be in LIVE_CITY_IDS");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*stockholm/.test(appJs), "stockholm must be in NEARBY_MULTI_CITY_IDS");
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(
  /id:\s*"stockholm",\s*name:\s*"Stockholm",\s*timeZone:\s*"Europe\/Stockholm"/.test(citySession),
  "stockholm must be a picker entry"
);
assert(
  !/id:\s*"stockholm"[^}]*comingSoon:\s*true/.test(citySession),
  "stockholm's city-session entry must not be comingSoon after the flip"
);
assert(
  /id:\s*"goteborg",\s*name:\s*"Göteborg",\s*timeZone:\s*"Europe\/Stockholm"/.test(citySession),
  "Göteborg is a separate picker sibling, not merged into Stockholm"
);
assert(/MULTI_CITY_IDS = \[[^\]]*stockholm/.test(citySession), "stockholm must be in city-session MULTI_CITY_IDS");

// Dogfood station list + directions come from the catalog.
const stations = listStockholmDogfoodStations();
assert(stations.length === 153, `dogfood stations must be the 153 D1 names, got ${stations.length}`);
const names = new Set(stations.map((row) => row.name));
assert(names.has(METRO_HUB) && names.has(PENDELTÅG_HUB), "hubs must be listed");
assert(names.has("Odenplan") && names.has("Stockholm Odenplan"), "Odenplan and Stockholm Odenplan are distinct stations");
assert(!names.has(SJ_HUB), "Stockholms central must not be a v1 board station");

const metroPack = getStockholmDogfoodDirections(METRO_HUB);
assert(metroPack.source === "stockholm-marketing-ends", "directions source must be stockholm-marketing-ends");
const metro = metroPack.directions;
assert(METRO_HUB === "T-Centralen", "metro hub lock is T-Centralen");
assert(PENDELTÅG_HUB === "Stockholm City", "pendeltåg hub lock is Stockholm City");
assert(metro.includes("Röda linjen + Norsborg"), "T-Centralen must offer Röda linjen + Norsborg");
assert(metro.includes("Blå linjen + Hjulsta"), "T-Centralen must offer Blå linjen + Hjulsta");
assert(!metro.some((label) => /pendeltåg/i.test(label)), "T-Centralen must not show pendeltåg chips");
assert(!metro.some((label) => /inbound|outbound|to city/i.test(label)), "chips are line + terminus, never to City");
const city = getStockholmDogfoodDirections(PENDELTÅG_HUB).directions;
assert(city.length > 0 && city.every((label) => label.startsWith("Pendeltåg ")), "Stockholm City is pendeltåg only");
assert(city.includes("Pendeltåg 40 + Uppsala C"), "Stockholm City must offer Pendeltåg 40 + Uppsala C");
assert(!city.some((label) => /pendeltåg 48/i.test(label)), "line 48 must not appear at Stockholm City");
assert(getStockholmDogfoodDirections(SJ_HUB).directions.length === 0, "Stockholms central must not collapse into a hub");
assert(getStockholmDogfoodDirections("Stockholm C").directions.length === 0, "Stockholm C must not collapse into a hub");

// The production dispatch entry is live and reachable.
const dispatched = await getMultiCityDirections("stockholm", METRO_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(metro),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data matches the catalog.
const catalogFile = join(ROOT, "public/city-catalogs/stockholm.json");
assert(existsSync(catalogFile), "public/city-catalogs/stockholm.json must exist");
assert(
  readFileSync(catalogFile, "utf8") === readFileSync(join(ROOT, "lib/cities/stockholm/stations.json"), "utf8"),
  "public/city-catalogs/stockholm.json must be a verbatim copy of lib/cities/stockholm/stations.json"
);
const bundled = JSON.parse(readFileSync(join(ROOT, "public/city-directions/stockholm.json"), "utf8"));
assert(
  metro.every((chip) => (bundled[METRO_HUB] ?? []).includes(chip)),
  "bundled hub chips must match marketingLabelsForStation"
);
assert(!(SJ_HUB in bundled), "Stockholms central must not have bundled chips");

// Realtime honesty: SL Transport is a live feed — the adapter must surface
// `expected` times and the realtime flag, and must not claim schedule-only.
const adapterSrc = readFileSync(join(ROOT, "lib/providers/stockholm.js"), "utf8");
assert(adapterSrc.includes("transport.integration.sl.se"), "adapter must use SL Transport");
assert(adapterSrc.includes("departure.expected"), "adapter must prefer realtime expected times");
assert(adapterSrc.includes("realtime: true"), "board must surface the honest realtime flag");
assert(!/schedule-only until/i.test(adapterSrc), "adapter must not copy Göteborg's schedule-only claim");
assert(/SL Transport JSON \(no key\)/.test(getCity("stockholm")?.integration ?? ""), "registry must document keyless SL Transport");

// Probe plumbing: local express only; Vercel dev board must 404 regardless.
const previous = process.env.ALLOW_CITY_PROBES;
delete process.env.ALLOW_CITY_PROBES;
assert(isCityProbeAllowed() === false, "CI/default must not allow city probes");
process.env.ALLOW_CITY_PROBES = "1";
assert(isCityProbeAllowed() === true, "ALLOW_CITY_PROBES=1 enables local express probes only");

const res = {
  statusCode: 0,
  body: null,
  setHeader() {},
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
await vercelBoard({ method: "GET", query: { city: "stockholm", station: METRO_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "stockholm-dogfood-gate: ok (tester-live, dispatch ready, bundled chips, realtime SL Transport documented, T-Centralen/Stockholm City hubs)"
);
