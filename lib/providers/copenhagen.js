/**
 * Copenhagen — Metroselskabet (Metro M1-M4) + S-tog (DSB) + DSB Regional/InterCity/
 * InterCityLyn + Öresundståg (Skånetrafiken co-branded), all via the shared Rejseplanen
 * national platform (lib/providers/rejseplanen.js). Copenhagen is a *config* (allow-list +
 * direction model) over that shared provider per docs/denmark-ledger.md's provider decision —
 * same architecture as the UK/Darwin regions (lib/providers/cumbria.js over
 * lib/providers/uk-darwin.js), not a per-city clone.
 * Adapter ready; city remains `planned` (not live) — see docs/copenhagen-d1/jim-handoff.md.
 * assertCityLive("copenhagen") must still fail until Tim flips the registry entry.
 *
 * Static GTFS only (no key required): https://www.rejseplanen.info/labs/GTFS.zip. Real-time
 * (Rejseplanen API 2.0 departureBoard or SIRI-ET) is NOT wired — both require a registered
 * key (labs.rejseplanen.dk), and per this task's explicit instruction Jim does not sign up
 * for anything. Any future live-real-time path should throw
 * MissingRejseplanenApiKeyError (re-exported below) rather than silently degrade. This board
 * ships schedule-only, same posture as lib/providers/brussels.js before its live JSON path
 * was confirmed.
 *
 * v1 scope (docs/copenhagen-d1/hazard-pack.md, direction-model-memo.md, oracle-clash-report.md
 * Board eligibility section): Metro M1-M4 (44 stations, full network) PLUS S-tog (A, B, Bx, C,
 * E, H, F) PLUS DSB Regional/InterCity/InterCityLyn PLUS Öresundståg, the latter three scoped
 * ONLY to the four named shared stations (Nørreport, Nørrebro, København H, Nordhavn) — not
 * the full S-tog/DSB network. No buses, no harbour ferries, no DSB EuroCity
 * (out-reservation), no SJ/České dráhy (calls observed at København H but NOT
 * board-eligibility-verdicted by the oracle report — excluded pending that verdict, not a
 * decided "out", see hazard-pack.md H3).
 *
 * Hub lock: Kongens Nytorv (Metro-only, all four lines, confirmed zero rail/S-tog transfer).
 * doNotGroup, per hazard-pack.md H1/H2: Nørreport (Metro M1/M2 vs S-tog 6 lines vs
 * DSB/Öresundståg, three-way, widest single-node surface), Nørrebro (Metro M3 vs S-tog F
 * only, two-way, simplest), København H (Metro M3/M4 vs S-tog 6 lines vs DSB/Öresundståg vs
 * EuroCity-excluded, four-way, widest overall), Nordhavn (Metro M4 vs S-tog 5-of-6 lines
 * sharing one island platform — A/B/Bx/C/E, NOT H per the H2 correction against the oracle
 * report — two-way, highest single-platform line count).
 *
 * Filtering caveat (unverified against a live payload — hazard-pack.md items 5-6, "verify
 * against the live feed at D2"): this feed has no confirmed exact route_type/agency_id values
 * separating Metro/S-tog/DSB/Öresundståg, so filtering here uses route_short_name allow-lists
 * for Metro and S-tog (both have real passenger-facing line codes) plus a route_long_name/
 * route_desc regex heuristic for DSB/Öresundståg (classifyDsbService, which has none) — see
 * lib/cities/copenhagen/marketing-directions.js. Confirm both against a real GTFS pull before
 * any live flip.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { buildBoardForStops, NEAR_HORIZON_MINUTES } from "./gtfs/board.js";
import {
  loadRejseplanenStatic,
  resolveRejseplanenStopIds,
  MissingRejseplanenApiKeyError,
} from "./rejseplanen.js";
import {
  COPENHAGEN_HUB,
  COPENHAGEN_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  classifyDsbService,
  mapLineTerminusDestination,
  mapDsbDestination,
} from "../cities/copenhagen/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export { COPENHAGEN_HUB, MissingRejseplanenApiKeyError };
export const COPENHAGEN_TIMEZONE = COPENHAGEN_TIME_ZONE;

/** Metro line codes — full network, all 44 stations (hazard-pack.md H4). */
export const METRO_CODES = new Set(["M1", "M2", "M3", "M4"]);
/** S-tog line letters — scoped per-station via each catalog entry's sharedOperators.stog. */
export const STOG_CODES = new Set(["A", "B", "BX", "C", "E", "H", "F"]);

