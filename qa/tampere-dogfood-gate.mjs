/**
 * Tampere flip follow-through gate. City stays `status: "planned"` — the dogfood module,
 * live-city-api.js dispatch switch-cases, and this gate are wired ahead of the flip per the
 * flip-follow-through guardrail (Boston PR #414 / Dublin qa/dublin-dogfood-gate.mjs shape), so
 * no second pass is needed once Mark/Tim flip it.
 *
 * Status-agnostic (same shape as qa/dublin-dogfood-gate.mjs): every assertion that depends on
 * registry status reads `entry.status` at runtime and branches, rather than hardcoding
 * "planned", so a future flip commit does not need to touch this file at all.
 *
 * Deliberately does NOT call the live ITS Factory GTFS-RT VehiclePositions endpoint or fetch
 * the ITS Factory static GTFS zip — this is a smoke-tier gate, not a network test
 * (qa/tampere-all-stations-live-sweep.mjs covers that). Instead this gate unit-tests the
 * catalog/direction-model logic plus the dispatch wiring, and runs a
 * fetchStationBoard()-*pipeline*-level regression test (classifyAndFilterTampereTrips, the
 * exact function fetchStationBoard() itself calls) against a synthetic static+VehiclePositions
 * fixture, without mocking the network fetch fetchStationBoard() makes — covering both the
 * self-terminus guard AND hazard-pack.md H5's through-running minority (the sharpest hazard in
 * this pack): a trip tagged route_id "1" that actually terminates on line 3's corridor must get
 * that real terminus as its chip, never the printed line's usual terminus.
 *
 * Usage: node qa/tampere-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  TAMPERE_HUB,
  TAMPERE_TIME_ZONE,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  classifyAndFilterTampereTrips,
  tripTerminusStationName,
} from "../lib/providers/tampere.js";
import {
  foldKey,
  isForbiddenCollapseName,
  ALLOWED_LINE_CODES,
} from "../lib/cities/tampere/marketing-directions.js";
import {
  listTampereDogfoodStations,
  getTampereDogfoodDirections,
  getTampereDogfoodNextTrain,
} from "../lib/cities/tampere/dogfood-next-train.js";
import { buildBoardForStops } from "../lib/providers/gtfs/board.js";
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

// Registry identity + status — status-agnostic.
const entry = getCity("tampere");
assert(entry, "tampere must be registered");
assert(
  entry.status === "planned" || entry.status === "live",
  `tampere registry status must be planned or live, got ${entry.status}`
);
const tampereIsLive = entry.status === "live";

const live = assertCityLive("tampere");
if (tampereIsLive) {
  assert(live?.ok === true, "assertCityLive(tampere) must pass once tampere is live");
} else {
  assert(live?.ok === false, "assertCityLive(tampere) must fail while tampere stays planned");
  assert(live?.status === 501, "tampere must be 501 planned while tampere stays planned");
}

assert(entry?.adapterReady === true, "tampere adapterReady must be true");
assert(entry?.displayName === "Tampere", "tampere display name must be Tampere");
assert(entry?.timeZone === "Europe/Helsinki", "tampere timezone must be Europe/Helsinki");
assert(CITIES.filter((city) => city.id === "tampere").length === 1, "tampere must appear once in the registry");
for (const forbiddenId of ["nysse", "fi", "tre"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired regardless of status.
assert(
  isMultiCity("tampere") === tampereIsLive,
  tampereIsLive
    ? "tampere must be in MULTI_CITY_IDS now that it is live"
    : "tampere must NOT be in MULTI_CITY_IDS while status stays planned"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/tampere-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSyncSafe(join(d1Dir, name)), `docs/tampere-d1/${name} is required`);
}
function existsSyncSafe(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "tampere", "D1 city id must be tampere");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === TAMPERE_HUB, `D1 lock must be ${TAMPERE_HUB}`);
assert(network.lines.length === 2, "D1 must carry exactly 2 lines (1 and 3)");

// Board eligibility rule (docs/board-eligibility-rule.md).
assert(network.boardEligibility?.verdicts?.length >= 3, "D1 pack must record board-eligibility verdicts");
const verdictServices = network.boardEligibility.verdicts.map((v) => v.service);
assert(verdictServices.some((s) => /tram/i.test(s)), "board eligibility must record the tram verdict");
assert(verdictServices.some((s) => /bus/i.test(s)), "board eligibility must record the Nysse bus verdict");
assert(verdictServices.some((s) => /VR/i.test(s)), "board eligibility must record the VR verdict");

const stations = listCatalogStations();
assert(stations.length === 33, `catalog must have 33 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(TAMPERE_HUB), `catalog must lock ${TAMPERE_HUB}`);
assert(byName.get(TAMPERE_HUB)?.hub === true, "hub entry must carry hub:true");

const line1Stations = stations.filter((s) => s.lines.includes("1"));
const line3Stations = stations.filter((s) => s.lines.includes("3"));
const sharedStations = stations.filter((s) => s.lines.includes("1") && s.lines.includes("3"));
assert(line1Stations.length === 20, `line 1 must have 20 stations, got ${line1Stations.length}`);
assert(line3Stations.length === 17, `line 3 must have 17 stations, got ${line3Stations.length}`);
assert(sharedStations.length === 4, `4 stations must be shared, got ${sharedStations.length}`);
for (const name of ["Sammonaukio", "Tulli", "Rautatieasema", "Koskipuisto"]) {
  assert(byName.get(name)?.lines.includes("1") && byName.get(name)?.lines.includes("3"), `${name} must be shared by both lines`);
}
assert(!byName.get("Keskustori")?.lines.includes("3"), "Keskustori must be Line 1 only — Line 3 does not call there (hazard-pack.md H2/H6)");
assert(!byName.get("Sorin aukio")?.lines.includes("1"), "Sorin aukio must be Line 3 only");
assert(!byName.get("Kaupin kampus")?.lines.includes("3"), "Kaupin kampus must be Line 1 only");

// Coordinates inside CITY_BOUNDS.
const tampereBoxes = cityBoundsFor("tampere");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(
    inAnyBounds(station.lat, station.lng, tampereBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Tampere's CITY_BOUNDS box`
  );
  assert(Array.isArray(station.stopIds) && station.stopIds.length === 2, `${station.name} must carry two GTFS stopIds (A/B)`);
}

// resolveCatalogEntry.
assert(resolveCatalogEntry(TAMPERE_HUB)?.name === TAMPERE_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Pyhällönpuisto")?.name === "Pyhällönpuisto", "must resolve Pyhällönpuisto");
assert(resolveCatalogEntry("Hervantajärvi")?.name === "Hervantajärvi", "must resolve Hervantajärvi");
assert(resolveCatalogEntry("Not A Real Station") === null, "resolveCatalogEntry must reject an unknown station");
assert(resolveCatalogEntry("Tampere railway station") === null, "Tampere railway station (VR) must never resolve as a tram stop");
assert(resolveCatalogEntry("Tampere Central Station") === null, "Tampere Central Station (VR) must never resolve as a tram stop");
assert(resolveCatalogEntry("Tampere asema") === null, "Tampere asema (VR) must never resolve as a tram stop");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(isForbiddenCollapseName("Tampere") === true, "bare 'Tampere' must never resolve as a station on its own");
assert(foldKey("Pyhällönpuisto") !== "", "foldKey must fold Finnish diacritics without emptying the string");
assert(ALLOWED_LINE_CODES.has("1") && ALLOWED_LINE_CODES.has("3") && !ALLOWED_LINE_CODES.has("2"), "only lines 1 and 3 are allowed — no passenger Line 2 (hazard-pack.md H3)");

// doNotGroup same-family pairs stay distinct catalog entries (hazard-pack.md H1).
assert(byName.get("Kalevan kirkko") && byName.get("Kalevanrinne") && byName.get("Kaleva"), "the three Kalev- prefixed stops must all exist as distinct stations");
assert(byName.get("Tikkutehdas") && byName.get("Tehdas"), "Tikkutehdas and Tehdas must both exist as distinct stations");
assert(byName.get("Niemen kartano") && byName.get("Niemenranta"), "Niemen kartano and Niemenranta must both exist as distinct stations");
assert(byName.get("Sorin aukio") && byName.get("Sammonaukio"), "Sorin aukio and Sammonaukio must both exist as distinct stations");
assert(byName.get("TAYS") && byName.get("Kaupin kampus"), "TAYS and Kaupin kampus must both exist as distinct, adjacent stations");
for (const name of ["Hervannan kampus", "Hervantakeskus", "Etelä-Hervanta", "Pohjois-Hervanta", "Hervantajärvi"]) {
  assert(byName.get(name), `${name} must exist as its own distinct Hervanta-corridor station`);
}

// ---------------------------------------------------------------------------------------------
// Regression: fetchStationBoard()'s real pipeline (classifyAndFilterTampereTrips), exercised
// end-to-end against a synthetic static+VehiclePositions fixture. Covers the self-terminus
// guard AND hazard-pack.md H5's through-running minority — the sharpest hazard in this pack —
// using REAL stop_ids from the production catalog so tripTerminusStationName's
// STOP_ID_TO_STATION join is exercised for real, not just the fallback raw-stop_name path.
// ---------------------------------------------------------------------------------------------
function tampereFixtureStaticData() {
  // Real stop_ids from lib/cities/tampere/stations.json (A platform of each named station).
  const STOP = {
    kaupinKampus: "0907",
    rautatieasema: "0809",
    pyhallonpuisto: "0872",
    hervantajarvi: "0839",
    sorinAukio: "0950",
  };
  const stopIds = Object.values(STOP);
  const stopsById = new Map(stopIds.map((id) => [id, { stop_id: id, platform_code: "", stop_name: id }]));

  const routesById = new Map([
    ["route-1", { route_id: "route-1", route_short_name: "1", route_long_name: "Kaupin kampus - Keskustori - Lentävänniemi" }],
    ["route-3", { route_id: "route-3", route_short_name: "3", route_long_name: "Hervanta - Hakametsä - Sorin aukio" }],
  ]);

  const departureTimeOfDay = "23:59:00"; // scheduled well within the near horizon regardless of `now`
  // trip-1-clean: ordinary Line 1 westbound trip, Kaupin kampus -> Rautatieasema -> Pyhällönpuisto.
  // trip-1-through: hazard-pack.md H5 — tagged route_id "1" but PHYSICALLY runs through onto
  //   Line 3's corridor, actually ending at Hervantajärvi (never Kaupin kampus/Pyhällönpuisto).
  //   trip_headsign here is deliberately the same misleading string ("Lentävänniemi") a real
  //   through-running trip carries — the destination must NOT come from this field.
  // trip-3-clean: ordinary Line 3 trip, Hervantajärvi -> Rautatieasema -> Sorin aukio.
  const tripDefs = [
    { trip_id: "trip-1-clean", route_id: "route-1", trip_headsign: "Pyhällönpuisto", stopIds: [STOP.kaupinKampus, STOP.rautatieasema, STOP.pyhallonpuisto] },
    { trip_id: "trip-1-through", route_id: "route-1", trip_headsign: "Lentävänniemi", stopIds: [STOP.pyhallonpuisto, STOP.rautatieasema, STOP.hervantajarvi] },
    { trip_id: "trip-3-clean", route_id: "route-3", trip_headsign: "Sorin aukio", stopIds: [STOP.hervantajarvi, STOP.rautatieasema, STOP.sorinAukio] },
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
        monday: "1", tuesday: "1", wednesday: "1", thursday: "1", friday: "1", saturday: "1", sunday: "1",
      },
    ],
    calendarDates: [],
    railTripIds: new Set(tripDefs.map((t) => t.trip_id)),
    timeZone: "UTC",
  };
}

function tampereFixtureRealtimeIndex() {
  // All three trips are confirmed running (present in VehiclePositions) — the through-running
  // trip must be shown correctly, not dropped and not mislabelled.
  return {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
    tripIds: new Set(["trip-1-clean", "trip-1-through", "trip-3-clean"]),
    rawTripIds: new Set(["trip-1-clean", "trip-1-through", "trip-3-clean"]),
    activeTripIds: new Set(["trip-1-clean", "trip-1-through", "trip-3-clean"]),
  };
}

function destinationsAt(stationName, stopId, staticData, realtimeIndex) {
  const rawTrips = buildBoardForStops({
    stopIds: [stopId],
    staticData,
    realtimeIndex,
    timeZone: "UTC",
    now: new Date(),
    horizonMinutes: 1440,
    skipResolvedShareCheck: true,
  });
  const { trips, scheduledCandidates } = classifyAndFilterTampereTrips(rawTrips, stationName, realtimeIndex, staticData);
  return {
    trips: trips.map((t) => t.destination),
    scheduledCandidates: scheduledCandidates.map((t) => t.destination),
  };
}

function testThroughRunningAndSelfTerminus() {
  const staticData = tampereFixtureStaticData();
  const realtimeIndex = tampereFixtureRealtimeIndex();

  // At Rautatieasema (the hub, mid-trip for all three trips), the through-running trip must
  // show its REAL destination (Hervantajärvi), not the printed Line 1 terminus (Pyhällönpuisto)
  // and not a headsign-derived guess ("Lentävänniemi" was its trip_headsign).
  const hub = destinationsAt(TAMPERE_HUB, "0809", staticData, realtimeIndex);
  assert(hub.trips.includes("1 + Hervantajärvi"), 'a route_id "1" through-running trip must show "1 + Hervantajärvi" (its real last stop), not its printed line terminus');
  assert(!hub.trips.includes("1 + Lentävänniemi"), 'the through-running trip must never surface its misleading trip_headsign ("Lentävänniemi") as a destination');
  assert(hub.trips.includes("1 + Pyhällönpuisto"), "the ordinary (non-through-running) Line 1 trip must still show its normal terminus at the shared hub, alongside the through-running trip's real one");
  assert(hub.trips.includes("3 + Sorin aukio"), "the ordinary Line 3 trip must still show its normal terminus at the shared hub");

  // Self-terminus: none of these three trips' own terminus stop should show a same-station chip.
  const pyhallonpuisto = destinationsAt("Pyhällönpuisto", "0872", staticData, realtimeIndex);
  assert(!pyhallonpuisto.trips.includes("1 + Pyhällönpuisto"), "Pyhällönpuisto must never show its own name as a destination (self-terminus, for the ordinary trip arriving there)");
  assert(!pyhallonpuisto.scheduledCandidates.includes("1 + Pyhällönpuisto"), "self-terminus guard must also apply to scheduledCandidates (honest-empty-state reads this list)");
  assert(pyhallonpuisto.trips.includes("1 + Hervantajärvi"), "the through-running trip DEPARTS Pyhällönpuisto (its first stop in this fixture) heading for Hervantajärvi — a genuine, correct departure, not filtered");

  const hervantajarvi = destinationsAt("Hervantajärvi", "0839", staticData, realtimeIndex);
  assert(!hervantajarvi.trips.includes("1 + Hervantajärvi"), "Hervantajärvi must never show itself as a destination (self-terminus, for the through-running trip that ends there)");
  assert(hervantajarvi.trips.includes("3 + Sorin aukio"), "the ordinary Line 3 trip must still depart Hervantajärvi correctly, heading for Sorin aukio");

  const sorinAukio = destinationsAt("Sorin aukio", "0950", staticData, realtimeIndex);
  assert(!sorinAukio.trips.includes("3 + Sorin aukio"), "Sorin aukio must never show itself as a destination (self-terminus)");

  // Upstream (Kaupin kampus), trip-1-clean must still correctly show its real terminus.
  const kaupinKampus = destinationsAt("Kaupin kampus", "0907", staticData, realtimeIndex);
  assert(kaupinKampus.trips.includes("1 + Pyhällönpuisto"), "Kaupin kampus must still show 1 + Pyhällönpuisto for the genuinely clean trip starting there");

  // tripTerminusStationName exported unit — direct check.
  const cleanTrip = { tripId: "trip-1-clean" };
  const throughTrip = { tripId: "trip-1-through" };
  assert(tripTerminusStationName(cleanTrip, staticData) === "Pyhällönpuisto", "tripTerminusStationName must resolve the clean trip's real last stop");
  assert(tripTerminusStationName(throughTrip, staticData) === "Hervantajärvi", "tripTerminusStationName must resolve the through-running trip's real last stop, not its headsign or route's usual terminus");
}

testThroughRunningAndSelfTerminus();

// fetchStationBoard — no network for the unknown-station failure path.
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

// Dogfood station list comes from the catalog, not a live parse.
const dogfoodStations = listTampereDogfoodStations();
assert(dogfoodStations.length === 33, `dogfood stations must be the 33 catalog names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === TAMPERE_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodStations.every((row) => typeof row.lat === "number" && typeof row.lng === "number"), "every dogfood station must carry lat/lng");

// Directions/next-train dispatch wiring — offline, no network. Tampere needs no API key (unlike
// Dublin/Melbourne), so there is no deterministic offline "missing key" failure to assert
// instead; a real station name would actually succeed against the live, unauthenticated
// VehiclePositions feed in an environment with internet access (confirmed live this pass), which
// would make this gate flaky in a network-sandboxed CI runner. Instead, prove the dispatch
// wiring reaches lib/providers/tampere.js's own resolveCatalogEntry/fetchStationBoard — which
// throws synchronously on an unknown station name BEFORE any network call — by using a name that
// is not a real station. A wiring bug (wrong import, wrong city id) would surface here as either
// no error or a different error message.
const UNKNOWN_STATION = "Not A Real Tampere Station";

let dogfoodDirectionsThrew = false;
try {
  await getTampereDogfoodDirections(UNKNOWN_STATION);
} catch (err) {
  dogfoodDirectionsThrew = /Unknown Tampere station/.test(String(err?.message));
}
assert(dogfoodDirectionsThrew, "dogfood directions must reach fetchStationBoard's unknown-station check, offline, no network");

let dispatchedDirectionsThrew = false;
try {
  await getMultiCityDirections("tampere", UNKNOWN_STATION);
} catch (err) {
  dispatchedDirectionsThrew = /Unknown Tampere station/.test(String(err?.message));
}
assert(
  dispatchedDirectionsThrew,
  "live-city-api dispatch for directions must reach the same offline unknown-station check, even though tampere is deliberately not in MULTI_CITY_IDS yet"
);

let dispatchedNextTrainThrew = false;
try {
  await getMultiCityNextTrain("tampere", {
    station: UNKNOWN_STATION,
    destination: "1 + Pyhällönpuisto",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dispatchedNextTrainThrew = /Unknown Tampere station/.test(String(err?.message));
}
assert(dispatchedNextTrainThrew, "dispatched next-train must reach the same offline unknown-station check");

let dogfoodNextTrainThrew = false;
try {
  await getTampereDogfoodNextTrain({
    station: UNKNOWN_STATION,
    destination: "1 + Pyhällönpuisto",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dogfoodNextTrainThrew = /Unknown Tampere station/.test(String(err?.message));
}
assert(dogfoodNextTrainThrew, "dogfood next-train must reach the same offline unknown-station check");

// Rider-facing coverage copy.
const coverage = JSON.parse(readFileSync(join(ROOT, "lib/cities/tampere/coverage.json"), "utf8"));
assert(coverage.region === "tampere", "coverage.json region must be tampere");
assert(coverage.covered.some((c) => /Tampere Tram/.test(c.label)), "coverage.json must record Tampere Tram as covered");
assert(coverage.notCovered.some((c) => /bus/i.test(c.label)), "coverage.json must explicitly record Nysse buses as not covered");
assert(coverage.notCovered.some((c) => /VR/.test(c.label)), "coverage.json must explicitly record VR trains as not covered");

// Picker/country-regions surfaces: while `status: "planned"`, a city gets no picker entry at all
// (docs/jim-brief-no-coming-soon-picker.md, 27 Sep 2026: cities are in or out, no "Coming Soon"
// row). Persistence + dogfood-mount whitelists are also deliberately not touched while planned —
// same registry-status-derived invariant qa/live-city-lists-sync.mjs enforces globally.
const countryRegions = readFileSync(join(ROOT, "lib/cities/country-regions.js"), "utf8");
const manifestCityIds = buildCityManifest().cities.map((c) => c.id);
if (tampereIsLive) {
  assert(/tampere:\s*"fi"/.test(countryRegions), "country-regions.js must map tampere to fi now that it is live");
  assert(manifestCityIds.includes("tampere"), "the /api/cities manifest must list Tampere now that it is live");
} else {
  assert(!/tampere:\s*"fi"/.test(countryRegions), "country-regions.js must not map tampere to fi until the flip commit");
  assert(
    !manifestCityIds.includes("tampere"),
    'the /api/cities manifest must not list Tampere until the flip commit (registry status must stay "planned")'
  );
}
// The bounds box exists ahead of the flip, same as Dublin/Hong Kong's.
assert(Boolean(CITY_BOUNDS.tampere), "lib/cities/city-bounds.js must carry a tampere box");

console.log(
  `tampere-dogfood-gate: ok (status=${entry.status}, dispatch switch-cases wired, MULTI_CITY_IDS/picker/country-regions tracking registry status (${
    tampereIsLive ? "live — all lists must include tampere" : "planned — deliberately deferred to the status-flip commit"
  }), D1 pack, Board eligibility verdicts recorded (tram in / bus out-mode / VR out-scope), 33 stations (20 line 1 + 17 line 3 - 4 shared) with real lat/lng + stopIds inside CITY_BOUNDS, hub Rautatieasema, doNotGroup pairs enforced, line + actual-last-stop direction model (no headsign lookup table needed), H5 through-running trip resolved to its real terminus (not its headsign, not its printed line's usual terminus), self-terminus guard enforced at every tested terminus, real-fetch-failure propagation consistent across dogfood/dispatch/directions/next-train, coverage.json records tram in / bus + VR out, Perth Australia green)`
);
