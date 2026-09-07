/**
 * North East (Tyne and Wear) — Tyne and Wear Metro (light rail, out-product)
 * + National Rail slice. Adapter is structural; city stays `planned` in
 * registry.js (Tim's flip call).
 *
 * Two agencies, two direction models, one hub lock, plus a genuinely
 * different third case at Sunderland:
 *  - Tyne and Wear Metro: OUT-PRODUCT (Tim, 5 Sep 2026 — see
 *    docs/jim-brief-north-east-metro-out-product.md and
 *    docs/united-kingdom-ledger.md §3/§4). History, briefly: the confirmed
 *    static GTFS source (DFT Bus Open Data bulk archive, agency_id OP241)
 *    was once genuinely too large for the shared static-cache.js helper to
 *    parse (~5.4GB uncompressed stop_times.txt, deterministic Node
 *    ERR_STRING_TOO_LONG) — that limit was lifted by the streaming parser in
 *    PR #253. But Metro has no confirmed public real-time feed at all (the
 *    only candidate, metro-rti.nexus.org.uk, is undocumented/app-only), so
 *    per the walk-up rule's East Midlands NET precedent the app does not
 *    dress a static timetable up as a live board. fetchMetroStopBoard()
 *    below throws MetroFeedUnconfirmedError immediately, modelled on East
 *    Midlands' NetFeedUnconfirmedError. The 1.46GB archive is never fetched
 *    by the app, at request time or in any job — the archive-download code
 *    path that used to live here is removed, not just unused.
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
 * The GTFS archive-download path (loadMetroStatic(), the ~1.46GB DFT bulk
 * archive fetch) is removed, not just unused — the app never fetches it, at
 * request time or in any job, now that Metro is out-product. If a
 * confirmed Nexus real-time feed ever appears (outreach draft in
 * docs/outreach-drafts/north-east-nexus.md), wiring it is a fresh adapter
 * change, not a resurrection of this file. lib/cities/north-east/
 * metro-stops.json (the full multi-platform stopId set) is kept on disk,
 * not deleted, and lib/cities/north-east/stations.json's 60 Metro catalog
 * entries are kept too — both so Newcastle Central's doNotGroup and
 * Sunderland's shared-platform note still resolve, and so a future feed
 * slots in without a catalog rebuild — but this adapter no longer loads
 * metro-stops.json, since nothing here needs its multi-platform stopIds to
 * throw MetroFeedUnconfirmedError.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  listMetroStops,
  resolveRailEntry,
  resolveMetroEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";
import { FeedUnconfirmedError } from "./contract.js";
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

export const NORTH_EAST_TIME_ZONE = "Europe/London";
export const NORTH_EAST_REGION = "north-east";

export class MetroFeedUnconfirmedError extends FeedUnconfirmedError {
  constructor(stationIdOrName) {
    super({
      agency: "Tyne and Wear Metro",
      station: stationIdOrName,
      alternative: "National Rail stations in Newcastle still show live times.",
      detail:
        `Tyne and Wear Metro has no confirmed real-time feed for ${stationIdOrName}; board not offered. ` +
        "The only candidate, Nexus's metro-rti endpoint, is undocumented and app-only; the only public data is the " +
        "static timetable inside the DfT BODS national archive, which the app does not fetch — this is a walk-up-rule " +
        "out-product decision (Tim, 5 Sep 2026), not a technical gap. See " +
        "docs/jim-brief-north-east-metro-out-product.md and docs/united-kingdom-ledger.md §3/§4.",
      name: "MetroFeedUnconfirmedError",
    });
  }
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
 * Metro board — out-product. See MetroFeedUnconfirmedError / file header:
 * no confirmed public real-time feed exists for Tyne and Wear Metro, so the
 * app does not offer a static-timetable board dressed up as live. Throws
 * before any network call.
 * @param {string} stationIdOrName
 */
export async function fetchMetroStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, NORTH_EAST_REGION);
  if (!entry) {
    throw new Error(`Unknown Tyne and Wear Metro stop: ${stationIdOrName}`);
  }
  throw new MetroFeedUnconfirmedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for rail, MetroFeedUnconfirmedError for Metro)
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
