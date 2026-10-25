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
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops, hasScheduledServiceToday } from "./gtfs/board.js";
import { swiftlyAuthHeaders, readSwiftlyApiKey, MissingSwiftlyApiKeyError } from "./gtfs/auth.js";
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

async function loadLosAngelesStatic() {
  return loadGtfsStatic({
    url: LA_METRO_GTFS_STATIC_URL,
    routeTypes: ["0", "1"], // Metro Rail is light rail (0) + subway (1); railOnly would keep only type 2 = empty
    timeZone: LOS_ANGELES_TIME_ZONE,
  });
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
export function staticDirectionsForStopIds(staticData, stopIds) {
  const stopIdSet = new Set(stopIds);
  const terminals = terminalStopsByTrip(staticData);
  const chips = new Set();
  let unresolved = 0;
  const seenTrips = new Set();
  for (const stopId of stopIdSet) {
    for (const stopTime of staticData.stopTimesByStopId.get(stopId) ?? []) {
      const tripId = stopTime.trip_id;
      if (seenTrips.has(tripId)) continue;
      seenTrips.add(tripId);
      if (tripTerminatesAtStops(tripId, stopIdSet, staticData, terminals)) continue;
      const trip = staticData.tripsById.get(tripId);
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

  const staticData = await loadLosAngelesStatic();
  const realtime = await fetchTripUpdates(SWIFTLY_TRIP_UPDATES_URL, { headers });
  return composeStationBoard(stationIdOrName, staticData, realtime);
}

/**
 * Network-free half of fetchStationBoard (static snapshot + already-fetched Swiftly trip updates
 * in, board out) - exported so qa/los-angeles-planned-gate.mjs can drive the exact board path
 * with synthetic fixtures.
 * @param {{ entities: object[], fetchedAt: Date }} realtime
 */
export async function composeStationBoard(
  stationIdOrName,
  staticData,
  realtime,
  { now, hasScheduledService = hasScheduledServiceToday } = {}
) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtimeIndex = indexTripUpdates(realtime.entities);
  const isLiveConfirmed = makeLiveConfirmedFilter(realtime.entities, realtimeIndex);

  const stopIdSet = new Set(stopIds);
  const terminals = terminalStopsByTrip(staticData);
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: LOS_ANGELES_TIME_ZONE,
    ...(now ? { now } : {}),
  })
    // No timetable fallback (Tim's rule): buildBoardForStops also emits scheduled-only rows for
    // trips Swiftly has no prediction for, so keep only trips with a live update.
    .filter(isLiveConfirmed)
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

  // Honest empty state (docs/jim-brief-la-honest-empty-state.md; Prague/Dublin pattern). Additive
  // only: never changes `trips`. Detection comes from the static feed, nothing hardcoded - e.g. the
  // D Line stations west of Wilshire/Western have no scheduled trip in the current timetable and
  // pick service up again automatically when the next feed's services start.
  const board = {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
    realtime: true,
  };
  if (trips.length === 0) {
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
