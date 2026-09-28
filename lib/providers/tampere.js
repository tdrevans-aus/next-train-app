/**
 * Tampere (Nysse tram, lines 1 and 3) — ITS Factory static GTFS + GTFS-RT VehiclePositions.
 * Adapter ready; city remains `planned` (not live) — see docs/tampere-d1/jim-handoff.md.
 * assertCityLive("tampere") must still fail until Tim flips the registry entry.
 *
 * Feed choice (docs/tampere-d1/jim-handoff.md item 3, this pass's D2 follow-up):
 * - **Static**: `http://data.itsfactory.fi/journeys/files/gtfs/latest/gtfs_tampere.zip` — no
 *   auth, confirmed 200 this pass, trimmed at load time to route_type "0" (tram) via
 *   loadGtfsStatic's routeTypes filter, same direct-fetch pattern as lib/providers/adelaide.js
 *   (no Vercel Blob publish step needed — the feed is already Tampere-region-scoped, ~17MB,
 *   unauthenticated).
 * - **Realtime**: ITS Factory's own GTFS-RT VehiclePositions
 *   (`http://data.itsfactory.fi/journeys/api/1/gtfs-rt/vehicle-positions`) — confirmed live,
 *   no auth, this pass. ITS Factory's TripUpdates path 404s (confirmed) — the D1 pack's
 *   suspected real trip-updates host, `dev.publictransport.tampere.fi`, was tracked down this
 *   pass (its SPA bundle's own doc strings) to `https://data.waltti.fi/tampere/api/gtfsrealtime/
 *   v1.0/feed/tripupdate`, a SEPARATE Waltti product gated by HTTP Basic client-id/secret
 *   credentials (`Authorization: Basic <base64 client_id:client_secret>`) — NOT the
 *   `digitransit-subscription-key` header Helsinki's DIGITRANSIT_SUBSCRIPTION_KEY covers.
 *   Confirmed two ways this pass: (1) the SPA's own doc copy names Basic auth explicitly for
 *   `.../feed/servicealert` (same product family as tripupdate); (2) a direct POST to
 *   Digitransit's own `https://api.digitransit.fi/routing/v2/waltti/gtfs/v1` with the existing
 *   DIGITRANSIT_SUBSCRIPTION_KEY returned `401 Access denied due to invalid subscription key` —
 *   the key does not cover the "waltti" product (it's an "hsl"-scoped key), confirming the D1
 *   pack's flagged-but-unconfirmed caveat. No Waltti client-id/secret is available this session;
 *   trip-updates and the Digitransit waltti routing profile are both out of reach without new
 *   credentials Tim would need to request. **This adapter proceeds on VehiclePositions +
 *   static schedule alone** — genuine per-trip live confirmation (a trip is only shown once its
 *   trip_id is actually reported running in the VehiclePositions feed, never a schedule-only
 *   guess — see classifyAndFilterTampereTrips below), same "live boards only" posture as
 *   Melbourne/Dublin's tripHasRealtimeConfirmation, just confirmed by VehiclePosition presence
 *   rather than a TripUpdate stopTimeUpdate. lib/providers/gtfs/realtime.js's new
 *   indexVehiclePositions() is the shared, reusable index for this — not a fork of
 *   indexTripUpdates. **Live-confirmed 28 Sep 2026 this feed's own TripDescriptor carries NO
 *   trip_id at all** — only `routeId`/`startTime`/`startDate` (confirmed by decoding a real
 *   payload: 10 live tram vehicles present at the time, e.g.
 *   `{trip:{startTime:"01:43:00",startDate:"20260928",routeId:"1"},vehicle:{id:"56920_12"}}`, no
 *   `tripId` field anywhere) — `resolveVehicleTripId()` below joins that shape back to a real
 *   static trip_id via route_id + first-scheduled-departure-time
 *   (`buildRouteStartIndex`/`buildFirstStopIndex`), disambiguated by active service on
 *   start_date when more than one static trip shares that key. Passed to the new shared
 *   `indexVehiclePositions()`'s `resolveTripId` option (same optional-resolver shape
 *   `indexTripUpdates` already has) rather than forking the index function for this feed's
 *   quirk. Genuine limitation, flagged for Mark/Tim: a trip that hasn't yet left its own origin
 *   stop may not appear in VehiclePositions until it starts moving, so a station right at a
 *   line's own origin can show fewer live-confirmed departures than the timetable promises for
 *   the next few minutes — the honest-empty-state path
 *   (emptyReason: "no-live-predictions", scheduledCandidates) exists for exactly this, same
 *   shape as lib/providers/dublin.js. Confirmed live end-to-end this pass (~05:10 Europe/Helsinki,
 *   Tampere Tram service running): Rautatieasema correctly returned real scheduled departures
 *   ("1 + Pyhällönpuisto", "3 + Hervantajärvi", "3 + Sorin aukio") with the honest-empty-state
 *   signal before this trip_id-resolution fix (no vehicle had yet reported a matching trip_id —
 *   the feed had none to match at all), and genuine live-confirmed trips after it.
 *
 * H5 through-running (docs/tampere-d1/hazard-pack.md H5, direction-model-memo.md): a minority
 * (~2-9%) of live GTFS trips tagged route_id 1 or 3 physically run through onto the OTHER
 * line's outer corridor, and GTFS trip_headsign does not disambiguate this. This adapter never
 * derives a direction chip from route_id/headsign alone — tripTerminusStationName() below joins
 * each trip's own actual LAST stop_times.txt row (by trip_id, resolved against the same static
 * snapshot the board is built from) to the station catalog, so a through-running trip's chip is
 * always its true physical destination, not the printed line's usual terminus. This also
 * subsumes the memo's separate headsign->terminus mapping recommendation (TAYS -> Kaupin
 * kampus, Hervanta -> Hervantajärvi): both of those termini are simply each trip's own real last
 * stop, so no lookup table is needed at all — see lib/cities/tampere/marketing-directions.js's
 * file header.
 *
 * v1 scope (docs/tampere-d1/hazard-pack.md, published-network.json): tram lines 1 and 3 only,
 * 33 unique stations. No Nysse bus (out-mode, even where a tram stop shares a printed name with
 * lettered bus platforms — Keskustori, Rautatieasema, Sorin aukio). No VR regional/long-distance
 * rail (out of catalog — the tram's Rautatieasema is a confirmed-separate, nearby stop-place
 * from the VR railway station building, never in this catalog under any name).
 *
 * Europe/Helsinki HAS DST — confirmed directly from the GTFS agency.txt agency_timezone field
 * (hazard-pack.md H7), consistent with Helsinki's own pack. Do not copy no-DST cities.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, activeServicesForDate } from "./gtfs/static-cache.js";
import { fetchTripUpdates, indexVehiclePositions } from "./gtfs/realtime.js";
import { buildBoardForStops, findNextServiceDate } from "./gtfs/board.js";
import {
  TAMPERE_HUB,
  TAMPERE_TIME_ZONE,
  ALLOWED_LINE_CODES,
  foldKey,
  isForbiddenCollapseName,
} from "../cities/tampere/marketing-directions.js";

export { TAMPERE_HUB, TAMPERE_TIME_ZONE };

const __dirname = dirname(fileURLToPath(import.meta.url));

export const TAMPERE_GTFS_STATIC_URL =
  "http://data.itsfactory.fi/journeys/files/gtfs/latest/gtfs_tampere.zip";
export const TAMPERE_GTFS_RT_VEHICLE_POSITIONS_URL =
  "http://data.itsfactory.fi/journeys/api/1/gtfs-rt/vehicle-positions";
/** Confirmed live this pass (200, no auth) but not wired in v1 — no product surface for it yet. */
export const TAMPERE_GTFS_RT_SERVICE_ALERTS_URL =
  "http://data.itsfactory.fi/journeys/api/1/gtfs-rt/service-alerts";

