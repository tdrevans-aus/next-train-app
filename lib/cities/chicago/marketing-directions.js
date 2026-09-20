/**
 * Chicago 'L' — hub lock, doNotGroup/doNotCollapse guards, and the "line + terminus" direction
 * model recommended by docs/chicago-d1/direction-model-memo.md (§3, model A: `Red + Howard`,
 * `Brown + Kimball`, `Purple + Linden` — the bare printed color word, never "<Color> Line").
 *
 * Hub lock: Clark/Lake (Blue subway crossing under the Loop rectangle; Brown/Green/Orange/
 * Pink/Purple elevated on it). The Loop is a structure/region label, never a station and never
 * a direction token — "to The Loop"/"Downtown"/"City" must never appear as a direction chip.
 * Red does not call Clark/Lake at all; its inner-city subway string is Lake (then Monroe,
 * Jackson) — never label a Red train "Clark/Lake".
 *
 * Same-printed-name/different-physical-place families (docs/chicago-d1/hazard-pack.md H1/H4,
 * oracle-clash-report.md station name table): Harlem (2 places, both Blue), Western (5 places),
 * Pulaski (4), Cicero (3), Kedzie (4, distinct from Kedzie-Homan which is its own unique
 * string), Damen (4), Belmont (Red/Brown/Purple shared North Side Main Line vs a separate Blue
 * Belmont), Chicago (Red alone, Blue alone, Brown/Purple shared Ravenswood-Loop connector),
 * Grand/Monroe (Red's State St Subway vs Blue's Dearborn St Subway — the classic non-connected
 * same-name Chicago subway pair), Addison (Red, Brown, Blue — three separate physical
 * stations), Ashland (Green/Pink share the Lake Street elevated segment; Orange's Ashland is a
 * separate station near 35th/Damen), Clinton (Green/Pink share Lake Street; Blue's Clinton is
 * separate), California/Austin/Oak Park/Halsted/Garfield/47th/Montrose/Irving Park/Central
 * (each a same-printed-name pair on two lines that do not share trackage at that point). These
 * disambiguated catalog entries carry a `branch` field and a qualified alias
 * (e.g. "Western (Blue - O'Hare Branch)") — the bare colliding name alone is ambiguous and
 * resolveCatalogEntry() (lib/providers/chicago.js) refuses to silently pick one.
 *
 * This split is a D2 judgment call cross-referenced against the hazard pack's explicit
 * doNotCollapse/place-count language, not extracted from a live payload or GTFS join — flagged
 * for Tim/Nico sign-off before any live flip (see docs/chicago-d1/jim-handoff.md addendum).
 *
 * @see docs/chicago-d1/direction-model-memo.md
 * @see docs/chicago-d1/hazard-pack.md
 * @see docs/chicago-d1/oracle-clash-report.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const CHICAGO_HUB = "Clark/Lake";
/** America/Chicago HAS DST (CDT/CST) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const CHICAGO_TIME_ZONE = "America/Chicago";

/**
 * Tokens that must never resolve as a real Chicago 'L' station: invented city ids (chicago is
 * the only valid one — never chi/cta/chicago-l/dc), plus hub/marketing strings this D1 pack
 * explicitly forbids as stand-ins for Clark/Lake, plus hub strings printed for OTHER cities in
 * this codebase — docs/chicago-d1/published-network.json printedInnerCityNames.doNotUse.
 */
const FORBIDDEN_STATION_TOKENS = [
  "Downtown",
  "The Loop",
  "Loop",
  "Loop 'L'",
  "Metro Center",
  "Beurs",
  "Union Station",
  "Union Station (Metra)",
  "Ogilvie",
  "Ogilvie Transportation Center",
  "Millennium Station",
  "LaSalle Street Station",
  "chi",
  "cta",
  "chicago-l",
  "dc",
  "City",
  "CBD",
  "Downtown Chicago",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
  "Park Street",
  "Embarcadero",
];

/**
 * Real downtown Loop stops/strings that must never stand in for the Clark/Lake hub identity,
 * even though each is itself a valid, separately-catalogued 'L' station. Clark/Lake is a
 * through-cross + Loop gate, not a single-end hub — hazard-pack.md H6.
 */
const HUB_PROXY_FORBIDDEN = [
  "State/Lake",
  "Washington/Wabash",
  "Adams/Wabash",
  "Lake",
  "Washington",
  "Washington/Wells",
  "Library",
  "LaSalle/Van Buren",
  "Quincy",
  "Monroe",
  "Jackson",
  "Merchandise Mart",
];

/** Fold diacritics/case/punctuation for name comparisons (mirrors lib/cities/bart, boston). */
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

