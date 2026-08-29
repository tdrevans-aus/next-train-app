/**
 * Wellington is tester-live (flipped by Tim 30 Aug 2026). Metlink GTFS-RT
 * (METLINK_API_KEY). TRAIN only. MEL live terminus is Western Hutt Station
 * while Melling Station is closed (~late 2028) — do not invent Melling.
 * Usage: node qa/wellington-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { HUB, MARKETING_ENDS } from "../lib/cities/wellington/marketing-directions.js";
import {
  listWellingtonDogfoodStations,
  getWellingtonDogfoodDirections,
} from "../lib/cities/wellington/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const D1_FILES = [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "qa-note.md",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Tester-live (flipped by Tim 30 Aug 2026).
const live = assertCityLive("wellington");
assert(live?.ok === true, "assertCityLive(wellington) must pass");
assert(getCity("wellington")?.status === "live", "wellington registry status must be live");
assert(getCity("wellington")?.adapterReady === true, "wellington adapterReady must be true");
assert(isMultiCity("wellington") === true, "wellington must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("auckland")?.ok === true, "Auckland stays live");

// Registry identity + D1 pack (absorbed from the retired wellington-planned-gate).
const entry = getCity("wellington");
assert(entry?.displayName === "Wellington", "wellington display name must be Wellington");
assert(entry?.timeZone === "Pacific/Auckland", "wellington timezone must be Pacific/Auckland");
assert(entry?.agency === "Metlink", "Wellington agency is Metlink");
assert((entry.envKeys ?? []).includes("METLINK_API_KEY"), "wellington needs METLINK_API_KEY");
assert(entry.modes?.length === 1 && entry.modes[0] === "train", "wellington modes v1 TRAIN only");
assert(!getCity("nz"), "city=nz must not exist");

const d1Dir = join(ROOT, "docs/wellington-d1");
for (const name of D1_FILES) {
  assert(existsSync(join(d1Dir, name)), `docs/wellington-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/wellington/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(d1Json === readFileSync(fixturePath, "utf8"), "fixture must be verbatim D1 copy");

const network = JSON.parse(d1Json);
assert(network.uniqueStationCount === 47, "D1 unique station count must be 47");
assert(
  network.printedInnerCityNames?.lock === "Wellington Station",
  "hub lock must be Wellington Station"
);
const mel = network.lines.find((line) => line.number === "MEL");
assert(mel?.termini?.includes("Western Hutt Station"), "MEL live terminus is Western Hutt");
assert(!mel?.stations?.includes("Melling Station"), "closed Melling Station must not be on MEL array");

const catalog = JSON.parse(readFileSync(join(ROOT, "lib/cities/wellington/stations.json"), "utf8"));
const catalogNames = new Set((catalog.stations ?? []).map((s) => s.name));
assert(catalogNames.size === 47, "catalog must have 47 stations");
for (const name of network.uniqueStations ?? []) {
  assert(catalogNames.has(name), `catalog missing D1 station ${name}`);
}

const adapterSrc = readFileSync(join(ROOT, "lib/providers/wellington.js"), "utf8");
assert(adapterSrc.includes("METLINK_API_KEY") || adapterSrc.includes("metlinkAuthHeaders"), "adapter uses Metlink auth");
assert(adapterSrc.includes("WELLINGTON_GTFS_STATIC_URL"), "adapter pins static URL");

// Visible to the live app: picker + visibility wiring must include wellington.
const appJs = readFileSync(join(ROOT, "public/app.js"), "utf8");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*wellington/.test(appJs), "wellington must be in LIVE_CITY_IDS");
assert(/NEARBY_MULTI_CITY_IDS = \[[^\]]*wellington/.test(appJs), "wellington must be in NEARBY_MULTI_CITY_IDS");
assert(/LIVE_CITY_IDS = new Set\(\[[^\]]*auckland/.test(appJs), "Auckland must remain in LIVE_CITY_IDS");
const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(
  /id:\s*"wellington",\s*name:\s*"Wellington",\s*timeZone:\s*"Pacific\/Auckland"\s*\}/.test(citySession),
  "wellington must be a picker entry"
);
assert(
  !/id:\s*"wellington"[^}]*comingSoon:\s*true/.test(citySession),
  "wellington's city-session entry must not be comingSoon after the flip"
);
assert(/MULTI_CITY_IDS = \[[^\]]*wellington/.test(citySession), "wellington must be in city-session MULTI_CITY_IDS");

// Dogfood station list + directions come from the catalog, not GTFS parses.
const stations = listWellingtonDogfoodStations();
assert(stations.length === 47, `dogfood stations must be the 47 D1 names, got ${stations.length}`);
const names = new Set(stations.map((row) => row.name));
assert(names.has(HUB), "hub must be listed");
assert(!names.has("Melling Station"), "closed Melling Station must not be a board station");

const hubPack = getWellingtonDogfoodDirections(HUB);
assert(hubPack.source === "wellington-marketing-ends", "directions source must be wellington-marketing-ends");
const hub = hubPack.directions;
assert(HUB === "Wellington Station", "hub lock is Wellington Station");
assert(hub.includes("Kāpiti Line Waikanae Station"), "hub must offer Kāpiti Line Waikanae Station");
assert(hub.includes("Melling Line Western Hutt Station"), "hub must offer Melling Line Western Hutt Station (not Melling)");
assert(!hub.some((label) => /melling station$/i.test(label)), "hub must not offer a Melling Station chip");
assert(!hub.some((label) => /inbound|outbound|to city/i.test(label)), "chips are line + terminus, never to City");
assert(MARKETING_ENDS.MEL.includes("Western Hutt Station"), "MEL marketing end is Western Hutt Station");

// The production dispatch entry is live and reachable.
const dispatched = await getMultiCityDirections("wellington", HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hub),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data matches the catalog.
const catalogFile = join(ROOT, "public/city-catalogs/wellington.json");
assert(existsSync(catalogFile), "public/city-catalogs/wellington.json must exist");
assert(
  readFileSync(catalogFile, "utf8") === readFileSync(join(ROOT, "lib/cities/wellington/stations.json"), "utf8"),
  "public/city-catalogs/wellington.json must be a verbatim copy of lib/cities/wellington/stations.json"
);
const bundled = JSON.parse(readFileSync(join(ROOT, "public/city-directions/wellington.json"), "utf8"));
assert(
  hub.every((chip) => (bundled[HUB] ?? []).includes(chip)),
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
await vercelBoard({ method: "GET", query: { city: "wellington", station: HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "wellington-dogfood-gate: ok (tester-live, dispatch ready, bundled chips, Wellington Station hub, MEL→Western Hutt)"
);
