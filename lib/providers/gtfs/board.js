/**
 * Merge GTFS static stop_times with GTFS-RT TripUpdates → ProviderTrip-shaped rows.
 */

import { activeServicesForDate, snapshotCoversToday, snapshotCalendarRange } from "./static-cache.js";
import { GtfsSnapshotStaleError } from "./errors.js";
import { recordCityStale, clearCityStale } from "./staleness-registry.js";

/**
 * Runtime staleness detection (docs/jim-brief-gtfs-snapshot-freshness.md,
 * option 5): the join measures itself, rather than trusting the refresh
 * cron ran recently. Below this resolved share, on a large enough sample,
 * trip IDs in the realtime feed have stopped matching the static snapshot's
 * trips — the two have drifted apart.
 */
export const STALE_RESOLVED_SHARE_THRESHOLD = 0.5;
/** Below this many distinct realtime trip IDs, don't judge — too small a sample. */
export const STALE_MIN_JUDGABLE_TRIP_UPDATES = 20;

export const NEAR_HORIZON_MINUTES = 180;
/** When the 3-hour window is empty, look ahead this far (overnight → first morning trains). */
export const EMPTY_BOARD_HORIZON_MINUTES = 18 * 60;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function parseGtfsDepartureTime(departureTime) {
  const [hourRaw, minuteRaw, secondRaw] = departureTime.split(":");
  return {
    hour: Number(hourRaw),
    minute: Number(minuteRaw),
    second: Number(secondRaw ?? 0),
  };
}

function scheduledDepartureDate(serviceDateYmd, departureTime, timeZone) {
  const { hour, minute, second } = parseGtfsDepartureTime(departureTime);
  const dayOffset = Math.floor(hour / 24);
  const hourNorm = hour % 24;
  const y = Number(serviceDateYmd.slice(0, 4));
  const m = Number(serviceDateYmd.slice(4, 6));
  const d = Number(serviceDateYmd.slice(6, 8)) + dayOffset;

  const utcGuess = new Date(Date.UTC(y, m - 1, d, hourNorm, minute, second));
  const offsetMs = tzOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMs);
}

function tzOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second")
  );
  return asUtc - date.getTime();
}

function formatClock(date, timeZone) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

function ymdFromDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, "");
}

function shiftServiceYmd(ymd, dayDelta) {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const shifted = new Date(Date.UTC(y, m - 1, d + dayDelta, 12, 0, 0));
  return `${shifted.getUTCFullYear()}${pad2(shifted.getUTCMonth() + 1)}${pad2(shifted.getUTCDate())}`;
}

function nextServiceYmd(ymd) {
  return shiftServiceYmd(ymd, 1);
}

function previousServiceYmd(ymd) {
  return shiftServiceYmd(ymd, -1);
}

function dateForServiceYmd(ymd) {
  return new Date(
    Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)), 12, 0, 0)
  );
}

function resolveDestination(trip, route) {
  const headsign = String(trip?.trip_headsign || "").trim();
  if (headsign) {
    return headsign;
  }
  const longName = String(route?.route_long_name || "").trim();
  if (longName) {
    return longName;
  }
  return String(route?.route_short_name || "").trim() || "Unknown";
}

function resolveStatus(delayMinutes) {
  if (delayMinutes >= 2) {
    return `${delayMinutes} min late`;
  }
  if (delayMinutes === 1) {
    return "1 min late";
  }
  if (delayMinutes <= -2) {
    return "Estimated";
  }
  return "On Time";
}

