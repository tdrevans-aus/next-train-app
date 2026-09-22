/**
 * Boston flip follow-through gate. Replaces boston-planned-gate.mjs (retired) —
 * the dogfood module and live-city-api.js dispatch switch-cases were wired ahead
 * of the flip per the flip-follow-through guardrail (see docs/boston-d1/mark-qa-note.md
 * blocking finding 2), and Boston flipped to `status: "live"` 20 Sep 2026 (third
 * QA pass, docs/boston-d1/mark-qa-note.md).
 *
 * Also proves the board-eligibility fix for mark-qa-note.md blocking finding
 * 1: MBTA Commuter Rail is `in` (live MBTA V3 predictions, no scheduled
 * fallback) at the five stations docs/boston-d1/oracle-clash-report.md's
 * Board eligibility section names — South Station, North Station, Forest
 * Hills, Braintree, JFK/UMass — while Amtrak (out-reservation), CapeFlyer
 * (in, but unserved by the feed), Silver Line/ferry (out-mode) all match
 * their recorded verdicts.
 *
 * Live-predictions fix (20 Sep 2026, docs/jim-brief-boston-subway-live-predictions.md):
 * subway used to be built from static GTFS with `realtime: false` — a scheduled board
 * presented as live, and catastrophically slow. Subway AND Commuter Rail now both come from
 * one live MBTA V3 predictions call per station, `realtime: true`. Most of the
 * prediction-shape/drop-rule assertions below run OFFLINE against qa/fixtures/boston/
 * predictions.json (a trimmed REAL capture, 20 Sep 2026 — see that file's `_comment`),
 * injected into the REAL fetchStationBoard() via its `rawPredictions`/`stopIds` options, so
 * the production filter/map/sort pipeline (mapPredictionToTrip) is what runs here, not a copy
 * of it. A handful of end-to-end checks near the bottom do hit the real unauthenticated
 * api-v3.mbta.com API (no MBTA_API_KEY required) to prove the dispatch/dogfood wiring for
 * real — thanks to the new per-station prediction cache, that's exactly two real upstream
 * calls (Braintree, Park Street) for the whole gate, not one per assertion.
 *
 * Usage: node qa/boston-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  BOSTON_HUB,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  resolveStopIds,
  fetchStationBoard,
  mapPredictionToTrip,
  mapPredictionsToTrips,
  COMMUTER_RAIL_STOP_IDS,
  MissingMbtaApiKeyError,
  MBTA_GTFS_STATIC_URL,
  MBTA_V3_PREDICTIONS_URL,
  _resetMbtaPredictionsCacheForTests,
} from "../lib/providers/boston.js";
import * as gtfsStaticCache from "../lib/providers/gtfs/static-cache.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  canonicalStationName,
  resolveTerminus,
  mapLineTerminusDestination,
  mapCommuterRailDestination,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
  COMMUTER_RAIL_ROUTES,
  COMMUTER_RAIL_STATIONS,
  isCommuterRailStation,
  MBTA_ROUTE_ID_TO_LINE,
} from "../lib/cities/boston/marketing-directions.js";
import {
  listBostonDogfoodStations,
  getBostonDogfoodDirections,
  getBostonDogfoodNextTrain,
} from "../lib/cities/boston/dogfood-next-train.js";
import { cityBoundsFor, inAnyBounds } from "./lib/city-bounds-from-picker.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — Perth (Australia) green is enough, not a hardcoded roll call.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Registry identity + status — Boston flipped live 20 Sep 2026 (docs/boston-d1/mark-qa-note.md
// third pass); assertCityLive must now succeed.
const live = assertCityLive("boston");
assert(live?.ok === true, "assertCityLive(boston) must succeed now that boston is live");

const entry = getCity("boston");
assert(entry?.status === "live", "boston registry status must be live");
assert(entry?.adapterReady === true, "boston adapterReady must be true");
assert(entry?.displayName === "Boston", "boston display name must be Boston");
assert(entry?.timeZone === "America/New_York", "boston timezone must be America/New_York");
assert(CITIES.filter((city) => city.id === "boston").length === 1, "boston must appear once in the registry");
// "chicago"/"washington" were in this forbidden list to prevent mix-in before each had its own
// registry entry — both are now real, separately-registered planned cities
// (lib/providers/chicago.js, docs/chicago-d1/; lib/providers/washington.js, docs/washington-d1/),
// so getCity("chicago")/getCity("washington") are legitimately truthy.
for (const forbiddenId of ["bos", "mbta", "boston-mbta", "us"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}
assert((entry?.modes ?? []).includes("train"), "boston modes must include train (Commuter Rail addition)");

// Boston is now live — must be in MULTI_CITY_IDS (qa/live-city-lists-sync.mjs enforces this
// against the registry's live-city set).
assert(isMultiCity("boston") === true, "boston must be in MULTI_CITY_IDS now that status is live");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/boston-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "mark-qa-note.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/boston-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "boston", "D1 city id must be boston");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === BOSTON_HUB, `D1 lock must be ${BOSTON_HUB}`);
assert(network.lines.length === 8, "D1 must carry exactly 8 passenger services");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist and
// carry a recorded verdict for every service named in mark-qa-note.md's blocking finding.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const service of ["MBTA Commuter Rail", "Amtrak", "CapeFlyer", "MBTA Ferry", "Silver Line"]) {
  assert(oracleReport.includes(service), `Board eligibility section must record a verdict for ${service}`);
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

const stations = listCatalogStations();
assert(stations.length === 125, `catalog must have 125 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(BOSTON_HUB), `catalog must lock ${BOSTON_HUB}`);
assert(byName.get(BOSTON_HUB)?.hub === true, "hub entry must carry hub:true");

// Coordinates (docs/jim-brief-us-flip-readiness.md) — every station geocoded from MBTA
// v3 /stops by stop id, matched by name/alias, and inside Boston's own CITY_BOUNDS box
// (public/city-session.js) so Near me and bounds hinting can work ahead of the flip.
const bostonBoxes = cityBoundsFor("boston");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(
    inAnyBounds(station.lat, station.lng, bostonBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Boston's CITY_BOUNDS box`
  );
}

// resolveCatalogEntry — exact-match aliasing (map abbreviation <-> official long form).
assert(resolveCatalogEntry(BOSTON_HUB)?.name === BOSTON_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Government Center")?.name === "Gov't Center", "resolveCatalogEntry must resolve the official long form to the map abbreviation");
assert(resolveCatalogEntry("Boston") === null, "resolveCatalogEntry must reject the marketing token Boston");
assert(isForbiddenHubProxy("South Station") === true, "South Station must never stand in for the Park Street hub identity");

// doNotCollapse same-name-family pairs stay distinct catalog entries.
assert(byName.get("Harvard")?.lines.includes("red"), "Harvard must be Red");
assert(byName.get("Harvard Ave")?.lines.includes("green-b"), "Harvard Ave must be Green B");
assert(resolveCatalogEntry("Central")?.name === "Central", "resolveCatalogEntry(Central) must not collapse into Central Ave");
assert(resolveCatalogEntry("Central Ave")?.name === "Central Ave", "resolveCatalogEntry(Central Ave) must not collapse into Central");

// Line labels + termini (direction-model-memo.md §3 recommendation A) — subway unchanged.
assert(LINE_LABELS.red === "Red Line", "Red line label");
assert(LINE_TERMINI.red.includes("Alewife") && LINE_TERMINI.red.includes("Ashmont") && LINE_TERMINI.red.includes("Braintree"), "Red termini must be Alewife/Ashmont/Braintree");
assert(MBTA_ROUTE_ID_TO_LINE.Red === "red" && MBTA_ROUTE_ID_TO_LINE.Mattapan === "mattapan", "MBTA route_id map must match D1 gtfsRouteIdsIfKnown");
assert(mapLineTerminusDestination("Park Street", "red") === "Red Line", "Park Street must never appear as a direction token");
assert(resolveTerminus("Some Unknown Headsign", "red") === null, "resolveTerminus must not fabricate an unknown terminus");

// resolveStopIds — bundled catalog data (lib/cities/boston/stations.json's mbtaStopIds,
// generated offline by scripts/generate-boston-mbta-stop-ids.mjs), no network, no GTFS parse.
// Exactly the single correct MBTA V3 id per station — never a parent AND its own children
// together (PR #431 review finding 1 — that combination is what caused every board row to be
// duplicated 2x against the live MBTA V3 API).
const parkStreetStopIds = resolveStopIds(byName.get("Park Street"));
assert(JSON.stringify(parkStreetStopIds) === JSON.stringify(["place-pktrm"]), "resolveStopIds(Park Street) must be exactly its single GTFS parent id, no platform children");
for (const station of stations) {
  const ids = resolveStopIds(station);
  assert(Array.isArray(ids) && ids.length > 0, `${station.name} must resolve to at least one bundled mbtaStopId`);
  assert(
    ids.every((id) => !id.startsWith("door-") && !id.startsWith("node-")),
    `${station.name}'s bundled mbtaStopIds must never include a door-*/node-* pathway/entrance pseudo-stop`
  );
}

// Provider wiring sanity.
assert(MBTA_GTFS_STATIC_URL === "https://cdn.mbta.com/MBTA_GTFS.zip", "static GTFS URL constant must still point at MBTA's CDN (documentation only — see next assertion)");
assert(MBTA_V3_PREDICTIONS_URL === "https://api-v3.mbta.com/predictions", "predictions URL must point at MBTA's V3 API");
assert(typeof MissingMbtaApiKeyError === "function", "MissingMbtaApiKeyError must be exported");

// --- No static GTFS anywhere on the Boston request path (PR #431 review finding 2) ---

const bostonSource = readFileSync(join(ROOT, "lib/providers/boston.js"), "utf8");
assert(
  !/from\s+["']\.\/gtfs\/static-cache\.js["']/.test(bostonSource),
  "lib/providers/boston.js must not import anything from gtfs/static-cache.js — station->stop_id resolution must come from the bundled catalog only, never a live GTFS parse"
);

const originalLoadGtfsStatic = gtfsStaticCache.loadGtfsStatic;
let gtfsStaticCallCount = 0;
try {
  Object.defineProperty(gtfsStaticCache, "loadGtfsStatic", {
    value: async () => {
      gtfsStaticCallCount += 1;
      throw new Error("loadGtfsStatic must never be called while serving a Boston board/next-train/directions request");
    },
    configurable: true,
  });
} catch {
  // Namespace object not reconfigurable in this Node version — the source-text assertion above
  // is the primary proof; fall through without the extra runtime stub.
}
const originalFetchForGtfsCheck = globalThis.fetch;
globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.startsWith("https://cdn.mbta.com/")) {
    throw new Error(`must never fetch MBTA's static GTFS feed while serving a request: ${href}`);
  }
  return { ok: true, json: async () => ({ data: [], included: [] }) };
};
_resetMbtaPredictionsCacheForTests();
await fetchStationBoard("South Station");
await fetchStationBoard(BOSTON_HUB);
assert(gtfsStaticCallCount === 0, "loadGtfsStatic must not have been called while resolving real catalog stations' boards");
globalThis.fetch = originalFetchForGtfsCheck;
try {
  Object.defineProperty(gtfsStaticCache, "loadGtfsStatic", { value: originalLoadGtfsStatic, configurable: true });
} catch {
  // best-effort restore
}
_resetMbtaPredictionsCacheForTests();

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

