/**
 * Adelaide (Adelaide Metro) rail provider — GTFS + GTFS-RT.
 * Adapter ready; city remains `planned` in registry (not live).
 *
 * Static: https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip
 * RT: https://gtfs.adelaidemetro.com.au/v1/realtime/trip_updates
 * Auth: optional ADELAIDE_METRO_API_KEY (x-api-key) — public feeds work without key
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { adelaideAuthHeaders, readAdelaideMetroApiKey } from "./gtfs/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ADELAIDE_TIME_ZONE = "Australia/Adelaide";

export const ADELAIDE_GTFS_STATIC_URL =
  "https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip";

export const ADELAIDE_GTFS_RT_TRIP_UPDATES_URL =
  "https://gtfs.adelaidemetro.com.au/v1/realtime/trip_updates";

const catalogPath = join(__dirname, "../cities/adelaide/stations.json");
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
  return adelaideAuthHeaders(readAdelaideMetroApiKey());
}

async function loadAdelaideStatic() {
  return loadGtfsStatic({
    url: ADELAIDE_GTFS_STATIC_URL,
    railOnly: true,
    timeZone: ADELAIDE_TIME_ZONE,
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

  throw new Error(`Unknown Adelaide station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadAdelaideStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await fetchTripUpdates(ADELAIDE_GTFS_RT_TRIP_UPDATES_URL, {
    headers: authHeaders(),
  });
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: ADELAIDE_TIME_ZONE,
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
