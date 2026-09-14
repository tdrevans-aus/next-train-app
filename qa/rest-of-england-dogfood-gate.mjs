/**
 * Rest of England adapter/dispatch wiring gate. New region, UK station fill
 * phase 2b (14 Sep 2026, docs/jim-brief-uk-station-fill-phase2b.md). Rest
 * of England STAYS `status: "planned"` here — this is the pre-flip dogfood
 * wiring pass, same "safe ahead of the flip" property as every other UK
 * region: production routes gate on assertCityLive() first, not on
 * MULTI_CITY_IDS membership. Rest of England is deliberately NOT added to
 * MULTI_CITY_IDS, brisbane-dogfood.js's mount/available map, or
 * journey-model.js's persisted-city/country lists here — those three
 * list-membership edits are Mark's flip commit, not this one
 * (qa/live-city-lists-sync.mjs enforces that they equal the registry's
 * live set).
 *
 * NO D1 PACK: unlike every other UK region, Rest of England was not built
 * from a Nico oracle report / Luke hazard-pack pipeline. It is an internal
 * catch-all assembled directly from docs/uk-station-fill/unassigned-
 * england.md (436 English National Rail stations UK station fill phase
 * 2a's fifteen named regions did not claim) — there is no
 * docs/rest-of-england-d1/ directory and this gate does not look for one.
 *
 * NINE STATIONS HELD BACK, NOT HERE: this gate asserts Altrincham, Eccles,
 * Manchester Airport, Rochdale, Brockley Whins, East Boldon, Heworth,
 * Manors and Seaburn are NOT in this catalog — they were catalogued
 * instead in greater-manchester/north-east with an explicit doNotGroup
 * pair (see those regions' own dogfood gates and marketing-directions.js
 * DO_NOT_GROUP_PAIRS).
 *
 * DARWIN_LDB_TOKEN gates every UK region equally. This gate stays
 * token-tolerant throughout: with a token it exercises real Darwin calls
 * (five numRows=1 live probes spread across the country); without one
 * every live-probing section degrades to MissingDarwinTokenError
 * assertions instead of a throw/skip.
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/rest-of-england/
 * dogfood-next-train.js file header), so like every other National
 * Rail-only region this gate asserts the live-derivation shape and the
 * dispatch wiring rather than a static marketing-directions.js chip list.
 *
 * Usage: node qa/rest-of-england-dogfood-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import { MissingDarwinTokenError, fetchDepartureBoard } from "../lib/providers/uk-darwin.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  REST_OF_ENGLAND_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
} from "../lib/providers/rest-of-england.js";
import {
  listRestOfEnglandDogfoodStations,
  getRestOfEnglandDogfoodDirections,
  getRestOfEnglandDogfoodNextTrain,
  planRestOfEnglandNextTrainFetch,
} from "../lib/cities/rest-of-england/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

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

// Registry identity — STAYS planned here (Mark/Tim's flip call).
const live = assertCityLive("rest-of-england");
assert(live?.ok === false, "assertCityLive(rest-of-england) must fail — status stays planned");

const entry = getCity("rest-of-england");
assert(entry?.status === "planned", "rest-of-england registry status must stay planned");
assert(entry?.adapterReady === true, "rest-of-england adapterReady must be true");
assert(entry?.displayName === "Rest of England", "rest-of-england display name must be Rest of England");
assert(entry?.timeZone === "Europe/London", "rest-of-england timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "rest-of-england").length === 1,
  "rest-of-england must appear once in the registry"
);
for (const forbiddenId of ["england", "uk-england", "rest-england", "rest-of-uk"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases are wired ahead of the flip; MULTI_CITY_IDS membership is not.
assert(isMultiCity("rest-of-england") === false, "rest-of-england must NOT be in MULTI_CITY_IDS yet (Mark's flip commit)");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(REST_OF_ENGLAND_REGION);
assert(region?.railCount === 436, `rest-of-england rail count must be 436 (UK station fill phase 2b, 14 Sep 2026), got ${region?.railCount}`);
assert(region?.metroCount === 0, `rest-of-england must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "rest-of-england must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
assert(railCrs.size === 436, `rest-of-england catalog must carry exactly 436 distinct CRS codes, got ${railCrs.size}`);
assert(getNotInRegion(REST_OF_ENGLAND_REGION).length === 0, "rest-of-england has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 436, `combined catalog must have 436 stations (train only, UK station fill phase 2b), got ${allStations.length}`);

// No hub lock, no corridor grouping — every catalogued station resolves flat.
const adisham = resolveCatalogEntry("Adisham");
assert(adisham?.crs === "ADM", "Adisham must resolve as its own catalog entry");
const bournemouth = resolveCatalogEntry("Bournemouth");
assert(bournemouth?.crs === "BMH", "Bournemouth must resolve as its own catalog entry");

// Nine stations held back — NOT catalogued here, they belong to
// greater-manchester/north-east with an explicit doNotGroup pair instead.
for (const name of [
  "Altrincham",
  "Eccles",
  "Manchester Airport",
  "Rochdale",
  "Brockley Whins",
  "East Boldon",
  "Heworth",
  "Manors",
  "Seaburn",
]) {
  assert(
    resolveCatalogEntry(name) === null,
    `${name} must never resolve in rest-of-england — held back to its own Metro/Metrolink-colliding region instead`
  );
}

// No direction-hubs.json for this region (no anchoring candidate, and no
// coherent corridor to anchor from — this is a flat nationwide catch-all) —
// the shared helper must still degrade to an empty, no-op hub list.
const { hubs: roeHubs } = loadDirectionHubs(REST_OF_ENGLAND_REGION);
assert(roeHubs.length === 0, `rest-of-england must have zero configured hubs, got ${roeHubs.length}`);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listRestOfEnglandDogfoodStations();
assert(dogfoodStations.length === 436, `dogfood stations must be the 436 catalog entries, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has("Adisham"), "Adisham must be listed by the dogfood harness");
assert(dogfoodNames.has("York"), "York must be listed by the dogfood harness");

// planRestOfEnglandNextTrainFetch() — pure routing decision table, token-free.
const admEntry = resolveCatalogEntry("Adisham");
const bmhEntry = resolveCatalogEntry("Bournemouth");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planRestOfEnglandNextTrainFetch(admEntry, "Bournemouth (SWR)", roeHubs);
assert(noHubPlan.kind !== "hub", "planRestOfEnglandNextTrainFetch must never return 'hub' — no hub is configured for rest-of-england");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planRestOfEnglandNextTrainFetch(admEntry, "Bournemouth (SWR)", roeHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "BMH",
  `planRestOfEnglandNextTrainFetch at Adisham for Bournemouth must be an exact plan filtered to BMH, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. Manchester Piccadilly).
const nationalExactPlan = planRestOfEnglandNextTrainFetch(bmhEntry, "Manchester Piccadilly (Avanti West Coast)", roeHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "MAN",
  `planRestOfEnglandNextTrainFetch at Bournemouth for Manchester Piccadilly must be an exact plan filtered to MAN, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planRestOfEnglandNextTrainFetch(admEntry, "Nowhere (X)", roeHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planRestOfEnglandNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getRestOfEnglandDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections("York");
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "rest-of-england-darwin-live", "directions source must be rest-of-england-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The dispatch switch-case (not yet gated by MULTI_CITY_IDS) still returns
  // the same live-derived chips — this is exactly the "safe ahead of the
  // flip" property the brief relies on.
  const dispatched = await getMultiCityDirections("rest-of-england", "York");
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "rest-of-england-darwin-live", "live-city-api dispatch source must be rest-of-england-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getRestOfEnglandDogfoodNextTrain({
      station: "York",
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("rest-of-england", {
      station: "York",
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
    "rest-of-england-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("rest-of-england", "York");
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Live probe of five stations spread across the country (brief's acceptance
// criteria), token-tolerant. Cheap numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function probeFiveAcrossCountry() {
  const sample = [
    { name: "Adisham", crs: "ADM" }, // Kent, south east
    { name: "Bournemouth", crs: "BMH" }, // Dorset, south coast
    { name: "Workington", crs: "WKG" }, // Cumbria coast, north west
    { name: "York", crs: "YRK" }, // Yorkshire, north
    { name: "Barnetby", crs: "BTB" }, // Lincolnshire, east midlands boundary
  ];
  const problems = [];
  for (const stationEntry of sample) {
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
const fiveStationSweep = await probeFiveAcrossCountry();
if (fiveStationSweep.ok) {
  assert(
    fiveStationSweep.problems.length === 0,
    `rest-of-england five-station spread sweep must resolve at Darwin to the catalogued station:\n  ${fiveStationSweep.problems.join("\n  ")}`
  );
  console.log("rest-of-england-dogfood-gate: five-station spread live probe ok (Adisham/Bournemouth/Workington/York/Barnetby all resolve at Darwin)");
} else {
  console.log(
    "rest-of-england-dogfood-gate: DARWIN_LDB_TOKEN not set — five-station spread live probe not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getRestOfEnglandDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getRestOfEnglandDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "rest-of-england", station: "York" } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "rest-of-england-dogfood-gate: ok (still planned/adapterReady, NOT in MULTI_CITY_IDS yet, dispatch switch-cases wired ahead of flip, no D1 pack (built directly from docs/uk-station-fill/unassigned-england.md), 436 rail-only stations, no hub lock/no corridor grouping, nine held-back stations confirmed absent (Altrincham/Eccles/Manchester Airport/Rochdale/Brockley Whins/East Boldon/Heworth/Manors/Seaburn), no hub configured (helper degrades to no-op), directions derived live from Darwin with no static line map, five-station spread live probe (Adisham/Bournemouth/Workington/York/Barnetby), routing table (exact/undirected) proven token-free, Perth stays green)"
);
