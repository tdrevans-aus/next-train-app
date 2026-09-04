/**
 * Greater Anglia next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "greater-anglia") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/greater-anglia.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region.
 *
 * Direction model is destination + operator (e.g. "London Liverpool Street
 * (Greater Anglia)"), matching how National Rail departure boards actually
 * present (docs/greater-anglia-d1/direction-model-memo.md). Directions are
 * derived live from the board itself on every call — no printed route/line
 * map exists for Darwin, same approach as every other UK National Rail
 * region in this pipeline.
 *
 * HUB + TWO CO-EQUAL SECONDARY HUBS: Norwich (NRW) is the hub lock.
 * Cambridge (CBG) and Ipswich (IPS) are both kept as secondary hubs — the
 * oracle report gives both identical hub-tier language (unlike West of
 * England/Solent/Thames Valley's single-secondary-hub shape). Peterborough
 * (PBO) is a flat through-running boundary entry, not a hub or a
 * doNotGroup group — every operator that calls there (Greater Anglia,
 * Thameslink, CrossCountry, East Midlands, LNER) is board-eligibility `in`,
 * so no operator-level filtering is applied at all. LNER's verdict was
 * undecided at D1 and resolved to `in` 5 Sep 2026 (see
 * lib/providers/greater-anglia.js file header) — Peterborough's earlier
 * excludeOperators boundary is removed, confirmed live (London Kings Cross,
 * Edinburgh, Leeds all appear).
 *
 * Direction hub anchoring (lib/cities/uk/direction-hubs.js): WIRED for
 * Thetford (TTF) and Ely (ELY) — one "Norwich" hub. Both stations' live
 * boards print "Norwich" under both East Midlands Railway and Greater
 * Anglia (operator-split Liverpool shape, live-probed 5 Sep 2026, see
 * docs/greater-anglia-d1/jim-handoff.md "Adapter wired" section and
 * lib/cities/greater-anglia/direction-hubs.json for the full evidence
 * trail, including a second operator-split candidate on "Cambridge" at Ely
 * that the shared helper's one-hub-per-station limitation prevents building
 * alongside Norwich). Every other station's applyDirectionHubs() call is a
 * no-op sort. The exact-chip path (via the national name->CRS index,
 * lib/cities/uk/rail-crs-index.js) still applies to any destination outside
 * this 14-station catalog.
 */
import {
  GREATER_ANGLIA_REGION,
  GREATER_ANGLIA_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/greater-anglia.js";
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
 * "London Liverpool Street (Greater Anglia)" — matches how Darwin/real
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

export function listGreaterAngliaDogfoodStations() {
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
 * helper (a no-op everywhere except Thetford/Ely, where the Norwich hub
 * applies — see file header and direction-hubs.json).
 * @param {string} station
 */
export async function getGreaterAngliaDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(GREATER_ANGLIA_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "greater-anglia-darwin-live",
  };
}

/**
 * Pure routing decision for getGreaterAngliaDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (only
 *    Thetford/Ely have a hub configured — "Norwich" — see
 *    direction-hubs.json).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 14-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(GREATER_ANGLIA_REGION).hubs).
 */
export function planGreaterAngliaNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: GREATER_ANGLIA_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getGreaterAngliaDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planGreaterAngliaNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(GREATER_ANGLIA_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: GREATER_ANGLIA_REGION,
      numRows: 15,
    });
    return buildGreaterAngliaNextTrainResponse({
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
      regionId: GREATER_ANGLIA_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildGreaterAngliaNextTrainResponse({
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
  return buildGreaterAngliaNextTrainResponse({
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
 * Shared response builder for getGreaterAngliaDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as every other UK region's dogfood response builder.
 */
function buildGreaterAngliaNextTrainResponse({
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
    timeZone: GREATER_ANGLIA_TIME_ZONE,
  });
}
