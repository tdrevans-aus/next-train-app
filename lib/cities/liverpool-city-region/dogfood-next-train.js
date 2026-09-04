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
 *  - Merseyrail (Northern Line + Wirral Line): Darwin-served, corrected
 *    4 Sep 2026 (docs/jim-brief-liverpool-merseyrail-via-darwin.md) — it is a
 *    National Rail TOC, not a metro system without a public feed. Same
 *    directionChip() shape (destination + operator), same
 *    MissingDarwinTokenError-on-no-token behaviour as National Rail. No
 *    operator filters anywhere in this region (docs/board-eligibility-rule.md
 *    walk-up rule) — every board shows every train Darwin returns for that
 *    CRS. Directions derive live for all 97 stations, including Merseyrail
 *    stops that have no `line` field; the marketing-directions.js line+
 *    terminus labels are a separate, unused-at-chip-time marketing model
 *    (see that module's header), not a gate on which stations get live
 *    directions.
 *
 * Liverpool Lime Street (LIV): H1 closed as moot 4 Sep 2026 (Tim's option
 * B) — one catalog entry, one Darwin board, Northern/Avanti/TPE/LNR & WMR
 * and Merseyrail together, each with its own platform. The former
 * train/metro doNotGroup pair and Lime-Street-specific mode resolution are
 * gone; fetchBoardForMode() below is the same generic mode-aware dispatch
 * every station in this region uses, nothing Lime-Street-specific left.
 *
 * Liverpool South Parkway (LPY) has both a National Rail entry and its own
 * Merseyrail entry (same CRS, joint station — see stations.json), not a
 * doNotGroup case since both share the identical CRS and board. Liverpool
 * Central and Moorfields are Merseyrail only. Ellesmere Port is a genuine
 * Wirral Line terminus, Merseyrail only; the deleted `uk-ellesmere-port`
 * standalone region has no bearing on this catalog (see the provider file
 * header).
 */
import {
  LIVERPOOL_CITY_REGION_TIME_ZONE,
  LIVERPOOL_CITY_REGION_REGION,
  resolveCatalogEntry,
  listCatalogStations as listRegionCatalogStations,
  fetchNationalRailBoard,
  fetchMerseyrailStopBoard,
  fetchStationBoard,
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
  // mode is included so callers can tell a station's National Rail entry
  // from its Merseyrail entry where a station has both (e.g. Liverpool
  // South Parkway), same list shape East Midlands used at Nottingham
  // Station's doNotGroup hub. Liverpool Lime Street now has one entry only
  // (mode train) since H1 closed as moot — see the provider file header.
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
 * A few stations (e.g. Liverpool South Parkway) have both a National Rail
 * and a Merseyrail catalog entry under the same printed name — passing the
 * resolved name back into fetchStationBoard() without the mode would re-run
 * the provider's own rail-first ambiguous resolution, silently discarding an
 * explicit metro disambiguation. When a mode is given, this calls the
 * mode-specific fetcher directly instead. With no mode given, it falls back
 * to fetchStationBoard()'s own rail-first ambiguous resolution — same order
 * as every other UK doNotGroup region.
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
 * Both National Rail and Merseyrail: destination+operator chips derived live
 * from Darwin, same approach as every other UK region (no printed line map
 * to union against).
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

export { MissingDarwinTokenError };
