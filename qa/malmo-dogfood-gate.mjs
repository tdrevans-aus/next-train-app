/**
 * Malmö is tester-live (flipped by Tim 30 Aug 2026). Öresundståg and Krösatågen
 * are `in` per docs/board-eligibility-rule.md — shown as distinct entries
 * alongside Pågatågen, not hidden.
 * Usage: node qa/malmo-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { MALMO_HUB, mapMalmoDestination } from "../lib/cities/malmo/marketing-directions.js";
import {
  listMalmoDogfoodStations,
  getMalmoDogfoodDirections,
} from "../lib/cities/malmo/dogfood-next-train.js";
import { tripAllowed, malmoLineId } from "../lib/providers/malmo.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("malmo");
assert(live?.ok === true, "assertCityLive(malmo) must pass");
assert(getCity("malmo")?.status === "live", "malmo registry status must be live");
assert(getCity("malmo")?.adapterReady === true, "malmo adapterReady must be true");
assert(isMultiCity("malmo") === true, "malmo must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg stays live");

// Static GTFS must load from the blob snapshot, never Trafiklab directly on
// the request path (docs/jim-brief-sweden-static-429-and-key-leak.md).
const malmoProviderSrc = readFileSync(join(ROOT, "lib/providers/malmo.js"), "utf8");
assert(
  /gtfsFixtureBlobUrl\("malmo"\)/.test(malmoProviderSrc),
  "malmo static loader must use the blob snapshot"
);
assert(
  !/trafiklabGtfsStaticUrl/.test(malmoProviderSrc),
  "malmo must not build a Trafiklab static URL (429 risk) — RT only"
);

// Registry identity + D1 pack (absorbed from the retired malmo-planned-gate).
const entry = getCity("malmo");
assert(entry?.displayName === "Malmö", "malmo display name must be Malmö");
assert(entry?.agency === "Skånetrafiken / Pågatågen", "malmo agency is Skånetrafiken / Pågatågen");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "malmo needs TRAFIKLAB_API_KEY");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY_RT"), "malmo needs TRAFIKLAB_API_KEY_RT");
assert(!getCity("malmö"), "malmo's registry id must be ascii malmo, not malmö");
assert(getCity("malmo").id !== "goteborg" && getCity("malmo").id !== "stockholm", "malmo must be its own registry entry");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(ROOT, "docs/malmo-d1", name)), `docs/malmo-d1/${name} is required`);
}
const catalogJson = JSON.parse(readFileSync(join(ROOT, "lib/cities/malmo/stations.json"), "utf8"));
assert((catalogJson.stations ?? []).length === 84, `84 unique station names, got ${(catalogJson.stations ?? []).length}`);

// Visible to the live app: picker + visibility wiring must include malmo.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*malmo/.test(appJs), "malmo must be in LIVE_CITY_IDS");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*malmo/.test(appJs), "malmo must be in NEARBY_MULTI_CITY_IDS");
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/MULTI_CITY_IDS = \[[^\]]*malmo/.test(citySession), "malmo must be in city-session MULTI_CITY_IDS");
assert(
  !/\{ id: "malmo"[^}]*comingSoon: true/.test(citySession),
  "malmo's city-session entry must not be comingSoon after the flip"
);
const brisbaneDogfood = readFileSync(join(ROOT, "public/brisbane-dogfood.js"), "utf8");
assert(/MULTI_CITY_IDS = \[[^\]]*malmo/.test(brisbaneDogfood), "malmo must be in brisbane-dogfood MULTI_CITY_IDS");
assert(/available: \{[^}]*malmo: true/.test(brisbaneDogfood), "malmo must be in brisbane-dogfood available map");
const journeyModel = readFileSync(join(ROOT, "public/journey-model.js"), "utf8");
assert(/PERSISTED_CITY_IDS = new Set\(\[[^\]]*"malmo"/.test(journeyModel), "malmo must be in journey-model PERSISTED_CITY_IDS");
assert(/PERSISTED_COUNTRY_IDS = new Set\(\[[^\]]*"se"/.test(journeyModel), "se must be in journey-model PERSISTED_COUNTRY_IDS");

// Dogfood station list + directions come from the catalog, not GTFS parses.
const stations = listMalmoDogfoodStations();
assert(stations.length === 84, `dogfood stations must be the 84 D1 names, got ${stations.length}`);
const names = new Set(stations.map((row) => row.name));
assert(names.has(MALMO_HUB), "hub must be listed");
assert(MALMO_HUB === "Malmö C", "hub lock is Malmö C");

const hubPack = getMalmoDogfoodDirections(MALMO_HUB);
assert(hubPack.source === "malmo-marketing-ends", "directions source must be malmo-marketing-ends");
const hub = hubPack.directions;
assert(hub.some((label) => label.startsWith("Pågatågen mot ")), "Malmö C must offer Pågatågen chips");
// Öresundståg/Krösatågen termini vary per live trip (not a fixed small corridor set like
// Pågatågen's), so they are NOT in the static marketingLabelsForStation() line-map listing —
// verify board-eligibility `in` at the source level instead, same as malmo-planned-gate did.
assert(
  tripAllowed({ routeLongName: "", routeDesc: "Öresundståg" }) === true,
  "Öresundståg trips (route_desc) must be allowed on the board — board-eligibility-rule.md verdict in"
);
assert(
  tripAllowed({ routeLongName: "", routeDesc: "Krösatåg" }) === true,
  "Krösatågen trips (route_desc) must be allowed on the board — board-eligibility-rule.md verdict in"
);
assert(malmoLineId({ routeDesc: "Öresundståg" }, MALMO_HUB) === "oresundstag", "Öresundståg trips get lineId oresundstag");
assert(
  mapMalmoDestination("Köpenhamn C", "oresundstag") === "Öresundståg mot Köpenhamn C",
  "Öresundståg chip is product + far end, not folded into Pågatågen phrasing"
);
assert(!hub.some((label) => /^(Ø |mot Ø )/.test(label)), "chips must never leak the raw GTFS route_long_name corridor string");

// The production dispatch entry exists.
const dispatched = await getMultiCityDirections("malmo", MALMO_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hub),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data ships with the flip.
const catalogFile = join(ROOT, "public/city-catalogs/malmo.json");
assert(existsSync(catalogFile), "public/city-catalogs/malmo.json must exist");
assert(
  readFileSync(catalogFile, "utf8") === readFileSync(join(ROOT, "lib/cities/malmo/stations.json"), "utf8"),
  "public/city-catalogs/malmo.json must be a verbatim copy of lib/cities/malmo/stations.json"
);
const bundled = JSON.parse(readFileSync(join(ROOT, "public/city-directions/malmo.json"), "utf8"));
assert(
  hub.every((chip) => (bundled[MALMO_HUB] ?? []).includes(chip)),
  "bundled hub chips must match marketingLabelsForStation"
);

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
await vercelBoard({ method: "GET", query: { city: "malmo", station: MALMO_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "malmo-dogfood-gate: ok (tester-live, dispatch ready, bundled chips, Öresundståg/Krösatågen shown, Malmö C hub, no raw-corridor leaks)"
);