// --- Commuter Rail board eligibility tables (unaffected by the live-predictions rewrite) ---

assert(
  JSON.stringify([...COMMUTER_RAIL_STATIONS].sort()) ===
    JSON.stringify(["Braintree", "Forest Hills", "JFK/UMass", "North Station", "South Station"].sort()),
  "COMMUTER_RAIL_STATIONS must be exactly the five oracle-report stations"
);
for (const name of COMMUTER_RAIL_STATIONS) {
  assert(COMMUTER_RAIL_STOP_IDS[name], `COMMUTER_RAIL_STOP_IDS must map ${name} to an MBTA V3 stop id`);
  assert(isCommuterRailStation(name) === true, `isCommuterRailStation(${name}) must be true`);
}
assert(isCommuterRailStation("Park Street") === false, "Park Street must not be a Commuter Rail station");
assert(!COMMUTER_RAIL_ROUTES["CR-Foxboro"], "CR-Foxboro (Foxboro Event Service) must be excluded — not a walk-up standard product");

// mapCommuterRailDestination — terminus-only/Perth style, extended 22 Sep 2026
// (docs/jim-brief-direction-label-aliases-server-side.md Part 2): bare terminus outbound,
// "<terminus> (<Line>)" only for the two shared hubs (South Station/North Station). Subway
// colour-line labels ("Red Line + Alewife") are unchanged — see the doNotGroup assertions below.
assert(
  mapCommuterRailDestination("CR-Worcester", 0) === "Worcester",
  "mapCommuterRailDestination must return the bare outbound terminus, no line prefix"
);
assert(
  mapCommuterRailDestination("CR-Worcester", 1) === "South Station (Framingham/Worcester Line)",
  "mapCommuterRailDestination must disambiguate the shared South Station hub with the line name"
);
assert(mapCommuterRailDestination("CR-Foxboro", 0) === null, "mapCommuterRailDestination must return null for an out-of-scope route id");

