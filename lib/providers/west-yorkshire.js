/**
 * West Yorkshire — National Rail (Leeds Station hub, Bradford Forster
 * Square secondary hub) slice. Adapter is structural; city stays `planned`
 * in registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "west-yorkshire" — same
 * allow-list + config pattern as uk-west-midlands / uk-ellesmere-port /
 * east-midlands / south-yorkshire / north-east / west-of-england /
 * south-wales. BLOCKED at the account level (DARWIN_LDB_TOKEN not set) —
 * same blocker as those regions, not a feed problem. Do not wire the token
 * here; that's Tim's RDM re-registration.
 *
 * Board eligibility (docs/west-yorkshire-d1/oracle-clash-report.md, per
 * docs/board-eligibility-rule.md): Northern Trains, LNER, CrossCountry, and
 * TransPennine Express are all verdict `in` at every in-catalog station
 * (no compulsory reservation, no check-in barrier). Because every operator
 * calling here passes the walk-up boarding contract, this adapter applies
 * NO operator-level filtering — fetchStationBoard() returns every Darwin
 * trainServices entry unfiltered, same as the shared uk-darwin.js path. If
 * a future operator with a non-`in` verdict starts calling at one of these
 * CRS codes, filtering logic must be added here — do not silently drop rows
 * without recording the verdict per the rule.
 *
 * Hub lock: Leeds Station (LDS) — major interchange, 18 platforms (0-17),
 * Network Rail. Secondary hub: Bradford Forster Square (BDQ) — main
 * Bradford rail station. Bradford Interchange (BDI) is a SEPARATE catalog
 * entry, connected to BDQ only by walk-link (not a shared platform) —
 * doNotGroup applies between BDQ and BDI. Both remain in-catalog because
 * BDI also carries National Rail (Northern Trains) service, not just bus.
 * See docs/west-yorkshire-d1/hazard-pack.md H1/H6 and jim-handoff.md.
 *
 * Direction model: destination + operator (e.g. "Manchester Piccadilly
 * (TransPennine Express)", "Sheffield (Northern)"), matching how National
 * Rail departure boards actually present — no printed route/line map
 * exists for Darwin, same structural fact as every National Rail-only
 * region in this pipeline. See docs/west-yorkshire-d1/direction-model-memo.md.
 * Illustrative only, not verified against a live Darwin payload — do not
 * invent destination strings beyond what Darwin itself returns once
 * unblocked.
 *
 * Denby Dale (DDL) and Walsden (WAD) are through-running-only boundary
 * stations, not merge points. KNOWN OPEN ITEM, not resolved here: Denby
 * Dale is also carried in South Yorkshire's own catalog (CRS left null
 * there) — cross-region de-dup NOT resolved between the two regions, a
 * D2/Tim item. Walsden's Greater Manchester counterpart pack does not exist
 * yet. See docs/west-yorkshire-d1/jim-handoff.md.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const WEST_YORKSHIRE_TIME_ZONE = "Europe/London";
export const WEST_YORKSHIRE_REGION = "west-yorkshire";
export const WEST_YORKSHIRE_HUB = "Leeds Station";
export const WEST_YORKSHIRE_SECONDARY_HUB = "Bradford Forster Square";

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, WEST_YORKSHIRE_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(WEST_YORKSHIRE_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(WEST_YORKSHIRE_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists. No operator
 * filtering — every operator calling here is Board-eligibility verdict
 * `in` (see file header).
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: WEST_YORKSHIRE_REGION });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, WEST_YORKSHIRE_REGION);
  if (!rail) {
    throw new Error(`Unknown West Yorkshire station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
