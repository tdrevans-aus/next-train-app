/**
 * Dublin (Luas) next-train payload. Flipped live 26 Sep 2026 (Tim's decision, docs/jim-brief-
 * dublin-flip.md, docs/dublin-d1/mark-qa-note.md, docs/dublin-d1/ci-snapshot-evidence.md).
 *
 * Live-only board via the NTA GTFS-RT v2 feed (lib/providers/dublin.js) — no scheduled
 * fallback, same posture as Melbourne/Adelaide. Directions are derived live from the board's
 * own already-computed "Red + Tallaght" / "Green + Broombridge" chips (colour + terminus,
 * docs/dublin-d1/direction-model-memo.md §3 recommendation A), not a separate static
 * enumeration — lib/providers/dublin.js's classifyLuasLineId()/mapLineTerminusDestination()/
 * isDirectionAllowedAtStop() already do all the per-station filtering (including the Green
 * city-centre loop direction-exclusivity guard), so this module reuses that verbatim rather
 * than forking it, same "derive live, don't fork" shape as lib/cities/melbourne/
 * dogfood-next-train.js and lib/cities/copenhagen/dogfood-next-train.js.
 */
import {
  DUBLIN_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/dublin.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

export function listDublinDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Directions derived purely from the live board — see file header.
 * @param {string} station
 */
export async function getDublinDogfoodDirections(station) {
  const board = await fetchStationBoard(station);
  const directions = [...new Set((board.trips ?? []).map((trip) => trip.destination).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return {
    directions,
    source: "dublin-nta-live-board",
  };
}

export async function getDublinDogfoodNextTrain({
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
    timeZone: DUBLIN_TIME_ZONE,
  });
}
