/**
 * Southwest adapter/dispatch wiring gate. Replaces southwest-planned-gate.mjs
 * (retired). Southwest is now `status: "live"` (this is the post-flip gate,
 * docs/jim-brief-southwest-flip.md). The dogfood module, live-city-api.js
 * dispatch switch-cases, list memberships (MULTI_CITY_IDS, brisbane-dogfood.js
 * mount/available, journey-model.js persisted-city/country), and QA gate
 * assertions are now all wired for live operation. Production routes gate on
 * assertCityLive() first; once live, both dispatch paths and list membership
 * are enforced together.
 *
 * DARWIN_LDB_TOKEN is BLOCKED at the account level (AU-registered RDM
 * account; Tim re-registering with UK address) — same blocker as most other
 * UK regions in this wave. This gate stays token-tolerant throughout: with a
 * token it exercises real Darwin calls (a cheap numRows=1 CRS-sweep plus a
 * couple of real boards); without one every live-probing section degrades
 * to MissingDarwinTokenError assertions instead of a throw/skip.
 *
 * Also asserts the Night Riviera Sleeper out-reservation exclusion is
 * enforced in code (not just documented): fetchNationalRailBoard() passes
 * excludeOperators for the six stations it calls at (Exeter St Davids,
 * Plymouth, Truro, St Austell, St Erth, Penzance) and does NOT pass it for
 * the through-running-only stations it never calls at (Taunton, Newton
 * Abbot, Totnes) — same mechanism as Rest of Scotland's Caledonian Sleeper
 * exclusion.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/southwest/
 * dogfood-next-train.js file header and docs/southwest-d1/
 * direction-model-memo.md), so like every other National Rail-only region
 * this gate asserts the live-derivation shape and the dispatch wiring
 * rather than a static marketing-directions.js chip list.
 *
 * Usage: node qa/southwest-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { MissingDarwinTokenError, fetchDepartureBoard, listRailStations } from "../lib/providers/uk-darwin.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  SOUTHWEST_HUB,
  SOUTHWEST_SECONDARY_HUB,
  SOUTHWEST_TERMINUS,
  SOUTHWEST_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  excludesNightRivieraSleeper,
  fetchNationalRailBoard,
  fetchStationBoard,
  MissingDarwinTokenError as SouthwestMissingDarwinTokenError,
} from "../lib/providers/southwest.js";
import {
  listSouthwestDogfoodStations,
  getSouthwestDogfoodDirections,
  getSouthwestDogfoodNextTrain,
  planSouthwestNextTrainFetch,
} from "../lib/cities/southwest/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired southwest-planned-gate.mjs). Perth (Australia) green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth (Australia) must stay live");

// Registry identity — NOW live, adapterReady removed, IS in MULTI_CITY_IDS.
const live = assertCityLive("southwest");
assert(live?.ok === true, "assertCityLive(southwest) must pass — status is now live");

const entry = getCity("southwest");
assert(entry?.status === "live", "southwest registry status must be live");
assert(entry?.adapterReady === undefined, "southwest adapterReady flag is removed once live");
assert(entry?.displayName === "South West (Devon / Cornwall)", "southwest display name must be South West (Devon / Cornwall)");
assert(entry?.timeZone === "Europe/London", "southwest timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "southwest").length === 1,
  "southwest must appear once in the registry"
);
for (const forbiddenId of ["uk-southwest", "devon-cornwall", "south-west-england"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases and MULTI_CITY_IDS membership are now wired (Mark's flip commit).
assert(isMultiCity("southwest") === true, "southwest must be in MULTI_CITY_IDS");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/southwest-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/southwest-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "southwest", "D1 city id must be southwest");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === SOUTHWEST_HUB,
  `D1 lock must be ${SOUTHWEST_HUB}`
);
assert(
  network.printedInnerCityNames?.secondary === SOUTHWEST_SECONDARY_HUB,
  `D1 secondary must be ${SOUTHWEST_SECONDARY_HUB}`
);
assert(
  network.printedInnerCityNames?.terminus === SOUTHWEST_TERMINUS,
  `D1 terminus must be ${SOUTHWEST_TERMINUS}`
);

// Excluded services (Night Riviera Sleeper) recorded in the D1 pack.
const excludedNames = (network.excludedServices ?? []).map((s) => s.operator);
assert(
  excludedNames.includes("Night Riviera Sleeper"),
  "D1 pack must record Night Riviera Sleeper as an excluded service"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOUTHWEST_REGION);
assert(region?.railCount === 89, `southwest rail count must be 89 (UK station fill phase 2a, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 0, `southwest must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "southwest must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["EXD", "PLY", "PNZ", "TAU", "NTA", "TOT", "TRU", "SAU", "SER"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(railCrs.size === 89, `southwest catalog must carry exactly 89 distinct CRS codes (UK station fill phase 2a, 14 Sep 2026), got ${railCrs.size}`);
assert(getNotInRegion(SOUTHWEST_REGION).length === 0, "southwest has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 89, `combined catalog must have 89 stations (train only, UK station fill phase 2a), got ${allStations.length}`);

// No doNotGroup — hub, secondary hub, and terminus each resolve to a single catalog entry.
const hub = resolveCatalogEntry(SOUTHWEST_HUB);
assert(hub?.crs === "EXD", "Exeter St Davids must resolve with crs EXD");
const secondary = resolveCatalogEntry(SOUTHWEST_SECONDARY_HUB);
assert(secondary?.crs === "PLY", "Plymouth must resolve with crs PLY");
const terminus = resolveCatalogEntry(SOUTHWEST_TERMINUS);
assert(terminus?.crs === "PNZ", "Penzance must resolve with crs PNZ");

// No direction-hubs.json for this region (no hub candidate identified) — the
// shared helper must still degrade to an empty, no-op hub list.
assert(
  !existsSync(join(ROOT, "lib/cities/southwest/direction-hubs.json")),
  "southwest must not ship a direction-hubs.json — no hub candidate identified in the D1 pack"
);
const { hubs: swHubs } = loadDirectionHubs(SOUTHWEST_REGION);
assert(swHubs.length === 0, `southwest must have zero configured hubs, got ${swHubs.length}`);

// Night Riviera Sleeper out-reservation exclusion — per-station, enforced in code.
for (const name of ["Exeter St Davids", "Plymouth", "Truro", "St Austell", "St Erth", "Penzance"]) {
  assert(
    excludesNightRivieraSleeper(name) === true,
    `${name} must exclude Night Riviera Sleeper`
  );
}
for (const name of ["Taunton", "Newton Abbot", "Totnes"]) {
  assert(
    excludesNightRivieraSleeper(name) === false,
    `${name} must NOT exclude Night Riviera Sleeper — it never calls there`
  );
}

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listSouthwestDogfoodStations();
assert(dogfoodStations.length === 89, `dogfood stations must be the 89 catalog entries (UK station fill phase 2a), got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
for (const name of [SOUTHWEST_HUB, SOUTHWEST_SECONDARY_HUB, SOUTHWEST_TERMINUS, "Taunton"]) {
  assert(dogfoodNames.has(name), `${name} must be listed by the dogfood harness`);
}

// planSouthwestNextTrainFetch() — pure routing decision table, token-free.
const exdEntry = resolveCatalogEntry(SOUTHWEST_HUB);
const plyEntry = resolveCatalogEntry(SOUTHWEST_SECONDARY_HUB);

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planSouthwestNextTrainFetch(plyEntry, "Penzance (GWR)", swHubs);
assert(noHubPlan.kind !== "hub", "planSouthwestNextTrainFetch must never return 'hub' — no hub is configured for southwest");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planSouthwestNextTrainFetch(plyEntry, "Penzance (GWR)", swHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "PNZ",
  `planSouthwestNextTrainFetch at Plymouth for Penzance must be an exact plan filtered to PNZ, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. London Paddington).
const nationalExactPlan = planSouthwestNextTrainFetch(exdEntry, "London Paddington (GWR)", swHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "PAD",
  `planSouthwestNextTrainFetch at Exeter St Davids for London Paddington must be an exact plan filtered to PAD, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planSouthwestNextTrainFetch(exdEntry, "Nowhere (X)", swHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planSouthwestNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// The board path is structurally wired but blocked — no network call needed since
// MissingDarwinTokenError throws before any fetch (see lib/providers/uk-darwin.js getDarwinToken()),
// UNLESS DARWIN_LDB_TOKEN happens to be set in this environment.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getSouthwestDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError || err instanceof SouthwestMissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(SOUTHWEST_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "southwest-darwin-live", "directions source must be southwest-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
    assert(!chip.includes("Night Riviera Sleeper"), "Night Riviera Sleeper must never appear as a direction chip");
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("southwest", SOUTHWEST_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "southwest-darwin-live", "live-city-api dispatch source must be southwest-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getSouthwestDogfoodNextTrain({
      station: SOUTHWEST_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("southwest", {
      station: SOUTHWEST_HUB,
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
    "southwest-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("southwest", SOUTHWEST_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError || err instanceof SouthwestMissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");

  // fetchNationalRailBoard() / fetchStationBoard() must still throw
  // MissingDarwinTokenError before any fetch at the hub/secondary/terminus.
  for (const stationName of [SOUTHWEST_HUB, SOUTHWEST_SECONDARY_HUB, SOUTHWEST_TERMINUS]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(stationName);
    } catch (err) {
      darwinBlocked = err instanceof SouthwestMissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }

  let dispatcherBlocked = false;
  try {
    await fetchStationBoard(SOUTHWEST_HUB);
  } catch (err) {
    dispatcherBlocked = err instanceof SouthwestMissingDarwinTokenError;
  }
  assert(dispatcherBlocked, "fetchStationBoard dispatcher must not silently succeed — must surface MissingDarwinTokenError");
}

let unknownThrew = false;
try {
  await getSouthwestDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getSouthwestDogfoodDirections must not silently succeed for an unknown station");

let unknownDispatcherThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownDispatcherThrew = true;
}
assert(unknownDispatcherThrew, "fetchStationBoard must throw for an unknown station");

// Full-catalog CRS -> Darwin stationName sweep (per the greater-anglia
// dogfood gate pattern, itself copied from qa/uk-west-midlands-dogfood-gate.mjs
// — the wrong-code defect class this catches). Token-tolerant; cheap
// numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(SOUTHWEST_REGION)) {
    let board;
    try {
      board = await fetchDepartureBoard({ crs: stationEntry.crs, numRows: 1 });
    } catch (err) {
      if (err instanceof MissingDarwinTokenError) {
        return { ok: false, blocked: true };
      }
      problems.push(`${stationEntry.crs} "${stationEntry.name}" -> Darwin error: ${err.message}`);
      continue;
    }
    const want = normaliseStationName(stationEntry.name);
    const got = normaliseStationName(board.stationName);
    if (!(want === got || got.includes(want) || want.includes(got))) {
      problems.push(`${stationEntry.crs} "${stationEntry.name}" -> Darwin "${board.stationName}"`);
    }
  }
  return { ok: true, problems };
}
const catalogSweep = await sweepCatalogCrsNames();
if (catalogSweep.ok) {
  assert(
    catalogSweep.problems.length === 0,
    `southwest catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("southwest-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "southwest-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

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
await vercelBoard({ method: "GET", query: { city: "southwest", station: SOUTHWEST_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "southwest-dogfood-gate: ok (live, isMultiCity true, dispatch switch-cases wired, D1 pack, 9 rail-only stations, no doNotGroup at EXD/PLY/PNZ, no hub configured (helper degrades to no-op), Night Riviera Sleeper out-reservation exclusion enforced per-station, directions derived live from Darwin with no static line map, routing table (exact/undirected) proven token-free, Perth Australia stays green)"
);
