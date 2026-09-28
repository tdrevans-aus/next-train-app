/**
 * Small, credential-free integrity check for Copenhagen's published GTFS static snapshot
 * (gtfs/copenhagen.zip in the shared next-train-gtfs Vercel Blob store), mirroring
 * qa/verify-dublin-gtfs-snapshot.mjs. Run right after publishing by
 * .github/workflows/publish-gtfs-snapshot.yml.
 *
 * NOTE on scope vs docs/jim-brief-copenhagen-snapshot-trim.md's acceptance criteria: that brief
 * asks (by analogy with Dublin's verify script) for "a live RT join ≥ 20 judgeable trips" here.
 * Copenhagen has no live real-time feed wired at all — lib/providers/copenhagen.js's own header
 * is explicit that Rejseplanen API 2.0/SIRI-ET real-time requires a registered key Jim does not
 * sign up for, and any future live-real-time path must throw MissingRejseplanenApiKeyError
 * rather than silently degrade. fetchStationBoard() always returns `realtime: false`. There is
 * therefore no realtime trip_id stream to join the static snapshot against, unlike Dublin's
 * NTA GTFS-RT v2 feed (checked separately by qa/dublin-rt-join-check.mjs, which Dublin's
 * workflow entry runs with NTA_API_KEY). This script covers everything else the brief asks for
 * (routes/agencies present, every catalog station resolves) and is intentionally silent on the
 * RT-join item rather than fabricating a check against a feed that doesn't exist — flagged here
 * for whoever reviews this PR.
 *
 * Catalog-completeness audit (docs/jim-brief-copenhagen-snapshot-trim.md follow-up, 28 Sep
 * 2026 — Dublin's #499 audit is the pattern): every catalog station must resolve to at least
 * one stop_id via the SAME resolution the live adapter uses at request time
 * (resolveStopIdsForCatalogEntry, which tries the catalog name then each alias) — not a
 * looser/different check that could pass while the real adapter 404s. This is what would have
 * caught Lufthavnen (M2 airport terminus) at flip time: it resolved to zero stop_ids against
 * both the trimmed snapshot and the full untrimmed national feed, confirmed unrelated to this
 * trim, until "Københavns Lufthavn" was added as an alias.
 *
 * Usage: node qa/verify-copenhagen-gtfs-snapshot.mjs
 */
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import {
  listCatalogStations,
  resolveStopIdsForCatalogEntry,
  METRO_CODES,
  STOG_CODES,
} from "../lib/providers/copenhagen.js";
import { classifyDsbService } from "../lib/cities/copenhagen/marketing-directions.js";

const MIN_BYTES = 50 * 1024;
// Trimmed snapshot is a fraction of the ~55MB national feed (measured ~5MB zipped during this
// fix) — a size anywhere near the full feed means the trim silently no-op'd.
const MAX_BYTES = 20 * 1024 * 1024;

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

function readEntryText(files, key) {
  return Buffer.from(files[key]).toString("utf8");
}

function classifyRoute(route) {
  const code = String(route.route_short_name || "").trim().toUpperCase();
  if (METRO_CODES.has(code)) {
    return "metro";
  }
  if (STOG_CODES.has(code)) {
    return "restricted";
  }
  const dsb = classifyDsbService({
    routeShortName: route.route_short_name,
    routeLongName: route.route_long_name,
    routeDesc: route.route_desc,
  });
  return dsb ? "restricted" : null;
}

