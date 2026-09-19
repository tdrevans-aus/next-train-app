/**
 * City registry — integration metadata only.
 * Flip status to "live" when an adapter + catalog ships.
 * @see docs/multi-city-provider-design.md
 */

/** @typedef {"live"|"planned"|"deferred"|"retired"} CityStatus */

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
    integration: "GTFS Schedule + GTFS-R (Open Data Hub API key); sydneytrains + metro + nswtrains merged",
    modes: ["train", "metro"],
    envKeys: ["TFNSW_API_KEY"],
    adapterReady: true,
    notes:
      "14 Sep 2026: added NSW TrainLink intercity + Hunter walk-up services (BMT/CCN/SCO/SHL/HUN) as a third merged GTFS source; XPT/Xplorer/coach stay excluded (compulsory reservation) — see docs/sydney-d1/board-eligibility-intercity.md.",
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
    status: "live",
    agency: "National Rail / West Midlands Metro",
    integration: "Darwin OpenLDBWS + TfWM GTFS-RT",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN", "TFWM_API_APP_ID", "TFWM_API_APP_KEY"],
    adapterReady: true,
    notes: "Darwin live (PR #188, 2 Sep 2026). TfWM Metro: credentials gap (TFWM_API_APP_ID/TFWM_API_APP_KEY unset, FB-48), board surfaces explicit error until registered. 75 National Rail + 35 Metro. Region allow-list — not city=uk. See docs/uk-architecture.md",
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
    status: "retired",
    agency: "Auckland Transport",
    integration: "AT GTFS zip (public) + GTFS-R Realtime Compat (AT_API_KEY)",
    modes: ["train"],
    envKeys: ["AT_API_KEY"],
    adapterReady: true,
    notes:
      "Retired from release 1, 7 Sep 2026 (Tim): static-join city outside launch markets; adapter kept. TRAIN only (STH, EAST, WEST, ONE). Hub Waitematā Station. Paerātā and Drury in. CRL not passenger-open. DST.",
  },
  {
    id: "wellington",
    displayName: "Wellington",
    timeZone: "Pacific/Auckland",
    status: "retired",
    agency: "Metlink",
    integration: "Metlink GTFS zip (public) + GTFS-RT (METLINK_API_KEY, x-api-key)",
    modes: ["train"],
    envKeys: ["METLINK_API_KEY"],
    adapterReady: true,
    notes:
      "Retired from release 1, 7 Sep 2026 (Tim): static-join city outside launch markets; adapter kept. Separate city from Auckland. TRAIN only (Kāpiti, Hutt Valley, Melling, Johnsonville, Wairarapa). No bus/ferry/cable car. D1 pack in docs/wellington-d1/. MEL live terminus Western Hutt while Melling Station closed. DST.",
  },
  {
    id: "amsterdam",
    displayName: "Amsterdam",
    timeZone: "Europe/Amsterdam",
    status: "retired",
    agency: "GVB",
    integration: "OVapi GTFS + GTFS-RT (no key; User-Agent next-train)",
    modes: ["train"],
    adapterReady: true,
    notes:
      "Retired from release 1, 7 Sep 2026 (Tim): static-join city outside launch markets; adapter kept. GVB metro M50–M54 only. Not city=nl. Hub Centraal Station (not NS Amsterdam Centraal). DST. OVapi GTFS-RT live (re-enabled 5 Sep 2026, PR #261); static fixture refreshed manually (see codebase-inventory 6.7). Shared 20 s TripUpdates cache, 5 s timeout, live / timetable marker (PR #261).",
  },
  {
    id: "rotterdam",
    displayName: "Rotterdam",
    timeZone: "Europe/Amsterdam",
    status: "retired",
    agency: "RET",
    integration: "OVapi GTFS + GTFS-RT (no key; User-Agent next-train)",
    modes: ["train"],
    adapterReady: true,
    notes:
      "Retired from release 1, 7 Sep 2026 (Tim): static-join city outside launch markets; adapter kept. RET metro A–E only. Separate from amsterdam. Not city=nl or the-hague. Hub Beurs. DST. OVapi GTFS-RT live (re-enabled 5 Sep 2026, PR #261); static fixture refreshed manually (see codebase-inventory 6.7). Shared 20 s TripUpdates cache, 5 s timeout, live / timetable marker (PR #261).",
  },
  {
    id: "vancouver",
    displayName: "Vancouver",
    timeZone: "America/Vancouver",
    status: "retired",
    agency: "TransLink",
    integration: "TransLink static GTFS (no key) + GTFS-RT v3 (TRANSLINK_API_KEY)",
    modes: ["train"],
    envKeys: ["TRANSLINK_API_KEY"],
    adapterReady: true,
    notes:
      "Retired from release 1, 7 Sep 2026 (Tim): static-join city outside launch markets; adapter kept. SkyTrain only (Expo, Millennium, Canada Line). Not city=canada. Hub Waterfront. No bus/SeaBus/WCE. Broadway Subway not passenger-open. DST. Required disclaimer on Vancouver screens only; no TransLink logo/mark/domain.",
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
      "Board: Västtrafik Planera Resa v4 only (VASTTRAFIK_CLIENT_ID/VASTTRAFIK_CLIENT_SECRET, OAuth2 client-credentials) — live estimated times per stop area, stop-area GIDs carried in lib/cities/goteborg/stations.json. No timetable fallback and no static GTFS on the board path (Tim, 7 Sep 2026, PR #332): a Västtrafik failure surfaces VasttrafikUnavailableError (retryable), never a schedule board. Trafiklab GTFS Regional vt (TRAFIKLAB_API_KEY) is used offline only (catalog generation, snapshot publishing, fixtures) via the Vercel blob snapshot.",
    modes: ["tram", "train"],
    envKeys: ["TRAFIKLAB_API_KEY", "VASTTRAFIK_CLIENT_ID", "VASTTRAFIK_CLIENT_SECRET"],
    adapterReady: true,
    notes:
      "Tram 1–12 + city-map pendeltåg Kungsbacka/Alingsås/Ale. No metro, stombuss, båt, X-bus, or extra Västtågen. Hub Brunnsparken (8/12 miss it). Do not lock Centralstationen (Drottningtorget 15 Jun 2026). Västtågen hub Göteborg Central. DST. Testers live (flipped by Tim 29 Aug 2026); not a store listing. Live boards via Västtrafik Planera Resa v4 (docs/jim-brief-goteborg-vasttrafik-live.md), live-only since PR #332; Västtågen labels normalised to chips (#319), bus rows on colliding tram codes dropped (#321). Quota unknown — 30s shared cache per stop area, conservative (see docs/goteborg-d1/jim-handoff.md). Open: Nordstan has no Västtrafik stop area (recommend drop); Västtrafik rate limit and v4 licence terms still to be confirmed by Tim.",
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
    status: "live",
    agency: "Nottingham Express Transit (NET, Keolis) / National Rail (Darwin, Keolis East Midlands Trains)",
    integration:
      "Two agencies. National Rail via uk-darwin.js (Darwin OpenLDBWS, DARWIN_LDB_TOKEN live 2 Sep 2026). NET tram: static GTFS via DFT Bus Open Data Service (f-bus~dft~gov~uk, no key, confirmed 31 Aug 2026). NET boards surface explicit NetFeedUnconfirmedError (no confirmed real-time feed) per board-eligibility rule and Tim's approval (2 Sep 2026). See lib/providers/east-midlands.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model), same pattern as uk-west-midlands/uk-ellesmere-port — not a fork. Hub lock Nottingham Station (NOT CRS) — NET tram viaduct vs National Rail main platforms, doNotGroup (two catalog entries, same printed name, different mode). NET Line 1 Hucknall–Toton Lane (renamed from the non-stop label 'Beeston/Chilwell' 7 Sep 2026), Line 2 Phoenix Park–Nottingham Station, termini-only (D2 GTFS pull confirms stop order). National Rail catalog: hub + through-running-only Leicester/Kettering/Wellingborough/Chesterfield/Alfreton. Tamworth deliberately excluded — genuine shared platform with West Midlands, D2 de-dup boundary for a future West Midlands pack, not built here. NET tram verdict: out-product (feed unconfirmed, board surfaces error). National Rail services (EMR/CrossCountry/Northern): in. Tim confirmed NET error-surfacing approach and Darwin redistribution approval at flip-PR merge (2 Sep 2026). Europe/London, DST. D1 pack in docs/east-midlands-d1/. Live as of 2 Sep 2026.",
  },
  {
    id: "south-yorkshire",
    displayName: "South Yorkshire",
    timeZone: "Europe/London",
    status: "live",
    agency: "Sheffield Supertram (South Yorkshire Future Tram Limited, SYFTL) / National Rail (Darwin, EMR/Northern/TPE/CrossCountry)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Sheffield Supertram: SYFTL took over from Stagecoach 22 Mar 2024; no public GTFS/GTFS-RT feed has been confirmed under SYFTL at all — this is a genuine operator-transition skip risk (not the usual account block). See lib/providers/south-yorkshire.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model), same pattern as uk-west-midlands/uk-ellesmere-port/east-midlands — not a fork. Hub lock Sheffield Station (SHF CRS) — Supertram tram viaduct vs National Rail main platforms, doNotGroup (two catalog entries, same printed name, different mode). Meadowhall Interchange (MHS)/Meadowhall is a through-running/infrastructure-switch point, not a second hub lock — Tram-Train switches to National Rail infrastructure there. Four Supertram lines (Blue, Purple, Yellow, Tram-Train), line+terminus direction model, termini-only (Purple's Gleadless Townend branch junction is an unresolved gap from Luke — no chip generated for it, not guessed). National Rail catalog: hub + Meadowhall switch point + through-running-only Rotherham Central/Darton/South Elmsall/Moorthorpe (CRS codes live-verified 5 Sep 2026, see docs/jim-brief-uk-crs-sweep-2.md). Denby Dale is West Yorkshire's, not catalogued here. Chesterfield deliberately excluded — East Midlands' station, not South Yorkshire's. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Supertram/SYFTL data-source and license status also unconfirmed — a separate open item, do not conflate. Europe/London, DST. D1 pack in docs/south-yorkshire-d1/. Live as of 6 Sep 2026.",
  },
  {
    id: "north-east",
    displayName: "North East (Tyne and Wear)",
    timeZone: "Europe/London",
    status: "live",
    agency: "Tyne and Wear Metro (DB Regio for Nexus) / National Rail (Darwin, Northern Trains + cross-boundary TOCs)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Tyne and Wear Metro is OUT-PRODUCT (Tim, 5 Sep 2026, walk-up-rule precedent from East Midlands' NET — see docs/jim-brief-north-east-metro-out-product.md and docs/united-kingdom-ledger.md §3/§4): no confirmed public real-time feed exists for Metro (the only candidate, metro-rti.nexus.org.uk, is undocumented/app-only), and the only public data is the static timetable inside the DfT BODS national archive, which the app never fetches, at request time or in any job. The streaming/row-filtering GTFS parser landed generally in static-cache.js (PR #253, a genuine capability improvement used by other cities) but is NOT the reason Metro is out-product — the earlier MetroGtfsTooLargeError (the archive's stop_times.txt exceeding V8's string length limit) is retired, not lifted, because the real blocker was always the missing real-time feed, not the parser. fetchMetroStopBoard() throws MetroFeedUnconfirmedError immediately, modelled on East Midlands' NetFeedUnconfirmedError. Nexus outreach drafted (Viv, docs/outreach-drafts/north-east-nexus.md), pending a reply. See lib/providers/north-east.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model), same pattern as uk-west-midlands/uk-ellesmere-port/east-midlands/south-yorkshire — not a fork. Hub lock Newcastle Central (NCL CRS) — Metro Central (GTFS name 'Central Station') is a deep-tube box below National Rail's main platforms, doNotGroup, two catalog entries with DIFFERENT printed names (no name-collapse risk). Sunderland is a genuinely different, NOT-doNotGroup case: Metro Green Line and National Rail Northern Trains share the same platforms/track Pelaw–Sunderland — modelled as SUNDERLAND_SHARED_PLATFORM (lib/cities/north-east/marketing-directions.js), flagged for a future board-merging pass rather than split into tabs; National Rail CRS not given in the oracle report, not guessed. Pelaw is a Metro-only through-running junction (both lines call it, GTFS-confirmed), not a National Rail station. National Rail catalog: hub + Sunderland (shared, CRS SUN — CRS codes live-verified 5 Sep 2026, see docs/jim-brief-uk-crs-sweep-2.md) + through-running-only Berwick-upon-Tweed (BWK, Scotland boundary open/unresolved). Darlington (DRL) deliberately excluded — confirmed unclaimed by both this pack and East Midlands' own already-merged pack, a cross-region boundary flagged not guessed. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Metro board eligibility verdict: out-product (Tim, 5 Sep 2026) — no confirmed real-time feed; static-timetable boards are not offered; the 60-station Metro catalog is kept as-is (not deleted) so the doNotGroup/shared-platform wiring above still resolves and a future confirmed Nexus feed slots in without a catalog rebuild. Nexus/DB Regio outreach drafted asking whether a public Metro real-time feed exists or will be published (docs/outreach-drafts/north-east-nexus.md), pending reply. Also flagged, not resolved here: the oracle report cites Rotherham Central (South Yorkshire) as a Sunderland precedent, but South Yorkshire's own merged pack says Rotherham Central has no shared platform — a cross-pack data-quality inconsistency for whoever owns UK station-graph QA, not touched here. Europe/London, DST. D1 pack in docs/north-east-d1/. Live as of 6 Sep 2026.",
  },
  {
    id: "west-of-england",
    displayName: "West of England",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, GWR primary; TfW/CrossCountry/SWR at boundaries)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS), now genuinely live — RDM REST rewrite (commit 215a93f/PR #188) verified against Bristol Temple Meads with real data, DARWIN_LDB_TOKEN set in production. UNLIKE every other National Rail region packed so far, there is no static GTFS fallback at all — National Rail Enquiries does not publish static GTFS anywhere, so this region is genuinely Darwin-or-nothing, but Darwin itself is no longer blocked. See lib/providers/west-of-england.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Bristol Temple Meads (BRI), secondary hub Bath Spa (BTH) — no doNotGroup at either, single-layer GWR-dominated termini, platforms distinguished by route not operator (unlike East Midlands' Nottingham Station / North East's Newcastle Central, no tram/metro two-layer case here). National Rail catalog: hub + secondary hub + through-running-only Chepstow (CPW, South Wales boundary), Gloucester (GCR, West Midlands boundary), Westbury (WSB, Solent/Thames Valley boundary), Taunton (TAU, Southwest boundary) — all D2 de-dup concerns for future adjacent-region packs, not merges here. Direction model destination+operator (e.g. 'London Paddington (GWR)'), derived live from the Darwin board itself (lib/cities/west-of-england/dogfood-next-train.js) — no printed route/line map exists for Darwin, same structural fact as every National Rail-only region in this pipeline. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/west-of-england-d1/. Flipped live 2 Sep 2026 (Tim's call, following the Darwin REST fix).",
  },
  {
    id: "southwest",
    displayName: "South West (Devon / Cornwall)",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, GWR primary; CrossCountry through-running)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Same 'no static GTFS at all' gap as West of England / London & South East National Rail — genuinely Darwin-or-nothing until the token exists. See lib/providers/southwest.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Exeter St Davids (EXD), secondary hub Plymouth (PLY), terminus Penzance (PNZ) — no doNotGroup needed at any of the three, single-layer GWR-dominated stations, platforms distinguished by route not operator. National Rail catalog: hub + secondary hub + terminus + through-running-only Taunton (TAU, West of England boundary — not a merge, matches West of England's own Taunton flag from the other side), Newton Abbot (NTA), Totnes (TOT), Truro (TRU), St Austell (SAU), St Erth (SER). CRS codes live-verified 5 Sep 2026 (see docs/jim-brief-uk-crs-sweep-2.md) — Newton Abbot and Totnes were corrected from originally-catalogued codes (NAB, TON) that Darwin resolved to different stations entirely (an HTTP error and Tonbridge in Kent, respectively). Night Riviera Sleeper excluded (out-reservation, compulsory sleeping-car cabin reservation) at the six stations it calls — Exeter St Davids, Plymouth, Truro, St Austell, St Erth, Penzance — enforced in code via excludeOperators, same mechanism as Rest of Scotland's Caledonian Sleeper exclusion, consistent with the same service's out-reservation verdict at Paddington in the London & South East National Rail pack. Direction model destination+operator (e.g. 'London Paddington (GWR)'), derived live from Darwin with no static line map. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/southwest-d1/.",
  },
  {
    id: "cumbria",
    displayName: "Cumbria",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, Northern Trains primary; Avanti West Coast/TransPennine Express through-running; CrossCountry calling pattern unconfirmed; Caledonian Sleeper excluded at Carlisle)",
    integration:
      "One agency family, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). See lib/providers/cumbria.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork) — the simplest UK station-graph shape this wave: ONE tier-1 hub lock (Carlisle, CAR — 8 platforms, junction of West Coast Main Line/Settle-Carlisle Line/Tyne Valley Line/Cumbrian Coast Line, plus Lakes Line reachable via Oxenholme) with TWO tier-2 secondary hubs (Oxenholme Lake District, OXN — WCML/Lakes Line branch point; Barrow-in-Furness, BIF — Furness Line/Cumbrian Coast Line junction), contrast Rest of Scotland's four co-equal hubs with no ranking basis. Penrith (PNR) is a major WCML station but not a junction — built regional, not promoted to hub. No doNotGroup case anywhere in this catalog — every junction is a single physical station, unlike Liverpool City Region's Lime Street or Greater Manchester's Piccadilly/Piccadilly Gardens. Regional/branch stations: Windermere (WDM, Lakes Line terminus), Kendal (KEN, Lakes Line), Settle (SET, Settle-Carlisle Line southern boundary). CRS codes live-verified 5 Sep 2026 (see docs/jim-brief-uk-crs-sweep-2.md) — five of the seven originally-catalogued codes (OXO, PEN, WND, KND, SLF) were corrected: OXO and SLF returned HTTP errors from Darwin, and PEN/WND/KND resolved to unrelated stations elsewhere in Great Britain (Penarth in South Wales, Wendover in Bucks, Kingswood in Surrey). Caledonian Sleeper carries board-eligibility verdict `out-reservation` (compulsory berth booking) per docs/board-eligibility-rule.md and is excluded from the board at Carlisle only — the sole Cumbrian station it calls — enforced in code via the shared uk-darwin.js excludeOperators option, same mechanism as Rest of Scotland's/Southwest's sleeper exclusions; confirmed against a live Darwin payload 6 Sep 2026 (Carlisle board returned Northern/TransPennine Express/Avanti West Coast trips only, Caledonian Sleeper absent). Northern Trains/TransPennine Express/Avanti West Coast all verdict `in` everywhere they call; CrossCountry's Cumbrian calling pattern is unconfirmed and not added to any station's operator list. STATION COVERAGE GAP: only 7 of the report's claimed 48 Cumbrian stations are catalogued (its own aggregate count for the remainder is internally inconsistent, 38 vs. 41) — the other ~41 are a recorded D2 gap, not invented; needs a corrected/complete station list from Nico or a verified GTFS/Darwin pull. Regional boundaries checked against already-merged adjacent packs (Rest of Scotland, Greater Manchester) — no live overlap found at Lockerbie/Preston/Wigan/Settle today, remains an open D2 coordination point if either adjacent region's scope changes. Direction model destination+operator (e.g. 'Glasgow Central (Avanti West Coast)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/cumbria-d1/. THIS IS THE LAST REGION IN THE CURRENT UK EXPANSION WAVE per the dispatch brief — confirm before dispatching further UK region packs whether the queue is genuinely exhausted. National Rail is what is live as of 6 Sep 2026.",
  },
  {
    id: "rest-of-england",
    displayName: "Rest of England",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, mixed operators nationwide)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). See lib/providers/rest-of-england.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "New region (docs/jim-brief-uk-station-fill-phase2b.md, 14 Sep 2026) — an internal catch-all home for the 436 English National Rail stations UK station fill phase 2a's fifteen named regions did not claim (docs/uk-station-fill/unassigned-england.md), not a geographic area a rider picks by name. Tim rejected stretching an existing region's territory to absorb these; the country-wide station picker means riders search the whole country and never choose a region, so this is a home for the data only. Region config over the shared uk-darwin.js provider (allow-list, no fork), same pattern as rest-of-wales/west-of-england/southwest. No hub lock, no doNotGroup case inside this catalog — it spans the whole of England so no single station is structurally a hub. Nine stations that would otherwise belong here (Altrincham, Eccles, Manchester Airport, Rochdale; Brockley Whins, East Boldon, Heworth, Manors, Seaburn) were held back and added instead to greater-manchester/north-east as mode: \"train\" entries with an explicit doNotGroup pair against the same-name Metrolink/Tyne and Wear Metro stop, since both regions' own marketing-directions.js files hardcode those bare names in their line+terminus direction model — see lib/cities/greater-manchester/marketing-directions.js and lib/cities/north-east/marketing-directions.js DO_NOT_GROUP_PAIRS, and docs/uk-station-fill/assignment.md's 'Direction-model collisions held back, not force-added' section. excludeOperators not applied anywhere in this catalog — no station here was already a recorded Caledonian Sleeper/Night Riviera calling point at the time of this pass. All 436 entries carry crsVerified: true, crsSource 'live Darwin probe 2026-09-14' — already live-verified against Darwin during phase 2a, catalogued here without re-probing. Direction model destination+operator, illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. Do not flip live from this pack — Mark/Tim's call. `live-city-api.js` dispatch switch-cases (directionsFor/getMultiCityNextTrain) and lib/cities/rest-of-england/dogfood-next-train.js are wired ahead of the flip; rest-of-england is deliberately NOT in MULTI_CITY_IDS yet — that list-membership edit, plus brisbane-dogfood.js's mount/available map and journey-model.js's persisted-city/country lists, is Mark's flip commit (qa/live-city-lists-sync.mjs enforces they equal the registry's live set).",
  },
  {
    id: "south-wales",
    displayName: "South Wales",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, TfW/GWR/CrossCountry through-running at Cardiff Central)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Transport for Wales Valley Lines is confirmed on Darwin (live-probed 5 Sep 2026, all 16 catalog CRS codes return boards) — see lib/providers/south-wales.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Re-scope 7 Sep 2026 (docs/south-wales-d1/jim-handoff.md): 16-station catalog, up from 2. Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Cardiff Central (CDF) — not Cardiff Queen Street, not Cardiff Bay. Cardiff Queen Street (CDQ) is now a secondary hub in its own right (own catalog entry, own board, Valley Lines Rhondda/Merthyr junction only, no mainline through-running), not merely a name to exclude. Valley Lines is confirmed on Darwin (live-probed 5 Sep 2026, all 16 catalog CRS codes return boards), modelled as line + terminus, termini-only (four of six named termini catalogued: Merthyr, Aberdare, Treherbert/Rhondda, Rhymney; Coryton and Ebbw Vale termini not yet catalogued — no CRS confirmed, a Tim/D2 item). No doNotGroup entries anywhere in this catalog: Cardiff Central shares its single Darwin CRS/board with mainline services (operator-mixed) rather than getting a separate Valley Lines board, so there is still nothing to group against, just for a different reason than the old 'no board exists yet' framing. Severn Tunnel Junction (STJ, Wales-England boundary on the South Wales Main Line) stays through-running-only. RESOLVED per docs/united-kingdom-ledger.md SS2 (Tim, 5 Sep 2026): STJ and West of England's Chepstow (CPW) are both in Wales on different corridors, both home their own region, both stay through-running-only — no longer an open D2 item. Direction model destination+operator (e.g. 'London Paddington (GWR)'), illustrative only, no live Darwin destination-string pull done — for mainline; line+terminus (termini-only) for Valley Lines. This pack catalogues 16 stations total (Valley Lines termini/junctions + mainline), sourced from the report's live-probed table, not the old ~81-station explicitly-unverified Wikipedia list; the ~70 intermediate Valley Lines halts across all six lines remain out of catalog — a future expansion pass, not a gap in this pass. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/south-wales-d1/. Region is already live (was flipped before this re-scope) — this PR is a catalog extension, not a flip.",
  },
  {
    id: "west-yorkshire",
    displayName: "West Yorkshire",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, Northern Trains/TransPennine Express primary; LNER/CrossCountry at boundaries)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). See lib/providers/west-yorkshire.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "ADAPTER WIRED AND VERIFIED LIVE (5 Sep 2026, docs/west-yorkshire-d1/jim-handoff.md 'Adapter wired' section) — lib/cities/west-yorkshire/dogfood-next-train.js reuses the shared uk-darwin.js + uk/direction-hubs.js helpers (allow-list, no fork), dispatched from lib/cities/live-city-api.js's directionsFor()/getMultiCityNextTrain() switch-cases; not yet in MULTI_CITY_IDS (list membership is bundled into the flip commit, per CLAUDE.md's flip-follow-through split). All ten CRS codes confirmed live against Darwin 5 Sep 2026 (four were wrong in the original pack: Denby Dale DDL->DBD, Walsden WAD->WDN, Hebden Bridge HBN->HBD, Keighley KEY->KEI — see qa/west-yorkshire-dogfood-gate.mjs's catalog CRS sweep). Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Leeds Station (LDS) — major interchange, 18 platforms, rail only (bus at separate interchange, forward doNotGroup note only, no bus board built). Secondary hub Bradford Forster Square (BDQ). Bradford Interchange (BDI) is a SEPARATE catalog entry, walk-link only to BDQ, doNotGroup — both stay in-catalog since BDI carries National Rail (Northern Trains) service too. National Rail catalog: hub + secondary hub + through-running-only Bradford Interchange (BDI), Denby Dale (DBD, South Yorkshire boundary), Walsden (WDN, Greater Manchester boundary) + regional Huddersfield/Halifax/Todmorden/Hebden Bridge/Keighley. Board eligibility (docs/west-yorkshire-d1/oracle-clash-report.md, per docs/board-eligibility-rule.md): Northern Trains, LNER, CrossCountry, TransPennine Express all verdict `in` (no compulsory reservation, no check-in barrier) — no operator-level filtering applied, every operator calling here passes the walk-up test. Direction hub anchoring NOT wired for v1: all ten stations' live chip sets were probed 5 Sep 2026 for an operator split on 'Leeds' (Liverpool shape) or an obscure through-run terminus past Leeds (Kidderminster shape) — neither case appeared in the live sample, so no direction-hubs.json ships (see jim-handoff.md for the chip tables). KNOWN OPEN ITEM, not resolved here: Denby Dale is also carried in South Yorkshire's own catalog (CRS left null there) — cross-region de-dup NOT resolved, a D2/Tim item; Walsden's Greater Manchester counterpart pack does not exist yet. Direction model destination+operator (e.g. 'Manchester Piccadilly (TransPennine Express)'), confirmed live against a real Darwin payload 5 Sep 2026. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/west-yorkshire-d1/. STATUS STAYS PLANNED — do not flip live from this pack — Mark/Tim's call. Flip commit — list additions for Mark (per CLAUDE.md's flip-follow-through split; dispatch switch-cases, dogfood module, and qa/west-yorkshire-dogfood-gate.mjs are already wired ahead of the flip and need no further change): add 'west-yorkshire' to (1) lib/cities/live-city-api.js's MULTI_CITY_IDS array and MultiCityId typedef, (2) brisbane-dogfood.js's mount/available map, (3) journey-model.js's persisted-city/country lists — bundle these three list-membership edits into the status-flip commit itself, not before, per qa/live-city-lists-sync.mjs.",
  },
  {
    id: "rest-of-wales",
    displayName: "North, Mid & West Wales",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, Transport for Wales franchisee; CrossCountry/GWR at boundaries)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). See lib/providers/rest-of-wales.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "CITY ID CORRECTED from the D1 pack's 'uk-wales' (docs/rest-of-wales-d1/ followed a since-fixed stale uk-architecture.md prefix table) to 'rest-of-wales', matching the plain kebab-case convention every UK region has used since West Yorkshire (south-wales, west-yorkshire, north-east, etc.) — see docs/rest-of-wales-d1/jim-handoff.md open item 3. Region config over the shared uk-darwin.js provider (allow-list, no fork). Hub lock Wrexham General (WRX) only — junction of North Wales Main Line, North Wales Coast Line, and Borderlands Line; not Wrexham Central. Aberystwyth (AYW, Mid Wales terminus) and Carmarthen (CMN, West Wales junction) are corridor-significant but explicitly NOT hub-locked. Three corridors (North Wales, Mid Wales, West Wales) with no inter-corridor through-running within Wales; 17 in-catalog stations, flat allow-list (uk/catalog.js has no corridor-grouping concept — corridor recorded in each station's `class` field). Four doNotGroup candidates (Wrexham General route directions, Carmarthen branch-vs-through-running, Whitland three-way branch, Machynlleth Aberystwyth/Pwllheli split) are PROPOSED ONLY in the D1 pack — no platform/service-pattern detail to build an enforced rule from; left flagged, not built. Transport for Wales live departures on Darwin CONFIRMED 5 Sep 2026 by a live probe of all 17 catalog stations (see docs/united-kingdom-ledger.md §4) — no TfW contact needed for real-time. Direction model destination+operator (e.g. 'Holyhead (TfW)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Boundary/pass-through stations NOT in catalog: Chester (CTR, England), Shrewsbury (England, no CRS given), unnamed Carmarthen-to-Swansea continuation (South Wales region boundary). Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/rest-of-wales-d1/. CRS codes live-verified 5 Sep 2026 (11 corrected — see docs/jim-brief-uk-crs-corrections.md): Conwy CON->CNW, Holyhead HOY->HHD, Welshpool WEL->WLP, Machynlleth MCH->MCN, Whitland WLD->WTL, Tenby TNB->TEN, Milford Haven MLH->MFH. Fishguard Harbour FGW->FGH (FGW is the separate Fishguard & Goodwick station), live-verified the same morning; all 17 stops crsVerified: true.",
  },
  {
    id: "rest-of-scotland",
    displayName: "Aberdeen / Inverness / Dundee",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, ScotRail primary; CrossCountry/LNER Highland Chieftain through-running; Caledonian Sleeper excluded)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). See lib/providers/rest-of-scotland.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "STRUCTURAL DEPARTURE from every other UK region packed so far: FOUR CO-EQUAL TIER-1 HUB LOCKS, not one primary hub — Perth (PTH), Inverness (INV), Aberdeen (ABD), Dundee (DEE), each independently a genuine terminus/multi-line junction with no station-graph basis to rank one above the others (docs/rest-of-scotland-d1/hazard-pack.md H6). CONFIRMED before wiring: the shared uk-darwin.js + uk/catalog.js board-fetch pattern is a flat per-station allow-list with no single-hub assumption anywhere in the shared code — 'hub' is a documentation label in each station's `class` field, not a structural constraint — so no design change was needed to support four co-equal hubs; see lib/providers/rest-of-scotland.js file header. Branch termini: Kyle of Lochalsh (KYL), Thurso (THS), Wick (WCK, no through-running), Mallaig (MLG), Fort William (FTW, both Caledonian Sleeper). PERTH NAME COLLISION — FOR TIM'S ATTENTION, NOT RESOLVED HERE: this region's hub station 'Perth' (PTH, Scotland) shares its printed display name with the existing LIVE city Perth, Australia (city id `perth`, lib/providers/perth.js) — two entirely separate city ids and codebases, no internal conflation, but the app has no UI disambiguation string yet (e.g. 'Perth, Scotland' vs 'Perth, Australia') and needs a product decision before both are user-facing at once. Caledonian Sleeper carries board-eligibility verdict `out-reservation` (compulsory berth booking) per docs/board-eligibility-rule.md and is excluded from the board at Aberdeen, Inverness, Fort William, and Mallaig specifically (not city-wide — it doesn't call at Perth or Dundee) — enforced in code via a new `excludeOperators` option added to the shared uk-darwin.js fetchStationBoard() (matches Darwin's `<operator>` tag, case-insensitive substring), not just documented; unverified against a live payload since DARWIN_LDB_TOKEN is unset. ScotRail/CrossCountry/LNER Highland Chieftain all verdict `in` everywhere they call, no operator filtering applied to them. Regional boundary vs. future Glasgow/Edinburgh (Falkirk High area) is UNRESOLVED — this catalog stays north of that boundary, no Central Belt stations included, flagged for whoever builds Glasgow/Edinburgh next. Direction model destination+operator (e.g. 'Inverness (ScotRail)'), illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/rest-of-scotland-d1/. CRS codes live-verified 5 Sep 2026 (11 corrected — see docs/jim-brief-uk-crs-corrections.md): Dundee DDE->DEE, Kyle of Lochalsh KLS->KYL, Thurso THR->THS; all stops crsVerified: true.",
  },
  {
    id: "london-se-national-rail",
    displayName: "London & South East National Rail",
    timeZone: "Europe/London",
    status: "live",
    agency:
      "National Rail (Darwin; SWR, Southern/Gatwick Express, Southeastern, Thameslink, Greater Anglia, c2c, Great Northern, GWR at their London termini)",
    integration:
      "One agency (several TOCs), one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). See lib/providers/london-se-national-rail.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "FIRST MULTI-GROUP UK REGION: NO SINGLE HUB-LOCK. Tim's Option A decision (docs/london-se-national-rail-d1/jim-handoff.md) is seven independent per-terminus station groups — Waterloo (SWR), Victoria (Southern/Gatwick Express), London Bridge (Southeastern/Southern/Thameslink), Liverpool Street (Greater Anglia/c2c), King's Cross (Great Northern), St Pancras International (Thameslink), Paddington (GWR) — genuinely separate destinations, not alternate routes to one hub. Euston is NOT built (report never names its regional operator, only the excluded Caledonian Sleeper) and seven secondary termini (Blackfriars, Cannon Street, Charing Cross, Farringdon, Fenchurch Street, Marylebone, Moorgate) are NOT built (report-marked TBD). DESIGN DECISION MADE HERE: the existing single-hub uk/catalog.js allow-list shape extends cleanly to multi-group regions with no new plumbing layer — a 'group' is just N catalog entries sharing a groupId, keyed by name/alias rather than forced 1:1 with CRS; no per-city multi-hub CityConfig extension was needed. INTERNAL doNotGroup (new case, not just documented): London Bridge (3 operators, 1 CRS LBG) and Liverpool Street (2 operators, 1 CRS LST) each split into per-operator sub-boards via a NEW `includeOperators` option added to the shared uk-darwin.js fetchStationBoard() (symmetric to Rest of Scotland's excludeOperators, fails closed on a missing operator tag) — every prior UK region's doNotGroup was between two different CRS codes, never a split of one CRS's own board, so this is genuinely new enforcement, not a config-only extension. LNER resolved to `in` at King's Cross per the UK ledger, 5 Sep 2026 (see docs/united-kingdom-ledger.md §3) — no excludeOperators applied. Eurostar excluded at St Pancras International (out-checkin). Night Riviera Sleeper excluded at Paddington (out-reservation). CRS codes live-verified 5 Sep 2026 (see lib/cities/london-se-national-rail/stations.json's crsSource fields) — all stops crsVerified: true. Direction model destination+operator (e.g. 'Brighton (Southern)'), derived live from Darwin with no static line map. Regional boundaries flagged, not resolved: GWR/Paddington into West of England (Bristol Temple Meads), SWR/Waterloo southwest (no adjacent region built), CrossCountry system-wide. Cross-region facts: see docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage). Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Europe/London, DST. D1 pack in docs/london-se-national-rail-d1/.",
  },
  {
    id: "glasgow",
    displayName: "Glasgow",
    timeZone: "Europe/London",
    status: "live",
    agency: "Strathclyde Partnership for Transport (SPT) — Glasgow Subway / National Rail (Darwin, ScotRail both termini, Avanti West Coast at Glasgow Central)",
    integration:
      "Two agencies, hybrid shape. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Glasgow Subway: no confirmed GTFS-RT feed found for SPT; the static candidate (TravelWhiz community aggregation) is reachable but has no confirmed per-region data file/release path within this session's scope, and its stop order is unverified against a GTFS stop_times dump or an official SPT map. fetchSubwayStopBoard() throws GlasgowSubwayFeedUnverifiedError rather than fabricating a schedule. See lib/providers/glasgow.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "TWO INDEPENDENT NETWORKS under one city id: Glasgow Subway (SPT, hub-locked at Buchanan Street, one circular line) plus National Rail at two independent termini, no single hub-lock ('Option A at n=2', same principle as london-se-national-rail's multi-group pattern at much smaller scale) — Glasgow Central (GLC, ScotRail + Avanti West Coast) and Glasgow Queen Street (GLQ, ScotRail only), separate buildings, not rail-connected, genuinely different corridors. Neither National Rail group needs internal doNotGroup (no evidence of separate boarding-section logic per operator, unlike London Bridge/Liverpool Street) — each is one flat destination+operator board. FIRST CLOSED-LOOP METRO IN THIS PIPELINE: Glasgow Subway has no termini at all — direction model is printed 'Outer Circle'/'Inner Circle' labels (docs/glasgow-d1/direction-model-memo.md), not line+terminus; this needs no verified station order (both directions call at every station on a loop), but Inner/Outer-per-platform computation and any next-station logic would, and neither is built here — SUBWAY_STATIONS in lib/cities/glasgow/subway-directions.js is carried unverified (stationOrderVerified: false), not guessed. doNotGroup: Buchanan Street (Subway) vs Glasgow Queen Street (travelator-connected, separate operators/infrastructure); St Enoch (Subway) vs Glasgow Central (short walk, not connected). Caledonian Sleeper excluded at Glasgow Central only (out-reservation, docs/board-eligibility-rule.md), enforced via the shared uk-darwin.js excludeOperators option. Falkirk High (FKK) EXCLUDED — owned by the Edinburgh region per the exclusive-territory split (Tim's decision), not catalogued here. CRS codes GLC/GLQ unverified (crsVerified: false). Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Separately, contact data@spt.co.uk to confirm whether an official Subway static/real-time GTFS feed will ever be published, and TravelWhiz/SPT to clarify underlying license terms; confirm the literal Outer/Inner Circle platform-signage wording before D5 assertion tables lock a label string. Cross-region facts: see docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage). Europe/London, DST. D1 pack in docs/glasgow-d1/. Glasgow Subway stays documented-error (GlasgowSubwayFeedUnverifiedError); National Rail (both termini) is what is live as of 6 Sep 2026.",
  },
  {
    id: "edinburgh",
    displayName: "Edinburgh",
    timeZone: "Europe/London",
    status: "live",
    agency: "Transport for Edinburgh / Edinburgh Trams Ltd. — Edinburgh Trams (T50) / National Rail (Darwin, ScotRail primary; LNER, Avanti West Coast, CrossCountry, TransPennine Express through-running)",
    integration:
      "Two agencies, single-hub shape. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Edinburgh Trams: static GTFS confirmed reachable (DFT BODS, OGL 3.0) but not fetched or parsed by this pack; no confirmed real-time feed exists (TfE Open Data API closed/inactive, no successor confirmed). See lib/providers/edinburgh.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "STRUCTURALLY DIFFERENT FROM GLASGOW: SINGLE National Rail hub-lock (Edinburgh Waverley, EDB), not two independent termini — Haymarket (HYM) and Slateford (SLA) are through-running satellite stations on the same route network, closer to Newcastle/Rotterdam's single-hub shape than Glasgow's or london-se-national-rail's multi-hub shape; do not apply Glasgow's 'Option A at n=2' pattern here. None of the three National Rail groups need internal doNotGroup (single flat destination+operator board each, no evidence of separate boarding-section logic). Region config over the shared uk-darwin.js provider (allow-list + direction model), not a fork. Edinburgh Trams T50: 22 named stops in the D1 pack's station array (Newhaven-Edinburgh Airport) despite the oracle report's own prose stating '23 stops' in several places — an unresolved count discrepancy inside the source pack, not padded or resolved here. Standard line+terminus direction model ('T50 towards Edinburgh Airport' / 'T50 towards Newhaven'), NOT Glasgow Subway's closed-loop Outer/Inner Circle model. Stop order UNVERIFIED (stationOrderVerified: false) — never checked against an official Edinburgh Trams map or the DFT BODS GTFS stop_sequence; fetchTramStopBoard() throws EdinburghTramsFeedUnverifiedError rather than fabricating a schedule (same 'throw, don't guess' contract as Glasgow's GlasgowSubwayFeedUnverifiedError). Cross-mode doNotGroup at Edinburgh Waverley: the Trams line's hub-lock is also named 'Edinburgh Waverley' but is a separate physical stop from the National Rail station, no automatic interchange described in the report — enforced via lib/cities/edinburgh/tram-directions.js DO_NOT_GROUP_PAIRS, not a name-matching heuristic. Haymarket carries the same two-catalog-entries shape (Trams stop vs National Rail station), kept distinct by mode-scoped lookup only, no additional evidence of enforcement need. Caledonian Sleeper excluded at Edinburgh Waverley only (out-reservation, docs/board-eligibility-rule.md), enforced via the shared uk-darwin.js excludeOperators option. Falkirk High EXCLUDED — per docs/united-kingdom-ledger.md §2, ruled Edinburgh's flagship commuter corridor boundary station, through-running-only until either region promotes it; not catalogued here, no functional contradiction with Glasgow's pack. Edinburgh Park (National Rail station) also excluded — only the Trams stop (Edinburgh Park Central) is in v1 scope. CRS codes EDB/HYM/SLA unverified (crsVerified: false). Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Separately, contact trams@tfe.scot to confirm whether a Trams real-time successor will ever be published. Cross-region facts: see docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage). Europe/London, DST. D1 pack in docs/edinburgh-d1/. Edinburgh Trams stays documented-error (EdinburghTramsFeedUnverifiedError); National Rail (Waverley/Haymarket/Slateford) is what is live as of 6 Sep 2026.",
  },
  {
    id: "solent",
    displayName: "Solent (Southampton / Portsmouth)",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, South Western Railway primary at both hubs; Southern West Coastway, GWR and CrossCountry through-running)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS, live via DARWIN_LDB_TOKEN 2 Sep 2026). No static GTFS fallback exists for this feed at all — National Rail Enquiries does not publish static GTFS anywhere, so this region is Darwin-only (same shape as West of England/West Yorkshire/London & South East). See lib/providers/solent.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). TWO-HUB architecture: Southampton Central (SOU) west-side hub, Portsmouth Harbour (PMH) east-side hub with Portsmouth & Southsea (PMS) secondary on same corridor. No doNotGroup needed at any board. National Rail catalog: three stationGroups (SOU/PMH/PMS) + through-running junctions Fareham (FRM, Eastleigh ESL) + boundary stations Westbury (WSB, West of England) and Waterloo (WAT, London & South East) with reciprocal boundary checks. Island Line excluded (out-mode, ferry dependency). FLIPPED LIVE (5 Sep 2026) — all seven CRS codes confirmed live against Darwin, crsVerified: true. Direction hub anchoring: Fareham (FRM) hub for Portsmouth Harbour operator-split collapse (GWR+SWR both print 'Portsmouth Harbour' here). Southampton Central shows identical split but no hub wired (shared-helper one-hub-per-appliesFrom limitation; routes via exact-chip, flagged for future follow-up). Direction model destination+operator from live Darwin, 5 Sep 2026. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Also open: (1) two-hub vs hub+secondary precedent confirmation; (2) Portsmouth & Southsea ridership weight vs Harbour, promotion-to-hub candidate; (3) Fareham multi-hub-per-station shared-helper follow-up. Europe/London, DST. D1 pack in docs/solent-d1/. Flipped 5 Sep 2026 — list memberships (MULTI_CITY_IDS, brisbane-dogfood mount/available, journey-model persisted lists, app.js NEARBY_MULTI_CITY_IDS/LIVE_CITY_IDS, city-session.js MULTI_CITY_IDS/COUNTRIES/CITY_BOUNDS) bundled into flip commit per qa/live-city-lists-sync.mjs requirement.",
  },
  {
    id: "thames-valley",
    displayName: "Thames Valley (Reading / Oxford)",
    timeZone: "Europe/London",
    status: "live",
    agency: "National Rail (Darwin, Great Western Railway primary at both hubs; CrossCountry and South Western Railway through-running at Reading; Chiltern Railways at Oxford/Banbury)",
    integration:
      "One agency, one mode. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). No static GTFS fallback exists for this feed at all — National Rail Enquiries does not publish static GTFS anywhere, same Darwin-or-nothing shape as West of England/Solent/South Wales/West Yorkshire/Rest of Wales/Rest of Scotland/london-se-national-rail/Glasgow's and Edinburgh's National Rail halves. See lib/providers/thames-valley.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list, no fork). HUB + SECONDARY-HUB architecture, reused from West of England (Bristol Temple Meads/Bath Spa) and Solent (Southampton Central alone, Portsmouth Harbour/Portsmouth & Southsea pair): Reading (RDG) is the hub lock, single flat board despite three operators (GWR/CrossCountry/SWR) — report explicitly rules out multi-operator platform mixing at Reading (line 36), confirmed live 5 Sep 2026. Oxford (OXF) is the secondary hub but UNLIKE Bath Spa/Portsmouth & Southsea needs an internal doNotGroup split — GWR main line and Chiltern Railways' Marylebone branch sit on separate platforms/infrastructure (report line 16, 37, 56, C2/C3 point 4/6) — FIRST TIME in this pipeline a SECONDARY hub (not a primary terminus) has needed this, previously only seen at London Bridge/Liverpool Street (both primary termini) in london-se-national-rail. Enforced identically: two catalog entries sharing CRS OXF, split by operator, includeOperators passed to the shared uk-darwin.js fetchStationBoard(). CROSS-COUNTRY DISCOVERY (5 Sep 2026, live-probed, not named by the D1 report): CrossCountry (Newcastle/Manchester Piccadilly/Bournemouth/Reading) genuinely calls at Oxford on the same main-line platforms as GWR — added to the 'Oxford (GWR)' board's operators so its already-recorded board-eligibility 'in' verdict isn't silently dropped; Chiltern's board stays Chiltern-only, confirmed by live chip tables (no cross-contamination either direction). Five through-running-only stations catalogued flat, none built as split boards: Swindon (SWI), Banbury (BAN, Chiltern+GWR+CrossCountry on separate infrastructure at the same town — live-probed, an operator split on 'Oxford' itself was NOT found, no train from Banbury prints 'Oxford' as a terminus, so no hub there), Westbury (WSB, boundary to West of England/Solent, already flagged reciprocally in both those regions' finished packs), Henley-on-Thames (HOT, corrected from a stale HEY 5 Sep 2026 hygiene pass), Didcot Parkway (DID). London Paddington and London Marylebone are boundary-only references to London & South East National Rail's catalog (Paddington already built there, Marylebone explicitly not built there either) — neither built here. ADAPTER WIRED AND VERIFIED LIVE (5 Sep 2026, docs/thames-valley-d1/jim-handoff.md 'Adapter wired' section) — lib/cities/thames-valley/dogfood-next-train.js reuses the shared uk-darwin.js + uk/direction-hubs.js helpers (allow-list, no fork), dispatched from lib/cities/live-city-api.js's directionsFor()/getMultiCityNextTrain() switch-cases; not yet in MULTI_CITY_IDS (list membership is bundled into the flip commit, per CLAUDE.md's flip-follow-through split). All seven CRS codes confirmed live against Darwin — crsVerified: true (Henley-on-Thames HEY->HOT was the one wrong code, corrected before this pack per jim-handoff.md's hygiene section; see qa/thames-valley-dogfood-gate.mjs's catalog CRS sweep, deduplicated over unique CRS since OXF is shared by two boards). Direction hub anchoring: NONE wired — all three brief-named candidates were live-probed and rejected on filtered-board evidence: (1) Henley branch (HOT) filtered to calls-at-RDG returned 0 trips, every HOT departure terminates at Twyford, never reaching Reading, so no Kidderminster-shape hub; (2) an operator split on 'London Paddington'/'Reading' at Didcot/Swindon (Liverpool shape) — both stations' calls-at-RDG boards show Great Western Railway only, no second operator to collapse; (3) an operator split on 'Oxford' at Banbury (Chiltern vs CrossCountry) — no train from Banbury prints 'Oxford' as a destination at all (both continue past it), nothing to split. Direction model destination+operator, confirmed live against a real Darwin payload 5 Sep 2026. SKIP RISK: Chiltern Railways moves from Arriva to DfT Operator on 20 September 2026 (report skip risk 3) — not a blocker, timing flag only for whoever wires the token on or after that date, verify Darwin operator attribution and any agency mapping. Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Also open for Tim only: whether Next Train's architecture supports a Darwin-only next-train model or requires a GTFS base layer, since NRE publishes no static GTFS directly (Transitland's derived feed is reference-only, CC-BY-2.0 UK, not pulled here). Cross-region facts: see docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage). Europe/London, DST. D1 pack in docs/thames-valley-d1/. STATUS STAYS PLANNED — do not flip live from this pack — Mark/Tim's call. Flip commit — list additions for Mark (per CLAUDE.md's flip-follow-through split; dispatch switch-cases, dogfood module, and qa/thames-valley-dogfood-gate.mjs are already wired ahead of the flip and need no further change): add 'thames-valley' to (1) lib/cities/live-city-api.js's MULTI_CITY_IDS array and MultiCityId typedef, (2) brisbane-dogfood.js's mount/available map, (3) journey-model.js's persisted-city/country lists — bundle these three list-membership edits into the status-flip commit itself, not before, per qa/live-city-lists-sync.mjs.",
  },
  {
    id: "greater-manchester",
    displayName: "Manchester",
    timeZone: "Europe/London",
    status: "live",
    agency: "Transport for Greater Manchester (TfGM) — Manchester Metrolink / National Rail (Darwin, Northern/Avanti West Coast/TransPennine Express/CrossCountry/East Midlands Railway/Transport for Wales)",
    integration:
      "Two agencies. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Metrolink real-time is genuinely UNCONFIRMED, not the standard account block: TfGM's developer portal (opendata.tfgm.com) is deprecated and issues no new API keys, existing keys continue on an unconfirmed timeline, and no public GTFS-RT feed has been confirmed anywhere — same kind of gap as South Yorkshire's Supertram/SYFTL case. fetchMetrolinkStopBoard() throws MetrolinkFeedUnconfirmedError rather than fabricating a schedule. See lib/providers/greater-manchester.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model) plus a Metrolink metro-mode catalog, same pattern as south-yorkshire/east-midlands/north-east — not a fork. TWO AGENCIES, TWO HUB+SECONDARY-HUB PAIRS, cross-linked at one shared-building station — a deliberate departure from the oracle report's own headline C2/C3 point 4 sentence ('hub lock: Manchester Victoria'), built instead from the report's own supporting facts (line 22: Manchester Piccadilly 14 platforms/all six TOCs vs Manchester Victoria 6 platforms/two TOCs). Treating Victoria as National Rail's only hub lock would leave four of six operators (Avanti, CrossCountry, East Midlands Railway, Transport for Wales) with no hub-anchored board — a board-eligibility-rule violation; see docs/greater-manchester-d1/jim-handoff.md and direction-model-memo.md for the full reasoning, flagged there as open item 1 for Tim to sanity-check. National Rail hub lock Manchester Piccadilly (MAN CRS); secondary hub Manchester Victoria (MCV CRS). Metrolink hub lock St Peter's Square; secondary hub Manchester Victoria. Manchester Victoria is built ONCE as a shared-building stationGroup, doNotGroup: true between its Metrolink and National Rail layers — same shape as Sheffield Station (South Yorkshire) and Nottingham Station (East Midlands). Manchester Piccadilly (National Rail) and Piccadilly Gardens (Metrolink) are built as TWO SEPARATE stationGroups, doNotGroup: true between them — a ~100m/5-10 min walk-link pair, not a shared building, closer in shape to West Yorkshire's Bradford Forster Square/Bradford Interchange pair. Eight Metrolink lines, line+terminus direction model, termini-only per the report's C2/C3 point 10 (not a full 99-stop order — real gap, ~85 of 99 stops uncatalogued). Green and Purple share the same terminus pair (Altrincham-Bury) with opposite line names, unexplained by the report — not resolved. The Eccles line's second terminus is printed as bare 'Manchester' with no further disambiguation — deliberately NOT a catalog station, not guessed. Stockport (SPT CRS, National Rail — live-verified 5 Sep 2026, corrected from the originally-catalogued SMN which Darwin resolves to Southminster in Essex; see docs/jim-brief-uk-crs-sweep-2.md). No Metrolink stop exists at Stockport — the earlier 'two Stockports' hazard was an error (7 Sep 2026, see docs/jim-brief-net-toton-lane-and-stockport-tram.md); Metrolink has never served Stockport and an extension there has only been proposed. FLAGGED CRS MISMATCH, NOT RESOLVED: Walsden is WDN in this region's own oracle report but WAD in West Yorkshire's already-merged pack for the same physical boundary station — this catalog uses WDN because that is what THIS region's own report gives, per instruction not to silently pick one; West Yorkshire's files are untouched. Direction model for National Rail is destination+operator, illustrative only — no destination strings confirmed until a live Darwin payload can be pulled. Open items for Tim only, not resolved here: (1) confirm the two-agency, two-hub-pair architecture; (2) Metrolink real-time feed status — contact TfGM (data.analytics@tfgm.com) to confirm whether a replacement GTFS-RT feed is planned before assuming permanent schedule-only; (3) Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235); (4) Walsden WDN/WAD mismatch, needs a live Darwin response or National Rail's published CRS list to resolve; (5) Green/Purple terminus overlap, needs a live TfGM timetable or GTFS payload to confirm. Cross-region facts: see docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage). Europe/London, DST. D1 pack in docs/greater-manchester-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "liverpool-city-region",
    displayName: "Liverpool City Region",
    timeZone: "Europe/London",
    status: "live",
    agency:
      "National Rail (Darwin; Northern Trains primary franchise, Avanti West Coast/TransPennine Express/East Midlands Railway/Transport for Wales/West Midlands Trains/CrossCountry through-running) / Merseyrail (Serco / Transport UK Group concession) — Northern Line + Wirral Line",
    integration:
      "Two agencies, both Darwin-served via uk-darwin.js. National Rail: OpenLDBWS, DARWIN_LDB_TOKEN live 2 Sep 2026. Merseyrail (corrected 4 Sep 2026, docs/jim-brief-liverpool-merseyrail-via-darwin.md): it is a National Rail TOC, not a metro system without a public feed — its stations carry CRS codes and its services appear in Darwin exactly like Northern's or Avanti's. Probed live 4 Sep 2026 (Ellesmere Port, Liverpool Central, Moorfields, Lime Street all returned Merseyrail trips with platform + live status). fetchMerseyrailStopBoard() now calls Darwin via uk-darwin.js's fetchStationBoard() (pre-resolved entry/mode passthrough), same shared path and same MissingDarwinTokenError-on-no-token behaviour as National Rail. Board eligibility verdict `in`, live from the same DARWIN_LDB_TOKEN. See lib/providers/liverpool-city-region.js file header.",
    modes: ["train", "metro"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    adapterReady: true,
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + direction model) plus a Merseyrail metro-mode catalog, same pattern as south-yorkshire/east-midlands/north-east/greater-manchester — not a fork. Both National Rail and Merseyrail are live, Darwin-served, no operator filters anywhere in this region (docs/board-eligibility-rule.md walk-up rule) — every board shows every train Darwin returns for that CRS. LIME STREET (H1) CLOSED AS MOOT 4 Sep 2026, Tim's option B: one Darwin CRS (LIV), one catalog entry, one board — Northern/Avanti/TPE/LNR & WMR and Merseyrail together, each with its own platform (Merseyrail's low-level platforms show as 'A'). The former two-stationGroup (train/metro) doNotGroup split is gone; see docs/liverpool-city-region-d1/hazard-pack.md H1 for the closed history. Catalog is 29 National Rail + 68 Merseyrail = 97 stations (Lime Street's Merseyrail presence folded into the single mode-train entry). Merseyrail interchange pair Liverpool Central / Moorfields (both named 'dual-line interchange' by report, no ranking given; neither built as sole hub). Merseyrail: Northern Line (Liverpool-Southport/Ormskirk/Headbolt Lane) + Wirral Line (Liverpool-Ellesmere Port/West Kirby/Chester), line+terminus marketing model, termini/branches-only (full 69-stop order is a D2 gap) — this model is separate from and does not gate live directions, which derive from the Darwin board for all 97 stations. ELLESMERE PORT REGISTRY: Tim deleted `uk-ellesmere-port` as a hangover concept (never shipped). This region's own Ellesmere Port entry (genuine Wirral Line terminus per report) stands as the sole reference; no merge absorption needed. Open items for Tim only: (1) OpenLDBWS/RDM redistribution terms (same as every UK region); (2) Liverpool Central vs Moorfields ranking, if exists. docs/united-kingdom-ledger.md still absent — flagged per country-lane retrofit, overdue. Europe/London, DST. D1 pack in docs/liverpool-city-region-d1/. Live as of 2 Sep 2026; Merseyrail real-time corrected in 4 Sep 2026.",
  },
  {
    id: "greater-anglia",
    displayName: "East Anglia",
    timeZone: "Europe/London",
    status: "live",
    agency:
      "National Rail (Darwin; Greater Anglia primary franchise) / Thameslink, Great Northern and CrossCountry through-running at Cambridge/Ely / Thameslink, CrossCountry, East Midlands, LNER through-running at Peterborough boundary (all `in`, no exclusions)",
    integration:
      "One primary agency. National Rail reuses uk-darwin.js (Darwin OpenLDBWS) — Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep 2026, 20s server-side cache PR #230). Unlike West of England, Greater Anglia has a live static GTFS feed (Transitland f-gc-rail~delivery~group~planar~gtfs, CC-BY-2.0 UK, no key, verified 2026-09-01) as a reference/verification source, but this adapter does not pull it for board data — Darwin is the only real-time path, same MissingDarwinTokenError shape as every other Darwin-only region. Adapter wired and verified live 5 Sep 2026 (docs/greater-anglia-d1/jim-handoff.md 'Adapter wired' section) — lib/cities/greater-anglia/dogfood-next-train.js. Direction hub anchoring wired for Thetford/Ely -> Norwich (operator-split Liverpool shape, East Midlands Railway vs Greater Anglia). See lib/providers/greater-anglia.js file header.",
    modes: ["train"],
    envKeys: ["DARWIN_LDB_TOKEN"],
    notes:
      "Region config over the shared uk-darwin.js provider (allow-list + config), same pattern as west-of-england/london-se-national-rail — not a fork. Hub lock Norwich (NRW). TWO secondary hubs, Cambridge (CBG) and Ipswich (IPS) — the oracle report gives both identical hub-tier language (report lines 22-24, 131), a deliberate departure from West of England's single-secondary-hub shape (Bath Spa only); see docs/greater-anglia-d1/hazard-pack.md H6. No doNotGroup needed at Norwich, Cambridge, or Ipswich — single-building walk-up stations, Thameslink/Great Northern at Cambridge and Thameslink/CrossCountry at Ely both pass the board-eligibility test alongside Greater Anglia. Peterborough (PBO) is explicitly NOT a hub — flat catalog entry; LNER's board-eligibility verdict was undecided at D1 (reserved-by-default policy, the SAME open question as London & South East National Rail's own LNER gap at King's Cross) and resolved to `in` 5 Sep 2026 (unreserved coach always available, same evidence shape as West Yorkshire's LNER row at Leeds — see oracle-clash-report.md's Verdict resolution subsection); the earlier excludeOperators: [\"LNER\"] boundary rested only on that verdict and is REMOVED — LNER is on Peterborough's board (confirmed live: London Kings Cross, Edinburgh, Leeds), still flagged for a future multi-region ledger (cross-regional shared-platform de-dup with any East Midlands/LNER Peterborough entry, a station-grouping question separate from the now-resolved board-eligibility one). Colchester (COL, third-tier per the report) and Ely (ELY, regional junction) kept flat, not promoted to secondary-hub status. Liverpool Street is NOT built here — Greater Anglia services calling there are already documented as `in` in London & South East National Rail's built pack (groupId liverpool-street, operators Greater Anglia + c2c, doNotGroup true) — verified once against that pack, not duplicated. CRS COLLISION CAUGHT, NOT SHIPPED: the oracle report's own station-code list assigns LST to Lowestoft, but LST is Liverpool Street's real-world CRS, already used in London & South East National Rail's built pack — Lowestoft never carries LST; verified live against Darwin 5 Sep 2026 as LWT, along with six other CRS codes that were wrong or missing in the original D1 pack (King's Lynn KLY->KLN, Thetford THF->TTF, Great Yarmouth YRD->GYM, Bishops Stortford BST->BIS, Diss/Wymondham null->DIS/WMD) — all 14 catalog entries now carry crsVerified: true. Great Northern (Cambridge, King's Lynn, Ely) and CrossCountry (Stansted Airport) discovered live beyond the D1 station table's per-station itemisation, both already carrying a recorded `in` verdict elsewhere (Great Northern: this pack's own oracle line 91 + London & South East's oracle line 148; CrossCountry: this pack's own Peterborough/Ely corridor verdict) — same precedent as Thames Valley's CrossCountry-at-Oxford discovery. Direction hub anchoring wired: 'Norwich' hub (filterCrs NRW) at Thetford and Ely, live-probed 5 Sep 2026 — both stations print 'Norwich' under both East Midlands Railway and Greater Anglia (operator-split Liverpool shape); a second operator-split candidate on 'Cambridge' at Ely (Great Northern vs Greater Anglia) was found but not built, since the shared helper allows only one hub per station (same limitation as Solent's Fareham). Station scope is intentionally the 14 stations the oracle report explicitly names, not the full 30-50 the report itself estimates for D1 — the remaining stations are a flagged D2 gap, not invented here. Direction model destination+operator, verified against live Darwin payloads 5 Sep 2026; see docs/greater-anglia-d1/direction-model-memo.md. `live-city-api.js` dispatch switch-cases are wired ahead of the flip (directionsFor/getMultiCityNextTrain); greater-anglia is deliberately NOT in MULTI_CITY_IDS yet — that list-membership edit, plus brisbane-dogfood.js's mount/available map and journey-model.js's persisted-city/country lists, is Mark's flip commit (qa/live-city-lists-sync.mjs enforces they equal the registry's live set). `public/city-directions/greater-anglia.json` not generated pre-flip. Open items for Tim only, not resolved here: (1) Licensing: see docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG attribution wired (PR #235). Cross-region facts: see docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage). Europe/London, DST. D1 pack in docs/greater-anglia-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "brussels",
    displayName: "Brussels",
    timeZone: "Europe/Brussels",
    status: "planned",
    agency: "STIB/MIVB",
    integration:
      "LIVE via the BMC Waiting Times API (confirmed 20 Sep 2026): `GET https://api-management-opendata-production.azure-api.net/api/datasets/stibmivb/rt/WaitingTimes`, header Ocp-Apim-Subscription-Key. The operation path was previously unconfirmed (guessed against the client-rendered developer-portal SPA) — recovered from the portal's own public `/mapi/apis?api-version=2018-06-01-preview` content-listing endpoint, which enumerates every published API's real path. Verified live with a real key at Arts-Loi / Kunst-Wet (all four v1 lines) and Simonis/Elisabeth (lines 2 and 6), including a live-only 'Do not embark' operational message that cannot exist in a static schedule — confirmation this is genuine vehicle tracking, not schedule echo. No numeric rate limit was exposed in response headers; treated conservatively (15s cache TTL). Catalog `stopIds` ARE STIB point IDs (no separate id-mapping step needed). No timetable fallback: MissingStibCredentialsError / StibUnavailableError are hard errors — see lib/providers/brussels.js file header.",
    modes: ["metro"],
    envKeys: ["STIB_API_KEY"],
    adapterReady: true,
    notes:
      "Metro 1/2/5/6 only (60 unique stops). No tram, no premetro/North-South Axis, no CHRONO, no bus, no De Lijn, no TEC. No passenger metro 3 or 4 — Albert-Bordet is a frozen project. Hub lock Arts-Loi / Kunst-Wet (metro 1x2x5x6, through-cross: 1/5 E-W trunk, 2/6 inner-ring loop N-S) — never a direction token. Simonis and Elisabeth are two distinct line-2/6 terminus chips, never collapsed. Bilingual FR/NL locked names with a slash (Stockel / Stokkel, Gare du Midi / Zuidstation, ...); same-in-both-languages names (Beekkant, Simonis, Elisabeth, Schuman, ...) stay single. DST. D1 pack in docs/brussels-d1/. STIB_API_KEY is in Vercel (Production/Preview/Development). Flip follow-through landed 20 Sep 2026 (docs/brussels-d1/jim-handoff.md): lib/cities/brussels/dogfood-next-train.js + qa/brussels-dogfood-gate.mjs (replacing brussels-planned-gate.mjs) + live-city-api.js dispatch switch-cases; deliberately NOT added to MULTI_CITY_IDS/brisbane-dogfood.js/journey-model.js yet — that's Mark's flip commit. STIB metro live board CONFIRMED AND WIRED 20 Sep 2026 (see integration field) — this is no longer a flip blocker. BOARD-ELIGIBILITY GAP, STILL HOLDS THE FLIP: docs/brussels-d1/oracle-clash-report.md's Board eligibility section rules SNCB/NMBS domestic rail `in` at Gare Centrale / Gare du Midi / Gare de l'Ouest (walk-up, no compulsory reservation) with a confirmed free real-time source (iRail liveboard API, no key, verified live 19 Sep 2026 against Brussels-Central) — but it is NOT implemented in this adapter. Doing it cleanly needs a second provider surface, iRail<->this-catalog station-name mapping (Brussels-Central/Brussels-South-Midi/Brussels-West vs the FR/NL locked names), and a doNotGroup-by-mode catalog split (SNCB is a separate building/platform section from the metro at all three stations, same shape as South Yorkshire's Sheffield Station rail-vs-Supertram doNotGroup) — genuine follow-up scope, not a missing key or a broken call. Do not flip live from this pack — Mark/Tim's call, and Mark's QA should hold on the SNCB gap until it is either wired or a documented decision defers it past launch.",
  },
  {
    id: "copenhagen",
    displayName: "Copenhagen",
    timeZone: "Europe/Copenhagen",
    status: "planned",
    agency:
      "Metroselskabet I/S (Metro M1-M4) + S-tog operator (DSB, suburban) + DSB (Regional/InterCity/InterCityLyn) + Öresundståg/Skånetrafiken (regional to Malmö) — all reachable via the shared Rejseplanen national platform, see docs/denmark-ledger.md",
    integration:
      "Rejseplanen static GTFS (https://www.rejseplanen.info/labs/GTFS.zip, no key required, CC BY 4.0, confirmed 30 Aug 2026) via lib/providers/rejseplanen.js — a shared provider, with lib/providers/copenhagen.js as an allow-list + direction-model config over it (UK/Darwin pattern, not a per-city clone; Aarhus would be a second config over the same shared file). Schedule-only: Rejseplanen API 2.0 departureBoard and SIRI-ET real-time both require a key registered at labs.rejseplanen.dk (free tier, 50k calls/month) — NOT registered, per this task's explicit instruction not to sign up for anything. MissingRejseplanenApiKeyError is exported for whoever wires that path at D2.",
    modes: ["metro", "train"],
    adapterReady: true,
    notes:
      "Metro M1-M4 (44 stations, full network) PLUS S-tog (A, B, Bx, C, E, H, F) PLUS DSB Regional/InterCity/InterCityLyn PLUS Öresundståg, the latter three scoped ONLY to four shared stations (Nørreport, Nørrebro, København H, Nordhavn) per the oracle report's board-eligibility table — not the full S-tog/DSB network. No buses, no harbour ferries (Havnebus 991/992 at Orientkaj, out-mode), no DSB EuroCity (out-reservation, compulsory 26 Jun-16 Aug). SJ (Stockholm) and České dráhy (Prague) are observed calling at København H but have NO board-eligibility verdict from the oracle report — excluded pending that verdict, not a decided 'out' (hazard-pack.md H3; needs a verdict from Nico/Tim, recorded in the oracle report or docs/denmark-ledger.md, before D5). Hub lock Kongens Nytorv (Metro-only, all four lines, confirmed zero rail/S-tog transfer) — never a direction token. doNotGroup: Nørreport (Metro M1/M2 vs S-tog 6 lines vs DSB/Öresundståg, three-way, widest single-node surface), Nørrebro (Metro M3 vs S-tog F only, two-way, simplest), København H (Metro M3/M4 vs S-tog 6 lines vs DSB/Öresundståg vs EuroCity-excluded, four-way, widest overall), Nordhavn (Metro M4 vs S-tog A/B/Bx/C/E — NOT H, hazard-pack.md H2 correction against the oracle report's 'six lines' claim — two-way, one shared S-train island platform, line letter always the primary token). M3 (Cityringen) is a true ring, no linear terminus — direction is clockwise/counter-clockwise, wording still an open question for Tim (direction-model-memo.md open question 1). DSB Regional/InterCity/InterCityLyn/Öresundståg have no printed line code — direction is service type + destination ('Regionaltog + Ringsted', 'Öresundståg + Lund'), classified from route_long_name/route_desc via a regex heuristic UNVERIFIED against a live payload (hazard-pack.md items 5-6 — confirm at D2, same for the route_type/agency_id assumptions in lib/providers/rejseplanen.js). No stopIds baked into the catalog (none in the D1 pack) — stop_ids are resolved at request time by name match against the live static feed, same runtime-resolution pattern as lib/providers/malmo.js. Europe/Copenhagen has DST. D1 pack in docs/copenhagen-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "boston",
    displayName: "Boston",
    timeZone: "America/New_York",
    status: "live",
    agency: "Massachusetts Bay Transportation Authority (MBTA)",
    integration:
      "MBTA static GTFS (https://cdn.mbta.com/MBTA_GTFS.zip, no key) via lib/providers/boston.js — a standalone adapter (own agency, not a shared/regional provider), reusing lib/providers/gtfs/static-cache.js (loadGtfsStatic) and lib/providers/gtfs/board.js (buildBoardForStops) rather than forking them. Subway trips are classified by exact GTFS route_id (Red/Orange/Blue/Green-B/C/D/E/Mattapan) resolved via the trip table, not by route_short_name/long_name string matching. Stop-name resolution is exact-match (lib/providers/boston.js resolveStopIds) against lib/cities/boston/stations.json's per-station alias list — deliberately not gtfs/static-cache.js's findRailStopIdsForName, whose substring match would collapse documented same-name-family pairs (Harvard vs Harvard Ave, Central vs Central Ave, etc.). Subway is schedule-only (no GTFS-RT wired). PLUS live MBTA V3 predictions (api-v3.mbta.com/predictions, unauthenticated, confirmed working 20 Sep 2026, rate-limited 20/window) for Commuter Rail at the five board-eligible stations — live predictions only, no scheduled fallback (a prediction with a null departure_time, i.e. arrival-only/terminating, is dropped, never backfilled from static schedule). MBTA_API_KEY is an optional env var (raises the rate limit); no key is registered by this task and none is required. MissingMbtaApiKeyError is exported for a future caller that wants to make a key mandatory.",
    modes: ["metro", "train"],
    adapterReady: true,
    notes:
      "Subway/rapid transit: Red (Alewife-Ashmont & Braintree), Orange (Oak Grove-Forest Hills), Blue (Wonderland-Bowdoin), Green B/C/D/E, Mattapan (Ashmont-Mattapan, its own line, not folded into Red) — 125 unique stops, 8 passenger services. PLUS MBTA Commuter Rail (docs/boston-d1/oracle-clash-report.md Board eligibility section, 20 Sep 2026 — walk-up on-board/kiosk ticketing, no check-in barrier) at the five stations it calls in-catalog: South Station, North Station, Forest Hills, Braintree, JFK/UMass — live V3 predictions only, own 'line + terminus' chips (e.g. 'Framingham/Worcester Line + Worcester') since direction-model-memo.md has no Commuter Rail guidance (flagged for Tim). Amtrak (Acela, Northeast Regional, Lake Shore Limited) at South Station is `out-reservation` — all-reserved, no walk-up; the Commuter Rail route allow-list only ever contains MBTA's own CR route ids, so Amtrak trips can't appear. CapeFlyer is board-eligibility `in` (seasonal, walk-up) but is NOT served by api-v3.mbta.com — no CapeFlyer route exists in the V3 routes list as of 20 Sep 2026, so it can't be shown live; this is a feed gap, not a decision to exclude it. Silver Line BRT, ferry, bus, Massport shuttles stay `out-mode`. Hub lock Park Street (Red x Green, all four Green services) — never a direction token; subway direction model is 'line + terminus' (e.g. 'Red Line + Alewife', 'Green Line B + Gov't Center') per direction-model-memo.md §3 recommendation A, which resolves headsigns only to each line's own known termini so a hub string can never leak into a direction chip. doNotGroup (hazard-pack.md H1/H2/H6): Downtown Crossing (Red x Orange), Gov't Center (Green x Blue; B/C inner end terminus — legitimate as a direction, forbidden only as a Park Street proxy), State (Orange x Blue), South Station, North Station, Haymarket — all separate stop-places from Park Street; Commuter Rail is a distinct service entry at the same physical stop-place at the five dual-mode stations, not folded into the subway rows. Red forks at JFK/UMass (Ashmont vs Braintree). Green B/C end at Gov't Center; D continues to Union Sq; E continues to Medford/Tufts and leaves the B/C/D trunk at Copley (no Hynes/Kenmore). America/New_York HAS DST (EDT/EST) — do not copy Perth/Brisbane no-DST. No stopIds baked into the catalog (none in the D1 pack) — stop_ids are resolved at request time by exact name match against the live static feed. Flip follow-through done (dogfood module, live-city-api.js dispatch, boston-dogfood-gate.mjs). Flipped live 20 Sep 2026 (docs/boston-d1/mark-qa-note.md third pass) — MULTI_CITY_IDS/journey-model persisted lists/brisbane-dogfood mount map/picker/CITY_BOUNDS all updated in the same commit per qa/live-city-lists-sync.mjs. D1 pack in docs/boston-d1/.",
  },
  {
    id: "chicago",
    displayName: "Chicago",
    timeZone: "America/Chicago",
    status: "planned",
    agency: "Chicago Transit Authority (CTA)",
    integration:
      "CTA Train Tracker Arrivals API (https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx, JSON output, docs https://www.transitchicago.com/developers/traintracker/) via lib/providers/chicago.js — a standalone adapter (own agency, not a shared/regional provider and not a fork of the GTFS helpers, since Train Tracker is a pure real-time board). LIVE BOARDS ONLY, per Tim's rule: no live times, no board; never a silent timetable fallback — same posture as lib/providers/bart.js, deliberately no GTFS-static schedule-only degrade path. fetchStationBoard() throws MissingCtaTrainTrackerKeyError (lib/providers/gtfs/auth.js) whenever CTA_TRAIN_TRACKER_KEY is unset, and propagates any Train Tracker fetch/parse failure rather than returning an empty/synthetic board. CTA_TRAIN_TRACKER_KEY was NOT available this session (not in .env.local) — station Train Tracker `mapid`s are resolved at request time from CTA's published static GTFS (loadGtfsStatic, routeTypes ['1'] subway/metro) rather than a hand-transcribed id table, and are UNVERIFIED against a live payload; ChicagoStationMapIdUnconfirmedError is thrown rather than guessing when the GTFS join can't confidently resolve exactly one candidate. isSch (schedule-based)/isFlt (fault) rows are dropped before ever reaching a rider (never presented as live); isDly (delayed) rows are kept and flagged `delayed: true`, not cancelled. Confirm all of this once a key is set and a real GTFS snapshot is fetched.",
    modes: ["metro"],
    envKeys: ["CTA_TRAIN_TRACKER_KEY"],
    adapterReady: true,
    notes:
      "CTA 'L' only — eight color lines (Red Howard-95th/Dan Ryan, Blue O'Hare-Forest Park, Brown Kimball + Loop circulation, Green Harlem/Lake-Ashland/63rd & Cottage Grove, Orange Midway + Loop circulation, Pink 54th/Cermak + Loop circulation, Purple Linden-Howard local & weekday rush Loop Express, Yellow Dempster-Skokie-Howard) — 143 unique passenger stops. No Metra, no Pace, no South Shore Line, no CTA bus. Hub lock Clark/Lake (Blue subway crossing under the Loop rectangle; Brown/Green/Orange/Pink/Purple elevated on it) — never a direction token; the Loop is a structure/region label, not a station; Red does not call Clark/Lake (its inner-city string is Lake). Direction model is 'line + terminus' using the bare printed color word (e.g. 'Red + Howard', 'Brown + Kimball', 'Purple + Linden'), per direction-model-memo.md §3 recommendation A. doNotGroup/doNotCollapse (hazard-pack.md H1/H4/H6, lib/cities/chicago/marketing-directions.js file header): the Loop-trunk shared stops (State/Lake, Washington/Wabash, Adams/Wabash, Library, LaSalle/Van Buren, Quincy, Washington/Wells, Merchandise Mart), the North Side Main Line shared stops (Belmont Red/Brown/Purple, Fullerton Red/Brown/Purple, Wilson Red/Purple, Wellington/Diversey/Armitage/Sedgwick Brown/Purple, Chicago Brown/Purple), the Lake Street shared stops (Ashland/Clinton/Morgan Green/Pink), plus several same-printed-name-different-physical-place families this D2 pack disambiguates with a `branch` field and qualified alias rather than silently merging or guessing: Harlem (2 places, both Blue), Western (5), Pulaski (4), Cicero (3), Kedzie (4, distinct from Kedzie-Homan), Damen (4), Belmont (Blue, separate from the Red/Brown/Purple hub), Chicago (Red alone, Blue alone), Grand and Monroe (Red's State St Subway vs Blue's Dearborn St Subway — Chicago's classic non-connected same-name subway pairs), Addison (Red, Brown, Blue — three separate stations), Ashland/Clinton (Orange/Blue separate from the Green/Pink shared segment), California/Austin/Oak Park/Halsted/Garfield/47th/Montrose/Irving Park/Central (each a same-name pair on two lines with no shared trackage at that point). resolveCatalogEntry() throws AmbiguousChicagoStationError for a bare colliding name without a qualifying alias — this whole disambiguation is a D2 judgment call cross-referenced against the hazard pack's explicit doNotCollapse/place-count language, flagged for Tim/Nico sign-off before any live flip. Board eligibility (oracle-clash-report.md, controller note 20 Sep 2026): Metra/Amtrak/South Shore terminals near Quincy/Washington-Wells/Washington-Wabash are separate buildings, not in-catalog stations — no service beyond CTA 'L' is board-eligible anywhere in this catalog. America/Chicago HAS DST (CDT/CST) — do not copy Perth/Brisbane no-DST. City id is chicago; do not invent city=chi/cta/chicago-l/dc, do not merge into washington or bart. Flip follow-through done ahead of the key landing (dogfood module, live-city-api.js dispatch, chicago-dogfood-gate.mjs) — not yet in MULTI_CITY_IDS/journey-model persisted lists/brisbane-dogfood mount map, deliberately deferred to the status-flip commit (qa/live-city-lists-sync.mjs). D1 pack in docs/chicago-d1/. Do not flip live from this pack — Mark/Tim's call.",
  },
  {
    id: "bart",
    displayName: "BART",
    timeZone: "America/Los_Angeles",
    status: "planned",
    agency: "Bay Area Rapid Transit (BART)",
    integration:
      "BART Legacy API ETD (https://api.bart.gov/api/etd.aspx, docs https://api.bart.gov/docs/etd/etd.aspx) via lib/providers/bart.js — a standalone adapter (own agency, not a shared/regional provider and NOT a fork of the GTFS helpers used elsewhere in this repo, since ETD is a pure real-time board, not GTFS+RT). LIVE BOARDS ONLY, per this task's explicit Tim's-rule instruction: no live times, no board; never a silent timetable fallback — unlike every other planned adapter in this file (Boston, Auckland, Sydney, Copenhagen, ...), there is deliberately no GTFS-static schedule-only degrade path. fetchStationBoard() throws MissingBartApiKeyError (lib/providers/gtfs/auth.js) whenever BART_API_KEY is unset, and propagates any ETD fetch/parse failure rather than returning an empty/synthetic board. BART_API_KEY was NOT available this session (not in .env.local) — station abbreviations, ETD `destination` strings, and `color` tokens are recorded from public BART documentation only and are UNVERIFIED against a real payload; resolveTerminus() (lib/cities/bart/marketing-directions.js) is deliberately conservative (exact match, then unambiguous substring match against that line's small termini set) so a live-verification surprise degrades to a bare line label rather than a wrong/fabricated terminus. Confirm both once a key is set, same D2 caveat shape as Boston's MBTA route_id classification.",
    modes: ["metro"],
    envKeys: ["BART_API_KEY"],
    adapterReady: true,
    notes:
      "BART only — five color heavy-rail lines (Yellow Antioch-SFO/Millbrae, Blue Dublin/Pleasanton-Daly City, Green Berryessa/North San José-Daly City, Red Richmond-Millbrae, Orange Richmond-Berryessa/North San José) plus OAK Airport (Coliseum-Oakland International Airport (OAK), the official map's gray BART service-legend line) — 50 unique passenger stops. No Muni Metro, no Muni bus, no Caltrain, no ACE, no Capitol Corridor, no SMART, no ferry, no VTA. Hub lock Embarcadero (first downtown SF stop after the Transbay Tube; Yellow/Blue/Green/Red through-run both ways, Orange never arrives) — never a direction token; the four-stop downtown SF trunk (Embarcadero, Montgomery St, Powell St, Civic Center/UN Plaza) is structure, not a hub token, and Powell St (Muni/cable-car-famous) is explicitly NOT the lock. Direction model is 'line + terminus' using the bare map color word (e.g. 'Yellow + Antioch', 'Blue + Daly City', 'Orange + Richmond'), per direction-model-memo.md §3 recommendation A. doNotGroup/doNotCollapse (hazard-pack.md H1/H2/H4/H6): Montgomery St vs Powell St vs Civic Center/UN Plaza vs 16th St Mission vs 24th St Mission; 12th St/Oakland City Center vs 19th St/Oakland vs West Oakland vs Lake Merritt (Green/Blue skip 12th/19th, Orange skips West Oakland and all of SF, Red/Yellow skip Lake Merritt); Dublin/Pleasanton vs West Dublin/Pleasanton; Pittsburg/Bay Point vs Pittsburg Center (eBART, same Yellow color); San Francisco International Airport (SFO) vs Oakland International Airport (OAK). Yellow's south end is SFO by day, Millbrae in the evening (dashed SFO-Millbrae overlay, both recorded as termini) — Red's only printed south end on this map is Millbrae, and Red does not enter the SFO spur (a weekend +SFO timetable overlay is NOT a Red station-list row). OAK Airport has NO real-time ETD (H3/H5) — Oakland International Airport (OAK), the only station solely on that line, throws FeedUnconfirmedError rather than a board; Coliseum (also Orange/Blue/Green) boards normally. Irvington (PLANNED FUTURE STATION) and Silicon Valley Phase II (28th St/Little Portugal, Downtown San José, Diridon, Santa Clara) are not inserted — no 2026 opening is printed as open. Map-vs-stations-page renames (period/slash/accent) carried as catalog aliases per oracle-clash-report.md's station name table (e.g. 'Montgomery St.', 'Berryessa / North San Jose', 'SFO Int'l Airport'). America/Los_Angeles HAS DST (PDT/PST) — do not copy Perth/Brisbane no-DST. City id is bart; do not invent city=sf/san-francisco/bay-area/oakland/sfo, do not merge into chicago or washington. D1 pack in docs/bart-d1/. Do not flip live from this pack — Mark/Tim's call.",
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
