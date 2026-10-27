/**
 * Los Angeles next-train payload for local testers, ahead of the eventual flip.
 * LA Metro Rail A/B/C/D/E/K via Swiftly GTFS-RT — live boards only, no scheduled fallback (see
 * lib/providers/los-angeles.js file header). SWIFTLY_API_KEY is required (fetchStationBoard()
 * throws MissingSwiftlyApiKeyError if unset). Modelled on lib/cities/prague/dogfood-next-train.js.
 */
import {
  LOS_ANGELES_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
  loadLosAngelesStatic,
  loadMetrolinkStatic,
  loadAmtrakSurflineStatic,
  resolveStopIds,
  resolveCatalogEntry,
  staticDirectionsForStopIds,
  staticMetrolinkChipsForStop,
  staticSurflineChipsForStop,
  METROLINK_CATALOG_TO_STOP_ID,
  SURFLINER_STOP_ID,
  SURFLINER_CATALOG_STATION,
} from "../../providers/los-angeles.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  LINE_LABELS,
  LINE_TERMINI,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listLosAngelesDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Pure mapping from a provider board to the next-train response, split out so the QA gate can
 * drive it with fixture boards (no network). `emptyReason` handling, per
 * docs/jim-brief-la-flip-follow-through.md and docs/jim-brief-la-short-turn-chips.md. The reason is
 * decided PER DIRECTION (a chip with zero rows must never come back silent), only when this chip
 * has nothing to show:
 *   - board.emptyReason "not-currently-served" (nothing scheduled here at all today) passes through;
 *   - when the board carries scheduledDestinationsRemaining (departures from here still ahead in the
 *     service day, incl. 24:00+ trips of the previous service day), it decides: a chip in it ->
 *     "no-live-predictions" (even when other directions have live rows), one that is not (D +
 *     Wilshire/La Cienega before 1 Nov, A + Monrovia after its last trip has passed) ->
 *     "not-currently-served";
 *   - a board without it (calendar unknown, older fixtures) keeps the earlier rules: the chip in
 *     board.scheduledCandidates -> "no-live-predictions"; else scheduledDestinationsToday (whole
 *     day) decides; with neither field, no reason beyond the first rule.
 * No rider copy is added here.
 */
export function buildLosAngelesNextTrainFromBoard(
  board,
  { station, destination, destinationLabel, leaveBeforeMinutes, refreshSeconds, skipTrains = 0, now = new Date() }
) {
  const matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  const remapped = matching.map((trip) => ({ ...trip, destination }));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

  const scheduledForDirection = (board.scheduledCandidates ?? []).some((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  let emptyReason = null;
  if (upcoming.length === 0) {
    if (board.emptyReason === "not-currently-served") {
      emptyReason = "not-currently-served";
    } else if (Array.isArray(board.scheduledDestinationsRemaining)) {
      // Time-aware and authoritative (docs/jim-brief-la-chip-polish.md): a departure from here to
      // this terminus must still be ahead in the service day. scheduledCandidates is NOT consulted -
      // once nothing is near-term it looks ahead into tomorrow's timetable, which would keep saying
      // "no live predictions" after the last Monrovia train of the day.
      emptyReason = board.scheduledDestinationsRemaining.includes(destination)
        ? "no-live-predictions"
        : "not-currently-served";
    } else if (scheduledForDirection) {
      emptyReason = "no-live-predictions";
    } else if (Array.isArray(board.scheduledDestinationsToday)) {
      emptyReason = board.scheduledDestinationsToday.includes(destination)
        ? "no-live-predictions"
        : "not-currently-served";
    }
  }

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
    timeZone: LOS_ANGELES_TIME_ZONE,
    emptyReason,
  });
}

export async function getLosAngelesDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await fetchStationBoard(station);
  return buildLosAngelesNextTrainFromBoard(board, {
    station,
    destination,
    destinationLabel,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
  });
}

