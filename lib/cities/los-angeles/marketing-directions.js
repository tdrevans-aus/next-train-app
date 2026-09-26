/**
 * Los Angeles Metro Rail — hub lock, doNotGroup/doNotCollapse guards, and the "line + terminus"
 * direction model recommended by docs/los-angeles-d1/direction-model-memo.md (§3, recommendation
 * A: `A Line + Pomona North`, `E Line + Atlantic`, `K Line + Redondo Beach` — keeps the word
 * "Line", same shape as lib/cities/washington/marketing-directions.js, unlike Chicago's/BART's
 * bare colour word).
 *
 * Hub lock: **7th St/Metro Ctr** (A x B x D x E, a through-cross, not a single-end hub — A runs
 * N-S through it, E runs E-W through it, B/D continue on to Union Station/North Hollywood/
 * Wilshire/La Cienega). C and K never call here. Never a direction token — "to 7th Street" /
 * "to Metro Center" / "to City" / "to Downtown" must never appear as a direction chip
 * (hazard-pack.md H6, direction-model-memo.md §3).
 *
 * doNotGroup (docs/los-angeles-d1/hazard-pack.md H1/H4, oracle-clash-report.md): 7th St/Metro
 * Ctr vs Union Station vs Civic Ctr/Grand Park vs Pershing Square vs Historic Broadway vs East
 * LA Civic Ctr (six distinct downtown/transfer buildings); Grand Av Arts/Bunker Hill vs
 * Grand/LATTC vs Civic Ctr/Grand Park vs LATTC/Ortho Institute; Pico vs Pico/Aliso; Crenshaw vs
 * Expo/Crenshaw; Aviation/Century vs Aviation/Imperial; Pacific Av (A Line Long Beach loop stop,
 * not a second south terminus) vs Downtown Long Beach; Union Station's Metrolink/Amtrak/FlyAway
 * transfers are not D1 stops. This split is a D1/D2 judgment call cross-referenced against the
 * hazard pack's explicit doNotGroup language, not extracted from a live GTFS-RT payload (no
 * SWIFTLY_API_KEY this session) — flagged for Tim/Mark sign-off before any live flip.
 *
 * @see docs/los-angeles-d1/direction-model-memo.md
 * @see docs/los-angeles-d1/hazard-pack.md
 * @see docs/los-angeles-d1/oracle-clash-report.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const LOS_ANGELES_HUB = "7th St/Metro Ctr";
/** America/Los_Angeles HAS DST (PDT/PST) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const LOS_ANGELES_TIME_ZONE = "America/Los_Angeles";

/**
 * Tokens that must never resolve as a real LA Metro Rail station: invented city ids (los-angeles
 * is the only valid one — never la/lax/metro/lacmta/us), plus hub/marketing strings this D1 pack
 * explicitly forbids as stand-ins for 7th St/Metro Ctr, plus hub strings printed for OTHER
 * cities in this codebase (docs/los-angeles-d1/hazard-pack.md doNotGroup proposals table).
 */
const FORBIDDEN_STATION_TOKENS = [
  "Downtown",
  "City",
  "CBD",
  "la",
  "lax",
  "metro",
  "lacmta",
  "us",
  "Metro Center",
  "Clark/Lake",
  "Embarcadero",
  "Park Street",
  "Beurs",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
];

/**
 * Real downtown transfer-building strings that must never stand in for the 7th St/Metro Ctr hub
 * identity, even though each is itself a valid, separately-catalogued station (hazard-pack.md
 * H1/H4/H6).
 */
const HUB_PROXY_FORBIDDEN = [
  "Union Station",
  "Civic Ctr/Grand Park",
  "Pershing Square",
  "Historic Broadway",
  "East LA Civic Ctr",
  "Grand Av Arts/Bunker Hill",
  "Grand/LATTC",
  "LATTC/Ortho Institute",
];

/** Fold diacritics/case/punctuation for name comparisons (mirrors bart/chicago/boston). */
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

