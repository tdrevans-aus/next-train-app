/**
 * Göteborg is tester-live (flipped by Tim 30 Aug 2026). Schedule-only RT
 * (Trafiklab publishes no TripUpdates for vt) is documented and surfaced
 * honestly — never asserted away.
 * Usage: node qa/goteborg-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  TRAM_HUB,
  PENDELTÅG_HUB,
} from "../lib/cities/goteborg/marketing-directions.js";
import {
  listGoteborgDogfoodStations,
  getGoteborgDogfoodDirections,
} from "../lib/cities/goteborg/dogfood-next-train.js";

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

// Tester-live (flipped by Tim 30 Aug 2026).
const live = assertCityLive("goteborg");
assert(live?.ok === true, "assertCityLive(goteborg) must pass");
assert(getCity("goteborg")?.status === "live", "goteborg registry status must be live");
assert(getCity("goteborg")?.adapterReady === true, "goteborg adapterReady must be true");
assert(isMultiCity("goteborg") === true, "goteborg must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("rotterdam")?.ok === true, "Rotterdam stays live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");

// Registry identity + D1 pack (absorbed from the retired goteborg-planned-gate).
const entry = getCity("goteborg");
assert(entry?.displayName === "Göteborg", "goteborg display name must be Göteborg");
assert(entry?.timeZone === "Europe/Stockholm", "goteborg timezone must be Europe/Stockholm");
assert(entry?.agency === "Västtrafik", "Göteborg agency is Västtrafik");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "goteborg needs TRAFIKLAB_API_KEY");
assert(!entry.modes?.includes("metro"), "goteborg has no metro");
assert(entry.modes?.includes("tram") && entry.modes?.includes("train"), "goteborg modes v1 are tram + train");
assert(!getCity("sweden"), "city=sweden must not exist");
assert(!getCity("gothenburg"), "city id is goteborg, not gothenburg");
assert(!getCity("malmo") && !getCity("malmö"), "do not merge Malmö into this city");
assert(!CITIES.some((city) => city.id === "sweden"), "registry must not invent city=sweden");
assert(CITIES.filter((city) => city.id === "goteborg").length === 1, "goteborg must appear once in the registry");

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
assert(published.printedInnerCityNames?.lock === "Brunnsparken", "D1 lock is Brunnsparken");
assert(published.printedInnerCityNames?.lockPendeltag === "Göteborg Central", "D1 pendeltåg lock is Göteborg Central");

assert(existsSync(join(ROOT, "lib/providers/goteborg.js")), "goteborg adapter must exist");
assert(
  existsSync(join(ROOT, "lib/providers/gtfs/realtime-board.js")),
  "shared realtime-board.js must exist"
);
const providerSrc = readFileSync(join(ROOT, "lib/providers/goteborg.js"), "utf8");
assert(providerSrc.includes("realtime-board.js"), "goteborg adapter must reuse realtime-board.js");

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

// Visible to the live app: picker + visibility wiring must include goteborg.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*goteborg/.test(appJs), "goteborg must be in LIVE_CITY_IDS");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*goteborg/.test(appJs), "goteborg must be in NEARBY_MULTI_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*stockholm/.test(appJs), "Stockholm must remain in LIVE_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*rotterdam/.test(appJs), "Rotterdam must remain in LIVE_CITY_IDS");
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(
  /id:\s*"goteborg",\s*name:\s*"Göteborg",\s*timeZone:\s*"Europe\/Stockholm"\s*\}/.test(citySession),
  "goteborg must be a picker entry"
);
assert(
  !/id:\s*"goteborg"[^}]*comingSoon:\s*true/.test(citySession),
  "goteborg's city-session entry must not be comingSoon after the flip"
);
assert(/MULTI_CITY_IDS = \[[^\]]*goteborg/.test(citySession), "goteborg must be in city-session MULTI_CITY_IDS");
assert(/MULTI_CITY_IDS = \[[^\]]*rotterdam/.test(citySession), "rotterdam must remain in city-session MULTI_CITY_IDS");

// Dogfood station list + directions come from the catalog, not GTFS parses.
const stations = listGoteborgDogfoodStations();
assert(stations.length === 157, `dogfood stations must be the 157 D1 names, got ${stations.length}`);
const names = new Set(stations.map((row) => row.name));
assert(names.has(TRAM_HUB) && names.has(PENDELTÅG_HUB), "hubs must be listed");
assert(names.has("Drottningtorget"), "Drottningtorget (renamed tram halt) must be listed");
assert(!names.has("Centralstationen"), "Centralstationen must not be a product name");

const hubPack = getGoteborgDogfoodDirections(TRAM_HUB);
assert(hubPack.source === "goteborg-marketing-ends", "directions source must be goteborg-marketing-ends");
const hub = hubPack.directions;
assert(TRAM_HUB === "Brunnsparken", "tram hub lock is Brunnsparken");
assert(PENDELTÅG_HUB === "Göteborg Central", "pendeltåg hub lock is Göteborg Central");
assert(hub.includes("1 + Tynnered"), "Brunnsparken must offer 1 + Tynnered");
assert(hub.includes("11 + Saltholmen"), "Brunnsparken must offer 11 + Saltholmen");
assert(!hub.some((label) => /^(8|12) \+ /.test(label)), "lines 8 and 12 miss Brunnsparken (Korsvägen)");
assert(!hub.some((label) => /inbound|outbound|to city/i.test(label)), "chips are line + terminus, never to City");
const central = getGoteborgDogfoodDirections(PENDELTÅG_HUB).directions;
assert(central.length === 3 && central.every((label) => label.startsWith("Västtågen + ")), "Göteborg Central is Västtågen only");
assert(getGoteborgDogfoodDirections("Centralstationen").directions.length === 0, "Centralstationen must not collapse into a hub");

// The production dispatch entry is live and reachable.
const dispatched = await getMultiCityDirections("goteborg", TRAM_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hub),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data matches the catalog.
const catalogFile = join(ROOT, "public/city-catalogs/goteborg.json");
assert(existsSync(catalogFile), "public/city-catalogs/goteborg.json must exist");
assert(
  readFileSync(catalogFile, "utf8") === readFileSync(join(ROOT, "lib/cities/goteborg/stations.json"), "utf8"),
  "public/city-catalogs/goteborg.json must be a verbatim copy of lib/cities/goteborg/stations.json"
);
const bundled = JSON.parse(readFileSync(join(ROOT, "public/city-directions/goteborg.json"), "utf8"));
assert(
  hub.every((chip) => (bundled[TRAM_HUB] ?? []).includes(chip)),
  "bundled hub chips must match marketingLabelsForStation"
);

// Schedule-only honesty: adapter documents the vt RT gap and still attempts the
// standard Trafiklab RT URL so nothing changes if TripUpdates appear later.
const adapterSrc = readFileSync(join(ROOT, "lib/providers/goteborg.js"), "utf8");
assert(/schedule-only/i.test(adapterSrc), "adapter must document the schedule-only RT reality");
assert(adapterSrc.includes("trafiklabGtfsRtTripUpdatesUrl"), "adapter must still attempt the standard RT URL");
assert(adapterSrc.includes("realtime: board.realtime === true"), "board must surface the honest realtime flag");
assert(/TripUpdates not published for vt/i.test(getCity("goteborg")?.integration ?? ""), "registry must document the vt RT gap");

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
await vercelBoard({ method: "GET", query: { city: "goteborg", station: TRAM_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "goteborg-dogfood-gate: ok (tester-live, dispatch ready, bundled chips, schedule-only documented, Brunnsparken/Göteborg Central hubs)"
);
