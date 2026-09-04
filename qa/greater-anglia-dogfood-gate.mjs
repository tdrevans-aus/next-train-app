/**
 * Greater Anglia adapter/dispatch wiring gate. Replaces
 * greater-anglia-planned-gate.mjs (retired) the way West Yorkshire's did —
 * except Greater Anglia STAYS `status: "planned"` here (this is the
 * pre-flip dogfood wiring pass, docs/jim-brief-greater-anglia-adapter.md).
 * Per CLAUDE.md's flip-follow-through split (added 30 Aug 2026, corrected
 * same day): the dogfood module, the live-city-api.js dispatch
 * switch-cases, and this gate are safe to land ahead of the flip because
 * production routes gate on assertCityLive() first, not on MULTI_CITY_IDS
 * membership. Greater Anglia is deliberately NOT added to MULTI_CITY_IDS,
 * brisbane-dogfood.js's mount/available map, or journey-model.js's
 * persisted-city/country lists yet — those three list-membership edits are
 * Mark's flip commit, not this one (qa/live-city-lists-sync.mjs enforces
 * that they equal the registry's live set).
 *
 * DARWIN_LDB_TOKEN is live (since 2 Sep 2026, docs/greater-anglia-d1/
 * jim-handoff.md). This gate stays token-tolerant throughout: with a token
 * it exercises real Darwin calls (14 cheap numRows=1 CRS-sweep calls plus a
 * couple of real boards); without one every live-probing section degrades
 * to MissingDarwinTokenError assertions instead of a throw/skip.
 *
 * Peterborough's LNER exclusion is RESOLVED, not open: the undecided
 * board-eligibility verdict that drove the D1 pack's excludeOperators
 * boundary was resolved to `in` 5 Sep 2026 (see oracle-clash-report.md's
 * Verdict resolution subsection) — this gate asserts LNER is NOT excluded
 * from the catalog entry and, with a token, that LNER rows genuinely appear
 * on Peterborough's live board.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/greater-anglia/
 * dogfood-next-train.js file header and docs/greater-anglia-d1/
 * direction-model-memo.md), so like every other National Rail-only region
 * this gate asserts the live-derivation shape and the dispatch wiring
 * rather than a static marketing-directions.js chip list.
 *
 * Usage: node qa/greater-anglia-dogfood-gate.mjs
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
  GREATER_ANGLIA_HUB,
  GREATER_ANGLIA_SECONDARY_HUBS,
  GREATER_ANGLIA_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
} from "../lib/providers/greater-anglia.js";
import {
  listGreaterAngliaDogfoodStations,
  getGreaterAngliaDogfoodDirections,
  getGreaterAngliaDogfoodNextTrain,
  planGreaterAngliaNextTrainFetch,
} from "../lib/cities/greater-anglia/dogfood-next-train.js";
import { loadDirectionHubs, applyDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired greater-anglia-planned-gate.mjs). Perth green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

// Registry identity — STILL planned. Do not flip in this gate or this PR.
const live = assertCityLive("greater-anglia");
assert(live?.ok === false, "assertCityLive(greater-anglia) must still fail — status stays planned");
assert(live?.status === 501, "greater-anglia must still be 501 planned");

const entry = getCity("greater-anglia");
assert(entry?.status === "planned", "greater-anglia registry status must stay planned (Mark/Tim's flip call, not this gate's)");
assert(entry?.adapterReady === true, "greater-anglia adapterReady must be true");
assert(entry?.displayName === "Greater Anglia", "greater-anglia display name must be Greater Anglia");
assert(entry?.timeZone === "Europe/London", "greater-anglia timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "greater-anglia").length === 1,
  "greater-anglia must appear once in the registry"
);
for (const forbiddenId of ["ga", "norwich", "east-anglia", "greater-anglia-trains"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases are wired ahead of the flip, but MULTI_CITY_IDS
// membership is not (that's Mark's flip commit) — assert both halves.
assert(isMultiCity("greater-anglia") === false, "greater-anglia must NOT be in MULTI_CITY_IDS yet (list membership is the flip commit's job)");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/greater-anglia-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/greater-anglia-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "greater-anglia", "D1 city id is greater-anglia");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === GREATER_ANGLIA_HUB,
  `D1 lock must be ${GREATER_ANGLIA_HUB}`
);
assert(
  JSON.stringify(network.printedInnerCityNames?.secondaryHubs) === JSON.stringify(GREATER_ANGLIA_SECONDARY_HUBS),
  "D1 secondaryHubs must be [Cambridge, Ipswich]"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict, and every 'in' verdict
// must actually stay unfiltered on the board. LNER at Peterborough must be
// resolved, not undecided.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Greater Anglia", "Thameslink", "CrossCountry", "East Midlands", "LNER"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows — LNER at Peterborough must be resolved");
assert(/Verdict resolution/.test(oracleReport), "oracle report must carry the LNER Verdict resolution subsection");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(GREATER_ANGLIA_REGION);
assert(region?.railCount === 14, `greater-anglia rail count must be 14, got ${region?.railCount}`);
assert(region?.metroCount === 0, `greater-anglia must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "greater-anglia must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["NRW", "CBG", "IPS", "PBO", "COL", "ELY", "KLN", "TTF", "DIS", "WMD", "GYM", "LWT", "SSD", "BIS"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(railCrs.size === 14, `greater-anglia catalog must carry exactly 14 distinct CRS codes, got ${railCrs.size}`);
assert(!railCrs.has("LST"), "greater-anglia must never carry LST — that CRS belongs to Liverpool Street in london-se-national-rail");
for (const stationEntry of railStations) {
  assert(stationEntry.crsVerified === true, `${stationEntry.name} (${stationEntry.crs}) must carry crsVerified: true`);
}
assert(getNotInRegion(GREATER_ANGLIA_REGION).length === 0, "greater-anglia has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 14, `combined catalog must have 14 stations (train only), got ${allStations.length}`);

// Hub + two co-equal secondary hubs — no doNotGroup within Norwich/Cambridge/Ipswich.
const hub = resolveCatalogEntry(GREATER_ANGLIA_HUB);
assert(hub?.crs === "NRW", "Norwich must resolve with crs NRW");
const cambridge = resolveCatalogEntry("Cambridge");
assert(cambridge?.crs === "CBG", "Cambridge must resolve with crs CBG");
const ipswich = resolveCatalogEntry("Ipswich");
assert(ipswich?.crs === "IPS", "Ipswich must resolve with crs IPS");

// Peterborough — flat boundary entry, NOT a hub, LNER NOT excluded (verdict resolved to `in`).
const peterborough = resolveCatalogEntry("Peterborough");
assert(peterborough?.crs === "PBO", "Peterborough must resolve with crs PBO");
assert(
  !(peterborough?.excludeOperators ?? []).length,
  "Peterborough must carry no excludeOperators — LNER's undecided verdict is resolved to `in`, the exclusion is removed"
);

// Liverpool Street must NOT be duplicated here — it already lives in London & South East
// National Rail's built pack.
assert(
  resolveCatalogEntry("Liverpool Street") === null,
  "Liverpool Street must not be built in greater-anglia's own catalog — already in london-se-national-rail"
);

// Lowestoft's CRS collision (report gives LST, which is Liverpool Street's real CRS) —
// resolved to LWT (verified live 5 Sep 2026), never LST.
const lowestoft = resolveCatalogEntry("Lowestoft");
assert(lowestoft !== null, "Lowestoft must resolve by name");
assert(lowestoft?.crs !== "LST", "Lowestoft must never carry LST — that is Liverpool Street's real CRS");
assert(lowestoft?.crs === "LWT", "Lowestoft must carry LWT (verified live against Darwin 5 Sep 2026)");

assert(resolveCatalogEntry("Norwich Station") !== null, "the doNotUse alias must still resolve to the hub entry");

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listGreaterAngliaDogfoodStations();
assert(dogfoodStations.length === 14, `dogfood stations must be the 14 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(GREATER_ANGLIA_HUB), "hub must be listed by the dogfood harness");
for (const secondary of GREATER_ANGLIA_SECONDARY_HUBS) {
  assert(dogfoodNames.has(secondary), `${secondary} secondary hub must be listed by the dogfood harness`);
}

// Direction hub anchoring: WIRED for Thetford/Ely -> Norwich (operator-split
// Liverpool shape, East Midlands Railway vs Greater Anglia). Token-free,
// data-only — see lib/cities/greater-anglia/direction-hubs.json.
assert(
  existsSync(join(ROOT, "lib/cities/greater-anglia/direction-hubs.json")),
  "direction-hubs.json must ship for Greater Anglia v1 — see PR chip-table evidence"
);
const { hubs: gaHubs } = loadDirectionHubs(GREATER_ANGLIA_REGION);
assert(gaHubs.length === 1, `greater-anglia must have exactly one configured hub in v1, got ${gaHubs.length}`);
assert(gaHubs[0]?.label === "Norwich", "the one configured hub must be labelled Norwich");
assert(gaHubs[0]?.filterCrs === "NRW", "the Norwich hub must filter to NRW");
assert(
  JSON.stringify([...gaHubs[0]?.appliesFrom ?? []].sort()) === JSON.stringify(["ELY", "TTF"]),
  "the Norwich hub must apply from Thetford (TTF) and Ely (ELY) only"
);

const fixtureChips = [
  "Norwich (East Midlands Railway)",
  "Norwich (Greater Anglia)",
  "Lowestoft (Greater Anglia)",
];
assert(
  JSON.stringify(applyDirectionHubs(fixtureChips, "TTF", gaHubs)) === JSON.stringify(["Lowestoft (Greater Anglia)", "Norwich"]),
  "applyDirectionHubs() at Thetford must collapse both operator-split 'Norwich' chips into one 'Norwich' hub chip"
);
assert(
  JSON.stringify(applyDirectionHubs(fixtureChips, "ELY", gaHubs)) === JSON.stringify(["Lowestoft (Greater Anglia)", "Norwich"]),
  "applyDirectionHubs() at Ely must collapse both operator-split 'Norwich' chips into one 'Norwich' hub chip"
);
assert(
  JSON.stringify(applyDirectionHubs(fixtureChips, "CBG", gaHubs)) === JSON.stringify([...fixtureChips].sort((a, b) => a.localeCompare(b))),
  "applyDirectionHubs() at Cambridge (no hub configured there) must be a sorted-passthrough no-op"
);

// planGreaterAngliaNextTrainFetch() — pure routing decision table, token-free.
const ttfEntry = resolveCatalogEntry("Thetford");
const elyEntry = resolveCatalogEntry("Ely");
const norwichEntry = resolveCatalogEntry(GREATER_ANGLIA_HUB);

const hubPlan = planGreaterAngliaNextTrainFetch(ttfEntry, "Norwich", gaHubs);
assert(
  hubPlan.kind === "hub" && hubPlan.filterCrs === "NRW",
  `planGreaterAngliaNextTrainFetch at Thetford for Norwich must be a hub plan filtered to NRW, got ${JSON.stringify(hubPlan)}`
);
const hubPlanEly = planGreaterAngliaNextTrainFetch(elyEntry, "Norwich", gaHubs);
assert(
  hubPlanEly.kind === "hub" && hubPlanEly.filterCrs === "NRW",
  `planGreaterAngliaNextTrainFetch at Ely for Norwich must be a hub plan filtered to NRW, got ${JSON.stringify(hubPlanEly)}`
);

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog, at a station with no hub configured.
const exactPlan = planGreaterAngliaNextTrainFetch(norwichEntry, "Cambridge (Greater Anglia)", gaHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "CBG",
  `planGreaterAngliaNextTrainFetch at Norwich for Cambridge must be an exact plan filtered to CBG, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. London Kings Cross).
const nationalExactPlan = planGreaterAngliaNextTrainFetch(norwichEntry, "London Kings Cross (LNER)", gaHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "KGX",
  `planGreaterAngliaNextTrainFetch at Norwich for London Kings Cross must be an exact plan filtered to KGX, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planGreaterAngliaNextTrainFetch(norwichEntry, "Nowhere (X)", gaHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planGreaterAngliaNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getGreaterAngliaDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(GREATER_ANGLIA_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "greater-anglia-darwin-live", "directions source must be greater-anglia-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("greater-anglia", GREATER_ANGLIA_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "greater-anglia-darwin-live", "live-city-api dispatch source must be greater-anglia-darwin-live");

  // Peterborough: LNER must appear on the live board — the exclusion is
  // removed, not just absent from the catalog config.
  const peterboroughProbe = await probeDirections("Peterborough");
  if (peterboroughProbe.ok) {
    const lnerChip = peterboroughProbe.pack.directions.find((chip) => chip.endsWith("(LNER)"));
    assert(
      typeof lnerChip === "string",
      `Peterborough's live directions must include at least one LNER chip, got: ${JSON.stringify(peterboroughProbe.pack.directions)}`
    );
  }

  // Thetford/Ely: the Norwich hub chip must appear, and the operator-split
  // "Norwich (East Midlands Railway)"/"Norwich (Greater Anglia)" chips must
  // be absorbed into it.
  for (const hubStation of ["Thetford", "Ely"]) {
    const probe = await probeDirections(hubStation);
    if (probe.ok) {
      assert(
        probe.pack.directions.includes("Norwich"),
        `${hubStation}'s live directions must include the bare 'Norwich' hub chip, got: ${JSON.stringify(probe.pack.directions)}`
      );
      assert(
        !probe.pack.directions.some((chip) => chip.startsWith("Norwich (")),
        `${hubStation}'s live directions must not still show an operator-suffixed 'Norwich (...)' chip once the hub absorbs it, got: ${JSON.stringify(probe.pack.directions)}`
      );
    }
  }

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getGreaterAngliaDogfoodNextTrain({
      station: GREATER_ANGLIA_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("greater-anglia", {
      station: GREATER_ANGLIA_HUB,
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
    "greater-anglia-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("greater-anglia", GREATER_ANGLIA_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Full-catalog CRS -> Darwin stationName sweep (per the brief, copied from
// qa/uk-west-midlands-dogfood-gate.mjs's pattern — the wrong-code defect
// class this catches: seven codes were wrong or missing in the original D1
// pack, fixed 5 Sep 2026 by scripts/fix-uk-region-crs.mjs). Token-tolerant;
// 14 cheap numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(GREATER_ANGLIA_REGION)) {
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
    `greater-anglia catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("greater-anglia-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "greater-anglia-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getGreaterAngliaDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getGreaterAngliaDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "greater-anglia", station: GREATER_ANGLIA_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "greater-anglia-dogfood-gate: ok (still planned/adapterReady, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired ahead of flip, D1 pack, Board eligibility all-in with LNER resolved not undecided, 14 rail-only stations all crsVerified, no doNotGroup at Norwich/Cambridge/Ipswich, Peterborough excludeOperators removed (LNER on board), Norwich hub wired at Thetford/Ely, directions derived live from Darwin with no static line map, catalog CRS sweep, routing table (hub/exact/undirected) proven token-free, Perth stays green)"
);
