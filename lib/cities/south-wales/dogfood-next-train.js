/**
 * South Wales next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "south-wales") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/south-wales.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region. Re-scope 7 Sep 2026 (docs/south-wales-d1/jim-handoff.md):
 * Transport for Wales Valley Lines is now IN-CATALOG via Darwin (confirmed
 * live-probed 5 Sep 2026, all 16 catalog CRS codes) — no separate path is
 * needed here since Valley Lines departures come off the same
 * fetchStationBoard() as mainline (Cardiff Central's board is
 * operator-mixed).
 *
 * Registry status is `live` — this region was already flipped before this
 * re-scope; this module change is a catalog extension, not a flip.
 *
 * Direction model is destination + operator (e.g. "London Paddington
 * (GWR)") for mainline, matching how National Rail departure boards
 * actually present (docs/south-wales-d1/direction-model-memo.md); line +
 * terminus (termini-only) for Valley Lines. Directions are derived live
 * from the board itself on every call — no printed route/line map exists
 * for Darwin, same approach as every other UK National Rail region in this
 * pipeline.
 *
 * No direction hub anchoring: 16 flat catalog entries (hub Cardiff
 * Central, secondary hub Cardiff Queen Street, plus mainline/branch/Valley
 * Lines termini) with no intermediate through-station identified to anchor
 * riders on. loadDirectionHubs() still runs (returns an empty hub list, a
 * no-op) so this module matches every other UK region's call shape exactly
 * — no south-wales/direction-hubs.json exists and none is needed until a
 * hub candidate is identified.
 */
import {
  SOUTH_WALES_REGION,
  SOUTH_WALES_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/south-wales.js";
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
 * "London Paddington (GWR)" — matches how Darwin/real departure boards
 * present. Falls back to destination alone if Darwin ever omits an operator
 * tag (never fabricates one).
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

export function listSouthWalesDogfoodStations() {
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
 * helper (a no-op everywhere in this 2-station catalog, since no
 * south-wales/direction-hubs.json exists — see file header).
 * @param {string} station
 */
export async function getSouthWalesDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(SOUTH_WALES_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "south-wales-darwin-live",
  };
}

/**
 * Pure routing decision for getSouthWalesDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (no hub
 *    configured anywhere in this catalog, so this branch never fires today
 *    — kept for parity with every other UK region's call shape).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 2-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(SOUTH_WALES_REGION).hubs).
 */
export function planSouthWalesNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: SOUTH_WALES_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getSouthWalesDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planSouthWalesNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(SOUTH_WALES_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Dead branch today (no hub
    // configured), kept for parity with every other UK region.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: SOUTH_WALES_REGION,
      numRows: 15,
    });
    return buildSouthWalesNextTrainResponse({
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
      regionId: SOUTH_WALES_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildSouthWalesNextTrainResponse({
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
  return buildSouthWalesNextTrainResponse({
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
 * Shared response builder for getSouthWalesDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as every other UK region's dogfood response builder.
 */
function buildSouthWalesNextTrainResponse({
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
    timeZone: SOUTH_WALES_TIME_ZONE,
  });
}
