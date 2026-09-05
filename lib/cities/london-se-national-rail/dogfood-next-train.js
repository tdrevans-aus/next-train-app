/**
 * London & South East National Rail next-train payload for production
 * Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js, via
 * the region-specific lib/providers/london-se-national-rail.js) —
 * genuinely Darwin-or-nothing, no static GTFS fallback exists for this feed
 * at all (see lib/providers/london-se-national-rail.js file header).
 * fetchStationBoard() throws MissingDarwinTokenError if DARWIN_LDB_TOKEN is
 * unset — not caught here, same as every other UK region.
 *
 * Registry status stays `planned` (this is the pre-flip dogfood wiring
 * pass, docs/jim-brief-london-se-national-rail-flip.md) — Mark/Tim's flip
 * call, not made here.
 *
 * FIRST MULTI-GROUP UK REGION, NO SINGLE HUB-LOCK: seven independent
 * per-terminus station groups (Waterloo, Victoria, London Bridge,
 * Liverpool Street, King's Cross, St Pancras International, Paddington) —
 * Tim's Option A decision (docs/london-se-national-rail-d1/jim-handoff.md).
 * This module needs no special-casing for that: every function here takes
 * whichever board name/CRS the caller passes and resolves it through the
 * shared catalog exactly like every other UK region's single-hub module —
 * a "group" is just N catalog entries sharing a groupId, not a structural
 * fork in this file. See lib/providers/london-se-national-rail.js file
 * header for the design decision and lib/cities/london-se-national-rail/
 * stations.json for the full station-group shape.
 *
 * INTERNAL doNotGroup, enforced upstream: London Bridge (Southeastern /
 * Southern / Thameslink, one CRS LBG, three boards) and Liverpool Street
 * (Greater Anglia / c2c, one CRS LST, two boards) are each split into
 * per-operator sub-boards inside lib/providers/london-se-national-rail.js's
 * fetchNationalRailBoard() via a new `includeOperators` option on the
 * shared uk-darwin.js fetchStationBoard() (same mechanism Thames Valley
 * uses for its Oxford GWR/Chiltern split). This module calls
 * fetchStationBoard(stationIdOrName) with the exact catalog board name
 * (e.g. "London Bridge (Southeastern)") and never needs to know about the
 * split itself — it is applied before any trip reaches this file.
 *
 * EXCLUDED-OPERATOR groups, also enforced upstream via excludeOperators:
 * St Pancras International excludes Eurostar (out-checkin); Paddington
 * excludes Night Riviera Sleeper (out-reservation). King's Cross no longer
 * excludes LNER — resolved to `in` per the UK ledger, 5 Sep 2026 (see
 * docs/united-kingdom-ledger.md §3 and lib/cities/london-se-national-rail/
 * stations.json).
 *
 * Direction model is destination + operator (e.g. "Brighton (Southern)"),
 * matching how National Rail departure boards actually present
 * (docs/london-se-national-rail-d1/direction-model-memo.md). Directions
 * are derived live from the board itself on every call — no printed
 * route/line map exists for Darwin, same approach as every other UK
 * National Rail region in this pipeline.
 *
 * No direction-hubs.json ships for this region — each of the seven groups
 * IS itself the anchor a rider selects (independent termini, not through-
 * stations feeding a hub), same shape as Rest of Scotland's four co-equal
 * hub locks and Thames Valley's own v1 (no hub candidate held up on live
 * evidence). loadDirectionHubs() still runs (returns an empty hub list, a
 * no-op) so this module matches every other UK region's call shape
 * exactly.
 */
import {
  LONDON_SE_NATIONAL_RAIL_REGION,
  LONDON_SE_NATIONAL_RAIL_TIME_ZONE,
  LONDON_SE_NATIONAL_RAIL_GROUPS,
  LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS,
  fetchStationBoard,
  listCatalogStations,
  listNationalRailStations,
  listBoardsForGroup,
  resolveCatalogEntry,
} from "../../providers/london-se-national-rail.js";
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

