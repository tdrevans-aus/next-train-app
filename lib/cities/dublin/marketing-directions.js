/**
 * Dublin (Luas Red + Green) — hub lock, doNotGroup guards, the "line +
 * terminus" direction model recommended by docs/dublin-d1/direction-model-
 * memo.md (§3 recommendation A: `Red + Tallaght`, `Red + Saggart`,
 * `Green + Broombridge`, `Green + Brides Glen`), and the Green Line
 * city-centre loop's direction-exclusive stop guard.
 *
 * Hub lock: Abbey Street (Red trunk only, between Jervis and Busáras) —
 * never a direction token. The Green interchange (Marlborough /
 * O'Connell - GPO / O'Connell Upper) is a ~200 m walk, not a shared
 * platform — Abbey Street must never show a Green chip.
 *
 * Red forks at Belgard into two branches sharing one colour — Tallaght and
 * Saggart are only distinguishable by printed terminus, there is no line
 * number to fall back on (docs/dublin-d1/hazard-pack.md H4).
 *
 * Green's Parnell<->Trinity city-centre loop is direction-exclusive, not a
 * branch: O'Connell - GPO and O'Connell Upper are northbound-only (towards
 * Broombridge); Marlborough is southbound-only (towards Brides Glen) — see
 * hazard-pack.md H4a. isDirectionAllowedAtStop() is the defensive guard so a
 * data anomaly (an RT feed somehow producing the "wrong" direction at one of
 * these three stops) is dropped rather than silently shown as a phantom
 * platform/direction that never runs.
 *
 * @see docs/dublin-d1/direction-model-memo.md
 * @see docs/dublin-d1/hazard-pack.md
 * @see docs/dublin-d1/published-network.json
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const DUBLIN_HUB = "Abbey Street";
/** Europe/Dublin — do NOT hand-roll a fixed-offset/"no DST" rule (hazard-pack.md H7); IANA
 * tzdata handles the real, current transition rule for Ireland. */
export const DUBLIN_TIME_ZONE = "Europe/Dublin";

/** Marketing/hub tokens that must never resolve as a real Dublin/Luas station — invented city
 * ids (dublin is the only valid one — never dub/ie), plus other cities' hub strings, plus
 * generic "City"/"Centre" tokens (published-network.json hubLock.doNotUse). */
const FORBIDDEN_STATION_TOKENS = [
  "City",
  "Centre",
  "Downtown",
  "CBD",
  "Dublin",
  "dub",
  "ie",
  "Connolly Interchange",
  "Metro Center",
  "Clark/Lake",
  "Arts-Loi",
  "Kunst-Wet",
  "T-Centralen",
  "Waitematā Station",
  "Park Street",
];

/** Real, separately-catalogued Green stops that must never stand in for the Abbey Street hub —
 * Abbey Street is Red-trunk only, the Green interchange is a walk, not a shared platform
 * (hazard-pack.md H1/H6). Connolly (DART interchange, Red only, no Green access) is also not
 * the hub — hazard-pack.md explicitly rejects it in favour of Abbey Street. */
