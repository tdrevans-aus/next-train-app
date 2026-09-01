/**
 * Liverpool City Region — National Rail (Liverpool Lime Street hub,
 * Liverpool South Parkway secondary hub) + Merseyrail (Liverpool Central /
 * Moorfields interchange pair) slice. Adapter is structural; city stays
 * `planned` in registry.js (Tim's flip call).
 *
 * Two agencies, two structurally distinct hub shapes, deliberately NOT
 * cross-linked at Lime Street (see below):
 *  - National Rail: hub lock Liverpool Lime Street (LIV CRS, seven TOCs).
 *    Secondary hub Liverpool South Parkway (LPY CRS, airport connector).
 *    Darwin/OpenLDBWS, reused from lib/providers/uk-darwin.js with regionId
 *    "liverpool-city-region" — same allow-list + direction-model config
 *    pattern as every other UK NR region. BLOCKED at the account level
 *    (DARWIN_LDB_TOKEN not set), not a feed problem. Do not wire the token
 *    here; that's Tim's RDM re-registration.
 *  - Merseyrail: interchange pair Liverpool Central and Moorfields, both
 *    named "dual-line interchange" by the oracle report with no ranking
 *    given between them — neither built as sole hub lock. Static GTFS is
 *    confirmed live (Transitland, verified 2026-08-31); real-time is
 *    genuinely UNCONFIRMED (no public GTFS-RT endpoint found anywhere,
 *    only an undocumented mobile-app internal API) — a different kind of
 *    gap than the National Rail account block, same shape as Greater
 *    Manchester's Metrolink gap and South Yorkshire's Supertram/SYFTL gap.
 *    fetchMerseyrailStopBoard() throws MerseyrailFeedUnconfirmedError rather
 *    than fabricating a schedule — do not build against a guessed feed. See
 *    docs/liverpool-city-region-d1/hazard-pack.md H2 and jim-handoff.md skip
 *    risk section.
 *
 * V1 SCOPE DEVIATION FROM THE ORACLE REPORT'S OWN HEADLINE RECOMMENDATION:
 * the report's own Recommendation section suggests National Rail only for
 * v1, deferring Merseyrail to H2. Luke's D1 pack (docs/
 * liverpool-city-region-d1/direction-model-memo.md) deliberately builds
 * Option A instead (National Rail + Merseyrail, Merseyrail schedule-only),
 * reasoning that Merseyrail's confirmed-static/unconfirmed-real-time shape
 * matches Metrolink's and Supertram's precedent of shipping schedule-only
 * rather than being excluded entirely, and that board eligibility verdicts
 * Merseyrail `in`. Flagged for Tim as open item 1 — not silently followed
 * either way. Do not "simplify" back to National-Rail-only without
 * re-reading direction-model-memo.md.
 *
 * LIME STREET STRUCTURAL AMBIGUITY (H1), UNRESOLVED — carried as-is from the
 * D1 pack, not resolved by this adapter. The oracle report contradicts
 * itself on whether Merseyrail's Northern/Wirral Line presence at Lime
 * Street shares platforms with National Rail ("platform level", report line
 * 41) or is separate infrastructure connected by footbridge (report line 73,
 * C2/C3 point 2) — no distance/time figure is given either way, unlike
 * Manchester Victoria's or Manchester Piccadilly/Piccadilly Gardens'
 * explicit figures. This pack keeps Luke's conservative structure: TWO
 * SEPARATE stationGroups (mode train "Liverpool Lime Street", mode metro
 * "Liverpool Lime Street"), doNotGroup: true between them. Do not attempt to
 * resolve this ambiguity here — see docs/liverpool-city-region-d1/
 * hazard-pack.md H1.
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

export class MerseyrailFeedUnconfirmedError extends Error {
  constructor(stationIdOrName) {
    super(
      `Merseyrail has no confirmed public GTFS-RT feed — ${stationIdOrName} board cannot be built. ` +
        "Static GTFS is confirmed live (Transitland f-gc-rail~delivery~group~planar~gtfs, verified 2026-08-31), " +
        "but no public real-time endpoint has been confirmed in Transitland, Mobility Database, or Merseyrail's own " +
        "developer documentation — only an undocumented mobile-app ('Train Check') internal API. " +
        "See docs/liverpool-city-region-d1/hazard-pack.md H2 and jim-handoff.md skip risk section."
    );
    this.name = "MerseyrailFeedUnconfirmedError";
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
 * Merseyrail board — not implemented. See MerseyrailFeedUnconfirmedError /
 * file header.
 * @param {string} stationIdOrName
 */
export async function fetchMerseyrailStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, LIVERPOOL_CITY_REGION_REGION);
  if (!entry) {
    throw new Error(`Unknown Merseyrail stop: ${stationIdOrName}`);
  }
  throw new MerseyrailFeedUnconfirmedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for National Rail, MerseyrailFeedUnconfirmedError
 * for Merseyrail) because neither feed is unblocked yet. Kept for parity
 * with the other adapters' fetchStationBoard(stationIdOrName) contract
 * shape.
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
