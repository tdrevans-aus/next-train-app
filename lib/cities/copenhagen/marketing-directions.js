/**
 * Copenhagen direction model — three operators, three conventions.
 * docs/copenhagen-d1/direction-model-memo.md. Do not collapse these into one token scheme —
 * that is exactly the Nordhavn six-vs-five mistake the memo exists to prevent.
 *
 * 1. Metro linear lines (M1, M2, M4): line + terminus ("M1 + Vestamager").
 * 2. Metro M3 (Cityringen): true ring, no linear terminus — clockwise / counter-clockwise.
 *    Wording (English vs Danish "med uret"/"mod uret") is an OPEN QUESTION FOR TIM
 *    (direction-model-memo.md open question 1) — no printed passenger-facing convention was
 *    found in sources. This file defaults to the English words and normalizes the Danish
 *    words to them if the live feed ever prints those instead; unverified against a live
 *    Rejseplanen M3 headsign.
 * 3. S-tog (A, B, Bx, C, E, H, F): line letter + official terminus, scoped to the four
 *    shared stations only.
 * 4. DSB Regional/InterCity/InterCityLyn/Öresundståg: no printed line code — service type +
 *    destination (e.g. "Regionaltog + Ringsted", "Öresundståg + Lund").
 *
 * Kongens Nytorv is the hub lock (Metro-only, all four lines) — never a direction token,
 * same rule as Oslo's Stortinget / Brussels' Arts-Loi.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const COPENHAGEN_HUB = "Kongens Nytorv";
export const COPENHAGEN_TIME_ZONE = "Europe/Copenhagen";

/**
 * Pure marketing/CBD synonyms — never a real Copenhagen Metro station, must never resolve.
 * docs/copenhagen-d1/published-network.json printedInnerCityNames.doNotUse (marketing-token
 * subset only — the four real shared stations in that list stay resolvable; they are only
 * forbidden as a stand-in for the Kongens Nytorv hub, see isForbiddenHubProxy below).
 */
const FORBIDDEN_STATION_NAMES = new Set(
  ["Copenhagen", "København", "City", "Centrum", "CBD", "denmark", "rejseplanen"].map((value) =>
    value.trim().toLowerCase()
  )
);

/**
 * Real stations that must never be used AS the Kongens Nytorv hub identity (they are other
 * buildings / other operator mixes) — docs/copenhagen-d1 hazard-pack.md doNotGroup +
 * printedInnerCityNames.alsoOnSharedApproaches. These stay fully resolvable as their own
 * stations/chips; this list only guards hub *aliasing*, not station resolution.
 */
const FORBIDDEN_HUB_PROXY_NAMES = new Set(
  ["Nørreport", "København H", "Nørrebro", "Nordhavn", "Orientkaj", "Havneholmen", "København S"].map(
    (value) => value.trim().toLowerCase()
  )
);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Blocks station *resolution* — marketing tokens that are never a real metro station. */
export function isForbiddenCollapseName(value) {
  return FORBIDDEN_STATION_NAMES.has(String(value || "").trim().toLowerCase());
}

/** Blocks using a real station name as a stand-in for the Kongens Nytorv hub. */
export function isForbiddenHubProxy(value) {
  return FORBIDDEN_HUB_PROXY_NAMES.has(String(value || "").trim().toLowerCase());
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/copenhagen/line-map.json"), "utf8"));
}

const lineMapCache = loadLineMap();

/** @returns {Map<string, {id:string, termini:string[], shape:string}>} keyed by line number (M1, A, ...) */
function buildLineIndex(published = lineMapCache) {
  const index = new Map();
  for (const line of published.lines ?? []) {
    if (line.number) {
      index.set(line.number, line);
    }
  }
  return index;
}
const lineIndex = buildLineIndex();

/**
 * Resolve a raw GTFS headsign/destination to one of a linear line's two official termini,
 * by fold-substring match. Returns null (never fabricates) when no known terminus matches —
 * callers should fall back to the raw headsign rather than drop the trip, since Rejseplanen
 * headsign format is unverified against a live payload (docs/copenhagen-d1/hazard-pack.md
 * item 5, direction-model-memo.md open question 5).
 * @param {string} rawDestination
 * @param {string} routeShortName e.g. "M1", "A"
 */
