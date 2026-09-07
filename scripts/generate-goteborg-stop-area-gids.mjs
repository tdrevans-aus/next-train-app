/**
 * One-off generator for lib/cities/goteborg/stations.json's
 * `vasttrafikStopAreaGids` field (docs/jim-brief-goteborg-live-only-no-fallback.md).
 *
 * Before this brief, the live board resolved a catalog station's Västtrafik
 * stop-area GID(s) at *request time* by loading the Trafiklab `vt` static
 * GTFS and matching `findRailStopIdsForName(staticData, station.name)`,
 * filtering the result to the 16-digit stop-area GID pattern
 * (Västtrafik's GTFS export uses the same GID as its own `stop_id`, so that
 * filter was already selecting genuine Västtrafik stop-area ids, not GTFS
 * ids in general). This script runs that exact same resolution once,
 * offline from the live board path, and writes the result into the catalog
 * so the runtime adapter never needs the static feed again.
 *
 * Usage: node scripts/generate-goteborg-stop-area-gids.mjs [--write]
 * Without --write, prints a report only (station name -> GIDs, and any
 * catalog station left with zero GIDs) so a human can review before it
 * touches the committed catalog file.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadGtfsStatic, findRailStopIdsForName } from "../lib/providers/gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import { isVasttrafikStopAreaGid } from "../lib/providers/vasttrafik.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "lib/cities/goteborg/stations.json");

const GOTEBORG_ROUTE_TYPES = ["0", "2", "100", "106", "109", "400", "401", "900"];
const GOTEBORG_TIME_ZONE = "Europe/Stockholm";

/**
 * Catalog station name -> the GTFS stop_name to search on instead, for
 * names that don't substring-match the Trafiklab `vt` feed's own spelling.
 * Found by hand once (docs/jim-brief-goteborg-live-only-no-fallback.md):
 * - "Angereds Centrum" (catalog, possessive) vs GTFS "Angered Centrum".
 * - "Liseberg Station (tåg)" (catalog's separate pendeltåg entry, added
 *   to disambiguate the tram/train chip split) shares the same physical
 *   stop-area as plain "Liseberg Station".
 */
const NAME_SEARCH_OVERRIDES = {
  "Angereds Centrum": "Angered Centrum",
  "Liseberg Station (tåg)": "Liseberg Station",
};

/**
 * Catalog stations with no resolvable Västtrafik stop-area GID, confirmed
 * by hand (docs/jim-brief-goteborg-live-only-no-fallback.md): "Nordstan"
 * has no coordinates either (docs/goteborg-d1/station-coordinates.json's
 * `unresolved` list) and no matching stop_name anywhere in the `vt` GTFS
 * feed (regardless of mode) — it appears to be a printed inner-city place
 * name (shopping district), not a distinct Västtrafik stop-area, unlike
 * Brunnsparken/Lilla Bommen which are genuine nearby stops. Left as a known,
 * recorded gap rather than guessed at — see qa/goteborg-dogfood-gate.mjs and
 * docs/goteborg-d1/jim-handoff.md. Requesting this station's board throws
 * MissingVasttrafikStopAreaGidError until Luke/Tim resolve it.
 */
const KNOWN_UNRESOLVED = new Set(["Nordstan"]);

async function main() {
  const write = process.argv.includes("--write");
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));

  const staticData = await loadGtfsStatic({
    url: gtfsFixtureBlobUrl("goteborg"),
    routeTypes: GOTEBORG_ROUTE_TYPES,
    timeZone: GOTEBORG_TIME_ZONE,
  });

  const missing = [];
  for (const station of catalog.stations ?? []) {
    const searchName = NAME_SEARCH_OVERRIDES[station.name] ?? station.name;
    const stopIds = findRailStopIdsForName(staticData, searchName);
    const gids = stopIds.filter(isVasttrafikStopAreaGid);
    station.vasttrafikStopAreaGids = gids;
    if (gids.length === 0 && !KNOWN_UNRESOLVED.has(station.name)) {
      missing.push(station.name);
    }
    console.log(`${station.name}\t${gids.join(",")}`);
  }

  console.log(`\n${catalog.stations.length} stations, ${missing.length} unexpectedly with zero GIDs.`);
  if (missing.length) {
    console.log("Unexpected missing:", missing.join(" | "));
  }
  if (KNOWN_UNRESOLVED.size) {
    console.log("Known unresolved (documented, not a script bug):", [...KNOWN_UNRESOLVED].join(", "));
  }

  if (write) {
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");
    console.log(`Wrote ${CATALOG_PATH}`);
  } else {
    console.log("(dry run — pass --write to update the catalog file)");
  }
}

await main();
