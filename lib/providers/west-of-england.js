/**
 * West of England — National Rail (Bristol / Bath) slice. Adapter is
 * structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "west-of-england" — same
 * allow-list + config pattern as uk-west-midlands / uk-ellesmere-port /
 * east-midlands / south-yorkshire / north-east. BLOCKED at the account
 * level (DARWIN_LDB_TOKEN not set) — same blocker as those regions, not a
 * feed problem. Do not wire the token here; that's Tim's RDM
 * re-registration.
 *
 * Unlike every other National Rail region packed so far, there is NO
 * static GTFS fallback for this feed at all — National Rail Enquiries does
 * not publish static GTFS anywhere (Darwin is realtime-only, per-station
 * SOAP API). East Midlands had NET's GTFS and North East had Metro's GTFS
 * as a second-agency schedule-only path while Darwin was blocked; this
 * region has no second agency and no second data source — it is genuinely
 * Darwin-or-nothing until DARWIN_LDB_TOKEN exists. Do not fabricate a
 * schedule-only fallback; fetchNationalRailBoard() below throws
 * MissingDarwinTokenError, same as it does everywhere else in this wave.
 *
 * Hub lock: Bristol Temple Meads (BRI). Secondary hub: Bath Spa (BTH). No
 * doNotGroup at either — single-layer, GWR-dominated, platforms
 * distinguished by route not operator (docs/west-of-england-d1/
 * hazard-pack.md H1/H6) — simpler hub structure than East Midlands'
 * Nottingham Station (no tram-over-rail two-layer case here) or North
 * East's Newcastle Central.
 *
 * Direction model: destination + operator (e.g. "London Paddington
 * (GWR)"), matching how National Rail departure boards actually present —
 * no printed route/line map exists for Darwin, same structural fact as
 * every National Rail-only region in this pipeline. See
 * docs/west-of-england-d1/direction-model-memo.md. Illustrative only, not
 * verified against a live Darwin payload — do not invent destination
 * strings beyond what Darwin itself returns once unblocked.
 *
 * Chepstow (CPW, South Wales boundary), Gloucester (GCR, West Midlands
 * boundary), Westbury (WSB, Solent/Thames Valley boundary), and Taunton
 * (TAU, Southwest boundary) are through-running-only stations, not merge
 * points — D2 de-dup concern for future packs in those regions, not built
 * here.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const WEST_OF_ENGLAND_TIME_ZONE = "Europe/London";
export const WEST_OF_ENGLAND_REGION = "west-of-england";
export const WEST_OF_ENGLAND_HUB = "Bristol Temple Meads";
export const WEST_OF_ENGLAND_SECONDARY_HUB = "Bath Spa";

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, WEST_OF_ENGLAND_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(WEST_OF_ENGLAND_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(WEST_OF_ENGLAND_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists. No GTFS fallback
 * exists for this region (see file header) — this is the only board path.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: WEST_OF_ENGLAND_REGION });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, WEST_OF_ENGLAND_REGION);
  if (!rail) {
    throw new Error(`Unknown West of England station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
