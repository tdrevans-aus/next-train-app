/**
 * Los Angeles Metro Rail (LA Metro) — six passenger lines (A, B, C, D, E, K) via LA Metro's
 * static rail GTFS (stop-id resolution only) + Swiftly's GTFS-RT feed for live trip updates.
 * Adapter ready; city remains `planned` (not live) — see docs/los-angeles-d1/jim-handoff.md.
 * assertCityLive("los-angeles") must still fail until Tim flips the registry entry.
 *
 * LIVE BOARDS ONLY — no static-GTFS/schedule fallback. Same posture as lib/providers/bart.js,
 * chicago.js, and washington.js: no live times, no board; never a silent timetable fallback.
 * fetchStationBoard() throws MissingSwiftlyApiKeyError (lib/providers/gtfs/auth.js) whenever
 * SWIFTLY_API_KEY is unset, and propagates any Swiftly fetch/parse failure rather than returning
 * an empty/synthetic board. Do not add a schedule-only degrade path here — that would violate
 * the D1 pack's live-boards-only instruction.
 *
 * Two independent feeds, per docs/los-angeles-d1/published-network.json `liveBoards`:
 *   - Static rail GTFS `https://gitlab.com/LACMTA/gtfs_rail/raw/master/gtfs_rail.zip` — no key,
 *     used ONLY at request time to resolve a catalog station name to LA Metro's own GTFS
 *     stop_id(s) (loadGtfsStatic + findRailStopIdsForName, same pattern
 *     lib/providers/auckland.js uses). The D1 pack is explicit that this feed is NOT a
 *     generator for lib/cities/los-angeles/stations.json (that catalog is hand-transcribed from
 *     the official printed map) — it is structural join data only, never a source of a
 *     departure time.
 *   - Swiftly GTFS-RT (`lametro-rail`) trip updates
 *     `https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-trip-updates`, header
 *     `Authorization: <SWIFTLY_API_KEY>` (raw key; "Bearer <key>" is rejected 401) — the ONLY source of live departure times.
 *     Confirmed empty-key 401 on 29 Aug 2026 (jim-handoff.md); no real key has ever been sent or
 *     pasted into this repo. **SWIFTLY_API_KEY is required — Tim must register at
 *     https://goswift.ly/realtime-api-key.** This is not a D1/D2 blocker (the city stays
 *     `planned` either way), but no live board can be served until the key is set.
 *
 * v1 scope (docs/los-angeles-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md):
 * LA Metro Rail only — A, B, C, D, E, K (110 unique open passenger stops). No G Line or J Line
 * Busway, no Metro bus, no Metrolink, no Amtrak, no LAX FlyAway/airport people movers.
 *
 * Hub lock: 7th St/Metro Ctr (A x B x D x E, a through-cross — A runs N-S through it, E runs
 * E-W through it, B/D continue on to Union Station/North Hollywood/Wilshire/La Cienega) — never
 * a direction token. C and K never call here. doNotGroup/doNotCollapse
 * (lib/cities/los-angeles/marketing-directions.js file header, hazard-pack.md H1/H4/H6): 7th
 * St/Metro Ctr vs Union Station vs Civic Ctr/Grand Park vs Pershing Square vs Historic Broadway
 * vs East LA Civic Ctr; Grand Av Arts/Bunker Hill vs Grand/LATTC vs LATTC/Ortho Institute; Pico
 * vs Pico/Aliso; Crenshaw vs Expo/Crenshaw; Aviation/Century vs Aviation/Imperial; Pacific Av (A
 * Line Long Beach loop stop) vs Downtown Long Beach.
 *
 * Direction model is "line + terminus" (e.g. "A Line + Pomona North", "E Line + Atlantic",
 * "K Line + Redondo Beach"), per direction-model-memo.md §3 recommendation A — keeps the word
 * "Line", same shape as Washington, unlike Chicago's/BART's bare colour word. A Line's
 * documented short-turn destinations (Monrovia, APU/Citrus College, Wardlow) are recorded for
 * reference (A_LINE_SHORT_TURNS) but never treated as a terminus chip.
 *
 * Board eligibility (docs/los-angeles-d1/hazard-pack.md H3, coverageGaps): Metrolink and Amtrak
 * call at Union Station and Pomona North but are separate agencies/buildings, not in-catalog
 * stations — doNotGroup. LAX FlyAway/airport people movers at LAX/Metro Transit Center are
 * transfers, not D1 stops. G Line (Van Nuys closed until winter 2028) and J Line Busway are out
 * of v1 mode scope. None of these are wired in this adapter and must not be faked.
 *
 * America/Los_Angeles HAS DST (PDT/PST) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST.
 * City id is los-angeles; do not invent city=la/lax/metro/lacmta/us, do not merge into
 * washington/chicago/bart/boston. D1 pack in docs/los-angeles-d1/. Do not flip live from this
 * pack — Mark/Tim's call.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, activeServicesForDate } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops, hasScheduledServiceToday } from "./gtfs/board.js";
import { swiftlyAuthHeaders, readSwiftlyApiKey, MissingSwiftlyApiKeyError, readMetrolinkApiKey, metrolinkAuthHeaders } from "./gtfs/auth.js";
import {
  LOS_ANGELES_HUB,
  LOS_ANGELES_TIME_ZONE,
  LINE_LABELS,
  LINE_TERMINI,
  A_LINE_SHORT_TURNS,
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  mapLineTerminusDestination,
  resolveCatalogEntry as resolveMarketingCatalogEntry,
} from "../cities/los-angeles/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export {
  LOS_ANGELES_HUB,
  LOS_ANGELES_TIME_ZONE,
  LINE_LABELS,
  LINE_TERMINI,
  A_LINE_SHORT_TURNS,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  MissingSwiftlyApiKeyError,
};


export const LA_METRO_GTFS_STATIC_URL =
  "https://gitlab.com/LACMTA/gtfs_rail/raw/master/gtfs_rail.zip";

export const SWIFTLY_TRIP_UPDATES_URL =
  "https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-trip-updates";

/**
 * Metrolink (Southern California Regional Rail Authority) feeds.
 * Static GTFS is unkeyed; GTFS-RT trips require X-Api-Key (METROLINK_API_KEY).
 * Wired per docs/jim-brief-la-metrolink-wire.md and Tim's EULA ruling 25 Oct 2026.
 */
export const METROLINK_GTFS_STATIC_URL =
  "https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip";
export const METROLINK_TRIP_UPDATES_URL =
  "https://metrolink-gtfsrt.gbsdigital.us/feed/gtfsrt-trips";

