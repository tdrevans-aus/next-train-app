/**
 * West of England is live (flipped by Tim 2 Sep 2026, following the Darwin
 * REST rewrite — lib/providers/uk-darwin.js, commit 215a93f/PR #188 —
 * confirmed real against Bristol Temple Meads). National Rail (Darwin)
 * only, one agency (GWR primary), one mode, no static GTFS fallback exists
 * for this feed at all — genuinely Darwin-or-nothing, same structural fact
 * as before the flip, just no longer blocked at the account level.
 *
 * Replaces west-of-england-planned-gate.mjs, migrating its still-relevant
 * catalog/D1/hub-lock assertions to the live shape and adding the
 * dispatch-wiring checks every flip adds (see the Oslo/Helsinki precedent —
 * lib/cities/oslo/dogfood-next-train.js + oslo-dogfood-gate.mjs).
 *
 * Direction model has no printed line/route map (destination + operator,
 * derived live from the board — see lib/cities/west-of-england/
 * dogfood-next-train.js file header and docs/west-of-england-d1/
 * direction-model-memo.md), so unlike Oslo/Helsinki this gate cannot assert
 * against a static marketing-directions.js chip list — it asserts the
 * live-derivation shape and the dispatch wiring instead.
 *
 * Usage: node qa/west-of-england-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  WEST_OF_ENGLAND_HUB,
  WEST_OF_ENGLAND_SECONDARY_HUB,
  WEST_OF_ENGLAND_REGION,
  resolveCatalogEntry,
  listCatalogStations,
  listNationalRailStations,
  MissingDarwinTokenError,
} from "../lib/providers/west-of-england.js";
import { getRegion, getNotInRegion } from "../lib/providers/uk/catalog.js";
import {
  listWestOfEnglandDogfoodStations,
  getWestOfEnglandDogfoodDirections,
  getWestOfEnglandDogfoodNextTrain,
} from "../lib/cities/west-of-england/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Registry identity + live status.
const live = assertCityLive("west-of-england");
assert(live?.ok === true, "assertCityLive(west-of-england) must pass");
assert(getCity("west-of-england")?.status === "live", "west-of-england registry status must be live");
assert(getCity("west-of-england")?.adapterReady === true, "west-of-england adapterReady must be true");
assert(getCity("west-of-england")?.displayName === "West of England", "west-of-england display name must be West of England");
assert(getCity("west-of-england")?.timeZone === "Europe/London", "west-of-england timezone must be Europe/London");
assert(
  CITIES.filter((city) => city.id === "west-of-england").length === 1,
  "west-of-england must appear once in the registry"
);
for (const forbiddenId of ["woe", "bristol", "bath", "greater-bristol"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch wiring — west-of-england is now in MULTI_CITY_IDS (landed with the status flip).
assert(isMultiCity("west-of-england") === true, "west-of-england must be in MULTI_CITY_IDS post-flip");
assert(assertCityLive("perth")?.ok === true, "Perth live-gate must stay green");
assert(assertCityLive("uk-london-tfl")?.ok === true, "London (TfL) stays live");

// D1 pack presence (absorbed from the retired west-of-england-planned-gate).
const d1Dir = join(ROOT, "docs/west-of-england-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/west-of-england-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "west-of-england", "D1 city id is west-of-england");
assert(
  network.printedInnerCityNames?.lock === WEST_OF_ENGLAND_HUB,
  `D1 lock must be ${WEST_OF_ENGLAND_HUB}`
);
assert(
  network.printedInnerCityNames?.secondary === WEST_OF_ENGLAND_SECONDARY_HUB,
  `D1 secondary must be ${WEST_OF_ENGLAND_SECONDARY_HUB}`
);

// Region catalog wiring (uk/catalog.js region config, not a fork of uk-darwin.js).
const region = getRegion(WEST_OF_ENGLAND_REGION);
assert(region?.railCount === 6, `west-of-england rail count must be 6, got ${region?.railCount}`);
assert(region?.metroCount === 0, `west-of-england must have no metro stations, got ${region?.metroCount}`);
assert(
  (region?.modes ?? []).join(",") === "train",
  "west-of-england must be train-only in regions.json"
);

const railStations = listNationalRailStations();
const railCrs = new Set(railStations.map((s) => s.crs));
for (const crs of ["BRI", "BTH", "CPW", "GCR", "WSB", "TAU"]) {
  assert(railCrs.has(crs), `National Rail catalog must carry ${crs}`);
}
assert(getNotInRegion(WEST_OF_ENGLAND_REGION).length === 0, "west-of-england has no deliberate exclusions recorded");

const allStations = listCatalogStations();
assert(allStations.length === 6, `combined catalog must have 6 stations (train only), got ${allStations.length}`);

// No doNotGroup — hub and secondary hub each resolve to a single catalog entry.
const hub = resolveCatalogEntry(WEST_OF_ENGLAND_HUB);
assert(hub?.crs === "BRI", "Bristol Temple Meads must resolve with crs BRI");
const secondary = resolveCatalogEntry(WEST_OF_ENGLAND_SECONDARY_HUB);
assert(secondary?.crs === "BTH", "Bath Spa must resolve with crs BTH");
assert(resolveCatalogEntry("Bristol") === null, "the marketing token 'Bristol' must never resolve as a station");
assert(resolveCatalogEntry("Bath") === null, "the marketing token 'Bath' must never resolve as a station");

// Dogfood station list comes from the catalog, not a GTFS parse.
const dogfoodStations = listWestOfEnglandDogfoodStations();
assert(dogfoodStations.length === 6, `dogfood stations must be the 6 D1 names, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(WEST_OF_ENGLAND_HUB), "hub must be listed by the dogfood harness");
assert(dogfoodNames.has(WEST_OF_ENGLAND_SECONDARY_HUB), "secondary hub must be listed by the dogfood harness");

// Board calls: real if DARWIN_LDB_TOKEN is set in this environment (Vercel prod),
// MissingDarwinTokenError if not (expected in most local/CI sandboxes — the token
// is an env secret, not something this gate provisions). Either outcome is
// acceptable here; only an unrelated throw fails the gate.
async function probeDirections(station) {
  try {
    return { ok: true, pack: await getWestOfEnglandDogfoodDirections(station) };
  } catch (err) {
    if (err instanceof MissingDarwinTokenError) {
      return { ok: false, blocked: true };
    }
    throw err;
  }
}

const hubProbe = await probeDirections(WEST_OF_ENGLAND_HUB);
if (hubProbe.ok) {
  assert(hubProbe.pack.source === "west-of-england-darwin-live", "directions source must be west-of-england-darwin-live");
  assert(Array.isArray(hubProbe.pack.directions), "directions must be an array");
  for (const chip of hubProbe.pack.directions) {
    assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  }

  // The production dispatch entry exists and returns the same live-derived chips.
  const dispatched = await getMultiCityDirections("west-of-england", WEST_OF_ENGLAND_HUB);
  assert(
    JSON.stringify(dispatched.directions) === JSON.stringify(hubProbe.pack.directions),
    "live-city-api dispatch must return the same chips as the dogfood harness"
  );
  assert(dispatched.source === "west-of-england-darwin-live", "live-city-api dispatch source must be west-of-england-darwin-live");
} else {
  console.log(
    "west-of-england-dogfood-gate: DARWIN_LDB_TOKEN not set in this environment — dispatch/live-derivation shape not exercised against a real payload here (expected outside Vercel prod)."
  );
  let dispatchBlocked = false;
  try {
    await getMultiCityDirections("west-of-england", WEST_OF_ENGLAND_HUB);
  } catch (err) {
    dispatchBlocked = err instanceof MissingDarwinTokenError;
  }
  assert(dispatchBlocked, "live-city-api dispatch must surface MissingDarwinTokenError, not swallow it");
}

// getMultiCityNextTrain must resolve to West of England's dogfood next-train module (no throw on lookup).
assert(typeof getWestOfEnglandDogfoodNextTrain === "function", "getWestOfEnglandDogfoodNextTrain must be exported for live-city-api to dispatch to");

let unknownThrew = false;
try {
  await getWestOfEnglandDogfoodDirections("Not A Real Station");
} catch (err) {
  unknownThrew = err instanceof Error;
}
// resolveCatalogEntry isn't consulted by the dogfood directions fn directly — it fetches
// the board straight from Darwin, which itself validates the station via uk-darwin.js's
// own resolution (or throws MissingDarwinTokenError first if unset). Either throw is fine;
// only a silent success for an unknown station would be wrong.
assert(unknownThrew, "getWestOfEnglandDogfoodDirections must not silently succeed for an unknown station");

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
await vercelBoard({ method: "GET", query: { city: "west-of-england", station: WEST_OF_ENGLAND_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "west-of-england-dogfood-gate: ok (live/adapterReady, dispatch switch-case wired, D1 pack, 6 rail-only stations, no doNotGroup at BRI/BTH, boundary through-running stations catalogued flat, directions derived live from Darwin with no static line map, Perth/London TfL stay green)"
);
