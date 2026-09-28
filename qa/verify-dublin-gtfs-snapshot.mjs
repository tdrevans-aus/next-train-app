/**
 * Small, credential-free integrity check for Dublin's published GTFS static snapshot
 * (gtfs/dublin.zip in the shared next-train-gtfs Vercel Blob store), run right after
 * publishing by .github/workflows/publish-gtfs-snapshot.yml.
 *
 * Dublin stays status: "planned" (docs/dublin-d1/jim-handoff.md), so
 * qa/gtfs-live-blob-snapshot-integrity.mjs's coverage — derived from
 * `status: "live"` cities only — never checks it. This is the "small inline check"
 * docs/jim-brief-dublin-blob-publish-action.md asks for as a stand-in: fetch the
 * just-published blob, confirm HTTP 200, a sane zip size, and that stops.txt actually
 * contains Luas stops (not an empty or synthetic snapshot).
 *
 * Usage: node qa/verify-dublin-gtfs-snapshot.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { resolveStopIds } from "../lib/providers/dublin.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MIN_BYTES = 5 * 1024;
const MAX_ALLOWED_ROUTES = 4;
// Tram / light rail: GTFS extended route type 900 is the more specific code some feeds use in
// place of the basic route_type 0 for tram service — accept either.
const ALLOWED_ROUTE_TYPES = new Set(["0", "900"]);

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

function readEntryText(files, key) {
  return Buffer.from(files[key]).toString("utf8");
}

/**
 * Prints diagnostic evidence (routes.txt, agency.txt, distinct-stop count from
 * kept trips) and returns a list of route-shape problems (empty when clean).
 * Printing always happens before the caller decides to fail, per
 * docs/jim-brief-dublin-luas-filter-diagnostic.md, so CI logs always show the
 * evidence even on a passing run.
 */
function inspectRoutesAndStops(files) {
  const problems = [];

  const routesKey = findEntry(files, "routes.txt");
  const agencyKey = findEntry(files, "agency.txt");
  const tripsKey = findEntry(files, "trips.txt");
  const stopTimesKey = findEntry(files, "stop_times.txt");

  if (!routesKey) {
    throw new Error("Published snapshot has no routes.txt.");
  }
  if (!agencyKey) {
    throw new Error("Published snapshot has no agency.txt.");
  }

  const routes = parseCsv(readEntryText(files, routesKey));

  console.log(`\n--- routes.txt (${routes.length} rows) ---`);
  console.log("route_id | agency_id | route_short_name | route_long_name | route_type");
  for (const route of routes) {
    console.log(
      `${route.route_id ?? ""} | ${route.agency_id ?? ""} | ${route.route_short_name ?? ""} | ${route.route_long_name ?? ""} | ${route.route_type ?? ""}`
    );
  }

  const agencies = parseCsv(readEntryText(files, agencyKey));
  console.log(`\n--- agency.txt (${agencies.length} rows) ---`);
  console.log("agency_id | agency_name");
  for (const agency of agencies) {
    console.log(`${agency.agency_id ?? ""} | ${agency.agency_name ?? ""}`);
  }

  if (tripsKey && stopTimesKey) {
    const trips = parseCsv(readEntryText(files, tripsKey));
    const keptTripIds = new Set(trips.map((trip) => trip.trip_id));
    const stopTimes = parseCsv(readEntryText(files, stopTimesKey));
    const usedStopIds = new Set();
    for (const stopTime of stopTimes) {
      if (keptTripIds.has(stopTime.trip_id) && stopTime.stop_id) {
        usedStopIds.add(stopTime.stop_id);
      }
    }
    console.log(`\n--- distinct stops used by kept trips: ${usedStopIds.size} ---\n`);
  } else {
    console.log("\n--- distinct stops used by kept trips: unavailable (missing trips.txt or stop_times.txt) ---\n");
  }

  if (routes.length > MAX_ALLOWED_ROUTES) {
    problems.push(`routes.txt has ${routes.length} rows, expected at most ${MAX_ALLOWED_ROUTES} (Luas Red + Green, plus headroom).`);
  }

  const badTypeRoutes = routes.filter((route) => !ALLOWED_ROUTE_TYPES.has(route.route_type ?? ""));
  if (badTypeRoutes.length > 0) {
    const ids = badTypeRoutes.map((route) => route.route_id).join(", ");
    const allowed = [...ALLOWED_ROUTE_TYPES].join(" or ");
    problems.push(
      `routes.txt has ${badTypeRoutes.length} route(s) with route_type not in {${allowed}} (tram/light rail): ${ids}.`
    );
  }

  return problems;
}

