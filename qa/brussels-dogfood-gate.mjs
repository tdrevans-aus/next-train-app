/**
 * Brussels adapter/dispatch wiring gate for its live flip (20 Sep 2026,
 * Mark's flip commit on PR #419's green QA note). Replaces
 * brussels-planned-gate.mjs (retired) — registry-status/adapterReady/
 * isMultiCity assertions below are written for the POST-FLIP state
 * (status -> "live", brussels added to MULTI_CITY_IDS/brisbane-dogfood.js's
 * available map/journey-model.js's persisted-city/country lists — see
 * docs/brussels-d1/jim-handoff.md "Flip commit — exact edits"), matching the
 * established pattern from East Midlands/West of England's flip gates.
 *
 * Offline by construction (carried forward from the retired planned gate,
 * docs/jim-brief-brussels-gate-pinned-clock.md): this gate must never reach
 * the network. `globalThis.fetch` is stubbed to throw immediately below,
 * before any other import runs a request. The board is now LIVE (BMC
 * Waiting Times API, see lib/providers/brussels.js file header for how the
 * operation path was confirmed 20 Sep 2026) — the live-board assertions run
 * against a captured-live-shape fixture (qa/fixtures/brussels/waiting-times.json,
 * real point IDs/line IDs/destinations from a live call, plus documented
 * synthetic edge-case rows for the schedule-echo and non-boarding filters),
 * injected into the REAL fetchStationBoard() via its `rawResults` option —
 * so the production filter/map pipeline is what runs here, not a copy of
 * it. The credential-refusal path (MissingStibCredentialsError) is asserted
 * by calling fetchStationBoard() with NO `rawResults` and NO STIB_API_KEY in
 * the environment (this gate never loads .env.local) — it must throw before
 * ever reaching the stubbed `fetch`, proving there is no schedule-only
 * fallback.
 *
 * SNCB/NMBS second source (20 Sep 2026, docs/jim-brief-brussels-flip-readiness.md): STIB metro
 * is the primary, always-on source; iRail liveboard (lib/providers/irail.js) is a genuinely
 * separate second source at the three shared stations the oracle report names (Gare Centrale,
 * Gare du Midi, Gare de l'Ouest). Both are exercised here purely offline: the iRail fixture
 * (qa/fixtures/brussels/irail-liveboard.json) is injected via fetchStationBoard()'s
 * `irailRawDepartures` escape hatch (same shape as `rawResults` for STIB), so the production
 * classify/map pipeline (lib/providers/irail.js's classifySncbVehicleType/mapIrailDepartures)
 * runs here, not a copy of it. The "iRail down" case needs no separate fixture — the top-of-file
 * fetch stub already throws on ANY network attempt, so simply omitting `irailRawDepartures`
 * while supplying `rawResults` for STIB drives the real network path into that same stub,
 * proving the degrade-to-partial behaviour for real.
 *
 * Usage: node qa/brussels-dogfood-gate.mjs
 */
globalThis.fetch = async (input) => {
  throw new Error(
    `brussels-dogfood-gate: network access is forbidden in this gate (attempted fetch: ${
      typeof input === "string" ? input : input?.url ?? input
    }) — see docs/jim-brief-brussels-gate-pinned-clock.md`
  );
};

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { assertLiveBoardTripsHaveDisplayTimes } from "../lib/providers/contract.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  BRUSSELS_HUB,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  mapWaitingTimesResults,
  mapScheduledTailRow,
  appendScheduledMetroTail,
  fetchScheduledMetroTail,
  SCHEDULED_TAIL_MAX_PER_DIRECTION,
  BRUSSELS_METRO_SHORT_NAMES,
  SNCB_SHARED_STATION_IRAIL_NAMES,
  MissingStibCredentialsError,
} from "../lib/providers/brussels.js";
import { loadGtfsStaticFromDirectory } from "../lib/providers/gtfs/static-cache.js";
import { enrichTripTiming } from "../lib/train-times-core.js";
import { classifySncbVehicleType, isSncbBoardEligible, mapIrailDepartures } from "../lib/providers/irail.js";
import {
  marketingLabelsForStation,
  mapBrusselsDestination,
  resolveTerminus,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  bilingualHalves,
  sncbDirectionLabel,
  tripMatchesSncbDirectionChip,
  groupedSncbDirectionLabel,
  tripMatchesGroupedSncbDirectionChip,
  sncbCorridorForDestination,
  SNCB_CORRIDORS,
  SNCB_INTERCITY_TYPES,
} from "../lib/cities/brussels/marketing-directions.js";
import {
  listBrusselsDogfoodStations,
  getBrusselsDogfoodDirections,
  getBrusselsDogfoodNextTrain,
} from "../lib/cities/brussels/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm tester-live must stay green");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg tester-live must stay green");
assert(assertCityLive("malmo")?.ok === true, "Malmö tester-live must stay green");
assert(assertCityLive("uppsala")?.ok === true, "Uppsala tester-live must stay green");

// Registry identity + live status — true post-flip.
const live = assertCityLive("brussels");
assert(live?.ok === true, "assertCityLive(brussels) must pass post-flip");

