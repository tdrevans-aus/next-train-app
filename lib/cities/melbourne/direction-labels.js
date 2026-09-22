/**
 * Melbourne direction-label rules — Tim's decisions, 20 Sep 2026
 * (docs/melbourne-d1/tim-decisions-2026-09-20.md, docs/melbourne-d1/direction-model-memo.md),
 * relabelled to terminus-only/Perth style 22 Sep 2026
 * (docs/jim-brief-melbourne-direction-labels-perth-style.md).
 *
 * Kept as pure, gate-testable functions (no fetch, no GTFS parsing) so
 * qa/melbourne-dogfood-gate.mjs can assert every rule directly:
 *   (a) terminus never blank on the Sunbury/Cranbourne/Pakenham spine
 *   (b) "via City Loop" only at Flinders Street, Southern Cross, Flagstaff,
 *       Melbourne Central, Parliament
 *   (c) "via City Loop" only for a trip whose actual stop sequence touches
 *       a City Loop station (derived per-trip via buildLoopTripIdSet, never
 *       applied to a whole line)
 *   (d) the string "Metro Tunnel" never appears in a Sunbury/Cranbourne/
 *       Pakenham board label
 *   (e) the label is the terminus alone ("Williamstown", "Belgrave via City
 *       Loop") except where the terminus is the shared hub (Flinders
 *       Street), ambiguous across every Metro line — there it's "Flinders
 *       Street (<Line> Line)". No label repeats a word ("<X> Line + <X>" is
 *       retired).
 *   (f) a trip whose terminus is the station being viewed is an arrival, not
 *       a departure — isTerminatingAtStation() lets the adapter drop it
 *       before it reaches a board/direction list.
 */

/** GTFS route_id "code" segment -> official Metro Trains picker line name. */
export const METRO_LINE_NAMES = {
  ALM: "Alamein",
  BEG: "Belgrave",
  CBE: "Cranbourne",
  CGB: "Craigieburn",
  FKN: "Frankston",
  GWY: "Glen Waverley",
  HBE: "Hurstbridge",
  LIL: "Lilydale",
  MDD: "Mernda",
  PKM: "Pakenham",
  RCE: "Racecourse",
  SHM: "Sandringham",
  STY: "Stony Point",
  SUY: "Sunbury",
  UFD: "Upfield",
  WER: "Werribee",
  WIL: "Williamstown",
};

/** Metro Tunnel spine — Tim's decision requires the terminus never be blank here. */
export const METRO_TUNNEL_SPINE_CODES = new Set(["SUY", "CBE", "PKM"]);

/**
 * Tim's decision (20 Sep 2026): "via City Loop" is shown only at the five
 * stops where it changes what the rider sees next.
 */
export const VIA_CITY_LOOP_SUFFIX_STATIONS = new Set([
  "Flinders Street",
  "Southern Cross",
  "Flagstaff",
  "Melbourne Central",
  "Parliament",
]);

/** Three City Loop stations used to detect a via-loop trip from its stop sequence. */
export const CITY_LOOP_STATIONS = new Set(["Flagstaff", "Melbourne Central", "Parliament"]);

/**
 * The one Metro terminus every line shares — a bare "Flinders Street" label
 * doesn't say which line the rider needs, unlike every other (outbound)
 * terminus, which is already unique. Tim's decision, 22 Sep 2026.
 */
export const HUB_TERMINUS = "Flinders Street";

/** Case/suffix-insensitive station-name key, shared by the label and terminating-here logic. */
export function normalizeStationKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

/**
 * A trip whose terminus is the station being viewed is an arrival, not a
 * departure — it should never appear on that station's board or direction
 * list (docs/jim-brief-melbourne-direction-labels-perth-style.md item 3).
 * @param {{ destination: string, stationName: string }} params
 */
export function isTerminatingAtStation({ destination, stationName }) {
  const terminus = normalizeStationKey(stripLoopTunnelSuffix(destination));
  return Boolean(terminus) && terminus === normalizeStationKey(stationName);
}

/**
 * GTFS trip_ids in this feed are shaped `<folder>-<CODE>--<direction>-<run>`,
 * e.g. "02-FKN--67-T5_WD07-4860" (Metro) / "01-ABY--10-T2-8605" (V/Line) —
 * confirmed against a live capture, docs/melbourne-d1/gtfs-reconciliation.md.
 * @param {string} tripId
 * @returns {string} the route code (e.g. "FKN"), or "" if it doesn't match.
 */
