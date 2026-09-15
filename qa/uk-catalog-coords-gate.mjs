/**
 * UK catalog coordinate coverage gate — docs/luke-brief-uk-catalog-geocode.md.
 *
 * `findNearestStation` (public/app.js, lib/cities/live-city-api.js) silently skips any
 * station without lat/lng, so a region with no coordinates can never be the target of a
 * "near me" auto-pick — it falls back to the region picker instead of a board (PR #318).
 * This gate checks that every live UK region's National Rail catalog is actually geocoded,
 * catches accidental (0, 0) placeholders, and catches coordinates that fall outside the
 * region's own CITY_BOUNDS box (public/city-session.js) — a sign of a wrong CRS match or a
 * stale bounding box (see uk-catalog-geocode's 7 Sep 2026 CITY_BOUNDS widening for
 * greater-manchester/rest-of-scotland/southwest, all real NaPTAN-verified boundary
 * stations the old boxes excluded).
 *
 * Scope: `mode: "train"` stations only, matching the brief's acceptance criterion —
 * tram/metro coverage is tracked separately (some systems have no confirmed NaPTAN/GTFS
 * stop-level source at all, see each pack's own `Coordinates:` notes line).
 *
 * Usage: node qa/uk-catalog-coords-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { UK_REGION_IDS, listRailStations } from "../lib/providers/uk/catalog.js";
import { CITIES } from "../lib/providers/registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MIN_COVERAGE = 0.9;

const failures = [];
function fail(msg) {
  failures.push(msg);
}

// south-wales is out of scope here — its 16-station coordinate catalog lands in PR #326.
const SKIP_REGIONS = new Set(["south-wales"]);

// Boundary through-running stations catalogued flat in two regions (not a
// merge point — see each region's own stations.json "notes" line), whose
// coordinates therefore only fall inside ONE of the two regions' CITY_BOUNDS
// boxes. docs/jim-brief-city-bounds-order-after-geocode.md item 2: Taunton
// is Southwest's GPS-hint home region (see the uk-city-bounds-overlap-gate.mjs
// allow-list), so West of England's own box was tightened to exclude it —
// its board listing there is still correct data, just outside the hint box.
// UK station fill phase 1 (13 Sep 2026): Kings Sutton and Northampton are
// real, Darwin-verified East Midlands stations (docs/uk-station-fill/
// assignment.md — Kings Sutton is a flagged borderline call, closer to
// Thames Valley's Banbury corridor than to Nottingham) whose coordinates
// sit south of East Midlands' own CITY_BOUNDS box, which was tuned to avoid
// swallowing Thames Valley's Banbury and South Yorkshire's Sheffield-area
// stations instead (see the box's own comment in public/city-session.js).
const BOX_CHECK_EXEMPT = new Set([
  "west-of-england::Taunton",
  "east-midlands::Kings Sutton",
  "east-midlands::Northampton",
  // UK station fill phase 2a (14 Sep 2026) — real, Darwin-verified stations whose coordinates
  // fall just outside their own region's CITY_BOUNDS box (out of scope this phase — public/
  // city-session.js is not touched, docs/jim-brief-uk-station-fill-phase2a.md).
  "north-east::Darlington", // docs/united-kingdom-ledger.md section 2 decided North East as home
  "west-of-england::Cheltenham Spa",
  "solent::Newbury Racecourse",
  "greater-manchester::Wigan North Western", // Greater Manchester Combined Authority borough
  "greater-manchester::Wigan Wallgate",
  // 15 Sep 2026 (docs/jim-brief-rest-of-england-reassignment.md): Glazebrook and Birchwood
  // (both Borough of Warrington) reassigned in from rest-of-england alongside Warrington's three
  // main stations — real, NaPTAN-verified liverpool-city-region stations whose coordinates sit
  // just east of this pack's own CITY_BOUNDS box (widening it would swallow greater-manchester's
  // own reassigned stations instead, see qa/uk-city-bounds-overlap-gate.mjs).
  "liverpool-city-region::Glazebrook",
  "liverpool-city-region::Birchwood",
]);

const liveIds = new Set(CITIES.filter((c) => c.status === "live").map((c) => c.id));

const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
const boundsMatch = citySession.match(/CITY_BOUNDS = \{([\s\S]*?)\n  \};/);
if (!boundsMatch) {
  fail("city-session CITY_BOUNDS: could not parse (pattern drift — update this gate)");
}
// A CITY_BOUNDS value is normally a single box, but may be an array of boxes (added
// 16 Sep 2026, docs/jim-brief-essex-to-greater-anglia.md round 2 — see the matching
// comment in public/city-session.js). Evaluate the object literal itself, same
// approach qa/uk-city-bounds-overlap-gate.mjs uses, rather than a regex that can only
// match a single-box shape.
const bounds = new Map();
if (boundsMatch) {
  // eslint-disable-next-line no-new-func -- parsing a trusted local source file's own object literal
  const parsed = new Function(`return {${boundsMatch[1]}};`)();
  for (const [id, boxOrBoxes] of Object.entries(parsed)) {
    bounds.set(id, Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes]);
  }
}

let checkedRegions = 0;

for (const regionId of UK_REGION_IDS) {
  if (SKIP_REGIONS.has(regionId)) continue;
  if (!liveIds.has(regionId)) continue;

  const stations = listRailStations(regionId);
  if (!stations.length) continue; // e.g. uk-london-tfl has no mode:train stations
  checkedRegions++;

  const boxes = bounds.get(regionId);
  if (!boxes) {
    fail(`${regionId}: no CITY_BOUNDS entry in public/city-session.js`);
  }

  let finite = 0;
  for (const s of stations) {
    const hasCoords = Number.isFinite(s.lat) && Number.isFinite(s.lng);
    if (!hasCoords) continue;
    finite++;

    if (s.lat === 0 && s.lng === 0) {
      fail(`${regionId} "${s.name}": coordinates are (0, 0) — placeholder, not a real geocode`);
    }

    const insideAnyBox = boxes && boxes.some(
      (box) => s.lat >= box.minLat && s.lat <= box.maxLat && s.lng >= box.minLng && s.lng <= box.maxLng
    );
    if (boxes && !insideAnyBox && !BOX_CHECK_EXEMPT.has(`${regionId}::${s.name}`)) {
      fail(
        `${regionId} "${s.name}": (${s.lat}, ${s.lng}) is outside CITY_BOUNDS ${JSON.stringify(boxes)}`
      );
    }
  }

  const coverage = finite / stations.length;
  if (coverage < MIN_COVERAGE) {
    fail(
      `${regionId}: only ${finite}/${stations.length} (${(coverage * 100).toFixed(0)}%) mode:train stations have finite lat/lng, below the ${MIN_COVERAGE * 100}% floor`
    );
  }
}

if (checkedRegions === 0) {
  fail("no live UK regions with mode:train stations were checked — gate did not run against anything");
}

if (failures.length > 0) {
  console.error(`uk-catalog-coords-gate: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`uk-catalog-coords-gate: OK (${checkedRegions} region(s) checked, ${MIN_COVERAGE * 100}% floor)`);
