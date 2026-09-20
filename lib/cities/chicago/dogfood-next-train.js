/**
 * Chicago next-train payload for local testers, ahead of the eventual flip.
 * CTA 'L' via the Train Tracker Arrivals API — live boards only, no scheduled fallback (see
 * lib/providers/chicago.js file header). CTA_TRAIN_TRACKER_KEY is not registered yet, so
 * fetchStationBoard() throws MissingCtaTrainTrackerKeyError for every real call until Tim signs
 * up (docs/chicago-d1/jim-handoff.md) — this module still exists now (flip-follow-through
 * guardrail) so the dispatch wiring, catalog and direction model are all ready the day the key
 * lands, with no second pass needed.
 */
import {
  CHICAGO_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/chicago.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listChicagoDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    branch: station.branch ?? null,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getChicagoDogfoodNextTrain({
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
    timeZone: CHICAGO_TIME_ZONE,
  });
}

export function getChicagoDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "chicago-marketing-ends",
  };
}
