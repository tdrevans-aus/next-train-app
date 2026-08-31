/**
 * Helsinki (HKL / HSL) metro direction model — line + terminus.
 *
 * docs/helsinki-d1/direction-model-memo.md, option A (locked): Rautatientori is a
 * through-trunk hub called by both M1 and M2 in both compass directions, not a
 * single-end CBD — inbound/outbound vs "City" is false there (and at Kamppi,
 * Helsingin yliopisto, Itäkeskus). Chips are `${line} + ${official HSL terminus}`
 * (e.g. "M1 + Kivenlahti", "M2 + Mellunmäki"), matching Stockholm's "+" convention
 * (docs/helsinki-d1/direction-model-memo.md open question 1 recommendation).
 *
 * Official HSL termini only: Kivenlahti, Vuosaari (M1); Tapiola, Mellunmäki (M2).
 * Matinkylä is a former west end (2017-2 Dec 2022) and stays a stop, never a chip.
 * Rautatientori is the locked hub stop string, never a direction token.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const HELSINKI_HUB = "Rautatientori";
export const HELSINKI_TIME_ZONE = "Europe/Helsinki";

/**
 * printedInnerCityNames.doNotUse from docs/helsinki-d1/published-network.json is one list
 * doing two jobs there: strings that must never stand in for the Rautatientori hub *and*
 * strings that must never be used as a direction/terminus chip. Kamppi, Helsingin yliopisto
 * and Matinkylä are real boardable metro stations (all three are in stations.json) — they
 * must stay resolvable as stations even though they must never appear as a chip terminus
 * (there is no metro service actually terminating there in v1 except via the official
 * termini). Pasila has no metro at all (hazard-pack.md doNotGroup) and is never in the
 * catalog, so blocking it here is a no-op safety net, not a functional station block.
 */
const FORBIDDEN_STATION_NAMES = new Set(
  [
    "Helsinki",
    "Helsinki Central",
    "Helsingin päärautatieasema",
    "Päärautatieasema",
    "Central Railway Station",
    "City",
    "City Centre",
    "Helsingin keskusta",
    "Helsingfors centrum",
    "CBD",
    "to City",
  ].map((value) => value.trim().toLowerCase())
);

/** Superset of FORBIDDEN_STATION_NAMES — never emit any of these as a direction chip terminus. */
const FORBIDDEN_TERMINUS_TOKENS = new Set(
  [...FORBIDDEN_STATION_NAMES, "kamppi", "helsingin yliopisto", "pasila", "matinkylä"]
);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+metroasema$/i, "")
    .replace(/\s+station$/i, "");
}

/** Blocks station *resolution* — only strings that are never a real HSL metro station. */
export function isForbiddenCollapseName(value) {
  return FORBIDDEN_STATION_NAMES.has(String(value || "").trim().toLowerCase());
}

/** Blocks *direction/terminus chip* text — the full doNotUse list, including real stations. */
export function isForbiddenTerminusToken(value) {
  return FORBIDDEN_TERMINUS_TOKENS.has(String(value || "").trim().toLowerCase());
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/helsinki/line-map.json"), "utf8"));
}

/**
 * HSL metro headsigns append a via-stop for a fork leg, e.g. "Kivenlahti via
 * Tapiola", "Vuosaari via Itäkeskus", "Mellunmäki via Itäkeskus" (confirmed live
 * against Digitransit Routing v2 30 Aug 2026). The chip only wants the terminus.
 */
export function stripViaSuffix(headsign) {
  return String(headsign || "")
    .split(/\s+via\s+/i)[0]
    .trim();
}

/**
 * @param {string} headsign Raw Digitransit `headsign`
 * @param {string} routeShortName M1 or M2
 */
export function mapHelsinkiDestination(headsign, routeShortName) {
  const line = String(routeShortName || "").trim().toUpperCase();
  const terminus = stripViaSuffix(headsign);
  if (!terminus || isForbiddenTerminusToken(terminus)) {
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
  if (isForbiddenCollapseName(station) && stationKey !== foldKey(HELSINKI_HUB)) {
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
      const label = marketingLabel(line.number, terminus);
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }

  return labels.sort((a, b) => a.localeCompare(b, "fi"));
}

/**
 * Board trips arrive from the adapter already in chip form (`M1 + Kivenlahti`)
 * via mapHelsinkiDestination. Accept either the remapped chip or a raw
 * Digitransit headsign + route shortName.
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  const line =
    typeof tripOrDest === "object" ? tripOrDest?.routeShortName ?? tripOrDest?.line ?? "" : "";
  if (foldKey(dest) === foldKey(chip)) {
    return true;
  }
  return foldKey(mapHelsinkiDestination(dest, line)) === foldKey(chip);
}
