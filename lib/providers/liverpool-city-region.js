/**
 * Liverpool City Region — National Rail (Liverpool Lime Street hub,
 * Liverpool South Parkway secondary hub) + Merseyrail (Liverpool Central /
 * Moorfields interchange pair) slice. Adapter is structural; city stays
 * `planned` in registry.js (Tim's flip call).
 *
 * Merseyrail is Darwin-served (corrected 4 Sep 2026 — see
 * docs/jim-brief-liverpool-merseyrail-via-darwin.md). It is a National Rail
 * train operating company (a concession, like every other TOC), not a metro
 * system without a public feed; its stations carry CRS codes and its
 * services appear in Darwin/OpenLDBWS exactly like Northern's or Avanti's.
 * The train/metro catalog split in stations.json is kept only so the picker
 * can label a station's mode (National Rail vs Merseyrail) — both modes now
 * resolve through the same shared Darwin path (uk-darwin.js's
 * fetchStationBoard(), given a pre-resolved entry), config (allow-list +
 * direction model) over the shared provider, not a fork:
 *  - National Rail: hub lock Liverpool Lime Street (LIV CRS, now also
 *    carrying Merseyrail's low-level platforms — see below). Secondary hub
 *    Liverpool South Parkway (LPY CRS, airport connector). BLOCKED at the
 *    account level (DARWIN_LDB_TOKEN not set), not a feed problem. Do not
 *    wire the token here; that's Tim's RDM re-registration.
 *  - Merseyrail: interchange pair Liverpool Central and Moorfields, both
 *    named "dual-line interchange" by the oracle report with no ranking
 *    given between them — neither built as sole hub lock. Same
 *    MissingDarwinTokenError blocker as National Rail, nothing feed-specific
 *    left to gate on.
 *
 * No operator filters anywhere in this region (docs/board-eligibility-rule.md
 * — walk-up rule, applied literally): every board shows every train Darwin
 * returns for that CRS, National Rail and Merseyrail together where both
 * call.
 *
 * LIME STREET (H1) CLOSED AS MOOT 4 Sep 2026, Tim's option B: one Darwin CRS
 * (LIV), one catalog entry, one board — Northern, Avanti, TPE, LNR & WMR and
 * Merseyrail all appear together, each with its own platform (Merseyrail's
 * low-level platforms show as "A"). The former two-stationGroup
 * (train/metro) doNotGroup split and the "same building or two" question it
 * turned on are moot once there is one board with platforms; see
 * docs/liverpool-city-region-d1/hazard-pack.md H1 for the closed history.
 *
 * Ellesmere Port registry discrepancy (THIRD FLAG, not resolved here):
 * `uk-ellesmere-port` exists as its own standalone registry.js entry; the
 * tracker says it should eventually fold into Liverpool City Region. This
 * catalog independently includes Ellesmere Port as a Merseyrail Wirral Line
 * terminus because it is a genuine, individually named station in the
 * oracle report — that is NOT a resolution of the registry-scope question.
 * `uk-ellesmere-port`'s own registry entry and files are left completely
 * untouched by this adapter. Fold-in vs keep-standalone is explicitly
 * Jim/Tim's call. See docs/liverpool-city-region-d1/jim-handoff.md open
 * item 4 (Nico flagged first, Luke's D1 pack second, this wiring pass
 * third).
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
import {
  MERSEYRAIL_HUB,
  MERSEYRAIL_SECONDARY_HUB,
  MERSEYRAIL_LINES,
  marketingLabelsForStation,
  mapMerseyrailDestination,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/liverpool-city-region/marketing-directions.js";

export const LIVERPOOL_CITY_REGION_TIME_ZONE = "Europe/London";
export const LIVERPOOL_CITY_REGION_REGION = "liverpool-city-region";
export const LIVERPOOL_CITY_REGION_NR_HUB = "Liverpool Lime Street";
export const LIVERPOOL_CITY_REGION_NR_SECONDARY_HUB = "Liverpool South Parkway";
export const LIVERPOOL_CITY_REGION_MERSEYRAIL_HUB = MERSEYRAIL_HUB;
export const LIVERPOOL_CITY_REGION_MERSEYRAIL_SECONDARY_HUB = MERSEYRAIL_SECONDARY_HUB;

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
    return resolveRailEntry(raw, LIVERPOOL_CITY_REGION_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, LIVERPOOL_CITY_REGION_REGION);
  }
  return resolveRailEntry(raw, LIVERPOOL_CITY_REGION_REGION) ?? resolveMetroEntry(raw, LIVERPOOL_CITY_REGION_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(LIVERPOOL_CITY_REGION_REGION, options);
}

export function listMerseyrailStops() {
  return listMetroStops(LIVERPOOL_CITY_REGION_REGION);
}

export function listNationalRailStations() {
  return listRailStations(LIVERPOOL_CITY_REGION_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: LIVERPOOL_CITY_REGION_REGION });
}

/**
 * Merseyrail board — Darwin-served, same shared path as National Rail
 * (uk-darwin.js's fetchStationBoard(), given the pre-resolved metro catalog
 * entry so it isn't re-resolved through the rail-only resolver). No operator
 * filters — every trip Darwin returns for this CRS appears on the board,
 * tagged mode "metro" for the picker. Missing-token behaviour is identical
 * to National Rail: with no DARWIN_LDB_TOKEN, this surfaces
 * MissingDarwinTokenError, not swallowed, not fabricated.
 * @param {string} stationIdOrName
 */
export async function fetchMerseyrailStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, LIVERPOOL_CITY_REGION_REGION);
  if (!entry?.crs) {
    throw new Error(`Unknown Merseyrail stop: ${stationIdOrName}`);
  }
  return fetchDarwinStationBoard(stationIdOrName, { entry, mode: "metro" });
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Both National Rail and Merseyrail are Darwin-served;
 * both throw MissingDarwinTokenError until DARWIN_LDB_TOKEN exists. Kept for
 * parity with the other adapters' fetchStationBoard(stationIdOrName)
 * contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, LIVERPOOL_CITY_REGION_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const metro = resolveMetroEntry(stationIdOrName, LIVERPOOL_CITY_REGION_REGION);
  if (metro) {
    return fetchMerseyrailStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown Liverpool City Region station: ${stationIdOrName}`);
}

export {
  MERSEYRAIL_HUB,
  MERSEYRAIL_SECONDARY_HUB,
  MERSEYRAIL_LINES,
  marketingLabelsForStation,
  mapMerseyrailDestination,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
