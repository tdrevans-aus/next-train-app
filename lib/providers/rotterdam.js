/**
 * Rotterdam RET metro — OVapi GTFS + GTFS-RT, no API key.
 * Metro lines A–E only. Not amsterdam / city=nl. User-Agent next-train.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { indexTripUpdates } from "./gtfs/realtime.js";
import { fetchOvapiTripUpdates } from "./gtfs/ovapi-tripupdates-cache.js";
import { buildBoardForStops, NEAR_HORIZON_MINUTES } from "./gtfs/board.js";
import {
  foldKey,
  HUB,
  mapRotterdamDestination,
} from "../cities/rotterdam/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROTTERDAM_TIME_ZONE = "Europe/Amsterdam";
export const ROTTERDAM_GTFS_STATIC_URL = "https://gtfs.ovapi.nl/gtfs-nl.zip";
export const ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL = "https://gtfs.ovapi.nl/nl/tripUpdates.pb";
export const ROTTERDAM_USER_AGENT = "next-train";
export const ROTTERDAM_METRO_SHORT_NAMES = ["A", "B", "C", "D", "E"];
const GVB_SHORT_NAMES = new Set(["50", "51", "52", "53", "54"]);

const catalogPath = join(__dirname, "../cities/rotterdam/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function ovapiHeaders() {
  return {
    "User-Agent": ROTTERDAM_USER_AGENT,
    "Accept-Encoding": "gzip",
  };
}

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  const needle = foldKey(raw);
  if (needle === "centraal station" || needle === "amsterdam centraal") {
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
    if (entry.stopIds?.includes(raw)) {
      return entry;
    }
  }
  return null;
}

export async function loadRotterdamStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("rotterdam"),
    routeTypes: ["1"],
    includeRouteShortNames: ROTTERDAM_METRO_SHORT_NAMES,
    agencyIds: ["RET"],
    timeZone: ROTTERDAM_TIME_ZONE,
    ifModifiedSince: true,
  });
}

async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (catalogEntry?.stopIds?.length) {
    return catalogEntry.stopIds;
  }
  if (foldKey(stationIdOrName) === "centraal station") {
    throw new Error("Centraal Station is Amsterdam GVB — use Beurs for RET metro");
  }
  const fromGtfs = findRailStopIdsForName(staticData, catalogEntry?.name ?? stationIdOrName);
  if (fromGtfs.length > 0) {
    return fromGtfs;
  }
  throw new Error(`Unknown Rotterdam station: ${stationIdOrName}`);
}

export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const staticData = await loadRotterdamStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  let realtimeIndex = {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
  };
  let fetchedAt = new Date();
  let realtimeStatus = "timetable";
  try {
    const realtime = await fetchOvapiTripUpdates(ROTTERDAM_GTFS_RT_TRIP_UPDATES_URL, {
      headers: ovapiHeaders(),
      noCache: options.noCache,
    });
    fetchedAt = realtime.fetchedAt;
    // A stale-served entry (<60s old, from a failed refresh) still carries
    // real delay/cancellation corrections, so it counts as "live" — only a
    // total miss (fetch failed and nothing usable) falls to "timetable".
    realtimeStatus = "live";
    const byRealtimeId = new Map();
    for (const trip of staticData.tripsById.values()) {
      const key = String(trip.realtime_trip_id || "").trim();
      if (key) {
        byRealtimeId.set(key, trip.trip_id);
      }
    }
    realtimeIndex = indexTripUpdates(realtime.entities, {
      // OVapi's national TripUpdates feed mostly carries the bare static
      // trip_id in TripDescriptor.trip_id (measured live: ~50 RET metro
      // entities/fetch matched this way vs 0 via the `RET:M<n>:<n>` prefixed
      // realtime_trip_id form). Try the direct match first; fall back to the
      // prefixed realtime_trip_id join for entities that do use it.
      resolveTripId(descriptor) {
        const routeId = String(descriptor.routeId || "").trim();
        if (routeId && !staticData.railRouteIds.has(String(routeId))) {
          return null;
        }
        const rawId = String(descriptor.tripId || "").trim();
        if (!rawId) {
          return null;
        }
        if (/GVB:/i.test(rawId)) {
          return null;
        }
        if (staticData.tripsById.has(rawId)) {
          return rawId;
        }
        const retKey = rawId.match(/(RET:M\d+:\d+)$/)?.[1];
        if (!retKey) {
          return null;
        }
        return byRealtimeId.get(retKey) ?? null;
      },
    });
  } catch {
    /* OVapi RT is optional for a static board (429 / timeout). */
  }
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: ROTTERDAM_TIME_ZONE,
    now,
    horizonMinutes: options.horizonMinutes ?? NEAR_HORIZON_MINUTES,
  })
    .filter((trip) => {
      const shortName = String(trip.routeShortName || "").trim().toUpperCase();
      if (GVB_SHORT_NAMES.has(shortName)) {
        return false;
      }
      return ROTTERDAM_METRO_SHORT_NAMES.includes(shortName);
    })
    .map((trip) => ({
      ...trip,
      destination: mapRotterdamDestination(trip.destination, trip.routeShortName),
    }));

  return {
    stationName: catalogEntry?.name ?? HUB,
    lastUpdate: fetchedAt.toISOString(),
    // Internal marker (see docs/jim-brief-nl-realtime-cache.md) — not yet
    // wired into api/next-train.js's response shape or any UI; a follow-up
    // per the guardrail against touching that shape from this lane.
    realtime: realtimeStatus,
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
