/**
 * Vancouver SkyTrain — TransLink static GTFS (no key) + GTFS-RT v3 (TRANSLINK_API_KEY).
 * Expo, Millennium, Canada Line only. Not city=canada. Attribute TransLink.
 * RTTI is retired; do not call it.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
import { readTranslinkApiKey, translinkRealtimeUrl } from "./gtfs/auth.js";
import {
  foldKey,
  HUB,
  mapVancouverDestination,
} from "../cities/vancouver/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const VANCOUVER_TIME_ZONE = "America/Vancouver";
export const VANCOUVER_GTFS_STATIC_URL = "https://gtfs-static.translink.ca/gtfs/google_transit.zip";
export const VANCOUVER_USER_AGENT = "next-train";
const RT_TTL_MS = 20_000;

/**
 * Decoupled from data source on purpose: this city runs static-schedule-only
 * in production today (fixture-backed, no RT). Re-enabling RT is a deliberate
 * product decision, not a side effect of moving the static data off git.
 * @see docs/jim-brief-gtfs-data-platform-scale.md#2.5
 */
const VANCOUVER_STATIC_ONLY = true;
const catalogPath = join(__dirname, "../cities/vancouver/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

let rtCache = { expires: 0, index: null, fetchedAt: null };

function translinkHeaders() {
  return {
    "User-Agent": VANCOUVER_USER_AGENT,
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

async function loadVancouverStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("vancouver"),
    routeTypes: ["1"],
    timeZone: VANCOUVER_TIME_ZONE,
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
  throw new Error(`Unknown Vancouver station: ${stationIdOrName}`);
}

function isSkyTrainTrip(trip) {
  const blob = `${trip.routeShortName || ""} ${trip.routeLongName || ""} ${trip.destination || ""}`;
  return /expo line|millennium line|canada line/i.test(blob);
}

async function loadRealtimeIndex() {
  const now = Date.now();
  if (rtCache.index && now < rtCache.expires) {
    return rtCache;
  }
  const url = translinkRealtimeUrl(readTranslinkApiKey());
  const realtime = await fetchTripUpdates(url, { headers: translinkHeaders() });
  const index = indexTripUpdates(realtime.entities);
  rtCache = { expires: now + RT_TTL_MS, index, fetchedAt: realtime.fetchedAt };
  return rtCache;
}

export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const staticData = await loadVancouverStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  let realtimeIndex = {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
  };
  let fetchedAt = new Date();
  try {
    if (!VANCOUVER_STATIC_ONLY) {
      const rt = await loadRealtimeIndex();
      realtimeIndex = rt.index;
      fetchedAt = rt.fetchedAt ?? fetchedAt;
    }
  } catch {
    /* Static SkyTrain board is enough when the RT key is missing or the feed is slow. */
  }

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: VANCOUVER_TIME_ZONE,
    now,
  })
    .filter(isSkyTrainTrip)
    .map((trip) => ({
      ...trip,
      destination: mapVancouverDestination(trip.destination, trip.routeLongName || trip.routeShortName),
    }));

  return {
    stationName: catalogEntry?.name ?? HUB,
    lastUpdate: fetchedAt.toISOString(),
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
