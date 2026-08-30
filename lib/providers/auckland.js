/**
 * Auckland (AT) suburban rail — GTFS + GTFS-RT.
 * Testers live. TRAIN only.
 *
 * Static (no key): https://gtfs.at.govt.nz/gtfs.zip
 * RT: https://api.at.govt.nz/realtime/legacy/tripupdates
 * Auth: AT_API_KEY → Ocp-Apim-Subscription-Key
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { aucklandAuthHeaders, readAucklandApiKey } from "./gtfs/auth.js";
import { mapAucklandDestination } from "../cities/auckland/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const AUCKLAND_TIME_ZONE = "Pacific/Auckland";

export const AUCKLAND_GTFS_STATIC_URL = "https://gtfs.at.govt.nz/gtfs.zip";

export const AUCKLAND_GTFS_RT_TRIP_UPDATES_URL =
  "https://api.at.govt.nz/realtime/legacy/tripupdates";

/** Te Huia is KiwiRail long-distance — out of v1. */
export const AUCKLAND_EXCLUDE_ROUTE_SHORT_NAMES = ["HUIA"];

const catalogPath = join(__dirname, "../cities/auckland/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+train station$/i, "")
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

function resolveCatalogEntry(stationIdOrName) {
  const needle = foldKey(stationIdOrName);
  if (!needle) {
    return null;
  }

  for (const entry of stationCatalog.stations ?? []) {
    if (foldKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (foldKey(alias) === needle) {
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
  return aucklandAuthHeaders(readAucklandApiKey());
}

async function loadAucklandStatic() {
  return loadGtfsStatic({
    url: AUCKLAND_GTFS_STATIC_URL,
    railOnly: true,
    excludeRouteShortNames: AUCKLAND_EXCLUDE_ROUTE_SHORT_NAMES,
    timeZone: AUCKLAND_TIME_ZONE,
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

  throw new Error(`Unknown Auckland station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadAucklandStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await fetchTripUpdates(AUCKLAND_GTFS_RT_TRIP_UPDATES_URL, {
    headers: authHeaders(),
  });
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: AUCKLAND_TIME_ZONE,
  }).map((trip) => ({
    ...trip,
    destination: mapAucklandDestination(trip.destination, trip.routeShortName),
  }));

  return {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
