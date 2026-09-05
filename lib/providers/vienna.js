/**
 * Vienna (Wiener Linien U-Bahn) — U1/U2/U3/U4/U6 heavy metro only, via static GTFS. Adapter
 * ready; city remains `planned` (not live) — see docs/vienna-d1/jim-handoff.md.
 * assertCityLive("vienna") must still fail until Tim flips the registry entry.
 *
 * Standalone adapter, not a shared/regional provider config — Wiener Linien is Vienna's own
 * agency with no other Next Train city on the same feed, so this follows the Adelaide/Perth/
 * Boston storage pattern (`loadGtfsStatic({url})` over a committed catalog object,
 * lib/cities/vienna/stations.json) rather than the config-over-shared-provider shape used for
 * Copenhagen/UK-Darwin regions.
 *
 * Static GTFS only (no key required): the Wiener Linien OGD GTFS zip
 * (https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip,
 * docs/vienna-d1/published-network.json liveBoards.staticGtfs) is 825 mixed-mode routes
 * (tram/bus/U-Bahn) — this adapter filters to route_type "1" (subway/metro) plus an exact
 * route_id allow-list (U1, U2, U3, U4, U6) at trip-classification time, same two-layer shape as
 * lib/providers/boston.js's BOSTON_ROUTE_TYPES + exact-route_id MBTA_ROUTE_ID_TO_LINE.
 *
 * Real-time is NOT wired at D2. The official live feed is the Wiener Linien OGD Realtime
 * Monitor (https://www.wienerlinien.at/ogd_realtime/monitor, no key; remove/ignore the SENDER
 * parameter per the official docs) — but per docs/vienna-d1/jim-handoff.md item 3 and
 * hazard-pack.md H2/H3, this is a **proprietary JSON schema, not GTFS-RT protobuf**, so it
 * cannot be handed to the shared gtfs/realtime-board.js path unmodified. It needs its own
 * parsing/mapping layer, which is a genuine follow-up (see MissingViennaRealtimeMonitorError
 * below) — not attempted here, same posture as lib/providers/copenhagen.js and
 * lib/providers/boston.js shipping schedule-only pending their own real-time wiring.
 *
 * v1 scope (docs/vienna-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * U-Bahn heavy metro only — U1, U2, U3, U4, U6 (99 unique stations). U5 excluded (construction,
 * service opens 2030). No S-Bahn, no Badner Bahn (Wiener Lokalbahnen), no ÖBB national rail, no
 * tram, no bus — all out-product/out-mode per the oracle report's Board eligibility section.
 *
 * Hub lock: Karlsplatz (U1 x U2 x U4). U1 and U4 are through-stations there; U2 *terminates*
 * there (its own printed southern terminus) — a different hub shape from every prior city's hub
 * lock. See lib/cities/vienna/marketing-directions.js for how this changes U2's direction chip
 * (only `U2 + Seestadt` is ever synthesized; Karlsplatz is never a direction token for any line).
 *
 * Route classification (unverified against a live payload — same caveat class as
 * lib/providers/copenhagen.js's COPENHAGEN_ROUTE_TYPES and lib/providers/boston.js's
 * BOSTON_ROUTE_TYPES): docs/vienna-d1/published-network.json's per-line `gtfsRouteIdsIfKnown`
 * (U1, U2, U3, U4, U6) are the printed passenger-facing codes; this pack explicitly says no
 * GTFS pull was performed to confirm the exact GTFS route_id/route_short_name values against
 * them (oracle report's H2 conclusion: do not generate published-network.json from GTFS).
 * VIENNA_ROUTE_TYPES is only a first-pass parse-level filter to skip tram/bus rows early; the
 * exact route_id/route_short_name allow-list (WIENER_LINIEN_ROUTE_ID_TO_LINE) is what actually
 * decides inclusion, and both should be confirmed against a real GTFS pull before any live flip
 * or D2 timetable pass (docs/vienna-d1/hazard-pack.md H5 flags nested short-turn codes as not
 * yet ruled out either, for the same reason — no live GTFS was pulled at D1).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { buildBoardForStops } from "./gtfs/board.js";
import {
  VIENNA_HUB,
  VIENNA_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  LINE_LABELS,
  LINE_TERMINI,
  WIENER_LINIEN_ROUTE_ID_TO_LINE,
  mapLineTerminusDestination,
} from "../cities/vienna/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { VIENNA_HUB, LINE_LABELS, LINE_TERMINI, isForbiddenCollapseName, isForbiddenHubProxy };
export const VIENNA_TIMEZONE = VIENNA_TIME_ZONE;

export const WIENER_LINIEN_GTFS_STATIC_URL =
  "https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip";
/** Documented live path, not wired at D2 — see file header. */
export const WIENER_LINIEN_REALTIME_MONITOR_URL =
  "https://www.wienerlinien.at/ogd_realtime/monitor";

