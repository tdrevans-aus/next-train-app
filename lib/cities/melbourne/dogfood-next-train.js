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
import { createSharedStationBoard } from "../shared-station-board.js";

/** One board computation per station per ~15 s, shared by every direction (see the helper). */
const sharedStationBoard = createSharedStationBoard((station, now) => fetchStationBoard(station, { now }));

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
  const board = await sharedStationBoard(station, new Date());
  const directions = [...new Set((board.trips ?? []).map((trip) => trip.destination).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return {
    directions,
    source: "melbourne-live-board",
  };
}

/**
 * Match board trips to a requested direction label. Exact chip match wins. When there is none and
 * the label is a bare hub name ("Flinders Street" — the pre-#439 form saved routes may still
 * carry, with no "<Line> Line + " prefix for the alias table to catch), fall back to every
 * hub-parenthetical chip at this station ("Flinders Street (Hurstbridge Line)", ...), so the
 * saved-route endpoint agrees with the board (docs/jim-brief-eaglemont-next-train-vs-board.md).
 * `canonical` is set only when the fallback resolves to exactly one chip.
 * @param {Array<{destination: string}>} trips
 * @param {string} destination
 */
export function matchBoardTripsToDirection(trips, destination) {
  const exact = trips.filter((trip) => trip.destination === destination);
  if (exact.length > 0 || !destination || destination.includes("(")) {
    return { matching: exact, canonical: null };
  }
  const prefix = `${destination} (`;
  const hub = trips.filter((trip) => String(trip.destination ?? "").startsWith(prefix));
  const chips = [...new Set(hub.map((trip) => trip.destination))];
  return { matching: hub, canonical: chips.length === 1 ? chips[0] : null };
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
  const board = await sharedStationBoard(station, now);
  return nextTrainFromBoard(board, {
    station,
    destination,
    destinationLabel,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
  });
}

/**
 * Pure board -> next-train step, shared by the live path above and the fixture-backed parity
 * gate (qa/melbourne-next-train-board-parity-gate.mjs).
 */
export function nextTrainFromBoard(
  board,
  { station, destination, destinationLabel, leaveBeforeMinutes, refreshSeconds, skipTrains = 0, now = new Date() }
) {
  const { matching, canonical } = matchBoardTripsToDirection(board.trips ?? [], destination);
  const chips = [...new Set(matching.map((trip) => trip.destination))];
  const upcoming = chips
    .flatMap((chip) => pickUpcomingProviderTrips(matching.filter((trip) => trip.destination === chip), chip, now))
    .sort((a, b) => a.liveDeparture - b.liveDeparture);
  // A bare hub label resolved to exactly one hub-parenthetical chip is echoed back canonical so
  // the client self-heals its saved value (same contract as the server-side label aliases).
  const echoed = canonical ?? destination;

  return buildNextTrainResponse({
    station: board.stationName ?? station,
    destination: echoed,
    destinationLabel: canonical ? canonical : (destinationLabel ?? destination),
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
    upcomingTrips: upcoming,
    timeZone: MELBOURNE_TIME_ZONE,
  });
}
