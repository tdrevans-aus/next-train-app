/**
 * Canberra light rail — public CMO GTFS + GTFS-RT. No MyWay+ key.
 * Route 1 only (Gungahlin Place–Alinga Street). Not buses. Stage 2A not passenger-open.
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
  mapCanberraDestination,
} from "../cities/canberra/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CANBERRA_TIME_ZONE = "Australia/Sydney";
export const CANBERRA_GTFS_STATIC_URL =
  "https://www.transport.act.gov.au/googletransit/google_transit_lr.zip";
export const CANBERRA_GTFS_RT_TRIP_UPDATES_URL = "https://files.transport.act.gov.au/feeds/lightrail.pb";
export const CANBERRA_USER_AGENT = "next-train";
export const CANBERRA_ROUTE_SHORT_NAMES = ["1"];
const RT_TTL_MS = 20_000;

/**
 * Decoupled from data source on purpose: this city runs static-schedule-only
 * in production today (fixture-backed, no RT). Re-enabling RT is a deliberate
 * product decision, not a side effect of moving the static data off git.
 * @see docs/jim-brief-gtfs-data-platform-scale.md#2.5
 */
const CANBERRA_STATIC_ONLY = true;
const catalogPath = join(__dirname, "../cities/canberra/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

let rtCache = { expires: 0, index: null, fetchedAt: null };

function cmoHeaders() {
  return {
    "User-Agent": CANBERRA_USER_AGENT,
    Accept: "application/zip, application/x-google-protobuf, application/octet-stream, */*",
  };
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

async function loadCanberraStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("canberra"),
    routeTypes: ["0"],
    includeRouteShortNames: CANBERRA_ROUTE_SHORT_NAMES,
    timeZone: CANBERRA_TIME_ZONE,
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
  throw new Error(`Unknown Canberra station: ${stationIdOrName}`);
}

async function loadRealtimeIndex() {
  const now = Date.now();
  if (rtCache.index && now < rtCache.expires) {
    return rtCache;
  }
  if (CANBERRA_STATIC_ONLY) {
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
  try {
    const realtime = await fetchTripUpdates(CANBERRA_GTFS_RT_TRIP_UPDATES_URL, {
      headers: cmoHeaders(),
    });
    const index = indexTripUpdates(realtime.entities);
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
  const staticData = await loadCanberraStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  const rt = await loadRealtimeIndex();
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: rt.index,
    timeZone: CANBERRA_TIME_ZONE,
    now,
  })
    .filter((trip) => CANBERRA_ROUTE_SHORT_NAMES.includes(String(trip.routeShortName || "").trim()))
    .map((trip) => ({
      ...trip,
      destination: mapCanberraDestination(trip.destination),
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
