/**
 * Sydney (TfNSW) rail + metro + NSW TrainLink intercity provider — GTFS + GTFS-RT via
 * Open Data Hub. City is live in registry.js.
 *
 * Static: https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains (+ metro, + nswtrains)
 * RT: https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains (+ metro, + nswtrains)
 * Auth: TFNSW_API_KEY → Authorization: apikey <key>
 *
 * nswtrains is merged as a third source (14 Sep 2026, docs/jim-brief-sydney-intercity-fill.md):
 * it carries both walk-up intercity/Hunter services (BMT/CCN/SCO/SHL/HUN — in scope) and
 * compulsory-reservation regional services (XPT/Xplorer/coach — out of scope per
 * docs/board-eligibility-rule.md). NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES drops the latter's
 * trips from the static load, so they are structurally absent from every board — see
 * docs/sydney-d1/board-eligibility-intercity.md for the route-by-route verdict.
 *
 * Round 2 correction (15 Sep 2026, TFNSW_API_KEY confirmed working): the walk-up codes
 * BMT/CCN/SCO/SHL/HUN and the compulsory-reservation NRC/NRW/STH/WST corridors are ALL
 * published under the *sydneytrains* static feed (agency_id "NSWTrains", route_type "2"),
 * not under the standalone nswtrains feed — there, BMT/HUN/SCO/SHL sit at route_type "100"
 * (excluded by `railOnly`) and CCN is absent entirely. So `excludeRouteShortNames` must be
 * applied to the SYDNEY_TRAINS_STATIC_URL load below, not (only) to nswtrains — the nswtrains
 * merge mainly contributes extra `stops.txt` rows (platform ids, some duplicated) since its
 * own rail-typed trip content is effectively empty under railOnly. Round 1's excluded-route
 * list (CAN/MEL/BRI/GRF/DBB/ARM) was a documented best-guess made without feed access; it
 * does not match any real route_short_name in either feed and has been replaced below.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  loadGtfsStatic,
  mergeGtfsStaticData,
  findRailStopIdsForName,
} from "./gtfs/static-cache.js";
import {
  fetchTripUpdates,
  mergeTripUpdateEntities,
  indexTripUpdates,
} from "./gtfs/realtime.js";
import { buildBoardForStops, checkSnapshotFreshness } from "./gtfs/board.js";
import { tfnswAuthHeaders, readTfnswApiKey } from "./gtfs/auth.js";
import { FeedUnavailableError } from "./gtfs/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SYDNEY_TIME_ZONE = "Australia/Sydney";

/** Pinned TfNSW Sydney Trains static GTFS. */
export const SYDNEY_TRAINS_STATIC_URL =
  "https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains";

/**
 * Pinned TfNSW Sydney Metro static GTFS. MUST be the v2 path: the v1 `/v1/gtfs/schedule/metro`
 * endpoint still serves a September-2024 feed (feed_version 17092024-220045, calendar ended Dec 2024,
 * trip ids "101-02.160924.15.0435") even though its Last-Modified header moves, so no Metro trip ever
 * ran and live ids ("0271-002-101-002:1000") never matched. v2 serves the current timetable with the
 * live id scheme (verified 24 Nov 2026; docs/jim-brief-sydney-metro-stale-and-refresh-cadence.md).
 */
export const SYDNEY_METRO_STATIC_URL = "https://api.transport.nsw.gov.au/v2/gtfs/schedule/metro";

/**
 * Pinned TfNSW NSW TrainLink static GTFS (intercity + regional). Added 14 Sep 2026
 * (docs/jim-brief-sydney-intercity-fill.md, Tim's "if it has an API it is in scope" rule).
 * Carries both walk-up intercity/Hunter services (BMT/CCN/SCO/SHL/HUN) and
 * compulsory-reservation regional services (XPT/Xplorer/coach) on the same feed —
 * NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES below drops the latter per
 * docs/sydney-d1/board-eligibility-intercity.md before any board is built.
 */
