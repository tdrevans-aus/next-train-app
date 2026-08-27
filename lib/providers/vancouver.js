/**
 * Vancouver SkyTrain — TransLink static GTFS (no key) + GTFS-RT v3 (TRANSLINK_API_KEY).
 * Expo, Millennium, Canada Line only. Not city=canada. Attribute TransLink.
 * RTTI is retired; do not call it.
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
import { readTranslinkApiKey, translinkRealtimeUrl } from "./gtfs/auth.js";
import {
  foldKey,
  HUB,
  mapVancouverDestination,
} from "../cities/vancouver/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export const VANCOUVER_TIME_ZONE = "America/Vancouver";
export const VANCOUVER_GTFS_STATIC_URL = "https://gtfs-static.translink.ca/gtfs/google_transit.zip";
export const VANCOUVER_USER_AGENT = "next-train";
const RT_TTL_MS = 20_000;

const FIXTURE_DIR = join(ROOT, "qa/fixtures/vancouver/gtfs");
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
  if (existsSync(join(FIXTURE_DIR, "stops.txt"))) {
    return loadGtfsStaticFromDirectory(FIXTURE_DIR, {
      routeTypes: ["1"],
      timeZone: VANCOUVER_TIME_ZONE,
      sourceUrl: VANCOUVER_GTFS_STATIC_URL,
    });
  }
  return loadGtfsStatic({
    url: VANCOUVER_GTFS_STATIC_URL,
    routeTypes: ["1"],
    timeZone: VANCOUVER_TIME_ZONE,
    headers: translinkHeaders(),
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
    if (!existsSync(join(FIXTURE_DIR, "stops.txt"))) {
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
