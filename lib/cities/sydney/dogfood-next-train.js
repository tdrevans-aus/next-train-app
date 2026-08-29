/**
 * Sydney next-train payload for production Vercel and local dev.
 */
import {
  SYDNEY_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/sydney.js";
import { loadGtfsStatic } from "../../providers/gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "../../providers/gtfs/blob-fixtures.js";
import { buildBoardForStops } from "../../providers/gtfs/board.js";
import { indexTripUpdates } from "../../providers/gtfs/realtime.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

function toProviderTrip(trip, destination) {
  return {
    scheduledDeparture: trip.scheduledDeparture ?? trip.scheduledDeparture,
    liveDeparture: trip.liveDeparture ?? trip.liveDeparture,
    scheduledDisplayTime: trip.scheduledDisplayTime ?? trip.scheduledDisplayTime,
    displayTime: trip.displayTime ?? trip.displayTime,
    platform: trip.platform ?? trip.platform ?? "",
    destination,
    cars: trip.cars,
    routeShortName: trip.routeShortName ?? trip.route_short_name,
  };
}

function fixtureStatic() {
  return loadGtfsStatic({
    url: gtfsFixtureBlobUrl("sydney"),
    routeTypes: ["2", "401"],
    timeZone: SYDNEY_TIME_ZONE,
  });
}

function catalogEntry(station) {
  const needle = String(station || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
  return (
    listCatalogStations().find((entry) => {
      if (String(entry.name || "").trim().toLowerCase() === needle) {
        return true;
      }
      return (entry.aliases ?? []).some(
        (alias) => String(alias).trim().toLowerCase() === needle
      );
    }) ?? null
  );
}

async function boardFromFixture(station) {
  const entry = catalogEntry(station);
  const stopIds = entry?.stopIds ?? [];
  const staticData = await fixtureStatic();
  const trips = buildBoardForStops({
    stopIds,
    staticData,
    realtimeIndex: indexTripUpdates([]),
    timeZone: SYDNEY_TIME_ZONE,
  });
  return {
    stationName: entry?.name ?? station,
    lastUpdate: new Date().toISOString(),
    trips,
    source: "sydney-gtfs-fixture",
  };
}

async function loadSydneyBoard(station) {
  if (process.env.VERCEL === "1") {
    return boardFromFixture(station);
  }
  try {
    return await fetchStationBoard(station);
  } catch (error) {
    const message = String(error?.message || error);
    if (/401|403|TFNSW_API_KEY|not set/i.test(message)) {
      console.warn(`Sydney live board unavailable (${message}) — using local GTFS fixture`);
      return boardFromFixture(station);
    }
    throw error;
  }
}

export function listSydneyDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json.
  return listCatalogStations().map((station) => ({
    name: station.name,
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getSydneyDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await loadSydneyBoard(station);
  const matching = (board.trips ?? []).filter((trip) => tripMatchesMarketingChip(trip, destination));
  const remapped = matching.map((trip) => toProviderTrip(trip, destination));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

  return buildNextTrainResponse({
    station: board.stationName ?? board.stationName,
    destination,
    destinationLabel: destinationLabel ?? destination,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated: board.lastUpdate
      ? new Date(board.lastUpdate)
      : board.lastUpdate
        ? new Date(board.lastUpdate)
        : now,
    upcomingTrips: upcoming,
    timeZone: SYDNEY_TIME_ZONE,
  });
}

export function getSydneyDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "sydney-marketing-ends",
  };
}
