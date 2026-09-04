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
 *
 * Direction hub anchoring (FB-51, docs/jim-brief-fb51-uk-hub-rollout.md):
 * East Midlands is the first region on the shared UK helper
 * (lib/cities/uk/direction-hubs.js, lifted out of uk-west-midlands's FB-50
 * work). lib/cities/east-midlands/direction-hubs.json curates a single
 * "Nottingham" hub for Alfreton/Chesterfield, and this module's exact-chip
 * path also resolves out-of-region termini (London St Pancras, Norwich,
 * Liverpool Lime Street, ...) via the national name->CRS index
 * (lib/cities/uk/rail-crs-index.js) rather than only the region's own
 * 6-station catalog — that national fallback is what lets the exact-chip
 * path fire at Nottingham Station itself (a fan-out hub whose real chips
 * are almost all out-of-region), fixing the sparse-results problem
 * diagnosed in docs/direction-hub-anchoring-issue.md.
 */
import {
  EAST_MIDLANDS_TIME_ZONE,
  EAST_MIDLANDS_REGION,
  fetchStationBoard,
  fetchNationalRailBoard,
  fetchNetStopBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/east-midlands.js";
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
    return fetchNetStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, same
 * approach as West of England (no printed line map to union against), then
 * post-processed by the shared hub helper (rail-only; a resolved CRS is
 * required, mirroring West Midlands). NET: always throws
 * NetFeedUnconfirmedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getEastMidlandsDogfoodDirections(station, { mode } = {}) {
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
      ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(EAST_MIDLANDS_REGION).hubs)
      : sorted;
  return {
    directions,
    source: "east-midlands-darwin-live",
  };
}

/**
 * Pure routing decision for getEastMidlandsDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback (what makes
 * the exact-chip path fire for East Midlands' mostly-out-of-region chips —
 * see the file header):
 *  - "hub": destination matches a hub label for this station's CRS (only
 *    Nottingham, from Alfreton/Chesterfield, in v1).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 6-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {"train"|"metro"|undefined} resolvedMode
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(EAST_MIDLANDS_REGION).hubs).
 */
export function planEastMidlandsNextTrainFetch(entry, resolvedMode, destination, hubs) {
  return planUkNextTrainFetch(entry, resolvedMode, destination, hubs, {
    regionId: EAST_MIDLANDS_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
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
  const resolvedMode = mode ?? entry?.mode;
  const plan = planEastMidlandsNextTrainFetch(
    entry,
    resolvedMode,
    destination,
    loadDirectionHubs(EAST_MIDLANDS_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry.name ?? station, plan.filterCrs, {
      regionId: EAST_MIDLANDS_REGION,
      numRows: 15,
    });
    return buildEastMidlandsNextTrainResponse({
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
      regionId: EAST_MIDLANDS_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildEastMidlandsNextTrainResponse({
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

  // Anything else (e.g. an unresolvable destination): current undirected
  // path, unchanged.
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildEastMidlandsNextTrainResponse({
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
 * Shared response builder for getEastMidlandsDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as West Midlands' buildHubNextTrainResponse(). For a hub chip this
 * is how a row can show "Nottingham · to Norwich"; for an exact chip
 * printedDestination equals destination and the render can omit showing it.
 */
function buildEastMidlandsNextTrainResponse({
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
    timeZone: EAST_MIDLANDS_TIME_ZONE,
  });
}
