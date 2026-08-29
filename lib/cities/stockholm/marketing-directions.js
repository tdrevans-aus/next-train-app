/**
 * Locked Stockholm chips: line + terminus (Röda linjen + Norsborg).
 * Through-running — not inbound/outbound vs CBD.
 * T-Centralen is metro. Stockholm City is pendeltåg. Do not collapse.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const METRO_HUB = "T-Centralen";
export const PENDELTÅG_HUB = "Stockholm City";
export const SJ_HUB = "Stockholms central";

export const ALLOWED_LINE_CODES = ["10", "11", "13", "14", "17", "18", "19", "40", "41", "43", "43X", "48"];

export const LINE_FAMILY = {
  10: "Blå linjen",
  11: "Blå linjen",
  13: "Röda linjen",
  14: "Röda linjen",
  17: "Gröna linjen",
  18: "Gröna linjen",
  19: "Gröna linjen",
  40: "Pendeltåg",
  41: "Pendeltåg",
  43: "Pendeltåg",
  "43X": "Pendeltåg",
  48: "Pendeltåg",
};

export const MARKETING_ENDS = {
  10: ["Hjulsta", "Kungsträdgården"],
  11: ["Akalla", "Kungsträdgården"],
  13: ["Norsborg", "Ropsten"],
  14: ["Fruängen", "Mörby centrum"],
  17: ["Åkeshov", "Skarpnäck"],
  18: ["Hässelby strand", "Farsta strand"],
  19: ["Hässelby strand", "Hagsätra"],
  40: ["Uppsala C", "Södertälje centrum"],
  41: ["Märsta", "Södertälje centrum"],
  43: ["Bålsta", "Nynäshamn"],
  48: ["Södertälje centrum", "Gnesta"],
};

const FORBIDDEN_COLLAPSE = new Set([
  "stockholm central",
  "stockholm c",
  "stockholms central",
  "centralen",
  "t centralen",
]);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+t-bana$/i, "")
    .replace(/\s+station$/i, "");
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/stockholm/line-map.json"), "utf8"));
}

function familyForCode(code) {
  const raw = String(code || "").trim().toUpperCase();
  return LINE_FAMILY[raw] || LINE_FAMILY[raw.replace(/X$/, "")] || "";
}

function passengerCode(code) {
  const raw = String(code || "").trim().toUpperCase();
  if (raw === "43X") {
    return "43";
  }
  return raw;
}

function stripPlace(value) {
  return String(value || "")
    .trim()
    .replace(/\s+T-bana$/i, "")
    .replace(/\s+station$/i, "");
}

export function mapStockholmDestination(destination, lineDesignation) {
  const code = String(lineDesignation || "").trim().toUpperCase();
  const family = familyForCode(code);
  let place = stripPlace(destination);
  if (/^arlanda centralstation$/i.test(String(destination || "").trim()) || /^arlanda central$/i.test(place)) {
    place = "Arlanda central";
  }
  if (/^stockholm c$|^stockholm central$|^stockholms central$/i.test(place)) {
    place = SJ_HUB;
  }
  if (!family) {
    return place || destination || "";
  }
  if (family === "Pendeltåg") {
    return `Pendeltåg ${passengerCode(code)} + ${place}`;
  }
  return `${family} + ${place}`;
}

export function marketingLabel(code, terminus) {
  const family = familyForCode(code);
  if (family === "Pendeltåg") {
    return `Pendeltåg ${passengerCode(code)} + ${terminus}`;
  }
  return `${family} + ${terminus}`;
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (FORBIDDEN_COLLAPSE.has(String(station || "").trim().toLowerCase()) && stationKey !== foldKey(METRO_HUB) && stationKey !== foldKey(PENDELTÅG_HUB)) {
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
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }

  return labels.sort((a, b) => a.localeCompare(b, "sv"));
}

export function isForbiddenCollapseName(value) {
  return FORBIDDEN_COLLAPSE.has(String(value || "").trim().toLowerCase());
}

/**
 * Board trips arrive from the adapter already in chip form (`Röda linjen +
 * Norsborg`, `Pendeltåg 41 + Södertälje centrum`) via mapStockholmDestination.
 * Accept either the remapped chip or a raw SL headsign + line designation. The
 * line identity is baked into the mapped string, so a 41 to Södertälje centrum
 * never satisfies the `Pendeltåg 40 + Södertälje centrum` chip. Short workings
 * stay live and unfolded (D1 shortTurnGroups is deliberately empty): an 18 to
 * Alvik matches only `Gröna linjen + Alvik`, never the Hässelby strand chip.
 */
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
  return foldKey(mapStockholmDestination(dest, code)) === foldKey(chip);
}
