/**
 * Rotterdam next-train payload for production Vercel and local testers. OVapi, no key.
 */
import {
  ROTTERDAM_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/rotterdam.js";
import { EMPTY_BOARD_HORIZON_MINUTES } from "../../providers/gtfs/board.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listRotterdamDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getRotterdamDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  let board = await fetchStationBoard(station, { now });
  let matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  if (matching.length === 0) {
    board = await fetchStationBoard(station, {
      now,
      horizonMinutes: EMPTY_BOARD_HORIZON_MINUTES,
    });
    matching = (board.trips ?? []).filter((trip) =>
      tripMatchesMarketingChip(trip, destination)
    );
  }
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
    timeZone: ROTTERDAM_TIME_ZONE,
  });
}

export function getRotterdamDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "rotterdam-marketing-ends",
  };
}
