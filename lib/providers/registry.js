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
    status: "live",
    agency: "Metlink",
    integration: "Metlink GTFS zip (public) + GTFS-RT (METLINK_API_KEY, x-api-key)",
    modes: ["train"],
    envKeys: ["METLINK_API_KEY"],
    adapterReady: true,
    notes:
      "Separate city from Auckland. TRAIN only (Kāpiti, Hutt Valley, Melling, Johnsonville, Wairarapa). No bus/ferry/cable car. D1 pack in docs/wellington-d1/. MEL live terminus Western Hutt while Melling Station closed. DST. Flipped live by Tim, 30 Aug 2026.",
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
    status: "live",
    agency: "SL",
    integration: "SL Transport JSON (no key); Trafiklab GTFS Sweden optional (TRAFIKLAB_GTFS_SWEDEN_KEY / TRAFIKLAB_GTFS_SWEDEN_RT_KEY)",
    modes: ["train", "metro"],
    envKeys: ["TRAFIKLAB_GTFS_SWEDEN_KEY", "TRAFIKLAB_GTFS_SWEDEN_RT_KEY"],
    adapterReady: true,
    notes:
      "Tunnelbana 10/11/13/14/17/18/19 + Pendeltåg 40/41/43/48. No buses. Lock T-Centralen ≠ Stockholm City ≠ Stockholms central. Line 48 does not through-run Stockholm City. D1 pack in docs/stockholm-d1/. DST. Testers live (flipped by Tim, 30 Aug 2026); not a store listing. Trafiklab keys by env name only.",
  },
  {
    id: "goteborg",
    displayName: "Göteborg",
    timeZone: "Europe/Stockholm",
    status: "live",
    agency: "Västtrafik",
    integration:
      "Trafiklab GTFS Regional vt (TRAFIKLAB_API_KEY). Static yes; TripUpdates not published for vt — schedule-only until Trafiklab adds RT or Västtrafik OAuth is wired.",
    modes: ["tram", "train"],
    envKeys: ["TRAFIKLAB_API_KEY"],
    adapterReady: true,
    notes:
      "Tram 1–12 + city-map pendeltåg Kungsbacka/Alingsås/Ale. No metro, stombuss, båt, X-bus, or extra Västtågen. Hub Brunnsparken (8/12 miss it). Do not lock Centralstationen (Drottningtorget 15 Jun 2026). Västtågen hub Göteborg Central. DST. Testers live (flipped by Tim 29 Aug 2026); not a store listing. Boards are schedule-only until Trafiklab publishes vt TripUpdates.",
  },
  {
    id: "osaka",
    displayName: "Osaka",
    timeZone: "Asia/Tokyo",
    status: "planned",
    agency: "Osaka Metro",
    integration:
      "No official public GTFS or GTFS-RT. Transitland 0 hits. Mobility Database 0 Osaka Metro rows. Osaka Metro is not an ODPT member. Live path is unverified HTML 列車走行位置 pages, not a product contract.",
    modes: ["metro"],
    adapterReady: false,
    notes:
      "Eight subway lines only (Midosuji, Tanimachi, Yotsubashi, Chuo, Sennichimae, Sakaisuji, Nagahori Tsurumi-ryokuchi, Imazatosuji). New Tram / Nanko Port Town out. Kitakyu north of Esaka out. Hub Hommachi (M18 × Y13 × C16). Asia/Tokyo, no DST. Picker Coming Soon. Do not flip live. No official public feed. D1 pack in docs/osaka-d1/.",
  },

  {
    id: "hong-kong",
    displayName: "Hong Kong",
    timeZone: "Asia/Hong_Kong",
    status: "planned",
    agency: "MTR Corporation Limited",
    integration:
      "MTR Next Train REST empty-key GET https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php (line + sta). Live 200 verified on ISL/TWL/EAL/SIL at ADM, TML at HUH, AEL at HOK. Not wired. AEL is on the same REST — out of v1.",
    modes: ["metro"],
    adapterReady: false,
    notes:
      "Eight urban heavy-rail lines only (ISL TWL KTL TKL TCL TML EAL SIL). AEL / DIS / Light Rail / HSR out. Hub Admiralty (TWL × ISL × SIL × EAL, spec ADM). Asia/Hong_Kong, no DST. Picker Coming Soon. Do not flip live. REST exists and is not wired. D1 pack in docs/hong-kong-d1/.",
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
  {
    id: "malmo",
    displayName: "Malmö",
    timeZone: "Europe/Stockholm",
    status: "live",
    agency: "Skånetrafiken / Pågatågen",
    integration:
      "Trafiklab GTFS Regional skane (TRAFIKLAB_API_KEY static, TRAFIKLAB_API_KEY_RT realtime TripUpdates). Key scope unverified end-to-end from this machine — both are Vercel-only; adapter degrades to schedule-only if the RT key 403s.",
    modes: ["train"],
    envKeys: ["TRAFIKLAB_API_KEY", "TRAFIKLAB_API_KEY_RT"],
    adapterReady: true,
    notes:
      "Pågatågen regional rail only, 10 corridors, no passenger-facing line codes — chips are product + terminus (\"Pågatågen mot <far end>\"). Hub lock Malmö C, which Malmöringen (ring, line 11) calls twice per through-path with self-referential \"Malmö central\" headsign — special-cased chip (Oslo-Stortinget pattern). doNotGroup Öresundståg at Malmö C/Triangeln/Hyllie/Burlöv. No bus, no Öresundståg, no Krösatågen, no light rail (closed 1973). DST. D1 pack in docs/malmo-d1/. Do not flip live.",
  },
  {
    id: "uppsala",
    displayName: "Uppsala",
    timeZone: "Europe/Stockholm",
    status: "live",
    agency: "Mälardalstrafik (Mälartåg)",
    integration:
      "Trafiklab GTFS Regional ul (TRAFIKLAB_API_KEY static, TRAFIKLAB_API_KEY_RT realtime TripUpdates — confirmed live and populated with in-scope trips).",
    modes: ["train"],
    envKeys: ["TRAFIKLAB_API_KEY", "TRAFIKLAB_API_KEY_RT"],
    adapterReady: true,
    notes:
      "Mälartåg regional rail only (route_type 100, agency Mälardalstrafik) — no UL buses, no SL-pendeln/SL Line 40 (already in stockholm's pack). Hub lock Uppsala C. Only 19 stations have real coordinates in the ul feed (Gävle, Sala, Arlanda C, Märsta corridors) — Västerås/Eskilstuna/Stockholm Central/Örebro are not in v1, feed has zero stop-level data for them. Arlanda C and Märsta share one GTFS route_id; direction_id does not distinguish them — resolve from stop_headsign. doNotGroup SL-pendeln at Uppsala C, Knivsta, AND Arlanda C. DST. D1 pack in docs/uppsala-d1/. Do not flip live.",
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
