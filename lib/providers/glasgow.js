/**
 * Glasgow — Glasgow Subway (SPT) + National Rail at two independent
 * termini (Glasgow Central, Glasgow Queen Street). Adapter is structural;
 * city stays `planned` in registry.js (Tim's flip call).
 *
 * TWO INDEPENDENT NETWORKS UNDER ONE CITY ID, hybrid shape (see
 * docs/glasgow-d1/jim-handoff.md):
 *  - Glasgow Subway: hub-locked circular metro line (Buchanan Street), the
 *    FIRST closed loop with no termini in this pipeline. Direction model is
 *    printed "Outer Circle" / "Inner Circle" labels, not line+terminus — see
 *    lib/cities/glasgow/subway-directions.js and
 *    docs/glasgow-d1/direction-model-memo.md. No confirmed GTFS-RT feed
 *    exists for SPT. The static feed (TravelWhiz community aggregation,
 *    github.com/travelwhiz-ltd/GB-Bus-Train-Metro-GTFS) is reachable — Jim
 *    confirmed the repo itself responds (200) during D2 — but no confirmed
 *    per-region data file/release path was found within this session's
 *    scope, and the D1 pack's stop-order table (SUBWAY_STATIONS in
 *    subway-directions.js) was never checked against a GTFS
 *    stop_times/stop_sequence dump or an official SPT map
 *    (stationOrderVerified: false, carried forward, not guessed). Licensing
 *    on the underlying SPT timetable data is also 'unclear' (CC BY 4.0 only
 *    covers TravelWhiz's own curation). fetchSubwayStopBoard() throws
 *    GlasgowSubwayFeedUnverifiedError rather than fabricating a schedule —
 *    same "throw, don't guess" contract as South Yorkshire's
 *    SupertramFeedUnconfirmedError / East Midlands' NetFeedUnconfirmedError,
 *    for an adjacent but distinct reason (a source exists and is reachable;
 *    what's missing is a verified stop order + clear license, not the
 *    absence of any source at all).
 *  - National Rail: Darwin/OpenLDBWS, reused from lib/providers/uk-darwin.js
 *    with regionId "glasgow" — same allow-list + direction-model config
 *    pattern as every other UK National Rail region in this pipeline.
 *    BLOCKED at the account level (DARWIN_LDB_TOKEN not set) — same blocker
 *    as those regions, not a feed problem. Do not wire the token here;
 *    that's Tim's RDM re-registration.
 *
 * "OPTION A AT n=2" — NO SINGLE NATIONAL RAIL HUB: Glasgow Central (GLC) and
 * Glasgow Queen Street (GLQ) are separate buildings, not rail-connected,
 * serving genuinely different corridors (Central: cross-border south via
 * Avanti West Coast + ScotRail through-running; Queen Street: Scottish
 * regional north via ScotRail only). Modelled as two independent catalog
 * entries, same shape as london-se-national-rail's multi-group pattern but
 * at a much smaller scale — neither needs INTERNAL doNotGroup (no evidence
 * of separate platform/boarding-section logic per operator at either, unlike
 * London Bridge/Liverpool Street), so each is one flat destination+operator
 * board. See docs/glasgow-d1/jim-handoff.md.
 *
 * Buchanan Street (Subway) is a THIRD, separate hub — not folded into
 * stationGroups, not merged with Glasgow Queen Street despite the travelator
 * connection (doNotGroup). St Enoch (Subway) vs Glasgow Central is the same
 * shape (short walk only, not connected, doNotGroup). See
 * lib/cities/glasgow/subway-directions.js DO_NOT_GROUP_PAIRS and
 * docs/glasgow-d1/hazard-pack.md H1/H4.
 *
 * Caledonian Sleeper excluded at Glasgow Central only (out-reservation, per
 * docs/board-eligibility-rule.md) — enforced via the shared uk-darwin.js
 * excludeOperators option, same mechanism as Rest of Scotland/
 * london-se-national-rail.
 *
 * Falkirk High (FKK) is EXCLUDED — owned by the Edinburgh region per the
 * exclusive-territory split (Tim's decision, oracle report line 11/91), not
 * catalogued here at all. No docs/united-kingdom-ledger.md exists yet to
 * hold this centrally (flagged again, not resolved here).
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
import {
  SUBWAY_HUB,
  SUBWAY_DIRECTIONS,
  SUBWAY_STATIONS,
  SUBWAY_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  marketingLabelsForStation,
  mapSubwayDestination,
  isSubwayStation,
  isForbiddenCollapseName,
  foldKey,
} from "../cities/glasgow/subway-directions.js";

export const GLASGOW_TIME_ZONE = "Europe/London";
export const GLASGOW_REGION = "glasgow";
/** Two independent National Rail groups — no single hub-lock ("Option A at n=2"). */
export const GLASGOW_NATIONAL_RAIL_GROUPS = ["glasgow-central", "glasgow-queen-street"];

