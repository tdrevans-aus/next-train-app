/**
 * Southwest next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "southwest") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/southwest.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-southwest-flip.md) — Mark/Tim's flip call, not made
 * here.
 *
 * Direction model is destination + operator (e.g. "London Paddington
 * (GWR)", "Nottingham (CrossCountry)"), matching how National Rail
 * departure boards actually present (docs/southwest-d1/
 * direction-model-memo.md). Directions are derived live from the board
 * itself on every call — no printed route/line map exists for Darwin, same
 * approach as every other UK National Rail region in this pipeline.
 *
 * Night Riviera Sleeper (out-reservation, per docs/board-eligibility-rule.md)
 * is excluded from the board at Exeter St Davids, Plymouth, Truro,
 * St Austell, St Erth, and Penzance specifically — enforced inside
 * lib/providers/southwest.js's fetchStationBoard()/fetchNationalRailBoard()
 * (which this module imports and calls unchanged), not duplicated here.
 * Taunton, Newton Abbot, and Totnes are not in the excluded set — Night
 * Riviera Sleeper does not call at any of them within this catalog.
 *
 * Hub lock: Exeter St Davids (EXD). Secondary hub: Plymouth (PLY).
 * Terminus: Penzance (PNZ). No doNotGroup at any of the three (D1 pack,
 * hazard-pack.md H1/H4/H6) — single-layer, GWR-dominated, same simple hub
 * structure as West of England's Bristol Temple Meads/Bath Spa pair,
 * extended with a terminus node for Penzance.
 *
 * No direction-hubs.json ships for this region — no intermediate
 * through-station anchoring candidate was identified in the D1 pack (each
 * of the hub/secondary hub/terminus is itself the anchor a rider selects),
 * the same shape as South Wales' single Cardiff Central hub and Rest of
 * Scotland's four co-equal hubs. loadDirectionHubs() still runs (returns an
 * empty hub list, a no-op) so this module matches every other UK region's
 * call shape exactly.
 */
import {
  SOUTHWEST_REGION,
  SOUTHWEST_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/southwest.js";
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
 * present. Falls back to destination alone if Darwin ever omits an
 * operator tag (never fabricates one).
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

export function listSouthwestDogfoodStations() {
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
 * Directions derived purely from the live Darwin board (already filtered
 * for Night Riviera Sleeper's out-reservation exclusion inside
 * fetchStationBoard() at the six affected stations — see file header) — no
 * static list to union with, since no printed National Rail line map
 * exists for this corridor — then post-processed by the shared hub helper
 * (a no-op everywhere in this catalog, since no southwest/
 * direction-hubs.json exists — see file header).
 * @param {string} station
 */
export async function getSouthwestDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(SOUTHWEST_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "southwest-darwin-live",
  };
}

/**
 * Pure routing decision for getSouthwestDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin
 * wrapper over the shared lib/cities/uk/direction-hubs.js's
 * planUkNextTrainFetch(), with the national rail-crs-index as the
 * exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (no hub
 *    configured anywhere in this catalog, so this branch never fires
 *    today — kept for parity with every other UK region's call shape; the
 *    hub/secondary hub/terminus here are themselves selectable stations,
 *    not intermediate anchors, so they need no direction-hubs.json entry).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 9-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(SOUTHWEST_REGION).hubs).
 */
export function planSouthwestNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: SOUTHWEST_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getSouthwestDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planSouthwestNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(SOUTHWEST_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Dead branch today (no hub
    // configured), kept for parity with every other UK region. NOTE: this
    // fetch bypasses fetchStationBoard()'s Night Riviera Sleeper exclusion
    // (fetchRegionalDepartureBoard() has no excludeOperators option) —
    // harmless while this branch is dead (no hub configured for this
    // region), same caveat as every other UK region's hub branch.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: SOUTHWEST_REGION,
      numRows: 15,
    });
    return buildSouthwestNextTrainResponse({
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
    // filterCrs doesn't know about operator). Any Night Riviera Sleeper
    // trip that happened to match filterCrs is still dropped here, because
    // its own directionChip() carries the "Night Riviera Sleeper" operator
    // tag and can never equal a destination chip the picker actually
    // offered (getSouthwestDogfoodDirections() already excludes it
    // upstream).
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: SOUTHWEST_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildSouthwestNextTrainResponse({
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
  // path, unchanged. Goes through fetchStationBoard(), so the Night
  // Riviera Sleeper exclusion still applies at the six affected stations.
  const board = await fetchStationBoard(entry?.name ?? station);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildSouthwestNextTrainResponse({
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
 * Shared response builder for getSouthwestDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as every other UK region's dogfood response builder.
 */
function buildSouthwestNextTrainResponse({
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
    timeZone: SOUTHWEST_TIME_ZONE,
  });
}
