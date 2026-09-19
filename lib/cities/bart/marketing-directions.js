/**
 * BART — hub lock, doNotGroup/doNotCollapse guards, and the "line + terminus" direction model
 * recommended by docs/bart-d1/direction-model-memo.md (§3, model A: `Yellow + Antioch`,
 * `Blue + Daly City`, `Orange + Richmond` — the bare color word, not "<Color> Line").
 *
 * Hub lock: Embarcadero (first downtown SF stop after the Transbay Tube; Yellow/Blue/Green/Red
 * through-run both ways, Orange never arrives) — never a direction token. The four-stop
 * downtown SF trunk (Embarcadero, Montgomery St, Powell St, Civic Center/UN Plaza) is
 * structure, not a hub token; Powell St is the Muni/cable-car-famous stop and is explicitly
 * NOT the lock. doNotGroup per docs/bart-d1/hazard-pack.md H1/H2/H4/H6: Montgomery St, Powell
 * St, Civic Center/UN Plaza, 12th St/Oakland City Center, 19th St/Oakland, West Oakland, Lake
 * Merritt, Dublin/Pleasanton vs West Dublin/Pleasanton, Pittsburg/Bay Point vs Pittsburg
 * Center, San Francisco International Airport (SFO) vs Oakland International Airport (OAK).
 *
 * @see docs/bart-d1/direction-model-memo.md
 * @see docs/bart-d1/hazard-pack.md
 * @see docs/bart-d1/oracle-clash-report.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const BART_HUB = "Embarcadero";
/** America/Los_Angeles HAS DST (PDT/PST) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const BART_TIME_ZONE = "America/Los_Angeles";

/**
 * Tokens that must never resolve as a real BART station: invented city ids (bart is the only
 * valid one — never sf/san-francisco/bay-area/oakland/sfo), plus hub/marketing strings this
 * D1 pack explicitly forbids as stand-ins for Embarcadero, plus hub strings printed for OTHER
 * cities in this codebase — docs/bart-d1/published-network.json
 * printedInnerCityNames.doNotUse.
 */
const FORBIDDEN_STATION_TOKENS = [
  // "Powell" bare is a doNotUse hub-proxy token; "Powell St" itself is a real, separately
  // catalogued station (just never the Embarcadero hub lock) and must still resolve — see
  // HUB_PROXY_FORBIDDEN below, not here.
  "Powell",
  "Downtown",
  "San Francisco",
  "SF",
  "City",
  "CBD",
  "Downtown SF",
  "Bay Area",
  "sf",
  "san-francisco",
  "bay-area",
  "oakland",
  // NOT "sfo" here: that's the real airport station's own catalogued alias
  // (San Francisco International Airport (SFO)) — only the invented CITY id
  // "bart vs sfo" is forbidden, checked at the registry level, not here.
  "Metro Center",
  "Clark/Lake",
  "Beurs",
  "Civic Center",
  "Montgomery",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
  "Park Street",
];

/**
 * Real downtown SF trunk stops/strings that must never stand in for the Embarcadero hub
 * identity, even though every one of them is itself a valid, separately-catalogued BART
 * station. Embarcadero is a through-cross, not a single-end hub — hazard-pack.md H6.
 */
const HUB_PROXY_FORBIDDEN = [
  "Montgomery St",
  "Montgomery St.",
  "Powell St",
  "Powell St.",
  "Civic Center/UN Plaza",
  "Civic Center / UN Plaza",
  "12th St/Oakland City Center",
  "19th St/Oakland",
  "West Oakland",
  "Lake Merritt",
  "Downtown",
  "San Francisco",
  "SF",
];

/** Fold diacritics/case/punctuation for name comparisons (mirrors lib/cities/boston). */
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

/** True when `name` is a real downtown SF trunk / Oakland-wye string that must not be folded
 * into the Embarcadero hub. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(BART_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/**
 * Passenger-facing line label per docs/bart-d1/direction-model-memo.md §3 open question 1:
 * the bare map color word (or OAK for the airport connector), not "<Color> Line".
 */
export const LINE_LABELS = {
  yellow: "Yellow",
  blue: "Blue",
  green: "Green",
  red: "Red",
  orange: "Orange",
  oak: "OAK",
};

/**
 * Far printed termini per line, docs/bart-d1/direction-model-memo.md §3 / published-network.json
 * `lines[].termini`. Embarcadero never appears here for any line — it is the hub stop string,
 * never a direction token (hazard-pack.md H6).
 */
export const LINE_TERMINI = {
  yellow: ["Antioch", "San Francisco International Airport (SFO)", "Millbrae"],
  blue: ["Dublin/Pleasanton", "Daly City"],
  green: ["Berryessa/North San José", "Daly City"],
  red: ["Richmond", "Millbrae"],
  orange: ["Richmond", "Berryessa/North San José"],
  oak: ["Coliseum", "Oakland International Airport (OAK)"],
};

/**
 * BART Legacy API ETD `color` values (per api.bart.gov/docs/etd/etd.aspx, "conventional ETD
 * color tokens" recorded in docs/bart-d1/published-network.json as `gtfsRouteIdsIfKnown`, not
 * extracted from a live payload) -> our line id. OAK has no ETD color token (H3/liveBoards) —
 * deliberately absent here; see lib/providers/bart.js for how a Coliseum board still shows
 * Orange/Blue/Green while OAK is reported as its own no-live-feed case.
 */
export const BART_ETD_COLOR_TO_LINE = {
  YELLOW: "yellow",
  BLUE: "blue",
  GREEN: "green",
  RED: "red",
  ORANGE: "orange",
};

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias (map form or stations-index period/slash/accent form) to
 * the D1 printed (map) name, or null if unrecognized — never fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Resolve a raw ETD `destination` string to one of `lineId`'s known printed termini, or null if
 * it doesn't match one. Tries an exact catalog/alias match first, then a conservative
 * substring match against just that line's small termini set (BART's ETD destination strings
 * are documented to be shortened blinds, e.g. "SFO", and this pack has NOT verified the exact
 * live strings against a real payload — see lib/providers/bart.js file header). Deliberately
 * narrow — only ever returns a name from LINE_TERMINI, never an arbitrary headsign, so a hub
 * string ("Embarcadero", "City", "Downtown", "SF") can never leak into a direction chip.
 */
export function resolveTerminus(headsignOrName, lineId) {
  const termini = LINE_TERMINI[lineId] ?? [];
  if (!termini.length) {
    return null;
  }

  const canonical = canonicalStationName(headsignOrName);
  if (canonical && termini.includes(canonical)) {
    return canonical;
  }

  const needle = foldKey(headsignOrName);
  if (!needle) {
    return null;
  }
  const matches = termini.filter((terminus) => {
    const hay = foldKey(terminus);
    return hay.includes(needle) || needle.includes(hay);
  });
  return matches.length === 1 ? matches[0] : null;
}

/**
 * "Line + terminus" per docs/bart-d1/direction-model-memo.md (recommendation A). Falls back to
 * the bare line label (no "+ X" suffix) when the destination can't be resolved to a known
 * terminus for that line — this is what guarantees "Embarcadero"/"City"/"Downtown"/"SF" (hub
 * strings, hazard-pack.md H6) never appear as a direction, without needing a separate
 * forbidden-token check on the label output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}
