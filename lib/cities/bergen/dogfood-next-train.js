/**
 * Bergen next-train payload for local testers, ahead of the eventual flip.
 * Entur Journey Planner v3 GraphQL (NLOD open service, no key) — same live path already
 * confirmed working for Oslo (lib/providers/oslo.js file header).
 */
import {
  BERGEN_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/bergen.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listBergenDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getBergenDogfoodNextTrain({
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
    timeZone: BERGEN_TIMEZONE,
  });
}

export function getBergenDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "bergen-marketing-ends",
  };
}
