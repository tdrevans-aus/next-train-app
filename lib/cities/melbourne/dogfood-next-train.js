/**
 * Melbourne next-train payload for local testers, ahead of the eventual flip.
 *
 * Metro Trains + V/Line walk-up services via the Transport Victoria Open Data Portal
 * (lib/providers/melbourne.js) — live-only boards, no scheduled fallback. Directions are
 * derived live from the board's own already-computed "Line + terminus [via City Loop]" /
 * "V/Line {terminus}" chips, not a static marketing-directions list — the loop/direct
 * suffix and short-turn termini (e.g. some Alamein-line trips terminate at Camberwell) are
 * per-trip facts, not enumerable ahead of time from the line map alone (same approach as
 * Copenhagen — see lib/cities/copenhagen/dogfood-next-train.js file header).
 */
import {
  MELBOURNE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/melbourne.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

export function listMelbourneDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Directions derived purely from the live board — see file header for why no static
 * marketing-directions list exists for Melbourne.
 * @param {string} station
 */
export async function getMelbourneDogfoodDirections(station) {
  const board = await fetchStationBoard(station);
  const directions = [...new Set((board.trips ?? []).map((trip) => trip.destination).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return {
    directions,
    source: "melbourne-live-board",
  };
}

export async function getMelbourneDogfoodNextTrain({
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
    timeZone: MELBOURNE_TIME_ZONE,
  });
}
