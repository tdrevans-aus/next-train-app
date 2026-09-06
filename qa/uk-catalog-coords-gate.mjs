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

const liveIds = new Set(CITIES.filter((c) => c.status === "live").map((c) => c.id));

const citySession = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
const boundsMatch = citySession.match(/CITY_BOUNDS = \{([\s\S]*?)\n  \};/);
if (!boundsMatch) {
  fail("city-session CITY_BOUNDS: could not parse (pattern drift — update this gate)");
}
const bounds = new Map();
if (boundsMatch) {
  const re = /(?:"([a-z-]+)"|([a-z-]+)):\s*\{\s*minLat:\s*(-?[\d.]+),\s*maxLat:\s*(-?[\d.]+),\s*minLng:\s*(-?[\d.]+),\s*maxLng:\s*(-?[\d.]+)\s*\}/g;
  let m;
  while ((m = re.exec(boundsMatch[1]))) {
    const id = m[1] ?? m[2];
    bounds.set(id, {
      minLat: Number(m[3]),
      maxLat: Number(m[4]),
      minLng: Number(m[5]),
      maxLng: Number(m[6]),
    });
  }
}

let checkedRegions = 0;

for (const regionId of UK_REGION_IDS) {
  if (SKIP_REGIONS.has(regionId)) continue;
  if (!liveIds.has(regionId)) continue;

  const stations = listRailStations(regionId);
  if (!stations.length) continue; // e.g. uk-london-tfl has no mode:train stations
  checkedRegions++;

  const box = bounds.get(regionId);
  if (!box) {
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

    if (box && (s.lat < box.minLat || s.lat > box.maxLat || s.lng < box.minLng || s.lng > box.maxLng)) {
      fail(
        `${regionId} "${s.name}": (${s.lat}, ${s.lng}) is outside CITY_BOUNDS ${JSON.stringify(box)}`
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
