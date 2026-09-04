/**
 * West Yorkshire next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "west-yorkshire") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/west-yorkshire.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region.
 *
 * Direction model is destination + operator (e.g. "Manchester Piccadilly
 * (TransPennine Express)"), matching how National Rail departure boards
 * actually present (docs/west-yorkshire-d1/direction-model-memo.md).
 * Directions are derived live from the board itself on every call — no
 * printed route/line map exists for Darwin, same approach as West of
 * England/East Midlands/West Midlands/Liverpool City Region.
 *
 * Direction hub anchoring (lib/cities/uk/direction-hubs.js): NOT wired for
 * West Yorkshire v1. All ten catalogued stations' live chip sets were
 * probed on 5 Sep 2026 (scripts/probe-uk-board.mjs, see the adapter PR and
 * docs/west-yorkshire-d1/jim-handoff.md "Adapter wired" section for the
 * full tables) looking for the two candidates the brief named: an operator
 * split on the destination "Leeds" at Calder Valley/Airedale stations
 * (Liverpool shape), or a through-service past Leeds to an unrecognisable
 * terminus (Kidderminster shape). Neither showed up in the live sample —
 * every station that prints "Leeds" as a chip prints it under exactly one
 * operator, and every other destination is itself a real, recognisable
 * terminus (Chester, Blackpool North, Manchester Victoria, York, Hull,
 * Sheffield, Carlisle, Skipton, Ilkley, ...), not an obscure through-run
 * riders would rather see collapsed to "Leeds". loadDirectionHubs()
 * returns an empty hub list for a region with no direction-hubs.json, so
 * applyDirectionHubs()/planUkNextTrainFetch() behave as a no-op here —
 * shipping no hub file rather than an empty one, consistent with the
 * shared helper's own documented default. The exact-chip path (via the
 * national name->CRS index, lib/cities/uk/rail-crs-index.js) still applies
 * to any destination outside this 10-station catalog.
 */
import {
  WEST_YORKSHIRE_REGION,
  WEST_YORKSHIRE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/west-yorkshire.js";
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
 * "Manchester Piccadilly (TransPennine Express)" — matches how Darwin/real
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

export function listWestYorkshireDogfoodStations() {
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
 * helper (a no-op for West Yorkshire v1, since no direction-hubs.json
 * exists — see file header).
 * @param {string} station
 */
export async function getWestYorkshireDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(WEST_YORKSHIRE_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "west-yorkshire-darwin-live",
  };
}

/**
 * Pure routing decision for getWestYorkshireDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (none
 *    configured in v1 — see file header — so this branch never fires
 *    today, kept so a future direction-hubs.json needs no code change).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 10-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(WEST_YORKSHIRE_REGION).hubs).
 */
export function planWestYorkshireNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: WEST_YORKSHIRE_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getWestYorkshireDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planWestYorkshireNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(WEST_YORKSHIRE_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: WEST_YORKSHIRE_REGION,
      numRows: 15,
    });
    return buildWestYorkshireNextTrainResponse({
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
      regionId: WEST_YORKSHIRE_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildWestYorkshireNextTrainResponse({
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
  return buildWestYorkshireNextTrainResponse({
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
 * Shared response builder for getWestYorkshireDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as every other UK region's dogfood response builder.
 */
function buildWestYorkshireNextTrainResponse({
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
    timeZone: WEST_YORKSHIRE_TIME_ZONE,
  });
}
