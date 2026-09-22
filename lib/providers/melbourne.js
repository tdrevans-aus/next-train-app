/**
 * Melbourne (Metro Trains + V/Line walk-up services) rail provider —
 * GTFS static-join over the Transport Victoria Open Data Portal's GTFS-RT feeds.
 * Adapter ready; city remains `planned` in registry (not live) — see
 * docs/melbourne-d1/jim-handoff.md.
 *
 * This supersedes the earlier PTV Timetable API path (the devid/PTV_API_KEY HMAC
 * key never arrived) — that integration and lib/providers/ptv/ are retired.
 *
 * Static (published to Vercel Blob by scripts/publish-melbourne-gtfs-to-blob.mjs —
 * the raw Transport Victoria zip-of-zips is ~293MB and must never be fetched or
 * parsed on the request path):
 *   Metro:  gtfsFixtureBlobUrl("melbourne")        (folder 2 of the statewide zip)
 *   V/Line: gtfsFixtureBlobUrl("melbourne-vline")  (folder 1 of the statewide zip)
 * Realtime (GTFS-RT trip updates, header KeyID, env VIC_OPENDATA_API_KEY):
 *   Metro:  https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates
 *   V/Line: https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/vline/trip-updates
 *
 * Live-only boards: a trip with no matching GTFS-RT stop_time_update/trip-level
 * delay is dropped, never backfilled from the static timetable as if it were live
 * (docs/jim-brief-boston-subway-live-predictions.md's lesson — a scheduled board
 * must never be presented as live). See dropUnconfirmedTrips() below.
 *
 * Direction labels: line + terminus, with a "via City Loop" suffix appended only
 * at Flinders Street / Southern Cross / Flagstaff / Melbourne Central / Parliament,
 * derived per-trip from the *static* stop-sequence (never headsign alone, never a
 * time-of-day rule) — see lib/cities/melbourne/direction-labels.js and
 * docs/melbourne-d1/{direction-model-memo.md,tim-decisions-2026-09-20.md}.
 *
 * V/Line walk-up services (Geelong/Ballarat/Bendigo/Seymour/Traralgon/Echuca/Ararat/
 * Maryborough/Shepparton/Bairnsdale/Swan Hill) are `in` at the shared Metro stations;
 * Albury/Warrnambool (fully reserved) are excluded structurally by route, never by
 * dropping the shared station — docs/melbourne-d1/hazard-pack.md's Board eligibility
 * section.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  loadGtfsStatic,
  findRailStopIdsForName,
  mergeGtfsStaticData,
} from "./gtfs/static-cache.js";
import { indexTripUpdates, mergeTripUpdateEntities } from "./gtfs/realtime.js";
import { fetchOvapiTripUpdates } from "./gtfs/ovapi-tripupdates-cache.js";
import { buildBoardForStops, findNextServiceDate } from "./gtfs/board.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { vicOpenDataAuthHeaders, readVicOpenDataApiKey } from "./gtfs/auth.js";
import {
  METRO_LINE_NAMES,
  CITY_LOOP_STATIONS,
  routeCodeFromTripId,
  buildLoopTripIdSet,
  buildMetroDirectionLabel,
  buildVlineDirectionLabel,
  isVlineTripAllowed,
} from "../cities/melbourne/direction-labels.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MELBOURNE_TIME_ZONE = "Australia/Melbourne";

export const MELBOURNE_METRO_GTFS_RT_TRIP_UPDATES_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates";
export const MELBOURNE_VLINE_GTFS_RT_TRIP_UPDATES_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/vline/trip-updates";

/**
 * routes.txt's route_type for every Metro Trains route (incl. the paired
 * "-R" rail-replacement-bus routes and the out-of-scope "City Circle" route)
 * is the extended GTFS code "400" (urban railway), not the ordinary heavy-
 * rail "2" V/Line uses — so railOnly can't be used here. "-R" routes and
 * City Circle share route_short_name "Replacement Bus" / "City Circle",
 * which excludeRouteShortNames filters cleanly (docs/melbourne-d1/
 * gtfs-reconciliation.md).
 */
const METRO_ROUTE_TYPES = ["400"];
const METRO_EXCLUDED_ROUTE_SHORT_NAMES = ["Replacement Bus", "City Circle"];

const catalogPath = join(__dirname, "../cities/melbourne/stations.json");
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
  return vicOpenDataAuthHeaders(readVicOpenDataApiKey());
}

/**
 * Retry a static-snapshot fetch a couple of times with a short backoff — the
 * ~24-49MB blob fetches observed transient ECONNRESET failures in testing
 * (large single-connection downloads), and loadGtfsStatic's own 6h TTL cache
 * means a retry here only ever costs one cold start, never a steady-state
 * per-request penalty.
 */
