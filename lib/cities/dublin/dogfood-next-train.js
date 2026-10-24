/**
 * Dublin (Luas Red + Green) next-train payload for local testers, ahead of the eventual flip.
 *
 * GTFS static-join over the National Transport Authority's GTFS-RT v2 feed
 * (lib/providers/dublin.js) — live-only departure TIMES, no scheduled fallback (a trip without
 * realtime confirmation is dropped, never shown as live from the schedule alone). Direction CHIPS,
 * by contrast, are derived from the published static Luas timetable (fetchStaticDirections /
 * directionsFromStatic: trips.txt + stop_times.txt + the colour+terminus rule and the Green
 * city-centre loop direction-exclusivity guard), so they exist at any hour — overnight and during
 * a live-feed outage — and need no NTA key. Ported from closed PR #470
 * (docs/jim-brief-dublin-static-direction-chips.md).
 */
import {
  DUBLIN_TIME_ZONE,
  fetchStationBoard,
  fetchStaticDirections,
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
 * Directions from the static timetable — see file header. Always available, including overnight.
 * @param {string} station
 */
export async function getDublinDogfoodDirections(station) {
  const directions = await fetchStaticDirections(station);
  return {
    directions,
    source: "dublin-nta-static-schedule",
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
