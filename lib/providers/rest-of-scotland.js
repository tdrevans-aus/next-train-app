/**
 * Rest of Scotland — National Rail (four co-equal hub locks: Perth, Inverness,
 * Aberdeen, Dundee) slice. Adapter is structural; city stays `planned` in
 * registry.js (Tim's flip call).
 *
 * One agency, one mode: National Rail (Darwin/OpenLDBWS), reused from
 * lib/providers/uk-darwin.js with regionId "rest-of-scotland" — same
 * allow-list + config pattern as every other UK National Rail region in this
 * pipeline (uk-west-midlands / uk-ellesmere-port / east-midlands /
 * south-yorkshire / north-east / west-of-england / south-wales /
 * west-yorkshire / rest-of-wales). BLOCKED at the account level
 * (DARWIN_LDB_TOKEN not set) — same blocker as those regions, not a feed
 * problem. Do not wire the token here; that's Tim's RDM re-registration.
 *
 * STRUCTURAL DEPARTURE FROM EVERY PRIOR UK REGION: FOUR CO-EQUAL HUB LOCKS,
 * not one primary hub (with or without a secondary). Every other UK region
 * packed so far locks a single primary hub, sometimes with one secondary
 * (e.g. West of England: Bristol Temple Meads + Bath Spa). The Rest of
 * Scotland oracle report gives no basis to rank Perth (PTH), Inverness
 * (INV), Aberdeen (ABD), Dundee (DDE) into a hierarchy — each is
 * independently a genuine terminus or multi-line junction. See
 * docs/rest-of-scotland-d1/hazard-pack.md H6 and jim-handoff.md.
 *
 * CONFIRMED: the shared board-fetch pattern (lib/providers/uk-darwin.js +
 * lib/providers/uk/catalog.js) generalises to N co-equal hubs with no code
 * change needed. uk/catalog.js's region catalog is a flat per-station
 * allow-list — resolveRailEntry()/fetchStationBoard() resolve one station at
 * a time by CRS or name, with no single-hub assumption anywhere in the
 * shared code; "hub" is a documentation label in each station's `class`
 * field (lib/cities/<region>/stations.json), not a structural constraint.
 * West of England's two co-equal-ish hubs already exercised this; this
 * region's four hubs are the same shape, just more of them. No design
 * change to uk-darwin.js or uk/catalog.js was needed to support this — see
 * lib/cities/rest-of-scotland/stations.json, which lists all four hubs as
 * flat "hub lock — tier 1" entries.
 *
 * PERTH NAME COLLISION — FLAGGED, NOT RESOLVED HERE: "Perth" (PTH CRS) in
 * this catalog is Perth, Scotland — a UK National Rail station — and is
 * UNRELATED to the existing LIVE city `perth` (Perth, Australia,
 * lib/providers/perth.js, lib/cities/perth/). The two are different city ids
 * (`rest-of-scotland` vs `perth`) and this adapter never resolves or
 * dispatches through lib/providers/perth.js or vice versa — there is no code
 * collision. The collision is a DISPLAY-STRING one only: two cities share
 * the printed name "Perth". No disambiguation string (e.g. "Perth, Scotland"
 * vs "Perth, Australia") has been invented here — that is a UI/product call
 * for Tim, not something to guess at during adapter wiring. See
 * docs/rest-of-scotland-d1/jim-handoff.md open item 4.
 *
 * CALEDONIAN SLEEPER — out-reservation, excluded per-station, not city-wide.
 * Per docs/board-eligibility-rule.md, Caledonian Sleeper carries verdict
 * `out-reservation` (compulsory berth booking; the staff platform check-in
 * 60-90 min before departure is a reservation check, not a walk-up check-in
 * barrier) and must be excluded from the board at the four stations it
 * calls within this catalog: Aberdeen, Inverness, Fort William, Mallaig. It
 * does NOT call at Perth or Dundee at all, so no exclusion is needed (or
 * applied) there. ScotRail, CrossCountry, and LNER Highland Chieftain all
 * verdict `in` at every station they call — no operator-level filtering
 * applied to them.
 *
 * This is enforced in code, not just documented: uk-darwin.js's
 * parseServiceBlock now extracts each service's Darwin `<operator>` tag
 * (carried through as `trip.operator`, an addition to the shared parser —
 * not part of the ProviderTrip contract typedef, but harmless extra data)
 * and fetchStationBoard() accepts an `excludeOperators` option that filters
 * matching trips out of the board before it's returned. This adapter passes
 * `excludeOperators: ["Caledonian Sleeper"]` only for the four affected
 * stations. Unverified against a live Darwin payload (DARWIN_LDB_TOKEN is
 * unset) — the operator-name match is a case-insensitive substring test
 * against whatever string Darwin's `<operator>` tag actually returns for
 * Caledonian Sleeper services; confirm this string once the feed is
 * unblocked (see docs/rest-of-scotland-d1/hazard-pack.md Board eligibility
 * table).
 *
 * Regional boundary vs. future Glasgow/Edinburgh regions (Falkirk High area)
 * is UNRESOLVED per the oracle report and the task brief for this pack —
 * this catalog stays north of that boundary and does not include Falkirk
 * High or any Central Belt station. Not resolved here; flagged for whoever
 * builds Glasgow/Edinburgh next.
 *
 * Direction model: destination + operator (e.g. "Inverness (ScotRail)",
 * "London King's Cross (LNER)"), matching every other UK National Rail
 * region's recommendation — no printed route/line map exists for Darwin.
 * Illustrative only, not verified against a live Darwin payload — do not
 * invent destination strings beyond what Darwin itself returns once
 * unblocked. See docs/rest-of-scotland-d1/direction-model-memo.md.
 */

