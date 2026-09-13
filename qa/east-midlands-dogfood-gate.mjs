/**
 * East Midlands adapter/dispatch wiring gate for its live flip. Perth stays live.
 *
 * Replaces east-midlands-planned-gate.mjs, migrating its still-relevant
 * catalog/D1/hub-lock/direction-model assertions to the live shape and
 * adding the dispatch-wiring checks every flip adds (see the West of
 * England precedent — lib/cities/west-of-england/dogfood-next-train.js +
 * west-of-england-dogfood-gate.mjs).
 *
 * Two agencies, two very different outcomes once wired:
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same reasoning and same
 *    live-derivation shape as West of England. Tolerates
 *    MissingDarwinTokenError in sandboxes without DARWIN_LDB_TOKEN set
 *    (expected outside Vercel prod), same as every other UK region.
 *  - NET tram: no confirmed feed at all (Jim's D2 GTFS pull, 31 Aug 2026 —
 *    see lib/providers/east-midlands.js file header). fetchNetStopBoard()
 *    throws NetFeedUnconfirmedError unconditionally. This gate asserts the
 *    dogfood dispatch surfaces that error rather than swallowing it or
 *    falling back to the static line+terminus label list.
 *
 * NOTE for Mark: at the commit this gate was written, east-midlands is
 * still `status: "planned"` in the registry (Jim never flips that line
 * himself). This gate's registry-status/adapterReady/isMultiCity assertions
 * are therefore written for the POST-FLIP state and will only pass once
 * Mark's flip commit lands (status -> "live", east-midlands added to
 * MULTI_CITY_IDS). See docs/east-midlands-d1/jim-handoff.md's "Flip commit
 * — list additions for Mark" section for the exact one-line adds.
 *
 * Usage: node qa/east-midlands-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, listMultiCityStations, findNearestStation } from "../lib/cities/live-city-api.js";
import { assertNoLiveFeedStopsExcluded } from "./lib/no-live-feed-gate-helper.mjs";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  EAST_MIDLANDS_HUB,
  EAST_MIDLANDS_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNetStops,
  listNationalRailStations,
  fetchNetStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  NetFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapNetDestination,
  isForbiddenCollapseName,
} from "../lib/providers/east-midlands.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listEastMidlandsDogfoodStations,
  getEastMidlandsDogfoodDirections,
  getEastMidlandsDogfoodNextTrain,
  planEastMidlandsNextTrainFetch,
} from "../lib/cities/east-midlands/dogfood-next-train.js";
import { loadDirectionHubs, applyDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

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
assert(assertCityLive("uk-london-tfl")?.ok === true, "London (TfL) stays live");

// Registry identity + live status. Only true once Mark's flip commit lands —
// see the file-header note.
const live = assertCityLive("east-midlands");
assert(live?.ok === true, "assertCityLive(east-midlands) must pass post-flip");
assert(getCity("east-midlands")?.status === "live", "east-midlands registry status must be live post-flip");
assert(getCity("east-midlands")?.adapterReady === true, "east-midlands adapterReady must be true");
assert(getCity("east-midlands")?.displayName === "East Midlands", "east-midlands display name must be East Midlands");
assert(getCity("east-midlands")?.timeZone === "Europe/London", "east-midlands timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "east-midlands").length === 1,
  "east-midlands must appear once in the registry"
);
for (const forbiddenId of ["em", "nottingham", "net", "east-midlands-trains"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch wiring — east-midlands is in MULTI_CITY_IDS post-flip.
assert(isMultiCity("east-midlands") === true, "east-midlands must be in MULTI_CITY_IDS post-flip");

// D1 pack presence (absorbed from the retired east-midlands-planned-gate).
const d1Dir = join(ROOT, "docs/east-midlands-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/east-midlands-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "east-midlands", "D1 city id is east-midlands");
assert(
  network.printedInnerCityNames?.lock === EAST_MIDLANDS_HUB,
  `D1 lock must be ${EAST_MIDLANDS_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(EAST_MIDLANDS_REGION);
assert(region?.railCount === 105, `east-midlands rail count must be 105 (UK station fill phase 1), got ${region?.railCount}`);
assert(region?.metroCount === 4, `east-midlands metro count must be 4, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["NOT", "LEI", "KET", "WEL", "CHD", "ALF"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(!railCrs.has("TAM"), "National Rail catalog must not carry Tamworth (D2 de-dup boundary with West Midlands)");
assert(getNotInRegion(EAST_MIDLANDS_REGION).includes("Tamworth"), "Tamworth must be recorded as a deliberate exclusion");

const netStops = listNetStops();
const netNames = new Set(netStops.map((s) => s.name));
for (const name of ["Hucknall", "Nottingham Station", "Toton Lane", "Phoenix Park"]) {
  assert(netNames.has(name), `NET catalog must carry ${name}`);
}
assert(!netNames.has("city centre"), "NET catalog must not carry the unconfirmed 'city centre' placeholder");
assert(netStops.length === 4, `NET catalog must have exactly 4 stops (termini + hub), got ${netStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 109, `combined catalog must have 109 stations (105 rail + 4 metro), got ${allStations.length}`);

// doNotGroup — Nottingham Station resolves as two distinct catalog entries by mode.
const hubRail = resolveCatalogEntry(EAST_MIDLANDS_HUB, "train");
const hubMetro = resolveCatalogEntry(EAST_MIDLANDS_HUB, "metro");
assert(hubRail?.crs === "NOT", "Nottingham Station must resolve as a National Rail entry (crs NOT)");
assert(hubMetro?.catalogId?.startsWith("net:"), "Nottingham Station must resolve as a distinct NET metro entry");
assert(resolveCatalogEntry("nottingham") === null, "the marketing token 'nottingham' must never resolve as a station");
assert(resolveCatalogEntry("net") === null, "the marketing token 'net' must never resolve as a station");
assert(isForbiddenCollapseName("city centre") === true, "'city centre' must never resolve as a station");

// Direction hub anchoring (FB-51, docs/jim-brief-fb51-uk-hub-rollout.md) — East
// Midlands is the first region on the shared lib/cities/uk/direction-hubs.js
// helper lifted out of uk-west-midlands's FB-50 work. Token-free: hub file
// load/validation, applyDirectionHubs() and the pure planner are all data-only.
const { hubs: emHubs } = loadDirectionHubs(EAST_MIDLANDS_REGION);
assert(emHubs.length === 1, "east-midlands direction-hubs.json must define exactly one hub for v1");
const nottinghamHub = emHubs[0];
assert(nottinghamHub.label === "Nottingham", "the v1 hub label must be Nottingham");
assert(nottinghamHub.filterCrs === "NOT", "the Nottingham hub filterCrs must be NOT");
assert(
  JSON.stringify([...nottinghamHub.appliesFrom].sort()) === JSON.stringify(["ALF", "CHD"]),
  `Nottingham hub appliesFrom must be exactly [ALF, CHD], got ${JSON.stringify(nottinghamHub.appliesFrom)}`
);

// applyDirectionHubs() with the brief's live-probed Alfreton chip set.
const alfChips = [
  "Leeds (Northern)",
  "Liverpool Lime Street (East Midlands Railway)",
  "Norwich (East Midlands Railway)",
  "Nottingham (East Midlands Railway)",
  "Nottingham (Northern)",
];
const alfResult = applyDirectionHubs(alfChips, "ALF", emHubs);
assert(
  JSON.stringify(alfResult) ===
    JSON.stringify(["Leeds (Northern)", "Liverpool Lime Street (East Midlands Railway)", "Nottingham"]),
  `applyDirectionHubs at ALF must absorb Nottingham/Norwich under Nottingham, got ${JSON.stringify(alfResult)}`
);

// Same fixture at NOT (not in appliesFrom) must be returned unchanged (sorted).
const notResult = applyDirectionHubs(alfChips, "NOT", emHubs);
assert(
  JSON.stringify(notResult) === JSON.stringify([...alfChips].sort((a, b) => a.localeCompare(b))),
  `applyDirectionHubs at NOT (not appliesFrom) must return the fixture chips unchanged (sorted), got ${JSON.stringify(notResult)}`
);

// planEastMidlandsNextTrainFetch() — pure routing decision table, token-free.
const alfEntry = resolveCatalogEntry("Alfreton", "train");
const notEntry = resolveCatalogEntry(EAST_MIDLANDS_HUB, "train");
const hubPlan = planEastMidlandsNextTrainFetch(alfEntry, "train", "Nottingham", emHubs);
assert(
  hubPlan.kind === "hub" && hubPlan.filterCrs === "NOT",
  `planEastMidlandsNextTrainFetch at ALF for "Nottingham" must be a hub plan filtered to NOT, got ${JSON.stringify(hubPlan)}`
);

// The exact-chip path must fire for an out-of-region terminus via the national
// rail-crs-index fallback — this is the sparse-results fix at Nottingham Station.
const exactPlan = planEastMidlandsNextTrainFetch(
  notEntry,
  "train",
  "London St Pancras (Intl) (East Midlands Railway)",
  emHubs
);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "STP",
  `planEastMidlandsNextTrainFetch at Nottingham Station for London St Pancras must be an exact plan filtered to STP, got ${JSON.stringify(exactPlan)}`
);

const undirectedPlan = planEastMidlandsNextTrainFetch(notEntry, "train", "Nowhere (X)", emHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planEastMidlandsNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// mode !== "train" is always undirected; metro/NET never consults hubs.
const metroPlan = planEastMidlandsNextTrainFetch(alfEntry, "metro", "Nottingham", emHubs);
assert(metroPlan.kind === "undirected", "metro mode must never consult the hub file");

// Direction model (still the design-time labels — NET's own catalog/label shape
// is unaffected by the flip; only the dogfood *dispatch* treats it as unconfirmed,
// see below). Hub never shows itself as its own destination.
const hubLabels = marketingLabelsForStation(EAST_MIDLANDS_HUB);
assert(hubLabels.includes("1 + Hucknall"), "hub must offer 1 + Hucknall");
assert(hubLabels.includes("1 + Toton Lane"), "hub must offer 1 + Toton Lane");
assert(hubLabels.includes("2 + Phoenix Park"), "hub must offer 2 + Phoenix Park");
assert(
  !hubLabels.some((label) => label.includes(EAST_MIDLANDS_HUB)),
  "the hub must never appear as its own chip terminus"
);
assert(mapNetDestination("Hucknall", "1") === "1 + Hucknall", "mapNetDestination must map a confirmed terminus");
assert(mapNetDestination("Toton Lane", "1") === "1 + Toton Lane", "mapNetDestination must map the renamed Toton Lane terminus");
assert(mapNetDestination("Beeston Centre", "1") === null, "mapNetDestination must not fabricate an unconfirmed intermediate-stop chip (Beeston Centre is a real, uncatalogued intermediate stop, not the Line 1 terminus)");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (unlike West of England's single-mode list) to disambiguate the doNotGroup hub.
const dogfoodStations = listEastMidlandsDogfoodStations();
assert(dogfoodStations.length === 109, `dogfood stations must be 109 (UK station fill phase 1), got ${dogfoodStations.length}`);
const hubEntries = dogfoodStations.filter((s) => s.name === EAST_MIDLANDS_HUB);
assert(hubEntries.length === 2, "Nottingham Station must appear twice in the dogfood list (rail + metro, doNotGroup)");
assert(
  new Set(hubEntries.map((s) => s.mode)).size === 2,
  "the two Nottingham Station dogfood entries must carry different modes"
);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod), MissingDarwinTokenError if not (expected in most local/CI
// sandboxes). Either outcome is acceptable here; only an unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getEastMidlandsDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections(EAST_MIDLANDS_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "east-midlands-darwin-live", "directions source must be east-midlands-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first — same
  // order as lib/providers/east-midlands.js's own fetchStationBoard() dispatcher.
  const dispatched = await getMultiCityDirections("east-midlands", EAST_MIDLANDS_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(dispatched.source === "east-midlands-darwin-live", "live-city-api dispatch source must be east-midlands-darwin-live");
} else {
  console.log(
    "east-midlands-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("east-midlands", EAST_MIDLANDS_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");
}

// End-to-end hub/exact next-train, with token: both paths must return trips
// with printedDestination populated (FB-51). Skipped (not failed) without a
// token, same tolerance as every other Darwin-backed check in this gate.
if (hubProbe.ok) {
  const hubNextTrain = await getEastMidlandsDogfoodNextTrain({
    station: "Alfreton",
    mode: "train",
    destination: "Nottingham",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
  assert(hubNextTrain.config?.destination === "Nottingham", "hub next-train destination must be the hub label Nottingham");
  for (const trip of hubNextTrain.upcoming ?? []) {
    assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "hub next-train trips must carry printedDestination");
  }

  const notreDirections = await getEastMidlandsDogfoodDirections(EAST_MIDLANDS_HUB, { mode: "train" });
  const stpChip = notreDirections.directions.find((chip) => chip.startsWith("London St Pancras"));
  if (stpChip) {
    const exactNextTrain = await getEastMidlandsDogfoodNextTrain({
      station: EAST_MIDLANDS_HUB,
      mode: "train",
      destination: stpChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(exactNextTrain.config?.destination === stpChip, "exact-chip next-train destination must equal the chosen chip");
    for (const trip of exactNextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "exact-chip next-train trips must carry printedDestination");
    }
  } else {
    console.log(
      "east-midlands-dogfood-gate: no London St Pancras chip in this live sample at Nottingham Station — exact-chip end-to-end check skipped (hub-path end-to-end above still exercised)."
    );
  }
}

// UK station fill phase 1 (13 Sep 2026): Carlton and Burton Joyce must
// resolve via the catalog and, when a token is present, return a real
// Darwin board — same skip-with-reason pattern as the hub probe above.
const carltonEntry = resolveCatalogEntry("Carlton", "train");
assert(carltonEntry?.crs === "CTO", "Carlton must resolve with crs CTO");
const burtonJoyceEntry = resolveCatalogEntry("Burton Joyce", "train");
assert(burtonJoyceEntry?.crs === "BUJ", "Burton Joyce must resolve with crs BUJ");
for (const [name] of [["Carlton"], ["Burton Joyce"]]) {
  const probe = await probeRailDirections(name);
  if (probe.ok) {
    assert(probe.pack.source === "east-midlands-darwin-live", `${name} directions source must be east-midlands-darwin-live`);
    assert(Array.isArray(probe.pack.directions), `${name} directions must be an array`);
  } else {
    console.log(`east-midlands-dogfood-gate: DARWIN_LDB_TOKEN not set — ${name} board not probed against a real payload (expected outside Vercel prod).`);
  }
}

// NET tram: no confirmed feed at all (see file header). fetchNetStopBoard() must
// throw NetFeedUnconfirmedError unconditionally, and the dogfood dispatch must
// surface that error rather than fabricate a schedule from the static label list.
let netBoardThrew = false;
try {
  await fetchNetStopBoard("Hucknall");
} catch (err) {
  netBoardThrew = err instanceof NetFeedUnconfirmedError;
}
assert(netBoardThrew, "fetchNetStopBoard must throw NetFeedUnconfirmedError — no confirmed NET GTFS source exists");

let netDirectionsThrew = false;
try {
  await getEastMidlandsDogfoodDirections("Hucknall", { mode: "metro" });
} catch (err) {
  netDirectionsThrew = err instanceof NetFeedUnconfirmedError;
}
assert(netDirectionsThrew, "getEastMidlandsDogfoodDirections must surface NetFeedUnconfirmedError for NET stops, not swallow it");

let netHubDirectionsThrew = false;
try {
  await getEastMidlandsDogfoodDirections(EAST_MIDLANDS_HUB, { mode: "metro" });
} catch (err) {
  netHubDirectionsThrew = err instanceof NetFeedUnconfirmedError;
}
assert(
  netHubDirectionsThrew,
  "getEastMidlandsDogfoodDirections must surface NetFeedUnconfirmedError for Nottingham Station's tram layer (doNotGroup), not the rail layer's data"
);

let netNextTrainThrew = false;
try {
  await getEastMidlandsDogfoodNextTrain({ station: "Hucknall", mode: "metro", destination: "1 + Toton Lane" });
} catch (err) {
  netNextTrainThrew = err instanceof NetFeedUnconfirmedError;
}
assert(netNextTrainThrew, "getEastMidlandsDogfoodNextTrain must surface NetFeedUnconfirmedError for NET stops, not fabricate a schedule");

// getMultiCityNextTrain must resolve to East Midlands' dogfood next-train module.
assert(typeof getEastMidlandsDogfoodNextTrain === "function", "getEastMidlandsDogfoodNextTrain must be exported for live-city-api to dispatch to");

// UK station fill phase 1 (13 Sep 2026) added a National Rail "Hucknall"
// (doNotGroup vs the NET terminus of the same name) — bare-name dispatch is
// rail-first everywhere in this codebase (see edinburgh/glasgow gates), so
// "Hucknall" alone now resolves to the rail layer, not NET. Use Toton Lane
// (a genuinely NET-only stop, no rail collision) to keep proving the
// dispatch surfaces NetFeedUnconfirmedError for a real NET-only station.
let dispatchNextTrainThrew = false;
try {
  await getMultiCityDirections("east-midlands", "Toton Lane");
} catch (err) {
  dispatchNextTrainThrew = err instanceof NetFeedUnconfirmedError;
}
assert(dispatchNextTrainThrew, "live-city-api dispatch must surface NetFeedUnconfirmedError for NET stops, not swallow it");

// Hucknall itself must now resolve rail-first through the same bare-name
// dispatch (MissingDarwinTokenError if no token, or a live rail board) —
// proving the doNotGroup split actually routes correctly, not just that it
// is documented.
let hucknallDispatchOk = false;
try {
  const hucknallDispatch = await getMultiCityDirections("east-midlands", "Hucknall");
  hucknallDispatchOk = hucknallDispatch.source === "east-midlands-darwin-live";
} catch (err) {
  hucknallDispatchOk = err instanceof MissingDarwinTokenError;
}
assert(hucknallDispatchOk, "live-city-api dispatch at bare 'Hucknall' must resolve rail-first (live chips or MissingDarwinTokenError), not the NET layer");

let unknownThrew = false;
try {
  await getEastMidlandsDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getEastMidlandsDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "east-midlands", station: EAST_MIDLANDS_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// docs/jim-brief-no-live-feed-stops-out-of-picker.md: every NET stop carries
// liveFeed: false, matches scripts/list-no-live-feed-stops.mjs, is carried
// through by listMultiCityStations, and is never nominated by findNearestStation.
assertNoLiveFeedStopsExcluded({
  region: "east-midlands",
  readFileSync,
  join,
  ROOT,
  listMultiCityStations,
  findNearestStation,
  assert,
  sample: { name: "Toton Lane", lat: 52.91843689308, lng: -1.26234261331 },
});

console.log(
  "east-midlands-dogfood-gate: ok (live/adapterReady, dispatch switch-case wired, D1 pack, 105 rail + 4 NET stations (UK station fill phase 1, 13 Sep 2026), doNotGroup at Nottingham Station and Hucknall across both modes, National Rail directions derived live from Darwin with no static line map, direction-hubs.json loads/validates and Alfreton/Chesterfield->Nottingham hub anchoring collapses the operator-split Nottingham/Norwich chips, exact-chip routing table (hub/exact/undirected) proven token-free via planEastMidlandsNextTrainFetch with the national rail-crs-index fallback for out-of-region termini, NET dispatch correctly surfaces NetFeedUnconfirmedError rather than the static label list, all 4 NET stops flagged liveFeed: false and excluded from the picker/Near me, Perth/Stockholm/Göteborg/Malmö/Uppsala/London TfL stay green)"
);
