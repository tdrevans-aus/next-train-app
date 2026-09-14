/**
 * North East direction model — Tyne and Wear Metro only (National Rail has no
 * printed route map; it stays destination+operator once Darwin is unblocked,
 * per docs/north-east-d1/direction-model-memo.md — nothing to synthesize
 * here until a real Darwin payload exists).
 *
 * Metro: line (colour) + terminus, same shape as every reference pack
 * (East Midlands NET, South Yorkshire Supertram, Rotterdam, Boston).
 *
 * UNLIKE East Midlands' NET / South Yorkshire's Supertram, Tyne and Wear
 * Metro's static GTFS is genuinely present in the DFT Bus Open Data bulk
 * archive (agency_id OP241) — Jim's D2 pull (31 Aug 2026) confirmed real
 * route/trip/stop_times data and extracted the FULL ordered station list for
 * both lines (not termini-only). Green: 31 stations, South Hylton ↔ Newcastle
 * Airport — matches the oracle report's stated count exactly. Yellow: 41
 * unique stations, St James ↔ South Shields via the coastal loop and
 * Gateshead — matches the oracle report's stated count exactly. This also
 * confirms the D1 pack's open question: Yellow DOES call Pelaw (between
 * Heworth and Hebburn) — previously flagged unconfirmed, now resolved.
 *
 * This confirmed station/line data is used here for the direction model
 * (line + terminus chip generation) regardless of whether a live board can
 * currently be built from it — it can't: Metro is OUT-PRODUCT (Tim,
 * 5 Sep 2026, docs/jim-brief-north-east-metro-out-product.md) because no
 * confirmed public real-time feed exists, not because of the shared GTFS
 * parser (that limit was lifted by PR #253, but was never the real
 * blocker). fetchMetroStopBoard() throws MetroFeedUnconfirmedError. The
 * station/route facts documented here were confirmed by parsing the
 * archive directly with a streaming reader during D2, independent of the
 * real-time-feed question.
 * See lib/cities/north-east/stations.json notes and
 * lib/providers/north-east.js file header.
 *
 * Newcastle Central is the locked hub for National Rail (CRS NCL, printed
 * name "Newcastle Central"). Metro's own GTFS stop_name for the same
 * physical hub is "Central Station" — a different printed name, which is
 * exactly why doNotGroup here carries no name-collapse risk (the two boards
 * never share a string). See docs/north-east-d1/hazard-pack.md H1/H6.
 */

export const NORTH_EAST_HUB = "Newcastle Central";
export const METRO_HUB_STATION_NAME = "Central Station";

/** Full confirmed ordered station lists (Jim D2 GTFS pull, 31 Aug 2026). */
export const GREEN_LINE_STATIONS = [
  "South Hylton",
  "Pallion",
  "Millfield",
  "University",
  "Park Lane",
  "Sunderland",
  "St Peter's",
  "Stadium Of Light",
  "Seaburn",
  "East Boldon",
  "Brockley Whins",
  "Fellgate",
  "Pelaw",
  "Heworth",
  "Felling",
  "Gateshead Stadium",
  "Gateshead",
  METRO_HUB_STATION_NAME,
  "Monument",
  "Haymarket",
  "Jesmond",
  "West Jesmond",
  "Ilford Road",
  "South Gosforth",
  "Regent Centre",
  "Wansbeck Road",
  "Fawdon",
  "Kingston Park",
  "Bank Foot",
  "Callerton Parkway",
  "Newcastle Airport",
];

export const YELLOW_LINE_STATIONS = [
  "St James",
  "Monument",
  "Manors",
  "Byker",
  "Chillingham Road",
  "Walkergate",
  "Wallsend",
  "Hadrian Road",
  "Howdon",
  "Percy Main",
  "Meadow Well",
  "North Shields",
  "Tynemouth",
  "Cullercoats",
  "Whitley Bay",
  "Monkseaton",
  "West Monkseaton",
  "Shiremoor",
  "Northumberland Park",
  "Palmersville",
  "Benton",
  "Four Lane Ends",
  "Longbenton",
  "South Gosforth",
  "Ilford Road",
  "West Jesmond",
  "Jesmond",
  "Haymarket",
  METRO_HUB_STATION_NAME,
  "Gateshead",
  "Gateshead Stadium",
  "Felling",
  "Heworth",
  "Pelaw",
  "Hebburn",
  "Jarrow",
  "Bede",
  "Simonside",
  "Tyne Dock",
  "Chichester",
  "South Shields",
];

