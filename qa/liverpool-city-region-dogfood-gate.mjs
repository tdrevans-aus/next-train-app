/**
 * Liverpool City Region adapter/dispatch wiring gate. Perth stays live.
 *
 * Merseyrail-via-Darwin correction (4 Sep 2026,
 * docs/jim-brief-liverpool-merseyrail-via-darwin.md): Merseyrail is a
 * National Rail TOC, not a metro system without a public feed. Both National
 * Rail and Merseyrail now go through the same shared Darwin path
 * (uk-darwin.js's fetchStationBoard(), given a pre-resolved catalog
 * entry/mode) and share the same MissingDarwinTokenError-on-no-token
 * behaviour — there is no more Merseyrail-specific "feed unconfirmed" error
 * to assert. Lime Street's former train/metro doNotGroup split (H1) is
 * closed as moot (Tim's option B, 4 Sep 2026): one catalog entry (mode
 * train, CRS LIV), one board, every operator (including Merseyrail)
 * together. Catalog is now 29 National Rail + 68 Merseyrail = 97 stations.
 *
 * No operator filters anywhere in this region (docs/board-eligibility-rule.md
 * walk-up rule) — every board must show every operator Darwin returns.
 *
 * Usage: node qa/liverpool-city-region-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  LIVERPOOL_CITY_REGION_REGION,
  LIVERPOOL_CITY_REGION_NR_HUB,
  LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB,
  LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB,
  LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB,
  resolveCatalogEntry,
  listCatalogStations,
  listMerseyrailStops,
  listNationalRailStations,
  fetchMerseyrailStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapMerseyrailDestination,
  isForbiddenCollapseName,
} from "../lib/providers/liverpool-city-region.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listLiverpoolCityRegionDogfoodStations,
  getLiverpoolCityRegionDogfoodDirections,
  getLiverpoolCityRegionDogfoodNextTrain,
  planLiverpoolCityRegionNextTrainFetch,
} from "../lib/cities/liverpool-city-region/dogfood-next-train.js";
import { loadDirectionHubs, applyDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");
assert(assertCityLive("uk-london-tfl")?.ok === true, "London (TfL) stays live");
assert(assertCityLive("west-of-england")?.ok === true, "West of England stays live");

// Registry identity + live status.
const live = assertCityLive("liverpool-city-region");
assert(live?.ok === true, "assertCityLive(liverpool-city-region) must pass");
assert(getCity("liverpool-city-region")?.status === "live", "liverpool-city-region registry status must be live");
assert(getCity("liverpool-city-region")?.adapterReady === true, "liverpool-city-region adapterReady must be true");
assert(
  getCity("liverpool-city-region")?.displayName === "Liverpool City Region",
  "liverpool-city-region display name must be Liverpool City Region"
);
assert(getCity("liverpool-city-region")?.timeZone === "Europe/London", "liverpool-city-region timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "liverpool-city-region").length === 1,
  "liverpool-city-region must appear once in the registry"
);
for (const forbiddenId of ["liverpool", "merseyrail", "lcr", "liverpool-merseyrail"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// uk-ellesmere-port was deleted 2 Sep 2026 as a standalone region (hangover, never real);
// Ellesmere Port survives only as this catalog's own Wirral Line terminus (checked below).
assert(!getCity("uk-ellesmere-port"), "uk-ellesmere-port must no longer be registered");

// Dogfood dispatch wiring — liverpool-city-region is in MULTI_CITY_IDS.
assert(isMultiCity("liverpool-city-region") === true, "liverpool-city-region must be in MULTI_CITY_IDS");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/liverpool-city-region-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/liverpool-city-region-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "liverpool-city-region", "D1 city id is liverpool-city-region");
assert(
  network.printedInnerCityNames?.nationalRailLock === LIVERPOOL_CITY_REGION_NR_HUB,
  `D1 National Rail lock must be ${LIVERPOOL_CITY_REGION_NR_HUB}`
);
assert(
  network.printedInnerCityNames?.nationalRailSecondaryLock === LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB,
  `D1 National Rail secondary lock must be ${LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB}`
);
assert(
  network.printedInnerCityNames?.merseyrailInterchangeA === LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB,
  `D1 Merseyrail interchange A must be ${LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB}`
);
assert(
  network.printedInnerCityNames?.merseyrailInterchangeB === LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB,
  `D1 Merseyrail interchange B must be ${LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(LIVERPOOL_CITY_REGION_REGION);
assert(region?.railCount === 59, `liverpool-city-region rail count must be 59 (UK station fill phase 2a, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 68, `liverpool-city-region metro count must be 68, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Liverpool Lime Street", "Liverpool South Parkway"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("LIV"), "National Rail catalog must carry LIV");
assert(railCrs.has("LPY"), "National Rail catalog must carry LPY");

const metroStops = listMerseyrailStops();
const metroNames = metroStops.map((s) => s.name);
assert(
  !metroNames.includes("Liverpool Lime Street"),
  "Merseyrail catalog must no longer carry a separate Liverpool Lime Street entry (H1 closed as moot, option B)"
);
for (const name of ["Liverpool Central", "Moorfields", "Ellesmere Port"]) {
  assert(metroNames.includes(name), `Merseyrail catalog must carry ${name}`);
}
assert(metroStops.length === 68, `Merseyrail catalog must have exactly 68 stops, got ${metroStops.length}`);
for (const stop of metroStops) {
  assert(stop.crs, `every Merseyrail catalog entry must carry a CRS, missing for ${stop.name}`);
}

const allStations = listCatalogStations();
assert(allStations.length === 127, `combined catalog must have 127 stations (59 rail + 68 metro, UK station fill phase 2a), got ${allStations.length}`);

// Lime Street: one catalog entry only (mode train, CRS LIV). Metro-mode lookup
// must resolve to nothing — H1 closed as moot, option B (4 Sep 2026).
const limeStreetRail = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "train");
const limeStreetMetro = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "metro");
assert(limeStreetRail?.crs === "LIV", "Liverpool Lime Street must resolve as a National Rail entry (crs LIV)");
assert(limeStreetMetro === null, "Liverpool Lime Street must NOT resolve a distinct Merseyrail metro entry — H1 is closed as moot");

// Forbidden ambiguous marketing tokens must never resolve.
assert(resolveCatalogEntry("Liverpool") === null, "the bare token 'Liverpool' must never resolve as a station");
assert(isForbiddenCollapseName("Liverpool Station") === true, "'Liverpool Station' must never resolve as a station");
assert(isForbiddenCollapseName("Lime Street Station") === true, "'Lime Street Station' must never resolve as a station");

// Direction model — line + terminus, only for confirmed termini; interchanges get no guessed chips.
// This is a separate marketing model from live directions (below) and does not gate them.
const ellesmerePortLabels = marketingLabelsForStation("Ellesmere Port");
assert(ellesmerePortLabels.includes("Wirral Line + Liverpool"), "Ellesmere Port must offer Wirral Line + Liverpool");
assert(ellesmerePortLabels.includes("Wirral Line + West Kirby"), "Ellesmere Port must offer Wirral Line + West Kirby");
assert(ellesmerePortLabels.includes("Wirral Line + Chester"), "Ellesmere Port must offer Wirral Line + Chester");
assert(
  !ellesmerePortLabels.some((label) => label.includes("+ Ellesmere Port")),
  "Ellesmere Port must never show itself as a destination"
);

const centralLabels = marketingLabelsForStation("Liverpool Central");
assert(
  centralLabels.length === 0,
  "Liverpool Central must not generate any marketing direction chip — whether all branch destinations call there vs Moorfields is unconfirmed, per direction-model-memo.md (unrelated to live directions, which derive from Darwin)"
);
const moorfieldsLabels = marketingLabelsForStation("Moorfields");
assert(moorfieldsLabels.length === 0, "Moorfields must not generate any marketing direction chip — same unresolved-split reason as Liverpool Central");

assert(
  mapMerseyrailDestination("Southport", "Northern Line") === "Northern Line + Southport",
  "mapMerseyrailDestination must map a confirmed terminus"
);
assert(
  mapMerseyrailDestination("Central", "Northern Line") === null,
  "mapMerseyrailDestination must not fabricate an unconfirmed interchange chip"
);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listLiverpoolCityRegionDogfoodStations();
assert(
  dogfoodStations.length === 127,
  `dogfood stations must be the 127 full-network catalog names (59 rail + 68 metro, UK station fill phase 2a), got ${dogfoodStations.length}`
);
const hubEntries = dogfoodStations.filter((s) => s.name === LIVERPOOL_CITY_REGION_NR_HUB);
assert(hubEntries.length === 1, "Liverpool Lime Street must appear exactly once in the dogfood list (H1 closed as moot, option B)");
assert(hubEntries[0].mode === "train", "the single Liverpool Lime Street dogfood entry must be mode train");

// Direction hub anchoring (FB-51, docs/jim-brief-fb51-liverpool-city-region.md) —
// Liverpool City Region is on the shared lib/cities/uk/direction-hubs.js helper,
// operator-split shape (hub label IS the terminus). Token-free: hub file
// load/validation, applyDirectionHubs() and the pure planner are all data-only.
const { hubs: lcrHubs } = loadDirectionHubs(LIVERPOOL_CITY_REGION_REGION);
assert(lcrHubs.length === 1, "liverpool-city-region direction-hubs.json must define exactly one hub for v1");
const limeStreetHub = lcrHubs[0];
assert(limeStreetHub.label === LIVERPOOL_CITY_REGION_NR_HUB, `the v1 hub label must be ${LIVERPOOL_CITY_REGION_NR_HUB}`);
assert(limeStreetHub.filterCrs === "LIV", "the Liverpool Lime Street hub filterCrs must be LIV");
assert(
  JSON.stringify([...limeStreetHub.appliesFrom].sort()) ===
    JSON.stringify(["LEG", "LPY", "MSH", "NLW", "RUN", "SHJ", "SNH", "WID"]),
  `Liverpool Lime Street hub appliesFrom must be exactly [LEG, LPY, MSH, NLW, RUN, SHJ, SNH, WID], got ${JSON.stringify(limeStreetHub.appliesFrom)}`
);
assert(
  JSON.stringify(limeStreetHub.absorbs) === JSON.stringify(["Liverpool Lime Street"]),
  "the Liverpool Lime Street hub must absorb only Liverpool Lime Street itself (operator-split collapse, nothing else)"
);

// applyDirectionHubs() with the brief's live-probed Runcorn chip set (three
// Liverpool Lime Street operator chips collapse to one; the other two chips
// keep their own printed terminus untouched).
const runChips = [
  "Birmingham New Street (LNR & WMR)",
  "Liverpool Lime Street (Avanti West Coast)",
  "Liverpool Lime Street (LNR & WMR)",
  "Liverpool Lime Street (Transport for Wales)",
  "Llandudno (Transport for Wales)",
  "London Euston (Avanti West Coast)",
];
const runResult = applyDirectionHubs(runChips, "RUN", lcrHubs);
assert(
  JSON.stringify(runResult) ===
    JSON.stringify([
      "Birmingham New Street (LNR & WMR)",
      "Liverpool Lime Street",
      "Llandudno (Transport for Wales)",
      "London Euston (Avanti West Coast)",
    ]),
  `applyDirectionHubs at RUN must collapse the three Liverpool Lime Street operator chips to one and leave the rest untouched, got ${JSON.stringify(runResult)}`
);

// Same fixture at LIV (not in appliesFrom) must be returned unchanged (sorted).
const livResult = applyDirectionHubs(runChips, "LIV", lcrHubs);
assert(
  JSON.stringify(livResult) === JSON.stringify([...runChips].sort((a, b) => a.localeCompare(b))),
  `applyDirectionHubs at LIV (not appliesFrom) must return the fixture chips unchanged (sorted), got ${JSON.stringify(livResult)}`
);

// planLiverpoolCityRegionNextTrainFetch() — pure routing decision table, token-free.
const runEntryTrain = resolveCatalogEntry("Runcorn", "train");
const limeStreetEntryTrain = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "train");
const hubPlan = planLiverpoolCityRegionNextTrainFetch(runEntryTrain, "train", LIVERPOOL_CITY_REGION_NR_HUB, lcrHubs);
assert(
  hubPlan.kind === "hub" && hubPlan.filterCrs === "LIV",
  `planLiverpoolCityRegionNextTrainFetch at RUN for "${LIVERPOOL_CITY_REGION_NR_HUB}" must be a hub plan filtered to LIV, got ${JSON.stringify(hubPlan)}`
);

const exactPlan = planLiverpoolCityRegionNextTrainFetch(
  limeStreetEntryTrain,
  "train",
  "Manchester Oxford Road (Northern)",
  lcrHubs
);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "MCO",
  `planLiverpoolCityRegionNextTrainFetch at Liverpool Lime Street for Manchester Oxford Road must be an exact plan filtered to MCO, got ${JSON.stringify(exactPlan)}`
);

const undirectedPlan = planLiverpoolCityRegionNextTrainFetch(limeStreetEntryTrain, "train", "Nowhere (X)", lcrHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planLiverpoolCityRegionNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Metro mode must never consult hubs, even for a destination that matches the hub label exactly.
const metroPlan = planLiverpoolCityRegionNextTrainFetch(runEntryTrain, "metro", LIVERPOOL_CITY_REGION_NR_HUB, lcrHubs);
assert(
  metroPlan.kind === "undirected",
  `planLiverpoolCityRegionNextTrainFetch must be undirected for metro mode regardless of destination, got ${JSON.stringify(metroPlan)}`
);

// --- Structural: with no live token, every Merseyrail station's metro-mode
// lookup must surface MissingDarwinTokenError, never a different/no error. ---
async function probeMissingToken(station, mode) {
  try {
    await getLiverpoolCityRegionDogfoodDirections(station, { mode });
    return { threw: false };
  } catch (err) {
    return { threw: true, isMissingToken: err instanceof MissingDarwinTokenError };
  }
}

const hasToken = Boolean(String(process.env.DARWIN_LDB_TOKEN ?? "").trim());

if (!hasToken) {
  const ep = await probeMissingToken("Ellesmere Port", "metro");
  assert(ep.threw && ep.isMissingToken, "with no DARWIN_LDB_TOKEN, metro-mode Ellesmere Port must surface MissingDarwinTokenError");

  // Structural (no network): every one of the 68 Merseyrail entries resolves
  // to a non-null CRS and dispatches into fetchMerseyrailStopBoard (which
  // fails closed with MissingDarwinTokenError, not a different/no error).
  for (const stop of metroStops) {
    const entry = resolveCatalogEntry(stop.name, "metro");
    assert(entry?.crs, `metro entry ${stop.name} must resolve to a non-null CRS`);
    let threwMissingToken = false;
    try {
      await fetchMerseyrailStopBoard(stop.name);
    } catch (err) {
      threwMissingToken = err instanceof MissingDarwinTokenError;
    }
    assert(threwMissingToken, `fetchMerseyrailStopBoard(${stop.name}) must surface MissingDarwinTokenError with no token set`);
  }
  console.log(
    "liverpool-city-region-dogfood-gate: DARWIN_LDB_TOKEN not set — structural-only pass (all 68 Merseyrail entries resolve to a CRS and fail closed with MissingDarwinTokenError); live sample skipped (expected outside Vercel prod)."
  );
} else {
  // Live sample: Ellesmere Port, Liverpool Central, Moorfields, and one
  // unnamed intermediate stop each return at least one Merseyrail trip.
  for (const station of ["Ellesmere Port", "Liverpool Central", "Moorfields", "Aigburth"]) {
    const board = await fetchMerseyrailStopBoard(station);
    assert(Array.isArray(board.trips), `${station} metro board must return a trips array`);
    assert(
      board.trips.some((trip) => String(trip.operator ?? "").includes("Merseyrail")),
      `${station} metro board must include at least one Merseyrail trip`
    );
  }

  // Lime Street: Merseyrail trips alongside other operators, one board.
  const limeStreetBoard = await fetchNationalRailBoard(LIVERPOOL_CITY_REGION_NR_HUB);
  const limeStreetOperators = new Set(limeStreetBoard.trips.map((trip) => trip.operator).filter(Boolean));
  assert(
    [...limeStreetOperators].some((op) => op.includes("Merseyrail")),
    "Liverpool Lime Street board must include Merseyrail trips"
  );
  assert(
    [...limeStreetOperators].some((op) => !op.includes("Merseyrail")),
    "Liverpool Lime Street board must include at least one non-Merseyrail operator alongside Merseyrail"
  );

  // Direction hub anchoring end-to-end (FB-51): the hub next-train path
  // (Runcorn -> Liverpool Lime Street) must return trips whose
  // printedDestination equals Liverpool Lime Street, and Merseyrail/metro
  // mode must remain completely unaffected (byte-for-byte, no hub applied).
  const hubNextTrain = await getLiverpoolCityRegionDogfoodNextTrain({
    station: "Runcorn",
    mode: "train",
    destination: LIVERPOOL_CITY_REGION_NR_HUB,
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
  assert(
    hubNextTrain.config?.destination === LIVERPOOL_CITY_REGION_NR_HUB,
    "hub next-train destination must be the hub label Liverpool Lime Street"
  );
  for (const trip of hubNextTrain.upcoming ?? []) {
    assert(
      trip.printedDestination === LIVERPOOL_CITY_REGION_NR_HUB,
      "hub next-train trips must carry printedDestination === Liverpool Lime Street"
    );
  }

  const limeDirections = await getLiverpoolCityRegionDogfoodDirections(LIVERPOOL_CITY_REGION_NR_HUB, { mode: "train" });
  const mcoChip = limeDirections.directions.find((chip) => chip.startsWith("Manchester Oxford Road"));
  if (mcoChip) {
    const exactNextTrain = await getLiverpoolCityRegionDogfoodNextTrain({
      station: LIVERPOOL_CITY_REGION_NR_HUB,
      mode: "train",
      destination: mcoChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(exactNextTrain.config?.destination === mcoChip, "exact-chip next-train destination must equal the chosen chip");
    for (const trip of exactNextTrain.upcoming ?? []) {
      assert(
        typeof trip.printedDestination === "string" && trip.printedDestination.length > 0,
        "exact-chip next-train trips must carry printedDestination"
      );
    }
  } else {
    console.log(
      "liverpool-city-region-dogfood-gate: no Manchester Oxford Road chip in this live sample at Liverpool Lime Street — exact-chip end-to-end check skipped (hub-path end-to-end above still exercised)."
    );
  }

  // Merseyrail/metro mode must remain undirected even for the hub's own label.
  const merseyrailUnaffected = await getLiverpoolCityRegionDogfoodDirections("Ellesmere Port", { mode: "metro" });
  assert(
    !merseyrailUnaffected.directions.includes(LIVERPOOL_CITY_REGION_NR_HUB),
    "Merseyrail/metro directions must never be post-processed by the National Rail hub table"
  );
}

// getMultiCityNextTrain must resolve to Liverpool City Region's dogfood next-train module.
assert(
  typeof getLiverpoolCityRegionDogfoodNextTrain === "function",
  "getLiverpoolCityRegionDogfoodNextTrain must be exported for live-city-api to dispatch to"
);

let unknownThrew = false;
try {
  await getLiverpoolCityRegionDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getLiverpoolCityRegionDogfoodDirections must not silently succeed for an unknown station");

// Provider-level dispatcher sanity: metro-mode Lime Street must resolve to
// nothing (not fall through to the rail board).
let limeStreetMetroDispatchThrew = false;
try {
  await getLiverpoolCityRegionDogfoodDirections(LIVERPOOL_CITY_REGION_NR_HUB, { mode: "metro" });
} catch {
  limeStreetMetroDispatchThrew = true;
}
assert(
  limeStreetMetroDispatchThrew,
  "explicit metro-mode lookup of Liverpool Lime Street must not resolve — H1 closed as moot, option B"
);

assert(getNotInRegion(LIVERPOOL_CITY_REGION_REGION) !== undefined, "getNotInRegion must remain callable for this region");
void fetchStationBoard; // exercised implicitly via fetchNationalRailBoard/fetchMerseyrailStopBoard above.
void getMultiCityDirections; // exercised implicitly by isMultiCity/dispatch wiring checks above.

// Probe plumbing: local express only; Vercel dev board must 404 regardless.
const previous = process.env.ALLOW_CITY_PROBES;
delete process.env.ALLOW_CITY_PROBES;
assert(isCityProbeAllowed() === false, "CI/default must not allow city probes");
process.env.ALLOW_CITY_PROBES = "1";
assert(isCityProbeAllowed() === true, "ALLOW_CITY_PROBES=1 enables local express probes only");

const res = {
  statusCode: 0,
  body: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  end() {},
};
await vercelBoard({ method: "GET", query: { city: "liverpool-city-region", station: LIVERPOOL_CITY_REGION_NR_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "liverpool-city-region-dogfood-gate: ok (live/adapterReady, dispatch switch-case wired, D1 pack, 59 rail + 68 Merseyrail stations = 127 total, Lime Street H1 closed as moot (one entry, mode train, CRS LIV), Merseyrail now Darwin-served via the shared uk-darwin.js path (no operator filters), direction-hubs.json loads/validates and the Liverpool Lime Street operator-split hub (LEG/LPY/MSH/NLW/RUN/SHJ/SNH/WID) collapses the operator-suffixed chips into one via the shared uk/direction-hubs.js helper while Merseyrail/metro stays untouched, exact-chip routing table (hub/exact/undirected) proven token-free via planLiverpoolCityRegionNextTrainFetch with the national rail-crs-index fallback, Perth/London TfL/West of England stay green)"
);
