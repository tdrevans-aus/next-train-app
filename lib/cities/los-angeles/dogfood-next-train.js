/**
 * Los Angeles next-train payload for local testers, ahead of the eventual flip.
 * LA Metro Rail A/B/C/D/E/K via Swiftly GTFS-RT — live boards only, no scheduled fallback (see
 * lib/providers/los-angeles.js file header). SWIFTLY_API_KEY is required (fetchStationBoard()
 * throws MissingSwiftlyApiKeyError if unset). Modelled on lib/cities/prague/dogfood-next-train.js.
 */
import {
  LOS_ANGELES_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/los-angeles.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listLosAngelesDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Pure mapping from a provider board to the next-train response, split out so the QA gate can
 * drive it with fixture boards (no network). `emptyReason` handling, per
 * docs/jim-brief-la-flip-follow-through.md (mirrors Prague):
 *   - "no-live-predictions" only passes through for a direction the static schedule expects to
 *     run from this stop right now (board.scheduledCandidates) - a direction with none either
 *     isn't run from here or has finished for the day;
 *   - "not-currently-served" is station-wide (today's calendar expects nothing here at all), so
 *     it passes straight through with no direction gate.
 * No rider copy is added here.
 */
export function buildLosAngelesNextTrainFromBoard(
  board,
  { station, destination, destinationLabel, leaveBeforeMinutes, refreshSeconds, skipTrains = 0, now = new Date() }
) {
  const matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  const remapped = matching.map((trip) => ({ ...trip, destination }));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

  const scheduledForDirection = (board.scheduledCandidates ?? []).some((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  let emptyReason = null;
  if (upcoming.length === 0) {
    if (board.emptyReason === "no-live-predictions" && scheduledForDirection) {
      emptyReason = board.emptyReason;
    } else if (board.emptyReason === "not-currently-served") {
      emptyReason = board.emptyReason;
    }
  }

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
    timeZone: LOS_ANGELES_TIME_ZONE,
    emptyReason,
  });
}

export async function getLosAngelesDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await fetchStationBoard(station);
  return buildLosAngelesNextTrainFromBoard(board, {
    station,
    destination,
    destinationLabel,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
  });
}

export function getLosAngelesDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "los-angeles-marketing-ends",
  };
}
