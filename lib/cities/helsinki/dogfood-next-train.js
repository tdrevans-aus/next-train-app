/**
 * Helsinki next-train payload for local testers, ahead of the eventual flip.
 * Digitransit Routing API v2 HSL (DIGITRANSIT_SUBSCRIPTION_KEY) — a realtime feed
 * (`stoptimesWithoutPatterns` blends scheduled + realtime in one call).
 */
import {
  HELSINKI_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/helsinki.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listHelsinkiDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getHelsinkiDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await fetchStationBoard(station, { now });
  const matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  const remapped = matching.map((trip) => ({ ...trip, destination }));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

  return buildNextTrainResponse({
    station: board.stationName ?? station,
    destination,
    destinationLabel: destinationLabel ?? destination,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
    upcomingTrips: upcoming,
    timeZone: HELSINKI_TIMEZONE,
  });
}

export function getHelsinkiDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "helsinki-marketing-ends",
  };
}
