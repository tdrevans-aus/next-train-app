/**
 * Liverpool City Region next-train payload for production Vercel and local
 * dev. Two agencies, sharing the shared/region provider
 * (lib/providers/liverpool-city-region.js) directly — reused verbatim, not
 * forked here — same pattern as East Midlands' and West of England's own
 * dogfood modules:
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "liverpool-city-region"):
 *    destination + operator (e.g. "London Euston (Avanti West Coast)"),
 *    derived live from the board on every call — no printed National Rail
 *    route/line map exists, same reasoning as every other UK region's
 *    dogfood module. Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN
 *    exists — not caught here, same as every other UK region.
 *
 *  - Merseyrail (Northern Line + Wirral Line): static GTFS is confirmed
 *    live (Transitland, verified 2026-08-31) but real-time is genuinely
 *    UNCONFIRMED — no public GTFS-RT endpoint found anywhere, only an
 *    undocumented mobile-app internal API (same shape as Greater
 *    Manchester's Metrolink gap and South Yorkshire's Supertram/SYFTL gap,
 *    a permanent structural gap, not the standard Darwin account block).
 *    lib/providers/liverpool-city-region.js's fetchMerseyrailStopBoard()
 *    throws MerseyrailFeedUnconfirmedError unconditionally. This module
 *    does not catch it, does not fall back to the static line+terminus
 *    label list (lib/cities/liverpool-city-region/marketing-directions.js),
 *    and does not fabricate a schedule — it is surfaced to the caller
 *    exactly as thrown, per the board-eligibility rule (filter stations in,
 *    never trains off a board silently — an explicit "feed unconfirmed"
 *    error is the correct board state here, not an empty board). See
 *    docs/liverpool-city-region-d1/oracle-clash-report.md's Board
 *    eligibility section, which verdicts Merseyrail `out-product` (corrected
 *    2 Sep 2026 — a service that can never appear on a board is not `in`).
 *
 * Liverpool Lime Street (LIV) hub: doNotGroup, H1 UNRESOLVED — deliberately
 * NOT resolved by this module (see lib/providers/liverpool-city-region.js
 * file header and docs/liverpool-city-region-d1/hazard-pack.md H1). Unlike
 * West Midlands' Birmingham New Street/Grand Central pair (different
 * printed names), Liverpool Lime Street's two catalog entries share the
 * SAME printed name across modes — structurally the same shape as East
 * Midlands' Nottingham Station doNotGroup pair, even though the underlying
 * reason for the split is different (Nottingham's is a confirmed physical
 * tram/rail separation; Lime Street's is a genuinely unconfirmed structural
 * question the oracle report contradicts itself on). Mode-aware resolution
 * here calls the mode-specific fetcher directly rather than relying on the
 * provider's own rail-first ambiguous fallback, so an explicit metro-mode
 * lookup at Lime Street always surfaces the Merseyrail layer's outcome
 * (MerseyrailFeedUnconfirmedError) rather than ever silently falling
 * through to the National Rail board.
 *
 * Liverpool South Parkway (LPY) is National Rail only. Liverpool Central
 * and Moorfields are Merseyrail only. Ellesmere Port is a genuine Wirral
 * Line terminus, Merseyrail only; the deleted `uk-ellesmere-port` standalone
 * region has no bearing on this catalog (see the provider file header).
 */
import {
  LIVERPOOL_CITY_REGION_TIME_ZONE,
  LIVERPOOL_CITY_REGION_REGION,
  resolveCatalogEntry,
  listCatalogStations as listRegionCatalogStations,
  fetchNationalRailBoard,
  fetchMerseyrailStopBoard,
  fetchStationBoard,
  MerseyrailFeedUnconfirmedError,
  MissingDarwinTokenError,
} from "../../providers/liverpool-city-region.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

export const LIVERPOOL_CITY_REGION_DOGFOOD_TIME_ZONE = LIVERPOOL_CITY_REGION_TIME_ZONE;

/**
 * "London Euston (Avanti West Coast)" — matches how Darwin/real departure
 * boards present. Falls back to destination alone if Darwin ever omits an
 * operator tag (never fabricates one). Same shape as every other UK
 * region's directionChip().
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

export function listLiverpoolCityRegionDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json (currently null for every station — see
  // its file header; no coordinate source confirmed yet). mode is included
  // so callers can disambiguate Liverpool Lime Street's two doNotGroup
  // catalog entries (train vs metro), same list shape East Midlands used at
  // Nottingham Station's doNotGroup hub.
  return listRegionCatalogStations(LIVERPOOL_CITY_REGION_REGION).map((station) => ({
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
 * Liverpool Lime Street's doNotGroup hub lock (H1, unresolved) means the
 * same printed name resolves to two different catalog entries by mode —
 * passing the resolved name back into fetchStationBoard() would re-run the
 * SAME ambiguous, rail-first resolution the provider's own dispatcher uses,
 * silently discarding an explicit metro disambiguation. When a mode is
 * given, this calls the mode-specific fetcher directly instead. With no
 * mode given (the common single-layer case, or a bare production lookup),
 * it falls back to fetchStationBoard()'s own rail-first ambiguous
 * resolution — same order as every other UK doNotGroup region.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "train") {
    return fetchNationalRailBoard(station);
  }
  if (mode === "metro") {
    return fetchMerseyrailStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, same
 * approach as every other UK region (no printed line map to union against).
 * Merseyrail: fetchMerseyrailStopBoard() always throws
 * MerseyrailFeedUnconfirmedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getLiverpoolCityRegionDogfoodDirections(station, { mode } = {}) {
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
    source: "liverpool-city-region-darwin-live",
  };
}

export async function getLiverpoolCityRegionDogfoodNextTrain({
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
    timeZone: LIVERPOOL_CITY_REGION_DOGFOOD_TIME_ZONE,
  });
}

export { MissingDarwinTokenError, MerseyrailFeedUnconfirmedError };
