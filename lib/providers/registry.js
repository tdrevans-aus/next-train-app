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
      "Trafiklab GTFS Regional skane (TRAFIKLAB_API_KEY static, TRAFIKLAB_API_KEY_RT realtime TripUpdates). Both keys confirmed working live against real skane.zip/skane TripUpdates endpoints 2026-08-30.",
    modes: ["train"],
    envKeys: ["TRAFIKLAB_API_KEY", "TRAFIKLAB_API_KEY_RT"],
    adapterReady: true,
    notes:
      "Pågatågen regional rail, 10 corridors, no passenger-facing line codes — chips are product + terminus (\"Pågatågen mot <far end>\"). Hub lock Malmö C, which Malmöringen (ring, line 11) calls twice per through-path with self-referential \"Malmö central\" headsign — special-cased chip (Oslo-Stortinget pattern). Board eligibility (docs/board-eligibility-rule.md, Tim's decision 30 Aug 2026): Öresundståg and Krösatågen are `in` — both walk-up/no-reservation, same skane.zip feed, filed under GTFS route_desc (not route_long_name); own chip style (\"Öresundståg mot <far end>\" / \"Krösatåg mot <far end>\"). doNotGroup at Malmö C/Triangeln/Hyllie/Burlöv (Öresundståg) and Hässleholm C (Krösatågen) means these appear as distinct service entries at the same physical stop, not that either is hidden. Krösatågen-only stations (Killeberg, Osby, Hästveda, Ballingslöv, …) stay out of the catalog — v1 scope is the existing Malmö/Pågatågen station footprint, Krösatågen shown only where it overlaps that footprint (Hässleholm C). Snälltåget stays excluded (`out-reservation`, compulsory seat booking). No bus, no light rail (closed 1973). DST. D1 pack in docs/malmo-d1/. Testers live (flipped by Tim, 30 Aug 2026); not a store listing.",
  },
  {
    id: "helsinki",
    displayName: "Helsinki",
    timeZone: "Europe/Helsinki",
    status: "live",
    agency: "HKL / HSL",
    integration:
      "Digitransit Routing API v2 HSL GraphQL (DIGITRANSIT_SUBSCRIPTION_KEY, header digitransit-subscription-key) — station(id).stops.stoptimesWithoutPatterns blends scheduled + realtime in one call. Confirmed live 30 Aug 2026. HSL GTFS-RT (realtime.hsl.fi) is an alternative official path, not wired.",
    modes: ["metro"],
    envKeys: ["DIGITRANSIT_SUBSCRIPTION_KEY"],
    adapterReady: true,
    notes:
      "Metro M1/M2 only (shortName M1|M2, vehicleMode SUBWAY). No tram, no bus, no HSL/VR commuter rail, no Suomenlinna ferry, no M3/Itämetro (unopened). Current termini Kivenlahti/Vuosaari (M1), Tapiola/Mellunmäki (M2) — Matinkylä is a stop, not a chip (former west end 2017-2 Dec 2022). Hub lock Rautatientori (through-trunk, both lines) — doNotGroup vs Helsinki Central/Päärautatieasema (VR/commuter, different Digitransit stop-place) and vs Pasila (no metro). Direction model line + terminus (\"M1 + Kivenlahti\"), Stockholm's \"+\" convention — Rautatientori is never a direction token. DST. D1 pack in docs/helsinki-d1/. DIGITRANSIT_SUBSCRIPTION_KEY is in .env.local for local testing; still needs to be added to Vercel env before any live flip. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "oslo",
    displayName: "Oslo",
    timeZone: "Europe/Oslo",
    status: "live",
    agency:
      "Ruter / Sporveien T-banen (T-bane) + Vy (regional/commuter rail, scoped) + Flytoget (airport express, scoped)",
    integration:
      "Entur Journey Planner v3 GraphQL (POST https://api.entur.io/journey-planner/v3/graphql), stopPlace(id).estimatedCalls, header ET-Client-Name: next-train-app (NLOD open service, identifying header only — no secret key/env var). Confirmed live 30 Aug 2026 against real NSR stop places.",
    modes: ["metro", "train"],
    adapterReady: true,
    notes:
      "T-bane lines 1-5, all 101 stations (no line 6, Fornebubanen unopened). PLUS Vy regional/commuter rail (RE10, RE11, R12, R13, R14, R21, L1, L2) and Flytoget (FLY1, FLY2), both scoped ONLY to Jernbanetorget and Nationaltheatret per Tim's board-eligibility decision 30 Aug 2026 (docs/board-eligibility-rule.md, docs/oslo-d1/oracle-clash-report.md Board eligibility section) — walk-up, no compulsory reservation, no check-in barrier at these two stations. No trikk, no bus, no ferry, no other Vy/NSB service anywhere else. Hub lock Stortinget (all five T-bane lines, line 5 twice through the Common Tunnel) — never a direction token. doNotGroup, three-way at Jernbanetorget and Nationaltheatret: T-bane / Vy / Flytoget are separate mapGroup platform sections. Live confirmed the doNotGroup is also a physical NSR StopPlace split at Jernbanetorget (T-bane cluster NSR:StopPlace:58366 vs Oslo S rail cluster NSR:StopPlace:59872, both printed 'Jernbanetorget' in this catalog); Nationaltheatret is one stopPlace (58404) returning metro + rail together. Entur distinguishes operator by serviceJourney.line.authority.id (RUT:Authority:RUT / VYG:Authority:VY / FLT:Authority:FLT), not by the GTFS datasetId the D1 pack names for static feeds — the adapter filters on authority + transportMode + publicCode allow-lists, the live-confirmed equivalent for this GraphQL surface. R21 flag: R21's own terminus is Oslo S — calls whose destination is in the Oslo S name family are dropped (arriving/terminating train, not a valid outbound chip); only 'R21 + Moss' is ever synthesized. Direction model line + terminus ('1 + Frognerseteren', 'RE10 + Lillehammer', 'FLY1 + Oslo Airport'), Stockholm/Helsinki's '+' convention. Europe/Oslo has DST. D1 pack in docs/oslo-d1/. Do not flip live from this pack — Mark/Tim's call.",
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
      "Mälartåg regional rail only (route_type 100, agency Mälardalstrafik) — no UL buses, no SL-pendeln/SL Line 40 (already in stockholm's pack; SL Line 40 at the shared Knivsta stop is visible via Stockholm's own board, a known cross-city UX gap, not a silent-omission violation — docs/uppsala-d1/oracle-clash-report.md Board eligibility section). Hub lock Uppsala C. Only 19 stations have real coordinates in the ul feed (Gävle, Sala, Arlanda C, Märsta corridors) — Västerås/Eskilstuna/Stockholm Central/Örebro are not in v1, feed has zero stop-level data for them. Arlanda C and Märsta share one GTFS route_id; direction_id does not distinguish them — resolve from stop_headsign. doNotGroup SL-pendeln at Uppsala C, Knivsta, AND Arlanda C. DST. D1 pack in docs/uppsala-d1/. Testers live (flipped by Tim, 30 Aug 2026); not a store listing.",
  },
  {
    id: "east-midlands",
    displayName: "East Midlands",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Nottingham Express Transit (NET, Keolis) / National Rail (Darwin, Keolis East Midlands Trains)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port, DARWIN_LDB_TOKEN not set. NET tram: D1 pack named DFT Bus Open Data Service (f-bus~dft~gov~uk, no key) as the static GTFS source, but Jim's D2 pull of the confirmed bulk archive (31 Aug 2026) found no Nottingham Express Transit agency in it — NET has no confirmed feed at all right now, not just no real-time. See lib/providers/east-midlands.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model), same pattern as uk-west-midlands/uk-ellesmere-port — not a fork. Hub lock Nottingham Station (NOT CRS) — NET tram viaduct vs National Rail main platforms, doNotGroup (two catalog entries, same printed name, different mode). NET Line 1 Hucknall–Beeston/Chilwell, Line 2 Phoenix Park–Nottingham Station, termini-only (no confirmed intermediate stop order; D2 GTFS pull could not close this — see NetFeedUnconfirmedError). National Rail catalog: hub + through-running-only Leicester/Kettering/Wellingborough/Chesterfield/Alfreton. Tamworth deliberately excluded — genuine shared platform with West Midlands, D2 de-dup boundary for a future West Midlands pack, not built here. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources — do not relay Darwin data to end users until Tim confirms against the signed RDM Data Sharing Agreement. Europe/London, DST. D1 pack in docs/east-midlands-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "south-yorkshire",
    displayName: "South Yorkshire",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Sheffield Supertram (South Yorkshire Future Tram Limited, SYFTL) / National Rail (Darwin, EMR/Northern/TPE/CrossCountry)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands, DARWIN_LDB_TOKEN not set. Sheffield Supertram: SYFTL took over from Stagecoach 22 Mar 2024; no public GTFS/GTFS-RT feed has been confirmed under SYFTL at all — this is a genuine operator-transition skip risk (not the usual account block). See lib/providers/south-yorkshire.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model), same pattern as uk-west-midlands/uk-ellesmere-port/east-midlands — not a fork. Hub lock Sheffield Station (SHF CRS) — Supertram tram viaduct vs National Rail main platforms, doNotGroup (two catalog entries, same printed name, different mode). Meadowhall Interchange (MHS)/Meadowhall is a through-running/infrastructure-switch point, not a second hub lock — Tram-Train switches to National Rail infrastructure there. Four Supertram lines (Blue, Purple, Yellow, Tram-Train), line+terminus direction model, termini-only (Purple's Gleadless Townend branch junction is an unresolved gap from Luke — no chip generated for it, not guessed). National Rail catalog: hub + Meadowhall switch point + through-running-only Rotherham Central/Denby Dale/Darton/South Elmsall/Moorthorpe (CRS not given for these five — do not guess). Chesterfield deliberately excluded — East Midlands' station, not South Yorkshire's. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as East Midlands; Supertram/SYFTL data-source and license status also unconfirmed — a separate open item, do not conflate. Europe/London, DST. D1 pack in docs/south-yorkshire-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "north-east",
    displayName: "North East (Tyne and Wear)",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Tyne and Wear Metro (DB Regio for Nexus) / National Rail (Darwin, Northern Trains + cross-boundary TOCs)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire, DARWIN_LDB_TOKEN not set. Tyne and Wear Metro: UNLIKE East Midlands' NET / South Yorkshire's Supertram, the static GTFS genuinely exists — Jim's D2 pull of the DFT Bus Open Data no-key bulk archive (itm_all_gtfs.zip, agency_id OP241 'Tyne and Wear Metro', 31 Aug 2026) confirmed real route/trip/stop_times data for both lines, closing the D1 pack's intermediate-stop-order gap (Green 31 stations South Hylton–Newcastle Airport, Yellow 41 unique stations St James–South Shields, both matching the oracle report's counts exactly; also confirms Yellow calls Pelaw, previously unconfirmed). BUT the board itself is still blocked, for a third and genuinely different reason from the usual account block: the confirmed archive's stop_times.txt is ~5.4GB uncompressed and deterministically exceeds the ~537M UTF-16 unit string limit the shared static-cache.js helper's whole-zip TextDecoder.decode() can handle (Node ERR_STRING_TOO_LONG, verified directly, not a timeout). No smaller no-key per-operator download exists. fetchMetroStopBoard() throws MetroGtfsTooLargeError immediately rather than attempting the doomed ~1.46GB download. Needs a streaming/row-filtering GTFS parser in static-cache.js (shared by ~10 other live cities) — flagged for whoever picks that up, not solved in this adapter. No public real-time feed exists for Metro either (metro-rti.nexus.org.uk is undocumented/app-only) — moot until the static-parsing gap closes. See lib/providers/north-east.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model), same pattern as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire — not a fork. Hub lock Newcastle Central (NCL CRS) — Metro Central (GTFS name 'Central Station') is a deep-tube box below National Rail's main platforms, doNotGroup, two catalog entries with DIFFERENT printed names (no name-collapse risk). Sunderland is a genuinely different, NOT-doNotGroup case: Metro Green Line and National Rail Northern Trains share the same platforms/track Pelaw–Sunderland — modelled as SUNDERLAND_SHARED_PLATFORM (lib/cities/north-east/marketing-directions.js), flagged for a future board-merging pass rather than split into tabs; National Rail CRS not given in the oracle report, not guessed. Pelaw is a Metro-only through-running junction (both lines call it, GTFS-confirmed), not a National Rail station. National Rail catalog: hub + Sunderland (shared) + through-running-only Berwick-upon-Tweed (BWK, Scotland boundary open/unresolved). Darlington (DRL) deliberately excluded — confirmed unclaimed by both this pack and East Midlands' own already-merged pack, a cross-region boundary flagged not guessed. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as the rest of the UK wave; separately, Nexus/DB Regio should be asked whether a public Metro real-time feed exists or will be published. Also flagged, not resolved here: the oracle report cites Rotherham Central (South Yorkshire) as a Sunderland precedent, but South Yorkshire's own merged pack says Rotherham Central has no shared platform — a cross-pack data-quality inconsistency for whoever owns UK station-graph QA, not touched here. Europe/London, DST. D1 pack in docs/north-east-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "west-of-england",
    displayName: "West of England",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, GWR primary; TfW/CrossCountry/SWR at boundaries)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire/north-east, DARWIN_LDB_TOKEN not set. UNLIKE every other National Rail region packed so far, there is no static GTFS fallback at all — National Rail Enquiries does not publish static GTFS anywhere, so this region is genuinely Darwin-or-nothing until the token exists. See lib/providers/west-of-england.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Bristol Temple Meads (BRI), secondary hub Bath Spa (BTH) — no doNotGroup at either, single-layer GWR-dominated termini, platforms distinguished by route not operator (unlike East Midlands' Nottingham Station / North East's Newcastle Central, no tram/metro two-layer case here). National Rail catalog: hub + secondary hub + through-running-only Chepstow (CPW, South Wales boundary), Gloucester (GCR, West Midlands boundary), Westbury (WSB, Solent/Thames Valley boundary), Taunton (TAU, Southwest boundary) — all D2 de-dup concerns for future adjacent-region packs, not merges here. Direction model destination+operator (e.g. 'London Paddington (GWR)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave — do not relay Darwin data to end users until Tim confirms against the signed RDM Data Sharing Agreement. Europe/London, DST. D1 pack in docs/west-of-england-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "south-wales",
    displayName: "South Wales",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, TfW/GWR/CrossCountry through-running at Cardiff Central)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire/north-east/west-of-england, DARWIN_LDB_TOKEN not set. Transport for Wales Valley Lines is deliberately EXCLUDED from this catalog — not an account block, TfW has no confirmed public GTFS static or GTFS-RT feed of any kind (confidence 'not found' throughout the oracle report). A reference National Rail static GTFS dump exists (Transitland, CC-BY-2.0 UK) but is not used as a fallback, same Darwin-or-nothing shape as West of England. See lib/providers/south-wales.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Cardiff Central (CDF) — not Cardiff Queen Street, not Cardiff Bay, not Pontypridd; shared physical station with Valley Lines on separate infrastructure (footbridge connect), proposed doNotGroup not built since there is no Valley Lines board to group against. National Rail catalog: hub + through-running-only Severn Tunnel Junction (STJ, Wales-England boundary on the South Wales Main Line). KNOWN OPEN ITEM, not resolved here: this pack's oracle report names STJ as the Wales-England corridor boundary, while West of England's already-merged pack instead names Chepstow (CPW) for the same corridor — both stations stay through-running-only in their own region's catalog; reconciling which is correct is a D2/Tim item, not guessed at during wiring. Direction model destination+operator (e.g. 'London Paddington (GWR)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Transport for Wales Valley Lines (six commuter routes, 81 stations per an explicitly-unverified Wikipedia list) is NOT built in any form — no station graph, no direction model, no catalog entry; genuinely no public feed exists, not a skip risk to chase further without a TfW reply. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave. Europe/London, DST. D1 pack in docs/south-wales-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "west-yorkshire",
    displayName: "West Yorkshire",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, Northern Trains/TransPennine Express primary; LNER/CrossCountry at boundaries)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire/north-east/west-of-england/south-wales, DARWIN_LDB_TOKEN not set. See lib/providers/west-yorkshire.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Leeds Station (LDS) — major interchange, 18 platforms, rail only (bus at separate interchange, forward doNotGroup note only, no bus board built). Secondary hub Bradford Forster Square (BDQ). Bradford Interchange (BDI) is a SEPARATE catalog entry, walk-link only to BDQ, doNotGroup — both stay in-catalog since BDI carries National Rail (Northern Trains) service too. National Rail catalog: hub + secondary hub + through-running-only Bradford Interchange (BDI), Denby Dale (DDL, South Yorkshire boundary), Walsden (WAD, Greater Manchester boundary) + regional Huddersfield/Halifax/Todmorden/Hebden Bridge/Keighley. Board eligibility (docs/west-yorkshire-d1/oracle-clash-report.md, per docs/board-eligibility-rule.md): Northern Trains, LNER, CrossCountry, TransPennine Express all verdict `in` (no compulsory reservation, no check-in barrier) — no operator-level filtering applied, every operator calling here passes the walk-up test. KNOWN OPEN ITEM, not resolved here: Denby Dale is also carried in South Yorkshire's own catalog (CRS left null there) — cross-region de-dup NOT resolved, a D2/Tim item; Walsden's Greater Manchester counterpart pack does not exist yet. Direction model destination+operator (e.g. 'Manchester Piccadilly (TransPennine Express)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave. Europe/London, DST. D1 pack in docs/west-yorkshire-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "rest-of-wales",
    displayName: "Rest of Wales",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, Transport for Wales franchisee; CrossCountry/GWR at boundaries)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire/north-east/west-of-england/south-wales/west-yorkshire, DARWIN_LDB_TOKEN not set. See lib/providers/rest-of-wales.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "CITY ID CORRECTED from the D1 pack's 'uk-wales' (docs/rest-of-wales-d1/ followed a since-fixed stale uk-architecture.md prefix table) to 'rest-of-wales', matching the plain kebab-case convention every UK region has used since West Yorkshire (south-wales, west-yorkshire, north-east, etc.) — see docs/rest-of-wales-d1/jim-handoff.md open item 3. Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Wrexham General (WRX) only — junction of North Wales Main Line, North Wales Coast Line, and Borderlands Line; not Wrexham Central. Aberystwyth (AYW, Mid Wales terminus) and Carmarthen (CMN, West Wales junction) are corridor-significant but explicitly NOT hub-locked. Three corridors (North Wales, Mid Wales, West Wales) with no inter-corridor through-running within Wales; 17 in-catalog stations, flat allow-list (uk/catalog.js has no corridor-grouping concept — corridor recorded in each station's `class` field). Four doNotGroup candidates (Wrexham General route directions, Carmarthen branch-vs-through-running, Whitland three-way branch, Machynlleth Aberystwyth/Pwllheli split) are PROPOSED ONLY in the D1 pack — no platform/service-pattern detail to build an enforced rule from; left flagged, not built. Real-time feed status for Transport for Wales specifically is UNCONFIRMED — a narrower gap than South Wales' Valley Lines 'no feed at all' case: static GTFS via Transitland is confirmed live, but whether Darwin/OpenLDBWS carries live TfW data has not been confirmed (data@tfw.wales not yet contacted). Treated structurally the same as any other unconfirmed/blocked feed — do not assume it works once DARWIN_LDB_TOKEN is provisioned. Direction model destination+operator (e.g. 'Holyhead (TfW)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Boundary/pass-through stations NOT in catalog: Chester (CTR, England), Shrewsbury (England, no CRS given), unnamed Carmarthen-to-Swansea continuation (South Wales region boundary). Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave. Europe/London, DST. D1 pack in docs/rest-of-wales-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "rest-of-scotland",
    displayName: "Rest of Scotland",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, ScotRail primary; CrossCountry/LNER Highland Chieftain through-running; Caledonian Sleeper excluded)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire/north-east/west-of-england/south-wales/west-yorkshire/rest-of-wales, DARWIN_LDB_TOKEN not set. See lib/providers/rest-of-scotland.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "STRUCTURAL DEPARTURE from every other UK region packed so far: FOUR CO-EQUAL TIER-1 HUB LOCKS, not one primary hub — Perth (PTH), Inverness (INV), Aberdeen (ABD), Dundee (DDE), each independently a genuine terminus/multi-line junction with no station-graph basis to rank one above the others (docs/rest-of-scotland-d1/hazard-pack.md H6). CONFIRMED before wiring: the shared uk-darwin.js + uk/catalog.js board-fetch pattern is a flat per-station allow-list with no single-hub assumption anywhere in the shared code — 'hub' is a documentation label in each station's `class` field, not a structural constraint — so no design change was needed to support four co-equal hubs; see lib/providers/rest-of-scotland.js file header. Branch termini: Kyle of Lochalsh (KLS), Thurso (THR), Wick (WCK, no through-running), Mallaig (MLG), Fort William (FTW, both Caledonian Sleeper). PERTH NAME COLLISION — FOR TIM'S ATTENTION, NOT RESOLVED HERE: this region's hub station 'Perth' (PTH, Scotland) shares its printed display name with the existing LIVE city Perth, Australia (city id `perth`, lib/providers/perth.js) — two entirely separate city ids and codebases, no internal conflation, but the app has no UI disambiguation string yet (e.g. 'Perth, Scotland' vs 'Perth, Australia') and needs a product decision before both are user-facing at once. Caledonian Sleeper carries board-eligibility verdict `out-reservation` (compulsory berth booking) per docs/board-eligibility-rule.md and is excluded from the board at Aberdeen, Inverness, Fort William, and Mallaig specifically (not city-wide — it doesn't call at Perth or Dundee) — enforced in code via a new `excludeOperators` option added to the shared uk-darwin.js fetchStationBoard() (matches Darwin's `<operator>` tag, case-insensitive substring), not just documented; unverified against a live payload since DARWIN_LDB_TOKEN is unset. ScotRail/CrossCountry/LNER Highland Chieftain all verdict `in` everywhere they call, no operator filtering applied to them. Regional boundary vs. future Glasgow/Edinburgh (Falkirk High area) is UNRESOLVED — this catalog stays north of that boundary, no Central Belt stations included, flagged for whoever builds Glasgow/Edinburgh next. Direction model destination+operator (e.g. 'Inverness (ScotRail)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave. Europe/London, DST. D1 pack in docs/rest-of-scotland-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "london-se-national-rail",
    displayName: "London & South East National Rail",
    timeZone: "Europe/London",
    status: "planned",
    agency:
      "National Rail (Darwin; SWR, Southern/Gatwick Express, Southeastern, Thameslink, Greater Anglia, c2c, Great Northern, GWR at their London termini)",
    integration:
      "One agency (several TOCs), one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. See lib/providers/london-se-national-rail.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "FIRST MULTI-GROUP UK REGION: NO SINGLE HUB-LOCK. Tim's Option A decision (docs/london-se-national-rail-d1/jim-handoff.md) is seven independent per-terminus station groups — Waterloo (SWR), Victoria (Southern/Gatwick Express), London Bridge (Southeastern/Southern/Thameslink), Liverpool Street (Greater Anglia/c2c), King's Cross (Great Northern), St Pancras International (Thameslink), Paddington (GWR) — genuinely separate destinations, not alternate routes to one hub. Euston is NOT built (report never names its regional operator, only the excluded Caledonian Sleeper) and seven secondary termini (Blackfriars, Cannon Street, Charing Cross, Farringdon, Fenchurch Street, Marylebone, Moorgate) are NOT built (report-marked TBD). DESIGN DECISION MADE HERE: the existing single-hub uk/catalog.js allow-list shape extends cleanly to multi-group regions with no new plumbing layer — a 'group' is just N catalog entries sharing a groupId, keyed by name/alias rather than forced 1:1 with CRS; no per-city multi-hub CityConfig extension was needed. INTERNAL doNotGroup (new case, not just documented): London Bridge (3 operators, 1 CRS LBG) and Liverpool Street (2 operators, 1 CRS LST) each split into per-operator sub-boards via a NEW `includeOperators` option added to the shared uk-darwin.js fetchStationBoard() (symmetric to Rest of Scotland's excludeOperators, fails closed on a missing operator tag) — every prior UK region's doNotGroup was between two different CRS codes, never a split of one CRS's own board, so this is genuinely new enforcement, not a config-only extension. LNER excluded at King's Cross (board-eligibility verdict stays `undecided` after this pack's own research attempt — curl fetches of lner.co.uk/Wikipedia/Google/DuckDuckGo all failed to return verifiable operator-policy text; excluded per the walk-up rule, not defaulted to in; flagged back to Nico/Tim for a proper search-capable pass). Eurostar excluded at St Pancras International (out-checkin). Night Riviera Sleeper excluded at Paddington (out-reservation). CRS codes UNVERIFIED (crsVerified: false throughout) — confirm against a live GTFS dump or Darwin response before treating as authoritative. Direction model destination+operator (e.g. 'Brighton (Southern)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Regional boundaries flagged, not resolved: GWR/Paddington into West of England (Bristol Temple Meads), SWR/Waterloo southwest (no adjacent region built), CrossCountry system-wide. Missing docs/united-kingdom-ledger.md flagged again (per docs/country-lane.md's standing retrofit, overdue since this region). Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave. Europe/London, DST. D1 pack in docs/london-se-national-rail-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "glasgow",
    displayName: "Glasgow",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Strathclyde Partnership for Transport (SPT) — Glasgow Subway / National Rail (Darwin, ScotRail both termini, Avanti West Coast at Glasgow Central)",
    integration:
      "Two agencies, hybrid shape. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. Glasgow Subway: no confirmed GTFS-RT feed found for SPT; the static candidate (TravelWhiz community aggregation) is reachable but has no confirmed per-region data file/release path within this session's scope, and its stop order is unverified against a GTFS stop_times dump or an official SPT map. fetchSubwayStopBoard() throws GlasgowSubwayFeedUnverifiedError rather than fabricating a schedule. See lib/providers/glasgow.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "TWO INDEPENDENT NETWORKS under one city id: Glasgow Subway (SPT, hub-locked at Buchanan Street, one circular line) plus National Rail at two independent termini, no single hub-lock ('Option A at n=2', same principle as london-se-national-rail's multi-group pattern at much smaller scale) — Glasgow Central (GLC, ScotRail + Avanti West Coast) and Glasgow Queen Street (GLQ, ScotRail only), separate buildings, not rail-connected, genuinely different corridors. Neither National Rail group needs internal doNotGroup (no evidence of separate boarding-section logic per operator, unlike London Bridge/Liverpool Street) — each is one flat destination+operator board. FIRST CLOSED-LOOP METRO IN THIS PIPELINE: Glasgow Subway has no termini at all — direction model is printed 'Outer Circle'/'Inner Circle' labels (docs/glasgow-d1/direction-model-memo.md), not line+terminus; this needs no verified station order (both directions call at every station on a loop), but Inner/Outer-per-platform computation and any next-station logic would, and neither is built here — SUBWAY_STATIONS in lib/cities/glasgow/subway-directions.js is carried unverified (stationOrderVerified: false), not guessed. doNotGroup: Buchanan Street (Subway) vs Glasgow Queen Street (travelator-connected, separate operators/infrastructure); St Enoch (Subway) vs Glasgow Central (short walk, not connected). Caledonian Sleeper excluded at Glasgow Central only (out-reservation, docs/board-eligibility-rule.md), enforced via the shared uk-darwin.js excludeOperators option. Falkirk High (FKK) EXCLUDED — owned by the Edinburgh region per the exclusive-territory split (Tim's decision), not catalogued here. CRS codes GLC/GLQ unverified (crsVerified: false). Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as every other UK region in this wave; separately, contact data@spt.co.uk to confirm whether an official Subway static/real-time GTFS feed will ever be published, and TravelWhiz/SPT to clarify underlying license terms; confirm the literal Outer/Inner Circle platform-signage wording before D5 assertion tables lock a label string. Missing docs/united-kingdom-ledger.md flagged again (per docs/country-lane.md's standing retrofit, overdue across ten+ NR regions now). Europe/London, DST. D1 pack in docs/glasgow-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "edinburgh",
    displayName: "Edinburgh",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Transport for Edinburgh / Edinburgh Trams Ltd. — Edinburgh Trams (T50) / National Rail (Darwin, ScotRail primary; LNER, Avanti West Coast, CrossCountry, TransPennine Express through-running)",
    integration:
      "Two agencies, single-hub shape. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. Edinburgh Trams: static GTFS confirmed reachable (DFT BODS, OGL 3.0) but not fetched or parsed by this pack; no confirmed real-time feed exists (TfE Open Data API closed/inactive, no successor confirmed). See lib/providers/edinburgh.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "STRUCTURALLY DIFFERENT FROM GLASGOW: SINGLE National Rail hub-lock (Edinburgh Waverley, EDB), not two independent termini — Haymarket (HYM) and Slateford (SLA) are through-running satellite stations on the same route network, closer to Newcastle/Rotterdam's single-hub shape than Glasgow's or london-se-national-rail's multi-hub shape; do not apply Glasgow's 'Option A at n=2' pattern here. None of the three National Rail groups need internal doNotGroup (single flat destination+operator board each, no evidence of separate boarding-section logic). Region config over the shared uk-darwin.js provider (allow-list + direction model), not a fork. Edinburgh Trams T50: 22 named stops in the D1 pack's station array (Newhaven-Edinburgh Airport) despite the oracle report's own prose stating '23 stops' in several places — an unresolved count discrepancy inside the source pack, not padded or resolved here. Standard line+terminus direction model ('T50 towards Edinburgh Airport' / 'T50 towards Newhaven'), NOT Glasgow Subway's closed-loop Outer/Inner Circle model. Stop order UNVERIFIED (stationOrderVerified: false) — never checked against an official Edinburgh Trams map or the DFT BODS GTFS stop_sequence; fetchTramStopBoard() throws EdinburghTramsFeedUnverifiedError rather than fabricating a schedule (same 'throw, don't guess' contract as Glasgow's GlasgowSubwayFeedUnverifiedError). Cross-mode doNotGroup at Edinburgh Waverley: the Trams line's hub-lock is also named 'Edinburgh Waverley' but is a separate physical stop from the National Rail station, no automatic interchange described in the report — enforced via lib/cities/edinburgh/tram-directions.js DO_NOT_GROUP_PAIRS, not a name-matching heuristic. Haymarket carries the same two-catalog-entries shape (Trams stop vs National Rail station), kept distinct by mode-scoped lookup only, no additional evidence of enforcement need. Caledonian Sleeper excluded at Edinburgh Waverley only (out-reservation, docs/board-eligibility-rule.md), enforced via the shared uk-darwin.js excludeOperators option. Falkirk High EXCLUDED — Edinburgh's own oracle report never lists it as an Edinburgh station (report line 9: 'Glasgow's boundary station'), while Glasgow's already-merged pack's prose instead calls it 'owned by Edinburgh region' — both packs independently exclude it from their own catalogs (no functional contradiction), but this ownership disagreement is unresolved prose flagged back to Nico/Tim, not settled here. Edinburgh Park (National Rail station) also excluded — only the Trams stop (Edinburgh Park Central) is in v1 scope. CRS codes EDB/HYM/SLA unverified (crsVerified: false). Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as every other UK region in this wave; separately, contact trams@tfe.scot to confirm whether a Trams real-time successor will ever be published. Missing docs/united-kingdom-ledger.md flagged again (per docs/country-lane.md's standing retrofit, overdue across eleven+ NR regions now). Europe/London, DST. D1 pack in docs/edinburgh-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "solent",
    displayName: "Solent (Southampton / Portsmouth)",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, South Western Railway primary at both hubs; Southern West Coastway, GWR and CrossCountry through-running)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. No static GTFS fallback exists for this feed at all — National Rail Enquiries does not publish static GTFS anywhere, so this region is genuinely Darwin-or-nothing until the token exists, same shape as West of England/South Wales/West Yorkshire/Rest of Wales/Rest of Scotland/london-se-national-rail/Glasgow's National Rail half. See lib/providers/solent.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). TWO-HUB architecture, not a single hub-lock and not full flat multi-group (London SE Option A shape): Southampton Central (SOU) stands alone as the west-side hub; Portsmouth Harbour (PMH) is the east-side hub paired with Portsmouth & Southsea (PMS) as a secondary board on the same corridor/waterfront — reusing West of England's Bristol Temple Meads + Bath Spa hub+secondary-hub pattern, not promoting PMS to a third independent hub the way london-se-national-rail's seven termini are mutually independent. Southampton Central and the Portsmouth pair are independent of each other, never merged. No doNotGroup needed at any of the three boards — no report evidence of separate platform/boarding-section logic per operator, unlike London Bridge/Liverpool Street in london-se-national-rail. National Rail catalog: three stationGroups (SOU/PMH/PMS) + through-running junctions Fareham (FAR) and Eastleigh (ESL, no hub significance) + through-running-only boundary stations Westbury (WSB, West of England boundary) and Waterloo (WAT, London & South East National Rail boundary) — both boundary flags checked reciprocally consistent against those two regions' own already-merged packs, no de-dup action taken, D2/adapter-time concern for whichever region wires second. Island Line excluded entirely (out-mode, Wightlink FastCat ferry dependency to Ryde Pier Head from Portsmouth Harbour), not catalogued in any form. CRS codes (SOU, PMH, PMS, FAR, ESL, WSB, WAT) are carried from the oracle report's tables and NOT verified against a live GTFS dump or Darwin response — crsVerified: false throughout. Direction model destination+operator, illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave — do not relay Darwin data to end users until Tim confirms against the signed RDM Data Sharing Agreement. Also open for Tim only, not resolved here: (1) confirm the two-hub/hub+secondary architecture is the intended shape — the oracle report explicitly asked for Tim/Luke/Jim review before this pack proceeded; (2) Portsmouth & Southsea's real ridership weight relative to Portsmouth Harbour, in case it warrants promotion to a fully independent hub. Europe/London, DST. D1 pack in docs/solent-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "thames-valley",
    displayName: "Thames Valley (Reading / Oxford)",
    timeZone: "Europe/London",
    status: "planned",
    agency: "National Rail (Darwin, Great Western Railway primary at both hubs; CrossCountry and South Western Railway through-running at Reading; Chiltern Railways at Oxford/Banbury)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. No static GTFS fallback exists for this feed at all — National Rail Enquiries does not publish static GTFS anywhere, same Darwin-or-nothing shape as West of England/Solent/South Wales/West Yorkshire/Rest of Wales/Rest of Scotland/london-se-national-rail/Glasgow's and Edinburgh's National Rail halves. See lib/providers/thames-valley.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). HUB + SECONDARY-HUB architecture, reused from West of England (Bristol Temple Meads/Bath Spa) and Solent (Southampton Central alone, Portsmouth Harbour/Portsmouth & Southsea pair): Reading (RDG) is the hub lock, single flat board despite three operators (GWR/CrossCountry/SWR) — report explicitly rules out multi-operator platform mixing at Reading (line 36). Oxford (OXF) is the secondary hub but UNLIKE Bath Spa/Portsmouth & Southsea needs an internal doNotGroup split — GWR main line and Chiltern Railways' Marylebone branch sit on separate platforms/infrastructure (report line 16, 37, 56, C2/C3 point 4/6) — FIRST TIME in this pipeline a SECONDARY hub (not a primary terminus) has needed this, previously only seen at London Bridge/Liverpool Street (both primary termini) in london-se-national-rail. Enforced identically: two catalog entries sharing CRS OXF, split by operator, includeOperators passed to the shared uk-darwin.js fetchStationBoard(). Five through-running-only stations catalogued flat, none built as split boards: Swindon (SWI), Banbury (BAN, Chiltern+GWR on separate infrastructure at the same town, proposed doNotGroup only if ever promoted), Westbury (WSB, boundary to West of England/Solent, already flagged reciprocally in both those regions' finished packs), Henley-on-Thames (HEY), Didcot Parkway (DID). London Paddington and London Marylebone are boundary-only references to London & South East National Rail's catalog (Paddington already built there, Marylebone explicitly not built there either) — neither built here. CRS codes (RDG, OXF, SWI, BAN, WSB, HEY, DID) carried from the oracle report's tables, NOT verified against a live GTFS dump or Darwin response — crsVerified: false throughout. Direction model destination+operator, illustrative only — no destination strings confirmed until a live Darwin payload can be pulled; at Oxford this applies within each doNotGroup section separately. SKIP RISK: Chiltern Railways moves from Arriva to DfT Operator on 20 September 2026 (report skip risk 3) — not a blocker, timing flag only for whoever wires the token on or after that date, verify Darwin operator attribution and any agency mapping. Open item for Tim only: OpenLDBWS/RDM Platform Agreement redistribution terms to third-party riders are unclear in public sources, same as every other UK region in this wave — do not relay Darwin data to end users until Tim confirms against the signed RDM Data Sharing Agreement. Also open for Tim only: whether Next Train's architecture supports a Darwin-only next-train model or requires a GTFS base layer, since NRE publishes no static GTFS directly (Transitland's derived feed is reference-only, CC-BY-2.0 UK, not pulled here). docs/united-kingdom-ledger.md still does not exist — flagged again per docs/country-lane.md's standing retrofit, overdue across this pipeline's National Rail regions. Europe/London, DST. D1 pack in docs/thames-valley-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "greater-manchester",
    displayName: "Greater Manchester",
    timeZone: "Europe/London",
    status: "planned",
    agency: "Transport for Greater Manchester (TfGM) — Manchester Metrolink / National Rail (Darwin, Northern/Avanti West Coast/TransPennine Express/CrossCountry/East Midlands Railway/Transport for Wales)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. Metrolink real-time is genuinely UNCONFIRMED, not the standard account block: TfGM's developer portal (opendata.tfgm.com) is deprecated and issues no new API keys, existing keys continue on an unconfirmed timeline, and no public GTFS-RT feed has been confirmed anywhere — same kind of gap as South Yorkshire's Supertram/SYFTL case. fetchMetrolinkStopBoard() throws MetrolinkFeedUnconfirmedError rather than fabricating a schedule. See lib/providers/greater-manchester.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model) plus a Metrolink metro-mode catalog, same pattern as south-yorkshire/east-midlands/north-east — not a fork. TWO AGENCIES, TWO HUB+SECONDARY-HUB PAIRS, cross-linked at one shared-building station — a deliberate departure from the oracle report's own headline C2/C3 point 4 sentence ('hub lock: Manchester Victoria'), built instead from the report's own supporting facts (line 22: Manchester Piccadilly 14 platforms/all six TOCs vs Manchester Victoria 6 platforms/two TOCs). Treating Victoria as National Rail's only hub lock would leave four of six operators (Avanti, CrossCountry, East Midlands Railway, Transport for Wales) with no hub-anchored board — a board-eligibility-rule violation; see docs/greater-manchester-d1/jim-handoff.md and direction-model-memo.md for the full reasoning, flagged there as open item 1 for Tim to sanity-check. National Rail hub lock Manchester Piccadilly (MAN CRS); secondary hub Manchester Victoria (MCV CRS). Metrolink hub lock St Peter's Square; secondary hub Manchester Victoria. Manchester Victoria is built ONCE as a shared-building stationGroup, doNotGroup: true between its Metrolink and National Rail layers — same shape as Sheffield Station (South Yorkshire) and Nottingham Station (East Midlands). Manchester Piccadilly (National Rail) and Piccadilly Gardens (Metrolink) are built as TWO SEPARATE stationGroups, doNotGroup: true between them — a ~100m/5-10 min walk-link pair, not a shared building, closer in shape to West Yorkshire's Bradford Forster Square/Bradford Interchange pair. Eight Metrolink lines, line+terminus direction model, termini-only per the report's C2/C3 point 10 (not a full 99-stop order — real gap, ~85 of 99 stops uncatalogued). Green and Purple share the same terminus pair (Altrincham-Bury) with opposite line names, unexplained by the report — not resolved. The Eccles line's second terminus is printed as bare 'Manchester' with no further disambiguation — deliberately NOT a catalog station, not guessed. Stockport (SMN CRS, National Rail) and the Metrolink 'Stockport' tram stop are two separate, non-co-located stops (~0.5km apart) — never conflated. FLAGGED CRS MISMATCH, NOT RESOLVED: Walsden is WDN in this region's own oracle report but WAD in West Yorkshire's already-merged pack for the same physical boundary station — this catalog uses WDN because that is what THIS region's own report gives, per instruction not to silently pick one; West Yorkshire's files are untouched. Direction model for National Rail is destination+operator, illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Open items for Tim only, not resolved here: (1) confirm the two-agency, two-hub-pair architecture; (2) Metrolink real-time feed status — contact TfGM (data.analytics@tfgm.com) to confirm whether a replacement GTFS-RT feed is planned before assuming permanent schedule-only; (3) OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as every other UK region in this wave; (4) Walsden WDN/WAD mismatch, needs a live Darwin response or National Rail's published CRS list to resolve; (5) Green/Purple terminus overlap, needs a live TfGM timetable or GTFS payload to confirm. docs/united-kingdom-ledger.md still does not exist — flagged again per docs/country-lane.md's standing retrofit, overdue across this pipeline's UK regions. Europe/London, DST. D1 pack in docs/greater-manchester-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "liverpool-city-region",
    displayName: "Liverpool City Region",
    timeZone: "Europe/London",
    status: "planned",
    agency:
      "National Rail (Darwin; Northern Trains primary franchise, Avanti West Coast/TransPennine Express/East Midlands Railway/Transport for Wales/West Midlands Trains/CrossCountry through-running) / Merseyrail (Serco / Transport UK Group concession) — Northern Line + Wirral Line",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. Merseyrail static GTFS is confirmed live (Transitland f-gc-rail~delivery~group~planar~gtfs, verified 2026-08-31), but real-time is genuinely UNCONFIRMED — no public GTFS-RT endpoint found anywhere, only an undocumented mobile-app internal API — same kind of gap as Greater Manchester's Metrolink case and South Yorkshire's Supertram/SYFTL case, not the standard account block. fetchMerseyrailStopBoard() throws MerseyrailFeedUnconfirmedError rather than fabricating a schedule. See lib/providers/liverpool-city-region.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model) plus a Merseyrail metro-mode catalog, same pattern as south-yorkshire/east-midlands/north-east/greater-manchester — not a fork. V1 SCOPE IS A DELIBERATE DEVIATION FROM THE ORACLE REPORT'S OWN HEADLINE RECOMMENDATION: the report's own Recommendation section suggests National Rail only for v1 (defer Merseyrail to H2); Luke's D1 pack builds Option A instead (National Rail + Merseyrail, Merseyrail schedule-only) on the grounds that Merseyrail's confirmed-static/unconfirmed-real-time shape matches Metrolink's and Supertram's precedent of shipping schedule-only rather than exclusion, and that board eligibility verdicts Merseyrail 'in' — flagged as open item 1 for Tim in docs/liverpool-city-region-d1/direction-model-memo.md, not silently followed either way. TWO STRUCTURALLY SEPARATE AGENCY SHAPES, NOT ONE SHARED HUB: National Rail hub lock Liverpool Lime Street (LIV CRS, seven TOCs), secondary hub Liverpool South Parkway (LPY CRS, airport connector). Merseyrail's own interchange pair is Liverpool Central and Moorfields — both named 'dual-line interchange' by the report with no ranking given between them (contrast Greater Manchester's Metrolink report, which explicitly ranks St Peter's Square over Victoria); neither built as sole Merseyrail hub lock. LIME STREET STRUCTURAL AMBIGUITY (H1), UNRESOLVED, CARRIED AS-IS: the report contradicts itself on whether Merseyrail's Northern/Wirral Line presence at Lime Street shares platforms with National Rail ('platform level', report line 41) or is separate infrastructure connected by footbridge (report line 73, C2/C3 point 2) — no distance/time figure given either way, unlike Manchester Victoria's or Manchester Piccadilly/Piccadilly Gardens' explicit figures. Kept as Luke built it: TWO SEPARATE stationGroups (mode train 'Liverpool Lime Street', mode metro 'Liverpool Lime Street'), doNotGroup: true between them, using the more conservative separate-infrastructure reading — not resolved by this wiring pass either; see docs/liverpool-city-region-d1/hazard-pack.md H1. Two Merseyrail lines (Northern Line: Liverpool-Southport/Ormskirk/Headbolt Lane; Wirral Line: Liverpool-Ellesmere Port/West Kirby/Chester), line+terminus direction model, termini/branches-only per the report's tables (not a full 69-stop order — real gap, only Liverpool Central/Moorfields/Ellesmere Port individually named). Marketing chips are deliberately NOT generated for Liverpool Central or Moorfields even though direction-model-memo.md's own illustrative example shows six chips for Liverpool Central — the memo itself flags that whether all six branch destinations call at Central specifically (vs splitting across Central/Moorfields) is unconfirmed; chips are only generated for a station that is itself a genuine, individually confirmed terminus (Ellesmere Port). 'Liverpool' as printed in the report's termini table is NOT a catalog station — forbidden-collapse token, same treatment as Greater Manchester's bare 'Manchester' terminus for the Eccles line. ELLESMERE PORT REGISTRY DISCREPANCY — THIRD FLAG, NOT RESOLVED: `uk-ellesmere-port` exists as its own standalone registry entry (status planned); the tracker says it should eventually fold into Liverpool City Region. This region's Merseyrail catalog independently includes Ellesmere Port as a genuine Wirral Line terminus named in the oracle report — that inclusion is NOT a resolution of the registry-scope question. `uk-ellesmere-port`'s own registry entry and files are left completely untouched by this wiring pass; fold-in vs keep-standalone is explicitly Tim's call (Nico flagged first in research, Luke's D1 pack second, this wiring pass third — do not flag a fourth time without an actual decision). Open items for Tim only, not resolved here: (1) confirm the National Rail + Merseyrail (schedule-only) v1 scope decision; (2) Lime Street/Merseyrail structural relationship (H1) — confirm with a walk-distance figure, site documentation, or a live Merseyrail/Darwin response; (3) Merseyrail real-time feed status — contact Merseyrail (data@merseyrail.org) to confirm whether a public feed exists or is planned; (4) Ellesmere Port registry-scope decision (third flag); (5) OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as every other UK region in this wave; (6) Liverpool Central vs Moorfields ranking, if a real one exists. docs/united-kingdom-ledger.md still does not exist — flagged again per docs/country-lane.md's standing retrofit, overdue across this pipeline's UK regions. Europe/London, DST. D1 pack in docs/liverpool-city-region-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "greater-anglia",
    displayName: "Greater Anglia",
    timeZone: "Europe/London",
    status: "planned",
    agency:
      "National Rail (Darwin; Greater Anglia primary franchise) / Thameslink and CrossCountry through-running at Cambridge/Ely / Thameslink, CrossCountry, East Midlands through-running at Peterborough boundary / LNER at Peterborough excluded (undecided board-eligibility verdict)",
    integration:
      "One primary agency. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — same account-level blocker as every other UK region in this wave, DARWIN_LDB_TOKEN not set. Unlike West of England, Greater Anglia has a live static GTFS feed (Transitland f-gc-rail~delivery~group~planar~gtfs, CC-BY-2.0 UK, no key, verified 2026-09-01) as a reference/verification source, but this adapter does not pull it for board data — Darwin is the only real-time path, same MissingDarwinTokenError shape as every other Darwin-only region. See lib/providers/greater-anglia.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + config), same pattern as west-of-england/london-se-national-rail — not a fork. Hub lock Norwich (NRW). TWO secondary hubs, Cambridge (CBG) and Ipswich (IPS) — the oracle report gives both identical hub-tier language (report lines 22-24, 131), a deliberate departure from West of England's single-secondary-hub shape (Bath Spa only); see docs/greater-anglia-d1/hazard-pack.md H6. No doNotGroup needed at Norwich, Cambridge, or Ipswich — single-building walk-up stations, Thameslink at Cambridge and Thameslink/CrossCountry at Ely both pass the board-eligibility test alongside Greater Anglia. Peterborough (PBO) is explicitly NOT a hub — flat catalog entry with excludeOperators: [\"LNER\"] (board-eligibility verdict undecided, reserved-by-default policy — the SAME open question as London & South East National Rail's own LNER gap at King's Cross, not a separate one, not resolved here or there); flagged for a future multi-region ledger (cross-regional shared-platform de-dup with any East Midlands/LNER Peterborough entry). Colchester (COL, third-tier per the report) and Ely (ELY, regional junction) kept flat, not promoted to secondary-hub status. Liverpool Street is NOT built here — Greater Anglia services calling there are already documented as `in` in London & South East National Rail's built pack (groupId liverpool-street, operators Greater Anglia + c2c, doNotGroup true) — verified once against that pack, not duplicated. CRS COLLISION CAUGHT, NOT SHIPPED: the oracle report's own station-code list assigns LST to Lowestoft, but LST is Liverpool Street's real-world CRS, already used in London & South East National Rail's built pack — Lowestoft's crs is left null in lib/cities/greater-anglia/stations.json (believed real code LOW, not confirmed against a live GTFS/Darwin source in this environment — network calls to transitfeeds.com/api.transitland.org failed/blocked here; nationalrail.co.uk's station page is client-rendered with no static CRS text) — do not guess it in. King's Lynn (KLY), Great Yarmouth (YRD), Bishops Stortford (BST), Stansted Airport (SSD), and the hub/secondary-hub/regional/boundary codes are all carried through as reported but crsVerified: false (D2 gap — confirm against the Transitland feed). Diss and Wymondham have no CRS at all in the report — left null. Station scope is intentionally the ~13 stations the oracle report explicitly names, not the full 30-50 the report itself estimates for D1 — the remaining 17-37 stations are a flagged D2 gap, not invented here. Direction model destination+operator, illustrative only — no destination strings confirmed until a live Darwin payload can be pulled; see docs/greater-anglia-d1/direction-model-memo.md. Open items for Tim only, not resolved here: (1) OpenLDBWS/RDM Platform Agreement redistribution terms unclear, same as every other UK region in this wave; (2) LNER at Peterborough's unreserved-carriage walk-up policy, same open question as London & South East's King's Cross gap — resolving one likely resolves both. docs/united-kingdom-ledger.md still does not exist — flagged again per docs/country-lane.md's standing retrofit, overdue across this pipeline's UK regions. Europe/London, DST. D1 pack in docs/greater-anglia-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "brussels",
    displayName: "Brussels",
    timeZone: "Europe/Brussels",
    status: "planned",
    agency: "STIB/MIVB",
    integration:
      "STIB/MIVB static GTFS (opendata-discovery-gtfs-static.api.production.belgianmobility.io, anonymous 200, no key, confirmed 31 Aug 2026), route_type 1 filtered to short names 1/2/5/6. Schedule-only — the BMC Waiting Time / Vehicle Positions live JSON operation path (Azure APIM gateway, header Ocp-Apim-Subscription-Key) could not be confirmed this session despite a working STIB_API_KEY (gateway 404s with its generic 'Resource not found' rather than 401, so the key itself is accepted); the developer portal's API listing is a client-side-rendered SPA this environment cannot execute. Not wired — see lib/providers/brussels.js file header for every path tried.",
    modes: ["metro"],
    envKeys: ["STIB_API_KEY"],
    adapterReady: true,
    notes:
      "Metro 1/2/5/6 only (60 unique stops). No tram, no premetro/North-South Axis, no CHRONO, no SNCB/NMBS, no bus, no De Lijn, no TEC. No passenger metro 3 or 4 — Albert-Bordet is a frozen project. Hub lock Arts-Loi / Kunst-Wet (metro 1x2x5x6, through-cross: 1/5 E-W trunk, 2/6 inner-ring loop N-S) — never a direction token. Simonis and Elisabeth are two distinct line-2/6 terminus chips, never collapsed. Bilingual FR/NL locked names with a slash (Stockel / Stokkel, Gare du Midi / Zuidstation, ...); same-in-both-languages names (Beekkant, Simonis, Elisabeth, Schuman, ...) stay single. DST. D1 pack in docs/brussels-d1/. STIB_API_KEY is in Vercel (Production/Preview/Development). Do not flip live from this pack — Mark/Tim's call.",
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
