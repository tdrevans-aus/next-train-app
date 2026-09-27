/**
 * Locked Hong Kong chips: line + terminus (Island + Chai Wan).
 * Through-running — not inbound/outbound vs CBD. Never “to City”.
 * Admiralty is the metro hub (TWL × ISL × SIL × EAL, spec ADM). Do not collapse.
 *
 * Airport Express (AEL) at Hong Kong/Kowloon/Tsing Yi and Disneyland Resort Line (DRL) at Sunny
 * Bay were added 27 Sep 2026 per docs/hong-kong-d1/oracle-clash-report.md's "Board eligibility"
 * section (Tim's decision, 27 Sep 2026) — this SUPERSEDES the earlier hazard-pack.md /
 * direction-model-memo.md "no Airport Express / no Disneyland Resort in v1" line for those three
 * plus one stations only. Every other station is still urban-heavy-rail-only. Note the line code
 * for Disneyland Resort service is **DRL** (Next Train API Spec v1.7 p.7) — "DIS" is only the
 * *station* code for Disneyland Resort itself (not in-catalog); the earlier controller brief's
 * "line=DIS" was a mistake, corrected here after a live v1.7 spec PDF read and a live API probe
 * (docs/hong-kong-d1/jim-handoff.md "Live verification").
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const METRO_HUB = "Admiralty";

export const ALLOWED_LINE_CODES = [
  "ISL",
  "TWL",
  "KTL",
  "TKL",
  "TCL",
  "TML",
  "EAL",
  "SIL",
  "AEL",
  "DRL",
];

export const LINE_FAMILY = {
  ISL: "Island",
  TWL: "Tsuen Wan",
  KTL: "Kwun Tong",
  TKL: "Tseung Kwan O",
  TCL: "Tung Chung",
  TML: "Tuen Ma",
  EAL: "East Rail",
  SIL: "South Island",
  AEL: "Airport Express",
  DRL: "Disneyland Resort",
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
  /** Board-eligibility "in" at Hong Kong/Kowloon/Tsing Yi only. Airport/AsiaWorld-Expo are real
   * printed AEL destinations, never in-catalog stations in their own right. */
  AEL: ["Hong Kong", "Airport / AsiaWorld-Expo"],
  /** Board-eligibility "in" at Sunny Bay only. Disneyland Resort is the real printed DRL
   * destination, never an in-catalog station. */
  DRL: ["Sunny Bay", "Disneyland Resort"],
};

/**
 * MTR Next Train REST `dest` station-code -> the printed MARKETING_ENDS terminus label for that
 * line, per line/station table in Next Train API Spec v1.7 (docs/hong-kong-d1/jim-handoff.md
 * "Live verification" — every code below was independently confirmed live this session except
 * KTL/TKL/TCL's individual dest codes, which were not exercised live but are read directly off
 * the v1.7 spec table). Branch codes that share one printed chip (e.g. TKL's POA/LHP -> "Po Lam /
 * LOHAS Park") intentionally map to the same string so a live trip's destination always equals
 * one of MARKETING_ENDS's printed chips exactly.
 */
export const DEST_CODE_TO_TERMINUS = {
  ISL: { KET: "Kennedy Town", CHW: "Chai Wan" },
  TWL: { TSW: "Tsuen Wan", CEN: "Central" },
  KTL: { WHA: "Whampoa", TIK: "Tiu Keng Leng" },
  TKL: { NOP: "North Point", POA: "Po Lam / LOHAS Park", LHP: "Po Lam / LOHAS Park" },
  TCL: { HOK: "Hong Kong", TUC: "Tung Chung" },
  TML: { WKS: "Wu Kai Sha", TUM: "Tuen Mun" },
  EAL: { ADM: "Admiralty", LOW: "Lo Wu / Lok Ma Chau", LMC: "Lo Wu / Lok Ma Chau" },
  SIL: { ADM: "Admiralty", SOH: "South Horizons" },
  AEL: { HOK: "Hong Kong", AWE: "Airport / AsiaWorld-Expo", AIR: "Airport / AsiaWorld-Expo" },
  DRL: { SUN: "Sunny Bay", DIS: "Disneyland Resort" },
};

/** Resolves a raw MTR `dest` station code to one of that line's known printed termini, or null —
 * never fabricates a destination from an unrecognised code. */
export function resolveTerminusFromDestCode(lineCode, destCode) {
  const map = DEST_CODE_TO_TERMINUS[String(lineCode || "").toUpperCase()] ?? {};
  return map[String(destCode || "").toUpperCase()] ?? null;
}

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

function loadStationCatalog() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/hong-kong/stations.json"), "utf8"));
}

/** Which line codes (per line-map.json's `lines[].stations`) call at `name` — computed, not
 * hand-carried per station, so adding AEL/DRL to line-map.json is the only place that needs to
 * change for lib/providers/hong-kong.js to know which line(s) to query at a given station. */
export function linesForStation(name, published = loadLineMap()) {
  const key = foldKey(name);
  const codes = [];
  for (const line of published.lines ?? []) {
    if ((line.stations ?? []).some((entry) => foldKey(entry) === key)) {
      codes.push(line.number);
    }
  }
  return codes;
}

/** Single resolver for lib/providers/hong-kong.js and the dogfood module — exact name/alias fold
 * match against lib/cities/hong-kong/stations.json, decorated with the `lines` that call there.
 * Never fabricates a station. */
export function resolveCatalogEntry(stationIdOrName, catalog = loadStationCatalog(), published = loadLineMap()) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  const needle = foldKey(raw);
  for (const entry of catalog.stations ?? []) {
    const isMatch =
      foldKey(entry.name) === needle || (entry.aliases ?? []).some((alias) => foldKey(alias) === needle);
    if (isMatch) {
      return { ...entry, lines: linesForStation(entry.name, published) };
    }
  }
  return null;
}

export function listCatalogStations(catalog = loadStationCatalog(), published = loadLineMap()) {
  return (catalog.stations ?? []).map((entry) => ({ ...entry, lines: linesForStation(entry.name, published) }));
}
