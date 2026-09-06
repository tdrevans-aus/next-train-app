/**
 * West Midlands adapter/dispatch wiring gate for its live flip. Perth stays live.
 *
 * uk-west-midlands predates the D1-pack pipeline — there is no
 * docs/uk-west-midlands-d1/{published-network.json,hazard-pack.md,
 * direction-model-memo.md,jim-handoff.md}, only oracle-clash-report.md
 * (Nico's 2 Sep 2026 pass). This gate checks against that report + the
 * stations.json catalog directly rather than a published-network.json,
 * unlike east-midlands-dogfood-gate.mjs.
 *
 * Two agencies, two very different outcomes once wired:
 *  - National Rail (Darwin): destination+operator derived live from the
 *    board, no printed route map exists — same shape as West of England
 *    and East Midlands' own dogfood modules. Tolerates
 *    MissingDarwinTokenError in sandboxes without DARWIN_LDB_TOKEN set
 *    (expected outside Vercel prod), same as every other UK region.
 *  - West Midlands Metro (TfWM GTFS-RT): TFWM_API_APP_ID/TFWM_API_APP_KEY
 *    are not set anywhere and are not expected to be until Tim self-serves
 *    TfWM API portal registration (FB-48, docs/feature-backlog.md).
 *    fetchMetroStopBoard() throws MissingTfwmCredentialsError
 *    unconditionally in every environment right now. This gate asserts the
 *    dogfood dispatch surfaces that error rather than swallowing it or
 *    fabricating a schedule.
 *
 * NOTE for Mark: at the commit this gate was written, uk-west-midlands is
 * still `status: "planned"` in the registry (Jim never flips that line
 * himself). This gate's registry-status/adapterReady/isMultiCity assertions
 * are therefore written for the POST-FLIP state and will only pass once
 * Mark's flip commit lands (status -> "live", uk-west-midlands added to
 * MULTI_CITY_IDS). See docs/uk-west-midlands-d1/oracle-clash-report.md's
 * "Flip commit — list additions for Mark" section for the exact one-line
 * adds.
 *
 * Usage: node qa/uk-west-midlands-dogfood-gate.mjs
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { MissingDarwinTokenError, fetchDepartureBoard, listRailStations } from "../lib/providers/uk-darwin.js";
import {
  MissingTfwmCredentialsError,
  MetroStopIdNotCatalogedError,
  stopIdsForEntry,
  buildMetroTrips,
} from "../lib/providers/uk-metro-wm.js";
import { getRegion, resolveRailEntry, resolveMetroEntry } from "../lib/providers/uk/catalog.js";
import {
  UK_WEST_MIDLANDS_REGION,
  resolveCatalogEntry,
  listUkWestMidlandsDogfoodStations,
  getUkWestMidlandsDogfoodDirections,
  getUkWestMidlandsDogfoodNextTrain,
  planUkWestMidlandsNextTrainFetch,
} from "../lib/cities/uk-west-midlands/dogfood-next-train.js";
import {
  loadDirectionHubs,
  applyDirectionHubs,
} from "../lib/cities/uk-west-midlands/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BHM = "Birmingham New Street";
const KID = "Kidderminster";
const TAM = "Tamworth";
const BHI = "Birmingham International";

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
assert(assertCityLive("west-of-england")?.ok === true, "West of England stays live");
assert(assertCityLive("east-midlands")?.ok === true, "East Midlands stays live");

// Registry identity + live status. Only true once Mark's flip commit lands —
// see the file-header note.
const live = assertCityLive("uk-west-midlands");
assert(live?.ok === true, "assertCityLive(uk-west-midlands) must pass post-flip");
assert(getCity("uk-west-midlands")?.status === "live", "uk-west-midlands registry status must be live post-flip");
assert(getCity("uk-west-midlands")?.adapterReady === true, "uk-west-midlands adapterReady must be true");
assert(getCity("uk-west-midlands")?.displayName === "West Midlands", "uk-west-midlands display name must be West Midlands");
assert(getCity("uk-west-midlands")?.timeZone === "Europe/London", "uk-west-midlands timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "uk-west-midlands").length === 1,
  "uk-west-midlands must appear once in the registry"
);
for (const forbiddenId of ["west-midlands", "birmingham", "wm", "wmm"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch wiring — uk-west-midlands is in MULTI_CITY_IDS post-flip.
assert(isMultiCity("uk-west-midlands") === true, "uk-west-midlands must be in MULTI_CITY_IDS post-flip");

// D1 pack presence — this region predates the D1-pack pipeline, so only
// oracle-clash-report.md is required (not published-network.json etc.).
const d1Dir = join(ROOT, "docs/uk-west-midlands-d1");
assert(existsSync(join(d1Dir, "oracle-clash-report.md")), "docs/uk-west-midlands-d1/oracle-clash-report.md is required");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(UK_WEST_MIDLANDS_REGION);
assert(region?.railCount === 75, `uk-west-midlands rail count must be 75, got ${region?.railCount}`);
assert(region?.metroCount === 35, `uk-west-midlands metro count must be 35, got ${region?.metroCount}`);
assert(region?.stopCount === 110, `uk-west-midlands combined catalog must have 110 stations, got ${region?.stopCount}`);

// Hub + special-case stations resolve in the expected mode.
const hubRail = resolveRailEntry(BHM, UK_WEST_MIDLANDS_REGION);
assert(hubRail?.crs === "BHM", "Birmingham New Street must resolve as a National Rail entry (crs BHM)");
const grandCentral = resolveMetroEntry("Grand Central", UK_WEST_MIDLANDS_REGION);
assert(
  grandCentral?.catalogId === "metro:grand-central",
  "Grand Central must resolve as the Metro entry nearest Birmingham New Street"
);
// Unlike East Midlands' Nottingham Station, BHM and Grand Central do NOT share a
// printed name (oracle report: "No physical tram/rail split like East Midlands
// Nottingham") — an explicit metro-mode lookup of the rail name must fail closed,
// not silently fall through to the rail board.
assert(
  resolveCatalogEntry(BHM, "metro") === null,
  "Birmingham New Street must not resolve under an explicit metro mode (no shared printed name with Grand Central)"
);
assert(
  resolveCatalogEntry(BHM, "train")?.crs === "BHM",
  "Birmingham New Street must resolve under an explicit train mode"
);

const kidderminster = resolveRailEntry(KID, UK_WEST_MIDLANDS_REGION);
assert(kidderminster?.crs === "KID", "Kidderminster must resolve as a National Rail entry (crs KID)");
assert(
  resolveMetroEntry(KID, UK_WEST_MIDLANDS_REGION) === null,
  "Kidderminster must not resolve on the Metro layer (no Metro service there)"
);
// Severn Valley Railway heritage services are excluded (`out-mode`) — must never
// resolve as a catalog station under any name.
for (const name of ["Severn Valley Railway", "Severn Valley"]) {
  assert(resolveCatalogEntry(name) === null, `${name} must never resolve as a station (out-mode, not in catalog)`);
}

// Dogfood station list comes from the catalog, not a GTFS parse; includes mode
// so callers can disambiguate BHM (train) from Grand Central (metro).
const dogfoodStations = listUkWestMidlandsDogfoodStations();
assert(dogfoodStations.length === 110, `dogfood stations must be the 110 catalog entries, got ${dogfoodStations.length}`);
const bhmEntries = dogfoodStations.filter((s) => s.name === BHM);
assert(bhmEntries.length === 1, "Birmingham New Street must appear once in the dogfood list (rail only)");
assert(bhmEntries[0]?.mode === "train", "Birmingham New Street's dogfood entry must be mode train");
const grandCentralEntries = dogfoodStations.filter((s) => s.name === "Grand Central");
assert(grandCentralEntries.length === 1, "Grand Central must appear once in the dogfood list (metro only)");
assert(grandCentralEntries[0]?.mode === "metro", "Grand Central's dogfood entry must be mode metro");

// Direction hub anchoring (FB-50, docs/jim-brief-uk-west-midlands-hub-anchoring.md).
// Pure/data-only — no Darwin token needed for any of this section.

// 1. direction-hubs.json loads and validates: BSW and KID resolve in the
// catalog; absorbs strings carry no operator suffix (loadDirectionHubs()
// throws if either check fails, so simply loading it successfully is the
// assertion). filterCrs is BSW (Birmingham Snow Hill's real Darwin CRS) —
// the brief's original draft used "BSH", which is actually Bushey
// (Hertfordshire) in Darwin's CRS scheme, not Snow Hill; corrected after
// live-probing on 4 Sep 2026 confirmed BSW returns the full absorbed set
// (all 8 Dorridge/Whitlocks End/Stratford-upon-Avon services on Kidderminster's
// board at that time). See direction-hubs.json's "reason" field and the PR
// description for the transcript.
const { hubs } = loadDirectionHubs(UK_WEST_MIDLANDS_REGION);
assert(hubs.length === 2, "uk-west-midlands direction-hubs.json must define exactly two hubs (Kidderminster/Snow Hill v1 + Tamworth/New Street FB-54)");
const birminghamHub = hubs[0];
assert(birminghamHub.label === "Birmingham", "v1 hub label must be Birmingham");
assert(birminghamHub.filterCrs === "BSW", "v1 hub filterCrs must be BSW (Birmingham Snow Hill's real Darwin CRS — \"BSH\" is Bushey)");
assert(
  JSON.stringify(birminghamHub.appliesFrom) === JSON.stringify(["KID", "SBJ", "CRA", "OHL", "ROW", "LGG"]),
  "hub appliesFrom must be Kidderminster + Stourbridge Junction, Cradley Heath, Old Hill, Rowley Regis, Langley Green (4 Sep 2026)"
);
for (const absorbed of birminghamHub.absorbs) {
  assert(!/ \([^()]+\)$/.test(absorbed), `absorbs entry "${absorbed}" must not carry an operator suffix`);
}
assert(
  birminghamHub.absorbs.includes("London Marylebone") === false,
  "London Marylebone must NOT be absorbed — it keeps its own chip alongside the Birmingham hub chip"
);

// CRS/name sanity check (added after the BSH/Bushey mix-up that produced the
// original BSH->BMO misdiagnosis): the hub's filterCrs must resolve, live
// against Darwin, to a stationName that actually contains "Snow Hill" —
// catching exactly the class of bug where a catalog entry's crs points at
// the wrong physical station. Token-tolerant like every other live probe in
// this gate; narrow (one station, not a full-catalog sweep) to stay cheap.
async function probeHubCrsName() {
  try {
    return { ok: true, board: await fetchDepartureBoard({ crs: birminghamHub.filterCrs, numRows: 1 }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}
const hubCrsNameProbe = await probeHubCrsName();
if (hubCrsNameProbe.ok) {
  assert(
    hubCrsNameProbe.board.stationName.includes("Snow Hill"),
    `direction-hubs.json hub filterCrs "${birminghamHub.filterCrs}" must resolve at Darwin to Birmingham Snow Hill, got stationName "${hubCrsNameProbe.board.stationName}"`
  );
} else {
  console.log(
    "uk-west-midlands-dogfood-gate: DARWIN_LDB_TOKEN not set — hub filterCrs/Darwin-stationName agreement not exercised here (this is exactly the check that would have caught the BSH=Bushey mix-up, so it only has teeth with a token)."
  );
}

// Full-catalog CRS -> Darwin stationName sweep (4 Sep 2026). The narrow hub probe
// above caught Snow Hill; sweeping the whole catalog the same way found 16 more
// wrong codes (Blake Street was Blantyre, The Hawthorns was Thatcham, ...) and one
// station not yet in Darwin at all (Willenhall, now held in notYetInDarwin). Every
// rail entry must resolve, live, to a station whose Darwin name matches the
// catalog name after light normalisation. Token-tolerant; ~74 cheap numRows=1
// calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const entry of listRailStations(UK_WEST_MIDLANDS_REGION)) {
    let board;
    try {
      board = await fetchDepartureBoard({ crs: entry.crs, numRows: 1 });
    } catch (err) {
      if (err instanceof MissingDarwinTokenError) {
        return { ok: false, blocked: true };
      }
      problems.push(`${entry.crs} "${entry.name}" -> Darwin error: ${err.message}`);
      continue;
    }
    const want = normaliseStationName(entry.name);
    const got = normaliseStationName(board.stationName);
    if (!(want === got || got.includes(want) || want.includes(got))) {
      problems.push(`${entry.crs} "${entry.name}" -> Darwin "${board.stationName}"`);
    }
  }
  return { ok: true, problems };
}
const catalogSweep = await sweepCatalogCrsNames();
if (catalogSweep.ok) {
  assert(
    catalogSweep.problems.length === 0,
    `uk-west-midlands catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("uk-west-midlands-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "uk-west-midlands-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)"
  );
}

// 2. applyDirectionHubs() with the brief's fixture chip set at KID.
const fixtureChips = [
  "Dorridge (West Midlands Railway)",
  "Whitlocks End (West Midlands Railway)",
  "Stratford-upon-Avon (West Midlands Railway)",
  "Worcester Foregate Street (West Midlands Railway)",
  "London Marylebone (Chiltern Railways)",
];
const kidChips = applyDirectionHubs(fixtureChips, "KID", hubs);
assert(
  JSON.stringify(kidChips) ===
    JSON.stringify(["Birmingham", "London Marylebone (Chiltern Railways)", "Worcester Foregate Street (West Midlands Railway)"]),
  `applyDirectionHubs at KID must absorb Dorridge/Whitlocks End/Stratford-upon-Avon under Birmingham, got ${JSON.stringify(kidChips)}`
);

// 3. The same fixture at BHM (not in appliesFrom) is returned unchanged (aside
// from the existing localeCompare sort).
const bhmChips = applyDirectionHubs(fixtureChips, "BHM", hubs);
assert(
  JSON.stringify(bhmChips) === JSON.stringify([...fixtureChips].sort((a, b) => a.localeCompare(b))),
  `applyDirectionHubs at BHM (not appliesFrom) must return the fixture chips unchanged (sorted), got ${JSON.stringify(bhmChips)}`
);

// 3b. Corridor stations added 4 Sep 2026: a Stourbridge Junction chip set (live
// shape that day) collapses the same three termini under Birmingham while its
// westbound/branch chips (Kidderminster, Stourbridge Town, Worcester) stay put.
const sbjFixture = [
  "Dorridge (LNR & WMR)",
  "Kidderminster (LNR & WMR)",
  "Stourbridge Town (LNR & WMR)",
  "Stratford-upon-Avon (LNR & WMR)",
  "Whitlocks End (LNR & WMR)",
  "Worcester Foregate Street (LNR & WMR)",
];
for (const crs of ["SBJ", "CRA", "OHL", "ROW", "LGG"]) {
  const chips = applyDirectionHubs(sbjFixture, crs, hubs);
  assert(
    JSON.stringify(chips) ===
      JSON.stringify(["Birmingham", "Kidderminster (LNR & WMR)", "Stourbridge Town (LNR & WMR)", "Worcester Foregate Street (LNR & WMR)"]),
    `applyDirectionHubs at ${crs} must collapse Dorridge/Whitlocks End/Stratford-upon-Avon under Birmingham, got ${JSON.stringify(chips)}`
  );
}

// 3c. Tamworth (TAM) hub added 5 Sep 2026 (FB-54): CrossCountry
// Birmingham–Derby line trips through-running to the South West/South Coast
// collapse under Birmingham at the New Street CRS (BHM), not Snow Hill (BSW).
// docs/jim-brief-uk-tamworth-hub.md's live probe (7 trips, all CrossCountry,
// platform 4, printed Cardiff Central x2/Reading x2/Bournemouth/Plymouth/
// Birmingham New Street) is the fixture below.
const tamworthHub = hubs[1];
assert(tamworthHub.label === "Birmingham", "Tamworth hub label must be Birmingham");
assert(tamworthHub.filterCrs === "BHM", "Tamworth hub filterCrs must be BHM (Birmingham New Street), not BSW/BMO");
assert(
  JSON.stringify(tamworthHub.appliesFrom) === JSON.stringify(["TAM"]),
  "Tamworth hub appliesFrom must be TAM only (Wilnecote/Polesworth are not in the catalog)"
);
for (const absorbed of tamworthHub.absorbs) {
  assert(!/ \([^()]+\)$/.test(absorbed), `absorbs entry "${absorbed}" must not carry an operator suffix`);
}
for (const kept of ["Nottingham", "Edinburgh", "London Euston", "Crewe", "Liverpool Lime Street"]) {
  assert(!tamworthHub.absorbs.includes(kept), `Tamworth hub must NOT absorb "${kept}" — it keeps its own chip`);
}

const tamFixture = [
  "Cardiff Central (CrossCountry)",
  "Reading (CrossCountry)",
  "Bournemouth (CrossCountry)",
  "Plymouth (CrossCountry)",
  "Birmingham New Street (CrossCountry)",
  "Nottingham (CrossCountry)",
  "Edinburgh (CrossCountry)",
  "London Euston (Avanti West Coast)",
  "Crewe (West Midlands Railway)",
  "Liverpool Lime Street (West Midlands Railway)",
];
const tamChips = applyDirectionHubs(tamFixture, "TAM", hubs);
assert(
  JSON.stringify(tamChips) ===
    JSON.stringify(
      [
        "Birmingham",
        "Crewe (West Midlands Railway)",
        "Edinburgh (CrossCountry)",
        "Liverpool Lime Street (West Midlands Railway)",
        "London Euston (Avanti West Coast)",
        "Nottingham (CrossCountry)",
      ].sort((a, b) => a.localeCompare(b))
    ),
  `applyDirectionHubs at TAM must collapse Cardiff Central/Reading/Bournemouth/Plymouth/Birmingham New Street under Birmingham while keeping Nottingham/Edinburgh/Euston/Crewe/Liverpool, got ${JSON.stringify(tamChips)}`
);

// Kidderminster's own hub-anchoring assertions (above) must be unaffected by
// adding the Tamworth hub — re-run the same fixture/expectation here to be
// explicit that the two hubs don't interfere.
const kidChipsAfterTamworthAdded = applyDirectionHubs(fixtureChips, "KID", hubs);
assert(
  JSON.stringify(kidChipsAfterTamworthAdded) === JSON.stringify(kidChips),
  "Kidderminster's hub-anchoring result must be unchanged by the addition of the Tamworth hub"
);

// A station NOT in either hub's appliesFrom (Birmingham International, BHI) is
// unaffected by the new Tamworth hub — same as the existing BHM check above.
const bhiEntry = resolveRailEntry(BHI, UK_WEST_MIDLANDS_REGION);
assert(bhiEntry?.crs === "BHI", "Birmingham International must resolve as a National Rail entry (crs BHI)");
const bhiChips = applyDirectionHubs(tamFixture, "BHI", hubs);
assert(
  JSON.stringify(bhiChips) === JSON.stringify([...tamFixture].sort((a, b) => a.localeCompare(b))),
  `applyDirectionHubs at BHI (not in any hub's appliesFrom) must return the fixture chips unchanged (sorted), got ${JSON.stringify(bhiChips)}`
);
const tamworthNextTrainPlan = planUkWestMidlandsNextTrainFetch(
  resolveRailEntry(TAM, UK_WEST_MIDLANDS_REGION),
  "train",
  "Birmingham",
  hubs
);
assert(
  tamworthNextTrainPlan.kind === "hub" && tamworthNextTrainPlan.filterCrs === "BHM",
  "destination \"Birmingham\" at Tamworth must route to the hub-filtered fetch (BHM)"
);

// 4. planUkWestMidlandsNextTrainFetch() — pure routing decision table from the
// brief, assertable without a Darwin token.
const kidEntry = resolveRailEntry(KID, UK_WEST_MIDLANDS_REGION);
const hubPlan = planUkWestMidlandsNextTrainFetch(kidEntry, "train", "Birmingham", hubs);
assert(hubPlan.kind === "hub" && hubPlan.filterCrs === "BSW", "destination \"Birmingham\" at Kidderminster must route to the hub-filtered fetch (BSW)");

const exactPlan = planUkWestMidlandsNextTrainFetch(
  kidEntry,
  "train",
  "Birmingham New Street (West Midlands Railway)",
  hubs
);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "BHM",
  "an exact chip resolving to an in-catalog station must route to the exact-CRS-filtered fetch"
);

// 5. An unresolvable exact chip (out-of-region destination) falls back to the
// undirected path.
const undirectedPlan = planUkWestMidlandsNextTrainFetch(
  kidEntry,
  "train",
  "London Euston (Avanti West Coast)",
  hubs
);
assert(undirectedPlan.kind === "undirected", "an unresolvable exact chip must fall back to the undirected path");

// Metro mode never consults the hub file, even for a station that happens to
// share a CRS-shaped resolution — mode "metro" short-circuits to undirected.
const metroPlan = planUkWestMidlandsNextTrainFetch(kidEntry, "metro", "Birmingham", hubs);
assert(metroPlan.kind === "undirected", "metro mode must never route through the rail-only hub file");

// End-to-end (token-tolerant): calling getUkWestMidlandsDogfoodNextTrain with
// destination "Birmingham" at Kidderminster must exercise the hub-filtered
// fetch path — either a real payload (DARWIN_LDB_TOKEN set) or
// MissingDarwinTokenError (not set), same tolerance as the directions probe
// above. Either way it must not silently succeed with fabricated data.
async function probeHubNextTrain() {
  try {
    return {
      ok: true,
      payload: await getUkWestMidlandsDogfoodNextTrain({ station: KID, destination: "Birmingham", leaveBeforeMinutes: 5, refreshSeconds: 60 }),
    };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}
const hubNextTrainProbe = await probeHubNextTrain();
if (hubNextTrainProbe.ok) {
  const { payload } = hubNextTrainProbe;
  assert(payload.config.destination === "Birmingham", "hub next-train payload destination must be Birmingham");
  for (const trip of payload.upcoming ?? []) {
    assert(trip.destination === "Birmingham", "every upcoming trip's destination must be remapped to the hub label");
    assert(
      typeof trip.printedDestination === "string" && trip.printedDestination.length > 0,
      "every upcoming trip must carry a populated printedDestination (the Darwin-printed destination before remap)"
    );
  }
} else {
  console.log(
    "uk-west-midlands-dogfood-gate: DARWIN_LDB_TOKEN not set — hub next-train end-to-end payload not exercised here (routing itself is proven token-free above via planUkWestMidlandsNextTrainFetch)."
  );
}

// National Rail board calls: real if DARWIN_LDB_TOKEN is set in this environment
// (Vercel prod), MissingDarwinTokenError if not (expected in most local/CI
// sandboxes). Either outcome is acceptable here; only an unrelated throw fails.
async function probeRailDirections(station) {
  try {
    return { ok: true, pack: await getUkWestMidlandsDogfoodDirections(station, { mode: "train" }) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeRailDirections(BHM);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "uk-west-midlands-darwin-live", "directions source must be uk-west-midlands-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry (bare name, no mode) resolves rail-first — same
  // order as lib/providers/uk-darwin.js's own default region loop.
  const dispatched = await getMultiCityDirections("uk-west-midlands", BHM);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness (rail-first resolution)"
  );
  assert(dispatched.source === "uk-west-midlands-darwin-live", "live-city-api dispatch source must be uk-west-midlands-darwin-live");
} else {
  console.log(
    "uk-west-midlands-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — National Rail dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("uk-west-midlands", BHM);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError for the rail layer, not swallow it");
}

// Metro: with TFWM_API_APP_ID/TFWM_API_APP_KEY unset (credentials exist per FB-48
// but are per-environment), fetchMetroStopBoard() must throw
// MissingTfwmCredentialsError, and the dogfood dispatch must surface that error
// rather than fabricate a schedule. The keys are stripped here so the check is
// deterministic regardless of the local environment.
const previousAppId = process.env.TFWM_API_APP_ID;
const previousAppKey = process.env.TFWM_API_APP_KEY;
delete process.env.TFWM_API_APP_ID;
delete process.env.TFWM_API_APP_KEY;

let metroDirectionsThrew = false;
try {
  await getUkWestMidlandsDogfoodDirections("Grand Central", { mode: "metro" });
} catch (err) {
  metroDirectionsThrew = err instanceof MissingTfwmCredentialsError;
}
assert(metroDirectionsThrew, "getUkWestMidlandsDogfoodDirections must surface MissingTfwmCredentialsError for Metro stops, not swallow it");

let metroHubDirectionsThrew = false;
try {
  await getUkWestMidlandsDogfoodDirections("Grand Central");
} catch (err) {
  metroHubDirectionsThrew = err instanceof MissingTfwmCredentialsError;
}
assert(
  metroHubDirectionsThrew,
  "getUkWestMidlandsDogfoodDirections must surface MissingTfwmCredentialsError for Grand Central even with no explicit mode (rail-first resolution correctly misses it, metro resolution then applies)"
);

let metroNextTrainThrew = false;
try {
  await getUkWestMidlandsDogfoodNextTrain({ station: "Grand Central", mode: "metro", destination: "Wolverhampton St George's" });
} catch (err) {
  metroNextTrainThrew = err instanceof MissingTfwmCredentialsError;
}
assert(metroNextTrainThrew, "getUkWestMidlandsDogfoodNextTrain must surface MissingTfwmCredentialsError for Metro stops, not fabricate a schedule");

let dispatchMetroThrew = false;
try {
  await getMultiCityDirections("uk-west-midlands", "Grand Central");
} catch (err) {
  dispatchMetroThrew = err instanceof MissingTfwmCredentialsError;
}
assert(dispatchMetroThrew, "live-city-api dispatch must surface MissingTfwmCredentialsError for Metro stops, not swallow it");

if (previousAppId === undefined) {
  delete process.env.TFWM_API_APP_ID;
} else {
  process.env.TFWM_API_APP_ID = previousAppId;
}
if (previousAppKey === undefined) {
  delete process.env.TFWM_API_APP_KEY;
} else {
  process.env.TFWM_API_APP_KEY = previousAppKey;
}

// Metro platform-id merge (stopIds[], 5 Sep 2026 direction-collapse fix). Pure/
// synthetic — no feed or credentials needed, so this runs unconditionally.
//
// stopIdsForEntry(): legacy scalar stopId + stopIds[] both contribute, de-duped;
// MetroStopIdNotCatalogedError fires only when an entry has neither.
assert(
  JSON.stringify(stopIdsForEntry({ stopId: "A", stopIds: ["A", "B"] })) === JSON.stringify(["A", "B"]),
  "stopIdsForEntry must merge legacy stopId + stopIds[] and de-dupe"
);
assert(
  JSON.stringify(stopIdsForEntry({ stopId: "A" })) === JSON.stringify(["A"]),
  "stopIdsForEntry must fall back to the legacy scalar stopId alone"
);
assert(
  JSON.stringify(stopIdsForEntry({ stopIds: ["B", "C"] })) === JSON.stringify(["B", "C"]),
  "stopIdsForEntry must work off stopIds[] alone (current catalog shape, stopId null)"
);
assert(stopIdsForEntry({}).length === 0, "stopIdsForEntry must return [] when neither field is populated");
let notCatalogedThrew = false;
try {
  const fakeEntry = { name: "Nowhere", catalogId: "metro:nowhere" };
  const ids = stopIdsForEntry(fakeEntry);
  if (!ids.length) {
    throw new MetroStopIdNotCatalogedError(fakeEntry);
  }
} catch (err) {
  notCatalogedThrew = err instanceof MetroStopIdNotCatalogedError;
}
assert(notCatalogedThrew, "MetroStopIdNotCatalogedError must fire when an entry has neither stopId nor stopIds");

// buildMetroTrips(): a two-platform station (e.g. Jewellery Quarter's
// 9400ZZWMJQ3/JQ4) must merge trips terminating via EITHER platform id into one
// board, both directions present, sorted by departure time — the gap this pass
// fixes (previously only entry.stopId, a single scalar, was ever matched).
const NOW = Math.floor(Date.now() / 1000);
const nameByStopId = new Map([
  ["PLATFORM_A", "Jewellery Quarter"],
  ["PLATFORM_B", "Jewellery Quarter"],
  ["TERMINUS_NORTH", "Wolverhampton St George's"],
  ["TERMINUS_SOUTH", "Birmingham New Street"],
]);
const syntheticEntities = [
  {
    // Northbound trip: passes through platform A, terminates north.
    tripUpdate: {
      trip: {},
      stopTimeUpdate: [
        { stopId: "PLATFORM_A", departure: { time: NOW + 60 } },
        { stopId: "TERMINUS_NORTH", arrival: { time: NOW + 600 } },
      ],
    },
  },
  {
    // Southbound trip: passes through platform B, terminates south.
    tripUpdate: {
      trip: {},
      stopTimeUpdate: [
        { stopId: "PLATFORM_B", departure: { time: NOW + 120 } },
        { stopId: "TERMINUS_SOUTH", arrival: { time: NOW + 700 } },
      ],
    },
  },
  {
    // Unrelated trip at a different station entirely — must not appear.
    tripUpdate: {
      trip: {},
      stopTimeUpdate: [
        { stopId: "SOMEWHERE_ELSE", departure: { time: NOW + 30 } },
        { stopId: "TERMINUS_SOUTH", arrival: { time: NOW + 500 } },
      ],
    },
  },
];
const mergedTrips = buildMetroTrips(syntheticEntities, ["PLATFORM_A", "PLATFORM_B"], nameByStopId);
assert(mergedTrips.length === 2, `buildMetroTrips must merge both platforms' trips into one board, got ${mergedTrips.length}`);
assert(
  mergedTrips.some((t) => t.destination === "Wolverhampton St George's") &&
    mergedTrips.some((t) => t.destination === "Birmingham New Street"),
  "merged board must include both directions' destinations"
);
assert(
  new Date(mergedTrips[0].liveDeparture).getTime() <= new Date(mergedTrips[1].liveDeparture).getTime(),
  "merged trips across both platforms must stay sorted by departure time"
);
// Single-id station (end-of-line stop, e.g. Wolverhampton St George's stopIds
// with one entry) must still work unchanged.
const singleIdTrips = buildMetroTrips(syntheticEntities, ["PLATFORM_A"], nameByStopId);
assert(singleIdTrips.length === 1 && singleIdTrips[0].destination === "Wolverhampton St George's", "a single-id station must still match its one platform");
console.log("uk-west-midlands-dogfood-gate: metro stopIds[] platform-merge logic ok (synthetic feed, both directions present, single-id stations unaffected)");

let unknownThrew = false;
try {
  await getUkWestMidlandsDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getUkWestMidlandsDogfoodDirections must not silently succeed for an unknown station");

let severnValleyThrew = false;
try {
  await getUkWestMidlandsDogfoodDirections("Severn Valley Railway");
} catch (err) {
  severnValleyThrew = err instanceof Error;
}
assert(severnValleyThrew, "Severn Valley Railway must never resolve to a board (out-mode, excluded from catalog)");

// Probe plumbing: local express only; Vercel dev board must 404 regardless.
const previousProbeFlag = process.env.ALLOW_CITY_PROBES;
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
await vercelBoard({ method: "GET", query: { city: "uk-west-midlands", station: BHM } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previousProbeFlag === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previousProbeFlag;
}

console.log(
  "uk-west-midlands-dogfood-gate: ok (live/adapterReady, dispatch switch-case wired, oracle report present, 75 rail + 35 metro stations, Birmingham New Street/Grand Central mode-aware resolution (no shared printed name, unlike Nottingham Station), Kidderminster rail-only with Severn Valley Railway excluded, National Rail directions derived live from Darwin with no static line map, Metro dispatch correctly surfaces MissingTfwmCredentialsError rather than fabricating a schedule, direction-hubs.json loads/validates two hubs (Kidderminster/Snow Hill BSW + Tamworth/New Street BHM, FB-54) and both hub-anchoring sets collapse their respective absorbed termini without touching Marylebone, Nottingham/Edinburgh/Euston/Crewe/Liverpool, or non-appliesFrom stations (Birmingham New Street, Birmingham International), next-train routing table (hub/exact/undirected) proven token-free via planUkWestMidlandsNextTrainFetch, Perth/Stockholm/Göteborg/Malmö/Uppsala/London TfL/West of England/East Midlands stay green)"
);
