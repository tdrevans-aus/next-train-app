/**
 * Liverpool City Region next-train payload for production Vercel and local
 * dev. Two agencies, sharing the shared/region provider
 * (lib/providers/liverpool-city-region.js) directly — reused verbatim, not
 * forked here — same pattern as East Midlands' and West of England's own
 * dogfood modules:
 *
 *  - National Rail (Darwin/OpenLDBWS, regionId "liverpool-city-region"):
 *    destination + operator (e.g. "London Euston (Avanti West Coast)"),
 *    derived live from the board on every call — no printed National Rail
 *    route/line map exists, same reasoning as every other UK region's
 *    dogfood module. Throws MissingDarwinTokenError until DARWIN_LDB_TOKEN
 *    exists — not caught here, same as every other UK region.
 *
 *  - Merseyrail (Northern Line + Wirral Line): Darwin-served, corrected
 *    4 Sep 2026 (docs/jim-brief-liverpool-merseyrail-via-darwin.md) — it is a
 *    National Rail TOC, not a metro system without a public feed. Same
 *    directionChip() shape (destination + operator), same
 *    MissingDarwinTokenError-on-no-token behaviour as National Rail. No
 *    operator filters anywhere in this region (docs/board-eligibility-rule.md
 *    walk-up rule) — every board shows every train Darwin returns for that
 *    CRS. Directions derive live for all 97 stations, including Merseyrail
 *    stops that have no `line` field; the marketing-directions.js line+
 *    terminus labels are a separate, unused-at-chip-time marketing model
 *    (see that module's header), not a gate on which stations get live
 *    directions.
 *
 * Liverpool Lime Street (LIV): H1 closed as moot 4 Sep 2026 (Tim's option
 * B) — one catalog entry, one Darwin board, Northern/Avanti/TPE/LNR & WMR
 * and Merseyrail together, each with its own platform. The former
 * train/metro doNotGroup pair and Lime-Street-specific mode resolution are
 * gone; fetchBoardForMode() below is the same generic mode-aware dispatch
 * every station in this region uses, nothing Lime-Street-specific left.
 *
 * Liverpool South Parkway (LPY) has both a National Rail entry and its own
 * Merseyrail entry (same CRS, joint station — see stations.json), not a
 * doNotGroup case since both share the identical CRS and board. Liverpool
 * Central and Moorfields are Merseyrail only. Ellesmere Port is a genuine
 * Wirral Line terminus, Merseyrail only; the deleted `uk-ellesmere-port`
 * standalone region has no bearing on this catalog (see the provider file
 * header).
 *
 * Direction hub anchoring (FB-51, docs/jim-brief-fb51-liverpool-city-region.md):
 * Liverpool City Region is on the shared UK helper
 * (lib/cities/uk/direction-hubs.js, the same helper East Midlands/West of
 * England use), but this region is the operator-split shape rather than the
 * through-running shape: lib/cities/liverpool-city-region/direction-hubs.json
 * curates a single "Liverpool Lime Street" hub whose label IS the terminus
 * itself — at Runcorn, St Helens Central/Junction and several other
 * catalog stations, the same Lime Street service prints as two to four
 * separate chips because directionChip() carries the operator suffix
 * (Avanti West Coast / LNR & WMR / Transport for Wales / Northern /
 * TransPennine Express / East Midlands Railway). Fetching filterCrs=LIV
 * server-side collapses that operator split into one chip showing every
 * operator's train. This ONLY applies to National Rail mode (train) — the
 * Merseyrail (metro) path below is completely untouched, per the brief's
 * guardrail; planUkNextTrainFetch() already treats mode!=="train" as
 * always-undirected.
 */
import {
  LIVERPOOL_CITY_REGION_TIME_ZONE,
  LIVERPOOL_CITY_REGION_REGION,
  resolveCatalogEntry,
  listCatalogStations as listRegionCatalogStations,
  fetchNationalRailBoard,
  fetchMerseyrailStopBoard,
  fetchStationBoard,
  MissingDarwinTokenError,
} from "../../providers/liverpool-city-region.js";
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

export const LIVERPOOL_CITY_REGION_DOGFOOD_TIME_ZONE = LIVERPOOL_CITY_REGION_TIME_ZONE;

/**
 * "London Euston (Avanti West Coast)" — matches how Darwin/real departure
 * boards present. Falls back to destination alone if Darwin ever omits an
 * operator tag (never fabricates one). Same shape as every other UK
 * region's directionChip().
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

export function listLiverpoolCityRegionDogfoodStations() {
  // Jim brief: server must not parse large GTFS fixtures for city-stations.
  // mode is included so callers can tell a station's National Rail entry
  // from its Merseyrail entry where a station has both (e.g. Liverpool
  // South Parkway), same list shape East Midlands used at Nottingham
  // Station's doNotGroup hub. Liverpool Lime Street now has one entry only
  // (mode train) since H1 closed as moot — see the provider file header.
  return listRegionCatalogStations(LIVERPOOL_CITY_REGION_REGION).map((station) => ({
    name: station.name,
    mode: station.mode,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Fetches the board for a station, honoring an explicit mode where given.
 * A few stations (e.g. Liverpool South Parkway) have both a National Rail
 * and a Merseyrail catalog entry under the same printed name — passing the
 * resolved name back into fetchStationBoard() without the mode would re-run
 * the provider's own rail-first ambiguous resolution, silently discarding an
 * explicit metro disambiguation. When a mode is given, this calls the
 * mode-specific fetcher directly instead. With no mode given, it falls back
 * to fetchStationBoard()'s own rail-first ambiguous resolution — same order
 * as every other UK doNotGroup region.
 * @param {string} station
 * @param {"train"|"metro"} [mode]
 */
