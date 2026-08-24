/**
 * Sydney (TfNSW) rail + metro provider — GTFS + GTFS-RT via Open Data Hub.
 * Adapter ready; city remains `planned` in registry (not live).
 *
 * Static: https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains (+ metro)
 * RT: https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains (+ metro)
 * Auth: TFNSW_API_KEY → Authorization: apikey <key>
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  loadGtfsStatic,
  mergeGtfsStaticData,
  findRailStopIdsForName,
} from "./gtfs/static-cache.js";
import {
  fetchTripUpdates,
  mergeTripUpdateEntities,
  indexTripUpdates,
} from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { tfnswAuthHeaders, readTfnswApiKey } from "./gtfs/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SYDNEY_TIME_ZONE = "Australia/Sydney";

/** Pinned TfNSW Sydney Trains static GTFS. */
export const SYDNEY_TRAINS_STATIC_URL =
  "https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains";

/** Pinned TfNSW Sydney Metro static GTFS. */
export const SYDNEY_METRO_STATIC_URL = "https://api.transport.nsw.gov.au/v1/gtfs/schedule/metro";

/** Pinned TfNSW Sydney Trains TripUpdates. */
export const SYDNEY_TRAINS_RT_URL =
  "https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains";

/** Pinned TfNSW Sydney Metro TripUpdates. */
export const SYDNEY_METRO_RT_URL = "https://api.transport.nsw.gov.au/v2/gtfs/realtime/metro";

const catalogPath = join(__dirname, "../cities/sydney/stations.json");
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
  return tfnswAuthHeaders(readTfnswApiKey());
}

async function loadSydneyStatic() {
  const headers = authHeaders();
  const trains = await loadGtfsStatic({
    url: SYDNEY_TRAINS_STATIC_URL,
    railOnly: true,
    timeZone: SYDNEY_TIME_ZONE,
    headers,
  });

  try {
    const metro = await loadGtfsStatic({
      url: SYDNEY_METRO_STATIC_URL,
      routeTypes: ["1", "401"],
      timeZone: SYDNEY_TIME_ZONE,
      headers,
    });
    return mergeGtfsStaticData(trains, metro);
  } catch (err) {
    console.warn(`Sydney Metro static feed skipped: ${err?.message ?? err}`);
    return trains;
  }
}

async function loadSydneyRealtime() {
  const headers = authHeaders();
  const trains = await fetchTripUpdates(SYDNEY_TRAINS_RT_URL, { headers });

  let metro = { entities: [], fetchedAt: trains.fetchedAt };
  try {
    metro = await fetchTripUpdates(SYDNEY_METRO_RT_URL, { headers });
  } catch (err) {
    console.warn(`Sydney Metro realtime feed skipped: ${err?.message ?? err}`);
  }

  return mergeTripUpdateEntities([trains, metro]);
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

  throw new Error(`Unknown Sydney station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadSydneyStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await loadSydneyRealtime();
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: SYDNEY_TIME_ZONE,
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
