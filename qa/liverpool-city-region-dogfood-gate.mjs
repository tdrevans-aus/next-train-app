/**
 * Liverpool City Region adapter/dispatch wiring gate for its live flip. Perth stays live.
 *
 * Replaces liverpool-city-region-planned-gate.mjs, migrating its still-relevant
 * catalog/D1/hub-lock/direction-model assertions to the live shape and adding
 * the dispatch-wiring checks every flip adds (see the West of England /
 * East Midlands / West Midlands precedent).
 *
 * Two agencies, two very different outcomes once wired:
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists. Tolerates MissingDarwinTokenError
 *    in sandboxes without DARWIN_LDB_TOKEN set (expected outside Vercel
 *    prod), same as every other UK region.
 *  - Merseyrail (Northern Line + Wirral Line): no confirmed public
 *    real-time feed exists at all (static GTFS is confirmed live via
 *    Transitland, but real-time is a genuine, permanent unknown — same
 *    shape as Greater Manchester's Metrolink gap and South Yorkshire's
 *    Supertram/SYFTL gap). fetchMerseyrailStopBoard() throws
 *    MerseyrailFeedUnconfirmedError unconditionally. This gate asserts the
 *    dogfood dispatch surfaces that error rather than swallowing it or
 *    falling back to the static line+terminus label list.
 *
 * Liverpool Lime Street's doNotGroup hub lock (H1, structural ambiguity
 * between National Rail and Merseyrail at Lime Street) is preserved as-is,
 * NOT resolved by this gate or the adapter it exercises — see
 * lib/providers/liverpool-city-region.js file header and
 * docs/liverpool-city-region-d1/hazard-pack.md H1.
 *
 * NOTE for Mark: at the commit this gate was written, liverpool-city-region
 * is still `status: "planned"` in the registry (Jim never flips that line
 * himself). This gate's registry-status/adapterReady/isMultiCity assertions
 * are therefore written for the POST-FLIP state and will only pass once
 * Mark's flip commit lands (status -> "live", liverpool-city-region added to
 * MULTI_CITY_IDS). See docs/liverpool-city-region-d1/jim-handoff.md's "Flip
 * commit — list additions for Mark" section for the exact one-line adds.
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
  MerseyrailFeedUnconfirmedError,
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
} from "../lib/cities/liverpool-city-region/dogfood-next-train.js";

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

// Registry identity + live status. Only true once Mark's flip commit lands —
// see the file-header note.
const live = assertCityLive("liverpool-city-region");
assert(live?.ok === true, "assertCityLive(liverpool-city-region) must pass post-flip");
assert(getCity("liverpool-city-region")?.status === "live", "liverpool-city-region registry status must be live post-flip");
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

// Dogfood dispatch wiring — liverpool-city-region is in MULTI_CITY_IDS post-flip.
assert(isMultiCity("liverpool-city-region") === true, "liverpool-city-region must be in MULTI_CITY_IDS post-flip");

// D1 pack presence (absorbed from the retired liverpool-city-region-planned-gate).
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
assert(region?.railCount === 2, `liverpool-city-region rail count must be 2, got ${region?.railCount}`);
assert(region?.metroCount === 4, `liverpool-city-region metro count must be 4, got ${region?.metroCount}`);

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
  metroNames.filter((n) => n === "Liverpool Lime Street").length === 1,
  "Merseyrail catalog must carry its own Liverpool Lime Street entry"
);
for (const name of ["Liverpool Central", "Moorfields", "Ellesmere Port"]) {
  assert(metroNames.includes(name), `Merseyrail catalog must carry ${name}`);
}
assert(metroStops.length === 4, `Merseyrail catalog must have exactly 4 stops, got ${metroStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 6, `combined catalog must have 6 stations (2 rail + 4 metro), got ${allStations.length}`);

// doNotGroup — Liverpool Lime Street resolves as two distinct catalog entries by mode
// (H1, unresolved structural ambiguity — NOT resolved by this gate or the adapter).
const limeStreetRail = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "train");
const limeStreetMetro = resolveCatalogEntry(LIVERPOOL_CITY_REGION_NR_HUB, "metro");
assert(limeStreetRail?.crs === "LIV", "Liverpool Lime Street must resolve as a National Rail entry (crs LIV)");
assert(
  limeStreetMetro?.catalogId === "merseyrail:liverpool-lime-street",
  "Liverpool Lime Street must also resolve as a distinct Merseyrail metro entry (doNotGroup, H1 unresolved)"
);

// Forbidden ambiguous marketing tokens must never resolve.
assert(resolveCatalogEntry("Liverpool") === null, "the bare token 'Liverpool' must never resolve as a station");
assert(isForbiddenCollapseName("Liverpool Station") === true, "'Liverpool Station' must never resolve as a station");
assert(isForbiddenCollapseName("Lime Street Station") === true, "'Lime Street Station' must never resolve as a station");

// Direction model — line + terminus, only for confirmed termini; interchanges get no guessed chips.
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
  "Liverpool Central must not generate any direction chip — whether all branch destinations call there vs Moorfields is unconfirmed, per direction-model-memo.md"
);
const moorfieldsLabels = marketingLabelsForStation("Moorfields");
assert(moorfieldsLabels.length === 0, "Moorfields must not generate any direction chip — same unresolved-split reason as Liverpool Central");

assert(
  mapMerseyrailDestination("Southport", "Northern Line") === "Northern Line + Southport",
  "mapMerseyrailDestination must map a confirmed terminus"
);
assert(
  mapMerseyrailDestination("Central", "Northern Line") === null,
  "mapMerseyrailDestination must not fabricate an unconfirmed interchange chip"
);

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (unlike West of England's single-mode list) to disambiguate the doNotGroup hub.
const dogfoodStations = listLiverpoolCityRegionDogfoodStations();
assert(dogfoodStations.length === 6, `dogfood stations must be the 6 D1 catalog names, got ${dogfoodStations.length}`);
const hubEntries = dogfoodStations.filter((s) => s.name === LIVERPOOL_CITY_REGION_NR_HUB);
assert(hubEntries.length === 2, "Liverpool Lime Street must appear twice in the dogfood list (rail + metro, doNotGroup)");
assert(
  new Set(hubEntries.map((s) => s.mode)).size === 2,
  "the two Liverpool Lime Street dogfood entries must carry different modes"
);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod), MissingDarwinTokenError if not (expected in most local/CI
// sandboxes). Either outcome is acceptable here; only an unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getLiverpoolCityRegionDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections(LIVERPOOL_CITY_REGION_NR_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "liverpool-city-region-darwin-live", "directions source must be liverpool-city-region-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first — same
  // order as lib/providers/liverpool-city-region.js's own fetchStationBoard() dispatcher.
  const dispatched = await getMultiCityDirections("liverpool-city-region", LIVERPOOL_CITY_REGION_NR_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(
    dispatched.source === "liverpool-city-region-darwin-live",
    "live-city-api dispatch source must be liverpool-city-region-darwin-live"
  );
} else {
  console.log(
    "liverpool-city-region-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("liverpool-city-region", LIVERPOOL_CITY_REGION_NR_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");
}

// Merseyrail: no confirmed public real-time feed at all (see file header).
// fetchMerseyrailStopBoard() must throw MerseyrailFeedUnconfirmedError
// unconditionally, and the dogfood dispatch must surface that error rather
// than fabricate a schedule from the static line+terminus label list.
let merseyrailBoardThrew = false;
try {
  await fetchMerseyrailStopBoard("Liverpool Central");
} catch (err) {
  merseyrailBoardThrew = err instanceof MerseyrailFeedUnconfirmedError;
}
assert(merseyrailBoardThrew, "fetchMerseyrailStopBoard must throw MerseyrailFeedUnconfirmedError — no confirmed Merseyrail real-time feed exists");

let merseyrailDirectionsThrew = false;
try {
  await getLiverpoolCityRegionDogfoodDirections("Liverpool Central", { mode: "metro" });
} catch (err) {
  merseyrailDirectionsThrew = err instanceof MerseyrailFeedUnconfirmedError;
}
assert(
  merseyrailDirectionsThrew,
  "getLiverpoolCityRegionDogfoodDirections must surface MerseyrailFeedUnconfirmedError for Merseyrail stops, not swallow it"
);

// Explicit metro-mode lookup at Liverpool Lime Street (doNotGroup, H1) must surface
// the Merseyrail layer's outcome, never silently fall through to the rail board.
let merseyrailHubDirectionsThrew = false;
try {
  await getLiverpoolCityRegionDogfoodDirections(LIVERPOOL_CITY_REGION_NR_HUB, { mode: "metro" });
} catch (err) {
  merseyrailHubDirectionsThrew = err instanceof MerseyrailFeedUnconfirmedError;
}
assert(
  merseyrailHubDirectionsThrew,
  "getLiverpoolCityRegionDogfoodDirections must surface MerseyrailFeedUnconfirmedError for Lime Street's Merseyrail layer (doNotGroup, H1), not the rail layer's data"
);

let merseyrailNextTrainThrew = false;
try {
  await getLiverpoolCityRegionDogfoodNextTrain({
    station: "Ellesmere Port",
    mode: "metro",
    destination: "Wirral Line + Liverpool",
  });
} catch (err) {
  merseyrailNextTrainThrew = err instanceof MerseyrailFeedUnconfirmedError;
}
assert(
  merseyrailNextTrainThrew,
  "getLiverpoolCityRegionDogfoodNextTrain must surface MerseyrailFeedUnconfirmedError for Merseyrail stops, not fabricate a schedule"
);

// getMultiCityNextTrain must resolve to Liverpool City Region's dogfood next-train module.
assert(
  typeof getLiverpoolCityRegionDogfoodNextTrain === "function",
  "getLiverpoolCityRegionDogfoodNextTrain must be exported for live-city-api to dispatch to"
);

let dispatchMerseyrailThrew = false;
try {
  await getMultiCityDirections("liverpool-city-region", "Liverpool Central");
} catch (err) {
  dispatchMerseyrailThrew = err instanceof MerseyrailFeedUnconfirmedError;
}
assert(dispatchMerseyrailThrew, "live-city-api dispatch must surface MerseyrailFeedUnconfirmedError for Merseyrail stops, not swallow it");

let unknownThrew = false;
try {
  await getLiverpoolCityRegionDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getLiverpoolCityRegionDogfoodDirections must not silently succeed for an unknown station");

// Provider-level dispatcher sanity: both board paths remain structurally wired
// through fetchStationBoard() and never silently succeed for Merseyrail.
let dispatcherThrew = false;
try {
  await fetchStationBoard("Liverpool Central");
} catch {
  dispatcherThrew = true;
}
assert(dispatcherThrew, "fetchStationBoard dispatcher must not silently succeed for Merseyrail");
assert(getNotInRegion(LIVERPOOL_CITY_REGION_REGION) !== undefined, "getNotInRegion must remain callable for this region");
void fetchNationalRailBoard; // imported for parity with the provider's public surface; exercised via probeRailDirections above.

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
  "liverpool-city-region-dogfood-gate: ok (live/adapterReady, dispatch switch-case wired, D1 pack, 2 rail + 4 Merseyrail stations, doNotGroup at Liverpool Lime Street (H1 unresolved, preserved not resolved), National Rail directions derived live from Darwin with no static line map, Merseyrail dispatch correctly surfaces MerseyrailFeedUnconfirmedError rather than the static label list, Perth/London TfL/West of England stay green)"
);