const catalogPath = join(__dirname, "../cities/tampere/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

/** stop_id (either A/B platform) -> canonical catalog station name. */
const STOP_ID_TO_STATION = new Map();
for (const station of stationCatalog.stations ?? []) {
  for (const stopId of station.stopIds ?? []) {
    STOP_ID_TO_STATION.set(stopId, station.name);
  }
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

async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (catalogEntry?.stopIds?.length) {
    return catalogEntry.stopIds;
  }
  if (staticData.stopsById.has(stationIdOrName)) {
    return [stationIdOrName];
  }
  throw new Error(`Unknown Tampere station: ${stationIdOrName}`);
}

export async function loadTampereStatic() {
  return loadGtfsStatic({
    url: TAMPERE_GTFS_STATIC_URL,
    routeTypes: ["0"],
    timeZone: TAMPERE_TIME_ZONE,
    ifModifiedSince: true,
  });
}

/**
 * Build (and cache on the staticData object itself, so it's computed once per snapshot load,
 * not once per request) a trip_id -> its own last stop_times.txt row map, by stop_sequence.
 * stop_times rows are already bucketed by stop_id in staticData.stopTimesByStopId — every stop a
 * tram trip visits is one of this feed's tram stops, so iterating every bucket's rows recovers
 * every (trip_id, stop_id, stop_sequence) triple without a second GTFS parse.
 */
function buildLastStopIndex(staticData) {
  if (staticData.__tampereLastStopByTripId) {
    return staticData.__tampereLastStopByTripId;
  }
  const lastByTripId = new Map();
  for (const stopTimes of staticData.stopTimesByStopId.values()) {
    for (const stopTime of stopTimes) {
      const sequence = Number(stopTime.stop_sequence);
      const prev = lastByTripId.get(stopTime.trip_id);
      if (!prev || sequence > prev.stopSequence) {
        lastByTripId.set(stopTime.trip_id, { stopId: stopTime.stop_id, stopSequence: sequence });
      }
    }
  }
  staticData.__tampereLastStopByTripId = lastByTripId;
  return lastByTripId;
}

/**
 * First (min stop_sequence) stop_times.txt row per trip_id — same bucket-iteration approach as
 * buildLastStopIndex(), cached on staticData. Used only by resolveVehicleTripId() below.
 */
function buildFirstStopIndex(staticData) {
  if (staticData.__tampereFirstStopByTripId) {
    return staticData.__tampereFirstStopByTripId;
  }
  const firstByTripId = new Map();
  for (const stopTimes of staticData.stopTimesByStopId.values()) {
    for (const stopTime of stopTimes) {
      const sequence = Number(stopTime.stop_sequence);
      const prev = firstByTripId.get(stopTime.trip_id);
      if (!prev || sequence < prev.stopSequence) {
        firstByTripId.set(stopTime.trip_id, { departureTime: stopTime.departure_time, stopSequence: sequence });
      }
    }
  }
  staticData.__tampereFirstStopByTripId = firstByTripId;
  return firstByTripId;
}

/**
 * `${route_id}|${first scheduled departure_time}` -> trip_id[] — built once per static snapshot,
 * cached on staticData. Used only by resolveVehicleTripId() below.
 */
function buildRouteStartIndex(staticData) {
  if (staticData.__tampereRouteStartIndex) {
    return staticData.__tampereRouteStartIndex;
  }
  const index = new Map();
  for (const [tripId, first] of buildFirstStopIndex(staticData).entries()) {
    const trip = staticData.tripsById.get(tripId);
    if (!trip) {
      continue;
    }
    const key = `${trip.route_id}|${first.departureTime}`;
    const list = index.get(key) ?? [];
    list.push(tripId);
    index.set(key, list);
  }
  staticData.__tampereRouteStartIndex = index;
  return index;
}

/**
 * Convert a VehiclePosition TripDescriptor's `startDate`(YYYYMMDD)/`startTime`(HH:MM:SS) into the
 * local Europe/Helsinki wall-clock HH:MM:SS static stop_times.txt departure_time values use.
 *
 * **Confirmed live 28 Sep 2026 (docs/tampere-d1/jim-handoff.md): this feed's own `startTime` is
 * UTC, not the agency-local time the GTFS-RT spec calls for.** Evidence: at ~05:10 Europe/Helsinki
 * (~02:10 UTC), live vehicles reported `startTime` values of "01:28:00"-"02:18:00" — impossible as
 * local times (Tampere Tram's earliest service is ~05:00, so a 01:28 or 02:18 LOCAL start would be
 * outside all service hours for every one of 10 simultaneously-running vehicles), but each is
 * exactly UTC+3 (Europe/Helsinki's DST offset in September) away from a plausible ~04:28-05:18
 * local start — matching the static schedule's own early-morning departure times once converted.
 * Interpreting `startDate`+`startTime` as a UTC instant and reformatting in Europe/Helsinki
 * (DST-safe via Intl.DateTimeFormat, not a hardcoded +3) is what actually resolves trip_ids.
 */
function vehicleStartTimeToLocalHms(startDate, startTimeUtc, timeZone) {
  const [hh, mm, ss] = startTimeUtc.split(":").map((v) => Number(v));
  if (![hh, mm].every(Number.isFinite) || startDate.length !== 8) {
    return null;
  }
  const y = Number(startDate.slice(0, 4));
  const mo = Number(startDate.slice(4, 6));
  const d = Number(startDate.slice(6, 8));
  const utcInstant = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss || 0));
  if (Number.isNaN(utcInstant.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcInstant);
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("hour")}:${pick("minute")}:${pick("second")}`;
}

/**
 * ITS Factory's GTFS-RT VehiclePositions feed carries NO trip_id at all (confirmed live, 28 Sep
 * 2026) — only `routeId`, `startTime` (UTC, see vehicleStartTimeToLocalHms() above — NOT the
 * agency-local time the GTFS-RT spec calls for) and `startDate` (YYYYMMDD). This resolves that
 * shape back to a real static trip_id by joining route_id + first-scheduled-departure-time
 * (converted to local time first) against the static snapshot (buildRouteStartIndex),
 * disambiguating by which candidate's service_id is actually active on start_date when more than
 * one trip shares that key (e.g. a weekday vs weekend pattern using the same route+time). Returns
 * null when no candidate resolves — the caller (indexVehiclePositions's resolveTripId option)
 * then skips that vehicle entity rather than inventing a match.
 */
function resolveVehicleTripId(descriptor, staticData) {
  const routeId = String(descriptor.routeId || "").trim();
  const startTimeUtc = String(descriptor.startTime || "").trim();
  const startDate = String(descriptor.startDate || "").trim();
  if (!routeId || !startTimeUtc || startDate.length !== 8) {
    return null;
  }
  const localHms = vehicleStartTimeToLocalHms(startDate, startTimeUtc, TAMPERE_TIME_ZONE);
  if (!localHms) {
    return null;
  }
  const candidates = buildRouteStartIndex(staticData).get(`${routeId}|${localHms}`) ?? [];
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  const y = Number(startDate.slice(0, 4));
  const m = Number(startDate.slice(4, 6));
  const d = Number(startDate.slice(6, 8));
  const asDate = new Date(Date.UTC(y, m - 1, d, 12));
  const activeServices = activeServicesForDate(staticData, asDate, TAMPERE_TIME_ZONE);
  const match = candidates.find((tripId) => activeServices.has(staticData.tripsById.get(tripId)?.service_id));
  return match || candidates[0];
}

let loggedUnresolvedLastStop = false;

/**
 * A trip's true physical destination — its own actual last static stop, never route_id or
 * trip_headsign alone (hazard-pack.md H5 — see file header). Falls back to the raw GTFS
 * stop_name (not a catalog name) for the rare case a trip's last stop_id isn't in our own
 * station catalog, rather than throwing away the trip.
 */
export function tripTerminusStationName(trip, staticData) {
  const lastStop = buildLastStopIndex(staticData).get(trip.tripId);
  if (!lastStop) {
    return null;
  }
  const catalogName = STOP_ID_TO_STATION.get(lastStop.stopId);
  if (catalogName) {
    return catalogName;
  }
  const rawName = staticData.stopsById.get(lastStop.stopId)?.stop_name;
  if (rawName && !loggedUnresolvedLastStop) {
    loggedUnresolvedLastStop = true;
    console.warn(
      `Tampere: trip last stop_id ${lastStop.stopId} (${rawName}) is not in the station catalog — using the raw GTFS name (further occurrences suppressed).`
    );
  }
  return rawName || null;
}

/**
 * Classification/direction/self-terminus filtering + live-confirmation split, applied to the raw
 * per-stop trips buildBoardForStops() returns. Extracted as its own exported function so
 * qa/tampere-dogfood-gate.mjs can exercise this exact pipeline end-to-end against a synthetic
 * static+VehiclePositions fixture, same shape as lib/providers/dublin.js's
 * classifyAndFilterDublinTrips.
 * @param {object[]} rawTrips
 * @param {string} stationName
 * @param {{ activeTripIds: Set<string> }} realtimeIndex
 * @param {object} staticData
 */
export function classifyAndFilterTampereTrips(rawTrips, stationName, realtimeIndex, staticData) {
  let trips = rawTrips.map((trip) => {
    const routeShortName = String(trip.routeShortName || "").trim();
    const terminusStationName = tripTerminusStationName(trip, staticData);
    const destination =
      routeShortName && terminusStationName ? `${routeShortName} + ${terminusStationName}` : null;
    return { ...trip, terminusStationName, destination, realtime: true };
  });

  // Only the two real passenger lines — defensive, though loadTampereStatic() already trims to
  // route_type "0" (tram), and hazard-pack.md H3 confirms exactly two route_type=0 rows exist.
  trips = trips.filter((trip) => ALLOWED_LINE_CODES.has(trip.routeShortName) && trip.destination);

  // A trip whose actual last stop IS the station being viewed is an arrival, not a boardable
  // departure — never a phantom direction chip (e.g. never "1 + Kaupin kampus" at Kaupin kampus
  // itself, direction-model-memo.md).
  trips = trips.filter((trip) => trip.terminusStationName !== stationName);

  // Schedule-only candidates: genuinely walkable directions from this stop per the static
  // timetable, independent of whether VehiclePositions confirmed any of them right now.
  const scheduledCandidates = trips;

  // Live-only: drop anything VehiclePositions didn't actually confirm is running.
  const confirmed = trips.filter((trip) => realtimeIndex.activeTripIds.has(trip.tripId));

  return { trips: confirmed, scheduledCandidates };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number, loadStatic?: () => Promise<object>, fetchVehiclePositions?: () => Promise<{entities: object[], fetchedAt: Date}> }} [options]
 *   `loadStatic`/`fetchVehiclePositions` default to the real network paths; QA passes offline/
 *   synthetic overrides so the pipeline can be exercised without a network fetch.
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const now = options.now ?? new Date();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Tampere station: ${stationIdOrName}`);
  }
  const stationName = catalogEntry.name;

  const staticData = await (options.loadStatic ?? loadTampereStatic)();
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const fetchVehiclePositions =
    options.fetchVehiclePositions ??
    (() =>
      fetchTripUpdates(TAMPERE_GTFS_RT_VEHICLE_POSITIONS_URL, {
        timeoutMs: options.realtimeTimeoutMs ?? 4000,
      }));
  const feed = await fetchVehiclePositions();
  const { activeTripIds } = indexVehiclePositions(feed.entities, {
    resolveTripId: (descriptor) => resolveVehicleTripId(descriptor, staticData),
  });

  const realtimeIndex = {
    tripDelaySec: new Map(),
    stopUpdates: new Map(),
    cancelledTrips: new Set(),
    // Reuses buildBoardForStops' own runtime staleness detector (resolvedShareForRealtime) by
    // feeding it VehiclePositions' own trip_ids as the "realtime referenced" set — the same
    // "trip IDs in the realtime feed have drifted from the static snapshot" signal applies
    // whether the realtime feed is TripUpdates or VehiclePositions.
    tripIds: activeTripIds,
    rawTripIds: activeTripIds,
    activeTripIds,
  };

  const rawTrips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: TAMPERE_TIME_ZONE,
    now,
    horizonMinutes: options.horizonMinutes,
    cityId: "tampere",
  });

  const { trips, scheduledCandidates } = classifyAndFilterTampereTrips(
    rawTrips,
    stationName,
    realtimeIndex,
    staticData
  );

  let nextServiceDate = null;
  let emptyReason = null;
  if (trips.length === 0) {
    if (scheduledCandidates.length > 0) {
      // The schedule says a tram should be running past this stop right now, but
      // VehiclePositions had nothing to say for it — could be a genuine feed gap, or (see file
      // header) a trip that hasn't left its own origin stop yet and so has no vehicle report at
      // all until it starts moving. Never fall back to showing the schedule-only times as live.
      emptyReason = "no-live-predictions";
    } else {
      nextServiceDate = findNextServiceDate({
        stopIds,
        staticData,
        timeZone: TAMPERE_TIME_ZONE,
        now,
      });
    }
  }

  return {
    stationName,
    lastUpdate: feed.fetchedAt.toISOString(),
    trips,
    scheduledCandidates,
    realtime: true,
    nextServiceDate,
    emptyReason,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { resolveCatalogEntry, resolveStopIds };
