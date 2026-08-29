/**
 * Stockholm next-train payload for local testers and the eventual flip.
 * SL Transport JSON (transport.integration.sl.se, no API key) — a realtime
 * feed (`expected` departure times), unlike Göteborg's schedule-only Trafiklab
 * board. The API serves its own forward horizon server-side, so there is no
 * static-GTFS horizon retry here.
 */
import {
  STOCKHOLM_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/stockholm.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listStockholmDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getStockholmDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await fetchStationBoard(station);
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
    timeZone: STOCKHOLM_TIME_ZONE,
  });
}

export function getStockholmDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "stockholm-marketing-ends",
  };
}
