/**
 * South Wales — National Rail (Cardiff Central) slice. Adapter is
 * structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "south-wales" — same
 * allow-list + config pattern as uk-west-midlands / uk-ellesmere-port /
 * east-midlands / south-yorkshire / north-east / west-of-england. BLOCKED
 * at the account level (DARWIN_LDB_TOKEN not set) — same blocker as those
 * regions, not a feed problem. Do not wire the token here; that's Tim's
 * RDM re-registration.
 *
 * Transport for Wales Valley Lines is DELIBERATELY EXCLUDED from this
 * adapter. This is not the usual account-level Darwin block — TfW has no
 * confirmed public GTFS static feed, GTFS-RT feed, or any other public API
 * of any kind (docs/south-wales-d1/jim-handoff.md). The 81-station
 * Wikipedia-sourced Valley Lines list in the oracle report is explicitly
 * unverified and was not used to build any catalog entry here. Do not add
 * a fetchValleyLinesBoard() or any Valley Lines station graph off this
 * pack — there is nothing to wire, and a future TfW-feed-confirmed pack
 * would need its own Nico oracle pass and Luke D1 pack first.
 *
 * A reference static GTFS dump exists for National Rail (Transitland,
 * CC-BY-2.0 UK) but is not used as a fallback here — same Darwin-or-nothing
 * shape as West of England, kept for consistency across the National Rail
 * wave rather than building an unrequested schedule-only path.
 *
 * Hub lock: Cardiff Central (CDF) — interchange between Valley Lines
 * (unbuilt, separate infrastructure, footbridge connect) and National Rail
 * through-running services. Not Cardiff Queen Street, not Cardiff Bay, not
 * Pontypridd. No doNotGroup built (no Valley Lines board exists to group
 * against yet) — see docs/south-wales-d1/hazard-pack.md H1/H6.
 *
 * Direction model: destination + operator (e.g. "London Paddington
 * (GWR)"), matching how National Rail departure boards actually present —
 * no printed route/line map exists for Darwin, same structural fact as
 * every National Rail-only region in this pipeline. See
 * docs/south-wales-d1/direction-model-memo.md. Illustrative only, not
 * verified against a live Darwin payload — do not invent destination
 * strings beyond what Darwin itself returns once unblocked.
 *
 * Severn Tunnel Junction (STJ) is a through-running-only boundary station,
 * not a merge point. KNOWN OPEN ITEM, not resolved here: this pack's
 * oracle report names STJ as the Wales-England corridor boundary, while
 * West of England's already-merged pack instead names Chepstow (CPW) for
 * the same corridor. Both stay through-running-only in their respective
 * regions' catalogs — reconciling which (if either) is the "correct"
 * single boundary point is a D2/Tim item, not something to guess at during
 * adapter wiring. See docs/south-wales-d1/jim-handoff.md.
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
