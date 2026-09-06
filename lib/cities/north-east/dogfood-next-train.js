/**
 * North East (Tyne and Wear) next-train payload for production Vercel and
 * local dev.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-north-east-flip.md) — Mark/Tim's flip call, not made
 * here.
 *
 * Two agencies, two direction models, sharing one dispatcher
 * (lib/providers/north-east.js's fetchStationBoard(), reused verbatim — not
 * forked here):
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "north-east"): destination +
 *    operator (e.g. "Leeds (Northern)"), derived live from the board on
 *    every call — no printed National Rail route/line map exists, same
 *    reasoning and same approach as every other UK NR region (East
 *    Midlands, Greater Manchester, South Yorkshire, ...). Throws
 *    MissingDarwinTokenError until DARWIN_LDB_TOKEN exists — not caught
 *    here, same as every other UK region.
 *
 *  - Tyne and Wear Metro: OUT-PRODUCT (Tim, 5 Sep 2026 — see
 *    docs/jim-brief-north-east-metro-out-product.md and
 *    docs/united-kingdom-ledger.md §3/§4). No confirmed public real-time
 *    feed exists (the only candidate, metro-rti.nexus.org.uk, is
 *    undocumented/app-only); the static timetable inside the DfT BODS
 *    national archive is never fetched by the app, at request time or in
 *    any job. lib/cities/north-east/marketing-directions.js's line+terminus
 *    labels are a *design* artifact (used by the QA gate to prove the
 *    catalog/direction-model shape), not a confirmed schedule — treating
 *    them as dogfood output would fabricate live-looking data from a feed
 *    that does not exist. fetchMetroStopBoard() throws
 *    MetroFeedUnconfirmedError unconditionally; this module does not catch
 *    it, does not fall back to the static label list, and does not
 *    fabricate a schedule. Same shape as East Midlands' NET layer
 *    (NetFeedUnconfirmedError), Greater Manchester's Metrolink layer
 *    (MetrolinkFeedUnconfirmedError), and South Yorkshire's Supertram layer
 *    (SupertramFeedUnconfirmedError).
 *
 * Newcastle Central is a doNotGroup hub lock: the Metro Central deep-tube
 * box and National Rail main platforms are two catalog entries with
 * DIFFERENT printed names ("Newcastle Central" vs "Central Station") — no
 * name-collapse risk since the strings differ. This module never collapses
 * them — fetchStationBoard() resolves rail before metro (same order as
 * lib/providers/north-east.js's own dispatcher), so an ambiguous bare
 * "Newcastle Central" lookup resolves to the National Rail layer; callers
 * that need the Metro layer must resolve/pass the metro catalog entry
 * explicitly (mode: "metro", station "Central Station"), same
 * disambiguation the catalog itself already requires via
 * resolveCatalogEntry(name, mode).
 *
 * Sunderland is a genuinely different, NOT-doNotGroup case: Metro Green
 * Line and National Rail Northern Trains share the same platforms/track
 * Pelaw–Sunderland (SUNDERLAND_SHARED_PLATFORM in marketing-directions.js).
 * A real mixed board is not buildable end-to-end today (Metro has no
 * real-time feed at all), so this module still catalogs/dispatches
 * Sunderland as two mode-tagged entries — the shared-platform fact is
 * carried for a future board-merging pass, not built here.
 *
 * No direction-hubs.json ships for this region — the D1 pack names no
 * intermediate through-station candidate for a hub chip. loadDirectionHubs()
 * still runs (returns an empty hub list, a no-op) so this module matches
 * every other UK region's call shape exactly, and the exact-chip path
 * resolves out-of-region termini via the national name->CRS index
 * (lib/cities/uk/rail-crs-index.js) rather than only the region's own
 * 3-station rail catalog.
 */
import {
  NORTH_EAST_TIME_ZONE,
  NORTH_EAST_REGION,
  fetchStationBoard,
  fetchNationalRailBoard,
  fetchMetroStopBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/north-east.js";
import { fetchRegionalDepartureBoard } from "../../providers/uk-darwin.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  loadDirectionHubs,
  applyDirectionHubs,
  planUkNextTrainFetch,
} from "../uk/direction-hubs.js";
import { resolveCrsForName } from "../uk/rail-crs-index.js";

