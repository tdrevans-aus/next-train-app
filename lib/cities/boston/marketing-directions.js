/**
 * Boston (MBTA subway) — hub lock, doNotGroup/doNotCollapse guards, and the "line + terminus"
 * direction model recommended by docs/boston-d1/direction-model-memo.md (§3, model A).
 *
 * Hub lock: Park Street (Red x Green, all four Green services) — never a direction token.
 * doNotGroup: Downtown Crossing (Red x Orange), Gov't Center (Green x Blue; B/C inner end),
 * State (Orange x Blue), South Station, North Station, Haymarket are all separate stop-places
 * from Park Street, per docs/boston-d1/hazard-pack.md H1/H2/H6.
 *
 * @see docs/boston-d1/direction-model-memo.md
 * @see docs/boston-d1/hazard-pack.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(
  readFileSync(join(__dirname, "stations.json"), "utf8")
);

export const BOSTON_HUB = "Park Street";
/** America/New_York HAS DST (EDT/EST) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const BOSTON_TIME_ZONE = "America/New_York";

/**
 * Tokens that must never resolve as a real Boston station: marketing/invented city ids
 * (Boston, City, CBD, Downtown, bos, mbta) plus hub strings printed for OTHER cities in this
 * codebase (Metro Center, Clark/Lake, Embarcadero, Beurs, T-Centralen, Brunnsparken, Centraal
 * Station, Waitematā Station) — docs/boston-d1/published-network.json
 * printedInnerCityNames.doNotUse / hazard-pack.md doNotGroup table.
 */
const FORBIDDEN_STATION_TOKENS = [
  "Boston",
  "City",
  "CBD",
  "Downtown",
  "Downtown Boston",
  "bos",
  "mbta",
  "boston-mbta",
  "us",
  "Metro Center",
  "Clark/Lake",
  "Embarcadero",
  "Beurs",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
];

/**
 * Real downtown buildings/strings that must never stand in for the Park Street hub identity
 * (i.e. must never be treated as an alias of Park Street), even though most of them are
 * themselves valid, separately-catalogued Boston stations. "Park St" / "Park Street Station"
 * are explicitly banned short/long forms for the hub itself (D1 doNotUse list).
 */
const HUB_PROXY_FORBIDDEN = [
  "Downtown Crossing",
  "Gov't Center",
  "Government Center",
  "State",
  "South Station",
  "North Station",
  "Haymarket",
  "Downtown",
  "Park St",
  "Park Street Station",
];

/** Fold diacritics/case/punctuation for name comparisons (mirrors lib/cities/copenhagen). */
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

/** True when `name` is a real downtown string that must not be folded into the Park Street hub. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(BOSTON_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/** Passenger-facing line label per docs/boston-d1/direction-model-memo.md §3 open question 1. */
export const LINE_LABELS = {
  red: "Red Line",
  orange: "Orange Line",
  blue: "Blue Line",
  "green-b": "Green Line B",
  "green-c": "Green Line C",
  "green-d": "Green Line D",
  "green-e": "Green Line E",
  mattapan: "Mattapan Line",
};

/**
 * Far printed termini per line, docs/boston-d1/direction-model-memo.md §3. Gov't Center is a
 * legitimate direction terminus for Green B/C (the printed legend inner end) — it is only
 * forbidden as a stand-in for the Park Street hub identity (see HUB_PROXY_FORBIDDEN above),
 * never as a Green B/C direction chip.
 */
export const LINE_TERMINI = {
  red: ["Alewife", "Ashmont", "Braintree"],
  orange: ["Oak Grove", "Forest Hills"],
  blue: ["Wonderland", "Bowdoin"],
  "green-b": ["Boston College", "Gov't Center"],
  "green-c": ["Cleveland Circle", "Gov't Center"],
  "green-d": ["Riverside", "Union Sq"],
  "green-e": ["Heath St", "Medford/Tufts"],
  mattapan: ["Ashmont", "Mattapan"],
};

/**
 * MBTA GTFS/V3 route_id -> our line id. These match docs/boston-d1/published-network.json's
 * per-line `gtfsRouteIdsIfKnown` exactly (Red, Orange, Blue, Green-B/C/D/E, Mattapan) — no
 * other id is a subway/rapid-transit route in this feed (hazard-pack.md v1 mode cut: Silver
 * Line BRT, bus, ferry, Commuter Rail are all excluded route_ids/route_types).
 */
export const MBTA_ROUTE_ID_TO_LINE = {
  Red: "red",
  Orange: "orange",
  Blue: "blue",
  "Green-B": "green-b",
  "Green-C": "green-c",
  "Green-D": "green-d",
  "Green-E": "green-e",
  Mattapan: "mattapan",
};

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias (e.g. GTFS long form "Government Center") to the D1
 * printed name (e.g. "Gov't Center"), or null if unrecognized — never fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Resolve a raw trip destination/headsign to one of `lineId`'s known printed termini, or null
 * if it doesn't match one. Deliberately narrow — only ever returns a name from LINE_TERMINI,
 * never an arbitrary headsign, so a mislabeled GTFS headsign (or a hub string like "Park
 * Street"/"City"/"Downtown") can never leak into a direction chip.
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
 * "Line + terminus" per docs/boston-d1/direction-model-memo.md (recommendation A). Falls back
 * to the bare line label (no "+ X" suffix) when the headsign can't be resolved to a known
 * terminus for that line — this is what guarantees "Park Street"/"City"/"Downtown" (hub
 * strings, hazard-pack.md H5) never appear as a direction, without needing a separate
 * forbidden-token check on the label output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}
