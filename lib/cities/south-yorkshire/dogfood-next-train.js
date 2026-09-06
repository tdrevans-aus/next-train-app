/**
 * South Yorkshire next-train payload for production Vercel and local dev.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-south-yorkshire-flip.md) — Mark/Tim's flip call, not
 * made here.
 *
 * Two agencies, two direction models, sharing one dispatcher
 * (lib/providers/south-yorkshire.js's fetchStationBoard(), reused verbatim —
 * not forked here):
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "south-yorkshire"):
 *    destination + operator (e.g. "Leeds (Northern)"), derived live from the
 *    board on every call — no printed National Rail route/line map exists,
 *    same reasoning and same approach as every other UK NR region (East
 *    Midlands, Greater Manchester, ...). Throws MissingDarwinTokenError
 *    until DARWIN_LDB_TOKEN exists — not caught here, same as every other UK
 *    region.
 *
 *  - Sheffield Supertram: SYFTL (South Yorkshire Future Tram Limited) took
 *    over from Stagecoach on 22 Mar 2024 and no public GTFS/GTFS-RT feed has
 *    been confirmed since (see lib/providers/south-yorkshire.js file
 *    header). lib/cities/south-yorkshire/marketing-directions.js's
 *    line+terminus labels are a *design* artifact (used by the QA gate to
 *    prove the catalog/direction-model shape), not a confirmed schedule —
 *    treating them as dogfood output would fabricate live-looking data from
 *    an unconfirmed feed. fetchSupertramStopBoard() throws
 *    SupertramFeedUnconfirmedError unconditionally; this module does not
 *    catch it, does not fall back to the static label list, and does not
 *    fabricate a schedule. Same shape as East Midlands' NET layer
 *    (NetFeedUnconfirmedError) and Greater Manchester's Metrolink layer
 *    (MetrolinkFeedUnconfirmedError). Closing the feed gap is explicitly out
 *    of scope for this pass.
 *
 * Sheffield Station is a doNotGroup hub lock: the Supertram tram viaduct and
 * National Rail main platforms are two separate catalog entries with the
 * SAME printed name but different `mode` ("metro" vs "train"). This module
 * never collapses them — fetchStationBoard() resolves rail before metro
 * (same order as lib/providers/south-yorkshire.js's own dispatcher), so an
 * ambiguous bare "Sheffield Station" lookup resolves to the National Rail
 * layer; callers that need the tram layer must resolve/pass the metro
 * catalog entry explicitly (mode: "metro"), same disambiguation the catalog
 * itself already requires via resolveCatalogEntry(name, mode).
 *
 * Meadowhall Interchange (National Rail, MHS) / Meadowhall (Supertram) is a
 * second, distinct doNotGroup-by-mode pair, but NOT a second hub lock —
 * Supertram Tram-Train switches onto National Rail infrastructure here to
 * continue toward Rotherham Central and Parkgate, a through-running /
 * infrastructure-switch point rather than a parent hub (see
 * docs/south-yorkshire-d1/hazard-pack.md H1/H4/H6).
 *
 * No direction-hubs.json ships for this region — the D1 pack names no
 * intermediate through-station candidate for a hub chip (unlike East
 * Midlands' Alfreton/Chesterfield -> Nottingham). loadDirectionHubs() still
 * runs (returns an empty hub list, a no-op) so this module matches every
 * other UK region's call shape exactly, and the exact-chip path resolves
 * out-of-region termini via the national name->CRS index
 * (lib/cities/uk/rail-crs-index.js) rather than only the region's own
 * 6-station rail catalog.
 */
import {
  SOUTH_YORKSHIRE_TIME_ZONE,
  SOUTH_YORKSHIRE_REGION,
  fetchStationBoard,
  fetchNationalRailBoard,
  fetchSupertramStopBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/south-yorkshire.js";
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

export function listSouthYorkshireDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json. mode is included because Sheffield
  // Station's doNotGroup hub lock needs it to disambiguate the two catalog
  // entries with the same name.
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
 * Sheffield Station's doNotGroup hub lock means the same printed name
 * resolves to two different catalog entries by mode — passing the resolved
 * name back into fetchStationBoard() would re-run the SAME ambiguous,
 * rail-first resolution the provider's own dispatcher uses (see
 * lib/providers/south-yorkshire.js), silently discarding an explicit metro
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
    return fetchSupertramStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, then
 * post-processed by the shared hub helper (rail-only; a no-op here since no
 * direction-hubs.json exists — see file header). Supertram: always throws
 * SupertramFeedUnconfirmedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getSouthYorkshireDogfoodDirections(station, { mode } = {}) {
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
      ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(SOUTH_YORKSHIRE_REGION).hubs)
      : sorted;
  return {
    directions,
    source: "south-yorkshire-darwin-live",
  };
}

/**
 * Pure routing decision for getSouthYorkshireDogfoodNextTrain() — exported
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
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(SOUTH_YORKSHIRE_REGION).hubs).
 */
export function planSouthYorkshireNextTrainFetch(entry, resolvedMode, destination, hubs) {
  return planUkNextTrainFetch(entry, resolvedMode, destination, hubs, {
    regionId: SOUTH_YORKSHIRE_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getSouthYorkshireDogfoodNextTrain({
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
  const plan = planSouthYorkshireNextTrainFetch(
    entry,
    resolvedMode,
    destination,
    loadDirectionHubs(SOUTH_YORKSHIRE_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Unreachable today (no hub file) but
    // kept so the module matches the shared UK call shape exactly.
    const board = await fetchRegionalDepartureBoard(entry.name ?? station, plan.filterCrs, {
      regionId: SOUTH_YORKSHIRE_REGION,
      numRows: 15,
    });
    return buildSouthYorkshireNextTrainResponse({
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
      regionId: SOUTH_YORKSHIRE_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildSouthYorkshireNextTrainResponse({
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

  // Anything else (unresolvable destination, or the Supertram layer — which
  // throws SupertramFeedUnconfirmedError inside fetchBoardForMode, surfaced
  // to the caller): current undirected path, unchanged.
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildSouthYorkshireNextTrainResponse({
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
 * Shared response builder for getSouthYorkshireDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip but keeps the
 * Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region.
 */
function buildSouthYorkshireNextTrainResponse({
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
    timeZone: SOUTH_YORKSHIRE_TIME_ZONE,
  });
}
