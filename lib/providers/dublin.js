/**
 * Dublin (Luas Red + Green light rail) provider — GTFS static-join over the National Transport
 * Authority's GTFS-RT v2 feed. Adapter ready; city remains `planned` in registry (not live) —
 * see docs/dublin-d1/jim-handoff.md. v1 scope is Luas only — no DART, no Dublin Bus, no Bus
 * Éireann, no Go-Ahead Ireland (docs/dublin-d1/published-network.json coverageGaps).
 *
 * Static (published to Vercel Blob by scripts/trim-dublin-gtfs.mjs +
 * scripts/publish-gtfs-fixture-to-blob.mjs — the raw NTA_All.zip is ~160MB, covers every Irish
 * operator, and must never be fetched/parsed on the request path, same reasoning as
 * lib/providers/melbourne.js's statewide zip-of-zips and lib/gtfs-refresh.js's Amsterdam/
 * Rotterdam OVapi retirement). NOT YET PUBLISHED this session (no BLOB_READ_WRITE_TOKEN
 * available) — gtfsFixtureBlobUrl("dublin") will 404 until scripts/trim-dublin-gtfs.mjs's output
 * is published; that's a D2/pre-flip task, not a D1 blocker (docs/dublin-d1/jim-handoff.md).
 *   Static: gtfsFixtureBlobUrl("dublin")
 * Realtime (GTFS-RT TripUpdates, header x-api-key, env NTA_API_KEY):
 *   https://api.nationaltransport.ie/gtfsr/v2/TripUpdates
 *
 * NTA_API_KEY was NOT available this session (not in .env.local) — MissingNtaApiKeyError
 * (lib/providers/gtfs/auth.js) propagates rather than a silent timetable fallback, same posture
 * as lib/providers/chicago.js/washington.js: no live times, no board. Unlike Chicago/Washington,
 * Dublin DOES have a usable static schedule (NTA static GTFS, no key required) — but this
 * adapter still requires realtime confirmation for every trip it shows (see
 * dropUnconfirmedTrips() below), same live-only rule as lib/providers/melbourne.js
 * (docs/jim-brief-boston-subway-live-predictions.md's lesson: a scheduled time must never be
 * presented as live).
 *
 * Route colour classification (classifyLuasLineId, lib/cities/dublin/marketing-directions.js) is
 * UNVERIFIED against a live NTA payload — Luas has no printed route number (hazard-pack.md H2),
 * and gtfsRouteIdsIfKnown is deliberately empty in published-network.json. Confirm the real
 * route_id/agency_id values once a static snapshot is actually downloaded (D2).
 *
 * Direction labels: colour + terminus (e.g. "Red + Tallaght", "Green + Brides Glen"), per
 * docs/dublin-d1/direction-model-memo.md §3 recommendation A. Abbey Street (hub lock) never
 * appears as a direction token. The Green Line's Parnell<->Trinity city-centre loop is
 * direction-exclusive (hazard-pack.md H4a) — O'Connell - GPO / O'Connell Upper are
 * northbound-only (towards Broombridge), Marlborough is southbound-only (towards Brides Glen);
 * isDirectionAllowedAtStop() drops a trip whose classified direction doesn't match what a stop
 * can genuinely serve, defending against a data anomaly producing a phantom platform/direction
 * that never runs (see lib/cities/dublin/marketing-directions.js).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { indexTripUpdates } from "./gtfs/realtime.js";
import { fetchOvapiTripUpdates } from "./gtfs/ovapi-tripupdates-cache.js";
import { buildBoardForStops, findNextServiceDate } from "./gtfs/board.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { ntaAuthHeaders, readNtaApiKey } from "./gtfs/auth.js";
import {
  DUBLIN_HUB,
  DUBLIN_TIME_ZONE,
  classifyLuasLineId,
  mapLineTerminusDestination,
  resolveTerminus,
  isDirectionAllowedAtStop,
  isTerminatingAtStation,
} from "../cities/dublin/marketing-directions.js";

export {
  classifyLuasLineId,
  mapLineTerminusDestination,
  resolveTerminus,
  isDirectionAllowedAtStop,
  isTerminatingAtStation,
};

export { DUBLIN_HUB, DUBLIN_TIME_ZONE };

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DUBLIN_GTFS_RT_TRIP_UPDATES_URL = "https://api.nationaltransport.ie/gtfsr/v2/TripUpdates";
export const DUBLIN_GTFS_RT_VEHICLES_URL = "https://api.nationaltransport.ie/gtfsr/v2/Vehicles";

const catalogPath = join(__dirname, "../cities/dublin/stations.json");
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

function authHeaders(apiKey) {
  return ntaAuthHeaders(apiKey ?? readNtaApiKey());
}

export async function loadDublinStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("dublin"),
    timeZone: DUBLIN_TIME_ZONE,
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
  throw new Error(`Unknown Dublin station: ${stationIdOrName}`);
}

/**
 * Direction chips derived from the static GTFS snapshot alone (trips.txt/stop_times.txt +
 * routes.txt), never from the live board — see lib/cities/dublin/dogfood-next-train.js header.
 * Every other GTFS city derives chips this way (headsign/route + direction, not live-only), and
 * Dublin needs it too: `write-city-directions` runs overnight (after the last tram) and during
 * live-feed outages, when the RT-confirmed board is legitimately empty but the schedule still
 * knows every direction that calls at a stop. Reuses the exact same classification/guard
 * functions the live board uses (classifyLuasLineId, resolveTerminus, mapLineTerminusDestination,
 * isDirectionAllowedAtStop, isTerminatingAtStation) so the two never disagree on what's a valid
 * chip — no separate hand-maintained enumeration.
 *
 * @param {{ stopIds: string[], staticData: object, stationName: string }} args
 * @returns {string[]} sorted, deduped "Colour + Terminus" labels
 */
