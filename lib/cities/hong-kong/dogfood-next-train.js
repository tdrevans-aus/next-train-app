/**
 * Hong Kong next-train payload for local testers, ahead of the eventual flip.
 * MTR Next Train REST — live boards only, no scheduled fallback (see
 * lib/providers/hong-kong.js file header). No API key required, so fetchStationBoard() calls the
 * real live REST every time this module is exercised — this module exists now
 * (flip-follow-through guardrail) so the dispatch wiring, catalog and direction model are all
 * ready ahead of Mark's QA pass, with no second pass needed.
 */
import {
  HONG_KONG_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/hong-kong.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listHongKongDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getHongKongDogfoodNextTrain({
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
    timeZone: HONG_KONG_TIMEZONE,
  });
}

export function getHongKongDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "hong-kong-marketing-ends",
  };
}
