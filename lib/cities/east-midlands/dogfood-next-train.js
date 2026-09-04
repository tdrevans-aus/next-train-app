/**
 * East Midlands next-train payload for production Vercel and local dev.
 *
 * Two agencies, two direction models, sharing one dispatcher
 * (lib/providers/east-midlands.js's fetchStationBoard(), reused verbatim —
 * not forked here):
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "east-midlands"): destination
 *    + operator (e.g. "Sheffield (EMR)"), derived live from the board on
 *    every call — no printed National Rail route/line map exists, same
 *    reasoning and same approach as West of England's dogfood module
 *    (lib/cities/west-of-england/dogfood-next-train.js). Throws
 *    MissingDarwinTokenError until DARWIN_LDB_TOKEN exists — not caught
 *    here, same as every other UK region.
 *
 *  - NET (Nottingham Express Transit) tram: Jim's D2 GTFS pull (31 Aug 2026,
 *    see lib/providers/east-midlands.js file header) found NET has no
 *    confirmed feed at all — not just no real-time, no static schedule
 *    either. lib/cities/east-midlands/marketing-directions.js's line+terminus
 *    labels are a *design* artifact (used by the planned gate to prove the
 *    catalog/direction-model shape), not a confirmed schedule — treating
 *    them as real dogfood output would fabricate live-looking data from an
 *    unconfirmed feed. fetchNetStopBoard() throws NetFeedUnconfirmedError
 *    unconditionally; this module does not catch it, does not fall back to
 *    the static label list, and does not fabricate a schedule. It is
 *    deliberately surfaced to the caller, mirroring how West of England's
 *    dispatch surfaces MissingDarwinTokenError.
 *
 * Nottingham Station is a doNotGroup hub lock: the NET tram viaduct and
 * National Rail main platforms are two separate catalog entries with the
 * SAME printed name but different `mode` ("metro" vs "train"). This module
 * never collapses them — fetchStationBoard() resolves rail before metro
 * (same order as lib/providers/east-midlands.js's own dispatcher), so an
 * ambiguous bare "Nottingham Station" lookup resolves to the National Rail
 * layer; callers that need the tram layer must resolve/pass the metro
 * catalog entry explicitly (mode: "metro"), same disambiguation the catalog
 * itself already requires via resolveCatalogEntry(name, mode).
 */
import {
  EAST_MIDLANDS_TIME_ZONE,
  fetchStationBoard,
  fetchNationalRailBoard,
  fetchNetStopBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/east-midlands.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

/**
 * "Sheffield (EMR)" — matches how Darwin/real departure boards present.
 * Falls back to destination alone if Darwin ever omits an operator tag
 * (never fabricates one). Same shape as West of England's directionChip().
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

export function listEastMidlandsDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json. mode is included (unlike West of
  // England's single-mode list) because Nottingham Station's doNotGroup hub
  // lock needs it to disambiguate the two catalog entries with the same name.
  return listCatalogStations().map((station) => ({
    name: station.name,
    mode: station.mode,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Fetches the board for a station, honoring an explicit mode where given.
 *
 * Nottingham Station's doNotGroup hub lock means the same printed name
 * resolves to two different catalog entries by mode — passing the resolved
 * name back into fetchStationBoard() would re-run the SAME ambiguous,
 * rail-first resolution the provider's own dispatcher uses (see
 * lib/providers/east-midlands.js), silently discarding an explicit metro
 * disambiguation. When a mode is given, this calls the mode-specific
 * fetcher directly instead. With no mode given (the common single-layer
 * case, or a bare production lookup), it falls back to
 * fetchStationBoard()'s own rail-first ambiguous resolution.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "train") {
    return fetchNationalRailBoard(station);
  }
  if (mode === "metro") {
    return fetchNetStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, same
 * approach as West of England (no printed line map to union against). NET:
 * always throws NetFeedUnconfirmedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getEastMidlandsDogfoodDirections(station, { mode } = {}) {
  const entry = resolveCatalogEntry(station, mode);
  const board = await fetchBoardForMode(entry?.name ?? station, mode ?? entry?.mode);
  const chips = new Set();
  for (const trip of board.trips ?? []) {
    const chip = directionChip(trip);
    if (chip) {
      chips.add(chip);
    }
  }
  return {
    directions: [...chips].sort((a, b) => a.localeCompare(b)),
    source: "east-midlands-darwin-live",
  };
}

export async function getEastMidlandsDogfoodNextTrain({
  station,
  mode,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station, mode);
  const board = await fetchBoardForMode(entry?.name ?? station, mode ?? entry?.mode);
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
    timeZone: EAST_MIDLANDS_TIME_ZONE,
  });
}
