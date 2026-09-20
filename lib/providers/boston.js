/**
 * Boston (MBTA) — Red / Orange / Blue / Green B-C-D-E / Mattapan rapid transit, via static
 * GTFS, PLUS live MBTA Commuter Rail predictions at the five stations where it is
 * board-eligible `in` (docs/boston-d1/oracle-clash-report.md Board eligibility section, 20 Sep
 * 2026): South Station, North Station, Forest Hills, Braintree, JFK/UMass. Adapter ready; city
 * remains `planned` (not live) — see docs/boston-d1/jim-handoff.md. assertCityLive("boston")
 * must still fail until Tim flips the registry entry.
 *
 * Subway/rapid transit: static GTFS only (no key required):
 * https://cdn.mbta.com/MBTA_GTFS.zip. Schedule-only — no GTFS-RT TripUpdates wired for the
 * subway network at D2 (unchanged from the original planned pack).
 *
 * Commuter Rail: MBTA V3 predictions API (https://api-v3.mbta.com/predictions), unauthenticated
 * — confirmed working live (200) on 20 Sep 2026, rate-limited 20/window. LIVE PREDICTIONS ONLY,
 * no scheduled fallback (Tim's board-eligibility rule: "no live times, no board" —
 * docs/board-eligibility-rule.md) — a Commuter Rail row is only ever built from a prediction
 * with a non-null `departure_time`; if the V3 call fails or returns nothing, the station's
 * Commuter Rail rows are simply absent, the subway rows are unaffected. If `MBTA_API_KEY` is
 * set, it's sent as `x-api-key` to raise the rate limit; it is optional and not required — no
 * key is registered by this task. MissingMbtaApiKeyError (below) is exported for a future
 * caller that wants to make the key mandatory; it is not thrown by the Commuter Rail path
 * itself, which works unauthenticated.
 *
 * v1 scope (docs/boston-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * subway / rapid transit (125 unique stops) PLUS Commuter Rail at the 5 stations above. Amtrak
 * (Acela, Northeast Regional, Lake Shore Limited) is `out-reservation` (all-reserved, no
 * walk-up) — filtered out by COMMUTER_RAIL_ROUTES only ever containing MBTA's own CR route ids,
 * Amtrak trips never appear in that allow-list. CapeFlyer is board-eligibility `in` (seasonal,
 * walk-up) but is NOT served by api-v3.mbta.com — no CapeFlyer route exists in the V3 routes
 * list as of 20 Sep 2026 — so it cannot be shown live; recorded in registry.js notes, not
 * silently dropped. Silver Line BRT, ferry, bus, Massport shuttles stay `out-mode`.
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
  COMMUTER_RAIL_ROUTES,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  LINE_LABELS,
  LINE_TERMINI,
  mapCommuterRailDestination,
  MBTA_ROUTE_ID_TO_LINE,
  mapLineTerminusDestination,
} from "../cities/boston/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { BOSTON_HUB, LINE_LABELS, LINE_TERMINI, isForbiddenCollapseName, isForbiddenHubProxy };
export const BOSTON_TIMEZONE = BOSTON_TIME_ZONE;

export const MBTA_GTFS_STATIC_URL = "https://cdn.mbta.com/MBTA_GTFS.zip";
/** Live Commuter Rail path — wired below, see file header. */
export const MBTA_V3_PREDICTIONS_URL = "https://api-v3.mbta.com/predictions";
export const MBTA_V3_BASE_URL = "https://api-v3.mbta.com";

/**
 * GTFS route_type parse-level filter: "0" light rail (Green branches + Mattapan Trolley), "1"
 * subway (Red/Orange/Blue). Excludes Commuter Rail ("2"), bus ("3"), ferry ("4") before the
 * exact route_id allow-list runs — hazard-pack.md v1 mode cut. Commuter Rail is served
 * separately, live, via MBTA_V3_PREDICTIONS_URL — never from this static GTFS parse.
 */
export const BOSTON_ROUTE_TYPES = ["0", "1"];

/** In-catalog stations where Commuter Rail is board-eligible `in`, mapped to their MBTA V3
 * parent stop id — confirmed live (api-v3.mbta.com/routes?filter[stop]=<id>&filter[type]=2) on
 * 20 Sep 2026, docs/boston-d1/oracle-clash-report.md Board eligibility section. */
export const COMMUTER_RAIL_STOP_IDS = {
  "South Station": "place-sstat",
  "North Station": "place-north",
  "Forest Hills": "place-forhl",
  Braintree: "place-brntn",
  "JFK/UMass": "place-jfk",
};

/**
 * Thrown by a future caller that wants to make the MBTA V3 API key mandatory
 * (`x-api-key`, from https://www.mbta.com/developers). Not thrown by fetchCommuterRailTrips()
 * below, which works unauthenticated (confirmed live 20 Sep 2026); MBTA_API_KEY, if set, is
 * sent as an optional rate-limit-raising header only.
 */
