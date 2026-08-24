/**
 * London TfL rail modes — Unified API only (no Darwin, no buses).
 * Region id: uk-london-tfl. NOT live until registry flip.
 * @see docs/jim-brief-uk-london-tfl.md
 */
import { providerTripToInternal } from "../train-times-core.js";
import {
  listTflStops,
  listCatalogStations,
  resolveTflStop,
  resolveTflStops,
  UK_REGION_IDS,
} from "./uk/catalog.js";

export const UK_TFL_REGION = "uk-london-tfl";
export const UK_TIME_ZONE = "Europe/London";
export const TFL_API_BASE = "https://api.tfl.gov.uk";

/** TfL rail modes for this region — not buses. */
export const TFL_RAIL_MODE_NAMES = new Set([
  "tube",
  "overground",
  "elizabeth-line",
  "dlr",
  "tram",
]);

export class MissingTflAppKeyError extends Error {
  constructor() {
    super("TFL_APP_KEY is not set");
    this.name = "MissingTflAppKeyError";
    this.envName = "TFL_APP_KEY";
  }
}

function readTflAppKey() {
  const key = String(process.env.TFL_APP_KEY ?? "").trim();
  if (!key) {
    throw new MissingTflAppKeyError();
  }
  return key;
}

async function tflFetch(path) {
  const key = readTflAppKey();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${TFL_API_BASE}${path}${sep}app_key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`TfL API ${response.status} for ${path}`);
  }
  return response.json();
}

function parseTflArrival(arrival, now = new Date()) {
  const modeName = String(arrival.modeName ?? "").toLowerCase();
  if (!TFL_RAIL_MODE_NAMES.has(modeName)) {
    return null;
  }
  if (modeName === "bus" || modeName === "river-bus" || modeName === "coach") {
    return null;
  }

  let liveDeparture = null;
  if (arrival.expectedArrival) {
    liveDeparture = new Date(arrival.expectedArrival);
  } else if (Number.isFinite(arrival.timeToStation)) {
    liveDeparture = new Date(now.getTime() + Number(arrival.timeToStation) * 1000);
  }
  if (!liveDeparture || Number.isNaN(liveDeparture.getTime())) {
    return null;
  }

  const destination = String(arrival.towards || arrival.destinationName || "Unknown").trim();
  const lineName = String(arrival.lineName || arrival.lineId || "").trim();
  const displayTime = liveDeparture.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: UK_TIME_ZONE,
  });

  return providerTripToInternal({
    scheduledDeparture: liveDeparture,
    scheduledDisplayTime: displayTime,
    liveDeparture,
    displayTime,
    platform: arrival.platformName || undefined,
    destination: lineName ? `${lineName} ${destination}`.trim() : destination,
    line: lineName,
    id: arrival.id || arrival.vehicleId || `${lineName}-${liveDeparture.getTime()}`,
    cancelled: false,
    status: lineName || modeName,
  });
}

/**
 * @param {string} stopIdOrName ATCO / naptanId or catalog name
 * @param {{ regionId?: string, now?: Date }} [options]
 */
export async function fetchStopBoard(stopIdOrName, options = {}) {
  const regionId = options.regionId ?? UK_TFL_REGION;
  const entries = resolveTflStops(stopIdOrName, regionId);
  if (entries.length === 0) {
    throw new Error(`Unknown TfL stop in ${regionId}: ${stopIdOrName}`);
  }

  const now = options.now ?? new Date();
  const allTripsMap = new Map();
  const fetches = entries.map(async (entry) => {
    try {
      const arrivals = await tflFetch(`/StopPoint/${encodeURIComponent(entry.naptanId)}/Arrivals`);
      const rows = Array.isArray(arrivals) ? arrivals : [];
      for (const row of rows) {
        const trip = parseTflArrival(row, now);
        if (trip) {
          const existing = allTripsMap.get(trip.id);
          if (!existing || trip.liveDeparture < existing.liveDeparture) {
            allTripsMap.set(trip.id, trip);
          }
        }
      }
    } catch (error) {
      console.warn(`[TfL] Failed to fetch arrivals for ${entry.naptanId}: ${error.message}`);
    }
  });

  await Promise.all(fetches);

  const trips = Array.from(allTripsMap.values());
  trips.sort((a, b) => a.liveDeparture.getTime() - b.liveDeparture.getTime());

  return {
    stationName: entries[0].name,
    naptanId: entries[0].naptanId, // Primary naptan
    naptanIds: entries.map((e) => e.naptanId),
    regionId,
    mode: "tfl",
    lastUpdate: now.toISOString(),
    trips,
  };
}

export function listCatalogStops(regionId = UK_TFL_REGION) {
  return listTflStops(regionId);
}

export { listCatalogStations, resolveTflStop, UK_REGION_IDS };
