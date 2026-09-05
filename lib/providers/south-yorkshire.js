/**
 * South Yorkshire — Sheffield Supertram (light rail/tram-train) + National
 * Rail slice. Adapter is structural; city stays `planned` in registry.js
 * (Tim's flip call).
 *
 * Two agencies, two direction models, one shared hub name:
 *  - Sheffield Supertram: schedule-only v1 per docs/south-yorkshire-d1/.
 *    Line + terminus ("Blue + Halfway"), same shape as every reference pack.
 *    No confirmed data source exists at all under the current operator
 *    (SYFTL, since 22 Mar 2024) — genuinely distinct in kind from the
 *    National Rail account block below, not the usual "Tim needs to
 *    re-register" story. fetchSupertramStopBoard() throws
 *    SupertramFeedUnconfirmedError rather than fabricating a schedule — do
 *    not build against a guessed feed (see docs/south-yorkshire-d1/
 *    hazard-pack.md H2 and jim-handoff.md).
 *  - National Rail: Darwin/OpenLDBWS, reused from lib/providers/uk-darwin.js
 *    with regionId "south-yorkshire" — same allow-list + direction-model
 *    config pattern as uk-west-midlands / uk-ellesmere-port / east-midlands.
 *    BLOCKED at the account level (DARWIN_LDB_TOKEN not set) — same blocker
 *    as those regions, not a feed problem. Do not wire the token here;
 *    that's Tim's RDM re-registration.
 *
 * Hub lock: Sheffield Station (SHF CRS). Supertram tram viaduct above
 * National Rail main platforms, footbridge connects — doNotGroup, modelled
 * as two catalog entries with the same printed name but different `mode`
 * (train vs metro), resolved by separate uk/catalog.js lookup functions.
 *
 * Meadowhall Interchange (MHS CRS) / Meadowhall (Supertram) is a second,
 * distinct case: a through-running/infrastructure-switch point, NOT a
 * second hub lock — Supertram Tram-Train switches onto National Rail
 * infrastructure here to continue toward Rotherham Central and Parkgate.
 * Also modelled as two mode-tagged catalog entries (doNotGroup applies, but
 * it is not a parent hub the way Sheffield Station is).
 *
 * Chesterfield is a genuine shared boundary station with East Midlands —
 * deliberately excluded from this catalog (East Midlands' pack already owns
 * it, CRS CHD). Darton, South Elmsall, Moorthorpe are West Yorkshire
 * boundary stations, not merge points — D2 de-dup concern for a future West
 * Yorkshire pack. Denby Dale is ruled West Yorkshire's home station per
 * docs/united-kingdom-ledger.md (5 Sep 2026) and is not catalogued here.
 *
 * CRS codes live-verified 5 Sep 2026 (see docs/jim-brief-uk-crs-sweep-2.md) — Rotherham
 * Central (RMC), Darton (DRT), South Elmsall (SES), and Moorthorpe (MRP) were previously
 * catalogued with no CRS; all four are now filled and verified.
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
  SUPERTRAM_HUB,
  SUPERTRAM_LINES,
  marketingLabelsForStation,
  mapSupertramDestination,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/south-yorkshire/marketing-directions.js";

export const SOUTH_YORKSHIRE_TIME_ZONE = "Europe/London";
export const SOUTH_YORKSHIRE_REGION = "south-yorkshire";
export const SOUTH_YORKSHIRE_HUB = SUPERTRAM_HUB;

export class SupertramFeedUnconfirmedError extends Error {
  constructor(stationIdOrName) {
    super(
      `Sheffield Supertram has no confirmed GTFS source under South Yorkshire Future Tram Limited (SYFTL) — ${stationIdOrName} board cannot be built. ` +
        "SYFTL took over from Stagecoach on 22 Mar 2024; no public GTFS or GTFS-RT feed has been confirmed since. " +
        "See lib/cities/south-yorkshire/stations.json notes and docs/south-yorkshire-d1/hazard-pack.md H2."
    );
    this.name = "SupertramFeedUnconfirmedError";
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
    return resolveRailEntry(raw, SOUTH_YORKSHIRE_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, SOUTH_YORKSHIRE_REGION);
  }
  return resolveRailEntry(raw, SOUTH_YORKSHIRE_REGION) ?? resolveMetroEntry(raw, SOUTH_YORKSHIRE_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(SOUTH_YORKSHIRE_REGION, options);
}

export function listSupertramStops() {
  return listMetroStops(SOUTH_YORKSHIRE_REGION);
}

export function listNationalRailStations() {
  return listRailStations(SOUTH_YORKSHIRE_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: SOUTH_YORKSHIRE_REGION });
}

/**
 * Supertram board — not implemented. See SupertramFeedUnconfirmedError /
 * file header.
 * @param {string} stationIdOrName
 */
export async function fetchSupertramStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, SOUTH_YORKSHIRE_REGION);
  if (!entry) {
    throw new Error(`Unknown Supertram stop: ${stationIdOrName}`);
  }
  throw new SupertramFeedUnconfirmedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for rail, SupertramFeedUnconfirmedError for
 * Supertram) because neither feed is unblocked yet. Kept for parity with
 * the other adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, SOUTH_YORKSHIRE_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const metro = resolveMetroEntry(stationIdOrName, SOUTH_YORKSHIRE_REGION);
  if (metro) {
    return fetchSupertramStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown South Yorkshire station: ${stationIdOrName}`);
}

export {
  SUPERTRAM_HUB,
  SUPERTRAM_LINES,
  marketingLabelsForStation,
  mapSupertramDestination,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
