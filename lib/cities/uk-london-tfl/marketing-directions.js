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

function chipFor(lineName, terminus) {
  return `${lineName} ${terminus}`.trim();
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
    for (const terminus of line.termini ?? []) {
      if (String(terminus).trim().toLowerCase() === String(station).trim().toLowerCase()) {
        continue;
      }
      chips.push(chipFor(lineName, terminus));
    }
  }
  return [...new Set(chips)].sort();
}
