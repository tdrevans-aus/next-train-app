/**
 * Greater Anglia — National Rail (East Anglia) slice. Adapter is
 * structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * One primary agency, one mode: National Rail (Darwin/OpenLDBWS), reused
 * from lib/providers/uk-darwin.js with regionId "greater-anglia" — same
 * allow-list + config pattern as every other UK National Rail region in
 * this pipeline (uk-west-midlands / uk-ellesmere-port / east-midlands /
 * south-yorkshire / north-east / west-of-england / south-wales /
 * west-yorkshire / rest-of-wales / rest-of-scotland /
 * london-se-national-rail / glasgow / edinburgh / solent / thames-valley /
 * greater-manchester / liverpool-city-region). BLOCKED at the account
 * level (DARWIN_LDB_TOKEN not set) — same blocker as every other region,
 * not a feed problem. Do not wire the token here; that's Tim's RDM
 * re-registration.
 *
 * Unlike West of England, Greater Anglia does have a live static GTFS
 * feed (Transitland f-gc-rail~delivery~group~planar~gtfs, CC-BY-2.0 UK, no
 * key) as a reference/verification source, but this adapter does not pull
 * it for board data — Darwin is the only real-time path. See
 * docs/greater-anglia-d1/jim-handoff.md.
 *
 * Hub lock: Norwich (NRW). TWO secondary hubs — Cambridge (CBG) and
 * Ipswich (IPS) — the oracle report gives both identical hub-tier
 * language (report lines 22-24, 131), a deliberate departure from West of
 * England's single-secondary-hub shape (Bath Spa only). No doNotGroup at
 * Norwich, Cambridge, or Ipswich — single-building, walk-up stations;
 * Thameslink at Cambridge and Thameslink/CrossCountry at Ely both pass the
 * board-eligibility test alongside Greater Anglia.
 *
 * Peterborough (PBO) is explicitly NOT a hub — modelled as a flat
 * catalog entry (not a stationGroup) with `excludeOperators: ["LNER"]`.
 * LNER's board-eligibility verdict there is `undecided` (reserved-by-
 * default policy) — the same open question as London & South East
 * National Rail's own LNER gap at King's Cross, not resolved here or
 * there. Flagged for a future multi-region ledger (cross-regional
 * shared-platform de-dup with any East Midlands/LNER Peterborough entry).
 *
 * Liverpool Street is NOT built here — Greater Anglia services calling
 * there are already documented as `in` in London & South East National
 * Rail's built pack (lib/cities/london-se-national-rail/stations.json,
 * groupId "liverpool-street", operators Greater Anglia + c2c, doNotGroup
 * true). Do not duplicate.
 *
 * CRS collision caught, not shipped: the oracle report's own station-code
 * list assigns LST to Lowestoft, but LST is Liverpool Street's real-world
 * CRS, already used in London & South East National Rail's built pack.
 * Lowestoft's crs is left null in lib/cities/greater-anglia/stations.json
 * — this pack could not reach a live GTFS/Darwin source in this
 * environment to confirm the real code (believed LOW) — do not guess it
 * into this adapter or any catalog entry.
 *
 * Direction model: destination + operator (e.g. "London Liverpool Street
 * (Greater Anglia)"), matching every other UK National Rail region's
 * recommendation — no printed route/line map exists for Darwin.
 * Illustrative only, not verified against a live Darwin payload. See
 * docs/greater-anglia-d1/direction-model-memo.md.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const GREATER_ANGLIA_TIME_ZONE = "Europe/London";
export const GREATER_ANGLIA_REGION = "greater-anglia";
export const GREATER_ANGLIA_HUB = "Norwich";
export const GREATER_ANGLIA_SECONDARY_HUBS = ["Cambridge", "Ipswich"];

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, GREATER_ANGLIA_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(GREATER_ANGLIA_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(GREATER_ANGLIA_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Applies excludeOperators
 * for Peterborough's LNER exclusion (board-eligibility verdict undecided).
 * Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  const excludeOperators = entry?.excludeOperators?.length ? entry.excludeOperators : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: GREATER_ANGLIA_REGION,
    excludeOperators,
  });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, GREATER_ANGLIA_REGION);
  if (!rail) {
    throw new Error(`Unknown Greater Anglia station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