export const SYDNEY_NSWTRAINS_STATIC_URL =
  "https://api.transport.nsw.gov.au/v1/gtfs/schedule/nswtrains";

/** Pinned TfNSW Sydney Trains TripUpdates. */
export const SYDNEY_TRAINS_RT_URL =
  "https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains";

/** Pinned TfNSW Sydney Metro TripUpdates. */
export const SYDNEY_METRO_RT_URL = "https://api.transport.nsw.gov.au/v2/gtfs/realtime/metro";

/**
 * Pinned TfNSW NSW TrainLink TripUpdates. Unlike sydneytrains/metro, this feed is only
 * published at v1 — v2 404s (confirmed 15 Sep 2026, Round 2 of
 * docs/jim-brief-sydney-intercity-fill.md, after TFNSW_API_KEY became available). Do not
 * "fix" this to v2 to match the other two RT URLs above.
 */
export const SYDNEY_NSWTRAINS_RT_URL = "https://api.transport.nsw.gov.au/v1/gtfs/realtime/nswtrains";

/**
 * NSW TrainLink route_short_names that require a compulsory reservation (XPT/Xplorer
 * long-distance, plus any coach-only route that still shows up under route_type rail).
 * Board-eligibility rule (docs/board-eligibility-rule.md): a board only shows walk-up
 * services, so these are excluded in code, by route, not by dropping a station. Every one
 * of these has a recorded verdict in docs/sydney-d1/board-eligibility-intercity.md — that
 * file, not this list, is authoritative on the "why"; keep them in sync if TfNSW renames a
 * route_short_name. The five walk-up codes (BMT/CCN/SCO/SHL/HUN) are deliberately absent —
 * they are `in` and must stay off this list.
 *
 * Verified 15 Sep 2026 against the live sydneytrains route_type "2" feed (Round 2,
 * TFNSW_API_KEY confirmed working) — these are the actual `route_short_name` values used by
 * TfNSW for the four booked NSW TrainLink corridors sharing that feed, superseding Round 1's
 * unverified CAN/MEL/BRI/GRF/DBB/ARM guess (none of which exist in the real feed):
 */
export const NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES = [
  "NRC", // NSW TrainLink North Coast — Sydney↔Brisbane (XPT)
  "NRW", // NSW TrainLink North Western — Sydney↔Moree / Armidale (Xplorer)
  "STH", // NSW TrainLink Southern — Sydney↔Canberra / Griffith / Melbourne (XPT)
  "WST", // NSW TrainLink Western — Sydney↔Dubbo / Broken Hill (Xplorer)
];

const catalogPath = join(__dirname, "../cities/sydney/stations.json");
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

function authHeaders() {
  return tfnswAuthHeaders(readTfnswApiKey());
}

export async function loadSydneyStatic() {
  const headers = authHeaders();
  const trains = await loadGtfsStatic({
    url: SYDNEY_TRAINS_STATIC_URL,
    railOnly: true,
    excludeRouteShortNames: NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES,
    timeZone: SYDNEY_TIME_ZONE,
    headers,
  });

  let merged = trains;

  try {
    const metro = await loadGtfsStatic({
      url: SYDNEY_METRO_STATIC_URL,
      routeTypes: ["1", "401"],
      timeZone: SYDNEY_TIME_ZONE,
      headers,
    });
    merged = mergeGtfsStaticData(merged, metro);
  } catch (err) {
    console.warn(`Sydney Metro static feed skipped: ${err?.message ?? err}`);
  }

  try {
    const nswtrains = await loadGtfsStatic({
      url: SYDNEY_NSWTRAINS_STATIC_URL,
      railOnly: true,
      excludeRouteShortNames: NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES,
      timeZone: SYDNEY_TIME_ZONE,
      headers,
    });
    merged = mergeGtfsStaticData(merged, nswtrains);
  } catch (err) {
    console.warn(`NSW TrainLink static feed skipped: ${err?.message ?? err}`);
  }

  return merged;
}