/**
 * Pacific Surfliner (Amtrak) feeds. Route id 78 only — all other route_ids in the
 * transitdocs feed are long-distance Amtrak (out-reservation) and must never appear
 * on this board. Tim approved serving the transitdocs feed on 25 Oct 2026 (Australia/Perth).
 * Amtrak has not given written permission; that is Tim's product decision.
 * Transitdocs contact (courtesy, not a formal attribution clause): asm-contact@transitdocs.com.
 */
export const AMTRAK_GTFS_STATIC_URL = "https://content.amtrak.com/content/gtfs/GTFS.zip";
export const TRANSITDOCS_TRIP_UPDATES_URL = "https://asm-backend.transitdocs.com/gtfs/amtrak";
export const SURFLINER_ROUTE_ID = "78";
/** Amtrak GTFS stop_id for Union Station ("Los Angeles" in Amtrak stop_name). */
export const SURFLINER_STOP_ID = "LAX";
/** Catalog name of the only Surfliner stop in this catalog. */
export const SURFLINER_CATALOG_STATION = "Union Station";

/**
 * In-catalog stations that have Metrolink service: catalog name -> Metrolink GTFS stop_id.
 * Only these two stations receive a Metrolink direction group (Brussels shape).
 * Pomona - Downtown (stop 120) and the IE-OC line are explicitly excluded (H3/pack).
 */
export const METROLINK_CATALOG_TO_STOP_ID = {
  "Union Station": "107",
  "Pomona North": "109",
};

/** Reverse map: Metrolink stop_id -> catalog name. */
export const METROLINK_STOP_ID_TO_CATALOG = Object.fromEntries(
  Object.entries(METROLINK_CATALOG_TO_STOP_ID).map(([name, id]) => [id, name])
);

/** GTFS `route_short_name` (`gtfs_rail.zip` routes.txt, e.g. "A"/"B"/"K") -> our line id.
 * Checked 24 Oct 2026: gtfs_rail.zip route_short_name is EMPTY (routes only have route_long_name
 * "Metro A Line"), so lineIdForRoute() also parses the long name. Bare line label when no match. */
export const LA_METRO_ROUTE_SHORT_NAME_TO_LINE = {
  a: "a",
  b: "b",
  c: "c",
  d: "d",
  e: "e",
  k: "k",
};

