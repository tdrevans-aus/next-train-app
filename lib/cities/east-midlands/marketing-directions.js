/**
 * East Midlands direction model — NET tram only (National Rail has no printed
 * route map; it stays destination+operator once Darwin is unblocked, per
 * docs/east-midlands-d1/direction-model-memo.md — nothing to synthesize here
 * until a real Darwin payload exists).
 *
 * NET: line + terminus, same shape as every reference pack (Rotterdam,
 * Newcastle, Stockholm/Oslo's "+" convention). Termini-only — the D1 pack
 * does not give an intermediate stop order for either line, and Jim's D2 GTFS
 * pull (see lib/cities/east-midlands/stations.json notes) confirmed
 * Nottingham Express Transit is not present in the DFT Bus Open Data bulk
 * archive, so that gap could not be closed. Only the two confirmed termini
 * per line are modelled.
 */

export const NET_HUB = "Nottingham Station";

/** Termini-only — see file header. Line 2's inner end is the hub itself. */
export const NET_LINES = [
  {
    id: "line-1",
    number: "1",
    name: "NET Line 1",
    termini: ["Hucknall", "Toton Lane"],
  },
  {
    id: "line-2",
    number: "2",
    name: "NET Line 2",
    termini: ["Phoenix Park", NET_HUB],
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
const FORBIDDEN_COLLAPSE_NAMES = new Set(["nottingham", "not", "city centre", "net", "tram"].map(foldKey));

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

/**
 * "Line N + Terminus" labels reachable from a given NET stop, excluding any
 * label that would name the station itself (self-referential arrival).
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  const needle = foldKey(stationName);
  const labels = [];
  for (const line of NET_LINES) {
    if (!line.termini.some((t) => foldKey(t) === needle) && foldKey(NET_HUB) !== needle) {
      // Station isn't on this line at all (only termini + hub are known stops).
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
 * Map a line number + confirmed terminus into the locked "N + Terminus" chip.
 * Returns null for anything not in the confirmed termini set — never
 * fabricates an intermediate-stop chip.
 * @param {string} terminus
 * @param {string} lineNumber
 */
export function mapNetDestination(terminus, lineNumber) {
  const line = NET_LINES.find((l) => l.number === String(lineNumber));
  if (!line) {
    return null;
  }
  const hit = line.termini.find((t) => foldKey(t) === foldKey(terminus));
  if (!hit) {
    return null;
  }
  return `${line.number} + ${hit}`;
}