import {
  listCatalogStations as listRegionCatalogStations,
  listRailStations,
  resolveRailEntry,
  getNotInRegion,
} from "./uk/catalog.js";
import { fetchStationBoard as fetchDarwinStationBoard, MissingDarwinTokenError } from "./uk-darwin.js";

export const REST_OF_SCOTLAND_TIME_ZONE = "Europe/London";
export const REST_OF_SCOTLAND_REGION = "rest-of-scotland";
/** Four co-equal tier-1 hub locks — no single primary hub. See file header. */
export const REST_OF_SCOTLAND_HUBS = ["Perth", "Inverness", "Aberdeen", "Dundee"];

/** Caledonian Sleeper operator-name token, matched case-insensitively against Darwin's <operator>. */
const CALEDONIAN_SLEEPER_OPERATOR = "Caledonian Sleeper";

/**
 * Stations where Caledonian Sleeper is excluded from the board (out-reservation,
 * per docs/board-eligibility-rule.md) — per-station, not city-wide. It does not
 * call at Perth or Dundee at all.
 */
const CALEDONIAN_SLEEPER_EXCLUDED_STATIONS = new Set(["ABD", "INV", "FTW", "MLG"]);

/**
 * @param {string} stationIdOrName
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  return resolveRailEntry(raw, REST_OF_SCOTLAND_REGION);
}

export function listCatalogStations() {
  return listRegionCatalogStations(REST_OF_SCOTLAND_REGION, { mode: "train" });
}

export function listNationalRailStations() {
  return listRailStations(REST_OF_SCOTLAND_REGION);
}

/** True when Caledonian Sleeper must be excluded from this station's board. */
export function excludesCaledonianSleeper(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  if (!entry?.crs) {
    return false;
  }
  return CALEDONIAN_SLEEPER_EXCLUDED_STATIONS.has(entry.crs);
}

/**
 * National Rail board — reuses uk-darwin.js verbatim (allow-list + config
 * over the shared Darwin provider, not a fork), plus the shared
 * excludeOperators filter for Caledonian Sleeper at the four stations it
 * calls. Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN exists.
 * @param {string} stationIdOrName CRS code or catalog name
 */
export async function fetchNationalRailBoard(stationIdOrName) {
  const excludeOperators = excludesCaledonianSleeper(stationIdOrName)
    ? [CALEDONIAN_SLEEPER_OPERATOR]
    : undefined;
  return fetchDarwinStationBoard(stationIdOrName, {
    regionId: REST_OF_SCOTLAND_REGION,
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
  const rail = resolveRailEntry(stationIdOrName, REST_OF_SCOTLAND_REGION);
  if (!rail) {
    throw new Error(`Unknown Rest of Scotland station: ${stationIdOrName}`);
  }
  return fetchNationalRailBoard(stationIdOrName);
}

export { MissingDarwinTokenError };
export { getNotInRegion };
