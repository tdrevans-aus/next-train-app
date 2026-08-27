/**
 * Locked Gold Coast chips: line + terminus (L1 Burleigh Heads).
 * City gold-coast is not Brisbane. G:link L1 only.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Helensvale";

export const MARKETING_ENDS = {
  L1: ["Helensvale", "Burleigh Heads"],
};

const NOT_OPEN = [
  "biggera waters",
  "labrador",
  "palm beach",
  "coolangatta",
  "gold coast airport",
];

export function foldKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^l1\s+/, "")
    .replace(/\s*\(southport\)\s*/g, " ")
    .replace(/\s+station$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/gold-coast/line-map.json"), "utf8"));
}

export function lineLabel() {
  return "L1";
}

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded || NOT_OPEN.includes(folded)) {
    return "";
  }
  if (folded === "gcuh" || folded === "university hospital") {
    return "Gold Coast University Hospital";
  }
  if (folded === "second avenue burleigh") {
    return "Second Avenue";
  }
  const published = loadLineMap();
  for (const line of published.lines ?? []) {
    for (const station of line.stations ?? []) {
      if (foldKey(station) === folded) {
        return station;
      }
    }
  }
  return String(token || "")
    .replace(/\s+station$/i, "")
    .replace(/\s*\(southport\)\s*/i, "")
    .trim();
}

export function mapGoldCoastDestination(headsign) {
  const place = canonicalPlace(headsign);
  const line = lineLabel();
  if (place) {
    return `${line} ${place}`;
  }
  return line;
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => foldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const label = `${lineLabel()} ${terminus}`;
      const key = foldKey(label);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b, "en"));
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapGoldCoastDestination(dest)) === foldKey(chip);
}
