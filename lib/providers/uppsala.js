/**
 * Uppsala (Mälardalstrafik / Mälartåg) — Trafiklab GTFS Regional `ul`.
 * Adapter ready; city remains `planned` (not live) — see docs/uppsala-d1/jim-handoff.md.
 *
 * Static (TRAFIKLAB_API_KEY): https://opendata.samtrafiken.se/gtfs/ul/ul.zip?key=…
 * Realtime TripUpdates (TRAFIKLAB_API_KEY_RT — separate Trafiklab key product from the
 * static key, see gtfs/auth.js): https://opendata.samtrafiken.se/gtfs-rt/ul/TripUpdates.pb?key=…
 * confirmed live and populated with in-scope trips per docs/uppsala-d1/oracle-clash-report.md.
 *
 * v1 scope: Mälartåg regional rail only (route_type 100, agency "Mälardalstrafik"). No UL buses
 * (route_type 700), no SL-pendeln (route_type 100 but agency "Storstockholms Lokaltrafik AB" —
 * SL Line 40, already covered by the stockholm adapter). Filtered by agency_id, not name, since
 * GTFS agency_id is the stable join key (agency_name can repeat/typo across feeds).
 *
 * Branch hazard: the Arlanda C and Märsta corridors share one GTFS route_id (9011313099300000)
 * and `direction_id` does not distinguish them — resolve the far end from `stop_headsign`
 * (surfaced by gtfs/board.js as `trip.stopHeadsign`), never `direction_id`. See
 * docs/uppsala-d1/hazard-pack.md H4 and direction-model-memo.md.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchGtfsRealtimeBoard } from "./gtfs/realtime-board.js";
import {
  requireTrafiklabApiKey,
  trafiklabGtfsStaticUrl,
  trafiklabGtfsRtTripUpdatesUrl,
} from "./gtfs/auth.js";
import {
  UPPSALA_HUB,
  UPPSALA_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  mapUppsalaDestination,
} from "../cities/uppsala/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPPSALA_TIMEZONE = UPPSALA_TIME_ZONE;
export const UPPSALA_OPERATOR = "ul";
/** Regional/railway extended route type — same code as SL-pendeln, filtered further by agency. */
export const UPPSALA_ROUTE_TYPES = ["100"];
/** Mälardalstrafik's GTFS agency_id in the `ul` feed (docs/uppsala-d1/published-network.json). */
export const MALARDALSTRAFIK_AGENCY_ID = "33010000167212099";

const catalogPath = join(__dirname, "../cities/uppsala/stations.json");
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

async function loadUppsalaStatic() {
  const key = requireTrafiklabApiKey();
  const url = trafiklabGtfsStaticUrl(UPPSALA_OPERATOR, key);
  return loadGtfsStatic({
    url,
    routeTypes: UPPSALA_ROUTE_TYPES,
    agencyIds: [MALARDALSTRAFIK_AGENCY_ID],
    timeZone: UPPSALA_TIME_ZONE,
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
  throw new Error(`Unknown Uppsala station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  let tripUpdatesUrl = "";
  try {
    tripUpdatesUrl = trafiklabGtfsRtTripUpdatesUrl(UPPSALA_OPERATOR);
  } catch {
    tripUpdatesUrl = "";
  }

  const board = await fetchGtfsRealtimeBoard(stationIdOrName, {
    loadStatic: loadUppsalaStatic,
    resolveStopIds,
    resolveCatalogEntry,
    tripUpdatesUrl,
    timeZone: UPPSALA_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes,
    fallbackStationName: UPPSALA_HUB,
    mapTrip(trip) {
      return {
        ...trip,
        destination: mapUppsalaDestination(trip),
      };
    },
  });

  return {
    stationName: board.stationName,
    lastUpdate: board.lastUpdate,
    trips: board.trips,
    realtime: board.realtime === true,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { UPPSALA_HUB, resolveCatalogEntry };
