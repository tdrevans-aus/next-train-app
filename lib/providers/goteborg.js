/**
 * Göteborg (Västtrafik) tram + city-map pendeltåg.
 *
 * Board: Västtrafik Planera Resa v4 (lib/providers/vasttrafik.js) only —
 * per-stop-area departures with live estimated times, OAuth2 client-
 * credentials (VASTTRAFIK_CLIENT_ID / VASTTRAFIK_CLIENT_SECRET). There is no
 * timetable fallback (docs/jim-brief-goteborg-live-only-no-fallback.md, Tim
 * 7 Sep 2026: "definitely remove the fallback" — the live/timetable UI
 * marker, FB-57, does not exist yet, so a silent timetable board would be
 * indistinguishable from live times to a rider). Each catalog station's
 * Västtrafik stop-area GID(s) live in `vasttrafikStopAreaGids` in
 * lib/cities/goteborg/stations.json, generated once (offline, never on the
 * board path) by scripts/generate-goteborg-stop-area-gids.mjs from the
 * Trafiklab GTFS Regional `vt` static feed — see that station's comment for
 * how. Missing Västtrafik credentials
 * (MissingVasttrafikCredentialsError), a station with no catalog GID
 * (MissingVasttrafikStopAreaGidError — a catalog gap, surfaced by
 * qa/goteborg-dogfood-gate.mjs, not a runtime fallback), and a failed live
 * fetch (VasttrafikUnavailableError — transient, retrying can help) are all
 * hard errors. An **empty** live result during service hours is a valid
 * board (no departures), not an error — `realtime` is always `"live"`.
 *
 * Modes v1: tram 1–12 + Kungsbacka / Alingsås / Ale. No stombuss / båt / X-bus / metro.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  fetchStopAreaDepartures,
  readVasttrafikCredentials,
  MissingVasttrafikCredentialsError,
  MissingVasttrafikStopAreaGidError,
  VasttrafikUnavailableError,
} from "./vasttrafik.js";
import { formatClock } from "./stockholm.js";
import {
  ALLOWED_LINE_CODES,
  foldKey,
  isForbiddenCollapseName,
  loadLineMap,
  mapGoteborgDestination,
  PENDELTÅG_HUB,
  TRAM_HUB,
} from "../cities/goteborg/marketing-directions.js";

export { MissingVasttrafikCredentialsError, MissingVasttrafikStopAreaGidError, VasttrafikUnavailableError };

const __dirname = dirname(fileURLToPath(import.meta.url));

export const GOTEBORG_TIME_ZONE = "Europe/Stockholm";
export const GOTEBORG_OPERATOR = "vt";
/** Extended GTFS types: tram + rail / suburban rail. Used by scripts/generate-goteborg-stop-area-gids.mjs, not on the board path. */
export const GOTEBORG_ROUTE_TYPES = ["0", "2", "100", "106", "109", "400", "401", "900"];
export const GOTEBORG_TRAM_SHORT_NAMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const GOTEBORG_TRAIN_CORRIDORS = ["Kungsbacka", "Alingsås", "Ale"];