export {
  LONDON_SE_NATIONAL_RAIL_GROUPS,
  LONDON_SE_NATIONAL_RAIL_DONOTGROUP_GROUPS,
  listBoardsForGroup,
  listNationalRailStations,
};

/**
 * "Brighton (Southern)" — matches how Darwin/real departure boards present.
 * Falls back to destination alone if Darwin ever omits an operator tag
 * (never fabricates one).
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

export function listLondonSeNationalRailDogfoodStations() {
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
 * for the two internal doNotGroup boards' includeOperators split and the
 * two single-exclusion boards' excludeOperators, both applied upstream
 * inside lib/providers/london-se-national-rail.js — see file header) —
 * no static list to union with, since no printed National Rail line map
 * exists for this corridor — then post-processed by the shared hub helper
 * (a no-op everywhere in this catalog, since no
 * london-se-national-rail/direction-hubs.json exists — see file header).
 * @param {string} station
 */
export async function getLondonSeNationalRailDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(LONDON_SE_NATIONAL_RAIL_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "london-se-national-rail-darwin-live",
  };
}

/**
 * Pure routing decision for getLondonSeNationalRailDogfoodNextTrain() —
 * exported separately (no fetch inside it) so the QA gate can assert the
 * branching table from the brief with a fixture, without a Darwin token.
 * Thin wrapper over the shared lib/cities/uk/direction-hubs.js's
 * planUkNextTrainFetch(), with the national rail-crs-index as the
 * exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (no hub
 *    configured anywhere in this catalog, so this branch never fires
 *    today — kept for parity with every other UK region's call shape; the
 *    seven station groups here are themselves selectable termini, not
 *    intermediate anchors, so they need no direction-hubs.json entry).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 10-board catalog or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(LONDON_SE_NATIONAL_RAIL_REGION).hubs).
 */
export function planLondonSeNationalRailNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: LONDON_SE_NATIONAL_RAIL_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getLondonSeNationalRailDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planLondonSeNationalRailNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(LONDON_SE_NATIONAL_RAIL_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed. Dead branch today (no hub
    // configured), kept for parity with every other UK region. NOTE: this
    // fetch bypasses fetchNationalRailBoard()'s includeOperators/
    // excludeOperators handling (fetchRegionalDepartureBoard() has neither
    // option) — harmless while this branch is dead (no hub configured for
    // this region), same caveat as every other UK region's hub branch.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: LONDON_SE_NATIONAL_RAIL_REGION,
      numRows: 15,
    });
    return buildLondonSeNationalRailNextTrainResponse({
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
    // filterCrs doesn't know about operator). Any excluded-operator trip
    // that happened to match filterCrs is still dropped here, because its
    // own directionChip() carries an operator tag that can never equal a
    // destination chip the picker actually offered
    // (getLondonSeNationalRailDogfoodDirections() already excludes it
    // upstream, via fetchNationalRailBoard()'s excludeOperators).
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: LONDON_SE_NATIONAL_RAIL_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildLondonSeNationalRailNextTrainResponse({
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
  // path, unchanged. Goes through fetchStationBoard(), so any
  // includeOperators/excludeOperators split is applied server-side here.
  const board = await fetchStationBoard(entry?.name ?? station);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildLondonSeNationalRailNextTrainResponse({
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
 * Shared response builder for
 * getLondonSeNationalRailDogfoodNextTrain()'s three paths. Remaps each
 * trip's destination to the chosen chip (as before) but keeps the
 * Darwin-printed destination as printedDestination — additive field,
 * carried through buildTripPayload() in train-times-core.js, same shape as
 * every other UK region's dogfood response builder.
 */
function buildLondonSeNationalRailNextTrainResponse({
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
    timeZone: LONDON_SE_NATIONAL_RAIL_TIME_ZONE,
  });
}
