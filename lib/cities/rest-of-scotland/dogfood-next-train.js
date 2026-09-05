/**
 * Rest of Scotland next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "rest-of-scotland") — genuinely Darwin-or-nothing, no static
 * GTFS fallback exists for this feed at all (see
 * lib/providers/rest-of-scotland.js file header). fetchStationBoard()
 * throws MissingDarwinTokenError if DARWIN_LDB_TOKEN is unset — not caught
 * here, same as every other UK region.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-rest-of-scotland-flip.md) — Mark/Tim's flip call,
 * not made here.
 *
 * STRUCTURAL DEPARTURE FROM EVERY PRIOR UK REGION: FOUR CO-EQUAL HUB
 * LOCKS (Perth, Inverness, Aberdeen, Dundee — REST_OF_SCOTLAND_HUBS in
 * lib/providers/rest-of-scotland.js), not one primary hub. This module
 * needs no special-casing for that: every function here takes whichever
 * station string the caller passes (one of the four hubs or a branch
 * terminus) and resolves it through the shared catalog exactly like every
 * other UK region's single-hub module — "hub" is a documentation label on
 * each station's `class` field, not a structural fork in this file. See
 * lib/providers/rest-of-scotland.js file header for the confirmation that
 * the shared board-fetch pattern generalises to N co-equal hubs with no
 * code change.
 *
 * Caledonian Sleeper (out-reservation, per docs/board-eligibility-rule.md)
 * is excluded from the board at Aberdeen, Inverness, Fort William, and
 * Mallaig specifically — enforced inside
 * lib/providers/rest-of-scotland.js's fetchStationBoard() (which this
 * module imports and calls unchanged), not duplicated here. Perth and
 * Dundee are not in the excluded set — Caledonian Sleeper does not call at
 * either.
 *
 * Direction model is destination + operator (e.g. "Inverness (ScotRail)"),
 * matching how National Rail departure boards actually present
 * (docs/rest-of-scotland-d1/direction-model-memo.md). Directions are
 * derived live from the board itself on every call — no printed
 * route/line map exists for Darwin, same approach as every other UK
 * National Rail region in this pipeline.
 *
 * No direction-hubs.json ships for this region — each of the four hub
 * locks IS itself the anchor a rider selects (unlike Greater Anglia's
 * Thetford/Ely printing "Norwich" as an intermediate destination), so
 * there is no intermediate through-station to anchor riders on, the same
 * shape as South Wales' single Cardiff Central hub. loadDirectionHubs()
 * still runs (returns an empty hub list, a no-op) so this module matches
 * every other UK region's call shape exactly.
 */
import {
  REST_OF_SCOTLAND_REGION,
  REST_OF_SCOTLAND_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/rest-of-scotland.js";
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
 * "Inverness (ScotRail)" — matches how Darwin/real departure boards
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

export function listRestOfScotlandDogfoodStations() {
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
 * for Caledonian Sleeper's out-reservation exclusion inside
 * fetchStationBoard() at the four affected stations — see file header) —
 * no static list to union with, since no printed National Rail line map
 * exists for this corridor — then post-processed by the shared hub helper
 * (a no-op everywhere in this catalog, since no
 * rest-of-scotland/direction-hubs.json exists — see file header).
 * @param {string} station
 */
export async function getRestOfScotlandDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(REST_OF_SCOTLAND_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "rest-of-scotland-darwin-live",
  };
}

/**
 * Pure routing decision for getRestOfScotlandDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin
 * wrapper over the shared lib/cities/uk/direction-hubs.js's
 * planUkNextTrainFetch(), with the national rail-crs-index as the
 * exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (no hub
 *    configured anywhere in this catalog, so this branch never fires
 *    today — kept for parity with every other UK region's call shape; the
 *    four hub locks here are themselves selectable stations, not
 *    intermediate anchors, so they need no direction-hubs.json entry).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 9-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(REST_OF_SCOTLAND_REGION).hubs).
 */
export function planRestOfScotlandNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: REST_OF_SCOTLAND_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getRestOfScotlandDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planRestOfScotlandNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(REST_OF_SCOTLAND_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Dead branch today (no hub
    // configured), kept for parity with every other UK region. NOTE: this
    // fetch bypasses fetchStationBoard()'s Caledonian Sleeper exclusion
    // (fetchRegionalDepartureBoard() has no excludeOperators option) —
    // harmless while this branch is dead (no hub configured for this
    // region), same caveat as every other UK region's hub branch.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: REST_OF_SCOTLAND_REGION,
      numRows: 15,
    });
    return buildRestOfScotlandNextTrainResponse({
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
    // filterCrs doesn't know about operator). Any Caledonian Sleeper trip
    // that happened to match filterCrs is still dropped here, because its
    // own directionChip() carries the "Caledonian Sleeper" operator tag
    // and can never equal a destination chip the picker actually offered
    // (getRestOfScotlandDogfoodDirections() already excludes it upstream).
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: REST_OF_SCOTLAND_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildRestOfScotlandNextTrainResponse({
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
  // path, unchanged. Goes through fetchStationBoard(), so the Caledonian
  // Sleeper exclusion is applied server-side here.
  const board = await fetchStationBoard(entry?.name ?? station);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildRestOfScotlandNextTrainResponse({
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
 * Shared response builder for getRestOfScotlandDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as every other UK region's dogfood response builder.
 */
function buildRestOfScotlandNextTrainResponse({
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
    timeZone: REST_OF_SCOTLAND_TIME_ZONE,
  });
}