export const METRO_LINES = [
  {
    id: "green",
    number: "Green",
    name: "Tyne and Wear Metro Green Line",
    termini: ["South Hylton", "Newcastle Airport"],
    stations: GREEN_LINE_STATIONS,
  },
  {
    id: "yellow",
    number: "Yellow",
    name: "Tyne and Wear Metro Yellow Line",
    termini: ["St James", "South Shields"],
    stations: YELLOW_LINE_STATIONS,
  },
];

/**
 * Sunderland — genuine shared-platform through-running station, NOT a
 * doNotGroup case. See docs/north-east-d1/direction-model-memo.md and
 * hazard-pack.md H1. Exported so downstream board-merging logic (not built
 * here — Metro RT doesn't exist yet and National Rail is blocked, so the
 * mixed board is not live-testable today) can find this fact without
 * re-deriving it.
 */
export const SUNDERLAND_SHARED_PLATFORM = {
  name: "Sunderland",
  class:
    "genuine shared-platform through-running station — NOT doNotGroup. Metro Green Line and National Rail Northern Trains share the same platforms/track Pelaw–Sunderland. Board must mix both services (once National Rail is unblocked) tagged by mode/operator, not split into separate tabs.",
  servedBy: [
    "Tyne and Wear Metro Green Line",
    "National Rail Northern Trains (through-running from Pelaw)",
  ],
};

/** Pelaw — Metro-only junction, not a doNotGroup case, no separate National Rail station. */
export const PELAW_JUNCTION = {
  name: "Pelaw",
  class:
    "Metro-only through-running junction. Both Green and Yellow call here (confirmed by GTFS — see stations.json notes). No separate National Rail station exists at Pelaw per the oracle report.",
};

/**
 * doNotGroup pairs recorded by UK station fill phase 2b (14 Sep 2026,
 * docs/jim-brief-uk-station-fill-phase2b.md) — five National Rail stations
 * held back from the Rest of England catch-all because they share a
 * printed name with a Metro stop whose bare name is hardcoded in
 * GREEN_LINE_STATIONS/YELLOW_LINE_STATIONS above, added here instead as
 * mode: "train" entries in stations.json, same pattern as Edinburgh
 * Gateway (Edinburgh) and Partick (Glasgow) from phase 1.
 */
export const DO_NOT_GROUP_PAIRS = [
  {
    a: { name: "Brockley Whins", mode: "metro" },
    b: { name: "Brockley Whins", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Tyne and Wear Metro stop — genuine interchange but two distinct catalog entries " +
      "kept by mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "East Boldon", mode: "metro" },
    b: { name: "East Boldon", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Tyne and Wear Metro stop — genuine interchange but two distinct catalog entries " +
      "kept by mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Heworth", mode: "metro" },
    b: { name: "Heworth", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Tyne and Wear Metro stop — genuine interchange but two distinct catalog entries " +
      "kept by mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Manors", mode: "metro" },
    b: { name: "Manors", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Tyne and Wear Metro stop — genuine interchange but two distinct catalog entries " +
      "kept by mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Seaburn", mode: "metro" },
    b: { name: "Seaburn", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Tyne and Wear Metro stop — genuine interchange but two distinct catalog entries " +
      "kept by mode, same pattern as Edinburgh Gateway/Partick.",
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
  ["newcastle", "ncl", "metro", "tyne and wear metro", "green", "yellow", "national rail"].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

/**
 * "Line + Terminus" labels reachable from a given Metro stop, excluding any
 * label that would name the station itself (self-referential arrival).
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  const needle = foldKey(stationName);
  const labels = [];
  for (const line of METRO_LINES) {
    if (!line.stations.some((s) => foldKey(s) === needle)) {
      continue; // station isn't on this line at all
    }
    for (const terminus of line.termini) {
      if (foldKey(terminus) === needle) {
        continue; // never show the station as its own destination
      }
      labels.push(`${line.number} + ${terminus}`);
    }
  }
  return labels;
}

/**
 * Map a line number + confirmed terminus into the locked "Line + Terminus"
 * chip. Returns null for anything not in the confirmed termini set.
 * @param {string} terminus
 * @param {string} lineNumber
 */
export function mapMetroDestination(terminus, lineNumber) {
  const line = METRO_LINES.find((l) => foldKey(l.number) === foldKey(lineNumber));
  if (!line) {
    return null;
  }
  const hit = line.termini.find((t) => foldKey(t) === foldKey(terminus));
  if (!hit) {
    return null;
  }
  return `${line.number} + ${hit}`;
}

/** Which confirmed line(s) call at a given station name. */
export function linesForStation(stationName) {
  const needle = foldKey(stationName);
  return METRO_LINES.filter((line) => line.stations.some((s) => foldKey(s) === needle)).map(
    (line) => line.number
  );
}
