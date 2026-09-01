/**
 * London & South East National Rail — seven independent per-terminus station
 * groups (Waterloo, Victoria, London Bridge, Liverpool Street, King's Cross,
 * St Pancras International, Paddington). Adapter is structural; city stays
 * `planned` in registry.js (Tim's flip call).
 *
 * One agency (National Rail, several TOCs), one mode: Darwin/OpenLDBWS,
 * reused from lib/providers/uk-darwin.js with regionId
 * "london-se-national-rail" — same allow-list + config pattern as every
 * other UK National Rail region in this pipeline (uk-west-midlands /
 * uk-ellesmere-port / east-midlands / south-yorkshire / north-east /
 * west-of-england / south-wales / west-yorkshire / rest-of-wales /
 * rest-of-scotland). BLOCKED at the account level (DARWIN_LDB_TOKEN not
 * set) — same blocker as those regions, not a feed problem. Do not wire the
 * token here; that's Tim's RDM re-registration.
 *
 * FIRST MULTI-GROUP REGION — NO SINGLE HUB-LOCK. Every prior UK region (and
 * every AU/NZ/CA city) used one locked hub station and one CityConfig hub.
 * Tim's Option A decision (docs/london-se-national-rail-d1/jim-handoff.md)
 * is seven independent per-terminus station groups instead, each with its
 * own operator set and its own direction model — not alternate routes to
 * the same place, genuinely separate destinations (report line 57). Euston
 * is NOT built (no named in-scope regional operator in the oracle report)
 * and seven secondary termini are NOT built (report-marked TBD). See
 * docs/london-se-national-rail-d1/published-network.json notBuilt.
 *
 * DESIGN DECISION (this pack's call, flagged in jim-handoff.md as
 * unresolved going in): the existing single-hub CityConfig/catalog shape
 * DOES extend cleanly to multiple groups under one city id — no new
 * plumbing layer was needed. lib/providers/uk/catalog.js's region catalog
 * is a flat allow-list keyed by station NAME/alias (not forced 1:1 with
 * CRS) — so each of the seven groups is simply its own catalog entry (or,
 * for the two internal-doNotGroup cases below, multiple entries sharing one
 * physical CRS, split by operator). No `stationGroups`-aware layer, no
 * per-city multi-hub CityConfig extension, and no fork of uk-darwin.js was
 * required. This is a genuinely new PATTERN worth flagging for later
 * multi-group regions: a "group" is just N catalog entries with a shared
 * `groupId` and, where doNotGroup applies, an `includeOperators` filter
 * (see below) rather than a shared `crs`. See
 * lib/cities/london-se-national-rail/stations.json for the full shape.
 *
 * INTERNAL doNotGroup (two groups, three total sub-boards + two total
 * sub-boards): London Bridge (Southeastern / Southern / Thameslink, one CRS
 * LBG, three operators, three separate boarding sections) and Liverpool
 * Street (Greater Anglia / c2c, one CRS LST, two operators, two separate
 * boarding sections). This is a NEW enforcement need beyond every prior UK
 * region's doNotGroup cases, which were always between two DIFFERENT CRS
 * codes (e.g. West Yorkshire's Bradford Forster Square vs. Bradford
 * Interchange) — never a split of one CRS's own Darwin board. Enforced by a
 * new `includeOperators` option added to the shared uk-darwin.js
 * fetchStationBoard() (symmetric to the existing `excludeOperators` option
 * added for Rest of Scotland's Caledonian Sleeper exclusion) — matches
 * Darwin's `<operator>` tag, case-insensitive substring, fails CLOSED
 * (unlike excludeOperators, which fails open: a trip with no operator tag
 * never passes an includeOperators allow-list). Unverified against a live
 * payload since DARWIN_LDB_TOKEN is unset — confirm the exact operator
 * strings Darwin returns (e.g. "Southeastern" vs "SouthEastern") once
 * unblocked.
 *
 * EXCLUDED-OPERATOR groups (single board, one exclusion each, existing
 * excludeOperators option, no new plumbing): King's Cross excludes LNER
 * (board-eligibility verdict `undecided` — this pack's own research
 * attempt could not obtain verifiable operator-policy text, so it stays
 * excluded per the walk-up rule rather than defaulting to in — see
 * jim-handoff.md); St Pancras International excludes Eurostar
 * (out-checkin); Paddington excludes Night Riviera Sleeper
 * (out-reservation).
 *
 * Waterloo (single operator, SWR) and Victoria (Southern + Gatwick Express,
 * same agency family) need no operator filtering at all — every operator
 * that calls there is in-scope, so their boards pass through unfiltered.
 *
 * CRS codes are UNVERIFIED (crsVerified: false throughout the D1 pack) —
 * carried from the oracle report's own "examples" list, not confirmed
 * against a live GTFS dump or Darwin response. Confirm before treating as
 * authoritative once Darwin is unblocked.
 *
 * Direction model: destination + operator (e.g. "Brighton (Southern)"),
 * matching every other UK National Rail region's recommendation — no
 * printed route/line map exists for Darwin. Illustrative only, not
 * verified against a live Darwin payload. See
 * docs/london-se-national-rail-d1/direction-model-memo.md.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const LONDON_SE_NATIONAL_RAIL_TIME_ZONE = "Europe/London";
export const LONDON_SE_NATIONAL_RAIL_REGION = "london-se-national-rail";

/** Seven independent per-terminus station groups — no single hub-lock (Tim's Option A). */
export const LONDON_SE_NATIONAL_RAIL_GROUPS = [
  "waterloo",
  "victoria",
  "london-bridge",
  "liverpool-street",
  "kings-cross",
  "st-pancras-international",
  "paddington",
];

/** The two groups needing an internal per-operator board split (one CRS, multiple operators). */
export const LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS = ["london-bridge", "liverpool-street"];

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, LONDON_SE_NATIONAL_RAIL_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(LONDON_SE_NATIONAL_RAIL_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(LONDON_SE_NATIONAL_RAIL_REGION);
}

/** All catalog entries (boards) belonging to a given groupId, e.g. "london-bridge" -> 3 boards. */
export function listBoardsForGroup(groupId) {
  return listNationalRailStations().filter((entry) => entry.groupId === groupId);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork). Applies excludeOperators
 * for the three single-board exclusion groups (King's Cross/LNER, St
 * Pancras International/Eurostar, Paddington/Night Riviera Sleeper) and
 * includeOperators for the two internal-doNotGroup groups' per-operator
 * sub-boards (London Bridge, Liverpool Street). Throws
 * MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName catalog board name, e.g. "London Bridge (Southeastern)"
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  const excludeOperators = entry?.excludeOperators?.length ? entry.excludeOperators : undefined;
  const includeOperators =
    entry?.doNotGroup && entry?.operators?.length ? entry.operators : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: LONDON_SE_NATIONAL_RAIL_REGION,
    excludeOperators,
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
  const rail = resolveRailEntry(stationIdOrName, LONDON_SE_NATIONAL_RAIL_REGION);
  if (!rail) {
    throw new Error(`Unknown London & South East National Rail station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
