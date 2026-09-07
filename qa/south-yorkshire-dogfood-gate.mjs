/**
 * South Yorkshire adapter/dispatch wiring gate + flip-commit assertions.
 * Wired by Jim (PR #294: dogfood module, dispatch switch-cases), flipped by
 * Mark (this commit: status live, list additions). Per CLAUDE.md's
 * flip-follow-through split (added 30 Aug 2026, corrected same day): status
 * flip, MULTI_CITY_IDS addition to live-city-api.js / brisbane-dogfood.js /
 * journey-model.js / app.js / city-session.js, LIVE_UK_REGION_IDS in
 * uk-planned-gate.mjs, and this gate's assertions all land in Mark's flip
 * commit. See docs/south-yorkshire-d1/jim-handoff.md for the handoff note.
 *
 * Two agencies, two very different outcomes once wired (same two-layer shape
 * as East Midlands' National Rail + NET pair and Greater Manchester's
 * National Rail + Metrolink pair):
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same reasoning and same
 *    live-derivation shape as every other UK NR region. Tolerates
 *    MissingDarwinTokenError in sandboxes without DARWIN_LDB_TOKEN set
 *    (expected outside Vercel prod / without the local token exported).
 *  - Sheffield Supertram: no confirmed GTFS/GTFS-RT feed exists at all under
 *    SYFTL (South Yorkshire Future Tram Limited took over from Stagecoach 22
 *    Mar 2024 — see lib/providers/south-yorkshire.js file header).
 *    fetchSupertramStopBoard() throws SupertramFeedUnconfirmedError
 *    unconditionally. This gate asserts the dogfood dispatch surfaces that
 *    documented error class rather than swallowing it or falling back to
 *    the static line+terminus label list — the National Rail layer is what
 *    this gate proves live, never Supertram.
 *
 * Sheffield Station (doNotGroup hub lock) and Meadowhall Interchange /
 * Meadowhall (doNotGroup-by-mode through-running/infrastructure-switch
 * point, NOT a second hub lock) catalog shape is carried forward verbatim
 * from the retired planned gate.
 *
 * Usage: node qa/south-yorkshire-dogfood-gate.mjs
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
  SOUTH_YORKSHIRE_HUB,
  SOUTH_YORKSHIRE_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listSupertramStops,
  listNationalRailStations,
  fetchSupertramStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  SupertramFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapSupertramDestination,
  isForbiddenCollapseName,
} from "../lib/providers/south-yorkshire.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listSouthYorkshireDogfoodStations,
  getSouthYorkshireDogfoodDirections,
  getSouthYorkshireDogfoodNextTrain,
  planSouthYorkshireNextTrainFetch,
} from "../lib/cities/south-yorkshire/dogfood-next-train.js";
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
const live = assertCityLive("south-yorkshire");
assert(live?.ok === true, "assertCityLive(south-yorkshire) must succeed — status is live");

const entry = getCity("south-yorkshire");
assert(entry?.status === "live", "south-yorkshire registry status must be live");
assert(entry?.adapterReady === undefined, "south-yorkshire adapterReady flag is removed once live");
assert(entry?.displayName === "South Yorkshire", "south-yorkshire display name must be South Yorkshire");
assert(entry?.timeZone === "Europe/London", "south-yorkshire timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "south-yorkshire").length === 1,
  "south-yorkshire must appear once in the registry"
);
for (const forbiddenId of ["sy", "sheffield", "supertram", "south-yorkshire-supertram"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Now in MULTI_CITY_IDS — this is the flip commit.
assert(
  isMultiCity("south-yorkshire") === true,
  "south-yorkshire must be in MULTI_CITY_IDS"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/south-yorkshire-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/south-yorkshire-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "south-yorkshire", "D1 city id is south-yorkshire");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === SOUTH_YORKSHIRE_HUB,
  `D1 lock must be ${SOUTH_YORKSHIRE_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOUTH_YORKSHIRE_REGION);
assert(region?.railCount === 6, `south-yorkshire rail count must be 6, got ${region?.railCount}`);
assert(region?.metroCount === 12, `south-yorkshire metro count must be 12, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Meadowhall Interchange",
  "Rotherham Central",
  "Darton",
  "South Elmsall",
  "Moorthorpe",
]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("SHF"), "National Rail catalog must carry SHF");
assert(railCrs.has("MHS"), "National Rail catalog must carry MHS");
for (const crs of ["RMC", "DRT", "SES", "MRP"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs} (live-verified 5 Sep 2026 CRS fill)`);
}
assert(!railCrs.has("CHD"), "National Rail catalog must not carry Chesterfield (owned by East Midlands)");
assert(!railNames.has("Chesterfield"), "National Rail catalog must not carry Chesterfield by name either");
assert(
  getNotInRegion(SOUTH_YORKSHIRE_REGION).includes("Chesterfield"),
  "Chesterfield must be recorded as a deliberate exclusion"
);

const supertramStops = listSupertramStops();
const supertramNames = new Set(supertramStops.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Malin Bridge",
  "Halfway",
  "Gleadless Townend",
  "Crystal Peaks",
  "Herdings Park",
  "Middlewood",
  "Hillsborough",
  "Sheffield Arena",
  "Meadowhall",
  "Rotherham Central",
  "Parkgate",
]) {
  assert(supertramNames.has(name), `Supertram catalog must carry ${name}`);
}
assert(supertramStops.length === 12, `Supertram catalog must have exactly 12 stops, got ${supertramStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 18, `combined catalog must have 18 stations (6 rail + 12 metro), got ${allStations.length}`);

// doNotGroup — Sheffield Station resolves as two distinct catalog entries by mode.
const hubRail = resolveCatalogEntry(SOUTH_YORKSHIRE_HUB, "train");
const hubMetro = resolveCatalogEntry(SOUTH_YORKSHIRE_HUB, "metro");
assert(hubRail?.crs === "SHF", "Sheffield Station must resolve as a National Rail entry (crs SHF)");
assert(hubMetro?.catalogId?.startsWith("supertram:"), "Sheffield Station must resolve as a distinct Supertram metro entry");
assert(resolveCatalogEntry("sheffield") === null, "the marketing token 'sheffield' must never resolve as a station");
assert(resolveCatalogEntry("supertram") === null, "the marketing token 'supertram' must never resolve as a station");
assert(isForbiddenCollapseName("Sheffield Interchange") === true, "'Sheffield Interchange' must never resolve as a station");

// Meadowhall — through-running/infrastructure-switch point, doNotGroup by mode, NOT a hub-lock parent.
const meadowhallRail = resolveCatalogEntry("Meadowhall Interchange", "train");
const meadowhallMetro = resolveCatalogEntry("Meadowhall", "metro");
assert(meadowhallRail?.crs === "MHS", "Meadowhall Interchange must resolve as a National Rail entry (crs MHS)");
assert(
  meadowhallMetro?.catalogId === "supertram:meadowhall",
  "Meadowhall must resolve as the Supertram Yellow terminus entry"
);

// Supertram direction model (design artifact only, never dogfood output — see
// dogfood-next-train.js file header). Hub never shows itself as its own destination.
const hubLabels = marketingLabelsForStation(SOUTH_YORKSHIRE_HUB);
assert(hubLabels.includes("Purple + Herdings Park"), "hub must offer Purple + Herdings Park");
assert(hubLabels.includes("Tram-Train + Parkgate"), "hub must offer Tram-Train + Parkgate");
assert(
  !hubLabels.some((label) => label.includes(SOUTH_YORKSHIRE_HUB)),
  "the hub must never appear as its own chip terminus"
);

const halfwayLabels = marketingLabelsForStation("Halfway");
assert(halfwayLabels.includes("Blue + Malin Bridge"), "Halfway must offer Blue + Malin Bridge");
assert(!halfwayLabels.some((label) => label.includes("Halfway")), "Halfway must never show itself as a destination");

const gleadlessLabels = marketingLabelsForStation("Gleadless Townend");
assert(
  gleadlessLabels.length === 0,
  "Gleadless Townend must not generate any direction chip — Purple's branch junction is an unresolved gap, not guessed"
);

assert(
  mapSupertramDestination("Halfway", "Blue") === "Blue + Halfway",
  "mapSupertramDestination must map a confirmed terminus"
);
assert(
  mapSupertramDestination("Gleadless Townend", "Purple") === null,
  "mapSupertramDestination must not fabricate the unresolved Purple branch chip"
);

// No direction-hubs.json for this region (no intermediate through-station
// candidate identified) — the shared helper must still degrade to an empty,
// no-op hub list, same call shape as every other UK region.
assert(
  !existsSync(join(ROOT, "lib/cities/south-yorkshire/direction-hubs.json")),
  "south-yorkshire must not ship a direction-hubs.json — no hub candidate identified in the D1 pack"
);
const { hubs: syHubs } = loadDirectionHubs(SOUTH_YORKSHIRE_REGION);
assert(syHubs.length === 0, `south-yorkshire must have zero configured hubs, got ${syHubs.length}`);

// planSouthYorkshireNextTrainFetch() — pure routing decision table, token-free.
const hubEntryRail = resolveCatalogEntry(SOUTH_YORKSHIRE_HUB, "train");
const meadowhallEntryRail = resolveCatalogEntry("Meadowhall Interchange", "train");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planSouthYorkshireNextTrainFetch(meadowhallEntryRail, "train", "Leeds (Northern)", syHubs);
assert(noHubPlan.kind !== "hub", "planSouthYorkshireNextTrainFetch must never return 'hub' — no hub is configured");

// The exact-chip path must fire for a destination whose station is in this region's own catalog.
const exactPlan = planSouthYorkshireNextTrainFetch(meadowhallEntryRail, "train", "Sheffield Station (Northern)", syHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "SHF",
  `planSouthYorkshireNextTrainFetch at Meadowhall Interchange for Sheffield Station must be an exact plan filtered to SHF, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index fallback
// for an out-of-region terminus (e.g. Leeds).
const nationalExactPlan = planSouthYorkshireNextTrainFetch(hubEntryRail, "train", "Leeds (Northern)", syHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "LDS",
  `planSouthYorkshireNextTrainFetch at Sheffield Station for Leeds must be an exact plan filtered to LDS, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planSouthYorkshireNextTrainFetch(hubEntryRail, "train", "Nowhere (X)", syHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planSouthYorkshireNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// mode !== "train" is always undirected; Supertram never consults hubs.
const metroPlan = planSouthYorkshireNextTrainFetch(hubEntryRail, "metro", "Blue + Halfway", syHubs);
assert(metroPlan.kind === "undirected", "metro mode must never consult the hub file");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (Sheffield Station's doNotGroup lock needs it to disambiguate).
const dogfoodStations = listSouthYorkshireDogfoodStations();
assert(dogfoodStations.length === 18, `dogfood stations must be the 18 D1 names, got ${dogfoodStations.length}`);
const hubEntries = dogfoodStations.filter((s) => s.name === SOUTH_YORKSHIRE_HUB);
assert(hubEntries.length === 2, "Sheffield Station must appear twice in the dogfood list (rail + metro, doNotGroup)");
assert(
  new Set(hubEntries.map((s) => s.mode)).size === 2,
  "the two Sheffield Station dogfood entries must carry different modes"
);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod, or exported locally), MissingDarwinTokenError if not (expected
// in most local/CI sandboxes). Either outcome is acceptable here; only an
// unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getSouthYorkshireDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections(SOUTH_YORKSHIRE_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "south-yorkshire-darwin-live", "directions source must be south-yorkshire-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first —
  // same order as lib/providers/south-yorkshire.js's own fetchStationBoard()
  // dispatcher.
  const dispatched = await getMultiCityDirections("south-yorkshire", SOUTH_YORKSHIRE_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(
    dispatched.source === "south-yorkshire-darwin-live",
    "live-city-api dispatch source must be south-yorkshire-darwin-live"
  );

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getSouthYorkshireDogfoodNextTrain({
      station: SOUTH_YORKSHIRE_HUB,
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
    const dispatchedNextTrain = await getMultiCityNextTrain("south-yorkshire", {
      station: SOUTH_YORKSHIRE_HUB,
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
    "south-yorkshire-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("south-yorkshire", SOUTH_YORKSHIRE_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");

  // fetchNationalRailBoard() / fetchStationBoard() must still throw
  // MissingDarwinTokenError before any fetch at the National Rail hub/Meadowhall.
  for (const stationName of [SOUTH_YORKSHIRE_HUB, "Meadowhall Interchange"]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(stationName);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Supertram: no confirmed GTFS/GTFS-RT feed exists at all under SYFTL (see
// file header). fetchSupertramStopBoard() must throw
// SupertramFeedUnconfirmedError unconditionally, and the dogfood dispatch
// must surface that documented error class rather than fabricate a schedule
// from the static label list. This holds REGARDLESS of whether
// DARWIN_LDB_TOKEN is set — Supertram has no token-gated path at all, it is
// a genuinely unconfirmed feed, not an account block.
let supertramBoardThrew = false;
try {
  await fetchSupertramStopBoard("Halfway");
} catch (err) {
  supertramBoardThrew = err instanceof SupertramFeedUnconfirmedError;
}
assert(supertramBoardThrew, "fetchSupertramStopBoard must throw SupertramFeedUnconfirmedError — no confirmed Supertram GTFS source exists");

let supertramDirectionsThrew = false;
try {
  await getSouthYorkshireDogfoodDirections("Halfway", { mode: "metro" });
} catch (err) {
  supertramDirectionsThrew = err instanceof SupertramFeedUnconfirmedError;
}
assert(
  supertramDirectionsThrew,
  "getSouthYorkshireDogfoodDirections must surface SupertramFeedUnconfirmedError for Supertram stops, not swallow it"
);

let supertramHubDirectionsThrew = false;
try {
  await getSouthYorkshireDogfoodDirections(SOUTH_YORKSHIRE_HUB, { mode: "metro" });
} catch (err) {
  supertramHubDirectionsThrew = err instanceof SupertramFeedUnconfirmedError;
}
assert(
  supertramHubDirectionsThrew,
  "getSouthYorkshireDogfoodDirections must surface SupertramFeedUnconfirmedError for Sheffield Station's tram layer (doNotGroup), not the rail layer's data"
);

let supertramMeadowhallDirectionsThrew = false;
try {
  await getSouthYorkshireDogfoodDirections("Meadowhall", { mode: "metro" });
} catch (err) {
  supertramMeadowhallDirectionsThrew = err instanceof SupertramFeedUnconfirmedError;
}
assert(
  supertramMeadowhallDirectionsThrew,
  "getSouthYorkshireDogfoodDirections must surface SupertramFeedUnconfirmedError for Meadowhall's tram layer (doNotGroup, through-running switch point), not the rail layer's data"
);

let supertramNextTrainThrew = false;
try {
  await getSouthYorkshireDogfoodNextTrain({ station: "Halfway", mode: "metro", destination: "Blue + Malin Bridge" });
} catch (err) {
  supertramNextTrainThrew = err instanceof SupertramFeedUnconfirmedError;
}
assert(
  supertramNextTrainThrew,
  "getSouthYorkshireDogfoodNextTrain must surface SupertramFeedUnconfirmedError for Supertram stops, not fabricate a schedule"
);

let dispatchSupertramThrew = false;
try {
  await getMultiCityDirections("south-yorkshire", "Halfway");
} catch (err) {
  dispatchSupertramThrew = err instanceof SupertramFeedUnconfirmedError;
}
assert(dispatchSupertramThrew, "live-city-api dispatch must surface SupertramFeedUnconfirmedError for Supertram stops, not swallow it");

// The production dispatch dispatcher (bare name, no mode) at Sheffield Station
// resolves rail-first — same order as lib/providers/south-yorkshire.js's own
// fetchStationBoard() dispatcher — so the hub's ambiguous bare lookup never
// silently returns the Supertram layer.
let dispatchThrew = false;
try {
  await fetchStationBoard("Halfway");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Supertram");

let unknownThrew = false;
try {
  await getSouthYorkshireDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getSouthYorkshireDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "south-yorkshire", station: SOUTH_YORKSHIRE_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

// docs/jim-brief-no-live-feed-stops-out-of-picker.md: every Supertram stop
// carries liveFeed: false, matches scripts/list-no-live-feed-stops.mjs, is
// carried through by listMultiCityStations, and is never nominated by
// findNearestStation.
assertNoLiveFeedStopsExcluded({
  region: "south-yorkshire",
  readFileSync,
  join,
  ROOT,
  listMultiCityStations,
  findNearestStation,
  assert,
  sample: { name: "Malin Bridge", lat: 53.400648607, lng: -1.508467678 },
});

console.log(
  "south-yorkshire-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 6 rail + 12 Supertram stations, doNotGroup at Sheffield Station and Meadowhall Interchange/Meadowhall (through-running switch point, not a second hub lock), National Rail directions derived live from Darwin with no static line map, exact-chip routing table (exact/undirected) proven token-free with the national rail-crs-index fallback for out-of-region termini, Supertram dispatch correctly surfaces SupertramFeedUnconfirmedError rather than the static label list, all 12 Supertram stops flagged liveFeed: false and excluded from the picker/Near me, Perth Australia stays green)"
);
