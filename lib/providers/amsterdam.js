/**
 * Amsterdam GVB metro — OVapi GTFS + GTFS-RT, no API key.
 * Metro lines 50–54 only. Not city=nl. User-Agent next-train (not GVB).
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
import {
  foldKey,
  HUB,
  mapAmsterdamDestination,
} from "../cities/amsterdam/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";
export const AMSTERDAM_GTFS_STATIC_URL = "https://gtfs.ovapi.nl/gtfs-nl.zip";
export const AMSTERDAM_GTFS_RT_TRIP_UPDATES_URL = "https://gtfs.ovapi.nl/nl/tripUpdates.pb";
export const AMSTERDAM_USER_AGENT = "next-train";
export const AMSTERDAM_METRO_SHORT_NAMES = ["50", "51", "52", "53", "54"];

const FIXTURE_DIR = join(ROOT, "qa/fixtures/amsterdam/gtfs");
const catalogPath = join(__dirname, "../cities/amsterdam/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function ovapiHeaders() {
  return {
    "User-Agent": AMSTERDAM_USER_AGENT,
    "Accept-Encoding": "gzip",
  };
}

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  if (foldKey(raw) === "amsterdam centraal") {
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

async function loadAmsterdamStatic() {
  if (existsSync(join(FIXTURE_DIR, "stops.txt"))) {
    return loadGtfsStaticFromDirectory(FIXTURE_DIR, {
      routeTypes: ["1"],
      includeRouteShortNames: AMSTERDAM_METRO_SHORT_NAMES,
      agencyIds: ["GVB"],
      timeZone: AMSTERDAM_TIME_ZONE,
      sourceUrl: AMSTERDAM_GTFS_STATIC_URL,
    });
  }
  return loadGtfsStatic({
    url: AMSTERDAM_GTFS_STATIC_URL,
    routeTypes: ["1"],
    includeRouteShortNames: AMSTERDAM_METRO_SHORT_NAMES,
    agencyIds: ["GVB"],
    timeZone: AMSTERDAM_TIME_ZONE,
    headers: ovapiHeaders(),
    ifModifiedSince: true,
  });
}

async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (catalogEntry?.stopIds?.length) {
    return catalogEntry.stopIds;
  }
  if (foldKey(stationIdOrName) === "amsterdam centraal") {
    throw new Error("Amsterdam Centraal is NS — use Centraal Station for GVB metro");
  }
  const fromGtfs = findRailStopIdsForName(staticData, catalogEntry?.name ?? stationIdOrName);
  if (fromGtfs.length > 0) {
    return fromGtfs;
  }
  throw new Error(`Unknown Amsterdam station: ${stationIdOrName}`);
}

export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const staticData = await loadAmsterdamStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  let realtimeIndex = {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
  };
  let fetchedAt = new Date();
  try {
    if (existsSync(join(FIXTURE_DIR, "stops.txt"))) {
      throw new Error("skip-national-rt");
    }
    const realtime = await fetchTripUpdates(AMSTERDAM_GTFS_RT_TRIP_UPDATES_URL, {
      headers: ovapiHeaders(),
      timeoutMs: 2500,
    });
    fetchedAt = realtime.fetchedAt;
    const byRealtimeId = new Map();
    for (const trip of staticData.tripsById.values()) {
      const key = String(trip.realtime_trip_id || "").trim();
      if (key) {
        byRealtimeId.set(key, trip.trip_id);
      }
    }
    realtimeIndex = indexTripUpdates(realtime.entities, {
      resolveTripId(descriptor) {
        const routeId = String(descriptor.routeId || "").trim();
        if (routeId && !staticData.railRouteIds.has(String(routeId))) {
          return null;
        }
        const rawId = String(descriptor.tripId || "").trim();
        const gvbKey = rawId.match(/(GVB:\d+:\d+)$/)?.[1];
        if (!gvbKey) {
          return null;
        }
        return byRealtimeId.get(gvbKey) ?? null;
      },
    });
  } catch {
    /* OVapi RT is optional for a static board (429 / timeout). */
  }
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: AMSTERDAM_TIME_ZONE,
    now,
  })
    .filter((trip) => AMSTERDAM_METRO_SHORT_NAMES.includes(String(trip.routeShortName || "").trim()))
    .map((trip) => ({
      ...trip,
      destination: mapAmsterdamDestination(trip.destination, trip.routeShortName),
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