/**
 * Station-id completeness audit (docs/jim-brief-dublin-belgard-saggart-direction-gap.md).
 * Dublin's catalog (lib/cities/dublin/stations.json) never hardcodes stop_ids — every station's
 * stop_ids are resolved dynamically at request time by findRailStopIdsForName()'s substring match
 * over the published static snapshot (lib/providers/gtfs/static-cache.js), so there is no static
 * "stopIds list" a defect could go stale in. The real risk this guards against is drift between
 * that dynamic resolution and the ground truth: a stop_id whose stop_name EXACTLY equals (folded)
 * a catalog station's printed name or alias, and which is genuinely used by a kept Red/Green trip,
 * but which resolveStopIds()/findRailStopIdsForName() somehow fails to return — e.g. a future
 * change to the substring-match logic, a parent_station edge case, or (Belgard's own suspicion,
 * ruled out below) an undiscovered third platform id.
 *
 * Independent of dublin.js's own matching logic: builds its own exact-name index over stops.txt,
 * intersects it with stop_ids actually referenced by kept (Luas) trips in stop_times.txt, and
 * asserts every such id is a member of the set resolveStopIds() would actually use. This would
 * have caught Belgard if its catalog entry had ever hardcoded an incomplete id pair.
 */
async function auditStationIdCompleteness(files) {
  const stopsKey = findEntry(files, "stops.txt");
  const tripsKey = findEntry(files, "trips.txt");
  const stopTimesKey = findEntry(files, "stop_times.txt");
  if (!stopsKey || !tripsKey || !stopTimesKey) {
    console.log("\n--- station-id completeness audit: skipped (missing stops/trips/stop_times.txt) ---\n");
    return [];
  }

  const stops = parseCsv(readEntryText(files, stopsKey));
  const trips = parseCsv(readEntryText(files, tripsKey));
  const stopTimes = parseCsv(readEntryText(files, stopTimesKey));

  const keptTripIds = new Set(trips.map((trip) => trip.trip_id));
  const usedStopIds = new Set();
  for (const stopTime of stopTimes) {
    if (keptTripIds.has(stopTime.trip_id) && stopTime.stop_id) {
      usedStopIds.add(stopTime.stop_id);
    }
  }

  const foldName = (value) => String(value || "").trim().toLowerCase();
  const stopNameById = new Map(stops.map((stop) => [stop.stop_id, foldName(stop.stop_name)]));
  const staticData = { stops, stopsById: new Map(stops.map((stop) => [stop.stop_id, stop])) };

  const catalogPath = join(ROOT, "lib/cities/dublin/stations.json");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

  const problems = [];
  const summary = [];

  for (const station of catalog.stations ?? []) {
    const names = [station.name, ...(station.aliases ?? [])].map(foldName).filter(Boolean);

    // Ground truth: every stop_id genuinely used by a kept trip whose GTFS stop_name folds to
    // an EXACT match against this station's printed name or one of its aliases.
    const exactMatchIds = [...usedStopIds].filter((stopId) => names.includes(stopNameById.get(stopId)));
    if (exactMatchIds.length === 0) {
      continue;
    }

    // What the adapter would actually resolve at request time for this station.
    const resolved = new Set(await resolveStopIds(station.name, staticData));
    const missing = exactMatchIds.filter((id) => !resolved.has(id));
    if (missing.length > 0) {
      problems.push(
        `${station.name}: exact-name-matched stop_id(s) ${missing.join(", ")} are used by a kept Red/Green trip but resolveStopIds("${station.name}") never returns them.`
      );
    }
    summary.push(`${station.name}: ${exactMatchIds.length} exact-name-matched id(s), ${resolved.size} resolved`);
  }

  console.log(`\n--- station-id completeness audit: ${summary.length} station(s) with a live-snapshot name match ---`);
  for (const line of summary) {
    console.log(`  ${line}`);
  }
  if (problems.length === 0) {
    console.log("--- station-id completeness audit: ok, every exact-name-matched id resolves ---\n");
  }

  return problems;
}

async function main() {
  const url = gtfsFixtureBlobUrl("dublin");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Published snapshot fetch failed: HTTP ${response.status} for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < MIN_BYTES) {
    throw new Error(`Published snapshot is only ${buffer.length} bytes (< ${MIN_BYTES}) — looks empty or synthetic.`);
  }

  const files = unzipSync(new Uint8Array(buffer));
  const stopsKey = findEntry(files, "stops.txt");
  if (!stopsKey) {
    throw new Error("Published snapshot has no stops.txt.");
  }

  const stopsText = readEntryText(files, stopsKey).toLowerCase();
  // The dedicated Luas feed (GTFS_LUAS.zip) names stops plainly ("Abbey Street"), without the
  // word "Luas", so check for the Red and Green line termini instead. The route_type check
  // below is what rules out non-Luas routes.
  const missingTermini = ["tallaght", "broombridge"].filter((name) => !stopsText.includes(name));
  if (missingTermini.length > 0) {
    throw new Error(`stops.txt is missing Luas termini (${missingTermini.join(", ")}) — this does not look like the Dublin Luas snapshot.`);
  }

  const problems = inspectRoutesAndStops(files);

  if (problems.length > 0) {
    throw new Error(
      `verify-dublin-gtfs-snapshot: trim over-matched non-Luas routes:\n  - ${problems.join("\n  - ")}`
    );
  }

  const idProblems = await auditStationIdCompleteness(files);
  if (idProblems.length > 0) {
    throw new Error(`verify-dublin-gtfs-snapshot: station-id completeness audit failed:\n  - ${idProblems.join("\n  - ")}`);
  }

  console.log(`verify-dublin-gtfs-snapshot: ok (${url}, ${buffer.length} bytes, stops.txt contains Luas stops, station-id completeness audit passed)`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