const catalogPath = join(__dirname, "../cities/los-angeles/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Re-exported so callers/tests use one resolver (marketing-directions.js owns the data). */
export function resolveCatalogEntry(stationIdOrName) {
  return resolveMarketingCatalogEntry(stationIdOrName);
}

function authHeaders() {
  return swiftlyAuthHeaders(readSwiftlyApiKey());
}

export async function loadLosAngelesStatic() {
  return loadGtfsStatic({
    url: LA_METRO_GTFS_STATIC_URL,
    routeTypes: ["0", "1"], // Metro Rail is light rail (0) + subway (1); railOnly would keep only type 2 = empty
    timeZone: LOS_ANGELES_TIME_ZONE,
  });
}

/**
 * Metrolink static GTFS (unkeyed). Loaded for stop/trip identity only, never for a departure
 * time. Cached in-process by loadGtfsStatic (same pattern as LA Metro static above).
 */
export async function loadMetrolinkStatic() {
  return loadGtfsStatic({
    url: METROLINK_GTFS_STATIC_URL,
    routeTypes: ["2"], // commuter rail
    timeZone: LOS_ANGELES_TIME_ZONE,
  });
}

/**
 * Amtrak static GTFS (unkeyed). Loaded for trip/stop identity only — the Amtrak timetable
 * that tells us which trips call at Union Station and which do NOT terminate there. Pacific
 * Surfliner departure times come from the transitdocs live feed, not from here. Route_id 78
 * (Pacific Surfliner) is filtered in chip functions; all other Amtrak routes are ignored.
 */
export async function loadAmtrakSurflineStatic() {
  return loadGtfsStatic({
    url: AMTRAK_GTFS_STATIC_URL,
    routeTypes: ["2"], // intercity / commuter rail; Pacific Surfliner is type 2
    timeZone: LOS_ANGELES_TIME_ZONE,
  });
}

/**
 * Build a Pacific Surfliner chip: "Pacific Surfliner + {terminal stop_name}".
 * Returns null when the trip terminates at the board station (never a self chip).
 * Uses the exact GTFS stop_name of the final stop — "San Diego", "Goleta Amtrak",
 * "San Luis Obispo" — per direction-model-memo.md §3 recommendation A.
 * @param {string} terminalStopId  GTFS stop_id of the trip's final stop
 * @param {string} terminalStopName GTFS stop_name of the final stop
 * @param {string} boardStopId     Amtrak stop_id of the station being rendered ("LAX")
 */
export function buildSurflineChip(terminalStopId, terminalStopName, boardStopId) {
  if (!terminalStopId || !terminalStopName || terminalStopId === boardStopId) return null;
  return `Pacific Surfliner + ${terminalStopName}`;
}

/**
 * Static direction chips for a Surfliner board station: every distinct
 * "Pacific Surfliner + {terminal_stop_name}" among scheduled route-78 trips that
 * call at boardStopId and do NOT terminate there. Offline — used by the dogfood
 * module and the QA gate.
 * @param {object} amtrakStaticData  loadAmtrakSurflineStatic() result
 * @param {string} boardStopId       Amtrak GTFS stop_id ("LAX" for Union Station)
 * @param {{ serviceIds?: Set<string>, stopTimeFilter?: (stopTime: object) => boolean }} [opts]
 */
export function staticSurflineChipsForStop(amtrakStaticData, boardStopId, { serviceIds, stopTimeFilter } = {}) {
  const terminals = terminalStopsByTrip(amtrakStaticData);
  const chips = new Set();
  const seen = new Set();
  for (const stopTime of amtrakStaticData.stopTimesByStopId.get(boardStopId) ?? []) {
    const { trip_id: tripId } = stopTime;
    if (seen.has(tripId)) continue;
    if (stopTimeFilter && !stopTimeFilter(stopTime)) continue;
    const trip = amtrakStaticData.tripsById.get(tripId);
    if (trip?.route_id !== SURFLINER_ROUTE_ID) continue;
    if (serviceIds && !serviceIds.has(trip?.service_id)) continue;
    seen.add(tripId);
    const terminal = terminals.get(tripId);
    if (!terminal || terminal.stopId === boardStopId) continue;
    const terminalStop = amtrakStaticData.stopsById.get(terminal.stopId);
    const chip = buildSurflineChip(terminal.stopId, terminalStop?.stop_name ?? "", boardStopId);
    if (chip) chips.add(chip);
  }
  return [...chips].sort();
}

/**
 * Surfliner chips at boardStopId that have at least one scheduled route-78 trip today (LA time).
 * Returns null when the service calendar gives no active services (unknown).
 */
export function scheduledSurflineDestinationsToday(amtrakStaticData, boardStopId, { now = new Date() } = {}) {
  const serviceIds = activeServicesForDate(amtrakStaticData, now, LOS_ANGELES_TIME_ZONE);
  if (!serviceIds || serviceIds.size === 0) return null;
  return staticSurflineChipsForStop(amtrakStaticData, boardStopId, { serviceIds });
}

/**
 * Surfliner chips at boardStopId whose next scheduled departure is still ahead of `now`
 * (same 24:00+ semantics as scheduledMetrolinkDestinationsRemainingToday). Returns null
 * when the calendar is unknown.
 */
export function scheduledSurflineDestinationsRemainingToday(amtrakStaticData, boardStopId, { now = new Date() } = {}) {
  const clock = localClock(now);
  const todayServices = activeServicesForDate(amtrakStaticData, now, LOS_ANGELES_TIME_ZONE);
  if (!todayServices || todayServices.size === 0) return null;
  const yesterdayNoon = new Date(Date.UTC(clock.year, clock.month - 1, clock.day - 1, 20, 0, 0));
  const yesterdayServices = activeServicesForDate(amtrakStaticData, yesterdayNoon, LOS_ANGELES_TIME_ZONE) ?? new Set();
  const floor = clock.seconds - REMAINING_GRACE_SEC;
  const chips = new Set();
  const collect = (svcIds, offsetSec) => {
    if (svcIds.size === 0) return;
    for (const chip of staticSurflineChipsForStop(amtrakStaticData, boardStopId, {
      serviceIds: svcIds,
      stopTimeFilter: (stopTime) => {
        const sec = gtfsSeconds(stopTime.departure_time ?? stopTime.arrival_time);
        if (sec == null) return false;
        if (offsetSec !== 0 && sec < GTFS_SEC_PER_DAY) return false;
        return sec - offsetSec > floor;
      },
    })) {
      chips.add(chip);
    }
  };
  collect(todayServices, 0);
  collect(yesterdayServices, GTFS_SEC_PER_DAY);
  return [...chips].sort();
}

/**
 * Build trip_short_name → first static trip_id index for route-78 trips only.
 * The real transitdocs GTFS-RT encodes the train number in the trip_id
 * (e.g. "2026-10-24_AMTK_595") while Amtrak static GTFS uses a numeric trip_id
 * ("312161") and stores the public train number in trip_short_name ("595").
 * This index bridges the two id spaces.
 */
function buildSurflineShortNameIndex(amtrakStaticData) {
  const index = new Map();
  for (const [tripId, trip] of amtrakStaticData.tripsById) {
    if (trip.route_id !== SURFLINER_ROUTE_ID) continue;
    const tsn = String(trip.trip_short_name || "").trim();
    if (tsn && !index.has(tsn)) {
      index.set(tsn, tripId);
    }
  }
  return index;
}

/**
 * Build live Pacific Surfliner board rows. Joins the transitdocs GTFS-RT feed to Amtrak static
 * via trip_short_name (the public train number), keeping only route-id 78 trips so long-distance
 * Amtrak trains never reach the board. Returns [] when no route-78 rows survive the
 * live-confirmed filter. Never throws.
 *
 * Join rule: parse AMTK_<number> from the realtime trip_id → look up that number in the
 * route-78 trip_short_name index → use the resulting static trip_id as the join key.
 * If routeId is present on the entity and is not "78", the entity is dropped immediately.
 * A second route_id guard on the static row ensures no non-78 trip can slip through even
 * if the short-name index were somehow wrong.
 *
 * @param {string} boardStopId         Amtrak GTFS stop_id ("LAX")
 * @param {object} amtrakStaticData    loadAmtrakSurflineStatic() result
 * @param {{ entities: object[], fetchedAt: Date }} surflinerRealtime
 * @param {Date} [now]
 */
function composeSurflineTripRows(boardStopId, amtrakStaticData, surflinerRealtime, now) {
  const terminals = terminalStopsByTrip(amtrakStaticData);

  // trip_short_name → static trip_id, route 78 only.
  const shortNameIndex = buildSurflineShortNameIndex(amtrakStaticData);

  // Map a realtime TripDescriptor to its static trip_id for indexing:
  // 1. If routeId is present and not "78", drop immediately (long-distance Amtrak).
  // 2. Parse AMTK_<number> from the realtime trip_id; join via trip_short_name.
  // 3. Fallback for test fixtures where the raw trip_id already matches a static route-78 trip_id.
  const resolveTripId = (descriptor) => {
    const rtId = String(descriptor.tripId || "");
    if (descriptor.routeId && String(descriptor.routeId) !== SURFLINER_ROUTE_ID) return null;
    const m = /AMTK_(\d+)/.exec(rtId);
    if (m) return shortNameIndex.get(m[1]) ?? null;
    // Fallback: raw trip_id is already a static route-78 trip_id (e.g. in QA fixtures).
    const trip = amtrakStaticData.tripsById.get(rtId);
    return trip?.route_id === SURFLINER_ROUTE_ID ? rtId : null;
  };

  const realtimeIndex = indexTripUpdates(surflinerRealtime.entities ?? [], { resolveTripId });
  const isLiveConfirmed = makeLiveConfirmedFilter(surflinerRealtime.entities ?? [], realtimeIndex);

  const rows = buildBoardForStops({
    stopIds: [boardStopId],
    staticData: amtrakStaticData,
    realtimeIndex,
    timeZone: LOS_ANGELES_TIME_ZONE,
    ...(now ? { now } : {}),
  });

  const trips = [];
  for (const row of rows) {
    const trip = amtrakStaticData.tripsById.get(row.tripId);
    if (trip?.route_id !== SURFLINER_ROUTE_ID) continue;
    const terminal = terminals.get(row.tripId);
    if (!terminal || terminal.stopId === boardStopId) continue;
    const terminalStop = amtrakStaticData.stopsById.get(terminal.stopId);
    const chip = buildSurflineChip(terminal.stopId, terminalStop?.stop_name ?? "", boardStopId);
    if (!chip) continue;
    if (!isLiveConfirmed(row)) continue;
    trips.push({ ...row, destination: chip, agency: "Pacific Surfliner", mode: "rail" });
  }
  return trips;
}

/**
 * Metrolink chip label for a terminal stop. Maps the GTFS stop_name to the rider-facing label:
 * "L.A. Union Station" (GTFS stop_id 107) -> catalog name "Union Station".
 * All other stop_names are used verbatim (they match the pack's H4/H5 exact-stop-name rule).
 */
function metrolinkTerminalLabel(terminalStopName) {
  return terminalStopName === "L.A. Union Station" ? "Union Station" : terminalStopName;
}

/**
 * Build a Metrolink direction chip: "route_short_name + terminal_label".
 * Returns null when the trip terminates at the board station (stop_id match) or when
 * there is no route short name or terminal label. Never returns a bare line chip.
 * @param {string} routeShortName  e.g. "AV Line", "SB Line"
 * @param {string} terminalStopId  GTFS stop_id of the trip's final stop
 * @param {string} terminalStopName GTFS stop_name of the final stop
 * @param {string} boardStopId     Metrolink stop_id of the station being rendered
 */
export function buildMetrolinkChip(routeShortName, terminalStopId, terminalStopName, boardStopId) {
  if (!routeShortName || terminalStopId === boardStopId) return null;
  const label = metrolinkTerminalLabel(terminalStopName);
  if (!label) return null;
  return `${routeShortName} + ${label}`;
}

/**
 * Static direction chips for a Metrolink board station: every distinct "route_short_name +
 * terminal_label" among scheduled trips that call at boardStopId and do NOT terminate there.
 * These are the chips the rider sees in the Metrolink direction group.
 * Offline — used by the dogfood module and the QA gate.
 * @param {object} metrolinkStaticData  loadMetrolinkStatic() result
 * @param {string} boardStopId          Metrolink GTFS stop_id ("107" or "109")
 * @param {{ serviceIds?: Set<string>, stopTimeFilter?: (stopTime: object) => boolean }} [opts]
 *   Optional filters: `serviceIds` restricts to active services; `stopTimeFilter` is a
 *   time-gate applied to the stop-time row at boardStopId (used by the remaining-today variant).
 */
export function staticMetrolinkChipsForStop(metrolinkStaticData, boardStopId, { serviceIds, stopTimeFilter } = {}) {
  const terminals = terminalStopsByTrip(metrolinkStaticData);
  const chips = new Set();
  const seen = new Set();
  for (const stopTime of metrolinkStaticData.stopTimesByStopId.get(boardStopId) ?? []) {
    const { trip_id: tripId } = stopTime;
    if (seen.has(tripId)) continue;
    if (stopTimeFilter && !stopTimeFilter(stopTime)) continue;
    const trip = metrolinkStaticData.tripsById.get(tripId);
    if (serviceIds && !serviceIds.has(trip?.service_id)) continue;
    seen.add(tripId);
    const terminal = terminals.get(tripId);
    if (!terminal || terminal.stopId === boardStopId) continue;
    const route = trip ? metrolinkStaticData.routesById.get(trip.route_id) : null;
    const rsn = route?.route_short_name ?? "";
    const terminalName = metrolinkStaticData.stopsById.get(terminal.stopId)?.stop_name ?? "";
    const chip = buildMetrolinkChip(rsn, terminal.stopId, terminalName, boardStopId);
    if (chip) chips.add(chip);
  }
  return [...chips].sort();
}

/**
 * Metrolink chips at boardStopId that have at least one scheduled trip today (LA time).
 * Returns null when the service calendar gives no active services (unknown). Used to populate
 * board.scheduledDestinationsToday alongside the Metro Rail equivalent.
 */
export function scheduledMetrolinkDestinationsToday(metrolinkStaticData, boardStopId, { now = new Date() } = {}) {
  const serviceIds = activeServicesForDate(metrolinkStaticData, now, LOS_ANGELES_TIME_ZONE);
  if (!serviceIds || serviceIds.size === 0) return null;
  return staticMetrolinkChipsForStop(metrolinkStaticData, boardStopId, { serviceIds });
}

/**
 * Metrolink chips at boardStopId whose next scheduled departure is still ahead of `now`
 * (same 24:00+ and yesterday-service-day semantics as scheduledDestinationsRemainingToday).
 * Returns null when the calendar is unknown. Used to populate board.scheduledDestinationsRemaining
 * so the dogfood layer can emit "no-live-predictions" instead of "not-currently-served" for a
 * Metrolink chip that the timetable still expects today.
 */
export function scheduledMetrolinkDestinationsRemainingToday(metrolinkStaticData, boardStopId, { now = new Date() } = {}) {
  const clock = localClock(now);
  const todayServices = activeServicesForDate(metrolinkStaticData, now, LOS_ANGELES_TIME_ZONE);
  if (!todayServices || todayServices.size === 0) return null;
  const yesterdayNoon = new Date(Date.UTC(clock.year, clock.month - 1, clock.day - 1, 20, 0, 0));
  const yesterdayServices = activeServicesForDate(metrolinkStaticData, yesterdayNoon, LOS_ANGELES_TIME_ZONE) ?? new Set();
  const floor = clock.seconds - REMAINING_GRACE_SEC;
  const chips = new Set();
  const collect = (serviceIds, offsetSec) => {
    if (serviceIds.size === 0) return;
    for (const chip of staticMetrolinkChipsForStop(metrolinkStaticData, boardStopId, {
      serviceIds,
      stopTimeFilter: (stopTime) => {
        const sec = gtfsSeconds(stopTime.departure_time ?? stopTime.arrival_time);
        if (sec == null) return false;
        if (offsetSec !== 0 && sec < GTFS_SEC_PER_DAY) return false;
        return sec - offsetSec > floor;
      },
    })) {
      chips.add(chip);
    }
  };
  collect(todayServices, 0);
  collect(yesterdayServices, GTFS_SEC_PER_DAY);
  return [...chips].sort();
}

/**
 * Build live Metrolink board rows for a station. Returns [] when no rows survive the
 * live-confirmed filter (same posture as the Metro Rail path). Never throws — callers
 * catch failures before reaching here.
 * @param {string} boardStopId
 * @param {object} metrolinkStaticData
 * @param {{ entities: object[], fetchedAt: Date }} metrolinkRealtime
 * @param {Date} [now]
 */
function composeMetrolinkTripRows(boardStopId, metrolinkStaticData, metrolinkRealtime, now) {
  const terminals = terminalStopsByTrip(metrolinkStaticData);
  const realtimeIndex = indexTripUpdates(metrolinkRealtime.entities);
  const isLiveConfirmed = makeLiveConfirmedFilter(metrolinkRealtime.entities, realtimeIndex);

  const rows = buildBoardForStops({
    stopIds: [boardStopId],
    staticData: metrolinkStaticData,
    realtimeIndex,
    timeZone: LOS_ANGELES_TIME_ZONE,
    ...(now ? { now } : {}),
  });

  const trips = [];
  for (const row of rows) {
    const terminal = terminals.get(row.tripId);
    if (!terminal || terminal.stopId === boardStopId) continue;
    const trip = metrolinkStaticData.tripsById.get(row.tripId);
    const route = trip ? metrolinkStaticData.routesById.get(trip.route_id) : null;
    const rsn = route?.route_short_name ?? "";
    const terminalName = metrolinkStaticData.stopsById.get(terminal.stopId)?.stop_name ?? "";
    const chip = buildMetrolinkChip(rsn, terminal.stopId, terminalName, boardStopId);
    if (!chip) continue;
    if (!isLiveConfirmed(row)) continue;
    trips.push({ ...row, destination: chip, agency: "Metrolink", mode: "rail" });
  }
  return trips;
}

function normaliseStopName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+station$/, "")
    .replace(/\b[a-ek]-line\b/g, "") // "Expo / Crenshaw E-Line Station" -> shared E x K station name
    .replace(/\bst\b/g, "street")
    .replace(/\bctr\b/g, "center")
    .replace(/\b(av|ave)\b/g, "avenue")
    .replace(/^universal city\b/, "universal")
    .replace(/^lincoln\/cypress\b/, "lincoln heights/cypress park")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve a catalog name to LA Metro stop_ids. Matching is EXACT on the normalised name (never
 * substring, never prefix) and only over platform/station stops (location_type 0/1) - never
 * entrance nodes (location_type 2, e.g. "Washington Station - Long Beach & Washington Entrance",
 * "Arcadia Station - 1st Street Ramp - North Entrance"), which is what used to merge
 * Pico/Pico-Aliso, Crenshaw/Expo-Crenshaw, Washington/San Pedro, Lake/Westlake and 1st St/Arcadia.
 * Each match contributes its parent station and that parent's non-entrance children.
 * Returns [] when nothing matches exactly.
 */
