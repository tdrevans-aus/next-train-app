/**
 * Perth (Transperth) provider — LiveTimes ASMX XML.
 * @see docs/multi-city-provider-design.md
 */

import {
  enrichTripTiming,
  normalizeDestination,
  parsePerthDateTime,
  parsePerthIsoDateTime,
  providerTripToInternal,
} from "../train-times-core.js";

const LIVETIMES_URL =
  "https://livetimes.transperth.wa.gov.au/LiveTimes.asmx/GetTimesForStation";

export const PERTH_CLUSTER_STATIONS = ["Perth Underground Stn", "Perth Stn"];

const PERTH_OFFSET = "+08:00";

function pad2(value) {
  return String(value).padStart(2, "0");
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
    // Allowlisted station with no live trips (e.g. overnight) — not unknown.
    return { stationName: station, lastUpdate: null, trips: [] };
  }

  const stationName = extractTag(xml, "Name") || station;
  const lastUpdate = extractTag(xml, "LastUpdate");
  const trips = parseLiveTimesXml(xml);

  return { stationName, lastUpdate, trips };
}

export function isPerthCluster(station) {
  return PERTH_CLUSTER_STATIONS.includes(station);
}

function toProviderTrip(trip) {
  return {
    liveDeparture: trip.liveDeparture.toISOString(),
    scheduledDeparture: trip.scheduledDeparture.toISOString(),
    displayTime: trip.displayTime,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    platform: trip.platform,
    destination: trip.destination,
    cars: trip.cars,
    status: trip.status,
    cancelled: false,
  };
}

/**
 * Provider contract: fetch all trips at a Perth station (all directions).
 * @param {string} stationName
 */
export async function fetchStationBoard(stationName) {
  let board;

  if (!isPerthCluster(stationName)) {
    const result = await fetchStationTrips(stationName);
    board = result;
  } else {
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
      // Quiet hours / empty live feed — station is known; return an empty board.
      board = {
        stationName: "Perth Stn",
        lastUpdate: null,
        trips: [],
      };
    } else {
      board = {
        stationName: "Perth Stn",
        lastUpdate,
        trips: allTrips,
      };
    }
  }

  const lastUpdated =
    board.lastUpdate ? parsePerthIsoDateTime(board.lastUpdate)?.toISOString() ?? null : null;

  return {
    stationName: board.stationName,
    lastUpdate: board.lastUpdate ?? lastUpdated,
    trips: board.trips.map(toProviderTrip),
  };
}

/** @deprecated use {@link fetchStationBoard} */
export async function fetchTripsForStation(stationName) {
  const board = await fetchStationBoard(stationName);
  const lastUpdateRaw =
    board.lastUpdate && !board.lastUpdate.includes("/")
      ? board.lastUpdate
      : board.lastUpdate;

  return {
    stationName: board.stationName,
    lastUpdate: lastUpdateRaw,
    trips: board.trips.map(providerTripToInternal),
  };
}
