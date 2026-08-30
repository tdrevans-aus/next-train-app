/**
 * Oslo T-bane + Vy regional/commuter rail + Flytoget direction model — line + terminus.
 *
 * docs/oslo-d1/direction-model-memo.md, option A (locked): Stortinget is a through-Common-
 * Tunnel hub called by all five T-bane lines (line 5 twice on one through-path), not a
 * single-end CBD — inbound/outbound vs "City"/"Sentrum"/"Oslo" is false there (and at
 * Jernbanetorget, Nationaltheatret, Majorstuen, Carl Berners plass, Økern). Chips are
 * `${line} + ${official Ruter/Vy/Flytoget terminus}` (e.g. "1 + Frognerseteren",
 * "RE10 + Lillehammer", "FLY1 + Oslo Airport"), the same "+" convention as Stockholm/
 * Helsinki.
 *
 * Vy/Flytoget scope update 30 Aug 2026 (Tim's board-eligibility decision, see
 * docs/oslo-d1/oracle-clash-report.md Board eligibility section): both operators are `in`
 * at Jernbanetorget and Nationaltheatret ONLY, each in its own doNotGroup mapGroup
 * (T-bane / Vy / Flytoget) — three separate platform sections at both stations, never a
 * merged "trains" list.
 *
 * R21 flag (direction-model-memo.md): R21's own official terminus is Oslo S ( = the
 * Jernbanetorget cluster in this catalog). A train signed "Oslo S" there is the train
 * arriving, not a valid outbound direction — same self-referential-hub problem already
 * solved for T-bane at Stortinget. Only `R21 + Moss` is ever synthesized as an outbound
 * chip; `R21 + Oslo S` / `R21 + Jernbanetorget` must never appear.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const OSLO_HUB = "Stortinget";
export const OSLO_TIME_ZONE = "Europe/Oslo";

/**
 * printedInnerCityNames.doNotUse from docs/oslo-d1/published-network.json is one list doing
 * two jobs there, same split as Helsinki: strings that must never stand in for the
 * Stortinget hub lock *at all* (map-blob / marketing tokens, plus the Oslo S rail name
 * family) vs strings that must never be used as a direction/terminus *chip* even though
 * they are real, boardable stations (Jernbanetorget, Nationaltheatret, Majorstuen, Tøyen —
 * shared approaches / doNotGroup clusters, not official line termini).
 */
const FORBIDDEN_STATION_NAMES = new Set(
  [
    "Oslo",
    "Oslo S",
    "Oslo Sentralstasjon",
    "Oslo Central Station",
    "City",
    "City Centre",
    "Sentrum",
    "CBD",
    "to City",
    "Oslo bussterminal",
  ].map((value) => value.trim().toLowerCase())
);

/** Same name family as "Oslo S" — the rail cluster print, not the T-bane Jernbanetorget string. */
const OSLO_S_NAME_FAMILY = new Set(
  ["oslo s", "oslo sentralstasjon", "oslo central station"]
);

/** Superset of FORBIDDEN_STATION_NAMES — never emit any of these as a direction chip terminus. */
const FORBIDDEN_TERMINUS_TOKENS = new Set(
  [...FORBIDDEN_STATION_NAMES, "jernbanetorget", "nationaltheatret", "majorstuen", "tøyen"]
);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+stasjon$/i, "")
    .replace(/\s+station$/i, "");
}

/** Blocks station *resolution* — only strings that are never a real catalog station. */
export function isForbiddenCollapseName(value) {
  return FORBIDDEN_STATION_NAMES.has(String(value || "").trim().toLowerCase());
}

/** Blocks *direction/terminus chip* text — the full doNotUse list, including real stations. */
export function isForbiddenTerminusToken(value) {
  return FORBIDDEN_TERMINUS_TOKENS.has(String(value || "").trim().toLowerCase());
}

/** R21's own terminus (Oslo S) is the self-referential hub name — never a chip. */
export function isOsloSNameFamily(value) {
  return OSLO_S_NAME_FAMILY.has(String(value || "").trim().toLowerCase());
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/oslo/line-map.json"), "utf8"));
}

/**
 * Entur `destinationDisplay.frontText` appends a via-stop for a fork leg, e.g. "Vestli via
 * Majorstuen", "Ringen via Majorstuen" (confirmed live against Journey Planner v3, 30 Aug
 * 2026). The chip only wants the terminus. "Ringen" itself is not a chip
 * (direction-model-memo.md) — callers should route ring-only frontText through the line's
 * own termini table rather than trust it verbatim.
 */
export function stripViaSuffix(headsign) {
  return String(headsign || "")
    .split(/\s+via\s+/i)[0]
    .trim();
}

/**
 * @param {string} headsign Raw Entur `destinationDisplay.frontText`
 * @param {string} lineCode T-bane 1-5, or Vy/Flytoget publicCode (e.g. RE10, FLY1)
 */
export function mapOsloDestination(headsign, lineCode) {
  const line = String(lineCode || "").trim().toUpperCase();
  const terminus = stripViaSuffix(headsign);
  if (!terminus || isOsloSNameFamily(terminus) || isForbiddenTerminusToken(terminus)) {
    return line || terminus || headsign || "";
  }
  if (!line) {
    return terminus;
  }
  return `${line} + ${terminus}`;
}

export function marketingLabel(line, terminus) {
  return `${line} + ${terminus}`;
}

/**
 * @param {string} station Printed station name
 * @param {object} [published] loadLineMap() result
 */
export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (isForbiddenCollapseName(station) && stationKey !== foldKey(OSLO_HUB)) {
    return [];
  }

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => foldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of line.termini ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      // R21 flag: Oslo S / Jernbanetorget is R21's own terminus — never a chip
      // (the arriving train, not an outbound direction).
      if (isOsloSNameFamily(terminus)) {
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

  return labels.sort((a, b) => a.localeCompare(b, "nb"));
}

/**
 * Board trips arrive from the adapter already in chip form (`1 + Frognerseteren`) via
 * mapOsloDestination. Accept either the remapped chip or a raw Entur frontText + line code.
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  const line =
    typeof tripOrDest === "object" ? tripOrDest?.routeShortName ?? tripOrDest?.line ?? "" : "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapOsloDestination(dest, line)) === foldKey(chip);
}
