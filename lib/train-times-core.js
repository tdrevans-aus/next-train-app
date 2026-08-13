export const DEFAULT_LEAVE_BEFORE_MINUTES = 10;
export const DEFAULT_REFRESH_SECONDS = 30;
export const DEFAULT_TIME_ZONE = "Australia/Perth";

const DESTINATION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
  "Cockburn Central": "Cockburn",
  "Cockburn Central Stn": "Cockburn",
};

const LINE_DESTINATION_GROUPS = {
  Yanchep: ["Yanchep", "Whitfords", "Clarkson", "Butler"],
  Mandurah: ["Mandurah", "Cockburn"],
  Fremantle: ["Fremantle", "Claremont"],
};

function applyDestinationAliases(destination) {
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

export function normalizeDestination(destination) {
  if (!destination) {
    return destination;
  }

  const aliased = applyDestinationAliases(destination);
  for (const [canonical, members] of Object.entries(LINE_DESTINATION_GROUPS)) {
    if (members.some((member) => member.toLowerCase() === aliased.toLowerCase())) {
      return canonical;
    }
  }

  return aliased;
}

function destinationMatchesFilter(tripDestination, filterDestination) {
  const trip = normalizeDestination(tripDestination);
  const filter = normalizeDestination(filterDestination);
  if (trip.toLowerCase() === filter.toLowerCase()) {
    return true;
  }

  for (const members of Object.values(LINE_DESTINATION_GROUPS)) {
    const memberSet = new Set(members.map((member) => member.toLowerCase()));
    if (memberSet.has(trip.toLowerCase()) && memberSet.has(filter.toLowerCase())) {
      return true;
    }
  }

  return false;
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

export function parsePerthIsoDateTime(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}${PERTH_OFFSET}`);
}

/** Live board LastUpdate — always interpret bare ISO timestamps as Perth local. */
export function parseLiveBoardTimestamp(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("/")) {
    return parsePerthDateTime(trimmed);
  }
  return parsePerthIsoDateTime(trimmed);
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

export function providerTripToInternal(trip) {
  const scheduledDeparture = new Date(trip.scheduledDeparture);
  const liveDeparture = new Date(trip.liveDeparture);
  const internal = {
    scheduledDeparture,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    liveDeparture,
    displayTime: trip.displayTime,
    platform: trip.platform ?? "",
    destination: trip.destination,
    cars: trip.cars,
  };
  return enrichTripTiming(internal);
}

export function pickUpcomingTrips(trips, destination, now = new Date()) {
  return trips
    .filter((trip) => destinationMatchesFilter(trip.destination, destination))
    .filter((trip) => trip.liveDeparture > now)
    .sort((a, b) => a.liveDeparture - b.liveDeparture);
}

export function pickUpcomingProviderTrips(trips, destination, now = new Date()) {
  const internal = trips.map(providerTripToInternal);
  return pickUpcomingTrips(internal, destination, now);
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
  timeZone = DEFAULT_TIME_ZONE,
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
          timeZone,
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
