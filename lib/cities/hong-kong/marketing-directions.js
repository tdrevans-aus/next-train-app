/**
 * Locked Hong Kong chips: line + terminus (Island + Chai Wan).
 * Through-running — not inbound/outbound vs CBD. Never “to City”.
 * Admiralty is the metro hub (TWL × ISL × SIL × EAL, spec ADM). Do not collapse.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const METRO_HUB = "Admiralty";

export const ALLOWED_LINE_CODES = ["ISL", "TWL", "KTL", "TKL", "TCL", "TML", "EAL", "SIL"];

export const LINE_FAMILY = {
  ISL: "Island",
  TWL: "Tsuen Wan",
  KTL: "Kwun Tong",
  TKL: "Tseung Kwan O",
  TCL: "Tung Chung",
  TML: "Tuen Ma",
  EAL: "East Rail",
  SIL: "South Island",
};

/** Official EN termini — not compass, not City, not inbound/outbound. */
export const MARKETING_ENDS = {
  ISL: ["Kennedy Town", "Chai Wan"],
  TWL: ["Tsuen Wan", "Central"],
  KTL: ["Whampoa", "Tiu Keng Leng"],
  TKL: ["North Point", "Po Lam / LOHAS Park"],
  TCL: ["Hong Kong", "Tung Chung"],
  TML: ["Wu Kai Sha", "Tuen Mun"],
  EAL: ["Admiralty", "Lo Wu / Lok Ma Chau"],
  SIL: ["Admiralty", "South Horizons"],
};

const FORBIDDEN_COLLAPSE = new Set([
  "downtown",
  "city",
  "to city",
  "hong kong west kowloon",
  "airport",
  "asiaworld-expo",
  "disneyland resort",
]);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+line$/i, "");
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/hong-kong/line-map.json"), "utf8"));
}

function familyForCode(code) {
  const raw = String(code || "").trim();
  if (LINE_FAMILY[raw]) {
    return LINE_FAMILY[raw];
  }
  const upper = raw.toUpperCase();
  if (LINE_FAMILY[upper]) {
    return LINE_FAMILY[upper];
  }
  const stripped = foldKey(raw);
  const match = Object.entries(LINE_FAMILY).find(([, name]) => foldKey(name) === stripped);
  return match?.[1] || "";
}

export function mapHongKongDestination(destination, lineDesignation) {
  const family = familyForCode(lineDesignation);
  const place = String(destination || "").trim();
  if (FORBIDDEN_COLLAPSE.has(foldKey(place))) {
    return "";
  }
  if (!family) {
    return place || destination || "";
  }
  return `${family} + ${place}`;
}

export function marketingLabel(code, terminus) {
  const family = familyForCode(code);
  return family ? `${family} + ${terminus}` : String(terminus || "");
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (FORBIDDEN_COLLAPSE.has(String(station || "").trim().toLowerCase()) && stationKey !== foldKey(METRO_HUB)) {
    return [];
  }

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => foldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const label = marketingLabel(line.number, terminus);
      const key = label.toLowerCase();
      if (seen.has(key) || /inbound|outbound|to city/i.test(label)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }

  return labels.sort((a, b) => a.localeCompare(b, "en"));
}

export function isForbiddenCollapseName(value) {
  return FORBIDDEN_COLLAPSE.has(String(value || "").trim().toLowerCase());
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
  return foldKey(mapHongKongDestination(dest, code)) === foldKey(chip);
}
