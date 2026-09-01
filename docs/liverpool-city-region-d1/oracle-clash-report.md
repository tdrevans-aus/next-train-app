# Liverpool City Region oracle clash report

**D1 status (from scratch, no prior pack found):** Liverpool City Region comprises **Merseyrail** (concession-operated urban commuter rail, 69 stations) and **National Rail** services (via Darwin/OpenLDBWS, multiple Train Operating Companies). The tracker notes "Packed 2026-08-28" but no D1 pack, adapter, or published-network.json exists — treat as a genuine from-scratch build. **Account-level blocker (critical):** Tim's EvansAppStudio Rail Data Marketplace registration is Australian-based, and RDM geography-checks reject AU registrations for GB services. DARWIN_LDB_TOKEN cannot be provisioned until Tim re-registers with a UK company address (same blocker affecting East Midlands, West Midlands, Greater Manchester, South Wales, and other UK regions this wave). **Do not wire this region until Tim's UK re-registration is complete.**

## Agencies and feeds

### National Rail (Darwin/OpenLDBWS)

| field | value |
| --- | --- |
| Operator(s) | **Primary:** Northern Trains (franchise holder, City Line commuter services from Liverpool Lime Street). **Through-running:** Avanti West Coast (long-distance London–Liverpool), TransPennine Express, East Midlands Railway, Transport for Wales, West Midlands Trains, CrossCountry, and occasional other operators. All via National Rail Enquiries (NRE) Darwin feed. |
| Static GTFS | [Transitland Onestop ID `f-gc-rail~delivery~group~planar~gtfs`](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/) — National Rail GTFS covering all GB operators including Merseyrail (via ATOC-CIF format, updated ~14 days, no key required, verified live 2026-08-31). Alternative: `http://gtfs-source-feeds.transit.land/uk-rail.zip` (requires auth token). |
| Real-time API | **Darwin LDB Webservice (JSON API)** — live departures, platform numbers, delays, cancellations. Via [Rail Data Marketplace](https://raildata.org.uk/) (subscription-based OAuth2 token: `DARWIN_LDB_TOKEN`). Free tier: 100,000 calls/4-week railway period. |
| Auth | **Account-level blocker (known, not a feed problem):** EvansAppStudio registered on RDM with Australian company address. RDM geography-checks reject AU registrations for GB services. Tim must re-register with UK company address before DARWIN_LDB_TOKEN can be provisioned. Unblock required before wiring adapter. |
| Darwin API docs | [National Rail Developers: Darwin Data Feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/) (public version, JSON API for live departure boards). Support via [Open Rail Data-Talk forum](https://openraildata-talk.org/). |

### Merseyrail (Serco/Transport UK Group concession)

| field | value |
| --- | --- |
| Operator | **Merseyrail** (concession-operated by Serco and Transport UK Group since 2003). Two lines: **Northern Line** (39 stations, Liverpool–Southport/Ormskirk/Headbolt Lane), **Wirral Line** (34 stations, Liverpool–Ellesmere Port/West Kirby/Chester). Total: 69 stations, 67 managed by Merseyrail. |
| Static GTFS | **Included in Transitland `f-gc-rail~delivery~group~planar~gtfs`** (National Rail GTFS static feed also covers Merseyrail operator). No separate Merseyrail-only GTFS feed confirmed in public sources. Verified via Transitland 2026-08-31. |
| Real-time API | **Real-time (GTFS-RT) feed status: UNKNOWN — DO NOT ASSUME.** No public GTFS-RT endpoint confirmed for Merseyrail in Transitland, Mobility Database, or official Merseyrail developer documentation. Merseyrail offers a mobile app with live train information (Merseyrail app, "Train Check" real-time countdown), but no documented public API feed found. **High skip risk:** Confirm with Merseyrail (via [merseyrail.org](https://www.merseyrail.org/) or direct contact) whether public GTFS-RT real-time feed will be published before D1 pack stage. If no public feed exists, Merseyrail boards stay schedule-only. |

## V1 scoping — National Rail / Merseyrail decision pending

**National Rail assumption:** Walk-up National Rail regional/commuter services (Northern Trains City Line, Avanti West Coast, TransPennine Express, etc.) at **Liverpool Lime Street (CRS LIV)** and other City Region National Rail stations. Northern Trains does not enforce compulsory seat reservations; all daytime services allow walk-up boarding (confirmed via Northern Trains help page: seat reservations available but not required). Avanti West Coast also allows walk-up despite optional reservations available. No check-in barriers. **Blocked at account level by DARWIN_LDB_TOKEN auth — Tim must re-register first.**

**Merseyrail scope decision pending:** Merseyrail is a distinct operator (concession-run urban commuter rail, separate infrastructure, 69 stations). **Two options:**
1. **Option A (product decision):** Include Merseyrail in v1 scope as a second rail mode (metro-style commuter service, similar to Copenhagen S-tog or Glasgow Subway patterns). This would require Merseyrail boards to be schedule-only initially (no confirmed real-time feed), similar to TfL/Valley Lines precedent.
2. **Option B (defer to H2):** Exclude Merseyrail from v1 scope (not main-line National Rail; treat as a later expansion). This simplifies v1 to National Rail only, which is already blocked at account level pending Tim's UK re-registration.

**Recommendation:** Scope v1 to **National Rail only** for this release (Northern Trains + through-running operators at Liverpool Lime Street hub and City Region stations). **Defer Merseyrail to H2** unless Merseyrail confirms a public GTFS-RT feed becomes available. This keeps v1 scope manageable and focuses on the account-unlock path (Darwin token). If Merseyrail real-time feed is confirmed by Tim's re-registration time, revisit for inclusion.

## Station name table

### Hub-lock and key National Rail stations

| Published (D1) | GTFS CRS | Role | Class |
| --- | --- | --- | --- |
| **Liverpool Lime Street** | **LIV** | Main National Rail terminus; Merseyrail Northern/Wirral Lines interchanges at platform level. Primary hub-lock for National Rail. | **Hub lock** — interchange between National Rail long-distance (Avanti, TransPennine) and regional (Northern City Line). 10 platforms (Network Rail managed). |
| Liverpool South Parkway | LPY | National Rail station; airport connector (Liverpool John Lennon Airport). Regional and long-distance services. | Secondary hub. |

### Merseyrail stations (v1 scope pending)

If Merseyrail is included in v1:

| Published (D1) | GTFS operator | Line(s) | Class |
| --- | --- | --- | --- |
| **Liverpool Central** | Merseyrail | Northern, Wirral | Merseyrail interchange (separate from National Rail platforms at Lime Street) |
| **Moorfields** | Merseyrail | Northern, Wirral | Merseyrail dual-line interchange |
| Ellesmere Port | Merseyrail | Wirral | Wirral Line terminus (see board eligibility note) |
| [39 + 34 other stations] | Merseyrail | Northern, Wirral | Commuter stations across Liverpool, Sefton, Wirral, Cheshire, Halton |

**Note:** Ellesmere Port station (ELP CRS) is a Merseyrail Wirral Line terminus. The tracker explicitly states "Ellesmere Port [is to be] folded into Liverpool City Region... not a separate picker city." Currently, `uk-ellesmere-port` exists as a separate registry entry with status "planned" — **Jim/Tim must decide at wiring stage whether to merge this entry into `liverpool-city-region` or deprecate `uk-ellesmere-port` entirely.** This is outside Nico's scope but flagged here for clarity.

**Scope note — 96 CRS claim:** The tracker claims "96 CRS" for Liverpool City Region, but this number is unverified. National Rail stations in the Liverpool City Region (Northern Trains franchise footprint) number approximately 30–40 major stations (Liverpool Lime Street, Liverpool South Parkway, Warrington, Manchester direction, etc.). Merseyrail adds 67 stations (managed). Total combined would be ~100–107 stations, roughly consistent with "96 CRS" if conservative (focused on major stations). **Verify station count during D1 pack stage; do not assume all 96 are in-scope.**

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**National Rail verdict summary:**
- **Northern Trains City Line (Liverpool Lime Street, Liverpool South Parkway, regional stations)**: `in` (open seating, no compulsory reservation per Northern help pages; walk-up boarding)
- **Avanti West Coast (London–Liverpool Lime Street)**: `in` (optional reservation only, not compulsory; walk-up boarding confirmed)
- **TransPennine Express, East Midlands Railway, Transport for Wales, West Midlands Trains, CrossCountry through-running**: `in` (regional/commuter services, optional reservation only, walk-up boarding)
- **Sleeper services (Caledonian Sleeper, Night Riviera — if they call at Liverpool Lime Street, which they do)**: `out-reservation` (compulsory sleeping-car reservation)

**Merseyrail verdict (if included in v1):**
- **Merseyrail Northern Line and Wirral Line (all 69 stations)**: Board eligibility test applies: Merseyrail is walk-up only, no reservation system (commuter urban rail). Both tests pass (walk-up boardable, no check-in barrier). Verdict: **`in`** if Merseyrail is included in v1 scope.

**Stations with multi-operator overlaps:**
- **Liverpool Lime Street (LIV, hub-lock):** National Rail platforms (Northern Trains, Avanti, TransPennine, etc.) + Merseyrail platforms (Northern/Wirral Lines, separate infrastructure, separate entrance/footbridge). Two distinct operator sets; each boards filtered separately (doNotGroup if both included in v1).
- **Liverpool Central, Moorfields:** Merseyrail only (not shared with National Rail).

**No check-in barriers:** Platform access at all National Rail and Merseyrail stations is unrestricted. Ticket checking is on-board (conductors or ticket barriers, low-level gating, not airport-style). Walk-up boarding is unobstructed for all services listed above.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Northern Trains (City Line, regional)** | Liverpool Lime Street, Liverpool South Parkway, Warrington direction, and regional stations | No (walk-up, no compulsory reservation) | No | `in` | [Northern Trains: Can I reserve a seat?](https://help.northernrailway.co.uk/s/article/Can-I-reserve-a-seat); all services walk-up boardable. |
| **Avanti West Coast (London–Liverpool Lime Street)** | Liverpool Lime Street | No (optional reservation only, not compulsory) | No | `in` | [Avanti West Coast Seat Picker](https://www.avantiwestcoast.co.uk/tickets-and-savings/seat-picker); walk-up boarding valid with or without reservation. [RailUK Forum: Avanti mandatory reservations myth debunked](https://www.railforums.co.uk/threads/avanti-mandatory-reservations.273608/); no daytime service is truly compulsory-reservation. |
| **TransPennine Express, East Midlands Railway, TfW, West Midlands Trains, CrossCountry** | Liverpool Lime Street and through-running points (various regional stations) | No (optional reservation only) | No | `in` | [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); walk-up boarding standard on regional/commuter services. |
| **Caledonian Sleeper (if calls Liverpool Lime Street)** | [Does not regularly call Liverpool; typically London Euston–Scotland route] | Yes (compulsory sleeping-car reservation) | No | `out-reservation` | [Caledonian Sleeper](https://www.sleeper.scot/); sleeper services require advance booking of berth/compartment. |
| **Merseyrail Northern and Wirral Lines (if v1 included)** | Liverpool Central, Moorfields, Ellesmere Port, and 66 other Merseyrail stations | No (walk-up commuter urban rail, no reservation system) | No | `in` | [Merseyrail](https://www.merseyrail.org/); urban commuter rail system, open boarding at all stations. |

**Board eligibility summary:** All walk-up National Rail services (Northern Trains, Avanti, TransPennine, East Midlands, TfW, West Midlands, CrossCountry) calling at Liverpool Lime Street and regional City Region stations pass both boarding-contract tests. If Merseyrail is included, all 69 stations pass both tests (walk-up, no check-in). Sleeper services (Caledonian Sleeper) fail test 1 (compulsory reservation) and are out-of-scope. **All verdicts recorded; no silent omissions.** Merseyrail inclusion pending v1 product decision (Option A include with schedule-only boards pending real-time confirmation, or Option B defer to H2).

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. Multiple TOCs (Northern, Avanti, TransPennine, East Midlands, TfW, West Midlands, CrossCountry) service Liverpool Lime Street (central hub). **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for other UK regions tonight). **Do not wire until DARWIN_LDB_TOKEN is active.**

**Merseyrail:** Static GTFS available via Transitland (included in `f-gc-rail~delivery~group~planar~gtfs`). **Real-time status unknown — no public GTFS-RT feed confirmed.** If real-time becomes available before or after D1 pack, Merseyrail boards can be updated from schedule-only to live. If not, Merseyrail stays schedule-only (similar to TfL/Valley Lines precedent of schedule-only boards at launch).

**Clash:** Merseyrail v1 scope still undecided (Option A: include schedule-only with real-time TBD, or Option B: defer to H2). National Rail is account-blocked pending Tim's UK re-registration. Liverpool Lime Street is a shared hub (National Rail platforms + Merseyrail platforms, separate infrastructure, footbridge/walkway interconnect, doNotGroup if both included). City Region spans Liverpool, Sefton, Wirral, Cheshire, Halton — geographic scope is wide; d1 pack should focus on major stations (hubs: Liverpool Lime Street; secondaries: Liverpool South Parkway, Liverpool Central, Moorfields) and City Line / Wirral Line branches.

## C2/C3 to put in front of Luke/Jim

1. **City identifier:** `city=liverpool-city-region` (kebab-case, per tracker display name, not `city=uk-liverpool` as suggested in tracker City column; tracker is inconsistent).

2. **Hub-lock architecture:**
   - **Primary hub:** Liverpool Lime Street (LIV, CRS) — National Rail main terminus, also adjacent to Merseyrail Northern/Wirral Line platforms (separate infrastructure, but foot-accessible interchange). If National Rail only, this is unambiguous hub-lock. If Merseyrail included in v1, expect doNotGroup directives for National Rail vs. Merseyrail platform separation.
   - **Secondary hub (if Merseyrail included):** Liverpool Central or Moorfields (Merseyrail dual-line interchange); National Rail does not use these.

3. **Static GTFS:** Transitland `f-gc-rail~delivery~group~planar~gtfs` covers all GB National Rail and Merseyrail. Adapter filters by:
   - **TOC agencies:** Northern Trains, Avanti West Coast, TransPennine Express, East Midlands Railway, Transport for Wales, West Midlands Trains, CrossCountry (where they call Liverpool Lime Street).
   - **Merseyrail agencies:** (if v1 included) Merseyrail operator.
   - **Geography:** Liverpool Lime Street and City Region stations (Warrington direction, Liverpool South Parkway, and Merseyrail branches if included).
   - **Board eligibility:** Exclude Caledonian Sleeper and other sleeping-car services (out-reservation).

4. **Real-time (Darwin):** Account-level blocker must be unblocked first (Tim re-registering EvansAppStudio on RDM with UK address). Once DARWIN_LDB_TOKEN provisioned, use LDB Webservice JSON API for live departures at Liverpool Lime Street and City Region stations. Latency ~1 minute.

5. **Merseyrail real-time:** Confirm with Merseyrail (contact via [merseyrail.org](https://www.merseyrail.org/) or [data@merseyrail.org](mailto:data@merseyrail.org) if available) whether public GTFS-RT feed will be published. If yes, confirm feed URL and auth type before D1 pack stage. If no, Merseyrail boards are schedule-only at v1 launch (follow TfL/Valley Lines precedent: static GTFS-derived timetables, no real-time vehicle positions).

6. **Ellesmere Port discrepancy (outside Nico scope, but flagged):** The tracker row says "Ellesmere Port [is to be] folded into Liverpool City Region... not a separate picker city." Currently, `uk-ellesmere-port` exists as a separate registry entry (`lib/providers/registry.js` lines 92–101) with status "planned". **Decision required:** Should `uk-ellesmere-port` be:
   - **Option A:** Merged into `liverpool-city-region` (remove the separate entry, absorb its 11 CRS into LCR's scope)?
   - **Option B:** Kept as a standalone city (keep the separate entry, ignore tracker's "absorb" note)?
   - This is a Jim/Tim call at wiring stage, not a data question. Current Merseyrail scope already includes Ellesmere Port (Wirral Line terminus), so there is no technical reason to keep a separate picker city unless product decision demands it.

7. **Skip risks (board eligibility + real-time):**
   - **Merseyrail real-time:** Confirm GTFS-RT availability before D1 pack. If unavailable, schedule-only is acceptable (precedent: TfL Overground planned-only; Valley Lines schedule-only pending TfW confirmation).
   - **DARWIN_LDB_TOKEN:** Cannot wire National Rail until Tim's UK re-registration is complete and token is provisioned.
   - **City Region station count:** Verify 96 CRS claim during D1 pack (currently assumed to be ~30–40 National Rail + 67 Merseyrail = ~97–107 total, roughly consistent).

8. **Expected published-network.json scope:**
   - If National Rail only (Option B Merseyrail defer): Liverpool Lime Street hub + Liverpool South Parkway + City Line stations (Warrington, Manchester direction) + some terminal stations. ~30–40 major stations.
   - If National Rail + Merseyrail (Option A): Liverpool Lime Street hub + Merseyrail Northern/Wirral lines (39 + 34 stations + Liverpool Lime Street/Central/Moorfields interchange stations). ~100–105 total stations.

9. **Timezone:** Europe/London (UTC+0, DST last Sunday March / October per UK rules).

10. **No live product flip until QA full pass.** Status stays **planned** until Mark's QA gate includes board-eligibility verdicts (Merseyrail decision made, verdicts locked) and adapter filtering matches them.

## License

- **National Rail static GTFS (Transitland `f-gc-rail~delivery~group~planar~gtfs`):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 permits redistribution with attribution. Feed derived from Rail Delivery Group ATOC-CIF format via Transitland; may be served to our users via Next Train API with attribution.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Data from Rail Delivery Group, National Rail Enquiries. Transitland feed: "Data from [Transitland feed URL](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/)" or "National Rail GTFS via Transitland".
  - **Terms URL:** [Creative Commons CC-BY-2.0 UK Deed](https://creativecommons.org/licenses/by/2.0/uk/); [Transitland feed page](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/); [National Rail CIF/GTFS source](https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/).
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed live and verified 2026-08-31. No key required.

- **National Rail real-time (Darwin OpenLDBWS):**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not confirmed in Tim's signed RDM Data Sharing Agreement. (See South Wales oracle-clash-report for parallel account-level blocker context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Train Operating Company branding per service (Northern Trains, Avanti, etc.).
  - **Terms URL:** [National Rail Developers: Darwin Data Feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/); [Rail Data Marketplace](https://raildata.org.uk/); [OGL v2.0 Deed](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/); [RDM Platform Agreement template](https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer).
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers with UK address and receives DARWIN_LDB_TOKEN. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch. **Account-level blocker must be unblocked first.**

- **Merseyrail static GTFS (Transitland, included in `f-gc-rail~delivery~group~planar~gtfs`):**
  - **License name:** Unclear — Merseyrail does not appear to publish a standalone public GTFS feed or license terms. Transitland's `f-gc-rail~delivery~group~planar~gtfs` includes Merseyrail as part of the national GB Rail dataset.
  - **Redistribution / rehosting:** Inherits from National Rail GTFS CC-BY-2.0 UK (see above). **Note:** If Merseyrail is a separate agency within the GTFS, license terms may differ — verify in feed metadata at D1 pack stage.
  - **Commercial use:** Allowed under CC-BY-2.0 (if no separate Merseyrail license overrides).
  - **Attribution:** National Rail Enquiries / Merseyrail operator.
  - **Terms URL:** [Transitland feed](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/); [Merseyrail official](https://www.merseyrail.org/).
  - **Confidence:** `unclear`. Merseyrail does not appear to maintain a separate GTFS license page. Operator does not publish a public API or developer terms visible on main website. **Recommend contacting Merseyrail directly (via [merseyrail.org](https://www.merseyrail.org/)) to confirm static GTFS and real-time feed availability, redistribution terms, and licensing before D1 pack stage.**

- **Merseyrail real-time (GTFS-RT):**
  - **License name:** Unknown — no public GTFS-RT feed confirmed.
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** None found. No public GTFS-RT API endpoint discovered in Transitland, Mobility Database, or official Merseyrail documentation.
  - **Confidence:** `not found`. Merseyrail real-time feed status unknown. **Skip risk flagged.** Confirm with Merseyrail before planning D1 pack or adapter work.

- **Keyed feeds (DARWIN_LDB_TOKEN):**
  - Token is a subscription credential, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/4-week railway period (public sector avoids overage charges). Subscription terms govern API use, not a separate data license.
  - **Account-level blocker:** Tim must complete UK re-registration on Rail Data Marketplace before DARWIN_LDB_TOKEN can be provisioned. Do not wire this region's real-time path until token is live.

## What I did not do

No line-map generation, no station hand-transcription, no GTFS direct station array population, no live city flip, no adapter code, no Darwin real-time testing, no Merseyrail real-time API testing, no multi-region ledger creation, no GitHub PR, no account re-registration testing.

**Blocking issue:** Merseyrail v1 scope decision (Option A: include schedule-only with real-time TBD, or Option B: defer to H2) and DARWIN_LDB_TOKEN account-level blocker. Tim's UK re-registration on RDM is the critical path; this region cannot proceed to adapter wiring until that is complete.