export function resolveStopIdsByExactName(staticData, name, { prefix = false } = {}) {
  const wanted = normaliseStopName(name);
  if (!wanted) return [];
  const isEntrance = (stop) => String(stop.location_type || "") === "2";
  const matches = (stop) => {
    const n = normaliseStopName(stop.stop_name);
    return prefix ? n.startsWith(wanted) : n === wanted;
  };
  const candidates = staticData.stops.filter((stop) => !isEntrance(stop) && matches(stop));
  if (prefix) {
    // Guarded fallback: only when it names exactly one parent station ("Expo/La Brea" ->
    // "Expo / La Brea / Ethel Bradley Station"); ambiguous prefixes resolve to nothing.
    const parents = new Set(candidates.map((stop) => stop.parent_station || stop.stop_id));
    if (parents.size !== 1) return [];
  }
  const stopIds = new Set();
  for (const stop of candidates) {
    const parentId = stop.parent_station || stop.stop_id;
    stopIds.add(stop.stop_id);
    stopIds.add(parentId);
    for (const child of staticData.stops) {
      if (child.parent_station === parentId && !isEntrance(child)) stopIds.add(child.stop_id);
    }
  }
  return [...stopIds];
}

export async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (catalogEntry?.stopIds?.length) {
    return catalogEntry.stopIds;
  }

  // Catalog names use the printed-map abbreviations ("7th St/Metro Ctr", "Pico/Aliso") while
  // gtfs_rail names are spelled out with spaced slashes ("7th Street / Metro Center Station").
  // Exact normalised match on the name and its aliases only; the shared substring matcher is
  // deliberately NOT used (it merges doNotGroup pairs via entrance names).
  const names = [catalogEntry?.name ?? stationIdOrName, ...(catalogEntry?.aliases ?? [])];
  const stopIds = new Set();
  for (const name of names) {
    for (const id of resolveStopIdsByExactName(staticData, name)) {
      stopIds.add(id);
    }
  }
  if (stopIds.size > 0) {
    return [...stopIds];
  }

  // Guarded fallback, only when no exact match exists for any name: a unique-parent prefix match
  // ("Heritage Sq" -> "Heritage Square / Arroyo Station"). Never reached for Pico, Crenshaw, etc.
  for (const name of names) {
    for (const id of resolveStopIdsByExactName(staticData, name, { prefix: true })) {
      stopIds.add(id);
    }
  }
  if (stopIds.size > 0) {
    return [...stopIds];
  }

  if (staticData.stopsById.has(stationIdOrName)) {
    return [stationIdOrName];
  }

  throw new Error(`Unknown Los Angeles Metro Rail station: ${stationIdOrName}`);
}

