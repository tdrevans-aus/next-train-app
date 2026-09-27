/**
 * Dublin flip follow-through gate. Dublin stays `status: "planned"` (Mark/Tim's flip
 * call — docs/dublin-d1/mark-qa-note.md, docs/dublin-d1/jim-handoff.md) but the dogfood
 * module, live-city-api.js dispatch switch-cases, and this gate are wired ahead of that per
 * the flip-follow-through guardrail (Boston PR #414 / Chicago qa/chicago-dogfood-gate.mjs
 * shape) so no second pass is needed once the flip PR lands.
 *
 * Deliberately does NOT call the live NTA GTFS-RT v2 endpoint (api.nationaltransport.ie) or
 * fetch the published GTFS static snapshot — this is a smoke-tier gate, not a network test
 * (qa/dublin-rt-join-check.mjs and qa/verify-dublin-gtfs-snapshot.mjs cover that). Instead
 * this gate unit-tests the catalog/direction-model logic (the same assertions the retired
 * qa/dublin-planned-gate.mjs carried) plus the dispatch wiring: MULTI_CITY_IDS membership,
 * getMultiCityDirections/getMultiCityNextTrain routing into the dogfood module, and the
 * coordinate/CITY_BOUNDS/coverage-note surfaces this follow-through pass adds.
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

// Registry identity + status — Dublin stays planned; only the flip changes this.
const live = assertCityLive("dublin");
assert(live?.ok === false, "assertCityLive(dublin) must fail");
assert(live?.status === 501, "dublin must be 501 planned");

const entry = getCity("dublin");
assert(entry?.status === "planned", "dublin registry status must be planned");
assert(entry?.adapterReady === true, "dublin adapterReady must be true");
assert(entry?.displayName === "Dublin", "dublin display name must be Dublin");
assert(entry?.timeZone === "Europe/Dublin", "dublin timezone must be Europe/Dublin");
assert(CITIES.filter((city) => city.id === "dublin").length === 1, "dublin must appear once in the registry");
for (const forbiddenId of ["dub", "ie"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired ahead of the flip — NOT in MULTI_CITY_IDS yet.
assert(isMultiCity("dublin") === false, "dublin must NOT be in MULTI_CITY_IDS while status stays planned");

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
// 66, not the D1 pack's 67 — Connolly is filtered out of the catalog (docs/jim-brief-
// dublin-connolly-realtime-gap.md): the live NTA GTFS-RT v2 feed never carries a
// stopTimeUpdate for either of Connolly's two stop_ids, confirmed against multiple live
// polls during Dublin Sunday daytime service, 27 Sep 2026 (docs/dublin-d1/jim-handoff.md
// appended entry). Per docs/board-eligibility-rule.md, filter the station rather than ship a
// silently empty board.
assert(stations.length === 66, `catalog must have 66 stations (Connolly filtered, see coverage.json), got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(DUBLIN_HUB), `catalog must lock ${DUBLIN_HUB}`);
assert(byName.get(DUBLIN_HUB)?.hub === true, "hub entry must carry hub:true");
assert(!byName.has("Connolly"), "Connolly must NOT be in the catalog — no real-time coverage in the NTA feed");

const redStations = stations.filter((s) => s.lines.includes("red"));
const greenStations = stations.filter((s) => s.lines.includes("green"));
assert(redStations.length === 31, `Red must have 31 unique stops with Connolly filtered, got ${redStations.length}`);
assert(greenStations.length === 35, `Green must have 35 unique stops, got ${greenStations.length}`);

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
assert(isForbiddenHubProxy("Connolly") === true, "Connolly must never stand in for the Abbey Street hub identity (DART interchange, no Green access) — still enforced even though Connolly is no longer a catalog station");
assert(resolveCatalogEntry("Connolly") === null, "Connolly must not resolve as a catalog station — filtered for lack of NTA real-time coverage");
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
assert(dogfoodStations.length === 66, `dogfood stations must be the 66 catalog names (Connolly filtered), got ${dogfoodStations.length}`);
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

// Picker/country-regions surfaces: NOT added ahead of the flip — a planned city gets
// no picker entry at all, live or "Coming Soon" (Tim, 27 Sep 2026: "It's either in or
// out."; docs/jim-brief-no-coming-soon-picker.md, superseding the earlier "comingSoon
// flip-readiness scaffolding" precedent this gate used to assert). Persistence +
// dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available, live-city-api MULTI_CITY_IDS) are also
// deliberately NOT touched yet — same registry-status-derived invariant
// (qa/live-city-lists-sync.mjs requires them to equal exactly the live-city set). Add
// "dublin"/"ie" to the picker, country-regions.js, and all four lists in the same
// commit as the status flip.
const countryRegions = readFileSync(join(ROOT, "lib/cities/country-regions.js"), "utf8");
assert(!/dublin:\s*"ie"/.test(countryRegions), "country-regions.js must not map dublin to ie until the flip commit");

// The picker is now built server-side from the /api/cities manifest
// (docs/jim-brief-registry-driven-client.md) — a "planned" registry status keeps a city out
// of it automatically, with nothing left in public/city-session.js to assert against.
const manifestCityIds = buildCityManifest().cities.map((c) => c.id);
assert(!manifestCityIds.includes("dublin"), "the /api/cities manifest must not list Dublin until the flip commit (registry status must stay \"planned\")");
// The bounds box stays ahead of the flip, same as Hong Kong's — it only satisfies
// qa/live-city-lists-sync.mjs's per-live-city check once Dublin is live, and is
// otherwise inert while the city isn't in the manifest at all.
assert(Boolean(CITY_BOUNDS.dublin), "lib/cities/city-bounds.js must carry a dublin box");

console.log(
  "dublin-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, MULTI_CITY_IDS/mount/persistence/picker/country-regions lists deliberately deferred to the status-flip commit, D1 pack, Board eligibility section recorded (DART/buses/Connolly out), 66 stations (Connolly filtered — no NTA real-time coverage) with real lat/lng inside CITY_BOUNDS, hub Abbey Street, doNotGroup pairs enforced, colour+terminus direction model, Green city-centre loop direction-exclusivity guard, missing-key throws surfaced consistently across dogfood/dispatch/directions/next-train, coverage.json records Luas in / DART + Connolly out, Perth Australia green)"
);
