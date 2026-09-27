/**
 * Uppsala is tester-live (flipped by Tim 30 Aug 2026). Mälartåg regional rail
 * only — no UL buses, no SL-pendeln/SL Line 40 (that's Stockholm's own pack).
 * Usage: node qa/uppsala-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";
import { buildCityManifest } from "../lib/cities/city-manifest.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { UPPSALA_HUB } from "../lib/cities/uppsala/marketing-directions.js";
import {
  listUppsalaDogfoodStations,
  getUppsalaDogfoodDirections,
} from "../lib/cities/uppsala/dogfood-next-train.js";
import { UPPSALA_TIMEZONE } from "../lib/providers/uppsala.js";
import { loadLocalGtfsSnapshotForStaleCheck } from "./lib/local-gtfs-snapshot.mjs";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("uppsala");
assert(live?.ok === true, "assertCityLive(uppsala) must pass");
assert(getCity("uppsala")?.status === "live", "uppsala registry status must be live");
assert(getCity("uppsala")?.adapterReady === true, "uppsala adapterReady must be true");
assert(isMultiCity("uppsala") === true, "uppsala must be in MULTI_CITY_IDS");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");
assert(assertCityLive("malmo")?.ok === true, "Malmö stays live");

// Static GTFS must load from the blob snapshot, never Trafiklab directly on
// the request path (docs/jim-brief-sweden-static-429-and-key-leak.md).
const uppsalaProviderSrc = readFileSync(join(ROOT, "lib/providers/uppsala.js"), "utf8");
assert(
  /gtfsFixtureBlobUrl\("uppsala"\)/.test(uppsalaProviderSrc),
  "uppsala static loader must use the blob snapshot"
);
assert(
  !/trafiklabGtfsStaticUrl/.test(uppsalaProviderSrc),
  "uppsala must not build a Trafiklab static URL (429 risk) — RT only"
);

// Registry identity + D1 pack (absorbed from the retired uppsala-planned-gate).
const entry = getCity("uppsala");
assert(entry?.displayName === "Uppsala", "uppsala display name must be Uppsala");
assert(entry?.agency === "Mälardalstrafik (Mälartåg)", "uppsala agency is Mälardalstrafik (Mälartåg)");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY"), "uppsala needs TRAFIKLAB_API_KEY");
assert((entry.envKeys ?? []).includes("TRAFIKLAB_API_KEY_RT"), "uppsala needs TRAFIKLAB_API_KEY_RT");
assert(getCity("uppsala").id !== "stockholm", "uppsala must be its own registry entry, not merged into stockholm");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(ROOT, "docs/uppsala-d1", name)), `docs/uppsala-d1/${name} is required`);
}
const catalogJson = JSON.parse(readFileSync(join(ROOT, "lib/cities/uppsala/stations.json"), "utf8"));
assert((catalogJson.stations ?? []).length === 19, `19 unique station names, got ${(catalogJson.stations ?? []).length}`);

// Visible to the live app: the /api/cities manifest (which now drives the picker, nearby
// eligibility, and persistence client-side, docs/jim-brief-registry-driven-client.md) and
// live-city-api's MULTI_CITY_IDS (the dogfood-mount authorization gate) must both include
// uppsala now that it's flipped live.
const manifestCityIds = buildCityManifest().cities.map((c) => c.id);
assert(manifestCityIds.includes("uppsala"), "uppsala must be in the /api/cities manifest");
assert(MULTI_CITY_IDS.includes("uppsala"), "uppsala must be in live-city-api MULTI_CITY_IDS");

// Dogfood station list + directions come from the catalog, not GTFS parses.
const stations = listUppsalaDogfoodStations();
assert(stations.length === 19, `dogfood stations must be the 19 D1 names, got ${stations.length}`);
const names = new Set(stations.map((row) => row.name));
assert(names.has(UPPSALA_HUB), "hub must be listed");
assert(UPPSALA_HUB === "Uppsala C", "hub lock is Uppsala C");

const hubPack = getUppsalaDogfoodDirections(UPPSALA_HUB);
assert(hubPack.source === "uppsala-marketing-ends", "directions source must be uppsala-marketing-ends");
const hub = hubPack.directions;
assert(hub.every((label) => label.startsWith("Mälartåg mot ")), "Uppsala C chips are Mälartåg only");
assert(hub.includes("Mälartåg mot Gävle C"), "Uppsala C must include the Gävle corridor chip");
assert(!hub.some((label) => /line 40|pendeltåg|sl-pendeln/i.test(label)), "SL Line 40 must never appear on Uppsala's own board");

// The production dispatch entry exists.
const dispatched = await getMultiCityDirections("uppsala", UPPSALA_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hub),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);

// Bundled client-side data ships with the flip.
const catalogFile = join(ROOT, "public/city-catalogs/uppsala.json");
assert(existsSync(catalogFile), "public/city-catalogs/uppsala.json must exist");
assert(
  readFileSync(catalogFile, "utf8") === readFileSync(join(ROOT, "lib/cities/uppsala/stations.json"), "utf8"),
  "public/city-catalogs/uppsala.json must be a verbatim copy of lib/cities/uppsala/stations.json"
);
const bundled = JSON.parse(readFileSync(join(ROOT, "public/city-directions/uppsala.json"), "utf8"));
assert(
  hub.every((chip) => (bundled[UPPSALA_HUB] ?? []).includes(chip)),
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
await vercelBoard({ method: "GET", query: { city: "uppsala", station: UPPSALA_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// Local fixture (real Samtrafiken calendar data, trimmed), not the live
// Blob store — see qa/lib/local-gtfs-snapshot.mjs and
// docs/jim-brief-blob-transfer-reduction.md (item 1).
await assertSnapshotNotStaleTodayOrSkip("uppsala", () =>
  loadLocalGtfsSnapshotForStaleCheck("uppsala", UPPSALA_TIMEZONE)
);

console.log(
  "uppsala-dogfood-gate: ok (tester-live, dispatch ready, bundled chips, Mälartåg-only, Uppsala C hub, no SL Line 40 leak, snapshot not stale today)"
);