/**
 * gtfs_rail.zip ships EMPTY route_short_name and trip_headsign (verified against the live feed,
 * 24 Oct 2026): routes carry only route_long_name "Metro A Line" etc. Resolve the line from the
 * short name if a feed ever populates it, else from the long name.
 */
export function lineIdForRoute(routeShortName, routeLongName) {
  const short = LA_METRO_ROUTE_SHORT_NAME_TO_LINE[String(routeShortName || "").trim().toLowerCase()];
  if (short) {
    return short;
  }
  const match = /\b([a-e]|k)\s+line\b/i.exec(String(routeLongName || ""));
  return match ? (LA_METRO_ROUTE_SHORT_NAME_TO_LINE[match[1].toLowerCase()] ?? null) : null;
}

const terminalStopCache = new WeakMap();

/** trip_id -> { stopId, name } of the trip's last stop (its terminus); the static feed has no trip_headsign. */
export function terminalStopsByTrip(staticData) {
  let cached = terminalStopCache.get(staticData);
  if (cached) {
    return cached;
  }
  const lastByTrip = new Map();
  for (const list of staticData.stopTimesByStopId.values()) {
    for (const stopTime of list) {
      const seq = Number(stopTime.stop_sequence);
      const prev = lastByTrip.get(stopTime.trip_id);
      if (!prev || seq > prev.seq) {
        lastByTrip.set(stopTime.trip_id, { seq, stopId: stopTime.stop_id });
      }
    }
  }
  cached = new Map();
  for (const [tripId, { stopId }] of lastByTrip) {
    cached.set(tripId, { stopId, name: staticData.stopsById.get(stopId)?.stop_name ?? "" });
  }
  terminalStopCache.set(staticData, cached);
  return cached;
}

/** trip_id -> name of the trip's last stop (kept for callers that only want the name). */
export function terminalStopNamesByTrip(staticData) {
  return new Map([...terminalStopsByTrip(staticData)].map(([tripId, { name }]) => [tripId, name]));
}

/** True when the trip's last stop is (or is a child of) one of the given station stop_ids. */
export function tripTerminatesAtStops(tripId, stopIdSet, staticData, terminals = terminalStopsByTrip(staticData)) {
  const terminal = terminals.get(tripId);
  if (!terminal) return false;
  if (stopIdSet.has(terminal.stopId)) return true;
  const parent = staticData.stopsById.get(terminal.stopId)?.parent_station;
  return Boolean(parent) && stopIdSet.has(parent);
}

