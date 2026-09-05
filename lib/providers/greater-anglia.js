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
 * catalog entry (not a stationGroup). LNER's board-eligibility verdict
 * there was `undecided` at D1 (reserved-by-default policy) — the same
 * open question as London & South East National Rail's own LNER gap at
 * King's Cross — and was resolved to `in` 5 Sep 2026 (unreserved coach
 * always available on a first-come-first-served basis, no compulsory
 * reservation, no check-in barrier; same verdict and evidence shape as
 * West Yorkshire's LNER row at Leeds — see
 * docs/greater-anglia-d1/oracle-clash-report.md's Verdict resolution
 * subsection). The earlier `excludeOperators: ["LNER"]` boundary rested
 * only on that now-resolved undecided verdict, not on a stop-ownership
 * reason, so it is REMOVED — LNER is on Peterborough's board like every
 * other `in` operator, confirmed live 5 Sep 2026 (London Kings Cross,
 * Edinburgh, Leeds — see docs/greater-anglia-d1/jim-handoff.md "Adapter
 * wired" section). fetchNationalRailBoard() below still reads
 * `excludeOperators` generically off each catalog entry (a per-station
 * config over uk-darwin.js's own excludeOperators option, not a fork) so
 * a future board-eligibility exclusion elsewhere in this catalog needs no
 * code change — it is simply unused for Peterborough today. Still
 * flagged for a future multi-region ledger (cross-regional
 * shared-platform de-dup with any East Midlands/LNER Peterborough entry)
 * — that is a station-grouping question, separate from the now-resolved
 * board-eligibility one.
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
 * Lowestoft never carries LST — verified live against Darwin 5 Sep 2026 as
 * LWT (scripts/fix-uk-region-crs.mjs), along with six other CRS codes
 * that were wrong or missing in the original D1 pack (King's Lynn
 * KLY->KLN, Thetford THF->TTF, Great Yarmouth YRD->GYM, Bishops Stortford
 * BST->BIS, Diss/Wymondham null->DIS/WMD). All 14 catalog entries now
 * carry crsVerified: true.
 *
 * Great Northern (Cambridge, King's Lynn, Ely) and CrossCountry (Stansted
 * Airport) were discovered calling live 5 Sep 2026 beyond what the D1
 * station table itemised per station — both already carry a recorded
 * `in` board-eligibility verdict elsewhere (Great Northern: this pack's
 * own oracle report line 91 Greater Thameslink Railway family + London &
 * South East's oracle line 148; CrossCountry: this pack's own oracle,
 * Peterborough/Ely Hereward Line corridor), so no fresh unverified
 * operator is being admitted — same precedent as Thames Valley's
 * CrossCountry-at-Oxford discovery. No filtering is applied to exclude
 * either; see lib/cities/greater-anglia/stations.json.
 *
 * Direction hub anchoring (lib/cities/uk/direction-hubs.js): WIRED for
 * Thetford (TTF) and Ely (ELY) — one "Norwich" hub, live-probed 5 Sep
 * 2026 (both stations' boards print "Norwich" under both East Midlands
 * Railway and Greater Anglia, an operator-split duplicate of the same
 * terminus). See lib/cities/greater-anglia/direction-hubs.json for the
 * full evidence trail, including a second operator-split candidate found
 * at Ely on "Cambridge" that the shared helper's one-hub-per-station
 * limitation prevents building alongside Norwich (same shape as Solent's
 * Fareham).
 *
 * Direction model: destination + operator (e.g. "London Liverpool Street
 * (Greater Anglia)"), matching every other UK National Rail region's
 * recommendation — no printed route/line map exists for Darwin. Verified
 * against live Darwin payloads 5 Sep 2026 — see
 * docs/greater-anglia-d1/jim-handoff.md "Adapter wired" section and
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
 * over the shared Darwin provider, not a fork). Reads `excludeOperators`
 * generically off the resolved catalog entry and passes it through to
 * uk-darwin.js's own excludeOperators option — no catalog entry in this
 * region currently sets one (Peterborough's LNER exclusion was removed 5
 * Sep 2026 once its board-eligibility verdict resolved to `in`; see file
 * header), so this is a no-op today, kept so a future exclusion needs no
 * code change. Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN
 * exists.
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