const ALLOWED = new Set(ALLOWED_LINE_CODES.map((code) => String(code).trim().toUpperCase()));
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
    if (entry.vasttrafikStopAreaGids?.includes(raw)) {
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
  // The Västtrafik live path returns every mode unfiltered per stop area, so
  // `mapVasttrafikDeparture` sets `transportMode` explicitly before calling
  // this. (Historically there was also a GTFS timetable path that never set
  // `transportMode` here, so every gate below passed unconditionally for it —
  // that path is gone, docs/jim-brief-goteborg-live-only-no-fallback.md.)
  const transportMode = String(trip.transportMode || "").trim().toLowerCase();
  if (GOTEBORG_TRAM_SHORT_NAMES.includes(shortName)) {
    // A tram-numbered designation (1-12) only counts as tram line `shortName`
    // if the row's own transportMode agrees — Kungsbacka (and other town)
    // local buses reuse designations that collide with Göteborg tram numbers
    // (found live 6 Sep 2026, docs/jim-brief-goteborg-bus-rows-on-tram-codes.md).
    // A `transportMode: "bus"` row with designation "2" must not pass as tram
    // line 2.
    if (transportMode && transportMode !== "tram") {
      return "";
    }
    return shortName;
  }
  if (ALLOWED.has(upper) || ALLOWED.has(shortName)) {
    // Only the corridor-name allow-list entries (Kungsbacka/Alingsås/Ale)
    // reach here — tram numbers are handled above. Same train-only gate as
    // the destination/queryStation corridor fallback below.
    if (transportMode && transportMode !== "train") {
      return "";
    }
    return shortName;
  }
  // Corridor fallbacks below only apply to train-mode journeys — without
  // this gate, a bus at a corridor station (e.g. bus 402 toward Alafors,
  // which passes through Nödinge) would wrongly inherit that station's
  // corridor code from getStationCorridorMap() (found live 6 Sep 2026).
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

/**
 * Normalised board `transportMode` for an already-allowed line code — every
 * trip goteborgLineCode admits is either a tram number or a corridor name,
 * never anything else, so this is exhaustive.
 * docs/jim-brief-goteborg-bus-rows-on-tram-codes.md wants this on every
 * returned trip so the gate can assert no `bus`/other mode ever reaches a
 * board, on top of the upstream filtering above.
 * @param {string} code
 */
function transportModeForCode(code) {
  return GOTEBORG_TRAM_SHORT_NAMES.includes(code) ? "tram" : "train";
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
 * carry isCancelled=true (docs/goteborg-d1/jim-handoff.md #4) — since
 * docs/jim-brief-goteborg-live-only-no-fallback.md there is no timetable
 * fallback to catch this; an empty live result is returned as-is (a valid,
 * if unhelpful, board), not papered over here. `queryStation` (the catalog
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
  const hasEstimate = row.estimatedTime != null;
  const estimated = row.estimatedTime ?? row.estimatedOtherwisePlannedTime ?? scheduled;
  const scheduledDate = scheduled ? new Date(scheduled) : null;
  const liveDate = estimated ? new Date(estimated) : scheduledDate;
  const platform = String(row.stopPoint?.platform ?? row.stopPoint?.designation ?? "").trim();
  return {
    // `code` is "" whenever goteborgLineCode rejected the row (wrong
    // transportMode, unmapped corridor, etc.) — never fall back to the raw
    // `line.designation`/`.name` here, or a rejected row (e.g. a Kungsbacka
    // town bus whose designation collides with a tram number) would put its
    // raw designation back in `routeShortName` and re-pass the caller's
    // ALLOWED check (docs/jim-brief-goteborg-bus-rows-on-tram-codes.md).
    routeShortName: code,
    transportMode: code ? transportModeForCode(code) : "",
    destination: mapGoteborgDestination(row.serviceJourney?.direction, code, queryStation),
    rawDestination: row.serviceJourney?.direction ?? "",
    liveDeparture: estimated,
    scheduledDeparture: scheduled ?? estimated ?? undefined,
    // Rider-facing HH:mm in Europe/Stockholm — shared formatter, see
    // docs/jim-brief-goteborg-display-time.md (this board had none until
    // PR #332's live-only rewrite dropped the shared GTFS board builder
    // that used to derive these).
    displayTime: formatClock(liveDate),
    scheduledDisplayTime: formatClock(scheduledDate || liveDate),
    platform,
    realtime: hasEstimate,
    cancelled: row.isCancelled === true,
  };
}

function isAllowedLiveTrip(trip) {
  if (trip.destination === null) {
    // mapGoteborgDestination returned null: no chip this station offers
    // matches this trip (through-running past the corridor terminus).
    return false;
  }
  const upper = String(trip.routeShortName || "").trim().toUpperCase();
  return ALLOWED.has(upper);
}

async function fetchLiveBoardForStop(gid, options, queryStation) {
  const { results } = await fetchStopAreaDepartures(gid, {
    limit: 20,
    noCache: options.noCache,
  });
  return results.map((row) => mapVasttrafikDeparture(row, queryStation)).filter(isAllowedLiveTrip);
}

/**
 * Live-only, no fallback (docs/jim-brief-goteborg-live-only-no-fallback.md).
 * Never loads static GTFS — every catalog station's Västtrafik stop-area
 * GID(s) are read straight from `vasttrafikStopAreaGids` in
 * lib/cities/goteborg/stations.json.
 * @param {string} stationIdOrName Catalog name, alias, or Västtrafik stop-area GID
 * @param {{ now?: Date, horizonMinutes?: number, noCache?: boolean }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  // Missing credentials are a hard error — never a silent fallback board.
  readVasttrafikCredentials();

  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const queryStation = catalogEntry?.name ?? String(stationIdOrName ?? "");
  const stopAreaGids = catalogEntry?.vasttrafikStopAreaGids ?? [];

  if (stopAreaGids.length === 0) {
    // A catalog gap (e.g. Nordstan — docs/goteborg-d1/jim-handoff.md), or a
    // stationIdOrName that isn't in the catalog at all. Never guessed at and
    // never falls through to a different data source — see
    // qa/goteborg-dogfood-gate.mjs's per-station GID assertion.
    throw new MissingVasttrafikStopAreaGidError(queryStation);
  }

  let liveTrips;
  try {
    const perStop = await Promise.all(
      stopAreaGids.map((gid) => fetchLiveBoardForStop(gid, options, queryStation))
    );
    liveTrips = perStop.flat();
  } catch (error) {
    if (error instanceof MissingVasttrafikCredentialsError) {
      throw error;
    }
    throw new VasttrafikUnavailableError(queryStation, error);
  }

  // An empty result is a valid, honest board (no departures right now), not
  // an error — never dressed up as anything but live.
  return {
    stationName: queryStation,
    lastUpdate: new Date().toISOString(),
    trips: liveTrips,
    realtime: "live",
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { TRAM_HUB, PENDELTÅG_HUB, resolveCatalogEntry };

/**
 * Test-only: map + filter one raw Västtrafik `/departures` row exactly as
 * fetchLiveBoardForStop does, without a network call — used by
 * qa/goteborg-dogfood-gate.mjs's offline bus/tram-designation-collision
 * check (docs/jim-brief-goteborg-bus-rows-on-tram-codes.md).
 * @param {object} row raw Västtrafik departures result row
 * @param {string} queryStation
 * @returns {{ trip: object, allowed: boolean }}
 */
export function _mapAndFilterVasttrafikDepartureForTests(row, queryStation) {
  const trip = mapVasttrafikDeparture(row, queryStation);
  return { trip, allowed: isAllowedLiveTrip(trip) };
}
