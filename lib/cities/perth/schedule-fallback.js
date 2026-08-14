/**
 * Perth overnight / quiet-hours timetable fallback via Transperth GTFS (rail only).
 * Used when LiveTimes returns an empty board. Soft-fails if download/parse is slow.
 */

import {
  loadGtfsStatic,
  findRailStopIdsForName,
} from "../../providers/gtfs/static-cache.js";
import { buildBoardForStops } from "../../providers/gtfs/board.js";

export const PERTH_GTFS_STATIC_URL =
  "https://www.transperth.wa.gov.au/TimetablePDFs/GoogleTransit/Production/google_transit.zip";

const PERTH_TIME_ZONE = "Australia/Perth";
const LOAD_TIMEOUT_MS = 12_000;

function emptyRealtimeIndex() {
  return {
    cancelledTrips: new Set(),
    stopUpdates: new Map(),
    tripDelaySec: new Map(),
  };
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * @param {string} stationName
 * @returns {Promise<null | { stationName: string, lastUpdate: null, trips: object[], source: "gtfs-static" }>}
 */
export async function fetchPerthScheduledBoard(stationName) {
  const needle = String(stationName || "")
    .replace(/\s+Stn$/i, "")
    .replace(/\s+Station$/i, "")
    .trim();
  if (!needle) {
    return null;
  }

  try {
    const staticData = await withTimeout(
      loadGtfsStatic({
        url: PERTH_GTFS_STATIC_URL,
        railOnly: true,
        timeZone: PERTH_TIME_ZONE,
        ttlMs: 12 * 60 * 60 * 1000,
      }),
      LOAD_TIMEOUT_MS,
      "Perth GTFS static"
    );

    const stopIds = findRailStopIdsForName(staticData, needle);
    if (!stopIds.length) {
      return null;
    }

    const trips = buildBoardForStops({
      stopIds,
      staticData,
      realtimeIndex: emptyRealtimeIndex(),
      timeZone: PERTH_TIME_ZONE,
      horizonMinutes: 240,
    }).map((trip) => ({
      ...trip,
      status: "Scheduled",
    }));

    return {
      stationName,
      lastUpdate: null,
      trips,
      source: "gtfs-static",
    };
  } catch (error) {
    console.warn("Perth GTFS schedule fallback unavailable", error?.message ?? error);
    return null;
  }
}