export class GlasgowSubwayFeedUnverifiedError extends Error {
  constructor(stationIdOrName) {
    super(
      `Glasgow Subway's static feed cannot currently back a live board — ${stationIdOrName} board cannot be built. ` +
        "No confirmed public GTFS-RT feed exists for SPT (data@spt.co.uk not yet contacted). The static candidate " +
        "(TravelWhiz community aggregation, github.com/travelwhiz-ltd/GB-Bus-Train-Metro-GTFS) is reachable but no " +
        "confirmed per-region data file/release was found for this pack, and the D1 station-order table was never " +
        "checked against a GTFS stop_times/stop_sequence dump or an official SPT map (stationOrderVerified: false). " +
        "License on the underlying SPT timetable data is also 'unclear'. See lib/cities/glasgow/subway-directions.js " +
        "and docs/glasgow-d1/hazard-pack.md."
    );
    this.name = "GlasgowSubwayFeedUnverifiedError";
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
    return resolveRailEntry(raw, GLASGOW_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, GLASGOW_REGION);
  }
  return resolveRailEntry(raw, GLASGOW_REGION) ?? resolveMetroEntry(raw, GLASGOW_REGION);
}

/** @param {{ mode?: "train"|"metro" }} [options] */
export function listCatalogStations(options = {}) {
  return listRegionCatalogStations(GLASGOW_REGION, options);
}

export function listSubwayStops() {
  return listMetroStops(GLASGOW_REGION);
}

export function listNationalRailStations() {
  return listRailStations(GLASGOW_REGION);
}

/** All National Rail catalog entries belonging to a given group, e.g. "glasgow-central". */
export function listNationalRailStationsForGroup(groupId) {
  const needle = foldKey(groupId).replace(/-/g, " ");
  return listNationalRailStations().filter((entry) => foldKey(entry.name) === needle);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + direction
 * model config over the shared Darwin provider, not a fork). Applies
 * excludeOperators for Glasgow Central's Caledonian Sleeper out-reservation
 * exclusion (Glasgow Queen Street has none). Throws MissingDarwinTokenError
 * until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const entry = resolveRailEntry(stationIdOrName, GLASGOW_REGION);
  const excludeOperators = entry?.excludeOperators?.length ? entry.excludeOperators : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: GLASGOW_REGION,
    excludeOperators,
  });
}

/**
 * Subway board — NOT implemented. See GlasgowSubwayFeedUnverifiedError /
 * file header: no confirmed GTFS-RT, and the static candidate's stop order
 * and license are both unverified.
 * @param {string} stationIdOrName
 */
export async function fetchSubwayStopBoard(stationIdOrName) {
  const entry = resolveMetroEntry(stationIdOrName, GLASGOW_REGION);
  if (!entry) {
    throw new Error(`Unknown Glasgow Subway stop: ${stationIdOrName}`);
  }
  throw new GlasgowSubwayFeedUnverifiedError(entry.name);
}

/**
 * Contract-shaped dispatcher — resolves the station's mode and calls the
 * matching board fetcher. Structural only; both paths currently throw
 * (MissingDarwinTokenError for rail, GlasgowSubwayFeedUnverifiedError for
 * Subway) because neither is unblocked yet. Kept for parity with the other
 * adapters' fetchStationBoard(stationIdOrName) contract shape.
 * @param {string} stationIdOrName
 */
export async function fetchStationBoard(stationIdOrName) {
  const rail = resolveRailEntry(stationIdOrName, GLASGOW_REGION);
  if (rail) {
    return fetchNationalRailBoard(stationIdOrName);
  }
  const metro = resolveMetroEntry(stationIdOrName, GLASGOW_REGION);
  if (metro) {
    return fetchSubwayStopBoard(stationIdOrName);
  }
  throw new Error(`Unknown Glasgow station: ${stationIdOrName}`);
}

export {
  SUBWAY_HUB,
  SUBWAY_DIRECTIONS,
  SUBWAY_STATIONS,
  SUBWAY_STATION_ORDER_VERIFIED,
  DO_NOT_GROUP_PAIRS,
  marketingLabelsForStation,
  mapSubwayDestination,
  isSubwayStation,
  isForbiddenCollapseName,
  foldKey,
  MissingDarwinTokenError,
};
export { getNotInRegion };
