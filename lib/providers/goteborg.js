/**
 * Göteborg (Västtrafik) tram + city-map pendeltåg — Trafiklab GTFS Regional `vt`.
 * Adapter ready; city remains `planned` (not live).
 *
 * Static (TRAFIKLAB_API_KEY): https://opendata.samtrafiken.se/gtfs/vt/vt.zip?key=…
 * RT path exists in the Trafiklab URL scheme but Västtrafik has **no** TripUpdates
 * on Trafiklab (availability table blank as of 2026-08-28) — board is schedule-only
 * until that changes or a Västtrafik OAuth board is wired later.
 *
 * Modes v1: tram 1–12 + Kungsbacka / Alingsås / Ale. No stombuss / båt / X-bus / metro.
 */

import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  loadGtfsStatic,
  loadGtfsStaticFromDirectory,
  findRailStopIdsForName,
} from "./gtfs/static-cache.js";
import { fetchGtfsRealtimeBoard } from "./gtfs/realtime-board.js";
import {
  requireTrafiklabApiKey,
  trafiklabGtfsStaticUrl,
  trafiklabGtfsRtTripUpdatesUrl,
} from "./gtfs/auth.js";
import {
  ALLOWED_LINE_CODES,
  foldKey,
  isForbiddenCollapseName,
  mapGoteborgDestination,
  PENDELTÅG_HUB,
  TRAM_HUB,
} from "../cities/goteborg/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export const GOTEBORG_TIME_ZONE = "Europe/Stockholm";
export const GOTEBORG_OPERATOR = "vt";
/** Extended GTFS types: tram + rail / suburban rail. */
export const GOTEBORG_ROUTE_TYPES = ["0", "2", "100", "106", "109", "400", "401", "900"];
export const GOTEBORG_TRAM_SHORT_NAMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const GOTEBORG_TRAIN_CORRIDORS = ["Kungsbacka", "Alingsås", "Ale"];

const ALLOWED = new Set(ALLOWED_LINE_CODES.map((code) => String(code).trim().toUpperCase()));
const FIXTURE_DIR = join(ROOT, "qa/fixtures/goteborg/gtfs");
const catalogPath = join(__dirname, "../cities/goteborg/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  if (isForbiddenCollapseName(raw)) {
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

/**
 * Map GTFS route_short_name / long_name → v1 line code.
 * @param {object} trip board trip row
 */
export function goteborgLineCode(trip) {
  const shortName = String(trip.routeShortName || "").trim();
  const upper = shortName.toUpperCase();
  if (ALLOWED.has(upper) || ALLOWED.has(shortName)) {
    return shortName;
  }
  if (GOTEBORG_TRAM_SHORT_NAMES.includes(shortName)) {
    return shortName;
  }
  const blob = `${shortName} ${trip.destination || ""} ${trip.routeLongName || ""}`;
  for (const corridor of GOTEBORG_TRAIN_CORRIDORS) {
    if (new RegExp(corridor, "i").test(blob)) {
      return corridor;
    }
  }
  return "";
}

function tripAllowed(trip) {
  const code = goteborgLineCode(trip);
  return Boolean(code) && ALLOWED.has(String(code).trim().toUpperCase());
}

async function loadGoteborgStatic() {
  if (existsSync(join(FIXTURE_DIR, "stops.txt"))) {
    return loadGtfsStaticFromDirectory(FIXTURE_DIR, {
      routeTypes: GOTEBORG_ROUTE_TYPES,
      timeZone: GOTEBORG_TIME_ZONE,
      sourceUrl: `trafiklab:gtfs/${GOTEBORG_OPERATOR}`,
    });
  }
  const key = requireTrafiklabApiKey();
  const url = trafiklabGtfsStaticUrl(GOTEBORG_OPERATOR, key);
  return loadGtfsStatic({
    url,
    routeTypes: GOTEBORG_ROUTE_TYPES,
    timeZone: GOTEBORG_TIME_ZONE,
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
  if (staticData.stopsById.has(stationIdOrName)) {
    return [stationIdOrName];
  }
  throw new Error(`Unknown Göteborg station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  let tripUpdatesUrl = "";
  try {
    if (!existsSync(join(FIXTURE_DIR, "stops.txt"))) {
      tripUpdatesUrl = trafiklabGtfsRtTripUpdatesUrl(GOTEBORG_OPERATOR);
    }
  } catch {
    tripUpdatesUrl = "";
  }

  const board = await fetchGtfsRealtimeBoard(stationIdOrName, {
    loadStatic: loadGoteborgStatic,
    resolveStopIds,
    resolveCatalogEntry,
    tripUpdatesUrl,
    timeZone: GOTEBORG_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes,
    fallbackStationName: TRAM_HUB,
    filterTrip: tripAllowed,
    mapTrip(trip) {
      const code = goteborgLineCode(trip);
      return {
        ...trip,
        routeShortName: code || trip.routeShortName,
        destination: mapGoteborgDestination(trip.destination, code || trip.routeShortName),
      };
    },
  });

  return {
    stationName: board.stationName,
    lastUpdate: board.lastUpdate,
    trips: board.trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { TRAM_HUB, PENDELTÅG_HUB, resolveCatalogEntry };