/** One TfNSW RT fetch per feed per instance per ~15 s, however many directions/stations ask. */
export const SYDNEY_RT_REUSE_MS = 15_000;
/** After a failed fetch, don't re-hit TfNSW for this long (or the Retry-After, if longer). */
export const SYDNEY_RT_FAILURE_BACKOFF_MS = 15_000;
/** Backoff floor after an HTTP 429 that sent no Retry-After. */
export const SYDNEY_RT_RATE_LIMIT_BACKOFF_MS = 60_000;

const RT_FEEDS = [
  { name: "sydneytrains", url: SYDNEY_TRAINS_RT_URL },
  { name: "metro", url: SYDNEY_METRO_RT_URL },
  { name: "nswtrains", url: SYDNEY_NSWTRAINS_RT_URL },
];

/** @type {{ until: number, promise: Promise<any> } | null} */
let rtCache = null;

/** Test hook: drop the shared realtime cache. */
export function resetSydneyRealtimeCache() {
  rtCache = null;
}

async function fetchSydneyRealtimeOnce() {
  const headers = authHeaders();
  const settled = await Promise.allSettled(RT_FEEDS.map((feed) => fetchTripUpdates(feed.url, { headers })));
  const ok = [];
  const failedFeeds = [];
  let backoffMs = 0;
  let firstError = null;
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      ok.push(result.value);
      return;
    }
    const err = result.reason;
    firstError ??= err;
    failedFeeds.push(RT_FEEDS[index].name);
    // A failed feed degrades only that operator's rows (they read realtime:false).
    console.warn(`Sydney ${RT_FEEDS[index].name} realtime feed skipped: ${err?.message ?? err}`);
    const floor = Number(err?.status) === 429 ? SYDNEY_RT_RATE_LIMIT_BACKOFF_MS : SYDNEY_RT_FAILURE_BACKOFF_MS;
    backoffMs = Math.max(backoffMs, floor, Number(err?.retryAfterMs) || 0);
  });
  if (ok.length === 0) {
    throw new FeedUnavailableError({
      message: `Sydney realtime unavailable: all ${RT_FEEDS.length} TfNSW feeds failed (${firstError?.message ?? "unknown"})`,
      status: Number(firstError?.status) || null,
      retryAfterMs: backoffMs || null,
      cause: firstError,
    });
  }
  // `trainsEntities`: the sydneytrains feed alone, for the snapshot drift check (see joinBoard).
  const trainsResult = settled[0].status === "fulfilled" ? settled[0].value : null;
  return { ...mergeTripUpdateEntities(ok), failedFeeds, backoffMs, trainsEntities: trainsResult?.entities ?? null };
}

/**
 * Merged TfNSW TripUpdates (sydneytrains + metro + nswtrains), shared by every caller on this
 * instance: the in-flight promise is reused for SYDNEY_RT_REUSE_MS; a failure is remembered for
 * the backoff (honouring 429 / Retry-After) rather than replayed per request. Throws
 * FeedUnavailableError only when every feed failed; one feed failing degrades just its rows.
 * @param {{ now?: number }} [options]
 * @returns {Promise<{ entities: object[], fetchedAt: Date, failedFeeds: string[] }>}
 */
export function loadSydneyRealtime({ now = Date.now() } = {}) {
  if (rtCache && now < rtCache.until) {
    return rtCache.promise;
  }
  const entry = { until: now + SYDNEY_RT_REUSE_MS, promise: null };
  entry.promise = fetchSydneyRealtimeOnce().then(
    (result) => {
      if (result.failedFeeds.length) {
        entry.until = now + Math.min(SYDNEY_RT_REUSE_MS, result.backoffMs || SYDNEY_RT_REUSE_MS);
      }
      return result;
    },
    (error) => {
      entry.until = now + Math.max(SYDNEY_RT_FAILURE_BACKOFF_MS, Number(error?.retryAfterMs) || 0);
      throw error;
    }
  );
  rtCache = entry;
  return entry.promise;
}

