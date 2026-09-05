/**
 * North East (Tyne and Wear) — Tyne and Wear Metro (light rail) + National
 * Rail slice. Adapter is structural; city stays `planned` in registry.js
 * (Tim's flip call).
 *
 * Two agencies, two direction models, one hub lock, plus a genuinely
 * different third case at Sunderland:
 *  - Tyne and Wear Metro: schedule-only v1 per docs/north-east-d1/. Line +
 *    terminus ("Green + South Hylton"), same shape as every reference pack.
 *    UNLIKE East Midlands' NET / South Yorkshire's Supertram, the static
 *    GTFS genuinely exists for this operator — Jim's D2 pull of the DFT Bus
 *    Open Data no-key bulk archive (agency_id OP241, "Tyne and Wear Metro")
 *    confirmed real route/trip/stop_times data for both lines and closed the
 *    D1 pack's intermediate-stop-order gap (Green 31 stations, Yellow 41
 *    unique stations, both matching the oracle report's counts exactly —
 *    see lib/cities/north-east/marketing-directions.js and stations.json).
 *
 *    BUT a third, distinct kind of gap sits between "no source" and "account
 *    blocked": the confirmed source cannot currently be ingested by our
 *    infra. The DFT bulk archive's stop_times.txt is ~5.4GB uncompressed
 *    (whole-UK bus network, hundreds of millions of rows) — loadGtfsStatic()
 *    in lib/providers/gtfs/static-cache.js decodes each GTFS table as one
 *    JS string before parsing (readZipText -> TextDecoder.decode), and V8's
 *    string length ceiling is ~536,870,888 UTF-16 units (Node's
 *    ERR_STRING_TOO_LONG). Verified directly: `new TextDecoder().decode()`
 *    on this file throws that error every time, deterministically — not a
 *    timeout or a flaky network condition. No smaller no-key per-operator
 *    download exists (the BODS per-dataset API needs an API key; checked 31
 *    Aug 2026, 401 without one). Fixing this needs a streaming/row-filtering
 *    GTFS parser in the shared static-cache.js helper (used by ~10 other
 *    live cities) — out of scope for a single region's adapter to build.
 *    fetchMetroStopBoard() below throws MetroGtfsTooLargeError immediately
 *    (does not attempt the download) rather than silently failing or
 *    fabricating a schedule — same "throw, don't guess" contract as
 *    NetFeedUnconfirmedError / SupertramFeedUnconfirmedError, for a
 *    genuinely different underlying reason. No public real-time feed exists
 *    for Metro either (the only candidate, metro-rti.nexus.org.uk, is
 *    undocumented/app-only) — moot until the static-parsing gap closes.
 *
 *    UPDATE (5 Sep 2026): the streaming parser landed in PR #253
 *    (lib/providers/gtfs/static-cache.js no longer decodes a whole GTFS
 *    table as one JS string) — MetroGtfsTooLargeError is NOT lifted here;
 *    that's a deliberately separate, small follow-up PR once the ~1.46GB
 *    download is proven in a real run.
 *  - National Rail: Darwin/OpenLDBWS, reused from lib/providers/uk-darwin.js
 *    with regionId "north-east" — same allow-list + direction-model config
 *    pattern as uk-west-midlands / uk-ellesmere-port / east-midlands /
 *    south-yorkshire. BLOCKED at the account level (DARWIN_LDB_TOKEN not
 *    set) — same blocker as those regions, not a feed problem. Do not wire
 *    the token here; that's Tim's RDM re-registration.
 *
 * Hub lock: Newcastle Central (NCL CRS). Metro Central is a deep-tube
 * station directly below the National Rail main-line platforms — doNotGroup,
 * modelled as two catalog entries with DIFFERENT printed names ("Newcastle
 * Central" for National Rail, "Central Station" for Metro, per GTFS
 * stop_name) — no name-collapse risk since the strings differ. Separate
 * infrastructure, separate operators, no walk-through connection named in
 * the oracle report.
 *
 * Sunderland is a materially different case — NOT doNotGroup. Metro Green
 * Line and National Rail Northern Trains share the same platforms/track
 * between Pelaw and Sunderland (a real shared-boarding-area case). Modelled
 * as a single conceptual shared-platform station
 * (SUNDERLAND_SHARED_PLATFORM in marketing-directions.js), still catalogued
 * as two mode-tagged entries here (train CRS SUN, live-verified 5 Sep 2026 —
 * see docs/jim-brief-uk-crs-sweep-2.md; previously catalogued with no CRS
 * given, metro Green Line stop) because Darwin and GTFS are genuinely
 * separate data sources, but
 * flagged everywhere as NOT a doNotGroup pair — a future board-merging pass
 * (not built here; both feeds are currently blocked/RT-less) must mix them
 * on one board, not split them into tabs. See docs/north-east-d1/
 * direction-model-memo.md and hazard-pack.md H1.
 *
 * Pelaw is a Metro-only through-running junction (both lines call it,
 * confirmed by GTFS), not a separate National Rail station.
 *
 * Berwick-upon-Tweed (BWK) is National Rail-only, included per the oracle
 * report; the Rest-of-Scotland boundary north of it is open/unresolved.
 * Darlington (DRL) is deliberately excluded — confirmed unclaimed by both
 * this pack and East Midlands' own already-merged pack.
 *
 * loadMetroStatic() is kept (not deleted) below — it is what Jim used to
 * confirm the real station/route data documented above and is exactly what
 * a future streaming-parser fix would call once static-cache.js supports
 * one; fetchMetroStopBoard() deliberately does NOT call it today (see
 * MetroGtfsTooLargeError below) so this file doesn't attempt a doomed
 * ~1.46GB download on every request.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadGtfsStatic } from "./gtfs/static-cache.js";
import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  listMetroStops,
  resolveRailEntry,
  resolveMetroEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";
import {
  NORTH_EAST_HUB,
  METRO_HUB_STATION_NAME,
  METRO_LINES,
  SUNDERLAND_SHARED_PLATFORM,
  PELAW_JUNCTION,
  marketingLabelsForStation,
  mapMetroDestination,
  linesForStation,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/north-east/marketing-directions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const NORTH_EAST_TIME_ZONE = "Europe/London";
export const NORTH_EAST_REGION = "north-east";

/**
 * No smaller no-key GTFS download exists for this operator (see file
 * header) — this is the confirmed public DFT Bus Open Data Service
 * aggregator, filtered at parse time to agency_id OP241 (Tyne and Wear
 * Metro) and route_type 1 (light rail).
 */
