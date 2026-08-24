/**
 * City registry — integration metadata only.
 * Flip status to "live" when an adapter + catalog ships.
 * @see docs/multi-city-provider-design.md
 */

/** @typedef {"live"|"planned"|"deferred"} CityStatus */

/**
 * @typedef {object} CityEntry
 * @property {string} id
 * @property {string} displayName
 * @property {string} timeZone
 * @property {CityStatus} status
 * @property {boolean} [adapterReady] Adapter coded but city not live
 * @property {string} agency
 * @property {string} integration Recommended stack
 * @property {string[]} modes
 * @property {string[]} [envKeys] Server env vars when live
 * @property {string} [notes]
 */

/** @type {CityEntry[]} */
export const CITIES = [
  {
    id: "perth",
    displayName: "Perth",
    timeZone: "Australia/Perth",
    status: "live",
    agency: "Transperth",
    integration: "LiveTimes ASMX XML (existing)",
    modes: ["train"],
    notes: "Reference provider — lib/train-times.js",
  },
  {
    id: "sydney",
    displayName: "Sydney",
    timeZone: "Australia/Sydney",
    status: "live",
    agency: "Transport for NSW",
    integration: "GTFS Schedule + GTFS-R (Open Data Hub API key)",
    modes: ["train", "metro"],
    envKeys: ["TFNSW_API_KEY"],
    adapterReady: true,
  },
  {
    id: "melbourne",
    displayName: "Melbourne",
    timeZone: "Australia/Melbourne",
    status: "planned",
    agency: "PTV",
    integration: "PTV Timetable API v3 (HMAC devid+key)",
    modes: ["train"],
    envKeys: ["PTV_DEVID", "PTV_API_KEY"],
    adapterReady: true,
  },
  {
    id: "brisbane",
    displayName: "Brisbane",
    timeZone: "Australia/Brisbane",
    status: "live",
    agency: "Translink",
    integration: "GTFS + GTFS-R SEQ (no key); prefer Rail endpoints",
    modes: ["train"],
    adapterReady: true,
  },
  {
    id: "adelaide",
    displayName: "Adelaide",
    timeZone: "Australia/Adelaide",
    status: "live",
    agency: "Adelaide Metro",
    integration: "GTFS + GTFS-R (public, no key)",
    modes: ["train"],
    envKeys: ["ADELAIDE_METRO_API_KEY"],
    adapterReady: true,
    notes: "Optional ADELAIDE_METRO_API_KEY (x-api-key); public feeds work without key (verified 2026)",
  },
  {
    id: "uk-west-midlands",
    displayName: "West Midlands",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail / West Midlands Metro",
    integration: "Darwin OpenLDBWS + TfWM GTFS-RT",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN", "TFWM_API_APP_ID", "TFWM_API_APP_KEY"],
    adapterReady: true,
    notes: "Region allow-list — not city=uk. See docs/uk-architecture.md",
  },
  {
    id: "uk-ellesmere-port",
    displayName: "Ellesmere Port corridor",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Merseyrail / National Rail",
    integration: "Darwin OpenLDBWS",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
  },
  {
    id: "uk-london-tfl",
    displayName: "London TfL",
    timeZone: "Europe/London",
    status: "live",
    agency: "Transport for London",
    integration: "TfL Unified API (rail modes only)",
    modes: ["tube", "elizabeth-line", "dlr", "overground", "tram"],
    envKeys: ["TFL_APP_KEY"],
    adapterReady: true,
    notes: "Powered by TfL Open Data. No Darwin, no buses. See docs/jim-brief-uk-london-tfl.md",
  },
  {
    id: "canberra",
    displayName: "Canberra",
    timeZone: "Australia/Sydney",
    status: "planned",
    agency: "Transport Canberra",
    integration: "MyWay+ GTFS + GTFS-R (HTTP Basic)",
    modes: ["light_rail", "bus"],
    envKeys: ["ACT_GTFS_BASIC", "ACT_GTFS_CLIENT_ID", "ACT_GTFS_CLIENT_SECRET"],
    adapterReady: true,
    notes: "Product: light rail leave-by first; brand is bus-heavy",
  },
];

/** @param {string} [cityId] */
export function getCity(cityId = "perth") {
  const id = String(cityId || "perth").trim().toLowerCase();
  return CITIES.find((c) => c.id === id) ?? null;
}

export function listCities() {
  return CITIES.map(({ id, displayName, status, timeZone, modes }) => ({
    id,
    displayName,
    status,
    timeZone,
    modes,
  }));
}

/** @param {string} [cityId] */
export function assertCityLive(cityId = "perth") {
  const city = getCity(cityId);
  if (!city) {
    return { ok: false, status: 400, error: "Unknown city", city: cityId };
  }
  if (city.status !== "live") {
    return {
      ok: false,
      status: 501,
      error: `City not implemented yet (${city.status})`,
      city: city.id,
      integration: city.integration,
    };
  }
  return { ok: true, city };
}
