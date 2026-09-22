/**
 * Greater Manchester direction model — Metrolink only (National Rail has no
 * printed route map; it stays destination+operator once Darwin is
 * unblocked, per docs/greater-manchester-d1/direction-model-memo.md —
 * nothing to synthesize here until a real Darwin payload exists).
 *
 * Metrolink: line (colour) + terminus, same shape as every reference pack
 * (Rotterdam, Newcastle, East Midlands NET, South Yorkshire Supertram).
 * Termini are TAKEN VERBATIM from the oracle report's C2/C3 point 10 line
 * summary (docs/greater-manchester-d1/published-network.json metrolinkLines)
 * — this is a termini/via-point-only list, NOT a full ordered 99-stop
 * sequence, so chips are only generated for genuine line termini (plus the
 * hub/secondary hub where they coincide with a terminus), never guessed for
 * an intermediate stop.
 *
 * Two unresolved gaps carried forward verbatim, NOT fixed here:
 *  - Green and Purple share the same terminus pair (Altrincham-Bury) with
 *    opposite line names/colours. The report does not explain the routing
 *    difference — do not guess which physical routing distinguishes them.
 *  - The Eccles line's second terminus is printed as bare "Manchester" in
 *    the report, with no further disambiguation of which physical stop that
 *    is. It is NOT a catalog station (see stations.json) — chips referencing
 *    it use the literal string "Manchester" and must never be treated as a
 *    resolvable station lookup.
 *
 * "Piccadilly" as a Metrolink terminus (Yellow, Airport lines) means the
 * Piccadilly Gardens tram stop, never Manchester Piccadilly National Rail
 * station — see stations.json alias and doNotUse list in
 * docs/greater-manchester-d1/published-network.json.
 */

export const METROLINK_HUB = "St Peter's Square";
export const METROLINK_SECONDARY_HUB = "Manchester Victoria";

/** Termini (and named via-points for Red) verbatim from the oracle report's C2/C3 point 10. */
export const METROLINK_LINES = [
  {
    id: "green",
    number: "Green",
    name: "Metrolink Green Line",
    termini: ["Bury", "Altrincham"],
  },
  {
    id: "yellow",
    number: "Yellow",
    name: "Metrolink Yellow Line",
    termini: ["Bury", "Piccadilly"],
  },
  {
    id: "blue",
    number: "Blue",
    name: "Metrolink Blue Line",
    termini: ["Ashton-under-Lyne", "Eccles"],
  },
  {
    id: "red",
    number: "Red",
    name: "Metrolink Red Line",
    termini: ["Trafford Centre", "Cornbrook"],
    via: ["Imperial War Museum", "Wharfside", "Pomona"],
  },
  {
    id: "purple",
    number: "Purple",
    name: "Metrolink Purple Line",
    termini: ["Altrincham", "Bury"],
  },
  {
    id: "orange",
    number: "Orange",
    name: "Metrolink Orange Line",
    termini: ["Altrincham", "Rochdale"],
  },
  {
    id: "airport",
    number: "Airport",
    name: "Metrolink Airport Line",
    termini: ["Piccadilly", "Manchester Airport"],
  },
  {
    id: "eccles",
    number: "Eccles",
    name: "Metrolink Eccles Line",
    // "Manchester" is printed verbatim by the oracle report with no further
    // disambiguation — deliberately NOT a catalog station (see stations.json
    // header). Never resolve it as a station lookup.
    termini: ["Manchester", "Eccles"],
  },
];

/**
 * doNotGroup pairs recorded by UK station fill phase 2b (14 Sep 2026,
 * docs/jim-brief-uk-station-fill-phase2b.md) — four National Rail stations
 * held back from the Rest of England catch-all because they share a
 * printed name with a Metrolink stop whose bare name is hardcoded above
 * (line+terminus termini lists), added here instead as mode: "train"
 * entries in stations.json, same pattern as Edinburgh Gateway (Edinburgh)
 * and Partick (Glasgow) from phase 1.
 */
