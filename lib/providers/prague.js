/**
 * Prague (PID Metro A/B/C, operator DPP) provider — Golemio PID Departure Boards API, a
 * proprietary JSON board (NOT GTFS-RT protobuf). Adapter ready; city remains `planned` in the
 * registry (not live) — see docs/prague-d1/jim-handoff.md. v1 scope is Metro A/B/C only — no
 * Line D (under construction, no passenger service until 2031-2032 earliest), no tram, bus,
 * trolleybus, funicular, regional rail (Esko), ferries (docs/prague-d1/published-network.json
 * coverageGaps).
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback, same posture as lib/providers/vienna.js,
 * bart.js, washington.js. fetchStationBoard() propagates any fetch/parse failure rather than
 * returning an empty or synthetic board. GOLEMIO_API_KEY unset -> MissingGolemioApiKeyError
 * (lib/providers/gtfs/auth.js), never a silent fallback.
 *
 * Feed: Golemio PID Departure Boards (v2) — confirmed 28 Sep 2026 against the live OpenAPI spec
 * at https://api.golemio.cz/pid/docs/openapi/ (served from
 * https://api.golemio.cz/docs/static/vp-output-gateway/openapi.json):
 *   GET https://api.golemio.cz/v2/pid/departureboards?ids[]=<stop_id>[&ids[]=<stop_id>...]
 *   Header: X-Access-Token: <GOLEMIO_API_KEY>
 *   `ids` is the GTFS stop_id (e.g. "U400Z101P") — up to 100 stops combined in one request.
 *   `mode=departures` (default) excludes trips for which the queried stop is the final stop, so
 *   a terminus station's board never needs an extra self-terminus filter here (see
 *   lib/cities/prague/marketing-directions.js's isTerminatingAtStation, kept as a
 *   belt-and-braces guard, not the primary defence).
 *   Rate limit: 20 requests / 8 seconds per key (Golemio OpenAPI spec's "Requests rate" note).
 * Response shape: `{ stops: [...], departures: [{ route: { short_name, type, ... }, trip: {
 *   headsign, id, is_canceled, ... }, stop: { id, platform_code }, departure_timestamp: {
 *   predicted, scheduled, minutes }, delay: {...}, last_stop: {...} }], infotexts: [...] }`.
 *   `route.type` is the GTFS route_type (1 = metro) — every departure is filtered on
 *   `route.type === 1` as a defence-in-depth check even though the queried stop_ids are already
 *   metro-only platforms (lib/cities/prague/stations.json), same "never trust the network
 *   response alone" posture as lib/providers/vienna.js's tripsFromMonitors line-type filter.
 *
 * Static PID GTFS (https://data.pid.cz/PID_GTFS.zip, ~48MB zipped, verified live 200 anonymous)
 * is used ONLY at D2 to resolve the D1 station roster's names to GTFS stop_id — never bundled,
 * never fetched on the request path, and never a schedule fallback. It was trimmed to metro-only
 * (route_type 1) by scripts/trim-prague-gtfs.mjs and published to the next-train-gtfs Vercel
 * Blob store (gtfs/prague.zip) for provenance/reproducibility, but this adapter does not read
 * that blob at runtime — the resolved stop_ids are baked directly into
 * lib/cities/prague/stations.json (same "resolve once at D2, store the result" pattern as
 * lib/cities/vienna/stations.json's `rbl` arrays, not Dublin's per-request GTFS lookup).
 *
 * D2 finding (docs/prague-d1/jim-handoff.md, appended): Flora (Metro A, between Jiřího z
 * Poděbrad and Želivského) has ZERO stop_times referencing either of its platform stop_ids in
 * the 28 Sep 2026 GTFS snapshot — every sampled Line A trip runs Jiřího z Poděbrad -> Želivského
 * directly. This looks like a real, current service gap (e.g. an escalator/engineering closure),
 * not a fixture bug — Flora's own parent + platform stop_ids were confirmed to still exist by
 * NAME match (scripts/trim-prague-gtfs.mjs's KNOWN_STATION_NAMES union), so it stays in the
 * catalog. If Golemio's live board genuinely returns zero metro departures for Flora, that is an
 * honest reflection of today's real service, not a bug to paper over (Dublin's honest-empty-state
 * precedent, docs/jim-brief-dublin-honest-empty-state.md) — flagged for Mark/Tim to re-confirm
 * before flip whether this is temporary.
 *
 * Direction labels: line + terminus (e.g. "A + Depo Hostivař", "C + Letňany"), per
 * docs/prague-d1/direction-model-memo.md §3 recommendation A. Muzeum (hub lock, A x C) never
 * appears as a direction token; Můstek (A x B) and Florenc (B x C) are the other two vertices of
 * the interchange triangle, doNotGroup against Muzeum and each other
 * (lib/cities/prague/marketing-directions.js).
 *
 * Diacritics are load-bearing (hazard-pack.md) — station names/headsigns are matched with full
 * diacritics intact; see marketing-directions.js's file header for why its foldKey() does NOT
 * strip combining marks, unlike every other city in this repo.
 */

import { golemioAuthHeaders, readGolemioApiKey } from "./gtfs/auth.js";
import {
  PRAGUE_HUB,
  PRAGUE_TIME_ZONE,
  GOLEMIO_ROUTE_SHORT_NAME_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  isTerminatingAtStation,
  LINE_LABELS,
  LINE_TERMINI,
  listCatalogStations as listMarketingCatalogStations,
  mapLineTerminusDestination,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
} from "../cities/prague/marketing-directions.js";

