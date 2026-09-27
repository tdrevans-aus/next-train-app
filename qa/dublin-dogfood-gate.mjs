/**
 * Dublin flip follow-through gate. As of this pass, Dublin still stays `status: "planned"`
 * (Mark's QA-5 note, docs/dublin-d1/mark-qa-note.md: RED, blocked on the self-terminus chip bug
 * fixed by this same change — docs/jim-brief-dublin-self-terminus-chip.md) but the dogfood
 * module, live-city-api.js dispatch switch-cases, and this gate are wired ahead of that per
 * the flip-follow-through guardrail (Boston PR #414 / Chicago qa/chicago-dogfood-gate.mjs
 * shape) so no second pass is needed once the flip PR lands.
 *
 * Status-agnostic (docs/jim-brief-dublin-self-terminus-chip.md item 3): every assertion below
 * that depends on registry status reads `entry.status` at runtime and branches, rather than
 * hardcoding "planned", so Mark's actual flip commit does not need to touch this file at all —
 * unlike the Melbourne/Chicago precedent, where the flip rewrote the gate's assertions in place.
 *
 * Deliberately does NOT call the live NTA GTFS-RT v2 endpoint (api.nationaltransport.ie) or
 * fetch the published GTFS static snapshot — this is a smoke-tier gate, not a network test
 * (qa/dublin-rt-join-check.mjs and qa/verify-dublin-gtfs-snapshot.mjs cover that). Instead
 * this gate unit-tests the catalog/direction-model logic (the same assertions the retired
 * qa/dublin-planned-gate.mjs carried) plus the dispatch wiring: MULTI_CITY_IDS membership,
 * getMultiCityDirections/getMultiCityNextTrain routing into the dogfood module, and the
 * coordinate/CITY_BOUNDS/coverage-note surfaces this follow-through pass adds. It also runs a
 * fetchStationBoard()-*pipeline*-level regression test (classifyAndFilterDublinTrips, the exact
 * function fetchStationBoard() itself calls) against a synthetic RT+static fixture, without
 * mocking the network fetch fetchStationBoard() makes — see that test for why a same-name
 * headsign/terminus self-terminus trip previously leaked through as a phantom direction chip
 * (Mark's QA-5 note).
 *
 * Usage: node qa/dublin-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  DUBLIN_HUB,
  DUBLIN_TIME_ZONE,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  classifyAndFilterDublinTrips,
} from "../lib/providers/dublin.js";
import { MissingNtaApiKeyError } from "../lib/providers/gtfs/auth.js";
import { indexTripUpdates } from "../lib/providers/gtfs/realtime.js";
import { buildBoardForStops } from "../lib/providers/gtfs/board.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  canonicalStationName,
  resolveTerminus,
  mapLineTerminusDestination,
  classifyLuasLineId,
  isDirectionAllowedAtStop,
  isTerminatingAtStation,
  GREEN_LOOP_DIRECTION_ONLY,
} from "../lib/cities/dublin/marketing-directions.js";
import {
  listDublinDogfoodStations,
  getDublinDogfoodDirections,
  getDublinDogfoodNextTrain,
} from "../lib/cities/dublin/dogfood-next-train.js";
import { cityBoundsFor, inAnyBounds } from "./lib/city-bounds-from-picker.mjs";
import { CITY_BOUNDS } from "../lib/cities/city-bounds.js";
import { buildCityManifest } from "../lib/cities/city-manifest.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — Perth (Australia) green is enough, not a hardcoded roll call.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Registry identity + status — status-agnostic: read whatever the registry says right now and
// assert the invariants that hold for THAT state, rather than hardcoding "planned". This means
// Mark's eventual flip commit (status "planned" -> "live") needs zero changes to this file.
const entry = getCity("dublin");
assert(entry, "dublin must be registered");
assert(
  entry.status === "planned" || entry.status === "live",
  `dublin registry status must be planned or live, got ${entry.status}`
);
const dublinIsLive = entry.status === "live";

const live = assertCityLive("dublin");
if (dublinIsLive) {
  assert(live?.ok === true, "assertCityLive(dublin) must pass once dublin is live");
} else {
  assert(live?.ok === false, "assertCityLive(dublin) must fail while dublin stays planned");
  assert(live?.status === 501, "dublin must be 501 planned while dublin stays planned");
}

assert(entry?.adapterReady === true, "dublin adapterReady must be true");
assert(entry?.displayName === "Dublin", "dublin display name must be Dublin");
assert(entry?.timeZone === "Europe/Dublin", "dublin timezone must be Europe/Dublin");
assert(CITIES.filter((city) => city.id === "dublin").length === 1, "dublin must appear once in the registry");
for (const forbiddenId of ["dub", "ie"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired regardless of status; MULTI_CITY_IDS membership itself must track
// the registry status exactly (qa/live-city-lists-sync.mjs enforces this globally too).
assert(
  isMultiCity("dublin") === dublinIsLive,
  dublinIsLive
    ? "dublin must be in MULTI_CITY_IDS now that it is live"
    : "dublin must NOT be in MULTI_CITY_IDS while status stays planned"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/dublin-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/dublin-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "dublin", "D1 city id must be dublin");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.hubLock?.lock === DUBLIN_HUB, `D1 lock must be ${DUBLIN_HUB}`);
assert(network.hubLock?.line === "Red", "D1 hub lock must be on the Red line");
assert(network.lines.length === 2, "D1 must carry exactly 2 lines (Red + Green)");
assert(network.stats?.totalUniqueStops === 67, "D1 must record 67 total unique stops");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist with a
// recorded verdict for every excluded service (DART, buses).
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const service of ["DART", "Dublin Bus", "Bus Éireann", "Go-Ahead Ireland"]) {
  assert(oracleReport.includes(service), `Board eligibility section must record a verdict for ${service}`);
}

const stations = listCatalogStations();
// 65, not the D1 pack's 67 — Connolly and Saggart are filtered out of the catalog
// (docs/jim-brief-dublin-connolly-realtime-gap.md, docs/jim-brief-dublin-saggart-rialto-gaps.md):
// the live NTA GTFS-RT v2 feed never carries a stopTimeUpdate for either of Connolly's or
// Saggart's static stop_ids, confirmed against multiple live polls during Dublin Sunday daytime
// service, 27 Sep 2026 (docs/dublin-d1/jim-handoff.md appended entries). Per
// docs/board-eligibility-rule.md, filter the station rather than ship a silently empty board.
assert(stations.length === 65, `catalog must have 65 stations (Connolly + Saggart filtered, see coverage.json), got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(DUBLIN_HUB), `catalog must lock ${DUBLIN_HUB}`);
assert(byName.get(DUBLIN_HUB)?.hub === true, "hub entry must carry hub:true");
assert(!byName.has("Connolly"), "Connolly must NOT be in the catalog — no real-time coverage in the NTA feed");
assert(!byName.has("Saggart"), "Saggart must NOT be in the catalog — no real-time coverage in the NTA feed (permanent, out-feed)");
assert(byName.has("Rialto"), "Rialto must stay in the catalog — confirmed intermittent (10/10 non-empty on a dedicated 10-poll recheck), not permanent");

const redStations = stations.filter((s) => s.lines.includes("red"));
const greenStations = stations.filter((s) => s.lines.includes("green"));
assert(redStations.length === 30, `Red must have 30 unique stops with Connolly + Saggart filtered, got ${redStations.length}`);
assert(greenStations.length === 35, `Green must have 35 unique stops, got ${greenStations.length}`);

// Saggart is filtered from the catalog/board, but it is still a printed Red Line terminus
// (LINE_TERMINI.red) — the "Red + Saggart" direction chip must keep appearing at every upstream
// stop naming where the tram is going, independent of catalog membership (docs/jim-brief-
// dublin-saggart-rialto-gaps.md item 2: "it names where the tram goes, not a board you can open").
assert(resolveTerminus("Saggart", "red") === "Saggart", "resolveTerminus must still resolve Saggart as a Red terminus after catalog filtering");
assert(mapLineTerminusDestination("Saggart", "red") === "Red + Saggart", "the Red + Saggart direction chip must keep working even though Saggart's own board is filtered");

// Coordinates (flip follow-through, docs/dublin-d1/jim-handoff.md) — every station
// name-matched against the published NTA GTFS snapshot's stops.txt, and inside Dublin's own
// CITY_BOUNDS box (public/city-session.js). All 67 matched — no exemptions needed.
const dublinBoxes = cityBoundsFor("dublin");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(
    inAnyBounds(station.lat, station.lng, dublinBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Dublin's CITY_BOUNDS box`
  );
}

// resolveCatalogEntry — exact-match aliasing.
assert(resolveCatalogEntry(DUBLIN_HUB)?.name === DUBLIN_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Tallaght")?.name === "Tallaght", "must resolve Tallaght");
assert(resolveCatalogEntry("Saggart") === null, "Saggart must not resolve as a catalog station — filtered for lack of NTA real-time coverage (still a valid Red terminus token, see LINE_TERMINI assertions above)");
assert(resolveCatalogEntry("Broombridge")?.name === "Broombridge", "must resolve Broombridge");
assert(resolveCatalogEntry("Brides Glen")?.name === "Brides Glen", "must resolve Brides Glen");
assert(resolveCatalogEntry("Not A Real Station") === null, "resolveCatalogEntry must reject an unknown station");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(resolveCatalogEntry("Centre") === null, "Centre must never resolve as a station");
assert(isForbiddenCollapseName("City") === true, "City must never resolve as a station on its own");
assert(isForbiddenCollapseName("dub") === true, "invented city token dub must be forbidden");
assert(isForbiddenHubProxy("Marlborough") === true, "Marlborough must never stand in for the Abbey Street hub identity");
assert(isForbiddenHubProxy("O'Connell - GPO") === true, "O'Connell - GPO must never stand in for the Abbey Street hub identity");
assert(isForbiddenHubProxy("Connolly") === true, "Connolly must never stand in for the Abbey Street hub identity (DART interchange, no Green access) — still enforced even though Connolly is no longer a catalog station");
assert(resolveCatalogEntry("Connolly") === null, "Connolly must not resolve as a catalog station — filtered for lack of NTA real-time coverage");
assert(isForbiddenHubProxy(DUBLIN_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("O'Connell - GPO") !== "", "foldKey must fold punctuation");
assert(canonicalStationName("O'Connell GPO") === "O'Connell - GPO", "canonicalStationName must resolve the O'Connell - GPO alias");

// doNotGroup same-family pairs stay distinct catalog entries. Saggart is filtered from the
// catalog (out-feed) but Tallaght vs Saggart as distinct Red termini is still enforced at the
// direction-model level via the resolveTerminus/mapLineTerminusDestination assertions above.
assert(byName.get("Tallaght"), "Tallaght must exist as a catalog Red terminus");
assert(byName.get("O'Connell - GPO") && byName.get("O'Connell Upper"), "O'Connell - GPO and O'Connell Upper must both exist as distinct Green stops");
assert(byName.get("Red Cow") && byName.get("Kingswood") && byName.get("Belgard"), "Red Cow, Kingswood and Belgard must all exist as distinct consecutive Red stops");
assert(!byName.get("Marlborough")?.lines.includes("red"), "Marlborough must be Green only, never Red");

// Line labels + termini (direction-model-memo.md §3 recommendation A — colour + terminus).
assert(resolveTerminus("Tallaght", "red") === "Tallaght", "resolveTerminus must resolve Tallaght on Red");
assert(resolveTerminus("Saggart", "red") === "Saggart", "resolveTerminus must resolve Saggart on Red");
assert(resolveTerminus("Broombridge", "green") === "Broombridge", "resolveTerminus must resolve Broombridge on Green");
assert(resolveTerminus("Brides Glen", "green") === "Brides Glen", "resolveTerminus must resolve Brides Glen on Green");
assert(mapLineTerminusDestination("Tallaght", "red") === "Red + Tallaght", "direction chip must be colour + terminus");
assert(mapLineTerminusDestination("Broombridge", "green") === "Green + Broombridge", "direction chip must be colour + terminus");
assert(mapLineTerminusDestination(DUBLIN_HUB, "red") === "Red", "Abbey Street must never appear as a direction token");

// Route colour classification.
assert(classifyLuasLineId({ routeShortName: "Red Line" }) === "red", "classifyLuasLineId must classify Red by short name");
assert(classifyLuasLineId({ routeLongName: "Luas Green Line" }) === "green", "classifyLuasLineId must classify Green by long name");
assert(classifyLuasLineId({ routeShortName: "46A" }) === null, "classifyLuasLineId must not classify an unrelated bus route");

// Green Line city-centre loop guard (hazard-pack.md H4a) — the sharpest hazard in the D1 pack.
assert(GREEN_LOOP_DIRECTION_ONLY["O'Connell - GPO"] === "northbound", "O'Connell - GPO must be northbound-only");
assert(GREEN_LOOP_DIRECTION_ONLY.Marlborough === "southbound", "Marlborough must be southbound-only");
assert(isDirectionAllowedAtStop("O'Connell - GPO", "green", "Broombridge") === true, "O'Connell - GPO must allow a Broombridge-bound (northbound) trip");
assert(isDirectionAllowedAtStop("O'Connell - GPO", "green", "Brides Glen") === false, "O'Connell - GPO must reject a Brides Glen-bound (southbound) trip");
assert(isDirectionAllowedAtStop("Marlborough", "green", "Brides Glen") === true, "Marlborough must allow a southbound trip");
assert(isDirectionAllowedAtStop("Marlborough", "green", "Broombridge") === false, "Marlborough must reject a northbound trip");
assert(isDirectionAllowedAtStop("Trinity", "green", "Broombridge") === true, "Trinity is a loop merge point — both directions valid");
assert(isDirectionAllowedAtStop("Parnell", "green", "Brides Glen") === true, "Parnell is a loop merge point — both directions valid");

// A trip terminating at the station being viewed is an arrival, not a departure.
assert(isTerminatingAtStation("Tallaght", "Tallaght") === true, "isTerminatingAtStation must catch a same-name arrival");
assert(isTerminatingAtStation("Tallaght", "Saggart") === false, "isTerminatingAtStation must not flag a genuinely different destination");

// ---------------------------------------------------------------------------------------------
// Regression: fetchStationBoard()'s real pipeline (classifyAndFilterDublinTrips), exercised
// end-to-end against a synthetic RT+static fixture (docs/jim-brief-dublin-self-terminus-chip.md
// item 2; Mark's QA-5 note, docs/dublin-d1/mark-qa-note.md). The unit assertion two lines above
// only proves isTerminatingAtStation itself is correct when called with two RAW station names —
// exactly the case that was never broken. It never proved the real fetchStationBoard() pipeline
// actually calls it that way, and it didn't: the pipeline used to overwrite trip.destination with
// the mapped "Colour + Terminus" label BEFORE the filter ran, so
// isTerminatingAtStation("Red + Tallaght", "Tallaght") — the guard's real input — silently never
// matched. This test builds a buildBoardForStops() board (the same function fetchStationBoard()
// itself calls) from a synthetic static+RT fixture and feeds it straight into
// classifyAndFilterDublinTrips() (the exact function fetchStationBoard() calls next), so it
// catches a regression in the wiring between those two calls, not just in either function alone.
// ---------------------------------------------------------------------------------------------
function dublinFixtureStaticData() {
  const stopIds = ["stop-belgard", "stop-tallaght", "stop-thepoint", "stop-sandyford", "stop-broombridge", "stop-bridesglen"];
  const stopsById = new Map(stopIds.map((id) => [id, { stop_id: id, platform_code: "" }]));

  const routesById = new Map([
    ["route-red", { route_id: "route-red", route_short_name: "", route_long_name: "Luas Red Line" }],
    ["route-green", { route_id: "route-green", route_short_name: "", route_long_name: "Luas Green Line" }],
  ]);

  // Each trip visits an upstream trunk stop first, then its own terminus — same shape as a real
  // Luas trip (e.g. Belgard -> Tallaght), so the SAME trip can be asserted both ways: filtered at
  // its own terminus, but still showing up correctly one stop earlier.
  const departureTimeOfDay = "23:59:00"; // scheduled well within the near horizon regardless of `now`
  const tripDefs = [
    { trip_id: "trip-red-tallaght", route_id: "route-red", trip_headsign: "Tallaght", stopIds: ["stop-belgard", "stop-tallaght"] },
    { trip_id: "trip-red-thepoint", route_id: "route-red", trip_headsign: "The Point", stopIds: ["stop-belgard", "stop-thepoint"] },
    { trip_id: "trip-green-broombridge", route_id: "route-green", trip_headsign: "Broombridge", stopIds: ["stop-sandyford", "stop-broombridge"] },
    { trip_id: "trip-green-bridesglen", route_id: "route-green", trip_headsign: "Brides Glen", stopIds: ["stop-sandyford", "stop-bridesglen"] },
  ];

  const tripsById = new Map(
    tripDefs.map((t) => [t.trip_id, { trip_id: t.trip_id, service_id: "WD", route_id: t.route_id, trip_headsign: t.trip_headsign }])
  );

  const stopTimesByStopId = new Map(stopIds.map((id) => [id, []]));
  for (const t of tripDefs) {
    t.stopIds.forEach((stopId, index) => {
      stopTimesByStopId.get(stopId).push({
        trip_id: t.trip_id,
        stop_id: stopId,
        departure_time: departureTimeOfDay,
        pickup_type: "0",
        stop_sequence: index + 1,
      });
    });
  }

  return {
    stopsById,
    stopTimesByStopId,
    tripsById,
    routesById,
    calendar: [
      {
        service_id: "WD",
        start_date: "20200101",
        end_date: "20991231",
        monday: "1",
        tuesday: "1",
        wednesday: "1",
        thursday: "1",
        friday: "1",
        saturday: "1",
        sunday: "1",
      },
    ],
    calendarDates: [],
    railTripIds: new Set(tripDefs.map((t) => t.trip_id)),
    timeZone: "UTC",
  };
}

function dublinFixtureRealtimeIndex(now) {
  const soonEpochSec = Math.floor((now.getTime() + 5 * 60_000) / 1000);
  const entities = [
    "trip-red-tallaght",
    "trip-red-thepoint",
    "trip-green-broombridge",
    "trip-green-bridesglen",
  ].flatMap((tripId) =>
    [
      tripId === "trip-red-tallaght" || tripId === "trip-red-thepoint" ? "stop-belgard" : "stop-sandyford",
      tripId === "trip-red-tallaght" ? "stop-tallaght" : tripId === "trip-red-thepoint" ? "stop-thepoint" : tripId === "trip-green-broombridge" ? "stop-broombridge" : "stop-bridesglen",
    ].map((stopId) => ({
      tripUpdate: {
        trip: { tripId },
        stopTimeUpdate: [{ stopId, departure: { time: soonEpochSec } }],
      },
    }))
  );
  return indexTripUpdates(entities);
}

function testFetchStationBoardPipelineFiltersSelfTerminus() {
  const now = new Date();
  const staticData = dublinFixtureStaticData();
  const realtimeIndex = dublinFixtureRealtimeIndex(now);

  function destinationsAt(stationName, stopId) {
    const rawTrips = buildBoardForStops({
      stopIds: [stopId],
      staticData,
      realtimeIndex,
      timeZone: "UTC",
      now,
      horizonMinutes: 1440,
      skipResolvedShareCheck: true,
    });
    const { trips, scheduledCandidates } = classifyAndFilterDublinTrips(rawTrips, stationName, realtimeIndex);
    return {
      trips: trips.map((t) => t.destination),
      scheduledCandidates: scheduledCandidates.map((t) => t.destination),
    };
  }

  // Self-terminus: a Red trip headsigned "Tallaght" must never appear at Tallaght itself, in
  // either trips or scheduledCandidates — this is the exact bug Mark found live.
  const tallaght = destinationsAt("Tallaght", "stop-tallaght");
  assert(!tallaght.trips.includes("Red + Tallaght"), 'Tallaght board must never show "Red + Tallaght" (self-terminus) in trips');
  assert(
    !tallaght.scheduledCandidates.includes("Red + Tallaght"),
    'Tallaght scheduledCandidates must never show "Red + Tallaght" (self-terminus) — honest-empty-state reads this list too'
  );

  // The Point: same trip shape, other Red terminus.
  const thePoint = destinationsAt("The Point", "stop-thepoint");
  assert(!thePoint.trips.includes("Red + The Point"), 'The Point board must never show "Red + The Point" (self-terminus) in trips');
  assert(!thePoint.scheduledCandidates.includes("Red + The Point"), 'The Point scheduledCandidates must never show "Red + The Point" (self-terminus)');

  // Green termini: same guard, other line.
  const broombridge = destinationsAt("Broombridge", "stop-broombridge");
  assert(!broombridge.trips.includes("Green + Broombridge"), 'Broombridge board must never show "Green + Broombridge" (self-terminus) in trips');
  assert(!broombridge.scheduledCandidates.includes("Green + Broombridge"), 'Broombridge scheduledCandidates must never show "Green + Broombridge" (self-terminus)');

  const bridesGlen = destinationsAt("Brides Glen", "stop-bridesglen");
  assert(!bridesGlen.trips.includes("Green + Brides Glen"), 'Brides Glen board must never show "Green + Brides Glen" (self-terminus) in trips');
  assert(!bridesGlen.scheduledCandidates.includes("Green + Brides Glen"), 'Brides Glen scheduledCandidates must never show "Green + Brides Glen" (self-terminus)');

  // The SAME two Red trips, one stop upstream at the trunk stop Belgard, must still show up
  // correctly as real, non-self-terminus directions — proves the fix doesn't over-filter.
  const belgard = destinationsAt("Belgard", "stop-belgard");
  assert(belgard.trips.includes("Red + Tallaght"), 'Belgard must still show "Red + Tallaght" for a genuinely upstream Tallaght-bound trip');
  assert(belgard.trips.includes("Red + The Point"), 'Belgard must still show "Red + The Point" for a genuinely upstream The Point-bound trip');

  // Same check for the Green Line's upstream trunk stop Sandyford.
  const sandyford = destinationsAt("Sandyford", "stop-sandyford");
  assert(sandyford.trips.includes("Green + Broombridge"), 'Sandyford must still show "Green + Broombridge" for a genuinely upstream trip');
  assert(sandyford.trips.includes("Green + Brides Glen"), 'Sandyford must still show "Green + Brides Glen" for a genuinely upstream trip');
}

testFetchStationBoardPipelineFiltersSelfTerminus();

// fetchStationBoard — no network for either of these two failure paths.
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station", { apiKey: "test-key" });
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

let missingKeyThrew = false;
try {
  await fetchStationBoard(DUBLIN_HUB, { apiKey: "" });
} catch (err) {
  missingKeyThrew = err instanceof MissingNtaApiKeyError;
}
assert(missingKeyThrew, "fetchStationBoard must throw MissingNtaApiKeyError when no key is configured — no silent timetable fallback");

// Dogfood station list comes from the catalog, not a live parse.
const dogfoodStations = listDublinDogfoodStations();
assert(dogfoodStations.length === 65, `dogfood stations must be the 65 catalog names (Connolly + Saggart filtered), got ${dogfoodStations.length}`);
assert(!dogfoodStations.some((row) => row.name === "Connolly"), "Connolly must not appear in the dogfood station list");
assert(dogfoodStations.some((row) => row.name === DUBLIN_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodStations.every((row) => typeof row.lat === "number" && typeof row.lng === "number"), "every dogfood station must carry lat/lng");

// Directions are derived live (no static marketing-directions list for Dublin — see
// lib/cities/dublin/dogfood-next-train.js file header), so the dogfood/dispatch paths must
// both surface the same MissingNtaApiKeyError rather than a silent fallback board.
let dogfoodDirectionsThrew = false;
try {
  await getDublinDogfoodDirections(DUBLIN_HUB);
} catch (err) {
  dogfoodDirectionsThrew = err instanceof MissingNtaApiKeyError;
}
assert(dogfoodDirectionsThrew, "dogfood directions must surface MissingNtaApiKeyError, not a silent fallback board");

let dispatchedDirectionsThrew = false;
try {
  await getMultiCityDirections("dublin", DUBLIN_HUB);
} catch (err) {
  dispatchedDirectionsThrew = err instanceof MissingNtaApiKeyError;
}
assert(
  dispatchedDirectionsThrew,
  "live-city-api dispatch for directions must surface MissingNtaApiKeyError, not a silent fallback board, even though dublin is deliberately not in MULTI_CITY_IDS yet"
);

let dispatchedNextTrainThrew = false;
try {
  await getMultiCityNextTrain("dublin", {
    station: "Tallaght",
    destination: "Red + Abbey Street",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dispatchedNextTrainThrew = err instanceof MissingNtaApiKeyError;
}
assert(dispatchedNextTrainThrew, "dispatched next-train must surface MissingNtaApiKeyError, not a silent fallback board");

let dogfoodNextTrainThrew = false;
try {
  await getDublinDogfoodNextTrain({
    station: "Tallaght",
    destination: "Red + Abbey Street",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dogfoodNextTrainThrew = err instanceof MissingNtaApiKeyError;
}
assert(dogfoodNextTrainThrew, "dogfood next-train must surface MissingNtaApiKeyError, not a silent fallback board");

// Rider-facing coverage copy (api/coverage-notes.js) — Luas only, DART explicitly called out
// as not covered (board-eligibility verdict out-product, docs/dublin-d1/oracle-clash-report.md).
const coverage = JSON.parse(readFileSync(join(ROOT, "lib/cities/dublin/coverage.json"), "utf8"));
assert(coverage.region === "dublin", "coverage.json region must be dublin");
assert(coverage.covered.some((c) => /Luas/.test(c.label)), "coverage.json must record Luas as covered");
assert(coverage.notCovered.some((c) => /DART|Iarnr/.test(c.label)), "coverage.json must explicitly record DART/Iarnród Éireann as not covered");
assert(coverage.notCovered.some((c) => /Connolly/.test(c.label)), "coverage.json must explicitly record Connolly as not covered — no real-time data from the NTA feed");
assert(coverage.notCovered.some((c) => /Saggart/.test(c.label)), "coverage.json must explicitly record Saggart as not covered — no real-time data from the NTA feed");

// Picker/country-regions surfaces: while `status: "planned"`, a city gets no picker entry at
// all, live or "Coming Soon" (Tim, 27 Sep 2026: "It's either in or out.";
// docs/jim-brief-no-coming-soon-picker.md, superseding the earlier "comingSoon flip-readiness
// scaffolding" precedent this gate used to assert). Persistence + dogfood-mount whitelists
// (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS, brisbane-dogfood MULTI_CITY_IDS/available,
// live-city-api MULTI_CITY_IDS) are also deliberately not touched while planned — same
// registry-status-derived invariant qa/live-city-lists-sync.mjs enforces globally (those lists
// must equal exactly the live-city set). "dublin"/"ie" go into the picker, country-regions.js,
// and all four lists in the same commit as the status flip — asserted here in whichever
// direction the current registry status requires, status-agnostic per the brief.
const countryRegions = readFileSync(join(ROOT, "lib/cities/country-regions.js"), "utf8");
// The picker is now built server-side from the /api/cities manifest
// (docs/jim-brief-registry-driven-client.md) — status drives manifest membership automatically,
// with nothing left in public/city-session.js to assert against.
const manifestCityIds = buildCityManifest().cities.map((c) => c.id);
if (dublinIsLive) {
  assert(/dublin:\s*"ie"/.test(countryRegions), "country-regions.js must map dublin to ie now that it is live");
  assert(manifestCityIds.includes("dublin"), "the /api/cities manifest must list Dublin now that it is live");
} else {
  assert(!/dublin:\s*"ie"/.test(countryRegions), "country-regions.js must not map dublin to ie until the flip commit");
  assert(
    !manifestCityIds.includes("dublin"),
    'the /api/cities manifest must not list Dublin until the flip commit (registry status must stay "planned")'
  );
}
// The bounds box exists ahead of the flip, same as Hong Kong's — it only satisfies
// qa/live-city-lists-sync.mjs's per-live-city check once Dublin is live, and is otherwise inert
// while the city isn't in the manifest at all, so this assertion holds in both states.
assert(Boolean(CITY_BOUNDS.dublin), "lib/cities/city-bounds.js must carry a dublin box");

console.log(
  `dublin-dogfood-gate: ok (status=${entry.status}, dispatch switch-cases wired, MULTI_CITY_IDS/mount/persistence/picker/country-regions lists tracking registry status (${
    dublinIsLive ? "live — all four lists must include dublin" : "planned — deliberately deferred to the status-flip commit"
  }), D1 pack, Board eligibility section recorded (DART/buses/Connolly/Saggart out), 65 stations (Connolly + Saggart filtered — no NTA real-time coverage; Rialto confirmed intermittent and kept in) with real lat/lng inside CITY_BOUNDS, hub Abbey Street, Red + Saggart direction chip still works upstream, doNotGroup pairs enforced, colour+terminus direction model, Green city-centre loop direction-exclusivity guard, self-terminus guard fixed (rawDestination/terminus, not the mapped label) and regression-tested end-to-end via classifyAndFilterDublinTrips, missing-key throws surfaced consistently across dogfood/dispatch/directions/next-train, coverage.json records Luas in / DART + Connolly + Saggart out, Perth Australia green)`
);