/**
 * Honest per-trip freshness (contract.js ProviderTrip.realtime): true only when the RT feeds said
 * something about this trip at this stop (a stop_time_update or a trip-level delay), false for a
 * timetable row. Same "confirmed" test Melbourne uses.
 */
export function annotateRealtime(trips, realtimeIndex) {
  return trips.map((trip) => ({
    ...trip,
    realtime:
      realtimeIndex.stopUpdates.has(`${trip.tripId}:${trip.stopId}`) ||
      realtimeIndex.tripDelaySec.has(trip.tripId),
  }));
}

async function resolveStopIds(stationIdOrName, staticData) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  // Only trust a catalog stopIds list once it's verified against the feed we actually
  // loaded. The 14 Sep 2026 intercity fill (docs/jim-brief-sydney-intercity-fill.md) added
  // stations whose stopIds are `nswtrains-pending-*` placeholders (no TFNSW_API_KEY in the
  // build environment to pin the real platform ids) — those never match a real stop_id, so
  // this falls through to the name-based lookup below, which resolves correctly once the
  // real feed is loaded in production. Pre-existing, already-pinned stations are unaffected:
  // their real stopIds are always present in staticData.stopsById.
  const verifiedStopIds = (catalogEntry?.stopIds ?? []).filter((id) => staticData.stopsById.has(id));
  if (verifiedStopIds.length) {
    return verifiedStopIds;
  }

  const fromGtfs = findRailStopIdsForName(staticData, catalogEntry?.name ?? stationIdOrName);
  if (fromGtfs.length > 0) {
    return fromGtfs;
  }

  if (staticData.stopsById.has(stationIdOrName)) {
    return [stationIdOrName];
  }

  throw new Error(`Unknown Sydney station: ${stationIdOrName}`);
}

/**
 * Static snapshot x live TripUpdates, shared by the full-static local path and the trimmed-snapshot
 * Vercel path so both mark `realtime` identically.
 */
async function joinBoard(stationIdOrName, staticData, now) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);
  const realtime = await loadSydneyRealtime({ now: now.getTime() });
  const realtimeIndex = indexTripUpdates(realtime.entities);
  // Drift check against the sydneytrains feed ALONE: the merged index also carries the nswtrains
  // v1 feed's third id scheme, so a resolved-share check over the merge false-positives every
  // board (measured 22 Nov 2026: 168/515 merged vs 168/229 sydneytrains). Metro ids now resolve
  // too (v2 static), but its own staleness is caught per mode at publish time
  // (lib/providers/gtfs/mode-freshness.js). Calendar coverage still applies.
  if (realtime.trainsEntities?.length) {
    checkSnapshotFreshness({
      cityId: "sydney",
      staticData,
      realtimeIndex: indexTripUpdates(realtime.trainsEntities),
      now,
      timeZone: SYDNEY_TIME_ZONE,
    });
  }
  const trips = annotateRealtime(
    buildBoardForStops({
      stopIds,
      staticData,
      realtimeIndex,
      timeZone: SYDNEY_TIME_ZONE,
      now,
      cityId: "sydney",
      skipResolvedShareCheck: true,
    }),
    realtimeIndex
  );
  return {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
  };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadSydneyStatic();
  return joinBoard(stationIdOrName, staticData, new Date());
}

/**
 * Vercel path: the trimmed blob snapshot is the static source (the full three-zip TfNSW static is
 * ~300 MB and caused the 429/OOM, docs/jim-brief-sydney-board-oom-on-429.md), joined against the
 * same live TripUpdates.
 * @param {string} stationIdOrName
 * @param {{ staticData: object, now?: Date }} options
 */
export function fetchStationBoardFromSnapshot(stationIdOrName, { staticData, now = new Date() }) {
  return joinBoard(stationIdOrName, staticData, now);
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