export class MissingMbtaApiKeyError extends Error {
  constructor(
    message = "MBTA V3 API key not configured (MBTA_API_KEY). Unauthenticated calls to " +
      "api-v3.mbta.com are rate-limited (20/window) but work — this error is not thrown by " +
      "the current Commuter Rail path, only available for a future caller that wants to " +
      "require a key — see lib/providers/boston.js file header."
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

function formatEasternClock(date) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BOSTON_TIME_ZONE,
  });
}

/**
 * Live MBTA V3 Commuter Rail predictions for one stop, mapped to the same trip shape
 * gtfs/board.js produces (tripId, stopId, liveDeparture, scheduledDeparture, displayTime,
 * destination, routeShortName/LongName, status, cancelled, lineId) so the two sources can be
 * concatenated and sorted together. LIVE PREDICTIONS ONLY — a prediction with a null
 * `departure_time` (arrival-only: the train is terminating here, not boardable) is dropped
 * rather than falling back to a static schedule, per docs/board-eligibility-rule.md ("no live
 * times, no board"). Network/parse failures resolve to `[]`, never throw — a Commuter Rail
 * outage must not take down the station's subway board.
 *
 * @param {string} stopId MBTA V3 parent stop id (COMMUTER_RAIL_STOP_IDS)
 * @param {{ now?: Date }} [options]
 */
export async function fetchCommuterRailTrips(stopId, options = {}) {
  const now = options.now ?? new Date();
  const params = new URLSearchParams();
  params.set("filter[stop]", stopId);
  params.set("filter[route_type]", "2");
  params.set("include", "trip,route");

  let payload;
  try {
    const headers = { Accept: "application/vnd.api+json" };
    if (process.env.MBTA_API_KEY) {
      headers["x-api-key"] = process.env.MBTA_API_KEY;
    }
    const response = await fetch(`${MBTA_V3_PREDICTIONS_URL}?${params.toString()}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return [];
    }
    payload = await response.json();
  } catch {
    return [];
  }

  const included = payload?.included ?? [];
  const tripsById = new Map(included.filter((i) => i.type === "trip").map((i) => [i.id, i]));

  const trips = [];
  for (const prediction of payload?.data ?? []) {
    const attrs = prediction.attributes ?? {};
    if (attrs.schedule_relationship === "CANCELLED") {
      continue;
    }
    if (attrs.revenue === "NON_REVENUE") {
      continue;
    }
    // LIVE PREDICTIONS ONLY — no departure_time means either an arrival-only (terminating)
    // prediction or no live time at all; never fabricate one from a static schedule.
    if (!attrs.departure_time) {
      continue;
    }
    const routeId = prediction.relationships?.route?.data?.id;
    const route = COMMUTER_RAIL_ROUTES[routeId];
    if (!route) {
      // Not one of the in-scope Commuter Rail routes (e.g. CR-Foxboro Event Service, or an
      // Amtrak/other route_type-2 service if MBTA ever files one this way) — out of v1 scope,
      // dropped rather than shown with a fabricated label.
      continue;
    }
    const directionId = Number.isInteger(attrs.direction_id) ? attrs.direction_id : 0;
    const tripId = prediction.relationships?.trip?.data?.id ?? prediction.id;
    const trip = tripsById.get(tripId);
    const departure = new Date(attrs.departure_time);
    if (Number.isNaN(departure.getTime())) {
      continue;
    }

    trips.push({
      tripId,
      stopId,
      lineId: "commuter-rail",
      liveDeparture: departure.toISOString(),
      scheduledDeparture: departure.toISOString(),
      displayTime: formatEasternClock(departure),
      scheduledDisplayTime: formatEasternClock(departure),
      platform: "",
      destination: mapCommuterRailDestination(routeId, directionId) ?? route.longName,
      stopHeadsign: String(trip?.attributes?.headsign ?? "").trim(),
      routeShortName: "",
      routeLongName: route.longName,
      routeDesc: "Commuter Rail",
      status: String(attrs.status ?? "").trim() || "On Time",
      cancelled: false,
    });
  }
  return trips;
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

  const subwayTrips = buildBoardForStops({
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

  const commuterRailStopId = COMMUTER_RAIL_STOP_IDS[catalogEntry.name];
  const commuterRailTrips = commuterRailStopId
    ? await fetchCommuterRailTrips(commuterRailStopId, { now: options.now })
    : [];

  const trips = [...subwayTrips, ...commuterRailTrips].sort(
    (a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture)
  );

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    /** Mixed freshness: subway rows are GTFS static schedule-only; Commuter Rail rows (only at
     * COMMUTER_RAIL_STOP_IDS stations) are live MBTA V3 predictions, live-only with no
     * scheduled fallback (see fetchCommuterRailTrips). Board-level `realtime` stays `false`
     * because the majority (subway) portion is schedule-only — no UI currently reads this
     * field (contract.js), so it isn't a rider-facing regression either way. */
    realtime: false,
  };
}
