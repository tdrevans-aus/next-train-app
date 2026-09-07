/**
 * Göteborg next-train payload for testers (live since 29 Aug 2026).
 * Live-only board: Västtrafik Planera Resa v4 (lib/providers/vasttrafik.js).
 * No timetable fallback — `fetchStationBoard` either returns a `realtime:
 * "live"` board (possibly with zero trips, which is valid) or throws
 * (docs/jim-brief-goteborg-live-only-no-fallback.md).
 */
import {
  GOTEBORG_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/goteborg.js";
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
  // No horizonMinutes retry here: that was only ever meaningful for the
  // retired GTFS timetable fallback board (realtime-board.js's window
  // logic) — the Västtrafik live path ignores it, so a second call would
  // just repeat the same (cached) request for no benefit
  // (docs/jim-brief-goteborg-live-only-no-fallback.md).
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
    timeZone: GOTEBORG_TIME_ZONE,
  });
}

export function getGoteborgDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "goteborg-marketing-ends",
  };
}