function collectTripsForServiceDay({
  stopIds,
  staticData,
  realtimeIndex,
  timeZone,
  now,
  serviceDateYmd,
  activeServices,
  horizonMs,
}) {
  const trips = [];

  for (const stopId of stopIds) {
    const stop = staticData.stopsById.get(stopId);
    const stopTimes = staticData.stopTimesByStopId.get(stopId) ?? [];

    for (const stopTime of stopTimes) {
      const trip = staticData.tripsById.get(stopTime.trip_id);
      if (!trip || !activeServices.has(trip.service_id)) {
        continue;
      }

      if (String(stopTime.pickup_type || "0") === "1") {
        continue;
      }

      if (realtimeIndex.cancelledTrips.has(stopTime.trip_id)) {
        continue;
      }

      const scheduled = scheduledDepartureDate(serviceDateYmd, stopTime.departure_time, timeZone);
      if (scheduled.getTime() <= now.getTime() - 60_000) {
        continue;
      }
      if (scheduled.getTime() > now.getTime() + horizonMs) {
        continue;
      }

      const route = staticData.routesById.get(trip.route_id);
      const rtKey = `${stopTime.trip_id}:${stopId}`;
      const rtStop = realtimeIndex.stopUpdates.get(rtKey);
      const tripDelaySec = realtimeIndex.tripDelaySec.get(stopTime.trip_id);

      let live = scheduled;
      if (rtStop?.departureSec != null) {
        live = new Date(rtStop.departureSec * 1000);
      } else if (rtStop?.delaySec != null) {
        live = new Date(scheduled.getTime() + rtStop.delaySec * 1000);
      } else if (tripDelaySec != null) {
        live = new Date(scheduled.getTime() + tripDelaySec * 1000);
      }

      const delayMinutes = Math.round((live.getTime() - scheduled.getTime()) / 60_000);

      trips.push({
        tripId: stopTime.trip_id,
        stopId,
        liveDeparture: live.toISOString(),
        scheduledDeparture: scheduled.toISOString(),
        displayTime: formatClock(live, timeZone),
        scheduledDisplayTime: formatClock(scheduled, timeZone),
        platform: stop?.platform_code || stop?.stop_code || "",
        destination: resolveDestination(trip, route),
        /** Per-stop_times.txt stop_headsign, when the feed sets one — can override trip_headsign
         * for branch/direction resolution (e.g. Uppsala's Arlanda/Märsta route_id collapse).
         * Empty string when the feed doesn't carry the column; existing callers ignore it. */
        stopHeadsign: String(stopTime.stop_headsign || "").trim(),
        routeShortName: String(route?.route_short_name || "").trim(),
        routeLongName: String(route?.route_long_name || "").trim(),
        /** route_desc — not populated by most feeds; carries product names some agencies file
         * under a route_desc column rather than route_long_name (e.g. Skånetrafiken's
         * Öresundståg/Krösatågen — see lib/providers/malmo.js tripAllowed()). Empty string
         * when the feed doesn't carry the column; existing callers ignore it. */
        routeDesc: String(route?.route_desc || "").trim(),
        status: resolveStatus(delayMinutes),
        cancelled: false,
      });
    }
  }

  return trips;
}

/**
 * When a station's board is empty, find the earliest calendar/calendar_dates
 * service date strictly after today on which any in-scope trip (respecting
 * the same route_type filtering baked into `staticData` and the caller's
 * `filterTrip`, if any) serves one of `stopIds`. Used to distinguish a
 * genuine gap (e.g. a planned Trafikverket bus-replacement closure) from a
 * station with no rail service in the feed at all —
 * docs/jim-brief-malmo-planned-closure-empty-board.md.
 *
 * @param {{
 *   stopIds: string[],
 *   staticData: object,
 *   timeZone: string,
 *   now?: Date,
 *   filterTrip?: (trip: object) => boolean,
 *   maxLookaheadDays?: number,
 * }} params
 * @returns {string|null} `YYYY-MM-DD`, or null when there is no such date
 *   inside the feed's calendar range (including "no trips at this station in
 *   the feed at all").
 */
export function findNextServiceDate({
  stopIds,
  staticData,
  timeZone,
  now = new Date(),
  filterTrip,
  maxLookaheadDays = 400,
}) {
  const stopTimesList = [];
  for (const stopId of stopIds) {
    const stopTimes = staticData.stopTimesByStopId.get(stopId) ?? [];
    for (const stopTime of stopTimes) {
      if (String(stopTime.pickup_type || "0") === "1") {
        continue;
      }
      stopTimesList.push({ stopId, stopTime });
    }
  }
  if (stopTimesList.length === 0) {
    return null;
  }

  const { maxDate } = snapshotCalendarRange(staticData);

  let candidateYmd = ymdFromDate(now, timeZone);
  for (let day = 0; day < maxLookaheadDays; day += 1) {
    candidateYmd = nextServiceYmd(candidateYmd);
    if (maxDate && candidateYmd > maxDate) {
      return null;
    }

    const activeServices = activeServicesForDate(
      staticData,
      dateForServiceYmd(candidateYmd),
      timeZone
    );
    if (activeServices.size === 0) {
      continue;
    }

    for (const { stopId, stopTime } of stopTimesList) {
      const trip = staticData.tripsById.get(stopTime.trip_id);
      if (!trip || !activeServices.has(trip.service_id)) {
        continue;
      }
      const route = staticData.routesById.get(trip.route_id);
      const stop = staticData.stopsById.get(stopId);
      if (typeof filterTrip === "function") {
        const pseudoTrip = {
          tripId: stopTime.trip_id,
          stopId,
          platform: stop?.platform_code || stop?.stop_code || "",
          destination: resolveDestination(trip, route),
          stopHeadsign: String(stopTime.stop_headsign || "").trim(),
          routeShortName: String(route?.route_short_name || "").trim(),
          routeLongName: String(route?.route_long_name || "").trim(),
          routeDesc: String(route?.route_desc || "").trim(),
          cancelled: false,
        };
        if (!filterTrip(pseudoTrip)) {
          continue;
        }
      }
      return `${candidateYmd.slice(0, 4)}-${candidateYmd.slice(4, 6)}-${candidateYmd.slice(6, 8)}`;
    }
  }
  return null;
}

