/**
 * Göteborg (Västtrafik) tram + city-map pendeltåg.
 *
 * Primary board: Västtrafik Planera Resa v4 (lib/providers/vasttrafik.js) —
 * per-stop-area departures with live estimated times, OAuth2 client-
 * credentials (VASTTRAFIK_CLIENT_ID / VASTTRAFIK_CLIENT_SECRET). Trafiklab
 * GTFS Regional `vt` static (TRAFIKLAB_API_KEY) supplies the catalog/stop-id
 * mapping and is the schedule-only fallback board when Västtrafik departures
 * are unavailable for a stop (feed error, or a disruption that drops rows
 * instead of marking them cancelled — docs/goteborg-d1/jim-handoff.md #4)
 * or come back empty. Missing Västtrafik credentials are a hard error
 * (MissingVasttrafikCredentialsError), never a silent timetable board —
 * see docs/jim-brief-goteborg-vasttrafik-live.md.
 *
 * Static (TRAFIKLAB_API_KEY): https://opendata.samtrafiken.se/gtfs/vt/vt.zip?key=…
 * Trafiklab still publishes no TripUpdates for `vt` (availability table blank
 * as of 2026-09-06) — the standard RT URL is still attempted for the
 * fallback board so nothing needs to change here if that appears later.
 *
 * Modes v1: tram 1–12 + Kungsbacka / Alingsås / Ale. No stombuss / båt / X-bus / metro.
 */

import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  loadGtfsStatic,
  loadGtfsStaticFromDirectory,
  findRailStopIdsForName,
} from "./gtfs/static-cache.js";
import { fetchGtfsRealtimeBoard } from "./gtfs/realtime-board.js";
import {
  requireTrafiklabApiKey,
  trafiklabGtfsStaticUrl,
  trafiklabGtfsRtTripUpdatesUrl,
} from "./gtfs/auth.js";
import {
  fetchStopAreaDepartures,
  isVasttrafikStopAreaGid,
  readVasttrafikCredentials,
  MissingVasttrafikCredentialsError,
} from "./vasttrafik.js";
import {
  ALLOWED_LINE_CODES,
  foldKey,
  isForbiddenCollapseName,
  loadLineMap,
  mapGoteborgDestination,
  PENDELTÅG_HUB,
  TRAM_HUB,
} from "../cities/goteborg/marketing-directions.js";

export { MissingVasttrafikCredentialsError };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export const GOTEBORG_TIME_ZONE = "Europe/Stockholm";
export const GOTEBORG_OPERATOR = "vt";
/** Extended GTFS types: tram + rail / suburban rail. */
export const GOTEBORG_ROUTE_TYPES = ["0", "2", "100", "106", "109", "400", "401", "900"];
export const GOTEBORG_TRAM_SHORT_NAMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const GOTEBORG_TRAIN_CORRIDORS = ["Kungsbacka", "Alingsås", "Ale"];

