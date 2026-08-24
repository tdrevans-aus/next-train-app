/**
 * Locked Brisbane line+terminus chips (Luke, 2026-08-22).
 * Nests are not extra Central chips. Exhibition suppressed.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const MARKETING_ENDS = {
  T1: ["Caboolture", "Ipswich"],
  T2: ["Kippa-Ring", "Springfield Central"],
  T3: ["Doomben", "Roma Street"],
  T4: ["Cleveland", "Shorncliffe"],
  T5: ["Brisbane Airport", "Varsity Lakes"],
  T6: ["Beenleigh", "Ferny Grove"],
};

export const SUPPRESSED_LABEL_ENDS = ["Exhibition"];

/** Chip → GTFS headsign ends that count as that marketing way (nests fold in). */
export const CHIP_HEADSIGN_GROUPS = {
  "T1 towards Caboolture": ["Caboolture", "Nambour", "Gympie North"],
  "T1 towards Ipswich": ["Ipswich", "Rosewood"],
  "T2 towards Kippa-Ring": ["Kippa-Ring"],
  "T2 towards Springfield Central": ["Springfield Central"],
  "T3 towards Doomben": ["Doomben"],
  "T3 towards Roma Street": ["Roma Street"],
  "T4 towards Cleveland": ["Cleveland"],
  "T4 towards Shorncliffe": ["Shorncliffe"],
  "T5 towards Brisbane Airport": [
    "Domestic Airport",
    "International Airport",
    "Brisbane Airport",
    "Airport",
  ],
  "T5 towards Varsity Lakes": ["Varsity Lakes"],
  "T6 towards Beenleigh": ["Beenleigh"],
  "T6 towards Ferny Grove": ["Ferny Grove"],
};

const NAME_ALIASES = {
  "brisbane central": "central",
  "glasshouse mountains": "glass house mountains",
  "brisbane airport": "domestic airport",
  "airport": "domestic airport",
};

function normalizeKey(value) {
  let key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
  return NAME_ALIASES[key] ?? key;
}

function displayName(value) {
  const key = normalizeKey(value);
  if (key === "central") {
    return "Central";
  }
  return String(value || "")
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "")
    .trim();
}

export function loadPublishedNetwork() {
  return JSON.parse(readFileSync(join(ROOT, "qa/fixtures/brisbane/published-network.json"), "utf8"));
}

export function marketingLabelsForStation(station, published = loadPublishedNetwork()) {
  const labels = [];
  const seen = new Set();
  const stationKey = normalizeKey(station);
  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => normalizeKey(name) === stationKey);
    if (!onLine && stationKey !== "central") {
      continue;
    }
    if (!onLine && stationKey === "central") {
      const aliasOnLine = (line.stations ?? []).some((name) => normalizeKey(name) === "central");
      if (!aliasOnLine) {
        continue;
      }
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? []) {
      if (SUPPRESSED_LABEL_ENDS.some((name) => normalizeKey(name) === normalizeKey(terminus))) {
        continue;
      }
      if (normalizeKey(terminus) === stationKey) {
        continue;
      }
      const label = `${line.number} towards ${displayName(terminus)}`;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b));
}

export function tripMatchesMarketingChip(tripDestination, chip) {
  const groups = CHIP_HEADSIGN_GROUPS[chip];
  const destKey = normalizeKey(tripDestination);
  if (!destKey) {
    return false;
  }
  const ends = groups ?? [];
  const fallback = chip.match(/towards\s+(.+)$/i)?.[1];
  const names = ends.length ? ends : fallback ? [fallback] : [];
  return names.some((name) => {
    const endKey = normalizeKey(name);
    return destKey === endKey || destKey.includes(endKey) || endKey.includes(destKey);
  });
}
