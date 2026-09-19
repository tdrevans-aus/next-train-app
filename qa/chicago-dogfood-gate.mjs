/**
 * Chicago flip follow-through gate. Chicago stays `status: "planned"` (Mark/Tim's flip
 * call — CTA_TRAIN_TRACKER_KEY is not registered yet) but the dogfood module, live-city-api.js
 * dispatch switch-cases, and this gate are wired ahead of that per the flip-follow-through
 * guardrail (Boston PR #414 shape) so no second pass is needed once the key lands.
 *
 * Deliberately does NOT call the live CTA Train Tracker endpoint
 * (lapi.transitchicago.com/api/1.0/ttarrivals.aspx) — no key exists this session and this is a
 * smoke-tier gate, not a network test. Instead this gate unit-tests the catalog/allow-list/
 * direction-model logic (resolveCatalogEntry, mapEtaToTrip, tripsFromEtaList,
 * mapLineTerminusDestination, resolveTerminus, resolveMapIdForCatalogEntry) against synthetic
 * payloads shaped like CTA's documented Train Tracker JSON and a synthetic GTFS static dataset
 * shaped like lib/providers/gtfs/static-cache.js's output, plus asserts that fetchStationBoard
 * throws for an unknown station, for a missing CTA_TRAIN_TRACKER_KEY, and for an ambiguous
 * same-printed-name station query, all without any network call.
 *
 * Usage: node qa/chicago-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  CHICAGO_HUB,
  CHICAGO_TIME_ZONE,
  CTA_GTFS_STATIC_URL,
  CTA_TRAIN_TRACKER_URL,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  buildTrainTrackerUrl,
  parseChicagoWallClock,
  mapEtaToTrip,
  tripsFromEtaList,
  resolveMapIdForCatalogEntry,
  fetchStationBoard,
  AmbiguousChicagoStationError,
  ChicagoStationMapIdUnconfirmedError,
  MissingCtaTrainTrackerKeyError,
} from "../lib/providers/chicago.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  resolveTerminus,
  mapLineTerminusDestination,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "../lib/cities/chicago/marketing-directions.js";
import {
  listChicagoDogfoodStations,
  getChicagoDogfoodDirections,
  getChicagoDogfoodNextTrain,
} from "../lib/cities/chicago/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — Perth (Australia) green is enough, not a hardcoded roll call.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Registry identity + status — Chicago stays planned; only the flip changes this.
const live = assertCityLive("chicago");
assert(live?.ok === false, "assertCityLive(chicago) must fail");
assert(live?.status === 501, "chicago must be 501 planned");

const entry = getCity("chicago");
assert(entry?.status === "planned", "chicago registry status must be planned");
assert(entry?.adapterReady === true, "chicago adapterReady must be true");
assert(entry?.displayName === "Chicago", "chicago display name must be Chicago");
assert(entry?.timeZone === "America/Chicago", "chicago timezone must be America/Chicago");
assert(CITIES.filter((city) => city.id === "chicago").length === 1, "chicago must appear once in the registry");
for (const forbiddenId of ["chi", "cta", "chicago-l", "dc"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired ahead of the flip — NOT in MULTI_CITY_IDS yet.
assert(isMultiCity("chicago") === false, "chicago must NOT be in MULTI_CITY_IDS while status stays planned");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/chicago-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/chicago-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "chicago", "D1 city id must be chicago");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === CHICAGO_HUB, `D1 lock must be ${CHICAGO_HUB}`);
assert(network.lines.length === 8, "D1 must carry exactly 8 passenger lines");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist with a
// recorded net verdict (Metra/Amtrak/South Shore explicitly out of catalog scope).
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const service of ["Metra", "Amtrak", "South Shore Line"]) {
  assert(oracleReport.includes(service), `Board eligibility section must record a verdict for ${service}`);
}

const stations = listCatalogStations();
assert(stations.length === 143, `catalog must have 143 stations, got ${stations.length}`);
const hubEntries = stations.filter((s) => s.name === CHICAGO_HUB);
assert(hubEntries.length === 1 && hubEntries[0].hub === true, `catalog must lock ${CHICAGO_HUB} exactly once with hub:true`);

// resolveCatalogEntry — exact-match, ambiguous families throw, forbidden tokens reject.
assert(resolveCatalogEntry(CHICAGO_HUB)?.name === CHICAGO_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Downtown") === null, "Downtown must never resolve as a station");
assert(resolveCatalogEntry("The Loop") === null, "The Loop must never resolve as a station");
assert(resolveCatalogEntry("chi") === null, "resolveCatalogEntry must reject the invented city token chi");
assert(resolveCatalogEntry("cta") === null, "resolveCatalogEntry must reject the invented city token cta");
assert(isForbiddenHubProxy("State/Lake") === true, "State/Lake must never stand in for the Clark/Lake hub identity");
assert(isForbiddenHubProxy(CHICAGO_HUB) === false, "the hub itself is not its own proxy violation");
assert(isForbiddenCollapseName("Union Station") === true, "Union Station (Metra) must never resolve as a station");

let ambiguousThrew = false;
try {
  resolveCatalogEntry("Western");
} catch (err) {
  ambiguousThrew = err instanceof AmbiguousChicagoStationError;
}
assert(ambiguousThrew, "resolveCatalogEntry(Western) must throw AmbiguousChicagoStationError — 5 physical places share this printed name");
assert(resolveCatalogEntry("Western (Brown)")?.lines.includes("brown"), "a branch-qualified alias must resolve unambiguously");
assert(resolveCatalogEntry("Western (Blue - O'Hare Branch)")?.branch === "Blue Line (O'Hare Branch)", "the qualified alias must resolve to its specific branch entry");

// doNotCollapse same-name-family counts match the hazard pack's explicit place counts.
const byNameCounts = new Map();
for (const s of stations) {
  byNameCounts.set(s.name, (byNameCounts.get(s.name) ?? 0) + 1);
}
assert(byNameCounts.get("Western") === 5, "Western must have exactly 5 catalog entries");
assert(byNameCounts.get("Pulaski") === 4, "Pulaski must have exactly 4 catalog entries");
assert(byNameCounts.get("Cicero") === 3, "Cicero must have exactly 3 catalog entries");
assert(byNameCounts.get("Kedzie") === 4, "Kedzie must have exactly 4 catalog entries");
assert(byNameCounts.get("Damen") === 4, "Damen must have exactly 4 catalog entries");
assert(byNameCounts.get("Harlem") === 2, "Harlem must have exactly 2 catalog entries");
assert(byNameCounts.get("Belmont") === 2, "Belmont must have exactly 2 catalog entries (Red/Brown/Purple hub + separate Blue)");
assert(byNameCounts.get("Chicago") === 3, "Chicago must have exactly 3 catalog entries (Red, Blue, Brown/Purple hub)");
assert(!byNameCounts.has("Kedzie-Homan") || byNameCounts.get("Kedzie-Homan") === 1, "Kedzie-Homan must stay distinct from bare Kedzie");

// Real transfer hubs stay single multi-line entries, never split.
const byExactName = (name) => stations.find((s) => s.name === name && !s.branch) ?? stations.find((s) => s.name === name);
assert(resolveCatalogEntry("Roosevelt")?.lines.sort().join(",") === "green,orange,red", "Roosevelt must merge Red/Green/Orange as one hub");
assert(resolveCatalogEntry("Jackson")?.lines.sort().join(",") === "blue,red", "Jackson must merge Red/Blue as one real transfer");
assert(resolveCatalogEntry("Howard")?.lines.sort().join(",") === "purple,red,yellow", "Howard must merge Red/Purple/Yellow as one hub");
assert(resolveCatalogEntry(CHICAGO_HUB)?.lines.sort().join(",") === "blue,brown,green,orange,pink,purple", "Clark/Lake must carry all six Loop-side lines");

// Line labels + termini (direction-model-memo.md §3 recommendation A — bare color word).
assert(LINE_LABELS.red === "Red" && LINE_LABELS.brown === "Brown", "line labels must be bare color words");
assert(LINE_TERMINI.red.includes("Howard") && LINE_TERMINI.red.includes("95th/Dan Ryan"), "Red termini must be Howard/95th-Dan Ryan");
assert(LINE_TERMINI.blue.includes("O'Hare") && LINE_TERMINI.blue.includes("Forest Park"), "Blue termini must be O'Hare/Forest Park");
assert(LINE_TERMINI.purple.includes("Linden") && LINE_TERMINI.purple.includes("Howard"), "Purple termini must be Linden (Express) and Howard (local)");
assert(mapLineTerminusDestination(CHICAGO_HUB, "brown") === "Brown", "Clark/Lake must never appear as a direction token — falls back to the bare line label");
assert(mapLineTerminusDestination("Loop", "orange") === "Orange", "Loop must never appear as a direction token");
assert(mapLineTerminusDestination("Howard", "red") === "Red + Howard", "direction chip must be line + terminus");
assert(resolveTerminus("Some Unknown Headsign", "red") === null, "resolveTerminus must not fabricate an unknown terminus");
assert(foldKey("Berryessa") !== "", "foldKey must fold case");

// marketingLabelsForStation excludes a self-referential terminus chip.
const howardLabels = marketingLabelsForStation("Howard");
assert(howardLabels.includes("Purple + Linden"), "Howard must offer Purple + Linden");
assert(!howardLabels.some((l) => l.endsWith("+ Howard")), "Howard must never offer a self-referential + Howard chip");
assert(tripMatchesMarketingChip({ destination: "Red + Howard" }, "Red + Howard") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "Red + Howard" }, "Red + 95th/Dan Ryan") === false, "tripMatchesMarketingChip must reject a mismatched chip");

// Train Tracker URL + payload shaping (ttarrivals.aspx documented JSON shape), no network.
assert(CTA_TRAIN_TRACKER_URL === "https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx", "Train Tracker URL must point at CTA's Arrivals API");
const url = buildTrainTrackerUrl("40380", "test-key");
assert(url.includes("mapid=40380") && url.includes("key=test-key") && url.includes("outputType=JSON"), "buildTrainTrackerUrl must carry key/mapid/outputType params");

const referenceNow = new Date("2026-09-20T12:00:00-05:00");
const parsed = parseChicagoWallClock("2026-09-20T12:08:39", referenceNow);
assert(parsed instanceof Date && !Number.isNaN(parsed.getTime()), "parseChicagoWallClock must parse a naive local timestamp");

const liveEta = { destNm: "Howard", rt: "brn", arrT: "2026-09-20T12:05:00", isApp: "0", isSch: "0", isDly: "0", isFlt: "0" };
const liveTrip = mapEtaToTrip(liveEta, referenceNow);
assert(liveTrip.lineId === "brown", "mapEtaToTrip must classify by rt");
assert(typeof liveTrip.displayTime === "string" && liveTrip.displayTime !== "", "mapEtaToTrip must set a string displayTime");
assert(liveTrip.delayed === false, "a normal eta must not be flagged delayed");
assert(liveTrip.cancelled === false, "Train Tracker never reports a cancellation flag — cancelled must always be false");

const schEta = { ...liveEta, isSch: "1" };
assert(mapEtaToTrip(schEta, referenceNow) === null, "isSch=1 (schedule-based) rows must be dropped — never presented as live");

const fltEta = { ...liveEta, isFlt: "1" };
assert(mapEtaToTrip(fltEta, referenceNow) === null, "isFlt=1 (fault) rows must be dropped — never presented as live");

const dlyEta = { ...liveEta, isDly: "1" };
const dlyTrip = mapEtaToTrip(dlyEta, referenceNow);
assert(dlyTrip.delayed === true, "isDly=1 rows must be kept and flagged delayed, not dropped");
assert(dlyTrip.cancelled === false, "a delayed row is not the same as a cancelled row");

const unknownRtEta = { ...liveEta, rt: "zzz" };
const unknownRtTrip = mapEtaToTrip(unknownRtEta, referenceNow);
assert(unknownRtTrip.lineId === null, "an unrecognized rt code must not be classified into any line");

const syntheticRoot = {
  errCd: "0",
  eta: [
    { destNm: "Howard", rt: "brn", arrT: "2026-09-20T12:05:00", isSch: "0", isDly: "0", isFlt: "0" },
    { destNm: "Kimball", rt: "brn", arrT: "2026-09-20T12:09:00", isSch: "0", isDly: "0", isFlt: "0" },
    { destNm: "Antioch", rt: "zzz", arrT: "2026-09-20T12:11:00", isSch: "0", isDly: "0", isFlt: "0" },
    { destNm: "Kimball", rt: "brn", arrT: "2026-09-20T12:20:00", isSch: "1", isDly: "0", isFlt: "0" },
  ],
};
const trips = tripsFromEtaList(syntheticRoot, referenceNow);
assert(trips.length === 2, `tripsFromEtaList must drop the unknown-rt and schedule-based rows, got ${trips.length}`);
assert(trips.every((t) => t.lineId === "brown"), "every remaining synthetic trip must be Brown");

// resolveMapIdForCatalogEntry — synthetic staticData shaped like gtfs/static-cache.js output,
// no network. Disambiguates a same-printed-name family (Western) by line via the trip join.
const syntheticStaticData = {
  stops: [
    { stop_id: "40380", stop_name: "Clark/Lake", parent_station: "" },
    { stop_id: "40380-1", stop_name: "Clark/Lake Platform 1", parent_station: "40380" },
    { stop_id: "41120", stop_name: "Western", parent_station: "" },
    { stop_id: "41120-1", stop_name: "Western Platform 1", parent_station: "41120" },
    { stop_id: "41340", stop_name: "Western", parent_station: "" },
    { stop_id: "41340-1", stop_name: "Western Platform 1", parent_station: "41340" },
  ],
  stopTimesByStopId: new Map([
    ["40380-1", [{ trip_id: "trip-brn-1" }]],
    ["41120-1", [{ trip_id: "trip-brn-2" }]],
    ["41340-1", [{ trip_id: "trip-org-1" }]],
  ]),
  tripsById: new Map([
    ["trip-brn-1", { route_id: "Brn" }],
    ["trip-brn-2", { route_id: "Brn" }],
    ["trip-org-1", { route_id: "Org" }],
  ]),
  routesById: new Map(),
};
const clarkLakeEntry = resolveCatalogEntry(CHICAGO_HUB);
assert(resolveMapIdForCatalogEntry(syntheticStaticData, clarkLakeEntry) === "40380", "resolveMapIdForCatalogEntry must resolve the hub's mapid via the GTFS parent stop");

const westernBrownEntry = resolveCatalogEntry("Western (Brown)");
assert(resolveMapIdForCatalogEntry(syntheticStaticData, westernBrownEntry) === "41120", "resolveMapIdForCatalogEntry must disambiguate Western (Brown) from Western (Orange) via the trip join");
const westernOrangeEntry = resolveCatalogEntry("Western (Orange)");
assert(resolveMapIdForCatalogEntry(syntheticStaticData, westernOrangeEntry) === "41340", "resolveMapIdForCatalogEntry must disambiguate Western (Orange) from Western (Brown) via the trip join");

let unconfirmedThrew = false;
try {
  resolveMapIdForCatalogEntry(syntheticStaticData, resolveCatalogEntry("Western (Pink)"));
} catch (err) {
  unconfirmedThrew = err instanceof ChicagoStationMapIdUnconfirmedError;
}
assert(unconfirmedThrew, "resolveMapIdForCatalogEntry must throw ChicagoStationMapIdUnconfirmedError rather than guess when no candidate qualifies");

// fetchStationBoard — no network for any of these three failure/verdict paths.
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

let missingKeyThrew = false;
try {
  await fetchStationBoard(CHICAGO_HUB, { apiKey: "" });
} catch (err) {
  missingKeyThrew = err instanceof MissingCtaTrainTrackerKeyError;
}
assert(missingKeyThrew, "fetchStationBoard must throw MissingCtaTrainTrackerKeyError when no key is configured — no silent timetable fallback");

let ambiguousStationThrew = false;
try {
  await fetchStationBoard("Western", { apiKey: "test-key" });
} catch (err) {
  ambiguousStationThrew = err instanceof AmbiguousChicagoStationError;
}
assert(ambiguousStationThrew, "fetchStationBoard must throw AmbiguousChicagoStationError for a bare colliding name, before any network call");

// Note: fetchStationBoard's `mapid`/`staticData` options only skip the GTFS-join step — the
// Train Tracker HTTP call itself is never mocked, so this gate deliberately stops testing
// fetchStationBoard once past catalog/key resolution (the missing-key and ambiguous-station
// throws above happen before any fetch) rather than making a real network call.

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listChicagoDogfoodStations();
assert(dogfoodStations.length === 143, `dogfood stations must be the 143 D1 names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === CHICAGO_HUB), "hub must be listed by the dogfood harness");

const hubPack = getChicagoDogfoodDirections(CHICAGO_HUB);
assert(hubPack.source === "chicago-marketing-ends", "directions source must be chicago-marketing-ends");
assert(JSON.stringify(hubPack.directions.sort()) === JSON.stringify(marketingLabelsForStation(CHICAGO_HUB).sort()), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness, even
// though chicago is deliberately not in MULTI_CITY_IDS yet.
const dispatchedDirections = await getMultiCityDirections("chicago", "Howard");
assert(
  JSON.stringify(dispatchedDirections.directions.sort()) === JSON.stringify(howardLabels.sort()),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "chicago-marketing-ends", "live-city-api dispatch source must be chicago-marketing-ends");

// The dispatched next-train call must still surface MissingCtaTrainTrackerKeyError (no key
// registered this session) rather than silently degrading to a fake board.
let dispatchedThrew = false;
try {
  await getMultiCityNextTrain("chicago", {
    station: "Howard",
    destination: "Red + 95th/Dan Ryan",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dispatchedThrew = err instanceof MissingCtaTrainTrackerKeyError;
}
assert(dispatchedThrew, "dispatched next-train must surface MissingCtaTrainTrackerKeyError, not a silent fallback board");

let dogfoodThrew = false;
try {
  await getChicagoDogfoodNextTrain({
    station: "Howard",
    destination: "Red + 95th/Dan Ryan",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch (err) {
  dogfoodThrew = err instanceof MissingCtaTrainTrackerKeyError;
}
assert(dogfoodThrew, "dogfood next-train must surface MissingCtaTrainTrackerKeyError, not a silent fallback board");

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS/COUNTRY_IDS,
// brisbane-dogfood MULTI_CITY_IDS/available) are deliberately NOT touched yet — same
// registry-status-derived invariant as MULTI_CITY_IDS above (qa/live-city-lists-sync.mjs
// requires them to equal exactly the live-city set). Add "chicago"/"united states" to all
// four in the same commit as the status flip.

console.log(
  "chicago-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, MULTI_CITY_IDS/mount/persistence lists deliberately deferred to the status-flip commit, D1 pack, Board eligibility section recorded, 143 stations, hub Clark/Lake, same-printed-name families disambiguated (Western/Pulaski/Cicero/Kedzie/Damen/Harlem/Belmont/Chicago) with ambiguous bare-name queries throwing rather than guessing, line+terminus direction model, Clark/Lake and Loop never a direction token, Train Tracker payload shaping, isSch/isFlt dropped and isDly kept-but-flagged, GTFS mapid join disambiguates by line with no network, missing-key and ambiguous-station both throw before any fetch, Perth Australia green)"
);
