/**
 * West Midlands next-train payload for production Vercel and local dev.
 *
 * Two agencies, two very different outcomes, sharing the shared UK helpers
 * directly (lib/providers/uk-darwin.js + lib/providers/uk-metro-wm.js +
 * lib/providers/uk/catalog.js) rather than a per-region provider fork —
 * uk-west-midlands has never had its own lib/providers/uk-west-midlands.js
 * file; the registry entry (id "uk-west-midlands") is a region config
 * (allow-list + direction model) over the shared providers, same pattern as
 * east-midlands/south-yorkshire/north-east.
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "uk-west-midlands"):
 *    destination + operator (e.g. "London Euston (Avanti West Coast)"),
 *    derived live from the board on every call — no printed National Rail
 *    route/line map exists, same reasoning as West of England's and East
 *    Midlands' own dogfood modules. Throws MissingDarwinTokenError until
 *    DARWIN_LDB_TOKEN exists — not caught here, same as every other UK
 *    region.
 *
 *  - West Midlands Metro (TfWM GTFS-RT): lib/providers/uk-metro-wm.js's
 *    fetchMetroStopBoard() checks TFWM_API_APP_ID/TFWM_API_APP_KEY before
 *    anything else and throws MissingTfwmCredentialsError when they are
 *    unset — which is the permanent case until Tim self-serves TfWM API
 *    portal registration (FB-48, docs/feature-backlog.md). This is not a
 *    "feed unconfirmed" situation like East Midlands' NET tram (the TfWM
 *    GTFS-RT feed itself is real and documented); it is a credentials gap.
 *    Either way the shape is the same: this module does not catch that
 *    error, does not fall back to a static schedule, and does not fabricate
 *    departures — it surfaces MissingTfwmCredentialsError to the caller
 *    exactly as thrown, per the board-eligibility rule (filter stations in,
 *    never trains off a board silently — an explicit credentials error is
 *    the correct board state here, not an empty board).
 *
 * Birmingham New Street (BHM) hub: mode-aware resolution is built the same
 * way East Midlands did at Nottingham Station (call the mode-specific
 * fetcher directly rather than relying on the provider's own rail-first
 * ambiguous fallback), but note a real difference from Nottingham found
 * while wiring this: the West Midlands Metro catalog entry nearest BHM is
 * named "Grand Central" (catalogId "metro:grand-central", aliases include
 * "Grand Central New Street"), cross-referenced to BHM only via its
 * `interchange.nationalRailCrs` field in stations.json — NOT the literal
 * same printed name as Nottingham Station's doNotGroup pair. The oracle
 * report (docs/uk-west-midlands-d1/oracle-clash-report.md) says as much:
 * "No physical tram/rail split like East Midlands Nottingham." Mode-aware
 * resolution is still implemented here (an explicit mode is honored by
 * calling the matching fetcher directly, never silently falling through to
 * rail), both for parity with the other two-agency regions and because it
 * fails safe: passing mode "metro" with the rail name "Birmingham New
 * Street" correctly resolves to nothing (Metro's catalog entry doesn't
 * carry that string as its name or an alias) rather than silently
 * returning the rail board.
 *
 * Kidderminster (KID): National Rail only, in-catalog, no special handling
 * needed. Severn Valley Railway heritage services sharing its platform are
 * NOT a catalog entry at all (oracle report verdict `out-mode`) — there is
 * nothing to build for them, and this module must never accidentally
 * resolve or surface anything under that name.
 */
import {
  UK_TIME_ZONE,
  fetchStationBoard as fetchDarwinStationBoard,
  MissingDarwinTokenError,
} from "../../providers/uk-darwin.js";
import {
  fetchMetroStopBoard,
  MissingTfwmCredentialsError,
} from "../../providers/uk-metro-wm.js";
import {
  listCatalogStations as listRegionCatalogStations,
  resolveRailEntry,
  resolveMetroEntry,
} from "../../providers/uk/catalog.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

export const UK_WEST_MIDLANDS_TIME_ZONE = UK_TIME_ZONE;
export const UK_WEST_MIDLANDS_REGION = "uk-west-midlands";

/**
 * @param {string} stationIdOrName
 * @param {"train"|"metro"} [mode]
 */
export function resolveCatalogEntry(stationIdOrName, mode) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw) {
    return null;
  }
  if (mode === "train") {
    return resolveRailEntry(raw, UK_WEST_MIDLANDS_REGION);
  }
  if (mode === "metro") {
    return resolveMetroEntry(raw, UK_WEST_MIDLANDS_REGION);
  }
  // No mode given: rail-first ambiguous resolution, same order as
  // lib/providers/uk-darwin.js's own default region loop and East
  // Midlands' fetchStationBoard() dispatcher.
  return resolveRailEntry(raw, UK_WEST_MIDLANDS_REGION) ?? resolveMetroEntry(raw, UK_WEST_MIDLANDS_REGION);
}

/**
 * "London Euston (Avanti West Coast)" — matches how Darwin/real departure
 * boards present. Falls back to destination alone if Darwin ever omits an
 * operator tag (never fabricates one). Same shape as West of England's and
 * East Midlands' directionChip().
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

export function listUkWestMidlandsDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json. mode is included (unlike West of
  // England's single-mode list) so callers can disambiguate Birmingham New
  // Street (train) from Grand Central (metro) even though they don't share
  // a printed name — same list shape East Midlands used at Nottingham
  // Station's doNotGroup hub.
  return listRegionCatalogStations(UK_WEST_MIDLANDS_REGION).map((station) => ({
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
 * When a mode is given, this calls the mode-specific fetcher directly
 * instead of resolving through fetchDarwinStationBoard()'s own rail-first
 * ambiguous resolution — so an explicit metro-mode lookup always surfaces
 * the Metro layer's outcome (currently MissingTfwmCredentialsError) rather
 * than ever silently falling through to National Rail. With no mode given,
 * it falls back to rail-first resolution, same order as the shared
 * providers' own defaults.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "metro") {
    return fetchMetroStopBoard(station, { regionId: UK_WEST_MIDLANDS_REGION });
  }
  if (mode === "train") {
    return fetchDarwinStationBoard(station, { regionId: UK_WEST_MIDLANDS_REGION });
  }
  const rail = resolveRailEntry(station, UK_WEST_MIDLANDS_REGION);
  if (rail) {
    return fetchDarwinStationBoard(station, { regionId: UK_WEST_MIDLANDS_REGION });
  }
  const metro = resolveMetroEntry(station, UK_WEST_MIDLANDS_REGION);
  if (metro) {
    return fetchMetroStopBoard(station, { regionId: UK_WEST_MIDLANDS_REGION });
  }
  throw new Error(`Unknown West Midlands station: ${station}`);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, same
 * approach as West of England/East Midlands (no printed line map to union
 * against). Metro: fetchMetroStopBoard() throws MissingTfwmCredentialsError
 * before returning anything (credentials checked first) — not caught here,
 * see file header.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getUkWestMidlandsDogfoodDirections(station, { mode } = {}) {
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
    source: "uk-west-midlands-darwin-live",
  };
}

export async function getUkWestMidlandsDogfoodNextTrain({
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
    timeZone: UK_WEST_MIDLANDS_TIME_ZONE,
  });
}

export { MissingDarwinTokenError, MissingTfwmCredentialsError };