function inspectRoutesAndStops(files) {
  const problems = [];

  const routesKey = findEntry(files, "routes.txt");
  const agencyKey = findEntry(files, "agency.txt");

  if (!routesKey) {
    throw new Error("Published snapshot has no routes.txt.");
  }
  if (!agencyKey) {
    throw new Error("Published snapshot has no agency.txt.");
  }

  const routes = parseCsv(readEntryText(files, routesKey));
  console.log(`\n--- routes.txt (${routes.length} rows) ---`);
  console.log("route_id | agency_id | route_short_name | route_long_name | route_desc | route_type");
  for (const route of routes) {
    console.log(
      `${route.route_id ?? ""} | ${route.agency_id ?? ""} | ${route.route_short_name ?? ""} | ${route.route_long_name ?? ""} | ${route.route_desc ?? ""} | ${route.route_type ?? ""}`
    );
  }

  const agencies = parseCsv(readEntryText(files, agencyKey));
  console.log(`\n--- agency.txt (${agencies.length} rows) ---`);
  console.log("agency_id | agency_name");
  for (const agency of agencies) {
    console.log(`${agency.agency_id ?? ""} | ${agency.agency_name ?? ""}`);
  }

  const unclassified = routes.filter((route) => !classifyRoute(route));
  if (unclassified.length > 0) {
    const ids = unclassified.map((route) => route.route_id).join(", ");
    problems.push(
      `routes.txt has ${unclassified.length} route(s) that are neither Metro, S-tog, nor DSB/Öresundståg per the live adapter's own classification: ${ids}. The trim should never have kept a route the adapter itself would drop.`
    );
  }

  const metroCount = routes.filter((route) => classifyRoute(route) === "metro").length;
  const restrictedCount = routes.length - unclassified.length - metroCount;
  console.log(`\n--- classification: metro=${metroCount} restricted(s-tog/dsb/oresundstag)=${restrictedCount} unclassified=${unclassified.length} ---\n`);

  return problems;
}

/**
 * Every catalog station (lib/cities/copenhagen/stations.json) must resolve to at least one
 * stop_id in the published snapshot via the EXACT SAME resolution fetchStationBoard() uses at
 * request time (resolveStopIdsForCatalogEntry — name first, then each alias in order) —
 * otherwise a board request for that station would come back "Unknown Copenhagen station" even
 * though the station is genuinely in-catalog. No carve-outs: this is what would have caught
 * Lufthavnen at flip time (see file header).
 */
function auditCatalogStationResolution(files) {
  const stopsKey = findEntry(files, "stops.txt");
  if (!stopsKey) {
    throw new Error("Published snapshot has no stops.txt.");
  }
  const stops = parseCsv(readEntryText(files, stopsKey));
  const staticData = { stops };

  const problems = [];
  const summary = [];
  for (const station of listCatalogStations()) {
    const stopIds = resolveStopIdsForCatalogEntry(staticData, station);
    if (stopIds.length === 0) {
      problems.push(`${station.name}: resolves to zero stop_ids in the published snapshot (tried name + ${(station.aliases ?? []).length} alias(es)).`);
      continue;
    }
    summary.push(`${station.name}: ${stopIds.length} stop_id(s)`);
  }

  console.log(`--- catalog station resolution: ${summary.length}/${listCatalogStations().length} station(s) resolved ---`);
  for (const line of summary) {
    console.log(`  ${line}`);
  }
  if (problems.length === 0) {
    console.log("--- catalog station resolution: ok, every catalog station resolves ---\n");
  }

  return problems;
}

async function main() {
  const url = gtfsFixtureBlobUrl("copenhagen");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Published snapshot fetch failed: HTTP ${response.status} for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < MIN_BYTES) {
    throw new Error(`Published snapshot is only ${buffer.length} bytes (< ${MIN_BYTES}) — looks empty or synthetic.`);
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(
      `Published snapshot is ${(buffer.length / 1024 / 1024).toFixed(2)}MB (> ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB) — looks like the trim didn't actually run (close to the full national feed's size).`
    );
  }

  const files = unzipSync(new Uint8Array(buffer));
  const stopsKey = findEntry(files, "stops.txt");
  if (!stopsKey) {
    throw new Error("Published snapshot has no stops.txt.");
  }

  const stopsText = readEntryText(files, stopsKey).toLowerCase();
  const missingLandmarks = ["nørreport", "københavn h", "kongens nytorv"].filter(
    (name) => !stopsText.includes(name)
  );
  if (missingLandmarks.length > 0) {
    throw new Error(
      `stops.txt is missing expected Copenhagen landmarks (${missingLandmarks.join(", ")}) — this does not look like the Copenhagen snapshot.`
    );
  }

  const routeProblems = inspectRoutesAndStops(files);
  const resolutionProblems = auditCatalogStationResolution(files);
  const problems = [...routeProblems, ...resolutionProblems];

  if (problems.length > 0) {
    throw new Error(`verify-copenhagen-gtfs-snapshot: failed:\n  - ${problems.join("\n  - ")}`);
  }

  console.log(
    `verify-copenhagen-gtfs-snapshot: ok (${url}, ${(buffer.length / 1024 / 1024).toFixed(2)}MB, stops.txt contains expected landmarks, every catalog station resolves, every route classifies as Metro/S-tog/DSB/Öresundståg)`
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
