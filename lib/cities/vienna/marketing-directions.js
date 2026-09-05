/**
 * Vienna (Wiener Linien U-Bahn) — hub lock, doNotGroup/doNotCollapse guards, and the "line +
 * terminus" direction model recommended by docs/vienna-d1/direction-model-memo.md.
 *
 * Hub lock: Karlsplatz (U1 x U2 x U4) — never a direction token. U1 and U4 are through-stations
 * there; U2 *terminates* there (its own printed southern terminus), which is a different shape
 * from every prior city's hub lock (Brussels' Arts-Loi/Kunst-Wet and Copenhagen's Kongens Nytorv
 * are both pure through-crosses, no line terminates at either) — see direction-model-memo.md
 * section 2. Because of this, U2's LINE_TERMINI deliberately excludes Karlsplatz: the only live
 * outbound U2 direction anywhere is `U2 + Seestadt`. Never invent a "U2 + Karlsplatz" chip.
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
const stationCatalog = JSON.parse(
  readFileSync(join(__dirname, "stations.json"), "utf8")
);

export const VIENNA_HUB = "Karlsplatz";
/** Europe/Vienna HAS DST (CEST/CET) — hazard-pack.md H7. Do not copy Perth/Brisbane no-DST. */
export const VIENNA_TIME_ZONE = "Europe/Vienna";

/**
 * Tokens that must never resolve as a real Vienna station: marketing/invented city ids (Vienna,
 * Wien, City, Zentrum, Innere Stadt, CBD — docs/vienna-d1/published-network.json
 * printedInnerCityNames.doNotUse) plus hub strings printed for OTHER cities in this codebase
 * (Park Street, Kongens Nytorv, T-Centralen, Brunnsparken, Centraal Station, Waitematā Station),
 * matching the doNotUse-cross-check pattern used by lib/cities/boston/marketing-directions.js.
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
  "Park Street",
  "Kongens Nytorv",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
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
 * Printed passenger-facing line code -> our line id. These match
 * docs/vienna-d1/published-network.json's per-line `gtfsRouteIdsIfKnown` exactly (U1, U2, U3,
 * U4, U6) — U5 is excluded (service opens 2030, hazard-pack.md H3).
 */
export const WIENER_LINIEN_ROUTE_ID_TO_LINE = {
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
 * Resolve a raw trip destination/headsign to one of `lineId`'s known printed termini, or null
 * if it doesn't match one. Deliberately narrow — only ever returns a name from LINE_TERMINI,
 * never an arbitrary headsign, so a mislabeled GTFS headsign (or a hub string like
 * "Karlsplatz"/"Vienna"/"Wien"/"City"/"Zentrum") can never leak into a direction chip.
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
 * "Line + terminus" per docs/vienna-d1/direction-model-memo.md sections 1-2. Falls back to the
 * bare line label (no "+ X" suffix) when the headsign can't be resolved to a known terminus for
 * that line — this is what guarantees Karlsplatz (and every doNotUse hub string) never appears
 * as a direction, without needing a separate forbidden-token check on the label output. It is
 * also what makes U2's Karlsplatz-terminating trips render as the bare "U2" label rather than a
 * fabricated "U2 + Karlsplatz" chip, since Karlsplatz is not in LINE_TERMINI.u2.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}
