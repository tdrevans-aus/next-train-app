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
 * Static GTFS: read from the next-train-gtfs Vercel Blob store (gtfsFixtureBlobUrl("copenhagen"))
 * rather than fetching Rejseplanen's full national feed on the request path — a cold
 * fetch+parse of that ~55MB national feed measured 14-19s for the first /api/directions call
 * after a cold start (docs/jim-brief-copenhagen-snapshot-trim.md, 28 Sep 2026). The published
 * snapshot is a trim of that same feed (scripts/trim-copenhagen-gtfs.mjs, no key required) down
 * to Metro in full plus S-tog/DSB/Öresundståg restricted to the four shared stations — see that
 * script's header for exactly what's kept and why nothing board-eligible is lost. Regenerate/
 * republish with `node scripts/trim-copenhagen-gtfs.mjs && node
 * scripts/publish-gtfs-fixture-to-blob.mjs copenhagen --allow-live` (--allow-live required —
 * Copenhagen is status: "live"). Gets the same runtime staleness detection as every other
 * blob-backed city for free (lib/providers/gtfs/board.js's checkSnapshotFreshness, via
 * loadGtfsStatic's ifModifiedSince caching) — no separate wiring needed here.
 *
 * Real-time (Rejseplanen API 2.0 departureBoard or SIRI-ET) is NOT wired — both require a
 * registered key (labs.rejseplanen.dk), and per this task's explicit instruction Jim does not
 * sign up for anything. Any future live-real-time path should throw
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
  resolveRejseplanenStopIds,
  MissingRejseplanenApiKeyError,
} from "./rejseplanen.js";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import {
  COPENHAGEN_HUB,
  COPENHAGEN_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  classifyDsbService,
  mapLineTerminusDestination,
  mapDsbDestination,
  resolveTerminus,
  isTerminatingAtCatalogEntry,
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

/**
 * Resolve a catalog station's GTFS stop_ids — tries the catalog's canonical `name` first (the
 * printed name Wikipedia/the D1 pack uses), then falls back to each of its `aliases` in order.
 * Needed because the live Rejseplanen feed's stop_name doesn't always fold-substring-match the
 * printed name: Lufthavnen (M2 airport terminus) is named "Københavns Lufthavn St. (Metro)" in
 * the feed, which findRailStopIdsForName's plain-substring match never finds for "Lufthavnen"
 * (missing the "en" suffix) or the pre-existing alias "Copenhagen Airport" (different language
 * entirely) — confirmed live and unrelated to the GTFS snapshot trim
 * (docs/jim-brief-copenhagen-snapshot-trim.md, 28 Sep 2026: this resolved to zero stop_ids
 * against the FULL untrimmed national feed too, so the airport station's board had been broken
 * since the 26 Sep flip with nothing catching it — copenhagen-dogfood-gate.mjs never called
 * fetchStationBoard("Lufthavnen") end to end). Fixed by adding "Københavns Lufthavn" as an
 * alias (stations.json) and this name-then-aliases fallback, so any future station/feed-name
 * mismatch degrades to trying its aliases instead of a silently empty board.
 * @param {object} staticData
 * @param {object} catalogEntry
 */
export function resolveStopIdsForCatalogEntry(staticData, catalogEntry) {
  const byName = resolveRejseplanenStopIds(staticData, catalogEntry.name);
  if (byName.length) {
    return byName;
  }
  for (const alias of catalogEntry.aliases ?? []) {
    const byAlias = resolveRejseplanenStopIds(staticData, alias);
    if (byAlias.length) {
      return byAlias;
    }
  }
  return [];
}

async function loadCopenhagenStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("copenhagen"),
    routeTypes: COPENHAGEN_ROUTE_TYPES,
    timeZone: COPENHAGEN_TIME_ZONE,
    ifModifiedSince: true,
  });
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

/**
 * The candidate string to test with isTerminatingAtCatalogEntry() — the *resolved terminus*
 * (or raw headsign fallback), never the already-mapped "Line + Terminus"/"Service + Destination"
 * marketing label (Dublin #484 lesson, docs/jim-brief-copenhagen-self-terminus.md). Returns null
 * for M3 (Cityringen, no terminus concept — see isTerminatingAtCatalogEntry's doc comment) and
 * for anything unclassified, meaning the self-terminus guard is skipped entirely for those.
 * @param {object} trip raw trip (pre-mapping)
 * @param {"Metro"|"S-tog"|"DSB/Öresundståg"|null} mapGroup
 * @param {string} code routeShortName, upper-cased
 */
function selfTerminusCandidateOf(trip, mapGroup, code) {
  if (mapGroup === "Metro") {
    if (code === "M3") {
      return null;
    }
    return resolveTerminus(trip.destination, code) ?? trip.destination;
  }
  if (mapGroup === "S-tog") {
    return resolveTerminus(trip.destination, code) ?? trip.destination;
  }
  if (mapGroup === "DSB/Öresundståg") {
    return trip.destination;
  }
  return null;
}

function mapCopenhagenTrip(trip) {
  const mapGroup = mapGroupOf(trip);
  const code = String(trip.routeShortName || "").trim().toUpperCase();
  const rawDestination = trip.destination;
  const destination =
    mapGroup === "DSB/Öresundståg"
      ? mapDsbDestination(rawDestination, classifyDsbService(trip))
      : mapLineTerminusDestination(rawDestination, code, mapGroup);
  const selfTerminusCandidate = selfTerminusCandidateOf(trip, mapGroup, code);
  return { ...trip, mapGroup, rawDestination, destination, selfTerminusCandidate };
}

/**
 * Classification/mapping/self-terminus filtering, applied to the raw per-stop trips
 * buildBoardForStops() returns. Extracted as its own exported function so
 * qa/copenhagen-dogfood-gate.mjs can regression-test this exact pipeline end-to-end with a
 * synthetic fixture, same shape as Dublin's classifyAndFilterDublinTrips() (#484).
 * @param {object[]} rawTrips
 * @param {object} catalogEntry
 */
export function classifyAndFilterCopenhagenTrips(rawTrips, catalogEntry) {
  return rawTrips
    .filter((trip) => tripAllowed(trip, catalogEntry))
    .map(mapCopenhagenTrip)
    .filter((trip) => !isTerminatingAtCatalogEntry(trip.selfTerminusCandidate, catalogEntry));
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
  const stopIds = resolveStopIdsForCatalogEntry(staticData, catalogEntry);
  if (!stopIds.length) {
    throw new Error(`Unknown Copenhagen station: ${stationIdOrName}`);
  }

  const rawTrips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: EMPTY_REALTIME_INDEX,
    timeZone: COPENHAGEN_TIME_ZONE,
    now: options.now,
    horizonMinutes: options.horizonMinutes ?? NEAR_HORIZON_MINUTES,
  });
  const trips = classifyAndFilterCopenhagenTrips(rawTrips, catalogEntry);

  return {
    stationName: catalogEntry.name,
    lastUpdate: new Date().toISOString(),
    trips,
    /** GTFS static only — no Rejseplanen API 2.0/SIRI-ET key wired, see file header. */
    realtime: false,
  };
}

export { tripAllowed, mapGroupOf };
