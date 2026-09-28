/**
 * Prague next-train payload for local testers, ahead of the eventual flip.
 * PID Metro A/B/C via the Golemio PID Departure Boards API — live boards only, no scheduled
 * fallback (see lib/providers/prague.js file header). GOLEMIO_API_KEY is required
 * (fetchStationBoard() throws MissingGolemioApiKeyError if unset) — this module exists now
 * (flip-follow-through guardrail) so the dispatch wiring, catalog and direction model are all
 * ready ahead of Mark's QA pass, with no second pass needed.
 */
import {
  PRAGUE_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/prague.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listPragueDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getPragueDogfoodNextTrain({
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
    timeZone: PRAGUE_TIMEZONE,
  });
}

export function getPragueDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "prague-marketing-ends",
  };
}
