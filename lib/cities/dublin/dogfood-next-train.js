/**
 * Dublin (Luas) next-train payload. Flipped live 26 Sep 2026 (Tim's decision, docs/jim-brief-
 * dublin-flip.md, docs/dublin-d1/mark-qa-note.md, docs/dublin-d1/ci-snapshot-evidence.md).
 *
 * Live-only board via the NTA GTFS-RT v2 feed (lib/providers/dublin.js) for actual next-train
 * times — no scheduled fallback, same posture as Melbourne/Adelaide.
 *
 * Direction chips are derived from the static GTFS snapshot, NOT only the live board — fixed
 * 27 Sep 2026 (docs/jim-brief-dublin-flip-fixes.md fix 2). The previous live-only version
 * produced zero chips whenever the RT-confirmed board was empty (overnight, after the last tram,
 * or during any live-feed outage), because there was simply no trip to read a destination off.
 * fetchStaticDirections()/directionsFromStatic() in lib/providers/dublin.js read trips.txt/
 * stop_times.txt/routes.txt directly, reusing the exact same colour+terminus label model
 * (docs/dublin-d1/direction-model-memo.md section 3 recommendation A) and the Green city-centre
 * loop direction-exclusivity guard (classifyLuasLineId/resolveTerminus/
 * mapLineTerminusDestination/isDirectionAllowedAtStop in lib/cities/dublin/
 * marketing-directions.js) that the live board also uses, so the two can never disagree on what
 * counts as a valid chip. Same "derive from schedule, don't fork the model" shape as
 * lib/cities/copenhagen/dogfood-next-train.js, which made the identical move for the identical
 * reason: no live-confirmation requirement should ever mean zero chips.
 */
import {
  DUBLIN_TIME_ZONE,
  fetchStationBoard,
  fetchStaticDirections,
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
 * Directions derived from the static timetable — see file header. Always available (unlike the
 * live board), including overnight and during a live-feed outage.
 * @param {string} station
 */
export async function getDublinDogfoodDirections(station) {
  const directions = await fetchStaticDirections(station);
  return {
    directions,
    source: "dublin-nta-static-schedule",
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
