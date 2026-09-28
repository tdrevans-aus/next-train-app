/**
 * Prague (PID Metro A/B/C) — hub lock, doNotGroup guards, and the "line + terminus" direction
 * model recommended by docs/prague-d1/direction-model-memo.md (§3 recommendation A: `A + Depo
 * Hostivař`, `B + Zličín`, `C + Háje`).
 *
 * Hub lock: Muzeum (A x C, beneath Wenceslas Square / National Museum) — never a direction
 * token ("to Muzeum" / "to City" / "to Centre"). Unlike Vienna's Karlsplatz or Brussels' single
 * cross, Prague's interchange structure is a TRIANGLE of three separate two-line nodes, no
 * single station sees all three lines:
 *   - Muzeum   (A x C) — hub lock. Line B does not call here.
 *   - Můstek   (A x B) — doNotGroup vs Muzeum. Line C does not call here.
 *   - Florenc  (B x C) — doNotGroup vs Muzeum and Můstek. Line A does not call here.
 * Each line is a simple two-end trunk (no loop, no branch, no compass-heading ambiguity) — see
 * direction-model-memo.md section 2 — so, unlike Vienna's U2/Karlsplatz correction, no line here
 * terminates at its own hub-triangle node, and no self-terminus chip synthesis is needed for
 * Muzeum/Můstek/Florenc themselves.
 *
 * DIACRITICS ARE LOAD-BEARING (hazard-pack.md "Diacritics lock"): a stripped-diacritic string
 * (`Mustek`, `Namesti Miru`) is a DIFFERENT, WRONG string here, not a rename-equivalent the way
 * Brussels' FR/NL stacking is. Unlike every other city's marketing-directions.js in this repo
 * (Vienna, Dublin, Boston, ...), foldKey() below deliberately does NOT strip combining
 * diacritical marks — it only trims/lowercases/collapses whitespace. Station names must match
 * with their full diacritic form intact; do not copy the NFKD-strip pattern from other cities.
 *
 * @see docs/prague-d1/direction-model-memo.md
 * @see docs/prague-d1/hazard-pack.md
 * @see docs/prague-d1/published-network.json
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const PRAGUE_HUB = "Muzeum";
/** Europe/Prague HAS DST (CEST/CET) — hazard-pack.md H7. Do not copy Perth/Brisbane/Auckland
 * no-DST handling. */
export const PRAGUE_TIME_ZONE = "Europe/Prague";

/**
 * Tokens that must never resolve as a real Prague station: invented city ids (praha, pida, pid
 * — oracle report explicit instruction), generic hub/city tokens (published-network.json
 * printedInnerCityNames.doNotUse), plus other cities' hub strings that have shown up as
 * cross-city collapse bugs before (doNotGroup proposals table, hazard-pack.md).
 */
const FORBIDDEN_STATION_TOKENS = [
  "Prague",
  "Praha",
  "prague",
  "praha",
  "pida",
  "pid",
  "Downtown",
  "Centre",
  "Centrum",
  "City",
  "CBD",
  "Karlsplatz",
  "Kongens Nytorv",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
  "Metro Center",
  "Embarcadero",
  "Arts-Loi",
  "Kunst-Wet",
];

/**
 * Real, separately-catalogued Prague interchange stations that must never stand in for the
 * Muzeum hub identity, even though each is itself a valid station in the catalog — the
 * interchange TRIANGLE (hazard-pack.md H1/H4/H6), not one hub.
 */
const HUB_PROXY_FORBIDDEN = ["Můstek", "Florenc"];

/**
 * Fold case/whitespace ONLY for name comparisons — diacritics are load-bearing here (see file
 * header) and must never be stripped, unlike every other city's foldKey().
 */
export function foldKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isForbiddenCollapseName(name) {
  const needle = foldKey(name);
  if (!needle) {
    return false;
  }
  return FORBIDDEN_STATION_TOKENS.some((entry) => foldKey(entry) === needle);
}

