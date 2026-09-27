/**
 * Vienna next-train payload for local testers, ahead of the eventual flip.
 * Wiener Linien U-Bahn via the OGD Realtime Monitor — live boards only, no scheduled fallback
 * (see lib/providers/vienna.js file header). No API key is required for this feed (unlike
 * Chicago/BART/Washington), so fetchStationBoard() calls the real live monitor every time this
 * module is exercised — this module exists now (flip-follow-through guardrail) so the dispatch
 * wiring, catalog and direction model are all ready ahead of Mark's QA pass, with no second pass
 * needed.
 */
import {
  VIENNA_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/vienna.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listViennaDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export async function getViennaDogfoodNextTrain({
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
    timeZone: VIENNA_TIMEZONE,
  });
}

export function getViennaDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "vienna-marketing-ends",
  };
}
