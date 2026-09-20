/**
 * One-off generator for lib/cities/boston/stations.json's `mbtaStopIds` field
 * (docs/jim-brief-boston-subway-live-predictions.md follow-up, PR #431 review).
 *
 * Mark's QA on PR #431 found two hard reds against the live MBTA V3 API:
 *
 * 1. Every board row was duplicated exactly 2x. lib/providers/boston.js's
 *    resolveStopIds() unioned a station's GTFS parent `place-*` id AND its
 *    platform child ids (70xxx/71xxx/76xxx/...) AND unrelated `door-*`/`node-*`
 *    pathway ids into one `filter[stop]` query. MBTA's V3 predictions endpoint
 *    expands a parent station id to include its children's predictions, so
 *    querying the parent AND its children together double-counts every real
 *    prediction. Confirmed live 20 Sep 2026: querying `place-miltt` alone, or
 *    querying its two platform ids (`70267,70268`) alone, both return 3 unique
 *    predictions; querying `place-miltt,70267,70268` together returns 6 (the
 *    same 3 trips, twice each). The parent id alone is simplest and correct.
 *
 * 2. Cold `/api/board` took 59-68s at South Station/Park Street because
 *    fetchStationBoard() still called loadGtfsStatic() (a full MBTA GTFS zip
 *    download + parse) on every cold start just to resolve a station name to
 *    an MBTA stop id — the exact per-request static-GTFS cost the original
 *    brief was trying to remove from the live-predictions path.
 *
 * This script runs the same station-name matching lib/providers/boston.js used
 * (exact fold-key match against stations.json's name/aliases, never the
 * substring-matching findRailStopIdsForName(), which would collapse documented
 * same-name-family pairs — see boston.js's resolveStopIds() comment) ONE TIME,
 * offline, against a full GTFS parse, and resolves each match down to the
 * single correct MBTA V3 id set per the live-verified rule above: the
 * location_type=1 GTFS parent ("place-" prefixed) id if the station has one
 * (true for all 125 catalog stations, confirmed by this script's own report),
 * or its direct platform (location_type=0) stop_ids if it doesn't (never
 * children of an unrelated parent, never door- / node- prefixed
 * pathway/entrance pseudo-stops, which are location_type 2/3 and are already
 * excluded by construction below).
 *
 * Run again whenever MBTA restructures a station's GTFS ids (re-run and diff).
 *
 * Usage: node scripts/generate-boston-mbta-stop-ids.mjs [--write]
 * Without --write, prints a report only (station name -> resolved id(s), and
 * any catalog station left with zero ids) so a human can review before it
 * touches the committed catalog file.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadGtfsStatic } from "../lib/providers/gtfs/static-cache.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "lib/cities/boston/stations.json");

const MBTA_GTFS_STATIC_URL = "https://cdn.mbta.com/MBTA_GTFS.zip";
const BOSTON_ROUTE_TYPES = ["0", "1"];
const BOSTON_TIME_ZONE = "America/New_York";

/** Mirrors lib/cities/boston/marketing-directions.js's foldKey exactly. */
function foldKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function acceptableFoldNames(station) {
  return new Set([station.name, ...(station.aliases ?? [])].map(foldKey));
}

/**
 * Resolve one catalog station to its correct, non-duplicating MBTA V3 stop id
 * set: the GTFS parent (`place-*`, location_type "1") id alone if any
 * name-matching stop has one, else the matching stops' own ids (location_type
 * "0" real platforms only — "2"/"3" entrance/pathway pseudo-stops are never
 * name-matches for a station anyway, since MBTA doesn't give them the
 * station's own stop_name, but excluded explicitly here too as belt-and-braces).
 */
function resolveMbtaStopIds(staticData, station) {
  const names = acceptableFoldNames(station);
  const matches = staticData.stops.filter((stop) => names.has(foldKey(stop.stop_name)));

  const parentIds = new Set(
    matches.filter((stop) => stop.location_type === "1").map((stop) => stop.stop_id)
  );
  if (parentIds.size) {
    return [...parentIds];
  }

  const platformIds = new Set(
    matches
      .filter((stop) => stop.location_type === "0" || stop.location_type === "")
      .map((stop) => stop.stop_id)
  );
  return [...platformIds];
}

async function main() {
  const write = process.argv.includes("--write");
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));

  const staticData = await loadGtfsStatic({
    url: MBTA_GTFS_STATIC_URL,
    routeTypes: BOSTON_ROUTE_TYPES,
    timeZone: BOSTON_TIME_ZONE,
  });

  const missing = [];
  for (const station of catalog.stations ?? []) {
    const ids = resolveMbtaStopIds(staticData, station);
    station.mbtaStopIds = ids;
    if (ids.length === 0) {
      missing.push(station.name);
    }
    console.log(`${station.name}\t${ids.join(",")}`);
  }

  console.log(`\n${catalog.stations.length} stations, ${missing.length} unexpectedly with zero ids.`);
  if (missing.length) {
    console.log("Unexpected missing:", missing.join(" | "));
  }

  if (write) {
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");
    console.log(`Wrote ${CATALOG_PATH}`);
  } else {
    console.log("(dry run — pass --write to update the catalog file)");
  }
}

await main();
