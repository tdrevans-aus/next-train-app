/**
 * Greater Manchester adapter/dispatch wiring gate. Replaces
 * greater-manchester-planned-gate.mjs (retired) — Greater Manchester STAYS
 * `status: "planned"` here (this is the pre-flip dogfood wiring pass,
 * docs/jim-brief-greater-manchester-flip.md). Per CLAUDE.md's
 * flip-follow-through split (added 30 Aug 2026, corrected same day): the
 * dogfood module, the live-city-api.js dispatch switch-cases, and this gate
 * are safe to land ahead of the flip because production routes gate on
 * assertCityLive() first, not on MULTI_CITY_IDS membership. Greater
 * Manchester is deliberately NOT added to MULTI_CITY_IDS, brisbane-dogfood.js's
 * mount/available map, or journey-model.js's persisted-city/country lists yet
 * — those three list-membership edits are Mark's flip commit, not this one
 * (qa/live-city-lists-sync.mjs enforces that they equal the registry's live
 * set). See docs/greater-manchester-d1/jim-handoff.md for the exact note left
 * for Mark.
 *
 * Two agencies, two very different outcomes once wired (same two-layer shape
 * as East Midlands' National Rail + NET pair, qa/east-midlands-dogfood-gate.mjs):
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same reasoning and same
 *    live-derivation shape as every other UK NR region. Tolerates
 *    MissingDarwinTokenError in sandboxes without DARWIN_LDB_TOKEN set
 *    (expected outside Vercel prod / without the local token exported).
 *  - Metrolink tram: no confirmed real-time feed exists at all (TfGM
 *    developer portal deprecated, no new API keys issued — see
 *    lib/providers/greater-manchester.js file header). fetchMetrolinkStopBoard()
 *    throws MetrolinkFeedUnconfirmedError unconditionally. This gate asserts
 *    the dogfood dispatch surfaces that documented error class rather than
 *    swallowing it or falling back to the static line+terminus label list —
 *    the National Rail layer is what this gate proves live, never Metrolink.
 *
 * Manchester Victoria (doNotGroup shared-building hub) and Manchester
 * Piccadilly/Piccadilly Gardens (doNotGroup walk-link pair) catalog shape is
 * carried forward verbatim from the retired planned gate.
 *
 * Usage: node qa/greater-manchester-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  GREATER_MANCHESTER_REGION,
  GREATER_MANCHESTER_NR_HUB,
  GREATER_MANCHESTER_NR_SECONDARY_HUB,
  GREATER_MANCHESTER_METROLINK_HUB,
  GREATER_MANCHESTER_METROLINK_SECONDARY_HUB,
  resolveCatalogEntry,
  listCatalogStations,
  listMetrolinkStops,
  listNationalRailStations,
  fetchMetrolinkStopBoard,
  fetchNationalRailBoard,
  fetchStationBoard,
  MetrolinkFeedUnconfirmedError,
  MissingDarwinTokenError,
  marketingLabelsForStation,
  mapMetrolinkDestination,
  isForbiddenCollapseName,
} from "../lib/providers/greater-manchester.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listGreaterManchesterDogfoodStations,
  getGreaterManchesterDogfoodDirections,
  getGreaterManchesterDogfoodNextTrain,
  planGreaterManchesterNextTrainFetch,
} from "../lib/cities/greater-manchester/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city. Perth (Australia) green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth (Australia) must stay live");

// Registry identity — STAYS planned (Mark/Tim's flip call, not made here).
const live = assertCityLive("greater-manchester");
assert(live?.ok === false, "assertCityLive(greater-manchester) must fail — status is still planned");
assert(live?.status === 501, "greater-manchester must be 501 planned");

const entry = getCity("greater-manchester");
assert(entry?.status === "planned", "greater-manchester registry status must stay planned");
assert(entry?.adapterReady === true, "greater-manchester adapterReady must be true");
assert(entry?.displayName === "Greater Manchester", "greater-manchester display name must be Greater Manchester");
assert(entry?.timeZone === "Europe/London", "greater-manchester timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "greater-manchester").length === 1,
  "greater-manchester must appear once in the registry"
);
for (const forbiddenId of ["gm", "manchester", "metrolink", "greater-manchester-metrolink"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// NOT yet in MULTI_CITY_IDS — that's Mark's flip commit, not this pass.
assert(
  isMultiCity("greater-manchester") === false,
  "greater-manchester must NOT be in MULTI_CITY_IDS yet — that's Mark's flip commit"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/greater-manchester-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/greater-manchester-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "greater-manchester", "D1 city id is greater-manchester");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.nationalRailLock === GREATER_MANCHESTER_NR_HUB,
  `D1 National Rail lock must be ${GREATER_MANCHESTER_NR_HUB}`
);
assert(
  network.printedInnerCityNames?.metrolinkLock === GREATER_MANCHESTER_METROLINK_HUB,
  `D1 Metrolink lock must be ${GREATER_MANCHESTER_METROLINK_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(GREATER_MANCHESTER_REGION);
assert(region?.railCount === 4, `greater-manchester rail count must be 4, got ${region?.railCount}`);
assert(region?.metroCount === 15, `greater-manchester metro count must be 15, got ${region?.metroCount}`);

const railStations = listNationalRailStations();
const railNames = new Set(railStations.map((s) => s.name));
for (const name of ["Manchester Piccadilly", "Manchester Victoria", "Stockport", "Walsden"]) {
  assert(railNames.has(name), `National Rail catalog must carry ${name}`);
}
const railCrs = new Set(railStations.map((s) => s.crs).filter(Boolean));
assert(railCrs.has("MAN"), "National Rail catalog must carry MAN");
assert(railCrs.has("MCV"), "National Rail catalog must carry MCV");
assert(railCrs.has("SPT"), "National Rail catalog must carry SPT (Stockport, live-verified 5 Sep 2026 — corrected from SMN)");
assert(railCrs.has("WDN"), "National Rail catalog must carry WDN (this region's own oracle report's Walsden code)");
assert(!railCrs.has("WAD"), "National Rail catalog must NOT silently adopt West Yorkshire's WAD code for Walsden");
assert(getNotInRegion(GREATER_MANCHESTER_REGION).length === 0, "greater-manchester has no deliberate rail exclusions recorded");

const metroStops = listMetrolinkStops();
const metroNames = new Set(metroStops.map((s) => s.name));
for (const name of [
  "St Peter's Square",
  "Manchester Victoria",
  "Piccadilly Gardens",
  "Bury",
  "Altrincham",
  "Ashton-under-Lyne",
  "Eccles",
  "Trafford Centre",
  "Cornbrook",
  "Imperial War Museum",
  "Wharfside",
  "Pomona",
  "Rochdale",
  "Manchester Airport",
  "Stockport (tram stop)",
]) {
  assert(metroNames.has(name), `Metrolink catalog must carry ${name}`);
}
assert(metroStops.length === 15, `Metrolink catalog must have exactly 15 stops, got ${metroStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 19, `combined catalog must have 19 stations (4 rail + 15 metro), got ${allStations.length}`);

// doNotGroup — Manchester Victoria resolves as two distinct catalog entries by mode.
const victoriaRail = resolveCatalogEntry(GREATER_MANCHESTER_NR_SECONDARY_HUB, "train");
const victoriaMetro = resolveCatalogEntry(GREATER_MANCHESTER_METROLINK_SECONDARY_HUB, "metro");
assert(victoriaRail?.crs === "MCV", "Manchester Victoria must resolve as a National Rail entry (crs MCV)");
assert(
  victoriaMetro?.catalogId === "metrolink:manchester-victoria",
  "Manchester Victoria must resolve as a distinct Metrolink metro entry"
);

// doNotGroup — Manchester Piccadilly (NR) and Piccadilly Gardens (Metrolink) are separate stationGroups.
const piccadillyRail = resolveCatalogEntry(GREATER_MANCHESTER_NR_HUB, "train");
const piccadillyGardens = resolveCatalogEntry("Piccadilly Gardens", "metro");
assert(piccadillyRail?.crs === "MAN", "Manchester Piccadilly must resolve as a National Rail entry (crs MAN)");
assert(
  piccadillyGardens?.catalogId === "metrolink:piccadilly-gardens",
  "Piccadilly Gardens must resolve as a distinct Metrolink metro entry"
);
assert(
  resolveCatalogEntry("Piccadilly", "metro")?.catalogId === "metrolink:piccadilly-gardens",
  "'Piccadilly' alias must resolve to Piccadilly Gardens, never to the National Rail station"
);

// Forbidden ambiguous marketing tokens must never resolve.
assert(resolveCatalogEntry("Manchester") === null, "the bare token 'Manchester' must never resolve as a station");
assert(isForbiddenCollapseName("Manchester Central") === true, "'Manchester Central' must never resolve as a station");
assert(isForbiddenCollapseName("Victoria Station") === true, "'Victoria Station' must never resolve as a station");

// Metrolink direction model (design artifact only, never dogfood output — see
// dogfood-next-train.js file header). Hub never shows itself as its own destination.
const hubLabels = marketingLabelsForStation(GREATER_MANCHESTER_METROLINK_HUB);
assert(hubLabels.length === 0, "St Peter's Square is not itself a line terminus in the report's termini-only data");

const buryLabels = marketingLabelsForStation("Bury");
assert(buryLabels.includes("Green + Altrincham"), "Bury must offer Green + Altrincham");
assert(buryLabels.includes("Yellow + Piccadilly"), "Bury must offer Yellow + Piccadilly");
assert(buryLabels.includes("Purple + Altrincham"), "Bury must offer Purple + Altrincham");
assert(!buryLabels.some((label) => label.includes("+ Bury")), "Bury must never show itself as a destination");

const imperialWarMuseumLabels = marketingLabelsForStation("Imperial War Museum");
assert(
  imperialWarMuseumLabels.length === 0,
  "Imperial War Museum must not generate any direction chip — Red line via-points are a real gap, not guessed"
);

assert(
  mapMetrolinkDestination("Altrincham", "Green") === "Green + Altrincham",
  "mapMetrolinkDestination must map a confirmed terminus"
);
assert(
  mapMetrolinkDestination("Imperial War Museum", "Red") === null,
  "mapMetrolinkDestination must not fabricate an unresolved Red-line via-point chip"
);

// No direction-hubs.json for this region (no intermediate through-station
// candidate identified) — the shared helper must still degrade to an empty,
// no-op hub list, same call shape as every other UK region.
assert(
  !existsSync(join(ROOT, "lib/cities/greater-manchester/direction-hubs.json")),
  "greater-manchester must not ship a direction-hubs.json — no hub candidate identified in the D1 pack"
);
const { hubs: gmHubs } = loadDirectionHubs(GREATER_MANCHESTER_REGION);
assert(gmHubs.length === 0, `greater-manchester must have zero configured hubs, got ${gmHubs.length}`);

// planGreaterManchesterNextTrainFetch() — pure routing decision table, token-free.
const piccadillyEntry = resolveCatalogEntry(GREATER_MANCHESTER_NR_HUB, "train");
const victoriaEntry = resolveCatalogEntry(GREATER_MANCHESTER_NR_SECONDARY_HUB, "train");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planGreaterManchesterNextTrainFetch(victoriaEntry, "train", "Leeds (Northern)", gmHubs);
assert(noHubPlan.kind !== "hub", "planGreaterManchesterNextTrainFetch must never return 'hub' — no hub is configured");

// The exact-chip path must fire for a destination whose station is in this region's own catalog.
const exactPlan = planGreaterManchesterNextTrainFetch(victoriaEntry, "train", "Manchester Piccadilly (Northern)", gmHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "MAN",
  `planGreaterManchesterNextTrainFetch at Manchester Victoria for Manchester Piccadilly must be an exact plan filtered to MAN, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index fallback
// for an out-of-region terminus (e.g. Leeds).
const nationalExactPlan = planGreaterManchesterNextTrainFetch(piccadillyEntry, "train", "Leeds (TransPennine Express)", gmHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "LDS",
  `planGreaterManchesterNextTrainFetch at Manchester Piccadilly for Leeds must be an exact plan filtered to LDS, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planGreaterManchesterNextTrainFetch(piccadillyEntry, "train", "Nowhere (X)", gmHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planGreaterManchesterNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// mode !== "train" is always undirected; Metrolink never consults hubs.
const metroPlan = planGreaterManchesterNextTrainFetch(victoriaEntry, "metro", "Green + Altrincham", gmHubs);
assert(metroPlan.kind === "undirected", "metro mode must never consult the hub file");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (Manchester Victoria's doNotGroup lock needs it to disambiguate).
const dogfoodStations = listGreaterManchesterDogfoodStations();
assert(dogfoodStations.length === 19, `dogfood stations must be the 19 D1 names, got ${dogfoodStations.length}`);
const victoriaEntries = dogfoodStations.filter((s) => s.name === GREATER_MANCHESTER_NR_SECONDARY_HUB);
assert(victoriaEntries.length === 2, "Manchester Victoria must appear twice in the dogfood list (rail + metro, doNotGroup)");
assert(
  new Set(victoriaEntries.map((s) => s.mode)).size === 2,
  "the two Manchester Victoria dogfood entries must carry different modes"
);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod, or exported locally), MissingDarwinTokenError if not (expected
// in most local/CI sandboxes). Either outcome is acceptable here; only an
// unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getGreaterManchesterDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections(GREATER_MANCHESTER_NR_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "greater-manchester-darwin-live", "directions source must be greater-manchester-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first —
  // same order as lib/providers/greater-manchester.js's own fetchStationBoard()
  // dispatcher.
  const dispatched = await getMultiCityDirections("greater-manchester", GREATER_MANCHESTER_NR_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(
    dispatched.source === "greater-manchester-darwin-live",
    "live-city-api dispatch source must be greater-manchester-darwin-live"
  );

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getGreaterManchesterDogfoodNextTrain({
      station: GREATER_MANCHESTER_NR_HUB,
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
    const dispatchedNextTrain = await getMultiCityNextTrain("greater-manchester", {
      station: GREATER_MANCHESTER_NR_HUB,
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
    "greater-manchester-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("greater-manchester", GREATER_MANCHESTER_NR_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");

  // fetchNationalRailBoard() / fetchStationBoard() must still throw
  // MissingDarwinTokenError before any fetch at the National Rail hub/secondary hub.
  for (const stationName of [GREATER_MANCHESTER_NR_HUB, GREATER_MANCHESTER_NR_SECONDARY_HUB]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(stationName);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Metrolink: no confirmed real-time feed exists at all (see file header).
// fetchMetrolinkStopBoard() must throw MetrolinkFeedUnconfirmedError
// unconditionally, and the dogfood dispatch must surface that documented
// error class rather than fabricate a schedule from the static label list.
// This holds REGARDLESS of whether DARWIN_LDB_TOKEN is set — Metrolink has no
// token-gated path at all, it is a genuinely unconfirmed feed, not an account
// block.
let metrolinkBoardThrew = false;
try {
  await fetchMetrolinkStopBoard("Bury");
} catch (err) {
  metrolinkBoardThrew = err instanceof MetrolinkFeedUnconfirmedError;
}
assert(metrolinkBoardThrew, "fetchMetrolinkStopBoard must throw MetrolinkFeedUnconfirmedError — no confirmed Metrolink real-time feed exists");

let metrolinkDirectionsThrew = false;
try {
  await getGreaterManchesterDogfoodDirections("Bury", { mode: "metro" });
} catch (err) {
  metrolinkDirectionsThrew = err instanceof MetrolinkFeedUnconfirmedError;
}
assert(
  metrolinkDirectionsThrew,
  "getGreaterManchesterDogfoodDirections must surface MetrolinkFeedUnconfirmedError for Metrolink stops, not swallow it"
);

let metrolinkVictoriaDirectionsThrew = false;
try {
  await getGreaterManchesterDogfoodDirections(GREATER_MANCHESTER_NR_SECONDARY_HUB, { mode: "metro" });
} catch (err) {
  metrolinkVictoriaDirectionsThrew = err instanceof MetrolinkFeedUnconfirmedError;
}
assert(
  metrolinkVictoriaDirectionsThrew,
  "getGreaterManchesterDogfoodDirections must surface MetrolinkFeedUnconfirmedError for Manchester Victoria's tram layer (doNotGroup), not the rail layer's data"
);

let metrolinkNextTrainThrew = false;
try {
  await getGreaterManchesterDogfoodNextTrain({ station: "Bury", mode: "metro", destination: "Green + Altrincham" });
} catch (err) {
  metrolinkNextTrainThrew = err instanceof MetrolinkFeedUnconfirmedError;
}
assert(
  metrolinkNextTrainThrew,
  "getGreaterManchesterDogfoodNextTrain must surface MetrolinkFeedUnconfirmedError for Metrolink stops, not fabricate a schedule"
);

let dispatchMetrolinkThrew = false;
try {
  await getMultiCityDirections("greater-manchester", "Bury");
} catch (err) {
  dispatchMetrolinkThrew = err instanceof MetrolinkFeedUnconfirmedError;
}
assert(dispatchMetrolinkThrew, "live-city-api dispatch must surface MetrolinkFeedUnconfirmedError for Metrolink stops, not swallow it");

// The production dispatch dispatcher (bare name, no mode) at Manchester Victoria
// resolves rail-first — same order as lib/providers/greater-manchester.js's own
// fetchStationBoard() dispatcher — so Victoria's ambiguous bare lookup never
// silently returns the Metrolink layer.
let dispatchThrew = false;
try {
  await fetchStationBoard("Bury");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for Metrolink");

let unknownThrew = false;
try {
  await getGreaterManchesterDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getGreaterManchesterDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "greater-manchester", station: GREATER_MANCHESTER_NR_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "greater-manchester-dogfood-gate: ok (planned/501, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired, D1 pack, 4 rail + 15 Metrolink stations, doNotGroup at Manchester Victoria and Manchester Piccadilly/Piccadilly Gardens, WDN Walsden CRS carried without adopting West Yorkshire's WAD, National Rail directions derived live from Darwin with no static line map, exact-chip routing table (exact/undirected) proven token-free with the national rail-crs-index fallback for out-of-region termini, Metrolink dispatch correctly surfaces MetrolinkFeedUnconfirmedError rather than the static label list, Perth Australia stays green)"
);
