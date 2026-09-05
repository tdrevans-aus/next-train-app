/**
 * Rest of Wales — National Rail (North/Mid/West Wales corridors, Wrexham
 * General hub lock) slice. Adapter is structural; city stays `planned` in
 * registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "rest-of-wales" — same allow-list
 * + config pattern as uk-west-midlands / uk-ellesmere-port / east-midlands /
 * south-yorkshire / north-east / west-of-england / south-wales /
 * west-yorkshire. BLOCKED at the account level (DARWIN_LDB_TOKEN not set) —
 * same blocker as those regions, not a feed problem. Do not wire the token
 * here; that's Tim's RDM re-registration.
 *
 * CITY ID CORRECTION: the D1 pack (docs/rest-of-wales-d1/) was written
 * against `city: "uk-wales"`, following docs/uk-architecture.md's region-id
 * table at the time. That table used a stale `uk-` prefix convention and has
 * since been corrected (docs/uk-architecture.md, commit add8d45) — every UK
 * region wired since West Yorkshire uses a plain kebab-case id with no
 * prefix (south-wales, west-yorkshire, north-east, etc.). This adapter and
 * registry.js register the city as `rest-of-wales`, NOT `uk-wales`,
 * `wales`, `rest-wales-nr`, or `uk-rest-of-wales`. See
 * docs/rest-of-wales-d1/jim-handoff.md open item 3 and
 * docs/rest-of-wales-d1/published-network.json's id-correction note.
 *
 * Real-time feed status for Transport for Wales National Rail services is
 * UNCONFIRMED — a narrower gap than South Wales' Valley Lines "no feed at
 * all" case. Static GTFS via Transitland is confirmed live, but whether
 * Darwin/OpenLDBWS actually carries live TfW data has not been confirmed
 * (data@tfw.wales not yet contacted). This adapter does not assume the feed
 * works just because DARWIN_LDB_TOKEN exists for other UK regions — treat
 * structurally the same as any other unconfirmed/blocked feed: throw
 * MissingDarwinTokenError until the token exists, same as every other UK
 * region, and flag (do not silently assume) the TfW-specific gap remains
 * even once that token is wired. See docs/rest-of-wales-d1/hazard-pack.md H2
 * point 2 and jim-handoff.md.
 *
 * Hub lock: Wrexham General (WRX) only — junction of North Wales Main Line,
 * North Wales Coast Line, and Borderlands Line; largest North Wales station
 * by connectivity. Not Wrexham Central (southern Borderlands terminus,
 * lower connectivity, never catalogued). Aberystwyth (AYW, Mid Wales
 * terminus) and Carmarthen (CMN, West Wales junction) are corridor-
 * significant but explicitly NOT hub-locked — the oracle report names
 * Wrexham as the clear primary pick. See docs/rest-of-wales-d1/hazard-pack.md
 * H6.
 *
 * Three corridors (North Wales, Mid Wales, West Wales) are operationally
 * independent within this catalog — no inter-corridor through-running
 * within Wales (North<->Mid via Shrewsbury/England; Mid<->West via
 * Swansea/South Wales region), same structural fact as the D1 pack's
 * corridor grouping. Flat allow-list here (uk/catalog.js has no corridor
 * grouping concept), but station `class` fields record each station's
 * corridor.
 *
 * doNotGroup: four candidates (Wrexham General's three route directions,
 * Carmarthen's branch-vs-through-running split, Whitland's three-way
 * branch, Machynlleth's Aberystwyth/Pwllheli split) are PROPOSED ONLY in
 * the D1 pack — no platform or service-pattern detail to encode an
 * enforced rule from. None are built here; left flagged in
 * lib/cities/rest-of-wales/stations.json per station `class` notes, to be
 * confirmed against a live Darwin payload once unblocked and TfW real-time
 * status is resolved. See docs/rest-of-wales-d1/hazard-pack.md H4 and
 * doNotGroup proposals.
 *
 * Direction model: destination + operator (e.g. "Holyhead (TfW)",
 * "Manchester Piccadilly (TfW)"), matching how National Rail departure
 * boards actually present — no printed route/line map exists for Darwin,
 * same structural fact as every National Rail-only region in this
 * pipeline. See docs/rest-of-wales-d1/direction-model-memo.md.
 * Illustrative only, not verified against a live Darwin payload — do not
 * invent destination strings beyond what Darwin itself returns once
 * unblocked.
 *
 * Boundary/pass-through stations NOT in this catalog: Chester (CTR,
 * England), Shrewsbury (England, no CRS given, none invented here), and
 * the unnamed Carmarthen-to-Swansea continuation (South Wales region
 * boundary, no boundary station named in the report).
 *
 * CRS codes live-verified 5 Sep 2026 (11 corrected — see
 * docs/jim-brief-uk-crs-corrections.md): seven of this catalog's codes were
 * wrong (Conwy CON->CNW, Holyhead HOY->HHD, Welshpool WEL->WLP, Machynlleth
 * MCH->MCN, Whitland WLD->WTL, Tenby TNB->TEN, Milford Haven MLH->MFH).
 * Fishguard Harbour FGW->FGH was resolved by a follow-up live probe the same
 * morning (FGW is the separate Fishguard & Goodwick station one stop short of
 * the harbour). All 17 stops carry crsVerified: true.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const REST_OF_WALES_TIME_ZONE = "Europe/London";
export const REST_OF_WALES_REGION = "rest-of-wales";
export const REST_OF_WALES_HUB = "Wrexham General";

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, REST_OF_WALES_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(REST_OF_WALES_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(REST_OF_WALES_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists. Even once that
 * token exists, TfW real-time feed status through Darwin remains
 * unconfirmed for this region — see file header.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: REST_OF_WALES_REGION });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, REST_OF_WALES_REGION);
  if (!rail) {
    throw new Error(`Unknown Rest of Wales station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
