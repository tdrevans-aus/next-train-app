/**
 * Shared GTFS static + GTFS-RT station board helper.
 * City adapters supply URLs, stop resolution, and optional trip mapping —
 * not a second parser.
 */

import { fetchTripUpdates, indexTripUpdates } from "./realtime.js";
import { buildBoardForStops, findNextServiceDate, NEAR_HORIZON_MINUTES } from "./board.js";

/**
 * @param {object} options
 * @param {() => Promise<object>} options.loadStatic
 * @param {(stationIdOrName: string, staticData: object) => Promise<string[]>|string[]} options.resolveStopIds
 * @param {(stationIdOrName: string) => { name?: string } | null} [options.resolveCatalogEntry]
 * @param {string} [options.tripUpdatesUrl] Omit or leave empty for schedule-only
 * @param {Record<string, string> | (() => Record<string, string>)} [options.tripUpdatesHeaders]
 * @param {string} options.timeZone
 * @param {(trip: object) => object} [options.mapTrip]
 * @param {(trip: object) => boolean} [options.filterTrip]
 * @param {Date} [options.now]
 * @param {number} [options.horizonMinutes]
 * @param {number} [options.realtimeTimeoutMs]
 * @param {string} [options.fallbackStationName]
 * @param {(entities: object[], staticData: object) => object} [options.indexRealtime]
 * @param {string} [options.cityId] Threaded into buildBoardForStops for runtime staleness
 *   detection (docs/jim-brief-gtfs-snapshot-freshness.md) — omit to skip health-registry recording.
 * @param {boolean} [options.skipResolvedShareCheck] Set true when the realtime feed is a known
 *   superset of what the static snapshot covers (a shared regional-operator feed carrying modes the
 *   snapshot trims away) — see amsterdam.js/gold-coast.js's equivalent comment. Calendar coverage
 *   is still checked either way.
 * @returns {Promise<{ stationName: string, lastUpdate: string, trips: object[], realtime: boolean }>}
 */
export async function fetchGtfsRealtimeBoard(stationIdOrName, options) {
  const now = options.now ?? new Date();
  const staticData = await options.loadStatic();
  const catalogEntry = options.resolveCatalogEntry?.(stationIdOrName) ?? null;
  const stopIds = await options.resolveStopIds(stationIdOrName, staticData);

  let realtimeIndex = {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
  };
  let fetchedAt = now;
  let realtime = false;

  const tripUpdatesUrl = String(options.tripUpdatesUrl || "").trim();
  if (tripUpdatesUrl) {
    try {
      const headers =
        typeof options.tripUpdatesHeaders === "function"
          ? options.tripUpdatesHeaders()
          : options.tripUpdatesHeaders ?? {};
      const feed = await fetchTripUpdates(tripUpdatesUrl, {
        headers,
        timeoutMs: options.realtimeTimeoutMs ?? 4000,
      });
      fetchedAt = feed.fetchedAt;
      realtimeIndex = options.indexRealtime
        ? options.indexRealtime(feed.entities, staticData)
        : indexTripUpdates(feed.entities);
      realtime = true;
    } catch {
      /* Schedule-only board when RT is missing, 404, or timed out. */
    }
  }

  let trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: options.timeZone,
    now,
    horizonMinutes: options.horizonMinutes ?? NEAR_HORIZON_MINUTES,
    cityId: options.cityId,
    skipResolvedShareCheck: options.skipResolvedShareCheck ?? false,
  });

  if (typeof options.filterTrip === "function") {
    trips = trips.filter(options.filterTrip);
  }
  if (typeof options.mapTrip === "function") {
    trips = trips.map(options.mapTrip);
  }

  let nextServiceDate = null;
  if (trips.length === 0) {
    nextServiceDate = findNextServiceDate({
      stopIds,
      staticData,
      timeZone: options.timeZone,
      now,
      filterTrip: options.filterTrip,
    });
  }

  return {
    stationName: catalogEntry?.name ?? options.fallbackStationName ?? stationIdOrName,
    lastUpdate: fetchedAt.toISOString(),
    trips,
    realtime,
    nextServiceDate,
  };
}
