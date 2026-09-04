/**
 * Solent next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "solent") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/solent.js file
 * header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region.
 *
 * Direction model is destination + operator (e.g. "Cardiff Central (Great
 * Western Railway)"), matching how National Rail departure boards actually
 * present (docs/solent-d1/direction-model-memo.md). Directions are derived
 * live from the board itself on every call — no printed route/line map
 * exists for Darwin, same approach as every other UK National Rail region
 * in this pipeline.
 *
 * TWO-HUB architecture: Southampton Central (SOU) and Portsmouth Harbour
 * (PMH, with Portsmouth & Southsea PMS as a secondary board) are
 * independent — see lib/providers/solent.js file header. This module does
 * not merge them; each resolves to its own catalog entry/CRS and fetches
 * its own board.
 *
 * Direction hub anchoring (lib/cities/uk/direction-hubs.js): WIRED for
 * Fareham (FRM) only, one hub. All seven catalogued stations' live chip
 * sets were probed on 5 Sep 2026 (scripts/probe-uk-board.mjs, see the
 * adapter PR and docs/solent-d1/jim-handoff.md "Adapter wired" section for
 * the full tables) for the two candidates the brief named: an operator
 * split on "Portsmouth Harbour" or "Southampton Central" at
 * Fareham/Eastleigh (Liverpool shape), and a through-service past
 * Southampton Central to an unrecognisable terminus from Eastleigh
 * (Kidderminster shape). Only the first candidate held, and only at
 * Fareham — but it held for BOTH "Portsmouth Harbour" and "Southampton
 * Central" simultaneously, which the shared uk/direction-hubs.js helper
 * cannot express (findHubForStation() returns only the first configured
 * hub whose appliesFrom includes a given CRS, so one station can carry at
 * most one hub). Portsmouth Harbour is the one built (named first in the
 * brief's candidate list, evidence otherwise symmetric); Southampton
 * Central's identical operator split at Fareham stays uncollapsed
 * (functionally correct via the exact-chip path, just shown as two
 * operator-suffixed chips instead of one) — flagged as an infra limitation
 * for Tim/Luke in direction-hubs.json's notes, not resolved here (editing
 * lib/cities/uk/* is out of scope for this pack). Eastleigh showed no
 * operator split (single operator per terminus) and no calls-at-SOU
 * evidence for the proposed west-of-Southampton termini, so neither
 * candidate applies there — see lib/cities/solent/direction-hubs.json for
 * the full evidence trail. loadDirectionHubs() returns the one
 * Fareham-only hub above; every other station's applyDirectionHubs() call
 * is a no-op sort, same as a region with no direction-hubs.json at all.
 * The exact-chip path (via the national name->CRS index,
 * lib/cities/uk/rail-crs-index.js) still applies to any destination
 * outside this 7-station catalog.
 */
import {
  SOLENT_REGION,
  SOLENT_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/solent.js";
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
 * "Cardiff Central (Great Western Railway)" — matches how Darwin/real
 * departure boards present. Falls back to destination alone if Darwin ever
 * omits an operator tag (never fabricates one).
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

export function listSolentDogfoodStations() {
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
 * corridor (see file header) — then post-processed by the shared hub
 * helper (a no-op everywhere except Fareham, where the two operator-split
 * hubs apply — see file header and direction-hubs.json).
 * @param {string} station
 */
export async function getSolentDogfoodDirections(station) {
  const entry = resolveCatalogEntry(station);
  const board = await fetchStationBoard(entry?.name ?? station);
  const chips = new Set();
  for (const trip of board.trips ?? []) {
    const chip = directionChip(trip);
    if (chip) {
      chips.add(chip);
    }
  }
  const sorted = [...chips].sort((a, b) => a.localeCompare(b));
  const directions = entry?.crs
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(SOLENT_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "solent-darwin-live",
  };
}

/**
 * Pure routing decision for getSolentDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (only
 *    Fareham has hubs configured — "Portsmouth Harbour" and "Southampton
 *    Central" — see direction-hubs.json).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 7-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(SOLENT_REGION).hubs).
 */
export function planSolentNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: SOLENT_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getSolentDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planSolentNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(SOLENT_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: SOLENT_REGION,
      numRows: 15,
    });
    return buildSolentNextTrainResponse({
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
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: SOLENT_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildSolentNextTrainResponse({
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
  const board = await fetchStationBoard(entry?.name ?? station);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildSolentNextTrainResponse({
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
 * Shared response builder for getSolentDogfoodNextTrain()'s three paths.
 * Remaps each trip's destination to the chosen chip (as before) but keeps
 * the Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region's dogfood response builder.
 */
function buildSolentNextTrainResponse({
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
    timeZone: SOLENT_TIME_ZONE,
  });
}
