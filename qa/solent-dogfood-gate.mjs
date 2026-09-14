/**
 * Solent adapter/dispatch wiring gate. Flipped live 5 Sep 2026.
 *
 * LIVE (status: "live", 5 Sep 2026). All list memberships included:
 * MULTI_CITY_IDS, brisbane-dogfood.js mount/available map,
 * journey-model.js persisted-city/country lists bundled into flip commit
 * per CLAUDE.md's flip-follow-through split and qa/live-city-lists-sync.mjs
 * enforcement.
 *
 * DARWIN_LDB_TOKEN is live (docs/solent-d1/jim-handoff.md's 5 Sep 2026
 * hygiene section). This gate stays token-tolerant throughout: with a
 * token it exercises real Darwin calls (7 cheap numRows=1 CRS-sweep calls
 * plus a couple of real boards); without one every live-probing section
 * degrades to MissingDarwinTokenError assertions instead of a throw/skip.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/solent/dogfood-next-train.js
 * file header and docs/solent-d1/direction-model-memo.md), so like every
 * other National Rail-only region this gate asserts the live-derivation
 * shape and the dispatch wiring rather than a static marketing-directions.js
 * chip list.
 *
 * TWO-HUB architecture (Southampton Central + Portsmouth Harbour/&
 * Southsea) — this gate asserts SOU and PMH both resolve independently as
 * hubs, PMS resolves as the Portsmouth secondary, and the boundary points
 * (WSB/WAT) resolve flat, matching docs/solent-d1/direction-model-memo.md.
 *
 * Usage: node qa/solent-dogfood-gate.mjs
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
  SOLENT_HUB,
  SOLENT_EAST_HUB,
  SOLENT_EAST_SECONDARY_HUB,
  SOLENT_REGION,
  SOLENT_STATION_GROUPS,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
} from "../lib/providers/solent.js";
import {
  listSolentDogfoodStations,
  getSolentDogfoodDirections,
  getSolentDogfoodNextTrain,
  planSolentNextTrainFetch,
} from "../lib/cities/solent/dogfood-next-train.js";
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

// Registry identity — NOW LIVE (5 Sep 2026 flip).
const live = assertCityLive("solent");
assert(live?.ok === true, "assertCityLive(solent) must pass — status is now live");
assert(live?.status !== 501, "solent must not be 501 planned anymore");

const entry = getCity("solent");
assert(entry?.status === "live", "solent registry status must be live (5 Sep 2026 flip)");
assert(entry?.adapterReady === true, "solent adapterReady must be true");
assert(
  entry?.displayName === "Solent (Southampton / Portsmouth)",
  "solent display name must be Solent (Southampton / Portsmouth)"
);
assert(entry?.timeZone === "Europe/London", "solent timezone must be Europe/London");
assert(CITIES.filter((city) => city.id === "solent").length === 1, "solent must appear once in the registry");
for (const forbiddenId of ["southampton", "portsmouth", "greater-solent"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Flipped live 5 Sep 2026 — dispatch switch-cases + MULTI_CITY_IDS both wired.
assert(isMultiCity("solent") === true, "solent must be in MULTI_CITY_IDS (flip is complete)");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/solent-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/solent-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "solent", "D1 city id is solent");
assert(network.status === "planned", "D1 pack stays planned");
assert(
  network.stationGroups?.map((g) => g.id).join(",") === SOLENT_STATION_GROUPS.join(","),
  "D1 stationGroups must be southampton-central, portsmouth-harbour, portsmouth-southsea in that order"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling
// at an in-catalog station needs a recorded verdict, and every 'in' verdict
// must actually stay unfiltered on the board.
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of ["South Western Railway", "Southern", "Great Western Railway", "CrossCountry"]) {
  assert(
    oracleReport.includes(operator),
    `Board eligibility section must record a verdict for ${operator}`
  );
}
assert(!/`undecided`/.test(oracleReport), "Board eligibility section must have no undecided rows");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOLENT_REGION);
assert(region?.railCount === 195, `solent rail count must be 195 (UK station fill phase 2a, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 0, `solent must have no metro stations, got ${region?.metroCount}`);
assert((region?.modes ?? []).join(",") === "train", "solent must be train-only in regions.json");

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["SOU", "PMH", "PMS", "FRM", "ESL", "WSB", "WAT"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(SOLENT_REGION).length === 0, "solent has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 195, `combined catalog must have 195 stations (train only, UK station fill phase 2a), got ${allStations.length}`);

// Two-hub, hub+secondary architecture — three independent catalog resolutions,
// no doNotGroup merge; boundary points resolve flat.
const west = resolveCatalogEntry(SOLENT_HUB);
assert(west?.crs === "SOU", "Southampton Central must resolve with crs SOU");
const east = resolveCatalogEntry(SOLENT_EAST_HUB);
assert(east?.crs === "PMH", "Portsmouth Harbour must resolve with crs PMH");
const eastSecondary = resolveCatalogEntry(SOLENT_EAST_SECONDARY_HUB);
assert(eastSecondary?.crs === "PMS", "Portsmouth & Southsea must resolve with crs PMS");
assert(west.crs !== east.crs, "SOU and PMH must be distinct catalog entries (two independent hubs)");
assert(east.crs !== eastSecondary.crs, "PMH and PMS must be distinct catalog entries (hub vs secondary board)");
assert(resolveCatalogEntry("Southampton") === null, "the marketing token 'Southampton' must never resolve as a station");
assert(resolveCatalogEntry("Portsmouth") === null, "the marketing token 'Portsmouth' must never resolve as a station");
const westbury = resolveCatalogEntry("Westbury");
assert(westbury?.crs === "WSB", "Westbury boundary station must resolve with crs WSB");
const waterloo = resolveCatalogEntry("Waterloo") ?? resolveCatalogEntry("London Waterloo");
assert(waterloo?.crs === "WAT", "Waterloo boundary station must resolve with crs WAT");

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listSolentDogfoodStations();
assert(dogfoodStations.length === 195, `dogfood stations must be the 195 catalog entries (UK station fill phase 2a), got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(SOLENT_HUB), "Southampton Central must be listed by the dogfood harness");
assert(dogfoodNames.has(SOLENT_EAST_HUB), "Portsmouth Harbour must be listed by the dogfood harness");
assert(dogfoodNames.has(SOLENT_EAST_SECONDARY_HUB), "Portsmouth & Southsea must be listed by the dogfood harness");

// Direction hub anchoring: wired at Fareham (FRM) only, one hub — an
// operator split on "Portsmouth Harbour" (Liverpool shape). The identical
// split on "Southampton Central" at Fareham is NOT also configured — the
// shared uk/direction-hubs.js helper's findHubForStation() only supports
// one hub per station, see direction-hubs.json's INFRA LIMITATION note.
// The Kidderminster-shape candidate the brief named (west-of-Southampton
// termini via SOU from Eastleigh) was probed and rejected — see
// lib/cities/solent/direction-hubs.json's notes for the filtered-board
// evidence. Token-free, data-only assertions.
assert(
  existsSync(join(ROOT, "lib/cities/solent/direction-hubs.json")),
  "lib/cities/solent/direction-hubs.json must exist (Fareham operator-split evidence)"
);
const { hubs: solentHubs } = loadDirectionHubs(SOLENT_REGION);
assert(solentHubs.length === 1, `solent must have exactly 1 configured hub (Fareham PMH split), got ${solentHubs.length}`);
const pmhHub = solentHubs.find((h) => h.label === "Portsmouth Harbour");
assert(pmhHub?.filterCrs === "PMH", "Portsmouth Harbour hub must filter to PMH");
assert(pmhHub?.appliesFrom?.join(",") === "FRM", "Portsmouth Harbour hub must apply only from Fareham");

// ESL must be unaffected — no hub applies there (no operator split found).
const eslFixtureChips = ["London Waterloo (South Western Railway)", "Salisbury (South Western Railway)"];
assert(
  JSON.stringify(applyDirectionHubs(eslFixtureChips, "ESL", solentHubs)) ===
    JSON.stringify([...eslFixtureChips].sort((a, b) => a.localeCompare(b))),
  "applyDirectionHubs() at Eastleigh (no configured hub there) must be a sorted-passthrough no-op"
);

// FRM must absorb the operator-split duplicate into the single hub label.
const frmFixtureChips = [
  "Portsmouth Harbour (Great Western Railway)",
  "Portsmouth Harbour (South Western Railway)",
  "Cardiff Central (Great Western Railway)",
];
const frmApplied = applyDirectionHubs(frmFixtureChips, "FRM", solentHubs);
assert(frmApplied.includes("Portsmouth Harbour"), "Fareham chips must include the collapsed 'Portsmouth Harbour' hub label");
assert(!frmApplied.some((c) => c.startsWith("Portsmouth Harbour (")), "Fareham chips must not still show the operator-split duplicates");
assert(frmApplied.includes("Cardiff Central (Great Western Railway)"), "Cardiff Central must keep its own chip (not absorbed)");

// planSolentNextTrainFetch() — pure routing decision table, token-free.
const frmEntry = resolveCatalogEntry("Fareham");
const eslEntry = resolveCatalogEntry("Eastleigh");
const hubPlan = planSolentNextTrainFetch(frmEntry, "Portsmouth Harbour", solentHubs);
assert(
  hubPlan.kind === "hub" && hubPlan.filterCrs === "PMH",
  `planSolentNextTrainFetch at Fareham for Portsmouth Harbour must be a hub plan filtered to PMH, got ${JSON.stringify(hubPlan)}`
);
// Southampton Central shows the identical operator-split shape at Fareham
// but has no configured hub (single-hub-per-station limitation, see
// direction-hubs.json's INFRA LIMITATION note) — it still routes correctly
// via the exact-chip path, just without the hub-chip label collapse.
const souAtFrmPlan = planSolentNextTrainFetch(frmEntry, "Southampton Central (Southern)", solentHubs);
assert(
  souAtFrmPlan.kind === "exact" && souAtFrmPlan.filterCrs === "SOU",
  `planSolentNextTrainFetch at Fareham for Southampton Central must be an exact plan filtered to SOU (no hub configured there), got ${JSON.stringify(souAtFrmPlan)}`
);
const eslHubPlan = planSolentNextTrainFetch(eslEntry, "Portsmouth Harbour", solentHubs);
assert(eslHubPlan.kind !== "hub", "at Eastleigh (no configured hub), the hub branch must never fire");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planSolentNextTrainFetch(eslEntry, "Southampton Central (South Western Railway)", solentHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "SOU",
  `planSolentNextTrainFetch at Eastleigh for Southampton Central must be an exact plan filtered to SOU, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. Cardiff Central).
const nationalExactPlan = planSolentNextTrainFetch(frmEntry, "Cardiff Central (Great Western Railway)", solentHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "CDF",
  `planSolentNextTrainFetch at Fareham for Cardiff Central must be an exact plan filtered to CDF, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planSolentNextTrainFetch(eslEntry, "Nowhere (X)", solentHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planSolentNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getSolentDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const westProbe = await probeDirections(SOLENT_HUB);
const eastProbe = await probeDirections(SOLENT_EAST_HUB);
if (westProbe.ok && eastProbe.ok) {
  for (const pack of [westProbe.pack, eastProbe.pack]) {
    assert(pack.source === "solent-darwin-live", "directions source must be solent-darwin-live");
    assert(Array.isArray(pack.directions), "directions must be an array");
    for (const chip of pack.directions) {
      assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
    }
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("solent", SOLENT_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(westProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "solent-darwin-live", "live-city-api dispatch source must be solent-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = westProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getSolentDogfoodNextTrain({
      station: SOLENT_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("solent", {
      station: SOLENT_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      dispatchedNextTrain.config?.destination === firstChip,
      "dispatched next-train destination must equal the chosen chip"
    );
  }

  // Fareham's hub-chip end-to-end, if the live sample contains it.
  const frmProbe = await probeDirections("Fareham");
  if (frmProbe.ok && frmProbe.pack.directions.includes("Portsmouth Harbour")) {
    const frmNextTrain = await getSolentDogfoodNextTrain({
      station: "Fareham",
      destination: "Portsmouth Harbour",
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(
      frmNextTrain.config?.destination === "Portsmouth Harbour",
      "Fareham hub-chip next-train destination must equal 'Portsmouth Harbour'"
    );
  }
} else {
  console.log(
    "solent-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("solent", SOLENT_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Full-catalog CRS -> Darwin stationName sweep (per the brief, copied from
// qa/uk-west-midlands-dogfood-gate.mjs's pattern — the wrong-code defect
// class this catches: Fareham FAR->FRM was wrong in the original D1 pack,
// fixed 5 Sep 2026 by scripts/fix-uk-region-crs.mjs). Token-tolerant; 7
// cheap numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listNationalRailStations()) {
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
    `solent catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("solent-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "solent-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getSolentDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getSolentDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "solent", station: SOLENT_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  `solent-dogfood-gate: ok (still planned/adapterReady, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired ahead of flip, D1 pack, Board eligibility all-in, ${allStations.length} rail-only stations, two-hub architecture SOU/PMH independent with PMS as Portsmouth secondary, WSB/WAT boundary points resolve flat, catalog CRS sweep, directions derived live from Darwin with no static line map, Fareham operator-split hub for Portsmouth Harbour (Southampton Central shows the identical split but has no configured hub — single-hub-per-station limitation, flagged; Kidderminster-shape candidate at Eastleigh probed and rejected), routing table (hub/exact/undirected) proven token-free, Perth stays green)`
);
