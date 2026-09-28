/**
 * Tampere (Nysse tram, lines 1 and 3) next-train payload for local testers, ahead of the
 * eventual flip.
 *
 * Directions are derived live from the board's own already-computed "line + actual last stop"
 * chips (lib/providers/tampere.js's classifyAndFilterTampereTrips), not a static
 * marketing-directions list — same approach as Melbourne/Copenhagen/Dublin (see those cities'
 * dogfood-next-train.js file headers), because Tampere's H5 through-running minority means a
 * trip's real destination can only be known per-trip, never from a fixed per-line station list.
 */
import {
  TAMPERE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/tampere.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

export function listTampereDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    lines: station.lines ?? [],
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Falls back to `scheduledCandidates` when the live board is empty because of a genuine
 * VehiclePositions confirmation gap (`board.emptyReason === "no-live-predictions"`), so a
 * station mid-gap still lists its normal directions instead of collapsing to zero — same
 * honest-empty-state posture as Dublin (docs/jim-brief-dublin-honest-empty-state.md).
 * @param {string} station
 */
export async function getTampereDogfoodDirections(station) {
  const board = await fetchStationBoard(station);
  const source =
    (board.trips ?? []).length > 0
      ? board.trips
      : board.emptyReason === "no-live-predictions"
        ? board.scheduledCandidates ?? []
        : board.trips ?? [];
  const directions = [...new Set(source.map((trip) => trip.destination).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return {
    directions,
    source: "tampere-live-board",
  };
}

export async function getTampereDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await fetchStationBoard(station, { now });
  const matching = (board.trips ?? []).filter((trip) => trip.destination === destination);
  const upcoming = pickUpcomingProviderTrips(matching, destination, now);

  const scheduledForDirection = (board.scheduledCandidates ?? []).some(
    (trip) => trip.destination === destination
  );
  const emptyReason =
    upcoming.length === 0 && board.emptyReason === "no-live-predictions" && scheduledForDirection
      ? board.emptyReason
      : null;

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
    timeZone: TAMPERE_TIME_ZONE,
    emptyReason,
  });
}
