/**
 * Boston (MBTA) — Red / Orange / Blue / Green B-C-D-E / Mattapan rapid transit PLUS Commuter
 * Rail, all from live MBTA V3 predictions (https://api-v3.mbta.com/predictions). LIVE
 * PREDICTIONS ONLY — no GTFS-static schedule fallback anywhere on this board (Tim's rule:
 * "no live times, no board", docs/board-eligibility-rule.md). Fixed 20 Sep 2026
 * (docs/jim-brief-boston-subway-live-predictions.md) — subway used to be built from static
 * GTFS (`stop_times.txt`) with `realtime: false`; that shipped scheduled times as if they were
 * live, which is exactly the thing this product promises never to do, and was also catastrophically
 * slow (per-direction fan-out each doing its own cold GTFS parse — production
 * `/api/board?city=boston&station=South Station` measured no response in 60s on 20 Sep 2026).
 *
 * Static GTFS (`https://cdn.mbta.com/MBTA_GTFS.zip`, loadGtfsStatic) is still used for exactly
 * one thing: resolving a catalog station name/alias to MBTA's own GTFS/V3 stop_ids (structural
 * reference data, cached 6h — lib/providers/gtfs/static-cache.js DEFAULT_TTL_MS). It is never a
 * source of a departure *time* — resolveStopIds() only returns stop_id strings, mapPredictionToTrip()
 * only ever builds a trip from a V3 prediction's `departure_time`.
 *
 * One upstream fetch per station per request window (docs/jim-brief-boston-subway-live-predictions.md
 * item 2): `fetchPredictionsRaw()` below is a short-TTL (15s), in-flight-coalescing, stale-on-
 * error cache keyed by the exact sorted stop_id set being queried — same shape as
 * lib/providers/brussels.js's fetchWaitingTimesRaw / lib/providers/vasttrafik.js's
 * fetchStopAreaDepartures. api/board.js fans out one getMultiCityNextTrain() per direction via
 * Promise.all, and each direction calls fetchStationBoard() independently — without this cache
 * that's N MBTA calls for an N-direction station; with it, the first caller's in-flight request
 * is awaited by every other caller within the same TTL window, so it's one real HTTP request no
 * matter how many directions a station has. Unauthenticated MBTA calls are rate-limited to
 * ~20/min; with MBTA_API_KEY (optional, header `x-api-key`, from https://www.mbta.com/developers)
 * ~1000/min. No key is registered by this task — a free key is advisable before production
 * traffic (rider concurrency across multiple stations could plausibly exceed 20/min unauthenticated;
 * the per-station cache only bounds fan-out *within* one station's directions, not across
 * stations), but the design stays inside the unauthenticated limit for a single station's normal
 * refresh cadence.
 *
 * Refusal path: any MBTA V3 fetch failure (non-200, timeout, network error) with no usable stale
 * cache entry propagates as a thrown Error — same posture as lib/providers/bart.js/chicago.js/
 * washington.js (live-boards-only cities with no schedule-only degrade path). The board is never
 * built from a fabricated or scheduled time.
 *
 * One V3 predictions call per station covers BOTH subway and Commuter Rail
 * (`filter[route_type]=0,1,2`: light rail, heavy rail, commuter rail) — a dual-mode station
 * (South Station etc.) needs no second call.
 *
 * Prediction semantics (docs/jim-brief-boston-subway-live-predictions.md item 1, confirmed
 * against live captures 20 Sep 2026 — qa/fixtures/boston/predictions.json):
 *   - `departure_time` null (arrival-only / terminating here) — dropped, never backfilled.
 *   - `schedule_relationship` CANCELLED or SKIPPED — dropped.
 *   - `revenue` "NON_REVENUE" (positioning run) — dropped.
 *   - `status` ("Boarding", "Stopped 2 stops away", etc.) is carried through as a rider-facing
 *     string but never used to derive a time.
 *   - Subway direction: the included `trip` resource's `headsign` is resolved against the line's
 *     own known termini (resolveTerminus/mapLineTerminusDestination, marketing-directions.js) —
 *     never an arbitrary headsign, so a mislabeled/short-turn headsign can't leak a hub string
 *     into a direction chip. An unresolvable headsign falls back to the bare line label.
 *   - Commuter Rail direction: unchanged from the pre-fix path — line + one of the route's two
 *     known termini (COMMUTER_RAIL_ROUTES.termini[direction_id]), never a raw headsign.
 *
 * v1 scope (docs/boston-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * subway / rapid transit (125 unique stops) PLUS Commuter Rail at the 5 stations named in
 * COMMUTER_RAIL_STOP_IDS. Amtrak (Acela, Northeast Regional, Lake Shore Limited) is
 * `out-reservation` (all-reserved, no walk-up) — filtered out because COMMUTER_RAIL_ROUTES only
 * ever contains MBTA's own CR route ids; Amtrak's route ids never match it. CapeFlyer is
 * board-eligibility `in` (seasonal, walk-up) but is NOT served by api-v3.mbta.com — no CapeFlyer
 * route exists in the V3 routes list as of 20 Sep 2026 — so it cannot be shown live; recorded in
 * registry.js notes, not silently dropped. Silver Line BRT, ferry, bus, Massport shuttles stay
 * `out-mode` (excluded by the route_type filter, belt-and-braces by MBTA_ROUTE_ID_TO_LINE/
 * COMMUTER_RAIL_ROUTES lookup returning nothing for any other route id).
 *
 * Hub lock: Park Street (Red x Green, all four Green services). doNotGroup, per
 * hazard-pack.md H1/H2/H6: Downtown Crossing (Red x Orange), Gov't Center (Green x Blue; B/C
 * inner end — a legitimate Green B/C *direction terminus*, just never a Park Street proxy),
 * State (Orange x Blue), South Station, North Station, Haymarket — all separate stop-places,
 * never folded into Park Street.
 *
 * Route classification: MBTA's GTFS/V3 route_id values (Red, Orange, Blue, Green-B/C/D/E,
 * Mattapan) already match docs/boston-d1/published-network.json's per-line `gtfsRouteIdsIfKnown`
 * exactly, so predictions are classified by exact route_id (prediction.relationships.route.data.id)
 * rather than by route_short_name/long_name string matching, confirmed against a live payload
 * 20 Sep 2026 (qa/fixtures/boston/predictions.json).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
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
export const MBTA_V3_PREDICTIONS_URL = "https://api-v3.mbta.com/predictions";
export const MBTA_V3_BASE_URL = "https://api-v3.mbta.com";

/**
 * GTFS route_type parse-level filter used ONLY when resolving a station name to stop_ids from
 * static reference data (never for building a departure time): "0" light rail (Green branches +
 * Mattapan Trolley), "1" subway (Red/Orange/Blue). Commuter Rail ("2") stop_ids come from
 * COMMUTER_RAIL_STOP_IDS, not from this static parse.
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
 * (`x-api-key`, from https://www.mbta.com/developers). Not thrown by fetchStationBoard() below,
 * which works unauthenticated (confirmed live 20 Sep 2026); MBTA_API_KEY, if set, is sent as an
 * optional rate-limit-raising header only.
 */
