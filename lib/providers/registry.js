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
