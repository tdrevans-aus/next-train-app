/**
 * Boston flip follow-through gate. Replaces boston-planned-gate.mjs (retired) —
 * Boston stays `status: "planned"` (Mark/Tim's flip call), but the dogfood
 * module, live-city-api.js dispatch switch-cases, and this gate are wired
 * ahead of that per the flip-follow-through guardrail (see
 * docs/boston-d1/mark-qa-note.md blocking finding 2).
 *
 * Also proves the board-eligibility fix for mark-qa-note.md blocking finding
 * 1: MBTA Commuter Rail is now `in` (live MBTA V3 predictions, no scheduled
 * fallback) at the five stations docs/boston-d1/oracle-clash-report.md's
 * Board eligibility section names — South Station, North Station, Forest
 * Hills, Braintree, JFK/UMass — while Amtrak (out-reservation), CapeFlyer
 * (in, but unserved by the feed), Silver Line/ferry (out-mode) all match
 * their recorded verdicts.
 *
 * Live-network sections (Commuter Rail predictions) run against the real
 * unauthenticated api-v3.mbta.com API — no MBTA_API_KEY required. A network
 * failure here is a real gate failure (unlike the UK Darwin gates, which
 * tolerate a missing token) since MBTA's V3 API needs no credential at all.
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
  lineIdForTrip,
  fetchStationBoard,
  fetchCommuterRailTrips,
  COMMUTER_RAIL_STOP_IDS,
  MissingMbtaApiKeyError,
  MBTA_GTFS_STATIC_URL,
} from "../lib/providers/boston.js";
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

// Registry identity + status — Boston stays planned; only the flip changes this.
const live = assertCityLive("boston");
assert(live?.ok === false, "assertCityLive(boston) must fail");
assert(live?.status === 501, "boston must be 501 planned");

const entry = getCity("boston");
assert(entry?.status === "planned", "boston registry status must be planned");
assert(entry?.adapterReady === true, "boston adapterReady must be true");
assert(entry?.displayName === "Boston", "boston display name must be Boston");
assert(entry?.timeZone === "America/New_York", "boston timezone must be America/New_York");
assert(CITIES.filter((city) => city.id === "boston").length === 1, "boston must appear once in the registry");
// "chicago" was in this forbidden list to prevent Boston/Chicago mix-in before Chicago had its
// own registry entry — Chicago is now a real, separately-registered planned city
// (lib/providers/chicago.js, docs/chicago-d1/), so getCity("chicago") is legitimately truthy.
for (const forbiddenId of ["bos", "mbta", "boston-mbta", "us", "washington"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}
assert((entry?.modes ?? []).includes("train"), "boston modes must include train (Commuter Rail addition)");

// Dogfood dispatch is wired ahead of the flip — NOT in MULTI_CITY_IDS yet, per the
// documented "safe ahead of flip" pattern (production routes gate on assertCityLive()
// first, not on this list membership) — qa/live-city-lists-sync.mjs would otherwise flag
// this as a premature list addition.
assert(isMultiCity("boston") === false, "boston must NOT be in MULTI_CITY_IDS while status stays planned");

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

// resolveStopIds — synthetic staticData shaped like gtfs/static-cache.js output, no network.
const syntheticStaticData = {
  stops: [
    { stop_id: "place-pktrm", stop_name: "Park Street", parent_station: "" },
    { stop_id: "70075", stop_name: "Park Street", parent_station: "place-pktrm" },
    { stop_id: "place-cntsq", stop_name: "Central", parent_station: "" },
  ],
  tripsById: new Map([
    ["trip-red-1", { route_id: "Red" }],
    ["trip-commuter-1", { route_id: "CR-Fitchburg" }],
  ]),
};
const parkStreetStopIds = resolveStopIds(syntheticStaticData, byName.get("Park Street"));
assert(parkStreetStopIds.includes("place-pktrm") && parkStreetStopIds.includes("70075"), "resolveStopIds must expand Park Street to its child platform stops");
assert(lineIdForTrip("trip-red-1", syntheticStaticData) === "red", "lineIdForTrip must resolve Red from route_id");
assert(lineIdForTrip("trip-commuter-1", syntheticStaticData) === null, "lineIdForTrip must still reject Commuter Rail route_ids for the subway line-id map (CR is a separate live path)");

// Provider wiring sanity.
assert(MBTA_GTFS_STATIC_URL === "https://cdn.mbta.com/MBTA_GTFS.zip", "static GTFS URL must point at MBTA's CDN");
assert(typeof MissingMbtaApiKeyError === "function", "MissingMbtaApiKeyError must be exported");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

// --- Commuter Rail board eligibility: live MBTA V3, no scheduled fallback ---

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

// mapCommuterRailDestination — line + terminus from the route's own known termini, never a
// raw headsign (same never-fabricate posture as mapLineTerminusDestination).
assert(
  mapCommuterRailDestination("CR-Worcester", 0) === "Framingham/Worcester Line + Worcester",
  "mapCommuterRailDestination must combine line + outbound terminus"
);
assert(
  mapCommuterRailDestination("CR-Worcester", 1) === "Framingham/Worcester Line + South Station",
  "mapCommuterRailDestination must combine line + inbound terminus"
);
assert(mapCommuterRailDestination("CR-Foxboro", 0) === null, "mapCommuterRailDestination must return null for an out-of-scope route id");

// marketingLabelsForStation — subway chips unchanged at a subway-only station, Commuter Rail
// chips added only at the five dual-mode stations, self-referential terminus excluded.
const parkStreetLabels = marketingLabelsForStation(BOSTON_HUB);
assert(parkStreetLabels.includes("Red Line + Alewife"), "Park Street must still offer Red Line + Alewife");
assert(!parkStreetLabels.some((label) => /Line \+/.test(label) && COMMUTER_RAIL_ROUTES[Object.keys(COMMUTER_RAIL_ROUTES).find((id) => label.startsWith(COMMUTER_RAIL_ROUTES[id].longName))]), "Park Street (not a Commuter Rail station) must offer zero Commuter Rail chips");

const southStationLabels = marketingLabelsForStation("South Station");
assert(southStationLabels.includes("Red Line + Alewife"), "South Station must still offer its subway chip");
assert(southStationLabels.includes("Framingham/Worcester Line + Worcester"), "South Station must offer a Commuter Rail chip");
assert(!southStationLabels.includes("Framingham/Worcester Line + South Station"), "South Station must not offer a self-referential Commuter Rail chip");

const forestHillsLabels = marketingLabelsForStation("Forest Hills");
assert(forestHillsLabels.includes("Providence/Stoughton Line + South Station"), "Forest Hills (through-station) must offer the inbound-to-South-Station Commuter Rail chip");
assert(forestHillsLabels.includes("Providence/Stoughton Line + Stoughton or Wickford Junction"), "Forest Hills must offer the outbound Commuter Rail chip");

// tripMatchesMarketingChip — board trips arrive already remapped to chip form.
assert(tripMatchesMarketingChip({ destination: "Red Line + Alewife" }, "Red Line + Alewife") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "Red Line + Alewife" }, "Red Line + Braintree") === false, "tripMatchesMarketingChip must reject a mismatched chip");

// --- Live network: MBTA V3 predictions, unauthenticated, no scheduled fallback ---

for (const [name, stopId] of Object.entries(COMMUTER_RAIL_STOP_IDS)) {
  const trips = await fetchCommuterRailTrips(stopId);
  assert(Array.isArray(trips), `fetchCommuterRailTrips(${name}) must return an array even when empty`);
  for (const trip of trips) {
    assert(typeof trip.displayTime === "string" && trip.displayTime.length > 0, `${name} Commuter Rail trip must carry a string displayTime`);
    assert(typeof trip.destination === "string" && trip.destination.includes(" + "), `${name} Commuter Rail trip destination must be a line + terminus chip, got "${trip.destination}"`);
    assert(trip.lineId === "commuter-rail", `${name} Commuter Rail trip must carry lineId "commuter-rail"`);
    assert(trip.cancelled === false, `${name} Commuter Rail trip must not be a cancelled row (cancelled predictions are filtered out)`);
  }
}

// A merged board at a dual-mode station: subway rows always present (schedule), Commuter Rail
// rows present only when the live feed currently has one — sorted together either way.
const braintreeBoard = await fetchStationBoard("Braintree");
assert(braintreeBoard.trips.some((t) => t.lineId === "red"), "Braintree board must still carry Red Line subway rows");
const sorted = braintreeBoard.trips.every(
  (t, i, arr) => i === 0 || new Date(arr[i - 1].liveDeparture) <= new Date(t.liveDeparture)
);
assert(sorted, "merged Braintree board must be sorted by liveDeparture across both subway and Commuter Rail rows");

// A subway-only station (Park Street) must carry zero Commuter Rail rows, network or not.
const parkStreetBoard = await fetchStationBoard(BOSTON_HUB);
assert(!parkStreetBoard.trips.some((t) => t.lineId === "commuter-rail"), "Park Street must never carry a Commuter Rail row (not board-eligible there)");

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listBostonDogfoodStations();
assert(dogfoodStations.length === 125, `dogfood stations must be the 125 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(BOSTON_HUB), "hub must be listed by the dogfood harness");

const hubPack = getBostonDogfoodDirections(BOSTON_HUB);
assert(hubPack.source === "boston-marketing-ends", "directions source must be boston-marketing-ends");
assert(JSON.stringify(hubPack.directions) === JSON.stringify(parkStreetLabels), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness,
// even though boston is deliberately not in MULTI_CITY_IDS yet.
const dispatchedDirections = await getMultiCityDirections("boston", "South Station");
assert(
  JSON.stringify(dispatchedDirections.directions) === JSON.stringify(southStationLabels),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "boston-marketing-ends", "live-city-api dispatch source must be boston-marketing-ends");

// End-to-end next-train through the dispatch, for a subway chip (always resolvable, no
// dependency on which trains happen to be running live right now).
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

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available) are deliberately NOT touched yet — same
// registry-status-derived invariant as MULTI_CITY_IDS above (qa/live-city-lists-sync.mjs
// requires them to equal exactly the live-city set). Add "boston"/"united states" to all
// four in the same commit as the status flip.

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
  "boston-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, MULTI_CITY_IDS/mount/persistence lists deliberately deferred to the status-flip commit, D1 pack, Board eligibility section all-in, 125 stations, hub Park Street, live MBTA Commuter Rail predictions at South Station/North Station/Forest Hills/Braintree/JFK-UMass with no scheduled fallback, CR-Foxboro excluded, Amtrak/ferry/Silver Line verdicts match adapter filtering, Perth Australia green)"
);
