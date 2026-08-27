/**
 * Newcastle Light Rail — TfNSW NLR GTFS + GTFS-RT (same TFNSW_API_KEY as Sydney).
 * Not part of Sydney. No Hunter / Central Coast trains, no Stockton ferry.
 * RT is the Newcastle Light Rail feed, not sydneytrains.
 */

import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  loadGtfsStatic,
  loadGtfsStaticFromDirectory,
  findRailStopIdsForName,
} from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { tfnswAuthHeaders, readTfnswApiKey } from "./gtfs/auth.js";
import {
  foldKey,
  HUB,
  mapNewcastleDestination,
} from "../cities/newcastle/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export const NEWCASTLE_TIME_ZONE = "Australia/Sydney";
export const NEWCASTLE_GTFS_STATIC_URL =
  "https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle";
export const NEWCASTLE_GTFS_RT_URL =
  "https://api.transport.nsw.gov.au/v1/gtfs/realtime/lightrail/newcastle";
export const NEWCASTLE_ROUTE_SHORT_NAMES = ["NLR"];
const RT_TTL_MS = 20_000;

const FIXTURE_DIR = join(ROOT, "qa/fixtures/newcastle/gtfs");
const catalogPath = join(__dirname, "../cities/newcastle/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

let rtCache = { expires: 0, index: null, fetchedAt: null };

function authHeaders() {
  const key = readTfnswApiKey();
  if (!key) {
    return {};
  }
  return tfnswAuthHeaders(key);
}

function hasNewcastleFixture() {
  return existsSync(join(FIXTURE_DIR, "stops.txt"));
}

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

async function loadNewcastleStatic() {
  if (hasNewcastleFixture()) {
    return loadGtfsStaticFromDirectory(FIXTURE_DIR, {
      routeTypes: ["0"],
      includeRouteShortNames: NEWCASTLE_ROUTE_SHORT_NAMES,
      timeZone: NEWCASTLE_TIME_ZONE,
      sourceUrl: NEWCASTLE_GTFS_STATIC_URL,
    });
  }
  const headers = tfnswAuthHeaders(readTfnswApiKey());
  return loadGtfsStatic({
    url: NEWCASTLE_GTFS_STATIC_URL,
    routeTypes: ["0"],
    includeRouteShortNames: NEWCASTLE_ROUTE_SHORT_NAMES,
    timeZone: NEWCASTLE_TIME_ZONE,
    headers,
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
    return fromGtfs.filter((id) => id !== "229310");
  }
  throw new Error(`Unknown Newcastle station: ${stationIdOrName}`);
}

async function loadRealtimeIndex(staticData) {
  const now = Date.now();
  if (rtCache.index && now < rtCache.expires) {
    return rtCache;
  }
  if (!readTfnswApiKey()) {
    rtCache = {
      expires: now + RT_TTL_MS,
      index: {
        tripDelaySec: new Map(),
        stopUpdates: new Map(),
        cancelledTrips: new Set(),
      },
      fetchedAt: new Date(),
    };
    return rtCache;
  }
  const realtime = await fetchTripUpdates(NEWCASTLE_GTFS_RT_URL, {
    headers: authHeaders(),
  });
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
}

export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const staticData = await loadNewcastleStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  const rt = await loadRealtimeIndex(staticData);
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: rt.index,
    timeZone: NEWCASTLE_TIME_ZONE,
    now,
  })
    .filter((trip) => NEWCASTLE_ROUTE_SHORT_NAMES.includes(String(trip.routeShortName || "").trim().toUpperCase()))
    .map((trip) => ({
      ...trip,
      destination: mapNewcastleDestination(trip.destination),
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
