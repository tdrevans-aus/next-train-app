/**
 * Solent — National Rail (Southampton / Portsmouth) slice. Adapter is
 * structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "solent" — same allow-list +
 * region config pattern as every other UK National Rail region in this
 * pipeline (uk-west-midlands / east-midlands / west-of-england / glasgow /
 * etc). BLOCKED at the account level (DARWIN_LDB_TOKEN not set) — same
 * blocker as those regions, not a feed problem. Do not wire the token here;
 * that's Tim's RDM re-registration.
 *
 * No static GTFS fallback exists for this feed — National Rail Enquiries
 * does not publish static GTFS anywhere (Darwin is realtime-only, per-station
 * SOAP API), same as West of England / South Wales / West Yorkshire / Rest
 * of Wales / Rest of Scotland / london-se-national-rail / Glasgow's National
 * Rail half. Do not fabricate a schedule-only fallback; fetchNationalRailBoard()
 * below throws MissingDarwinTokenError.
 *
 * TWO-HUB architecture, NOT a single hub-lock and NOT full flat multi-group
 * (London-SE Option A shape) — see docs/solent-d1/jim-handoff.md and
 * direction-model-memo.md for the full reasoning:
 *  - Southampton Central (SOU) stands alone as the west-side hub. No
 *    secondary-station candidate near it in the report.
 *  - Portsmouth Harbour (PMH) is the east-side hub, paired with Portsmouth &
 *    Southsea (PMS) as a SECONDARY board on the same corridor/waterfront —
 *    reusing the West-of-England hub+secondary-hub pattern (Bristol Temple
 *    Meads + Bath Spa), not promoting PMS to a third independent hub the way
 *    london-se-national-rail's seven termini are mutually independent.
 *  - Southampton Central and the Portsmouth pair are independent of each
 *    other — never merge them, never treat one as primary/demote the other.
 *
 * None of the three boards need internal doNotGroup — no report evidence of
 * separate platform/boarding-section logic per operator at any of them
 * (unlike London Bridge/Liverpool Street in london-se-national-rail). Each is
 * a single flat destination+operator departure board.
 *
 * Fareham (FAR) and Eastleigh (ESL) are through-running junctions, not
 * stationGroups — catalogued flat, no hub significance per the report.
 * Westbury (WSB, West of England boundary) and Waterloo (WAT, London & South
 * East National Rail boundary) are through-running-only boundary stations,
 * catalogued flat, NOT merge points — D2 de-dup concern for whichever
 * region's adapter is wired second, per both those regions' own already-
 * merged packs (docs/west-of-england-d1/published-network.json,
 * docs/london-se-national-rail-d1/published-network.json).
 *
 * Island Line is excluded entirely (out-mode, Wightlink FastCat ferry
 * dependency to Ryde Pier Head) — not catalogued in any form here.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const SOLENT_TIME_ZONE = "Europe/London";
export const SOLENT_REGION = "solent";
export const SOLENT_HUB = "Southampton Central";
export const SOLENT_EAST_HUB = "Portsmouth Harbour";
export const SOLENT_EAST_SECONDARY_HUB = "Portsmouth & Southsea";
/** Three independent boards — two-hub architecture, one hub carries a secondary. */
export const SOLENT_STATION_GROUPS = [
  "southampton-central",
  "portsmouth-harbour",
  "portsmouth-southsea",
];

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, SOLENT_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(SOLENT_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(SOLENT_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists. No GTFS fallback
 * exists for this region (see file header) — this is the only board path.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: SOLENT_REGION });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, SOLENT_REGION);
  if (!rail) {
    throw new Error(`Unknown Solent station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
