/**
 * Brisbane (Translink SEQ) rail provider — GTFS + GTFS-RT.
 * Adapter ready; city remains `planned` in registry (not live).
 *
 * Static: https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip
 * RT: https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates/Rail
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const BRISBANE_TIME_ZONE = "Australia/Brisbane";

/** Pinned SEQ static GTFS (CC-BY Queensland / Translink). */
export const SEQ_GTFS_STATIC_URL = "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip";

/** SEQ rail TripUpdates feed (no API key). */
export const SEQ_GTFS_RT_RAIL_URL =
  "https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates/Rail";

const catalogPath = join(__dirname, "../cities/brisbane/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

function resolveCatalogEntry(stationIdOrName) {
  const needle = normalizeKey(stationIdOrName);
  if (!needle) {
    return null;
  }

  for (const entry of stationCatalog.stations ?? []) {
    if (normalizeKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (normalizeKey(alias) === needle) {
        return entry;
      }
    }
    if (entry.stopIds?.includes(stationIdOrName)) {
      return entry;
    }
  }

  return null;
}

async function loadBrisbaneStatic() {
  return loadGtfsStatic({
    url: SEQ_GTFS_STATIC_URL,
    railOnly: true,
    timeZone: BRISBANE_TIME_ZONE,
  });
}

async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (catalogEntry?.stopIds?.length) {
    return catalogEntry.stopIds;
  }

  const fromGtfs = findRailStopIdsForName(staticData, catalogEntry?.name ?? stationIdOrName);
  if (fromGtfs.length > 0) {
    return fromGtfs;
  }

  if (staticData.stopsById.has(stationIdOrName)) {
    return [stationIdOrName];
  }

  throw new Error(`Unknown Brisbane station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadBrisbaneStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await fetchTripUpdates(SEQ_GTFS_RT_RAIL_URL);
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: BRISBANE_TIME_ZONE,
  });

  return {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
