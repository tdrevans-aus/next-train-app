/**
 * Locked Rotterdam chips: line + terminus (Metro A + Binnenhof).
 * Hub is Beurs (RET metro). Separate from Amsterdam. A does not go to Nesselande.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
export const HUB = "Beurs";

export const MARKETING_ENDS = {
  A: ["Binnenhof", "Schiedam Centrum"],
  B: ["Nesselande", "Hoek van Holland Strand"],
  C: ["De Terp", "De Akkers"],
  D: ["Rotterdam Centraal", "De Akkers"],
  E: ["Den Haag Centraal", "Slinge"],
};

const CITY_PREFIXES = [
  /^rotterdam,\s+/i,
  /^schiedam,\s+/i,
  /^den haag,\s+/i,
  /^'s-gravenhage,\s+/i,
  /^capelle aan den ijssel,\s+/i,
  /^spijkenisse,\s+/i,
  /^vlaardingen,\s+/i,
  /^maassluis,\s+/i,
  /^hoek van holland,\s+/i,
  /^pijnacker,\s+/i,
  /^berkel en rodenrijs,\s+/i,
  /^lansingerland,\s+/i,
  /^voorburg,\s+/i,
  /^leidschendam,\s+/i,
  /^nootdorp,\s+/i,
  /^leidschenveen,\s+/i,
  /^hoogvliet rotterdam,\s+/i,
  /^pernis,\s+/i,
  /^rhoon,\s+/i,
  /^poortugaal,\s+/i,
];

export function foldKey(value) {
  let text = String(value || "").trim();
  for (const prefix of CITY_PREFIXES) {
    text = text.replace(prefix, "");
  }
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/rotterdam/line-map.json"), "utf8"));
}

function isHub(stationKey) {
  return stationKey === foldKey(HUB);
}

export function lineLabel(code) {
  const letter = String(code || "")
    .replace(/^metro\s+/i, "")
    .replace(/^m/i, "")
    .trim()
    .toUpperCase();
  if (/^[A-E]$/.test(letter)) {
    return `Metro ${letter}`;
  }
  return letter ? `Metro ${letter}` : "";
}

function canonicalPlace(token) {
  const folded = foldKey(token);
  if (!folded) {
    return "";
  }
  if (folded === "centraal station" || folded === "amsterdam centraal" || folded === "cs") {
    return "";
  }
  if (isHub(folded) || folded === "beursplein") {
    return HUB;
  }
  if (folded === "meijersplein" || folded === "meijersplein airport" || folded === "meijersplein / airport") {
    return "Meijersplein/Airport";
  }
  if (folded === "melanchtonweg") {
    return "Melanchthonweg";
  }
  if (
    folded === "strand" ||
    folded === "hoek van holland strand" ||
    folded === "hoek v holland strand"
  ) {
    return "Hoek van Holland Strand";
  }
  if (
    folded === "haven" ||
    folded === "hoek van holland haven" ||
    folded === "hoek v holland haven"
  ) {
    return "Hoek van Holland Haven";
  }
  if (folded === "tochten" || folded === "de tochten") {
    return "De Tochten";
  }
  if (folded === "'t loo" || folded === "voorburg t loo" || folded === "voorburg 't loo") {
    return "Voorburg 't Loo";
  }
  const published = loadLineMap();
  for (const line of published.lines ?? []) {
    for (const station of line.stations ?? []) {
      if (foldKey(station) === folded) {
        return station;
      }
    }
  }
  for (const prefix of CITY_PREFIXES) {
    token = String(token || "").replace(prefix, "");
  }
  return String(token || "").trim();
}

export function mapRotterdamDestination(headsign, routeShortName) {
  const letter = String(routeShortName || "")
    .replace(/^metro\s+/i, "")
    .trim()
    .toUpperCase();
  const place = canonicalPlace(headsign);
  const line = lineLabel(letter);
  if (line && place) {
    return `${line} + ${place}`;
  }
  return place || line || String(headsign || "").trim();
}

export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (stationKey === "centraal station" || stationKey === "amsterdam centraal") {
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
      const key = foldKey(label);
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
    typeof tripOrDest === "string"
      ? ""
      : String(tripOrDest?.routeShortName || "")
          .replace(/^metro\s+/i, "")
          .trim()
          .toUpperCase();
  const fromChip = String(chip || "").match(/metro\s+([a-e])/i)?.[1];
  const mapped = mapRotterdamDestination(dest, routeShort || fromChip);
  return foldKey(mapped) === foldKey(chip);
}
