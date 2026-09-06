/**
 * Edinburgh — Edinburgh Trams (T50) + National Rail single hub-lock
 * (Edinburgh Waverley) with two through-running satellites (Haymarket,
 * Slateford). Adapter is structural; city stays `planned` in registry.js
 * (Tim's flip call).
 *
 * STRUCTURALLY DIFFERENT FROM GLASGOW — see docs/edinburgh-d1/jim-handoff.md:
 * Glasgow needed "Option A at n=2" (two independent National Rail
 * stationGroups, no forced single hub) because Glasgow Central and Glasgow
 * Queen Street are separate buildings serving genuinely different corridors.
 * Edinburgh does NOT need that treatment — Edinburgh Waverley is the one
 * National Rail hub; Haymarket and Slateford are through-running satellite
 * stations on the same route network, closer to Newcastle/Rotterdam's
 * single-hub shape than to Glasgow's or london-se-national-rail's multi-hub
 * shape. Three stationGroups (edinburgh-waverley, haymarket, slateford)
 * exist because each is a distinct physical station with its own CRS, not
 * because this is a multi-hub city.
 *
 *  - Edinburgh Trams T50: hub-locked (in name only — "Edinburgh Waverley"
 *    area stop) point-to-point line with two confirmed termini (Newhaven,
 *    Edinburgh Airport). Standard line+terminus direction model, NOT
 *    Glasgow Subway's closed-loop Outer/Inner Circle model — see
 *    lib/cities/edinburgh/tram-directions.js and
 *    docs/edinburgh-d1/direction-model-memo.md Part 1. No confirmed
 *    real-time feed exists (TfE Open Data API closed/inactive, no successor
 *    confirmed) and the D1 pack's stop order was never checked against an
 *    official Edinburgh Trams map or the DFT BODS GTFS's stop_sequence
 *    (stationOrderVerified: false, carried forward, not guessed). Unlike
 *    Glasgow Subway, the static GTFS source itself IS confirmed reachable
 *    with a clear license (DFT BODS, OGL 3.0) — but it was not fetched or
 *    parsed by this pack, so fetchTramStopBoard() throws
 *    EdinburghTramsFeedUnverifiedError rather than fabricating a schedule,
 *    same "throw, don't guess" contract as
 *    lib/providers/glasgow.js's GlasgowSubwayFeedUnverifiedError.
 *  - National Rail: Darwin/OpenLDBWS, reused from lib/providers/uk-darwin.js
 *    with regionId "edinburgh" — same allow-list + direction-model config
 *    pattern as every other UK National Rail region in this pipeline.
 *    BLOCKED at the account level (DARWIN_LDB_TOKEN not set) — same blocker
 *    as those regions, not a feed problem. Do not wire the token here;
 *    that's Tim's RDM re-registration.
 *
 * Edinburgh Waverley DOES need cross-mode doNotGroup: the Trams line's
 * hub-lock is also "Edinburgh Waverley" in name, but is a separate physical
 * stop from the National Rail station — enforced via
 * lib/cities/edinburgh/tram-directions.js DO_NOT_GROUP_PAIRS, not a
 * name-matching heuristic. Haymarket carries the same two-catalog-entries
 * shape (Trams stop vs National Rail station) kept distinct by mode-scoped
 * lookup.
 *
 * Caledonian Sleeper excluded at Edinburgh Waverley only (out-reservation,
 * per docs/board-eligibility-rule.md) — enforced via the shared
 * uk-darwin.js excludeOperators option, same mechanism as Rest of Scotland/
 * london-se-national-rail/Glasgow.
 *
 * Falkirk High is EXCLUDED — Edinburgh's own oracle report never lists it
 * as an Edinburgh station (report line 9 names it "Glasgow's boundary
 * station"), while Glasgow's already-merged pack's prose calls it "owned by
 * Edinburgh region." Both packs independently exclude it (no functional
 * contradiction); the ownership question is unresolved prose flagged back
 * to Nico/Tim, not settled here. No docs/united-kingdom-ledger.md exists
 * yet to hold this centrally (flagged again, not resolved here).
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  listMetroStops,
  resolveRailEntry,
  resolveMetroEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";
import { FeedUnconfirmedError } from "./contract.js";
import {
  TRAM_LINE_ID,
  TRAM_LINE_NUMBER,
  TRAM_TERMINI,
  TRAM_DIRECTIONS,
  TRAM_STATIONS,
  TRAM_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  marketingLabelsForStation,
  mapTramDestination,
  isTramStation,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/edinburgh/tram-directions.js";

export const EDINBURGH_TIME_ZONE = "Europe/London";
export const EDINBURGH_REGION = "edinburgh";
/** Single National Rail hub with two through-running satellites — not a multi-hub region. */
export const EDINBURGH_NATIONAL_RAIL_HUB = "edinburgh-waverley";
export const EDINBURGH_NATIONAL_RAIL_SATELLITES = ["haymarket", "slateford"];

