/**
 * Glasgow adapter/dispatch wiring gate + flip-commit assertions. Wired by
 * Jim (dogfood module, dispatch switch-cases), flipped by Mark (this commit:
 * status live, list additions). Per CLAUDE.md's flip-follow-through split
 * (added 30 Aug 2026, corrected same day): status flip, MULTI_CITY_IDS
 * addition to live-city-api.js / brisbane-dogfood.js / journey-model.js /
 * app.js / city-session.js, LIVE_UK_REGION_IDS in uk-planned-gate.mjs, and
 * this gate's assertions all land in Mark's flip commit. See
 * docs/glasgow-d1/jim-handoff.md for the handoff note.
 *
 * TWO INDEPENDENT NETWORKS UNDER ONE CITY ID, no single hub-lock ("Option A
 * at n=2" — Glasgow Central GLC + Glasgow Queen Street GLQ, separate
 * buildings, not rail-connected, genuinely different corridors, see
 * lib/providers/glasgow.js file header) plus Glasgow Subway (SPT,
 * hub-locked closed loop at Buchanan Street, no termini — first of this
 * shape in the pipeline):
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same reasoning and same
 *    live-derivation shape as every other UK NR region. Tolerates
 *    MissingDarwinTokenError in sandboxes without DARWIN_LDB_TOKEN set
 *    (expected outside Vercel prod / without the local token exported).
 *    This gate proves BOTH termini independently — neither is treated as
 *    the other's satellite.
 *  - Glasgow Subway: no confirmed GTFS-RT feed, and the static candidate's
 *    stop order and underlying license are both unverified (see
 *    lib/providers/glasgow.js file header). fetchSubwayStopBoard() throws
 *    GlasgowSubwayFeedUnverifiedError unconditionally. This gate asserts
 *    the dogfood dispatch surfaces that documented error class rather than
 *    swallowing it or falling back to the static Outer/Inner Circle label
 *    list — the National Rail layer is what this gate proves live, never
 *    Subway. The Subway license question is NOT resolved here — recorded
 *    in docs/glasgow-d1/jim-handoff.md for Mark/Tim.
 *
 * Buchanan Street (Subway) vs Glasgow Queen Street, and St Enoch (Subway)
 * vs Glasgow Central, doNotGroup catalog shape is carried forward verbatim
 * from the retired planned gate.
 *
 * Usage: node qa/glasgow-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  GLASGOW_REGION,
  GLASGOW_NATIONAL_RAIL_GROUPS,
  SUBWAY_HUB,
  SUBWAY_DIRECTIONS,
  SUBWAY_STATIONS,
  SUBWAY_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  resolveCatalogEntry,
  listCatalogStations,
  listSubwayStops,
  listNationalRailStations,
  fetchSubwayStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  marketingLabelsForStation,
  mapSubwayDestination,
  isSubwayStation,
  isForbiddenCollapseName,
  MissingDarwinTokenError,
  GlasgowSubwayFeedUnverifiedError,
} from "../lib/providers/glasgow.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listGlasgowDogfoodStations,
  getGlasgowDogfoodDirections,
  getGlasgowDogfoodNextTrain,
  planGlasgowNextTrainFetch,
} from "../lib/cities/glasgow/dogfood-next-train.js";
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
const live = assertCityLive("glasgow");
assert(live?.ok === true, "assertCityLive(glasgow) must succeed — status is live");

const entry = getCity("glasgow");
assert(entry?.status === "live", "glasgow registry status must be live");
assert(entry?.adapterReady === undefined, "glasgow adapterReady flag is removed once live");
assert(entry?.displayName === "Glasgow", "glasgow display name must be Glasgow");
assert(entry?.timeZone === "Europe/London", "glasgow timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "glasgow").length === 1, "glasgow must appear once in the registry");
for (const forbiddenId of ["glasgow-subway", "spt", "scotland-glasgow"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Now in MULTI_CITY_IDS — this is the flip commit.
assert(isMultiCity("glasgow") === true, "glasgow must be in MULTI_CITY_IDS");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/glasgow-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/glasgow-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "glasgow", "D1 city id must be glasgow");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.lines?.[0]?.stationOrderVerified === false,
  "D1 pack must flag the Subway stop order as unverified"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(GLASGOW_REGION);
assert(region?.railCount === 2, `glasgow rail count must be 2, got ${region?.railCount}`);
assert(region?.metroCount === 15, `glasgow metro count must be 15, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Glasgow Central", "Glasgow Queen Street"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("GLC"), "National Rail catalog must carry GLC");
assert(railCrs.has("GLQ"), "National Rail catalog must carry GLQ");
assert(!railNames.has("Falkirk High"), "National Rail catalog must not carry Falkirk High (Edinburgh's territory)");
assert(
  getNotInRegion(GLASGOW_REGION).includes("Falkirk High"),
  "Falkirk High must be recorded as a deliberate exclusion"
);

const subwayStops = listSubwayStops();
const subwayNames = new Set(subwayStops.map((s) => s.name));
for (const name of ["Buchanan Street", "St Enoch", "Partick", "Govan"]) {
  assert(subwayNames.has(name), `Subway catalog must carry ${name}`);
}
assert(subwayStops.length === 15, `Subway catalog must have exactly 15 stops, got ${subwayStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 17, `combined catalog must have 17 stations (2 rail + 15 metro), got ${allStations.length}`);

// "Option A at n=2" — two independent National Rail groups, neither hub-locked to the other
// or to the Subway.
assert(GLASGOW_NATIONAL_RAIL_GROUPS.length === 2, "must document exactly two National Rail groups");
const central = resolveCatalogEntry("Glasgow Central", "train");
const queenStreet = resolveCatalogEntry("Glasgow Queen Street", "train");
assert(central?.crs === "GLC", "Glasgow Central must resolve with crs GLC");
assert(queenStreet?.crs === "GLQ", "Glasgow Queen Street must resolve with crs GLQ");

// doNotGroup pairs recorded and enforced structurally (distinct catalog entries, never merged).
assert(DO_NOT_GROUP_PAIRS.length === 3, "must document three doNotGroup pairs");
const buchananStreet = resolveCatalogEntry("Buchanan Street", "metro");
assert(buchananStreet?.catalogId === "subway:buchanan-street", "Buchanan Street must resolve as the Subway hub entry");
assert(buchananStreet?.name !== queenStreet?.name, "Buchanan Street and Glasgow Queen Street must be distinct catalog entries");
const stEnoch = resolveCatalogEntry("St Enoch", "metro");
assert(stEnoch?.catalogId === "subway:st-enoch", "St Enoch must resolve as a Subway entry");
assert(stEnoch?.name !== central?.name, "St Enoch and Glasgow Central must be distinct catalog entries");

// Caledonian Sleeper excluded at Glasgow Central only, enforced via the shared excludeOperators
// option (not just documented).
assert(central?.excludeOperators?.includes("Caledonian Sleeper"), "Glasgow Central catalog entry must exclude Caledonian Sleeper");
assert(
  !(queenStreet?.excludeOperators ?? []).includes("Caledonian Sleeper"),
  "Glasgow Queen Street must NOT exclude Caledonian Sleeper — it never calls there"
);

// Subway direction model — printed Outer/Inner Circle labels, no station-order dependency.
assert(SUBWAY_HUB === "Buchanan Street", "Subway hub must be Buchanan Street");
assert(SUBWAY_DIRECTIONS.includes("Outer Circle") && SUBWAY_DIRECTIONS.includes("Inner Circle"), "must use printed Outer/Inner Circle labels, not an invented terminus");
assert(SUBWAY_STATIONS.length === 15, "SUBWAY_STATIONS candidate order must carry all 15 stations");
assert(SUBWAY_STATION_ORDER_VERIFIED === false, "Subway stop order must stay flagged unverified, not silently trusted");
assert(isSubwayStation("Hillhead") === true, "Hillhead must resolve as a Subway station");
assert(isSubwayStation("Glasgow Central") === false, "Glasgow Central must not resolve as a Subway station");

const hillheadLabels = marketingLabelsForStation("Hillhead");
assert(hillheadLabels.includes("Subway + Outer Circle"), "every Subway station must offer Subway + Outer Circle");
assert(hillheadLabels.includes("Subway + Inner Circle"), "every Subway station must offer Subway + Inner Circle");
assert(mapSubwayDestination("Outer Circle") === "Subway + Outer Circle", "mapSubwayDestination must map a confirmed direction label");
assert(mapSubwayDestination("Towards Govan") === null, "mapSubwayDestination must not fabricate a terminus-based label");

assert(resolveCatalogEntry("subway") === null, "the marketing token 'subway' must never resolve as a station");
assert(isForbiddenCollapseName("Glasgow Subway") === true, "'Glasgow Subway' must never resolve as a station");

// No direction-hubs.json for this region (two independent termini, "Option A
// at n=2" — not a hub-and-satellite shape) — the shared helper must still
// degrade to an empty, no-op hub list, same call shape as every other UK
// region.
assert(
  !existsSync(join(ROOT, "lib/cities/glasgow/direction-hubs.json")),
  "glasgow must not ship a direction-hubs.json — two independent termini, no hub-and-satellite shape"
);
const { hubs: glasgowHubs } = loadDirectionHubs(GLASGOW_REGION);
assert(glasgowHubs.length === 0, `glasgow must have zero configured hubs, got ${glasgowHubs.length}`);

// planGlasgowNextTrainFetch() — pure routing decision table, token-free.
const centralEntryRail = resolveCatalogEntry("Glasgow Central", "train");
const queenStreetEntryRail = resolveCatalogEntry("Glasgow Queen Street", "train");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planGlasgowNextTrainFetch(centralEntryRail, "train", "Edinburgh (ScotRail)", glasgowHubs);
assert(noHubPlan.kind !== "hub", "planGlasgowNextTrainFetch must never return 'hub' — no hub is configured");

// The exact-chip path must fire for a destination whose station is in this region's own catalog
// — proving Central and Queen Street are each independently resolvable, not forced through a hub.
const exactPlan = planGlasgowNextTrainFetch(centralEntryRail, "train", "Glasgow Queen Street (ScotRail)", glasgowHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "GLQ",
  `planGlasgowNextTrainFetch at Glasgow Central for Glasgow Queen Street must be an exact plan filtered to GLQ, got ${JSON.stringify(exactPlan)}`
);
const reversePlan = planGlasgowNextTrainFetch(queenStreetEntryRail, "train", "Glasgow Central (Avanti West Coast)", glasgowHubs);
assert(
  reversePlan.kind === "exact" && reversePlan.filterCrs === "GLC",
  `planGlasgowNextTrainFetch at Glasgow Queen Street for Glasgow Central must be an exact plan filtered to GLC, got ${JSON.stringify(reversePlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index fallback
// for an out-of-region terminus (e.g. Edinburgh, printed plain — Darwin's
// national index carries "edinburgh" -> EDB, not "edinburgh waverley").
const nationalExactPlan = planGlasgowNextTrainFetch(centralEntryRail, "train", "Edinburgh (ScotRail)", glasgowHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "EDB",
  `planGlasgowNextTrainFetch at Glasgow Central for Edinburgh must be an exact plan filtered to EDB, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planGlasgowNextTrainFetch(centralEntryRail, "train", "Nowhere (X)", glasgowHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planGlasgowNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// mode !== "train" is always undirected; Subway never consults hubs.
const metroPlan = planGlasgowNextTrainFetch(centralEntryRail, "metro", "Subway + Outer Circle", glasgowHubs);
assert(metroPlan.kind === "undirected", "metro mode must never consult the hub file");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (Buchanan Street/St Enoch doNotGroup pairs need it to disambiguate).
const dogfoodStations = listGlasgowDogfoodStations();
assert(dogfoodStations.length === 17, `dogfood stations must be the 17 D1 names, got ${dogfoodStations.length}`);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod, or exported locally), MissingDarwinTokenError if not (expected
// in most local/CI sandboxes). Either outcome is acceptable here; only an
// unrelated throw fails. Both termini are probed independently — neither is
// treated as the other's satellite.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getGlasgowDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const centralProbe = await probeRailDirections("Glasgow Central");
const queenStreetProbe = await probeRailDirections("Glasgow Queen Street");
// Both termini must resolve the same way in this environment (both blocked, or both live) —
// there is no account-level distinction between the two CRS codes.
assert(
  centralProbe.ok === queenStreetProbe.ok,
  "Glasgow Central and Glasgow Queen Street must both be blocked or both be live — same Darwin account"
);

if (centralProbe.ok) {
  for (const probe of [centralProbe, queenStreetProbe]) {
    assert(probe.pack.source === "glasgow-darwin-live", "directions source must be glasgow-darwin-live");
    assert(Array.isArray(probe.pack.directions), "directions must be an array");
    for (const chip of probe.pack.directions) {
      assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
    }
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first —
  // same order as lib/providers/glasgow.js's own fetchStationBoard()
  // dispatcher. Proven at both termini independently.
  for (const [station, probe] of [
    ["Glasgow Central", centralProbe],
    ["Glasgow Queen Street", queenStreetProbe],
  ]) {
    const dispatched = await getMultiCityDirections("glasgow", station);
    assert(
      JSON.stringify(dispatched.directions) === JSON.stringify(probe.pack.directions),
      `live-city-api dispatch at ${station} must return the same chips as the dogfood harness (rail-first resolution)`
    );
    assert(dispatched.source === "glasgow-darwin-live", `live-city-api dispatch source at ${station} must be glasgow-darwin-live`);
  }

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = centralProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getGlasgowDogfoodNextTrain({
      station: "Glasgow Central",
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
    const dispatchedNextTrain = await getMultiCityNextTrain("glasgow", {
      station: "Glasgow Central",
      mode: "train",
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      dispatchedNextTrain.config?.destination === firstChip,
      "dispatched next-train destination must equal the chosen chip"
    );
  }
} else {
  console.log(
    "glasgow-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  for (const station of ["Glasgow Central", "Glasgow Queen Street"]) {
    let dispatchBlocked = false;
    try {
      await getMultiCityDirections("glasgow", station);
    } catch (err) {
      dispatchBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(dispatchBlocked, `live-city-api dispatch at ${station} must surface MissingDarwinTokenError for the rail layer, not swallow it`);

    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(station);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${station}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Glasgow Subway: no confirmed GTFS-RT feed exists, and the static candidate's
// stop order and underlying license are both unverified (see file header).
// fetchSubwayStopBoard() must throw GlasgowSubwayFeedUnverifiedError
// unconditionally, and the dogfood dispatch must surface that documented
// error class rather than fabricate a schedule from the static Outer/Inner
// Circle label list. This holds REGARDLESS of whether DARWIN_LDB_TOKEN is
// set — Subway has no token-gated path at all, it is a genuinely unverified
// feed, not an account block.
let subwayBoardThrew = false;
try {
  await fetchSubwayStopBoard("Buchanan Street");
} catch (err) {
  subwayBoardThrew = err instanceof GlasgowSubwayFeedUnverifiedError;
}
assert(subwayBoardThrew, "fetchSubwayStopBoard must throw GlasgowSubwayFeedUnverifiedError — no confirmed Subway GTFS-RT source, and the static candidate's stop order/license are unverified");

let subwayDirectionsThrew = false;
try {
  await getGlasgowDogfoodDirections("Buchanan Street", { mode: "metro" });
} catch (err) {
  subwayDirectionsThrew = err instanceof GlasgowSubwayFeedUnverifiedError;
}
assert(
  subwayDirectionsThrew,
  "getGlasgowDogfoodDirections must surface GlasgowSubwayFeedUnverifiedError for Subway stops, not swallow it"
);

let subwayHubDirectionsThrew = false;
try {
  await getGlasgowDogfoodDirections("St Enoch", { mode: "metro" });
} catch (err) {
  subwayHubDirectionsThrew = err instanceof GlasgowSubwayFeedUnverifiedError;
}
assert(
  subwayHubDirectionsThrew,
  "getGlasgowDogfoodDirections must surface GlasgowSubwayFeedUnverifiedError for St Enoch's Subway layer (doNotGroup vs Glasgow Central), not fabricate rail-shaped data"
);

let subwayNextTrainThrew = false;
try {
  await getGlasgowDogfoodNextTrain({ station: "Hillhead", mode: "metro", destination: "Subway + Outer Circle" });
} catch (err) {
  subwayNextTrainThrew = err instanceof GlasgowSubwayFeedUnverifiedError;
}
assert(
  subwayNextTrainThrew,
  "getGlasgowDogfoodNextTrain must surface GlasgowSubwayFeedUnverifiedError for Subway stops, not fabricate a schedule"
);

let dispatchSubwayThrew = false;
try {
  await getMultiCityDirections("glasgow", "Hillhead");
} catch (err) {
  dispatchSubwayThrew = err instanceof GlasgowSubwayFeedUnverifiedError;
}
assert(dispatchSubwayThrew, "live-city-api dispatch must surface GlasgowSubwayFeedUnverifiedError for Subway stops, not swallow it");

// The production dispatch dispatcher (bare name, no mode) at doNotGroup pairs
// resolves rail-first — same order as lib/providers/glasgow.js's own
// fetchStationBoard() dispatcher — so an ambiguous bare lookup never
// silently returns the Subway layer.
let dispatchThrew = false;
try {
  await fetchStationBoard("Hillhead");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Subway");

let unknownThrew = false;
try {
  await getGlasgowDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getGlasgowDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "glasgow", station: "Glasgow Central" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "glasgow-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 2 rail + 15 Subway stations, 'Option A at n=2' proven at both Glasgow Central and Glasgow Queen Street independently with no hub-lock between them, doNotGroup at Buchanan Street/Glasgow Queen Street and St Enoch/Glasgow Central, National Rail directions derived live from Darwin with no static line map, exact-chip routing table (exact/undirected) proven token-free with the national rail-crs-index fallback for out-of-region termini, Subway dispatch correctly surfaces GlasgowSubwayFeedUnverifiedError rather than the static Outer/Inner Circle label list, Perth Australia stays green)"
);