async function fetchBoardForMode(station, mode) {
  if (mode === "train") {
    return fetchNationalRailBoard(station);
  }
  if (mode === "metro") {
    return fetchMerseyrailStopBoard(station);
  }
  return fetchStationBoard(station);
}

/**
 * Directions derived from the live board for the resolved catalog entry.
 * Both National Rail and Merseyrail: destination+operator chips derived live
 * from Darwin, same approach as every other UK region (no printed line map
 * to union against).
 * @param {string} station
 * @param {{ mode?: "train"|"metro" }} [options]
 */
export async function getLiverpoolCityRegionDogfoodDirections(station, { mode } = {}) {
  const entry = resolveCatalogEntry(station, mode);
  const resolvedMode = mode ?? entry?.mode;
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const chips = new Set();
  for (const trip of board.trips ?? []) {
    const chip = directionChip(trip);
    if (chip) {
      chips.add(chip);
    }
  }
  const sorted = [...chips].sort((a, b) => a.localeCompare(b));
  // Hub anchoring only applies to National Rail mode — Merseyrail/metro is
  // untouched (see file header). resolvedMode "metro" is filtered out inside
  // applyDirectionHubs/findHubForStation too (no hub applies at a Merseyrail
  // CRS), but gating here also skips the loadDirectionHubs() call on the hot
  // metro path.
  const directions =
    resolvedMode === "train" && entry?.crs
      ? applyDirectionHubs(sorted, entry.crs, loadDirectionHubs(LIVERPOOL_CITY_REGION_REGION).hubs)
      : sorted;
  return {
    directions,
    source: "liverpool-city-region-darwin-live",
  };
}

/**
 * Pure routing decision for getLiverpoolCityRegionDogfoodNextTrain() —
 * exported separately (no fetch inside it) so the QA gate can assert the
 * branching table from the brief with a fixture, without a Darwin token.
 * Thin wrapper over the shared lib/cities/uk/direction-hubs.js's
 * planUkNextTrainFetch(), same as West of England/East Midlands:
 *  - "hub": destination is the Liverpool Lime Street hub label for this
 *    station's CRS (v1: LEG, LPY, MSH, NLW, RUN, SHJ, SNH, WID — see
 *    direction-hubs.json).
 *  - "exact": destination's own destination part resolves to a CRS, either
 *    in the region's own 29-station rail catalog or the national index.
 *  - "undirected": anything else, OR resolvedMode !== "train" (Merseyrail/
 *    metro never consults hubs — see file header).
 * @param {{ crs?: string, name?: string, mode?: string } | null} entry Resolved catalog entry.
 * @param {"train"|"metro"|undefined} resolvedMode
 * @param {string} destination Chosen chip/label.
 * @param {object[]} hubs Loaded hub configs (loadDirectionHubs(LIVERPOOL_CITY_REGION_REGION).hubs).
 */
export function planLiverpoolCityRegionNextTrainFetch(entry, resolvedMode, destination, hubs) {
  return planUkNextTrainFetch(entry, resolvedMode, destination, hubs, {
    regionId: LIVERPOOL_CITY_REGION_REGION,
    resolveDestinationCrs: resolveCrsForName,
  });
}

export async function getLiverpoolCityRegionDogfoodNextTrain({
  station,
  mode,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const entry = resolveCatalogEntry(station, mode);
  const resolvedMode = mode ?? entry?.mode;
  const plan = planLiverpoolCityRegionNextTrainFetch(
    entry,
    resolvedMode,
    destination,
    loadDirectionHubs(LIVERPOOL_CITY_REGION_REGION).hubs
  );

  if (plan.kind === "hub") {
    // Hub chip: Darwin already filtered server-side (filterCrs/filterType=to
    // at the hub's own CRS) to "every service that calls at the hub" — no
    // further client-side filter needed.
    const board = await fetchRegionalDepartureBoard(entry?.name ?? station, plan.filterCrs, {
      regionId: LIVERPOOL_CITY_REGION_REGION,
      numRows: 15,
    });
    return buildLiverpoolCityRegionNextTrainResponse({
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
      regionId: LIVERPOOL_CITY_REGION_REGION,
      numRows: 15,
    });
    const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
    return buildLiverpoolCityRegionNextTrainResponse({
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

  // Anything else (e.g. Merseyrail/metro mode, or an unresolvable
  // destination): current undirected path, unchanged.
  const board = await fetchBoardForMode(entry?.name ?? station, resolvedMode);
  const matching = (board.trips ?? []).filter((trip) => directionChip(trip) === destination);
  return buildLiverpoolCityRegionNextTrainResponse({
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
 * Shared response builder for getLiverpoolCityRegionDogfoodNextTrain()'s
 * three paths. Remaps each trip's destination to the chosen chip (as
 * before) but keeps the Darwin-printed destination as printedDestination —
 * additive field, carried through buildTripPayload() in
 * train-times-core.js, same shape as West Midlands/East Midlands/West of
 * England's hub response builders. For a hub chip this is how a row can
 * show "Liverpool Lime Street · to Manchester Oxford Road" (Merseyrail
 * trips carry their own destination too); for an exact chip
 * printedDestination equals destination and the render can omit showing it.
 */
function buildLiverpoolCityRegionNextTrainResponse({
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
    timeZone: LIVERPOOL_CITY_REGION_DOGFOOD_TIME_ZONE,
  });
}

export { MissingDarwinTokenError };
