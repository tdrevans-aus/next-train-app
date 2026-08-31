/**
 * Oslo is tester-live (flipped by Tim 30 Aug 2026). T-bane (lines 1–5, 101
 * stations), Vy regional/commuter rail (RE10, RE11, R12, R13, R14, R21, L1, L2),
 * and Flytoget (FLY1, FLY2) at Jernbanetorget and Nationaltheatret only are
 * `in` per docs/board-eligibility-rule.md — walk-up, no compulsory reservation,
 * no check-in barrier. doNotGroup, three-way (T-bane / Vy / Flytoget).
 * Usage: node qa/oslo-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { OSLO_HUB, resolveCatalogEntry, listCatalogStations, classifyMapGroup } from "../lib/providers/oslo.js";
import {
  marketingLabelsForStation,
  mapOsloDestination,
  stripViaSuffix,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenTerminusToken,
  isOsloSNameFamily,
} from "../lib/cities/oslo/marketing-directions.js";
import {
  listOsloDogfoodStations,
  getOsloDogfoodDirections,
} from "../lib/cities/oslo/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Registry identity + live status.
const live = assertCityLive("oslo");
assert(live?.ok === true, "assertCityLive(oslo) must pass");
assert(getCity("oslo")?.status === "live", "oslo registry status must be live");
assert(getCity("oslo")?.adapterReady === true, "oslo adapterReady must be true");
assert(CITIES.filter((city) => city.id === "oslo").length === 1, "oslo must appear once in the registry");
assert(!getCity("norway"), "must not be registered as city=norway");

// Dogfood dispatch wiring — oslo is now in MULTI_CITY_IDS (landed with status flip).
assert(isMultiCity("oslo") === true, "oslo must be in MULTI_CITY_IDS post-flip");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg stays live");

// D1 pack (absorbed from the retired oslo-planned-gate).
const d1Dir = join(ROOT, "docs/oslo-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/oslo-d1/${name} is required`);
}
const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/oslo/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/oslo/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/oslo/published-network.json must be a verbatim copy of docs/oslo-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "oslo", "D1 city id is oslo");
assert(network.printedInnerCityNames?.lock === OSLO_HUB, `D1 lock must be ${OSLO_HUB}`);

const tbaneLines = network.lines.filter((line) => line.mapGroup === "T-bane");
assert(tbaneLines.length === 5, "D1 must carry exactly T-bane lines 1-5 — no line 6");
const vyLines = network.lines.filter((line) => line.mapGroup === "Vy");
assert(vyLines.length === 8, "D1 must carry exactly the 8 in-scope Vy lines");
const flytogetLines = network.lines.filter((line) => line.mapGroup === "Flytoget");
assert(flytogetLines.length === 2, "D1 must carry exactly FLY1 and FLY2");

// Catalog + doNotGroup station shape.
const stations = listCatalogStations();
assert(stations.length === 101, `catalog must have 101 T-bane stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(OSLO_HUB), `catalog must lock ${OSLO_HUB}`);
assert(!byName.has("Oslo S") && !byName.has("Sentrum"), "catalog must not carry the rail/marketing name family");
const jernbanetorget = byName.get("Jernbanetorget");
assert(
  typeof jernbanetorget.railStationGtfsId === "string" &&
    jernbanetorget.railStationGtfsId.startsWith("NSR:StopPlace:") &&
    jernbanetorget.railStationGtfsId !== jernbanetorget.stationGtfsId,
  "Jernbanetorget must carry a distinct railStationGtfsId for the Oslo S / Vy / Flytoget cluster"
);
assert(resolveCatalogEntry(OSLO_HUB)?.name === OSLO_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Oslo S") === null, "resolveCatalogEntry must reject the forbidden Oslo S rail-name token");

// Direction model — line + terminus, never inbound/outbound vs City/Sentrum.
const hubLabels = marketingLabelsForStation(OSLO_HUB);
assert(hubLabels.includes("1 + Frognerseteren"), "hub must offer 1 + Frognerseteren");
assert(hubLabels.includes("5 + Vestli"), "hub must offer 5 + Vestli");
assert(!hubLabels.some((label) => /inbound|outbound|to city|sentrum|ringen/i.test(label)), "no inbound/outbound/to City/Sentrum/Ringen chips");

// R21 flag — only R21 + Moss ever appears, never R21 + Oslo S.
const jbLabels = marketingLabelsForStation("Jernbanetorget");
assert(jbLabels.includes("R21 + Moss"), "Jernbanetorget must offer R21 + Moss");
assert(!jbLabels.some((label) => /R21.*Oslo S/i.test(label)), "Jernbanetorget must never offer R21 + Oslo S");
assert(jbLabels.includes("FLY1 + Oslo Airport"), "Jernbanetorget must offer FLY1 + Oslo Airport");

assert(isOsloSNameFamily("Oslo S") === true, "Oslo S must be in the self-referential name family");
assert(stripViaSuffix("Vestli via Majorstuen") === "Vestli", "stripViaSuffix must drop the via-stop");
assert(mapOsloDestination("Vestli via Majorstuen", "4") === "4 + Vestli", "mapOsloDestination must combine line + stripped terminus");
assert(isForbiddenTerminusToken("Jernbanetorget") === true, "Jernbanetorget must never be a direction chip terminus");
assert(isForbiddenCollapseName("Jernbanetorget") === false, "Jernbanetorget must stay resolvable as a station");
assert(isForbiddenCollapseName("Oslo S") === true, "Oslo S must never resolve as a station");
assert(foldKey("Ellingsrudåsen") === foldKey("ellingsrudasen"), "foldKey must normalize diacritics");

assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "3", transportMode: "metro", authority: { id: "RUT:Authority:RUT" } } } }) === "T-bane",
  "classifyMapGroup must accept RUT metro line 3 as T-bane"
);
assert(
  classifyMapGroup({ serviceJourney: { line: { publicCode: "R22", transportMode: "rail", authority: { id: "VYG:Authority:VY" } } } }) === null,
  "classifyMapGroup must reject out-of-scope Vy line R22"
);

// Dogfood station list + directions come from the catalog, not GTFS parses.
const dogfoodStations = listOsloDogfoodStations();
assert(dogfoodStations.length === 101, `dogfood stations must be the 101 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(OSLO_HUB), "hub must be listed by the dogfood harness");

const hubPack = getOsloDogfoodDirections(OSLO_HUB);
assert(hubPack.source === "oslo-marketing-ends", "directions source must be oslo-marketing-ends");
assert(
  JSON.stringify(hubPack.directions) === JSON.stringify(hubLabels),
  "dogfood directions must match marketingLabelsForStation"
);

// The production dispatch entry exists and returns the same chips as the dogfood harness.
const dispatched = await getMultiCityDirections("oslo", OSLO_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hubLabels),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatched.source === "oslo-marketing-ends", "live-city-api dispatch source must be oslo-marketing-ends");

// getMultiCityNextTrain must resolve to Oslo's dogfood next-train module (no throw on lookup).
const { getOsloDogfoodNextTrain } = await import("../lib/cities/oslo/dogfood-next-train.js");
assert(typeof getOsloDogfoodNextTrain === "function", "getOsloDogfoodNextTrain must be exported for live-city-api to dispatch to");

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available) are deliberately NOT touched yet — same
// registry-status-derived invariant as MULTI_CITY_IDS above (qa/live-city-lists-sync.mjs
// requires them to equal exactly the live-city set). Add "oslo"/"no" to all four in the same
// commit as the status flip.

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
await vercelBoard({ method: "GET", query: { city: "oslo", station: OSLO_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "oslo-dogfood-gate: ok (dispatch switch-case wired and tested, MULTI_CITY_IDS/mount/persistence lists deliberately deferred to the status-flip commit, D1 pack, 101 T-bane stations, Vy/Flytoget scoped, R21+Moss-only, three-way doNotGroup)"
);