/**
 * "<Line> + <terminus>" for a trip, or null when the terminus can't be resolved. stop_times'
 * stop_headsign ("Metro A Line - Downtown Long Beach Station") is tried first, then the trip's own
 * last stop. Never returns the bare line label.
 */
export function destinationForTrip({ lineId, stopHeadsign = "", terminalName = "" }) {
  const candidates = [String(stopHeadsign || "").replace(/^Metro\s+[A-Z]\s+Line\s*-\s*/i, ""), terminalName];
  for (const candidate of candidates) {
    const chip = mapLineTerminusDestination(candidate, lineId);
    if (chip) return chip;
  }
  return null;
}

/**
 * Static-derived direction chips for a station: every distinct "<Line> + <terminus>" among
 * scheduled trips that call at the station's stop_ids and do NOT end there. `unresolved` counts
 * trips whose terminus resolved to nothing (the board drops them). Offline - used by the QA gate.
 */
export function staticDirectionsForStopIds(
  staticData,
  stopIds,
  { serviceIds = null, stopTimeFilter = null } = {}
) {
  const stopIdSet = new Set(stopIds);
  const terminals = terminalStopsByTrip(staticData);
  const chips = new Set();
  let unresolved = 0;
  const seenTrips = new Set();
  for (const stopId of stopIdSet) {
    for (const stopTime of staticData.stopTimesByStopId.get(stopId) ?? []) {
      const tripId = stopTime.trip_id;
      if (seenTrips.has(tripId)) continue;
      // The time filter runs before the per-trip dedupe: a trip calling at two of the station's
      // stop_ids is judged on each call, and counts if either passes.
      if (stopTimeFilter && !stopTimeFilter(stopTime, staticData.tripsById.get(tripId))) continue;
      seenTrips.add(tripId);
      if (tripTerminatesAtStops(tripId, stopIdSet, staticData, terminals)) continue;
      const trip = staticData.tripsById.get(tripId);
      if (serviceIds && !serviceIds.has(trip?.service_id)) continue;
      const route = trip ? staticData.routesById.get(trip.route_id) : null;
      const lineId = route ? lineIdForRoute(route.route_short_name, route.route_long_name) : null;
      const chip = lineId
        ? destinationForTrip({
            lineId,
            stopHeadsign: stopTime.stop_headsign,
            terminalName: terminals.get(tripId)?.name ?? "",
          })
        : null;
      if (chip) chips.add(chip);
      else unresolved += 1;
    }
  }
  return { chips: [...chips].sort(), unresolved };
}

/**
 * Chips with at least one scheduled departure from this station on today's service calendar
 * (LA time), or null when the calendar gives no active services (unknown, not "none"). The dogfood
 * layer uses it to tell a direction that does not run today ("not-currently-served", e.g. D +
 * Wilshire/La Cienega until 1 Nov) from one that runs but has no live rows ("no-live-predictions").
 */
export function scheduledDestinationsToday(staticData, stopIds, { now = new Date() } = {}) {
  const serviceIds = activeServicesForDate(staticData, now, LOS_ANGELES_TIME_ZONE);
  if (!serviceIds || serviceIds.size === 0) return null;
  return staticDirectionsForStopIds(staticData, stopIds, { serviceIds }).chips;
}

const GTFS_SEC_PER_DAY = 86400;
const REMAINING_GRACE_SEC = 60; // same grace as hasScheduledServiceToday

function gtfsSeconds(time) {
  const m = /^\s*(\d+):(\d{2})(?::(\d{2}))?/.exec(String(time ?? ""));
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0) : null;
}

function localClock(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LOS_ANGELES_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    seconds: pick("hour") * 3600 + pick("minute") * 60 + pick("second"),
  };
}

/**
 * Time-aware sibling of scheduledDestinationsToday (docs/jim-brief-la-chip-polish.md): chips with a
 * scheduled departure from this station that is still ahead of `now` within the service day -
 * today's remaining departures (24:00+ ones included) plus the previous service day's 24:00+ trips
 * that are still running after midnight (same semantics as the shared builder, #526). Terminating
 * trips are excluded. Returns null when the calendar gives no active services (unknown), so callers
 * fall back to the whole-day check. Compares LA wall-clock seconds, so on the two DST-change nights
 * the 01:00-03:00 window can be an hour out.
 */
export function scheduledDestinationsRemainingToday(staticData, stopIds, { now = new Date() } = {}) {
  const clock = localClock(now);
  const todayServices = activeServicesForDate(staticData, now, LOS_ANGELES_TIME_ZONE);
  if (!todayServices || todayServices.size === 0) return null;
  const yesterdayNoon = new Date(Date.UTC(clock.year, clock.month - 1, clock.day - 1, 20, 0, 0));
  const yesterdayServices = activeServicesForDate(staticData, yesterdayNoon, LOS_ANGELES_TIME_ZONE) ?? new Set();
  const floor = clock.seconds - REMAINING_GRACE_SEC;
  const chips = new Set();
  const collect = (serviceIds, offsetSec) => {
    if (serviceIds.size === 0) return;
    const { chips: found } = staticDirectionsForStopIds(staticData, stopIds, {
      serviceIds,
      stopTimeFilter: (stopTime) => {
        const sec = gtfsSeconds(stopTime.departure_time ?? stopTime.arrival_time);
        if (sec == null) return false;
        if (offsetSec !== 0 && sec < GTFS_SEC_PER_DAY) return false; // yesterday's 24:00+ rows only
        return sec - offsetSec > floor;
      },
    });
    for (const chip of found) chips.add(chip);
  };
  collect(todayServices, 0);
  collect(yesterdayServices, GTFS_SEC_PER_DAY);
  return [...chips].sort();
}

const SKIPPED_OR_NO_DATA = new Set([1, 2, "SKIPPED", "NO_DATA"]);

/**
 * Row-level live gate (no timetable fallback). A board row reaches a rider only if Swiftly gave a
 * real prediction for it: the StopTimeUpdate has a non-null departure time or delay, or (no
 * stop-level prediction either way) the trip carries a trip-level delay - and the StopTimeUpdate
 * is not SKIPPED / NO_DATA. indexTripUpdates() records an entry for EVERY StopTimeUpdate, even
 * ones with no times at all (SKIPPED, NO_DATA, arrival-only), and board.js would then show the
 * scheduled time as if live - so presence in stopUpdates alone is not confirmation.
 */
