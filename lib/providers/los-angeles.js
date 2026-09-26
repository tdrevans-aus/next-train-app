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
 *     `Authorization: Bearer <SWIFTLY_API_KEY>` — the ONLY source of live departure times.
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
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexTripUpdates } from "./gtfs/realtime.js";
import { buildBoardForStops } from "./gtfs/board.js";
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
 * UNVERIFIED against a live payload (no SWIFTLY_API_KEY this session) — confirm once one is
 * set; falls back to a bare line label (never a hub string) when a route doesn't match. */
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
    railOnly: true,
    timeZone: LOS_ANGELES_TIME_ZONE,
  });
}

async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (catalogEntry?.stopIds?.length) {
    return catalogEntry.stopIds;
  }

  const names = [catalogEntry?.name ?? stationIdOrName, ...(catalogEntry?.aliases ?? [])];
  const stopIds = new Set();
  for (const name of names) {
    for (const id of findRailStopIdsForName(staticData, name)) {
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

function lineIdForRoute(routeShortName) {
  return LA_METRO_ROUTE_SHORT_NAME_TO_LINE[String(routeShortName || "").trim().toLowerCase()] ?? null;
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  // Fail fast on a missing key before doing any network work — no live times, no board.
  const headers = authHeaders();

  const staticData = await loadLosAngelesStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await fetchTripUpdates(SWIFTLY_TRIP_UPDATES_URL, { headers });
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: LOS_ANGELES_TIME_ZONE,
  }).map((trip) => {
    const lineId = lineIdForRoute(trip.routeShortName);
    return {
      ...trip,
      destination: lineId
        ? mapLineTerminusDestination(trip.destination, lineId)
        : trip.destination,
    };
  });

  return {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
  };
}
