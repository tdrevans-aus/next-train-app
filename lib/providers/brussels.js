/**
 * Brussels (STIB/MIVB) metro — static GTFS schedule board.
 * Adapter ready; city remains `planned` (not live) — see docs/brussels-d1/jim-handoff.md.
 * assertCityLive("brussels") must still fail until Tim flips the registry entry.
 *
 * Static GTFS (no key, anonymous 200, confirmed 31 Aug 2026):
 *   GET https://opendata-discovery-gtfs-static.api.production.belgianmobility.io/api/gtfs/feed/stibmivb/static
 * route_type "1" = metro. route_short_name "1"/"2"/"5"/"6" match docs/brussels-d1 exactly
 * (route_long_name GARE DE L'OUEST - STOCKEL / SIMONIS - ELISABETH / ERASME - HERRMANN-DEBROUX /
 * ROI BAUDOUIN - ELISABETH). agency_id "STIB/MIVB".
 *
 * Live JSON blocker (STIB_API_KEY, header Ocp-Apim-Subscription-Key, confirmed accepted by
 * the Azure APIM gateway — requests 404 with the gateway's generic "Resource not found" body
 * rather than 401, so the key itself is valid): the exact BMC Waiting Time / Vehicle Positions
 * operation path could not be confirmed this session. The developer portal
 * (https://api-management-opendata-production.developer.azure-api.net/apis) is a
 * client-side-rendered SPA — its API listing loads via an in-browser fetch this environment
 * cannot execute, so the operation path is not visible in the served HTML. Tried and
 * confirmed NOT the path (404 "Resource not found" from the gateway, or DNS ENOTFOUND):
 * `/api/datasets/WaitingTimes.json`, several `/opendata/api/v1/...`, `/stib-mivb/...`,
 * `/OperationMonitoring/4.0/PassingTimeByPoint/{id}` (legacy STIB path — its host
 * `opendata-api.stib-mivb.be` no longer resolves), and several `belgianmobility.io`
 * discovery-host variants modelled on the static feed's own hostname pattern. This board
 * ships schedule-only (GTFS static, no realtime index) until the real operation path is
 * confirmed — same posture as Göteborg's `vt` board before Trafiklab published TripUpdates.
 * Do not guess further paths against a personal, non-transferable key (BMC ToU §5).
 *
 * v1 scope (docs/brussels-d1/hazard-pack.md, direction-model-memo.md, jim-handoff.md): metro
 * 1, 2, 5, 6 only. No tram, no premetro/North-South Axis, no CHRONO, no SNCB/NMBS, no bus, no
 * De Lijn, no TEC. No passenger metro 3 or 4 (Albert-Bordet is a frozen project). Hub lock
 * Arts-Loi / Kunst-Wet (metro 1x2x5x6, through-cross) is a stop string only, never a direction
 * token. Simonis and Elisabeth are two distinct line-2 terminus chips, never collapsed.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { buildBoardForStops, NEAR_HORIZON_MINUTES } from "./gtfs/board.js";
import {
  BRUSSELS_HUB,
  BRUSSELS_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  marketingLabel,
  resolveTerminus,
} from "../cities/brussels/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { BRUSSELS_HUB };
export const BRUSSELS_TIMEZONE = BRUSSELS_TIME_ZONE;
export const STIB_GTFS_STATIC_URL =
  "https://opendata-discovery-gtfs-static.api.production.belgianmobility.io/api/gtfs/feed/stibmivb/static";
/** route_type=1 (metro) short names — docs/brussels-d1 hazard-pack.md H3 (no metro 3/4). */
export const BRUSSELS_METRO_SHORT_NAMES = ["1", "2", "5", "6"];

const EMPTY_REALTIME_INDEX = {
  tripDelaySec: new Map(),
  stopUpdates: new Map(),
  cancelledTrips: new Set(),
};

const catalogPath = join(__dirname, "../cities/brussels/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

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

export async function loadBrusselsStatic() {
  return loadGtfsStatic({
    url: STIB_GTFS_STATIC_URL,
    routeTypes: ["1"],
    includeRouteShortNames: BRUSSELS_METRO_SHORT_NAMES,
    agencyIds: ["STIB/MIVB"],
    timeZone: BRUSSELS_TIME_ZONE,
    ifModifiedSince: true,
  });
}

function tripAllowed(trip) {
  const shortName = String(trip.routeShortName || "").trim();
  return BRUSSELS_METRO_SHORT_NAMES.includes(shortName);
}

/**
 * @param {string} stationIdOrName Catalog name, FR/NL alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stopIds = catalogEntry?.stopIds ?? [];
  if (!stopIds.length) {
    throw new Error(`Unknown Brussels station: ${stationIdOrName}`);
  }

  const stationKey = foldKey(catalogEntry?.name ?? stationIdOrName);

  const staticData = await loadBrusselsStatic();
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: EMPTY_REALTIME_INDEX,
    timeZone: BRUSSELS_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes ?? NEAR_HORIZON_MINUTES,
  })
    .filter(tripAllowed)
    .map((trip) => {
      const terminus = resolveTerminus(trip.destination, trip.routeShortName);
      if (!terminus) {
        // Overlay/short-turn/depot headsign (e.g. RESERVE, DELACROIX, DELTA) — not one of
        // the four lines' official termini (hazard-pack.md H5: shortTurns empty on all
        // four v1 lines). Drop rather than fabricate a chip.
        return null;
      }
      // Self-referential arrival: a trip whose only remaining stop_time is the terminus
      // itself (e.g. a line-2 trip signed "SIMONIS" read at the Simonis platform) is the
      // train ending its run here, not a valid "board this to go toward Simonis" chip —
      // same self-referential-hub pattern as Oslo's R21-vs-Oslo-S flag / Malmö's
      // Malmöringen self-reference at Malmö C.
      if (foldKey(terminus) === stationKey) {
        return null;
      }
      return { ...trip, destination: marketingLabel(trip.routeShortName, terminus) };
    })
    .filter(Boolean);

  return {
    stationName: catalogEntry?.name ?? String(stationIdOrName),
    lastUpdate: new Date().toISOString(),
    trips,
    /** GTFS static only — no confirmed live JSON operation path yet, see file header. */
    realtime: false,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

export { resolveCatalogEntry };
