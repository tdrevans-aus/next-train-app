/**
 * Locked Canberra chips: line + terminus (R1 Gungahlin Place).
 * Hub is Alinga Street as printed. Stage 1 only — 14 stops.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Alinga Street";

export const MARKETING_ENDS = {
  1: ["Gungahlin Place", "Alinga Street"],
};

const STAGE_2A = [
  "edinburgh avenue",
  "city south",
  "commonwealth park",
  "woden",
];

export function foldKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^r1\s+/, "")
    .replace(/\s+station$/i, "")
    .replace(/\b(st|pl|cres|crescent|ave|avenue)\b/g, (token) => {
      if (token.startsWith("st")) {
        return "street";
      }
      if (token.startsWith("pl")) {
        return "place";
      }
      if (token.startsWith("cres")) {
        return "north";
      }
      return "avenue";
    })
    .replace(/manning clark north/g, "manning clark north")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/canberra/line-map.json"), "utf8"));
}

function isHub(stationKey) {
  return stationKey === foldKey(HUB);
}

export function lineLabel() {
  return "R1";
}

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded || STAGE_2A.includes(folded)) {
    return "";
  }
  if (isHub(folded) || folded === "alinga") {
    return HUB;
  }
  if (folded === "gungahlin" || folded === "gungahlin place") {
    return "Gungahlin Place";
  }
  if (folded === "manning clark" || folded === "manning clark north" || folded === "manning clark crescent") {
    return "Manning Clark North";
  }
  const published = loadLineMap();
  for (const line of published.lines ?? []) {
    for (const station of line.stations ?? []) {
      if (foldKey(station) === folded) {
        return station;
      }
    }
  }
  return String(token || "").trim();
}

export function mapCanberraDestination(headsign) {
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
  return foldKey(mapCanberraDestination(dest)) === foldKey(chip);
}
