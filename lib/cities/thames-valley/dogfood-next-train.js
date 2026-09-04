/**
 * Thames Valley next-train payload for production Vercel and local dev.
 *
 * National Rail only (Darwin/OpenLDBWS via lib/providers/uk-darwin.js,
 * regionId "thames-valley") — genuinely Darwin-or-nothing, no static GTFS
 * fallback exists for this feed at all (see lib/providers/thames-valley.js
 * file header). fetchStationBoard() throws MissingDarwinTokenError if
 * DARWIN_LDB_TOKEN is unset — not caught here, same as every other UK
 * region.
 *
 * Direction model is destination + operator (e.g. "London Paddington (Great
 * Western Railway)"), matching how National Rail departure boards actually
 * present (docs/thames-valley-d1/direction-model-memo.md). Directions are
 * derived live from the board itself on every call — no printed route/line
 * map exists for Darwin, same approach as every other UK National Rail
 * region in this pipeline.
 *
 * HUB + SECONDARY-HUB, Oxford doNotGroup: Reading (RDG) is a single flat
 * board (three operators, no split — report line 36). Oxford (OXF) is two
 * catalog entries sharing one physical CRS — "Oxford (GWR)" (main line,
 * GWR + CrossCountry through-running) and "Oxford (Chiltern)" (Marylebone
 * branch) — enforced via lib/providers/thames-valley.js's
 * fetchNationalRailBoard() passing each board's own `operators` list as
 * `includeOperators` to the shared uk-darwin.js fetchStationBoard(), the
 * same mechanism london-se-national-rail uses for London Bridge/Liverpool
 * Street. The bare alias "Oxford" and the raw CRS "OXF" both resolve to the
 * GWR board (resolveRailEntry()'s catalog-order fallback — see
 * lib/providers/uk/catalog.js), and "Oxford Chiltern"/"Oxford (Chiltern)"
 * resolve to the Chiltern board — either printed name reaches OXF, and the
 * " (Operator)" suffix directionChip() always appends keeps GWR and
 * Chiltern chips visually distinguishable in the picker even though both
 * stations resolve to the same CRS. CROSS-COUNTRY DISCOVERY (5 Sep 2026,
 * live-probed, scripts/probe-uk-board.mjs --crs=OXF and
 * --filter-crs=OXF from Banbury): the D1 report only named GWR/Chiltern at
 * Oxford, but CrossCountry (Newcastle, Manchester Piccadilly, Bournemouth,
 * Reading) genuinely calls there on the GWR main-line platforms — added to
 * "Oxford (GWR)"'s operators list in stations.json so CrossCountry's
 * already-recorded board-eligibility 'in' verdict isn't silently dropped by
 * the includeOperators filter. See docs/thames-valley-d1/jim-handoff.md
 * "Adapter wired" section for the full live chip tables.
 *
 * Direction hub anchoring (lib/cities/uk/direction-hubs.js): NOT wired for
 * Thames Valley v1. All eight catalogued boards' live chip sets were probed
 * on 5 Sep 2026 (scripts/probe-uk-board.mjs, see the adapter PR and
 * docs/thames-valley-d1/jim-handoff.md "Adapter wired" section for the full
 * tables) for the three candidates the brief named: (1) the Henley branch —
 * do HOT services run through to Reading? Live filtered board
 * (--filter-crs=RDG from Henley-on-Thames) returned 0 trips; every HOT
 * departure terminates at Twyford, never reaching RDG, so no
 * "Reading"/Kidderminster-shape hub is warranted there (per the "if the
 * filtered board doesn't show it, it isn't" rule). (2) an operator split on
 * "London Paddington"/"Reading" at Didcot/Swindon (Liverpool shape) — both
 * stations' live boards filtered to calls-at-RDG show Great Western
 * Railway only, no second operator printing the same terminus, so no split
 * exists to collapse. (3) an operator split on "Oxford" at Banbury
 * (Chiltern vs CrossCountry) — Banbury's live board (and its
 * --filter-crs=OXF sample) shows GWR and CrossCountry calling at Oxford
 * but neither prints "Oxford" itself as a destination (both continue past
 * it), and Chiltern's own Banbury departures go to Marylebone/Birmingham,
 * never "Oxford" either — no destination string exists to split. None of
 * the three candidates held, so no direction-hubs.json ships (consistent
 * with the shared helper's documented default: loadDirectionHubs() returns
 * an empty hub list for a region with no file, so
 * applyDirectionHubs()/planUkNextTrainFetch() are a no-op here). The
 * exact-chip path (via the national name->CRS index,
 * lib/cities/uk/rail-crs-index.js) still applies to any destination outside
 * this 8-board catalog.
 */
import {
  THAMES_VALLEY_REGION,
  THAMES_VALLEY_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
} from "../../providers/thames-valley.js";
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
 * "London Paddington (Great Western Railway)" — matches how Darwin/real
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

export function listThamesValleyDogfoodStations() {
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
 * helper (a no-op for Thames Valley v1, since no direction-hubs.json
 * exists — see file header).
 * @param {string} station
 */
export async function getThamesValleyDogfoodDirections(station) {
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
    ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(THAMES_VALLEY_REGION).hubs)
    : sorted;
  return {
    directions,
    source: "thames-valley-darwin-live",
  };
}

/**
 * Pure routing decision for getThamesValleyDogfoodNextTrain() — exported
 * separately (no fetch inside it) so the QA gate can assert the branching
 * table from the brief with a fixture, without a Darwin token. Thin wrapper
 * over the shared lib/cities/uk/direction-hubs.js's planUkNextTrainFetch(),
 * with the national rail-crs-index as the exact-chip fallback:
 *  - "hub": destination matches a hub label for this station's CRS (none
 *    configured in v1 — see file header — so this branch never fires
 *    today, kept so a future direction-hubs.json needs no code change).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 8-board catalog (including both Oxford entries,
 *    which share CRS OXF) or the national index.
 *  - "undirected": anything else (e.g. an unresolvable destination) — the
 *    original undirected-fetch-then-client-filter path, unchanged.
 * @param {{ crs?: string, name?: string } | null} entry Resolved catalog entry.
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(THAMES_VALLEY_REGION).hubs).
 */
export function planThamesValleyNextTrainFetch(entry, destination, hubs) {
  return planUkNextTrainFetch(entry, "train", destination, hubs, {
    regionId: THAMES_VALLEY_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getThamesValleyDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station);
  const plan = planThamesValleyNextTrainFetch(
    entry,
    destination,
    loadDirectionHubs(THAMES_VALLEY_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: THAMES_VALLEY_REGION,
      numRows: 15,
    });
    return buildThamesValleyNextTrainResponse({
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
    // filterCrs doesn't know about operator). At Oxford this still fetches
    // from the entry's own board (GWR or Chiltern, per which catalog entry
    // was resolved) — the includeOperators split already applied by
    // fetchNationalRailBoard() in lib/providers/thames-valley.js.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: THAMES_VALLEY_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildThamesValleyNextTrainResponse({
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
  return buildThamesValleyNextTrainResponse({
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
 * Shared response builder for getThamesValleyDogfoodNextTrain()'s three
 * paths. Remaps each trip's destination to the chosen chip (as before) but
 * keeps the Darwin-printed destination as printedDestination — additive
 * field, carried through buildTripPayload() in train-times-core.js, same
 * shape as every other UK region's dogfood response builder.
 */
function buildThamesValleyNextTrainResponse({
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
    timeZone: THAMES_VALLEY_TIME_ZONE,
  });
}
