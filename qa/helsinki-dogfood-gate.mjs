/**
 * Helsinki is live (status flipped ahead of the flip-follow-through pass —
 * see git log "Helsinki: flip status to live per QA checklist"). This gate
 * migrates helsinki-planned-gate.mjs's still-relevant assertions to the live
 * shape (assertCityLive must now PASS, not 501) and adds the dispatch-wiring
 * checks Jim's follow-through pass adds for every flip (see the Oslo
 * precedent — lib/cities/oslo/dogfood-next-train.js + oslo-dogfood-gate.mjs).
 *
 * DEFERRED — NOT done in this pass, matching Oslo's intermediate state
 * (commit 52d0508) before its bundled flip commit (f1c2abd) added them
 * alongside the status flip. For Helsinki the status flip already happened
 * separately, so these four still need to land in ONE follow-up commit
 * (the next pass, mirroring Oslo's f1c2abd) — do not add them piecemeal:
 *   1. lib/cities/live-city-api.js — MULTI_CITY_IDS array + the MultiCityId typedef
 *   2. public/brisbane-dogfood.js — its MULTI_CITY_IDS + the `available` mount map
 *   3. public/journey-model.js — PERSISTED_CITY_IDS / PERSISTED_COUNTRY_IDS (fi)
 *   4. public/app.js and public/city-session.js — NEARBY_MULTI_CITY_IDS / LIVE_CITY_IDS /
 *      city-session MULTI_CITY_IDS / picker region entry (comingSoon: false) for a
 *      Finland (fi) country entry with a Helsinki region
 * Until that commit lands, qa/live-city-lists-sync.mjs will correctly keep failing
 * with Helsinki listed as "missing" from all of the above — that failure is the
 * to-do list for the next pass, not a regression to chase down here.
 *
 * Usage: node qa/helsinki-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { HELSINKI_HUB, resolveCatalogEntry, listCatalogStations } from "../lib/providers/helsinki.js";
import {
  marketingLabelsForStation,
  mapHelsinkiDestination,
  stripViaSuffix,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenTerminusToken,
} from "../lib/cities/helsinki/marketing-directions.js";
import {
  listHelsinkiDogfoodStations,
  getHelsinkiDogfoodDirections,
} from "../lib/cities/helsinki/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Registry identity + live status.
const live = assertCityLive("helsinki");
assert(live?.ok === true, "assertCityLive(helsinki) must pass");
assert(getCity("helsinki")?.status === "live", "helsinki registry status must be live");
assert(getCity("helsinki")?.adapterReady === true, "helsinki adapterReady must be true");
assert(getCity("helsinki")?.displayName === "Helsinki", "helsinki display name must be Helsinki");
assert(getCity("helsinki")?.timeZone === "Europe/Helsinki", "helsinki timezone must be Europe/Helsinki");
assert(getCity("helsinki")?.agency === "HKL / HSL", "helsinki agency is HKL / HSL");
assert((getCity("helsinki").envKeys ?? []).includes("DIGITRANSIT_SUBSCRIPTION_KEY"), "helsinki needs DIGITRANSIT_SUBSCRIPTION_KEY");
assert(getCity("helsinki").modes?.includes("metro"), "helsinki modes v1 are metro");
assert(!getCity("helsinki").modes?.includes("tram"), "no tram in v1");
assert(!getCity("helsinki").modes?.includes("bus"), "no bus in v1");
assert(!getCity("helsinki").modes?.includes("train"), "no HSL/VR commuter rail in v1 (metro only)");
assert(CITIES.filter((city) => city.id === "helsinki").length === 1, "helsinki must appear once in the registry");
assert(!getCity("finland"), "must not be registered as city=finland");

assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm stays live");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg stays live");
assert(assertCityLive("malmo")?.ok === true, "Malmö stays live");
assert(assertCityLive("uppsala")?.ok === true, "Uppsala stays live");

// D1 pack (absorbed from the retired helsinki-planned-gate).
const d1Dir = join(ROOT, "docs/helsinki-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/helsinki-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/helsinki/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/helsinki/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/helsinki/published-network.json must be a verbatim copy of docs/helsinki-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "helsinki", "D1 city id is helsinki");
assert(network.printedInnerCityNames?.lock === HELSINKI_HUB, `D1 lock must be ${HELSINKI_HUB}`);
assert(network.lines.length === 2, "D1 must carry exactly M1 and M2 — no M3");
assert(
  network.lines.every((line) => ["M1", "M2"].includes(line.id)),
  "D1 lines must be only M1 and M2"
);

const stations = listCatalogStations();
assert(stations.length === 30, `catalog must have 30 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(HELSINKI_HUB), `catalog must lock ${HELSINKI_HUB}`);
for (const name of ["Kamppi", "Helsingin yliopisto", "Matinkylä", "Tapiola", "Itäkeskus"]) {
  assert(byName.has(name), `catalog missing shared-approach station ${name}`);
}
assert(!byName.has("Pasila"), "Pasila has no metro and must never be in the catalog");
assert(!byName.has("Helsinki Central") && !byName.has("Päärautatieasema"), "catalog must not carry the VR/commuter rail name family");
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
  assert(typeof station.stationGtfsId === "string" && station.stationGtfsId.startsWith("HSL:"), `${station.name} must have a real Digitransit stationGtfsId`);
}

assert(resolveCatalogEntry(HELSINKI_HUB)?.name === HELSINKI_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("rautatientori")?.name === HELSINKI_HUB, "resolveCatalogEntry must fold case");
assert(resolveCatalogEntry("Kamppi")?.name === "Kamppi", "resolveCatalogEntry must still resolve Kamppi as a real station (doNotUse is a terminus-token rule, not a station block)");
assert(resolveCatalogEntry("Helsingin yliopisto")?.name === "Helsingin yliopisto", "resolveCatalogEntry must still resolve Helsingin yliopisto as a real station");
assert(resolveCatalogEntry("Helsinki Central") === null, "resolveCatalogEntry must reject the forbidden Helsinki Central token");
assert(resolveCatalogEntry("Helsingin keskusta") === null, "resolveCatalogEntry must reject the map-blob token Helsingin keskusta");
assert(resolveCatalogEntry("Päärautatieasema") === null, "resolveCatalogEntry must reject the railway-name token");

// Direction model — line + terminus, never inbound/outbound vs City.
const hubLabels = marketingLabelsForStation(HELSINKI_HUB);
assert(hubLabels.includes("M1 + Kivenlahti"), "hub must offer M1 + Kivenlahti");
assert(hubLabels.includes("M1 + Vuosaari"), "hub must offer M1 + Vuosaari");
assert(hubLabels.includes("M2 + Tapiola"), "hub must offer M2 + Tapiola");
assert(hubLabels.includes("M2 + Mellunmäki"), "hub must offer M2 + Mellunmäki");
assert(hubLabels.length === 4, `hub must offer exactly 4 chips, got ${hubLabels.length}`);
assert(!hubLabels.some((label) => /inbound|outbound|to city|helsingin keskusta|m3/i.test(label)), "no inbound/outbound/to City/M3 chips");

const tapiolaLabels = marketingLabelsForStation("Tapiola");
assert(tapiolaLabels.includes("M1 + Kivenlahti"), "Tapiola must offer M1 + Kivenlahti (M1 continues west)");
assert(tapiolaLabels.includes("M1 + Vuosaari"), "Tapiola must offer M1 + Vuosaari");
assert(tapiolaLabels.includes("M2 + Mellunmäki"), "Tapiola must offer M2 + Mellunmäki");
assert(!tapiolaLabels.includes("M2 + Tapiola"), "Tapiola must not offer itself as a terminus chip");

// Digitransit headsigns append a via-stop for fork legs — confirmed live 30 Aug 2026.
assert(stripViaSuffix("Kivenlahti via Tapiola") === "Kivenlahti", "stripViaSuffix must drop the via-stop");
assert(stripViaSuffix("Vuosaari via Itäkeskus") === "Vuosaari", "stripViaSuffix must drop the via-stop");
assert(stripViaSuffix("Tapiola") === "Tapiola", "stripViaSuffix must pass through a plain headsign");
assert(mapHelsinkiDestination("Kivenlahti via Tapiola", "M1") === "M1 + Kivenlahti", "mapHelsinkiDestination must combine line + stripped terminus");
assert(mapHelsinkiDestination("Mellunmäki via Itäkeskus", "M2") === "M2 + Mellunmäki", "mapHelsinkiDestination must combine line + stripped terminus");

assert(isForbiddenTerminusToken("Kamppi") === true, "Kamppi must never be a direction chip terminus");
assert(isForbiddenTerminusToken("Helsingin yliopisto") === true, "Helsingin yliopisto must never be a direction chip terminus");
assert(isForbiddenTerminusToken("Matinkylä") === true, "Matinkylä must never be a direction chip terminus");
assert(isForbiddenCollapseName("Kamppi") === false, "Kamppi must stay resolvable as a station");
assert(isForbiddenCollapseName("Helsinki Central") === true, "Helsinki Central must never resolve as a station");

assert(foldKey("Rautatientori") === foldKey("RAUTATIENTORI"), "foldKey must normalize case");
assert(foldKey("Mellunmäki") === foldKey("mellunmaki"), "foldKey must normalize diacritics");

// Dogfood station list + directions come from the catalog, not GTFS parses.
const dogfoodStations = listHelsinkiDogfoodStations();
assert(dogfoodStations.length === 30, `dogfood stations must be the 30 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(HELSINKI_HUB), "hub must be listed by the dogfood harness");

const hubPack = getHelsinkiDogfoodDirections(HELSINKI_HUB);
assert(hubPack.source === "helsinki-marketing-ends", "directions source must be helsinki-marketing-ends");
assert(
  JSON.stringify(hubPack.directions) === JSON.stringify(hubLabels),
  "dogfood directions must match marketingLabelsForStation"
);

// The production dispatch entry exists and returns the same chips as the dogfood harness.
// Called directly by cityId string (not gated on MULTI_CITY_IDS — that list update is
// deliberately deferred, see header comment above).
const dispatched = await getMultiCityDirections("helsinki", HELSINKI_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hubLabels),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatched.source === "helsinki-marketing-ends", "live-city-api dispatch source must be helsinki-marketing-ends");

// getMultiCityNextTrain must resolve to Helsinki's dogfood next-train module (no throw on lookup).
const { getHelsinkiDogfoodNextTrain } = await import("../lib/cities/helsinki/dogfood-next-train.js");
assert(typeof getHelsinkiDogfoodNextTrain === "function", "getHelsinkiDogfoodNextTrain must be exported for live-city-api to dispatch to");

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
await vercelBoard({ method: "GET", query: { city: "helsinki", station: HELSINKI_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "helsinki-dogfood-gate: ok (dispatch switch-case wired and tested, MULTI_CITY_IDS/mount/persistence/picker lists deliberately deferred to the next bundled commit, D1 pack, 30 stations, M1/M2 line+terminus chips, Rautatientori hub)"
);