export function directionsFromStatic({ stopIds, staticData, stationName }) {
  const labels = new Set();
  for (const stopId of stopIds) {
    const stopTimes = staticData.stopTimesByStopId?.get(stopId) ?? [];
    for (const stopTime of stopTimes) {
      const trip = staticData.tripsById?.get(stopTime.trip_id);
      if (!trip) {
        continue;
      }
      const route = staticData.routesById?.get(trip.route_id);
      const lineId = classifyLuasLineId({
        routeShortName: route?.route_short_name,
        routeLongName: route?.route_long_name,
        routeColor: route?.route_color,
      });
      if (!lineId) {
        continue;
      }
      const headsign = String(trip.trip_headsign || route?.route_long_name || "").trim();
      if (!headsign) {
        continue;
      }
      const terminus = resolveTerminus(headsign, lineId);
      if (!isDirectionAllowedAtStop(stationName, lineId, terminus)) {
        continue;
      }
      const destination = terminus ?? headsign;
      if (isTerminatingAtStation(destination, stationName)) {
        continue;
      }
      labels.add(mapLineTerminusDestination(headsign, lineId));
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b));
}

/**
 * Directions for a catalogued station, derived purely from the static snapshot — see
 * directionsFromStatic() above. Throws for an unknown station, same as fetchStationBoard.
 * @param {string} stationIdOrName
 */
export async function fetchStaticDirections(stationIdOrName) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Dublin station: ${stationIdOrName}`);
  }
  const staticData = await loadDublinStatic();
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  return directionsFromStatic({ stopIds, staticData, stationName: catalogEntry.name });
}

/**
 * A trip the RT feed said nothing about (no stop_time_update for this stop, no trip-level delay)
 * is a scheduled-time guess, not a live fact — drop it rather than present a timetable time as
 * live (docs/jim-brief-boston-subway-live-predictions.md).
 */
function tripHasRealtimeConfirmation(trip, realtimeIndex) {
  const key = `${trip.tripId}:${trip.stopId}`;
  return realtimeIndex.stopUpdates.has(key) || realtimeIndex.tripDelaySec.has(trip.tripId);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number, apiKey?: string }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();

  // Unknown-station and missing-key both fail without any network call (bart.js/chicago.js/
  // washington.js precedent) — catalog lookup and header construction are pure/local.
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Dublin station: ${stationIdOrName}`);
  }
  const headers = authHeaders(options.apiKey);
  const stationName = catalogEntry.name;

  const staticData = await loadDublinStatic();
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const { entities, fetchedAt } = await fetchOvapiTripUpdates(DUBLIN_GTFS_RT_TRIP_UPDATES_URL, { headers });
  const realtimeIndex = indexTripUpdates(entities);

  let trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: DUBLIN_TIME_ZONE,
    now,
    horizonMinutes: options.horizonMinutes,
    cityId: "dublin",
    // NTA's TripUpdates feed carries every Irish operator (bus + rail + Luas); the static
    // snapshot here is trimmed to Luas only (scripts/trim-dublin-gtfs.mjs), so most "unresolved"
    // realtime trip IDs are out-of-scope buses/DART, not drift — same posture as Adelaide's
    // generic multi-mode feed.
    skipResolvedShareCheck: true,
  });

  // Live-only: drop anything the RT feed didn't actually confirm.
  trips = trips.filter((trip) => tripHasRealtimeConfirmation(trip, realtimeIndex));

  trips = trips.map((trip) => {
    const lineId = classifyLuasLineId({
      routeShortName: trip.routeShortName,
      routeLongName: trip.routeLongName,
    });
    const terminus = lineId ? resolveTerminus(trip.destination, lineId) : null;
    const destination = lineId ? mapLineTerminusDestination(trip.destination, lineId) : trip.destination;
    return { ...trip, lineId, terminus, destination, realtime: true };
  });

  // Unclassifiable routes (neither Red nor Green matched, e.g. a stray non-Luas trip on a
  // shared stop_id) never reach a rider — this catalog is Luas-only, per v1 mode cut.
  trips = trips.filter((trip) => trip.lineId != null);

  // Green Line city-centre loop guard (hazard-pack.md H4a) — drop any trip whose classified
  // direction doesn't match what O'Connell - GPO / O'Connell Upper / Marlborough can genuinely
  // serve, rather than showing a phantom platform/direction that never runs.
  trips = trips.filter((trip) => isDirectionAllowedAtStop(stationName, trip.lineId, trip.terminus));

  // A trip whose terminus is the station being viewed is an arrival, not a departure — never a
  // boardable direction from here.
  trips = trips.filter((trip) => !isTerminatingAtStation(trip.destination, stationName));

  let nextServiceDate = null;
  if (trips.length === 0) {
    nextServiceDate = findNextServiceDate({
      stopIds,
      staticData,
      timeZone: DUBLIN_TIME_ZONE,
      now,
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
