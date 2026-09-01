/**
 * Edinburgh Trams T50 direction model — a conventional point-to-point line
 * with two confirmed termini (Newhaven, Edinburgh Airport). UNLIKE Glasgow
 * Subway's closed loop (no termini at all), this is the standard
 * "line + terminus" model already used by Newcastle NLR, Rotterdam Metro,
 * and every AU/NZ/CA light-rail line packed so far — no new direction model
 * needed here. See docs/edinburgh-d1/direction-model-memo.md Part 1.
 *
 * Recommended label form: "T50 towards Edinburgh Airport" / "T50 towards
 * Newhaven" (direction-model-memo.md line 13).
 *
 * Stop order is UNVERIFIED. TRAM_STATIONS below is carried verbatim from
 * docs/edinburgh-d1/published-network.json's lines[0].stations, itself
 * transcribed from the oracle report's line 21 list — a plausible
 * end-to-end sequence, never confirmed against an official Edinburgh Trams
 * map or the DFT BODS GTFS's stop_times/stop_sequence columns. Note the
 * array holds 22 named stops even though the oracle report's own prose
 * states "23 stops" in several places (report lines 23, 49, 69, 83) — a
 * count discrepancy inside the source pack itself, carried forward, not
 * padded or resolved here. TRAM_STATION_ORDER_VERIFIED stays false.
 * fetchTramStopBoard() in lib/providers/edinburgh.js throws
 * EdinburghTramsFeedUnverifiedError rather than fabricating a schedule —
 * same "throw, don't guess" contract as Glasgow's
 * GlasgowSubwayFeedUnverifiedError, for an adjacent but distinct reason: the
 * static GTFS source (DFT BODS) is confirmed reachable with a clear license
 * (OGL 3.0), but was never fetched or parsed by this pack, and no real-time
 * feed of any kind is confirmed to exist for Edinburgh Trams (TfE Open Data
 * API closed/inactive, no successor confirmed).
 */

export const TRAM_LINE_ID = "t50";
export const TRAM_LINE_NUMBER = "T50";

/** Confirmed termini — do not invent a third. */
export const TRAM_TERMINI = ["Newhaven", "Edinburgh Airport"];

/** Printed/recommended direction labels, line + terminus. */
export const TRAM_DIRECTIONS = TRAM_TERMINI.map((terminus) => `T50 towards ${terminus}`);

/**
 * Candidate stop order transcribed from the oracle report's line 21 list
 * (docs/edinburgh-d1/published-network.json lines[0].stations). NOT
 * verified — see file header.
 */
export const TRAM_STATIONS = [
  "Newhaven",
  "Ocean Terminal",
  "Port of Leith",
  "The Shore",
  "Foot of the Walk",
  "Balfour Street",
  "McDonald Road",
  "Picardy Place",
  "St Andrew Square",
  "Princes Street",
  "West End",
  "Haymarket",
  "Murrayfield Stadium",
  "Balgreen",
  "Saughton",
  "Bankhead",
  "Edinburgh Park Central",
  "Gyle Centre",
  "Edinburgh Gateway",
  "Gogarburn",
  "Ingliston Park & Ride",
  "Edinburgh Airport",
];

export const TRAM_STATION_ORDER_VERIFIED = false;

/**
 * doNotGroup pairs recorded by the D1 pack. Edinburgh Waverley is the
 * enforced case (explicit doNotGroupReason on the National Rail
 * stationGroup in published-network.json); Haymarket is carried too since
 * both catalogs independently name a "Haymarket" stop/station, kept
 * distinct by mode-scoped lookup, not merged.
 */
export const DO_NOT_GROUP_PAIRS = [
  {
    a: { name: "Edinburgh Waverley", mode: "metro" },
    b: { name: "Edinburgh Waverley", mode: "train" },
    reason:
      "Trams 'Waverley area' stop vs the National Rail station — separate platforms/infrastructure, " +
      "no automatic interchange described in the report, different operator.",
  },
  {
    a: { name: "Haymarket", mode: "metro" },
    b: { name: "Haymarket", mode: "train" },
    reason:
      "Nearby West End interchange but two distinct catalog entries kept by mode — no evidence in " +
      "the report of a merged board or automatic interchange between the tram stop and the station.",
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
  ["trams", "edinburgh trams", "t50", "tram", "national rail"].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

export function isTramStation(stationName) {
  const needle = foldKey(stationName);
  return TRAM_STATIONS.some((s) => foldKey(s) === needle);
}

/**
 * "T50 towards <terminus>" labels for a given Trams stop. Both directions
 * are offered at every stop except the two termini, where only the
 * "outbound" direction is meaningful — deliberately not special-cased here
 * since no adapter uses this for next-station logic (stop order unverified);
 * callers needing a terminus-aware filter should do so explicitly.
 * Returns [] for a name that isn't a Trams stop at all.
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  if (!isTramStation(stationName)) {
    return [];
  }
  return [...TRAM_DIRECTIONS];
}

/**
 * Map a printed terminus/destination string into the locked
 * "T50 towards <terminus>" chip. Returns null for anything not one of the
 * two confirmed termini.
 * @param {string} destination
 */
export function mapTramDestination(destination) {
  const hit = TRAM_TERMINI.find((terminus) => foldKey(terminus) === foldKey(destination));
  return hit ? `T50 towards ${hit}` : null;
}
