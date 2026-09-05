/**
 * Rest of Scotland adapter/dispatch wiring gate. Replaces
 * rest-of-scotland-planned-gate.mjs (retired) — Rest of Scotland STAYS
 * `status: "planned"` here (this is the pre-flip dogfood wiring pass,
 * docs/jim-brief-rest-of-scotland-flip.md). Per CLAUDE.md's flip-follow-through
 * split (added 30 Aug 2026, corrected same day): the dogfood module, the
 * live-city-api.js dispatch switch-cases, and this gate are safe to land
 * ahead of the flip because production routes gate on assertCityLive()
 * first, not on MULTI_CITY_IDS membership. Rest of Scotland is deliberately
 * NOT added to MULTI_CITY_IDS, brisbane-dogfood.js's mount/available map, or
 * journey-model.js's persisted-city/country lists yet — those three
 * list-membership edits are Mark's flip commit, not this one
 * (qa/live-city-lists-sync.mjs enforces that they equal the registry's
 * live set). See docs/rest-of-scotland-d1/jim-handoff.md for the exact note
 * left for Mark.
 *
 * STRUCTURAL DEPARTURE FROM EVERY PRIOR UK REGION: FOUR CO-EQUAL TIER-1 HUB
 * LOCKS (Perth PTH, Inverness INV, Aberdeen ABD, Dundee DEE), not one
 * primary hub. This gate asserts all four resolve as independent hub-class
 * catalog entries and that "Perth" here resolves within rest-of-scotland
 * only — never conflated with the live city id `perth` (Perth, Australia).
 *
 * Also asserts the Caledonian Sleeper out-reservation exclusion
 * (docs/board-eligibility-rule.md) is enforced in code, not just
 * documented: excludesCaledonianSleeper()/fetchStationBoard() must exclude
 * it at Aberdeen, Inverness, Fort William, Mallaig, and must NOT exclude it
 * at Perth or Dundee (it never calls there).
 *
 * DARWIN_LDB_TOKEN registration state for this region: the registry.js
 * integration note (copied boilerplate from other UK regions) says the
 * account-level token was set 2 Sep 2026; the provider file header, written
 * from the D1 pack, still describes an account-level block — not
 * reconciled here, out of scope for this pass. This gate stays
 * token-tolerant throughout, same as every other UK region's dogfood gate:
 * with a token it exercises real Darwin calls (9 cheap numRows=1 CRS-sweep
 * calls plus a couple of real boards); without one every live-probing
 * section degrades to MissingDarwinTokenError assertions instead of a
 * throw/skip.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/rest-of-scotland/
 * dogfood-next-train.js file header and docs/rest-of-scotland-d1/
 * direction-model-memo.md), so like every other National Rail-only region
 * this gate asserts the live-derivation shape and the dispatch wiring
 * rather than a static marketing-directions.js chip list.
 *
 * Usage: node qa/rest-of-scotland-dogfood-gate.mjs
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
  REST_OF_SCOTLAND_HUBS,
  REST_OF_SCOTLAND_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  excludesCaledonianSleeper,
  fetchNationalRailBoard,
} from "../lib/providers/rest-of-scotland.js";
import {
  listRestOfScotlandDogfoodStations,
  getRestOfScotlandDogfoodDirections,
  getRestOfScotlandDogfoodNextTrain,
  planRestOfScotlandNextTrainFetch,
} from "../lib/cities/rest-of-scotland/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired rest-of-scotland-planned-gate.mjs). Perth (Australia) green is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Registry identity — STAYS planned, adapterReady, NOT in MULTI_CITY_IDS.
const live = assertCityLive("rest-of-scotland");
assert(live?.ok === false, "assertCityLive(rest-of-scotland) must fail — status stays planned");
assert(live?.status === 501, "rest-of-scotland must be 501 planned");

const entry = getCity("rest-of-scotland");
assert(entry?.status === "planned", "rest-of-scotland registry status must stay planned");
assert(entry?.adapterReady === true, "rest-of-scotland adapterReady must be true");
assert(entry?.displayName === "Rest of Scotland", "rest-of-scotland display name must be Rest of Scotland");
assert(entry?.timeZone === "Europe/London", "rest-of-scotland timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "rest-of-scotland").length === 1,
  "rest-of-scotland must appear once in the registry"
);
for (const forbiddenId of ["scotland", "highlands", "perth-scotland", "uk-scotland"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases are wired ahead of the flip; MULTI_CITY_IDS membership
// is deliberately NOT (that's Mark's flip commit).
assert(isMultiCity("rest-of-scotland") === false, "rest-of-scotland must NOT be in MULTI_CITY_IDS yet — that is Mark's flip commit");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/rest-of-scotland-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/rest-of-scotland-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "rest-of-scotland", "D1 city id must be rest-of-scotland");
assert(network.status === "planned", "D1 pack stays planned");
const hubLocks = (network.nationalRailStations?.hubs ?? []).map((h) => h.crs);
assert(
  ["PTH", "INV", "ABD", "DDE"].every((crs) => hubLocks.includes(crs)),
  "D1 pack must lock all four hub CRS codes PTH/INV/ABD/DDE"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["ScotRail", "CrossCountry", "LNER", "Caledonian Sleeper"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(REST_OF_SCOTLAND_REGION);
assert(region?.railCount === 9, `rest-of-scotland rail count must be 9, got ${region?.railCount}`);
assert(region?.metroCount === 0, `rest-of-scotland must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "rest-of-scotland must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["PTH", "INV", "ABD", "DEE", "KYL", "THS", "WCK", "MLG", "FTW"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(railCrs.size === 9, `rest-of-scotland catalog must carry exactly 9 distinct CRS codes, got ${railCrs.size}`);
assert(getNotInRegion(REST_OF_SCOTLAND_REGION).length === 0, "rest-of-scotland has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 9, `combined catalog must have 9 stations (train only), got ${allStations.length}`);

// Four co-equal hub locks resolve independently — no single-hub assumption anywhere.
assert(REST_OF_SCOTLAND_HUBS.length === 4, "must document exactly four co-equal hub locks");
const hubCrsByName = { Perth: "PTH", Inverness: "INV", Aberdeen: "ABD", Dundee: "DEE" };
for (const [name, crs] of Object.entries(hubCrsByName)) {
  const hub = resolveCatalogEntry(name);
  assert(hub?.crs === crs, `${name} must resolve with crs ${crs}`);
  assert(/hub lock/i.test(hub.class ?? ""), `${name} must be classed as a hub lock`);
}

// Perth, Scotland (this region) is never conflated with the live city id `perth`
// (Perth, Australia) — different registry entries, different provider modules.
const perthScotland = resolveCatalogEntry("Perth");
assert(perthScotland?.regionId === "rest-of-scotland", "Perth (Scotland) must resolve within rest-of-scotland only");
assert(getCity("perth")?.displayName !== "Rest of Scotland", "city id perth must remain Perth, Australia's own registry entry");

// Caledonian Sleeper out-reservation exclusion — per-station, enforced in code.
assert(excludesCaledonianSleeper("Aberdeen") === true, "Aberdeen must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Inverness") === true, "Inverness must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Fort William") === true, "Fort William must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Mallaig") === true, "Mallaig must exclude Caledonian Sleeper");
assert(excludesCaledonianSleeper("Perth") === false, "Perth must NOT exclude Caledonian Sleeper — it never calls there");
assert(excludesCaledonianSleeper("Dundee") === false, "Dundee must NOT exclude Caledonian Sleeper — it never calls there");

// No direction-hubs.json for this region — each of the four hub locks IS the
// anchor a rider selects (no intermediate through-station candidate, unlike
// Greater Anglia's Thetford/Ely -> Norwich) — the shared helper must still
// degrade to an empty, no-op hub list.
assert(
  !existsSync(join(ROOT, "lib/cities/rest-of-scotland/direction-hubs.json")),
  "rest-of-scotland must not ship a direction-hubs.json — the four hub locks are themselves the anchors, no intermediate candidate identified in the D1 pack"
);
const { hubs: rosHubs } = loadDirectionHubs(REST_OF_SCOTLAND_REGION);
assert(rosHubs.length === 0, `rest-of-scotland must have zero configured hubs, got ${rosHubs.length}`);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listRestOfScotlandDogfoodStations();
assert(dogfoodStations.length === 9, `dogfood stations must be the 9 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
for (const hubName of ["Perth", "Inverness", "Aberdeen", "Dundee"]) {
  assert(dogfoodNames.has(hubName), `hub ${hubName} must be listed by the dogfood harness`);
}

// planRestOfScotlandNextTrainFetch() — pure routing decision table, token-free.
const invEntry = resolveCatalogEntry("Inverness");
const pthEntry = resolveCatalogEntry("Perth");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planRestOfScotlandNextTrainFetch(invEntry, "Perth (ScotRail)", rosHubs);
assert(noHubPlan.kind !== "hub", "planRestOfScotlandNextTrainFetch must never return 'hub' — no hub is configured for rest-of-scotland");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planRestOfScotlandNextTrainFetch(invEntry, "Perth (ScotRail)", rosHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "PTH",
  `planRestOfScotlandNextTrainFetch at Inverness for Perth must be an exact plan filtered to PTH, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. London King's Cross).
const nationalExactPlan = planRestOfScotlandNextTrainFetch(pthEntry, "London King's Cross (LNER)", rosHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "KGX",
  `planRestOfScotlandNextTrainFetch at Perth for London King's Cross must be an exact plan filtered to KGX, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planRestOfScotlandNextTrainFetch(pthEntry, "Nowhere (X)", rosHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planRestOfScotlandNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate. Exercised at all four hubs.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getRestOfScotlandDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

let anyHubOk = false;
for (const hubName of ["Perth", "Inverness", "Aberdeen", "Dundee"]) {
  const hubProbe = await probeDirections(hubName);
  if (!hubProbe.ok) {
    continue;
  }
  anyHubOk = true;
  assert(hubProbe.pack.source === "rest-of-scotland-darwin-live", "directions source must be rest-of-scotland-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
    assert(!/caledonian sleeper/i.test(chip), `${hubName} directions must never include a Caledonian Sleeper chip: ${chip}`);
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("rest-of-scotland", hubName);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    `live-city-api dispatch must return the same chips as the dogfood harness for ${hubName}`
  );
  assert(dispatched.source === "rest-of-scotland-darwin-live", "live-city-api dispatch source must be rest-of-scotland-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getRestOfScotlandDogfoodNextTrain({
      station: hubName,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("rest-of-scotland", {
      station: hubName,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      dispatchedNextTrain.config?.destination === firstChip,
      "dispatched next-train destination must equal the chosen chip"
    );
  }
}

if (!anyHubOk) {
  console.log(
    "rest-of-scotland-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("rest-of-scotland", "Inverness");
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");

  // The board path is structurally wired but blocked — no network call needed
  // since MissingDarwinTokenError throws before any fetch (see
  // lib/providers/uk-darwin.js getDarwinToken()).
  for (const hubName of ["Perth", "Inverness", "Aberdeen", "Dundee"]) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(hubName);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${hubName}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Full-catalog CRS -> Darwin stationName sweep (per the greater-anglia/
// south-wales/rest-of-wales dogfood gate pattern, itself copied from
// qa/uk-west-midlands-dogfood-gate.mjs — the wrong-code defect class this
// catches). Token-tolerant; 9 cheap numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(REST_OF_SCOTLAND_REGION)) {
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
    `rest-of-scotland catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("rest-of-scotland-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "rest-of-scotland-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getRestOfScotlandDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getRestOfScotlandDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "rest-of-scotland", station: "Inverness" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "rest-of-scotland-dogfood-gate: ok (stays planned/501, adapterReady, NOT in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 9 rail-only stations, four co-equal hub locks PTH/INV/ABD/DEE resolve independently, Perth Scotland never conflated with city=perth Australia, Caledonian Sleeper out-reservation exclusion enforced per-station and absent from live chips, no hub configured (helper degrades to no-op), directions derived live from Darwin with no static line map, catalog CRS sweep, routing table (exact/undirected) proven token-free, Perth Australia stays green)"
);
