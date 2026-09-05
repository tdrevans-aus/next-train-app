/**
 * Greater Manchester next-train payload for production Vercel and local dev.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-greater-manchester-flip.md) — Mark/Tim's flip call,
 * not made here.
 *
 * Two agencies, two direction models, sharing one dispatcher
 * (lib/providers/greater-manchester.js's fetchStationBoard(), reused
 * verbatim — not forked here):
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "greater-manchester"):
 *    destination + operator (e.g. "Leeds (TransPennine Express)"), derived
 *    live from the board on every call — no printed National Rail
 *    route/line map exists, same reasoning and same approach as West of
 *    England / East Midlands. Throws MissingDarwinTokenError until
 *    DARWIN_LDB_TOKEN exists — not caught here, same as every other UK
 *    region. Two hub locks, Manchester Piccadilly (MAN, all six TOCs) and
 *    Manchester Victoria (MCV, Northern + TPE) — see the provider file
 *    header for why this is NOT a single-Victoria hub lock.
 *
 *  - Metrolink tram: no confirmed real-time feed (TfGM developer portal
 *    deprecated, no new keys; docs/united-kingdom-ledger.md records
 *    "none confirmed"). lib/cities/greater-manchester/marketing-directions.js's
 *    line+terminus labels are a *design* artifact (used by the gate to prove
 *    the catalog/direction-model shape), not a confirmed schedule — treating
 *    them as dogfood output would fabricate live-looking data from an
 *    unconfirmed feed. fetchMetrolinkStopBoard() throws
 *    MetrolinkFeedUnconfirmedError unconditionally; this module does not
 *    catch it, does not fall back to the static label list, and does not
 *    fabricate a schedule. Same shape as East Midlands' NET layer
 *    (NetFeedUnconfirmedError) and West Midlands' Metro layer
 *    (MissingTfwmCredentialsError). Closing the feed gap is explicitly out
 *    of scope for this pass.
 *
 * Manchester Victoria is a doNotGroup shared-building station: the
 * Metrolink and National Rail layers are two separate catalog entries with
 * the SAME printed name but different `mode` ("metro" vs "train"). This
 * module never collapses them — fetchStationBoard() resolves rail before
 * metro (same order as lib/providers/greater-manchester.js's own
 * dispatcher), so an ambiguous bare "Manchester Victoria" lookup resolves
 * to the National Rail layer; callers that need the tram layer must pass
 * mode: "metro" explicitly, same disambiguation the catalog itself already
 * requires via resolveCatalogEntry(name, mode). Manchester Piccadilly
 * (train) and Piccadilly Gardens (metro) are different printed names, so
 * they need no mode hint to disambiguate.
 *
 * No direction-hubs.json ships for this region — both National Rail hub
 * locks ARE themselves the anchors a rider selects, and the D1 pack names
 * no intermediate through-station candidate (unlike East Midlands'
 * Alfreton/Chesterfield -> Nottingham). loadDirectionHubs() still runs
 * (returns an empty hub list, a no-op) so this module matches every other
 * UK region's call shape exactly, and the exact-chip path resolves
 * out-of-region termini (London Euston, Leeds, Glasgow Central, ...) via
 * the national name->CRS index (lib/cities/uk/rail-crs-index.js) rather
 * than only the region's own 4-station rail catalog.
 */
import {
  GREATER_MANCHESTER_TIME_ZONE,
  GREATER_MANCHESTER_REGION,
  fetchStationBoard,
  fetchNationalRailBoard,
  fetchMetrolinkStopBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/greater-manchester.js";
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
 * "Leeds (TransPennine Express)" — matches how Darwin/real departure boards
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

export function listGreaterManchesterDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // Coords belong on stations.json. mode is included because Manchester
  // Victoria's doNotGroup shared-building lock needs it to disambiguate the
  // two catalog entries with the same name.
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
 * Manchester Victoria's doNotGroup lock means the same printed name
 * resolves to two different catalog entries by mode — passing the resolved
 * name back into fetchStationBoard() would re-run the SAME ambiguous,
 * rail-first resolution the provider's own dispatcher uses, silently
 * discarding an explicit metro disambiguation. When a mode is given, this
 * calls the mode-specific fetcher directly. With no mode given, it falls
 * back to fetchStationBoard()'s own rail-first ambiguous resolution.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "train") {
    return fetchNationalRailBoard(station);
  }
  if (mode === "metro") {
    return fetchMetrolinkStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * National Rail: destination+operator chips derived live from Darwin, then
 * post-processed by the shared hub helper (rail-only; a no-op here since no
 * direction-hubs.json exists — see file header). Metrolink: always throws
 * MetrolinkFeedUnconfirmedError — see file header; not caught here.
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getGreaterManchesterDogfoodDirections(station, { mode } = {}) {
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
      ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(GREATER_MANCHESTER_REGION).hubs)
      : sorted;
  return {
    directions,
    source: "greater-manchester-darwin-live",
  };
}

/**
 * Pure routing decision for getGreaterManchesterDogfoodNextTrain() —
 * exported separately (no fetch inside it) so the QA gate can assert the
 * branching table with a fixture, without a Darwin token. Thin wrapper over
 * the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(), with
 * the national rail-crs-index as the exact-chip fallback:
 *  - "hub": never fires here (no direction-hubs.json for this region).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own rail catalog or the national index.
 *  - "undirected": anything else (unresolvable destination, or metro mode)
 *    — the original undirected-fetch-then-client-filter path.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {"train"|"metro"|undefined} resolvedMode
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(GREATER_MANCHESTER_REGION).hubs).
 */
export function planGreaterManchesterNextTrainFetch(entry, resolvedMode, destination, hubs) {
  return planUkNextTrainFetch(entry, resolvedMode, destination, hubs, {
    regionId: GREATER_MANCHESTER_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getGreaterManchesterDogfoodNextTrain({
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
  const plan = planGreaterManchesterNextTrainFetch(
    entry,
    resolvedMode,
    destination,
    loadDirectionHubs(GREATER_MANCHESTER_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Unreachable today (no hub file) but
    // kept so the module matches the shared UK call shape exactly.
    const board = await fetchRegionalDepartureBoard(entry.name ?? station, plan.filterCrs, {
      regionId: GREATER_MANCHESTER_REGION,
      numRows: 15,
    });
    return buildGreaterManchesterNextTrainResponse({
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
      regionId: GREATER_MANCHESTER_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildGreaterManchesterNextTrainResponse({
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

  // Anything else (unresolvable destination, or the Metrolink layer — which
  // throws MetrolinkFeedUnconfirmedError inside fetchBoardForMode, surfaced
  // to the caller): current undirected path, unchanged.
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildGreaterManchesterNextTrainResponse({
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
 * Shared response builder for getGreaterManchesterDogfoodNextTrain()'s
 * three paths. Remaps each trip's destination to the chosen chip but keeps
 * the Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region.
 */
function buildGreaterManchesterNextTrainResponse({
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
    timeZone: GREATER_MANCHESTER_TIME_ZONE,
  });
}
