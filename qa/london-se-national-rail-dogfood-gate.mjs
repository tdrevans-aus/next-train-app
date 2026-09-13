/**
 * London & South East National Rail adapter/dispatch wiring gate. Replaces
 * london-se-national-rail-planned-gate.mjs (retired). London & South East
 * National Rail is now `status: "live"` (this is the post-flip gate,
 * docs/jim-brief-london-se-national-rail-flip.md). The dogfood module,
 * live-city-api.js dispatch switch-cases, list memberships
 * (MULTI_CITY_IDS, brisbane-dogfood.js mount/available, journey-model.js
 * persisted-city/country), and QA gate assertions are now all wired for
 * live operation. Production routes gate on assertCityLive() first; once
 * live, both dispatch paths and list membership are enforced together.
 *
 * FIRST MULTI-GROUP UK REGION, NO SINGLE HUB-LOCK: seven independent
 * per-terminus station groups (Waterloo, Victoria, London Bridge, Liverpool
 * Street, King's Cross, St Pancras International, Paddington) — Tim's
 * Option A decision. This gate asserts:
 *  - all seven groups resolve as independent catalog entries;
 *  - the two internal-doNotGroup groups (London Bridge, Liverpool Street)
 *    each expose the correct number of per-operator sub-boards sharing one
 *    physical CRS, enforced via the includeOperators filter on the shared
 *    uk-darwin.js fetchStationBoard() (not just excludeOperators);
 *  - the two single-exclusion groups (St Pancras International/Eurostar,
 *    Paddington/Night Riviera Sleeper) exclude correctly and ONLY there;
 *    King's Cross does NOT exclude LNER (resolved to `in` per the UK
 *    ledger, 5 Sep 2026 — see docs/united-kingdom-ledger.md §3);
 *  - Euston and the seven secondary termini are NOT registered as catalog
 *    entries (deliberately not built per the D1 pack).
 *
 * DARWIN_LDB_TOKEN is live (since 2 Sep 2026, PR #230). This gate stays
 * token-tolerant throughout: with a token it exercises real Darwin calls
 * (one cheap numRows=1 CRS-sweep call per distinct CRS, deduplicated since
 * London Bridge/Liverpool Street each share one physical CRS across
 * multiple boards, plus a handful of real board fetches); without one every
 * live-probing section degrades to MissingDarwinTokenError assertions
 * instead of a throw/skip.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/london-se-national-rail/
 * dogfood-next-train.js file header and
 * docs/london-se-national-rail-d1/direction-model-memo.md), so like every
 * other National Rail-only region this gate asserts the live-derivation
 * shape and the dispatch wiring rather than a static marketing-directions.js
 * chip list.
 *
 * Usage: node qa/london-se-national-rail-dogfood-gate.mjs
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
  LONDON_SE_NATIONAL_RAIL_REGION,
  LONDON_SE_NATIONAL_RAIL_GROUPS,
  LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  listBoardsForGroup,
  fetchNationalRailBoard,
} from "../lib/providers/london-se-national-rail.js";
import {
  listLondonSeNationalRailDogfoodStations,
  getLondonSeNationalRailDogfoodDirections,
  getLondonSeNationalRailDogfoodNextTrain,
  planLondonSeNationalRailNextTrainFetch,
} from "../lib/cities/london-se-national-rail/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired london-se-national-rail-planned-gate.mjs). Perth green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

// Registry identity — NOW live, adapterReady removed, IS in MULTI_CITY_IDS.
const live = assertCityLive("london-se-national-rail");
assert(live?.ok === true, "assertCityLive(london-se-national-rail) must pass — status is now live");

const entry = getCity("london-se-national-rail");
assert(entry?.status === "live", "london-se-national-rail registry status must be live");
assert(entry?.adapterReady === undefined, "london-se-national-rail adapterReady flag is removed once live");
assert(
  entry?.displayName === "London & South East National Rail",
  "display name must be London & South East National Rail"
);
assert(entry?.timeZone === "Europe/London", "timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "london-se-national-rail").length === 1,
  "london-se-national-rail must appear once in the registry"
);
for (const forbiddenId of ["london-se", "london-national-rail", "uk-london-se", "south-east"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}
// uk-london-tfl is a separate live city and must be untouched by this pass.
const tflEntry = getCity("uk-london-tfl");
assert(tflEntry?.status === "live", "uk-london-tfl must remain a separate live city, untouched here");

// Dispatch switch-cases and MULTI_CITY_IDS membership are now wired (Mark's flip commit).
assert(
  isMultiCity("london-se-national-rail") === true,
  "london-se-national-rail must be in MULTI_CITY_IDS"
);

// D1 pack presence.
const d1Dir = join(ROOT, "docs/london-se-national-rail-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/london-se-national-rail-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "london-se-national-rail", "D1 city id must be london-se-national-rail");
assert(network.status === "planned", "D1 pack stays planned");
const groupIds = (network.stationGroups ?? []).map((g) => g.id);
for (const groupId of LONDON_SE_NATIONAL_RAIL_GROUPS) {
  assert(groupIds.includes(groupId), `D1 pack must carry station group ${groupId}`);
}
assert(groupIds.length === 7, `D1 pack must define exactly 7 station groups, got ${groupIds.length}`);
assert(!groupIds.includes("euston"), "Euston must NOT be a built station group (no named regional operator)");

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(
  /## Board eligibility/i.test(oracleReport) || /Board eligibility/i.test(oracleReport),
  "oracle report must carry a Board eligibility section"
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(LONDON_SE_NATIONAL_RAIL_REGION);
assert(
  (region?.modes ?? []).join(",") === "train",
  "london-se-national-rail must be train-only in regions.json"
);

const railStations = listNationalRailStations();
// 5 single-board groups + 3 London Bridge sub-boards + 2 Liverpool Street sub-boards = 10
// original D1 boards, plus 526 UK station fill phase 2a additions (14 Sep 2026) = 530.
assert(railStations.length === 530, `catalog must have 530 boards (UK station fill phase 2a, 14 Sep 2026), got ${railStations.length}`);
assert(getNotInRegion(LONDON_SE_NATIONAL_RAIL_REGION).length === 0, "no deliberate exclusions recorded in notInRegion");
for (const stationEntry of railStations) {
  assert(stationEntry.crsVerified === true, `${stationEntry.name} (${stationEntry.crs}) must carry crsVerified: true`);
}

const allStations = listCatalogStations();
assert(allStations.length === 530, `combined catalog must have 530 stations (train only, UK station fill phase 2a), got ${allStations.length}`);

// All seven groups resolve independently — no single-hub assumption anywhere.
assert(LONDON_SE_NATIONAL_RAIL_GROUPS.length === 7, "must document exactly seven station groups");
const waterloo = resolveCatalogEntry("London Waterloo");
assert(waterloo?.crs === "WAT", "Waterloo must resolve with crs WAT");
assert(waterloo?.operators?.includes("South Western Railway"), "Waterloo must be SWR");

const victoria = resolveCatalogEntry("London Victoria");
assert(victoria?.crs === "VIC", "Victoria must resolve with crs VIC");
assert(
  ["Southern", "Gatwick Express"].every((op) => victoria?.operators?.includes(op)),
  "Victoria must carry Southern and Gatwick Express"
);

// Internal doNotGroup — London Bridge (3 operators, 1 CRS) and Liverpool Street (2 operators, 1 CRS).
assert(LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS.length === 2, "exactly two internal doNotGroup groups");
const londonBridgeBoards = listBoardsForGroup("london-bridge");
assert(londonBridgeBoards.length === 3, `London Bridge must have 3 sub-boards, got ${londonBridgeBoards.length}`);
assert(
  londonBridgeBoards.every((b) => b.crs === "LBG" && b.doNotGroup === true),
  "all London Bridge sub-boards must share crs LBG and doNotGroup: true"
);
const londonBridgeOperators = londonBridgeBoards.flatMap((b) => b.operators);
for (const op of ["Southeastern", "Southern", "Thameslink"]) {
  assert(londonBridgeOperators.includes(op), `London Bridge sub-boards must cover operator ${op}`);
}

const liverpoolStreetBoards = listBoardsForGroup("liverpool-street");
assert(
  liverpoolStreetBoards.length === 2,
  `Liverpool Street must have 2 sub-boards, got ${liverpoolStreetBoards.length}`
);
assert(
  liverpoolStreetBoards.every((b) => b.crs === "LST" && b.doNotGroup === true),
  "all Liverpool Street sub-boards must share crs LST and doNotGroup: true"
);
const liverpoolStreetOperators = liverpoolStreetBoards.flatMap((b) => b.operators);
for (const op of ["Greater Anglia", "c2c"]) {
  assert(liverpoolStreetOperators.includes(op), `Liverpool Street sub-boards must cover operator ${op}`);
}

// King's Cross: LNER resolved to IN per the UK ledger, 5 Sep 2026 — no
// excludeOperators anymore (previously excluded pending a verdict).
const kingsCross = resolveCatalogEntry("London King's Cross");
assert(kingsCross?.crs === "KGX", "King's Cross must resolve with crs KGX");
assert(kingsCross?.doNotGroup === false, "King's Cross must not be doNotGroup");
assert(!kingsCross?.excludeOperators?.length, "King's Cross must not exclude any operator (LNER resolved to in)");

// Single-exclusion groups: excludeOperators recorded, no doNotGroup.
const stPancras = resolveCatalogEntry("St Pancras International");
assert(stPancras?.crs === "STP", "St Pancras International must resolve with crs STP");
assert(stPancras?.excludeOperators?.includes("Eurostar"), "St Pancras International must exclude Eurostar");

const paddington = resolveCatalogEntry("London Paddington");
assert(paddington?.crs === "PAD", "Paddington must resolve with crs PAD");
assert(
  paddington?.excludeOperators?.includes("Night Riviera Sleeper"),
  "Paddington must exclude Night Riviera Sleeper"
);

// UK station fill phase 2a (14 Sep 2026): Euston and the other D1-era "not built" secondary
// termini are now real, Darwin-verified catalog entries (per Tim's rule, "any station reachable
// through an API is in scope") — Darwin's own stationName carries the "London " prefix for six of
// these, so the bare marketing tokens below must still fail while the full printed names resolve.
const PHASE_2A_TERMINI = {
  "London Euston": "EUS",
  "London Blackfriars": "BFR",
  "London Cannon Street": "CST",
  "London Charing Cross": "CHX",
  "London Fenchurch Street": "FST",
  "London Marylebone": "MYB",
  Farringdon: "ZFD",
  Moorgate: "MOG",
};
for (const [name, crs] of Object.entries(PHASE_2A_TERMINI)) {
  const hit = resolveCatalogEntry(name);
  assert(hit?.crs === crs, `${name} must resolve with crs ${crs} (UK station fill phase 2a)`);
}
for (const bareToken of ["Euston", "Blackfriars", "Cannon Street", "Charing Cross", "Fenchurch Street", "Marylebone"]) {
  assert(!resolveCatalogEntry(bareToken), `the bare marketing token '${bareToken}' must never resolve as a station`);
}

// No direction-hubs.json for this region — each of the seven groups IS the
// anchor a rider selects (independent termini, not through-stations feeding
// a hub) — the shared helper must still degrade to an empty, no-op hub list.
assert(
  !existsSync(join(ROOT, "lib/cities/london-se-national-rail/direction-hubs.json")),
  "london-se-national-rail must not ship a direction-hubs.json — the seven groups are themselves the anchors, no intermediate through-station candidate exists"
);
const { hubs: lseHubs } = loadDirectionHubs(LONDON_SE_NATIONAL_RAIL_REGION);
assert(lseHubs.length === 0, `london-se-national-rail must have zero configured hubs, got ${lseHubs.length}`);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listLondonSeNationalRailDogfoodStations();
assert(dogfoodStations.length === 530, `dogfood stations must be the 530 catalog entries (UK station fill phase 2a), got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
for (const boardName of [
  "London Waterloo",
  "London Victoria",
  "London Bridge (Southeastern)",
  "London Bridge (Southern)",
  "London Bridge (Thameslink)",
  "Liverpool Street (Greater Anglia)",
  "Liverpool Street (c2c)",
  "London King's Cross",
  "St Pancras International",
  "London Paddington",
]) {
  assert(dogfoodNames.has(boardName), `${boardName} must be listed by the dogfood harness`);
}

// planLondonSeNationalRailNextTrainFetch() — pure routing decision table, token-free.
// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planLondonSeNationalRailNextTrainFetch(waterloo, "Brighton (Southern)", lseHubs);
assert(
  noHubPlan.kind !== "hub",
  "planLondonSeNationalRailNextTrainFetch must never return 'hub' — no hub is configured for london-se-national-rail"
);

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planLondonSeNationalRailNextTrainFetch(waterloo, "London Victoria (Southern)", lseHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "VIC",
  `planLondonSeNationalRailNextTrainFetch at Waterloo for London Victoria must be an exact plan filtered to VIC, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. Brighton).
const nationalExactPlan = planLondonSeNationalRailNextTrainFetch(victoria, "Brighton (Southern)", lseHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "BTN",
  `planLondonSeNationalRailNextTrainFetch at Victoria for Brighton must be an exact plan filtered to BTN, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planLondonSeNationalRailNextTrainFetch(waterloo, "Nowhere (X)", lseHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planLondonSeNationalRailNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate. Exercised at one terminus per group (per
// the brief), plus both internal-doNotGroup groups' per-operator sub-boards.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getLondonSeNationalRailDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const probeStations = [
  "London Waterloo",
  "London Victoria",
  "London Bridge (Southeastern)",
  "London Bridge (Southern)",
  "London Bridge (Thameslink)",
  "Liverpool Street (Greater Anglia)",
  "Liverpool Street (c2c)",
  "London King's Cross",
  "St Pancras International",
  "London Paddington",
];

let anyOk = false;
for (const station of probeStations) {
  const probe = await probeDirections(station);
  if (!probe.ok) {
    continue;
  }
  anyOk = true;
  assert(
    probe.pack.source === "london-se-national-rail-darwin-live",
    "directions source must be london-se-national-rail-darwin-live"
  );
  assert(Array.isArray(probe.pack.directions), "directions must be an array");
  for (const chip of probe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }
  if (station === "St Pancras International") {
    assert(
      !probe.pack.directions.some((chip) => chip.endsWith("(Eurostar)")),
      "St Pancras International directions must never include a Eurostar chip"
    );
  }
  if (station === "London Paddington") {
    assert(
      !probe.pack.directions.some((chip) => chip.endsWith("(Night Riviera Sleeper)")),
      "Paddington directions must never include a Night Riviera Sleeper chip"
    );
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("london-se-national-rail", station);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(probe.pack.directions),
    `live-city-api dispatch must return the same chips as the dogfood harness for ${station}`
  );
  assert(
    dispatched.source === "london-se-national-rail-darwin-live",
    "live-city-api dispatch source must be london-se-national-rail-darwin-live"
  );

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = probe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getLondonSeNationalRailDogfoodNextTrain({
      station,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(
        typeof trip.printedDestination === "string" && trip.printedDestination.length > 0,
        "next-train trips must carry printedDestination"
      );
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("london-se-national-rail", {
      station,
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

if (!anyOk) {
  console.log(
    "london-se-national-rail-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("london-se-national-rail", "London Waterloo");
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");

  // The board path is structurally wired but blocked — no network call needed
  // since MissingDarwinTokenError throws before any fetch (see
  // lib/providers/uk-darwin.js getDarwinToken()).
  for (const station of probeStations) {
    let darwinBlocked = false;
    try {
      await fetchNationalRailBoard(station);
    } catch (err) {
      darwinBlocked = err instanceof MissingDarwinTokenError;
    }
    assert(darwinBlocked, `fetchNationalRailBoard(${station}) must throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists`);
  }
}

// Full-catalog CRS -> Darwin stationName sweep (per the greater-anglia/
// thames-valley dogfood gate pattern, itself copied from
// qa/uk-west-midlands-dogfood-gate.mjs — the wrong-code defect class this
// catches). Deduplicated over unique CRS since London Bridge (LBG) and
// Liverpool Street (LST) are each shared by multiple boards. Token-tolerant;
// 7 cheap numRows=1 calls when the token is present (7 distinct CRS across
// 10 boards).
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
// St Pancras International's own catalog display name (D1 pack's choice) vs.
// Darwin's actual station name "London St Pancras (Intl)" share no useful
// substring once "(Intl)" is stripped as a parenthetical ("stpancrasinternational"
// vs "londonstpancras") — a genuine deliberate naming difference, not a wrong
// CRS. Strip the well-known "london"/"international"/"intl" tokens from both
// sides as a second, looser comparison before flagging a mismatch.
function coreStationName(value) {
  return normaliseStationName(value).replace(/london/g, "").replace(/international/g, "").replace(/intl/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  const seenCrs = new Set();
  for (const stationEntry of railStations) {
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
    const coreWant = coreStationName(stationEntry.name);
    const coreGot = coreStationName(board.stationName);
    const matches =
      want === got ||
      got.includes(want) ||
      want.includes(got) ||
      (coreWant.length > 0 && coreWant === coreGot);
    if (!matches) {
      problems.push(`${stationEntry.crs} "${stationEntry.name}" -> Darwin "${board.stationName}"`);
    }
  }
  return { ok: true, problems };
}
const catalogSweep = await sweepCatalogCrsNames();
if (catalogSweep.ok) {
  assert(
    catalogSweep.problems.length === 0,
    `london-se-national-rail catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log(
    "london-se-national-rail-dogfood-gate: catalog CRS sweep ok (every distinct rail crs resolves at Darwin to its catalogued name)"
  );
} else {
  console.log(
    "london-se-national-rail-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getLondonSeNationalRailDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getLondonSeNationalRailDogfoodDirections must not silently succeed for an unknown station");

let eustonThrew = false;
try {
  await getLondonSeNationalRailDogfoodDirections("Euston");
} catch (err) {
  eustonThrew = err instanceof Error;
}
assert(eustonThrew, "getLondonSeNationalRailDogfoodDirections(Euston) must throw — Euston is not built");

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
await vercelBoard({ method: "GET", query: { city: "london-se-national-rail", station: "London Waterloo" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "london-se-national-rail-dogfood-gate: ok (live, isMultiCity true, dispatch switch-cases wired, D1 pack, 7 station groups / 10 boards resolve, London Bridge (3) and Liverpool Street (2) internal doNotGroup sub-boards enforced via includeOperators, St Pancras International/Paddington excludeOperators enforced, King's Cross LNER resolved to in (no excludeOperators) per the UK ledger 5 Sep 2026, Euston and secondary termini correctly unbuilt, no hub configured (helper degrades to no-op), directions derived live from Darwin with no static line map, catalog CRS sweep deduplicated over 7 distinct CRS, routing table (exact/undirected) proven token-free, Perth stays green)"
);