let loadStatic = loadLosAngelesStatic;
/** Test seam: swap the LA Metro static-GTFS loader (the QA gate must not touch the network). */
export function setLosAngelesStaticLoader(fn) {
  loadStatic = fn ?? loadLosAngelesStatic;
}

let loadMetrolinkStaticFn = loadMetrolinkStatic;
/** Test seam: swap the Metrolink static-GTFS loader (the QA gate must not touch the network). */
export function setMetrolinkStaticLoader(fn) {
  loadMetrolinkStaticFn = fn ?? loadMetrolinkStatic;
}

let loadAmtrakSurflinerStaticFn = loadAmtrakSurflineStatic;
/** Test seam: swap the Amtrak Surfliner static-GTFS loader (the QA gate must not touch the network). */
export function setSurflinerStaticLoader(fn) {
  loadAmtrakSurflinerStaticFn = fn ?? loadAmtrakSurflineStatic;
}

const chipOrder = (chip) => {
  const [label, terminus] = chip.split(" + ");
  const lineId = Object.keys(LINE_LABELS).find((id) => LINE_LABELS[id] === label);
  return [Object.keys(LINE_LABELS).indexOf(lineId), (LINE_TERMINI[lineId] ?? []).indexOf(terminus)];
};

/**
 * Direction chips for a station from the static trips that call there: one "<Line> + <terminus>"
 * per real terminus (primary and short-turn) among non-terminating trips, unioned with the
 * printed primary-terminus chips so a station with no trips in the current feed (Wilshire/La Brea
 * before 1 Nov) still shows its directions and answers "not-currently-served". Never a self chip,
 * a bare line, or the hub (docs/jim-brief-la-short-turn-chips.md).
 */
export async function losAngelesDirectionsFromStatic(station, staticData) {
  const stopIds = await resolveStopIds(station, staticData);
  const { chips: staticChips } = staticDirectionsForStopIds(staticData, stopIds);
  const all = new Set([...marketingLabelsForStation(station), ...staticChips]);
  return [...all]
    .filter((chip) => /^[A-EK] Line \+ \S/.test(chip))
    .sort((a, b) => {
      const [la, ta] = chipOrder(a);
      const [lb, tb] = chipOrder(b);
      return la - lb || ta - tb;
    });
}

export async function getLosAngelesDogfoodDirections(station) {
  let metroDirections;
  try {
    metroDirections = await losAngelesDirectionsFromStatic(station, await loadStatic());
  } catch (err) {
    // Static feed unavailable: degrade to the printed primary-terminus chips rather than no chips.
    console.warn(`los-angeles directions: static feed unavailable, primary chips only - ${err?.message ?? err}`);
    metroDirections = marketingLabelsForStation(station);
  }

  // Metrolink direction chips at Union Station and Pomona North (separate group, Brussels shape).
  // Derived from the Metrolink static GTFS; offline fallback is no Metrolink chips (never fails
  // the whole directions call). Chips are appended after Metro chips, sorted within the group.
  let metrolinkChips = [];
  const catalogName = resolveCatalogEntry(station)?.name ?? station;
  const metrolinkStopId = METROLINK_CATALOG_TO_STOP_ID[catalogName] ?? null;
  if (metrolinkStopId) {
    try {
      metrolinkChips = staticMetrolinkChipsForStop(await loadMetrolinkStaticFn(), metrolinkStopId);
    } catch {
      // Metrolink static unavailable: Metro directions are still served.
    }
  }

  // Pacific Surfliner direction chips at Union Station only (separate group, Brussels shape).
  // Derived from the Amtrak static GTFS (route 78 only). Offline fallback is no Surfliner chips.
  let surflineChips = [];
  if (catalogName === SURFLINER_CATALOG_STATION) {
    try {
      surflineChips = staticSurflineChipsForStop(await loadAmtrakSurflinerStaticFn(), SURFLINER_STOP_ID);
    } catch {
      // Amtrak static unavailable: Metro and Metrolink directions are still served.
    }
  }

  return { directions: [...metroDirections, ...metrolinkChips, ...surflineChips], source: "los-angeles-marketing-ends" };
}