/** True when `name` is a real transfer-building stop string that must not be folded into the
 * 7th St/Metro Ctr hub. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(LOS_ANGELES_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/**
 * Passenger-facing line label per docs/los-angeles-d1/direction-model-memo.md §3 open question 1
 * (recommendation: `{A,B,C,D,E,K} Line + terminus`, not the bare circle letter or timetable
 * number).
 */
export const LINE_LABELS = {
  a: "A Line",
  b: "B Line",
  c: "C Line",
  d: "D Line",
  e: "E Line",
  k: "K Line",
};

/**
 * Far printed termini per line, docs/los-angeles-d1/direction-model-memo.md §3 / published-
 * network.json `lines[].termini`. 7th St/Metro Ctr never appears here for any line — it is a
 * hub/structure string, never a direction token. A Line's Long Beach loop stations (5th St,
 * 1st St, Pacific Av) are not extra terminus chips (direction-model-memo.md "Downtown Long
 * Beach").
 */
export const LINE_TERMINI = {
  a: ["Pomona North", "Downtown Long Beach"],
  b: ["North Hollywood", "Union Station"],
  c: ["Norwalk", "LAX/Metro Transit Center"],
  d: ["Union Station", "Wilshire/La Cienega"],
  e: ["Downtown Santa Monica", "Atlantic"],
  k: ["Expo/Crenshaw", "Redondo Beach"],
};

/**
 * A Line documented short-turn destinations (published-network.json lines[].shortTurns,
 * hazard-pack.md H5) — recorded for reference, never treated as a terminus chip.
 */
export const A_LINE_SHORT_TURNS = ["Monrovia", "APU/Citrus College", "Wardlow"];

const aliasToEntries = new Map();
for (const entry of stationCatalog.stations ?? []) {
  const key = foldKey(entry.name);
  const list = aliasToEntries.get(key) ?? [];
  list.push(entry);
  aliasToEntries.set(key, list);
  for (const alias of entry.aliases ?? []) {
    aliasToEntries.set(foldKey(alias), [entry]);
  }
}

/**
 * Resolve a raw name/alias against the catalog. Returns a single entry or null when
 * unrecognized/forbidden. Unlike Chicago there is no same-printed-name-different-place
 * collision on this map (hazard-pack.md H5 records none), so this never throws an ambiguity
 * error — every catalog name is already unique.
 */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  const matches = aliasToEntries.get(foldKey(raw));
  if (!matches || matches.length === 0) {
    return null;
  }
  return matches[0];
}

/**
 * Resolve a raw GTFS-RT trip_headsign/destination string to one of `lineId`'s known printed
 * termini, or null if it doesn't match one. Exact match first, then a conservative substring
 * match against just that line's small termini set — Swiftly's exact live headsign strings are
 * UNVERIFIED against a real payload (empty-key 401 only, docs/los-angeles-d1/jim-handoff.md), so
 * this is deliberately conservative: an unexpected live string degrades to the bare line label
 * rather than a wrong/fabricated terminus. Confirm once SWIFTLY_API_KEY is set.
 */
export function resolveTerminus(headsignOrName, lineId) {
  const termini = LINE_TERMINI[lineId] ?? [];
  if (!termini.length) {
    return null;
  }
  const needle = foldKey(headsignOrName);
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
 * "Line + terminus" per docs/los-angeles-d1/direction-model-memo.md (recommendation A). Falls
 * back to the bare line label when the destination can't be resolved to a known terminus for
 * that line — this is what guarantees "7th St/Metro Ctr"/"Downtown"/"City" (hub strings,
 * hazard-pack.md H6) never appear as a direction, without a separate forbidden-token check on
 * the output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

/**
 * All "line + terminus" chips a station can offer, for the dogfood harness / directions API.
 * A terminus equal to the station's own printed name is excluded (self-referential), same guard
 * Boston/Chicago use.
 */
export function marketingLabelsForStation(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  if (!entry) {
    return [];
  }
  const stationKey = foldKey(entry.name);
  const labels = [];
  const seen = new Set();
  for (const lineId of entry.lines.map((id) => id.toLowerCase())) {
    const label = LINE_LABELS[lineId] ?? lineId;
    for (const terminus of LINE_TERMINI[lineId] ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const chip = `${label} + ${terminus}`;
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