export class EdinburghTramsFeedUnverifiedError extends FeedUnconfirmedError {
  constructor(stationIdOrName) {
    super({
      agency: "Edinburgh Trams",
      station: stationIdOrName,
      alternative: "National Rail stations in Edinburgh still show live times.",
      detail:
        `Edinburgh Trams' feed cannot currently back a live board — ${stationIdOrName} board cannot be built. ` +
        "No confirmed real-time feed exists (TfE Open Data API is closed/inactive, no successor confirmed; " +
        "contact trams@tfe.scot). The static source (DFT BODS, OGL 3.0) is confirmed reachable but was not " +
        "fetched or parsed by this pack, and the D1 station-order table was never checked against an official " +
        "Edinburgh Trams map or the GTFS stop_times/stop_sequence columns (stationOrderVerified: false). See " +
        "lib/cities/edinburgh/tram-directions.js and docs/edinburgh-d1/hazard-pack.md.",
      name: "EdinburghTramsFeedUnverifiedError",
    });
  }
}

/**
 * @param {string} stationIdOrName
 * @param {"train"|"metro"} [mode]
 */
export function resolveCatalogEntry(stationIdOrName, mode) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  if (mode === "train") {
    return resolveRailEntry(raw, EDINBURGH_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, EDINBURGH_REGION);
  }
  return resolveRailEntry(raw, EDINBURGH_REGION) ?? resolveMetroEntry(raw, EDINBURGH_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(EDINBURGH_REGION, options);
}

export function listTramStops() {
  return listMetroStops(EDINBURGH_REGION);
}

export function listNationalRailStations() {
  return listRailStations(EDINBURGH_REGION);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Applies
 * excludeOperators for Edinburgh Waverley's Caledonian Sleeper
 * out-reservation exclusion (Haymarket/Slateford have none). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const entry = resolveRailEntry(stationIdOrName, EDINBURGH_REGION);
  const excludeOperators = entry?.excludeOperators?.length ? entry.excludeOperators : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: EDINBURGH_REGION,
    excludeOperators,
  });
}

/**
 * Trams board — NOT implemented. See EdinburghTramsFeedUnverifiedError /
 * file header: no confirmed real-time feed, and the static source's stop
 * order was never fetched/verified by this pack.
 * @param {string} stationIdOrName
 */
export async function fetchTramStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, EDINBURGH_REGION);
  if (!entry) {
    throw new Error(`Unknown Edinburgh Trams stop: ${stationIdOrName}`);
  }
  throw new EdinburghTramsFeedUnverifiedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for rail, EdinburghTramsFeedUnverifiedError for
 * Trams) because neither is unblocked yet. Kept for parity with the other
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, EDINBURGH_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const tram = resolveMetroEntry(stationIdOrName, EDINBURGH_REGION);
  if (tram) {
    return fetchTramStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown Edinburgh station: ${stationIdOrName}`);
}

export {
  TRAM_LINE_ID,
  TRAM_LINE_NUMBER,
  TRAM_TERMINI,
  TRAM_DIRECTIONS,
  TRAM_STATIONS,
  TRAM_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  marketingLabelsForStation,
  mapTramDestination,
  isTramStation,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
