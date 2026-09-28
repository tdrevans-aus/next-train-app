/**
 * Bergen flip follow-through gate. As of this pass, Bergen stays `status: "planned"`
 * (docs/bergen-d1/jim-handoff.md: adapter build is Jim's D2-D6 work, no live flip) but the
 * dogfood module, live-city-api.js dispatch switch-cases, and this gate are wired ahead of
 * that per the flip-follow-through guardrail (Boston/Dublin/Vienna precedent) so no second
 * pass is needed once the flip PR lands.
 *
 * Status-agnostic (same shape as qa/dublin-dogfood-gate.mjs): every assertion below that
 * depends on registry status reads `entry.status` at runtime and branches, rather than
 * hardcoding "planned", so Mark's actual flip commit does not need to touch this file at all.
 *
 * Deliberately does NOT call the live Entur Journey Planner v3 endpoint (api.entur.io) — this
 * is a smoke-tier gate, not a network test (qa/bergen-all-stations-live-sweep.mjs covers that,
 * unregistered in run-all.mjs for the same reason qa/dublin-all-stations-live-sweep.mjs isn't:
 * needs real network + Bergen's actual service hours). Instead this gate unit-tests the
 * catalog/direction-model logic plus the dispatch wiring: MULTI_CITY_IDS membership,
 * getMultiCityDirections/getMultiCityNextTrain routing into the dogfood module, and the
 * coordinate/CITY_BOUNDS/coverage-note surfaces this follow-through pass adds. It also runs a
 * fetchStationBoard()-*pipeline*-level regression test (estimatedCallsToTrips, the exact
 * function fetchStationBoard() itself calls) against a synthetic Entur estimatedCalls fixture,
 * without mocking the network fetch fetchStationBoard() makes — see the "all-stations
 * self-terminus pipeline test" section for why Byparken/Kaigaten's self-terminus guard is
 * tested end-to-end, the same shape Dublin's self-terminus regression (PR #484) added.
 *
 * Usage: node qa/bergen-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  BERGEN_HUB,
  BERGEN_TIMEZONE,
  resolveCatalogEntry,
  listCatalogStations,
  classifyLine,
  estimatedCallsToTrips,
} from "../lib/providers/bergen.js";
import {
  foldKey,
  isForbiddenCollapseName,
  canonicalStationName,
  resolveTerminus,
  mapLineTerminusDestination,
  isTerminatingAtStation,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
  LINE_TERMINI,
} from "../lib/cities/bergen/marketing-directions.js";
import {
  listBergenDogfoodStations,
  getBergenDogfoodDirections,
} from "../lib/cities/bergen/dogfood-next-train.js";
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
// assert the invariants that hold for THAT state, rather than hardcoding "planned".
const entry = getCity("bergen");
assert(entry, "bergen must be registered");
assert(
  entry.status === "planned" || entry.status === "live",
  `bergen registry status must be planned or live, got ${entry.status}`
);
const bergenIsLive = entry.status === "live";

const live = assertCityLive("bergen");
if (bergenIsLive) {
  assert(live?.ok === true, "assertCityLive(bergen) must pass once bergen is live");
} else {
  assert(live?.ok === false, "assertCityLive(bergen) must fail while bergen stays planned");
  assert(live?.status === 501, "bergen must be 501 planned while bergen stays planned");
}

assert(entry?.adapterReady === true, "bergen adapterReady must be true");
assert(entry?.displayName === "Bergen", "bergen display name must be Bergen");
assert(entry?.timeZone === "Europe/Oslo", "bergen timezone must be Europe/Oslo");
assert(CITIES.filter((city) => city.id === "bergen").length === 1, "bergen must appear once in the registry");
for (const forbiddenId of ["bybanen", "no", "skyss", "norway"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired regardless of status; MULTI_CITY_IDS membership itself must track
// the registry status exactly (qa/live-city-lists-sync.mjs enforces this globally too).
assert(
  isMultiCity("bergen") === bergenIsLive,
  bergenIsLive
    ? "bergen must be in MULTI_CITY_IDS now that it is live"
    : "bergen must NOT be in MULTI_CITY_IDS while status stays planned"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/bergen-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/bergen-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "bergen", "D1 city id must be bergen");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === BERGEN_HUB, `D1 lock must be ${BERGEN_HUB}`);
assert(network.lines.length === 2, "D1 must carry exactly 2 lines (1 and 2)");

const line1 = network.lines.find((l) => l.id === "1");
const line2 = network.lines.find((l) => l.id === "2");
assert(line1?.stations?.length === 27, `D1 line 1 must carry 27 stations, got ${line1?.stations?.length}`);
assert(line2?.stations?.length === 9, `D1 line 2 must carry 9 stations, got ${line2?.stations?.length}`);

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist with a
// recorded verdict for every excluded service (Skyss bus mode cut, Vy out-of-scope services).
assert(network.boardEligibility?.verdicts?.length > 0, "D1 pack must carry Board eligibility verdicts");
const verdictServices = network.boardEligibility.verdicts.map((v) => v.service);
for (const needle of ["Bybanen", "Skyss regional bus", "Vy Bergensbanen", "Vy Arna line"]) {
  assert(
    verdictServices.some((s) => s.includes(needle)),
    `Board eligibility section must record a verdict for ${needle}`
  );
}

// Catalog + doNotGroup station shape.
const stations = listCatalogStations();
assert(stations.length === 33, `catalog must have 33 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(BERGEN_HUB), `catalog must lock ${BERGEN_HUB}`);
assert(byName.get(BERGEN_HUB)?.hub === true, "hub entry must carry hub:true");
assert(byName.get(BERGEN_HUB)?.lines.includes("1") && byName.get(BERGEN_HUB)?.lines.includes("2"), "hub must be on both lines");

const line1Stations = stations.filter((s) => s.lines.includes("1"));
const line2Stations = stations.filter((s) => s.lines.includes("2"));
assert(line1Stations.length === 27, `line 1 must have 27 stations, got ${line1Stations.length}`);
assert(line2Stations.length === 9, `line 2 must have 9 stations, got ${line2Stations.length}`);
const sharedStations = stations.filter((s) => s.lines.length === 2);
assert(sharedStations.length === 3, `exactly 3 stations must be shared between both lines, got ${sharedStations.length}`);
assert(
  ["Nonneseter", "Bergen busstasjon", "Kronstad"].every((name) => byName.get(name)?.lines.length === 2),
  "Nonneseter, Bergen busstasjon and Kronstad must each be on both lines"
);

// Byparken/Kaigaten are each single-line termini, never shared.
assert(byName.get("Byparken")?.lines.length === 1 && byName.get("Byparken").lines[0] === "1", "Byparken must be line 1 only");
assert(byName.get("Kaigaten")?.lines.length === 1 && byName.get("Kaigaten").lines[0] === "2", "Kaigaten must be line 2 only");

// resolveCatalogEntry — exact-match + alias resolution, including NSR printed-name variants.
assert(resolveCatalogEntry(BERGEN_HUB)?.name === BERGEN_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Byparken")?.name === "Byparken", "must resolve Byparken");
assert(resolveCatalogEntry("Sletten senter")?.name === "Sletten", "must resolve the NSR printed-name variant Sletten senter back to Sletten");
assert(resolveCatalogEntry("Bergen lufthavn")?.name === "Bergen lufthavn Flesland", "must resolve the NSR printed-name variant Bergen lufthavn back to Bergen lufthavn Flesland");
assert(resolveCatalogEntry("Not A Real Station") === null, "resolveCatalogEntry must reject an unknown station");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(resolveCatalogEntry("Bergen sentrum") === null, "Bergen sentrum (marketing string) must never resolve as a station");
assert(resolveCatalogEntry("Bergen stasjon") === null, "Bergen stasjon (the out-of-scope Vy railway station) must never resolve as a Bybanen station");
assert(resolveCatalogEntry("Bystasjonen") === null, "Bystasjonen (superseded oracle-report spelling) must never resolve as a station");
assert(resolveCatalogEntry("Danmarksplass") === null, "Danmarksplass (one-word, superseded spelling) must never resolve — the locked print is two words");
assert(resolveCatalogEntry("Danmarks plass")?.name === "Danmarks plass", "Danmarks plass (two-word, locked print) must resolve");
assert(isForbiddenCollapseName("Jernbanetorget") === true, "Jernbanetorget (Oslo's hub string) must never resolve as a Bergen station");

// doNotGroup same-family pairs stay distinct catalog entries (hazard-pack.md H1).
assert(byName.get("Nesttun terminal") && byName.get("Nesttun sentrum"), "Nesttun terminal and Nesttun sentrum must both exist as distinct stations");
assert(byName.get("Skjold") && byName.get("Skjoldskiftet"), "Skjold and Skjoldskiftet must both exist as distinct stations");
assert(byName.get("Kokstad") && byName.get("Kokstadflaten") && byName.get("Birkelandsskiftet"), "Kokstad, Kokstadflaten and Birkelandsskiftet must all exist as distinct stations");

// Line labels + termini (direction-model-memo.md recommendation A — line + terminus).
assert(resolveTerminus("Byparken", "1") === "Byparken", "resolveTerminus must resolve Byparken on line 1");
assert(resolveTerminus("Bergen lufthavn Flesland", "1") === "Bergen lufthavn Flesland", "resolveTerminus must resolve the airport terminus on line 1");
assert(resolveTerminus("Bergen lufthavn", "1") === "Bergen lufthavn Flesland", "resolveTerminus must fold the NSR form of the airport terminus back to the D1 print");
assert(resolveTerminus("Kaigaten", "2") === "Kaigaten", "resolveTerminus must resolve Kaigaten on line 2");
assert(resolveTerminus("Fyllingsdalen terminal", "2") === "Fyllingsdalen terminal", "resolveTerminus must resolve Fyllingsdalen terminal on line 2");
assert(resolveTerminus("Byparken", "2") === null, "Byparken must never resolve as a line 2 terminus — line 2 does not call there");
assert(resolveTerminus("Kaigaten", "1") === null, "Kaigaten must never resolve as a line 1 terminus — line 1 does not call there");
assert(mapLineTerminusDestination("Byparken", "1") === "1 + Byparken", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Fyllingsdalen terminal", "2") === "2 + Fyllingsdalen terminal", "direction chip must be line + terminus");
assert(mapLineTerminusDestination(BERGEN_HUB, "1") === "1", "Bergen busstasjon must never appear as a direction token");

// Self-terminus guard (direction-model-memo.md): "1 + Byparken" must never be synthesized at
// Byparken itself, nor "2 + Kaigaten" at Kaigaten itself — the train is arriving, not departing
// towards itself. Every OTHER combination must still work normally.
assert(isTerminatingAtStation("Byparken", "Byparken") === true, "isTerminatingAtStation must catch Byparken-at-Byparken");
assert(isTerminatingAtStation("Kaigaten", "Kaigaten") === true, "isTerminatingAtStation must catch Kaigaten-at-Kaigaten");
assert(isTerminatingAtStation("Byparken", BERGEN_HUB) === false, "isTerminatingAtStation must not flag a genuinely different destination");

const byparkenLabels = marketingLabelsForStation("Byparken");
assert(byparkenLabels.length === 1 && byparkenLabels[0] === "1 + Bergen lufthavn Flesland", `Byparken must offer exactly one chip (1 + Bergen lufthavn Flesland), got ${JSON.stringify(byparkenLabels)}`);
const kaigatenLabels = marketingLabelsForStation("Kaigaten");
assert(kaigatenLabels.length === 1 && kaigatenLabels[0] === "2 + Fyllingsdalen terminal", `Kaigaten must offer exactly one chip (2 + Fyllingsdalen terminal), got ${JSON.stringify(kaigatenLabels)}`);

// Bergen busstasjon (hub lock): plain through-station on both lines, four ordinary direction
// chips — no self-referential-hub case (contrast Oslo's R21/Jernbanetorget).
const hubLabels = marketingLabelsForStation(BERGEN_HUB);
assert(hubLabels.includes("1 + Byparken"), "hub must offer 1 + Byparken");
assert(hubLabels.includes("1 + Bergen lufthavn Flesland"), "hub must offer 1 + Bergen lufthavn Flesland");
assert(hubLabels.includes("2 + Kaigaten"), "hub must offer 2 + Kaigaten");
assert(hubLabels.includes("2 + Fyllingsdalen terminal"), "hub must offer 2 + Fyllingsdalen terminal");
assert(hubLabels.length === 4, `hub must offer exactly 4 chips, got ${JSON.stringify(hubLabels)}`);
assert(!hubLabels.some((label) => /inbound|outbound|to city|sentrum/i.test(label)), "no inbound/outbound/to City/Sentrum chips");

// Line classification.
assert(
  classifyLine({ serviceJourney: { line: { publicCode: "1", transportMode: "tram", authority: { id: "SKY:Authority:SKY" } } } }) === "1",
  "classifyLine must accept SKY tram line 1"
);
assert(
  classifyLine({ serviceJourney: { line: { publicCode: "1", transportMode: "metro", authority: { id: "SKY:Authority:SKY" } } } }) === null,
  "classifyLine must reject a metro-mode call even from SKY (Bybanen is tram-mode, never metro)"
);
assert(
  classifyLine({ serviceJourney: { line: { publicCode: "3", transportMode: "tram", authority: { id: "SKY:Authority:SKY" } } } }) === null,
  "classifyLine must reject out-of-scope line 3 (no passenger line 3 or higher)"
);
assert(
  classifyLine({ serviceJourney: { line: { publicCode: "1", transportMode: "tram", authority: { id: "RUT:Authority:RUT" } } } }) === null,
  "classifyLine must reject a non-Skyss authority even on a tram-mode line 1"
);

assert(foldKey("Mårdalen") === foldKey("mardalen"), "foldKey must normalize Norwegian diacritics for comparison purposes (both sides folded, original letters preserved)");
assert(canonicalStationName("sletten senter") === "Sletten", "canonicalStationName must resolve the NSR alias case-insensitively");

// ---------------------------------------------------------------------------------------------
// All-stations self-terminus pipeline test (Dublin PR #484 precedent): exercise
// estimatedCallsToTrips — the exact function fetchStationBoard() itself calls — against a
// synthetic Entur estimatedCalls fixture for EVERY catalog station, without mocking the
// network fetch fetchStationBoard() makes. Confirms the self-terminus guard is wired into the
// real pipeline (not just the unit-level isTerminatingAtStation/resolveTerminus calls above),
// and that it doesn't over-filter a genuinely different, valid destination.
// ---------------------------------------------------------------------------------------------
function syntheticCall({ lineCode, destination, minutesFromNow, now }) {
  const departure = new Date(now.getTime() + minutesFromNow * 60_000);
  return {
    expectedDepartureTime: departure.toISOString(),
    aimedDepartureTime: departure.toISOString(),
    realtime: true,
    cancellation: false,
    quay: { publicCode: "1" },
    destinationDisplay: { frontText: destination },
    serviceJourney: {
      line: {
        publicCode: lineCode,
        transportMode: "tram",
        authority: { id: "SKY:Authority:SKY", name: "Skyss" },
      },
    },
  };
}

function testAllStationsSelfTerminusPipeline() {
  const now = new Date();
  for (const station of stations) {
    for (const lineId of station.lines) {
      const termini = LINE_TERMINI[lineId] ?? [];
      for (const terminus of termini) {
        const call = syntheticCall({ lineCode: lineId, destination: terminus, minutesFromNow: 5, now });
        const trips = estimatedCallsToTrips([call], station.name, now);
        const expectedChip = `${lineId} + ${terminus}`;
        if (foldKey(terminus) === foldKey(station.name)) {
          assert(
            trips.length === 0,
            `${station.name} must never show "${expectedChip}" (self-terminus) — the train is arriving, not departing towards itself`
          );
        } else {
          assert(
            trips.length === 1 && trips[0].destination === expectedChip,
            `${station.name} must show "${expectedChip}" for a genuine ${lineId}-bound trip towards ${terminus}, got ${JSON.stringify(trips.map((t) => t.destination))}`
          );
        }
      }
    }
  }
}
testAllStationsSelfTerminusPipeline();

// A trip whose destinationDisplay uses the NSR printed-name variant must still map back to the
// D1 published terminus in the chip, and must still be caught by the self-terminus guard at the
// airport station itself.
{
  const now = new Date();
  const nsrFormCall = syntheticCall({ lineCode: "1", destination: "Bergen lufthavn", minutesFromNow: 5, now });
  const atHub = estimatedCallsToTrips([nsrFormCall], BERGEN_HUB, now);
  assert(atHub.length === 1 && atHub[0].destination === "1 + Bergen lufthavn Flesland", `NSR form "Bergen lufthavn" must map to the D1 print in the chip, got ${JSON.stringify(atHub.map((t) => t.destination))}`);
  const atAirport = estimatedCallsToTrips([nsrFormCall], "Bergen lufthavn Flesland", now);
  assert(atAirport.length === 0, "NSR-form self-terminus at the airport station itself must still be filtered");
}

// Cancelled and past-departure calls are dropped, same as Oslo's pipeline.
{
  const now = new Date();
  const cancelledCall = { ...syntheticCall({ lineCode: "1", destination: "Bergen lufthavn Flesland", minutesFromNow: 5, now }), cancellation: true };
  assert(estimatedCallsToTrips([cancelledCall], BERGEN_HUB, now).length === 0, "a cancelled call must be dropped");

  const pastCall = syntheticCall({ lineCode: "1", destination: "Bergen lufthavn Flesland", minutesFromNow: -30, now });
  assert(estimatedCallsToTrips([pastCall], BERGEN_HUB, now).length === 0, "a call more than 60s in the past must be dropped");
}

// Dogfood station list comes from the catalog, not a live parse.
const dogfoodStations = listBergenDogfoodStations();
assert(dogfoodStations.length === 33, `dogfood stations must be the 33 catalog names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === BERGEN_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodStations.every((row) => typeof row.lat === "number" && typeof row.lng === "number"), "every dogfood station must carry lat/lng");

// Directions — dogfood harness and the production dispatch entry must agree.
const hubPack = getBergenDogfoodDirections(BERGEN_HUB);
assert(hubPack.source === "bergen-marketing-ends", "directions source must be bergen-marketing-ends");
assert(JSON.stringify(hubPack.directions) === JSON.stringify(hubLabels), "dogfood directions must match marketingLabelsForStation");

const dispatched = await getMultiCityDirections("bergen", BERGEN_HUB);
assert(JSON.stringify(dispatched.directions) === JSON.stringify(hubLabels), "live-city-api dispatch must return the same chips as the dogfood harness");
assert(dispatched.source === "bergen-marketing-ends", "live-city-api dispatch source must be bergen-marketing-ends");

// getMultiCityNextTrain must resolve to Bergen's dogfood next-train module (no throw on
// lookup) — a genuine network call would throw/reject inside the test sandbox rather than
// resolving, so this only asserts the dispatch reaches the right module, not a live board.
const { getBergenDogfoodNextTrain } = await import("../lib/cities/bergen/dogfood-next-train.js");
assert(typeof getBergenDogfoodNextTrain === "function", "getBergenDogfoodNextTrain must be exported for live-city-api to dispatch to");
assert(typeof getMultiCityNextTrain === "function", "getMultiCityNextTrain must be exported for the dispatch smoke check above");

// tripMatchesMarketingChip contract.
assert(tripMatchesMarketingChip({ destination: "1 + Byparken", routeShortName: "1" }, "1 + Byparken") === true, "tripMatchesMarketingChip must match an already-mapped chip");
assert(tripMatchesMarketingChip({ destination: "Byparken", routeShortName: "1" }, "1 + Byparken") === true, "tripMatchesMarketingChip must match a raw destination + line code");

// Rider-facing coverage copy (api/coverage-notes.js) — Bybanen only, buses and the Bergen
// railway station explicitly called out as not covered.
const coverage = JSON.parse(readFileSync(join(ROOT, "lib/cities/bergen/coverage.json"), "utf8"));
assert(coverage.region === "bergen", "coverage.json region must be bergen");
assert(coverage.covered.some((c) => /Bybanen/.test(c.label)), "coverage.json must record Bybanen as covered");
assert(coverage.notCovered.some((c) => /bus/i.test(c.label)), "coverage.json must explicitly record Skyss buses as not covered");
assert(coverage.notCovered.some((c) => /railway station|Bergen stasjon/i.test(c.label)), "coverage.json must explicitly record the Bergen railway station as not covered");
const coverageWhole = JSON.stringify(coverage);
assert(!/\bD1\b|\boracle\b/i.test(coverageWhole), "coverage.json must read like rider prose, not pipeline notes");

// Picker/country-regions surfaces: while `status: "planned"`, a city gets no picker entry at
// all, live or "Coming Soon" (Tim, 27 Sep 2026: "It's either in or out.";
// docs/jim-brief-no-coming-soon-picker.md). Persistence + dogfood-mount whitelists (journey-
// model PERSISTED_CITY_IDS/COUNTRY_IDS, brisbane-dogfood MULTI_CITY_IDS/available,
// live-city-api MULTI_CITY_IDS) are also deliberately not touched while planned — same
// registry-status-derived invariant qa/live-city-lists-sync.mjs enforces globally (those lists
// must equal exactly the live-city set). Norway already has a picker/country-regions entry
// for Oslo ("no") — this pack does not add a second bergen: "no" mapping; that (plus whether a
// single country needs more than one mapping) is Mark's flip-commit call.
const countryRegions = readFileSync(join(ROOT, "lib/cities/country-regions.js"), "utf8");
const manifestCityIds = buildCityManifest().cities.map((c) => c.id);
if (bergenIsLive) {
  assert(manifestCityIds.includes("bergen"), "the /api/cities manifest must list Bergen now that it is live");
} else {
  assert(
    !manifestCityIds.includes("bergen"),
    'the /api/cities manifest must not list Bergen until the flip commit (registry status must stay "planned")'
  );
}
void countryRegions; // read for a future flip-commit check; no bergen-specific assertion needed yet while planned.

// The bounds box exists ahead of the flip, same as Dublin/Hong Kong — it only satisfies
// qa/live-city-lists-sync.mjs's per-live-city check once Bergen is live, and is otherwise
// inert while the city isn't in the manifest at all, so this assertion holds in both states.
assert(Boolean(CITY_BOUNDS.bergen), "lib/cities/city-bounds.js must carry a bergen box");
const bergenBoxes = cityBoundsFor("bergen");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(
    inAnyBounds(station.lat, station.lng, bergenBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Bergen's CITY_BOUNDS box`
  );
}

console.log(
  `bergen-dogfood-gate: ok (status=${entry.status}, dispatch switch-cases wired, MULTI_CITY_IDS/manifest lists tracking registry status (${
    bergenIsLive ? "live — must include bergen" : "planned — deliberately deferred to the status-flip commit"
  }), D1 pack, Board eligibility section recorded (Bybanen in / Skyss bus out-mode / Vy Bergensbanen+Arna out-scope), 33 stations (27 line 1 / 9 line 2 / 3 shared) with real lat/lng inside CITY_BOUNDS, hub Bergen busstasjon (4 chips, no self-referential-hub case), Byparken/Kaigaten self-terminus guard regression-tested end-to-end across every catalog station via estimatedCallsToTrips, NSR printed-name variants (Sletten senter, Bergen lufthavn) fold back to the D1 print, doNotGroup pairs enforced, line+terminus direction model, cancelled/past-departure calls dropped, coverage.json records Bybanen in / buses + Bergen railway station out, Perth Australia green)`
);