// Every CR route's chip, from the route table itself — no chip may repeat "Line" text at a
// non-hub terminus, and every hub-bound chip must carry the line name.
const ALL_CR_HUB_CHIPS = new Set();
const ALL_CR_OUTBOUND_CHIPS = new Set();
for (const [routeId, route] of Object.entries(COMMUTER_RAIL_ROUTES)) {
  for (let directionId = 0; directionId < route.termini.length; directionId += 1) {
    const terminus = route.termini[directionId];
    const chip = mapCommuterRailDestination(routeId, directionId);
    if (terminus === "South Station" || terminus === "North Station") {
      assert(chip === `${terminus} (${route.longName})`, `${routeId} hub-bound chip must disambiguate, got "${chip}"`);
      ALL_CR_HUB_CHIPS.add(chip);
    } else {
      assert(chip === terminus, `${routeId} outbound chip must be the bare terminus, got "${chip}"`);
      ALL_CR_OUTBOUND_CHIPS.add(chip);
    }
  }
}

// marketingLabelsForStation — subway chips unchanged at a subway-only station, Commuter Rail
// chips added only at the five dual-mode stations, self-referential terminus excluded.
const parkStreetLabels = marketingLabelsForStation(BOSTON_HUB);
assert(parkStreetLabels.includes("Red Line + Alewife"), "Park Street must still offer Red Line + Alewife");
assert(
  !parkStreetLabels.some((label) => ALL_CR_HUB_CHIPS.has(label) || ALL_CR_OUTBOUND_CHIPS.has(label)),
  "Park Street (not a Commuter Rail station) must offer zero Commuter Rail chips"
);

