/**
 * West of England next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "west-of-england") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/west-of-england.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK region.
 *
 * Direction model is destination + operator (e.g. "London Paddington
 * (GWR)"), matching how National Rail departure boards actually present
 * (docs/west-of-england-d1/direction-model-memo.md). Unlike the line-based
 * cities (Adelaide, Oslo, etc.), there is no printed route/line map to build
 * a static marketing-directions.js against, so directions are derived live
 * from the board itself on every call — same approach as Perth's
 * uniqueDestinations()-based live fallback (lib/cities/perth/static-directions.js),
 * just with an operator suffix appended per trip.
 */
import {
  WEST_OF_ENGLAND_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/west-of-england.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

/**
 * "London Paddington (GWR)" — matches how Darwin/real departure boards
 * present. Falls back to destination alone if Darwin ever omits an operator
 * tag (never fabricates one).
 * @param {{ destination?: string, operator?: string }} trip
 */
function directionChip(trip) {
  const destination = String(trip?.destination ?? "").trim();
  const operator = String(trip?.operator ?? "").trim();
  if (!destination) {
    return null;
  }
  return operator ? `${destination} (${operator})` : destination;
}

export function listWestOfEnglandDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json.
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Directions derived purely from the live Darwin board — no static list to
 * union with, since no printed National Rail line map exists for this
 * corridor (see file header).
 * @param {string} station
 */
export async function getWestOfEnglandDogfoodDirections(station) {
  const board = await fetchStationBoard(station);
  const chips = new Set();
  for (const trip of board.trips ?? []) {
    const chip = directionChip(trip);
    if (chip) {
      chips.add(chip);
    }
  }
  return {
    directions: [...chips].sort((a, b) => a.localeCompare(b)),
    source: "west-of-england-darwin-live",
  };
}

export async function getWestOfEnglandDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await fetchStationBoard(station);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
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
    timeZone: WEST_OF_ENGLAND_TIME_ZONE,
  });
}