/** True when `name` is a real Loop stop string that must not be folded into the Clark/Lake hub. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(CHICAGO_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/**
 * Passenger-facing line label per docs/chicago-d1/direction-model-memo.md §3 open question 1:
 * the bare printed color word (Brown, not "Brn"; Green, not "G").
 */
export const LINE_LABELS = {
  red: "Red",
  blue: "Blue",
  brown: "Brown",
  green: "Green",
  orange: "Orange",
  pink: "Pink",
  purple: "Purple",
  yellow: "Yellow",
};

/**
 * Far printed termini per line, docs/chicago-d1/direction-model-memo.md §3 / published-
 * network.json `lines[].termini`. Clark/Lake and "the Loop" never appear here for any line —
 * they are structure/hub strings, never direction tokens (hazard-pack.md H6).
 */
export const LINE_TERMINI = {
  red: ["Howard", "95th/Dan Ryan"],
  blue: ["O'Hare", "Forest Park"],
  brown: ["Kimball"],
  green: ["Harlem/Lake", "Ashland/63rd", "Cottage Grove"],
  orange: ["Midway"],
  pink: ["54th/Cermak"],
  purple: ["Linden", "Howard"],
  yellow: ["Dempster-Skokie", "Howard"],
};

/**
 * CTA Train Tracker `rt` route-code values (per developer docs) -> our line id. Distinct from
 * GTFS route_id casing (Red/Blue/Brn/G/Org/Pink/P/Y, published-network.json
 * gtfsRouteIdsIfKnown) — Train Tracker's own `rt` field is documented lowercase.
 * UNVERIFIED against a live payload (no CTA_TRAIN_TRACKER_KEY this session) — confirm at D3.
 */
export const CTA_RT_TO_LINE = {
  red: "red",
  blue: "blue",
  brn: "brown",
  g: "green",
  org: "orange",
  pink: "pink",
  p: "purple",
  y: "yellow",
};

/** GTFS route_id (routes.txt) -> our line id, per published-network.json gtfsRouteIdsIfKnown. */
export const CTA_GTFS_ROUTE_ID_TO_LINE = {
  Red: "red",
  Blue: "blue",
  Brn: "brown",
  G: "green",
  Org: "orange",
  Pink: "pink",
  P: "purple",
  Y: "yellow",
};

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
 * Thrown when a raw station query matches more than one physical place under the same printed
 * name (a same-name-different-line family, e.g. "Western") and no branch-qualified alias was
 * given — never silently picks one. Callers must re-query with the qualified alias
 * (e.g. "Western (Blue - O'Hare Branch)"), same never-fabricate posture as
 * lib/cities/bart's isForbiddenHubProxy guard.
 */
export class AmbiguousChicagoStationError extends Error {
  constructor(name, candidates) {
    super(
      `"${name}" matches ${candidates.length} different Chicago 'L' stations sharing this ` +
        "printed name — re-query with a branch-qualified alias, e.g. " +
        `"${candidates[0]?.aliases?.[0] ?? name}".`
    );
    this.name = "AmbiguousChicagoStationError";
    this.candidates = candidates;
  }
}

/**
 * Resolve a raw name/alias against the catalog. Returns a single entry, null when unrecognized,
 * or throws AmbiguousChicagoStationError when the bare name matches more than one physical
 * place (a doNotCollapse family) without a qualifying alias.
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
  if (matches.length === 1) {
    return matches[0];
  }
  throw new AmbiguousChicagoStationError(raw, matches);
}

/**
 * Resolve a raw ETA `destNm` string to one of `lineId`'s known printed termini, or null if it
 * doesn't match one. Exact match first, then a conservative substring match against just that
 * line's small termini set (Train Tracker destination strings are documented to be short
 * blinds and this pack has NOT verified the exact live strings against a real payload).
 * Deliberately narrow — only ever returns a name from LINE_TERMINI, so a Loop/hub string
 * ("Clark/Lake", "Loop", "Downtown") can never leak into a direction chip.
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
 * "Line + terminus" per docs/chicago-d1/direction-model-memo.md (recommendation A). Falls back
 * to the bare line label when the destination can't be resolved to a known terminus for that
 * line — this is what guarantees "Clark/Lake"/"Loop"/"Downtown" (hub strings, hazard-pack.md
 * H6) never appear as a direction, without a separate forbidden-token check on the output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

/**
 * All "line + terminus" chips a station can offer, for the dogfood harness / directions API.
 * A terminus equal to the station's own printed name is excluded (self-referential — a train
 * can't be signed to the stop it's currently calling at), same guard Boston uses.
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
