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

  // Only pass emptyReason through for a direction the static schedule actually expects to run
  // right now (docs/jim-brief-prague-flora-sweep-empty-state.md, mirrors Dublin's
  // docs/jim-brief-dublin-honest-empty-state.md) — a direction with zero scheduled candidates
  // either isn't served from this stop or has genuinely finished for the day. This gate is
  // specific to "no-live-predictions" (the schedule DOES expect a trip on this direction very
  // soon, live feed is silent) — "not-currently-served" (docs/jim-brief-prague-line-c-closure.md)
  // is a station-wide condition (today's calendar expects nothing here at all, on any line/
  // direction), so it's passed straight through with no direction-specific gate.
  const scheduledForDirection = (board.scheduledCandidates ?? []).some((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  let emptyReason = null;
  let emptyReasonMessage = null;
  if (upcoming.length === 0) {
    if (board.emptyReason === "no-live-predictions" && scheduledForDirection) {
      emptyReason = board.emptyReason;
    } else if (board.emptyReason === "not-currently-served") {
      emptyReason = board.emptyReason;
      emptyReasonMessage = board.notServedMessage ?? null;
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
    timeZone: PRAGUE_TIMEZONE,
    emptyReason,
    emptyReasonMessage,
  });
}

export function getPragueDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "prague-marketing-ends",
  };
}
