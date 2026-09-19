/**
 * Washington, D.C. (WMATA Metrorail) — hub lock, doNotGroup/doNotCollapse guards, and the
 * "Line + terminus" direction model recommended by docs/washington-d1/direction-model-memo.md
 * (§3, model A: `Red Line + Glenmont`, `Silver Line + Ashburn`, `Yellow Line + Huntington` —
 * unlike Chicago's bare colour word, WMATA's memo explicitly keeps the word "Line").
 *
 * Hub lock: Metro Center (Red × Orange/Blue/Silver transfer). This is a through-cross, not a
 * single-end hub — Red runs NW–NE, Orange/Blue/Silver run E–W — so "to Metro Center"/"to City"
 * must never appear as a direction chip; directions are always the suburban terminus. Metro
 * Center is ONE catalog station (both platform codes A01+C01 are queried together at request
 * time in lib/providers/washington.js — never split into two catalog entries; this is a
 * combined-board rider concept, same shape as Chicago/Adelaide's shared hub boards).
 *
 * doNotCollapse (docs/washington-d1/hazard-pack.md H1/H4/H6, published-network.json
 * printedInnerCityNames): Metro Center vs Gallery Place-Chinatown (one stop apart, different
 * transfers — NOT the same station); Farragut North (Red only) vs Farragut West
 * (Orange/Blue/Silver only) — two separate stations, two separate streets; Union Station /
 * L'Enfant Plaza / Federal Triangle / McPherson Sq are real, separately-catalogued stations that
 * must never stand in for the Metro Center hub identity. No same-printed-name-different-place
 * families exist on this map (hazard-pack.md H5: "no official nested codes... six passenger
 * colors only") — unlike Chicago/BART, resolveCatalogEntry() here never throws an
 * ambiguous-name error, since D1 has no colliding station names to disambiguate.
 *
 * @see docs/washington-d1/direction-model-memo.md
 * @see docs/washington-d1/hazard-pack.md
 * @see docs/washington-d1/oracle-clash-report.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const WASHINGTON_HUB = "Metro Center";
/** America/New_York HAS DST (EDT/EST) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const WASHINGTON_TIME_ZONE = "America/New_York";

/**
 * Tokens that must never resolve as a real Washington Metrorail station: invented city ids
 * (washington is the only valid one — never dc/washington-dc/wmata/us), plus the printed
 * inner-city hub's doNotUse list (published-network.json printedInnerCityNames.doNotUse) —
 * every other-city hub string this codebase already forbids, plus generic
 * "downtown"/"city"/"CBD" stand-ins.
 */
const FORBIDDEN_STATION_TOKENS = [
  // "Gallery Place" alone (without "-Chinatown") is an incomplete/wrong printed form — the map
  // prints the full two-line label as one string. The FULL real station name
  // "Gallery Place-Chinatown" (and its board rename "Gallery Pl-Chinatown"), plus other real,
  // separately-catalogued stations (Union Station, L'Enfant Plaza, Federal Triangle), must
  // resolve normally to themselves — they are only forbidden as HUB PROXIES (see
  // HUB_PROXY_FORBIDDEN below), never as stations in their own right.
  "Gallery Place",
  "Washington",
  "Washington, DC",
  "Washington DC",
  "DC",
  "Downtown",
  "Capitol",
  "Metro Center Station",
  "Chicago Loop",
  "Beurs",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
  "City",
  "CBD",
  "Downtown DC",
  "dc",
  "washington-dc",
  "wmata",
  "us",
];

/**
 * Real, separately-catalogued stations that must never stand in for the Metro Center hub
 * identity, even though each is a valid station in its own right — hazard-pack.md H6.
 */
const HUB_PROXY_FORBIDDEN = [
  "Gallery Place-Chinatown",
  "Federal Triangle",
  "McPherson Sq",
  "Farragut North",
  "Farragut West",
  "L'Enfant Plaza",
  "Union Station",
];

/** Fold diacritics/case/punctuation for name comparisons (mirrors lib/cities/bart, chicago). */
export function foldKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isForbiddenCollapseName(name) {
  const needle = foldKey(name);
  if (!needle) {
    return false;
  }
  return FORBIDDEN_STATION_TOKENS.some((entry) => foldKey(entry) === needle);
}

