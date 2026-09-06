/**
 * South Wales — National Rail (Cardiff Central + Cardiff Queen Street +
 * Valley Lines termini) slice. `status: "live"` in registry.js.
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "south-wales" — same
 * allow-list + config pattern as uk-west-midlands / uk-ellesmere-port /
 * east-midlands / south-yorkshire / north-east / west-of-england.
 * DARWIN_LDB_TOKEN set 2 Sep 2026 (PR #230) — Darwin is live here.
 *
 * Re-scope 7 Sep 2026 (docs/south-wales-d1/jim-handoff.md): the catalog
 * grew from 2 stations to 16. Transport for Wales Valley Lines is now
 * IN-CATALOG via Darwin — confirmed live by a probe of all 16 catalog CRS
 * codes 5 Sep 2026 (docs/south-wales-d1/oracle-clash-report.md "Re-scope 7
 * Sep 2026" section), correcting this file's earlier premise that TfW had
 * no public feed at all. Modelled as line + terminus, termini-only: four
 * of six named Valley Lines routes have a catalogued terminus (Merthyr,
 * Aberdare, Treherbert/Rhondda, Rhymney); Coryton and Ebbw Vale termini
 * have no confirmed CRS in this probe and are not catalogued (a Tim/D2
 * item). The ~70 intermediate Valley Lines halts across all six lines
 * also remain out of catalog — a future expansion pass, not a gap here.
 *
 * A reference static GTFS dump exists for National Rail (Transitland,
 * CC-BY-2.0 UK) but is not used as a fallback here — same Darwin-or-nothing
 * shape as West of England, kept for consistency across the National Rail
 * wave rather than building an unrequested schedule-only path.
 *
 * Hub lock: Cardiff Central (CDF) — single Darwin CRS/board,
 * operator-mixed, carrying both Valley Lines and National Rail mainline
 * through-running. Not Cardiff Queen Street, not Cardiff Bay. Cardiff
 * Queen Street (CDQ) is a secondary hub in its own right (own catalog
 * entry, own board, Valley Lines Rhondda/Merthyr junction only, no
 * mainline through-running) — a separate CRS ~600 m from CDF with no
 * shared-board evidence, so no doNotGroup entry is needed anywhere in
 * this catalog. See docs/south-wales-d1/hazard-pack.md H4/H6.
 *
 * Direction model: destination + operator (e.g. "London Paddington
 * (GWR)") for mainline, illustrative only, no live Darwin destination
 * string pull done yet; line + terminus (termini-only) for Valley Lines.
 * See docs/south-wales-d1/direction-model-memo.md.
 *
 * Severn Tunnel Junction (STJ) is a through-running-only boundary station,
 * not a merge point. RESOLVED per docs/united-kingdom-ledger.md SS2 (Tim,
 * 5 Sep 2026): STJ and West of England's Chepstow (CPW) are both in Wales
 * on different corridors, both home their own region, both stay
 * through-running-only — no longer an open D2 item.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const SOUTH_WALES_TIME_ZONE = "Europe/London";
export const SOUTH_WALES_REGION = "south-wales";
export const SOUTH_WALES_HUB = "Cardiff Central";

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, SOUTH_WALES_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(SOUTH_WALES_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(SOUTH_WALES_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists. No Valley Lines
 * fallback exists — see file header, that agency has no feed at all.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: SOUTH_WALES_REGION });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, SOUTH_WALES_REGION);
  if (!rail) {
    throw new Error(`Unknown South Wales station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
