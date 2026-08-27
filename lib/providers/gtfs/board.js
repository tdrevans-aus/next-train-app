/**
 * Merge GTFS static stop_times with GTFS-RT TripUpdates → ProviderTrip-shaped rows.
 */

import { activeServicesForDate } from "./static-cache.js";

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

/**
 * @param {{
 *   stopIds: string[],
 *   staticData: object,
 *   realtimeIndex: ReturnType<import('./realtime.js').indexTripUpdates>,
 *   timeZone: string,
 *   now?: Date,
 *   horizonMinutes?: number,
 * }} params
 */
export function buildBoardForStops({
  stopIds,
  staticData,
  realtimeIndex,
  timeZone,
  now = new Date(),
  horizonMinutes = 180,
}) {
  const serviceDateYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");

  const activeServices = activeServicesForDate(staticData, now, timeZone);
  const horizonMs = horizonMinutes * 60 * 1000;
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
      const scheduledDisplayTime = formatClock(scheduled, timeZone);
      const displayTime = formatClock(live, timeZone);

      trips.push({
        tripId: stopTime.trip_id,
        stopId,
        liveDeparture: live.toISOString(),
        scheduledDeparture: scheduled.toISOString(),
        displayTime,
        scheduledDisplayTime,
        platform: stop?.platform_code || stop?.stop_code || "",
        destination: resolveDestination(trip, route),
        routeShortName: String(route?.route_short_name || "").trim(),
        routeLongName: String(route?.route_long_name || "").trim(),
        status: resolveStatus(delayMinutes),
        cancelled: false,
      });
    }
  }

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
