/**
 * D6 — Live Sydney network sweep (every catalog station).
 * Anomaly report, not a CI gate. Hits Translink; excluded from qa/run-all.mjs.
 *
 * Usage:
 *   npm run sweep:sydney
 *   node qa/sydney-network-sweep.mjs --time=am-peak --day=weekday
 *   node qa/sydney-network-sweep.mjs --station=Central
 *
 * Commit gate (Tim): run `--time=am-peak --day=weekday` on a real weekday morning
 * before committing. That run stresses Doomben, through-running, and S3.
 * Clean, or the same “one RT past the board” S5 pattern, is enough to commit.
 * City stays planned. Perth `qa/perth-static-directions.mjs` must stay green.
 *
 * Writes qa/reports/sydney-sweep-<timestamp>.json and prints a summary.
 * Requires TFNSW_API_KEY. Gateway feeds 401 without it. City stays planned. H7: Australia/Sydney DST.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  SYDNEY_METRO_RT_URL,
  SYDNEY_METRO_STATIC_URL,
  SYDNEY_TIME_ZONE,
  SYDNEY_TRAINS_RT_URL,
  SYDNEY_TRAINS_STATIC_URL,
  listCatalogStations,
} from "../lib/providers/sydney.js";
import {
  loadGtfsStatic,
  mergeGtfsStaticData,
  activeServicesForDate,
} from "../lib/providers/gtfs/static-cache.js";
import {
  fetchTripUpdates,
  mergeTripUpdateEntities,
  indexTripUpdates,
} from "../lib/providers/gtfs/realtime.js";
import { buildBoardForStops } from "../lib/providers/gtfs/board.js";
import { tfnswAuthHeaders, readTfnswApiKey } from "../lib/providers/gtfs/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const S5_TOLERANCE_SEC = 120;
const HORIZON_MINUTES = 180;

const TIME_WINDOWS = {
  "am-peak": { start: 6 * 60, end: 9 * 60 },
  midday: { start: 9 * 60, end: 15 * 60 },
  "pm-peak": { start: 15 * 60, end: 19 * 60 },
  late: { start: 19 * 60, end: 26 * 60 },
};

const NAME_ALIASES = {
  "central metro": "central metro",
  "sydenham metro": "sydenham metro",
};

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function parseArgs(argv) {
  const out = { time: null, day: null, station: null, limit: null };
  for (const arg of argv) {
    if (arg.startsWith("--time=")) {
      out.time = arg.slice("--time=".length);
    } else if (arg.startsWith("--day=")) {
      out.day = arg.slice("--day=".length);
    } else if (arg.startsWith("--station=")) {
      out.station = arg.slice("--station=".length);
    } else if (arg.startsWith("--limit=")) {
      out.limit = Number(arg.slice("--limit=".length));
    }
  }
  if (out.time && !TIME_WINDOWS[out.time]) {
    throw new Error(`--time must be ${Object.keys(TIME_WINDOWS).join("|")}`);
  }
  if (out.day && !["weekday", "sat", "sun"].includes(out.day)) {
    throw new Error("--day must be weekday|sat|sun");
  }
  return out;
}

function normalizeKey(value) {
  let key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
  return NAME_ALIASES[key] ?? key;
}

function displayName(value) {
  const key = normalizeKey(value);
  if (key === "central") {
    return "Central";
  }
  return String(value || "")
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "")
    .trim();
}

function sydneyParts(date) {
  const dtf = new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const weekday = parts.weekday;
  const dayType = weekday === "Sat" ? "sat" : weekday === "Sun" ? "sun" : "weekday";
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { dayType, minutes, weekday, clock: `${parts.hour}:${parts.minute}` };
}

function gtfsTimeToMinutes(value) {
  if (!value) {
    return null;
  }
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }
  return h * 60 + m;
}

function inWindow(minutes, first, last) {
  if (first == null || last == null) {
    return false;
  }
  if (last >= first) {
    return minutes >= first && minutes <= last;
  }
  return minutes >= first || minutes <= last;
}

function actualTimeBucket(minutes) {
  for (const [name, window] of Object.entries(TIME_WINDOWS)) {
    if (inWindow(minutes, window.start, window.end)) {
      return name;
    }
  }
  return "overnight";
}

function linesServingStation(lineMap, stationKey) {
  const keys = new Set([stationKey, stationKey.replace(/ metro$/, "")]);
  return (lineMap.lines ?? []).filter((line) =>
    (line.stations ?? []).some((name) => keys.has(normalizeKey(name)))
  );
}

function knownDestinationsForStation(lineMap, published, stationKey) {
  const names = new Set();
  for (const line of linesServingStation(lineMap, stationKey)) {
    for (const terminus of line.termini ?? []) {
      names.add(normalizeKey(terminus));
    }
    for (const station of line.stations ?? []) {
      names.add(normalizeKey(station));
    }
    for (const headsign of Object.keys(line.headsigns ?? {})) {
      names.add(normalizeKey(headsign));
    }
  }
  for (const members of Object.values(lineMap.proposedShortTurnGroups ?? {})) {
    for (const member of members ?? []) {
      names.add(normalizeKey(member));
    }
  }
  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some(
      (name) => normalizeKey(name) === stationKey || normalizeKey(name) === stationKey.replace(/ metro$/, "")
    );
    if (!onLine) {
      continue;
    }
    for (const terminus of line.termini ?? []) {
      names.add(normalizeKey(terminus));
    }
  }
  return names;
}

function isThroughStation(published, stationKey) {
  let onAny = false;
  let intermediate = false;
  for (const line of published.lines ?? []) {
    const stations = (line.stations ?? []).map(normalizeKey);
    const keys = new Set([stationKey, stationKey.replace(/ metro$/, "")]);
    if (![...keys].some((key) => stations.includes(key))) {
      continue;
    }
    onAny = true;
    const termini = new Set((line.termini ?? []).map(normalizeKey));
    const atTerminus = [...keys].some((key) => termini.has(key));
    if (!atTerminus) {
      intermediate = true;
    }
  }
  return onAny && intermediate;
}

function destinationMatchesKnown(destKey, known) {
  if (known.has(destKey)) {
    return true;
  }
  for (const name of known) {
    if (destKey.includes(name) || name.includes(destKey)) {
      return true;
    }
  }
  return false;
}

function mapDestToTermini(destKey, terminiKeys) {
  return terminiKeys.filter((key) => destKey.includes(key) || key.includes(destKey));
}

function parseGtfsTimeToDate(serviceDateYmd, departureTime) {
  const [hourRaw, minuteRaw, secondRaw] = String(departureTime).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw ?? 0);
  const dayOffset = Math.floor(hour / 24);
  const hourNorm = hour % 24;
  const y = Number(serviceDateYmd.slice(0, 4));
  const m = Number(serviceDateYmd.slice(4, 6));
  const d = Number(serviceDateYmd.slice(6, 8)) + dayOffset;
  const utcGuess = Date.UTC(y, m - 1, d, hourNorm, minute, second);
  const probe = new Date(utcGuess);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: SYDNEY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(probe);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second")
  );
  return new Date(utcGuess - (asUtc - probe.getTime()));
}

function staticUpcomingByStop({ stopIds, staticData, now, activeServices, cancelledTrips }) {
  const serviceDateYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");
  const horizonMs = HORIZON_MINUTES * 60 * 1000;
  const counts = new Map();
  const dests = new Set();

  for (const stopId of stopIds) {
    let count = 0;
    for (const stopTime of staticData.stopTimesByStopId.get(stopId) ?? []) {
      const trip = staticData.tripsById.get(stopTime.trip_id);
      if (!trip || !activeServices.has(trip.service_id)) {
        continue;
      }
      if (cancelledTrips.has(stopTime.trip_id)) {
        continue;
      }
      const scheduled = parseGtfsTimeToDate(serviceDateYmd, stopTime.departure_time);
      if (scheduled.getTime() <= now.getTime() - 60_000) {
        continue;
      }
      if (scheduled.getTime() > now.getTime() + horizonMs) {
        continue;
      }
      count += 1;
      const route = staticData.routesById.get(trip.route_id);
      const headsign = String(trip.trip_headsign || route?.route_long_name || "").trim();
      if (headsign) {
        dests.add(normalizeKey(headsign));
      }
    }
    counts.set(stopId, count);
  }
  return { counts, dests };
}

function independentRtDepartures(entities, stopIdSet, now) {
  const horizonMs = HORIZON_MINUTES * 60 * 1000;
  const rows = [];
  for (const entity of entities) {
    const update = entity.tripUpdate;
    if (!update?.trip?.tripId) {
      continue;
    }
    if (update.trip.scheduleRelationship === 3) {
      continue;
    }
    for (const stu of update.stopTimeUpdate ?? []) {
      if (!stopIdSet.has(stu.stopId)) {
        continue;
      }
      const departureSec =
        stu.departure?.time != null
          ? Number(stu.departure.time)
          : stu.arrival?.time != null
            ? Number(stu.arrival.time)
            : null;
      if (departureSec == null) {
        continue;
      }
      const liveMs = departureSec * 1000;
      if (liveMs < now.getTime() - 60_000 || liveMs > now.getTime() + horizonMs) {
        continue;
      }
      rows.push({
        tripId: update.trip.tripId,
        stopId: stu.stopId,
        liveMs,
      });
    }
  }
  return rows;
}

function stationInPublishedHours(servingLines, dayType, minutes) {
  const mapDay = dayType === "sat" ? "saturday" : dayType === "sun" ? "sunday" : "weekday";
  for (const line of servingLines) {
    const hours = line.firstLastService?.[mapDay];
    const first = gtfsTimeToMinutes(hours?.first);
    const last = gtfsTimeToMinutes(hours?.last);
    if (inWindow(minutes, first, last)) {
      return true;
    }
  }
  return false;
}

function destHasStaticToday(destKey, staticDests) {
  if (staticDests.has(destKey)) {
    return true;
  }
  for (const name of staticDests) {
    if (destKey.includes(name) || name.includes(destKey)) {
      return true;
    }
  }
  return false;
}

function mainSummary(anomalies) {
  const counts = {};
  for (const row of anomalies) {
    counts[row.check] = (counts[row.check] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const clock = sydneyParts(now);
  const dayType = args.day ?? clock.dayType;
  const timeBucket = args.time ?? actualTimeBucket(clock.minutes);
  const actualBucket = actualTimeBucket(clock.minutes);
  const flagsMatchClock = dayType === clock.dayType && (!args.time || args.time === actualBucket);
  if (args.day || args.time) {
    if (!flagsMatchClock) {
      console.warn(
        `sydney-network-sweep: flags do not match Sydney now (${clock.weekday} ${clock.clock}, ${actualBucket}). ` +
          `Commit gate is a real weekday am-peak run, not a labelled off-hours sweep.`
      );
    }
  }

  const liveGate = assertCityLive("sydney");
  if (!liveGate || liveGate.ok !== true) {
    throw new Error("assertCityLive(sydney) must pass — city is live");
  }

  const published = loadJson("qa/fixtures/sydney/published-network.json");
  const lineMap = loadJson("lib/cities/sydney/line-map.json");
  const suppressed = new Set((lineMap.suppressedTermini ?? []).map(normalizeKey));

  let stations = listCatalogStations();
  if (args.station) {
    const needle = normalizeKey(args.station);
    stations = stations.filter((s) => normalizeKey(s.name) === needle);
    if (stations.length === 0) {
      throw new Error(`Unknown catalog station: ${args.station}`);
    }
  }
  if (args.limit) {
    stations = stations.slice(0, args.limit);
  }

  console.log("sydney-network-sweep: fetching TfNSW Trains + Metro static and TripUpdates…");
  const headers = tfnswAuthHeaders(readTfnswApiKey());
  const trainsStatic = await loadGtfsStatic({
    url: SYDNEY_TRAINS_STATIC_URL,
    railOnly: true,
    timeZone: SYDNEY_TIME_ZONE,
    headers,
  });
  let staticData = trainsStatic;
  try {
    const metroStatic = await loadGtfsStatic({
      url: SYDNEY_METRO_STATIC_URL,
      routeTypes: ["1", "401"],
      timeZone: SYDNEY_TIME_ZONE,
      headers,
    });
    staticData = mergeGtfsStaticData(trainsStatic, metroStatic);
  } catch (err) {
    console.warn(`Sydney Metro static skipped: ${err?.message ?? err}`);
  }
  const trainsRt = await fetchTripUpdates(SYDNEY_TRAINS_RT_URL, { headers });
  let metroRt = { entities: [], fetchedAt: trainsRt.fetchedAt };
  try {
    metroRt = await fetchTripUpdates(SYDNEY_METRO_RT_URL, { headers });
  } catch (err) {
    console.warn(`Sydney Metro realtime skipped: ${err?.message ?? err}`);
  }
  const realtime = mergeTripUpdateEntities([trainsRt, metroRt]);
  const realtimeIndex = indexTripUpdates(realtime.entities);
  const activeServices = activeServicesForDate(staticData, now, SYDNEY_TIME_ZONE);

  const anomalies = [];
  const stationRows = [];

  for (const station of stations) {
    const stationKey = normalizeKey(station.name);
    const stopIds = station.stopIds ?? [];
    const serving = linesServingStation(lineMap, stationKey);
    const known = knownDestinationsForStation(lineMap, published, stationKey);
    const terminiKeys = [
      ...new Set(serving.flatMap((line) => (line.termini ?? []).map(normalizeKey))),
    ];
    const through = isThroughStation(published, stationKey);
    const inHours = stationInPublishedHours(serving, dayType, clock.minutes);
    const skipSuppressed = suppressed.has(stationKey);

    const trips = buildBoardForStops({
      stopIds,
      staticData,
      realtimeIndex,
      timeZone: SYDNEY_TIME_ZONE,
      now,
      horizonMinutes: HORIZON_MINUTES,
    });

    const destinations = [...new Set(trips.map((t) => t.destination))];
    const staticUpcoming = staticUpcomingByStop({
      stopIds,
      staticData,
      now,
      activeServices,
      cancelledTrips: realtimeIndex.cancelledTrips,
    });

    const unknown = destinations.filter((dest) => {
      const destKey = normalizeKey(dest);
      if (destKey === stationKey) {
        return false;
      }
      return !destinationMatchesKnown(destKey, known);
    });
    for (const dest of unknown) {
      anomalies.push({
        check: "S1",
        station: station.name,
        detail: `unknown destination "${dest}"`,
      });
    }

    if (through && trips.length > 0 && terminiKeys.length >= 2) {
      const staticTermini = new Set();
      for (const destKey of staticUpcoming.dests) {
        for (const terminus of mapDestToTermini(destKey, terminiKeys)) {
          staticTermini.add(terminus);
        }
      }
      const matchedTermini = new Set();
      for (const dest of destinations) {
        for (const terminus of mapDestToTermini(normalizeKey(dest), terminiKeys)) {
          matchedTermini.add(terminus);
        }
      }
      if (staticTermini.size >= 2 && matchedTermini.size < 2) {
        anomalies.push({
          check: "S2",
          station: station.name,
          detail: `through station only matched ${matchedTermini.size || 0} terminus direction(s): ${destinations.join("; ") || "—"}`,
        });
      }
    }

    for (const dest of destinations) {
      const destKey = normalizeKey(dest);
      if (!destHasStaticToday(destKey, staticUpcoming.dests)) {
        anomalies.push({
          check: "S3",
          station: station.name,
          detail: `board offers "${dest}" but no matching GTFS headsign is active for this day type (${dayType})`,
        });
      }
    }

    if (!skipSuppressed) {
      const childrenWithStatic = stopIds.filter((id) => (staticUpcoming.counts.get(id) ?? 0) > 0);
      const childrenWithBoard = new Set(trips.map((t) => t.stopId).filter(Boolean));
      const missing = childrenWithStatic.filter((id) => !childrenWithBoard.has(id));
      if (missing.length && childrenWithBoard.size > 0) {
        anomalies.push({
          check: "S4",
          station: station.name,
          detail: `child platforms with static trips but no board rows: ${missing.join(", ")}`,
        });
      }
    }

    const rtRows = independentRtDepartures(realtime.entities, new Set(stopIds), now);
    let s5Mismatches = 0;
    for (const rt of rtRows) {
      const match = trips.some((trip) => {
        const liveMs = new Date(trip.liveDeparture).getTime();
        const close = Math.abs(liveMs - rt.liveMs) <= S5_TOLERANCE_SEC * 1000;
        if (trip.tripId && trip.tripId === rt.tripId) {
          return close || trip.stopId === rt.stopId;
        }
        return trip.stopId === rt.stopId && close;
      });
      if (!match) {
        s5Mismatches += 1;
      }
    }
    if (s5Mismatches > 0) {
      anomalies.push({
        check: "S5",
        station: station.name,
        detail: `${s5Mismatches} independently decoded GTFS-RT stop updates have no board departure within ${S5_TOLERANCE_SEC}s`,
      });
    }

    const staticCount = [...staticUpcoming.counts.values()].reduce((sum, n) => sum + n, 0);
    const windowOk = args.time ? timeBucket === args.time && inHours : inHours;
    if (!skipSuppressed && windowOk && staticCount > 0 && trips.length === 0) {
      anomalies.push({
        check: "S6",
        station: station.name,
        detail: `static has ${staticCount} upcoming stop_times but board is empty (${dayType} ${clock.clock}, window ${timeBucket})`,
      });
    }

    stationRows.push({
      station: station.name,
      tripCount: trips.length,
      destinations,
      through,
      inPublishedHours: inHours,
      childStops: stopIds.length,
    });
  }

  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const reportDir = join(ROOT, "qa", "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `sydney-sweep-${timestamp}.json`);
  const report = {
    generatedAt: now.toISOString(),
    timeZone: SYDNEY_TIME_ZONE,
    dayType,
    requestedDay: args.day,
    actualDayType: clock.dayType,
    time: timeBucket,
    requestedTime: args.time,
    actualClock: clock.clock,
    commitGate: {
      required: "--time=am-peak --day=weekday on a real weekday morning",
      flagsMatchClock,
    },
    cityStatus: liveGate.status,
    stationCount: stations.length,
    rtFetchedAt: realtime.fetchedAt.toISOString(),
    anomalyCounts: mainSummary(anomalies),
    anomalies,
    stations: stationRows,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`sydney-network-sweep: ${stations.length} stations, ${anomalies.length} anomalies`);
  console.log(`  day=${dayType} time=${timeBucket} clock=${clock.clock} ${SYDNEY_TIME_ZONE}`);
  console.log(`  city gate: ${liveGate.status} (planned — expected)`);
  const counts = report.anomalyCounts;
  for (const check of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
    console.log(`  ${check}: ${counts[check] ?? 0}`);
  }
  for (const row of anomalies.slice(0, 40)) {
    console.log(`  - ${row.check} ${row.station}: ${row.detail}`);
  }
  if (anomalies.length > 40) {
    console.log(`  … ${anomalies.length - 40} more (see report)`);
  }
  console.log(`  report: ${reportPath}`);
  if (!flagsMatchClock) {
    console.log("  commit gate: not satisfied (run weekday am-peak on a real Monday–Friday morning)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