/** True when `name` is a real Prague station that must not be folded into the Muzeum hub
 * identity (Můstek, Florenc — the other two vertices of the interchange triangle). */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(PRAGUE_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/** Passenger-facing line label — the single printed line letter, per
 * direction-model-memo.md's open question 1 recommendation ({A, B, C} + official terminus, no
 * numeral system, no "Metro A"/"Line A" prefix). */
export const LINE_LABELS = {
  a: "A",
  b: "B",
  c: "C",
};

/**
 * Far printed termini per line (docs/prague-d1/published-network.json lines[].termini). Muzeum,
 * Můstek and Florenc never appear here for any line — each is a hub-triangle stop string, never
 * a direction token, and (unlike Vienna's U2/Karlsplatz) no line actually terminates at any of
 * the three, so no line-qualified hub-bound chip is needed either.
 */
export const LINE_TERMINI = {
  a: ["Nemocnice Motol", "Depo Hostivař"],
  b: ["Zličín", "Černý Most"],
  c: ["Letňany", "Háje"],
};

/**
 * Golemio departure board's own `route.short_name` ("A"/"B"/"C") -> our line id. These match
 * docs/prague-d1/published-network.json's per-line `gtfsRouteIdsIfKnown` exactly (confirmed
 * against the trimmed PID GTFS static routes.txt at D2 — scripts/trim-prague-gtfs.mjs asserts
 * the kept route_short_name set is exactly {A, B, C}, never D).
 */
export const GOLEMIO_ROUTE_SHORT_NAME_TO_LINE = {
  A: "a",
  B: "b",
  C: "c",
};

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias to the D1 printed (full-diacritic) name, or null if
 * unrecognized — never fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Resolve a raw Golemio `trip.headsign` string to one of `lineId`'s known printed termini, or
 * null if it doesn't match one. Deliberately narrow — only ever returns a name from
 * LINE_TERMINI, never an arbitrary headsign string, so an unexpected live value (or a hub string
 * like "Muzeum"/"Můstek"/"Florenc"/"Praha"/"Centrum") can never leak into a direction chip.
 */
export function resolveTerminus(headsignOrName, lineId) {
  const termini = LINE_TERMINI[lineId] ?? [];
  const canonical = canonicalStationName(headsignOrName);
  if (canonical && termini.includes(canonical)) {
    return canonical;
  }
  return null;
}

/**
 * "Line + terminus" per docs/prague-d1/direction-model-memo.md §3 recommendation A. Falls back
 * to the bare line label (no "+ X" suffix) when the headsign can't be resolved to a known
 * terminus for that line — this is what guarantees a hub string or any doNotUse token never
 * appears as a direction, without needing a separate forbidden-token check on the label output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Single resolver for both lib/providers/prague.js and the dogfood module — exact
 * name/alias match (case/whitespace-insensitive, diacritic-EXACT), never a fabricated station. */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  const needle = foldKey(raw);
  for (const entry of stationCatalog.stations ?? []) {
    if (foldKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (foldKey(alias) === needle) {
        return entry;
      }
    }
    if (entry.stopIds?.includes(stationIdOrName)) {
      return entry;
    }
  }
  return null;
}

/**
 * Whether `trip`'s classified destination equals `stationName` itself — a trip terminating at
 * the station being viewed is an arrival, not a boardable departure (the Dublin #484 lesson: no
 * station may ever offer a chip naming itself). Compares against the RESOLVED terminus (or the
 * raw headsign when unresolved), never the already-mapped "Line + Terminus" label — matching
 * lib/cities/dublin/marketing-directions.js's isTerminatingAtStation guard shape.
 */
export function isTerminatingAtStation(terminusOrHeadsign, stationName) {
  const canonicalTerminus = canonicalStationName(terminusOrHeadsign);
  const canonicalStation = canonicalStationName(stationName);
  if (!canonicalTerminus || !canonicalStation) {
    return false;
  }
  return canonicalTerminus === canonicalStation;
}

/**
 * Every direction chip a station could plausibly show (dogfood picker only — production boards
 * derive the chip from the live trip itself via mapLineTerminusDestination). Drops the chip
 * whose terminus is the station's own name, same self-terminus guard as isTerminatingAtStation
 * above (belt-and-braces; per the file header, no line actually terminates at any of the three
 * hub-triangle nodes today, but this keeps the guard general rather than special-cased).
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
