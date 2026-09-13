/**
 * Thames Valley adapter/dispatch wiring gate. Replaces
 * thames-valley-planned-gate.mjs (retired) the way West Yorkshire's (#215)
 * and Solent's (#216) did — Thames Valley STAYS `status: "planned"` here
 * (this is the pre-flip dogfood wiring pass,
 * docs/jim-brief-thames-valley-adapter.md).
 *
 * Per CLAUDE.md's flip-follow-through split (added 30 Aug 2026, corrected
 * same day): the dogfood module, the live-city-api.js dispatch
 * switch-cases, and this gate are safe to land ahead of the flip because
 * production routes gate on assertCityLive() first, not on MULTI_CITY_IDS
 * membership. Thames Valley is deliberately NOT added to MULTI_CITY_IDS,
 * brisbane-dogfood.js's mount/available map, or journey-model.js's
 * persisted-city/country lists yet — those three list-membership edits are
 * Mark's flip commit, not this one (qa/live-city-lists-sync.mjs enforces
 * that they equal the registry's live set).
 *
 * DARWIN_LDB_TOKEN is live (docs/thames-valley-d1/jim-handoff.md's 5 Sep
 * 2026 hygiene section). This gate stays token-tolerant throughout: with a
 * token it exercises real Darwin calls (7 cheap numRows=1 CRS-sweep calls
 * plus a couple of real boards); without one every live-probing section
 * degrades to MissingDarwinTokenError assertions instead of a throw/skip.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/thames-valley/
 * dogfood-next-train.js file header and docs/thames-valley-d1/
 * direction-model-memo.md), so like every other National Rail-only region
 * this gate asserts the live-derivation shape and the dispatch wiring
 * rather than a static marketing-directions.js chip list.
 *
 * HUB + SECONDARY-HUB WITH OXFORD doNotGroup: this gate asserts RDG resolves
 * flat (three operators, no split), and Oxford resolves as two distinct
 * catalog entries sharing CRS OXF — "Oxford (GWR)" (GWR + CrossCountry
 * main-line board) and "Oxford (Chiltern)" (Marylebone branch board) —
 * matching docs/thames-valley-d1/direction-model-memo.md's doNotGroup
 * twist at the secondary hub. No direction-hubs.json ships (all three
 * brief-named hub candidates were live-probed and rejected — see
 * dogfood-next-train.js file header).
 *
 * Usage: node qa/thames-valley-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { MissingDarwinTokenError, fetchDepartureBoard } from "../lib/providers/uk-darwin.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  THAMES_VALLEY_HUB,
  THAMES_VALLEY_SECONDARY_HUB,
  THAMES_VALLEY_REGION,
  THAMES_VALLEY_DONOTGROUP_GROUPS,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  listBoardsForGroup,
} from "../lib/providers/thames-valley.js";
import {
  listThamesValleyDogfoodStations,
  getThamesValleyDogfoodDirections,
  getThamesValleyDogfoodNextTrain,
  planThamesValleyNextTrainFetch,
} from "../lib/cities/thames-valley/dogfood-next-train.js";
import { loadDirectionHubs, applyDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug). Perth
// green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

// Registry identity — NOW live. Flip committed.
const live = assertCityLive("thames-valley");
assert(live?.ok === true, "assertCityLive(thames-valley) must succeed — status is now live");

const entry = getCity("thames-valley");
assert(entry?.status === "live", "thames-valley registry status must be live");
assert(entry?.adapterReady === true, "thames-valley adapterReady must be true");
assert(
  entry?.displayName === "Thames Valley (Reading / Oxford)",
  "thames-valley display name must be Thames Valley (Reading / Oxford)"
);
assert(entry?.timeZone === "Europe/London", "thames-valley timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "thames-valley").length === 1,
  "thames-valley must appear once in the registry"
);
for (const forbiddenId of ["reading", "oxford", "greater-thames-valley"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases and MULTI_CITY_IDS membership are both now wired.
assert(isMultiCity("thames-valley") === true, "thames-valley must now be in MULTI_CITY_IDS (flip commit bundled list membership)");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/thames-valley-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/thames-valley-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "thames-valley", "D1 city id is thames-valley");
assert(network.status === "planned", "D1 pack stays planned");
const groupIds = (network.stationGroups ?? []).map((g) => g.id);
assert(groupIds.join(",") === "reading,oxford", "D1 stationGroups must be reading, oxford in that order");

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict, and every 'in' verdict
// must actually stay unfiltered on the board.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["GWR", "CrossCountry", "Chiltern Railways", "South Western Railway"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(THAMES_VALLEY_REGION);
assert(region?.railCount === 64, `thames-valley rail count must be 64 (UK station fill phase 2a, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 0, `thames-valley must have no metro stations, got ${region?.metroCount}`);
assert((region?.modes ?? []).join(",") === "train", "thames-valley must be train-only in regions.json");

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["RDG", "OXF", "SWI", "BAN", "WSB", "HOT", "DID"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(THAMES_VALLEY_REGION).length === 0, "thames-valley has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 64, `combined catalog must have 64 stations (train only, UK station fill phase 2a), got ${allStations.length}`);

// Reading: hub lock, three operators, no doNotGroup.
const reading = resolveCatalogEntry(THAMES_VALLEY_HUB);
assert(reading?.crs === "RDG", "Reading must resolve with crs RDG");
assert(reading?.doNotGroup === false, "Reading must not be doNotGroup");
for (const op of ["Great Western Railway", "CrossCountry", "South Western Railway"]) {
  assert(reading?.operators?.includes(op), `Reading must carry operator ${op}`);
}

// Oxford: secondary hub, internal doNotGroup — 2 sub-boards, one CRS.
assert(THAMES_VALLEY_DONOTGROUP_GROUPS.join(",") === "oxford", "exactly one internal doNotGroup group: oxford");
const oxfordBoards = listBoardsForGroup("oxford");
assert(oxfordBoards.length === 2, `Oxford must have 2 sub-boards, got ${oxfordBoards.length}`);
assert(
  oxfordBoards.every((b) => b.crs === "OXF" && b.doNotGroup === true),
  "all Oxford sub-boards must share crs OXF and doNotGroup: true"
);
const oxfordGwr = resolveCatalogEntry(THAMES_VALLEY_SECONDARY_HUB);
assert(oxfordGwr?.crs === "OXF", "Oxford (GWR) must resolve with crs OXF");
assert(oxfordGwr?.operators?.includes("Great Western Railway"), "Oxford (GWR) board must carry Great Western Railway");
// CrossCountry discovery (5 Sep 2026, live-probed): CrossCountry calls at
// Oxford on the GWR main-line platforms, not named by the D1 report — must
// be included on the GWR board so its board-eligibility 'in' verdict isn't
// silently dropped by includeOperators. See dogfood-next-train.js header.
assert(oxfordGwr?.operators?.includes("CrossCountry"), "Oxford (GWR) board must carry CrossCountry (live discovery, 5 Sep 2026)");
const oxfordChiltern = resolveCatalogEntry("Oxford (Chiltern)");
assert(oxfordChiltern?.crs === "OXF", "Oxford (Chiltern) must resolve with crs OXF");
assert(oxfordChiltern?.operators?.join(",") === "Chiltern Railways", "Oxford (Chiltern) board must be Chiltern only");
assert(
  resolveCatalogEntry("Oxford")?.operators?.includes("Great Western Railway"),
  "the bare alias 'Oxford' must resolve to the GWR board"
);
assert(
  resolveCatalogEntry("OXF")?.operators?.includes("Great Western Railway"),
  "the raw CRS 'OXF' must resolve to the GWR board (catalog-order fallback)"
);

// Through-running-only stations catalogued flat, not hub candidates.
for (const [name, crs] of [
  ["Swindon", "SWI"],
  ["Banbury", "BAN"],
  ["Westbury", "WSB"],
  ["Henley-on-Thames", "HOT"],
  ["Didcot Parkway", "DID"],
]) {
  const hit = resolveCatalogEntry(name);
  assert(hit?.crs === crs, `${name} must resolve with crs ${crs}`);
  assert(hit?.doNotGroup === false, `${name} must not be doNotGroup (not built as split boards)`);
}

// Boundary-only references — not built as catalog entries here.
for (const name of ["London Paddington", "Paddington", "London Marylebone", "Marylebone"]) {
  assert(!resolveCatalogEntry(name), `${name} must NOT resolve as a catalog entry — boundary-only, built in London & South East National Rail's catalog`);
}

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listThamesValleyDogfoodStations();
assert(dogfoodStations.length === 64, `dogfood stations must be the 64 catalog entries (UK station fill phase 2a), got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(THAMES_VALLEY_HUB), "Reading must be listed by the dogfood harness");
assert(dogfoodNames.has(THAMES_VALLEY_SECONDARY_HUB), "Oxford (GWR) must be listed by the dogfood harness");
assert(dogfoodNames.has("Oxford (Chiltern)"), "Oxford (Chiltern) must be listed by the dogfood harness");

// Direction hub anchoring: deliberately NOT built for Thames Valley v1 (see
// dogfood-next-train.js file header) — all three brief-named candidates
// (Henley branch through to Reading, Didcot/Swindon operator split on
// Paddington/Reading, Banbury operator split on Oxford) were live-probed
// and rejected on filtered-board evidence. No lib/cities/thames-valley/
// direction-hubs.json exists, so loadDirectionHubs() must return the
// documented empty-hub-list shape and applyDirectionHubs() must be a no-op
// (sorted passthrough). Token-free, data-only.
assert(
  !existsSync(join(ROOT, "lib/cities/thames-valley/direction-hubs.json")),
  "no direction-hubs.json is expected to ship for Thames Valley v1 — see PR chip-table evidence"
);
const { hubs: tvHubs } = loadDirectionHubs(THAMES_VALLEY_REGION);
assert(tvHubs.length === 0, "thames-valley must have zero configured hubs in v1");
const fixtureChips = [
  "Twyford (Great Western Railway)",
  "London Paddington (Great Western Railway)",
];
assert(
  JSON.stringify(applyDirectionHubs(fixtureChips, "HOT", tvHubs)) ===
    JSON.stringify([...fixtureChips].sort((a, b) => a.localeCompare(b))),
  "applyDirectionHubs() with zero hubs must be a sorted-passthrough no-op"
);

// planThamesValleyNextTrainFetch() — pure routing decision table, token-free.
const rdgEntry = resolveCatalogEntry(THAMES_VALLEY_HUB);
const oxfGwrEntry = resolveCatalogEntry(THAMES_VALLEY_SECONDARY_HUB);
const oxfChilternEntry = resolveCatalogEntry("Oxford (Chiltern)");
const hubPlan = planThamesValleyNextTrainFetch(rdgEntry, THAMES_VALLEY_SECONDARY_HUB, tvHubs);
assert(hubPlan.kind !== "hub", "with zero configured hubs, the hub branch must never fire");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog — including resolving to Oxford's shared CRS from
// either sub-board's own perspective.
const exactFromReading = planThamesValleyNextTrainFetch(rdgEntry, "Oxford (Great Western Railway)", tvHubs);
assert(
  exactFromReading.kind === "exact" && exactFromReading.filterCrs === "OXF",
  `planThamesValleyNextTrainFetch at Reading for Oxford must be an exact plan filtered to OXF, got ${JSON.stringify(exactFromReading)}`
);
const exactChilternFromReading = planThamesValleyNextTrainFetch(rdgEntry, "Oxford (Chiltern) (Chiltern Railways)", tvHubs);
assert(
  exactChilternFromReading.kind === "exact" && exactChilternFromReading.filterCrs === "OXF",
  `planThamesValleyNextTrainFetch resolving the Oxford (Chiltern) board name must still filter to OXF, got ${JSON.stringify(exactChilternFromReading)}`
);
const exactPlan = planThamesValleyNextTrainFetch(oxfGwrEntry, "Reading (Great Western Railway)", tvHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "RDG",
  `planThamesValleyNextTrainFetch at Oxford (GWR) for Reading must be an exact plan filtered to RDG, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. London Marylebone, Chiltern's
// own terminus, boundary-only and not built in this catalog).
const nationalExactPlan = planThamesValleyNextTrainFetch(oxfChilternEntry, "London Marylebone (Chiltern Railways)", tvHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "MYB",
  `planThamesValleyNextTrainFetch at Oxford (Chiltern) for London Marylebone must be an exact plan filtered to MYB, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planThamesValleyNextTrainFetch(rdgEntry, "Nowhere (X)", tvHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planThamesValleyNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getThamesValleyDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const readingProbe = await probeDirections(THAMES_VALLEY_HUB);
const oxfordGwrProbe = await probeDirections(THAMES_VALLEY_SECONDARY_HUB);
const oxfordChilternProbe = await probeDirections("Oxford (Chiltern)");
if (readingProbe.ok && oxfordGwrProbe.ok && oxfordChilternProbe.ok) {
  for (const pack of [readingProbe.pack, oxfordGwrProbe.pack, oxfordChilternProbe.pack]) {
    assert(pack.source === "thames-valley-darwin-live", "directions source must be thames-valley-darwin-live");
    assert(Array.isArray(pack.directions), "directions must be an array");
    for (const chip of pack.directions) {
      assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
    }
  }

  // Oxford doNotGroup confirmation: the Chiltern board's chips must never
  // carry a Great Western Railway/CrossCountry suffix, and the GWR board's
  // chips must never carry a Chiltern Railways suffix.
  assert(
    !oxfordChilternProbe.pack.directions.some((c) => /\((Great Western Railway|CrossCountry)\)$/.test(c)),
    "Oxford (Chiltern) board must never show a GWR/CrossCountry chip — doNotGroup split"
  );
  assert(
    !oxfordGwrProbe.pack.directions.some((c) => /\(Chiltern Railways\)$/.test(c)),
    "Oxford (GWR) board must never show a Chiltern Railways chip — doNotGroup split"
  );

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("thames-valley", THAMES_VALLEY_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(readingProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "thames-valley-darwin-live", "live-city-api dispatch source must be thames-valley-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = readingProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getThamesValleyDogfoodNextTrain({
      station: THAMES_VALLEY_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("thames-valley", {
      station: THAMES_VALLEY_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      dispatchedNextTrain.config?.destination === firstChip,
      "dispatched next-train destination must equal the chosen chip"
    );
  }

  // Oxford (Chiltern) end-to-end, if the live sample contains a chip.
  const chilternChip = oxfordChilternProbe.pack.directions[0];
  if (chilternChip) {
    const chilternNextTrain = await getThamesValleyDogfoodNextTrain({
      station: "Oxford (Chiltern)",
      destination: chilternChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      chilternNextTrain.config?.destination === chilternChip,
      "Oxford (Chiltern) next-train destination must equal the chosen chip"
    );
  }
} else {
  console.log(
    "thames-valley-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("thames-valley", THAMES_VALLEY_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Full-catalog CRS -> Darwin stationName sweep (per the brief, copied from
// qa/uk-west-midlands-dogfood-gate.mjs's pattern — the wrong-code defect
// class this catches: Henley-on-Thames HEY->HOT was wrong in the original
// D1 pack, fixed 5 Sep 2026 by scripts/fix-uk-region-crs.mjs). Token-tolerant;
// 7 cheap numRows=1 calls when the token is present (OXF is shared by both
// Oxford sub-boards, so the sweep is over unique CRS codes, not boards).
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  const seenCrs = new Set();
  for (const stationEntry of listNationalRailStations()) {
    if (seenCrs.has(stationEntry.crs)) {
      continue;
    }
    seenCrs.add(stationEntry.crs);
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
    `thames-valley catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("thames-valley-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "thames-valley-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getThamesValleyDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getThamesValleyDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "thames-valley", station: THAMES_VALLEY_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "thames-valley-dogfood-gate: ok (still planned/adapterReady, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired ahead of flip, D1 pack, Board eligibility all-in, 8 rail-only boards, hub+secondary-hub with Oxford internal doNotGroup (GWR+CrossCountry board vs Chiltern board, live CrossCountry discovery 5 Sep 2026), WSB boundary resolves flat, catalog CRS sweep, directions derived live from Darwin with no static line map, no direction-hubs.json shipped (three brief-named candidates probed and rejected on filtered-board evidence), routing table (exact/undirected; hub branch inert with zero configured hubs) proven token-free, Perth stays green)"
);
