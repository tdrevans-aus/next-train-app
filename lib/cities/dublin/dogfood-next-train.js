/**
 * Dublin (Luas Red + Green) next-train payload for local testers, ahead of the eventual flip.
 *
 * GTFS static-join over the National Transport Authority's GTFS-RT v2 feed
 * (lib/providers/dublin.js) — live-only boards, no scheduled fallback (a trip without realtime
 * confirmation is dropped, never shown as live from the schedule alone). Directions are derived
 * live from the board's own already-computed "colour + terminus" chips (e.g. "Red + Tallaght",
 * "Green + Brides Glen"), not a static marketing-directions list — same approach as Melbourne/
 * Copenhagen (see lib/cities/melbourne/dogfood-next-train.js file header), because the Green
 * Line's direction-exclusive city-centre loop guard (isDirectionAllowedAtStop) already filters
 * which chips are genuinely reachable from a given stop, so a static per-station enumeration
 * would have to duplicate that logic rather than reuse it.
 */
import {
  DUBLIN_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/dublin.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

export function listDublinDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    lines: station.lines ?? [],
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Directions derived purely from the live board — see file header for why no static
 * marketing-directions list exists for Dublin. Falls back to `scheduledCandidates` (the
 * static-schedule-only trips lib/providers/dublin.js keeps around) when the live board is
 * empty because of a real-time feed gap (`board.emptyReason === "no-live-predictions"`), so a
 * station mid-gap still lists its normal directions instead of collapsing to zero
 * (docs/jim-brief-dublin-honest-empty-state.md) — never during a genuine no-more-service case,
 * where an empty directions list is correct.
 * @param {string} station
 */
export async function getDublinDogfoodDirections(station) {
  const board = await fetchStationBoard(station);
  const source = (board.trips ?? []).length > 0
    ? board.trips
    : board.emptyReason === "no-live-predictions"
      ? board.scheduledCandidates ?? []
      : board.trips ?? [];
  const directions = [...new Set(source.map((trip) => trip.destination).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return {
    directions,
    source: "dublin-live-board",
  };
}

export async function getDublinDogfoodNextTrain({
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

  // Only pass emptyReason through for a direction the schedule actually expects to run right
  // now (docs/jim-brief-dublin-honest-empty-state.md) — a direction with zero scheduled
  // candidates either isn't served from this stop or has genuinely finished for the day, and
  // buildNextTrainResponse's nextServiceDate/plain-empty paths already cover that.
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
    timeZone: DUBLIN_TIME_ZONE,
    emptyReason,
  });
}
