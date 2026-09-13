/**
 * Glasgow Subway direction model — a true circular line with no termini,
 * the first case of this shape in the pipeline (every prior metro/light-rail
 * line, including this same file's own North East/South Yorkshire cousins,
 * has named termini to build a "line + terminus" chip from). See
 * docs/glasgow-d1/direction-model-memo.md Part 1.
 *
 * RECOMMENDATION (Tim to confirm literal signage wording before D5 assertion
 * tables): use the operator's own printed/signed direction names directly —
 * "Outer Circle" (clockwise) and "Inner Circle" (anticlockwise) — rather than
 * inventing a terminus. Both directions call at every station on a closed
 * loop, so unlike a line+terminus chip, this label needs NO station order at
 * all: "Subway + Outer Circle" / "Subway + Inner Circle" are valid marketing
 * labels at any of the 15 stations, without knowing which platform is which
 * at a given station.
 *
 * What DOES need a verified station order (deliberately NOT built here):
 * computing which physical platform is "Outer" vs "Inner" at a given
 * station, or any next-station logic. SUBWAY_STATIONS below is carried
 * verbatim from docs/glasgow-d1/published-network.json, which itself
 * transcribes the oracle report's station-name table — plausible loop order,
 * never confirmed against an official SPT map or the TravelWhiz GTFS's
 * stop_times/stop_sequence columns. stationOrderVerified stays false. Jim's
 * D2 attempt to independently verify this against the TravelWhiz GTFS
 * (github.com/travelwhiz-ltd/GB-Bus-Train-Metro-GTFS) found the repo
 * reachable but no confirmed per-region data file/release path within this
 * session's scope — carried forward unverified rather than guessed. See
 * GlasgowSubwayFeedUnverifiedError in lib/providers/glasgow.js.
 */

export const SUBWAY_HUB = "Buchanan Street";

/** Printed/signed direction labels — do not invent a terminus-based label. */
export const SUBWAY_DIRECTIONS = ["Outer Circle", "Inner Circle"];

/**
 * Candidate loop order transcribed from the oracle report's station table
 * (docs/glasgow-d1/published-network.json lines[0].stations). NOT verified —
 * see file header. Not used by marketingLabelsForStation() below (which
 * needs no order), kept only for a future pass that verifies it.
 */
export const SUBWAY_STATIONS = [
  "Partick",
  "Kelvinhall",
  "Hillhead",
  "Kelvinbridge",
  "St George's Cross",
  "Cowcaddens",
  "Buchanan Street",
  "St Enoch",
  "Bridge Street",
  "West Street",
  "Shields Road",
  "Kinning Park",
  "Cessnock",
  "Ibrox",
  "Govan",
];

export const SUBWAY_STATION_ORDER_VERIFIED = false;

/** doNotGroup pairs recorded by the D1 pack — walk/travelator-connected, not merge points. */
export const DO_NOT_GROUP_PAIRS = [
  {
    a: { name: "Buchanan Street", mode: "metro" },
    b: { name: "Glasgow Queen Street", mode: "train" },
    reason: "Travelator-connected but separate station entities, separate operators, separate infrastructure.",
  },
  {
    a: { name: "St Enoch", mode: "metro" },
    b: { name: "Glasgow Central", mode: "train" },
    reason: "Within a short walk, not physically connected.",
  },
  {
    a: { name: "Glasgow Central", mode: "train" },
    b: { name: "Glasgow Queen Street", mode: "train" },
    reason: "Two separate National Rail termini, not rail-connected to each other.",
  },
  {
    a: { name: "Partick", mode: "metro" },
    b: { name: "Partick", mode: "train" },
    reason:
      "National Rail station added 13 Sep 2026 (UK station fill phase 1) shares a printed name with " +
      "the existing Subway stop — genuine interchange (adjoining building, cross-platform-style transfer) " +
      "but two distinct catalog entries kept by mode, same pattern as Buchanan Street/Queen Street.",
  },
];

export function foldKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Marketing tokens that must never resolve as a real station. */
const FORBIDDEN_COLLAPSE_NAMES = new Set(
  ["subway", "glasgow subway", "spt", "inner circle", "outer circle", "national rail"].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

export function isSubwayStation(stationName) {
  const needle = foldKey(stationName);
  return SUBWAY_STATIONS.some((s) => foldKey(s) === needle);
}

/**
 * "Subway + <direction>" labels for a given Subway stop. Needs no verified
 * station order — both directions call at every station on a closed loop.
 * Returns [] for a name that isn't a Subway station at all.
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  if (!isSubwayStation(stationName)) {
    return [];
  }
  return SUBWAY_DIRECTIONS.map((direction) => `Subway + ${direction}`);
}

/**
 * Map a printed direction string into the locked "Subway + <direction>"
 * chip. Returns null for anything not one of the two confirmed labels.
 * @param {string} direction
 */
export function mapSubwayDestination(direction) {
  const hit = SUBWAY_DIRECTIONS.find((d) => foldKey(d) === foldKey(direction));
  return hit ? `Subway + ${hit}` : null;
}
