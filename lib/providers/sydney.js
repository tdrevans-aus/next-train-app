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
import { buildBoardForStops } from "./gtfs/board.js";
import { tfnswAuthHeaders, readTfnswApiKey } from "./gtfs/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SYDNEY_TIME_ZONE = "Australia/Sydney";

/** Pinned TfNSW Sydney Trains static GTFS. */
export const SYDNEY_TRAINS_STATIC_URL =
  "https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains";

/** Pinned TfNSW Sydney Metro static GTFS. */
export const SYDNEY_METRO_STATIC_URL = "https://api.transport.nsw.gov.au/v1/gtfs/schedule/metro";

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
 */
export const NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES = [
  "CAN", // XPT — Canberra
  "MEL", // XPT — Melbourne (via Albury)
  "BRI", // XPT — Brisbane (via Casino)
  "GRF", // Xplorer/XPT — Casino/Grafton (North Coast beyond Dungog)
  "DBB", // Xplorer — Dubbo
  "ARM", // Xplorer — Armidale/Moree
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

async function loadSydneyRealtime() {
  const headers = authHeaders();
  const trains = await fetchTripUpdates(SYDNEY_TRAINS_RT_URL, { headers });

  let metro = { entities: [], fetchedAt: trains.fetchedAt };
  try {
    metro = await fetchTripUpdates(SYDNEY_METRO_RT_URL, { headers });
  } catch (err) {
    console.warn(`Sydney Metro realtime feed skipped: ${err?.message ?? err}`);
  }

  let nswtrains = { entities: [], fetchedAt: trains.fetchedAt };
  try {
    nswtrains = await fetchTripUpdates(SYDNEY_NSWTRAINS_RT_URL, { headers });
  } catch (err) {
    console.warn(`NSW TrainLink realtime feed skipped: ${err?.message ?? err}`);
  }

  return mergeTripUpdateEntities([trains, metro, nswtrains]);
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
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 */
export async function fetchStationBoard(stationIdOrName) {
  const staticData = await loadSydneyStatic();
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = await resolveStopIds(stationIdOrName, staticData);

  const realtime = await loadSydneyRealtime();
  const realtimeIndex = indexTripUpdates(realtime.entities);

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex,
    timeZone: SYDNEY_TIME_ZONE,
    cityId: "sydney",
  });

  return {
    stationName: catalogEntry?.name ?? stationIdOrName,
    lastUpdate: realtime.fetchedAt.toISOString(),
    trips,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
