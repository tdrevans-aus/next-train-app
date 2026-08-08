export const DEFAULT_LEAVE_BEFORE_MINUTES = 10;
export const DEFAULT_REFRESH_SECONDS = 30;

const LIVETIMES_URL =
  "https://livetimes.transperth.wa.gov.au/LiveTimes.asmx/GetTimesForStation";

export const PERTH_CLUSTER_STATIONS = ["Perth Underground Stn", "Perth Stn"];

const DESTINATION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
};

export function normalizeDestination(destination) {
  if (!destination) {
    return destination;
  }

  const trimmed = destination.trim();
  if (DESTINATION_ALIASES[trimmed]) {
    return DESTINATION_ALIASES[trimmed];
  }

  const withoutStn = trimmed.replace(/ Stn$/i, "");
  if (DESTINATION_ALIASES[withoutStn]) {
    return DESTINATION_ALIASES[withoutStn];
  }

  return trimmed;
}

const PERTH_OFFSET = "+08:00";

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function parsePerthDateTime(value) {
  const [datePart, timePart] = value.trim().split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second ?? 0)}${PERTH_OFFSET}`
  );
}

function parsePerthIsoDateTime(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}${PERTH_OFFSET}`);
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1].trim() : "";
}

function formatTime24(date) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Australia/Perth",
  });
}

const ON_TIME_TOLERANCE_MINUTES = 1;

function timingOffsetMinutesBetween(scheduledDisplayTime, displayTime) {
  if (!scheduledDisplayTime || !displayTime || scheduledDisplayTime === displayTime) {
    return 0;
  }

  const [scheduledHour, scheduledMinute] = scheduledDisplayTime.split(":").map(Number);
  const [displayHour, displayMinute] = displayTime.split(":").map(Number);
  let diffMinutes =
    displayHour * 60 + displayMinute - (scheduledHour * 60 + scheduledMinute);

  if (diffMinutes < -12 * 60) {
    diffMinutes += 24 * 60;
  } else if (diffMinutes > 12 * 60) {
    diffMinutes -= 24 * 60;
  }

  return diffMinutes;
}

export function resolveTripDisplayStatus(offsetMinutes, apiDisplayDelay = "") {
  if (offsetMinutes >= 2) {
    return `${offsetMinutes} min late`;
  }
  if (offsetMinutes === 1) {
    return "1 min late";
  }
  if (offsetMinutes <= -2) {
    return "Estimated";
  }
  if (Math.abs(offsetMinutes) <= ON_TIME_TOLERANCE_MINUTES) {
    return "On Time";
  }

  const cleaned = String(apiDisplayDelay).replace(/[()]/g, "").trim();
  return cleaned || "On Time";
}

export function enrichTripTiming(trip, apiDisplayDelay = "") {
  const timingOffsetMinutes = timingOffsetMinutesBetween(
    trip.scheduledDisplayTime,
    trip.displayTime
  );

  return {
    ...trip,
    timingOffsetMinutes,
    delayMinutes: Math.max(0, timingOffsetMinutes),
    status: resolveTripDisplayStatus(timingOffsetMinutes, apiDisplayDelay),
  };
}

