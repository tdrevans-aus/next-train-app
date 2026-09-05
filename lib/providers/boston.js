/**
 * Boston (MBTA) — Red / Orange / Blue / Green B-C-D-E / Mattapan rapid transit, via static
 * GTFS. Adapter ready; city remains `planned` (not live) — see docs/boston-d1/jim-handoff.md.
 * assertCityLive("boston") must still fail until Tim flips the registry entry.
 *
 * Static GTFS only (no key required): https://cdn.mbta.com/MBTA_GTFS.zip. The MBTA V3 API
 * (https://api-v3.mbta.com/predictions) is documented to work unauthenticated — empty-key 200
 * on 29 Aug 2026, docs/boston-d1/published-network.json liveBoards.emptyKey — but is rate
 * limited (20/window) and an `x-api-key` from https://www.mbta.com/developers raises that
 * limit. Per this task's explicit instruction not to sign up for anything, no key is
 * registered and no live V3 real-time path is wired at D2. MissingMbtaApiKeyError (below) is
 * exported for whoever wires that path later, so a future caller fails loudly instead of
 * silently degrading — same posture as lib/providers/rejseplanen.js's
 * MissingRejseplanenApiKeyError for Copenhagen. This board ships schedule-only.
 *
 * v1 scope (docs/boston-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * subway / rapid transit only — Red, Orange, Blue, Green B/C/D/E, Mattapan (125 unique stops).
 * No Silver Line BRT, no bus, no ferry, no Commuter Rail, no CapeFlyer, no Massport shuttles.
 *
 * Hub lock: Park Street (Red x Green, all four Green services). doNotGroup, per
 * hazard-pack.md H1/H2/H6: Downtown Crossing (Red x Orange), Gov't Center (Green x Blue; B/C
 * inner end — a legitimate Green B/C *direction terminus*, just never a Park Street proxy),
 * State (Orange x Blue), South Station, North Station, Haymarket — all separate stop-places,
 * never folded into Park Street.
 *
 * Route classification (unverified against a live payload — confirm at D2, same caveat as
 * lib/providers/copenhagen.js's COPENHAGEN_ROUTE_TYPES): MBTA's GTFS route_id values (Red,
 * Orange, Blue, Green-B/C/D/E, Mattapan) already match docs/boston-d1/published-network.json's
 * per-line `gtfsRouteIdsIfKnown` exactly, so trips are classified by exact route_id lookup
 * (lineIdForTrip) rather than by route_short_name/long_name string matching, avoiding the
 * ambiguity those other adapters have to work around. BOSTON_ROUTE_TYPES (light rail "0" +
 * subway "1") is only a first-pass parse-level filter to skip Commuter Rail/bus/ferry rows
 * early; the exact route_id allow-list is what actually decides inclusion.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { buildBoardForStops } from "./gtfs/board.js";
import {
  BOSTON_HUB,
  BOSTON_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  LINE_LABELS,
  LINE_TERMINI,
  MBTA_ROUTE_ID_TO_LINE,
  mapLineTerminusDestination,
} from "../cities/boston/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { BOSTON_HUB, LINE_LABELS, LINE_TERMINI, isForbiddenCollapseName, isForbiddenHubProxy };
export const BOSTON_TIMEZONE = BOSTON_TIME_ZONE;

export const MBTA_GTFS_STATIC_URL = "https://cdn.mbta.com/MBTA_GTFS.zip";
/** Documented live path, not wired at D2 — see file header. */
export const MBTA_V3_PREDICTIONS_URL = "https://api-v3.mbta.com/predictions";

/**
 * GTFS route_type parse-level filter: "0" light rail (Green branches + Mattapan Trolley), "1"
 * subway (Red/Orange/Blue). Excludes Commuter Rail ("2"), bus ("3"), ferry ("4") before the
 * exact route_id allow-list runs — hazard-pack.md v1 mode cut.
 */
export const BOSTON_ROUTE_TYPES = ["0", "1"];

/**
 * Thrown by any future live-real-time path that requires an MBTA V3 API key
 * (`x-api-key`, from https://www.mbta.com/developers). Not thrown anywhere in this file today
 * — the adapter never calls api-v3.mbta.com — it exists so a later caller that adds the live
 * path fails loudly when MBTA_API_KEY is unset, rather than silently degrading. See file
 * header for why no key is registered at D2.
 */
