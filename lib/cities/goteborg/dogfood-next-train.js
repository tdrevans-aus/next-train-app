/**
 * Göteborg next-train payload for testers (live since 29 Aug 2026).
 * Primary board: Västtrafik Planera Resa v4 live departures
 * (lib/providers/vasttrafik.js). Falls back to Trafiklab GTFS Regional `vt`
 * static (TRAFIKLAB_API_KEY) schedule-only when Västtrafik departures are
 * unavailable — Trafiklab still publishes no TripUpdates for Västtrafik, so
 * the fallback board stays static-times-only. `fetchStationBoard`'s
 * `realtime: "live" | "timetable"` marker on the returned board reflects
 * which source actually answered; see docs/jim-brief-goteborg-vasttrafik-live.md.
 */
import {
  GOTEBORG_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/goteborg.js";
import { EMPTY_BOARD_HORIZON_MINUTES } from "../../providers/gtfs/board.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listGoteborgDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getGoteborgDogfoodNextTrain({
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
    timeZone: GOTEBORG_TIME_ZONE,
  });
}

export function getGoteborgDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "goteborg-marketing-ends",
  };
}
