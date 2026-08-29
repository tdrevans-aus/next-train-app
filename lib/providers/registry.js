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
    displayName: "London",
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
    id: "auckland",
    displayName: "Auckland",
    timeZone: "Pacific/Auckland",
    status: "live",
    agency: "Auckland Transport",
    integration: "AT GTFS zip (public) + GTFS-R Realtime Compat (AT_API_KEY)",
    modes: ["train"],
    envKeys: ["AT_API_KEY"],
    adapterReady: true,
    notes:
      "TRAIN only (STH, EAST, WEST, ONE). Hub Waitematā Station. Paerātā and Drury in. CRL not passenger-open. DST. Testers live; not a store listing.",
  },
  {
    id: "wellington",
    displayName: "Wellington",
    timeZone: "Pacific/Auckland",
    status: "planned",
    agency: "Metlink",
    integration: "Metlink GTFS zip (public) + GTFS-RT (METLINK_API_KEY, x-api-key)",
    modes: ["train"],
    envKeys: ["METLINK_API_KEY"],
    adapterReady: true,
    notes:
      "Separate city from Auckland. TRAIN only (Kāpiti, Hutt Valley, Melling, Johnsonville, Wairarapa). No bus/ferry/cable car. Wait for Luke D1 before published-network.json. DST. Do not flip live.",
  },
  {
    id: "amsterdam",
    displayName: "Amsterdam",
    timeZone: "Europe/Amsterdam",
    status: "live",
    agency: "GVB",
    integration: "OVapi GTFS + GTFS-RT (no key; User-Agent next-train)",
    modes: ["train"],
    adapterReady: true,
    notes:
      "GVB metro M50–M54 only. Not city=nl. Hub Centraal Station (not NS Amsterdam Centraal). DST. Testers live; not a store listing.",
  },
  {
    id: "rotterdam",
    displayName: "Rotterdam",
    timeZone: "Europe/Amsterdam",
    status: "live",
    agency: "RET",
    integration: "OVapi GTFS + GTFS-RT (no key; User-Agent next-train)",
    modes: ["train"],
    adapterReady: true,
    notes:
      "RET metro A–E only. Separate from amsterdam. Not city=nl or the-hague. Hub Beurs. DST. Testers live; not a store listing.",
  },
  {
    id: "vancouver",
    displayName: "Vancouver",
    timeZone: "America/Vancouver",
    status: "live",
    agency: "TransLink",
    integration: "TransLink static GTFS (no key) + GTFS-RT v3 (TRANSLINK_API_KEY)",
    modes: ["train"],
    envKeys: ["TRANSLINK_API_KEY"],
    adapterReady: true,
    notes:
      "SkyTrain only (Expo, Millennium, Canada Line). Not city=canada. Hub Waterfront. No bus/SeaBus/WCE. Broadway Subway not passenger-open. DST. Testers live; not a store listing. Required disclaimer on Vancouver screens only; no TransLink logo/mark/domain.",
  },
  {
    id: "stockholm",
    displayName: "Stockholm",
    timeZone: "Europe/Stockholm",
    status: "planned",
    agency: "SL",
    integration: "SL Transport JSON (no key); Trafiklab GTFS Sweden optional later",
    modes: ["train", "metro"],
    adapterReady: true,
    notes:
      "Tunnelbana 10/11/13/14/17/18/19 + Pendeltåg 40/41/43/48. No buses. Lock T-Centralen ≠ Stockholm City ≠ Stockholms central. D1 pack in docs/stockholm-d1/. DST. Do not flip live.",
  },
  {
    id: "goteborg",
    displayName: "Göteborg",
    timeZone: "Europe/Stockholm",
    status: "planned",
    agency: "Västtrafik",
    integration:
      "Trafiklab GTFS Regional vt (TRAFIKLAB_API_KEY). Static yes; TripUpdates not published for vt — schedule-only until Trafiklab adds RT or Västtrafik OAuth is wired.",
    modes: ["tram", "train"],
    envKeys: ["TRAFIKLAB_API_KEY"],
    adapterReady: true,
    notes:
      "Tram 1–12 + city-map pendeltåg Kungsbacka/Alingsås/Ale. No metro, stombuss, båt, X-bus, or extra Västtågen. Hub Brunnsparken (8/12 miss it). Do not lock Centralstationen (Drottningtorget 15 Jun 2026). Västtågen hub Göteborg Central. DST. Do not flip live.",
  },
  {
    id: "canberra",
    displayName: "Canberra",
    timeZone: "Australia/Sydney",
    status: "live",
    agency: "Transport Canberra / CMET",
    integration: "Public CMO light-rail GTFS + lightrail.pb (no key)",
    modes: ["light_rail"],
    adapterReady: true,
    notes:
      "Light rail only: Gungahlin Place–Alinga Street, 14 stops. No buses. Hub Alinga Street. Stage 2A/Woden not passenger-open. DST. Testers live; not a store listing. No MyWay+ key.",
  },
  {
    id: "gold-coast",
    displayName: "Gold Coast",
    timeZone: "Australia/Brisbane",
    status: "live",
    agency: "TransLink / G:link",
    integration: "Public SEQ GTFS + SEQ TripUpdates (no key), filtered to G:link L1",
    modes: ["light_rail"],
    adapterReady: true,
    notes:
      "Not part of Brisbane. G:link L1 Helensvale–Burleigh Heads including Stage 3. No SEQ trains/buses/ferries. No DST. Testers live; not a store listing.",
  },
  {
    id: "newcastle",
    displayName: "Newcastle",
    timeZone: "Australia/Sydney",
    status: "live",
    agency: "Newcastle Transport / TfNSW",
    integration: "TfNSW NLR GTFS + GTFS-RT (TFNSW_API_KEY); not Sydney trains",
    modes: ["light_rail"],
    envKeys: ["TFNSW_API_KEY"],
    adapterReady: true,
    notes:
      "Not part of Sydney. NLR Newcastle Interchange–Newcastle Beach, six stops. No Hunter/Central Coast trains, no Stockton ferry. DST. Testers live; not a store listing.",
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