const southStationLabels = marketingLabelsForStation("South Station");
assert(southStationLabels.includes("Red Line + Alewife"), "South Station must still offer its subway chip");
assert(southStationLabels.includes("Worcester"), "South Station must offer a Commuter Rail chip");
assert(!southStationLabels.includes("South Station (Framingham/Worcester Line)"), "South Station must not offer a self-referential Commuter Rail chip");

const forestHillsLabels = marketingLabelsForStation("Forest Hills");
assert(forestHillsLabels.includes("South Station (Providence/Stoughton Line)"), "Forest Hills (through-station) must offer the disambiguated inbound-to-South-Station Commuter Rail chip");
assert(forestHillsLabels.includes("Stoughton or Wickford Junction"), "Forest Hills must offer the bare outbound Commuter Rail chip");

// tripMatchesMarketingChip — board trips arrive already remapped to chip form.
assert(tripMatchesMarketingChip({ destination: "Red Line + Alewife" }, "Red Line + Alewife") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "Red Line + Alewife" }, "Red Line + Braintree") === false, "tripMatchesMarketingChip must reject a mismatched chip");

// --- mapPredictionToTrip drop rules (pure function, no network) ---

const REAL_TRIP = new Map([["t1", { attributes: { headsign: "Alewife" } }]]);
function syntheticPrediction(overrides) {
  return {
    id: "synthetic",
    attributes: {
      departure_time: "2026-09-20T12:00:00-04:00",
      direction_id: 0,
      revenue: "REVENUE",
      schedule_relationship: null,
      status: null,
      ...overrides,
    },
    relationships: {
      route: { data: { id: "Red" } },
      trip: { data: { id: "t1" } },
    },
  };
}
assert(mapPredictionToTrip(syntheticPrediction({}), REAL_TRIP)?.lineId === "red", "a normal prediction must map to its line");
assert(mapPredictionToTrip(syntheticPrediction({ departure_time: null }), REAL_TRIP) === null, "arrival-only (departure_time null) must be dropped, never backfilled");
assert(mapPredictionToTrip(syntheticPrediction({ schedule_relationship: "CANCELLED" }), REAL_TRIP) === null, "CANCELLED must be dropped");
assert(mapPredictionToTrip(syntheticPrediction({ schedule_relationship: "SKIPPED" }), REAL_TRIP) === null, "SKIPPED must be dropped");
assert(mapPredictionToTrip(syntheticPrediction({ revenue: "NON_REVENUE" }), REAL_TRIP) === null, "NON_REVENUE (positioning run) must be dropped");
const crPrediction = {
  ...syntheticPrediction({}),
  relationships: { route: { data: { id: "CR-Worcester" } }, trip: { data: { id: "t1" } } },
};
assert(mapPredictionToTrip(crPrediction, REAL_TRIP)?.lineId === "commuter-rail", "a Commuter Rail route_id must map to lineId commuter-rail");
assert(
  mapPredictionToTrip(crPrediction, REAL_TRIP)?.destination === "Worcester",
  "Commuter Rail direction must come from COMMUTER_RAIL_ROUTES termini, never a raw headsign"
);
const unknownRoutePrediction = {
  ...syntheticPrediction({}),
  relationships: { route: { data: { id: "Amtrak-Acela" } }, trip: { data: { id: "t1" } } },
};
assert(mapPredictionToTrip(unknownRoutePrediction, REAL_TRIP) === null, "an unrecognized route_id (e.g. Amtrak) must be dropped, never shown");

