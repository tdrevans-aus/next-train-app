/**
 * Canberra (Transport Canberra MyWay+) light rail provider — GTFS + GTFS-RT.
 * Adapter ready; city remains `planned` in registry (not live).
 *
 * Static: https://transport.api.act.gov.au/gtfs/data/gtfs/v2/google_transit.zip
 * RT: https://transport.api.act.gov.au/gtfs/data/gtfs/v2/trip-updates.pb
 * Auth: HTTP Basic — ACT_GTFS_BASIC or ACT_GTFS_CLIENT_ID + ACT_GTFS_CLIENT_SECRET
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { actGtfsBasicAuthHeaders } from "./gtfs/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CANBERRA_TIME_ZONE = "Australia/Sydney";

/** GTFS route_type 0 = tram / light rail */
const LIGHT_RAIL_ROUTE_TYPES = ["0"];

export const CANBERRA_GTFS_STATIC_URL =
  "https://transport.api.act.gov.au/gtfs/data/gtfs/v2/google_transit.zip";

export const CANBERRA_GTFS_RT_TRIP_UPDATES_URL =
  "https://transport.api.act.gov.au/gtfs/data/gtfs/v2/trip-updates.pb";

const catalogPath = join(__dirname, "../cities/canberra/stations.json");
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

function authHeaders() {
  return actGtfsBasicAuthHeaders();
}

async function loadCanberraStatic() {
  return loadGtfsStatic({
    url: CANBERRA_GTFS_STATIC_URL,
    routeTypes: LIGHT_RAIL_ROUTE_TYPES,
    timeZone: CANBERRA_TIME_ZONE,
    headers: authHeaders(),
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

  throw new Error(`Unknown Canberra station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadCanberraStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await fetchTripUpdates(CANBERRA_GTFS_RT_TRIP_UPDATES_URL, {
    headers: authHeaders(),
  });
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: CANBERRA_TIME_ZONE,
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
