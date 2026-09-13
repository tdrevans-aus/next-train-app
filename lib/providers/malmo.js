/**
 * Malmö (Skånetrafiken / Pågatågen) — Trafiklab GTFS Regional `skane`.
 * Adapter ready; city remains `planned` (not live) — see docs/malmo-d1/jim-handoff.md.
 *
 * Static: a Vercel Blob snapshot (gtfsFixtureBlobUrl("malmo")) published from Trafiklab
 * GTFS Regional `skane` (TRAFIKLAB_API_KEY) by scripts/publish-gtfs-snapshot-to-blob.mjs —
 * never fetched from Trafiklab directly on the request path, which 429'd under normal
 * cold-start traffic (see docs/jim-brief-sweden-static-429-and-key-leak.md).
 * Realtime TripUpdates (TRAFIKLAB_API_KEY_RT — separate Trafiklab key product from the
 * static key, see gtfs/auth.js): https://opendata.samtrafiken.se/gtfs-rt/skane/TripUpdates.pb?key=…
 * Key-scope caveat (docs/malmo-d1/hazard-pack.md item H2): unverified end-to-end from this
 * machine as of the D1 pack — both keys are Vercel-only. tripUpdatesUrl construction is wrapped
 * in try/catch so a missing/scope-denied key degrades to a schedule-only board, not a crash.
 *
 * v1 scope (revised 30 Aug 2026 per docs/board-eligibility-rule.md — Tim's product decision,
 * see docs/malmo-d1/oracle-clash-report.md "Board eligibility"): Pågatågen regional rail
 * (route_long_name prefix "Pågatåg", which also covers PågatågenExpress) PLUS Öresundståg and
 * Krösatågen — both walk-up, fixed-price, buy-and-board (no compulsory reservation), so both
 * are `in` under the walk-up rule. Skånetrafiken files these two under the GTFS route_desc
 * column, not route_long_name — confirmed 30 Aug 2026 by a live read of skane.zip (route_desc
 * "Öresundståg" / "Krösatåg"; route_short_names 802–808 for Öresundståg). Snälltåget stays
 * excluded (`out-reservation`, compulsory seat reservation). No bus, no light rail. doNotGroup
 * at Malmö C/Triangeln/Hyllie/Burlöv now means Pågatågen and Öresundståg appear as distinct
 * service entries at the same physical stop, not that either is hidden.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic, findRailStopIdsForName } from "./gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "./gtfs/blob-fixtures.js";
import { fetchGtfsRealtimeBoard } from "./gtfs/realtime-board.js";
import { trafiklabGtfsRtTripUpdatesUrl } from "./gtfs/auth.js";
import {
  MALMO_HUB,
  MALMO_TIME_ZONE,
  foldKey,
  isForbiddenCollapseName,
  mapMalmoDestination,
  loadLineMap,
} from "../cities/malmo/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MALMO_TIMEZONE = MALMO_TIME_ZONE;
export const MALMO_OPERATOR = "skane";
/** Extended GTFS route types seen on Swedish regional rail feeds (rail + regional rail). */
export const MALMO_ROUTE_TYPES = ["2", "100", "106"];
/** GTFS route_long_name prefix that identifies Pågatåg trips (incl. PågatågenExpress). */
const PAGATAG_PREFIX = /^p[åa]gat[åa]g/i;
/**
 * Not every Pågatåg route carries "Pågatåg" as its route_long_name prefix — some (confirmed
 * live 2026-08-30, e.g. "Kävlinge- Lomma- Malmö C övre") use a corridor-description long name
 * instead, with the product name only in route_desc, same as Öresundståg/Krösatågen. Both
 * forms must be recognised or Pågatåg trips silently vanish from stations where only the
 * corridor-description form is used (this was Malmö C's entire board before this fix).
 */
const PAGATAG_DESC = /^p[åa]gat[åa]g/i;
/**
 * Öresundståg and Krösatågen are filed under route_desc, not route_long_name — see the v1
 * scope note above. Both pass docs/board-eligibility-rule.md's walk-up test, so both are `in`.
 */
const ORESUNDSTAG_DESC = /^[öo]resundst[åa]g/i;
const KROSATAG_DESC = /^kr[öo]sat[åa]g/i;

/** Returns the malmoLineId product token for route_desc-only products, or null for Pågatåg. */
function productLineId(trip) {
  const desc = String(trip.routeDesc || "");
  if (ORESUNDSTAG_DESC.test(desc)) {
    return "oresundstag";
  }
  if (KROSATAG_DESC.test(desc)) {
    return "krosatagen";
  }
  return null;
}

const catalogPath = join(__dirname, "../cities/malmo/stations.json");
const stationCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const lineMap = loadLineMap();

