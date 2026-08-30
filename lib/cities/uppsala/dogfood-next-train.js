/**
 * Uppsala next-train payload for local testers and the live flip.
 * Trafiklab GTFS Regional `ul` (TRAFIKLAB_API_KEY static, TRAFIKLAB_API_KEY_RT
 * realtime) — both confirmed working live 2026-08-30, real Mälartåg trips flowing.
 */
import {
  UPPSALA_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/uppsala.js";
import { EMPTY_BOARD_HORIZON_MINUTES } from "../../providers/gtfs/board.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listUppsalaDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getUppsalaDogfoodNextTrain({
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
    timeZone: UPPSALA_TIMEZONE,
  });
}

export function getUppsalaDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "uppsala-marketing-ends",
  };
}
