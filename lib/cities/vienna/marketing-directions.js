/**
 * Vienna (Wiener Linien U-Bahn) — hub lock, doNotGroup/doNotCollapse guards, and the "line +
 * terminus" direction model recommended by docs/vienna-d1/direction-model-memo.md.
 *
 * Hub lock: Karlsplatz (U1 x U2 x U4) — never a direction token. U1 and U4 are through-stations
 * there; U2 *terminates* there (its own printed southern terminus), which is a different shape
 * from every prior city's hub lock (Brussels' Arts-Loi/Kunst-Wet and Copenhagen's Kongens Nytorv
 * are both pure through-crosses, no line terminates at either) — see direction-model-memo.md
 * section 2. Because of this, U2's LINE_TERMINI deliberately excludes Karlsplatz: the only live
 * outbound U2 direction anywhere is `U2 + Seestadt`. This is independently confirmed live (not
 * just per the D1 pack): the Karlsplatz catalog entry's RBL list (lib/cities/vienna/stations.json)
 * contains exactly one U2 platform (rbl 4202, "towards": "Seestadt") against two each for U1/U4 —
 * see docs/vienna-d1/jim-handoff.md's appended live-verification section. Never invent a
 * "U2 + Karlsplatz" chip.
 *
 * doNotGroup, per hazard-pack.md H1/H4/H6: the nine two-line interchange stations (Praterstern,
 * Stephansplatz, Volkstheater, Schottenring, Schwedenplatz, Landstraße, Westbahnhof,
 * Längenfeldgasse, Spittelau) are all separate stop-places from Karlsplatz — never folded into
 * the hub identity, even though (unlike Boston/Copenhagen) there is no competing-operator
 * conflation risk here (single operator, single mode in v1 scope).
 *
 * @see docs/vienna-d1/direction-model-memo.md
 * @see docs/vienna-d1/hazard-pack.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const VIENNA_HUB = "Karlsplatz";
/** Europe/Vienna HAS DST (CEST/CET) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const VIENNA_TIME_ZONE = "Europe/Vienna";

/**
 * Tokens that must never resolve as a real Vienna station: marketing/invented city ids (Vienna,
 * Wien, City, Zentrum, Innere Stadt, CBD — docs/vienna-d1/published-network.json
 * printedInnerCityNames.doNotUse) plus hub strings printed for OTHER cities in this codebase
 * (Park Street, Kongens Nytorv, T-Centralen, Brunnsparken, Centraal Station, Waitematā Station,
 * Metro Center, Embarcadero), matching the doNotUse-cross-check pattern used by
 * lib/cities/boston/marketing-directions.js.
 */
const FORBIDDEN_STATION_TOKENS = [
  "Vienna",
  "Wien",
  "City",
  "Zentrum",
  "Innere Stadt",
  "CBD",
  "vienna",
  "at-vienna",
  "wien",
  "Park Street",
  "Kongens Nytorv",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
  "Metro Center",
  "Embarcadero",
];

/**
 * Real, separately-catalogued Vienna interchange stations that must never stand in for the
 * Karlsplatz hub identity, even though each is itself a valid station in the catalog.
 */
const HUB_PROXY_FORBIDDEN = [
  "Praterstern",
  "Stephansplatz",
  "Volkstheater",
  "Schottenring",
  "Schwedenplatz",
  "Landstraße",
  "Westbahnhof",
  "Längenfeldgasse",
  "Spittelau",
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

/** True when `name` is a real Vienna station that must not be folded into the Karlsplatz hub. */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(VIENNA_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/** Passenger-facing line label per docs/vienna-d1/direction-model-memo.md section 1. */
export const LINE_LABELS = {
  u1: "U1",
  u2: "U2",
  u3: "U3",
  u4: "U4",
  u6: "U6",
};

/**
 * Far printed termini per line, docs/vienna-d1/direction-model-memo.md sections 1-2.
 *
 * U2 deliberately lists ONLY Seestadt, not Karlsplatz — Karlsplatz is U2's own printed terminus
 * (the station the board itself sits at when the hub is in view), not a valid outbound
 * destination from anywhere else in the network, and per the memo there is no
 * "U2 + Karlsplatz" chip at Karlsplatz itself (only one live direction there: Seestadt).
 */
export const LINE_TERMINI = {
  u1: ["Leopoldau", "Oberlaa"],
  u2: ["Seestadt"],
  u3: ["Ottakring", "Simmering"],
  u4: ["Heiligenstadt", "Hütteldorf"],
  u6: ["Floridsdorf", "Siebenhirten"],
};

/**
 * Wiener Linien OGD Realtime Monitor's own printed line name ("U1".."U6") -> our line id. These
 * match docs/vienna-d1/published-network.json's per-line `gtfsRouteIdsIfKnown` exactly, and were
 * independently confirmed against the live monitor response's own `lines[].name` field (D2,
 * see docs/vienna-d1/jim-handoff.md) — U5 is excluded (service opens 2030, hazard-pack.md H3;
 * also absent from every RBL resolved against the live feed).
 */
export const WIENER_LINIEN_LINE_NAME_TO_LINE = {
  U1: "u1",
  U2: "u2",
  U3: "u3",
  U4: "u4",
  U6: "u6",
};

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias (e.g. the alphabetical master table's truncated
 * "Kaisermühlen") to the D1 printed name ("Kaisermühlen-VIC"), or null if unrecognized — never
 * fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Resolve a raw "towards" string (the monitor's own `lines[].towards` field) to one of `lineId`'s
 * known printed termini, or null if it doesn't match one. Deliberately narrow — only ever
 * returns a name from LINE_TERMINI, never an arbitrary towards-string, so an unexpected live
 * value (or a hub string like "Karlsplatz"/"Vienna"/"Wien"/"City"/"Zentrum") can never leak into
 * a direction chip.
 */
export function resolveTerminus(towardsOrName, lineId) {
  const termini = LINE_TERMINI[lineId] ?? [];
  const canonical = canonicalStationName(towardsOrName);
  if (canonical && termini.includes(canonical)) {
    return canonical;
  }
  return null;
}

/**
 * "Line + terminus" per docs/vienna-d1/direction-model-memo.md sections 1-2. Falls back to the
 * bare line label (no "+ X" suffix) when the towards-string can't be resolved to a known
 * terminus for that line — this is what guarantees Karlsplatz (and every doNotUse hub string)
 * never appears as a direction, without needing a separate forbidden-token check on the label
 * output. It is also what makes U2's Karlsplatz-terminating trips (there are none live — U2 has
 * no Karlsplatz-bound platform RBL, confirmed D2) render as the bare "U2" label rather than a
 * fabricated "U2 + Karlsplatz" chip, since Karlsplatz is not in LINE_TERMINI.u2.
 */
export function mapLineTerminusDestination(towardsOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(towardsOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Single resolver for both lib/providers/vienna.js and the dogfood module — exact
 * name/alias fold match, never a fabricated station. */
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
  }
  return null;
}

/**
 * Every direction chip a station could plausibly show (dogfood picker only — production boards
 * derive the chip from the live trip itself via mapLineTerminusDestination). Drops the chip
 * whose terminus is the station's own name (U2 at Seestadt would otherwise show "U2 + Seestadt").
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