// --- Live-shape fixture: a trimmed REAL MBTA V3 capture (qa/fixtures/boston/predictions.json) ---

const fixture = JSON.parse(readFileSync(join(ROOT, "qa/fixtures/boston/predictions.json"), "utf8"));
const fixtureBoard = (station, key) => fetchStationBoard(station, { rawPredictions: fixture[key], stopIds: ["fixture-stub"] });

// Harvard: subway-only (Red Line) station. The fixture's real CANCELLED row and both
// synthetic SKIPPED/NON_REVENUE rows must all be absent from the board.
const harvardBoard = await fixtureBoard("Harvard", "harvard");
assert(harvardBoard.realtime === true, "Harvard board realtime must be true");
assert(harvardBoard.trips.length === 3, `Harvard board must keep exactly the 3 non-dropped rows, got ${harvardBoard.trips.length}`);
assert(harvardBoard.trips.every((t) => t.lineId === "red"), "Harvard is subway-only — every row must be Red");
assert(
  harvardBoard.trips.every((t) => typeof t.displayTime === "string" && t.displayTime.length > 0 && typeof t.scheduledDisplayTime === "string" && t.scheduledDisplayTime.length > 0),
  "every Harvard trip must carry a string displayTime/scheduledDisplayTime (contract.js — never a blank rider-facing time)"
);
assert(harvardBoard.trips.some((t) => t.status === "Stopped 3 stops away"), "Harvard's real captured status string must pass through unedited");
assert(
  harvardBoard.trips.every((t) => t.destination === "Red Line + Alewife" || t.destination === "Red Line + Braintree"),
  "Harvard directions must resolve to Red's known termini from the trip headsign"
);