function combineScheduleDeparture(tripStopSchedule, scheduleTime) {
  const [datePart] = tripStopSchedule.trim().split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = scheduleTime.split(":").map(Number);
  return new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second ?? 0)}${PERTH_OFFSET}`
  );
}

export function parseLiveTimesXml(xml) {
  const trips = [];
  const platformBlocks = xml.match(/<Platform>([\s\S]*?)<\/Platform>/g) ?? [];

  for (const platformBlock of platformBlocks) {
    const platform = extractTag(platformBlock, "Number");
    const tripBlocks = platformBlock.match(/<PlatformTrip>([\s\S]*?)<\/PlatformTrip>/g) ?? [];

    for (const tripBlock of tripBlocks) {
      if (extractTag(tripBlock, "Cancelled") === "True") {
        continue;
      }

      const scheduleText = extractTag(tripBlock, "TripStopSchedule");
      if (!scheduleText) {
        continue;
      }

      const scheduledDeparture = combineScheduleDeparture(scheduleText, extractTag(tripBlock, "Schedule"));
      const actualText = extractTag(tripBlock, "Actual");
      const liveDeparture = actualText ? parsePerthDateTime(actualText) : scheduledDeparture;
      const liveDisplayTime =
        extractTag(tripBlock, "actualDisplayTime24") || formatTime24(liveDeparture);
      const scheduledDisplayTime = formatTime24(scheduledDeparture);
      const displayDelay = extractTag(tripBlock, "DisplayDelayTime");

      trips.push(
        enrichTripTiming(
          {
            scheduledDeparture,
            scheduledDisplayTime,
            liveDeparture,
            displayTime: liveDisplayTime,
            platform,
            destination: normalizeDestination(extractTag(tripBlock, "Destination")),
            cars: extractTag(tripBlock, "Ncar"),
          },
          displayDelay
        )
      );
    }
  }

  return trips;
}

export async function fetchStationTrips(station) {
  const url = `${LIVETIMES_URL}?stationname=${encodeURIComponent(station)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Live times service returned ${response.status}`);
  }

  const xml = await response.text();
  if (xml.includes("xsi:nil=\"true\"") && !xml.includes("<PlatformTrip>")) {
    throw new Error(`Unknown station: ${station}`);
  }

  const stationName = extractTag(xml, "Name") || station;
  const lastUpdate = extractTag(xml, "LastUpdate");
  const trips = parseLiveTimesXml(xml);

  return { stationName, lastUpdate, trips };
}

export function isPerthCluster(station) {
  return PERTH_CLUSTER_STATIONS.includes(station);
}

export async function fetchTripsForStation(station) {
  if (!isPerthCluster(station)) {
    return fetchStationTrips(station);
  }

  const allTrips = [];
  let lastUpdate = null;

  for (const clusterStation of PERTH_CLUSTER_STATIONS) {
    try {
      const result = await fetchStationTrips(clusterStation);
      allTrips.push(...result.trips);
      if (result.lastUpdate) {
        lastUpdate = result.lastUpdate;
      }
    } catch {
      // Some cluster stations may have no live data at quiet times.
    }
  }

  if (allTrips.length === 0) {
    throw new Error(`Unknown station: ${station}`);
  }

  return {
    stationName: "Perth Stn",
    lastUpdate,
    trips: allTrips,
  };
}

export function pickUpcomingTrips(trips, destination, now = new Date()) {
  const normalizedDestination = normalizeDestination(destination);
  return trips
    .filter((trip) => trip.destination === normalizedDestination)
    .filter((trip) => trip.liveDeparture > now)
    .sort((a, b) => a.liveDeparture - b.liveDeparture);
}

export function uniqueDestinations(trips) {
  const seen = new Set();
  const directions = [];

  for (const trip of trips) {
    const direction = normalizeDestination(trip.destination);
    if (!direction) {
      continue;
    }

    const key = direction.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    directions.push(direction);
  }

  return directions.sort();
}

function roundMinutes(ms) {
  return Math.round(ms / 60000);
}

export function getLeavePhase(minutesUntilLeave, minutesUntilArrival) {
  if (minutesUntilArrival <= 0) {
    return "missed";
  }
  if (minutesUntilLeave < 0) {
    return "late";
  }
  if (minutesUntilLeave <= 0) {
    return "now";
  }
  if (minutesUntilLeave <= 2) {
    return "urgent";
  }
  if (minutesUntilLeave <= 5) {
    return "soon";
  }
  return "calm";
}

function buildTripPayload(trip, leaveBeforeMinutes, now) {
  const timing = enrichTripTiming(trip);
  const leaveByMs = timing.liveDeparture.getTime() - leaveBeforeMinutes * 60 * 1000;
  const minutesUntilDeparture = roundMinutes(timing.liveDeparture - now);
  const minutesUntilLeave = roundMinutes(leaveByMs - now);
  const leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilDeparture);
  const isDelayed = timing.timingOffsetMinutes >= 2;
  const departureIso = timing.liveDeparture.toISOString();

  return {
    departure: departureIso,
    arrival: departureIso,
    scheduledDeparture: timing.scheduledDeparture.toISOString(),
    scheduledArrival: timing.scheduledDeparture.toISOString(),
    displayTime: timing.displayTime,
    scheduledDisplayTime: timing.scheduledDisplayTime,
    timingOffsetMinutes: timing.timingOffsetMinutes,
    isDelayed,
    platform: timing.platform,
    status: timing.status,
    destination: timing.destination,
    cars: timing.cars,
    leaveBy: new Date(leaveByMs).toISOString(),
    minutesUntilDeparture,
    minutesUntilArrival: minutesUntilDeparture,
    minutesUntilLeave,
    minutesLate: minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0,
    leavePhase,
  };
}

function slimTripSummary(trip) {
  return {
    displayTime: trip.displayTime,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    platform: trip.platform,
    status: trip.status,
    departure: trip.departure,
    arrival: trip.arrival,
  };
}

export function buildNextTrainResponse({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
  lastUpdated = null,
  upcomingTrips,
}) {
  const skip = Math.max(0, Math.floor(Number(skipTrains) || 0));
  const formatLastUpdated =
    lastUpdated instanceof Date
      ? lastUpdated.toLocaleString("en-AU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Australia/Perth",
        })
      : lastUpdated;

  const upcomingPayloads = upcomingTrips
    .slice(0, 8)
    .map((trip) => buildTripPayload(trip, leaveBeforeMinutes, now));
  const nextPayload = upcomingPayloads[skip] ?? null;

  return {
    station,
    lastUpdated: formatLastUpdated,
    config: {
      station,
      destination,
      destinationLabel,
      leaveBeforeMinutes,
      refreshSeconds,
      skipTrains: skip,
    },
    next: nextPayload,
    following: upcomingPayloads[skip + 1] ? slimTripSummary(upcomingPayloads[skip + 1]) : null,
    upcoming: upcomingPayloads,
  };
}

export async function getNextTrainData({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const { stationName, lastUpdate, trips } = await fetchTripsForStation(station);
  const upcoming = pickUpcomingTrips(trips, destination, now);
  const lastUpdated = lastUpdate ? parsePerthIsoDateTime(lastUpdate) : null;

  return buildNextTrainResponse({
    station: stationName,
    destination,
    destinationLabel,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated,
    upcomingTrips: upcoming,
  });
}
