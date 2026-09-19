/**
 * Multi-city provider contract.
 * Adapters fetch + normalize; leave-by math stays in lib/train-times.js (shared).
 * @see docs/multi-city-provider-design.md
 */

/**
 * @typedef {object} ProviderTrip
 * @property {string} liveDeparture ISO
 * @property {string} [scheduledDeparture] ISO
 * @property {string} [displayTime] HH:MM local
 * @property {string} [scheduledDisplayTime]
 * @property {string} [platform]
 * @property {string} destination rider-facing headsign / line label
 * @property {number} [cars]
 * @property {boolean} [cancelled]
 * @property {string} [status]
 */

/**
 * @typedef {object} StationBoard
 * @property {string} stationName
 * @property {string|null} lastUpdate
 * @property {ProviderTrip[]} trips
 * @property {"live"|"timetable"} [realtime] optional per-adapter freshness
 *   marker (currently Rotterdam/Amsterdam only); not surfaced by
 *   api/next-train.js or any UI yet — see docs/jim-brief-nl-realtime-cache.md.
 * @property {boolean} [partial] optional per-adapter degraded-source marker for a city with
 *   more than one live source at a station (currently Brussels only — STIB metro + iRail SNCB
 *   at the three shared stations, docs/jim-brief-brussels-flip-readiness.md): `true` when a
 *   secondary source's most recent fetch failed and its rows are simply missing from `trips`
 *   this refresh, while the primary source's rows are unaffected. The primary source failing is
 *   never `partial` — it's a hard refusal of the whole board (thrown error), same as before this
 *   field existed. Not surfaced by api/next-train.js or any UI yet.
 * @property {{ irailUnmappedTypes?: { type: string, count: number }[] }} [debug] optional
 *   per-adapter diagnostics, never surfaced by api/next-train.js or any UI (currently Brussels
 *   only): `irailUnmappedTypes` lists any iRail `vehicleinfo.type` code
 *   classifySncbVehicleType() (lib/providers/irail.js) didn't recognise on this refresh, with a
 *   count each — present only when non-empty, so a safe-default silent drop is detectable
 *   (docs/jim-brief-brussels-flip-readiness.md).
 */

/**
 * @typedef {object} CityProvider
 * @property {string} id
 * @property {(stationId: string) => Promise<StationBoard>} fetchStationBoard
 */

export const PROVIDER_CONTRACT_VERSION = 1;

/**
 * A live board's trips must always carry rider-facing string times — the
 * big time on the web/Android card is `displayTime`, not `liveDeparture`
 * (an ISO timestamp). `pickUpcomingProviderTrips`/`buildNextTrainResponse`
 * (lib/train-times-core.js) copy `displayTime`/`scheduledDisplayTime`
 * straight off the trip rather than deriving them, so an adapter that
 * forgets to set them silently ships a blank time to riders — this is what
 * happened to Göteborg's live-only rewrite in PR #332
 * (docs/jim-brief-goteborg-display-time.md). Call this from a city's
 * dogfood gate against a real (or fixture) board to catch the same class of
 * regression before it reaches production.
 * @param {StationBoard} board
 * @param {string} [label] station name, for the error message
 */
export function assertLiveBoardTripsHaveDisplayTimes(board, label = "board") {
  if (board?.realtime !== "live") {
    return;
  }
  for (const trip of board.trips ?? []) {
    if (typeof trip.displayTime !== "string" || trip.displayTime === "") {
      throw new Error(
        `${label}: live trip "${trip.routeShortName ?? ""} + ${trip.destination ?? ""}" is missing a string displayTime`
      );
    }
    if (typeof trip.scheduledDisplayTime !== "string" || trip.scheduledDisplayTime === "") {
      throw new Error(
        `${label}: live trip "${trip.routeShortName ?? ""} + ${trip.destination ?? ""}" is missing a string scheduledDisplayTime`
      );
    }
  }
}

/**
 * jim-brief-feed-unconfirmed-rider-copy: shared base for every region's
 * "*FeedUnconfirmedError"/"*FeedUnverifiedError" — a service with no
 * confirmed real-time feed, thrown unconditionally by design (not a
 * transient failure; see docs/board-eligibility-rule.md). Each region
 * subclass still sets its own `name` (so `instanceof <RegionSpecificError>`
 * and `error.name` keep working for existing QA gates and
 * api/directions.js's classifyDirectionsError()) and still carries its own
 * long pipeline explanation — but now in `detail`, never in `message`, so a
 * rider never sees a doc path, an agent name, or GTFS jargon. api/board.js
 * builds the rider-facing sentence server-side from `agency`/`station`/
 * `alternative`; `message` here is only a reasonable fallback for logs/tools
 * that read `.message` directly (e.g. console.error, api/directions.js).
 */
export class FeedUnconfirmedError extends Error {
  /**
   * @param {object} options
   * @param {string} options.agency rider-facing agency/operator name, e.g. "Manchester Metrolink"
   * @param {string} options.station rider-facing station/stop name
   * @param {string} [options.alternative] one short rider sentence naming a working alternative, e.g. "National Rail stations in Manchester still show live times."
   * @param {string} [options.detail] the long pipeline explanation — never surfaced to riders; keep doc paths/agent names/GTFS jargon here only
   * @param {string} [options.name] the region-specific Error subclass name (defaults to "FeedUnconfirmedError")
   */
  constructor({ agency, station, alternative, detail, name } = {}) {
    super(`${agency || "This service"} has no confirmed live feed for ${station || "this station"}.`);
    this.code = "FEED_UNCONFIRMED";
    this.agency = agency;
    this.station = station;
    this.alternative = alternative;
    this.detail = detail;
    this.name = name || "FeedUnconfirmedError";
  }
}

/**
 * The rider-facing sentence api/board.js sends for any FEED_UNCONFIRMED
 * error, built server-side so no adapter file ever needs to hand-author
 * rider copy inline with its pipeline `detail` text.
 * @param {FeedUnconfirmedError} error
 */
export function riderMessageForFeedUnconfirmed(error) {
  const agency = error?.agency || "This service";
  const station = error?.station || "this station";
  const base = `Live times for ${agency} aren't available yet, so ${station}'s board can't be shown.`;
  return error?.alternative ? `${base} ${error.alternative}` : base;
}