// Kenmore: Green Line C/D trunk. The real arrival-only (ADDED, departure_time null) row must
// be dropped; Cleveland Circle (Green-C) and Riverside (Green-D) must resolve from headsign.
const kenmoreBoard = await fixtureBoard("Kenmore", "kenmoreGreenTrunk");
assert(kenmoreBoard.realtime === true, "Kenmore board realtime must be true");
assert(kenmoreBoard.trips.length === 2, `Kenmore board must drop the real arrival-only row, got ${kenmoreBoard.trips.length}`);
assert(kenmoreBoard.trips.some((t) => t.destination === "Green Line C + Cleveland Circle"), "Kenmore must resolve a real Green-C headsign to its known terminus");
assert(kenmoreBoard.trips.some((t) => t.destination === "Green Line D + Riverside"), "Kenmore must resolve a real Green-D headsign to its known terminus");

// South Station: subway + Commuter Rail, one predictions call. The real arrival-only
// CR-Worcester row must be dropped; Red Line and multiple CR routes coexist, sorted together.
const southBoard = await fixtureBoard("South Station", "southStation");
assert(southBoard.realtime === true, "South Station board realtime must be true");
assert(southBoard.trips.length === 6, `South Station board must drop the real arrival-only CR-Worcester row, got ${southBoard.trips.length}`);
assert(southBoard.trips.some((t) => t.lineId === "red"), "South Station must still carry Red Line rows");
assert(southBoard.trips.some((t) => t.lineId === "commuter-rail"), "South Station must carry Commuter Rail rows from the same single predictions call");
assert(southBoard.trips.some((t) => t.status === "All aboard"), "South Station's real captured Commuter Rail status must pass through unedited");
const southSorted = southBoard.trips.every(
  (t, i, arr) => i === 0 || new Date(arr[i - 1].liveDeparture) <= new Date(t.liveDeparture)
);
assert(southSorted, "South Station board must be sorted by liveDeparture across subway and Commuter Rail rows together");

// --- Duplicate-prediction defence (PR #431 review finding 1) — the real duplicated shape ---
// --- Mark saw against the live MBTA V3 API, captured with the OLD (buggy) parent+platform ---
// --- id set. mapPredictionsToTrips() must collapse it back to the true unique trip count. ---

const rawMiltonDuplicated = fixture.miltonDuplicatedByOldIdSet.data;
assert(rawMiltonDuplicated.length === 6, "the real captured duplicated payload must have 6 raw prediction resources (3 real trips, doubled)");
const miltonIncludedById = new Map(
  fixture.miltonDuplicatedByOldIdSet.included.filter((i) => i.type === "trip").map((i) => [i.id, i])
);
const dedupedMiltonTrips = mapPredictionsToTrips(rawMiltonDuplicated, miltonIncludedById);
assert(dedupedMiltonTrips.length === 3, `mapPredictionsToTrips must dedupe the real captured 6-row duplicate payload down to 3 unique trips, got ${dedupedMiltonTrips.length}`);
const dedupedMiltonTripIds = dedupedMiltonTrips.map((t) => t.tripId);
assert(new Set(dedupedMiltonTripIds).size === dedupedMiltonTripIds.length, "deduped Milton trips must have no repeated tripId");
const dedupedMiltonKeys = dedupedMiltonTrips.map((t) => `${t.tripId}|${t.liveDeparture}`);
assert(new Set(dedupedMiltonKeys).size === dedupedMiltonKeys.length, "deduped Milton trips must have no two rows sharing the same trip+time");

