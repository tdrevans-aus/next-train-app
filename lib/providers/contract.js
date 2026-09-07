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
 */

/**
 * @typedef {object} CityProvider
 * @property {string} id
 * @property {(stationId: string) => Promise<StationBoard>} fetchStationBoard
 */

export const PROVIDER_CONTRACT_VERSION = 1;

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
