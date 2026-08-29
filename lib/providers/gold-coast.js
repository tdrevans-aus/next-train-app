/**
 * Gold Coast G:link — TransLink SEQ GTFS (no key), filtered to L1 light rail.
 * Not part of Brisbane. No SEQ trains, buses, or ferries.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import {
  foldKey,
  HUB,
  mapGoldCoastDestination,
} from "../cities/gold-coast/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const GOLD_COAST_TIME_ZONE = "Australia/Brisbane";
export const SEQ_GTFS_STATIC_URL = "https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip";
export const SEQ_GTFS_RT_TRIP_UPDATES_URL =
  "https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates";
export const GOLD_COAST_ROUTE_SHORT_NAMES = ["L1"];
const RT_TTL_MS = 20_000;

const catalogPath = join(__dirname, "../cities/gold-coast/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

let rtCache = { expires: 0, index: null, fetchedAt: null };

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  const needle = foldKey(raw);
  for (const entry of stationCatalog.stations ?? []) {
    if (foldKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (foldKey(alias) === needle) {
        return entry;
      }
    }
    if (entry.stopIds?.includes(raw)) {
      return entry;
    }
  }
  return null;
}

async function loadGoldCoastStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("gold-coast"),
    routeTypes: ["0"],
    includeRouteShortNames: GOLD_COAST_ROUTE_SHORT_NAMES,
    timeZone: GOLD_COAST_TIME_ZONE,
    ifModifiedSince: true,
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
  throw new Error(`Unknown Gold Coast station: ${stationIdOrName}`);
}

async function loadRealtimeIndex(staticData) {
  const now = Date.now();
  if (rtCache.index && now < rtCache.expires) {
    return rtCache;
  }
  try {
    const realtime = await fetchTripUpdates(SEQ_GTFS_RT_TRIP_UPDATES_URL);
    const allowedTrips = staticData.tripsById;
    const index = indexTripUpdates(realtime.entities, {
      resolveTripId(descriptor) {
        const tripId = String(descriptor.tripId || "").trim();
        if (!tripId || !allowedTrips.has(tripId)) {
          return null;
        }
        return tripId;
      },
    });
    rtCache = { expires: now + RT_TTL_MS, index, fetchedAt: realtime.fetchedAt };
    return rtCache;
  } catch {
    return {
      expires: now + RT_TTL_MS,
      index: {
        tripDelaySec: new Map(),
        stopUpdates: new Map(),
        cancelledTrips: new Set(),
      },
      fetchedAt: new Date(),
    };
  }
}

export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const staticData = await loadGoldCoastStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  const rt = await loadRealtimeIndex(staticData);
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: rt.index,
    timeZone: GOLD_COAST_TIME_ZONE,
    now,
  })
    .filter((trip) => GOLD_COAST_ROUTE_SHORT_NAMES.includes(String(trip.routeShortName || "").trim().toUpperCase()))
    .map((trip) => ({
      ...trip,
      destination: mapGoldCoastDestination(trip.destination),
    }));

  return {
    stationName: catalogEntry?.name ?? HUB,
    lastUpdate: (rt.fetchedAt ?? new Date()).toISOString(),
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
