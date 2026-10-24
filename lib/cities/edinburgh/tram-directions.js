/**
 * Edinburgh Trams T50 direction model — a conventional point-to-point line
 * with two termini (Newhaven, Edinburgh Airport). UNLIKE Glasgow Subway's
 * closed loop, this is the standard "line + terminus" model used by every
 * other light-rail line in the pipeline. See docs/edinburgh-trams-d1/
 * direction-model-memo.md (supersedes docs/edinburgh-d1/direction-model-memo.md
 * Part 1 for the stop list).
 *
 * Chips: "T50 towards Edinburgh Airport" / "T50 towards Newhaven". The two
 * termini show ONE chip each (the direction away from themselves) — never a
 * self-terminus chip.
 *
 * Stop list: the official 23 stops, Edinburgh Airport (west) to Newhaven
 * (east), from docs/edinburgh-trams-d1/published-network.json. This replaces
 * the 22-stop candidate list carried since the first Edinburgh pack, which was
 * missing Edinburgh Park Station and ran east-to-west. Order is still
 * UNVERIFIED (TRAM_STATION_ORDER_VERIFIED stays false until flip gate G5);
 * direction chips do not depend on it because the live feed prints the
 * destination. There is no Waverley tram stop — the old Waverley doNotGroup
 * pair was removed with the stale list.
 *
 * The tram board itself lives in lib/providers/edinburgh.js and is OFF until
 * registry.js carries edinburgh.tramsLive: true (see lib/cities/edinburgh/
 * trams-switch.js).
 */

export const TRAM_LINE_ID = "t50";
export const TRAM_LINE_NUMBER = "T50";

/** Confirmed termini — do not invent a third. */
export const TRAM_TERMINI = ["Newhaven", "Edinburgh Airport"];

/** Printed/recommended direction labels, line + terminus. */
export const TRAM_DIRECTIONS = TRAM_TERMINI.map((terminus) => `T50 towards ${terminus}`);

/**
 * The official 23-stop list, west to east
 * (docs/edinburgh-trams-d1/published-network.json lines[0].stations). Order
 * NOT independently verified — see file header.
 */
export const TRAM_STATIONS = [
  "Edinburgh Airport",
  "Ingliston Park & Ride",
  "Gogarburn",
  "Edinburgh Gateway",
  "Gyle Centre",
  "Edinburgh Park Central",
  "Edinburgh Park Station",
  "Bankhead",
  "Saughton",
  "Balgreen",
  "Murrayfield Stadium",
  "Haymarket",
  "West End",
  "Princes Street",
  "St Andrew Square",
  "Picardy Place",
  "McDonald Road",
  "Balfour Street",
  "Foot of the Walk",
  "The Shore",
  "Port of Leith",
  "Ocean Terminal",
  "Newhaven",
];

export const TRAM_STATION_ORDER_VERIFIED = false;

/**
 * doNotGroup pairs (docs/edinburgh-trams-d1/published-network.json
 * doNotGroup). There is NO Waverley tram stop, so the old Waverley pair is
 * gone. Each tram stop below is kept distinct from its rail namesake by
 * mode-scoped lookup, never merged.
 */
export const DO_NOT_GROUP_PAIRS = [
  {
    a: { name: "Haymarket", mode: "metro" },
    b: { name: "Haymarket", mode: "train" },
    reason:
      "Walk interchange between the tram stop and the National Rail station (HYM) — two distinct " +
      "catalog entries kept by mode, no merged board.",
  },
  {
    a: { name: "Edinburgh Gateway", mode: "metro" },
    b: { name: "Edinburgh Gateway", mode: "train" },
    reason:
      "Tram-rail transfer station (covered footbridge) — two distinct catalog entries kept by mode " +
      "(National Rail EGY vs the tram stop).",
  },
  {
    a: { name: "Edinburgh Park Station", mode: "metro" },
    b: { name: "Edinburgh Park", mode: "train" },
    reason:
      "Near-identical names: the tram stop Edinburgh Park Station vs National Rail Edinburgh Park " +
      "(EDP) — separate catalog entries kept by mode.",
  },
  {
    a: { name: "Edinburgh Park Central", mode: "metro" },
    b: { name: "Edinburgh Park Station", mode: "metro" },
    reason:
      "Two different tram stops (sequence 6 and 7). A bare query 'Edinburgh Park' must never " +
      "collapse to either one silently.",
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
  [
    "trams",
    "edinburgh trams",
    "t50",
    "tram",
    "national rail",
    // Guards against the removed Waverley tram stop ever resolving again (no such stop exists).
    "waverley tram stop",
    "edinburgh waverley tram stop",
    "york place",
  ].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

export function isTramStation(stationName) {
  const needle = foldKey(stationName);
  return TRAM_STATIONS.some((s) => foldKey(s) === needle);
}

/**
 * "T50 towards <terminus>" labels for a given Trams stop: both directions at
 * an intermediate stop, ONE chip at each terminus (the direction away from
 * itself — never a "towards Newhaven" chip at Newhaven). Static: independent of
 * whether any tram is currently predicted. Returns [] for a name that isn't a
 * Trams stop at all.
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  if (!isTramStation(stationName)) {
    return [];
  }
  const here = foldKey(stationName);
  return TRAM_TERMINI.filter((terminus) => foldKey(terminus) !== here).map(
    (terminus) => `T50 towards ${terminus}`
  );
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
