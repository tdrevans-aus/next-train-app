/**
 * East Midlands — NET (Nottingham Express Transit) tram + National Rail slice.
 * Adapter is structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * Two agencies, two direction models, one shared hub name:
 *  - NET tram: schedule-only v1 per docs/east-midlands-d1/. Line + terminus
 *    ("1 + Hucknall"), same shape as every reference pack.
 *  - National Rail: Darwin/OpenLDBWS, reused from lib/providers/uk-darwin.js
 *    with regionId "east-midlands" — same allow-list + direction-model config
 *    pattern as uk-west-midlands / uk-ellesmere-port. BLOCKED at the account
 *    level (DARWIN_LDB_TOKEN not set) — same blocker as those two regions,
 *    not a feed problem. Do not wire the token here; that's Tim's RDM
 *    re-registration.
 *
 * Hub lock: Nottingham Station (NOT CRS). NET tram viaduct above National
 * Rail main platforms, footbridge connects — doNotGroup, modelled as two
 * catalog entries with the same printed name but different `mode`
 * (train vs metro), resolved by separate uk/catalog.js lookup functions.
 *
 * D2 finding (31 Aug 2026): the D1 pack asked Jim to pull the DFT Bus Open
 * Data bulk GTFS archive (https://data.bus-data.dft.gov.uk/timetable/download/gtfs-file/all/,
 * no key) to close NET's intermediate-stop-order gap. That pull was done —
 * itm_all_gtfs.zip, ~1.4GB, 632 agencies — and Nottingham Express Transit /
 * NET does not appear as an agency anywhere in it (Manchester Metrolink, West
 * Midlands Metro, Edinburgh Trams, Blackpool Tram, South Yorkshire Supertram,
 * London Tramlink, SPT Subway, and several heritage railways all do). This
 * contradicts the D1 pack's "verified live" note for NET's feed — see
 * lib/cities/east-midlands/stations.json notes for the full account. Because
 * of this, NET's board cannot be built at all right now: fetchNetStopBoard()
 * below throws rather than fabricating a schedule. This is a genuine
 * feed-verification gap for Luke/Nico to re-check, not something guessed
 * around here.
 *
 * Tamworth is a genuine shared National Rail platform with West Midlands —
 * deliberately excluded from this catalog (D2 de-dup boundary for a future
 * West Midlands pack, not an East Midlands merge concern). Leicester,
 * Kettering, Wellingborough, Chesterfield, Alfreton are through-running-only
 * National Rail stations, not merge points.
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
  NET_HUB,
  NET_LINES,
  marketingLabelsForStation,
  mapNetDestination,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/east-midlands/marketing-directions.js";

export const EAST_MIDLANDS_TIME_ZONE = "Europe/London";
export const EAST_MIDLANDS_REGION = "east-midlands";
export const EAST_MIDLANDS_HUB = NET_HUB;

export class NetFeedUnconfirmedError extends FeedUnconfirmedError {
  constructor(stationIdOrName) {
    super({
      agency: "Nottingham Express Transit (NET)",
      station: stationIdOrName,
      alternative: "National Rail stations in Nottingham still show live times.",
      detail:
        `NET (Nottingham Express Transit) has no confirmed GTFS source — ${stationIdOrName} board cannot be built. ` +
        "The DFT Bus Open Data bulk archive (no key) was pulled 31 Aug 2026 and does not contain a Nottingham Express Transit agency. " +
        "See lib/cities/east-midlands/stations.json notes.",
      name: "NetFeedUnconfirmedError",
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
    return resolveRailEntry(raw, EAST_MIDLANDS_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, EAST_MIDLANDS_REGION);
  }
  return resolveRailEntry(raw, EAST_MIDLANDS_REGION) ?? resolveMetroEntry(raw, EAST_MIDLANDS_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(EAST_MIDLANDS_REGION, options);
}

export function listNetStops() {
  return listMetroStops(EAST_MIDLANDS_REGION);
}

export function listNationalRailStations() {
  return listRailStations(EAST_MIDLANDS_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: EAST_MIDLANDS_REGION });
}

/**
 * NET tram board — not implemented. See NetFeedUnconfirmedError / file header.
 * @param {string} stationIdOrName
 */
export async function fetchNetStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, EAST_MIDLANDS_REGION);
  if (!entry) {
    throw new Error(`Unknown NET stop: ${stationIdOrName}`);
  }
  throw new NetFeedUnconfirmedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for rail, NetFeedUnconfirmedError for NET) because
 * neither feed is unblocked yet. Kept for parity with the other adapters'
 * fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, EAST_MIDLANDS_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const metro = resolveMetroEntry(stationIdOrName, EAST_MIDLANDS_REGION);
  if (metro) {
    return fetchNetStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown East Midlands station: ${stationIdOrName}`);
}

export {
  NET_HUB,
  NET_LINES,
  marketingLabelsForStation,
  mapNetDestination,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
