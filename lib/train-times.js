/**
 * Perth-facing train times API — shared leave-by math + Perth provider fetch.
 */

import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  DEFAULT_TIME_ZONE,
  buildNextTrainResponse,
  parsePerthIsoDateTime,
  parseLiveBoardTimestamp,
  pickUpcomingTrips,
  pickUpcomingProviderTrips,
  uniqueDestinations,
  enrichTripTiming,
  normalizeDestination,
  parsePerthDateTime,
  resolveTripDisplayStatus,
} from "./train-times-core.js";

import {
  fetchStationBoard,
  fetchStationTrips,
  fetchTripsForStation,
  isPerthCluster,
  parseLiveTimesXml,
  PERTH_CLUSTER_STATIONS,
} from "./providers/perth.js";

export {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  DEFAULT_TIME_ZONE,
  buildNextTrainResponse,
  enrichTripTiming,
  normalizeDestination,
  parsePerthDateTime,
  parsePerthIsoDateTime,
  parseLiveBoardTimestamp,
  resolveTripDisplayStatus,
  pickUpcomingTrips,
  pickUpcomingProviderTrips,
  uniqueDestinations,
  fetchStationBoard,
  fetchStationTrips,
  fetchTripsForStation,
  isPerthCluster,
  parseLiveTimesXml,
  PERTH_CLUSTER_STATIONS,
};

export async function getNextTrainData({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
}) {
  const { stationName, lastUpdate, trips } = await fetchTripsForStation(station);
  const upcoming = pickUpcomingTrips(trips, destination, now);
  const lastUpdated = parseLiveBoardTimestamp(lastUpdate);

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
    timeZone,
  });
}