/** Ring stations — used to detect the self-referential Malmöringen direction. */
const RING_STATION_KEYS = new Set(
  (lineMap.lines.find((line) => line.id === "malmoringen")?.stations ?? []).map(foldKey)
);

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
 * Best-effort line id for a board trip. The GTFS feed carries no passenger-facing line
 * codes (one route per train number — docs/malmo-d1/oracle-clash-report.md), so this is a
 * headsign/route heuristic, not a stop-pattern match: `pagatagen-express` when the route
 * name says so, `malmoringen` when the headsign is Kävlinge-bound or self-referential at a
 * ring station, `pagatagen` otherwise. D5 (assert per-trip far ends from the live feed) is
 * the documented follow-up — see hazard-pack.md H5.
 */
function malmoLineId(trip, stationName) {
  const product = productLineId(trip);
  if (product) {
    return product;
  }
  const routeLongName = String(trip.routeLongName || "");
  if (/express/i.test(routeLongName)) {
    return "pagatagen-express";
  }
  const dest = String(trip.destination || "");
  if (/kavlinge/.test(foldKey(dest))) {
    return "malmoringen";
  }
  const foldedDest = foldKey(dest);
  const selfReferential = foldedDest === foldKey(MALMO_HUB) || foldedDest === "malmo central";
  if (selfReferential && RING_STATION_KEYS.has(foldKey(stationName || ""))) {
    return "malmoringen";
  }
  return "pagatagen";
}

function tripAllowed(trip) {
  if (PAGATAG_PREFIX.test(String(trip.routeLongName || ""))) {
    return true;
  }
  if (PAGATAG_DESC.test(String(trip.routeDesc || ""))) {
    return true;
  }
  return productLineId(trip) !== null;
}

export async function loadMalmoStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("malmo"),
    routeTypes: MALMO_ROUTE_TYPES,
    timeZone: MALMO_TIME_ZONE,
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
  throw new Error(`Unknown Malmö station: ${stationIdOrName}`);
}

/**
 * @param {string} stationIdOrName Catalog name, alias, or GTFS stop_id
 * @param {{ now?: Date, horizonMinutes?: number }} [options]
 */
export async function fetchStationBoard(stationIdOrName, options = {}) {
  const catalogEntry = resolveCatalogEntry(stationIdOrName);
  const stationName = catalogEntry?.name ?? stationIdOrName;

  let tripUpdatesUrl = "";
  try {
    tripUpdatesUrl = trafiklabGtfsRtTripUpdatesUrl(MALMO_OPERATOR);
  } catch {
    tripUpdatesUrl = "";
  }

  const board = await fetchGtfsRealtimeBoard(stationIdOrName, {
    loadStatic: loadMalmoStatic,
    resolveStopIds,
    resolveCatalogEntry,
    tripUpdatesUrl,
    timeZone: MALMO_TIME_ZONE,
    cityId: "malmo",
    // Skånetrafiken's per-operator Trafiklab feed is multimodal (bus + rail);
    // the static snapshot here is trimmed to rail route_types only, so most
    // "unresolved" realtime trip IDs are out-of-scope buses, not drift.
    // Calendar coverage is still checked.
    skipResolvedShareCheck: true,
    now: options.now,
    horizonMinutes: options.horizonMinutes,
    fallbackStationName: MALMO_HUB,
    filterTrip: tripAllowed,
    mapTrip(trip) {
      const lineId = malmoLineId(trip, stationName);
      // Many trips (Öresundståg/Krösatågen, and the corridor-description style of
      // Pågatåg — e.g. route_long_name "Kävlinge- Lomma- Malmö C övre") have no
      // trip_headsign, so the shared resolveDestination() helper falls back to the raw
      // route_long_name — a corridor description, not a terminus. When that's happened
      // (destination === routeLongName) and a per-stop stop_headsign is available, prefer
      // it — it gives a real terminus (e.g. "Østerport", "Helsingborg C"). Confirmed live
      // 2026-08-30.
      const fellBackToRouteLongName =
        trip.destination && trip.destination === trip.routeLongName;
      const rawDestination =
        fellBackToRouteLongName && trip.stopHeadsign ? trip.stopHeadsign : trip.destination;
      return {
        ...trip,
        lineId,
        destination: mapMalmoDestination(rawDestination, lineId, stationName),
      };
    },
  });

  return {
    stationName: board.stationName,
    lastUpdate: board.lastUpdate,
    trips: board.trips,
    realtime: board.realtime === true,
    nextServiceDate: board.nextServiceDate ?? null,
  };
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Exported for QA (qa/malmo-planned-gate.mjs) — same pattern as resolveCatalogEntry below. */
export { MALMO_HUB, resolveCatalogEntry, tripAllowed, malmoLineId };