/**
 * "Leeds (Northern)" — matches how Darwin/real departure boards present.
 * Falls back to destination alone if Darwin ever omits an operator tag
 * (never fabricates one). Same shape as every other UK region's
 * directionChip().
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

export function listNorthEastDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json. mode is included because Newcastle
  // Central's doNotGroup hub lock needs it to disambiguate the two catalog
  // entries.
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
 * Newcastle Central's doNotGroup hub lock means the same physical hub
 * resolves to two different catalog entries by mode with different printed
 * names — passing the resolved name back into fetchStationBoard() would
 * re-run the SAME rail-first resolution the provider's own dispatcher uses
 * (see lib/providers/north-east.js), silently discarding an explicit metro
 * disambiguation. When a mode is given, this calls the mode-specific
 * fetcher directly. With no mode given (the common single-layer case, or a
 * bare production lookup), it falls back to fetchStationBoard()'s own
 * rail-first ambiguous resolution.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "train") {
    return fetchNationalRailBoard(station);
  }
  if (mode === "metro") {
    return fetchMetroStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, then
 * post-processed by the shared hub helper (rail-only; a no-op here since no
 * direction-hubs.json exists — see file header). Metro: always throws
 * MetroFeedUnconfirmedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getNorthEastDogfoodDirections(station, { mode } = {}) {
  const entry = resolveCatalogEntry(station, mode);
  const resolvedMode = mode ?? entry?.mode;
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const chips = new Set();
  for (const trip of board.trips ?? []) {
    const chip = directionChip(trip);
    if (chip) {
      chips.add(chip);
    }
  }
  const sorted = [...chips].sort((a, b) => a.localeCompare(b));
  const directions =
    resolvedMode !== "metro" && entry?.crs
      ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(NORTH_EAST_REGION).hubs)
      : sorted;
  return {
    directions,
    source: "north-east-darwin-live",
  };
}

/**
 * Pure routing decision for getNorthEastDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table with a fixture, without a Darwin token. Thin wrapper over the shared
 * lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(), with the
 * national rail-crs-index as the exact-chip fallback:
 *  - "hub": never fires here (no direction-hubs.json for this region).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own rail catalog or the national index.
 *  - "undirected": anything else (unresolvable destination, or metro mode)
 *    — the original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {"train"|"metro"|undefined} resolvedMode
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(NORTH_EAST_REGION).hubs).
 */
export function planNorthEastNextTrainFetch(entry, resolvedMode, destination, hubs) {
  return planUkNextTrainFetch(entry, resolvedMode, destination, hubs, {
    regionId: NORTH_EAST_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getNorthEastDogfoodNextTrain({
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
  const resolvedMode = mode ?? entry?.mode;
  const plan = planNorthEastNextTrainFetch(
    entry,
    resolvedMode,
    destination,
    loadDirectionHubs(NORTH_EAST_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Unreachable today (no hub file) but
    // kept so the module matches the shared UK call shape exactly.
    const board = await fetchRegionalDepartureBoard(entry.name ?? station, plan.filterCrs, {
      regionId: NORTH_EAST_REGION,
      numRows: 15,
    });
    return buildNorthEastNextTrainResponse({
      board,
      station,
      destination,
      destinationLabel,
      leaveBeforeMinutes,
      refreshSeconds,
      skipTrains,
      now,
    });
  }

  if (plan.kind === "exact") {
    // Exact chip whose printed destination resolves to a CRS (region
    // catalog first, then the national index): fetch server-side filtered
    // to that CRS, then keep the operator match client-side (Darwin's
    // filterCrs doesn't know about operator).
    const board = await fetchRegionalDepartureBoard(entry.name ?? station, plan.filterCrs, {
      regionId: NORTH_EAST_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildNorthEastNextTrainResponse({
      board: { ...board, trips: matching },
      station,
      destination,
      destinationLabel,
      leaveBeforeMinutes,
      refreshSeconds,
      skipTrains,
      now,
    });
  }

  // Anything else (unresolvable destination, or the Metro layer — which
  // throws MetroFeedUnconfirmedError inside fetchBoardForMode, surfaced to
  // the caller): current undirected path, unchanged.
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildNorthEastNextTrainResponse({
    board: { ...board, trips: matching },
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
 * Shared response builder for getNorthEastDogfoodNextTrain()'s three paths.
 * Remaps each trip's destination to the chosen chip but keeps the
 * Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region.
 */
function buildNorthEastNextTrainResponse({
  board,
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains,
  now,
}) {
  const remapped = (board.trips ?? []).map((trip) => ({
    ...trip,
    printedDestination: trip.destination,
    destination,
  }));
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
    timeZone: NORTH_EAST_TIME_ZONE,
  });
}