const ALLOWED = new Set(ALLOWED_LINE_CODES.map((code) => String(code).trim().toUpperCase()));
const FIXTURE_DIR = join(ROOT, "qa/fixtures/goteborg/gtfs");
const catalogPath = join(__dirname, "../cities/goteborg/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

/**
 * foldKey(station name) -> corridor, built from line-map.json's three
 * `vasttagen-*` line entries' `stations` lists. Only stations unique to one
 * corridor are included — shared-trunk hubs (Göteborg Central, Gamlestaden
 * Station) sit on more than one corridor and are deliberately left out, so
 * corridor identification there still falls back to the destination-text
 * match in `goteborgLineCode` (which works at those hubs because an outbound
 * departure's direction there does name the corridor, e.g. "Kungsbacka").
 * Needed because, verified live 6 Sep 2026, neither GTFS route_long_name nor
 * Västtrafik Planera Resa v4's `serviceJourney.direction` names the corridor
 * at every other (non-hub) corridor station — see goteborgLineCode's doc
 * comment and docs/goteborg-d1/jim-handoff.md unknown #3 update.
 */
function buildStationCorridorMap() {
  const map = new Map();
  const ambiguous = new Set();
  for (const line of loadLineMap().lines ?? []) {
    if (!GOTEBORG_TRAIN_CORRIDORS.includes(line.number)) {
      continue;
    }
    for (const stationName of line.stations ?? []) {
      const key = foldKey(stationName);
      if (map.has(key) && map.get(key) !== line.number) {
        ambiguous.add(key);
        continue;
      }
      map.set(key, line.number);
    }
  }
  for (const key of ambiguous) {
    map.delete(key);
  }
  return map;
}

let stationCorridorMap = null;
function getStationCorridorMap() {
  if (!stationCorridorMap) {
    stationCorridorMap = buildStationCorridorMap();
  }
  return stationCorridorMap;
}

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

/**
 * Map GTFS route_short_name / long_name → v1 line code.
 *
 * Corridor detection (Kungsbacka/Alingsås/Ale) first tries matching the
 * corridor's own name against destination/route-long-name text — this only
 * works one-way: verified live 6 Sep 2026, neither GTFS (route_long_name is
 * generically "Västtågen" when trip_headsign is empty) nor Västtrafik
 * Planera Resa v4 (`serviceJourney.direction` is the train's actual
 * terminus, e.g. "Göteborg" or an intermediate stop like "Floda" when
 * departing toward town — not the corridor name) names the corridor except
 * on an outbound-from-Göteborg departure. `trip.queryStation` (the catalog
 * station the board was requested for) is checked next against
 * `getStationCorridorMap()` (built from line-map.json's per-corridor station
 * lists) so an inbound-to-Göteborg departure at any in-scope corridor
 * station — terminus or intermediate (Lerum, Nödinge, etc.) — still
 * resolves correctly. This does not distinguish an in-scope corridor train
 * from a through-running Västtågen service toward a station outside v1
 * scope (e.g. Halmstad/Vänersborg beyond Älvängen) sharing the same
 * physical track — see docs/goteborg-d1/jim-handoff.md unknown #3 update,
 * flagged for Luke/Mark.
 * @param {object} trip board trip row
 */
export function goteborgLineCode(trip) {
  const shortName = String(trip.routeShortName || "").trim();
  const upper = shortName.toUpperCase();
  if (ALLOWED.has(upper) || ALLOWED.has(shortName)) {
    return shortName;
  }
  if (GOTEBORG_TRAM_SHORT_NAMES.includes(shortName)) {
    return shortName;
  }
  // Corridor fallbacks below only apply to train-mode journeys. The GTFS
  // timetable path never sees this function called for a bus row (its
  // static load is already filtered to GOTEBORG_ROUTE_TYPES — tram + rail
  // only), so `trip.transportMode` is undefined there and the check passes.
  // The Västtrafik live path returns every mode unfiltered per stop area, so
  // `mapVasttrafikDeparture` sets `transportMode` explicitly — without this
  // gate, a bus at a corridor station (e.g. bus 402 toward Alafors, which
  // passes through Nödinge) would wrongly inherit that station's corridor
  // code from getStationCorridorMap() (found live 6 Sep 2026).
  const transportMode = String(trip.transportMode || "").trim().toLowerCase();
  if (transportMode && transportMode !== "train") {
    return "";
  }
  const blob = `${shortName} ${trip.destination || ""} ${trip.routeLongName || ""}`;
  for (const corridor of GOTEBORG_TRAIN_CORRIDORS) {
    // Word-boundary, not substring — "Ale" must not match inside
    // "Terminalen"/"Dalen"/etc. (found live 6 Sep 2026 at Korsvägen, where a
    // Kungsbacka-corridor train's destination "Göteborg, Nils Ericson
    // Terminalen" was misidentified as the Ale corridor by a plain substring
    // test).
    if (new RegExp(`\\b${corridor}\\b`, "i").test(blob)) {
      return corridor;
    }
  }
  const queryStation = String(trip.queryStation || "").trim();
  if (queryStation) {
    const corridor = getStationCorridorMap().get(foldKey(queryStation));
    if (corridor) {
      return corridor;
    }
  }
  return "";
}

function tripAllowed(trip) {
  const code = goteborgLineCode(trip);
  return Boolean(code) && ALLOWED.has(String(code).trim().toUpperCase());
}

async function loadGoteborgStatic() {
  if (existsSync(join(FIXTURE_DIR, "stops.txt"))) {
    return loadGtfsStaticFromDirectory(FIXTURE_DIR, {
      routeTypes: GOTEBORG_ROUTE_TYPES,
      timeZone: GOTEBORG_TIME_ZONE,
      sourceUrl: `trafiklab:gtfs/${GOTEBORG_OPERATOR}`,
    });
  }
  const key = requireTrafiklabApiKey();
  const url = trafiklabGtfsStaticUrl(GOTEBORG_OPERATOR, key);
  return loadGtfsStatic({
    url,
    routeTypes: GOTEBORG_ROUTE_TYPES,
    timeZone: GOTEBORG_TIME_ZONE,
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
  throw new Error(`Unknown Göteborg station: ${stationIdOrName}`);
}

async function fetchTimetableBoard(stationIdOrName, options) {
  let tripUpdatesUrl = "";
  try {
    if (!existsSync(join(FIXTURE_DIR, "stops.txt"))) {
      tripUpdatesUrl = trafiklabGtfsRtTripUpdatesUrl(GOTEBORG_OPERATOR);
    }
  } catch {
    tripUpdatesUrl = "";
  }

  // Resolved once so goteborgLineCode's corridor-fallback (trip.queryStation)
  // can identify a Kungsbacka/Alingsås/Ale departure even when the trip's
  // own destination/route-long-name text doesn't name the corridor (see
  // goteborgLineCode's doc comment).
  const queryStation = resolveCatalogEntry(stationIdOrName)?.name ?? String(stationIdOrName ?? "");

  const board = await fetchGtfsRealtimeBoard(stationIdOrName, {
    loadStatic: loadGoteborgStatic,
    resolveStopIds,
    resolveCatalogEntry,
    tripUpdatesUrl,
    timeZone: GOTEBORG_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes,
    fallbackStationName: TRAM_HUB,
    filterTrip: (trip) => tripAllowed({ ...trip, queryStation }),
    mapTrip(trip) {
      const code = goteborgLineCode({ ...trip, queryStation });
      return {
        ...trip,
        routeShortName: code || trip.routeShortName,
        rawDestination: trip.destination,
        destination: mapGoteborgDestination(
          trip.destination,
          code || trip.routeShortName,
          queryStation
        ),
      };
    },
  });
  // A null destination means the Västtågen normaliser couldn't map the trip
  // to a chip this station actually offers (e.g. a through-running train
  // continuing past the corridor terminus, seen from the terminus itself) —
  // drop it rather than surface a label nothing can match.
  return { ...board, trips: (board.trips ?? []).filter((trip) => trip.destination !== null) };
}

/** Västtrafik `serviceJourney.line.designation`/`.name` → v1 line code. */
function vasttrafikLineCode(line, destination, queryStation) {
  return goteborgLineCode({
    routeShortName: line?.designation ?? line?.name ?? "",
    destination,
    routeLongName: line?.name ?? "",
    queryStation,
    transportMode: line?.transportMode ?? "",
  });
}

/**
 * Map one Västtrafik `/departures` result row to the shared ProviderTrip
 * shape. Departures can vanish from the feed during disruptions rather than
 * carry isCancelled=true (docs/goteborg-d1/jim-handoff.md #4) — that's
 * handled by the caller falling back to the timetable board when a stop's
 * live results come back empty, not here. `queryStation` (the catalog
 * station name the board was requested for) is passed through so
 * goteborgLineCode can identify a Kungsbacka/Alingsås/Ale corridor
 * departure even when `serviceJourney.direction` is the train's actual
 * terminus rather than the corridor name (confirmed live 6 Sep 2026: at
 * Kungsbacka station, direction reads "Göteborg", not "Kungsbacka") — see
 * goteborgLineCode's doc comment.
 */
function mapVasttrafikDeparture(row, queryStation) {
  const line = row.serviceJourney?.line ?? {};
  const code = vasttrafikLineCode(line, row.serviceJourney?.direction, queryStation);
  const scheduled = row.plannedTime ?? null;
  const estimated = row.estimatedTime ?? row.estimatedOtherwisePlannedTime ?? scheduled;
  return {
    routeShortName: code || line.designation || line.name || "",
    destination: mapGoteborgDestination(row.serviceJourney?.direction, code, queryStation),
    rawDestination: row.serviceJourney?.direction ?? "",
    liveDeparture: estimated,
    scheduledDeparture: scheduled ?? estimated ?? undefined,
    cancelled: row.isCancelled === true,
  };
}

async function fetchLiveBoardForStop(gid, options, queryStation) {
  const { results } = await fetchStopAreaDepartures(gid, {
    limit: 20,
    noCache: options.noCache,
  });
  return results
    .map((row) => mapVasttrafikDeparture(row, queryStation))
    .filter((trip) => {
      if (trip.destination === null) {
        // See fetchTimetableBoard's matching filter: no chip this station
        // offers matches this trip (through-running past the terminus).
        return false;
      }
      const upper = String(trip.routeShortName || "").trim().toUpperCase();
      return ALLOWED.has(upper);
    });
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number, noCache?: boolean }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  // Missing credentials are a hard error — never a silent timetable board.
  readVasttrafikCredentials();

  const staticData = await loadGoteborgStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  const stopAreaGids = stopIds.filter(isVasttrafikStopAreaGid);

  const queryStation = catalogEntry?.name ?? String(stationIdOrName ?? "");

  let liveTrips = null;
  if (stopAreaGids.length > 0) {
    try {
      const perStop = await Promise.all(
        stopAreaGids.map((gid) => fetchLiveBoardForStop(gid, options, queryStation))
      );
      liveTrips = perStop.flat();
    } catch {
      liveTrips = null; // upstream/network failure — fall back to timetable.
    }
  }

  if (liveTrips && liveTrips.length > 0) {
    return {
      stationName: catalogEntry?.name ?? TRAM_HUB,
      lastUpdate: new Date().toISOString(),
      trips: liveTrips,
      realtime: "live",
    };
  }

  const board = await fetchTimetableBoard(stationIdOrName, options);
  return {
    stationName: board.stationName,
    lastUpdate: board.lastUpdate,
    trips: board.trips,
    realtime: "timetable",
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { TRAM_HUB, PENDELTÅG_HUB, resolveCatalogEntry };
