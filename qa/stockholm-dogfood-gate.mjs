/**
 * Stockholm dogfood machinery is fully wired while the city stays planned and
 * invisible (picker Coming Soon only). SL Transport JSON is a realtime feed
 * (`expected` times, no key) — the opposite of Göteborg's schedule-only gap,
 * and asserted as such rather than copied blind.
 * Usage: node qa/stockholm-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// City stays planned — dogfood wiring must not leak it live.
const live = assertCityLive("stockholm");
assert(live?.ok === false, "assertCityLive(stockholm) must still fail");
assert(live?.status === 501, "stockholm must stay 501 planned");
assert(getCity("stockholm")?.status === "planned", "stockholm registry status must stay planned");
assert(getCity("stockholm")?.adapterReady === true, "stockholm adapterReady must be true");
assert(isMultiCity("stockholm") === false, "stockholm must stay out of MULTI_CITY_IDS until Tim flips");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("rotterdam")?.ok === true, "Rotterdam stays live");
assert(assertCityLive("goteborg")?.ok === false, "Göteborg stays planned");

// Invisible to the live app: picker shows Coming Soon only, no live wiring.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(!/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "stockholm must not be in LIVE_CITY_IDS");
assert(!/NEARBY_MULTI_CITY_IDS = \[[^\]]*stockholm/.test(appJs), "stockholm must not be in NEARBY_MULTI_CITY_IDS");
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(
  /id:\s*"stockholm",\s*name:\s*"Stockholm",\s*timeZone:\s*"Europe\/Stockholm",\s*comingSoon:\s*true/.test(citySession),
  "stockholm must stay Coming Soon in the picker"
);
assert(!/MULTI_CITY_IDS = \[[^\]]*stockholm/.test(citySession), "stockholm must not be in city-session MULTI_CITY_IDS");

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

// The production dispatch entry exists (unreachable until MULTI_CITY_IDS flip).
const dispatched = await getMultiCityDirections("stockholm", METRO_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(metro),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data ships ahead of the flip.
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
  "stockholm-dogfood-gate: ok (planned + Coming Soon only, dispatch ready, bundled chips, realtime SL Transport documented, T-Centralen/Stockholm City hubs)"
);