// Same fixture through the real fetchStationBoard() end-to-end (rawPredictions injection),
// proving the production pipeline — not just the pure mapper — dedupes correctly.
const miltonBoardViaOldIdSet = await fetchStationBoard("Milton", {
  rawPredictions: fixture.miltonDuplicatedByOldIdSet,
  stopIds: ["fixture-stub"],
});
assert(miltonBoardViaOldIdSet.trips.length === 3, `fetchStationBoard(Milton) with the real duplicated payload must still resolve to 3 unique rows, got ${miltonBoardViaOldIdSet.trips.length}`);
const miltonBoardKeys = miltonBoardViaOldIdSet.trips.map((t) => `${t.tripId}|${t.liveDeparture}`);
assert(new Set(miltonBoardKeys).size === miltonBoardKeys.length, "fetchStationBoard(Milton) board rows must have no two rows sharing the same trip+time");

// General board-level guarantee for the single-mode fixture boards: no repeated tripId, no two
// rows sharing the same trip+time. (South Station is checked separately below — its fixture
// carries a genuine, documented MBTA quirk where CR-Providence and CR-Franklin share one real
// trip id for a combined train that later splits, which is not the parent+child duplication
// bug this gate is defending against, so a blanket tripId-uniqueness check would misfire there.)
for (const [label, board] of [
  ["Harvard", harvardBoard],
  ["Kenmore", kenmoreBoard],
]) {
  const tripIds = board.trips.map((t) => t.tripId);
  assert(new Set(tripIds).size === tripIds.length, `${label} board must have no repeated tripId`);
  const keys = board.trips.map((t) => `${t.tripId}|${t.liveDeparture}`);
  assert(new Set(keys).size === keys.length, `${label} board must have no two rows sharing the same trip+time`);
}

// South Station: any row sharing both tripId and liveDeparture with another row must differ in
// routeLongName (the documented combined-train-splits-into-two-routes quirk) — proving it's a
// real distinct service pairing, not the same MBTA prediction resource counted twice.
const southByTripTime = new Map();
for (const trip of southBoard.trips) {
  const key = `${trip.tripId}|${trip.liveDeparture}`;
  const bucket = southByTripTime.get(key) ?? [];
  bucket.push(trip);
  southByTripTime.set(key, bucket);
}
for (const [key, bucket] of southByTripTime) {
  if (bucket.length > 1) {
    const routeNames = new Set(bucket.map((t) => t.routeLongName));
    assert(
      routeNames.size === bucket.length,
      `South Station rows sharing trip+time (${key}) must each be a distinct route (genuine combined-train quirk), never the exact same route repeated (that would be a real duplicate)`
    );
  }
}

// --- One upstream fetch serves all directions of a station (docs/jim-brief-boston-subway- ---
// --- live-predictions.md item 2) — stub fetch, no fixture injection this time.            ---

const originalFetch = globalThis.fetch;
let fetchCallCount = 0;
globalThis.fetch = async () => {
  fetchCallCount += 1;
  return { ok: true, json: async () => ({ data: [], included: [] }) };
};
_resetMbtaPredictionsCacheForTests();
await Promise.all(
  Array.from({ length: 6 }, () => fetchStationBoard("Harvard", { stopIds: ["coalesce-test-stop"] }))
);
assert(fetchCallCount === 1, `6 concurrent per-direction fetchStationBoard calls for one station must make exactly 1 upstream request, got ${fetchCallCount}`);
await fetchStationBoard("Harvard", { stopIds: ["coalesce-test-stop"] });
assert(fetchCallCount === 1, "a later call within the cache TTL must not make a second upstream request");
globalThis.fetch = originalFetch;
_resetMbtaPredictionsCacheForTests();

// --- Refusal path: MBTA down/rate-limited must refuse, never fall back to a scheduled time ---

globalThis.fetch = async () => ({ ok: false, status: 429 });
let refused = false;
try {
  await fetchStationBoard("Harvard", { stopIds: ["refusal-test-stop"] });
} catch {
  refused = true;
}
assert(refused, "fetchStationBoard must refuse (throw) when the MBTA V3 API fails, never degrade to a scheduled board");
globalThis.fetch = originalFetch;
_resetMbtaPredictionsCacheForTests();

// --- End-to-end wiring against the real MBTA V3 API (2 real upstream calls total: Braintree ---
// --- and Park Street — the per-station cache means every reuse below is free).              ---

