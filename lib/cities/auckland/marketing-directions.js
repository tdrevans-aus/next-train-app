/**
 * Locked Auckland chips: line + terminus (e.g. Southern Line Pukekohe).
 * Hub is Waitematā Station. Onehunga Line currently ends at Newmarket.
 * CRL through-running is a future D1 — do not invent inbound/outbound.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Waitematā Station";

export const MARKETING_ENDS = {
  STH: ["Waitematā Station", "Pukekohe"],
  EAST: ["Waitematā Station", "Manukau"],
  WEST: ["Waitematā Station", "Swanson"],
  ONE: ["Newmarket", "Onehunga"],
};

const FORBIDDEN_HUB_NAMES = new Set(["britomart", "city centre", "waitemata train station"]);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+train station$/i, "")
    .replace(/\s+station$/i, "");
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/auckland/line-map.json"), "utf8"));
}

function isHub(stationKey) {
  return stationKey === foldKey(HUB) || stationKey === "waitemata";
}

export const LINE_NAMES = {
  STH: "Southern Line",
  EAST: "Eastern Line",
  WEST: "Western Line",
  ONE: "Onehunga Line",
};

const HEADSIGN_PLACE = {
  brit: HUB,
  britomart: HUB,
  waitemata: HUB,
  ohu: "Ōtāhuhu",
  nkt: "Newmarket",
  pnr: "Penrose",
  ell: "Ellerslie",
  grn: "Greenlane",
  rem: "Remuera",
  pae: "Paerātā",
  dru: "Drury",
};

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded) {
    return "";
  }
  if (HEADSIGN_PLACE[folded]) {
    return HEADSIGN_PLACE[folded];
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
  const token = beforeVia.replace(/\s+\d+\s*$/, "").trim().split(/\s+/)[0] ?? "";
  const fromTo = canonicalPlace(token);
  if (fromTo) {
    return fromTo;
  }
  if (/britomart|\bbrit\b|waitemata/i.test(text)) {
    return HUB;
  }
  return "";
}

/**
 * GTFS headsigns like "Brit 4 To Pukekohe…" → Waitematā / line+terminus.
 */
export function mapAucklandDestination(headsign, routeShortName) {
  const code = String(routeShortName || "").trim().toUpperCase();
  const lineName = LINE_NAMES[code] || "";
  const place = headsignToPlace(headsign);
  if (/britomart|\bbrit\b/i.test(place)) {
    return lineName ? `${lineName} ${HUB}` : HUB;
  }
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