const entry = getCity("brussels");
assert(entry?.status === "live", "brussels registry status must be live post-flip");
assert(entry?.adapterReady === true, "brussels adapterReady must be true");
assert(entry?.displayName === "Brussels", "brussels display name must be Brussels");
assert(entry?.timeZone === "Europe/Brussels", "brussels timezone must be Europe/Brussels");
assert(CITIES.filter((city) => city.id === "brussels").length === 1, "brussels must appear once in the registry");
for (const forbiddenId of ["bru", "bruxelles", "stib", "belgium"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch wiring — brussels is in MULTI_CITY_IDS post-flip.
assert(isMultiCity("brussels") === true, "brussels must be in MULTI_CITY_IDS post-flip");

const d1Dir = join(ROOT, "docs/brussels-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/brussels-d1/${name} is required`);
}

const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/brussels/published-network.json");
assert(existsSync(fixturePath), "qa/fixtures/brussels/published-network.json is required");
assert(
  d1Json === readFileSync(fixturePath, "utf8"),
  "qa/fixtures/brussels/published-network.json must be a verbatim copy of docs/brussels-d1"
);

const network = JSON.parse(d1Json);
assert(network.city === "brussels", "D1 city id is brussels");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === BRUSSELS_HUB, `D1 lock must be ${BRUSSELS_HUB}`);
assert(network.lines.length === 4, "D1 must carry exactly 4 metro lines (1, 2, 5, 6)");
assert(
  network.lines.every((line) => BRUSSELS_METRO_SHORT_NAMES.includes(line.number)),
  "D1 lines must be only 1, 2, 5, 6 — no passenger metro 3 or 4"
);
assert(!network.lines.some((line) => line.number === "3" || line.number === "4"), "no metro 3 or 4");

const line2 = network.lines.find((line) => line.id === "2");
assert(line2.termini.includes("Simonis") && line2.termini.includes("Elisabeth"), "line 2 far ends must be Simonis and Elisabeth");
const line6 = network.lines.find((line) => line.id === "6");
assert(
  line6.termini.includes("Roi Baudouin / Koning Boudewijn") && line6.termini.includes("Elisabeth"),
  "line 6 far ends must be Roi Baudouin / Koning Boudewijn and Elisabeth"
);

const stations = listCatalogStations();
assert(stations.length === 60, `catalog must have 60 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(BRUSSELS_HUB), `catalog must lock ${BRUSSELS_HUB}`);
assert(byName.has("Simonis") && byName.has("Elisabeth"), "catalog must carry both Simonis and Elisabeth as distinct stations");
assert(
  JSON.stringify(byName.get("Simonis").stopIds) !== JSON.stringify(byName.get("Elisabeth").stopIds),
  "Simonis and Elisabeth must not share stopIds"
);
for (const station of stations) {
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lng), `${station.name} must have real coordinates`);
  assert(Array.isArray(station.stopIds) && station.stopIds.length > 0, `${station.name} must have real STIB point IDs`);
}
assert(!byName.has("Gare du Nord / Noordstation") && !byName.has("Gare du Nord"), "catalog must not carry Gare du Nord (no metro)");
assert(!byName.has("Albert"), "catalog must not carry Albert (metro 3 frozen, not open)");

// SNCB is `in` per the pack's Board eligibility section but has no catalog
// entry — nothing here should silently resolve a bare "Gare du Midi" etc.
// as anything other than the metro station it already is (doNotGroup vs
// SNCB, per hazard-pack.md), and no SNCB-only station (e.g. Gare du Nord,
// which has no metro at all) may leak in.
assert(!byName.has("SNCB") && !byName.has("NMBS"), "catalog must not invent an SNCB/NMBS pseudo-station");

assert(resolveCatalogEntry(BRUSSELS_HUB)?.name === BRUSSELS_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("arts-loi")?.name === BRUSSELS_HUB, "resolveCatalogEntry must resolve the FR half");
assert(resolveCatalogEntry("kunst-wet")?.name === BRUSSELS_HUB, "resolveCatalogEntry must resolve the NL half");
assert(resolveCatalogEntry("Simonis")?.name === "Simonis", "resolveCatalogEntry must resolve Simonis as its own station");
assert(resolveCatalogEntry("Elisabeth")?.name === "Elisabeth", "resolveCatalogEntry must resolve Elisabeth as its own station");
assert(resolveCatalogEntry("Brussels") === null, "resolveCatalogEntry must reject the marketing token Brussels");
assert(resolveCatalogEntry("bru") === null, "resolveCatalogEntry must reject the invented id bru");
assert(resolveCatalogEntry("stib") === null, "resolveCatalogEntry must reject the invented id stib");
assert(resolveCatalogEntry("Centre") === null, "resolveCatalogEntry must reject the marketing token Centre");

// Direction model — line + terminus, hub is never a chip.
const hubLabels = marketingLabelsForStation(BRUSSELS_HUB);
assert(hubLabels.includes("1 + Stockel / Stokkel"), "hub must offer 1 + Stockel / Stokkel");
assert(hubLabels.includes("1 + Gare de l'Ouest / Weststation"), "hub must offer 1 + Gare de l'Ouest / Weststation");
assert(hubLabels.includes("2 + Simonis"), "hub must offer 2 + Simonis");
assert(hubLabels.includes("2 + Elisabeth"), "hub must offer 2 + Elisabeth");
assert(hubLabels.includes("6 + Elisabeth"), "hub must offer 6 + Elisabeth");
assert(hubLabels.includes("6 + Roi Baudouin / Koning Boudewijn"), "hub must offer 6 + Roi Baudouin / Koning Boudewijn");
assert(
  !hubLabels.some((label) => /to city|to arts-loi|to centre|inbound|outbound/i.test(label)),
  "no inbound/outbound/to City/to Arts-Loi chips"
);
assert(!hubLabels.some((label) => foldKey(label).includes(foldKey(BRUSSELS_HUB))), "the hub must never appear as its own chip terminus");

// Simonis and Elisabeth stay two distinct chip names — never collapsed into one.
const simonisLabels = marketingLabelsForStation("Simonis");
assert(simonisLabels.includes("6 + Roi Baudouin / Koning Boudewijn"), "Simonis must offer 6 + Roi Baudouin / Koning Boudewijn (line 6 continues north)");
assert(!simonisLabels.some((label) => /2 \+ Simonis/i.test(label)), "Simonis must never offer 2 + Simonis (self-referential)");

// GTFS/STIB headsign -> locked terminus mapping (destination.fr from the live payload uses
// the same ALL-CAPS FR convention as GTFS trip_headsign — see lib/providers/brussels.js file
// header — so this mapping function is shared by both).
assert(mapBrusselsDestination("STOCKEL", "1") === "1 + Stockel / Stokkel", "must map STOCKEL headsign to the locked bilingual terminus");
assert(mapBrusselsDestination("SIMONIS", "2") === "2 + Simonis", "must map SIMONIS headsign for line 2");
assert(mapBrusselsDestination("ELISABETH", "6") === "6 + Elisabeth", "must map ELISABETH headsign for line 6");
assert(mapBrusselsDestination("RESERVE", "2") === null, "overlay/depot headsigns must be dropped, not fabricated into a chip");
assert(mapBrusselsDestination("ARTS-LOI", "1") === null, "the hub must never resolve as a valid terminus even if a headsign said so");
assert(resolveTerminus("GARE DE L'OUEST", "1") === "Gare de l'Ouest / Weststation", "resolveTerminus must recover the locked bilingual string");

assert(isForbiddenCollapseName("Brussels") === true, "Brussels must never resolve as a station");
assert(isForbiddenCollapseName("Simonis") === false, "Simonis must stay resolvable as a station");
assert(isForbiddenHubProxy("Simonis") === true, "Simonis must never stand in for the Arts-Loi / Kunst-Wet hub identity");
assert(isForbiddenHubProxy("Gare du Midi") === true, "Gare du Midi must never stand in for the hub identity");
assert(isForbiddenHubProxy(BRUSSELS_HUB) === false, "the hub itself is not its own proxy violation");

assert(foldKey("Arts-Loi") === foldKey("ARTS-LOI"), "foldKey must normalize case");
assert(foldKey("Joséphine-Charlotte") === foldKey("josephine-charlotte"), "foldKey must normalize diacritics");

const halves = bilingualHalves("Stockel / Stokkel");
assert(halves.fr === "Stockel" && halves.nl === "Stokkel", "bilingualHalves must split FR/NL");
const singleHalves = bilingualHalves("Simonis");
assert(singleHalves.fr === "Simonis" && singleHalves.nl === "Simonis", "same-in-both-languages names fold to themselves for both halves");

// Dogfood station list comes from the catalog, not a live parse.
const dogfoodStations = listBrusselsDogfoodStations();
assert(dogfoodStations.length === 60, `dogfood stations must be the 60 catalog entries, got ${dogfoodStations.length}`);

// Dogfood directions at a metro-only station are the static marketing labels — no network
// involved (no SNCB source at this station, so the iRail branch is never taken), same as
// production's directionsFor()/getMultiCityDirections() dispatch.
const hubDogfoodDirections = await getBrusselsDogfoodDirections(BRUSSELS_HUB);
assert(hubDogfoodDirections.source === "brussels-marketing-ends", "directions source must be brussels-marketing-ends");
assert(
  JSON.stringify(hubDogfoodDirections.directions) === JSON.stringify(hubLabels),
  "dogfood directions must equal marketingLabelsForStation output"
);

// --- Credential-refusal path: no STIB_API_KEY in this process's environment (this gate never
// loads .env.local), no `rawResults` injected — fetchStationBoard must throw
// MissingStibCredentialsError before ever reaching the stubbed `fetch` above. Proves there is
// no timetable fallback for a missing key.
assert(!process.env.STIB_API_KEY, "this gate must run with STIB_API_KEY unset to prove the refusal path");
let missingKeyThrew = null;
try {
  await fetchStationBoard(BRUSSELS_HUB);
} catch (err) {
  missingKeyThrew = err;
}
assert(missingKeyThrew instanceof MissingStibCredentialsError, "missing STIB_API_KEY must throw MissingStibCredentialsError, not silently succeed");

// --- Live board (captured-live-shape fixture, LOCAL — no network) — self-referential-arrival,
// theoretical-time, and non-boarding-message filtering, exercised against
// qa/fixtures/brussels/waiting-times.json (real STIB point IDs/line IDs/destinations,
// documented synthetic edge-case rows). The fixture is handed to the REAL
// fetchStationBoard() via its `rawResults` option, so production's own
// mapWaitingTimesResults()/resolveTerminus()/marketingLabel() pipeline runs here — a change
// to that filtering fails this gate. Only the live STIB fetch itself is bypassed; the fetch
// stub at the top guarantees it is never reached.
const waitingTimesFixture = JSON.parse(
  readFileSync(join(ROOT, "qa/fixtures/brussels/waiting-times.json"), "utf8")
);

// Fixed clock, entirely local (no network, no live calendar to go stale against — unlike the
// pinned-clock bug this replaces, docs/jim-brief-brussels-gate-pinned-clock.md): every fixture
// departure is 19 Sep 2026 19:34 Brussels-local or later, so 19:00 is safely "before" all of
// them for the upcoming-trips filter (`liveDeparture > now`).
const now = new Date("2026-09-19T17:00:00.000Z");

const fetchFixtureBoard = (station, rawResults) => fetchStationBoard(station, { rawResults });

const hubBoard = await fetchFixtureBoard(BRUSSELS_HUB, waitingTimesFixture.artsLoiKunstWet);
assert(hubBoard.trips.length > 0, "Arts-Loi / Kunst-Wet board must have upcoming trips");
assert(hubBoard.realtime === "live", 'board must report realtime:"live" — no schedule-only board is ever served');
assertLiveBoardTripsHaveDisplayTimes(hubBoard, "brussels hub board");
assert(
  hubBoard.trips.every((trip) => !foldKey(trip.destination).includes(foldKey(BRUSSELS_HUB))),
  "no trip at the hub may show the hub itself as a destination"
);
assert(
  hubBoard.trips.some((trip) => trip.routeShortName === "1" && trip.destination === "1 + Stockel / Stokkel"),
  "hub board must show line 1 toward Stockel / Stokkel"
);
assert(
  !hubBoard.trips.some((trip) => trip.destination === "5 + Erasme / Erasmus" && trip.displayTime === "19:46"),
  "the synthetic 'Theoretical time' passing time (19:46) must be dropped, not shown as live"
);
// 16 raw passing times across the fixture's 8 (pointid, lineid) rows, minus the one synthetic
// "Theoretical time" row — proves exactly that row (and only that row) was dropped.
assert(hubBoard.trips.length === 15, `hub board must drop exactly the one theoretical-time row (expected 15 trips, got ${hubBoard.trips.length})`);

const simonisBoard = await fetchFixtureBoard("Simonis", waitingTimesFixture.simonis);
assert(simonisBoard.realtime === "live", "Simonis board must report realtime:\"live\"");
assert(
  !simonisBoard.trips.some((trip) => trip.destination === "2 + Simonis"),
  "Simonis board must never show 2 + Simonis (self-referential arrival)"
);
assert(
  !simonisBoard.trips.some((trip) => trip.rawDestination.startsWith("SIMONIS")),
  "Simonis board must never show a 'do not embark' or self-referential SIMONIS passing time"
);
assert(
  simonisBoard.trips.some((trip) => trip.destination === "6 + Roi Baudouin / Koning Boudewijn"),
  "Simonis board must show line 6 continuing to Roi Baudouin / Koning Boudewijn"
);
assert(
  !simonisBoard.trips.some(
    (trip) => trip.destination === "6 + Roi Baudouin / Koning Boudewijn" && trip.displayTime === "19:46"
  ),
  "the synthetic 'Do not embark' line-6 passing time (19:46) must be dropped, not shown as boardable"
);
assert(
  simonisBoard.trips.some((trip) => trip.destination === "2 + Elisabeth"),
  "Simonis board must show line 2 continuing to Elisabeth"
);
assert(simonisBoard.trips.length === 2, `Simonis board must show exactly 2 genuine boardable trips, got ${simonisBoard.trips.length}`);

const elisabethBoard = await fetchFixtureBoard("Elisabeth", waitingTimesFixture.elisabeth);
assert(elisabethBoard.realtime === "live", "Elisabeth board must report realtime:\"live\"");
assert(
  !elisabethBoard.trips.some((trip) => trip.destination.includes("+ Elisabeth")),
  "Elisabeth board must never show itself as a destination (self-referential arrival)"
);
assert(elisabethBoard.trips.length === 4, `Elisabeth board must show exactly the 4 genuine non-self-referential rows, got ${elisabethBoard.trips.length}`);

// mapWaitingTimesResults is exported for exactly this kind of direct pipeline test.
const directlyMapped = mapWaitingTimesResults(waitingTimesFixture.elisabeth, foldKey("Elisabeth"));
assert(directlyMapped.length === 4, "mapWaitingTimesResults must independently agree with fetchStationBoard's trip count for Elisabeth");

// End-to-end dogfood next-train, driven by the same fixture via the
// rawResults escape hatch — proves getBrusselsDogfoodNextTrain() is really
// running the production fetchStationBoard()/filter/map pipeline, not a copy.
const firstHubChip = "1 + Stockel / Stokkel";
const nextTrain = await getBrusselsDogfoodNextTrain({
  station: BRUSSELS_HUB,
  destination: firstHubChip,
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
  now,
  rawResults: waitingTimesFixture.artsLoiKunstWet,
});
assert(nextTrain.config?.destination === firstHubChip, "next-train destination must equal the chosen chip");
assert(nextTrain.next?.displayTime, "next-train must resolve a real upcoming departure from the fixture (fixed `now` predates every fixture time)");

// Same call through the live-city-api dispatch, end to end — proves the
// switch-case in directionsFor()/getMultiCityNextTrain() is wired now that
// brussels is in MULTI_CITY_IDS post-flip.
const dispatchedDirections = await getMultiCityDirections("brussels", BRUSSELS_HUB);
assert(
  JSON.stringify(dispatchedDirections.directions) === JSON.stringify(hubDogfoodDirections.directions),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "brussels-marketing-ends", "live-city-api dispatch source must be brussels-marketing-ends");

const dispatchedNextTrain = await getMultiCityNextTrain("brussels", {
  station: BRUSSELS_HUB,
  destination: firstHubChip,
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
  now,
  rawResults: waitingTimesFixture.artsLoiKunstWet,
});
assert(
  dispatchedNextTrain.config?.destination === firstHubChip,
  "dispatched next-train destination must equal the chosen chip"
);

let unknownThrew = false;
try {
  await fetchFixtureBoard("Not A Real Station", []);
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "fetchStationBoard must not silently succeed for an unknown station");

// --- Scheduled metro tail (20 Sep 2026, docs/jim-brief-brussels-scheduled-tail-and-sncb-grouping.md) ---
// The "Scheduled" status word itself, straight from train-times-core.js — a trip explicitly
// marked realtime:false must show the literal word "Scheduled" regardless of any
// scheduled/display time diff, and a trip with realtime:true or unset must be unaffected.
assert(
  enrichTripTiming({ scheduledDisplayTime: "19:26", displayTime: "19:26", realtime: false }).status === "Scheduled",
  "a trip marked realtime:false must show the status word Scheduled"
);
assert(
  enrichTripTiming({ scheduledDisplayTime: "19:26", displayTime: "19:26", realtime: true }).status === "On Time",
  "a trip marked realtime:true must use the normal on-time/delayed status logic, unaffected"
);
assert(
  enrichTripTiming({ scheduledDisplayTime: "19:26", displayTime: "19:26" }).status === "On Time",
  "a trip with no realtime field at all (every existing provider) must be unaffected"
);

// mapScheduledTailRow: reuses the exact live-row terminus/marketing pipeline, drops
// overlay/short-turn headsigns and self-referential arrivals exactly like mapWaitingTimesResults.
const stockelHubKey = foldKey(BRUSSELS_HUB);
const mappedStockel = mapScheduledTailRow(
  { routeShortName: "1", destination: "STOCKEL", liveDeparture: "2026-09-19T17:03:00.000Z", scheduledDeparture: "2026-09-19T17:03:00.000Z", displayTime: "19:03", scheduledDisplayTime: "19:03" },
  stockelHubKey
);
assert(mappedStockel?.destination === "1 + Stockel / Stokkel", "mapScheduledTailRow must reuse the live marketing label");
assert(mappedStockel?.realtime === false, "mapScheduledTailRow must mark every row realtime:false");
assert(mappedStockel?.mode === "metro" && mappedStockel?.agency === "STIB/MIVB", "mapScheduledTailRow rows must carry the same mode/agency tags as live metro rows");
assert(
  mapScheduledTailRow({ routeShortName: "1", destination: "RESERVE" }, stockelHubKey) === null,
  "mapScheduledTailRow must drop an overlay/depot headsign, same as the live pipeline"
);
assert(
  mapScheduledTailRow({ routeShortName: "1", destination: "ARTS-LOI" }, stockelHubKey) === null,
  "mapScheduledTailRow must drop a self-referential arrival at the requested station"
);

// appendScheduledMetroTail: never before/between a direction's own live rows, dedupes a
// near-duplicate, caps at SCHEDULED_TAIL_MAX_PER_DIRECTION.
const stockelKey = "1|1 + Stockel / Stokkel";
const syntheticCandidates = [
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:10:00.000Z" }, // before last live -> dropped
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:20:00.500Z" }, // within dedupe window of last live -> dropped
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:26:00.000Z" },
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:32:00.000Z" },
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:38:00.000Z" },
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:44:00.000Z" },
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:50:00.000Z" },
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:56:00.000Z" }, // 6th kept row
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T18:02:00.000Z" }, // 7th passing candidate -> dropped by the cap
];
const syntheticLive = [
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:03:00.000Z" },
  { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:20:00.000Z" },
];
const appended = appendScheduledMetroTail(syntheticLive, syntheticCandidates);
assert(appended.length === SCHEDULED_TAIL_MAX_PER_DIRECTION, `appendScheduledMetroTail must cap at ${SCHEDULED_TAIL_MAX_PER_DIRECTION} per direction, got ${appended.length}`);
assert(
  appended.every((trip) => new Date(trip.liveDeparture).getTime() > new Date("2026-09-19T17:21:30.000Z").getTime()),
  "appendScheduledMetroTail must never keep a row before or within the dedupe window of a direction's last live row"
);
assert(appended[0].liveDeparture === "2026-09-19T17:26:00.000Z", "the first kept tail row must be the one immediately after the last live row + dedupe window");
assert(
  !appended.some((trip) => trip.liveDeparture === "2026-09-19T18:02:00.000Z"),
  "a 7th otherwise-eligible candidate must be dropped by the per-direction cap"
);

// End-to-end tail against a tiny local GTFS fixture directory (offline — a plain directory
// path never touches the stubbed fetch above), reusing the real buildBoardForStops() pipeline.
const scheduledTailStaticData = loadGtfsStaticFromDirectory(
  join(ROOT, "qa/fixtures/brussels/gtfs"),
  { routeTypes: ["1"], includeRouteShortNames: BRUSSELS_METRO_SHORT_NAMES, timeZone: "Europe/Brussels" }
);
const tailNow = new Date("2026-09-19T17:00:00.000Z"); // 19:00 Brussels local

const tailNoLive = await fetchScheduledMetroTail(["8041"], [], stockelHubKey, {
  now: tailNow,
  staticData: scheduledTailStaticData,
});
assert(tailNoLive.length === 12, `with zero live rows, both directions must each contribute up to ${SCHEDULED_TAIL_MAX_PER_DIRECTION} tail rows (got ${tailNoLive.length})`);
assert(tailNoLive.every((trip) => trip.realtime === false), "every scheduled tail row must carry realtime:false");
assert(!tailNoLive.some((trip) => trip.destination.includes("RESERVE")), "the depot/overlay fixture trip must never appear as a tail row");

const tailWithLive = await fetchScheduledMetroTail(
  ["8041"],
  [
    { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:03:00.000Z" },
    { routeShortName: "1", destination: "1 + Stockel / Stokkel", liveDeparture: "2026-09-19T17:20:00.000Z" },
  ],
  stockelHubKey,
  { now: tailNow, staticData: scheduledTailStaticData }
);
assert(
  !tailWithLive.some((trip) => trip.destination === "1 + Stockel / Stokkel" && new Date(trip.liveDeparture) <= new Date("2026-09-19T17:20:00.000Z")),
  "the Stockel direction's tail must never include a row at or before its own last live row"
);
assert(
  tailWithLive.some((trip) => trip.destination === "1 + Gare de l'Ouest / Weststation"),
  "a direction with zero live rows this refresh must still get its own tail rows"
);

// fetchStationBoard() end to end: live fixture (STIB) + local static tail fixture combined —
// scheduled rows are additive, appear only after the fixture's own live rows, and STIB down
// still means zero scheduled rows (the tail is never reached — see below). hubBoard above (no
// staticData escape hatch) already proves the network-stubbed tail load fails silently and
// leaves the live board's trip count (15) completely unaffected.
const hubBoardTailed = await fetchStationBoard(BRUSSELS_HUB, {
  rawResults: waitingTimesFixture.artsLoiKunstWet,
  staticData: scheduledTailStaticData,
  now: new Date("2026-09-19T17:00:00.000Z"),
});
const scheduledRows = hubBoardTailed.trips.filter((trip) => trip.realtime === false);
assert(scheduledRows.length > 0, "a station with both a live fixture and a static tail fixture must actually show scheduled rows");
assert(
  hubBoardTailed.trips.filter((trip) => trip.realtime === true).length === hubBoard.trips.length,
  "adding the tail must never change or remove the existing live rows"
);
assert(hubBoardTailed.realtime === "live", "board-level realtime marker stays 'live' even with a scheduled tail mixed in");

// STIB down: proven above (missingKeyThrew) that fetchStationBoard throws before the tail is
// ever computed — restated here for this section's own readability.
assert(missingKeyThrew instanceof MissingStibCredentialsError, "STIB down must refuse the whole board before any scheduled row could ever be considered");

// --- SNCB/NMBS second source (iRail liveboard), shared stations only ------------------------

const GARE_CENTRALE = "Gare Centrale / Centraal Station";
const GARE_DU_MIDI = "Gare du Midi / Zuidstation";
const GARE_DE_L_OUEST = "Gare de l'Ouest / Weststation";
assert(
  JSON.stringify(Object.keys(SNCB_SHARED_STATION_IRAIL_NAMES).sort()) ===
    JSON.stringify([GARE_CENTRALE, GARE_DE_L_OUEST, GARE_DU_MIDI].sort()),
  "SNCB_SHARED_STATION_IRAIL_NAMES must be exactly the three oracle-report stations"
);
assert(SNCB_SHARED_STATION_IRAIL_NAMES[GARE_CENTRALE] === "Brussels-Central", "Gare Centrale must map to iRail's Brussels-Central");
assert(SNCB_SHARED_STATION_IRAIL_NAMES[GARE_DU_MIDI] === "Brussels-South/Brussels-Midi", "Gare du Midi must map to iRail's Brussels-South/Brussels-Midi");
assert(SNCB_SHARED_STATION_IRAIL_NAMES[GARE_DE_L_OUEST] === "Brussels-West", "Gare de l'Ouest must map to iRail's Brussels-West");

// Vehicle-type classification, direct unit test of the taxonomy every assertion below relies on.
assert(classifySncbVehicleType("IC") === "in", "IC must be in");
assert(classifySncbVehicleType("S") === "in", "bare S must still be in (defensive; live iRail never sends it)");
assert(classifySncbVehicleType("S1") === "in", "S1 (real live S-train sub-line code) must be in");
assert(classifySncbVehicleType("S2") === "in", "S2 must be in");
assert(classifySncbVehicleType("S3") === "in", "S3 must be in");
assert(classifySncbVehicleType("S8") === "in", "S8 must be in");
assert(classifySncbVehicleType("S10") === "in", "S10 must be in — this is the exact code Mark's live QA found silently dropped (PR #419)");
assert(classifySncbVehicleType("L") === "in", "L must be in");
assert(classifySncbVehicleType("P") === "in", "P must be in");
assert(classifySncbVehicleType("EXTRA") === "in", "EXTRA must be in");
assert(classifySncbVehicleType("EXT") === "in", "EXT must be in");
assert(classifySncbVehicleType("ICT") === "in", "ICT must be in");
assert(classifySncbVehicleType("ICE") === "in", "ICE must be in (optional reservation outside summer peak)");
assert(classifySncbVehicleType("EC") === "in", "EuroCity (EC) must be in per the board-eligibility addendum");
assert(classifySncbVehicleType("ECD") === "in", "EuroCity Direct (ECD) must be in per the board-eligibility addendum");
assert(classifySncbVehicleType("EUR") === "out-checkin", "Eurostar (EUR) must be out-checkin");
assert(classifySncbVehicleType("EST") === "out-checkin", "EST (Eurostar alt code) must be out-checkin");
assert(classifySncbVehicleType("THA") === "out-reservation", "Thalys (THA) must be out-reservation");
assert(classifySncbVehicleType("TGV") === "out-reservation", "TGV INOUI must be out-reservation");
assert(classifySncbVehicleType("OUI") === "out-reservation", "OUIGO must be out-reservation");
assert(classifySncbVehicleType("IZY") === "out-reservation", "IZY (OUIGO family) must be out-reservation");
assert(classifySncbVehicleType("NJ") === "out-reservation", "Nightjet must be out-reservation");
assert(classifySncbVehicleType("EN") === "out-reservation", "European Sleeper (EN) must be out-reservation");
assert(classifySncbVehicleType("ES") === "out-reservation", "European Sleeper (ES) must be out-reservation");
assert(classifySncbVehicleType("BUS") === "out-mode", "rail-replacement BUS (real live type at Brussels-South) must be out-mode, not unmapped");
assert(classifySncbVehicleType("SOMETHING-UNKNOWN") === "unmapped", "an unrecognised type must classify as unmapped");
assert(isSncbBoardEligible("SOMETHING-UNKNOWN") === false, "an unmapped type must never be board-eligible (safe default)");

// Silent-drop detection: mapIrailDepartures must surface any genuinely unmapped type via its
// `unmapped` property, and this gate fails the run if any does — a real captured fixture row
// falling into "unmapped" is exactly the class of bug this pass fixes (S10 etc. previously did).
const unmappedDemo = mapIrailDepartures(
  [
    {
      id: "x",
      station: "Nowhere",
      time: "1789845300",
      delay: "0",
      canceled: "0",
      left: "0",
      vehicleinfo: { type: "SOMETHING-UNKNOWN", shortname: "SOMETHING-UNKNOWN1" },
    },
  ],
  { timeZone: "Europe/Brussels" }
);
assert(
  unmappedDemo.unmapped.length === 1 && unmappedDemo.unmapped[0].type === "SOMETHING-UNKNOWN",
  "mapIrailDepartures must surface an unmapped type via its unmapped property, not just silently drop it"
);

const irailFixture = JSON.parse(readFileSync(join(ROOT, "qa/fixtures/brussels/irail-liveboard.json"), "utf8"));

const fetchFixtureBoardWithSncb = (station, rawResults, irailRawDepartures) =>
  fetchStationBoard(station, { rawResults, irailRawDepartures });

// Gare Centrale: metro (lines 1, 5) AND SNCB, in separate mode groups, forbidden internationals
// filtered, canceled/already-left rows dropped.
const gareCentraleBoard = await fetchFixtureBoardWithSncb(
  GARE_CENTRALE,
  waitingTimesFixture.gareCentrale,
  irailFixture.gareCentrale
);
assert(gareCentraleBoard.realtime === "live", "Gare Centrale board must report realtime:\"live\"");
assert(gareCentraleBoard.partial === false, "Gare Centrale board must not be partial when iRail succeeds");
const gcMetro = gareCentraleBoard.trips.filter((t) => t.mode === "metro");
const gcRail = gareCentraleBoard.trips.filter((t) => t.mode === "rail");
assert(gcMetro.length > 0, "Gare Centrale board must show metro departures");
assert(gcRail.length > 0, "Gare Centrale board must show SNCB departures");
assert(
  gcMetro.every((t) => t.agency === "STIB/MIVB") && gcRail.every((t) => t.agency === "SNCB/NMBS"),
  "metro and SNCB rows must carry distinct agency tags — never merged into one group"
);
assert(gcRail.some((t) => t.routeShortName === "IC"), "Gare Centrale must show an IC departure");
assert(
  gcRail.some((t) => /^S\d+$/.test(t.routeShortName)),
  "Gare Centrale must show a real S-number departure (S1/S2/S3/S8/S10), not a bare S"
);
assert(gcRail.some((t) => t.routeShortName === "EC"), "Gare Centrale must show the EC (EuroCity) departure (in, per addendum)");
assert(
  !gcRail.some((t) => ["THA", "EUR", "TGV", "OUI", "OUIGO", "NJ", "NIGHTJET", "EN", "ES", "BUS"].includes(t.routeShortName)),
  "no Eurostar/Thalys/TGV/OUIGO/Nightjet/European Sleeper/rail-replacement-bus row may ever appear on the board"
);
assert(
  gcRail.filter((t) => t.routeShortName === "IC").length === 2,
  "the canceled and already-left IC fixture rows must both be dropped, leaving exactly the two genuine IC departures (Brussels Airport + the Part 3 Kortrijk addition)"
);
assert(
  gcRail.length === 8,
  `Gare Centrale must show exactly the 8 board-eligible SNCB rows (live-captured S10/S1/S8/S3/EC/IC/S2 + the Part 3 Kortrijk IC addition), got ${gcRail.length}`
);
assertLiveBoardTripsHaveDisplayTimes(gareCentraleBoard, "Gare Centrale board");
assert(
  (mapIrailDepartures(irailFixture.gareCentrale, { timeZone: "Europe/Brussels" }).unmapped ?? []).length === 0,
  "Gare Centrale's captured-live iRail fixture must produce zero unmapped vehicle types"
);

// --- SNCB directions in /api/directions (Part C, docs/jim-brief-brussels-horizon-and-sncb-directions.md) ---

assert(sncbDirectionLabel({ routeShortName: "IC", destination: "Oostende" }) === "IC + Oostende", "sncbDirectionLabel must build 'type + destination' chips");
assert(sncbDirectionLabel({ routeShortName: "", destination: "Oostende" }) === null, "sncbDirectionLabel must not fabricate a chip with no type");
assert(sncbDirectionLabel({ routeShortName: "IC", destination: "" }) === null, "sncbDirectionLabel must not fabricate a chip with no destination");
assert(
  tripMatchesSncbDirectionChip({ routeShortName: "ic", destination: "oostende" }, "IC + Oostende"),
  "tripMatchesSncbDirectionChip must fold case"
);

const gareCentraleDirections = await getBrusselsDogfoodDirections(GARE_CENTRALE, {
  irailRawDepartures: irailFixture.gareCentrale,
});
assert(
  gareCentraleDirections.source === "brussels-marketing-ends+sncb-irail",
  "Gare Centrale directions source must record both the metro and SNCB sources when iRail succeeds"
);
assert(
  gareCentraleDirections.directions.includes("5 + Herrmann-Debroux"),
  "Gare Centrale directions must still include its metro chips"
);
assert(
  gareCentraleDirections.directions.includes("IC + Brussels Airport - Zaventem"),
  "Gare Centrale directions must include the genuine (non-canceled, non-departed) IC chip"
);
assert(
  gareCentraleDirections.directions.includes("S10 + Aalst"),
  "Gare Centrale directions must include an S-train chip built from the live fixture"
);
assert(
  !gareCentraleDirections.directions.includes("IC + Oostende"),
  "Gare Centrale directions must never include a chip built from a canceled or already-departed row"
);
assert(
  !gareCentraleDirections.directions.some((chip) => /^(THA|TGV|OUI|OUIGO|NJ|NIGHTJET|EN|ES|EUR|BUS) \+/.test(chip)),
  "Gare Centrale directions must never include an out-reservation/out-checkin/out-mode chip"
);

// --- SNCB chip grouping (Part 3, 20 Sep 2026, docs/jim-brief-brussels-scheduled-tail-and-sncb-grouping.md) ---

assert(sncbCorridorForDestination("Oostende") === "Ghent / Bruges / Ostend", "Oostende must resolve to the Ghent/Bruges/Ostend corridor");
assert(sncbCorridorForDestination("Antwerpen-Centraal") === "Antwerp", "Antwerpen-Centraal must resolve to the Antwerp corridor");
assert(sncbCorridorForDestination("Lëtzebuerg") === "Namur / Luxembourg", "iRail's Luxembourgish spelling must still resolve to the Namur/Luxembourg corridor");
assert(sncbCorridorForDestination("Nowhere Made Up") === null, "an unrecognised destination must never be force-fit into a corridor");
assert(SNCB_CORRIDORS.length === 5, "there must be exactly 5 named SNCB corridors");
for (const type of SNCB_INTERCITY_TYPES) {
  assert(["IC", "EC", "ECD", "ICE", "ICT"].includes(type), `unexpected type in SNCB_INTERCITY_TYPES: ${type}`);
}

// An InterCity trip toward a corridor destination collapses to the corridor label; a suburban
// (S-train) trip toward the SAME destination string does NOT — grouping is type-gated, never
// destination-only, which is what keeps it direction-safe (file header rationale).
assert(groupedSncbDirectionLabel({ routeShortName: "IC", destination: "Oostende" }) === "Ghent / Bruges / Ostend", "an IC trip to a corridor destination must collapse to the corridor label");
assert(groupedSncbDirectionLabel({ routeShortName: "EC", destination: "Genk" }) === "Leuven / Liège", "an EC trip to a corridor destination must also collapse (not just IC)");
assert(groupedSncbDirectionLabel({ routeShortName: "S8", destination: "Zottegem" }) === "S8 + Zottegem", "a suburban S-train trip must never be corridor-grouped, even toward a corridor-listed station");
assert(groupedSncbDirectionLabel({ routeShortName: "IC", destination: "Brussels Airport - Zaventem" }) === "IC + Brussels Airport - Zaventem", "an IC destination with no corridor match must fall back to the ungrouped chip, not be hidden or misclassified");
assert(
  tripMatchesGroupedSncbDirectionChip({ routeShortName: "IC", destination: "Kortrijk" }, "Ghent / Bruges / Ostend"),
  "tripMatchesGroupedSncbDirectionChip must match an IC trip against its corridor chip"
);
assert(
  !tripMatchesGroupedSncbDirectionChip({ routeShortName: "S3", destination: "Denderleeuw" }, "Ghent / Bruges / Ostend"),
  "tripMatchesGroupedSncbDirectionChip must never match a suburban trip against a corridor chip"
);

// Live-shape reduction, driven by the real 20 Sep 2026 iRail capture — grouping must shrink the
// chip count without hiding any of the named corridors or the S-train chips.
const gareCentraleUngroupedChips = new Set();
const gareCentraleTripsForGrouping = mapIrailDepartures(irailFixture.gareCentrale, { timeZone: "Europe/Brussels" });
for (const trip of gareCentraleTripsForGrouping) {
  const label = sncbDirectionLabel(trip);
  if (label) {
    gareCentraleUngroupedChips.add(label);
  }
}
const gareCentraleSncbChips = gareCentraleDirections.directions.filter((chip) => !/^[1256] \+/.test(chip));
assert(
  gareCentraleSncbChips.length <= gareCentraleUngroupedChips.size,
  `grouping must never increase the SNCB chip count (ungrouped ${gareCentraleUngroupedChips.size}, grouped ${gareCentraleSncbChips.length})`
);
assert(gareCentraleSncbChips.includes("S10 + Aalst"), "S-train chips must survive grouping unchanged");
assert(
  !gareCentraleSncbChips.some((chip) => SNCB_CORRIDORS.some((c) => c.label !== chip && foldKey(chip).includes(foldKey(c.label)))),
  "no chip may accidentally contain another corridor's label as a substring (label collision check)"
);

// Metro first, then SNCB — never interleaved (doNotGroup-by-mode ordering requirement).
const firstSncbIndex = gareCentraleDirections.directions.findIndex((chip) => !/^[1256] \+/.test(chip));
const lastMetroIndex = gareCentraleDirections.directions.reduce(
  (acc, chip, index) => (/^[1256] \+/.test(chip) ? index : acc),
  -1
);
assert(firstSncbIndex === -1 || lastMetroIndex < firstSncbIndex, "every metro chip must come before every SNCB chip in /api/directions — never interleaved");

// End-to-end next-train through a grouped corridor chip — proves the corridor label actually
// resolves a real upcoming departure, not just that the label exists.
const corridorChip = "Ghent / Bruges / Ostend";
assert(gareCentraleDirections.directions.includes(corridorChip), "Gare Centrale directions must include the Ghent/Bruges/Ostend corridor chip");
const corridorNextTrain = await getBrusselsDogfoodNextTrain({
  station: GARE_CENTRALE,
  destination: corridorChip,
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
  now,
  rawResults: waitingTimesFixture.gareCentrale,
  irailRawDepartures: irailFixture.gareCentrale,
});
assert(corridorNextTrain.config?.destination === corridorChip, "corridor next-train destination must equal the chosen corridor chip");
assert(corridorNextTrain.next?.displayTime, "corridor next-train must resolve a real upcoming departure from an IC trip toward that corridor");

// A metro-only station (no SNCB source at all) must never gain an SNCB chip, and iRail is never
// even called for it (no irailStationName match — see getBrusselsDogfoodDirections).
assert(
  !hubDogfoodDirections.directions.some((chip) => / \+ /.test(chip) && !chip.match(/^[1256] \+/)),
  "Arts-Loi / Kunst-Wet directions must only ever carry metro (1/2/5/6) chips"
);

// iRail down for directions: no `irailRawDepartures` supplied at a shared station, so the real
// (stubbed) network path throws — directions must still return the metro chips only, silently
// (no error surfaced to the caller), matching the board's own partial-source degrade posture.
const gareCentraleDirectionsIrailDown = await getBrusselsDogfoodDirections(GARE_CENTRALE);
assert(
  gareCentraleDirectionsIrailDown.source === "brussels-marketing-ends",
  "Gare Centrale directions must fall back to metro-only source when iRail is unavailable"
);
assert(
  gareCentraleDirectionsIrailDown.directions.every((chip) => /^[1256] \+/.test(chip)),
  "Gare Centrale directions must contain only metro chips when iRail is down"
);

// End-to-end next-train for an SNCB direction chip, through the same fixture escape hatches —
// proves getBrusselsDogfoodNextTrain() resolves a real upcoming SNCB departure, not just a
// metro one.
const sncbChip = "IC + Brussels Airport - Zaventem";
const sncbNextTrain = await getBrusselsDogfoodNextTrain({
  station: GARE_CENTRALE,
  destination: sncbChip,
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
  now,
  rawResults: waitingTimesFixture.gareCentrale,
  irailRawDepartures: irailFixture.gareCentrale,
});
assert(sncbNextTrain.config?.destination === sncbChip, "SNCB next-train destination must equal the chosen chip");
assert(sncbNextTrain.next?.displayTime, "SNCB next-train must resolve a real upcoming departure from the iRail fixture");

// Gare du Midi: ICE is `in`, EUR is out-checkin, THA/TGV/OUI/NJ/ES are out-reservation, BUS is
// out-mode, L/S8/S10/ECD are all in (S8/S10/ECD are real live-captured rows).
const gareDuMidiBoard = await fetchFixtureBoardWithSncb(
  GARE_DU_MIDI,
  [],
  irailFixture.gareDuMidi
);
const midiRail = gareDuMidiBoard.trips.filter((t) => t.mode === "rail");
assert(midiRail.some((t) => t.routeShortName === "ICE"), "Gare du Midi must show the ICE departure (in)");
assert(midiRail.some((t) => t.routeShortName === "L"), "Gare du Midi must show the L departure (in)");
assert(midiRail.some((t) => t.routeShortName === "ECD"), "Gare du Midi must show the ECD (EuroCity Direct) departure (in, per addendum)");
assert(
  midiRail.some((t) => /^S\d+$/.test(t.routeShortName)),
  "Gare du Midi must show a real S-number departure (S8/S10), not a bare S"
);
assert(
  !midiRail.some((t) => ["TGV", "OUI", "NJ", "EN", "ES", "THA", "EUR", "BUS"].includes(t.routeShortName)),
  "Gare du Midi must never show TGV/OUIGO/Nightjet/European Sleeper/Eurostar/rail-replacement-bus"
);
assert(
  midiRail.length === 6,
  `Gare du Midi must show exactly 6 board-eligible SNCB rows (IC + S8 + ECD + S10 + ICE + L), got ${midiRail.length}`
);
assert(
  (mapIrailDepartures(irailFixture.gareDuMidi, { timeZone: "Europe/Brussels" }).unmapped ?? []).length === 0,
  "Gare du Midi's captured-live iRail fixture must produce zero unmapped vehicle types"
);

// Gare de l'Ouest: P, ICT and a real-shaped S-number row are all in.
const gareDeLOuestBoard = await fetchFixtureBoardWithSncb(
  GARE_DE_L_OUEST,
  [],
  irailFixture.gareDeLOuest
);
const ouestRail = gareDeLOuestBoard.trips.filter((t) => t.mode === "rail");
assert(ouestRail.some((t) => t.routeShortName === "P"), "Gare de l'Ouest must show the P departure (in)");
assert(ouestRail.some((t) => t.routeShortName === "ICT"), "Gare de l'Ouest must show the ICT departure (in)");
assert(
  ouestRail.some((t) => /^S\d+$/.test(t.routeShortName)),
  "Gare de l'Ouest must show a real S-number departure, matching the live S10-only traffic Mark observed"
);
assert(ouestRail.length === 3, `Gare de l'Ouest must show exactly 3 board-eligible SNCB rows (P + ICT + S10), got ${ouestRail.length}`);
assert(
  (mapIrailDepartures(irailFixture.gareDeLOuest, { timeZone: "Europe/Brussels" }).unmapped ?? []).length === 0,
  "Gare de l'Ouest's iRail fixture must produce zero unmapped vehicle types"
);

// A metro-only station (no SNCB source at all) must never show a rail row and must never be
// marked partial, regardless of iRail's own state.
assert(hubBoard.trips.every((t) => t.mode !== "rail"), "Arts-Loi / Kunst-Wet must never show an SNCB row (not a shared station)");
assert(hubBoard.partial === false, "a metro-only station must never report partial");
assert(simonisBoard.trips.every((t) => t.mode !== "rail"), "Simonis must never show an SNCB row");
assert(elisabethBoard.trips.every((t) => t.mode !== "rail"), "Elisabeth must never show an SNCB row");

// iRail down: no `irailRawDepartures` supplied at a shared station, so the real (stubbed)
// network path is hit and throws — the board must still serve its metro rows, flagged partial,
// never refused. STIB down still refuses the whole board regardless (unchanged, proven above by
// the missing-key assertion, which throws before ever reaching the SNCB branch).
const gareCentraleIrailDownBoard = await fetchStationBoard(GARE_CENTRALE, {
  rawResults: waitingTimesFixture.gareCentrale,
});
assert(gareCentraleIrailDownBoard.partial === true, "iRail down must flag the board partial");
assert(
  gareCentraleIrailDownBoard.trips.every((t) => t.mode !== "rail"),
  "iRail down must omit every SNCB row"
);
assert(
  gareCentraleIrailDownBoard.trips.some((t) => t.mode === "metro"),
  "iRail down must still serve the metro rows unaffected"
);
assertLiveBoardTripsHaveDisplayTimes(gareCentraleIrailDownBoard, "Gare Centrale board (iRail down)");

console.log(
  "brussels-dogfood-gate: ok (live/200 post-flip, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack + fixture, 60 stations, Simonis/Elisabeth distinct, hub never a chip, live board via BMC Waiting Times (captured-live fixture, no network), self-referential-arrival + theoretical-time + do-not-embark filtering, missing-key refusal path proven, scheduled metro tail (Scheduled status word, mapScheduledTailRow/appendScheduledMetroTail cap+dedupe+never-before-live, end-to-end against a local GTFS fixture directory, network-stubbed tail load fails silently leaving live rows byte-identical, STIB-down proven to refuse before the tail is ever reached), SNCB second source at the 3 shared stations (iRail fixture, no network) — doNotGroup-by-mode, forbidden-internationals filtered, ICE in, iRail-down degrades to partial rather than refusing, metro-only stations never partial/never show SNCB, SNCB directions surfaced in /api/directions at the 3 shared stations ('type + destination' chips, canceled/departed/out-of-scope rows never fabricate a chip, iRail-down falls back to metro-only chips silently) with a matching end-to-end next-train resolution, SNCB corridor grouping (IC/EC/ECD/ICE/ICT only, never S/L/P, metro-first ordering, no chip-count increase, end-to-end next-train through a corridor chip), Perth/Stockholm/Göteborg/Malmö/Uppsala green)"
);