export function makeLiveConfirmedFilter(entities, realtimeIndex) {
  const skipped = new Set();
  for (const entity of entities ?? []) {
    const update = entity.tripUpdate;
    const tripId = update?.trip?.tripId;
    if (!tripId) continue;
    for (const stu of update.stopTimeUpdate ?? []) {
      if (stu.stopId && SKIPPED_OR_NO_DATA.has(stu.scheduleRelationship)) {
        skipped.add(`${tripId}:${stu.stopId}`);
      }
    }
  }
  return (trip) => {
    const key = `${trip.tripId}:${trip.stopId}`;
    if (skipped.has(key)) return false;
    const stop = realtimeIndex.stopUpdates.get(key);
    if (stop && (stop.departureSec != null || stop.delaySec != null)) return true;
    return realtimeIndex.tripDelaySec.has(trip.tripId);
  };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  // Fail fast on a missing key before doing any network work — no live times, no board.
  const headers = authHeaders();

  // Resolve the catalog entry to determine whether this station has Metrolink / Surfliner service.
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const metrolinkStopId = METROLINK_CATALOG_TO_STOP_ID[catalogEntry?.name ?? ""] ?? null;
  const surflinerIsHere = (catalogEntry?.name ?? "") === SURFLINER_CATALOG_STATION;

  // Fetch LA Metro (required — missing SWIFTLY_API_KEY already threw above) and Metrolink
  // (optional — a missing key or fetch failure degrades only the Metrolink group, not Metro).
  const [staticData, realtime] = await Promise.all([
    loadLosAngelesStatic(),
    fetchTripUpdates(SWIFTLY_TRIP_UPDATES_URL, { headers }),
  ]);

  let metrolinkStaticData = null;
  let metrolinkRealtime = null;
  let metrolinkPartial = false;

  if (metrolinkStopId) {
    // Always load the Metrolink static GTFS (unkeyed) so the board can report honest empty
    // reasons for Metrolink chips even when the live feed or API key is unavailable.
    const mlHeaders = metrolinkAuthHeaders(readMetrolinkApiKey());
    const livePromise = mlHeaders
      ? fetchTripUpdates(METROLINK_TRIP_UPDATES_URL, { headers: mlHeaders })
      : null;

    const [staticResult, liveResult] = await Promise.allSettled([
      loadMetrolinkStatic(),
      livePromise ?? Promise.resolve(null),
    ]);

    if (staticResult.status === "fulfilled") {
      metrolinkStaticData = staticResult.value;
    } else {
      console.warn(
        `Metrolink static GTFS load failed for "${stationIdOrName}": ${staticResult.reason?.message ?? staticResult.reason}`
      );
    }

    if (!mlHeaders) {
      metrolinkPartial = true;
      console.warn(
        `METROLINK_API_KEY is not set — Metrolink live times are unavailable. ` +
          `Sign up at https://metrolinktrains.com/about/gtfs/gtfs-rt-access/ and set METROLINK_API_KEY.`
      );
    } else if (liveResult.status === "fulfilled" && liveResult.value !== null) {
      metrolinkRealtime = liveResult.value;
    } else {
      metrolinkPartial = true;
      console.warn(
        `Metrolink fetch failed for "${stationIdOrName}": ${liveResult.reason?.message ?? liveResult.reason}`
      );
    }
  }

  // Pacific Surfliner (Amtrak route 78 via transitdocs) — Union Station only.
  // A failed Surfliner fetch must not drop Metro or Metrolink rows (surflinerPartial flag).
  let surflinerStaticData = null;
  let surflinerRealtime = null;
  let surflinerPartial = false;

  if (surflinerIsHere) {
    const [sfStaticResult, sfLiveResult] = await Promise.allSettled([
      loadAmtrakSurflineStatic(),
      fetchTripUpdates(TRANSITDOCS_TRIP_UPDATES_URL),
    ]);

    if (sfStaticResult.status === "fulfilled") {
      surflinerStaticData = sfStaticResult.value;
    } else {
      console.warn(
        `Pacific Surfliner static GTFS load failed for "${stationIdOrName}": ${sfStaticResult.reason?.message ?? sfStaticResult.reason}`
      );
    }

    if (sfLiveResult.status === "fulfilled") {
      surflinerRealtime = sfLiveResult.value;
    } else {
      surflinerPartial = true;
      console.warn(
        `Pacific Surfliner live feed (transitdocs) failed for "${stationIdOrName}": ${sfLiveResult.reason?.message ?? sfLiveResult.reason}`
      );
    }
  }

  return composeStationBoard(stationIdOrName, staticData, realtime, {
    metrolinkStaticData,
    metrolinkRealtime,
    metrolinkPartial,
    metrolinkStopId,
    surflinerStaticData,
    surflinerRealtime,
    surflinerPartial,
  });
}

/**
 * Network-free half of fetchStationBoard (static snapshot + already-fetched Swiftly trip updates
 * in, board out) - exported so the QA gate can drive the exact board path with synthetic fixtures.
 *
 * Metrolink options (all optional, Brussels shape):
 *   metrolinkStaticData  — Metrolink static GTFS (loadMetrolinkStatic() result)
 *   metrolinkRealtime    — Metrolink GTFS-RT TripUpdates (fetchTripUpdates() result)
 *   metrolinkPartial     — true when the Metrolink feed or key was unavailable; Metrolink rows are
 *                          absent but Metro rows are unaffected (Metro board always renders)
 *   metrolinkStopId      — Metrolink GTFS stop_id for this station, or null if not a Metrolink stop
 *
 * Pacific Surfliner options (all optional, same Brussels shape):
 *   surflinerStaticData  — Amtrak static GTFS (loadAmtrakSurflineStatic() result)
 *   surflinerRealtime    — transitdocs GTFS-RT TripUpdates (fetchTripUpdates() result)
 *   surflinerPartial     — true when the transitdocs feed failed; Surfliner rows absent but Metro
 *                          and Metrolink rows are unaffected
 *
 * @param {{ entities: object[], fetchedAt: Date }} realtime
 */
