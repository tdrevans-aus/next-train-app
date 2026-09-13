/**
 * Rest of England — National Rail (Darwin) catch-all for every English
 * Darwin-verified station that UK station fill phase 2a's fifteen named
 * regions did not claim. Adapter is structural; city stays `planned` in
 * registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail, reused from lib/providers/uk-darwin.js
 * with regionId "rest-of-england" — same allow-list + config pattern as
 * every other UK region (rest-of-wales, west-of-england, southwest, etc.),
 * not a fork. BLOCKED at the account level only insofar as
 * DARWIN_LDB_TOKEN gates every UK region equally — not a feed problem
 * specific to this catalog.
 *
 * WHY THIS REGION EXISTS (docs/jim-brief-uk-station-fill-phase2b.md): Tim
 * rejected stretching existing named regions (uk-west-midlands,
 * greater-manchester, south-yorkshire, etc.) to absorb the 445 English
 * stations phase 2a's own bounding-box/county rules left unclaimed —
 * widening a region beyond its own name was ruled out. With the
 * country-wide station picker (docs/jim-brief-country-wide-station-picker.md)
 * riders search the whole country and never choose a region, so this is an
 * internal home for the data, not something a rider has to find or pick by
 * name — a sibling of rest-of-wales/rest-of-scotland in shape only, not in
 * discoverability.
 *
 * NO HUB LOCK, NO CORRIDOR GROUPING. Unlike every other UK region packed so
 * far, this catalog is not a coherent metro area or county — it is a flat
 * catch-all spanning the whole of England (Kent to Cumbria's boundary,
 * Cornwall's boundary to the Scottish border), so no single station is
 * structurally a hub and no doNotGroup case exists inside this catalog
 * itself (see the NINE STATIONS note below for the one cross-region
 * doNotGroup case this pack participates in, built in greater-manchester/
 * north-east, not here).
 *
 * NINE STATIONS HELD BACK, NOT HERE: Altrincham, Eccles, Manchester
 * Airport, Rochdale (would otherwise be Rest of England) share a printed
 * name with an existing greater-manchester Metrolink stop; Brockley Whins,
 * East Boldon, Heworth, Manors, Seaburn share a printed name with an
 * existing north-east Tyne and Wear Metro stop — in both cases a name
 * hardcoded in that region's own marketing-directions.js line+terminus
 * direction model (unlike e.g. east-midlands's Hucknall, where no
 * direction-model file references the bare name). These nine are
 * catalogued as mode: "train" entries in greater-manchester/north-east
 * instead, each with an explicit doNotGroup pair against the same-name
 * Metro/Metrolink stop (lib/cities/greater-manchester/marketing-directions.js
 * and lib/cities/north-east/marketing-directions.js DO_NOT_GROUP_PAIRS),
 * same pattern as Edinburgh Gateway (Edinburgh) and Partick (Glasgow) from
 * phase 1. See docs/uk-station-fill/unassigned-england.md and
 * docs/uk-station-fill/assignment.md's "Direction-model collisions held
 * back, not force-added" section.
 *
 * excludeOperators: none applied. No station in this catalog was already
 * flagged in docs/united-kingdom-ledger.md as a Caledonian Sleeper or Night
 * Riviera calling point at the time of this pass (Caledonian Sleeper's
 * English calling points — Crewe, Preston, Watford Junction — and every
 * Night Riviera stop the Southwest pack already claims are all outside this
 * 436-station dataset), so there is nothing to exclude here. Flag, don't
 * silently assume, if a future catalog touch adds one of those stations.
 *
 * CRS codes: all 436 entries carry crsVerified: true, crsSource "live
 * Darwin probe 2026-09-14" — these stations were already live-verified
 * against Darwin during UK station fill phase 2a
 * (docs/jim-brief-uk-station-fill-phase2a.md); phase 2b catalogues them
 * into this new region without re-probing. Coordinates are carried from
 * docs/uk-station-fill/unassigned-england.md's own lat/lng columns
 * (sourced from the phase 2a candidate dataset,
 * docs/uk-station-fill/source.md), not re-geocoded here.
 *
 * Direction model: destination + operator (e.g. "London Kings Cross
 * (LNER)"), matching how National Rail departure boards actually present —
 * no printed route/line map exists for Darwin, same structural fact as
 * every National Rail-only region in this pipeline. Illustrative only, not
 * verified against a live Darwin payload — do not invent destination
 * strings beyond what Darwin itself returns once unblocked.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const REST_OF_ENGLAND_TIME_ZONE = "Europe/London";
export const REST_OF_ENGLAND_REGION = "rest-of-england";

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, REST_OF_ENGLAND_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(REST_OF_ENGLAND_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(REST_OF_ENGLAND_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  return fetchDarwinStationBoard(stationIdOrName, { regionId: REST_OF_ENGLAND_REGION });
}

/**
 * Contract-shaped dispatcher — single agency/mode, so this is a thin pass
 * through to fetchNationalRailBoard(). Kept for parity with the other UK
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, REST_OF_ENGLAND_REGION);
  if (!rail) {
    throw new Error(`Unknown Rest of England station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
