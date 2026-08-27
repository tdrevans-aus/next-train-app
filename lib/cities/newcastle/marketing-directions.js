/**
 * Locked Newcastle chips: line + terminus (NLR + Newcastle Beach).
 * City newcastle is not Sydney. Light rail only.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Newcastle Interchange";

export const MARKETING_ENDS = {
  NLR: ["Newcastle Interchange", "Newcastle Beach"],
};

export function foldKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^nlr\s*\+\s*/, "")
    .replace(/^nlr\s+/, "")
    .replace(/^newcastle light rail\s*\+?\s*/i, "")
    .replace(/\s+light rail$/i, "")
    .replace(/\s+station$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/newcastle/line-map.json"), "utf8"));
}

export function lineLabel() {
  return "NLR";
}

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded || folded === "wickham" || folded === "newcastle east" || folded === "stockton" || folded === "broadmeadow") {
    return folded === foldKey(HUB) ? HUB : "";
  }
  if (folded === "interchange" || folded === "newcastle interchange") {
    return HUB;
  }
  if (folded === "beach" || folded === "newcastle beach") {
    return "Newcastle Beach";
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
    .replace(/\s+Light Rail$/i, "")
    .trim();
}

export function mapNewcastleDestination(headsign) {
  const place = canonicalPlace(headsign);
  const line = lineLabel();
  if (place) {
    return `${line} + ${place}`;
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
      const label = `${lineLabel()} + ${terminus}`;
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
  return foldKey(mapNewcastleDestination(dest)) === foldKey(chip);
}