/**
 * GTFS route_type parse-level filter: "1" subway/metro (U-Bahn). Excludes tram ("0") and bus
 * ("3") before the exact route_id allow-list runs — hazard-pack.md v1 mode cut. Unverified
 * against a live payload, see file header.
 */
export const VIENNA_ROUTE_TYPES = ["1"];

/**
 * Thrown by any future live-real-time path that wires the Wiener Linien OGD Realtime Monitor
 * (https://www.wienerlinien.at/ogd_realtime/monitor). Not thrown anywhere in this file today —
 * this adapter never calls that endpoint — it exists so a later caller that adds the live path
 * fails loudly if it's reached before that proprietary-JSON parsing layer exists, rather than
 * silently degrading. See file header and docs/vienna-d1/jim-handoff.md item 3 for why this
 * isn't the shared gtfs/realtime-board.js GTFS-RT protobuf path.
 */
export class MissingViennaRealtimeMonitorError extends Error {
  constructor(
    message = "Wiener Linien OGD Realtime Monitor is not wired (proprietary JSON schema, not " +
      "GTFS-RT protobuf — needs its own parsing layer, see lib/providers/vienna.js file " +
      "header and docs/vienna-d1/jim-handoff.md item 3). This board ships schedule-only from " +
      "static GTFS."
  ) {
    super(message);
    this.name = "MissingViennaRealtimeMonitorError";
  }
}

const catalogPath = join(__dirname, "../cities/vienna/stations.json");
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

async function loadViennaStatic() {
  return loadGtfsStatic({
    url: WIENER_LINIEN_GTFS_STATIC_URL,
    routeTypes: VIENNA_ROUTE_TYPES,
    timeZone: VIENNA_TIME_ZONE,
  });
}

function acceptableFoldNames(catalogEntry) {
  return new Set([catalogEntry.name, ...(catalogEntry.aliases ?? [])].map(foldKey));
}

/**
 * Exact-name stop resolution — deliberately NOT gtfs/static-cache.js's
 * findRailStopIdsForName(), whose substring match (`name.includes(needle)`) risks collapsing
 * distinct stations that share a name fragment (same defensive posture as
 * lib/providers/boston.js's resolveStopIds, applied here even though D1 didn't document a
 * specific doNotCollapse pair for Vienna — no GTFS pull was performed at D1 to check for one,
 * hazard-pack.md H5). Still reuses loadGtfsStatic/buildBoardForStops for everything else — only
 * this per-station name-lookup layer is Vienna-specific, driven by
 * lib/cities/vienna/stations.json's alias list (same parent/child stop expansion shape as
 * findRailStopIdsForName, just exact-match instead of substring).
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

/** Wiener Linien GTFS route_id for a board trip, resolved from the trip table (buildBoardForStops
 * does not surface route_id directly, only routeShortName/routeLongName) -> our line id, or
 * null. */
export function lineIdForTrip(tripId, staticData) {
  const trip = staticData.tripsById.get(tripId);
  const routeId = trip?.route_id;
  return WIENER_LINIEN_ROUTE_ID_TO_LINE[routeId] ?? null;
}

function mapViennaTrip(trip, staticData) {
  const lineId = lineIdForTrip(trip.tripId, staticData);
  return {
    ...trip,
    lineId,
    destination: lineId ? mapLineTerminusDestination(trip.destination, lineId) : trip.destination,
  };
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/vienna/stations.json)
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Vienna station: ${stationIdOrName}`);
  }

  const staticData = await loadViennaStatic();
  const stopIds = resolveStopIds(staticData, catalogEntry);
  if (!stopIds.length) {
    throw new Error(`Unknown Vienna station: ${stationIdOrName}`);
  }

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: EMPTY_REALTIME_INDEX,
    timeZone: VIENNA_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes,
  })
    .map((trip) => mapViennaTrip(trip, staticData))
    /** Belt-and-braces: VIENNA_ROUTE_TYPES already excludes tram/bus at parse time; this also
     * drops anything whose route_id isn't one of the 5 known U-Bahn ids (e.g. U5, unopened). */
    .filter((trip) => trip.lineId != null);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    /** GTFS static schedule only — no Wiener Linien Realtime Monitor path wired, see file
     * header. */
    realtime: false,
  };
}