export async function composeStationBoard(
  stationIdOrName,
  staticData,
  realtime,
  {
    now,
    hasScheduledService = hasScheduledServiceToday,
    metrolinkStaticData = null,
    metrolinkRealtime = null,
    metrolinkPartial = false,
    metrolinkStopId = null,
    surflinerStaticData = null,
    surflinerRealtime = null,
    surflinerPartial = false,
  } = {}
) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  // Resolve Metrolink stop_id from the catalog entry if not supplied (e.g. from composeStationBoard
  // called directly in the gate without metrolinkStopId).
  const resolvedMetrolinkStopId =
    metrolinkStopId ?? METROLINK_CATALOG_TO_STOP_ID[catalogEntry?.name ?? ""] ?? null;

  const realtimeIndex = indexTripUpdates(realtime.entities);
  const isLiveConfirmed = makeLiveConfirmedFilter(realtime.entities, realtimeIndex);

  const stopIdSet = new Set(stopIds);
  const terminals = terminalStopsByTrip(staticData);
  // Every near-term row at this station that can be labelled with a line + terminus and is a
  // departure, live-confirmed or not. Kept ONLY so the dogfood layer can tell "no live predictions
  // for a direction the schedule expects" from "this direction is not run from here"
  // (docs/jim-brief-la-flip-follow-through.md). Never shown to a rider as a row.
  const scheduledCandidates = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: LOS_ANGELES_TIME_ZONE,
    ...(now ? { now } : {}),
  })
    // Terminating-here rule: a trip whose last stop is one of this station's own stop_ids is an
    // arrival, not a departure - it never appears on this board.
    .filter((trip) => !tripTerminatesAtStops(trip.tripId, stopIdSet, staticData, terminals))
    .map((trip) => {
      const lineId = lineIdForRoute(trip.routeShortName, trip.routeLongName);
      const destination = lineId
        ? destinationForTrip({
            lineId,
            stopHeadsign: trip.stopHeadsign,
            terminalName: terminals.get(trip.tripId)?.name ?? "",
          })
        : null;
      return destination ? { ...trip, destination } : null;
    })
    // A trip whose terminus can't be resolved is dropped - never labelled with the bare line.
    .filter(Boolean);
  // No timetable fallback (Tim's rule): buildBoardForStops also emits scheduled-only rows for
  // trips Swiftly has no prediction for, so only trips with a live update become board rows.
  const metroTrips = scheduledCandidates.filter(isLiveConfirmed);

  // Metrolink second source (Brussels shape): separate direction group, same board.
  // A missing key or fetch failure (metrolinkPartial) leaves Metro rows unaffected.
  let metrolinkTrips = [];
  if (resolvedMetrolinkStopId && metrolinkStaticData && metrolinkRealtime && !metrolinkPartial) {
    try {
      metrolinkTrips = composeMetrolinkTripRows(
        resolvedMetrolinkStopId,
        metrolinkStaticData,
        metrolinkRealtime,
        now
      );
    } catch {
      // Unexpected error in Metrolink row composition — Metro board is unaffected.
    }
  }

  // Pacific Surfliner third source (Brussels shape): separate direction group, same board.
  // Only at Union Station (SURFLINER_CATALOG_STATION). surflinerPartial leaves Metro + Metrolink
  // rows unaffected; the static GTFS is still used for honest empty-reason even when partial.
  const surflinerIsHere = (catalogEntry?.name ?? "") === SURFLINER_CATALOG_STATION;
  let surflinerTrips = [];
  if (surflinerIsHere && surflinerStaticData && surflinerRealtime && !surflinerPartial) {
    try {
      surflinerTrips = composeSurflineTripRows(
        SURFLINER_STOP_ID,
        surflinerStaticData,
        surflinerRealtime,
        now
      );
    } catch {
      // Unexpected error in Surfliner row composition — Metro + Metrolink boards unaffected.
    }
  }

  // Merge and sort by departure time; rows distinguished by `agency`.
  const trips = [...metroTrips, ...metrolinkTrips, ...surflinerTrips].sort(
    (a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture)
  );

  // Honest empty state (docs/jim-brief-la-honest-empty-state.md; Prague/Dublin pattern). Additive
  // only: never changes `trips`. Detection comes from the static feed, nothing hardcoded - e.g. the
  // D Line stations west of Wilshire/Western have no scheduled trip in the current timetable and
  // pick service up again automatically when the next feed's services start.
  const board = {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
    scheduledCandidates,
    realtime: true,
    // `true` only when this station has Metrolink service AND that feed/key was unavailable.
    // A non-Metrolink station is never metrolinkPartial.
    ...(resolvedMetrolinkStopId && metrolinkPartial ? { metrolinkPartial: true } : {}),
  };
  try {
    // Additive: chips that run from here today at all (see scheduledDestinationsToday).
    const today = scheduledDestinationsToday(staticData, stopIds, { now: now ?? new Date() });
    if (today) board.scheduledDestinationsToday = today;
    // Time-aware: chips with a departure still to come from here (see scheduledDestinationsRemainingToday).
    const remaining = scheduledDestinationsRemainingToday(staticData, stopIds, { now: now ?? new Date() });
    if (remaining) board.scheduledDestinationsRemaining = remaining;
  } catch {
    // Unknown: leave the field off; the dogfood layer then falls back to scheduledCandidates only.
  }
  // Metrolink scheduled destinations: merge into the same fields so the dogfood layer can
  // distinguish "no-live-predictions" from "not-currently-served" for Metrolink chips.
  // Runs even when metrolinkPartial is true — the static GTFS is unkeyed and always loaded.
  if (resolvedMetrolinkStopId && metrolinkStaticData) {
    try {
      const mlToday = scheduledMetrolinkDestinationsToday(metrolinkStaticData, resolvedMetrolinkStopId, { now: now ?? new Date() });
      if (mlToday) {
        board.scheduledDestinationsToday = [...new Set([...(board.scheduledDestinationsToday ?? []), ...mlToday])].sort();
      }
      const mlRemaining = scheduledMetrolinkDestinationsRemainingToday(metrolinkStaticData, resolvedMetrolinkStopId, { now: now ?? new Date() });
      if (mlRemaining) {
        board.scheduledDestinationsRemaining = [...new Set([...(board.scheduledDestinationsRemaining ?? []), ...mlRemaining])].sort();
      }
    } catch {
      // Leave off; dogfood layer falls back to scheduledCandidates.
    }
  }
  // Pacific Surfliner scheduled destinations: merged into the same fields.
  // Runs even when surflinerPartial is true — the static GTFS is unkeyed and always loaded.
  if (surflinerIsHere && surflinerStaticData) {
    try {
      const sfToday = scheduledSurflineDestinationsToday(surflinerStaticData, SURFLINER_STOP_ID, { now: now ?? new Date() });
      if (sfToday) {
        board.scheduledDestinationsToday = [...new Set([...(board.scheduledDestinationsToday ?? []), ...sfToday])].sort();
      }
      const sfRemaining = scheduledSurflineDestinationsRemainingToday(surflinerStaticData, SURFLINER_STOP_ID, { now: now ?? new Date() });
      if (sfRemaining) {
        board.scheduledDestinationsRemaining = [...new Set([...(board.scheduledDestinationsRemaining ?? []), ...sfRemaining])].sort();
      }
    } catch {
      // Leave off; dogfood layer falls back to scheduledCandidates.
    }
  }
  if (metroTrips.length === 0) {
    try {
      const served = hasScheduledService({
        stopIds,
        staticData,
        timeZone: LOS_ANGELES_TIME_ZONE,
        now: now ?? new Date(),
      });
      board.emptyReason = served ? "no-live-predictions" : "not-currently-served";
    } catch {
      // Unknown, not empty: omit emptyReason rather than turn a board into an error.
    }
  }
  return board;
}