export function routeCodeFromTripId(tripId) {
  const match = /^\d+-([A-Za-z]+)--/.exec(String(tripId || ""));
  return match ? match[1].toUpperCase() : "";
}

/**
 * Strip GTFS's own "via City Loop" / "via Metro Tunnel" / "via Altona Loop" headsign suffixes —
 * all are static-schedule/ops artifacts, never passed through verbatim to riders (Tim's
 * decision: the loop suffix is re-derived and re-applied only where it belongs; the tunnel and
 * Altona Loop suffixes are never shown at all). "via Altona Loop" is Werribee/Williamstown-line
 * trips terminating at Flinders Street — stripping it here is what lets the hub-disambiguation
 * check below (`isHubBound`) recognise the terminus as bare "Flinders Street" and add the
 * "(Werribee Line)"/"(Williamstown Line)" suffix, same as any other hub-bound trip
 * (docs/jim-brief-direction-label-aliases-server-side.md Part 2, Mark's #439 amber).
 * @param {string} text
 */
export function stripLoopTunnelSuffix(text) {
  return String(text || "")
    .replace(/\s*via\s+city\s+loop\s*$/i, "")
    .replace(/\s*via\s+metro\s+tunnel\s*$/i, "")
    .replace(/\s*via\s+altona\s+loop\s*$/i, "")
    .trim();
}

/**
 * Build the set of trip_ids that actually call at a City Loop station,
 * derived from the *static* stop_times.txt sequence for the resolved
 * trip_id — the primary signal per direction-model-memo.md §3 (never a
 * time-of-day table, never a whole-line rule).
 * @param {object} staticData GTFS static data (loadGtfsStatic() result)
 * @param {string[]} loopStopIds resolved stop_ids for Flagstaff/Melbourne Central/Parliament
 * @returns {Set<string>} trip_ids that call at any of those stops
 */
export function buildLoopTripIdSet(staticData, loopStopIds) {
  const loopTripIds = new Set();
  for (const stopId of loopStopIds) {
    const stopTimes = staticData?.stopTimesByStopId?.get(stopId) ?? [];
    for (const stopTime of stopTimes) {
      loopTripIds.add(stopTime.trip_id);
    }
  }
  return loopTripIds;
}

/**
 * Terminus-only, Perth style (docs/jim-brief-melbourne-direction-labels-perth-style.md):
 * the label is just the terminus, e.g. "Williamstown" / "Belgrave via City Loop", except
 * where the terminus is Flinders Street — shared by every Metro line, so the line name is
 * added there and only there: "Flinders Street (Williamstown Line)".
 * @param {{ tripId: string, destination: string, stationName: string, isViaLoop: boolean }} params
 * @returns {string} e.g. "Williamstown", "Belgrave via City Loop", "Flinders Street (Williamstown Line)"
 */
export function buildMetroDirectionLabel({ tripId, destination, stationName, isViaLoop }) {
  const code = routeCodeFromTripId(tripId);
  const lineName = METRO_LINE_NAMES[code] || code || "Metro";
  const terminus = stripLoopTunnelSuffix(destination) || lineName;
  const showSuffix = isViaLoop && VIA_CITY_LOOP_SUFFIX_STATIONS.has(stationName);
  const isHubBound = normalizeStationKey(terminus) === normalizeStationKey(HUB_TERMINUS);
  const label = isHubBound ? `${terminus} (${lineName} Line)` : terminus;
  return `${label}${showSuffix ? " via City Loop" : ""}`;
}

/** V/Line route codes with compulsory reservation on every seat — excluded structurally. */
export const VLINE_EXCLUDED_ROUTE_CODES = new Set(["ABY", "WBL"]);

/**
 * @param {string} tripId
 * @returns {boolean} false for Albury (ABY) / Warrnambool (WBL) — fully reserved, `out-reservation`
 *   per docs/melbourne-d1/hazard-pack.md. Every other V/Line route code in the feed is `in`.
 */
export function isVlineTripAllowed(tripId) {
  const code = routeCodeFromTripId(tripId);
  return !VLINE_EXCLUDED_ROUTE_CODES.has(code);
}

/**
 * @param {{ destination: string }} params
 * @returns {string} e.g. "V/Line Traralgon" — distinguishes the second operator at shared
 *   stations per hazard-pack.md's Southern Cross Metro / Southern Cross V/Line doNotGroup entry.
 */
export function buildVlineDirectionLabel({ destination }) {
  return `V/Line ${stripLoopTunnelSuffix(destination)}`;
}
