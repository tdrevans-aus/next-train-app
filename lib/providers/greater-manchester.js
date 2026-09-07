/**
 * Greater Manchester — National Rail (Manchester Piccadilly hub, Manchester
 * Victoria secondary hub) + Manchester Metrolink (St Peter's Square hub,
 * Manchester Victoria secondary hub) slice. Adapter is structural; city
 * stays `planned` in registry.js (Tim's flip call).
 *
 * Two agencies, two hub+secondary-hub pairs, cross-linked at one
 * shared-building station:
 *  - National Rail: hub lock Manchester Piccadilly (MAN CRS, 14 platforms,
 *    all six TOCs). Secondary hub Manchester Victoria (MCV CRS, 6 platforms,
 *    Northern + TransPennine Express only). Darwin/OpenLDBWS, reused from
 *    lib/providers/uk-darwin.js with regionId "greater-manchester" — same
 *    allow-list + direction-model config pattern as every other UK NR
 *    region. BLOCKED at the account level (DARWIN_LDB_TOKEN not set), not a
 *    feed problem. Do not wire the token here; that's Tim's RDM
 *    re-registration.
 *  - Metrolink: hub lock St Peter's Square (all lines converge, Zone 1).
 *    Secondary hub Manchester Victoria. Real-time feed status is genuinely
 *    UNCONFIRMED (TfGM developer portal deprecated, no new API keys
 *    issued) — a different kind of gap than the National Rail account
 *    block, same shape as South Yorkshire's Supertram/SYFTL gap.
 *    fetchMetrolinkStopBoard() throws MetrolinkFeedUnconfirmedError rather
 *    than fabricating a schedule — do not build against a guessed feed. See
 *    docs/greater-manchester-d1/hazard-pack.md and jim-handoff.md skip risk
 *    section.
 *
 * ARCHITECTURE — this pack deliberately departs from the oracle report's
 * own headline C2/C3 point 4 sentence ("hub lock: Manchester Victoria"),
 * using the report's own supporting facts (line 22: Piccadilly 14
 * platforms/all six TOCs vs Victoria 6 platforms/two TOCs) instead. Treating
 * Victoria as National Rail's *only* hub lock would leave four of six
 * operators (Avanti, CrossCountry, East Midlands Railway, Transport for
 * Wales) with no hub-anchored board — a board-eligibility-rule violation.
 * See docs/greater-manchester-d1/jim-handoff.md and direction-model-memo.md
 * before changing this. Do not "simplify" back to a single Victoria hub
 * lock.
 *
 * Manchester Victoria is built ONCE as a shared-building stationGroup —
 * doNotGroup: true between its Metrolink (metro mode) and National Rail
 * (train mode) layers, same shape as Sheffield Station (South Yorkshire)
 * and Nottingham Station (East Midlands).
 *
 * Manchester Piccadilly (National Rail) and Piccadilly Gardens (Metrolink)
 * are TWO SEPARATE stationGroups, doNotGroup: true between them — a
 * walk-link pair (~100m, 5-10 min via moving walkways, undercroft vs
 * street-level), NOT a shared building the way Victoria is. Closer in shape
 * to West Yorkshire's Bradford Forster Square/Bradford Interchange pair.
 *
 * Walsden (CRS): this region's own oracle report gives WDN. West Yorkshire's
 * already-merged pack gives WAD for the same physical boundary station —
 * CRS MISMATCH NOT RESOLVED. This catalog uses WDN because that is what
 * THIS region's own report gives; West Yorkshire's files are untouched. See
 * docs/greater-manchester-d1/jim-handoff.md open item 4.
 *
 * Stockport: National Rail (SPT CRS, live-verified 5 Sep 2026 — corrected from the
 * originally catalogued SMN, which Darwin resolves to Southminster in Essex; see
 * docs/jim-brief-uk-crs-sweep-2.md). No Metrolink stop exists at Stockport — the
 * earlier "two Stockports" hazard was an error (7 Sep 2026, see
 * docs/jim-brief-net-toton-lane-and-stockport-tram.md); Metrolink has never served
 * Stockport and an extension there has only been proposed.
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
  METROLINK_HUB,
  METROLINK_SECONDARY_HUB,
  METROLINK_LINES,
  marketingLabelsForStation,
  mapMetrolinkDestination,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/greater-manchester/marketing-directions.js";

export const GREATER_MANCHESTER_TIME_ZONE = "Europe/London";
export const GREATER_MANCHESTER_REGION = "greater-manchester";
export const GREATER_MANCHESTER_NR_HUB = "Manchester Piccadilly";
export const GREATER_MANCHESTER_NR_SECONDARY_HUB = "Manchester Victoria";
export const GREATER_MANCHESTER_METROLINK_HUB = METROLINK_HUB;
export const GREATER_MANCHESTER_METROLINK_SECONDARY_HUB = METROLINK_SECONDARY_HUB;

export class MetrolinkFeedUnconfirmedError extends FeedUnconfirmedError {
  constructor(stationIdOrName) {
    super({
      agency: "Manchester Metrolink",
      station: stationIdOrName,
      alternative: "National Rail stations in Manchester still show live times.",
      detail:
        `Manchester Metrolink has no confirmed real-time GTFS-RT feed — ${stationIdOrName} board cannot be built. ` +
        "TfGM's developer portal (opendata.tfgm.com) is deprecated and no longer issues new API keys; existing keys " +
        "continue to function on an unconfirmed timeline. No public GTFS-RT feed has been confirmed anywhere. " +
        "See docs/greater-manchester-d1/hazard-pack.md and jim-handoff.md skip risk section.",
      name: "MetrolinkFeedUnconfirmedError",
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
    return resolveRailEntry(raw, GREATER_MANCHESTER_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, GREATER_MANCHESTER_REGION);
  }
  return resolveRailEntry(raw, GREATER_MANCHESTER_REGION) ?? resolveMetroEntry(raw, GREATER_MANCHESTER_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(GREATER_MANCHESTER_REGION, options);
}

export function listMetrolinkStops() {
  return listMetroStops(GREATER_MANCHESTER_REGION);
}

export function listNationalRailStations() {
  return listRailStations(GREATER_MANCHESTER_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: GREATER_MANCHESTER_REGION });
}

/**
 * Metrolink board — not implemented. See MetrolinkFeedUnconfirmedError /
 * file header.
 * @param {string} stationIdOrName
 */
export async function fetchMetrolinkStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, GREATER_MANCHESTER_REGION);
  if (!entry) {
    throw new Error(`Unknown Metrolink stop: ${stationIdOrName}`);
  }
  throw new MetrolinkFeedUnconfirmedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for National Rail, MetrolinkFeedUnconfirmedError
 * for Metrolink) because neither feed is unblocked yet. Kept for parity
 * with the other adapters' fetchStationBoard(stationIdOrName) contract
 * shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, GREATER_MANCHESTER_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const metro = resolveMetroEntry(stationIdOrName, GREATER_MANCHESTER_REGION);
  if (metro) {
    return fetchMetrolinkStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown Greater Manchester station: ${stationIdOrName}`);
}

export {
  METROLINK_HUB,
  METROLINK_SECONDARY_HUB,
  METROLINK_LINES,
  marketingLabelsForStation,
  mapMetrolinkDestination,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