const HUB_PROXY_FORBIDDEN = [
  "Marlborough",
  "O'Connell - GPO",
  "O'Connell Upper",
  "Connolly",
  "Busáras",
  "O'Connell Bridge",
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

/** True when `name` is a real Green-cluster/Connolly string that must not be folded into the
 * Abbey Street hub identity. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(DUBLIN_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/** Passenger-facing line label — bare colour word, per direction-model-memo.md §3 rec 3 (keep
 * "Red"/"Green" as the single line id per colour; Luas has no printed sub-brand for the two Red
 * branches). */
export const LINE_LABELS = {
  red: "Red",
  green: "Green",
};

/** Far printed termini per line (published-network.json lines[].termini). Abbey Street never
 * appears here for either line — it is the hub stop string, never a direction token. */
export const LINE_TERMINI = {
  red: ["Tallaght", "Saggart", "The Point"],
  green: ["Broombridge", "Brides Glen"],
};

/**
 * Green Line city-centre loop direction-exclusivity (hazard-pack.md H4a). Maps a catalogued stop
 * name to the only travel direction ("northbound" towards Broombridge, or "southbound" towards
 * Brides Glen) that genuinely calls there. Stops not in this map have no direction restriction.
 */
export const GREEN_LOOP_DIRECTION_ONLY = {
  "O'Connell - GPO": "northbound",
  "O'Connell Upper": "northbound",
  Marlborough: "southbound",
};

/** "northbound" (Broombridge-bound) or "southbound" (Brides Glen-bound) for a Green trip whose
 * resolved terminus is known; null when the terminus can't be classified (never guesses). */
export function greenTravelDirection(terminus) {
  if (terminus === "Broombridge") {
    return "northbound";
  }
  if (terminus === "Brides Glen") {
    return "southbound";
  }
  return null;
}

/**
 * Defensive guard for the Green Line loop: false only when `stationName` is one of the three
 * direction-exclusive stops AND the trip's classified travel direction is the wrong one for that
 * stop. Every other station/trip combination is allowed (true) — this never restricts Red, never
 * restricts Trinity/Parnell (the loop's two merge points, both directions valid), and never
 * restricts a Green trip whose direction couldn't be classified (falls open rather than dropping
 * a real trip on an unresolved headsign — see resolveTerminus below for why that's rare).
 */
export function isDirectionAllowedAtStop(stationName, lineId, terminus) {
  if (lineId !== "green") {
    return true;
  }
  const required = GREEN_LOOP_DIRECTION_ONLY[stationName];
  if (!required) {
    return true;
  }
  const actual = greenTravelDirection(terminus);
  if (!actual) {
    // Unresolved terminus at a direction-exclusive stop — allow it through rather than silently
    // dropping a real trip on a headsign this pack's small termini list didn't recognise; the
    // bare line label ("Green", no terminus) still surfaces to the rider.
    return true;
  }
  return actual === required;
}

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias to the D1 printed (map) name, or null if unrecognized —
 * never fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Resolve a raw headsign/destination string to one of `lineId`'s known printed termini, or null.
 * Tries an exact catalog/alias match first, then a conservative substring match against just
 * that line's small termini set — gtfsRouteIdsIfKnown/exact NTA headsign strings are UNVERIFIED
 * against a live payload (published-network.json note; confirm at D2/flip). Deliberately narrow
 * — only ever returns a name from LINE_TERMINI, never an arbitrary headsign, so a hub string
 * ("Abbey Street", "City", "Centre") can never leak into a direction chip.
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
 * "Line + terminus" per direction-model-memo.md (recommendation A). Falls back to the bare line
 * label when the destination can't be resolved to a known terminus for that line — this is what
 * guarantees "Abbey Street"/"City"/"Centre" (hub strings, hazard-pack.md H6) never appear as a
 * direction, without needing a separate forbidden-token check on the label output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

/**
 * A trip whose resolved terminus IS the station being viewed is an arrival, not a departure —
 * never a boardable direction from here (docs/jim-brief-melbourne-direction-labels-perth-style.md
 * item 3, same rule applied here).
 */
export function isTerminatingAtStation(destination, stationName) {
  const canonicalDestination = canonicalStationName(destination) ?? destination;
  const canonicalStation = canonicalStationName(stationName) ?? stationName;
  return foldKey(canonicalDestination) === foldKey(canonicalStation);
}

/**
 * Classify a route's colour (Red/Green) from GTFS route_short_name/route_long_name/route_color.
 * Luas has no printed route number (hazard-pack.md H2) — the NTA static feed's actual route_id
 * scheme is UNVERIFIED against a live payload (published-network.json gtfsRouteIdsIfKnown is
 * deliberately empty), so this matches on the colour word itself plus the two known hex swatches
 * from the official map (#E2231A Red, #39B54A Green) as a fallback. Returns null (never guesses)
 * when neither signal matches, so an unrecognised route is simply excluded from the board rather
 * than mis-coloured.
 */
export function classifyLuasLineId({ routeShortName, routeLongName, routeColor }) {
  const short = foldKey(routeShortName);
  const long = foldKey(routeLongName);
  if (/\bred\b/.test(short) || /\bred\b/.test(long)) {
    return "red";
  }
  if (/\bgreen\b/.test(short) || /\bgreen\b/.test(long)) {
    return "green";
  }
  const colour = String(routeColor || "").trim().toUpperCase().replace(/^#/, "");
  if (colour === "E2231A") {
    return "red";
  }
  if (colour === "39B54A") {
    return "green";
  }
  return null;
}
