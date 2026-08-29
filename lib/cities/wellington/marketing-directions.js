/**
 * Locked Wellington chips: line + terminus (e.g. Kāpiti Line Waikanae Station).
 * Hub is Wellington Station. MEL (Melling Line) live terminus is Western Hutt
 * Station while Melling Station is closed (~late 2028) — do not invent Melling.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Wellington Station";

export const MARKETING_ENDS = {
  KPL: ["Wellington Station", "Waikanae Station"],
  HVL: ["Wellington Station", "Upper Hutt Station"],
  MEL: ["Wellington Station", "Western Hutt Station"],
  JVL: ["Wellington Station", "Johnsonville Station"],
  WRL: ["Wellington Station", "Masterton Station"],
};

const FORBIDDEN_HUB_NAMES = new Set(["wellington", "railway station", "britomart", "waitematā station"]);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/wellington/line-map.json"), "utf8"));
}

function isHub(stationKey) {
  return stationKey === foldKey(HUB);
}

export const LINE_NAMES = {
  KPL: "Kāpiti Line",
  HVL: "Hutt Valley Line",
  MEL: "Melling Line",
  JVL: "Johnsonville Line",
  WRL: "Wairarapa Line",
};

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded) {
    return "";
  }
  if (isHub(folded)) {
    return HUB;
  }
  for (const ends of Object.values(MARKETING_ENDS)) {
    for (const end of ends) {
      if (foldKey(end) === folded) {
        return end;
      }
    }
  }
  const catalog = loadLineMap();
  for (const line of catalog.lines ?? []) {
    for (const station of line.stations ?? []) {
      if (foldKey(station) === folded) {
        return station;
      }
    }
  }
  return "";
}

function headsignToPlace(headsign) {
  const text = String(headsign || "").trim();
  if (!text) {
    return "";
  }
  const toChunk = text.match(/\bto\s+([^;]+)/i)?.[1] ?? "";
  const beforeVia = (toChunk || text).replace(/\s+via\b[\s\S]*/i, "").trim();
  const place = canonicalPlace(beforeVia) || canonicalPlace(beforeVia.split(/\s+/)[0] ?? "");
  if (place) {
    return place;
  }
  if (/wellington|railway station/i.test(text)) {
    return HUB;
  }
  return "";
}

/**
 * GTFS headsigns like "Waikanae" or "Wellington via Tawa" → Wellington Station / line+terminus.
 */
export function mapWellingtonDestination(headsign, routeShortName) {
  const code = String(routeShortName || "").trim().toUpperCase();
  const lineName = LINE_NAMES[code] || "";
  const place = headsignToPlace(headsign);
  if (place && lineName) {
    return `${lineName} ${place}`;
  }
  if (place) {
    return place;
  }
  if (lineName) {
    const fallback = (MARKETING_ENDS[code] ?? []).find((end) => foldKey(end) !== foldKey(HUB)) ?? HUB;
    return `${lineName} ${fallback}`;
  }
  return HUB;
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (FORBIDDEN_HUB_NAMES.has(String(station || "").trim().toLowerCase()) && !isHub(stationKey)) {
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
      const label = `${line.name} ${terminus}`;
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

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest =
    typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  const code =
    typeof tripOrDest === "object"
      ? tripOrDest?.routeShortName ?? tripOrDest?.line ?? ""
      : "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapWellingtonDestination(dest, code)) === foldKey(chip);
}
