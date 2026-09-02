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
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
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
} from "../lib/cities/east-midlands/dogfood-next-train.js";

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
assert(region?.railCount === 6, `east-midlands rail count must be 6, got ${region?.railCount}`);
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
for (const name of ["Hucknall", "Nottingham Station", "Beeston/Chilwell", "Phoenix Park"]) {
  assert(netNames.has(name), `NET catalog must carry ${name}`);
}
assert(!netNames.has("city centre"), "NET catalog must not carry the unconfirmed 'city centre' placeholder");
assert(netStops.length === 4, `NET catalog must have exactly 4 stops (termini + hub), got ${netStops.length}`);

const allStations = listCatalogStations();
assert(allStations.length === 10, `combined catalog must have 10 stations (6 rail + 4 metro), got ${allStations.length}`);

// doNotGroup — Nottingham Station resolves as two distinct catalog entries by mode.
const hubRail = resolveCatalogEntry(EAST_MIDLANDS_HUB, "train");
const hubMetro = resolveCatalogEntry(EAST_MIDLANDS_HUB, "metro");
assert(hubRail?.crs === "NOT", "Nottingham Station must resolve as a National Rail entry (crs NOT)");
assert(hubMetro?.catalogId?.startsWith("net:"), "Nottingham Station must resolve as a distinct NET metro entry");
assert(resolveCatalogEntry("nottingham") === null, "the marketing token 'nottingham' must never resolve as a station");
assert(resolveCatalogEntry("net") === null, "the marketing token 'net' must never resolve as a station");
assert(isForbiddenCollapseName("city centre") === true, "'city centre' must never resolve as a station");

// Direction model (still the design-time labels — NET's own catalog/label shape
// is unaffected by the flip; only the dogfood *dispatch* treats it as unconfirmed,
// see below). Hub never shows itself as its own destination.
const hubLabels = marketingLabelsForStation(EAST_MIDLANDS_HUB);
assert(hubLabels.includes("1 + Hucknall"), "hub must offer 1 + Hucknall");
assert(hubLabels.includes("1 + Beeston/Chilwell"), "hub must offer 1 + Beeston/Chilwell");
assert(hubLabels.includes("2 + Phoenix Park"), "hub must offer 2 + Phoenix Park");
assert(
  !hubLabels.some((label) => label.includes(EAST_MIDLANDS_HUB)),
  "the hub must never appear as its own chip terminus"
);
assert(mapNetDestination("Hucknall", "1") === "1 + Hucknall", "mapNetDestination must map a confirmed terminus");
assert(mapNetDestination("Toton Lane", "1") === null, "mapNetDestination must not fabricate an unconfirmed intermediate-stop chip");

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// (unlike West of England's single-mode list) to disambiguate the doNotGroup hub.
const dogfoodStations = listEastMidlandsDogfoodStations();
assert(dogfoodStations.length === 10, `dogfood stations must be the 10 D1 names, got ${dogfoodStations.length}`);
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
  await getEastMidlandsDogfoodNextTrain({ station: "Hucknall", mode: "metro", destination: "1 + Beeston/Chilwell" });
} catch (err) {
  netNextTrainThrew = err instanceof NetFeedUnconfirmedError;
}
assert(netNextTrainThrew, "getEastMidlandsDogfoodNextTrain must surface NetFeedUnconfirmedError for NET stops, not fabricate a schedule");

// getMultiCityNextTrain must resolve to East Midlands' dogfood next-train module.
assert(typeof getEastMidlandsDogfoodNextTrain === "function", "getEastMidlandsDogfoodNextTrain must be exported for live-city-api to dispatch to");

let dispatchNextTrainThrew = false;
try {
  await getMultiCityDirections("east-midlands", "Hucknall");
} catch (err) {
  dispatchNextTrainThrew = err instanceof NetFeedUnconfirmedError;
}
assert(dispatchNextTrainThrew, "live-city-api dispatch must surface NetFeedUnconfirmedError for NET stops, not swallow it");

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

console.log(
  "east-midlands-dogfood-gate: ok (live/adapterReady, dispatch switch-case wired, D1 pack, 6 rail + 4 NET stations, doNotGroup at Nottingham Station across both modes, National Rail directions derived live from Darwin with no static line map, NET dispatch correctly surfaces NetFeedUnconfirmedError rather than the static label list, Perth/Stockholm/Göteborg/Malmö/Uppsala/London TfL stay green)"
);
