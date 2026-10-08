/**
 * Prague flip follow-through gate. Status-agnostic (same shape as qa/dublin-dogfood-gate.mjs,
 * docs/jim-brief-dublin-self-terminus-chip.md item 3): every assertion below that depends on
 * registry status reads `entry.status` at runtime and branches, rather than hardcoding "planned",
 * so Mark's eventual flip commit does not need to touch this file at all.
 *
 * Deliberately does NOT call the live Golemio PID Departure Boards API (api.golemio.cz) — this is
 * a smoke-tier gate, not a network test (qa/prague-all-stations-live-sweep.mjs covers that, and
 * needs a real key + live network + real service hours none of which a CI run can guarantee).
 * Instead this gate unit-tests the catalog/direction-model/departure-mapping logic
 * (resolveCatalogEntry, mapDepartureToTrip, tripsFromDepartures, mapLineTerminusDestination,
 * resolveTerminus) against synthetic payloads shaped exactly like the real Golemio
 * departureboards response (confirmed live 28 Sep 2026 against
 * https://api.golemio.cz/v2/pid/departureboards — see lib/providers/prague.js file header), plus
 * asserts that fetchStationBoard throws for an unknown station and MissingGolemioApiKeyError when
 * no key is configured, rather than returning an empty/synthetic board, all without any network
 * call.
 *
 * Also runs the Dublin #484 lesson as an explicit end-to-end pipeline test (not just a unit
 * assertion on isTerminatingAtStation): builds a synthetic departures[] payload for EVERY catalog
 * station where every line serving that station has a departure headsigned as that very station's
 * own name, and asserts tripsFromDepartures() drops every single one — no station may ever offer
 * a chip naming itself.
 *
 * Usage: node qa/prague-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  PRAGUE_HUB,
  PRAGUE_TIMEZONE,
  GOLEMIO_ROUTE_SHORT_NAME_TO_LINE,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  buildDepartureBoardsUrl,
  mapDepartureToTrip,
  tripsFromDepartures,
  mapScheduledCandidateToTrip,
  fetchStationBoard,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
} from "../lib/providers/prague.js";
import { MissingGolemioApiKeyError } from "../lib/providers/gtfs/auth.js";
import {
  foldKey,
  resolveTerminus,
  mapLineTerminusDestination,
  isTerminatingAtStation,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
  SHORT_TURN_TERMINI,
  isTerminusReachableFromStation,
} from "../lib/cities/prague/marketing-directions.js";
import {
  listPragueDogfoodStations,
  getPragueDogfoodDirections,
  getPragueDogfoodNextTrain,
} from "../lib/cities/prague/dogfood-next-train.js";
import { formatNotServedMessage } from "../lib/providers/prague.js";
import { loadGtfsStaticFromDirectory } from "../lib/providers/gtfs/static-cache.js";
import { hasScheduledServiceToday } from "../lib/providers/gtfs/board.js";
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
const entry = getCity("prague");
assert(entry, "prague must be registered");
assert(
  entry.status === "planned" || entry.status === "live",
  `prague registry status must be planned or live, got ${entry.status}`
);
const pragueIsLive = entry.status === "live";

const live = assertCityLive("prague");
if (pragueIsLive) {
  assert(live?.ok === true, "assertCityLive(prague) must pass once prague is live");
} else {
  assert(live?.ok === false, "assertCityLive(prague) must fail while prague stays planned");
  assert(live?.status === 501, "prague must be 501 planned while prague stays planned");
}

assert(entry?.adapterReady === true, "prague adapterReady must be true");
assert(entry?.displayName === "Prague", "prague display name must be Prague");
assert(entry?.timeZone === "Europe/Prague", "prague timezone must be Europe/Prague");
assert(CITIES.filter((city) => city.id === "prague").length === 1, "prague must appear once in the registry");
for (const forbiddenId of ["praha", "pida", "pid"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired regardless of status; MULTI_CITY_IDS membership must track the
// registry status exactly (qa/live-city-lists-sync.mjs enforces this globally too).
assert(
  isMultiCity("prague") === pragueIsLive,
  pragueIsLive
    ? "prague must be in MULTI_CITY_IDS now that it is live"
    : "prague must NOT be in MULTI_CITY_IDS while status stays planned"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/prague-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/prague-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "prague", "D1 city id must be prague");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === PRAGUE_HUB, `D1 lock must be ${PRAGUE_HUB}`);
assert(network.lines.length === 3, "D1 must carry exactly 3 passenger lines (A/B/C)");
assert(network.stats?.uniqueNames === 58, "D1 must record 58 unique station names");
assert(network.stats?.lineTicks === 61, "D1 must record 61 line-station ticks");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");

const stations = listCatalogStations();
assert(
  stations.length === 58,
  `catalog must have 58 stations — Flora is back in the catalog on the notServed mechanism (docs/jim-brief-prague-line-c-closure.md), got ${stations.length}`
);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(PRAGUE_HUB), `catalog must lock ${PRAGUE_HUB}`);
assert(byName.get(PRAGUE_HUB)?.lines.sort().join(",") === "a,c", `${PRAGUE_HUB} must carry exactly A/C`);
assert(byName.get("Můstek")?.lines.sort().join(",") === "a,b", "Můstek must carry exactly A/B");
assert(byName.get("Florenc")?.lines.sort().join(",") === "b,c", "Florenc must carry exactly B/C");
assert(
  byName.has("Flora"),
  "Flora must be back IN the catalog (docs/jim-brief-prague-line-c-closure.md) — a station with a real, current zero-service gap is now handled by the auto-detected notServed mechanism, never by removal from the catalog"
);

const aStations = stations.filter((s) => s.lines.includes("a"));
const bStations = stations.filter((s) => s.lines.includes("b"));
const cStations = stations.filter((s) => s.lines.includes("c"));
assert(aStations.length === 17, `Line A must have 17 unique stops (Flora back in the catalog), got ${aStations.length}`);
assert(bStations.length === 24, `Line B must have 24 unique stops, got ${bStations.length}`);
assert(cStations.length === 20, `Line C must have 20 unique stops, got ${cStations.length}`);

// notServed metadata (docs/jim-brief-prague-line-c-closure.md): Flora (long-term, open-ended) and
// the four Line C stations flanking the confirmed Pražského povstání–Chodov section closure each
// carry a `notServed` field with a since date, reason and replacement-transport copy — metadata/
// copy only, never itself the runtime gate (that's hasScheduledServiceToday, asserted below).
const NOT_SERVED_NAMES = ["Flora", "Budějovická", "Kačerov", "Pankrác", "Roztyly"];
for (const name of NOT_SERVED_NAMES) {
  const entry = byName.get(name);
  assert(entry, `${name} must be in the catalog`);
  assert(entry.notServed && typeof entry.notServed === "object", `${name} must carry a notServed field`);
  assert(typeof entry.notServed.since === "string" && entry.notServed.since, `${name}.notServed.since must be a non-empty string`);
  assert(typeof entry.notServed.reason === "string" && entry.notServed.reason, `${name}.notServed.reason must be a non-empty string`);
  assert(typeof entry.notServed.replacement === "string" && entry.notServed.replacement, `${name}.notServed.replacement must be a non-empty string`);
}
assert(byName.get("Flora").notServed.until === null, "Flora's closure is open-ended (until further notice) — until must be null, not a guessed date");
assert(byName.get("Budějovická").notServed.until === "2026-09-28", "Budějovická's closure has a confirmed end date from DPP's notice");
for (const name of ["Kačerov", "Pankrác", "Roztyly"]) {
  assert(byName.get(name).notServed.until === "2026-09-28", `${name}'s closure has a confirmed end date from DPP's notice`);
}
for (const name of stations.map((s) => s.name).filter((n) => !NOT_SERVED_NAMES.includes(n))) {
  assert(!byName.get(name).notServed, `${name} must NOT carry a notServed field — it has normal service`);
}

// Every station carries lat/lng and at least one GTFS stop_id, D2-confirmed against the live
// PID GTFS feed (scripts/trim-prague-gtfs.mjs), and falls inside Prague's CITY_BOUNDS box.
const pragueBoxes = cityBoundsFor("prague");
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(Array.isArray(station.stopIds) && station.stopIds.length > 0, `${station.name} must carry at least one GTFS stop_id`);
  assert(
    inAnyBounds(station.lat, station.lng, pragueBoxes),
    `${station.name} (${station.lat}, ${station.lng}) must fall inside Prague's CITY_BOUNDS box`
  );
}

// Static-coverage gate (docs/jim-brief-prague-flora-sweep-empty-state.md item 1, corrected by
// docs/jim-brief-prague-line-c-closure.md item 3): the original version of this check only asked
// "does this station have >= 1 stop_time EVER in the committed fixture" — which is exactly why it
// passed for Budějovická/Kačerov/Pankrác/Roztyly despite their current section closure: each has
// hundreds of stop_times in the fixture, just none whose service_id is active on any date before
// 29 Sep 2026 (the closure's calendar.txt start_date). The corrected check is date-aware:
// hasScheduledServiceToday() (lib/providers/gtfs/board.js) against a frozen reference date inside
// the confirmed closure window, exactly like it would run "today" if a caller called
// fetchStationBoard right now. A non-notServed station must show scheduled service on that date;
// a notServed station must NOT (this is the assertion that would have caught the closure — and
// would have caught Flora too, since its own reference-date check is unconditionally false, any
// date, forever).
const fixtureDir = join(ROOT, "qa/fixtures/prague/gtfs");
assert(existsSync(fixtureDir), "qa/fixtures/prague/gtfs must be committed (small trimmed metro-only fixture)");
const pragueStaticFixture = loadGtfsStaticFromDirectory(fixtureDir, { timeZone: PRAGUE_TIMEZONE });
// Inside the confirmed 26-28 Sep closure window AND inside the committed fixture's own calendar
// coverage (its calendar.txt rows only start 2026-09-28 — the fixture was trimmed/regenerated the
// same day, so 26-27 Sep predate its coverage and would make activeServicesForDate() return an
// empty set for reasons unrelated to the closure).
// The fixture is regenerated by the scheduled snapshot refresh (docs/jim-brief-scheduled-snapshot-refresh.md),
// so its calendar window moves; the reference date is the fixture's own first calendar day, and a
// notServed station is expected to be unserved only while its closure is still open on that date
// (until === null, or until >= reference date) - the 26-28 Sep Line C closure has ended.
const fixtureFirstDay = [...pragueStaticFixture.calendar.map((row) => row.start_date)].sort()[0];
assert(/^\d{8}$/.test(fixtureFirstDay ?? ""), "Prague fixture calendar must have a start_date");
const referenceIso = `${fixtureFirstDay.slice(0, 4)}-${fixtureFirstDay.slice(4, 6)}-${fixtureFirstDay.slice(6, 8)}`;
const closureReferenceNow = new Date(`${referenceIso}T10:00:00+02:00`);
const unexpectedlyUnserved = [];
const unexpectedlyServed = [];
for (const station of stations) {
  const servedToday = hasScheduledServiceToday({
    stopIds: station.stopIds ?? [],
    staticData: pragueStaticFixture,
    timeZone: PRAGUE_TIMEZONE,
    now: closureReferenceNow,
  });
  const closure = byName.get(station.name)?.notServed;
  const shouldBeNotServed =
    NOT_SERVED_NAMES.includes(station.name) && Boolean(closure) && (closure.until === null || closure.until >= referenceIso);
  if (shouldBeNotServed && servedToday) {
    unexpectedlyServed.push(station.name);
  } else if (!shouldBeNotServed && !servedToday) {
    unexpectedlyUnserved.push(station.name);
  }
}
assert(
  unexpectedlyUnserved.length === 0,
  `every non-notServed catalog station must show scheduled service on the closure-window reference date — zero coverage at: ${unexpectedlyUnserved.join(", ")} (this is exactly the check that would have caught Flora before it reached a live poll)`
);
assert(
  unexpectedlyServed.length === 0,
  `every notServed station (Flora, Budějovická, Kačerov, Pankrác, Roztyly) must show ZERO scheduled service on the closure-window reference date, in the committed fixture — unexpectedly served: ${unexpectedlyServed.join(", ")} (this is exactly the check that would have caught the Line C section closure)`
);

// resolveCatalogEntry — exact-match, diacritic-EXACT (never fold/strip diacritics), forbidden
// tokens reject.
assert(resolveCatalogEntry(PRAGUE_HUB)?.name === PRAGUE_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Prague") === null, "Prague must never resolve as a station");
assert(resolveCatalogEntry("Praha") === null, "Praha must never resolve as a station");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(resolveCatalogEntry("Můstek")?.name === "Můstek", "must resolve Můstek with full diacritics");
assert(resolveCatalogEntry("Mustek") === null, "a stripped-diacritic string must NOT resolve — diacritics are load-bearing, not a rename-equivalent");
assert(resolveCatalogEntry("Náměstí Míru")?.name === "Náměstí Míru", "must resolve a full-diacritic multi-word station name");
assert(resolveCatalogEntry("Not A Real Station") === null, "resolveCatalogEntry must reject an unknown station");
assert(isForbiddenHubProxy("Můstek") === true, "Můstek must never stand in for the Muzeum hub identity");
assert(isForbiddenHubProxy("Florenc") === true, "Florenc must never stand in for the Muzeum hub identity");
assert(isForbiddenHubProxy(PRAGUE_HUB) === false, "the hub itself is not its own proxy violation");
assert(isForbiddenCollapseName("Centrum") === true, "Centrum must never resolve as a station");
assert(isForbiddenCollapseName("pid") === true, "invented city token pid must be forbidden");

// Line labels + termini (direction-model-memo.md §3 recommendation A).
assert(LINE_LABELS.a === "A" && LINE_LABELS.c === "C", "line labels must be the bare printed letters");
assert(LINE_TERMINI.a.includes("Nemocnice Motol") && LINE_TERMINI.a.includes("Depo Hostivař"), "A termini must be Nemocnice Motol/Depo Hostivař");
assert(LINE_TERMINI.b.includes("Zličín") && LINE_TERMINI.b.includes("Černý Most"), "B termini must be Zličín/Černý Most");
assert(LINE_TERMINI.c.includes("Letňany") && LINE_TERMINI.c.includes("Háje"), "C termini must be Letňany/Háje");
assert(!LINE_TERMINI.a.includes(PRAGUE_HUB), "A must never gain a Muzeum terminus/chip");
assert(!LINE_TERMINI.c.includes(PRAGUE_HUB), "C must never gain a Muzeum terminus/chip");
assert(mapLineTerminusDestination(PRAGUE_HUB, "a") === "A", "Muzeum must never appear as an A direction token — falls back to the bare line label");
assert(mapLineTerminusDestination("Depo Hostivař", "a") === "A + Depo Hostivař", "direction chip must be line + terminus");
assert(mapLineTerminusDestination("Háje", "c") === "C + Háje", "direction chip must be line + terminus");
assert(resolveTerminus("Some Unknown Headsign", "a") === null, "resolveTerminus must not fabricate an unknown terminus");
assert(foldKey("Můstek") === "můstek", "foldKey must fold case/whitespace only — diacritics must survive intact");
assert(isTerminatingAtStation("Depo Hostivař", "Depo Hostivař") === true, "isTerminatingAtStation must catch a same-name arrival");
assert(isTerminatingAtStation("Depo Hostivař", "Muzeum") === false, "isTerminatingAtStation must not flag a genuinely different destination");

// Line C short-turns (docs/jim-brief-prague-line-c-short-turn.md, live-confirmed 28 Sep 2026):
// Pražského povstání (southbound short-turn) and Chodov (northbound short-turn) are now
// first-class terminus chips, never a bare "C" fallback for a known short-turn headsign.
assert(LINE_TERMINI.c.includes("Pražského povstání"), "C termini must include the confirmed Pražského povstání short-turn");
assert(LINE_TERMINI.c.includes("Chodov"), "C termini must include the confirmed Chodov short-turn");
assert(SHORT_TURN_TERMINI.c.includes("Pražského povstání") && SHORT_TURN_TERMINI.c.includes("Chodov"), "SHORT_TURN_TERMINI.c must record both confirmed short-turns");
assert(mapLineTerminusDestination("Pražského povstání", "c") === "C + Pražského povstání", "a Pražského povstání headsign must map to a first-class chip, never a bare C fallback");
assert(mapLineTerminusDestination("Chodov", "c") === "C + Chodov", "a Chodov headsign must map to a first-class chip, never a bare C fallback");

// Synthetic case (brief item 3): a C trip headsigned Pražského povstání must be counted and
// chipped at a station north of it (Muzeum), and never leak a bare line-label chip.
const muzeumPrazskehoPovstaniTrip = tripsFromDepartures(
  [syntheticDeparture("C", "Pražského povstání")],
  PRAGUE_HUB
);
assert(muzeumPrazskehoPovstaniTrip.length === 1, "a C trip headsigned Pražského povstání must be counted at Muzeum, not dropped");
assert(muzeumPrazskehoPovstaniTrip[0].destination === "C + Pražského povstání", "the chip must be C + Pražského povstání, never a bare C");

// Synthetic case (brief item 3): the same headsign AT Pražského povstání itself must be dropped
// as a self-terminus arrival, not offered as a chip.
const selfPrazskehoPovstaniTrip = tripsFromDepartures(
  [syntheticDeparture("C", "Pražského povstání")],
  "Pražského povstání"
);
assert(selfPrazskehoPovstaniTrip.length === 0, "a C trip headsigned Pražského povstání must never be offered AT Pražského povstání itself");

// No bare line-label chip is ever produced for a known short-turn headsign at any station that
// genuinely sees it.
assert(
  !muzeumPrazskehoPovstaniTrip.some((t) => t.destination === "C"),
  "a known short-turn headsign must never fall back to a bare C chip"
);

// Reachability: the short-turn chip only ever appears for stations that short-turn's trip
// actually passes through — never at the terminus itself, never on the wrong side of it.
assert(isTerminusReachableFromStation("c", "Pražského povstání", "Muzeum") === true, "Muzeum (north of Pražského povstání) must be able to offer the Pražského povstání chip");
assert(isTerminusReachableFromStation("c", "Pražského povstání", "Vyšehrad") === true, "Vyšehrad (north of Pražského povstání) must be able to offer the Pražského povstání chip");
assert(isTerminusReachableFromStation("c", "Pražského povstání", "Pražského povstání") === false, "Pražského povstání must never offer a chip naming itself");
assert(isTerminusReachableFromStation("c", "Pražského povstání", "Pankrác") === false, "Pankrác (south of Pražského povstání) must never offer the Pražského povstání chip — that trip never reaches it");
assert(isTerminusReachableFromStation("c", "Pražského povstání", "Háje") === false, "Háje (south of Pražského povstání) must never offer the Pražského povstání chip");
assert(isTerminusReachableFromStation("c", "Chodov", "Háje") === true, "Háje (south of Chodov) must be able to offer the Chodov chip");
assert(isTerminusReachableFromStation("c", "Chodov", "Opatov") === true, "Opatov (south of Chodov) must be able to offer the Chodov chip");
assert(isTerminusReachableFromStation("c", "Chodov", "Chodov") === false, "Chodov must never offer a chip naming itself");
assert(isTerminusReachableFromStation("c", "Chodov", "Roztyly") === false, "Roztyly (north of Chodov) must never offer the Chodov chip — that trip never reaches it");
assert(isTerminusReachableFromStation("c", "Chodov", "Muzeum") === false, "Muzeum (north of Chodov) must never offer the Chodov chip");
assert(isTerminusReachableFromStation("c", "Háje", "Muzeum") === true, "a line's own full-length terminus (Háje) must remain reachable from every other station");
assert(isTerminusReachableFromStation("a", "Depo Hostivař", "Muzeum") === true, "a line with no short-turn metadata must always report reachable");

// Pankrác and Roztyly (real, catalogued C stations flanking each short-turn on the wrong side)
// must never offer that short-turn's chip in the exhaustive dogfood picker listing.
const pankracLabels = marketingLabelsForStation("Pankrác");
assert(!pankracLabels.includes("C + Pražského povstání"), "Pankrác (south of Pražského povstání) must never offer C + Pražského povstání in the picker");
const roztylyLabels = marketingLabelsForStation("Roztyly");
assert(!roztylyLabels.includes("C + Chodov"), "Roztyly (north of Chodov) must never offer C + Chodov in the picker");

// Stations that genuinely see each short-turn must still offer it in the picker.
assert(marketingLabelsForStation(PRAGUE_HUB).includes("C + Pražského povstání"), "Muzeum (north of Pražského povstání) must offer C + Pražského povstání in the picker");
const hajeLabels = marketingLabelsForStation("Háje");
assert(hajeLabels.includes("C + Chodov"), "Háje (south of Chodov) must offer C + Chodov in the picker");

// The short-turn termini must never offer a chip naming themselves.
const prazskehoPovstaniLabels = marketingLabelsForStation("Pražského povstání");
assert(!prazskehoPovstaniLabels.some((l) => l.endsWith("+ Pražského povstání")), "Pražského povstání must never offer a self-referential chip");
const chodovLabels = marketingLabelsForStation("Chodov");
assert(!chodovLabels.some((l) => l.endsWith("+ Chodov")), "Chodov must never offer a self-referential chip");

// marketingLabelsForStation at the hub triangle — each vertex must show only its own two lines'
// chips, and every chip must exclude a self-referential terminus (belt-and-braces; no line
// actually terminates at any of the three per direction-model-memo.md).
const muzeumLabels = marketingLabelsForStation(PRAGUE_HUB);
assert(muzeumLabels.includes("A + Depo Hostivař") && muzeumLabels.includes("A + Nemocnice Motol"), "Muzeum must offer both A directions");
assert(muzeumLabels.includes("C + Letňany") && muzeumLabels.includes("C + Háje"), "Muzeum must offer both C directions");
assert(!muzeumLabels.some((l) => l.startsWith("B")), "Muzeum must never offer a B chip — line B does not call here");
assert(!muzeumLabels.some((l) => l.endsWith("+ Muzeum")), "Muzeum must never offer a self-referential + Muzeum chip");

const mustekLabels = marketingLabelsForStation("Můstek");
assert(mustekLabels.includes("B + Zličín") && mustekLabels.includes("B + Černý Most"), "Můstek must offer both B directions");
assert(!mustekLabels.some((l) => l.startsWith("C")), "Můstek must never offer a C chip — line C does not call here");

const florencLabels = marketingLabelsForStation("Florenc");
assert(!florencLabels.some((l) => l.startsWith("A")), "Florenc must never offer an A chip — line A does not call here");

assert(tripMatchesMarketingChip({ destination: "A + Depo Hostivař" }, "A + Depo Hostivař") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "A + Depo Hostivař" }, "A + Nemocnice Motol") === false, "tripMatchesMarketingChip must reject a mismatched chip");

// ---------------------------------------------------------------------------------------------
// Dublin #484 lesson, end to end: for EVERY catalog station, build a synthetic Golemio
// departures[] payload where each line serving that station has a departure headsigned as the
// STATION'S OWN NAME, and assert tripsFromDepartures() drops every single one. This proves the
// self-terminus guard actually reaches the real pipeline (mapDepartureToTrip ->
// tripsFromDepartures), not just isTerminatingAtStation called directly with two raw strings.
// ---------------------------------------------------------------------------------------------
function syntheticDeparture(routeShortName, headsign) {
  return {
    route: { short_name: routeShortName, type: 1 },
    trip: { headsign, id: `trip-${routeShortName}-${headsign}`, is_canceled: false },
    stop: { id: "U000Z101P", platform_code: null },
    departure_timestamp: {
      predicted: "2026-09-28T10:00:00.000Z",
      scheduled: "2026-09-28T10:00:00.000Z",
      minutes: "5",
    },
  };
}

let selfTerminusLeaked = [];
for (const station of stations) {
  const departures = station.lines.map((lineId) =>
    syntheticDeparture(LINE_LABELS[lineId], station.name)
  );
  const trips = tripsFromDepartures(departures, station.name);
  if (trips.length > 0) {
    selfTerminusLeaked.push(station.name);
  }
}
assert(
  selfTerminusLeaked.length === 0,
  `no station may ever offer a chip naming itself — self-terminus leaked at: ${selfTerminusLeaked.join(", ")}`
);

// The same synthetic-payload pipeline, but with a genuinely different (non-self) headsign, must
// NOT be dropped — proves the guard above isn't over-filtering everything.
const muzeumRealTrips = tripsFromDepartures(
  [syntheticDeparture("A", "Depo Hostivař"), syntheticDeparture("C", "Háje")],
  PRAGUE_HUB
);
assert(muzeumRealTrips.length === 2, "a genuinely different destination must still pass through tripsFromDepartures");
assert(muzeumRealTrips.some((t) => t.destination === "A + Depo Hostivař"), "Muzeum's A trip must map to A + Depo Hostivař");
assert(muzeumRealTrips.some((t) => t.destination === "C + Háje"), "Muzeum's C trip must map to C + Háje");

// A non-metro route (route.type !== 1) and an unknown route_short_name must both be dropped —
// belt-and-braces even though the queried stop_ids are already metro-only platforms.
const tramDeparture = { ...syntheticDeparture("22", "Some Tram Terminus"), route: { short_name: "22", type: 0 } };
assert(mapDepartureToTrip(tramDeparture, "Muzeum") === null, "a non-metro route (type !== 1) must be dropped");
const unknownLineDeparture = syntheticDeparture("D", "Some Place");
assert(mapDepartureToTrip(unknownLineDeparture, "Muzeum") === null, "an unknown route_short_name (e.g. D) must be dropped");

// mapDepartureToTrip / tripsFromDepartures shape assertions.
const sampleDeparture = syntheticDeparture("B", "Zličín");
const sampleTrip = mapDepartureToTrip(sampleDeparture, "Anděl");
assert(sampleTrip.lineId === "b", "mapDepartureToTrip must classify B by route.short_name");
assert(sampleTrip.destination === "B + Zličín", "mapDepartureToTrip must produce a line + terminus chip");
assert(typeof sampleTrip.displayTime === "string" && sampleTrip.displayTime !== "", "mapDepartureToTrip must set a string displayTime");
assert(sampleTrip.cancelled === false, "cancelled must reflect trip.is_canceled");

// buildDepartureBoardsUrl — no network.
const url = buildDepartureBoardsUrl(["U400Z101P", "U400Z102P"]);
assert(url.includes("ids%5B%5D=U400Z101P") || url.includes("ids[]=U400Z101P"), "buildDepartureBoardsUrl must carry every stop_id via ids[]");
assert(url.startsWith("https://api.golemio.cz/v2/pid/departureboards"), "buildDepartureBoardsUrl must point at the v2 departureboards endpoint");

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
  await fetchStationBoard(PRAGUE_HUB, { apiKey: "" });
} catch (err) {
  missingKeyThrew = err instanceof MissingGolemioApiKeyError;
}
assert(missingKeyThrew, "fetchStationBoard must throw MissingGolemioApiKeyError when no key is configured — no silent timetable fallback");

const syntheticBoard = await fetchStationBoard(PRAGUE_HUB, {
  departures: [syntheticDeparture("A", "Depo Hostivař"), syntheticDeparture("C", "Háje")],
});
assert(syntheticBoard.realtime === "live", "fetchStationBoard must mark a board realtime: live");
assert(syntheticBoard.trips.length === 2, "fetchStationBoard must return only the confirmed metro trips from a synthetic departures payload");

// ---------------------------------------------------------------------------------------------
// Honest empty state (docs/jim-brief-prague-flora-sweep-empty-state.md item 3), the same three
// cases as qa/honest-empty-state.mjs's Dublin fixtures: all-empty -> reason; partial -> no
// reason; outside hours (nothing scheduled either) -> no reason. Exercised directly at the
// fetchStationBoard level via options.departures/options.scheduledCandidates — no network call,
// same style as the syntheticBoard assertion above.
// ---------------------------------------------------------------------------------------------
const scheduledMotolTrip = mapScheduledCandidateToTrip(
  { routeShortName: "A", stopHeadsign: "", destination: "Nemocnice Motol" },
  PRAGUE_HUB
);
assert(
  scheduledMotolTrip?.destination === "A + Nemocnice Motol",
  "mapScheduledCandidateToTrip must map a raw GTFS-shaped scheduled row to the same marketing chip a live trip would get"
);
assert(
  mapScheduledCandidateToTrip({ routeShortName: "A", destination: PRAGUE_HUB }, PRAGUE_HUB) === null,
  "mapScheduledCandidateToTrip must drop a self-terminus scheduled row, same guard as mapDepartureToTrip"
);
assert(
  mapScheduledCandidateToTrip({ routeShortName: "D", destination: "Somewhere" }, PRAGUE_HUB) === null,
  "mapScheduledCandidateToTrip must drop an unclassifiable route, same guard as mapDepartureToTrip"
);

// Case 1: all-directions-empty live board, but the static schedule expects a metro trip here
// right now — a live-feed gap, must set emptyReason.
const allEmptyBoard = await fetchStationBoard(PRAGUE_HUB, {
  departures: [],
  scheduledCandidates: [scheduledMotolTrip],
});
assert(allEmptyBoard.trips.length === 0, "synthetic all-empty board must have zero live trips");
assert(
  allEmptyBoard.emptyReason === "no-live-predictions",
  "an all-empty board with a non-empty static schedule must set emptyReason: no-live-predictions"
);

// Case 2: a board with at least one live trip elsewhere (partial) must never carry emptyReason,
// even if a synthetic static schedule would otherwise justify it for some other direction.
const partialBoard = await fetchStationBoard(PRAGUE_HUB, {
  departures: [syntheticDeparture("A", "Depo Hostivař")],
  scheduledCandidates: [scheduledMotolTrip],
});
assert(partialBoard.trips.length > 0, "partial board must carry at least one live trip");
assert(
  partialBoard.emptyReason === null,
  "a board with at least one live trip must never carry emptyReason, even if scheduledCandidates would otherwise justify it"
);

// Case 3: outside service hours (or a genuine no-more-service case) — live AND near-term static
// schedule both empty, AND today's calendar genuinely has service somewhere else this station
// (notServedToday: false, e.g. a legitimate lull between trains). Must NOT set emptyReason (there
// is nothing for the live feed to be "gapped" on, and this isn't a station-wide closure either).
// `notServedToday` is passed explicitly (docs/jim-brief-prague-line-c-closure.md) so this stays a
// pure offline unit test — without it, fetchStationBoard would call the real, network-hitting
// computeNotServedToday(), which this gate deliberately never does (file header).
const outsideHoursBoard = await fetchStationBoard(PRAGUE_HUB, {
  departures: [],
  scheduledCandidates: [],
  notServedToday: false,
});
assert(outsideHoursBoard.trips.length === 0, "outside-hours board must have zero live trips");
assert(
  outsideHoursBoard.emptyReason === null,
  "an empty board with nothing scheduled near-term, but today's calendar has service somewhere else (outside hours / a legitimate lull) must not set emptyReason"
);

// Unknown static state (computeScheduledCandidates() returning null, e.g. blob 404/stale
// calendar/network error) must behave the same as "nothing scheduled", never fabricate a reason
// from a side-computation failure. notServedToday: null models the same "unknown, not empty"
// contract computeNotServedToday() itself returns on a load failure.
const unknownStaticBoard = await fetchStationBoard(PRAGUE_HUB, {
  departures: [],
  scheduledCandidates: null,
  notServedToday: null,
});
assert(
  unknownStaticBoard.emptyReason === null,
  "an unresolvable static snapshot must never itself produce emptyReason"
);
assert(Array.isArray(unknownStaticBoard.scheduledCandidates) && unknownStaticBoard.scheduledCandidates.length === 0, "scheduledCandidates on the response must always be an array, even when the static side-computation is unavailable");

// Case 4 (docs/jim-brief-prague-line-c-closure.md): live AND near-term static schedule both
// empty, AND today's calendar genuinely has zero service here at all (notServedToday: true) — the
// station-wide "not currently served" signature (a section closure, a station under
// reconstruction). Must set emptyReason: "not-currently-served" with the station's notServed
// copy assembled by formatNotServedMessage(), never the "no-live-predictions" feed-gap reason.
const notServedBoard = await fetchStationBoard("Kačerov", {
  departures: [],
  scheduledCandidates: [],
  notServedToday: true,
});
assert(notServedBoard.trips.length === 0, "not-served board must have zero live trips");
assert(
  notServedBoard.emptyReason === "not-currently-served",
  `a station-wide zero-scheduled-today board must set emptyReason: not-currently-served, got ${JSON.stringify(notServedBoard.emptyReason)}`
);
assert(
  notServedBoard.notServedMessage === formatNotServedMessage(byName.get("Kačerov").notServed),
  "the not-served board must carry Kačerov's own notServed copy, assembled by formatNotServedMessage"
);
assert(
  /replacement bus XC/.test(notServedBoard.notServedMessage),
  `Kačerov's notServedMessage must name the replacement bus XC, got ${JSON.stringify(notServedBoard.notServedMessage)}`
);

// A station with no notServed metadata at all must fall back to the generic sentence, never throw
// or produce an empty/undefined message, if it were ever (incorrectly) flagged notServedToday.
const genericNotServedMessage = formatNotServedMessage(byName.get(PRAGUE_HUB).notServed);
assert(
  genericNotServedMessage === "No metro service at this station at the moment.",
  `a station with no notServed metadata must get the generic sentence, got ${JSON.stringify(genericNotServedMessage)}`
);

// End-to-end through the dogfood next-train pipeline: a direction the (synthetic) static
// schedule expects, with zero live confirmation, surfaces emptyReason via buildNextTrainResponse;
// a direction with no scheduled candidate at all does not.
const allEmptyNextTrain = await getPragueDogfoodNextTrain({
  station: PRAGUE_HUB,
  destination: "A + Nemocnice Motol",
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
}).catch(() => null);
// getPragueDogfoodNextTrain always calls the real fetchStationBoard (live network), which this
// gate never exercises (no key set) — MissingGolemioApiKeyError is expected and already asserted
// above; the emptyReason plumbing itself is unit-tested directly on buildNextTrainResponse by the
// city-agnostic qa/honest-empty-state.mjs, and on lib/cities/prague/dogfood-next-train.js's own
// emptyReason/scheduledForDirection logic by the fetchStationBoard-level cases above.
assert(allEmptyNextTrain === null, "getPragueDogfoodNextTrain must still throw MissingGolemioApiKeyError with no key set — honest-empty-state wiring must never bypass that guard");

// Dogfood station list comes from the catalog, not a live parse.
const dogfoodStations = listPragueDogfoodStations();
assert(dogfoodStations.length === 58, `dogfood stations must be the 58 catalog names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === PRAGUE_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodStations.every((row) => typeof row.lat === "number" && typeof row.lng === "number"), "every dogfood station must carry lat/lng");

const hubPack = getPragueDogfoodDirections(PRAGUE_HUB);
assert(hubPack.source === "prague-marketing-ends", "directions source must be prague-marketing-ends");
assert(JSON.stringify(hubPack.directions.sort()) === JSON.stringify(muzeumLabels.sort()), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness,
// regardless of live/planned status (production routes gate on assertCityLive first).
const dispatchedDirections = await getMultiCityDirections("prague", PRAGUE_HUB);
assert(
  JSON.stringify(dispatchedDirections.directions.sort()) === JSON.stringify(muzeumLabels.sort()),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "prague-marketing-ends", "live-city-api dispatch source must be prague-marketing-ends");

// The dispatched next-train call must surface MissingGolemioApiKeyError when no key is set in the
// environment (this gate never sets GOLEMIO_API_KEY), not a silent fallback board.
let dispatchedThrew = false;
try {
  await getMultiCityNextTrain("prague", {
    station: PRAGUE_HUB,
    destination: "A + Depo Hostivař",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dispatchedThrew = err instanceof MissingGolemioApiKeyError;
}
assert(dispatchedThrew, "dispatched next-train must surface MissingGolemioApiKeyError, not a silent fallback board");

let dogfoodNextTrainThrew = false;
try {
  await getPragueDogfoodNextTrain({
    station: PRAGUE_HUB,
    destination: "A + Depo Hostivař",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dogfoodNextTrainThrew = err instanceof MissingGolemioApiKeyError;
}
assert(dogfoodNextTrainThrew, "dogfood next-train must surface MissingGolemioApiKeyError, not a silent fallback board");

assert(PRAGUE_TIMEZONE === "Europe/Prague", "PRAGUE_TIMEZONE must be Europe/Prague");
assert(GOLEMIO_ROUTE_SHORT_NAME_TO_LINE.A === "a" && GOLEMIO_ROUTE_SHORT_NAME_TO_LINE.C === "c", "route-short-name map must classify Golemio's own A/B/C labels");

// Rider-facing coverage copy.
const coverage = JSON.parse(readFileSync(join(ROOT, "lib/cities/prague/coverage.json"), "utf8"));
assert(coverage.region === "prague", "coverage.json region must be prague");
assert(coverage.covered.some((c) => /Metro/.test(c.label)), "coverage.json must record Metro as covered");
assert(coverage.notCovered.some((c) => /Line D/.test(c.label)), "coverage.json must explicitly record Line D as not covered");
assert(coverage.notCovered.some((c) => /[Tt]ram/.test(c.label)), "coverage.json must explicitly record trams as not covered");
assert(coverage.notCovered.some((c) => /Flora/.test(c.label)), "coverage.json must explicitly record Flora as currently not served, with evidence");
assert(
  coverage.notCovered.some((c) => /Budějovická/.test(c.label) && /Kačerov/.test(c.label)),
  "coverage.json must explicitly record the Line C section closure (Budějovická/Kačerov/Pankrác/Roztyly), with evidence and expected reopening"
);
assert(
  coverage.notCovered.some((c) => /XC/.test(c.detail)),
  "coverage.json's Line C closure note must name the replacement bus XC"
);

// Picker/country-regions surfaces: while `status: "planned"`, a city gets no picker entry at all
// (Tim, 27 Sep 2026: docs/jim-brief-no-coming-soon-picker.md). Persistence + dogfood-mount
// whitelists are also deliberately not touched while planned — qa/live-city-lists-sync.mjs
// enforces this globally.
const manifestCityIds = buildCityManifest().cities.map((c) => c.id);
if (pragueIsLive) {
  assert(manifestCityIds.includes("prague"), "the /api/cities manifest must list Prague now that it is live");
} else {
  assert(
    !manifestCityIds.includes("prague"),
    'the /api/cities manifest must not list Prague until the flip commit (registry status must stay "planned")'
  );
}
// The bounds box exists ahead of the flip, same as Dublin/Hong Kong's — it only satisfies
// qa/live-city-lists-sync.mjs's per-live-city check once Prague is live, and is otherwise inert
// while the city isn't in the manifest at all, so this assertion holds in both states.
assert(Boolean(CITY_BOUNDS.prague), "lib/cities/city-bounds.js must carry a prague box");

console.log(
  `prague-dogfood-gate: ok (status=${entry.status}, dispatch switch-cases wired, MULTI_CITY_IDS/manifest tracking registry status, D1 pack still records 58 (Luke's historical topology, unedited), catalog carries 58 stations (17/24/20 per line — Flora restored to the catalog on the auto-detected notServed mechanism, not removed) each with lat/lng + GTFS stop_id inside CITY_BOUNDS, five stations (Flora + the Line C section closure's four) carry notServed metadata, date-aware static-coverage gate passes offline against the committed qa/fixtures/prague/gtfs snapshot at a reference date derived from the fixture's own calendar (every non-notServed station shows scheduled service, every notServed station shows none — this is the check that would have caught both Flora and the closure), honest-empty-state proven for all-empty/partial/outside-hours/unknown-static/not-currently-served cases (emptyReason: no-live-predictions vs not-currently-served, with station-specific notServedMessage), hub Muzeum A x C with Můstek A x B and Florenc B x C as separate doNotGroup interchange-triangle vertices, line+terminus direction model, full-diacritic-exact station resolution (no stripped-diacritic aliasing), self-terminus guard proven end-to-end across all 58 stations via synthetic Golemio payloads, non-metro/unknown-route rows dropped, missing-key throws surfaced consistently across dogfood/dispatch/directions/next-train, coverage.json records Metro in / Line D + trams out + Flora and the Line C closure as currently-not-served with replacement transport, Perth Australia green)`
);
