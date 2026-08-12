/**
 * Static Perth rail directions when LiveTimes returns an empty board (overnight).
 * Derived from lib/cities/perth/line-map.json — not live GTFS.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const lineMap = JSON.parse(readFileSync(join(__dirname, "line-map.json"), "utf8"));

function normalizeStationKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

function stationLabel(name) {
  return String(name || "")
    .trim()
    .replace(/\s+Stn$/i, "")
    .replace(/\s+Station$/i, "");
}

/** @type {Map<string, Set<string>>} */
const directionsByStation = new Map();

for (const line of lineMap.lines ?? []) {
  const termini = (line.termini ?? []).map(stationLabel);
  for (const station of line.stations ?? []) {
    const key = normalizeStationKey(station);
    const set = directionsByStation.get(key) ?? new Set();
    for (const terminus of termini) {
      if (normalizeStationKey(terminus) !== key) {
        set.add(terminus);
      }
    }
    directionsByStation.set(key, set);
  }
}

/**
 * @param {string} stationName LiveTimes-style station name
 * @returns {string[]} Canonical direction labels for journey setup / Near me
 */
export function staticDirectionsForStation(stationName) {
  const key = normalizeStationKey(stationName);
  const set = directionsByStation.get(key);
  if (!set || set.size === 0) {
    return [];
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function getPerthLineMap() {
  return lineMap;
}

export function getShortTurnGroups() {
  return { ...(lineMap.shortTurnGroups ?? {}) };
}
