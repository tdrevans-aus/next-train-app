/**
 * North East adapter/dispatch wiring gate + flip-commit assertions. Wired by
 * Jim (PR #299: dogfood module, dispatch switch-cases), flipped by Mark
 * (this commit: status live, list additions). Per CLAUDE.md's
 * flip-follow-through split (added 30 Aug 2026, corrected same day): status
 * flip, MULTI_CITY_IDS addition to live-city-api.js / brisbane-dogfood.js /
 * journey-model.js / app.js / city-session.js, LIVE_UK_REGION_IDS in
 * uk-planned-gate.mjs, and this gate's assertions all land in Mark's flip
 * commit. See docs/north-east-d1/jim-handoff.md for the handoff note.
 *
 * Two agencies, two very different outcomes once wired (same two-layer shape
 * as East Midlands' National Rail + NET pair and South Yorkshire's National
 * Rail + Supertram pair):
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same reasoning and same
 *    live-derivation shape as every other UK NR region. Tolerates
 *    MissingDarwinTokenError in sandboxes without DARWIN_LDB_TOKEN set
 *    (expected outside Vercel prod / without the local token exported).
 *  - Tyne and Wear Metro: OUT-PRODUCT (Tim, 5 Sep 2026 — see
 *    docs/jim-brief-north-east-metro-out-product.md and
 *    docs/united-kingdom-ledger.md §3/§4): no confirmed public real-time
 *    feed exists at all, so fetchMetroStopBoard() throws
 *    MetroFeedUnconfirmedError unconditionally — this holds REGARDLESS of
 *    whether DARWIN_LDB_TOKEN is set, since Metro has no token-gated path at
 *    all. This gate asserts the dogfood dispatch surfaces that documented
 *    error class rather than swallowing it or falling back to the static
 *    line+terminus label list — the National Rail layer is what this gate
 *    proves live, never Metro.
 *
 * Newcastle Central (doNotGroup hub lock, DIFFERENT printed names) and
 * Sunderland (NOT doNotGroup, genuine shared-platform case) catalog shape is
 * carried forward verbatim from the retired planned gate.
 *
 * Usage: node qa/north-east-dogfood-gate.mjs
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
  NORTH_EAST_HUB,
  METRO_HUB_STATION_NAME,
  NORTH_EAST_REGION,
  METRO_LINES,
  SUNDERLAND_SHARED_PLATFORM,
  PELAW_JUNCTION,
  resolveCatalogEntry,
  listCatalogStations,
  listMetroStopsForRegion,
  listNationalRailStations,
  fetchMetroStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  MetroFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapMetroDestination,
  linesForStation,
  isForbiddenCollapseName,
} from "../lib/providers/north-east.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listNorthEastDogfoodStations,
  getNorthEastDogfoodDirections,
  getNorthEastDogfoodNextTrain,
  planNorthEastNextTrainFetch,
} from "../lib/cities/north-east/dogfood-next-train.js";
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
const live = assertCityLive("north-east");
assert(live?.ok === true, "assertCityLive(north-east) must succeed — status is live");

const entry = getCity("north-east");
assert(entry?.status === "live", "north-east registry status must be live");
assert(entry?.adapterReady === undefined, "north-east adapterReady flag is removed once live");
assert(
  entry?.displayName === "North East (Tyne and Wear)",
  "north-east display name must be North East (Tyne and Wear)"
);
assert(entry?.timeZone === "Europe/London", "north-east timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "north-east").length === 1, "north-east must appear once in the registry");
// Note: "newcastle" is already a registered city id (Newcastle, Australia — a distinct city, not
// this pack's Newcastle Central hub). Not checked as forbidden here for that reason — must remain live/untouched.
const newcastleAu = assertCityLive("newcastle");
assert(newcastleAu?.ok === true, "Newcastle (Australia) must stay live and untouched by this pack");
for (const forbiddenId of ["ne", "tyne-and-wear", "north-east-metro"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Now in MULTI_CITY_IDS — this is the flip commit.
assert(
  isMultiCity("north-east") === true,
  "north-east must be in MULTI_CITY_IDS"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/north-east-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/north-east-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "north-east", "D1 city id is north-east");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === NORTH_EAST_HUB, `D1 lock must be ${NORTH_EAST_HUB}`);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(NORTH_EAST_REGION);
assert(region?.railCount === 33, `north-east rail count must be 33 (UK station fill phase 2b, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 60, `north-east metro count must be 60, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Newcastle Central", "Sunderland", "Berwick-upon-Tweed"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("NCL"), "National Rail catalog must carry NCL");
assert(railCrs.has("SUN"), "National Rail catalog must carry SUN");
assert(railCrs.has("BWK"), "National Rail catalog must carry BWK");
// docs/united-kingdom-ledger.md section 2 decided Darlington's home region as North East
// (Tim, 5 Sep 2026) — added in UK station fill phase 2a (14 Sep 2026), superseding the earlier
// "unresolved boundary" exclusion this gate used to assert.
assert(railNames.has("Darlington"), "National Rail catalog must carry Darlington (ledger-decided home region, UK station fill phase 2a)");
assert(railCrs.has("DAR"), "National Rail catalog must carry DAR (Darlington)");
assert(
  !getNotInRegion(NORTH_EAST_REGION).includes("Darlington"),
  "Darlington must no longer be recorded as a deliberate exclusion"
);

const metroStops = listMetroStopsForRegion();
const metroNames = new Set(metroStops.map((s) => s.name));
for (const name of [
  "St James",
  "South Shields",
  "South Hylton",
  "Newcastle Airport",
  METRO_HUB_STATION_NAME,
  "Sunderland",
  "Pelaw",
]) {
  assert(metroNames.has(name), `Metro catalog must carry ${name}`);
}
assert(metroStops.length === 60, `Metro catalog must have exactly 60 stops, got ${metroStops.length}`);
assert(!metroNames.has("Newcastle Central"), "Metro catalog must use 'Central Station', not 'Newcastle Central'");

const allStations = listCatalogStations();
assert(allStations.length === 93, `combined catalog must have 93 stations (33 rail + 60 metro, UK station fill phase 2b), got ${allStations.length}`);

// doNotGroup at Newcastle Central — two catalog entries, DIFFERENT printed names (no collapse risk).
const hubRail = resolveCatalogEntry(NORTH_EAST_HUB, "train");
const hubMetro = resolveCatalogEntry(METRO_HUB_STATION_NAME, "metro");
assert(hubRail?.crs === "NCL", "Newcastle Central must resolve as a National Rail entry (crs NCL)");
assert(hubMetro?.catalogId === "metro:central-station", "Central Station must resolve as the Metro hub entry");
assert(resolveCatalogEntry("newcastle") === null, "the marketing token 'newcastle' must never resolve as a station");
assert(resolveCatalogEntry("ncl") === null, "the marketing token 'ncl' must never resolve as a station");
assert(isForbiddenCollapseName("Tyne and Wear Metro") === true, "'Tyne and Wear Metro' must never resolve as a station");

// Sunderland — genuinely NOT doNotGroup, shared-platform metadata exported for a future
// board-merging pass.
const sunderlandRail = resolveCatalogEntry("Sunderland", "train");
const sunderlandMetro = resolveCatalogEntry("Sunderland", "metro");
assert(sunderlandRail?.crs === "SUN", "Sunderland's National Rail entry must carry crs SUN (live-verified 5 Sep 2026)");
assert(sunderlandMetro?.catalogId === "metro:sunderland", "Sunderland must resolve as a Green Line metro entry");
assert(SUNDERLAND_SHARED_PLATFORM?.name === "Sunderland", "SUNDERLAND_SHARED_PLATFORM must be exported");
assert(
  SUNDERLAND_SHARED_PLATFORM.class.toLowerCase().includes("not donotgroup"),
  "SUNDERLAND_SHARED_PLATFORM must be explicitly documented as NOT a doNotGroup case"
);

// Pelaw — Metro-only junction, no separate National Rail station.
assert(PELAW_JUNCTION?.name === "Pelaw", "PELAW_JUNCTION must be exported");
assert(!railNames.has("Pelaw"), "Pelaw must not appear in the National Rail catalog");
assert(metroNames.has("Pelaw"), "Pelaw must appear in the Metro catalog");
assert(
  linesForStation("Pelaw").sort().join(",") === "Green,Yellow",
  "Pelaw must be served by both Green and Yellow (GTFS-confirmed, resolves the D1 pack's open question)"
);

// Direction model — line + terminus, hub never shows itself, full GTFS-confirmed station lists.
// This is a design artifact for QA/documentation purposes only — never dogfood output, since
// Metro has no confirmed real-time feed (see file header).
assert(METRO_LINES.find((l) => l.number === "Green")?.stations.length === 31, "Green Line must have 31 confirmed stations");
assert(METRO_LINES.find((l) => l.number === "Yellow")?.stations.length === 41, "Yellow Line must have 41 confirmed unique stations");

const hubLabels = marketingLabelsForStation(METRO_HUB_STATION_NAME);
assert(hubLabels.includes("Green + South Hylton"), "hub must offer Green + South Hylton");
assert(hubLabels.includes("Yellow + St James"), "hub must offer Yellow + St James");
assert(hubLabels.includes("Yellow + South Shields"), "hub must offer Yellow + South Shields");
assert(
  !hubLabels.some((label) => label.includes(METRO_HUB_STATION_NAME)),
  "the metro hub must never appear as its own chip terminus"
);

const stJamesLabels = marketingLabelsForStation("St James");
assert(stJamesLabels.includes("Yellow + South Shields"), "St James must offer Yellow + South Shields");
assert(!stJamesLabels.some((label) => label.includes("St James")), "St James must never show itself as a destination");

assert(
  mapMetroDestination("South Hylton", "Green") === "Green + South Hylton",
  "mapMetroDestination must map a confirmed terminus"
);
assert(mapMetroDestination("Pelaw", "Green") === null, "mapMetroDestination must not fabricate a non-terminus chip");

// No direction-hubs.json for this region (no intermediate through-station
// candidate identified) — the shared helper must still degrade to an empty,
// no-op hub list, same call shape as every other UK region.
assert(
  !existsSync(join(ROOT, "lib/cities/north-east/direction-hubs.json")),
  "north-east must not ship a direction-hubs.json — no hub candidate identified in the D1 pack"
);
const { hubs: neHubs } = loadDirectionHubs(NORTH_EAST_REGION);
assert(neHubs.length === 0, `north-east must have zero configured hubs, got ${neHubs.length}`);

// planNorthEastNextTrainFetch() — pure routing decision table, token-free.
const hubEntryRail = resolveCatalogEntry(NORTH_EAST_HUB, "train");
const sunderlandEntryRail = resolveCatalogEntry("Sunderland", "train");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planNorthEastNextTrainFetch(sunderlandEntryRail, "train", "Newcastle Central (Northern)", neHubs);
assert(noHubPlan.kind !== "hub", "planNorthEastNextTrainFetch must never return 'hub' — no hub is configured");

// The exact-chip path must fire for a destination whose station is in this region's own catalog.
const exactPlan = planNorthEastNextTrainFetch(sunderlandEntryRail, "train", "Newcastle Central (Northern)", neHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "NCL",
  `planNorthEastNextTrainFetch at Sunderland for Newcastle Central must be an exact plan filtered to NCL, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index fallback
// for an out-of-region terminus (e.g. Leeds).
const nationalExactPlan = planNorthEastNextTrainFetch(hubEntryRail, "train", "Leeds (Northern)", neHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "LDS",
  `planNorthEastNextTrainFetch at Newcastle Central for Leeds must be an exact plan filtered to LDS, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planNorthEastNextTrainFetch(hubEntryRail, "train", "Nowhere (X)", neHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planNorthEastNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// mode !== "train" is always undirected; Metro never consults hubs.
const metroPlan = planNorthEastNextTrainFetch(hubEntryRail, "metro", "Green + South Hylton", neHubs);
assert(metroPlan.kind === "undirected", "metro mode must never consult the hub file");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (Newcastle Central's doNotGroup lock needs it to disambiguate the two catalog entries).
const dogfoodStations = listNorthEastDogfoodStations();
assert(dogfoodStations.length === 93, `dogfood stations must be the 93 catalog entries (33 rail + 60 metro, UK station fill phase 2b), got ${dogfoodStations.length}`);
const hubRailEntries = dogfoodStations.filter((s) => s.name === NORTH_EAST_HUB);
assert(hubRailEntries.length === 1, "Newcastle Central must appear once in the dogfood list (National Rail only)");
const hubMetroEntries = dogfoodStations.filter((s) => s.name === METRO_HUB_STATION_NAME);
assert(hubMetroEntries.length === 1, "Central Station must appear once in the dogfood list (Metro only, different printed name)");

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod, or exported locally), MissingDarwinTokenError if not (expected
// in most local/CI sandboxes). Either outcome is acceptable here; only an
// unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getNorthEastDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections(NORTH_EAST_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "north-east-darwin-live", "directions source must be north-east-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first —
  // same order as lib/providers/north-east.js's own fetchStationBoard()
  // dispatcher.
  const dispatched = await getMultiCityDirections("north-east", NORTH_EAST_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(
    dispatched.source === "north-east-darwin-live",
    "live-city-api dispatch source must be north-east-darwin-live"
  );

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getNorthEastDogfoodNextTrain({
      station: NORTH_EAST_HUB,
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
    const dispatchedNextTrain = await getMultiCityNextTrain("north-east", {
      station: NORTH_EAST_HUB,
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
    "north-east-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("north-east", NORTH_EAST_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");

  // fetchNationalRailBoard() / fetchStationBoard() must still throw
  // MissingDarwinTokenError before any fetch at the National Rail hub/Sunderland.
  for (const stationName of [NORTH_EAST_HUB, "Sunderland"]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(stationName);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Metro: OUT-PRODUCT, no confirmed public real-time feed exists at all (see
// file header). fetchMetroStopBoard() must throw MetroFeedUnconfirmedError
// unconditionally, and the dogfood dispatch must surface that documented
// error class rather than fabricate a schedule from the static label list.
// This holds REGARDLESS of whether DARWIN_LDB_TOKEN is set — Metro has no
// token-gated path at all, it is an out-product decision, not an account
// block.
let metroBoardThrew = false;
try {
  await fetchMetroStopBoard("Monument");
} catch (err) {
  metroBoardThrew = err instanceof MetroFeedUnconfirmedError;
}
assert(metroBoardThrew, "fetchMetroStopBoard must throw MetroFeedUnconfirmedError — Metro is out-product, no confirmed real-time feed");

let metroDirectionsThrew = false;
try {
  await getNorthEastDogfoodDirections("Monument", { mode: "metro" });
} catch (err) {
  metroDirectionsThrew = err instanceof MetroFeedUnconfirmedError;
}
assert(
  metroDirectionsThrew,
  "getNorthEastDogfoodDirections must surface MetroFeedUnconfirmedError for Metro stops, not swallow it"
);

let metroHubDirectionsThrew = false;
try {
  await getNorthEastDogfoodDirections(METRO_HUB_STATION_NAME, { mode: "metro" });
} catch (err) {
  metroHubDirectionsThrew = err instanceof MetroFeedUnconfirmedError;
}
assert(
  metroHubDirectionsThrew,
  "getNorthEastDogfoodDirections must surface MetroFeedUnconfirmedError for Central Station's Metro layer (doNotGroup), not the rail layer's data"
);

let metroSunderlandDirectionsThrew = false;
try {
  await getNorthEastDogfoodDirections("Sunderland", { mode: "metro" });
} catch (err) {
  metroSunderlandDirectionsThrew = err instanceof MetroFeedUnconfirmedError;
}
assert(
  metroSunderlandDirectionsThrew,
  "getNorthEastDogfoodDirections must surface MetroFeedUnconfirmedError for Sunderland's Metro layer (genuinely NOT doNotGroup, but Metro still has no live feed), not fabricate a mixed board"
);

let metroNextTrainThrew = false;
try {
  await getNorthEastDogfoodNextTrain({ station: "Monument", mode: "metro", destination: "Green + South Hylton" });
} catch (err) {
  metroNextTrainThrew = err instanceof MetroFeedUnconfirmedError;
}
assert(
  metroNextTrainThrew,
  "getNorthEastDogfoodNextTrain must surface MetroFeedUnconfirmedError for Metro stops, not fabricate a schedule"
);

let dispatchMetroThrew = false;
try {
  await getMultiCityDirections("north-east", "Monument");
} catch (err) {
  dispatchMetroThrew = err instanceof MetroFeedUnconfirmedError;
}
assert(dispatchMetroThrew, "live-city-api dispatch must surface MetroFeedUnconfirmedError for Metro stops, not swallow it");

// The production dispatch dispatcher (bare name, no mode) at Newcastle Central
// resolves rail-first — same order as lib/providers/north-east.js's own
// fetchStationBoard() dispatcher — so the hub's ambiguous bare lookup never
// silently returns the Metro layer.
let dispatchThrew = false;
try {
  await fetchStationBoard("Monument");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Metro");

let unknownThrew = false;
try {
  await getNorthEastDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getNorthEastDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "north-east", station: NORTH_EAST_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// docs/jim-brief-no-live-feed-stops-out-of-picker.md: every Metro stop
// carries liveFeed: false, matches scripts/list-no-live-feed-stops.mjs, is
// carried through by listMultiCityStations, and is never nominated by
// findNearestStation.
assertNoLiveFeedStopsExcluded({
  region: "north-east",
  readFileSync,
  join,
  ROOT,
  listMultiCityStations,
  findNearestStation,
  assert,
  sample: { name: "Bank Foot", lat: 55.01377620486, lng: -1.67724082616 },
});

console.log(
  "north-east-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 33 rail + 60 Metro stations, doNotGroup at Brockley Whins/East Boldon/Heworth/Manors/Seaburn (UK station fill phase 2b) and Newcastle Central via distinct printed names, Sunderland correctly modelled as NOT doNotGroup (still Metro-feed-blocked), Pelaw confirmed Metro-only and served by both lines, National Rail directions derived live from Darwin with no static line map, exact-chip routing table (exact/undirected) proven token-free with the national rail-crs-index fallback for out-of-region termini, Metro dispatch correctly surfaces MetroFeedUnconfirmedError rather than the static label list, all 60 Metro stops flagged liveFeed: false and excluded from the picker/Near me, Newcastle (Australia) and Perth (Australia) stay green)"
);