/**
 * Extended GTFS route_type codes plausibly covering Metro (subway, "1") and heavy/regional
 * rail (S-tog/DSB/Öresundståg, "2", plus the extended "100"/"106"/"109" codes seen on other
 * Nordic feeds — lib/providers/malmo.js MALMO_ROUTE_TYPES precedent). Unconfirmed for
 * Rejseplanen specifically; excludes bus ("3") and ferry ("4") at the parse level as a first
 * pass, on top of the route_short_name/service-type allow-lists applied per trip below.
 */
export const COPENHAGEN_ROUTE_TYPES = ["1", "2", "100", "106", "109"];

const EMPTY_REALTIME_INDEX = {
  tripDelaySec: new Map(),
  stopUpdates: new Map(),
  cancelledTrips: new Set(),
};

const catalogPath = join(__dirname, "../cities/copenhagen/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));

export function resolveCatalogEntry(stationIdOrName) {
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
  }
  return null;
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

async function loadCopenhagenStatic() {
  return loadRejseplanenStatic({ routeTypes: COPENHAGEN_ROUTE_TYPES });
}

/**
 * Which mapGroup a trip belongs to, or null if out of v1 scope entirely (bus, tram, ferry,
 * EuroCity/SJ/České dráhy — none of which match a Metro/S-tog code or classifyDsbService()).
 * @param {{ routeShortName?: string, routeLongName?: string, routeDesc?: string }} trip
 */
function mapGroupOf(trip) {
  const code = String(trip.routeShortName || "").trim().toUpperCase();
  if (METRO_CODES.has(code)) {
    return "Metro";
  }
  if (STOG_CODES.has(code)) {
    return "S-tog";
  }
  return classifyDsbService(trip) ? "DSB/Öresundståg" : null;
}

/**
 * @param {object} trip
 * @param {object} stationEntry catalog entry (may be null for a raw GTFS-name lookup)
 */
function tripAllowed(trip, stationEntry) {
  const mapGroup = mapGroupOf(trip);
  if (!mapGroup) {
    return false;
  }
  if (mapGroup === "Metro") {
    return true;
  }
  if (mapGroup === "S-tog") {
    const code = String(trip.routeShortName || "").trim().toUpperCase();
    return (stationEntry?.sharedOperators?.stog ?? []).includes(code);
  }
  const service = classifyDsbService(trip);
  return (stationEntry?.sharedOperators?.dsbOresundstag ?? []).includes(service);
}

function mapCopenhagenTrip(trip) {
  const mapGroup = mapGroupOf(trip);
  const code = String(trip.routeShortName || "").trim().toUpperCase();
  const destination =
    mapGroup === "DSB/Öresundståg"
      ? mapDsbDestination(trip.destination, classifyDsbService(trip))
      : mapLineTerminusDestination(trip.destination, code, mapGroup);
  return { ...trip, mapGroup, destination };
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or raw Rejseplanen GTFS name
 * @param {{ now?: Date, horizonMinutes?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  if (!catalogEntry) {
    throw new Error(`Unknown Copenhagen station: ${stationIdOrName}`);
  }

  const staticData = await loadCopenhagenStatic();
  const stopIds = resolveRejseplanenStopIds(staticData, catalogEntry.name);
  if (!stopIds.length) {
    throw new Error(`Unknown Copenhagen station: ${stationIdOrName}`);
  }

  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: EMPTY_REALTIME_INDEX,
    timeZone: COPENHAGEN_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes ?? NEAR_HORIZON_MINUTES,
  })
    .filter((trip) => tripAllowed(trip, catalogEntry))
    .map(mapCopenhagenTrip);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    /** GTFS static only — no Rejseplanen API 2.0/SIRI-ET key wired, see file header. */
    realtime: false,
  };
}

export { tripAllowed, mapGroupOf };
