/**
 * Edinburgh adapter/dispatch wiring gate + flip-commit assertions. Wired by
 * Jim (dogfood module, dispatch switch-cases), flipped by Mark (this commit:
 * status live, list additions). Per CLAUDE.md's flip-follow-through split
 * (added 30 Aug 2026, corrected same day): status flip, MULTI_CITY_IDS
 * addition to live-city-api.js / brisbane-dogfood.js / journey-model.js /
 * app.js / city-session.js, LIVE_UK_REGION_IDS in uk-planned-gate.mjs, and
 * this gate's assertions all land in Mark's flip commit. See
 * docs/edinburgh-d1/jim-handoff.md for the handoff note.
 *
 * Two agencies, two very different outcomes once wired (same two-layer
 * shape as East Midlands' National Rail + NET pair, Greater Manchester's
 * National Rail + Metrolink pair, South Yorkshire's National Rail +
 * Supertram pair, and North East's National Rail + Metro pair):
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same reasoning and same
 *    live-derivation shape as every other UK NR region. SINGLE hub-lock at
 *    Edinburgh Waverley (EDB) with Haymarket (HYM) and Slateford (SLA) as
 *    through-running satellites — structurally different from Glasgow's
 *    two independent termini ("Option A at n=2"); do not apply that
 *    pattern here. Tolerates MissingDarwinTokenError in sandboxes without
 *    DARWIN_LDB_TOKEN set (expected outside Vercel prod / without the
 *    local token exported).
 *  - Edinburgh Trams T50: no confirmed real-time feed exists at all (TfE
 *    Open Data API closed/inactive, no successor confirmed — see
 *    lib/providers/edinburgh.js file header). fetchTramStopBoard() throws
 *    EdinburghTramsFeedUnverifiedError unconditionally — this holds
 *    REGARDLESS of whether DARWIN_LDB_TOKEN is set, since Trams has no
 *    token-gated path at all. This gate asserts the dogfood dispatch
 *    surfaces that documented error class rather than swallowing it or
 *    falling back to the static line+terminus label list — the National
 *    Rail layer is what this gate proves live, never Trams.
 *
 * Edinburgh Waverley (doNotGroup hub lock, SAME printed name across modes)
 * and Haymarket (doNotGroup by mode, SAME printed name) catalog shape is
 * carried forward verbatim from the retired planned gate.
 *
 * Usage: node qa/edinburgh-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain, listMultiCityStations, findNearestStation } from "../lib/cities/live-city-api.js";
import { assertNoLiveFeedStopsExcluded } from "./lib/no-live-feed-gate-helper.mjs";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  EDINBURGH_REGION,
  EDINBURGH_NATIONAL_RAIL_HUB,
  EDINBURGH_NATIONAL_RAIL_SATELLITES,
  TRAM_TERMINI,
  TRAM_DIRECTIONS,
  TRAM_STATIONS,
  TRAM_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  resolveCatalogEntry,
  listCatalogStations,
  listTramStops,
  listNationalRailStations,
  fetchNationalRailBoard,
  fetchTramStopBoard,
  fetchStationBoard,
  marketingLabelsForStation,
  mapTramDestination,
  isTramStation,
  isForbiddenCollapseName,
  MissingDarwinTokenError,
  EdinburghTramsFeedUnverifiedError,
} from "../lib/providers/edinburgh.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listEdinburghDogfoodStations,
  getEdinburghDogfoodDirections,
  getEdinburghDogfoodNextTrain,
  planEdinburghNextTrainFetch,
} from "../lib/cities/edinburgh/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (that pattern caused the Helsinki-contamination bug fixed in
// 75c5edd). Perth (Australia) green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth (Australia) must stay live");

// Registry identity — now live (Mark's flip call).
const live = assertCityLive("edinburgh");
assert(live?.ok === true, "assertCityLive(edinburgh) must succeed — status is live");

const entry = getCity("edinburgh");
assert(entry?.status === "live", "edinburgh registry status must be live");
assert(entry?.adapterReady === undefined, "edinburgh adapterReady flag is removed once live");
assert(entry?.displayName === "Edinburgh", "edinburgh display name must be Edinburgh");
assert(entry?.timeZone === "Europe/London", "edinburgh timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "edinburgh").length === 1, "edinburgh must appear once in the registry");
for (const forbiddenId of ["edinburgh-trams", "tfe", "scotland-edinburgh"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Now in MULTI_CITY_IDS — this is the flip commit.
assert(isMultiCity("edinburgh") === true, "edinburgh must be in MULTI_CITY_IDS");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/edinburgh-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/edinburgh-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "edinburgh", "D1 city id must be edinburgh");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.lines?.[0]?.stationOrderVerified === false, "D1 pack must flag the Trams stop order as unverified");
assert(
  network.stationGroups?.find((g) => g.id === "edinburgh-waverley")?.doNotGroup === true,
  "D1 pack must flag doNotGroup at edinburgh-waverley"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(EDINBURGH_REGION);
assert(region?.railCount === 37, `edinburgh rail count must be 37 (UK station fill phase 1), got ${region?.railCount}`);
assert(region?.metroCount === 22, `edinburgh tram count must be 22, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Edinburgh Waverley", "Haymarket", "Slateford"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
for (const crs of ["EDB", "HYM", "SLA"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
// UK station fill phase 1 (13 Sep 2026): Falkirk High and Edinburgh Park were
// historically excluded here; docs/united-kingdom-ledger.md section 2 ruled
// Falkirk High is Edinburgh's boundary station, and Tim's walk-up rule ("any
// station with an API is in") brought Edinburgh Park into scope too — both
// are now real catalog stations, not exclusions.
assert(railNames.has("Falkirk High"), "National Rail catalog must carry Falkirk High (UK station fill phase 1)");
assert(railNames.has("Edinburgh Park"), "National Rail catalog must carry Edinburgh Park (UK station fill phase 1)");
assert(getNotInRegion(EDINBURGH_REGION).length === 0, "edinburgh must have no remaining deliberate exclusions after the station fill");
for (const name of ["Haymarket", "South Gyle", "Wester Hailes", "Curriehill", "Kingsknowe", "Newcraighall", "Edinburgh Gateway", "North Berwick", "Bathgate"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name} (UK station fill phase 1)`);
}

// Single-hub shape — one National Rail hub with two through-running satellites, NOT Glasgow's
// "Option A at n=2" two-independent-termini shape.
assert(EDINBURGH_NATIONAL_RAIL_HUB === "edinburgh-waverley", "must document a single National Rail hub");
assert(EDINBURGH_NATIONAL_RAIL_SATELLITES.length === 2, "must document exactly two through-running satellites");
const waverley = resolveCatalogEntry("Edinburgh Waverley", "train");
const haymarketRail = resolveCatalogEntry("Haymarket", "train");
const slateford = resolveCatalogEntry("Slateford", "train");
assert(waverley?.crs === "EDB", "Edinburgh Waverley must resolve with crs EDB");
assert(haymarketRail?.crs === "HYM", "Haymarket must resolve with crs HYM");
assert(slateford?.crs === "SLA", "Slateford must resolve with crs SLA");

const tramStops = listTramStops();
const tramNames = new Set(tramStops.map((s) => s.name));
for (const name of ["Newhaven", "Edinburgh Airport", "Princes Street", "Haymarket"]) {
  assert(tramNames.has(name), `Trams catalog must carry ${name}`);
}
assert(tramStops.length === 22, `Trams catalog must have exactly 22 stops, got ${tramStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 59, `combined catalog must have 59 stations (37 rail + 22 tram), got ${allStations.length}`);

// doNotGroup pairs recorded and enforced structurally (distinct catalog entries, never merged).
assert(DO_NOT_GROUP_PAIRS.length === 3, "must document three doNotGroup pairs (Waverley, Haymarket, Edinburgh Gateway)");
const waverleyTram = resolveCatalogEntry("Edinburgh Waverley", "metro");
assert(waverleyTram === null, "Trams catalog must not carry an 'Edinburgh Waverley' stop by that exact name");
const haymarketTram = resolveCatalogEntry("Haymarket", "metro");
assert(haymarketTram?.catalogId === "tram:haymarket", "Haymarket must resolve as a Trams entry");
assert(haymarketTram?.name === haymarketRail?.name, "Haymarket tram/rail entries share a printed name but are distinct catalog rows");

// Caledonian Sleeper excluded at Edinburgh Waverley only, enforced via the shared
// excludeOperators option (not just documented).
assert(waverley?.excludeOperators?.includes("Caledonian Sleeper"), "Edinburgh Waverley catalog entry must exclude Caledonian Sleeper");
assert(
  !(haymarketRail?.excludeOperators ?? []).includes("Caledonian Sleeper"),
  "Haymarket must NOT exclude Caledonian Sleeper — it never calls there"
);
assert(
  !(slateford?.excludeOperators ?? []).includes("Caledonian Sleeper"),
  "Slateford must NOT exclude Caledonian Sleeper — it never calls there"
);

// Trams direction model — standard line+terminus, NOT Glasgow Subway's closed-loop model.
// Design artifact only, never dogfood output (see file header — Trams always throws).
assert(TRAM_TERMINI.includes("Newhaven") && TRAM_TERMINI.includes("Edinburgh Airport"), "must use the two confirmed termini");
assert(
  TRAM_DIRECTIONS.includes("T50 towards Newhaven") && TRAM_DIRECTIONS.includes("T50 towards Edinburgh Airport"),
  "must use line+terminus labels"
);
assert(TRAM_STATIONS.length === 22, "TRAM_STATIONS candidate order must carry all 22 stops");
assert(TRAM_STATION_ORDER_VERIFIED === false, "Trams stop order must stay flagged unverified, not silently trusted");
assert(isTramStation("Princes Street") === true, "Princes Street must resolve as a Trams stop");
assert(isTramStation("Edinburgh Waverley") === false, "Edinburgh Waverley (National Rail) must not resolve as a Trams stop");

const princesStreetLabels = marketingLabelsForStation("Princes Street");
assert(princesStreetLabels.includes("T50 towards Newhaven"), "every Trams stop must offer T50 towards Newhaven");
assert(princesStreetLabels.includes("T50 towards Edinburgh Airport"), "every Trams stop must offer T50 towards Edinburgh Airport");
assert(mapTramDestination("Newhaven") === "T50 towards Newhaven", "mapTramDestination must map a confirmed terminus");
assert(mapTramDestination("Somewhere Else") === null, "mapTramDestination must not fabricate an unconfirmed terminus");

assert(resolveCatalogEntry("trams") === null, "the marketing token 'trams' must never resolve as a station");
assert(isForbiddenCollapseName("Edinburgh Trams") === true, "'Edinburgh Trams' must never resolve as a station");

// No direction-hubs.json for this region (Haymarket/Slateford are
// through-running satellites of the hub-lock itself, not feeder candidates)
// — the shared helper must still degrade to an empty, no-op hub list, same
// call shape as every other UK region.
assert(
  !existsSync(join(ROOT, "lib/cities/edinburgh/direction-hubs.json")),
  "edinburgh must not ship a direction-hubs.json — no hub candidate identified in the D1 pack"
);
const { hubs: edHubs } = loadDirectionHubs(EDINBURGH_REGION);
assert(edHubs.length === 0, `edinburgh must have zero configured hubs, got ${edHubs.length}`);

// planEdinburghNextTrainFetch() — pure routing decision table, token-free.
const hubEntryRail = waverley;
const haymarketEntryRail = resolveCatalogEntry("Haymarket", "train");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planEdinburghNextTrainFetch(haymarketEntryRail, "train", "Edinburgh Waverley (ScotRail)", edHubs);
assert(noHubPlan.kind !== "hub", "planEdinburghNextTrainFetch must never return 'hub' — no hub is configured");

// The exact-chip path must fire for a destination whose station is in this region's own catalog.
const exactPlan = planEdinburghNextTrainFetch(haymarketEntryRail, "train", "Edinburgh Waverley (ScotRail)", edHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "EDB",
  `planEdinburghNextTrainFetch at Haymarket for Edinburgh Waverley must be an exact plan filtered to EDB, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index fallback
// for an out-of-region terminus (e.g. London Kings Cross).
const nationalExactPlan = planEdinburghNextTrainFetch(hubEntryRail, "train", "London Kings Cross (LNER)", edHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "KGX",
  `planEdinburghNextTrainFetch at Edinburgh Waverley for London Kings Cross must be an exact plan filtered to KGX, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planEdinburghNextTrainFetch(hubEntryRail, "train", "Nowhere (X)", edHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planEdinburghNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// mode !== "train" is always undirected; Trams never consults hubs.
const metroPlan = planEdinburghNextTrainFetch(hubEntryRail, "metro", "T50 towards Newhaven", edHubs);
assert(metroPlan.kind === "undirected", "metro mode must never consult the hub file");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (Edinburgh Waverley's/Haymarket's doNotGroup locks need it to disambiguate).
const dogfoodStations = listEdinburghDogfoodStations();
assert(dogfoodStations.length === 59, `dogfood stations must be the 59 names (UK station fill phase 1), got ${dogfoodStations.length}`);
const waverleyEntries = dogfoodStations.filter((s) => s.name === "Edinburgh Waverley");
assert(waverleyEntries.length === 1, "Edinburgh Waverley must appear once in the dogfood list (National Rail only — Trams uses no exact-name match)");
const haymarketEntries = dogfoodStations.filter((s) => s.name === "Haymarket");
assert(haymarketEntries.length === 2, "Haymarket must appear twice in the dogfood list (rail + tram, doNotGroup)");
assert(
  new Set(haymarketEntries.map((s) => s.mode)).size === 2,
  "the two Haymarket dogfood entries must carry different modes"
);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod, or exported locally), MissingDarwinTokenError if not (expected
// in most local/CI sandboxes). Either outcome is acceptable here; only an
// unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getEdinburghDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections("Edinburgh Waverley");
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "edinburgh-darwin-live", "directions source must be edinburgh-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first —
  // same order as lib/providers/edinburgh.js's own fetchStationBoard()
  // dispatcher.
  const dispatched = await getMultiCityDirections("edinburgh", "Edinburgh Waverley");
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(dispatched.source === "edinburgh-darwin-live", "live-city-api dispatch source must be edinburgh-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getEdinburghDogfoodNextTrain({
      station: "Edinburgh Waverley",
      mode: "train",
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("edinburgh", {
      station: "Edinburgh Waverley",
      mode: "train",
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(dispatchedNextTrain.config?.destination === firstChip, "dispatched next-train destination must equal the chosen chip");
  }
} else {
  console.log(
    "edinburgh-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("edinburgh", "Edinburgh Waverley");
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");

  // fetchNationalRailBoard() / fetchStationBoard() must still throw
  // MissingDarwinTokenError before any fetch at the hub/Haymarket.
  for (const stationName of ["Edinburgh Waverley", "Haymarket"]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(stationName);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// UK station fill phase 1 (13 Sep 2026): a sample of the newly-added
// stations must resolve via the catalog and, when a token is present,
// return a real Darwin board — same skip-with-reason pattern as the hub
// probe above (token-optional in local/CI sandboxes).
const edinburghParkEntry = resolveCatalogEntry("Edinburgh Park", "train");
assert(edinburghParkEntry?.crs === "EDP", "Edinburgh Park must resolve with crs EDP");
const edinburghParkProbe = await probeRailDirections("Edinburgh Park");
if (edinburghParkProbe.ok) {
  assert(edinburghParkProbe.pack.source === "edinburgh-darwin-live", "Edinburgh Park directions source must be edinburgh-darwin-live");
  assert(Array.isArray(edinburghParkProbe.pack.directions), "Edinburgh Park directions must be an array");
} else {
  console.log("edinburgh-dogfood-gate: DARWIN_LDB_TOKEN not set — Edinburgh Park board not probed against a real payload (expected outside Vercel prod).");
}

// Edinburgh Trams: no confirmed real-time feed exists at all (see file
// header). fetchTramStopBoard() must throw EdinburghTramsFeedUnverifiedError
// unconditionally, and the dogfood dispatch must surface that documented
// error class rather than fabricate a schedule from the static label list.
// This holds REGARDLESS of whether DARWIN_LDB_TOKEN is set — Trams has no
// token-gated path at all, it is a genuinely unconfirmed feed, not an
// account block.
let tramBoardThrew = false;
try {
  await fetchTramStopBoard("Princes Street");
} catch (err) {
  tramBoardThrew = err instanceof EdinburghTramsFeedUnverifiedError;
}
assert(tramBoardThrew, "fetchTramStopBoard must throw EdinburghTramsFeedUnverifiedError — no confirmed Trams real-time feed exists");

let tramDirectionsThrew = false;
try {
  await getEdinburghDogfoodDirections("Princes Street", { mode: "metro" });
} catch (err) {
  tramDirectionsThrew = err instanceof EdinburghTramsFeedUnverifiedError;
}
assert(tramDirectionsThrew, "getEdinburghDogfoodDirections must surface EdinburghTramsFeedUnverifiedError for Trams stops, not swallow it");

let tramWaverleyDirectionsThrew = false;
try {
  await getEdinburghDogfoodDirections("Edinburgh Waverley", { mode: "metro" });
} catch (err) {
  tramWaverleyDirectionsThrew = err instanceof Error;
}
assert(
  tramWaverleyDirectionsThrew,
  "getEdinburghDogfoodDirections must not resolve a Trams-mode lookup at 'Edinburgh Waverley' to the National Rail layer's data (no such Trams stop exists by that exact name)"
);

let tramHaymarketDirectionsThrew = false;
try {
  await getEdinburghDogfoodDirections("Haymarket", { mode: "metro" });
} catch (err) {
  tramHaymarketDirectionsThrew = err instanceof EdinburghTramsFeedUnverifiedError;
}
assert(
  tramHaymarketDirectionsThrew,
  "getEdinburghDogfoodDirections must surface EdinburghTramsFeedUnverifiedError for Haymarket's Trams layer (doNotGroup), not the rail layer's data"
);

let tramNextTrainThrew = false;
try {
  await getEdinburghDogfoodNextTrain({ station: "Princes Street", mode: "metro", destination: "T50 towards Newhaven" });
} catch (err) {
  tramNextTrainThrew = err instanceof EdinburghTramsFeedUnverifiedError;
}
assert(tramNextTrainThrew, "getEdinburghDogfoodNextTrain must surface EdinburghTramsFeedUnverifiedError for Trams stops, not fabricate a schedule");

let dispatchTramThrew = false;
try {
  await getMultiCityDirections("edinburgh", "Princes Street");
} catch (err) {
  dispatchTramThrew = err instanceof EdinburghTramsFeedUnverifiedError;
}
assert(dispatchTramThrew, "live-city-api dispatch must surface EdinburghTramsFeedUnverifiedError for Trams stops, not swallow it");

// The production dispatch dispatcher (bare name, no mode) at Haymarket
// resolves rail-first — same order as lib/providers/edinburgh.js's own
// fetchStationBoard() dispatcher — so the doNotGroup hub-adjacent name never
// silently returns the Trams layer.
let dispatchThrew = false;
try {
  await fetchStationBoard("Princes Street");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Trams");

let unknownThrew = false;
try {
  await getEdinburghDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getEdinburghDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "edinburgh", station: "Edinburgh Waverley" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// docs/jim-brief-no-live-feed-stops-out-of-picker.md: every Trams stop
// carries liveFeed: false, matches scripts/list-no-live-feed-stops.mjs, is
// carried through by listMultiCityStations, and is never nominated by
// findNearestStation.
assertNoLiveFeedStopsExcluded({
  region: "edinburgh",
  readFileSync,
  join,
  ROOT,
  listMultiCityStations,
  findNearestStation,
  assert,
  sample: { name: "Newhaven", lat: 55.979921, lng: -3.1884628 },
});

console.log(
  "edinburgh-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 37 rail + 22 Trams stations (UK station fill phase 1, 13 Sep 2026), single-hub shape distinct from Glasgow, doNotGroup at Edinburgh Waverley, Haymarket and Edinburgh Gateway, Falkirk High + Edinburgh Park now catalogued (no remaining exclusions), Caledonian Sleeper excluded at Waverley only, National Rail directions derived live from Darwin with no static line map, exact-chip routing table (exact/undirected) proven token-free with the national rail-crs-index fallback for out-of-region termini, Trams dispatch correctly surfaces EdinburghTramsFeedUnverifiedError rather than the static label list, all 22 Trams stops flagged liveFeed: false and excluded from the picker/Near me, Perth Australia stays green)"
);
