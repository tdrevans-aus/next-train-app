/**
 * Locked Osaka chips: line + terminus (Midosuji + Nakamozu).
 * Through-running — not inbound/outbound vs CBD. Never “to City”.
 * Hommachi is the metro hub (M18 × Y13 × C16). Do not collapse.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const METRO_HUB = "Hommachi";

export const ALLOWED_LINE_CODES = ["M", "T", "Y", "C", "S", "K", "N", "I"];

export const LINE_FAMILY = {
  M: "Midosuji",
  T: "Tanimachi",
  Y: "Yotsubashi",
  C: "Chuo",
  S: "Sennichimae",
  K: "Sakaisuji",
  N: "Nagahori Tsurumi-ryokuchi",
  I: "Imazatosuji",
};

/** Official EN termini — not compass, not City, not inbound/outbound. */
export const MARKETING_ENDS = {
  M: ["Esaka", "Nakamozu"],
  T: ["Dainichi", "Yao-minami"],
  Y: ["Nishi-Umeda", "Suminoekoen"],
  C: ["Yumeshima", "Nagata"],
  S: ["Nodahanshin", "Minami-Tatsumi"],
  K: ["Tenjimbashisuji 6-chome", "Tengachaya"],
  N: ["Taisho", "Kadoma-minami"],
  I: ["Itakano", "Imazato"],
};

const FORBIDDEN_COLLAPSE = new Set([
  "downtown",
  "city",
  "to city",
  "osaka",
  "honmachi",
  "senri-chuo",
  "momoyamadai",
  "minoh-kayano",
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
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/osaka/line-map.json"), "utf8"));
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

export function mapOsakaDestination(destination, lineDesignation) {
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
  return foldKey(mapOsakaDestination(dest, code)) === foldKey(chip);
}