export class MissingMbtaApiKeyError extends Error {
  constructor(
    message = "MBTA V3 API key not configured (MBTA_API_KEY). Unauthenticated calls to " +
      "api-v3.mbta.com are rate-limited (20/window, docs/boston-d1/published-network.json " +
      "liveBoards.emptyKey) and no live real-time path is wired at D2 — see " +
      "lib/providers/boston.js file header."
  ) {
    super(message);
    this.name = "MissingMbtaApiKeyError";
  }
}

const catalogPath = join(__dirname, "../cities/boston/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const EMPTY_REALTIME_INDEX = {
  tripDelaySec: new Map(),
  stopUpdates: new Map(),
  cancelledTrips: new Set(),
};

export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
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
  }
  return null;
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

async function loadBostonStatic() {
  return loadGtfsStatic({
    url: MBTA_GTFS_STATIC_URL,
    routeTypes: BOSTON_ROUTE_TYPES,
    timeZone: BOSTON_TIME_ZONE,
  });
}

function acceptableFoldNames(catalogEntry) {
  return new Set([catalogEntry.name, ...(catalogEntry.aliases ?? [])].map(foldKey));
}

/**
 * Exact-name stop resolution — deliberately NOT gtfs/static-cache.js's
 * findRailStopIdsForName(), whose substring match (`name.includes(needle)`) would collapse
 * documented same-name-family pairs (hazard-pack.md doNotCollapse: Harvard vs Harvard Ave,
 * Central vs Central Ave, Chestnut Hill vs Chestnut Hill Ave, Washington St vs Washington Sq,
 * Longwood vs Longwood Medical Area, Medford/Tufts vs Tufts Medical Ctr). Still reuses
 * loadGtfsStatic/buildBoardForStops for everything else — only this per-station name-lookup
 * layer is Boston-specific, driven by lib/cities/boston/stations.json's alias list (same
 * parent/child stop expansion shape as findRailStopIdsForName, just exact-match instead of
 * substring).
 */
export function resolveStopIds(staticData, catalogEntry) {
  const names = acceptableFoldNames(catalogEntry);
  const parentMatches = staticData.stops.filter((stop) => names.has(foldKey(stop.stop_name)));

  const stopIds = new Set();
  for (const stop of parentMatches) {
    stopIds.add(stop.stop_id);
    const relatives = stop.parent_station
      ? staticData.stops.filter((s) => s.parent_station === stop.parent_station)
      : staticData.stops.filter((s) => s.parent_station === stop.stop_id);
    for (const relative of relatives) {
      stopIds.add(relative.stop_id);
    }
  }
  return [...stopIds];
}

/** MBTA GTFS route_id for a board trip, resolved from the trip table (buildBoardForStops does
 * not surface route_id directly, only routeShortName/routeLongName) -> our line id, or null. */
export function lineIdForTrip(tripId, staticData) {
  const trip = staticData.tripsById.get(tripId);
  const routeId = trip?.route_id;
  return MBTA_ROUTE_ID_TO_LINE[routeId] ?? null;
}

function mapBostonTrip(trip, staticData) {
  const lineId = lineIdForTrip(trip.tripId, staticData);
  return {
    ...trip,
    lineId,
    destination: lineId ? mapLineTerminusDestination(trip.destination, lineId) : trip.destination,
  };
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/boston/stations.json)
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Boston station: ${stationIdOrName}`);
  }

  const staticData = await loadBostonStatic();
  const stopIds = resolveStopIds(staticData, catalogEntry);
  if (!stopIds.length) {
    throw new Error(`Unknown Boston station: ${stationIdOrName}`);
  }

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: EMPTY_REALTIME_INDEX,
    timeZone: BOSTON_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes,
  })
    .map((trip) => mapBostonTrip(trip, staticData))
    /** Belt-and-braces: BOSTON_ROUTE_TYPES already excludes Commuter Rail/bus/ferry at parse
     * time; this also drops anything whose route_id isn't one of the 8 known subway ids. */
    .filter((trip) => trip.lineId != null);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    /** GTFS static schedule only — no MBTA V3 live-realtime path wired, see file header. */
    realtime: false,
  };
}
