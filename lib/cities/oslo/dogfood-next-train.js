/**
 * Oslo next-train payload for local testers and the live flip.
 * Entur Journey Planner v3 GraphQL (NLOD open service, no key) — confirmed working live
 * 30 Aug 2026 (see lib/providers/oslo.js header for the doNotGroup/R21 details).
 */
import {
  OSLO_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/oslo.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listOsloDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getOsloDogfoodNextTrain({
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
    timeZone: OSLO_TIMEZONE,
  });
}

export function getOsloDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "oslo-marketing-ends",
  };
}