function sortAndDedupe(trips) {
  trips.sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture));
  const deduped = [];
  const seen = new Set();
  for (const trip of trips) {
    const key = `${trip.liveDeparture}:${trip.destination}:${trip.platform}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(trip);
  }
  return deduped;
}

/**
 * GTFS service days run past local midnight. A Friday Night Network trip is
 * filed on Friday's service_id with departure_time 24:10 — 00:10 Saturday —
 * not on Saturday's calendar. Collecting only the calendar date of `now`
 * drops those trips at 00:00, and a live-only board then has nothing left to
 * show. Yesterday's still-future trips are included here; collectTripsForServiceDay
 * already drops anything that has departed or sits outside the horizon, so a
 * daytime board does not grow a copy of last night.
 */
function collectServiceDayAndPrevious({
  shared,
  serviceDateYmd,
  activeServices,
  horizonMs,
  timeZone,
  staticData,
}) {
  const yesterdayYmd = previousServiceYmd(serviceDateYmd);
  const yesterdayServices = activeServicesForDate(
    staticData,
    dateForServiceYmd(yesterdayYmd),
    timeZone
  );
  return [
    ...collectTripsForServiceDay({
      ...shared,
      serviceDateYmd,
      activeServices,
      horizonMs,
    }),
    ...collectTripsForServiceDay({
      ...shared,
      serviceDateYmd: yesterdayYmd,
      activeServices: yesterdayServices,
      horizonMs,
    }),
  ];
}

function collectTodayTomorrowAndPrevious({
  shared,
  serviceDateYmd,
  activeServices,
  horizonMs,
  timeZone,
  staticData,
}) {
  const tomorrowYmd = nextServiceYmd(serviceDateYmd);
  const tomorrowServices = activeServicesForDate(staticData, dateForServiceYmd(tomorrowYmd), timeZone);
  return [
    ...collectServiceDayAndPrevious({
      shared,
      serviceDateYmd,
      activeServices,
      horizonMs,
      timeZone,
      staticData,
    }),
    ...collectTripsForServiceDay({
      ...shared,
      serviceDateYmd: tomorrowYmd,
      activeServices: tomorrowServices,
      horizonMs,
    }),
  ];
}

/**
 * Distinct realtime trip IDs referenced by realtimeIndex vs. how many resolve
 * against the static snapshot's trips.txt. Prefers realtimeIndex.tripIds
 * (indexTripUpdates() sets it directly); falls back to deriving the set from
 * the older map shapes for any caller building a realtimeIndex by hand.
 */
export function resolvedShareForRealtime(realtimeIndex, staticData) {
  let resolvedIds = realtimeIndex?.tripIds;
  if (!(resolvedIds instanceof Set)) {
    resolvedIds = new Set();
    for (const key of realtimeIndex?.tripDelaySec?.keys?.() ?? []) {
      resolvedIds.add(key);
    }
    for (const key of realtimeIndex?.stopUpdates?.keys?.() ?? []) {
      resolvedIds.add(String(key).split(":")[0]);
    }
    for (const id of realtimeIndex?.cancelledTrips ?? []) {
      resolvedIds.add(id);
    }
  }

  // rawTripIds (set by realtime.js's indexTripUpdates) is the true
  // denominator — some adapters' resolveTripId already drops anything not
  // found in the static snapshot, which would otherwise make `tripIds`
  // trivially 100%-resolved. Fall back to resolvedIds when a caller built
  // realtimeIndex by hand without that field.
  const totalIds = realtimeIndex?.rawTripIds instanceof Set ? realtimeIndex.rawTripIds : resolvedIds;
  const total = totalIds.size;
  if (total === 0) {
    return { total: 0, resolved: 0, share: null, judgable: false };
  }
  let resolved = 0;
  for (const tripId of resolvedIds) {
    if (staticData?.tripsById?.has(tripId)) {
      resolved += 1;
    }
  }
  return {
    total,
    resolved,
    share: resolved / total,
    judgable: total >= STALE_MIN_JUDGABLE_TRIP_UPDATES,
  };
}

/**
 * Runtime staleness detection for the shared static + realtime join
 * (docs/jim-brief-gtfs-snapshot-freshness.md, option 5). Throws
 * GtfsSnapshotStaleError instead of letting a caller build a board from a
 * snapshot that has drifted from reality — "no live times, no board" rather
 * than a silent degradation. When `cityId` is supplied, records/clears the
 * verdict in the shared staleness registry that /api/health reports and the
 * refresh cron consults.
 *
 * @param {{ cityId?: string, staticData: object, realtimeIndex: object, now: Date, timeZone: string }} params
 */
export function checkSnapshotFreshness({
  cityId,
  staticData,
  realtimeIndex,
  now,
  timeZone,
  skipResolvedShareCheck = false,
}) {
  const calendarCheck = snapshotCoversToday(staticData, now, timeZone);
  if (calendarCheck.judgable && !calendarCheck.coversToday) {
    const reason = `calendar coverage ${calendarCheck.minDate ?? "?"}..${calendarCheck.maxDate ?? "?"} does not include today (${calendarCheck.todayYmd})`;
    recordCityStale(cityId, { reason: "calendar", calendarCheck });
    throw new GtfsSnapshotStaleError(cityId, reason);
  }

  // skipResolvedShareCheck: for cities whose realtime feed is a strict
  // superset of what their static snapshot covers by design (Gold Coast's
  // SEQ TripUpdates carries every SEQ mode — bus, ferry, rail — while its
  // snapshot is trimmed to just G:link light rail; Amsterdam/Rotterdam's
  // OVapi feed is nationwide, all Dutch operators, against a
  // GVB/RET-only snapshot). For those, most "unresolved" realtime trip IDs
  // are simply out of scope, not drift — counting them would make the
  // resolved share permanently low and false-positive every board. The
  // calendar check above still applies unconditionally.
  const share = resolvedShareForRealtime(realtimeIndex, staticData);
  if (!skipResolvedShareCheck && share.judgable && share.share < STALE_RESOLVED_SHARE_THRESHOLD) {
    // Zero resolved on a large-enough sample is a materially different signal
    // than "some resolved, share just dipped under threshold": a partial
    // drift can plausibly self-heal on the next refresh, but zero usually
    // means the published static snapshot uses a different trip ID scheme
    // than the realtime feed entirely (e.g. placeholder/test data published
    // to the live path by mistake) — a refresh only fixes that if it
    // publishes *correct* data, not just newer data. See
    // docs/jim-brief-newcastle-stale-snapshot.md.
    const suffix =
      share.resolved === 0
        ? " — zero resolved suggests an ID-scheme mismatch between the realtime feed and the published static snapshot (e.g. wrong/placeholder data), not simple staleness; a refresh only helps if it republishes matching data"
        : "";
    const reason = `only ${share.resolved}/${share.total} realtime trip IDs resolved against the snapshot (< ${Math.round(STALE_RESOLVED_SHARE_THRESHOLD * 100)}%)${suffix}`;
    recordCityStale(cityId, { reason: "resolved-share", share });
    throw new GtfsSnapshotStaleError(cityId, reason);
  }

  clearCityStale(cityId);
  return { calendarCheck, share };
}

/**
 * @param {{
 *   stopIds: string[],
 *   staticData: object,
 *   realtimeIndex: ReturnType<import('./realtime.js').indexTripUpdates>,
 *   timeZone: string,
 *   now?: Date,
 *   horizonMinutes?: number,
 *   cityId?: string,
 *   skipResolvedShareCheck?: boolean,
 * }} params
 */
export function buildBoardForStops({
  stopIds,
  staticData,
  realtimeIndex,
  timeZone,
  now = new Date(),
  horizonMinutes = NEAR_HORIZON_MINUTES,
  cityId,
  skipResolvedShareCheck = false,
}) {
  checkSnapshotFreshness({ cityId, staticData, realtimeIndex, now, timeZone, skipResolvedShareCheck });

  const serviceDateYmd = ymdFromDate(now, timeZone);
  const activeServices = activeServicesForDate(staticData, now, timeZone);
  const shared = {
    stopIds,
    staticData,
    realtimeIndex,
    timeZone,
    now,
  };
  const farHorizonMs =
    Math.max(horizonMinutes, EMPTY_BOARD_HORIZON_MINUTES) * 60 * 1000;
  const lookAheadPastNearWindow = horizonMinutes > NEAR_HORIZON_MINUTES;

  let trips = collectServiceDayAndPrevious({
    shared,
    serviceDateYmd,
    activeServices,
    horizonMs: horizonMinutes * 60 * 1000,
    timeZone,
    staticData,
  });

  if (lookAheadPastNearWindow || trips.length === 0) {
    trips = collectTodayTomorrowAndPrevious({
      shared,
      serviceDateYmd,
      activeServices,
      horizonMs: farHorizonMs,
      timeZone,
      staticData,
    });
  }

  return sortAndDedupe(trips);
}
