/**
 * Brussels adapter/dispatch wiring gate. Replaces brussels-planned-gate.mjs
 * (retired) — Brussels STAYS `status: "planned"` here (this is the pre-flip
 * dogfood wiring pass, docs/brussels-d1/jim-handoff.md "Flip follow-through"
 * section). Per CLAUDE.md's flip-follow-through split (added 30 Aug 2026,
 * corrected same day): the dogfood module, the live-city-api.js dispatch
 * switch-cases, and this gate are safe to land ahead of the flip because
 * production routes gate on assertCityLive() first, not on MULTI_CITY_IDS
 * membership. Brussels is deliberately NOT added to MULTI_CITY_IDS,
 * brisbane-dogfood.js's mount/available map, or journey-model.js's
 * persisted-city/country lists yet — those three list-membership edits are
 * Mark's flip commit, not this one (qa/live-city-lists-sync.mjs enforces
 * that they equal the registry's live set). See
 * docs/brussels-d1/jim-handoff.md for the exact note left for Mark.
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
 * Single agency (STIB/MIVB metro 1/2/5/6) — no second-agency
 * throws-a-documented-error shape here (unlike South Yorkshire/Glasgow/
 * Edinburgh's National-Rail-plus-unconfirmed-tram pairs). SNCB/NMBS is `in`
 * per docs/brussels-d1/oracle-clash-report.md's Board eligibility section
 * but is NOT wired at all yet (no catalog entry, no dispatch case) — see
 * lib/cities/brussels/dogfood-next-train.js file header for why, and the
 * registry `notes` for Mark. This gate does not assert anything about SNCB
 * beyond confirming it is absent from the catalog (so Mark's QA correctly
 * holds the flip until it lands or a decision is recorded to launch
 * without it).
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
  BRUSSELS_METRO_SHORT_NAMES,
  MissingStibCredentialsError,
} from "../lib/providers/brussels.js";
import {
  marketingLabelsForStation,
  mapBrusselsDestination,
  resolveTerminus,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  bilingualHalves,
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

// Registry identity — STAYS planned (Mark/Tim's flip call, not made here).
const live = assertCityLive("brussels");
assert(live?.ok === false, "assertCityLive(brussels) must fail — status is still planned");
assert(live?.status === 501, "brussels must be 501 planned");

const entry = getCity("brussels");
assert(entry?.status === "planned", "brussels registry status must stay planned");
assert(entry?.adapterReady === true, "brussels adapterReady must be true");
assert(entry?.displayName === "Brussels", "brussels display name must be Brussels");
assert(entry?.timeZone === "Europe/Brussels", "brussels timezone must be Europe/Brussels");
assert(CITIES.filter((city) => city.id === "brussels").length === 1, "brussels must appear once in the registry");
for (const forbiddenId of ["bru", "bruxelles", "stib", "belgium"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// NOT yet in MULTI_CITY_IDS — that's Mark's flip commit, not this pass.
assert(
  isMultiCity("brussels") === false,
  "brussels must NOT be in MULTI_CITY_IDS yet — that's Mark's flip commit"
);

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

// Dogfood directions are the static marketing labels — no network involved,
// same as production's directionsFor()/getMultiCityDirections() dispatch.
const hubDogfoodDirections = getBrusselsDogfoodDirections(BRUSSELS_HUB);
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
// switch-case in directionsFor()/getMultiCityNextTrain() is wired, even
// though brussels is deliberately not in MULTI_CITY_IDS yet.
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

console.log(
  "brussels-dogfood-gate: ok (planned/501, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired, D1 pack + fixture, 60 stations, Simonis/Elisabeth distinct, hub never a chip, live board via BMC Waiting Times (captured-live fixture, no network), self-referential-arrival + theoretical-time + do-not-embark filtering, missing-key refusal path proven, SNCB absent from catalog (in per pack, not yet wired — see registry notes), Perth/Stockholm/Göteborg/Malmö/Uppsala green)"
);
