/**
 * Washington flip follow-through gate. Rewritten 25 Sep 2026 (docs/jim-brief-washington-live-gate.md)
 * to assert LIVE state — Washington flipped `status: "live"` per Mark's fully-green QA pass
 * (docs/washington-d1/mark-qa-note.md). Mirrors qa/boston-dogfood-gate.mjs's post-flip shape,
 * which hit the identical pre-flip-assertions-vs-flip problem before Boston's own flip. The old
 * pre-flip assertions (assertCityLive must fail, status === "planned", isMultiCity() === false,
 * dispatched calls must surface MissingWmataApiKeyError) are removed, not left disabled.
 *
 * Updated 27 Sep 2026 (docs/jim-brief-washington-one-train-per-direction.md) for the terminus-only
 * direction model correction — see lib/cities/washington/marketing-directions.js file header. All
 * "Line + terminus" assertions below are now bare-terminus; a per-direction trip-count section
 * (search "trunk direction") proves a shared terminus reachable by multiple lines lists every
 * line's trains, and that a trunk direction with >=2 fixture trains never collapses to
 * upcoming.length === 1.
 *
 * Corrected again same day (Mark's QA on PR #482): that same PR had added a defensive dedupe step
 * (dedupeTrainsList(), keyed on Line/DestinationName/Min) which Mark caught silently collapsing
 * two GENUINELY DIFFERENT Blue trains to Huntington that only differed by `Group` (platform) — a
 * real, common shape at a two-platform terminus, not a duplicate. The dedupe step is removed
 * entirely (see lib/providers/washington.js's tripsFromTrainsList()); search "two-platform
 * terminus" below for the regression fixture.
 *
 * Unlike Boston's MBTA V3 API, WMATA's endpoints always require a key (WMATA_API_KEY) — there is
 * no unauthenticated fallback, and no WMATA key is registered in CI. So the end-to-end dispatch
 * coverage below stubs globalThis.fetch to serve the real captured
 * qa/fixtures/washington/{jstations,predictions}.json fixtures (taken 20 Sep 2026 against both
 * live endpoints, docs/washington-d1/jim-handoff.md "Live verification") and temporarily sets
 * process.env.WMATA_API_KEY to a dummy value for the duration of that section, since neither
 * getWashingtonDogfoodNextTrain nor live-city-api.js's washington dispatch case accepts an apiKey
 * override — both resolve their key the same way production does, via
 * lib/providers/gtfs/auth.js's readWmataApiKey() reading process.env.WMATA_API_KEY. This proves
 * the full dispatch/dogfood wiring end-to-end, offline and deterministically, the same real
 * fixture data Mark's live round-trip captured — rather than either skipping the dispatch path or
 * depending on a key being present in whichever environment runs this gate.
 *
 * The rest of the gate is unchanged by the flip: it still replays
 * qa/fixtures/washington/{jstations,predictions}.json through the catalog/allow-list/
 * direction-model logic (resolveCatalogEntry, mapWmataTrainToTrip, tripsFromTrainsList,
 * mapTerminusOnlyDestination, resolveTerminus, resolveStationCodesForCatalogEntry), and still
 * asserts that fetchStationBoard throws for an unknown station and for a missing WMATA_API_KEY
 * (still a real, live failure mode — the mock above only covers the dispatch-wiring section).
 * Rows in the fixtures marked "_source": "synthetic" are hand-authored for shapes the live
 * capture didn't happen to produce (an unrecognized Line code; a reliable "---" Min on a
 * passenger line; a Yellow Line train, since the "All" capture carried zero YL trains at capture
 * time) — same pattern as qa/fixtures/brussels/irail-liveboard.json.
 *
 * This gate also walks every real (non-synthetic) fixture row through
 * checkNoSilentlyUnmappedRow() below, which throws if a Line code or (Line, DestinationName)
 * pair isn't in the EXPECTED_* allow-lists — a new WMATA abbreviation or a genuinely new route
 * must be triaged and added here explicitly, never silently absorbed by resolveTerminus's
 * graceful bare-line-label fallback.
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
  WMATA_LINE_CODE_TO_LINE,
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
  resetStationsMetadataCacheForTests,
  WashingtonStationCodeUnconfirmedError,
  MissingWmataApiKeyError,
} from "../lib/providers/washington.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  resolveTerminus,
  mapTerminusOnlyDestination,
  printedLineTerminusLabel,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
  SHORT_TURN_TERMINI,
} from "../lib/cities/washington/marketing-directions.js";
import { resolveDirectionLabelAlias } from "../lib/cities/direction-label-aliases.js";
import { pickUpcomingProviderTrips } from "../lib/train-times-core.js";
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

// Registry identity + status — Washington flipped live 25 Sep 2026
// (docs/washington-d1/mark-qa-note.md); assertCityLive must now succeed.
const live = assertCityLive("washington");
assert(live?.ok === true, "assertCityLive(washington) must succeed now that washington is live");

const entry = getCity("washington");
assert(entry?.status === "live", "washington registry status must be live");
assert(entry?.adapterReady === true, "washington adapterReady must be true");
assert(entry?.displayName === "Washington, D.C.", "washington display name must be Washington, D.C.");
assert(entry?.timeZone === "America/New_York", "washington timezone must be America/New_York");
assert(CITIES.filter((city) => city.id === "washington").length === 1, "washington must appear once in the registry");
for (const forbiddenId of ["dc", "washington-dc", "wmata", "us"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Washington is now live — must be in MULTI_CITY_IDS (qa/live-city-lists-sync.mjs enforces this
// against the registry's live-city set).
assert(isMultiCity("washington") === true, "washington must be in MULTI_CITY_IDS now that status is live");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/washington-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
  "mark-qa-note.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/washington-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "washington", "D1 city id must be washington");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === WASHINGTON_HUB, `D1 lock must be ${WASHINGTON_HUB}`);
assert(network.lines.length === 6, "D1 must carry exactly 6 passenger lines");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist with a
// recorded verdict (MARC/VRE ruled `out-product` with Tim's sign-off; Amtrak reserved services
// `out-reservation`). No `undecided` row may remain.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const service of ["MARC", "VRE", "Amtrak"]) {
  assert(oracleReport.includes(service), `Board eligibility section must record a verdict for ${service}`);
}
assert(/come from feeds other than WMATA/i.test(oracleReport), "Board eligibility section must record that MARC/VRE come from feeds other than WMATA's API");
assert(/out-product/.test(oracleReport) && /Tim,? 20 Sep 2026/.test(oracleReport), "Board eligibility section must record MARC/VRE as out-product with Tim's 20 Sep 2026 sign-off");
assert(!/undecided/i.test(oracleReport), "oracle report must not carry any undecided board-eligibility row");

const jimHandoff = readFileSync(join(d1Dir, "jim-handoff.md"), "utf8");
assert(/MARC/.test(jimHandoff) && /VRE/.test(jimHandoff) && /out-product/.test(jimHandoff), "jim-handoff.md must record MARC/VRE as out-product");
assert(!/holds the flip pending/i.test(jimHandoff), "jim-handoff.md must not still say MARC/VRE holds the flip pending Tim's decision");

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

// Line labels + termini (terminus-only model, corrected 27 Sep 2026 — see marketing-directions.js
// file header Correction, docs/jim-brief-washington-one-train-per-direction.md).
assert(LINE_LABELS.red === "Red" && LINE_LABELS.silver === "Silver", "line labels must be bare color words");
assert(LINE_TERMINI.red.includes("Shady Grove") && LINE_TERMINI.red.includes("Glenmont"), "Red termini must be Shady Grove/Glenmont");
assert(LINE_TERMINI.silver.includes("Ashburn") && LINE_TERMINI.silver.includes("Downtown Largo") && LINE_TERMINI.silver.includes("New Carrollton"), "Silver must have three full-length termini: Ashburn, Downtown Largo, New Carrollton");
assert(LINE_TERMINI.silver.includes("Wiehle-Reston East"), "Silver must include the Wiehle-Reston East short-turn terminus");
assert(LINE_TERMINI.blue.includes("Huntington"), "Blue must include the Huntington short-turn terminus");
assert(LINE_TERMINI.yellow.includes("Huntington") && LINE_TERMINI.yellow.includes("Greenbelt"), "Yellow termini must include Huntington and Greenbelt");
assert(SHORT_TURN_TERMINI.blue.includes("Huntington") && SHORT_TURN_TERMINI.silver.includes("Wiehle-Reston East"), "SHORT_TURN_TERMINI must record both new short-turns");
assert(mapTerminusOnlyDestination(WASHINGTON_HUB, "red") === "Red Line", "Metro Center must never appear as a direction token — falls back to the bare line label");
assert(mapTerminusOnlyDestination("Downtown", "orange") === "Orange Line", "Downtown must never appear as a direction token");
assert(mapTerminusOnlyDestination("Glenmont", "red") === "Glenmont", "direction chip must be the bare terminus, not Line + terminus");
assert(mapTerminusOnlyDestination("Ashburn", "silver") === "Ashburn", "Silver direction chip must be the bare terminus");
assert(mapTerminusOnlyDestination("New Carrollton", "orange") === "New Carrollton" && mapTerminusOnlyDestination("New Carrollton", "silver") === "New Carrollton", "New Carrollton must be the exact same chip string for both Orange and Silver trains — this is what fixes the one-train-per-direction bug");
assert(resolveTerminus("Some Unknown Destination", "red") === null, "resolveTerminus must not fabricate an unknown terminus");
assert(foldKey("Grosvenor - Strathmore") !== "", "foldKey must fold case/punctuation");

// printedLineTerminusLabel discloses the physical line per trip even though the chip is line-agnostic.
assert(printedLineTerminusLabel("New Carrollton", "orange") === "Orange Line · New Carrollton", "printedLineTerminusLabel must disclose the Orange line for an Orange trip to New Carrollton");
assert(printedLineTerminusLabel("New Carrollton", "silver") === "Silver Line · New Carrollton", "printedLineTerminusLabel must disclose the Silver line for a Silver trip to the same terminus");
assert(printedLineTerminusLabel("Downtown", "orange") === null, "printedLineTerminusLabel must be null when the destination doesn't resolve to a known terminus");

// marketingLabelsForStation excludes a self-referential terminus chip and dedupes across lines.
const glenmontLabels = marketingLabelsForStation("Glenmont");
assert(glenmontLabels.includes("Shady Grove"), "Glenmont must offer the bare Shady Grove chip");
assert(!glenmontLabels.includes("Glenmont"), "Glenmont must never offer a self-referential Glenmont chip");
assert(tripMatchesMarketingChip({ destination: "Glenmont" }, "Glenmont") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "Glenmont" }, "Shady Grove") === false, "tripMatchesMarketingChip must reject a mismatched chip");

const metroCenterLabels = marketingLabelsForStation(WASHINGTON_HUB);
const newCarrolltonCount = metroCenterLabels.filter((l) => l === "New Carrollton").length;
assert(newCarrolltonCount === 1, `Metro Center must offer exactly ONE deduped "New Carrollton" chip (reachable via both Orange and Silver), got ${newCarrolltonCount}`);
for (const expected of ["Shady Grove", "Glenmont", "Vienna/Fairfax-GMU", "New Carrollton", "Franconia-Springfield", "Downtown Largo", "Ashburn"]) {
  assert(metroCenterLabels.includes(expected), `Metro Center must offer the ${expected} chip`);
}

// Legacy "Line + terminus" labels still resolve server-side (PR #440 mechanism) — a saved route
// on an installed client keeps working, and the response echoes the new canonical bare terminus.
assert(resolveDirectionLabelAlias("washington", "Orange Line + New Carrollton") === "New Carrollton", "the old Orange Line + New Carrollton label must alias to the new bare terminus");
assert(resolveDirectionLabelAlias("washington", "Silver Line + New Carrollton") === "New Carrollton", "the old Silver Line + New Carrollton label must alias to the same new bare terminus");
assert(resolveDirectionLabelAlias("washington", "Red Line + Glenmont") === "Glenmont", "the old Red Line + Glenmont label must alias to the new bare terminus");
assert(resolveDirectionLabelAlias("washington", "New Carrollton") === null, "the new canonical label must not itself need an alias");

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

// --- Real-capture fixtures (qa/fixtures/washington/{jstations,predictions}.json) ---
const fixturesDir = join(ROOT, "qa/fixtures/washington");
const jstationsFixture = JSON.parse(readFileSync(join(fixturesDir, "jstations.json"), "utf8"));
const predictionsFixture = JSON.parse(readFileSync(join(fixturesDir, "predictions.json"), "utf8"));

const realTrainGroups = [
  "metroCenter",
  "galleryPlace",
  "lenfantPlaza",
  "fortTotten",
  "shadyGroveTerminal",
  "bethesdaOrdinary",
  "noPassengerReal",
  "silverNewCarrollton",
];
const allRealTrains = realTrainGroups.flatMap((key) => predictionsFixture[key]);
assert(
  allRealTrains.every((t) => t._source === "live-capture-20260920"),
  "every row in the real fixture groups must be tagged _source: live-capture-20260920"
);
const syntheticEdgeCases = predictionsFixture.syntheticEdgeCases;
assert(
  syntheticEdgeCases.every((t) => t._source === "synthetic"),
  "every row in syntheticEdgeCases must be tagged _source: synthetic"
);

// A live Metro Center row (real capture) round-trips through the direction model.
const liveMetroCenterGlenmont = predictionsFixture.metroCenter.find(
  (t) => t.Line === "RD" && t.DestinationName === "Glenmont"
);
const liveTrip = mapWmataTrainToTrip(liveMetroCenterGlenmont, referenceNow);
assert(liveTrip.lineId === "red", "mapWmataTrainToTrip must classify by Line code");
assert(liveTrip.destination === "Glenmont", "mapWmataTrainToTrip must map the destination to the bare terminus (terminus-only model)");
assert(liveTrip.line === "Red", "mapWmataTrainToTrip must set the bare colour-word line field");
assert(liveTrip.printedDestination === "Red Line · Glenmont", "mapWmataTrainToTrip must set printedDestination so a board row can still disclose the physical line");
assert(typeof liveTrip.displayTime === "string" && liveTrip.displayTime !== "", "mapWmataTrainToTrip must set a string displayTime");
assert(liveTrip.cancelled === false, "WMATA's feed never reports a cancellation flag — cancelled must always be false");
assert(liveTrip.delayed === false, "WMATA's feed has no documented delay indicator — delayed must always be false");

// ARR/BRD (real, seen live at Metro Center/Fort Totten) are imminent (0-minute) departures.
const liveArrRow = predictionsFixture.metroCenter.find((t) => t.Min === "ARR");
const liveArrTrip = mapWmataTrainToTrip(liveArrRow, referenceNow);
assert(liveArrTrip !== null && new Date(liveArrTrip.liveDeparture).getTime() === referenceNow.getTime(), "a real ARR row must be treated as an imminent (0-minute) departure and kept");

const liveBrdRow = predictionsFixture.galleryPlace.find((t) => t.Min === "BRD");
assert(liveBrdRow, "fixture must contain a real BRD row to exercise this path");
assert(mapWmataTrainToTrip(liveBrdRow, referenceNow) !== null, "a real BRD row must be treated as an imminent departure and kept");

// --- Real abbreviated DestinationName forms (the actual live-verification finding) ---
// WMATA's live GetPrediction sent "Shady Grv" (not "Shady Grove") for most Red trains toward
// Shady Grove, and "New Crlton"/"NewCrlton" (two different spacings) for New Carrollton on both
// Orange and Silver — none of these are substrings of the canonical terminus name, so without
// WMATA_DESTINATION_ABBREVIATIONS (lib/cities/washington/marketing-directions.js) these real
// rows would silently lose their terminus and fall back to a bare line label.
const liveShadyGrvRow = predictionsFixture.fortTotten.find((t) => t.DestinationName === "Shady Grv");
assert(liveShadyGrvRow, "fixture must contain a real 'Shady Grv' abbreviated row");
assert(
  mapWmataTrainToTrip(liveShadyGrvRow, referenceNow).destination === "Shady Grove",
  "the real live abbreviation 'Shady Grv' must still resolve to the bare terminus chip Shady Grove"
);

const liveNewCrltonSpaced = predictionsFixture.silverNewCarrollton.find((t) => t.DestinationName === "New Crlton");
assert(liveNewCrltonSpaced, "fixture must contain a real 'New Crlton' abbreviated row");
assert(
  mapWmataTrainToTrip(liveNewCrltonSpaced, referenceNow).destination === "New Carrollton",
  "the real live abbreviation 'New Crlton' must still resolve to the bare terminus chip"
);
assert(
  mapWmataTrainToTrip(liveNewCrltonSpaced, referenceNow).printedDestination === "Silver Line · New Carrollton",
  "the Silver trip's printedDestination must disclose the Silver line"
);

const liveNewCrltonNoSpace = predictionsFixture.silverNewCarrollton.find((t) => t.DestinationName === "NewCrlton");
assert(liveNewCrltonNoSpace, "fixture must contain a real 'NewCrlton' abbreviated row");
assert(
  mapWmataTrainToTrip(liveNewCrltonNoSpace, referenceNow).destination === "New Carrollton",
  "the real live abbreviation 'NewCrlton' (no space) must still resolve to the bare terminus chip"
);

// A genuine short-turn seen live: a real Blue Line train signed "Huntington". Corrected 27 Sep
// 2026 — Huntington is now a first-class Blue terminus (LINE_TERMINI.blue), so this must resolve
// to the SAME bare "Huntington" chip Yellow's full-length Huntington trains use, not a fallback.
const liveBlueHuntington = predictionsFixture.lenfantPlaza.find((t) => t.Line === "BL" && t.DestinationName === "Huntington");
assert(liveBlueHuntington, "fixture must contain the real live Blue-Line-to-Huntington short-turn row");
const blueHuntingtonTrip = mapWmataTrainToTrip(liveBlueHuntington, referenceNow);
assert(
  blueHuntingtonTrip.destination === "Huntington",
  "Blue's genuine Huntington short-turn must now resolve to the first-class bare Huntington chip"
);
assert(
  blueHuntingtonTrip.printedDestination === "Blue Line · Huntington",
  "the Blue short-turn trip's printedDestination must disclose the Blue line"
);

// Real no-passenger rows are dropped.
for (const row of predictionsFixture.noPassengerReal) {
  assert(mapWmataTrainToTrip(row, referenceNow) === null, "Line=No (no-passenger train) rows must be dropped — must never appear on a rider-facing board");
}

// Synthetic edge cases the real capture did not happen to produce.
const syntheticNoReliable = syntheticEdgeCases.find((t) => t.Min === "---" && t.Line !== "No");
assert(syntheticNoReliable, "syntheticEdgeCases must cover a reliable '---' Min on a passenger line");
assert(mapWmataTrainToTrip(syntheticNoReliable, referenceNow) === null, "--- (no reliable prediction) rows on a passenger line must be dropped — never presented as live");

const syntheticUnknownLine = syntheticEdgeCases.find((t) => t.Line === "ZZ");
assert(syntheticUnknownLine, "syntheticEdgeCases must cover an unrecognized Line code");
assert(mapWmataTrainToTrip(syntheticUnknownLine, referenceNow) === null, "an unrecognized Line code must not be classified into any line");

const syntheticYellow = syntheticEdgeCases.find((t) => t.Line === "YL");
assert(syntheticYellow, "syntheticEdgeCases must cover a Yellow Line row (the real capture carried zero YL trains)");
const yellowTrip = mapWmataTrainToTrip(syntheticYellow, referenceNow);
assert(yellowTrip?.lineId === "yellow", "the synthetic Yellow Line row must still classify correctly even though no real YL row was captured");

const emptyMinTrain = { ...liveMetroCenterGlenmont, Min: "" };
assert(mapWmataTrainToTrip(emptyMinTrain, referenceNow) === null, "an empty Min must be dropped — never presented as live");

const trips = tripsFromTrainsList(predictionsFixture.metroCenter, referenceNow);
assert(trips.length === predictionsFixture.metroCenter.length, `every real Metro Center row has a reliable Min and a known Line — none should be dropped, got ${trips.length} of ${predictionsFixture.metroCenter.length}`);

// --- Fail-closed safety net: every real (Line, DestinationName) pair in the fixture must be an
// explicitly recognized mapping, so a NEW unmapped destination/line in a future re-capture fails
// this gate loudly instead of silently degrading to a bare-line-label fallback unnoticed. ---
const EXPECTED_LINE_CODES = new Set(["RD", "BL", "OR", "SV", "GR", "YL", "No", "ZZ"]);
const EXPECTED_DESTINATION_CHIPS = {
  "RD|Shady Grove": "Shady Grove",
  "RD|Shady Grv": "Shady Grove",
  "RD|Glenmont": "Glenmont",
  "BL|Downtown Largo": "Downtown Largo",
  "BL|Franconia-Springfield": "Franconia-Springfield",
  "BL|Huntington": "Huntington", // first-class short-turn terminus, not a fallback (27 Sep 2026)
  "SV|Ashburn": "Ashburn",
  "SV|New Crlton": "New Carrollton",
  "SV|NewCrlton": "New Carrollton",
  "OR|New Crlton": "New Carrollton", // SAME bare chip as SV's New Carrollton — the whole fix
  "OR|Vienna/Fairfax-GMU": "Vienna/Fairfax-GMU",
  "GR|Greenbelt": "Greenbelt",
  "GR|Branch Av": "Branch Av",
  "No|No Passenger": null, // dropped before mapTerminusOnlyDestination ever runs
  "YL|Huntington": "Huntington", // SAME bare chip as BL's Huntington short-turn
  "ZZ|Unknown": null, // dropped (unrecognized Line) before mapTerminusOnlyDestination ever runs
};

function checkNoSilentlyUnmappedRow(train) {
  if (!EXPECTED_LINE_CODES.has(train.Line)) {
    throw new Error(`Unmapped WMATA Line code in fixture: "${train.Line}" (destination ${train.DestinationName}) — triage against a real capture and add it to EXPECTED_LINE_CODES/WMATA_LINE_CODE_TO_LINE, don't let it pass silently.`);
  }
  const key = `${train.Line}|${train.DestinationName}`;
  if (!(key in EXPECTED_DESTINATION_CHIPS)) {
    throw new Error(`Unmapped (Line, DestinationName) pair in fixture: "${key}" — triage against a real capture (a new abbreviation? a new short-turn?) and add an explicit expectation to EXPECTED_DESTINATION_CHIPS, don't let it pass silently.`);
  }
  const lineId = WMATA_LINE_CODE_TO_LINE[train.Line];
  if (!lineId) {
    // No-passenger / unrecognized-line rows never reach mapTerminusOnlyDestination in
    // production (mapWmataTrainToTrip drops them by Line before that call) — checked above via
    // EXPECTED_LINE_CODES/the explicit `null` expectation, nothing further to assert here.
    return;
  }
  // Checked independently of Min/reliability (mapTerminusOnlyDestination, not
  // mapWmataTrainToTrip) so a synthetic "---" row still exercises the destination-mapping half
  // of this safety net even though its Min would drop it from a real board.
  const actual = mapTerminusOnlyDestination(train.DestinationName, lineId);
  assert(
    actual === EXPECTED_DESTINATION_CHIPS[key],
    `fixture row ${key} must map to "${EXPECTED_DESTINATION_CHIPS[key]}", got "${actual}"`
  );
}

for (const train of [...allRealTrains, ...syntheticEdgeCases]) {
  checkNoSilentlyUnmappedRow(train);
}

// --- Part C (docs/jim-brief-washington-one-train-per-direction.md): a shared trunk terminus
// reachable by multiple lines must list every line's trains under the SAME chip, and a trunk
// direction with >=2 fixture trains must never render upcoming.length === 1 (the exact bug). ---
//
// DC Metro's real topology never has three DIFFERENT lines sharing one far-end terminus (the
// widest real overlap is two: New Carrollton via Orange+Silver, Huntington via Blue+Yellow — see
// hazard-pack.md/oracle-clash-report.md), so "three interleaved lines run to one terminus" is
// realized here as three interleaved TRAINS across those two genuinely-overlapping lines (the
// real WMATA platform-group shape the bug report describes: up to ~3 trains per group,
// interleaved) — a synthetic (marked _source: synthetic) fixture built to exercise the MECHANISM,
// that tripMatchesMarketingChip/pickUpcomingProviderTrips merge strictly by destination string,
// not by line, on top of the real two-line New Carrollton case already covered by the fixtures
// above.
const trunkOverlapTrains = [
  { _source: "synthetic", Car: "6", Destination: "NC", DestinationCode: "G05", DestinationName: "New Carrollton", Group: "1", Line: "OR", LocationCode: "C01", LocationName: "Metro Center", Min: "3" },
  { _source: "synthetic", Car: "6", Destination: "NC", DestinationCode: "G05", DestinationName: "New Carrollton", Group: "1", Line: "SV", LocationCode: "C01", LocationName: "Metro Center", Min: "6" },
  { _source: "synthetic", Car: "6", Destination: "NC", DestinationCode: "G05", DestinationName: "New Carrollton", Group: "1", Line: "SV", LocationCode: "C01", LocationName: "Metro Center", Min: "9" },
];
const trunkOverlapTrips = tripsFromTrainsList(trunkOverlapTrains, referenceNow);
assert(trunkOverlapTrips.length === 3, "all three interleaved trains to the shared terminus must survive mapping");
assert(trunkOverlapTrips.every((t) => t.destination === "New Carrollton"), "every line's train to the shared terminus must produce the SAME bare-terminus chip");
assert(new Set(trunkOverlapTrips.map((t) => t.lineId)).size === 2, "the fixture must span two DIFFERENT lines (Orange+Silver), not just repeat one");
const trunkOverlapUpcoming = pickUpcomingProviderTrips(trunkOverlapTrips, "New Carrollton", referenceNow);
assert(trunkOverlapUpcoming.length === 3, `the New Carrollton chip must list all three interleaved trains, got ${trunkOverlapUpcoming.length}`);

// The real Metro Center capture's two genuinely-overlapping-line termini (New Carrollton via
// Orange+Silver in qa/fixtures/washington/predictions.json's silverNewCarrollton +
// metroCenter/OR row) and Huntington (Blue+Yellow) must never collapse to exactly one train when
// the raw fixture data plainly carries >=2 — this is the literal regression from the bug report.
function assertTrunkDirectionNeverCollapsesToOne(trains, terminus, minExpected) {
  const trips = tripsFromTrainsList(trains, referenceNow);
  const upcoming = pickUpcomingProviderTrips(trips, terminus, referenceNow);
  assert(
    upcoming.length >= minExpected,
    `${terminus} must show at least ${minExpected} upcoming trains from this fixture, got ${upcoming.length}`
  );
  assert(
    !(upcoming.length === 1 && minExpected >= 2),
    `${terminus} has >=2 predicted trains in the fixture and must never render upcoming.length === 1 (the one-train-per-direction bug)`
  );
}
assertTrunkDirectionNeverCollapsesToOne(trunkOverlapTrains, "New Carrollton", 3);
assertTrunkDirectionNeverCollapsesToOne(
  [
    { _source: "synthetic", DestinationName: "Huntington", Line: "BL", Min: "2", Group: "2", LocationCode: "C01", LocationName: "Metro Center" },
    { _source: "synthetic", DestinationName: "Huntington", Line: "YL", Min: "5", Group: "1", LocationCode: "C01", LocationName: "Metro Center" },
  ],
  "Huntington",
  2
);

// --- Regression (Mark's QA on PR #482): a de-dup step keyed on (Line, DestinationName, Min)
// collapsed two GENUINELY DIFFERENT trains — same line, same destination, same rounded-to-the-
// minute Min, but different Group (platform) — at a two-platform terminus. `Min` is WMATA's own
// per-minute estimate, not a unique id, so this is a normal, real shape (e.g. two Blue trains to
// Huntington arriving the same minute on different platforms), not a duplicate to be merged away.
// tripsFromTrainsList() must never drop either — see lib/providers/washington.js's
// tripsFromTrainsList() docstring for why the dedupe step was removed entirely rather than re-keyed.
const twoPlatformSameMinuteTrains = [
  { _source: "synthetic", Car: "6", Destination: "Huntington", DestinationCode: null, DestinationName: "Huntington", Group: "1", Line: "BL", LocationCode: "C01", LocationName: "Gallery Pl-Chinatown", Min: "4" },
  { _source: "synthetic", Car: "8", Destination: "Huntington", DestinationCode: null, DestinationName: "Huntington", Group: "2", Line: "BL", LocationCode: "F01", LocationName: "Gallery Pl-Chinatown", Min: "4" },
];
const twoPlatformTrips = tripsFromTrainsList(twoPlatformSameMinuteTrains, referenceNow);
assert(
  twoPlatformTrips.length === 2,
  `two genuine same-line/same-destination/same-Min trains that differ only by Group at a two-platform terminus must both survive as separate trips, got ${twoPlatformTrips.length}`
);
const twoPlatformUpcoming = pickUpcomingProviderTrips(twoPlatformTrips, "Huntington", referenceNow);
assert(
  twoPlatformUpcoming.length === 2,
  `the Huntington chip must list BOTH same-minute, different-platform Blue trains, got ${twoPlatformUpcoming.length}`
);

// Metro Center's real jStations+GetPrediction wiring must yield BOTH Red termini (the hub's own
// line) AND the Blue/Orange/Silver trunk termini — the "Metro Center returned only ONE board
// entry" symptom must not reproduce against the full merged catalog of direction chips.
const metroCenterDirectionsPack = getWashingtonDogfoodDirections(WASHINGTON_HUB);
assert(metroCenterDirectionsPack.directions.includes("Shady Grove") && metroCenterDirectionsPack.directions.includes("Glenmont"), "Metro Center directions must include BOTH Red termini");
assert(
  ["Franconia-Springfield", "Downtown Largo", "Vienna/Fairfax-GMU", "New Carrollton", "Ashburn"].every((d) => metroCenterDirectionsPack.directions.includes(d)),
  "Metro Center directions must also include the Blue/Orange/Silver trunk termini"
);

// resolveStationCodesForCatalogEntry — trimmed REAL jStations capture (qa/fixtures/washington/
// jstations.json), no network. Confirms Metro Center's two platform codes (A01+C01) are
// discovered via StationTogether1/2 linkage, Farragut North/West stay single-code and distinct,
// and the two live-name mismatches found in this pass (McPherson Square, Eisenhower Avenue)
// resolve via their new catalog aliases.
const realStationsMetadata = jstationsFixture.Stations;
assert(
  realStationsMetadata.every((s) => s._source === "live-capture-20260920"),
  "every row in qa/fixtures/washington/jstations.json must be tagged _source: live-capture-20260920"
);
const metroCenterEntry = resolveCatalogEntry(WASHINGTON_HUB);
const metroCenterCodes = resolveStationCodesForCatalogEntry(realStationsMetadata, metroCenterEntry).sort();
assert(JSON.stringify(metroCenterCodes) === JSON.stringify(["A01", "C01"]), `Metro Center must resolve to both A01 and C01, got ${JSON.stringify(metroCenterCodes)}`);

const farragutNorthCodes = resolveStationCodesForCatalogEntry(realStationsMetadata, resolveCatalogEntry("Farragut North"));
assert(JSON.stringify(farragutNorthCodes) === JSON.stringify(["A02"]), "Farragut North must resolve to exactly A02, never merged with Farragut West");

const farragutWestCodes = resolveStationCodesForCatalogEntry(realStationsMetadata, resolveCatalogEntry("Farragut West"));
assert(JSON.stringify(farragutWestCodes) === JSON.stringify(["C03"]), "Farragut West must resolve to exactly C03, never merged with Farragut North");

const mcphersonCodes = resolveStationCodesForCatalogEntry(realStationsMetadata, resolveCatalogEntry("McPherson Sq"));
assert(JSON.stringify(mcphersonCodes) === JSON.stringify(["C02"]), "McPherson Sq must resolve via its new 'McPherson Square' live-name alias");

const eisenhowerCodes = resolveStationCodesForCatalogEntry(realStationsMetadata, resolveCatalogEntry("Eisenhower Av"));
assert(JSON.stringify(eisenhowerCodes) === JSON.stringify(["C14"]), "Eisenhower Av must resolve via its new 'Eisenhower Avenue' live-name alias");

let unconfirmedThrew = false;
try {
  resolveStationCodesForCatalogEntry(realStationsMetadata, resolveCatalogEntry("Glenmont"));
} catch (err) {
  unconfirmedThrew = err instanceof WashingtonStationCodeUnconfirmedError;
}
assert(unconfirmedThrew, "resolveStationCodesForCatalogEntry must throw WashingtonStationCodeUnconfirmedError rather than guess when jStations has no matching row (Glenmont is deliberately absent from the trimmed fixture)");

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

// Note: `codes`/`stationsData` only skip the jStations-join step — past that, the GetPrediction
// HTTP call itself is exercised for real (against a stubbed globalThis.fetch, not a live
// network call) in the mocked end-to-end dispatch section further below, not here.

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listWashingtonDogfoodStations();
assert(dogfoodStations.length === 98, `dogfood stations must be the 98 D1 names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === WASHINGTON_HUB), "hub must be listed by the dogfood harness");

const hubPack = getWashingtonDogfoodDirections(WASHINGTON_HUB);
assert(hubPack.source === "washington-marketing-ends", "directions source must be washington-marketing-ends");
assert(JSON.stringify(hubPack.directions.sort()) === JSON.stringify(marketingLabelsForStation(WASHINGTON_HUB).sort()), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness.
const dispatchedDirections = await getMultiCityDirections("washington", "Glenmont");
assert(
  JSON.stringify(dispatchedDirections.directions.sort()) === JSON.stringify(glenmontLabels.sort()),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "washington-marketing-ends", "live-city-api dispatch source must be washington-marketing-ends");

// --- End-to-end wiring against a mocked WMATA response (offline, no real network / key) ---
// WMATA always requires a key and CI has none registered, so this stubs globalThis.fetch to
// serve the real captured jStations/GetPrediction fixtures and temporarily sets
// process.env.WMATA_API_KEY to a dummy value — neither getWashingtonDogfoodNextTrain nor
// live-city-api.js's washington dispatch case accepts an apiKey override, so both resolve their
// key the same way production does (readWmataApiKey() reading the env var). This proves the full
// dispatch/dogfood wiring end-to-end against real captured data, deterministically.
const previousWmataKey = process.env.WMATA_API_KEY;
process.env.WMATA_API_KEY = "gate-test-key";
resetStationsMetadataCacheForTests();
const originalDispatchFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.startsWith(WMATA_STATIONS_URL)) {
    return { ok: true, json: async () => ({ Stations: jstationsFixture.Stations }) };
  }
  if (href.startsWith(WMATA_PREDICTION_URL)) {
    return { ok: true, json: async () => ({ Trains: predictionsFixture.metroCenter }) };
  }
  throw new Error(`unexpected fetch in washington-dogfood-gate mocked e2e section: ${href}`);
};

let dispatchedNextTrain;
let legacyLabelNextTrain;
let directDogfoodNextTrain;
try {
  // live-city-api.js's dispatch canonicalizes destination via canonicalizeDirectionConfig
  // BEFORE it reaches the city adapter, so passing the CANONICAL bare terminus...
  dispatchedNextTrain = await getMultiCityNextTrain("washington", {
    station: WASHINGTON_HUB,
    destination: "Glenmont",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
  // ...and passing the OLD, retired "Line + terminus" label must resolve to the exact same
  // result (PR #440 mechanism) — an installed client still sending the old saved label must not
  // regress to "No upcoming trains".
  legacyLabelNextTrain = await getMultiCityNextTrain("washington", {
    station: WASHINGTON_HUB,
    destination: "Red Line + Glenmont",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
  // getWashingtonDogfoodNextTrain is called directly (bypassing the live-city-api.js dispatch
  // layer that applies canonicalizeDirectionConfig), so it must be given the canonical label.
  directDogfoodNextTrain = await getWashingtonDogfoodNextTrain({
    station: WASHINGTON_HUB,
    destination: "Glenmont",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} finally {
  globalThis.fetch = originalDispatchFetch;
  resetStationsMetadataCacheForTests();
  if (previousWmataKey === undefined) {
    delete process.env.WMATA_API_KEY;
  } else {
    process.env.WMATA_API_KEY = previousWmataKey;
  }
}
assert(dispatchedNextTrain.config?.destination === "Glenmont", "dispatched next-train destination must equal the chosen bare-terminus chip");
assert(legacyLabelNextTrain.config?.destination === "Glenmont", "the old 'Red Line + Glenmont' label must still resolve and echo the new canonical bare-terminus label");
assert(directDogfoodNextTrain.config?.destination === "Glenmont", "dogfood next-train destination must equal the chosen chip");

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available) were added to all four in the same commit as the
// status flip — qa/live-city-lists-sync.mjs enforces they equal exactly the live-city set.

console.log(
  "washington-dogfood-gate: ok (live, MULTI_CITY_IDS/mount/persistence lists in sync, D1 pack, Board eligibility section recorded MARC/VRE out-product (Tim, 20 Sep 2026), 98 stations, hub Metro Center merged as one multi-line entry via StationTogether1/2, Farragut North/West stay distinct, terminus-only direction model (27 Sep 2026 correction) with legacy Line+terminus server-side aliases, Metro Center and Downtown never a direction token, a shared trunk terminus lists every line's trains under one chip and never collapses to upcoming.length===1 with >=2 fixture trains, two same-line/same-destination/same-minute trains on different platforms both survive (no Line/DestinationName/Min dedupe), Metro Center yields Red AND Blue/Orange/Silver trunk directions, WMATA payload shaping, ARR/BRD kept as imminent and ---/empty dropped, Line=No/-- dropped, jStations code join disambiguates hub codes with no network, dispatch/dogfood next-train wired end-to-end against mocked real fixture data including the legacy-label alias round-trip, missing-key still refuses rather than falling back, Perth Australia green)"
);