/** True when `name` is a real station string that must not be folded into the Metro Center hub. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(WASHINGTON_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/** Passenger-facing line label per direction-model-memo.md §3 recommendation A. */
export const LINE_LABELS = {
  red: "Red",
  orange: "Orange",
  blue: "Blue",
  silver: "Silver",
  green: "Green",
  yellow: "Yellow",
};

/**
 * Far printed termini per line, docs/washington-d1/direction-model-memo.md §3 /
 * published-network.json `lines[].termini`. Metro Center never appears here for any line — it
 * is a structure/hub string, never a direction token (hazard-pack.md H6).
 */
export const LINE_TERMINI = {
  red: ["Shady Grove", "Glenmont"],
  orange: ["Vienna/Fairfax-GMU", "New Carrollton"],
  blue: ["Franconia-Springfield", "Downtown Largo"],
  silver: ["Ashburn", "Downtown Largo", "New Carrollton"],
  green: ["Greenbelt", "Branch Av"],
  yellow: ["Huntington", "Mt Vernon Sq/7th St-Convention Center", "Greenbelt"],
};

/**
 * WMATA Station Prediction `Line` field values (per developer.wmata.com docs) -> our line id.
 * "No" (no-passenger/out-of-service train) and "--" (unknown) are deliberately absent — any
 * `Line` value not in this map is dropped before reaching a rider (see
 * lib/providers/washington.js mapWmataTrainToTrip). UNVERIFIED against a live payload (no
 * WMATA_API_KEY this session) — confirm at D3.
 */
export const WMATA_LINE_CODE_TO_LINE = {
  RD: "red",
  OR: "orange",
  BL: "blue",
  SV: "silver",
  GR: "green",
  YL: "yellow",
};

const aliasToEntry = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToEntry.set(foldKey(entry.name), entry);
  for (const alias of entry.aliases ?? []) {
    aliasToEntry.set(foldKey(alias), entry);
  }
}

/**
 * Resolve a raw name/alias against the catalog. Returns a single entry or null when
 * unrecognized. Unlike Chicago/BART's resolveCatalogEntry, this never throws an
 * ambiguous-name error — D1 has no same-printed-name-different-place families on this map
 * (hazard-pack.md H5).
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  return aliasToEntry.get(foldKey(raw)) ?? null;
}

/**
 * Resolve a raw destination string to one of `lineId`'s known printed termini, or null if it
 * doesn't match one. Exact match first, then a conservative substring match against just that
 * line's small termini set. Deliberately narrow — only ever returns a name from LINE_TERMINI,
 * so a hub string ("Metro Center", "Downtown") can never leak into a direction chip.
 */
export function resolveTerminus(destinationOrName, lineId) {
  const termini = LINE_TERMINI[lineId] ?? [];
  if (!termini.length) {
    return null;
  }
  const needle = foldKey(destinationOrName);
  if (!needle) {
    return null;
  }
  const exact = termini.find((terminus) => foldKey(terminus) === needle);
  if (exact) {
    return exact;
  }
  const matches = termini.filter((terminus) => {
    const hay = foldKey(terminus);
    return hay.includes(needle) || needle.includes(hay);
  });
  return matches.length === 1 ? matches[0] : null;
}

/**
 * "Line + terminus" per docs/washington-d1/direction-model-memo.md (recommendation A). Falls
 * back to "{Label} Line" when the destination can't be resolved to a known terminus for that
 * line — this is what guarantees "Metro Center"/"Downtown" (hub strings, hazard-pack.md H6)
 * never appear as a direction, without a separate forbidden-token check on the output.
 */
export function mapLineTerminusDestination(destinationOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(destinationOrName, lineId);
  return terminus ? `${label} Line + ${terminus}` : `${label} Line`;
}

/**
 * All "Line + terminus" chips a station can offer, for the dogfood harness / directions API. A
 * terminus equal to the station's own printed name is excluded (self-referential), same guard
 * Chicago/Boston use.
 */
export function marketingLabelsForStation(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  if (!entry) {
    return [];
  }
  const stationKey = foldKey(entry.name);
  const labels = [];
  const seen = new Set();
  for (const lineId of entry.lines) {
    const label = LINE_LABELS[lineId] ?? lineId;
    for (const terminus of LINE_TERMINI[lineId] ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const chip = `${label} Line + ${terminus}`;
      if (seen.has(chip)) {
        continue;
      }
      seen.add(chip);
      labels.push(chip);
    }
  }
  return labels;
}

export function tripMatchesMarketingChip(trip, chip) {
  return String(trip?.destination ?? "") === String(chip ?? "");
}
