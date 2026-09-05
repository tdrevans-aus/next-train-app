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
