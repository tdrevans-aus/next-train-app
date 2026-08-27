/**
 * Locked Amsterdam chips: line + terminus (M54 + Gein).
 * Hub is Centraal Station (GVB metro). Do not collapse with NS Amsterdam Centraal.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Centraal Station";

export const MARKETING_ENDS = {
  50: ["Isolatorweg", "Gein"],
  51: ["Centraal Station", "Isolatorweg"],
  52: ["Noord", "Station Zuid"],
  53: ["Centraal Station", "Gaasperplas"],
  54: ["Centraal Station", "Gein"],
};

export function foldKey(value) {
  return String(value || "")
    .replace(/^amsterdam,\s+/i, "")
    .replace(/^diemen,\s+/i, "")
    .replace(/^duivendrecht,\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/^burg\.\s+/i, "")
    .replace(/^station\s+/i, "")
    .replace(/\s+station$/i, "");
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/amsterdam/line-map.json"), "utf8"));
}

function isHub(stationKey) {
  return stationKey === foldKey(HUB);
}

export function lineLabel(code) {
  const number = String(code || "").replace(/^m/i, "").trim();
  return number ? `M${number}` : "";
}

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded || folded === "amsterdam centraal") {
    return folded === foldKey(HUB) ? HUB : "";
  }
  if (isHub(folded)) {
    return HUB;
  }
  const published = loadLineMap();
  for (const line of published.lines ?? []) {
    for (const station of line.stations ?? []) {
      if (foldKey(station) === folded) {
        return station;
      }
    }
  }
  return String(token || "").replace(/^amsterdam,\s+/i, "").trim();
}

export function mapAmsterdamDestination(headsign, routeShortName) {
  const code = String(routeShortName || "").replace(/^m/i, "").trim();
  const place = canonicalPlace(headsign);
  const line = lineLabel(code);
  if (line && place) {
    return `${line} + ${place}`;
  }
  return place || line || String(headsign || "").trim();
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (stationKey === "amsterdam centraal" && !isHub(stationKey)) {
    return [];
  }
  const atHub = isHub(stationKey);

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => {
      const key = foldKey(name);
      return key === stationKey || (atHub && isHub(key));
    });
    if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      const terminusKey = foldKey(terminus);
      if (terminusKey === stationKey || (atHub && isHub(terminusKey))) {
        continue;
      }
      const label = `${lineLabel(line.number)} + ${terminus}`;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b, "nl"));
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  const routeShort =
    typeof tripOrDest === "string" ? "" : String(tripOrDest?.routeShortName || "").replace(/^m/i, "").trim();
  const mapped = mapAmsterdamDestination(dest, routeShort || String(chip || "").match(/M(\d+)/i)?.[1]);
  return foldKey(mapped) === foldKey(chip);
}
