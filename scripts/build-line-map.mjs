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
  const rows = [];
  for (const [stopId, times] of staticData.stopTimesByStopId) {
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
    const { tripId, stations } = longestTripPattern(staticData, trips);
    if (!stations.length) {
      continue;
    }

    const sampleRoute = routes[0];
    lines.push({
      id: slugify(shortName),
      name: sampleRoute.route_long_name || shortName,
      routeShortName: shortName,
      tLine: tLineByRoute.get(shortName) ?? null,
      termini: [stations[0], stations[stations.length - 1]],
      stations,
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

function buildStationCatalog(staticData, config, published) {
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
    railOnly: true,
    timeZone: config.timeZone,
    sourceUrl: config.fixtureDir,
  });

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
    source: `GTFS fixture qa/fixtures/brisbane/gtfs (generated ${new Date().toISOString().slice(0, 10)})`,
    publishedOracle: published.source,
    notes: [
      "Generated from rail-only GTFS fixture — regenerate with scripts/build-line-map.mjs.",
      "D2 review (Luke): do not accept any proposedShortTurnGroups. §3 is line+terminus; do not collapse opposite through-run ends.",
      "doNotGroup: accepted Caboolture–Nambour, Caboolture–Gympie North, Doomben–Eagle Junction, Northgate–Shorncliffe. Rejected opposite T1 ends / spine.",
      "H4 doNotGroup: Springfield Central–Ipswich (Darra); Beenleigh–Cleveland and Varsity Lakes–Beenleigh (Boggo Road); Airport vs Shorncliffe / Kippa-Ring / Doomben (Eagle Junction); Kippa-Ring–Caboolture (Petrie).",
      "Exhibition is suppressed (H3 event-only). D5 direction-label assertions still held.",
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
