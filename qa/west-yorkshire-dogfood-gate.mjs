/**
 * West Yorkshire adapter/dispatch wiring gate. Replaces
 * west-yorkshire-planned-gate.mjs (retired) the way West of England's did —
 * except West Yorkshire STAYS `status: "planned"` here (this is the
 * pre-flip dogfood wiring pass, docs/jim-brief-west-yorkshire-adapter.md).
 * Per CLAUDE.md's flip-follow-through split (added 30 Aug 2026, corrected
 * same day): the dogfood module, the live-city-api.js dispatch
 * switch-cases, and this gate are safe to land ahead of the flip because
 * production routes gate on assertCityLive() first, not on MULTI_CITY_IDS
 * membership. West Yorkshire is deliberately NOT added to MULTI_CITY_IDS,
 * brisbane-dogfood.js's mount/available map, or journey-model.js's
 * persisted-city/country lists yet — those three list-membership edits are
 * Mark's flip commit, not this one (qa/live-city-lists-sync.mjs enforces
 * that they equal the registry's live set).
 *
 * DARWIN_LDB_TOKEN is live (since 2 Sep 2026, docs/west-yorkshire-d1/
 * jim-handoff.md). This gate stays token-tolerant throughout: with a token
 * it exercises real Darwin calls (10 cheap numRows=1 CRS-sweep calls plus a
 * couple of real boards); without one every live-probing section degrades
 * to MissingDarwinTokenError assertions instead of a throw/skip.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/west-yorkshire/
 * dogfood-next-train.js file header and docs/west-yorkshire-d1/
 * direction-model-memo.md), so like every other National Rail-only region
 * this gate asserts the live-derivation shape and the dispatch wiring
 * rather than a static marketing-directions.js chip list.
 *
 * Usage: node qa/west-yorkshire-dogfood-gate.mjs
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
  WEST_YORKSHIRE_HUB,
  WEST_YORKSHIRE_SECONDARY_HUB,
  WEST_YORKSHIRE_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
} from "../lib/providers/west-yorkshire.js";
import {
  listWestYorkshireDogfoodStations,
  getWestYorkshireDogfoodDirections,
  getWestYorkshireDogfoodNextTrain,
  planWestYorkshireNextTrainFetch,
} from "../lib/cities/west-yorkshire/dogfood-next-train.js";
import { loadDirectionHubs, applyDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired west-yorkshire-planned-gate.mjs). Perth green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

// Registry identity — STILL planned. Do not flip in this gate or this PR.
const live = assertCityLive("west-yorkshire");
assert(live?.ok === false, "assertCityLive(west-yorkshire) must still fail — status stays planned");
assert(live?.status === 501, "west-yorkshire must still be 501 planned");

const entry = getCity("west-yorkshire");
assert(entry?.status === "planned", "west-yorkshire registry status must stay planned (Mark/Tim's flip call, not this gate's)");
assert(entry?.adapterReady === true, "west-yorkshire adapterReady must be true");
assert(entry?.displayName === "West Yorkshire", "west-yorkshire display name must be West Yorkshire");
assert(entry?.timeZone === "Europe/London", "west-yorkshire timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "west-yorkshire").length === 1,
  "west-yorkshire must appear once in the registry"
);
for (const forbiddenId of ["westyorkshire", "leeds", "bradford", "west-yorks"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases are wired ahead of the flip, but MULTI_CITY_IDS
// membership is not (that's Mark's flip commit) — assert both halves.
assert(isMultiCity("west-yorkshire") === false, "west-yorkshire must NOT be in MULTI_CITY_IDS yet (list membership is the flip commit's job)");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/west-yorkshire-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/west-yorkshire-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "west-yorkshire", "D1 city id is west-yorkshire");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === WEST_YORKSHIRE_HUB,
  `D1 lock must be ${WEST_YORKSHIRE_HUB}`
);
assert(network.printedInnerCityNames?.lockCrs === "LDS", "D1 lock CRS must be LDS");
assert(
  network.printedInnerCityNames?.secondaryLock === WEST_YORKSHIRE_SECONDARY_HUB,
  `D1 secondary lock must be ${WEST_YORKSHIRE_SECONDARY_HUB}`
);
assert(network.printedInnerCityNames?.secondaryLockCrs === "BDQ", "D1 secondary lock CRS must be BDQ");

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict, and every 'in' verdict
// must actually stay unfiltered on the board.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Northern Trains", "LNER", "CrossCountry", "TransPennine Express"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(WEST_YORKSHIRE_REGION);
assert(region?.railCount === 10, `west-yorkshire rail count must be 10, got ${region?.railCount}`);
assert(region?.metroCount === 0, `west-yorkshire must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "west-yorkshire must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["LDS", "BDQ", "BDI", "DBD", "WDN", "HUD", "HFX", "TOD", "HBD", "KEI"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(WEST_YORKSHIRE_REGION).length === 0, "west-yorkshire has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 10, `combined catalog must have 10 stations (train only), got ${allStations.length}`);

// doNotGroup: Bradford Forster Square (BDQ) vs Bradford Interchange (BDI) —
// two distinct catalog entries, walk-link connect only, never merged.
const hub = resolveCatalogEntry(WEST_YORKSHIRE_HUB);
assert(hub?.crs === "LDS", "Leeds Station must resolve with crs LDS");
const bdq = resolveCatalogEntry(WEST_YORKSHIRE_SECONDARY_HUB);
assert(bdq?.crs === "BDQ", "Bradford Forster Square must resolve with crs BDQ");
const bdi = resolveCatalogEntry("Bradford Interchange");
assert(bdi?.crs === "BDI", "Bradford Interchange must resolve with crs BDI");
assert(bdq.crs !== bdi.crs, "BDQ and BDI must be distinct catalog entries (doNotGroup)");
assert(resolveCatalogEntry("Bradford") === null, "the ambiguous token 'Bradford' must never resolve as a station");

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listWestYorkshireDogfoodStations();
assert(dogfoodStations.length === 10, `dogfood stations must be the 10 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(WEST_YORKSHIRE_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodNames.has(WEST_YORKSHIRE_SECONDARY_HUB), "secondary hub must be listed by the dogfood harness");

// Direction hub anchoring: deliberately NOT built for West Yorkshire v1 (see
// dogfood-next-train.js file header) — no lib/cities/west-yorkshire/
// direction-hubs.json exists, so loadDirectionHubs() must return the
// documented empty-hub-list shape and applyDirectionHubs() must be a no-op
// (sorted passthrough). Token-free, data-only.
assert(
  !existsSync(join(ROOT, "lib/cities/west-yorkshire/direction-hubs.json")),
  "no direction-hubs.json is expected to ship for West Yorkshire v1 — see PR chip-table evidence"
);
const { hubs: wyHubs } = loadDirectionHubs(WEST_YORKSHIRE_REGION);
assert(wyHubs.length === 0, "west-yorkshire must have zero configured hubs in v1");
const fixtureChips = [
  "Chester (Northern)",
  "Blackpool North (Northern)",
  "Manchester Victoria (Northern)",
];
assert(
  JSON.stringify(applyDirectionHubs(fixtureChips, "BDQ", wyHubs)) ===
    JSON.stringify([...fixtureChips].sort((a, b) => a.localeCompare(b))),
  "applyDirectionHubs() with zero hubs must be a sorted-passthrough no-op"
);

// planWestYorkshireNextTrainFetch() — pure routing decision table, token-free.
const bdqEntry = resolveCatalogEntry(WEST_YORKSHIRE_SECONDARY_HUB);
const ldsEntry = resolveCatalogEntry(WEST_YORKSHIRE_HUB);
const hubPlan = planWestYorkshireNextTrainFetch(bdqEntry, WEST_YORKSHIRE_HUB, wyHubs);
assert(hubPlan.kind !== "hub", "with zero configured hubs, the hub branch must never fire");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planWestYorkshireNextTrainFetch(ldsEntry, "Bradford Forster Square (Northern)", wyHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "BDQ",
  `planWestYorkshireNextTrainFetch at Leeds Station for Bradford Forster Square must be an exact plan filtered to BDQ, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. Manchester Victoria).
const nationalExactPlan = planWestYorkshireNextTrainFetch(ldsEntry, "Manchester Victoria (Northern)", wyHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "MCV",
  `planWestYorkshireNextTrainFetch at Leeds Station for Manchester Victoria must be an exact plan filtered to MCV, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planWestYorkshireNextTrainFetch(ldsEntry, "Nowhere (X)", wyHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planWestYorkshireNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getWestYorkshireDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(WEST_YORKSHIRE_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "west-yorkshire-darwin-live", "directions source must be west-yorkshire-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("west-yorkshire", WEST_YORKSHIRE_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "west-yorkshire-darwin-live", "live-city-api dispatch source must be west-yorkshire-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getWestYorkshireDogfoodNextTrain({
      station: WEST_YORKSHIRE_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("west-yorkshire", {
      station: WEST_YORKSHIRE_HUB,
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
    "west-yorkshire-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("west-yorkshire", WEST_YORKSHIRE_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Full-catalog CRS -> Darwin stationName sweep (per the brief, copied from
// qa/uk-west-midlands-dogfood-gate.mjs's pattern — the wrong-code defect
// class this catches: four codes were wrong in the original D1 pack, fixed
// 5 Sep 2026 by scripts/fix-uk-region-crs.mjs). Token-tolerant; 10 cheap
// numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(WEST_YORKSHIRE_REGION)) {
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
    `west-yorkshire catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("west-yorkshire-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "west-yorkshire-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getWestYorkshireDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getWestYorkshireDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "west-yorkshire", station: WEST_YORKSHIRE_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "west-yorkshire-dogfood-gate: ok (still planned/adapterReady, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired ahead of flip, D1 pack, Board eligibility all-in, 10 rail-only stations, doNotGroup BDQ/BDI, catalog CRS sweep, directions derived live from Darwin with no static line map, no direction-hubs.json shipped (chip-table evidence found no qualifying hub case), routing table (exact/undirected; hub branch inert with zero configured hubs) proven token-free, Perth stays green)"
);
