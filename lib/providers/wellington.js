/**
 * Wellington (Metlink) suburban rail — GTFS + GTFS-RT.
 * Live (flipped by Tim, 30 Aug 2026). TRAIN only.
 * Do not fold into Auckland.
 *
 * Static (no key): https://static.opendata.metlink.org.nz/v1/gtfs/full.zip
 * RT: https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates
 * Auth: METLINK_API_KEY → x-api-key
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { metlinkAuthHeaders, readMetlinkApiKey } from "./gtfs/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const WELLINGTON_TIME_ZONE = "Pacific/Auckland";

export const WELLINGTON_GTFS_STATIC_URL =
  "https://static.opendata.metlink.org.nz/v1/gtfs/full.zip";

export const WELLINGTON_GTFS_RT_TRIP_UPDATES_URL =
  "https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates";

// Explicit allowlist of the five real Metlink suburban rail lines. railOnly alone isn't
// enough on the full.zip: Capital Connection or other route_type=2 rows can otherwise leak
// onto boards even though they're excluded from the trimmed test fixture.
export const WELLINGTON_ROUTE_SHORT_NAMES = ["KPL", "HVL", "MEL", "JVL", "WRL"];

const catalogPath = join(__dirname, "../cities/wellington/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
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
  return metlinkAuthHeaders(readMetlinkApiKey());
}

async function loadWellingtonStatic() {
  return loadGtfsStatic({
    url: WELLINGTON_GTFS_STATIC_URL,
    railOnly: true,
    includeRouteShortNames: WELLINGTON_ROUTE_SHORT_NAMES,
    timeZone: WELLINGTON_TIME_ZONE,
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

  throw new Error(`Unknown Wellington station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadWellingtonStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await fetchTripUpdates(WELLINGTON_GTFS_RT_TRIP_UPDATES_URL, {
    headers: authHeaders(),
  });
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: WELLINGTON_TIME_ZONE,
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
