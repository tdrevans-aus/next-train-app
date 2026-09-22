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
 * Line BRT, bus, ferry are excluded route_ids/route_types). Commuter Rail route_ids are a
 * separate table (COMMUTER_RAIL_ROUTES, below) — board-eligibility `in` per
 * docs/boston-d1/oracle-clash-report.md Board eligibility section (20 Sep 2026), not part of
 * this subway/rapid-transit line-id map.
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

/**
 * MBTA Commuter Rail (route_type 2) — board-eligibility `in` (walk-up on-board/kiosk
 * ticketing, no check-in barrier) at the five in-catalog stations it calls, per
 * docs/boston-d1/oracle-clash-report.md Board eligibility section: South Station, North
 * Station, Forest Hills, Braintree, JFK/UMass. Not a mode cut like Silver Line/ferry
 * (out-mode) or Amtrak (out-reservation) — Commuter Rail is genuinely walk-up boardable.
 *
 * `stations` names which of the five in-catalog stops each route calls, confirmed live
 * against api-v3.mbta.com/routes?filter[stop]=<place-id>&filter[type]=2 on 20 Sep 2026 (not
 * assumed from the D1 map, which excluded Commuter Rail entirely). `termini` is each route's
 * two direction_destinations (outbound, inbound) verbatim from api-v3.mbta.com/routes — used
 * instead of trusting raw trip headsigns, so a direction chip can only ever be one of a
 * route's two known printed ends (same never-fabricate posture as LINE_TERMINI above).
 *
 * CR-Foxboro ("Foxboro Event Service") is deliberately excluded — fare_class "Special",
 * game-day-only service, not the standard walk-up Commuter Rail product; not named in the
 * oracle report's Board eligibility table.
 */
export const COMMUTER_RAIL_ROUTES = {
  "CR-Fairmount": {
    longName: "Fairmount Line",
    stations: ["South Station"],
    termini: ["Fairmount", "South Station"],
  },
  "CR-NewBedford": {
    longName: "Fall River/New Bedford Line",
    stations: ["South Station", "Braintree", "JFK/UMass"],
    termini: ["Fall River or New Bedford", "South Station"],
  },
  "CR-Fitchburg": {
    longName: "Fitchburg Line",
    stations: ["North Station"],
    termini: ["Wachusett", "North Station"],
  },
  "CR-Worcester": {
    longName: "Framingham/Worcester Line",
    stations: ["South Station"],
    termini: ["Worcester", "South Station"],
  },
  "CR-Franklin": {
    longName: "Franklin/Foxboro Line",
    stations: ["South Station", "Forest Hills"],
    termini: ["Forge Park/495 or Foxboro", "South Station"],
  },
  "CR-Greenbush": {
    longName: "Greenbush Line",
    stations: ["South Station", "Braintree", "JFK/UMass"],
    termini: ["Greenbush", "South Station"],
  },
  "CR-Haverhill": {
    longName: "Haverhill Line",
    stations: ["North Station"],
    termini: ["Haverhill", "North Station"],
  },
  "CR-Kingston": {
    longName: "Kingston Line",
    stations: ["South Station", "Braintree", "JFK/UMass"],
    termini: ["Kingston", "South Station"],
  },
  "CR-Lowell": {
    longName: "Lowell Line",
    stations: ["North Station"],
    termini: ["Lowell", "North Station"],
  },
  "CR-Needham": {
    longName: "Needham Line",
    stations: ["South Station", "Forest Hills"],
    termini: ["Needham Heights", "South Station"],
  },
  "CR-Newburyport": {
    longName: "Newburyport/Rockport Line",
    stations: ["North Station"],
    termini: ["Newburyport or Rockport", "North Station"],
  },
  "CR-Providence": {
    longName: "Providence/Stoughton Line",
    stations: ["South Station", "Forest Hills"],
    termini: ["Stoughton or Wickford Junction", "South Station"],
  },
};

/** In-catalog stations where Commuter Rail is board-eligible `in` — hub/doNotGroup guards in
 * hazard-pack.md H1 already keep these as separate stop-places from the subway network. */
export const COMMUTER_RAIL_STATIONS = [
  "South Station",
  "North Station",
  "Forest Hills",
  "Braintree",
  "JFK/UMass",
];

export function isCommuterRailStation(stationName) {
  return COMMUTER_RAIL_STATIONS.includes(canonicalStationName(stationName) ?? stationName);
}

/** The two Commuter Rail hubs — every route's inbound direction ends at one of these. */
const COMMUTER_RAIL_HUBS = new Set(["South Station", "North Station"]);

/**
 * Terminus-only, Perth style, extended to Commuter Rail 22 Sep 2026
 * (docs/jim-brief-direction-label-aliases-server-side.md Part 2): the label is just the
 * terminus (e.g. "Greenbush", "Fall River or New Bedford") except where the terminus is South
 * Station or North Station — shared by every route that calls there, so the line name is added
 * there and only there: "South Station (Fairmount Line)". `directionId` (0 or 1, MBTA V3
 * predictions attribute) indexes directly into the route's own two known termini — never
 * derived from a raw trip headsign, so an express variant's unusual headsign text can't leak
 * into the chip. Was "<Line long name> + <terminus>" for every direction before this change —
 * see lib/cities/boston/direction-label-aliases.json for the retired-label server-side aliases.
 */
export function mapCommuterRailDestination(routeId, directionId) {
  const route = COMMUTER_RAIL_ROUTES[routeId];
  if (!route) {
    return null;
  }
  const terminus = route.termini[directionId] ?? route.termini[0];
  return COMMUTER_RAIL_HUBS.has(terminus) ? `${terminus} (${route.longName})` : terminus;
}

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

/**
 * Every line+terminus chip a rider can pick from `station` — subway/rapid-transit lines from
 * LINE_TERMINI, plus Commuter Rail routes from COMMUTER_RAIL_ROUTES at the five board-eligible
 * stations. Excludes any terminus that folds to the station's own canonical name (a train
 * terminating here isn't an outbound direction from here).
 */
export function marketingLabelsForStation(station) {
  const canonical = canonicalStationName(station) ?? station;
  if (isForbiddenCollapseName(canonical)) {
    return [];
  }
  const entry = stationCatalog.stations?.find((s) => s.name === canonical);
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(canonical);

  for (const lineId of entry?.lines ?? []) {
    for (const terminus of LINE_TERMINI[lineId] ?? []) {
      if (foldKey(terminus) === stationKey) {
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

  if (COMMUTER_RAIL_STATIONS.includes(canonical)) {
    for (const [routeId, route] of Object.entries(COMMUTER_RAIL_ROUTES)) {
      if (!route.stations.includes(canonical)) {
        continue;
      }
      for (let directionId = 0; directionId < route.termini.length; directionId += 1) {
        const terminus = route.termini[directionId];
        if (foldKey(terminus) === stationKey) {
          continue;
        }
        const label = mapCommuterRailDestination(routeId, directionId);
        const key = label.toLowerCase();
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        labels.push(label);
      }
    }
  }

  return labels.sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * Boston's board() already remaps every trip's `destination` to its final chip form
 * (mapLineTerminusDestination / mapCommuterRailDestination), so matching a rider-picked chip
 * is a direct fold-compare — no re-derivation needed (unlike Oslo, whose board carries raw
 * Entur frontText).
 */
export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  return foldKey(dest) === foldKey(chip);
}
