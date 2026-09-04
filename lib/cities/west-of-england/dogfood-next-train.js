/**
 * West of England next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "west-of-england") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/west-of-england.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK region.
 *
 * Direction model is destination + operator (e.g. "London Paddington
 * (GWR)"), matching how National Rail departure boards actually present
 * (docs/west-of-england-d1/direction-model-memo.md). Unlike the line-based
 * cities (Adelaide, Oslo, etc.), there is no printed route/line map to build
 * a static marketing-directions.js against, so directions are derived live
 * from the board itself on every call — same approach as Perth's
 * uniqueDestinations()-based live fallback (lib/cities/perth/static-directions.js),
 * just with an operator suffix appended per trip.
 *
 * Direction hub anchoring (FB-51, docs/jim-brief-fb51-west-of-england.md):
 * West of England is on the shared UK helper
 * (lib/cities/uk/direction-hubs.js, lifted out of uk-west-midlands's FB-50
 * work and generalised for East Midlands in docs/jim-brief-fb51-uk-hub-rollout.md).
 * lib/cities/west-of-england/direction-hubs.json curates a single "Bristol
 * Temple Meads" hub for Bath Spa/Westbury (every westbound train from either
 * runs via Temple Meads, so riders anchor on Bristol rather than the
 * eventual terminus). This region's own catalog is only 6 stations, so most
 * chips (London Paddington, Oxford, ...) are out-of-region termini — the
 * exact-chip path resolves those via the national name->CRS index
 * (lib/cities/uk/rail-crs-index.js) the same way East Midlands does, fixing
 * the sparse-results problem at the fan-out hub Bristol Temple Meads itself
 * (docs/direction-hub-anchoring-issue.md).
 */
import {
  WEST_OF_ENGLAND_REGION,
  WEST_OF_ENGLAND_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/west-of-england.js";
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

export function listWestOfEnglandDogfoodStations() {
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
 * helper (a resolved CRS is required, mirroring East Midlands/West
 * Midlands).
 * @param {string} station
 */
export async function getWestOfEnglandDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(WEST_OF_ENGLAND_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "west-of-england-darwin-live",
  };
}

/**
 * Pure routing decision for getWestOfEnglandDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback (what makes
 * the exact-chip path fire for West of England's mostly-out-of-region chips
 * — see the file header):
 *  - "hub": destination matches a hub label for this station's CRS (only
 *    Bristol Temple Meads, from Bath Spa/Westbury, in v1).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 6-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(WEST_OF_ENGLAND_REGION).hubs).
 */
export function planWestOfEnglandNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: WEST_OF_ENGLAND_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getWestOfEnglandDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planWestOfEnglandNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(WEST_OF_ENGLAND_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: WEST_OF_ENGLAND_REGION,
      numRows: 15,
    });
    return buildWestOfEnglandNextTrainResponse({
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
      regionId: WEST_OF_ENGLAND_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildWestOfEnglandNextTrainResponse({
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
  return buildWestOfEnglandNextTrainResponse({
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
 * Shared response builder for getWestOfEnglandDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as West Midlands/East Midlands' hub response builders. For a hub
 * chip this is how a row can show "Bristol Temple Meads · to Cardiff
 * Central"; for an exact chip printedDestination equals destination and the
 * render can omit showing it.
 */
function buildWestOfEnglandNextTrainResponse({
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
    timeZone: WEST_OF_ENGLAND_TIME_ZONE,
  });
}
