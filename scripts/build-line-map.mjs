#!/usr/bin/env node
/**
 * D2/D4 — Build GTFS-derived line-map and station catalog for a city.
 *
 * Usage: node scripts/build-line-map.mjs --city=brisbane
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { proposeDirectionGroups } from "../lib/direction-collapse-heuristic.js";
import {
  activeServicesForDate,
  loadGtfsStaticFromDirectory,
} from "../lib/providers/gtfs/static-cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CITY_CONFIG = {
  brisbane: {
    timeZone: "Australia/Brisbane",
    fixtureDir: join(ROOT, "qa/fixtures/brisbane/gtfs"),
    publishedNetworkPath: join(ROOT, "qa/fixtures/brisbane/published-network.json"),
    lineMapPath: join(ROOT, "lib/cities/brisbane/line-map.json"),
    stationsPath: join(ROOT, "lib/cities/brisbane/stations.json"),
    branchedJunctions: [
      "Boggo Road",
      "Caboolture",
      "Darra",
      "Eagle Junction",
      "Northgate",
      "Petrie",
    ],
    suppressedTermini: ["Exhibition"],
    // D2 review (Luke): frozen product overlay. Heuristic proposals are never auto-accepted.
    productReview: {
      shortTurnGroups: {},
      junctionStations: ["Boggo Road", "Darra", "Eagle Junction", "Petrie"],
      doNotGroup: [
        {
          a: "Caboolture",
          b: "Nambour",
          reason: "Accepted nested short-turn (H5) — keep Caboolture vs Nambour distinct on T1",
        },
        {
          a: "Caboolture",
          b: "Gympie North",
          reason: "Accepted nested short-turn (H5) — keep Caboolture vs Gympie North distinct on T1",
        },
        {
          a: "Doomben",
          b: "Eagle Junction",
          reason: "Accepted — weekday T3 is an Eagle Junction–Doomben shuttle, not a through-run",
        },
        {
          a: "Northgate",
          b: "Shorncliffe",
          reason: "Accepted nested short-turn (H5) — keep Northgate vs Shorncliffe distinct on T4",
        },
        {
          a: "Springfield Central",
          b: "Ipswich",
          reason: "H4 branch at Darra (T2 vs T1)",
        },
        {
          a: "Beenleigh",
          b: "Cleveland",
          reason: "H4 branch at Boggo Road (T6 vs T4)",
        },
        {
          a: "Varsity Lakes",
          b: "Beenleigh",
          reason: "H4 branch at Boggo Road (T5 vs T6)",
        },
        {
          a: "Domestic Airport",
          b: "Shorncliffe",
          reason: "H4 branch at Eagle Junction (T5 vs T4)",
        },
        {
          a: "Domestic Airport",
          b: "Kippa-Ring",
          reason: "H4 branch at Eagle Junction (T5 vs T2)",
        },
        {
          a: "Domestic Airport",
          b: "Doomben",
          reason: "H4 branch at Eagle Junction (T5 vs T3)",
        },
        {
          a: "Kippa-Ring",
          b: "Caboolture",
          reason: "H4 branch at Petrie (T2 vs T1)",
        },
      ],
      coverageGaps: [
        "C3-3: D1 T1 elides Petrie–Northgate shared stations (Lawnton–Virginia) and some inner-north stops",
        "C3-T1-rosewood: D1 T1 includes Rosewood branch; mapped T1 GTFS codes stop at Ipswich",
        "C3-T2-petrie: D1 T2 omits Petrie",
        "C3-T3-southbank: weekend Doomben patterns continue to Boggo Road; D1 ends at Roma Street",
        "C3-4: D1 T5 is express-style; GTFS all-stops extras are a pattern variant",
        "C3-T6-moorooka: D1 lists Moorooka; longest T6 GTFS patterns may skip it",
        "H2: many GTFS route codes (NAIP, Exhibition, Rosewood shuttle, city shorts) are not on the published T-line route lists",
      ],
    },
    nameAliases: {
      Central: ["Brisbane Central", "Central Station"],
      "Boggo Road": ["Park Road", "Park Rd"],
      "Domestic Airport": ["Brisbane Airport", "Airport"],
      "Varsity Lakes": ["Gold Coast"],
    },
  },
  sydney: {
    timeZone: "Australia/Sydney",
    fixtureDir: join(ROOT, "qa/fixtures/sydney/gtfs"),
    publishedNetworkPath: join(ROOT, "qa/fixtures/sydney/published-network.json"),
    lineMapPath: join(ROOT, "lib/cities/sydney/line-map.json"),
    stationsPath: join(ROOT, "lib/cities/sydney/stations.json"),
    routeTypes: ["2", "401"],
    catalogByServedStop: true,
    modeSplitNames: ["Central", "Martin Place", "Epping", "Chatswood", "Sydenham"],
    branchedJunctions: [
      "Blacktown",
      "Cabramatta",
      "Glenfield",
      "Granville",
      "Hornsby",
      "Sutherland",
      "Wolli Creek",
    ],
    suppressedTermini: ["Helensburgh"],
    productReview: {
      shortTurnGroups: {},
      junctionStations: ["Blacktown", "Cabramatta", "Granville", "Sutherland", "Wolli Creek"],
      doNotGroup: [
        {
          a: "Cronulla",
          b: "Waterfall",
          reason: "H4 T4 split at Sutherland",
        },
        {
          a: "Domestic Airport",
          b: "Sydenham",
          reason: "H4 T8 Airport vs Sydenham at Wolli Creek",
        },
        {
          a: "Emu Plains",
          b: "Richmond",
          reason: "H4 T1 western fork at Blacktown",
        },
        {
          a: "Leppington",
          b: "Parramatta",
          reason: "H4 T2 two published termini",
        },
        {
          a: "Bankstown",
          b: "Sydenham",
          reason: "H4 T6 leftover rail vs M1 published southern end",
        },
        {
          a: "Berowra",
          b: "Hornsby",
          reason: "H4 T1 vs T9 shared North Shore stations",
        },
      ],
      coverageGaps: [
        "C3-1: T2 and T3 share one official PDF; oracle keeps two line objects",
        "C3-2: T4 PDF/GTFS may include Helensburgh SCO; excluded from published T4 stations",
        "C3-3: M1 printed name Metro North West & Bankstown; published stops end at Sydenham; leftover heavy rail is T6",
        "C3-4: City Circle is a loop, not a terminus",
        "C3-T2/T3/T8-circle: D1 lists Circle stations linearly; longest GTFS patterns are loops",
        "H2: public zip has T/M numbers; gateway schedule/RT still 401 without TFNSW_API_KEY",
        "H7: Australia/Sydney observes DST — do not copy Brisbane no-DST",
      ],
    },
    nameAliases: {
      Central: ["Central Station"],
      "Martin Place": ["Martin Place Station"],
      "International Airport": ["International Airport Station", "Sydney International Airport"],
      "Domestic Airport": ["Domestic Airport Station", "Sydney Domestic Airport"],
    },
    notes: [
      "Generated from T1–T9 + M1 GTFS fixture — regenerate with scripts/build-line-map.mjs --city=sydney.",
      "D2: freeze shortTurnGroups empty (§3 line+terminus; do not collapse opposite through-run ends).",
      "C2: Central, Martin Place, Epping, Chatswood, Sydenham Metro vs Trains must not share stopIds.",
      "Helensburgh is suppressed (SCO on T4 PDF, out of modes v1).",
      "D5 labels: line + terminus (T1 Emu Plains). City Circle is not a terminus.",
    ],
  },
};

function parseArgs(argv) {
  const cityArg = argv.find((arg) => arg.startsWith("--city="));
  const city = cityArg ? cityArg.slice("--city=".length) : "";
  if (!city || !CITY_CONFIG[city]) {
    throw new Error(`Usage: node scripts/build-line-map.mjs --city=${Object.keys(CITY_CONFIG).join("|")}`);
  }
  return { city };
}

function displayStationName(stop) {
  let name = String(stop?.stop_name ?? "").trim();
  name = name.replace(/,\s*platform\s+[\w]+$/i, "");
  name = name.replace(/,\s*stop\s+[\w]+$/i, "");
  name = name.replace(/\s+station$/i, "");
  return name.trim();
}

function indexStopTimesByTrip(staticData) {
  const byTrip = new Map();
  for (const times of staticData.stopTimesByStopId.values()) {
    for (const row of times) {
      const list = byTrip.get(row.trip_id) ?? [];
      list.push(row);
      byTrip.set(row.trip_id, list);
    }
  }
  for (const list of byTrip.values()) {
    list.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  }
  return byTrip;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tripPattern(staticData, tripId) {
  if (staticData.stopTimesByTripId) {
    return staticData.stopTimesByTripId.get(tripId) ?? [];
  }
  const rows = [];
  for (const times of staticData.stopTimesByStopId.values()) {
    for (const row of times) {
      if (row.trip_id === tripId) {
        rows.push(row);
      }
    }
  }
  rows.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  return rows;
}

function stationsForTrip(staticData, tripId) {
  return tripPattern(staticData, tripId)
    .map((row) => staticData.stopsById.get(row.stop_id))
    .filter(Boolean)
    .map(displayStationName);
}

function routesByShortName(staticData) {
  const groups = new Map();
  for (const routeId of staticData.railRouteIds) {
    const route = staticData.routesById.get(routeId);
    if (!route) {
      continue;
    }
    const shortName = route.route_short_name || route.route_id;
    const list = groups.get(shortName) ?? [];
    list.push(route);
    groups.set(shortName, list);
  }
  return groups;
}

function tripsForRouteGroup(staticData, routes) {
  const routeIds = new Set(routes.map((route) => route.route_id));
  return [...staticData.tripsById.values()].filter((trip) => routeIds.has(trip.route_id));
}

function longestTripPattern(staticData, trips) {
  let best = { tripId: null, stations: [] };
  for (const trip of trips) {
    const stations = stationsForTrip(staticData, trip.trip_id);
    if (stations.length > best.stations.length) {
      best = { tripId: trip.trip_id, stations };
    }
  }
  return best;
}

function unionStationsForTrips(staticData, trips) {
  const longest = longestTripPattern(staticData, trips);
  const seen = new Set(longest.stations.map(normalizeKey));
  const extra = [];
  for (const trip of trips) {
    for (const name of stationsForTrip(staticData, trip.trip_id)) {
      const key = normalizeKey(name);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      extra.push(name);
    }
  }
  return {
    tripId: longest.tripId,
    stations: [...longest.stations, ...extra],
    longestStations: longest.stations,
    termini: longest.stations.length
      ? [longest.stations[0], longest.stations[longest.stations.length - 1]]
      : [],
  };
}

function headsignCounts(trips) {
  const counts = {};
  for (const trip of trips) {
    const headsign = String(trip.trip_headsign || "").trim();
    if (!headsign) {
      continue;
    }
    counts[headsign] = (counts[headsign] ?? 0) + 1;
  }
  return counts;
}

function dayTypeDate(timeZone, dayType) {
  const now = new Date();
  const targets = {
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    saturday: ["Sat"],
    sunday: ["Sun"],
  };
  const wanted = new Set(targets[dayType] ?? []);
  for (let i = 0; i < 21; i += 1) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
    if (wanted.has(weekday)) {
      return date;
    }
  }
  return now;
}

function firstLastForTrips(staticData, tripIds, timeZone) {
  const result = {};
  for (const dayType of ["weekday", "saturday", "sunday"]) {
    const active = activeServicesForDate(staticData, dayTypeDate(timeZone, dayType), timeZone);
    const relevant = tripIds.filter((tripId) => {
      const trip = staticData.tripsById.get(tripId);
      return trip && active.has(trip.service_id);
    });
    let first = null;
    let last = null;
    for (const tripId of relevant) {
      const pattern = tripPattern(staticData, tripId);
      const departure = pattern[0]?.departure_time || pattern[0]?.arrival_time;
      const arrival =
        pattern[pattern.length - 1]?.arrival_time ||
        pattern[pattern.length - 1]?.departure_time;
      if (!departure || !arrival) {
        continue;
      }
      if (!first || departure < first) {
        first = departure;
      }
      if (!last || arrival > last) {
        last = arrival;
      }
    }
    result[dayType] = { first, last };
  }
  return result;
}

function loadPublishedNetwork(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function routeToTLine(published) {
  const map = new Map();
  for (const line of published.lines ?? []) {
    for (const code of line.gtfsRouteIdsIfKnown ?? []) {
      map.set(code, line.number || line.id);
    }
  }
  return map;
}

function buildLines(staticData, published) {
  const tLineByRoute = routeToTLine(published);
  const lines = [];

  for (const [shortName, routes] of routesByShortName(staticData)) {
    const trips = tripsForRouteGroup(staticData, routes);
    const { tripId, stations, termini, longestStations } = unionStationsForTrips(staticData, trips);
    if (!stations.length) {
      continue;
    }

    const sampleRoute = routes[0];
    lines.push({
      id: slugify(shortName),
      name: sampleRoute.route_long_name || shortName,
      routeShortName: shortName,
      tLine: tLineByRoute.get(shortName) ?? null,
      termini: termini.length ? termini : [stations[0], stations[stations.length - 1]],
      stations,
      longestStations,
      headsigns: headsignCounts(trips),
      firstLastService: firstLastForTrips(
        staticData,
        trips.map((trip) => trip.trip_id),
        staticData.timeZone
      ),
      sampleTripId: tripId,
    });
  }

  lines.sort((a, b) => a.routeShortName.localeCompare(b.routeShortName));
  return lines;
}

function pairKey(a, b) {
  return [normalizeKey(a), normalizeKey(b)].sort().join("|");
}

function stationIsSuppressed(name, suppressed) {
  const key = normalizeKey(name);
  return suppressed.some((entry) => normalizeKey(entry) === key);
}

function lineTouchesSuppressed(line, suppressed) {
  if ((line.termini ?? []).some((name) => stationIsSuppressed(name, suppressed))) {
    return true;
  }
  return (line.stations ?? []).some((name) => stationIsSuppressed(name, suppressed));
}

function buildProposals(lines, published, branchedJunctions) {
  const proposedShortTurnGroups = {};
  const proposedDoNotGroup = [];
  const seenRejections = new Set();

  for (const publishedLine of published.lines ?? []) {
    const routeCodes = new Set(publishedLine.gtfsRouteIdsIfKnown ?? []);
    const corridorLines = lines.filter((line) => routeCodes.has(line.routeShortName));
    const terminals = [];
    const coOccurrenceByStation = {};

    for (const line of corridorLines) {
      for (const [headsign, count] of Object.entries(line.headsigns ?? {})) {
        if (count > 0) {
          terminals.push(headsign);
        }
      }
      for (const station of line.stations) {
        coOccurrenceByStation[station] = uniquePreserve([
          ...(coOccurrenceByStation[station] ?? []),
          ...Object.keys(line.headsigns ?? {}),
        ]);
      }
    }

    const proposed = proposeDirectionGroups({
      terminals: uniquePreserve(terminals),
      lineStationsOrdered: publishedLine.stations ?? [],
      coOccurrenceByStation,
      branchedJunctions,
    });

    for (const [canonical, members] of Object.entries(proposed.groups)) {
      proposedShortTurnGroups[`${publishedLine.number}:${canonical}`] = members;
    }
    for (const rejected of proposed.rejected) {
      const key = [rejected.a, rejected.b].sort().join("|");
      if (seenRejections.has(key)) {
        continue;
      }
      seenRejections.add(key);
      proposedDoNotGroup.push(rejected);
    }
  }

  return { proposedShortTurnGroups, proposedDoNotGroup };
}

function uniquePreserve(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}

function isRailParentStop(stop, staticData) {
  if (!stop) {
    return false;
  }
  if (String(stop.stop_id).startsWith("place_")) {
    return true;
  }
  if (stop.location_type === "1") {
    return true;
  }
  const hasRailChild = staticData.stops.some(
    (entry) => entry.parent_station === stop.stop_id && staticData.stopTimesByStopId.has(entry.stop_id)
  );
  return hasRailChild;
}

function childStopIds(staticData, parentStopId) {
  const ids = new Set();
  for (const stop of staticData.stops) {
    if (stop.parent_station === parentStopId || stop.stop_id === parentStopId) {
      if (staticData.stopTimesByStopId.has(stop.stop_id)) {
        ids.add(stop.stop_id);
      }
    }
  }
  return [...ids].sort();
}

function shortNamesForStop(staticData, stopId) {
  const shorts = new Set();
  for (const row of staticData.stopTimesByStopId.get(stopId) ?? []) {
    const trip = staticData.tripsById.get(row.trip_id);
    const route = trip ? staticData.routesById.get(trip.route_id) : null;
    const shortName = route?.route_short_name;
    if (shortName) {
      shorts.add(shortName);
    }
  }
  return shorts;
}

function modeForShortNames(shorts) {
  const names = [...shorts];
  const metro = names.some((name) => name === "M1");
  const train = names.some((name) => /^T[1-9]$/.test(name));
  if (metro && !train) {
    return "metro";
  }
  if (train && !metro) {
    return "train";
  }
  if (metro && train) {
    return "mixed";
  }
  return "train";
}

function buildServedStopCatalog(staticData, config) {
  const aliasByCanonical = new Map(Object.entries(config.nameAliases ?? {}));
  const splitNames = new Set((config.modeSplitNames ?? []).map(normalizeKey));
  const groups = new Map();

  for (const [stopId] of staticData.stopTimesByStopId) {
    const stop = staticData.stopsById.get(stopId);
    if (!stop) {
      continue;
    }
    const rawName = displayStationName(stop);
    if (!rawName) {
      continue;
    }
    const shorts = shortNamesForStop(staticData, stopId);
    let mode = modeForShortNames(shorts);
    if (mode === "mixed") {
      mode = [...shorts].includes("M1") ? "metro" : "train";
    }

    let canonicalName = rawName;
    for (const [canonical, aliases] of aliasByCanonical.entries()) {
      if (
        normalizeKey(canonical) === normalizeKey(rawName) ||
        aliases.some((alias) => normalizeKey(alias) === normalizeKey(rawName))
      ) {
        canonicalName = canonical;
        break;
      }
    }

    if (mode === "metro" && splitNames.has(normalizeKey(canonicalName))) {
      canonicalName = `${canonicalName} Metro`;
    }

    const key = `${mode}|${normalizeKey(canonicalName)}`;
    const existing = groups.get(key);
    if (!existing) {
      const aliases = new Set(aliasByCanonical.get(canonicalName) ?? []);
      if (normalizeKey(rawName) !== normalizeKey(canonicalName)) {
        aliases.add(rawName);
      }
      if (canonicalName.endsWith(" Metro")) {
        aliases.add(`${canonicalName.replace(/ Metro$/, "")} (Metro)`);
      }
      groups.set(key, {
        name: canonicalName,
        aliases: [...aliases],
        stopIds: [stopId],
      });
      continue;
    }
    existing.stopIds = uniquePreserve([...existing.stopIds, stopId]);
    if (normalizeKey(rawName) !== normalizeKey(existing.name)) {
      existing.aliases = uniquePreserve([...(existing.aliases ?? []), rawName]);
    }
  }

  return {
    stations: [...groups.values()]
      .map((station) => ({
        ...station,
        aliases: (station.aliases ?? [])
          .filter((alias) => normalizeKey(alias) !== normalizeKey(station.name))
          .sort(),
        stopIds: [...station.stopIds].sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function buildStationCatalog(staticData, config, published) {
  if (config.catalogByServedStop) {
    return buildServedStopCatalog(staticData, config);
  }

  const aliasByCanonical = new Map(Object.entries(config.nameAliases ?? {}));
  const publishedNames = new Set();
  for (const line of published.lines ?? []) {
    for (const station of line.stations ?? []) {
      publishedNames.add(station);
    }
  }

  const parents = staticData.stops.filter((stop) => isRailParentStop(stop, staticData));
  const stations = [];

  for (const parent of parents) {
    const rawName = displayStationName(parent);
    if (!rawName) {
      continue;
    }

    const stopIds = childStopIds(staticData, parent.stop_id);
    if (!stopIds.length) {
      continue;
    }

    let canonicalName = rawName;
    for (const [canonical, aliases] of aliasByCanonical.entries()) {
      if (
        normalizeKey(canonical) === normalizeKey(rawName) ||
        aliases.some((alias) => normalizeKey(alias) === normalizeKey(rawName))
      ) {
        canonicalName = canonical;
        break;
      }
    }

    const aliases = new Set(aliasByCanonical.get(canonicalName) ?? []);
    if (normalizeKey(rawName) !== normalizeKey(canonicalName)) {
      aliases.add(rawName);
    }
    for (const publishedName of publishedNames) {
      if (normalizeKey(publishedName) === normalizeKey(canonicalName)) {
        if (normalizeKey(publishedName) !== normalizeKey(canonicalName)) {
          aliases.add(publishedName);
        }
      }
      if (publishedName === "Brisbane Central" && canonicalName === "Central") {
        aliases.add("Brisbane Central");
      }
    }

    stations.push({
      name: canonicalName,
      aliases: [...aliases]
        .filter((alias) => normalizeKey(alias) !== normalizeKey(canonicalName))
        .sort(),
      stopIds,
    });
  }

  const deduped = new Map();
  for (const station of stations) {
    const key = normalizeKey(station.name);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, station);
      continue;
    }
    existing.stopIds = uniquePreserve([...existing.stopIds, ...station.stopIds]);
    existing.aliases = uniquePreserve([...(existing.aliases ?? []), ...(station.aliases ?? [])]);
  }

  return {
    stations: [...deduped.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function main() {
  const { city } = parseArgs(process.argv.slice(2));
  const config = CITY_CONFIG[city];
  const published = loadPublishedNetwork(config.publishedNetworkPath);

  const staticData = loadGtfsStaticFromDirectory(config.fixtureDir, {
    railOnly: !config.routeTypes,
    routeTypes: config.routeTypes ?? null,
    timeZone: config.timeZone,
    sourceUrl: config.fixtureDir,
  });
  staticData.stopTimesByTripId = indexStopTimesByTrip(staticData);

  const lines = buildLines(staticData, published);
  const suppressed = config.suppressedTermini ?? [];
  const review = config.productReview ?? { shortTurnGroups: {}, doNotGroup: [], junctionStations: [] };
  const proposals = buildProposals(
    lines.filter((line) => !lineTouchesSuppressed(line, suppressed)),
    published,
    config.branchedJunctions
  );
  const acceptedKeys = new Set(review.doNotGroup.map((pair) => pairKey(pair.a, pair.b)));
  const rejectedProposedDoNotGroup = proposals.proposedDoNotGroup.filter(
    (pair) => !acceptedKeys.has(pairKey(pair.a, pair.b))
  );

  const lineMap = {
    city,
    source: `GTFS fixture qa/fixtures/${city}/gtfs (generated ${new Date().toISOString().slice(0, 10)})`,
    publishedOracle: published.source,
    notes: config.notes ?? [
      "Generated from rail-only GTFS fixture — regenerate with scripts/build-line-map.mjs.",
      "D2 review (Luke): do not accept any proposedShortTurnGroups. §3 is line+terminus; do not collapse opposite through-run ends.",
      "doNotGroup: accepted Caboolture–Nambour, Caboolture–Gympie North, Doomben–Eagle Junction, Northgate–Shorncliffe. Rejected opposite T1 ends / spine.",
      "H4 doNotGroup: Springfield Central–Ipswich (Darra); Beenleigh–Cleveland and Varsity Lakes–Beenleigh (Boggo Road); Airport vs Shorncliffe / Kippa-Ring / Doomben (Eagle Junction); Kippa-Ring–Caboolture (Petrie).",
      "Exhibition is suppressed (H3 event-only). D5 labels locked: Central 12 marketing chips (T1 Caboolture/Ipswich; T5 Brisbane Airport).",
      "Station names normalized from GTFS parent stop_name (platform suffix stripped).",
    ],
    shortTurnGroups: review.shortTurnGroups,
    doNotGroup: review.doNotGroup,
    proposedShortTurnGroups: proposals.proposedShortTurnGroups,
    proposedDoNotGroup: proposals.proposedDoNotGroup,
    rejectedProposedDoNotGroup,
    junctionStations: [...review.junctionStations].sort((a, b) => a.localeCompare(b)),
    suppressedTermini: suppressed,
    lines,
    coverageGaps: review.coverageGaps ?? [],
  };

  const catalog = buildStationCatalog(staticData, config, published);

  writeFileSync(config.lineMapPath, `${JSON.stringify(lineMap, null, 2)}\n`);
  writeFileSync(config.stationsPath, `${JSON.stringify(catalog, null, 2)}\n`);

  console.log(`Wrote ${config.lineMapPath} (${lines.length} routes)`);
  console.log(`Wrote ${config.stationsPath} (${catalog.stations.length} stations)`);
}

main();
