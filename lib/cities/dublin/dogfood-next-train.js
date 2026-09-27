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
 * marketing-directions list exists for Dublin.
 * @param {string} station
 */
export async function getDublinDogfoodDirections(station) {
  const board = await fetchStationBoard(station);
  const directions = [...new Set((board.trips ?? []).map((trip) => trip.destination).filter(Boolean))].sort(
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
  });
}