export function resolveTerminus(rawDestination, routeShortName) {
  const line = lineIndex.get(String(routeShortName || "").trim().toUpperCase());
  if (!line || !line.termini?.length) {
    return null;
  }
  const needle = foldKey(rawDestination);
  for (const terminus of line.termini) {
    if (foldKey(terminus) === needle || needle.includes(foldKey(terminus))) {
      return terminus;
    }
  }
  return null;
}

const CLOCKWISE_WORDS = /^(clockwise|med uret)$/i;
const COUNTER_CLOCKWISE_WORDS = /^(counter-clockwise|counterclockwise|mod uret)$/i;

/**
 * M3 (Cityringen) has no linear terminus — direction is clockwise/counter-clockwise.
 * Normalizes the Danish words ("med uret"/"mod uret") to the English tokens this app uses
 * elsewhere; passes through the raw string unchanged if it matches neither (open question 1,
 * Tim to confirm final wording; unverified against a live M3 headsign).
 * @param {string} rawDestination
 */
export function mapM3Direction(rawDestination) {
  const raw = String(rawDestination || "").trim();
  if (CLOCKWISE_WORDS.test(raw)) {
    return "Clockwise";
  }
  if (COUNTER_CLOCKWISE_WORDS.test(raw)) {
    return "Counter-clockwise";
  }
  return raw;
}

/**
 * @param {string} rawDestination
 * @param {string} routeShortName
 * @param {"Metro"|"S-tog"} mapGroup
 */
export function mapLineTerminusDestination(rawDestination, routeShortName, mapGroup) {
  const code = String(routeShortName || "").trim().toUpperCase();
  if (mapGroup === "Metro" && code === "M3") {
    return `M3 + ${mapM3Direction(rawDestination)}`;
  }
  const terminus = resolveTerminus(rawDestination, code) ?? String(rawDestination || "").trim();
  return `${code} + ${terminus}`;
}

const INTERCITY_LYN_PATTERN = /inter\s*city\s*lyn|\bicl\b/i;
const INTERCITY_PATTERN = /inter\s*city|\bic\b/i;
const REGIONAL_PATTERN = /regional|regionaltog/i;
const ORESUNDSTAG_PATTERN = /[öo]resundst[åa]g|[øo]resund/i;

/**
 * DSB Regional/InterCity/InterCityLyn/Öresundståg carry no passenger-facing line code —
 * classify the GTFS route_long_name/route_desc into a service-type label for the
 * "<service type> + <destination>" chip. Unverified against a live Rejseplanen payload
 * (docs/copenhagen-d1/hazard-pack.md item 6) — best-effort heuristic, not a confirmed field
 * mapping. Returns null when the text doesn't match any in-scope DSB/Öresundståg pattern
 * (callers should NOT render the trip in that case — this is also how EuroCity/SJ/České
 * dráhy stay excluded even though they may appear in the raw GTFS response for these stops).
 * @param {{ routeLongName?: string, routeDesc?: string }} trip
 * @returns {"Regionaltog"|"InterCity"|"InterCityLyn"|"Öresundståg"|null}
 */
export function classifyDsbService(trip) {
  const text = `${trip?.routeLongName ?? ""} ${trip?.routeDesc ?? ""}`;
  if (ORESUNDSTAG_PATTERN.test(text)) {
    return "Öresundståg";
  }
  if (INTERCITY_LYN_PATTERN.test(text)) {
    return "InterCityLyn";
  }
  if (INTERCITY_PATTERN.test(text)) {
    return "InterCity";
  }
  if (REGIONAL_PATTERN.test(text)) {
    return "Regionaltog";
  }
  return null;
}

/**
 * @param {string} rawDestination
 * @param {"Regionaltog"|"InterCity"|"InterCityLyn"|"Öresundståg"} serviceType
 */
export function mapDsbDestination(rawDestination, serviceType) {
  return `${serviceType} + ${String(rawDestination || "").trim()}`;
}

export { lineIndex };
