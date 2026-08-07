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

export function parsePerthDateTime(value) {
  const [datePart, timePart] = value.trim().split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second ?? 0);
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
  });
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

      const scheduledArrival = parsePerthDateTime(scheduleText);
      const actualText = extractTag(tripBlock, "Actual");
      const liveArrival = actualText ? parsePerthDateTime(actualText) : scheduledArrival;
      const liveDisplayTime = extractTag(tripBlock, "actualDisplayTime24") || formatTime24(liveArrival);
      const scheduledDisplayTime = formatTime24(scheduledArrival);

      const delayMinutes = Number(extractTag(tripBlock, "MinutesDelayTime")) || 0;
      const displayDelay = extractTag(tripBlock, "DisplayDelayTime");
      const status =
        delayMinutes > 0
          ? `${delayMinutes} min delay`
          : displayDelay.replace(/[()]/g, "") || "On Time";

      trips.push({
        scheduledArrival,
        scheduledDisplayTime,
        liveArrival,
        displayTime: liveDisplayTime,
        platform,
        status,
        delayMinutes,
        destination: normalizeDestination(extractTag(tripBlock, "Destination")),
        cars: extractTag(tripBlock, "Ncar"),
      });
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
    .filter((trip) => trip.liveArrival > now)
    .sort((a, b) => a.liveArrival - b.liveArrival);
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

export async function getNextTrainData({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  now = new Date(),
}) {
  const { stationName, lastUpdate, trips } = await fetchTripsForStation(station);
  const upcoming = pickUpcomingTrips(trips, destination, now);
  const next = upcoming[0] ?? null;

  const formatLastUpdated = lastUpdate
    ? new Date(lastUpdate).toLocaleString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : null;

  let nextPayload = null;
  if (next) {
    const leaveByMs = next.liveArrival.getTime() - leaveBeforeMinutes * 60 * 1000;
    const minutesUntilArrival = roundMinutes(next.liveArrival - now);
    const minutesUntilLeave = roundMinutes(leaveByMs - now);
    const leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilArrival);
    const isDelayed = next.delayMinutes > 0 || next.scheduledDisplayTime !== next.displayTime;

    nextPayload = {
      arrival: next.liveArrival.toISOString(),
      scheduledArrival: next.scheduledArrival.toISOString(),
      displayTime: next.displayTime,
      scheduledDisplayTime: next.scheduledDisplayTime,
      isDelayed,
      platform: next.platform,
      status: next.status,
      destination: next.destination,
      cars: next.cars,
      leaveBy: new Date(leaveByMs).toISOString(),
      minutesUntilArrival,
      minutesUntilLeave,
      minutesLate: minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0,
      leavePhase,
    };
  }

  return {
    station: stationName,
    lastUpdated: formatLastUpdated,
    config: {
      station,
      destination,
      destinationLabel,
      leaveBeforeMinutes,
      refreshSeconds,
    },
    next: nextPayload,
    following: upcoming[1]
      ? {
          displayTime: upcoming[1].displayTime,
          scheduledDisplayTime: upcoming[1].scheduledDisplayTime,
          platform: upcoming[1].platform,
          status: upcoming[1].status,
        }
      : null,
  };
}
