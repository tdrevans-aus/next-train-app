/**
 * Washington next-train payload for local testers, ahead of the eventual flip.
 * WMATA Metrorail via the Station Prediction API — live boards only, no scheduled fallback (see
 * lib/providers/washington.js file header). WMATA_API_KEY is not registered yet, so
 * fetchStationBoard() throws MissingWmataApiKeyError for every real call until Tim signs up
 * (docs/washington-d1/jim-handoff.md) — this module still exists now (flip-follow-through
 * guardrail) so the dispatch wiring, catalog and direction model are all ready the day the key
 * lands, with no second pass needed.
 */
import {
  WASHINGTON_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/washington.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listWashingtonDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getWashingtonDogfoodNextTrain({
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
    timeZone: WASHINGTON_TIME_ZONE,
  });
}

export function getWashingtonDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "washington-marketing-ends",
  };
}
