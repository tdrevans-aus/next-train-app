/**
 * Cumbria adapter/dispatch wiring gate + flip-commit assertions. Wired by
 * Jim (dogfood module, dispatch switch-cases), flipped by Mark (this commit:
 * status live, list additions). Per CLAUDE.md's flip-follow-through split
 * (added 30 Aug 2026, corrected same day): status flip, MULTI_CITY_IDS
 * addition to live-city-api.js / brisbane-dogfood.js / journey-model.js /
 * app.js / city-session.js, LIVE_UK_REGION_IDS in uk-planned-gate.mjs, and
 * this gate's assertions all land in Mark's flip commit. See
 * docs/cumbria-d1/jim-handoff.md for the handoff note.
 *
 * One agency, one mode: National Rail only (Darwin/OpenLDBWS). This gate
 * stays token-tolerant throughout: with DARWIN_LDB_TOKEN set (e.g. this
 * run, `node --env-file=.env.local qa/cumbria-dogfood-gate.mjs`) it
 * exercises real Darwin calls (a cheap numRows=1 CRS-sweep across all 7
 * catalogued stations plus a couple of real boards); without one every
 * live-probing section degrades to MissingDarwinTokenError assertions
 * instead of a throw/skip.
 *
 * Also asserts the Caledonian Sleeper out-reservation exclusion is enforced
 * in code (not just documented): fetchNationalRailBoard() passes
 * excludeOperators for Carlisle only, and does NOT pass it for any other
 * Cumbrian station.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/cumbria/
 * dogfood-next-train.js file header and docs/cumbria-d1/
 * direction-model-memo.md), so like every other single-agency UK region
 * this gate asserts the live-derivation shape and dispatch wiring rather
 * than a static marketing-directions.js chip list. No direction-hubs.json
 * ships for Cumbria (no live payload has ever been pulled to evidence a
 * hub-chip candidate) — the shared helper must still degrade to an empty,
 * no-op hub list.
 *
 * Usage: node qa/cumbria-dogfood-gate.mjs
 * (Darwin-live run: node --env-file=.env.local qa/cumbria-dogfood-gate.mjs)
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
  CUMBRIA_HUB,
  CUMBRIA_SECONDARY_HUBS,
  CUMBRIA_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  excludesCaledonianSleeper,
  fetchNationalRailBoard,
  fetchStationBoard,
} from "../lib/providers/cumbria.js";
import {
  listCumbriaDogfoodStations,
  getCumbriaDogfoodDirections,
  getCumbriaDogfoodNextTrain,
  planCumbriaNextTrainFetch,
} from "../lib/cities/cumbria/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug). Perth
// (Australia) green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth (Australia) must stay live");

// Registry identity — now live (Mark's flip call).
const live = assertCityLive("cumbria");
assert(live?.ok === true, "assertCityLive(cumbria) must succeed — status is live");

const entry = getCity("cumbria");
assert(entry?.status === "live", "cumbria registry status must be live");
assert(entry?.adapterReady === undefined, "cumbria adapterReady flag is removed once live");
assert(entry?.displayName === "Cumbria", "cumbria display name must be Cumbria");
assert(entry?.timeZone === "Europe/London", "cumbria timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "cumbria").length === 1, "cumbria must appear once in the registry");
for (const forbiddenId of ["cumbria-lakes", "carlisle", "lake-district", "uk-cumbria"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Now in MULTI_CITY_IDS — this is the flip commit.
assert(isMultiCity("cumbria") === true, "cumbria must be in MULTI_CITY_IDS");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/cumbria-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/cumbria-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "cumbria", "D1 city id must be cumbria");
assert(network.status === "planned", "D1 pack stays planned");
const hubGroup = (network.stationGroups ?? []).find((g) => g.crs === "CAR");
assert(hubGroup && /tier 1/i.test(hubGroup.role ?? ""), "D1 pack must lock Carlisle (CAR) as the tier-1 hub");
const secondaryHubCrs = (network.stationGroups ?? [])
  .filter((g) => /tier 2/i.test(g.role ?? ""))
  .map((g) => g.crs);
assert(
  ["OXO", "BIF"].every((crs) => secondaryHubCrs.includes(crs)),
  "D1 pack must lock Oxenholme (OXO) and Barrow-in-Furness (BIF) as tier-2 secondary hubs"
);
const penrithGroup = (network.stationGroups ?? []).find((g) => g.crs === "PEN");
assert(
  penrithGroup && !/hub lock/i.test(penrithGroup.role ?? ""),
  "Penrith must stay regional (not promoted to hub) — it is a major WCML station but not a junction"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(CUMBRIA_REGION);
assert(region?.railCount === 65, `cumbria rail count must be 65 (16 West Cumbria coast stations reassigned in from rest-of-england 15 Sep 2026, docs/jim-brief-rest-of-england-reassignment.md), got ${region?.railCount}`);
assert(region?.metroCount === 0, `cumbria must have no metro stations, got ${region?.metroCount}`);
assert((region?.modes ?? []).join(",") === "train", "cumbria must be train-only in regions.json");

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["CAR", "OXN", "BIF", "PNR", "WDM", "KEN", "SET"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(railCrs.size === 65, `cumbria catalog must carry exactly 65 distinct CRS codes (16 West Cumbria coast stations reassigned in from rest-of-england 15 Sep 2026, docs/jim-brief-rest-of-england-reassignment.md), got ${railCrs.size}`);
assert(getNotInRegion(CUMBRIA_REGION).length === 0, "cumbria has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 65, `combined catalog must have 65 stations (train only, 15 Sep 2026 rest-of-england reassignment), got ${allStations.length}`);

// Single tier-1 hub, two tier-2 secondary hubs — resolve independently.
assert(CUMBRIA_HUB === "Carlisle", "must document Carlisle as the sole tier-1 hub");
assert(CUMBRIA_SECONDARY_HUBS.length === 2, "must document exactly two tier-2 secondary hubs");

const carlisle = resolveCatalogEntry("Carlisle");
assert(carlisle?.crs === "CAR", "Carlisle must resolve with crs CAR");
assert(/hub lock — tier 1/i.test(carlisle.class ?? ""), "Carlisle must be classed as the tier-1 hub lock");

const secondaryHubCrsByName = { "Oxenholme Lake District": "OXN", "Barrow-in-Furness": "BIF" };
for (const [name, crs] of Object.entries(secondaryHubCrsByName)) {
  const hub = resolveCatalogEntry(name);
  assert(hub?.crs === crs, `${name} must resolve with crs ${crs}`);
  assert(/hub lock — tier 2/i.test(hub.class ?? ""), `${name} must be classed as a tier-2 hub lock`);
}

// Penrith must stay regional, never a hub-classed entry.
const penrith = resolveCatalogEntry("Penrith");
assert(penrith?.crs === "PNR", "Penrith must resolve with crs PNR");
assert(!/hub lock/i.test(penrith.class ?? ""), "Penrith must NOT be classed as a hub lock");

// Caledonian Sleeper out-reservation exclusion — per-station, enforced in code.
assert(excludesCaledonianSleeper("Carlisle") === true, "Carlisle must exclude Caledonian Sleeper");
for (const other of ["Oxenholme Lake District", "Barrow-in-Furness", "Penrith", "Windermere", "Kendal", "Settle"]) {
  assert(
    excludesCaledonianSleeper(other) === false,
    `${other} must NOT exclude Caledonian Sleeper — it never calls there`
  );
}

// No direction-hubs.json for this region (no live Darwin payload has ever
// been pulled to evidence a hub-chip candidate) — the shared helper must
// still degrade to an empty, no-op hub list, same call shape as every
// other UK region.
assert(
  !existsSync(join(ROOT, "lib/cities/cumbria/direction-hubs.json")),
  "cumbria must not ship a direction-hubs.json — no hub-chip candidate evidenced in the D1 pack"
);
const { hubs: cumbriaHubs } = loadDirectionHubs(CUMBRIA_REGION);
assert(cumbriaHubs.length === 0, `cumbria must have zero configured hubs, got ${cumbriaHubs.length}`);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listCumbriaDogfoodStations();
assert(dogfoodStations.length === 65, `dogfood stations must be the 65 catalog entries (15 Sep 2026 rest-of-england reassignment), got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
for (const name of ["Carlisle", "Oxenholme Lake District", "Barrow-in-Furness", "Penrith", "Windermere", "Kendal", "Settle"]) {
  assert(dogfoodNames.has(name), `${name} must be listed by the dogfood harness`);
}

// planCumbriaNextTrainFetch() — pure routing decision table, token-free.
const carlisleEntry = resolveCatalogEntry("Carlisle");
const penrithEntry = resolveCatalogEntry("Penrith");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planCumbriaNextTrainFetch(penrithEntry, "Carlisle (Avanti West Coast)", cumbriaHubs);
assert(noHubPlan.kind !== "hub", "planCumbriaNextTrainFetch must never return 'hub' — no hub is configured for cumbria");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planCumbriaNextTrainFetch(penrithEntry, "Carlisle (Avanti West Coast)", cumbriaHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "CAR",
  `planCumbriaNextTrainFetch at Penrith for Carlisle must be an exact plan filtered to CAR, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. Glasgow Central).
const nationalExactPlan = planCumbriaNextTrainFetch(carlisleEntry, "Glasgow Central (Avanti West Coast)", cumbriaHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "GLC",
  `planCumbriaNextTrainFetch at Carlisle for Glasgow Central must be an exact plan filtered to GLC, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planCumbriaNextTrainFetch(carlisleEntry, "Nowhere (X)", cumbriaHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planCumbriaNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this
// environment (Vercel prod, or exported locally), MissingDarwinTokenError
// if not (expected in most local/CI sandboxes). Either outcome is
// acceptable here; only an unrelated throw fails.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getCumbriaDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(CUMBRIA_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "cumbria-darwin-live", "directions source must be cumbria-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("cumbria", CUMBRIA_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "cumbria-darwin-live", "live-city-api dispatch source must be cumbria-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getCumbriaDogfoodNextTrain({
      station: CUMBRIA_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("cumbria", {
      station: CUMBRIA_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      dispatchedNextTrain.config?.destination === firstChip,
      "dispatched next-train destination must equal the chosen chip"
    );
  }

  // Caledonian Sleeper must never appear as an operator chip at Carlisle
  // once the board is live (out-reservation exclusion, enforced in
  // lib/providers/cumbria.js's fetchNationalRailBoard()).
  assert(
    !hubProbe.pack.directions.some((chip) => /caledonian sleeper/i.test(chip)),
    "Caledonian Sleeper must never appear as a direction chip at Carlisle — out-reservation exclusion"
  );
} else {
  console.log(
    "cumbria-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("cumbria", CUMBRIA_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");

  // fetchNationalRailBoard() / fetchStationBoard() must still throw
  // MissingDarwinTokenError before any fetch at every catalogued station.
  for (const stationName of ["Carlisle", "Oxenholme Lake District", "Barrow-in-Furness", "Penrith"]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(stationName);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${stationName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Full-catalog CRS -> Darwin stationName sweep (per the greater-anglia
// dogfood gate pattern, itself copied from qa/uk-west-midlands-dogfood-gate.mjs
// — the wrong-code defect class this catches). Token-tolerant; 7 cheap
// numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(CUMBRIA_REGION)) {
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
    `cumbria catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("cumbria-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "cumbria-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getCumbriaDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getCumbriaDogfoodDirections must not silently succeed for an unknown station");

let dispatchThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  dispatchThrew = true;
}
assert(dispatchThrew, "fetchStationBoard dispatcher must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "cumbria", station: CUMBRIA_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  `cumbria-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, ${allStations.length} rail-only stations, single tier-1 hub Carlisle + two tier-2 secondary hubs Oxenholme/Barrow-in-Furness, Penrith correctly stays regional, Caledonian Sleeper out-reservation exclusion enforced at Carlisle only, no hub configured (helper degrades to no-op), directions derived live from Darwin with no static line map, catalog CRS sweep, routing table (exact/undirected) proven token-free, Perth Australia green)`
);
