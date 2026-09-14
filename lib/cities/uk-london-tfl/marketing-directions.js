/**
 * London TfL leave-by chips: line + terminus (Victoria Brixton).
 * Circle is a loop chip (line name only). Catalog uses "&"; oracle uses "and".
 * @see qa/fixtures/uk-london-tfl/direction-model-memo.md
 */
import publishedNetwork from "../../../qa/fixtures/uk-london-tfl/published-network.json" with { type: "json" };
import stopsPack from "./stops.json" with { type: "json" };

export function normalizeLineKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+&\s+/g, " and ")
    .replace(/\s+/g, " ");
}

/**
 * Canonical identity for self-reference comparison only: folds case/whitespace
 * and strips a trailing disambiguation suffix like " (London)" or
 * " (Bakerloo)" so a catalog-disambiguated stop (e.g. "Richmond (London)",
 * added because the plain name collides with another stop) still matches its
 * own line's terminus string (e.g. "Richmond"). Scoped to this guard only —
 * `catalogLinesForStation` still matches the exact disambiguated catalog name,
 * so two distinctly-disambiguated stops (e.g. "Edgware Road (Bakerloo)" vs
 * "Edgware Road (Circle Line)") are never conflated with each other.
 */
export function canonicalStationKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

function chipFor(lineName, terminus) {
  return `${lineName} ${terminus}`.trim();
}

/**
 * FB-61 (docs/jim-brief-fb61-branch-reachable-chips.md): DLR's `termini` list is every end of
 * the whole line family, but DLR is not one through-route — it's several physical corridors
 * that share interchange stations (Bank, Canning Town, Poplar, ...). A station only offered
 * every DLR terminus regardless of which corridor(s) it actually sits on (e.g. Abbey Road,
 * on the Stratford International <-> Woolwich Arsenal corridor only, offered "DLR Bank" and
 * "DLR Lewisham" — no service from it ever reaches either).
 *
 * `line.segments` (added for DLR only; other London lines are unaffected and keep using
 * `line.termini` directly) is the real corridor structure sourced from TfL's own
 * `Line/dlr/Route/Sequence/all` API (see `segmentsSource` in published-network.json). A
 * station's reachable termini are the union, over every segment that lists the station, of
 * that segment's two named ends, plus `extraTerminus` (a documented, live-confirmed
 * through-running extension beyond a segment's own named pair — see the Beckton branch note
 * on the Stratford International <-> Woolwich Arsenal segment) when the station is within its
 * own (narrower) station list.
 *
 * Lines without `segments` are untouched: this only changes DLR chip selection, nothing else.
 */
export function terminiReachableFromStation(line, station) {
  const segments = Array.isArray(line.segments) ? line.segments : null;
  if (!segments || segments.length === 0) {
    return line.termini ?? [];
  }
  const stationKey = String(station || "").trim().toLowerCase();
  const reachable = new Set();
  for (const segment of segments) {
    const stationNames = (segment.stations ?? []).map((name) => String(name).trim().toLowerCase());
    if (!stationNames.includes(stationKey)) {
      continue;
    }
    for (const terminus of segment.termini ?? []) {
      reachable.add(terminus);
    }
    const extra = segment.extraTerminus;
    if (extra && extra.name) {
      const extraStationNames = (extra.stations ?? []).map((name) => String(name).trim().toLowerCase());
      if (extraStationNames.includes(stationKey)) {
        reachable.add(extra.name);
      }
    }
  }
  return [...reachable];
}

function buildChipHeadsignGroups(oracle) {
  /** @type {Record<string, string[]>} */
  const groups = {};
  for (const line of oracle.lines ?? []) {
    const lineName = String(line.name || "").trim();
    if (!lineName || line.loop) {
      continue;
    }
    const shorts = line.shortTurns && typeof line.shortTurns === "object" ? line.shortTurns : {};
    for (const terminus of line.termini ?? []) {
      const chip = chipFor(lineName, terminus);
      const members = [chip];
      for (const short of shorts[terminus] ?? []) {
        members.push(chipFor(lineName, short));
      }
      groups[chip] = members;
    }
  }
  return groups;
}

export const CHIP_HEADSIGN_GROUPS = buildChipHeadsignGroups(publishedNetwork);

function catalogLinesForStation(station) {
  const stationName = String(station || "").trim().toLowerCase();
  const lines = new Set();
  for (const stop of stopsPack.stops ?? []) {
    if (String(stop.name || "").trim().toLowerCase() !== stationName) {
      continue;
    }
    for (const line of stop.lines ?? []) {
      lines.add(normalizeLineKey(line));
    }
  }
  return lines;
}

export function marketingLabelsForStation(station) {
  const stopLines = catalogLinesForStation(station);
  if (stopLines.size === 0) {
    return [];
  }
  const chips = [];
  for (const line of publishedNetwork.lines ?? []) {
    const lineName = String(line.name || "").trim();
    if (!lineName || !stopLines.has(normalizeLineKey(lineName))) {
      continue;
    }
    if (line.loop) {
      chips.push(lineName);
      continue;
    }
    for (const terminus of terminiReachableFromStation(line, station)) {
      if (canonicalStationKey(terminus) === canonicalStationKey(station)) {
        continue;
      }
      chips.push(chipFor(lineName, terminus));
    }
  }
  return [...new Set(chips)].sort();
}
