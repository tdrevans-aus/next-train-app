/**
 * Boston next-train payload for local testers, ahead of the eventual flip.
 * Subway/rapid transit via static GTFS (schedule-only) PLUS live MBTA V3 Commuter Rail
 * predictions at the five board-eligible stations (South Station, North Station, Forest
 * Hills, Braintree, JFK/UMass) — see lib/providers/boston.js file header and
 * docs/boston-d1/oracle-clash-report.md Board eligibility section.
 */
import {
  BOSTON_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/boston.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listBostonDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getBostonDogfoodNextTrain({
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
    timeZone: BOSTON_TIMEZONE,
  });
}

export function getBostonDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "boston-marketing-ends",
  };
}
