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
  return `${line.number} + ${hit}`;
}