export const DO_NOT_GROUP_PAIRS = [
  {
    a: { name: "Altrincham", mode: "metro" },
    b: { name: "Altrincham", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Metrolink terminus — genuine interchange but two distinct catalog entries kept by " +
      "mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Eccles", mode: "metro" },
    b: { name: "Eccles", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Metrolink terminus — genuine interchange but two distinct catalog entries kept by " +
      "mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Manchester Airport", mode: "metro" },
    b: { name: "Manchester Airport", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Metrolink terminus — genuine interchange but two distinct catalog entries kept by " +
      "mode, same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Rochdale", mode: "metro" },
    b: { name: "Rochdale", mode: "train" },
    reason:
      "National Rail station added in UK station fill phase 2b shares a printed name with the " +
      "existing Metrolink stop — genuine interchange but two distinct catalog entries kept by mode, " +
      "same pattern as Edinburgh Gateway/Partick.",
  },
  {
    a: { name: "Ashton-under-Lyne", mode: "metro" },
    b: { name: "Ashton-under-Lyne", mode: "train" },
    reason:
      "National Rail station reassigned in from rest-of-england 15 Sep 2026 " +
      "(docs/jim-brief-rest-of-england-reassignment.md) shares a printed name with the existing " +
      "Metrolink terminus — genuine interchange but two distinct catalog entries kept by mode, " +
      "same pattern as Altrincham/Eccles/Manchester Airport/Rochdale above.",
  },
];

export function foldKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Canonical identity for self-reference comparison only: folds like foldKey
 * but also strips a trailing disambiguation suffix (e.g. "Swinton
 * (Manchester)") so a catalog-disambiguated stop still matches its own
 * line's terminus string when the terminus is recorded without the suffix.
 * Scoped to this guard only — line/terminus membership checks elsewhere
 * still use the exact catalog name.
 */
export function canonicalStationKey(value) {
  return foldKey(String(value ?? "").replace(/\s*\([^)]*\)\s*$/, ""));
}

/** Marketing tokens that must never resolve as a real station. */
const FORBIDDEN_COLLAPSE_NAMES = new Set(
  [
    "manchester",
    "manchester station",
    "manchester central",
    "piccadilly station",
    "victoria station",
    "tram",
    "metrolink",
    "city centre",
  ].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

/**
 * "Line + Terminus", except where the line number word literally repeats the terminus word —
 * "Eccles + Eccles" / "Airport + Manchester Airport" — in which case the line prefix is dropped
 * (docs/jim-brief-direction-label-aliases-server-side.md Part 2, same Perth-style rule as
 * Melbourne/Adelaide/Boston: drop a repeated word, keep the line only where it disambiguates).
 * Every other Metrolink chip ("Green + Altrincham" etc.) is unchanged.
 * @param {{ number: string }} line
 * @param {string} terminus
 */
function metrolinkLabelForTerminus(line, terminus) {
  const numberKey = foldKey(line.number);
  const terminusKey = foldKey(terminus);
  if (numberKey === terminusKey || terminusKey.includes(numberKey)) {
    return terminus;
  }
  return `${line.number} + ${terminus}`;
}

/**
 * "Line + Terminus" labels reachable from a given Metrolink stop, excluding
 * any label that would name the station itself (self-referential arrival).
 * Only emitted for stations that are a genuine terminus of a line — never
 * for an unconfirmed via-point (Imperial War Museum, Wharfside, Pomona).
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  const needle = foldKey(stationName);
  const labels = [];
  for (const line of METROLINK_LINES) {
    if (!line.termini.some((t) => foldKey(t) === needle)) {
      continue;
    }
    for (const terminus of line.termini) {
      if (canonicalStationKey(terminus) === canonicalStationKey(stationName)) {
        continue; // never show the station as its own destination
      }
      labels.push(metrolinkLabelForTerminus(line, terminus));
    }
  }
  return labels;
}

/**
 * Map a line number + confirmed terminus into the locked "Line + Terminus"
 * chip. Returns null for anything not in the confirmed termini set — never
 * fabricates an intermediate-stop chip.
 * @param {string} terminus
 * @param {string} lineNumber
 */
export function mapMetrolinkDestination(terminus, lineNumber) {
  const line = METROLINK_LINES.find((l) => l.number === String(lineNumber));
  if (!line) {
    return null;
  }
  const hit = line.termini.find((t) => foldKey(t) === foldKey(terminus));
  if (!hit) {
    return null;
  }
  return metrolinkLabelForTerminus(line, hit);
}