export const NORTH_EAST_METRO_GTFS_STATIC_URL =
  "https://data.bus-data.dft.gov.uk/timetable/download/gtfs-file/all/";
export const TYNE_AND_WEAR_METRO_AGENCY_ID = "OP241";

const metroStopsPath = join(__dirname, "../cities/north-east/metro-stops.json");
const metroStopIdsByStation = JSON.parse(readFileSync(metroStopsPath, "utf8")).stopIdsByStation ?? {};

export class MetroGtfsTooLargeError extends Error {
  constructor(stationIdOrName) {
    super(
      `Tyne and Wear Metro's confirmed static GTFS source cannot currently be parsed — ${stationIdOrName} board cannot be built. ` +
        "The DFT Bus Open Data bulk archive (the only no-key public download; no smaller per-operator feed exists) " +
        "has a ~5.4GB uncompressed stop_times.txt, which exceeds the ~537M UTF-16 unit string limit " +
        "lib/providers/gtfs/static-cache.js's whole-zip TextDecoder.decode() step can handle (Node ERR_STRING_TOO_LONG, " +
        "verified deterministic, not a timeout/flaky-network condition). Real route/station data was confirmed by " +
        "directly parsing the archive with a streaming CSV reader during D2 (see lib/providers/north-east.js file " +
        "header and lib/cities/north-east/marketing-directions.js) — the data exists, the shared helper just cannot " +
        "ingest a feed this large yet. Needs a streaming/row-filtering parser in static-cache.js (shared by ~10 other " +
        "live cities) before this can move past this error."
    );
    this.name = "MetroGtfsTooLargeError";
  }
}

/**
 * Kept for documentation/future use, NOT called by fetchMetroStopBoard()
 * today — see MetroGtfsTooLargeError above for why calling this would
 * deterministically throw ERR_STRING_TOO_LONG on the current shared parser.
 * Exported so a future streaming-parser fix (or a manual verification run,
 * as Jim did for D2) can call it directly without re-deriving the URL/filter
 * config.
 */
export async function loadMetroStatic() {
  return loadGtfsStatic({
    url: NORTH_EAST_METRO_GTFS_STATIC_URL,
    agencyIds: [TYNE_AND_WEAR_METRO_AGENCY_ID],
    routeTypes: ["1"],
    timeZone: NORTH_EAST_TIME_ZONE,
    ifModifiedSince: true,
  });
}

/**
 * @param {string} stationIdOrName
 * @param {"train"|"metro"} [mode]
 */
export function resolveCatalogEntry(stationIdOrName, mode) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  if (mode === "train") {
    return resolveRailEntry(raw, NORTH_EAST_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, NORTH_EAST_REGION);
  }
  return resolveRailEntry(raw, NORTH_EAST_REGION) ?? resolveMetroEntry(raw, NORTH_EAST_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(NORTH_EAST_REGION, options);
}

export function listMetroStopsForRegion() {
  return listMetroStops(NORTH_EAST_REGION);
}

export function listNationalRailStations() {
  return listRailStations(NORTH_EAST_REGION);
}

function resolveMetroStopIds(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, NORTH_EAST_REGION);
  const canonicalName = entry?.name ?? String(stationIdOrName ?? "").trim();
  const needle = foldKey(canonicalName);
  for (const [name, stopIds] of Object.entries(metroStopIdsByStation)) {
    if (foldKey(name) === needle) {
      return { name, stopIds };
    }
  }
  return { name: canonicalName, stopIds: [] };
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: NORTH_EAST_REGION });
}

/**
 * Metro board — NOT implemented. See MetroGtfsTooLargeError / file header:
 * the confirmed GTFS source exists but cannot currently be parsed by the
 * shared static-cache.js helper (deterministic ERR_STRING_TOO_LONG on its
 * ~5.4GB uncompressed stop_times.txt). Throws immediately rather than
 * attempting a doomed ~1.46GB download on every call.
 * @param {string} stationIdOrName
 */
export async function fetchMetroStopBoard(stationIdOrName) {
  const { name, stopIds } = resolveMetroStopIds(stationIdOrName);
  if (!stopIds.length) {
    throw new Error(`Unknown Tyne and Wear Metro stop: ${stationIdOrName}`);
  }
  throw new MetroGtfsTooLargeError(name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for rail, MetroGtfsTooLargeError for Metro)
 * because neither is unblocked yet. Kept for parity with the other
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, NORTH_EAST_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const metro = resolveMetroEntry(stationIdOrName, NORTH_EAST_REGION);
  if (metro) {
    return fetchMetroStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown North East station: ${stationIdOrName}`);
}

export {
  NORTH_EAST_HUB,
  METRO_HUB_STATION_NAME,
  METRO_LINES,
  SUNDERLAND_SHARED_PLATFORM,
  PELAW_JUNCTION,
  marketingLabelsForStation,
  mapMetroDestination,
  linesForStation,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
