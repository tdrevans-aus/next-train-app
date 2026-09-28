/**
 * Bergen Bybanen (Skyss) direction model — line + terminus, per
 * docs/bergen-d1/direction-model-memo.md recommendation A (the same convention already used
 * for Oslo, Vienna, and every prior pack): `1 + Byparken`, `1 + Bergen lufthavn Flesland`,
 * `2 + Kaigaten`, `2 + Fyllingsdalen terminal`.
 *
 * Hub lock: **Bergen busstasjon** (docs/bergen-d1/hazard-pack.md H6 — a correction from the
 * oracle report's original Byparken pick: Line 2 never calls at Byparken). Unlike Oslo's
 * Stortinget or Vienna's Karlsplatz, Bergen busstasjon is a plain through-station on both
 * lines — neither line terminates or originates there, so there is no self-referential-hub
 * case to guard the way Oslo's R21/Jernbanetorget needed. Byparken and Kaigaten remain valid,
 * real, line-specific direction-chip termini (each is a true single-direction terminus for its
 * own line only) — never downgraded, just never the hub string.
 *
 * Self-terminus guard: at Byparken (line 1's own terminus, line 2 does not call there) only
 * `1 + Bergen lufthavn Flesland` is ever synthesized — `1 + Byparken` would be the train
 * arriving, not a valid outbound direction, so it must never appear at Byparken itself. Same
 * shape at Kaigaten for `2 + Fyllingsdalen terminal` (line 2's own terminus).
 *
 * NSR printed-name variants (hazard-pack.md H2): Entur's live destinationDisplay/quay/
 * stopPlace.name may return "Sletten senter" (not "Sletten") or "Bergen lufthavn" (not
 * "Bergen lufthavn Flesland") — these are carried as `aliases` in stations.json so the D1/PDF
 * published name is what riders see on the board, never the NSR form.
 *
 * @see docs/bergen-d1/direction-model-memo.md
 * @see docs/bergen-d1/hazard-pack.md
 * @see docs/bergen-d1/published-network.json
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const BERGEN_HUB = "Bergen busstasjon";
/** Europe/Oslo — Norway has exactly one IANA zone (hazard-pack.md H7 corrects the oracle
 * report's non-existent "Europe/Bergen" string). HAS DST. */
export const BERGEN_TIME_ZONE = "Europe/Oslo";

/**
 * printedInnerCityNames.doNotUse (published-network.json) — marketing/generic tokens plus the
 * corrected-away oracle-report spellings ("Bystasjonen", "Danmarksplass") plus Oslo's own hub
 * string (never valid here) — none of these may ever resolve as a real Bergen station.
 * "Bergen stasjon" (the separate, out-of-scope Vy railway station, NSR:StopPlace:59983) is
 * added here too — H1's doNotGroup pair, confirmed-distinct from every Bybanen stop-place.
 */
const FORBIDDEN_STATION_NAMES = new Set(
  [
    "Bergen",
    "Bergen sentrum",
    "Bergen S",
    "Bergen stasjon",
    "City",
    "Sentrum",
    "CBD",
    "to City",
    "Jernbanetorget",
    "Bystasjonen",
    "Danmarksplass",
  ].map((value) => value.trim().toLowerCase())
);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

/** Blocks station *resolution* — only strings that are never a real catalog station. */
export function isForbiddenCollapseName(value) {
  return FORBIDDEN_STATION_NAMES.has(String(value || "").trim().toLowerCase());
}

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias/NSR-printed-name variant to the D1 published name, or
 * null if unrecognized — never fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Entur `destinationDisplay.frontText` may append a via-stop for a fork leg (same shape as
 * Oslo's Journey Planner v3 responses) — Bergen's two lines have no forks (hazard-pack.md H5),
 * but this is kept defensively so a future timetable variant doesn't leak a "via" suffix into
 * a direction chip.
 */
export function stripViaSuffix(headsign) {
  return String(headsign || "")
    .split(/\s+via\s+/i)[0]
    .trim();
}

/** Passenger-facing line label — bare line number, per direction-model-memo.md §3 ("{1,2} +
 * official Skyss terminus", matching every prior pack's convention). */
export const LINE_LABELS = {
  1: "1",
  2: "2",
};

/** Printed termini per line (published-network.json lines[].termini). Bergen busstasjon never
 * appears here for either line — it is the hub stop string, never a direction token. */
export const LINE_TERMINI = {
  1: ["Byparken", "Bergen lufthavn Flesland"],
  2: ["Kaigaten", "Fyllingsdalen terminal"],
};

/**
 * Resolve a raw headsign/destination string to one of `lineId`'s known printed termini, or
 * null. Tries an exact catalog/alias match first (this also folds an NSR-printed-name variant
 * like "Bergen lufthavn" back to "Bergen lufthavn Flesland"), then a conservative substring
 * match against just that line's small termini set. Deliberately narrow — only ever returns a
 * name from LINE_TERMINI, never an arbitrary headsign, so a hub string ("Bergen busstasjon",
 * "City", "Sentrum") can never leak into a direction chip.
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
 * "Line + terminus" per direction-model-memo.md recommendation A. Falls back to the bare line
 * label when the destination can't be resolved to a known terminus for that line — this is
 * what guarantees "Bergen busstasjon"/"City"/"Sentrum" never appear as a direction, without a
 * separate forbidden-token check on the label output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? String(lineId);
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

/**
 * A trip whose resolved terminus IS the station being viewed is an arrival, not a departure —
 * never a boardable direction from here (same rule as Dublin's isTerminatingAtStation). This is
 * the guard direction-model-memo.md calls out explicitly for Byparken/Kaigaten: `1 + Byparken`
 * must never be synthesized at Byparken itself, nor `2 + Kaigaten` at Kaigaten itself.
 */
export function isTerminatingAtStation(destination, stationName) {
  const canonicalDestination = canonicalStationName(destination) ?? destination;
  const canonicalStation = canonicalStationName(stationName) ?? stationName;
  return foldKey(canonicalDestination) === foldKey(canonicalStation);
}

/**
 * All direction chips a station genuinely offers, derived from the static line/termini tables
 * (no live call needed to enumerate chips) — used by the dogfood harness and by
 * live-city-api.js's directionsFor dispatch. Applies the same self-terminus skip as the live
 * board pipeline (isTerminatingAtStation) so a terminus never lists itself as a destination.
 */
export function marketingLabelsForStation(station) {
  const stationCanonical = canonicalStationName(station);
  if (!stationCanonical) {
    return [];
  }
  const entry = (stationCatalog.stations ?? []).find((s) => s.name === stationCanonical);
  if (!entry) {
    return [];
  }
  const labels = [];
  const seen = new Set();
  for (const lineId of entry.lines ?? []) {
    for (const terminus of LINE_TERMINI[lineId] ?? []) {
      if (isTerminatingAtStation(terminus, stationCanonical)) {
        continue;
      }
      const label = mapLineTerminusDestination(terminus, lineId);
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
 * Board trips arrive from the adapter already in chip form (`1 + Byparken`) via
 * mapLineTerminusDestination. Accept either the remapped chip or a raw Entur frontText + line
 * code (same contract as Oslo's tripMatchesMarketingChip).
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  const line =
    typeof tripOrDest === "object" ? tripOrDest?.routeShortName ?? tripOrDest?.line ?? "" : "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapLineTerminusDestination(dest, line)) === foldKey(chip);
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}