async function withRetry(loader, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function loadMelbourneMetroStatic() {
  return withRetry(() =>
    loadGtfsStatic({
      url: gtfsFixtureBlobUrl("melbourne"),
      routeTypes: METRO_ROUTE_TYPES,
      excludeRouteShortNames: METRO_EXCLUDED_ROUTE_SHORT_NAMES,
      timeZone: MELBOURNE_TIME_ZONE,
      ifModifiedSince: true,
    })
  );
}

export async function loadMelbourneVlineStatic() {
  return withRetry(() =>
    loadGtfsStatic({
      url: gtfsFixtureBlobUrl("melbourne-vline"),
      railOnly: true,
      timeZone: MELBOURNE_TIME_ZONE,
      ifModifiedSince: true,
    })
  );
}

/**
 * Merge the two static datasets, memoized by source-object identity so a
 * request fanning out across several directions for one station re-merges
 * only when the underlying (6h TTL'd) static snapshots actually change —
 * never once per direction (docs/jim-brief-boston-subway-live-predictions.md).
 */
let mergedStaticCache = null;
export async function loadMelbourneCombinedStatic() {
  const [metroStatic, vlineStatic] = await Promise.all([
    loadMelbourneMetroStatic(),
    loadMelbourneVlineStatic(),
  ]);
  if (
    mergedStaticCache &&
    mergedStaticCache.metroStatic === metroStatic &&
    mergedStaticCache.vlineStatic === vlineStatic
  ) {
    return mergedStaticCache.merged;
  }
  const merged = mergeGtfsStaticData(metroStatic, vlineStatic);
  mergedStaticCache = { metroStatic, vlineStatic, merged };
  return merged;
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
  throw new Error(`Unknown Melbourne station: ${stationIdOrName}`);
}

function loopStopIds(staticData) {
  const ids = [];
  for (const name of CITY_LOOP_STATIONS) {
    const entry = resolveCatalogEntry(name);
    if (entry?.stopIds?.length) {
      ids.push(...entry.stopIds);
    } else {
      ids.push(...findRailStopIdsForName(staticData, name));
    }
  }
  return ids;
}

/**
 * Live-only rule: a trip the RT feed said nothing about (no stop_time_update
 * for this stop, no trip-level delay) is a scheduled-time guess, not a live
 * fact — drop it rather than present a timetable time as live
 * (docs/jim-brief-boston-subway-live-predictions.md).
 */
function tripHasRealtimeConfirmation(trip, realtimeIndex) {
  const key = `${trip.tripId}:${trip.stopId}`;
  return realtimeIndex.stopUpdates.has(key) || realtimeIndex.tripDelaySec.has(trip.tripId);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const staticData = await loadMelbourneCombinedStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  const stationName = catalogEntry?.name ?? stationIdOrName;

  const headers = authHeaders();
  const [metroFeed, vlineFeed] = await Promise.all([
    fetchOvapiTripUpdates(MELBOURNE_METRO_GTFS_RT_TRIP_UPDATES_URL, { headers }),
    fetchOvapiTripUpdates(MELBOURNE_VLINE_GTFS_RT_TRIP_UPDATES_URL, { headers }),
  ]);
  const { entities, fetchedAt } = mergeTripUpdateEntities([metroFeed, vlineFeed]);
  const realtimeIndex = indexTripUpdates(entities);

  let trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: MELBOURNE_TIME_ZONE,
    now,
    horizonMinutes: options.horizonMinutes,
    cityId: "melbourne",
  });

  // Live-only: drop anything the RT feed didn't actually confirm.
  trips = trips.filter((trip) => tripHasRealtimeConfirmation(trip, realtimeIndex));

  // Albury/Warrnambool are fully reserved — excluded structurally by route,
  // never by dropping the shared station (docs/melbourne-d1/hazard-pack.md).
  trips = trips.filter((trip) => isVlineTripAllowed(trip.tripId));

  const loopTripIds = buildLoopTripIdSet(staticData, loopStopIds(staticData));

  trips = trips.map((trip) => {
    const code = routeCodeFromTripId(trip.tripId);
    const isMetro = Object.prototype.hasOwnProperty.call(METRO_LINE_NAMES, code);
    const destination = isMetro
      ? buildMetroDirectionLabel({
          tripId: trip.tripId,
          destination: trip.destination,
          stationName,
          isViaLoop: loopTripIds.has(trip.tripId),
        })
      : buildVlineDirectionLabel({ destination: trip.destination });
    return { ...trip, destination, realtime: true };
  });

  let nextServiceDate = null;
  if (trips.length === 0) {
    nextServiceDate = findNextServiceDate({
      stopIds,
      staticData,
      timeZone: MELBOURNE_TIME_ZONE,
      now,
      filterTrip: (trip) => isVlineTripAllowed(trip.tripId),
    });
  }

  return {
    stationName,
    lastUpdate: fetchedAt.toISOString(),
    trips,
    realtime: true,
    nextServiceDate,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { resolveCatalogEntry };
