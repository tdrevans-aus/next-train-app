/**
 * Liverpool City Region direction model — Merseyrail only (National Rail has
 * no printed route map; it stays destination+operator once Darwin is
 * unblocked, per docs/liverpool-city-region-d1/direction-model-memo.md —
 * nothing to synthesize here until a real Darwin payload exists).
 *
 * Merseyrail: line + terminus, same shape as every reference pack (Rotterdam,
 * Newcastle, East Midlands NET, South Yorkshire Supertram, Greater
 * Manchester Metrolink). Termini/branches are TAKEN VERBATIM from the oracle
 * report's line/agency tables (docs/liverpool-city-region-d1/
 * published-network.json merseyrailLines, report lines 21, 44) — this is a
 * termini/branch-only list, NOT a full ordered 69-stop sequence (39 Northern
 * Line + 34 Wirral Line), so chips are only generated for a catalog station
 * that is itself a genuine, individually confirmed line terminus, never
 * guessed for an intermediate stop.
 *
 * Liverpool Central and Moorfields deliberately do NOT get generated chips
 * here even though direction-model-memo.md's own illustrative example shows
 * six chips for Liverpool Central — the memo itself flags that whether all
 * six branch destinations call at Central specifically (versus splitting
 * across Central/Moorfields) is not confirmed by the report. Do not "fix"
 * this without a real timetable check.
 *
 * "Liverpool" as printed in the oracle report's termini table is NOT a
 * catalog station — genuinely ambiguous which physical Merseyrail
 * city-centre stop it refers to (Central? Moorfields? the Lime Street
 * Merseyrail presence?), not disambiguated by the report. Forbidden-collapse
 * token, same treatment as Greater Manchester's bare "Manchester" terminus
 * for the Eccles line — never resolve it as a station lookup.
 */

export const MERSEYRAIL_HUB = "Liverpool Central";
export const MERSEYRAIL_SECONDARY_HUB = "Moorfields";

/** Termini/branches verbatim from the oracle report's line/agency tables (lines 21, 44). */
export const MERSEYRAIL_LINES = [
  {
    id: "northern",
    number: "Northern Line",
    name: "Merseyrail Northern Line",
    // "Liverpool" is printed by the report with no further disambiguation —
    // deliberately NOT a catalog station (see stations.json header). Never
    // resolve it as a station lookup.
    termini: ["Liverpool", "Southport", "Ormskirk", "Headbolt Lane"],
  },
  {
    id: "wirral",
    number: "Wirral Line",
    name: "Merseyrail Wirral Line",
    termini: ["Liverpool", "Ellesmere Port", "West Kirby", "Chester"],
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
 * but also strips a trailing disambiguation suffix (e.g. "Upton
 * (Merseyside)") so a catalog-disambiguated stop still matches its own
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
    "liverpool",
    "liverpool station",
    "lime street station",
    "liverpool central station",
    "merseyrail",
    "city centre",
  ].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

/**
 * "Line + Terminus" labels reachable from a given Merseyrail stop, excluding
 * any label that would name the station itself (self-referential arrival).
 * Only emitted for stations that are a genuine terminus of a line — never
 * for an unconfirmed interchange (Liverpool Central, Moorfields) or the
 * ambiguous "Liverpool" token itself.
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  const needle = foldKey(stationName);
  const labels = [];
  for (const line of MERSEYRAIL_LINES) {
    if (!line.termini.some((t) => foldKey(t) === needle)) {
      continue;
    }
    for (const terminus of line.termini) {
      if (canonicalStationKey(terminus) === canonicalStationKey(stationName)) {
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
export function mapMerseyrailDestination(terminus, lineNumber) {
  const line = MERSEYRAIL_LINES.find((l) => l.number === String(lineNumber));
  if (!line) {
    return null;
  }
  const hit = line.termini.find((t) => foldKey(t) === foldKey(terminus));
  if (!hit) {
    return null;
  }
  return `${line.number} + ${hit}`;
}