export class MissingMbtaApiKeyError extends Error {
  constructor(
    message = "MBTA V3 API key not configured (MBTA_API_KEY). Unauthenticated calls to " +
      "api-v3.mbta.com are rate-limited (20/window) but work — this error is not thrown by " +
      "the current path, only available for a future caller that wants to require a key — " +
      "see lib/providers/boston.js file header."
  ) {
    super(message);
    this.name = "MissingMbtaApiKeyError";
  }
}

const catalogPath = join(__dirname, "../cities/boston/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

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
 * Longwood vs Longwood Medical Area, Medford/Tufts vs Tufts Medical Ctr). Structural reference
 * data only — returns stop_ids, never a departure time.
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

function formatEasternClock(date) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BOSTON_TIME_ZONE,
  });
}

/** How long a station's raw predictions payload is cached in-process before a fresh fetch. */
export const MBTA_PREDICTIONS_CACHE_TTL_MS = 15_000;
/** How long a stale cached payload may still be served if a refresh attempt fails. */
export const MBTA_PREDICTIONS_STALE_MAX_MS = 60_000;
export const MBTA_FETCH_TIMEOUT_MS = 8000;

function cacheKeyFor(stopIds) {
  return stopIds.slice().sort().join(",");
}

async function fetchPredictionsRawUncached(stopIds) {
  const params = new URLSearchParams();
  params.set("filter[stop]", stopIds.join(","));
  // 0 light rail (Green/Mattapan), 1 heavy rail (Red/Orange/Blue), 2 Commuter Rail — one call
  // covers subway and Commuter Rail together at a dual-mode station.
  params.set("filter[route_type]", "0,1,2");
  params.set("include", "trip,route");

  const headers = { Accept: "application/vnd.api+json" };
  if (process.env.MBTA_API_KEY) {
    headers["x-api-key"] = process.env.MBTA_API_KEY;
  }
  const response = await fetch(`${MBTA_V3_PREDICTIONS_URL}?${params.toString()}`, {
    headers,
    signal: AbortSignal.timeout(MBTA_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`MBTA V3 predictions request failed for ${stopIds.join(",")}: HTTP ${response.status}`);
  }
  return response.json();
}

/** @type {Map<string, { value: object, timestamp: number, inflight: Promise<any>|null }>} */
const predictionsCache = new Map();

/**
 * Fetch + cache one station's raw predictions payload (TTL window, in-flight coalescing,
 * stale-on-error), same shape as lib/providers/brussels.js's fetchWaitingTimesRaw — one shared
 * upstream MBTA call per station per window regardless of how many directions
 * api/board.js/api/next-train.js fan out concurrently. A failed refresh with no usable stale
 * entry propagates the error (refusal, never a scheduled fallback).
 */
async function fetchPredictionsRaw(stopIds, options = {}) {
  if (options.noCache) {
    return fetchPredictionsRawUncached(stopIds);
  }

  const key = cacheKeyFor(stopIds);
  const now = Date.now();
  const existing = predictionsCache.get(key);

  if (existing?.inflight) {
    return existing.inflight;
  }
  if (existing && now - existing.timestamp < MBTA_PREDICTIONS_CACHE_TTL_MS) {
    return existing.value;
  }

  const inflight = fetchPredictionsRawUncached(stopIds).then(
    (value) => {
      predictionsCache.set(key, { value, timestamp: Date.now(), inflight: null });
      return value;
    },
    (error) => {
      const stale = predictionsCache.get(key);
      if (stale?.value && Date.now() - stale.timestamp < MBTA_PREDICTIONS_STALE_MAX_MS) {
        predictionsCache.set(key, { ...stale, inflight: null });
        return stale.value;
      }
      predictionsCache.delete(key);
      throw error;
    }
  );

  predictionsCache.set(key, { value: existing?.value, timestamp: existing?.timestamp ?? 0, inflight });
  return inflight;
}

/** Test-only: clear the module-level predictions cache between gate runs. */
export function _resetMbtaPredictionsCacheForTests() {
  predictionsCache.clear();
}

/** True when a raw V3 prediction must never become a board row — arrival-only (no departure
 * time, i.e. terminating here), CANCELLED/SKIPPED, or a non-revenue positioning run. Never
 * fabricates a time from any of these. */
function isDroppablePrediction(attrs) {
  if (attrs.schedule_relationship === "CANCELLED" || attrs.schedule_relationship === "SKIPPED") {
    return true;
  }
  if (attrs.revenue === "NON_REVENUE") {
    return true;
  }
  if (!attrs.departure_time) {
    return true;
  }
  return false;
}

/**
 * Normalizes one MBTA V3 `predictions[]` resource into a ProviderTrip (subway or Commuter
 * Rail), or null when it must be dropped. `tripsById` is the `included` trip resources, keyed by
 * id, for headsign lookup. Exported for tests.
 */
export function mapPredictionToTrip(prediction, tripsById) {
  const attrs = prediction?.attributes ?? {};
  if (isDroppablePrediction(attrs)) {
    return null;
  }

  const departure = new Date(attrs.departure_time);
  if (Number.isNaN(departure.getTime())) {
    return null;
  }

  const routeId = prediction.relationships?.route?.data?.id;
  const tripId = prediction.relationships?.trip?.data?.id ?? prediction.id;
  const trip = tripsById.get(tripId);
  const status = String(attrs.status ?? "").trim() || undefined;
  const displayTime = formatEasternClock(departure);

  const commuterRoute = COMMUTER_RAIL_ROUTES[routeId];
  if (commuterRoute) {
    const directionId = Number.isInteger(attrs.direction_id) ? attrs.direction_id : 0;
    return {
      tripId,
      lineId: "commuter-rail",
      liveDeparture: departure.toISOString(),
      scheduledDeparture: departure.toISOString(),
      displayTime,
      scheduledDisplayTime: displayTime,
      platform: "",
      destination: mapCommuterRailDestination(routeId, directionId) ?? commuterRoute.longName,
      stopHeadsign: String(trip?.attributes?.headsign ?? "").trim(),
      routeShortName: "",
      routeLongName: commuterRoute.longName,
      routeDesc: "Commuter Rail",
      status: status || "On Time",
      cancelled: false,
    };
  }

  const lineId = MBTA_ROUTE_ID_TO_LINE[routeId] ?? null;
  if (!lineId) {
    // Not one of the 8 known subway/rapid-transit route_ids or a Commuter Rail route_id — out
    // of v1 scope (Silver Line/other), belt-and-braces beyond the route_type filter.
    return null;
  }

  const headsign = String(trip?.attributes?.headsign ?? "").trim();
  return {
    tripId,
    lineId,
    liveDeparture: departure.toISOString(),
    scheduledDeparture: departure.toISOString(),
    displayTime,
    scheduledDisplayTime: displayTime,
    platform: "",
    destination: mapLineTerminusDestination(headsign, lineId),
    routeShortName: "",
    routeLongName: LINE_LABELS[lineId],
    routeDesc: lineId === "mattapan" ? "Light Rail" : "Rapid Transit",
    status,
    cancelled: false,
  };
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/boston/stations.json)
 * @param {{ now?: Date, noCache?: boolean, rawPredictions?: object, stopIds?: string[] }} [options]
 *   `rawPredictions`/`stopIds` are test seams — production callers never pass them.
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Boston station: ${stationIdOrName}`);
  }

  let stopIds = options.stopIds;
  if (!stopIds) {
    const staticData = await loadBostonStatic();
    stopIds = resolveStopIds(staticData, catalogEntry);
  }
  if (!stopIds.length) {
    throw new Error(`Unknown Boston station: ${stationIdOrName}`);
  }

  const commuterRailStopId = COMMUTER_RAIL_STOP_IDS[catalogEntry.name];
  const queryStopIds =
    commuterRailStopId && !stopIds.includes(commuterRailStopId)
      ? [...stopIds, commuterRailStopId]
      : stopIds;

  const payload = options.rawPredictions
    ? options.rawPredictions
    : await fetchPredictionsRaw(queryStopIds, { noCache: options.noCache });

  const included = payload?.included ?? [];
  const tripsById = new Map(included.filter((i) => i.type === "trip").map((i) => [i.id, i]));

  const trips = (payload?.data ?? [])
    .map((prediction) => mapPredictionToTrip(prediction, tripsById))
    .filter(Boolean)
    .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    // Every row on this board is built from a live MBTA V3 prediction with a real predicted
    // departure_time — no GTFS-static schedule path exists on this board at all.
    realtime: true,
  };
}
