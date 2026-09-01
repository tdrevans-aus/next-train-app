/**
 * Thames Valley — National Rail (Reading / Oxford) slice. Adapter is
 * structural; city stays `planned` in registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "thames-valley" — same
 * allow-list + config pattern as every other UK National Rail region in
 * this pipeline (uk-west-midlands / east-midlands / west-of-england /
 * solent / london-se-national-rail / glasgow / edinburgh / etc). BLOCKED at
 * the account level (DARWIN_LDB_TOKEN not set) — same blocker as those
 * regions, not a feed problem. Do not wire the token here; that's Tim's RDM
 * re-registration.
 *
 * No static GTFS fallback exists for this feed — National Rail Enquiries
 * does not publish static GTFS anywhere (Darwin is realtime-only, per-station
 * SOAP API), same as West of England / Solent / South Wales / West Yorkshire
 * / Rest of Wales / Rest of Scotland / london-se-national-rail / Glasgow's
 * and Edinburgh's National Rail halves. Do not fabricate a schedule-only
 * fallback; fetchNationalRailBoard() below throws MissingDarwinTokenError.
 *
 * HUB + SECONDARY-HUB architecture, reused from West of England (Bristol
 * Temple Meads/Bath Spa) and Solent (Southampton Central alone, Portsmouth
 * Harbour/Portsmouth & Southsea pair) — NOT full flat multi-group (London SE
 * Option A shape):
 *  - Reading (RDG) is the hub lock — principal interchange, 15 platforms,
 *    three operators (GWR primary, CrossCountry, SWR through-running) but
 *    NO internal doNotGroup — the report explicitly rules out multi-operator
 *    platform mixing at Reading (line 36), so it's a single flat
 *    destination+operator board.
 *  - Oxford (OXF) is the secondary hub — but UNLIKE Bath Spa/Portsmouth &
 *    Southsea it needs an internal doNotGroup split: GWR main line and
 *    Chiltern Railways' Marylebone branch sit on separate platforms and
 *    separate infrastructure at Oxford (report line 16, 37, 56, C2/C3 point
 *    4/6) — "separate boarding logic required per operator." FIRST TIME in
 *    this pipeline a SECONDARY hub (rather than a primary terminus) has
 *    needed an internal doNotGroup split (previously only seen at London
 *    Bridge/Liverpool Street, both primary termini in london-se-national-rail).
 *    Enforced the same way: two catalog entries sharing one physical CRS
 *    (OXF), split by operator, groupId "oxford", doNotGroup: true, each with
 *    its own `operators` list passed as `includeOperators` to the shared
 *    uk-darwin.js fetchStationBoard() — see lib/cities/thames-valley/stations.json.
 *
 * Five through-running-only stations, none merge/hub candidates at D1:
 * Swindon (SWI, GWR main-line continuation upstream of the Westbury
 * boundary), Banbury (BAN, Chiltern + GWR on separate infrastructure at the
 * same town, not a hub, proposed doNotGroup only if ever promoted — not
 * built as split boards here), Westbury (WSB, boundary to West of
 * England/Solent, already flagged reciprocally in both those regions'
 * finished packs), Henley-on-Thames (HEY, GWR branch, single operator),
 * Didcot Parkway (DID, GWR main line, Cotswold Line connection, single
 * operator).
 *
 * London Paddington and London Marylebone are boundary-only references to
 * London & South East National Rail's catalog (Paddington already built
 * there, Marylebone explicitly not built there either) — neither is built
 * here.
 *
 * Direction model: destination + operator, matching every other UK National
 * Rail region's recommendation — no printed route/line map exists for
 * Darwin. At Oxford this applies within each of the two doNotGroup sections
 * (GWR section, Chiltern section), not across them. Illustrative only, not
 * verified against a live Darwin payload — do not invent destination
 * strings beyond what Darwin itself returns once unblocked. See
 * docs/thames-valley-d1/direction-model-memo.md.
 *
 * SKIP RISK — Chiltern Railways operator transition from Arriva to DfT
 * Operator on 20 September 2026 (report skip risk 3): not a blocker, but a
 * timing flag — verify Darwin correctly attributes Chiltern services and any
 * operator/agency mapping reflects the new operator structure once wired on
 * or after that date.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const THAMES_VALLEY_TIME_ZONE = "Europe/London";
export const THAMES_VALLEY_REGION = "thames-valley";
export const THAMES_VALLEY_HUB = "Reading";
export const THAMES_VALLEY_SECONDARY_HUB = "Oxford (GWR)";

/** The one group needing an internal per-operator board split (one CRS, multiple operators). */
export const THAMES_VALLEY_DONOTGROUP_GROUPS = ["oxford"];

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, THAMES_VALLEY_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(THAMES_VALLEY_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(THAMES_VALLEY_REGION);
}

/** All catalog entries (boards) belonging to a given groupId, e.g. "oxford" -> 2 boards. */
export function listBoardsForGroup(groupId) {
  return listNationalRailStations().filter((entry) => entry.groupId === groupId);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Applies includeOperators for
 * Oxford's internal-doNotGroup per-operator sub-boards (GWR, Chiltern).
 * Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName catalog board name, e.g. "Oxford (GWR)"
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  const includeOperators =
    entry?.doNotGroup && entry?.operators?.length ? entry.operators : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: THAMES_VALLEY_REGION,
    includeOperators,
  });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, THAMES_VALLEY_REGION);
  if (!rail) {
    throw new Error(`Unknown Thames Valley station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
