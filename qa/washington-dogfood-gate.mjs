/**
 * Washington flip follow-through gate. Washington stays `status: "planned"` (Mark/Tim's flip
 * call — WMATA_API_KEY is not registered yet) but the dogfood module, live-city-api.js dispatch
 * switch-cases, and this gate are wired ahead of that per the flip-follow-through guardrail
 * (Boston/Chicago shape) so no second pass is needed once the key lands.
 *
 * Deliberately does NOT call any live WMATA endpoint (api.wmata.com/Rail.svc/json/jStations or
 * StationPrediction.svc) — no key exists this session and this is a smoke-tier gate, not a
 * network test. Instead this gate unit-tests the catalog/allow-list/direction-model logic
 * (resolveCatalogEntry, mapWmataTrainToTrip, tripsFromTrainsList, mapLineTerminusDestination,
 * resolveTerminus, resolveStationCodesForCatalogEntry) against synthetic payloads shaped like
 * WMATA's documented jStations/GetPrediction JSON, plus asserts that fetchStationBoard throws
 * for an unknown station and for a missing WMATA_API_KEY, all without any network call.
 *
 * Usage: node qa/washington-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  WASHINGTON_HUB,
  WASHINGTON_TIME_ZONE,
  WMATA_API_BASE,
  WMATA_STATIONS_URL,
  WMATA_PREDICTION_URL,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  buildPredictionUrl,
  parseWmataMinutes,
  mapWmataTrainToTrip,
  tripsFromTrainsList,
  resolveStationCodesForCatalogEntry,
  fetchStationBoard,
  WashingtonStationCodeUnconfirmedError,
  MissingWmataApiKeyError,
} from "../lib/providers/washington.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  resolveTerminus,
  mapLineTerminusDestination,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "../lib/cities/washington/marketing-directions.js";
import {
  listWashingtonDogfoodStations,
  getWashingtonDogfoodDirections,
  getWashingtonDogfoodNextTrain,
} from "../lib/cities/washington/dogfood-next-train.js";
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

// Registry identity + status — Washington stays planned; only the flip changes this.
const live = assertCityLive("washington");
assert(live?.ok === false, "assertCityLive(washington) must fail");
assert(live?.status === 501, "washington must be 501 planned");

const entry = getCity("washington");
assert(entry?.status === "planned", "washington registry status must be planned");
assert(entry?.adapterReady === true, "washington adapterReady must be true");
assert(entry?.displayName === "Washington, D.C.", "washington display name must be Washington, D.C.");
assert(entry?.timeZone === "America/New_York", "washington timezone must be America/New_York");
assert(CITIES.filter((city) => city.id === "washington").length === 1, "washington must appear once in the registry");
for (const forbiddenId of ["dc", "washington-dc", "wmata", "us"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired ahead of the flip — NOT in MULTI_CITY_IDS yet.
assert(isMultiCity("washington") === false, "washington must NOT be in MULTI_CITY_IDS while status stays planned");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/washington-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/washington-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "washington", "D1 city id must be washington");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === WASHINGTON_HUB, `D1 lock must be ${WASHINGTON_HUB}`);
assert(network.lines.length === 6, "D1 must carry exactly 6 passenger lines");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist with a
// recorded verdict (MARC/VRE ruled `in` but not wired; Amtrak reserved services `out-reservation`).
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const service of ["MARC", "VRE", "Amtrak"]) {
  assert(oracleReport.includes(service), `Board eligibility section must record a verdict for ${service}`);
}
assert(/come from feeds other than WMATA/i.test(oracleReport), "Board eligibility section must record that MARC/VRE come from feeds other than WMATA's API");

const jimHandoff = readFileSync(join(d1Dir, "jim-handoff.md"), "utf8");
assert(/MARC/.test(jimHandoff) && /VRE/.test(jimHandoff) && /not (yet )?(wired|implemented)/i.test(jimHandoff), "jim-handoff.md must record that MARC/VRE are not yet wired, holding the flip");

const stations = listCatalogStations();
assert(stations.length === 98, `catalog must have 98 stations, got ${stations.length}`);
const hubEntries = stations.filter((s) => s.name === WASHINGTON_HUB);
assert(hubEntries.length === 1 && hubEntries[0].hub === true, `catalog must lock ${WASHINGTON_HUB} exactly once with hub:true`);

// Coordinates (docs/jim-brief-us-flip-readiness.md) — every station geocoded from DC GIS's
// public "Metro Stations Regional" ArcGIS FeatureServer layer (WMATA-sourced open data, no key
// required) by name/alias match, and inside Washington's own CITY_BOUNDS box
// (public/city-session.js). Every one of the 98 D1 stations matched — none exempted.
const washingtonBoxes = cityBoundsFor("washington");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(
    inAnyBounds(station.lat, station.lng, washingtonBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Washington's CITY_BOUNDS box`
  );
}

// resolveCatalogEntry — exact-match + documented aliases, forbidden tokens reject, no
// ambiguous-name families exist on this map (hazard-pack.md H5).
assert(resolveCatalogEntry(WASHINGTON_HUB)?.name === WASHINGTON_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Gallery Pl-Chinatown")?.name === "Gallery Place-Chinatown", "the board rename alias must resolve to the D1-locked printed name");
assert(resolveCatalogEntry("Downtown") === null, "Downtown must never resolve as a station");
assert(resolveCatalogEntry("Gallery Place") === null, "the incomplete printed form Gallery Place (without -Chinatown) must never resolve");
assert(resolveCatalogEntry("dc") === null, "resolveCatalogEntry must reject the invented city token dc");
assert(resolveCatalogEntry("wmata") === null, "resolveCatalogEntry must reject the invented city token wmata");
assert(isForbiddenHubProxy("Gallery Place-Chinatown") === true, "Gallery Place-Chinatown must never stand in for the Metro Center hub identity");
assert(isForbiddenHubProxy("Union Station") === true, "Union Station must never stand in for the Metro Center hub identity");
assert(isForbiddenHubProxy(WASHINGTON_HUB) === false, "the hub itself is not its own proxy violation");
// Union Station and Gallery Place-Chinatown are real, separately-catalogued Metrorail stations
// — they must resolve normally to themselves. They are only forbidden as HUB PROXIES
// (isForbiddenHubProxy above), never as stations in their own right.
assert(resolveCatalogEntry("Union Station")?.lines.join(",") === "red", "Union Station is a real Red line station and must resolve to itself");
assert(isForbiddenCollapseName("Union Station") === false, "Union Station is a real station, not a never-resolve token");

// Farragut North vs Farragut West must stay two distinct stations, never merged.
assert(resolveCatalogEntry("Farragut North")?.lines.join(",") === "red", "Farragut North must be Red only");
assert(resolveCatalogEntry("Farragut West")?.lines.sort().join(",") === "blue,orange,silver", "Farragut West must be Orange/Blue/Silver only");
assert(resolveCatalogEntry("Farragut North")?.name !== resolveCatalogEntry("Farragut West")?.name, "Farragut North and Farragut West must never collapse into one entry");

// Metro Center is one merged multi-line catalog entry, never split into two.
assert(resolveCatalogEntry(WASHINGTON_HUB)?.lines.sort().join(",") === "blue,orange,red,silver", "Metro Center must carry all four crossing lines as one entry");

// Line labels + termini (direction-model-memo.md §3 recommendation A — "{Color} Line + terminus").
assert(LINE_LABELS.red === "Red" && LINE_LABELS.silver === "Silver", "line labels must be bare color words");
assert(LINE_TERMINI.red.includes("Shady Grove") && LINE_TERMINI.red.includes("Glenmont"), "Red termini must be Shady Grove/Glenmont");
assert(LINE_TERMINI.silver.includes("Ashburn") && LINE_TERMINI.silver.includes("Downtown Largo") && LINE_TERMINI.silver.includes("New Carrollton"), "Silver must have three termini: Ashburn, Downtown Largo, New Carrollton");
assert(LINE_TERMINI.yellow.includes("Huntington") && LINE_TERMINI.yellow.includes("Greenbelt"), "Yellow termini must include Huntington and Greenbelt");
assert(mapLineTerminusDestination(WASHINGTON_HUB, "red") === "Red Line", "Metro Center must never appear as a direction token — falls back to the bare line label");
assert(mapLineTerminusDestination("Downtown", "orange") === "Orange Line", "Downtown must never appear as a direction token");
assert(mapLineTerminusDestination("Glenmont", "red") === "Red Line + Glenmont", "direction chip must be Line + terminus");
assert(mapLineTerminusDestination("Ashburn", "silver") === "Silver Line + Ashburn", "Silver direction chip must be Line + terminus");
assert(resolveTerminus("Some Unknown Destination", "red") === null, "resolveTerminus must not fabricate an unknown terminus");
assert(foldKey("Grosvenor - Strathmore") !== "", "foldKey must fold case/punctuation");

// marketingLabelsForStation excludes a self-referential terminus chip.
const glenmontLabels = marketingLabelsForStation("Glenmont");
assert(glenmontLabels.includes("Red Line + Shady Grove"), "Glenmont must offer Red Line + Shady Grove");
assert(!glenmontLabels.some((l) => l.endsWith("+ Glenmont")), "Glenmont must never offer a self-referential + Glenmont chip");
assert(tripMatchesMarketingChip({ destination: "Red Line + Glenmont" }, "Red Line + Glenmont") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "Red Line + Glenmont" }, "Red Line + Shady Grove") === false, "tripMatchesMarketingChip must reject a mismatched chip");

// WMATA endpoint shape + prediction URL building (documented JSON shape), no network.
assert(WMATA_STATIONS_URL === `${WMATA_API_BASE}/Rail.svc/json/jStations`, "jStations URL must point at WMATA's Rail Station Information endpoint");
assert(WMATA_PREDICTION_URL === `${WMATA_API_BASE}/StationPrediction.svc/json/GetPrediction`, "prediction URL must point at WMATA's Station Prediction endpoint");
const predictionUrl = buildPredictionUrl(["A01", "C01"]);
assert(predictionUrl === `${WMATA_PREDICTION_URL}/A01%2CC01`, "buildPredictionUrl must comma-join multiple StationCodes into one path segment");

// Min field parsing — ARR/BRD are imminent (0 min); ---/empty/non-numeric are unreliable (null).
assert(parseWmataMinutes("ARR") === 0, "ARR must parse as 0 minutes");
assert(parseWmataMinutes("BRD") === 0, "BRD must parse as 0 minutes");
assert(parseWmataMinutes("7") === 7, "a numeric Min must parse as that many minutes");
assert(parseWmataMinutes("---") === null, "--- must parse as no reliable prediction");
assert(parseWmataMinutes("") === null, "an empty Min must parse as no reliable prediction");
assert(parseWmataMinutes(undefined) === null, "a missing Min must parse as no reliable prediction");

const referenceNow = new Date("2026-09-20T12:00:00-04:00");

const liveTrain = { Car: "8", Destination: "Glenmont", DestinationName: "Glenmont", Line: "RD", LocationCode: "A01", Min: "5", Group: "1" };
const liveTrip = mapWmataTrainToTrip(liveTrain, referenceNow);
assert(liveTrip.lineId === "red", "mapWmataTrainToTrip must classify by Line code");
assert(liveTrip.destination === "Red Line + Glenmont", "mapWmataTrainToTrip must map the destination via the direction model");
assert(typeof liveTrip.displayTime === "string" && liveTrip.displayTime !== "", "mapWmataTrainToTrip must set a string displayTime");
assert(liveTrip.cancelled === false, "WMATA's feed never reports a cancellation flag — cancelled must always be false");
assert(liveTrip.delayed === false, "WMATA's feed has no documented delay indicator — delayed must always be false");

const arrTrain = { ...liveTrain, Min: "ARR" };
const arrTrip = mapWmataTrainToTrip(arrTrain, referenceNow);
assert(arrTrip !== null && new Date(arrTrip.liveDeparture).getTime() === referenceNow.getTime(), "ARR must be treated as an imminent (0-minute) departure and kept");

const brdTrain = { ...liveTrain, Min: "BRD" };
assert(mapWmataTrainToTrip(brdTrain, referenceNow) !== null, "BRD must be treated as an imminent departure and kept");

const noReliableTrain = { ...liveTrain, Min: "---" };
assert(mapWmataTrainToTrip(noReliableTrain, referenceNow) === null, "--- (no reliable prediction) rows must be dropped — never presented as live");

const emptyMinTrain = { ...liveTrain, Min: "" };
assert(mapWmataTrainToTrip(emptyMinTrain, referenceNow) === null, "an empty Min must be dropped — never presented as live");

const noPassengerTrain = { ...liveTrain, Line: "No", DestinationName: "No Passenger" };
assert(mapWmataTrainToTrip(noPassengerTrain, referenceNow) === null, "Line=No (no-passenger train) rows must be dropped — must never appear on a rider-facing board");

const unknownLineTrain = { ...liveTrain, Line: "--" };
assert(mapWmataTrainToTrip(unknownLineTrain, referenceNow) === null, "Line=-- (unknown route) rows must be dropped");

const bogusLineTrain = { ...liveTrain, Line: "ZZ" };
assert(mapWmataTrainToTrip(bogusLineTrain, referenceNow) === null, "an unrecognized Line code must not be classified into any line");

const syntheticTrains = [
  { Destination: "Glenmont", DestinationName: "Glenmont", Line: "RD", Min: "3" },
  { Destination: "Shady Grove", DestinationName: "Shady Grove", Line: "RD", Min: "9" },
  { Destination: "No Passenger", DestinationName: "No Passenger", Line: "No", Min: "2" },
  { Destination: "Franconia-Springfield", DestinationName: "Franconia-Springfield", Line: "BL", Min: "---" },
];
const trips = tripsFromTrainsList(syntheticTrains, referenceNow);
assert(trips.length === 2, `tripsFromTrainsList must drop the no-passenger and unreliable-Min rows, got ${trips.length}`);
assert(trips.every((t) => t.lineId === "red"), "every remaining synthetic trip must be Red");

// resolveStationCodesForCatalogEntry — synthetic jStations payload shaped like WMATA's
// documented Rail Station Information JSON, no network. Confirms Metro Center's two platform
// codes (A01+C01) are discovered via StationTogether1/2 linkage, and Farragut North/West stay
// single-code and distinct.
const syntheticStationsMetadata = [
  { Code: "A01", Name: "Metro Center", StationTogether1: "C01", StationTogether2: "" },
  { Code: "C01", Name: "Metro Center", StationTogether1: "A01", StationTogether2: "" },
  { Code: "A02", Name: "Farragut North", StationTogether1: "", StationTogether2: "" },
  { Code: "C03", Name: "Farragut West", StationTogether1: "", StationTogether2: "" },
];
const metroCenterEntry = resolveCatalogEntry(WASHINGTON_HUB);
const metroCenterCodes = resolveStationCodesForCatalogEntry(syntheticStationsMetadata, metroCenterEntry).sort();
assert(JSON.stringify(metroCenterCodes) === JSON.stringify(["A01", "C01"]), `Metro Center must resolve to both A01 and C01, got ${JSON.stringify(metroCenterCodes)}`);

const farragutNorthCodes = resolveStationCodesForCatalogEntry(syntheticStationsMetadata, resolveCatalogEntry("Farragut North"));
assert(JSON.stringify(farragutNorthCodes) === JSON.stringify(["A02"]), "Farragut North must resolve to exactly A02, never merged with Farragut West");

let unconfirmedThrew = false;
try {
  resolveStationCodesForCatalogEntry(syntheticStationsMetadata, resolveCatalogEntry("Glenmont"));
} catch (err) {
  unconfirmedThrew = err instanceof WashingtonStationCodeUnconfirmedError;
}
assert(unconfirmedThrew, "resolveStationCodesForCatalogEntry must throw WashingtonStationCodeUnconfirmedError rather than guess when jStations has no matching row");

// fetchStationBoard — no network for either of these two failure paths.
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

let missingKeyThrew = false;
try {
  await fetchStationBoard(WASHINGTON_HUB, { apiKey: "" });
} catch (err) {
  missingKeyThrew = err instanceof MissingWmataApiKeyError;
}
assert(missingKeyThrew, "fetchStationBoard must throw MissingWmataApiKeyError when no key is configured — no silent timetable fallback");

// Note: fetchStationBoard's `codes`/`stationsData` options only skip the jStations-join step —
// the GetPrediction HTTP call itself is never mocked, so this gate deliberately stops testing
// fetchStationBoard once past catalog/key resolution (the missing-key throw above happens
// before any fetch) rather than making a real network call.

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listWashingtonDogfoodStations();
assert(dogfoodStations.length === 98, `dogfood stations must be the 98 D1 names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === WASHINGTON_HUB), "hub must be listed by the dogfood harness");

const hubPack = getWashingtonDogfoodDirections(WASHINGTON_HUB);
assert(hubPack.source === "washington-marketing-ends", "directions source must be washington-marketing-ends");
assert(JSON.stringify(hubPack.directions.sort()) === JSON.stringify(marketingLabelsForStation(WASHINGTON_HUB).sort()), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness, even
// though washington is deliberately not in MULTI_CITY_IDS yet.
const dispatchedDirections = await getMultiCityDirections("washington", "Glenmont");
assert(
  JSON.stringify(dispatchedDirections.directions.sort()) === JSON.stringify(glenmontLabels.sort()),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "washington-marketing-ends", "live-city-api dispatch source must be washington-marketing-ends");

// The dispatched next-train call must still surface MissingWmataApiKeyError (no key registered
// this session) rather than silently degrading to a fake board.
let dispatchedThrew = false;
try {
  await getMultiCityNextTrain("washington", {
    station: "Glenmont",
    destination: "Red Line + Shady Grove",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dispatchedThrew = err instanceof MissingWmataApiKeyError;
}
assert(dispatchedThrew, "dispatched next-train must surface MissingWmataApiKeyError, not a silent fallback board");

let dogfoodThrew = false;
try {
  await getWashingtonDogfoodNextTrain({
    station: "Glenmont",
    destination: "Red Line + Shady Grove",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dogfoodThrew = err instanceof MissingWmataApiKeyError;
}
assert(dogfoodThrew, "dogfood next-train must surface MissingWmataApiKeyError, not a silent fallback board");

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available) are deliberately NOT touched yet — same
// registry-status-derived invariant as MULTI_CITY_IDS above (qa/live-city-lists-sync.mjs
// requires them to equal exactly the live-city set). Add "washington"/"united states" to all
// four in the same commit as the status flip.

console.log(
  "washington-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, MULTI_CITY_IDS/mount/persistence lists deliberately deferred to the status-flip commit, D1 pack, Board eligibility section recorded MARC/VRE in-but-not-wired, 98 stations, hub Metro Center merged as one multi-line entry via StationTogether1/2, Farragut North/West stay distinct, Line + terminus direction model, Metro Center and Downtown never a direction token, WMATA payload shaping, ARR/BRD kept as imminent and ---/empty dropped, Line=No/-- dropped, jStations code join disambiguates hub codes with no network, missing-key throws before any fetch, Perth Australia green)"
);
