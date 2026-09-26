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
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

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
  if (!stopsText.includes("luas")) {
    throw new Error("stops.txt does not mention Luas anywhere — this does not look like the trimmed Dublin Luas snapshot.");
  }

  const problems = inspectRoutesAndStops(files);

  if (problems.length > 0) {
    throw new Error(
      `verify-dublin-gtfs-snapshot: trim over-matched non-Luas routes:\n  - ${problems.join("\n  - ")}`
    );
  }

  console.log(`verify-dublin-gtfs-snapshot: ok (${url}, ${buffer.length} bytes, stops.txt contains Luas stops)`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
