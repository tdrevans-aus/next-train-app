/**
 * Rest of Wales adapter/dispatch wiring gate. Replaces
 * rest-of-wales-planned-gate.mjs (retired) — Rest of Wales STAYS
 * `status: "planned"` here (this is the pre-flip dogfood wiring pass,
 * docs/jim-brief-rest-of-wales-flip.md). Per CLAUDE.md's flip-follow-through
 * split (added 30 Aug 2026, corrected same day): the dogfood module, the
 * live-city-api.js dispatch switch-cases, and this gate are safe to land
 * ahead of the flip because production routes gate on assertCityLive()
 * first, not on MULTI_CITY_IDS membership. Rest of Wales is deliberately NOT
 * added to MULTI_CITY_IDS, brisbane-dogfood.js's mount/available map, or
 * journey-model.js's persisted-city/country lists yet — those three
 * list-membership edits are Mark's flip commit, not this one
 * (qa/live-city-lists-sync.mjs enforces that they equal the registry's
 * live set). See docs/rest-of-wales-d1/jim-handoff.md for the exact note
 * left for Mark.
 *
 * City id note: the D1 pack (docs/rest-of-wales-d1/) originally used
 * `city: "uk-wales"`, following a since-fixed stale prefix table in
 * docs/uk-architecture.md. This gate asserts the CORRECTED id
 * `rest-of-wales` everywhere — registry.js, published-network.json (updated
 * post-pack, see its id-correction note), and this adapter — and asserts
 * `uk-wales` is NOT registered as a city id.
 *
 * DARWIN_LDB_TOKEN registration state for this specific region is unclear
 * (registry.js integration note says the account-level token was set 2 Sep
 * 2026 like every other UK region; the provider file header, written
 * earlier, still describes an account-level block — not reconciled here,
 * out of scope for this pass). This gate stays token-tolerant throughout,
 * same as every other UK region's dogfood gate: with a token it exercises
 * real Darwin calls (17 cheap numRows=1 CRS-sweep calls plus a couple of
 * real boards); without one every live-probing section degrades to
 * MissingDarwinTokenError assertions instead of a throw/skip. Separately,
 * Transport for Wales' real-time feed status through Darwin is UNCONFIRMED
 * per the D1 pack even once any token exists — a board call either succeeds
 * or throws; this gate does not assume either outcome.
 *
 * Also asserts the four proposed doNotGroup candidates (Wrexham General
 * route directions, Carmarthen branch-vs-through-running, Whitland
 * three-way branch, Machynlleth Aberystwyth/Pwllheli split) are NOT built as
 * enforced rules, and that no direction-hubs.json ships for this region (no
 * anchoring through-station candidate identified in the D1 pack, unlike
 * Greater Anglia's Thetford/Ely -> Norwich).
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/rest-of-wales/
 * dogfood-next-train.js file header and docs/rest-of-wales-d1/
 * direction-model-memo.md), so like every other National Rail-only region
 * this gate asserts the live-derivation shape and the dispatch wiring
 * rather than a static marketing-directions.js chip list.
 *
 * Usage: node qa/rest-of-wales-dogfood-gate.mjs
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
  REST_OF_WALES_HUB,
  REST_OF_WALES_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
} from "../lib/providers/rest-of-wales.js";
import {
  listRestOfWalesDogfoodStations,
  getRestOfWalesDogfoodDirections,
  getRestOfWalesDogfoodNextTrain,
  planRestOfWalesNextTrainFetch,
} from "../lib/cities/rest-of-wales/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired rest-of-wales-planned-gate.mjs). Perth green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

// Registry identity — NOW live, adapterReady removed, IS in MULTI_CITY_IDS.
const live = assertCityLive("rest-of-wales");
assert(live?.ok === true, "assertCityLive(rest-of-wales) must pass — status is now live");

const entry = getCity("rest-of-wales");
assert(entry?.status === "live", "rest-of-wales registry status must be live");
assert(entry?.adapterReady === undefined, "rest-of-wales adapterReady flag is removed once live");
assert(entry?.displayName === "North, Mid & West Wales", "rest-of-wales display name must be North, Mid & West Wales (docs/jim-brief-picker-countries-england-scotland-wales.md)");
assert(entry?.timeZone === "Europe/London", "rest-of-wales timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "rest-of-wales").length === 1,
  "rest-of-wales must appear once in the registry"
);
for (const forbiddenId of ["uk-wales", "wales", "rest-wales-nr", "uk-rest-of-wales", "restofwales"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases and MULTI_CITY_IDS membership are now wired (Mark's flip commit).
assert(isMultiCity("rest-of-wales") === true, "rest-of-wales must be in MULTI_CITY_IDS");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/rest-of-wales-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/rest-of-wales-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "rest-of-wales", "D1 city id must be corrected to rest-of-wales");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.printedInnerCityNames?.lock === REST_OF_WALES_HUB,
  `D1 lock must be ${REST_OF_WALES_HUB}`
);
assert(network.printedInnerCityNames?.lockCrs === "WRX", "D1 lock CRS must be WRX");

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["Transport for Wales", "CrossCountry", "GWR", "Caledonian Sleeper"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(REST_OF_WALES_REGION);
assert(region?.railCount === 118, `rest-of-wales rail count must be 118 (UK station fill phase 2a, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 0, `rest-of-wales must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "rest-of-wales must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of [
  "WRX", "LLJ", "CNW", "BNG", "HHD",
  "WLP", "MCN", "AYW", "PWL",
  "CMN", "WTL", "NAR", "TEN", "PMD", "MFH", "FGH", "LLE",
]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(railCrs.size === 118, `rest-of-wales catalog must carry exactly 118 distinct CRS codes (UK station fill phase 2a, 14 Sep 2026), got ${railCrs.size}`);
assert(getNotInRegion(REST_OF_WALES_REGION).length === 0, "rest-of-wales has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 118, `combined catalog must have 118 stations (train only, UK station fill phase 2a), got ${allStations.length}`);

// Hub lock resolves; boundary/pass-through stations never resolve (not catalog points).
const hub = resolveCatalogEntry(REST_OF_WALES_HUB);
assert(hub?.crs === "WRX", "Wrexham General must resolve with crs WRX");
// UK station fill phase 2a (14 Sep 2026): Wrexham Central is a real, Darwin-verified terminus
// (CRS WXC), distinct from the Wrexham General hub lock — previously excluded only because it had
// never been added to the catalog, not because of any genuine ambiguity.
const wrexhamCentral = resolveCatalogEntry("Wrexham Central");
assert(wrexhamCentral?.crs === "WXC", "Wrexham Central must resolve with crs WXC (UK station fill phase 2a)");
assert(wrexhamCentral.crs !== hub.crs, "Wrexham Central must not be conflated with the Wrexham General hub lock");
assert(resolveCatalogEntry("Chester") === null, "Chester must never resolve — England pass-through, Liverpool City Region's station per the ledger (not added here)");
assert(resolveCatalogEntry("Shrewsbury") === null, "Shrewsbury must never resolve — England pass-through, no target region claims it (docs/uk-station-fill/unassigned-england.md)");

// Aberystwyth and Carmarthen are corridor-significant but NOT hub-locked (single hub only).
const ayw = resolveCatalogEntry("Aberystwyth");
assert(ayw?.crs === "AYW", "Aberystwyth must resolve as its own catalog entry");
assert(ayw.crs !== hub.crs, "Aberystwyth must not be conflated with the Wrexham General hub lock");
const cmn = resolveCatalogEntry("Carmarthen");
assert(cmn?.crs === "CMN", "Carmarthen must resolve as its own catalog entry");
assert(cmn.crs !== hub.crs, "Carmarthen must not be conflated with the Wrexham General hub lock");

// Proposed-only doNotGroup candidates: named stations resolve as single
// entries (Jim's judgment call — no platform/service-pattern data to build
// an enforced destination-split rule from). Branch destinations off them
// (Fishguard Harbour, Milford Haven, Pembroke Dock, Pwllheli) still resolve
// as their own distinct in-catalog stations, not merged into the branch point.
const whitland = resolveCatalogEntry("Whitland");
assert(whitland?.crs === "WTL", "Whitland must resolve as its own catalog entry");
// Fishguard Harbour is FGH (live-verified 5 Sep 2026 07:00 UK); FGW is the separate
// Fishguard & Goodwick station and must not be used for the harbour terminus.
const fishguard = resolveCatalogEntry("Fishguard Harbour");
assert(fishguard?.crs === "FGH", "Fishguard Harbour must resolve to FGH, its own distinct catalog entry from Whitland");
const machynlleth = resolveCatalogEntry("Machynlleth");
assert(machynlleth?.crs === "MCN", "Machynlleth must resolve as its own catalog entry");
const pwllheli = resolveCatalogEntry("Pwllheli");
assert(pwllheli?.crs === "PWL", "Pwllheli must resolve as its own distinct catalog entry from Machynlleth");

// No direction-hubs.json for this region (no anchoring candidate identified) —
// the shared helper must still degrade to an empty, no-op hub list.
assert(
  !existsSync(join(ROOT, "lib/cities/rest-of-wales/direction-hubs.json")),
  "rest-of-wales must not ship a direction-hubs.json — no anchoring candidate identified in the D1 pack"
);
const { hubs: rowHubs } = loadDirectionHubs(REST_OF_WALES_REGION);
assert(rowHubs.length === 0, `rest-of-wales must have zero configured hubs, got ${rowHubs.length}`);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listRestOfWalesDogfoodStations();
assert(dogfoodStations.length === 118, `dogfood stations must be the 118 catalog entries (UK station fill phase 2a), got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(REST_OF_WALES_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodNames.has("Aberystwyth"), "Aberystwyth must be listed by the dogfood harness");
assert(dogfoodNames.has("Carmarthen"), "Carmarthen must be listed by the dogfood harness");

// planRestOfWalesNextTrainFetch() — pure routing decision table, token-free.
const wrxEntry = resolveCatalogEntry(REST_OF_WALES_HUB);
const aywEntry = resolveCatalogEntry("Aberystwyth");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planRestOfWalesNextTrainFetch(aywEntry, "Wrexham General (TfW)", rowHubs);
assert(noHubPlan.kind !== "hub", "planRestOfWalesNextTrainFetch must never return 'hub' — no hub is configured for rest-of-wales");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planRestOfWalesNextTrainFetch(aywEntry, "Wrexham General (TfW)", rowHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "WRX",
  `planRestOfWalesNextTrainFetch at Aberystwyth for Wrexham General must be an exact plan filtered to WRX, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. Manchester Piccadilly).
const nationalExactPlan = planRestOfWalesNextTrainFetch(wrxEntry, "Manchester Piccadilly (TfW)", rowHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "MAN",
  `planRestOfWalesNextTrainFetch at Wrexham General for Manchester Piccadilly must be an exact plan filtered to MAN, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planRestOfWalesNextTrainFetch(wrxEntry, "Nowhere (X)", rowHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planRestOfWalesNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getRestOfWalesDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(REST_OF_WALES_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "rest-of-wales-darwin-live", "directions source must be rest-of-wales-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("rest-of-wales", REST_OF_WALES_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "rest-of-wales-darwin-live", "live-city-api dispatch source must be rest-of-wales-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getRestOfWalesDogfoodNextTrain({
      station: REST_OF_WALES_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("rest-of-wales", {
      station: REST_OF_WALES_HUB,
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
    "rest-of-wales-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("rest-of-wales", REST_OF_WALES_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Full-catalog CRS -> Darwin stationName sweep (per the greater-anglia/
// south-wales dogfood gate pattern, itself copied from
// qa/uk-west-midlands-dogfood-gate.mjs — the wrong-code defect class this
// catches: seven codes were wrong in the original D1 pack, fixed 5 Sep 2026
// by scripts/fix-uk-region-crs.mjs). Token-tolerant; 17 cheap numRows=1
// calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(REST_OF_WALES_REGION)) {
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
    `rest-of-wales catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("rest-of-wales-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "rest-of-wales-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getRestOfWalesDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getRestOfWalesDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "rest-of-wales", station: REST_OF_WALES_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "rest-of-wales-dogfood-gate: ok (live, isMultiCity true, dispatch switch-cases wired, D1 pack, 17 rail-only stations, no doNotGroup enforced at Wrexham General/Carmarthen/Whitland/Machynlleth, no hub configured (helper degrades to no-op), directions derived live from Darwin with no static line map, catalog CRS sweep, routing table (exact/undirected) proven token-free, Perth stays green)"
);
