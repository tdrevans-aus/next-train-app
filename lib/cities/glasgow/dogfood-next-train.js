/**
 * Glasgow next-train payload for production Vercel and local dev.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring pass,
 * docs/jim-brief-glasgow-flip.md) — Mark/Tim's flip call, not made here.
 *
 * Two independent networks under one city id, sharing one dispatcher
 * (lib/providers/glasgow.js's fetchStationBoard(), reused verbatim — not
 * forked here):
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "glasgow"): destination +
 *    operator (e.g. "Edinburgh Waverley (ScotRail)"), derived live from the
 *    board on every call — no printed National Rail route/line map exists,
 *    same reasoning and same approach as every other UK NR region (East
 *    Midlands, South Yorkshire, Greater Manchester, ...). Two independent
 *    termini, no single hub-lock ("Option A at n=2", see
 *    lib/providers/glasgow.js file header / docs/glasgow-d1/jim-handoff.md)
 *    — Glasgow Central (GLC) and Glasgow Queen Street (GLQ) are each their
 *    own catalog entry, resolved and fetched independently; this module does
 *    not force either through a shared hub. No direction-hubs.json ships for
 *    this region (no intermediate through-station candidate identified,
 *    same as South Yorkshire) — loadDirectionHubs() still runs (returns an
 *    empty hub list, a no-op) so this module matches every other UK region's
 *    call shape exactly, and the exact-chip path resolves out-of-region
 *    termini via the national name->CRS index
 *    (lib/cities/uk/rail-crs-index.js). Throws MissingDarwinTokenError until
 *    DARWIN_LDB_TOKEN exists — not caught here, same as every other UK
 *    region.
 *
 *  - Glasgow Subway (SPT): no confirmed GTFS-RT feed exists, and the static
 *    candidate (TravelWhiz community aggregation) has an unverified stop
 *    order and an unclear license on the underlying SPT timetable data (see
 *    lib/providers/glasgow.js file header). fetchSubwayStopBoard() throws
 *    GlasgowSubwayFeedUnverifiedError unconditionally; this module does not
 *    catch it, does not fall back to the static Outer/Inner Circle label
 *    list, and does not fabricate a schedule — same "throw, don't guess"
 *    contract as East Midlands' NetFeedUnconfirmedError / South Yorkshire's
 *    SupertramFeedUnconfirmedError / Greater Manchester's
 *    MetrolinkFeedUnconfirmedError, for an adjacent but distinct reason (a
 *    reachable source exists; what's missing is a verified stop order and a
 *    clear license, not the absence of any source at all). The National
 *    Rail layer is what the dogfood gate proves live; Subway only proves it
 *    surfaces its documented error class. Do not resolve the Subway license
 *    question here — Tim's call, carried in docs/glasgow-d1/jim-handoff.md.
 *
 * Buchanan Street (Subway hub) vs Glasgow Queen Street, and St Enoch
 * (Subway) vs Glasgow Central, are doNotGroup pairs enforced structurally by
 * the shared catalog (lib/providers/uk/catalog.js) — distinct catalog
 * entries by mode, never merged despite the short walk/travelator
 * connection. resolveCatalogEntry(name, mode) requires the caller to
 * disambiguate by mode when a name could plausibly mean either network;
 * fetchStationBoard() (the bare dispatcher) resolves rail before metro, same
 * order as every other two-layer UK region's own provider dispatcher.
 */
import {
  GLASGOW_TIME_ZONE,
  GLASGOW_REGION,
  fetchStationBoard,
  fetchNationalRailBoard,
  fetchSubwayStopBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/glasgow.js";
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
 * "Edinburgh Waverley (ScotRail)" — matches how Darwin/real departure boards
 * present. Falls back to destination alone if Darwin ever omits an operator
 * tag (never fabricates one). Same shape as every other UK region's
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

export function listGlasgowDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json. mode is included because the
  // Buchanan Street/Glasgow Queen Street and St Enoch/Glasgow Central
  // doNotGroup pairs need it to disambiguate catalog entries.
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
 * When a mode is given, this calls the mode-specific fetcher directly. With
 * no mode given (the common single-layer case, or a bare production
 * lookup), it falls back to fetchStationBoard()'s own rail-first ambiguous
 * resolution — same order as lib/providers/glasgow.js's own dispatcher.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "train") {
    return fetchNationalRailBoard(station);
  }
  if (mode === "metro") {
    return fetchSubwayStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, then
 * post-processed by the shared hub helper (rail-only; a no-op here since no
 * direction-hubs.json exists — see file header). Subway: always throws
 * GlasgowSubwayFeedUnverifiedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getGlasgowDogfoodDirections(station, { mode } = {}) {
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
      ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(GLASGOW_REGION).hubs)
      : sorted;
  return {
    directions,
    source: "glasgow-darwin-live",
  };
}

/**
 * Pure routing decision for getGlasgowDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table with a fixture, without a Darwin token. Thin wrapper over the shared
 * lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(), with the
 * national rail-crs-index as the exact-chip fallback:
 *  - "hub": never fires here (no direction-hubs.json for this region — two
 *    independent termini, "Option A at n=2", not a hub-and-satellite shape).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own rail catalog (GLC/GLQ) or the national index.
 *  - "undirected": anything else (unresolvable destination, or metro mode)
 *    — the original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {"train"|"metro"|undefined} resolvedMode
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(GLASGOW_REGION).hubs).
 */
export function planGlasgowNextTrainFetch(entry, resolvedMode, destination, hubs) {
  return planUkNextTrainFetch(entry, resolvedMode, destination, hubs, {
    regionId: GLASGOW_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getGlasgowDogfoodNextTrain({
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
  const plan = planGlasgowNextTrainFetch(
    entry,
    resolvedMode,
    destination,
    loadDirectionHubs(GLASGOW_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Unreachable today (no hub file) but
    // kept so the module matches the shared UK call shape exactly.
    const board = await fetchRegionalDepartureBoard(entry.name ?? station, plan.filterCrs, {
      regionId: GLASGOW_REGION,
      numRows: 15,
    });
    return buildGlasgowNextTrainResponse({
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
      regionId: GLASGOW_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildGlasgowNextTrainResponse({
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

  // Anything else (unresolvable destination, or the Subway layer — which
  // throws GlasgowSubwayFeedUnverifiedError inside fetchBoardForMode,
  // surfaced to the caller): current undirected path, unchanged.
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildGlasgowNextTrainResponse({
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
 * Shared response builder for getGlasgowDogfoodNextTrain()'s three paths.
 * Remaps each trip's destination to the chosen chip but keeps the
 * Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region.
 */
function buildGlasgowNextTrainResponse({
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
    timeZone: GLASGOW_TIME_ZONE,
  });
}
