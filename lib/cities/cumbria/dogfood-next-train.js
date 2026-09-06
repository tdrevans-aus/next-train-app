/**
 * Cumbria next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "cumbria") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/cumbria.js file
 * header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-cumbria-flip.md) — Mark/Tim's flip call, not made
 * here.
 *
 * Direction model is destination + operator (e.g. "Glasgow Central (Avanti
 * West Coast)"), matching how National Rail departure boards actually
 * present (docs/cumbria-d1/direction-model-memo.md). Directions are
 * derived live from the board itself on every call — no printed route/line
 * map exists for Darwin, same approach as every other UK National Rail
 * region in this pipeline. Illustrative only until DARWIN_LDB_TOKEN exists
 * — no destination strings are confirmed against a live payload yet.
 *
 * ONE TIER-1 HUB LOCK PLUS TWO TIER-2 SECONDARY HUBS: Carlisle (CAR) is the
 * sole tier-1 hub — 8 platforms, junction of four lines directly (West
 * Coast Main Line, Settle-Carlisle Line, Tyne Valley Line, Cumbrian Coast
 * Line) plus a fifth (Lakes Line) reachable via Oxenholme. Oxenholme Lake
 * District (OXN) and Barrow-in-Furness (BIF) are tier-2 secondary hubs.
 * Penrith (PNR) is a major WCML station but not a junction — stays
 * regional, not promoted to hub. Caledonian Sleeper carries board-
 * eligibility verdict `out-reservation` and is excluded from the board at
 * Carlisle only (enforced inside lib/providers/cumbria.js via
 * excludeOperators, not duplicated here). See lib/providers/cumbria.js
 * file header and docs/cumbria-d1/jim-handoff.md.
 *
 * No direction-hubs.json ships for this region — no live Darwin payload
 * has ever been pulled (DARWIN_LDB_TOKEN unset when this pack was written),
 * so no hub-chip/operator-split candidate can be evidenced the way Greater
 * Anglia's Norwich hub or West of England's Bristol Temple Meads hub were.
 * loadDirectionHubs() still runs (returns an empty hub list, a no-op) so
 * this module matches every other UK region's call shape exactly — same
 * treatment as South Wales' Cardiff Central-only catalog. Do not invent a
 * hub config from the tier-1/tier-2 catalog ranking alone; that ranking is
 * about station-graph importance, not a proven printed-destination
 * operator split.
 */
import {
  CUMBRIA_REGION,
  CUMBRIA_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/cumbria.js";
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
 * "Glasgow Central (Avanti West Coast)" — matches how Darwin/real departure
 * boards present. Falls back to destination alone if Darwin ever omits an
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

export function listCumbriaDogfoodStations() {
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
 * helper (a no-op everywhere in this catalog, since no
 * cumbria/direction-hubs.json exists — see file header).
 * @param {string} station
 */
export async function getCumbriaDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(CUMBRIA_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "cumbria-darwin-live",
  };
}

/**
 * Pure routing decision for getCumbriaDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (no hub
 *    configured anywhere in this catalog, so this branch never fires today
 *    — kept for parity with every other UK region's call shape).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 7-station catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(CUMBRIA_REGION).hubs).
 */
export function planCumbriaNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: CUMBRIA_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getCumbriaDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planCumbriaNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(CUMBRIA_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Dead branch today (no hub
    // configured), kept for parity with every other UK region.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: CUMBRIA_REGION,
      numRows: 15,
    });
    return buildCumbriaNextTrainResponse({
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
      regionId: CUMBRIA_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildCumbriaNextTrainResponse({
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
  return buildCumbriaNextTrainResponse({
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
 * Shared response builder for getCumbriaDogfoodNextTrain()'s three paths.
 * Remaps each trip's destination to the chosen chip (as before) but keeps
 * the Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region's dogfood response builder.
 */
function buildCumbriaNextTrainResponse({
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
    timeZone: CUMBRIA_TIME_ZONE,
  });
}
