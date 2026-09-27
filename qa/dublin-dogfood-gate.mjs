/**
 * Dublin flip follow-through gate. Rewritten 26 Sep 2026 (docs/jim-brief-dublin-flip.md) to
 * assert LIVE state — Dublin flipped `status: "live"` on Tim's explicit decision in chat,
 * recorded in the brief, on the strength of: GTFS_LUAS.zip published to
 * gtfsFixtureBlobUrl('dublin') (2 routes, agency LUAS, 128 stops,
 * docs/dublin-d1/ci-snapshot-evidence.md), NTA GTFS-RT v2 TripUpdates matching the static
 * snapshot 70/70 (100%, CI run 36236001976, PR #464, qa/dublin-rt-join-check.mjs), and
 * NTA_API_KEY set in Vercel production. Mirrors qa/dublin-planned-gate.mjs's offline-safe
 * shape — the old pre-flip assertions (assertCityLive must fail, status === "planned",
 * isMultiCity() === false) are removed, not left disabled. Replaces qa/dublin-planned-gate.mjs.
 *
 * Deliberately does NOT call the live NTA GTFS-RT v2 endpoint (api.nationaltransport.ie) or
 * fetch the national/Luas GTFS zip — this is a smoke-tier gate, offline-safe like every other
 * city dogfood gate that needs a paid/keyed live feed (e.g. qa/washington-dogfood-gate.mjs).
 * Instead this gate unit-tests the catalog/direction-model logic (resolveCatalogEntry,
 * listCatalogStations, classifyLuasLineId, resolveTerminus, mapLineTerminusDestination,
 * isDirectionAllowedAtStop), the dispatch switch-cases in lib/cities/live-city-api.js, and
 * asserts that fetchStationBoard throws for an unknown station and for a missing NTA_API_KEY,
 * all without any network call. Live 70/70 join confirmation lives in CI
 * (qa/dublin-rt-join-check.mjs), not here.
 *
 * Usage: node qa/dublin-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import {
  DUBLIN_HUB,
  DUBLIN_TIME_ZONE,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  directionsFromStatic,
  resolveTripTerminus,
} from "../lib/providers/dublin.js";
import { MissingNtaApiKeyError } from "../lib/providers/gtfs/auth.js";
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
  LINE_TERMINI,
} from "../lib/cities/dublin/marketing-directions.js";
import { getDublinDogfoodDirections, listDublinDogfoodStations } from "../lib/cities/dublin/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Flipped live 26 Sep 2026 (Tim's decision, docs/jim-brief-dublin-flip.md); assertCityLive must
// now succeed.
const live = assertCityLive("dublin");
assert(live?.ok === true, "assertCityLive(dublin) must succeed now that dublin is live");

const entry = getCity("dublin");
assert(entry?.status === "live", "dublin registry status must be live");
assert(entry?.adapterReady === true, "dublin adapterReady must be true");
assert(entry?.displayName === "Dublin", "dublin display name must be Dublin");
assert(entry?.timeZone === "Europe/Dublin", "dublin timezone must be Europe/Dublin");
assert(CITIES.filter((city) => city.id === "dublin").length === 1, "dublin must appear once in the registry");
for (const forbiddenId of ["dub", "ie"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

assert(isMultiCity("dublin") === true, "dublin must be in MULTI_CITY_IDS now that status is live");

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
// The D1 pack's own published-network.json still says "planned" — it's a point-in-time
// research artifact, not re-stamped on flip (same as washington-d1/copenhagen-d1's D1 packs).
assert(network.status === "planned", "D1 pack itself is a point-in-time artifact and stays planned");
assert(network.hubLock?.lock === DUBLIN_HUB, `D1 lock must be ${DUBLIN_HUB}`);
assert(network.hubLock?.line === "Red", "D1 hub lock must be on the Red line");
assert(network.lines.length === 2, "D1 must carry exactly 2 lines (Red + Green)");
assert(network.stats?.totalUniqueStops === 67, "D1 must record 67 total unique stops");

const stations = listCatalogStations();
assert(stations.length === 67, `catalog must have 67 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(DUBLIN_HUB), `catalog must lock ${DUBLIN_HUB}`);
assert(byName.get(DUBLIN_HUB)?.hub === true, "hub entry must carry hub:true");

const redStations = stations.filter((s) => s.lines.includes("red"));
const greenStations = stations.filter((s) => s.lines.includes("green"));
assert(redStations.length === 32, `Red must have 32 unique stops, got ${redStations.length}`);
assert(greenStations.length === 35, `Green must have 35 unique stops, got ${greenStations.length}`);

// resolveCatalogEntry — exact-match aliasing.
assert(resolveCatalogEntry(DUBLIN_HUB)?.name === DUBLIN_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Tallaght")?.name === "Tallaght", "must resolve Tallaght");
assert(resolveCatalogEntry("Saggart")?.name === "Saggart", "must resolve Saggart");
assert(resolveCatalogEntry("Broombridge")?.name === "Broombridge", "must resolve Broombridge");
assert(resolveCatalogEntry("Brides Glen")?.name === "Brides Glen", "must resolve Brides Glen");
assert(resolveCatalogEntry("Not A Real Station") === null, "resolveCatalogEntry must reject an unknown station");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(resolveCatalogEntry("Centre") === null, "Centre must never resolve as a station");
assert(isForbiddenCollapseName("City") === true, "City must never resolve as a station on its own");
assert(isForbiddenCollapseName("dub") === true, "invented city token dub must be forbidden");
assert(isForbiddenHubProxy("Marlborough") === true, "Marlborough must never stand in for the Abbey Street hub identity");
assert(isForbiddenHubProxy("O'Connell - GPO") === true, "O'Connell - GPO must never stand in for the Abbey Street hub identity");
assert(isForbiddenHubProxy("Connolly") === true, "Connolly must never stand in for the Abbey Street hub identity (DART interchange, no Green access)");
assert(isForbiddenHubProxy(DUBLIN_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("O'Connell - GPO") !== "", "foldKey must fold punctuation");
assert(canonicalStationName("O'Connell GPO") === "O'Connell - GPO", "canonicalStationName must resolve the O'Connell - GPO alias");

// doNotGroup same-family pairs stay distinct catalog entries.
assert(byName.get("Tallaght") && byName.get("Saggart"), "Tallaght and Saggart must both exist as distinct Red termini");
assert(byName.get("O'Connell - GPO") && byName.get("O'Connell Upper"), "O'Connell - GPO and O'Connell Upper must both exist as distinct Green stops");
assert(byName.get("Red Cow") && byName.get("Kingswood") && byName.get("Belgard"), "Red Cow, Kingswood and Belgard must all exist as distinct consecutive Red stops");
assert(!byName.get("Marlborough")?.lines.includes("red"), "Marlborough must be Green only, never Red");

// Line labels + termini (direction-model-memo.md §3 recommendation A — colour + terminus).
assert(resolveTerminus("Tallaght", "red") === "Tallaght", "resolveTerminus must resolve Tallaght on Red");
assert(resolveTerminus("Saggart", "red") === "Saggart", "resolveTerminus must resolve Saggart on Red");
assert(resolveTerminus("The Point", "red") === "The Point", "resolveTerminus must resolve The Point on Red");
assert(resolveTerminus("Broombridge", "green") === "Broombridge", "resolveTerminus must resolve Broombridge on Green");
assert(resolveTerminus("Brides Glen", "green") === "Brides Glen", "resolveTerminus must resolve Brides Glen on Green");
assert(resolveTerminus("Tallaght", "green") === null, "resolveTerminus must not leak a Red terminus onto Green");
assert(mapLineTerminusDestination("Tallaght", "red") === "Red + Tallaght", "direction chip must be colour + terminus");
assert(mapLineTerminusDestination("Saggart", "red") === "Red + Saggart", "direction chip must be colour + terminus");
assert(mapLineTerminusDestination("Broombridge", "green") === "Green + Broombridge", "direction chip must be colour + terminus");
assert(mapLineTerminusDestination("Brides Glen", "green") === "Green + Brides Glen", "direction chip must be colour + terminus");
// Abbey Street (hub) must NEVER appear as a direction — it isn't in either line's termini list.
// Round 3 (docs/jim-brief-dublin-flip-fixes.md): mapLineTerminusDestination() returns null,
// never a bare colour label, when the destination can't be resolved to a known terminus.
assert(mapLineTerminusDestination(DUBLIN_HUB, "red") === null, "Abbey Street must never appear as a direction token, not even as a bare colour");
assert(mapLineTerminusDestination("City", "green") === null, "City must never appear as a direction token, not even as a bare colour");

// Route colour classification (route_short_name/route_long_name/route_color, UNVERIFIED against
// a live NTA payload — see lib/providers/dublin.js file header).
assert(classifyLuasLineId({ routeShortName: "Red Line" }) === "red", "classifyLuasLineId must classify Red by short name");
assert(classifyLuasLineId({ routeLongName: "Luas Green Line" }) === "green", "classifyLuasLineId must classify Green by long name");
assert(classifyLuasLineId({ routeColor: "E2231A" }) === "red", "classifyLuasLineId must fall back to the Red hex swatch");
assert(classifyLuasLineId({ routeColor: "#39B54A" }) === "green", "classifyLuasLineId must fall back to the Green hex swatch");
assert(classifyLuasLineId({ routeShortName: "46A" }) === null, "classifyLuasLineId must not classify an unrelated bus route");

// Green Line city-centre loop guard (hazard-pack.md H4a) — the sharpest hazard in the D1 pack.
assert(GREEN_LOOP_DIRECTION_ONLY["O'Connell - GPO"] === "northbound", "O'Connell - GPO must be northbound-only");
assert(GREEN_LOOP_DIRECTION_ONLY["O'Connell Upper"] === "northbound", "O'Connell Upper must be northbound-only");
assert(GREEN_LOOP_DIRECTION_ONLY.Marlborough === "southbound", "Marlborough must be southbound-only");
assert(isDirectionAllowedAtStop("O'Connell - GPO", "green", "Broombridge") === true, "O'Connell - GPO must allow a Broombridge-bound (northbound) trip");
assert(isDirectionAllowedAtStop("O'Connell - GPO", "green", "Brides Glen") === false, "O'Connell - GPO must reject a Brides Glen-bound (southbound) trip — no southbound Green tram calls there");
assert(isDirectionAllowedAtStop("O'Connell Upper", "green", "Brides Glen") === false, "O'Connell Upper must reject a southbound trip");
assert(isDirectionAllowedAtStop("Marlborough", "green", "Brides Glen") === true, "Marlborough must allow a southbound trip");
assert(isDirectionAllowedAtStop("Marlborough", "green", "Broombridge") === false, "Marlborough must reject a northbound trip — no northbound Green tram calls there");
assert(isDirectionAllowedAtStop("Trinity", "green", "Broombridge") === true, "Trinity is a loop merge point — both directions valid");
assert(isDirectionAllowedAtStop("Trinity", "green", "Brides Glen") === true, "Trinity is a loop merge point — both directions valid");
assert(isDirectionAllowedAtStop("Parnell", "green", "Broombridge") === true, "Parnell is a loop merge point — both directions valid");
assert(isDirectionAllowedAtStop(DUBLIN_HUB, "red", "Tallaght") === true, "Red trips are never restricted by the Green loop guard");
assert(isDirectionAllowedAtStop("O'Connell - GPO", "green", null) === true, "an unresolved terminus at a direction-exclusive stop must fall open, never drop a real trip on a guess");

// A trip terminating at the station being viewed is an arrival, not a departure.
assert(isTerminatingAtStation("Tallaght", "Tallaght") === true, "isTerminatingAtStation must catch a same-name arrival");
assert(isTerminatingAtStation("Tallaght", "Saggart") === false, "isTerminatingAtStation must not flag a genuinely different destination");

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

// Dogfood station list comes from the catalog, not a fresh GTFS parse.
const dogfoodStations = listDublinDogfoodStations();
assert(dogfoodStations.length === 67, `dogfood stations must be the 67 catalog entries, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(DUBLIN_HUB), "hub must be listed by the dogfood harness");

// Dispatch switch-case wiring — offline paths only (missing key / unknown station), same as
// the direct fetchStationBoard checks above, exercised through live-city-api instead.
let dispatchedMissingKeyThrew = false;
try {
  await getDublinDogfoodDirections("Not A Real Station");
} catch (err) {
  dispatchedMissingKeyThrew = true;
}
assert(dispatchedMissingKeyThrew, "getMultiCityDirections dispatch must not silently succeed for an unknown station");

let apiDispatchThrew = false;
try {
  await getMultiCityDirections("dublin", "Not A Real Station");
} catch {
  apiDispatchThrew = true;
}
assert(apiDispatchThrew, "live-city-api getMultiCityDirections('dublin', ...) must reject an unknown station without any network call");

// --- Fix 1: every catalog station must resolve exact real stop_ids from the published GTFS_LUAS
// snapshot (docs/dublin-d1/luas-stops-from-feed.md, 128 rows / 67 distinct names, captured in CI
// 27 Sep 2026). No fuzzy guessing — resolveCatalogEntry/resolveStopIds must find these via
// catalogEntry.stopIds, baked in from the real feed, not a name-substring match.
for (const entry of stations) {
  assert(
    Array.isArray(entry.stopIds) && entry.stopIds.length > 0,
    `${entry.name} must carry at least one real GTFS stop_id (docs/jim-brief-dublin-flip-fixes.md fix 1)`
  );
  for (const stopId of entry.stopIds) {
    assert(/^82[235]0GA\d{5}$/.test(stopId), `${entry.name} stop_id "${stopId}" must look like a real Luas GTFS stop_id`);
  }
}
// The 7 names the write-city-directions run (36281571181) reported as "Unknown Dublin station"
// must now resolve by their catalogued name (resolveCatalogEntry uses entry.name/aliases/stopIds).
for (const name of [
  "Abbey Street",
  "Broadstone - University",
  "Citywest Campus",
  "Leopardstown Valley",
  "Ballyogan Wood",
  "Mayor Square - NCI",
  "O'Connell Upper",
]) {
  const resolved = resolveCatalogEntry(name);
  assert(resolved?.stopIds?.length > 0, `${name} must resolve to real stop_ids (was "Unknown Dublin station" in run 36281571181)`);
}
// The feed's own spelling must also resolve, via the alias recorded alongside stopIds.
assert(resolveCatalogEntry("Abbey St.")?.name === "Abbey Street", "feed spelling 'Abbey St.' must resolve to the Abbey Street hub");
assert(resolveCatalogEntry("Broadstone")?.name === "Broadstone - University", "feed spelling 'Broadstone' must resolve");
assert(resolveCatalogEntry("Citywest")?.name === "Citywest Campus", "feed spelling 'Citywest' must resolve");
assert(resolveCatalogEntry("Leopardstown")?.name === "Leopardstown Valley", "feed spelling 'Leopardstown' must resolve");
assert(resolveCatalogEntry("Ballyogan")?.name === "Ballyogan Wood", "feed spelling 'Ballyogan' must resolve");
assert(resolveCatalogEntry("Mayor Square")?.name === "Mayor Square - NCI", "feed spelling 'Mayor Square' must resolve");
assert(resolveCatalogEntry("O'Connell Upr.")?.name === "O'Connell Upper", "feed spelling 'O'Connell Upr.' must resolve");

// --- Fix 2: direction chips must come from the static timetable, not only the live board, so
// `write-city-directions` never reports "0/67 stations with chips" overnight or during a live
// outage (run 36281571181). Build a small offline fixture — one synthetic trip per station, per
// line it belongs to — directly from the real stop_ids/names above (no network, no blob fetch).
function makeFixtureStaticData(catalogStations) {
  const stopTimesByStopId = new Map();
  const tripsById = new Map();
  const routesById = new Map();
  routesById.set("route-red", { route_id: "route-red", route_short_name: "Red" });
  routesById.set("route-green", { route_id: "route-green", route_short_name: "Green" });

  let tripSeq = 0;
  for (const entry of catalogStations) {
    for (const lineId of entry.lines) {
      const termini = LINE_TERMINI[lineId] ?? [];
      // Pick a terminus this station can genuinely see: not itself, and honouring the Green
      // city-centre loop's direction-exclusivity guard for the three restricted stops.
      const required = GREEN_LOOP_DIRECTION_ONLY[entry.name];
      let terminus = null;
      if (required === "northbound") {
        terminus = "Broombridge";
      } else if (required === "southbound") {
        terminus = "Brides Glen";
      } else {
        terminus = termini.find((t) => t !== entry.name) ?? termini[0];
      }
      if (!terminus) {
        continue;
      }
      const tripId = `fixture-trip-${tripSeq++}`;
      tripsById.set(tripId, { trip_id: tripId, route_id: `route-${lineId}`, trip_headsign: terminus });
      for (const stopId of entry.stopIds) {
        const list = stopTimesByStopId.get(stopId) ?? [];
        list.push({ trip_id: tripId, stop_id: stopId });
        stopTimesByStopId.set(stopId, list);
      }
    }
  }
  return { stopTimesByStopId, tripsById, routesById };
}

const fixtureStatic = makeFixtureStaticData(stations);
let stationsWithChips = 0;
for (const entry of stations) {
  const chips = directionsFromStatic({ stopIds: entry.stopIds, staticData: fixtureStatic, stationName: entry.name });
  assert(
    chips.length >= 1,
    `${entry.name} must get at least one direction chip from the static snapshot fixture (docs/jim-brief-dublin-flip-fixes.md fix 2)`
  );
  if (GREEN_LOOP_DIRECTION_ONLY[entry.name] === "northbound") {
    assert(chips.includes("Green + Broombridge"), `${entry.name} must chip Green + Broombridge (northbound-only)`);
  }
  if (GREEN_LOOP_DIRECTION_ONLY[entry.name] === "southbound") {
    assert(chips.includes("Green + Brides Glen"), `${entry.name} must chip Green + Brides Glen (southbound-only)`);
  }
  stationsWithChips += 1;
}
assert(stationsWithChips === 67, `all 67 catalog stations must resolve at least one static-derived chip, got ${stationsWithChips}`);
// Abbey Street (hub) must never show a Green chip even in this fixture.
const abbeyChips = directionsFromStatic({ stopIds: byName.get(DUBLIN_HUB).stopIds, staticData: fixtureStatic, stationName: DUBLIN_HUB });
assert(abbeyChips.every((c) => c.startsWith("Red")), "Abbey Street must never show a Green chip, even from the static fixture");

// --- Round 3 (27 Sep 2026, docs/jim-brief-dublin-flip-fixes.md): every station in the real
// generated public/city-directions/dublin.json (commit c494b73) also got a bare "Red"/"Green"
// chip alongside its proper colour+terminus chips — short-workings, blank headsigns, and trips
// whose headsign fell back to a non-terminus route_long_name string all fell through
// mapLineTerminusDestination()'s old bare-colour fallback. Build a fixture with both well-formed
// trips (a full termini set per trunk station, so the "Belgard/trunk has both branches" assertion
// means something) and deliberately unresolvable ones, and prove the fixed code never surfaces a
// bare chip while still logging every dropped trip so the cause stays visible.

// Common Red trunk, Belgard -> The Point (docs/dublin-d1/direction-model-memo.md "Red Line branch
// handling"): every tram on this stretch is labelled by its own far terminus, so a trunk station
// must be able to show both Tallaght- and Saggart-bound chips, plus The Point.
const RED_TRUNK_EAST_OF_BELGARD = [
  "Belgard", "Kingswood", "Red Cow", "Kylemore", "Bluebell", "Blackhorse", "Drimnagh",
  "Goldenbridge", "Suir Road", "Rialto", "Fatima", "James's", "Heuston", "Museum", "Smithfield",
  "Four Courts", "Jervis", "Abbey Street", "Busáras", "Connolly", "George's Dock",
  "Mayor Square - NCI", "Spencer Dock", "The Point",
];

function makeRoundThreeFixture() {
  const stopTimesByStopId = new Map();
  const tripsById = new Map();
  const routesById = new Map();
  const stopsById = new Map();
  routesById.set("route-red", { route_id: "route-red", route_short_name: "Red" });
  let tripSeq = 0;
  let seq = 0;

  function addTrip({ stationName, headsign, lastStopName }) {
    const entry = byName.get(stationName);
    const tripId = `r3-trip-${tripSeq++}`;
    tripsById.set(tripId, { trip_id: tripId, route_id: "route-red", trip_headsign: headsign ?? "" });
    for (const stopId of entry.stopIds) {
      seq += 1;
      const list = stopTimesByStopId.get(stopId) ?? [];
      list.push({ trip_id: tripId, stop_id: stopId, stop_sequence: String(seq) });
      stopTimesByStopId.set(stopId, list);
      stopsById.set(stopId, { stop_id: stopId, stop_name: entry.feedName ?? entry.name });
    }
    // The trip's real last stop, for the lastStop fallback in resolveTripTerminus() — a station
    // not otherwise on this trip's stop_times, so the fallback has to look it up by name.
    if (lastStopName) {
      const lastEntry = byName.get(lastStopName);
      seq += 1;
      for (const stopId of lastEntry.stopIds) {
        const list = stopTimesByStopId.get(stopId) ?? [];
        list.push({ trip_id: tripId, stop_id: stopId, stop_sequence: String(seq) });
        stopTimesByStopId.set(stopId, list);
        stopsById.set(stopId, { stop_id: stopId, stop_name: lastEntry.feedName ?? lastEntry.name });
      }
    }
  }

  // Well-formed: every trunk station sees all three Red termini.
  for (const stationName of RED_TRUNK_EAST_OF_BELGARD) {
    addTrip({ stationName, headsign: "Tallaght" });
    addTrip({ stationName, headsign: "Saggart" });
    addTrip({ stationName, headsign: "The Point" });
  }
  // Tallaght (branch terminus) only ever sees the far end, The Point.
  addTrip({ stationName: "Tallaght", headsign: "The Point" });

  // Genuinely unresolvable short-working: blank headsign, real last stop is an ordinary
  // non-terminus stop (Red Cow) — must be dropped, never a bare "Red" chip.
  addTrip({ stationName: "Belgard", headsign: "", lastStopName: "Red Cow" });

  // Recoverable short-working: blank headsign, but the trip's real last stop IS a known
  // terminus (Tallaght) — resolveTripTerminus() must recover "Tallaght" from the last stop.
  addTrip({ stationName: "Belgard", headsign: "", lastStopName: "Tallaght" });

  return { stopTimesByStopId, tripsById, routesById, stopsById };
}

const round3Static = makeRoundThreeFixture();
const unresolved = [];
const allRound3Chips = [];
for (const stationName of [...RED_TRUNK_EAST_OF_BELGARD, "Tallaght"]) {
  const entry = byName.get(stationName);
  const chips = directionsFromStatic({
    stopIds: entry.stopIds,
    staticData: round3Static,
    stationName,
    onUnresolved: (info) => unresolved.push({ stationName, ...info }),
  });
  allRound3Chips.push(...chips);
  assert(
    !chips.includes("Red") && !chips.includes("Green"),
    `${stationName} must never show a bare "Red"/"Green" chip (direction-model-memo.md §1 line 7), got ${JSON.stringify(chips)}`
  );
}
assert(
  !allRound3Chips.some((chip) => chip === "Red" || chip === "Green"),
  "no Dublin chip anywhere may be exactly \"Red\" or \"Green\""
);

for (const stationName of RED_TRUNK_EAST_OF_BELGARD) {
  const entry = byName.get(stationName);
  const chips = directionsFromStatic({ stopIds: entry.stopIds, staticData: round3Static, stationName });
  assert(chips.includes("Red + Tallaght"), `${stationName} (trunk) must chip Red + Tallaght`);
  assert(chips.includes("Red + Saggart"), `${stationName} (trunk) must chip Red + Saggart`);
}

const tallaghtChips = directionsFromStatic({
  stopIds: byName.get("Tallaght").stopIds,
  staticData: round3Static,
  stationName: "Tallaght",
});
assert(
  tallaghtChips.length === 1 && tallaghtChips[0] === "Red + The Point",
  `Tallaght must show only Red + The Point, got ${JSON.stringify(tallaghtChips)}`
);

// The Red Cow short-working must have been dropped with a logged reason (cause stays visible),
// and the blank-headsign/last-stop-Tallaght trip must have resolved via the last-stop fallback
// rather than logging as unresolved.
assert(
  unresolved.some((u) => u.stationName === "Belgard" && u.lastStopName === "Red Cow"),
  "the Red Cow short-working must be logged as unresolved, not silently dropped"
);
assert(
  resolveTripTerminus(
    { headsign: "", lineId: "red", tripId: "r3-trip-lookup", staticData: round3Static },
    {}
  ) === null,
  "resolveTripTerminus must return null (never a guess) when neither headsign nor last stop resolves"
);
const belgardChips = directionsFromStatic({ stopIds: byName.get("Belgard").stopIds, staticData: round3Static, stationName: "Belgard" });
assert(belgardChips.includes("Red + Tallaght"), "Belgard must still recover Red + Tallaght from the last-stop fallback trip");

console.log(
  "dublin-dogfood-gate: ok (live, adapterReady, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 67 stations (Red 32 / Green 35), hub Abbey Street, doNotGroup pairs enforced, colour+terminus direction model, Abbey Street/City never a direction token, Green city-centre loop direction-exclusivity guard (O'Connell - GPO/O'Connell Upper northbound-only, Marlborough southbound-only), missing-key and unknown-station both throw without network, all 67 catalog stations resolve real GTFS stop_ids and get >=1 static-derived direction chip, Round 3: no bare Red/Green chip anywhere, trunk stations show both Tallaght/Saggart branches, Tallaght shows only The Point, short-workings recovered via last-stop fallback or dropped with a logged reason, Perth Australia green)"
);