const braintreeBoard = await fetchStationBoard("Braintree");
assert(braintreeBoard.realtime === true, "Braintree board realtime must be true");
assert(braintreeBoard.trips.every((t) => t.cancelled === false), "no cancelled row should ever reach the board (dropped upstream)");
const sorted = braintreeBoard.trips.every(
  (t, i, arr) => i === 0 || new Date(arr[i - 1].liveDeparture) <= new Date(t.liveDeparture)
);
assert(sorted, "merged Braintree board must be sorted by liveDeparture across both subway and Commuter Rail rows");

// A subway-only station (Park Street) must carry zero Commuter Rail rows, network or not.
const parkStreetBoard = await fetchStationBoard(BOSTON_HUB);
assert(parkStreetBoard.realtime === true, "Park Street board realtime must be true");
assert(!parkStreetBoard.trips.some((t) => t.lineId === "commuter-rail"), "Park Street must never carry a Commuter Rail row (not board-eligible there)");

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listBostonDogfoodStations();
assert(dogfoodStations.length === 125, `dogfood stations must be the 125 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(BOSTON_HUB), "hub must be listed by the dogfood harness");

const hubPack = getBostonDogfoodDirections(BOSTON_HUB);
assert(hubPack.source === "boston-marketing-ends", "directions source must be boston-marketing-ends");
assert(JSON.stringify(hubPack.directions) === JSON.stringify(parkStreetLabels), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness.
const dispatchedDirections = await getMultiCityDirections("boston", "South Station");
assert(
  JSON.stringify(dispatchedDirections.directions) === JSON.stringify(southStationLabels),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "boston-marketing-ends", "live-city-api dispatch source must be boston-marketing-ends");

// End-to-end next-train through the dispatch, for a subway chip (always resolvable, no
// dependency on which trains happen to be running live right now). Reuses Braintree's
// already-cached predictions payload — no extra upstream call.
const dispatchedNextTrain = await getMultiCityNextTrain("boston", {
  station: "Braintree",
  destination: "Red Line + Alewife",
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(dispatchedNextTrain.config?.destination === "Red Line + Alewife", "dispatched next-train destination must equal the chosen chip");

const directDogfoodNextTrain = await getBostonDogfoodNextTrain({
  station: "Braintree",
  destination: "Red Line + Alewife",
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(directDogfoodNextTrain.config?.destination === "Red Line + Alewife", "dogfood next-train destination must equal the chosen chip");

// jim-brief-direction-label-aliases-server-side.md Part 2: a client still sending the retired
// "<Line long name> + <terminus>" Commuter Rail label must resolve to the new terminus-only
// canonical form, and the response must echo it back. Reuses Braintree's cached predictions.
const legacyCrNextTrain = await getMultiCityNextTrain("boston", {
  station: "Braintree",
  destination: "Greenbush Line + South Station",
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(
  legacyCrNextTrain.config?.destination === "South Station (Greenbush Line)",
  `legacy Commuter Rail label must resolve to canonical "South Station (Greenbush Line)", got ${legacyCrNextTrain.config?.destination}`
);
assert(
  legacyCrNextTrain.config?.destinationLabel === "South Station (Greenbush Line)",
  "legacy Commuter Rail label request must echo the canonical destinationLabel"
);

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available) were added to all four in the same commit as
// the status flip — qa/live-city-lists-sync.mjs enforces they equal exactly the live-city set.

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
await vercelBoard({ method: "GET", query: { city: "boston", station: BOSTON_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "boston-dogfood-gate: ok (live, MULTI_CITY_IDS/mount/persistence lists in sync, D1 pack, Board eligibility section all-in, 125 stations, hub Park Street, subway AND Commuter Rail both from live MBTA V3 predictions with realtime:true and no scheduled fallback, CANCELLED/SKIPPED/NON_REVENUE/arrival-only all dropped, one upstream fetch serves every direction of a station, refusal path proven, CR-Foxboro excluded, Amtrak/ferry/Silver Line verdicts match adapter filtering, Perth Australia green)"
);