export {
  PRAGUE_HUB,
  LINE_LABELS,
  LINE_TERMINI,
  GOLEMIO_ROUTE_SHORT_NAME_TO_LINE,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
};
export const PRAGUE_TIMEZONE = PRAGUE_TIME_ZONE;

export const GOLEMIO_DEPARTURE_BOARDS_URL = "https://api.golemio.cz/v2/pid/departureboards";
const METRO_ROUTE_TYPE = 1;

export function listCatalogStations() {
  return listMarketingCatalogStations();
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data),
 * same pattern as lib/providers/washington.js / lib/providers/vienna.js. */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

/**
 * Builds the departure-boards request URL for one or more GTFS stop_ids. Exported for tests —
 * never call the live endpoint from a QA gate; use a captured/synthetic fixture instead.
 * `minutesAfter` widens the default 180-minute window is left at the API default; `mode` is left
 * at its "departures" default (per file header, this is what avoids returning arrival-only rows
 * at a terminus).
 */
export function buildDepartureBoardsUrl(stopIds) {
  const url = new URL(GOLEMIO_DEPARTURE_BOARDS_URL);
  for (const id of Array.isArray(stopIds) ? stopIds : [stopIds]) {
    url.searchParams.append("ids[]", String(id));
  }
  return url.toString();
}

async function fetchDepartureBoardsJson(stopIds, apiKey) {
  const headers = golemioAuthHeaders(apiKey ?? readGolemioApiKey());
  const response = await fetch(buildDepartureBoardsUrl(stopIds), { headers });
  if (!response.ok) {
    throw new Error(
      `Golemio PID Departure Boards request failed for stop_id(s) ${stopIds.join(",")}: HTTP ${response.status}`
    );
  }
  const body = await response.json();
  return Array.isArray(body?.departures) ? body.departures : [];
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

/**
 * Normalizes one departure-boards `departures[]` entry into a ProviderTrip, or null when the row
 * must be dropped — either it isn't a metro route (route.type !== 1, belt-and-braces per the
 * file header) or its route.short_name isn't one of the three known lines. `stationName` is used
 * for the self-terminus guard (Dublin #484 lesson): a departure whose resolved/raw destination
 * equals the station being viewed is an arrival, not a boardable direction, and is dropped.
 */
export function mapDepartureToTrip(departure, stationName, now = new Date()) {
  const route = departure?.route ?? {};
  if (Number(route.type) !== METRO_ROUTE_TYPE) {
    return null;
  }
  const lineId = GOLEMIO_ROUTE_SHORT_NAME_TO_LINE[String(route.short_name ?? "").trim()] ?? null;
  if (!lineId) {
    return null;
  }

  const headsign = departure?.trip?.headsign;
  if (isTerminatingAtStation(headsign, stationName)) {
    return null;
  }

  const stopTime = departure?.departure_timestamp ?? {};
  const iso = stopTime.predicted ?? stopTime.scheduled;
  if (!iso) {
    return null;
  }
  const liveDeparture = new Date(iso);
  if (Number.isNaN(liveDeparture.getTime())) {
    return null;
  }
  const scheduledIso = stopTime.scheduled ?? iso;
  const scheduledDeparture = new Date(scheduledIso);
  const displayTime = formatClock(liveDeparture, PRAGUE_TIME_ZONE);
  const scheduledDisplayTime = formatClock(
    Number.isNaN(scheduledDeparture.getTime()) ? liveDeparture : scheduledDeparture,
    PRAGUE_TIME_ZONE
  );

  return {
    liveDeparture: liveDeparture.toISOString(),
    scheduledDeparture: (Number.isNaN(scheduledDeparture.getTime())
      ? liveDeparture
      : scheduledDeparture
    ).toISOString(),
    displayTime,
    scheduledDisplayTime,
    platform: departure?.stop?.platform_code != null ? String(departure.stop.platform_code) : undefined,
    destination: mapLineTerminusDestination(headsign, lineId),
    lineId,
    cancelled: Boolean(departure?.trip?.is_canceled),
  };
}

/**
 * Flattens the departure-boards response's `departures[]` into ProviderTrips, dropping any row
 * that isn't a confirmed metro trip for one of the three known lines, or that terminates at the
 * station being viewed.
 */
export function tripsFromDepartures(departures, stationName, now = new Date()) {
  const trips = [];
  for (const departure of departures ?? []) {
    const trip = mapDepartureToTrip(departure, stationName, now);
    if (trip) {
      trips.push(trip);
    }
  }
  return trips;
}

/**
 * @param {string} stationIdOrName Catalog name or documented alias (lib/cities/prague/stations.json)
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Prague station: ${stationIdOrName}`);
  }

  const stopIds = options.stopIds ?? catalogEntry.stopIds ?? [];
  if (!stopIds.length) {
    throw new Error(`Unknown Prague station: ${stationIdOrName}`);
  }

  const departures =
    options.departures ?? (await fetchDepartureBoardsJson(stopIds, options.apiKey));
  const trips = tripsFromDepartures(departures, catalogEntry.name, options.now);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    realtime: "live",
  };
}
