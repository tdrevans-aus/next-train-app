/**
 * Static Perth rail directions when LiveTimes returns an empty board (overnight).
 * Derived from lib/cities/perth/line-map.json — not live GTFS.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { uniqueDestinations } from "../../train-times-core.js";

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

function mergeDirectionLists(...lists) {
  const seen = new Set();
  const directions = [];

  for (const list of lists) {
    for (const direction of list) {
      const trimmed = String(direction || "").trim();
      const key = trimmed.toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      directions.push(trimmed);
    }
  }

  return directions.sort((a, b) => a.localeCompare(b));
}

/**
 * Union live board destinations with static line-map directions.
 * Static first so canonical labels win; live-only extras are preserved.
 *
 * @param {string} stationName
 * @param {Array<{ destination?: string }>} trips
 * @returns {{ directions: string[], source: string }}
 */
export function resolveDirectionsForStation(stationName, trips = []) {
  const live = uniqueDestinations(trips);
  const staticDirs = staticDirectionsForStation(stationName);
  const directions = mergeDirectionLists(staticDirs, live);

  let source;
  if (!directions.length) {
    source = "empty";
  } else if (!live.length) {
    source = "static-line-map";
  } else if (!staticDirs.length) {
    source = "live";
  } else {
    source = "live+static-line-map";
  }

  return { directions, source };
}

export function getPerthLineMap() {
  return lineMap;
}

export function getShortTurnGroups() {
  return { ...(lineMap.shortTurnGroups ?? {}) };
}
