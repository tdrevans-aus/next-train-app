/**
 * South Wales adapter/dispatch wiring gate. Replaces
 * south-wales-planned-gate.mjs (retired) — South Wales is `status: "live"`
 * (flip PR #262), and this gate now covers the 7 Sep 2026 re-scope from a
 * 2-station to a 16-station catalog (docs/south-wales-d1/jim-handoff.md).
 * Per CLAUDE.md's flip-follow-through split (added 30 Aug 2026, corrected
 * same day): the dogfood module, the live-city-api.js dispatch
 * switch-cases, and this gate are safe to land ahead of/alongside a flip
 * because production routes gate on assertCityLive() first, not on
 * MULTI_CITY_IDS membership — and this region is already flipped, so no
 * such caveat even applies here any more.
 *
 * DARWIN_LDB_TOKEN is live (since 2 Sep 2026, PR #230). This gate stays
 * token-tolerant throughout: with a token it exercises real Darwin calls
 * (16 cheap numRows=1 CRS-sweep calls plus a couple of real boards);
 * without one every live-probing section degrades to
 * MissingDarwinTokenError assertions instead of a throw/skip.
 *
 * Transport for Wales Valley Lines is now IN-CATALOG via Darwin (confirmed
 * live-probed 5 Sep 2026, all 16 catalog CRS codes) — this gate asserts
 * Valley Lines termini (Pontypridd, Merthyr Tydfil, Aberdare, Treherbert,
 * Rhymney, Caerphilly) DO resolve, and that the region's western boundary
 * (Llanelli/Carmarthen, Rest of Wales's stations per
 * docs/united-kingdom-ledger.md SS2) do NOT resolve here.
 *
 * Direction model has no printed line/route map for mainline (destination
 * + operator, derived live from the board — see
 * lib/cities/south-wales/dogfood-next-train.js file header and
 * docs/south-wales-d1/direction-model-memo.md); Valley Lines is line +
 * terminus, termini-only. Like every other National Rail-only region this
 * gate asserts the live-derivation shape and the dispatch wiring rather
 * than a static marketing-directions.js chip list.
 *
 * Usage: node qa/south-wales-dogfood-gate.mjs
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
  SOUTH_WALES_HUB,
  SOUTH_WALES_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
} from "../lib/providers/south-wales.js";
import {
  listSouthWalesDogfoodStations,
  getSouthWalesDogfoodDirections,
  getSouthWalesDogfoodNextTrain,
  planSouthWalesNextTrainFetch,
} from "../lib/cities/south-wales/dogfood-next-train.js";
import { loadDirectionHubs } from "../lib/cities/uk/direction-hubs.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other
// live city (the pattern that caused the Helsinki-contamination bug, see the
// retired south-wales-planned-gate.mjs). Perth green is enough.
const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

// Registry identity.
const live = assertCityLive("south-wales");
assert(live?.ok === true, "assertCityLive(south-wales) must pass — status is live");

const entry = getCity("south-wales");
assert(entry?.status === "live", "south-wales registry status must be live");
assert(entry?.displayName === "South Wales", "south-wales display name must be South Wales");
assert(entry?.timeZone === "Europe/London", "south-wales timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "south-wales").length === 1,
  "south-wales must appear once in the registry"
);
for (const forbiddenId of ["southwales", "cardiff", "valley-lines", "valleylines", "wales"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dispatch switch-cases and MULTI_CITY_IDS membership are both wired (flip commit).
assert(isMultiCity("south-wales") === true, "south-wales must be in MULTI_CITY_IDS (live flip)");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/south-wales-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/south-wales-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "south-wales", "D1 city id is south-wales");
assert(
  network.printedInnerCityNames?.lock === SOUTH_WALES_HUB,
  `D1 lock must be ${SOUTH_WALES_HUB}`
);
assert(network.printedInnerCityNames?.lockCrs === "CDF", "D1 lock CRS must be CDF");
assert(
  network.printedInnerCityNames?.secondaryHub === "Cardiff Queen Street",
  "D1 secondary hub must be Cardiff Queen Street"
);
assert(network.printedInnerCityNames?.secondaryHubCrs === "CDQ", "D1 secondary hub CRS must be CDQ");

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(SOUTH_WALES_REGION);
assert(region?.railCount === 16, `south-wales rail count must be 16, got ${region?.railCount}`);
assert(region?.metroCount === 0, `south-wales must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "south-wales must be train-only in regions.json"
);

const EXPECTED_CRS = [
  "CDF",
  "CDQ",
  "PPD",
  "NWP",
  "SWA",
  "BGN",
  "BYI",
  "PEN",
  "CPH",
  "MER",
  "ABA",
  "TRB",
  "RHY",
  "NTH",
  "PTA",
  "STJ",
];

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of EXPECTED_CRS) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(
  railCrs.size === EXPECTED_CRS.length,
  `south-wales catalog must carry exactly ${EXPECTED_CRS.length} distinct CRS codes, got ${railCrs.size}`
);
assert(getNotInRegion(SOUTH_WALES_REGION).length === 0, "south-wales has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 16, `combined catalog must have 16 stations (train only), got ${allStations.length}`);

// Hub + secondary hub, no doNotGroup — both resolve as distinct catalog entries.
const hub = resolveCatalogEntry(SOUTH_WALES_HUB);
assert(hub?.crs === "CDF", "Cardiff Central must resolve with crs CDF");
const secondaryHub = resolveCatalogEntry("Cardiff Queen Street");
assert(secondaryHub?.crs === "CDQ", "Cardiff Queen Street must resolve with crs CDQ — own catalog entry, own board");
assert(resolveCatalogEntry("Cardiff") === null, "the marketing token 'Cardiff' must never resolve as a station");
assert(resolveCatalogEntry("Cardiff Bay") === null, "Cardiff Bay must never resolve — ambiguous alias, not a real station");

// Valley Lines termini and local station now resolve — in catalog via Darwin.
for (const name of ["Pontypridd", "Merthyr Tydfil", "Aberdare", "Treherbert", "Rhymney", "Caerphilly"]) {
  assert(resolveCatalogEntry(name) !== null, `${name} (Valley Lines) must resolve — in-catalog via Darwin per the 7 Sep 2026 re-scope`);
}

// Swansea is the catalogued western boundary; Llanelli/Carmarthen stay Rest of Wales.
const swansea = resolveCatalogEntry("Swansea");
assert(swansea?.crs === "SWA", "Swansea must resolve with crs SWA — western boundary of South Wales");
assert(resolveCatalogEntry("Llanelli") === null, "Llanelli must NOT resolve — Rest of Wales's station per the ledger SS2 stop ownership");
assert(resolveCatalogEntry("Carmarthen") === null, "Carmarthen must NOT resolve — Rest of Wales's station per the ledger SS2 stop ownership");

// D1 pack records Valley Lines as in-catalog now, not "not built".
assert(
  network.transportForWalesValleyLines?.status === "in catalog as of this rescope",
  "D1 pack must record Valley Lines as in-catalog as of the re-scope"
);

// No direction-hubs.json for this region (no hub candidate identified) — the
// shared helper must still degrade to an empty, no-op hub list.
assert(
  !existsSync(join(ROOT, "lib/cities/south-wales/direction-hubs.json")),
  "south-wales must not ship a direction-hubs.json — no hub candidate identified in the D1 pack"
);
const { hubs: swHubs } = loadDirectionHubs(SOUTH_WALES_REGION);
assert(swHubs.length === 0, `south-wales must have zero configured hubs, got ${swHubs.length}`);

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listSouthWalesDogfoodStations();
assert(dogfoodStations.length === 16, `dogfood stations must be the 16 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(SOUTH_WALES_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodNames.has("Cardiff Queen Street"), "secondary hub must be listed by the dogfood harness");
assert(dogfoodNames.has("Severn Tunnel Junction"), "Severn Tunnel Junction must be listed by the dogfood harness");
assert(dogfoodNames.has("Swansea"), "Swansea must be listed by the dogfood harness");
for (const row of dogfoodStations) {
  assert(typeof row.lat === "number" && typeof row.lng === "number", `${row.name} must carry real lat/lng, not null`);
}

// planSouthWalesNextTrainFetch() — pure routing decision table, token-free.
const cdfEntry = resolveCatalogEntry(SOUTH_WALES_HUB);
const stjEntry = resolveCatalogEntry("Severn Tunnel Junction");

// No hub configured anywhere in this catalog — "hub" must never fire.
const noHubPlan = planSouthWalesNextTrainFetch(stjEntry, "Cardiff Central (GWR)", swHubs);
assert(noHubPlan.kind !== "hub", "planSouthWalesNextTrainFetch must never return 'hub' — no hub is configured for south-wales");

// The exact-chip path must fire for a destination whose station is in this
// region's own catalog.
const exactPlan = planSouthWalesNextTrainFetch(stjEntry, "Cardiff Central (GWR)", swHubs);
assert(
  exactPlan.kind === "exact" && exactPlan.filterCrs === "CDF",
  `planSouthWalesNextTrainFetch at Severn Tunnel Junction for Cardiff Central must be an exact plan filtered to CDF, got ${JSON.stringify(exactPlan)}`
);

// The exact-chip path must also fire via the national rail-crs-index
// fallback for an out-of-region terminus (e.g. London Paddington).
const nationalExactPlan = planSouthWalesNextTrainFetch(cdfEntry, "London Paddington (GWR)", swHubs);
assert(
  nationalExactPlan.kind === "exact" && nationalExactPlan.filterCrs === "PAD",
  `planSouthWalesNextTrainFetch at Cardiff Central for London Paddington must be an exact plan filtered to PAD, got ${JSON.stringify(nationalExactPlan)}`
);

const undirectedPlan = planSouthWalesNextTrainFetch(cdfEntry, "Nowhere (X)", swHubs);
assert(
  undirectedPlan.kind === "undirected",
  `planSouthWalesNextTrainFetch for an unresolvable destination must be undirected, got ${JSON.stringify(undirectedPlan)}`
);

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment, else
// MissingDarwinTokenError. Either outcome is acceptable here; only an
// unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getSouthWalesDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(SOUTH_WALES_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "south-wales-darwin-live", "directions source must be south-wales-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The dispatch switch-case still returns the same live-derived chips.
  const dispatched = await getMultiCityDirections("south-wales", SOUTH_WALES_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "south-wales-darwin-live", "live-city-api dispatch source must be south-wales-darwin-live");

  // End-to-end next-train, with token: trips must carry printedDestination.
  const firstChip = hubProbe.pack.directions[0];
  if (firstChip) {
    const nextTrain = await getSouthWalesDogfoodNextTrain({
      station: SOUTH_WALES_HUB,
      destination: firstChip,
      leaveBeforeMinutes: 5,
      refreshSeconds: 60,
    });
    assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");
    for (const trip of nextTrain.upcoming ?? []) {
      assert(typeof trip.printedDestination === "string" && trip.printedDestination.length > 0, "next-train trips must carry printedDestination");
    }

    // Same call through the live-city-api dispatch, end to end.
    const dispatchedNextTrain = await getMultiCityNextTrain("south-wales", {
      station: SOUTH_WALES_HUB,
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
    "south-wales-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("south-wales", SOUTH_WALES_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// Full-catalog CRS -> Darwin stationName sweep (per the greater-anglia
// dogfood gate pattern, itself copied from qa/uk-west-midlands-dogfood-gate.mjs
// — the wrong-code defect class this catches). Token-tolerant; 16 cheap
// numRows=1 calls when the token is present.
function normaliseStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}
async function sweepCatalogCrsNames() {
  const problems = [];
  for (const stationEntry of listRailStations(SOUTH_WALES_REGION)) {
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
    `south-wales catalog CRS codes must resolve at Darwin to the catalogued station:\n  ${catalogSweep.problems.join("\n  ")}`
  );
  console.log("south-wales-dogfood-gate: catalog CRS sweep ok (every rail crs resolves at Darwin to its catalogued name)");
} else {
  console.log(
    "south-wales-dogfood-gate: DARWIN_LDB_TOKEN not set — catalog CRS/Darwin-stationName sweep not exercised here (run with the token before trusting any catalog change)."
  );
}

let unknownThrew = false;
try {
  await getSouthWalesDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
assert(unknownThrew, "getSouthWalesDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "south-wales", station: SOUTH_WALES_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "south-wales-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired, D1 pack, 16 rail-only stations incl. Valley Lines, hub CDF + secondary hub CDQ both resolve with no doNotGroup, Swansea boundary, Llanelli/Carmarthen do not resolve, no hub configured (helper degrades to no-op), directions derived live from Darwin with no static line map, catalog CRS sweep, routing table (exact/undirected) proven token-free, Perth stays green)"
);
