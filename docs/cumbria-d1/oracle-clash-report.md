# Cumbria oracle clash report

D1 (research, 2026-09-01): **National Rail** (Darwin/OpenLDBWS) covers all rail services across Cumbria, a geographic region spanning the ceremonial county from the Lake District (Oxenholme, Kendal, Windermere) south through the West Coast Main Line (Penrith, Carlisle) and Settle-Carlisle Line, and west to the Furness and Cumbrian Coast lines (Barrow-in-Furness, Ulverston). Primary operators: **Northern Trains** (franchise holder for regional services in Cumbria), **TransPennine Express** (intercity West Coast Main Line), **Avanti West Coast** (long-distance London–Scotland). Static GTFS via [Rail Delivery Group feed on Transitland](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/) (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`, verified 2026-09-01). Real-time via **OpenLDBWS** requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/) (free tier: 100,000 calls/month); **account-level blocker:** EvansAppStudio registered on RDM as an Australian company — Tim is re-registering with UK company address (same block affects East Midlands, West Midlands, Greater Manchester, Liverpool City Region, South Wales, and other UK regions this wave). Hub-lock: **Carlisle** (CAR CRS, 8 platforms; West Coast Main Line, Settle-Carlisle Line, Tyne Valley Line, Cumbrian Coast Line junction; ~1.97 million passengers per 2017–18 ORR data). Total stations in scope: **48 National Rail stations** across Cumbria (verified via Wikipedia List of railway stations in Cumbria).

## V1 scoping — National Rail at hub stations and branch termini, Caledonian Sleeper verdict required

**Geographic boundary (Cumbria):** All National Rail services across the ceremonial county of Cumbria, bounded:
- **South:** West Midlands/Greater Manchester boundary near Wigan/Preston area; **Settle-Carlisle Line southern boundary** at Hellifield / Settle (where route diverges south toward Lancashire and Greater Manchester regions).
- **North:** Lockerbie (Scotland boundary on West Coast Main Line, ~21 km north of English border); **Tyne Valley Line northern boundary** at Carlisle (terminus of Newcastle–Carlisle service).
- **East:** Settle (Settle-Carlisle Line, junction toward Yorkshire).
- **West:** Barrow-in-Furness and Workington (Furness Line and Cumbrian Coast Line termini).

**Scope clarification:** Cumbria region focuses on **National Rail main-line services only** (Darwin/OpenLDBWS), not commuter/metro services (e.g., London Underground, no equivalent in Cumbria). Local bus services (e.g., Stagecoach in Cumbria) excluded by mode.

**National Rail assumption:** Walk-up regional, intercity, and sleeper services at **Carlisle** (hub-lock), **Oxenholme, Penrith, Barrow-in-Furness, Windermere** and other branch-line stations. Northern Trains regional services do not enforce compulsory seat reservations; all daytime services allow walk-up boarding. Avanti West Coast and TransPennine Express also allow walk-up boarding (optional reservations only). **Caledonian Sleeper** calls at Carlisle with compulsory berth reservation. Account-level Darwin blocker must be resolved at Tim's end before wiring.

**No separate Cumbrian operator GTFS:** Northern Trains, Avanti West Coast, and TransPennine Express are all Train Operating Companies (TOCs) within National Rail; their services are included in the Rail Delivery Group GTFS feed used by Transitland. No separate Cumbria-only operator feed confirmed.

## Station name table — hub lock and network junctions

Match rule: published rail station name vs. National Rail station print (CRS code) vs. official operator map. Primary hub and major stations identified; full branch station list at D1 pack stage.

| published | agency print | class |
| --- | --- | --- |
| **Carlisle** | Carlisle railway station (CAR CRS, 8 platforms) | **Hub lock — tier 1**. Junction of four major lines: West Coast Main Line (north to Scotland, south to Preston/Manchester), Settle-Carlisle Line (east to Leeds), Tyne Valley Line (east to Newcastle), Cumbrian Coast Line (south/west to Barrow-in-Furness/Workington). Northern, Avanti, TransPennine, Caledonian Sleeper, and through-running operators converge. ~1.97 million passengers per 2017–18 ORR data. |
| **Penrith** | Penrith railway station (PEN CRS) | West Coast Main Line, ~17 miles south of Carlisle. Regional and intercity services (Northern, TransPennine, Avanti). Secondary hub. |
| **Oxenholme Lake District** | Oxenholme Lake District railway station (OXO CRS) | **Hub lock — tier 2, junction point**. West Coast Main Line (north to Carlisle, south to Manchester); branch point to Lakes Line (east to Kendal, Windermere). Avanti West Coast, TransPennine Express, Northern services. ~581k passengers in 2017–18. |
| **Windermere** | Windermere railway station (WND CRS) | Lakes Line branch terminus (Oxenholme→Kendal→Windermere). Northern Trains regional service. Tourist/commuter hub for Lake District. |
| **Kendal** | Kendal railway station (KND CRS) | Lakes Line (branch from Oxenholme). Northern Trains regional service. Lake District market town. |
| **Barrow-in-Furness** | Barrow-in-Furness railway station (BIF CRS, 3 platforms) | **Hub lock — tier 2, southern terminus**. Junction of Furness Line (north to Ulverston, Lancaster direction) and Cumbrian Coast Line (north to Workington, Carlisle). Northern Trains services. ~652k passengers per 2017–18 ORR data. |
| **Settle** | Settle railway station (CRS SLF) | Settle-Carlisle Line, ~48 miles south of Carlisle. Southern boundary of Cumbria on SCL; route continues south to Hellifield (junction toward Greater Manchester / Preston). Northern Trains regional service. |
| **All other stations (38 total)** | Per published Cumbrian timetables (Cumbrian Coast Line, Furness Line, Settle-Carlisle Line, WCML) | Regional, commuter, branch-line, and terminus stations. No conflicts with other UK regions identified at this stage; will be verified at D1 pack stage. |

**Four tier-1/tier-2 hub/junction stations identified.** Carlisle is the primary cross-line interchange and junction; Oxenholme and Barrow-in-Furness are secondary hubs serving different geographical corridors; Penrith is a major WCML station. No live adapter yet; product `lib/cities/cumbria/` absent.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail services calling at Cumbrian hub stations):**
- **Northern Trains regional and commuter routes (Settle-Carlisle Line, Furness Line, Cumbrian Coast Line, Tyne Valley Line, Lakes Line branch, and WCML regional services)**: `in` (open seating or assigned seating without compulsory reservation; walk-up boarding standard practice per Northern Trains help documentation)
- **TransPennine Express (intercity services on WCML: Preston/Manchester–Carlisle–Scotland)**: `in` (optional seat reservations only, not compulsory; walk-up boarding available)
- **Avanti West Coast (long-distance London–Scotland on WCML, calls Carlisle, Penrith, Oxenholme)**: `in` (optional seat reservations only for Advance fares; walk-up booking available for walk-up/standard fares)
- **CrossCountry (through-running long-distance, if calling Cumbrian stations)**: `in` (optional reservation only, not compulsory; walk-up boarding available)
- **Caledonian Sleeper (overnight services London Euston to Inverness, Fort William, Aberdeen; stops Carlisle for supply/crew change)**: `out-reservation` (compulsory berth/cabin reservation; all passengers must book sleeping accommodation in advance; boarding restricted to booked passengers only with staff check-in on platform 60–90 minutes before departure)

**Check-in procedure clarification for Caledonian Sleeper:** Caledonian Sleeper staff conduct check-in on platform (not formal airport-style barrier) at origin stations including Carlisle (though Carlisle is a stop, not typical origin; staff verify booked sleeper passengers for continuity). All berths are reserved; boarding fails test 1 (compulsory reservation), not test 2 (check-in barrier). Verdict: `out-reservation` per board-eligibility-rule.md §6.

**Stations with multi-operator platforms:**
- **Carlisle (CAR, hub-lock)**: Northern Trains + Avanti West Coast + TransPennine Express + Caledonian Sleeper. Northern/Avanti/TransPennine → `in`; Caledonian Sleeper → `out-reservation`.
- **Oxenholme (OXO, tier-2 hub)**: Avanti West Coast + TransPennine Express + Northern Trains. All → `in`.
- **Penrith (PEN, WCML)**: Avanti West Coast + TransPennine Express + Northern Trains. All → `in`.
- **Windermere (WND, Lakes Line terminus)**: Northern Trains only. → `in`.
- **Kendal (KND, Lakes Line)**: Northern Trains only. → `in`.
- **Barrow-in-Furness (BIF, tier-2 hub)**: Northern Trains only. → `in`.
- **Settle (SLF, Settle-Carlisle Line)**: Northern Trains only. → `in`.

**No check-in barriers:** Platform access at all Cumbrian National Rail stations is unrestricted. Ticket checking is on-board by conductors or at revenue protection officers (low-level gating, not airport-style check-in). Walk-up boarding is unobstructed for all services marked `in` above.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Northern Trains (regional, commuter, and branch-line services)** | Carlisle, Penrith, Oxenholme, Kendal, Windermere, Barrow-in-Furness, Settle, and 37 other Cumbrian stations | No (open seating or assigned seating without compulsory reservation; walk-up standard) | No | `in` | [Northern Trains: Can I reserve a seat?](https://help.northernrailway.co.uk/s/article/Can-I-reserve-a-seat); Northern operates 350+ stations in North West and Yorkshire; seat reservations available but not required. Walk-up boarding standard practice. |
| **TransPennine Express (regional/intercity WCML: Preston–Carlisle–Scotland)** | Carlisle, Penrith, Oxenholme | No (optional seat reservations only for premium fares; walk-up available on standard fares) | No | `in` | [TransPennine Express Seat Reservations](https://www.tpexpress.co.uk/travelling-with-us/seat-reservations-and-upgrades); premium and standard fares both available; walk-up booking valid. |
| **Avanti West Coast (long-distance WCML: London–Scotland, calls Carlisle region)** | Carlisle, Penrith, Oxenholme | No (optional reservations for Advance fares; walk-up booking valid) | No | `in` | [Avanti West Coast Seat Picker](https://www.avantiwestcoast.co.uk/tickets-and-savings/seat-picker); walk-up and advance-purchase options available; reservations not compulsory. |
| **CrossCountry (through-running intercity, if Cumbrian calls confirmed)** | [Cumbrian calls to be verified at D1 pack stage] | No (optional reservation only, not compulsory) | No | `in` | [UK Rail Seat Reservations Guide](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); CrossCountry reservations optional for walk-up fares. |
| **Caledonian Sleeper (overnight London Euston to Inverness, Fort William, Aberdeen; stops Carlisle for supply/crew change)** | Carlisle (supply/crew change stop; not typical boarding point, but staff check-in occurs for through passengers) | Yes (compulsory berth/cabin booking; all passengers must reserve overnight accommodation in advance) | Platform staff check-in for documentation (not travel barrier) | `out-reservation` | [Caledonian Sleeper Before Your Trip](https://www.sleeper.scot/help-support/before-your-trip/); [Caledonian Sleeper Policies](https://www.sleeper.scot/about/policies/); all berths are reserved; boarding restricted to booked passengers; staff meet guests on platform 60–90 minutes before departure for document check-in and carriage assignment. Fails test 1 (compulsory reservation). [Caledonian Sleeper Route & Stops](https://www.sleeper.scot/travel-updates/all-timetables/) — service stops at Carlisle for operational crew change and supply; passengers may board/alight at Carlisle if their reservation includes that station, but all passengers must have pre-booked berth reservations. |

**Board eligibility summary:** All walk-up National Rail regional, intercity, and commuter services (Northern Trains, Avanti West Coast, TransPennine Express) calling at Carlisle, Penrith, Oxenholme, Barrow-in-Furness, Windermere, Kendal, Settle, and other Cumbrian stations pass both boarding-contract tests. Seat reservations are optional only (not compulsory) for all three major operators on these corridors; no stations have check-in barriers. Caledonian Sleeper fails test 1 (compulsory berth reservation) and is excluded with verdict `out-reservation`, consistent with verdicts in Rest of Scotland and Liverpool City Region reports (same service, same reasoning). **All verdicts recorded; no silent omissions.** Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at Carlisle hub and other in-catalog stations with these verdicts enforced in filtering logic.

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. Northern Trains, Avanti West Coast, TransPennine Express, and CrossCountry service Cumbria across five major railway lines. Static GTFS via Rail Delivery Group (verified on Transitland 2026-09-01). Real-time via OpenLDBWS (blocked at account level by EvansAppStudio's AU-registered RDM account — same blocker as East Midlands / West Midlands / Greater Manchester / Liverpool City Region / South Wales). **Account-level blocker:** Tim must complete UK re-registration on Rail Data Marketplace before DARWIN_LDB_TOKEN can be provisioned.

**Caledonian Sleeper:** Overnight long-distance service (London Euston to Aberdeen, Inverness, Fort William). Stops at Carlisle for supply/crew change (not typical boarding point, but staff conduct on-platform check-in for through passengers). Verdict: `out-reservation` per board-eligibility rule. Service calls Carlisle; excludes it from v1 boards per filtering logic.

**Cross-border and through-running operators:** Avanti West Coast and TransPennine Express services cross Cumbria boundaries (south to Greater Manchester/Liverpool City Region area via Preston/Wigan, north to Rest of Scotland at Lockerbie boundary on WCML). Carlisle is a through-running point on national long-distance corridors (London–Scotland WCML), not a merge point within Cumbria. De-duplication at D2 if adjacent regions (Greater Manchester, Liverpool City Region, Rest of Scotland) enter the app.

**Regional boundaries and through-running stations:**
- **South boundary (Greater Manchester / Liverpool City Region):** The Settle-Carlisle Line's southern extent ends at Settle (~48 miles south of Carlisle); route then continues to Hellifield (junction toward Preston/Lancashire, outside Cumbria scope). West Coast Main Line continues south through Preston/Wigan (Greater Manchester region boundary). **Potential through-running point:** Wigan/Preston area; Cumbria does not claim these stations (already in Greater Manchester / Liverpool City Region scope per those regions' oracle reports). **No overlap identified; Cumbria southern boundary is clear at Settle/Hellifield and Preston area.**
- **North boundary (Rest of Scotland):** West Coast Main Line continues north of Carlisle through Lockerbie (just inside Scotland, ~21 km from English border). **Caledonian Sleeper, Avanti West Coast, and TransPennine Express services call both Carlisle (Cumbria, English side) and Lockerbie (Rest of Scotland, Scottish side) and other Scottish stations.** No de-dup issue at Carlisle itself (Cumbria claims Carlisle only), but flag for D2 coordination: if Rest of Scotland's oracle report treats Lockerbie and north as in-scope and Cumbria treats Carlisle and south as in-scope, through-running services will appear in both regions' feeds (consistent with South Wales / West of England boundary treatment at Severn Tunnel Junction). **Do not attempt to de-dup; flag for Luke at D1 pack stage and Mark at D2 QA gate.**

**Clash:** Account-blocked National Rail RT feed + multiple operators at Carlisle hub + Caledonian Sleeper board-eligibility verdict required + cross-region through-running at Lockerbie/Carlisle boundary + five separate railway lines (WCML, Settle-Carlisle, Tyne Valley, Furness, Cumbrian Coast) radiating from Carlisle. No L3 / S-Bahn / Metro / urban rail other than National Rail in v1 scope.

## C2/C3 to put in front of Luke/Jim

1. **city=cumbria** (kebab-case, matching all UK regions built this wave). Operators: **Northern Trains** (primary franchise holder for Cumbria), **Avanti West Coast** (long-distance WCML London–Scotland), **TransPennine Express** (regional WCML), **Caledonian Sleeper** (overnight London–Scotland, verdict: `out-reservation`).

2. **Hub-lock architecture: Carlisle (CAR CRS, 8 platforms, ~1.97M annual passengers)** — four-line junction (WCML north/south, Settle-Carlisle east, Tyne Valley east, Cumbrian Coast south/west). All major operators converge here. Carlisle is unambiguously the primary hub-lock for this region.

3. **Secondary hubs (tier-2):**
   - **Oxenholme Lake District (OXO)** — West Coast Main Line junction with Lakes Line branch (→Kendal, Windermere). Avanti, TransPennine, Northern services. ~581k passengers.
   - **Barrow-in-Furness (BIF)** — Furness Line and Cumbrian Coast Line junction. Northern Trains. ~652k passengers.

4. **Five major railway lines connect Cumbria:**
   - **West Coast Main Line (WCML)**: Oxenholme → Penrith → Carlisle → Lockerbie (Scotland). Avanti, TransPennine, Northern. Through-running (London–Scotland).
   - **Lakes Line branch (WCML junction→ Kendal, Windermere)**: Oxenholme → Kendal → Burneside → Staveley → Windermere. Northern only. Tourist corridor, no through-running to other regions.
   - **Settle-Carlisle Line (SCL)**: Hellifield / Settle ↔ Appleby ↔ Carlisle. 19 stations, 71.75 miles. Northern Trains (Leeds–Carlisle service). Southern boundary at Hellifield (outside Cumbria scope). Through-running (Leeds direction toward Greater Manchester).
   - **Cumbrian Coast Line**: Carlisle ↔ Workington ↔ Barrow-in-Furness (via western coast). Northern Trains. Branch to Barrow-in-Furness.
   - **Furness Line**: Barrow-in-Furness ↔ Ulverston ↔ Kirkby-in-Furness ↔ Askam ↔ Lancaster. Northern Trains. Southern boundary at Lancaster / Carnforth (outside Cumbria scope, Lancashire). Limited through-running; mostly regional.
   - **Tyne Valley Line**: Newcastle ↔ Carlisle. Northern Trains. Eastern boundary at Carlisle. Newcastle terminus (outside Cumbria scope, Northeast region boundary).

5. **Station count: 48 National Rail stations in ceremonial county of Cumbria** (verified Wikipedia: List of railway stations in Cumbria). Major stations in-scope at D1 pack: Carlisle (1.97M), Barrow-in-Furness (652k), Oxenholme (581k), Penrith (major WCML), Windermere (tourist hub), Kendal, Settle, and 41 smaller branch/regional/terminus stations.

6. **Static GTFS:** Transitland `f-gc-rail~delivery~group~planar~gtfs` covers all GB National Rail. Adapter filters by:
   - **TOC agencies:** Northern Trains, Avanti West Coast, TransPennine Express, (CrossCountry if Cumbrian calls confirmed).
   - **Geography:** All stations in Cumbria ceremonial county per Wikipedia list (48 stations).
   - **Board eligibility:** Exclude Caledonian Sleeper (out-reservation) from v1 boards.

7. **Real-time (Darwin):** Account-level blocker must be unblocked first (Tim re-registering EvansAppStudio on RDM with UK address). Once DARWIN_LDB_TOKEN provisioned, use LDB Webservice JSON API for live departures at Carlisle hub and all other Cumbrian stations. Latency ~1 minute. Free tier: 100,000 calls/month.

8. **Caledonian Sleeper board eligibility: `out-reservation`.** Compulsory berth booking required. Calls at Carlisle (supply/crew change stop; passengers may board/alight if reservation includes Carlisle, but all must be pre-booked). Excluded from v1 boards per filtering logic. Consistent with Rest of Scotland and Liverpool City Region verdicts (same service, same reasoning).

9. **Through-running stations (Carlisle, Oxenholme, Penrith):** National Rail trains continue across regional boundaries. Carlisle carries through-running from/to Scotland (north on WCML → Rest of Scotland). Oxenholme and Penrith carry WCML through-running (south toward Greater Manchester / Liverpool City Region). Settle carries through-running south toward Lancashire/Greater Manchester (Leeds direction). Flag for de-dup at D2 if adjacent regions enter app (Rest of Scotland, Greater Manchester, Liverpool City Region already in scope; coordinate at D2 on through-running de-duplication logic).

10. **No tram, no metro, no buses in v1 scope.** National Rail (heavy/dark rail and branch-line rail) only. No light rail, no urban metro systems (Cumbria has no metro-equivalent services).

11. **Europe/London timezone (UTC+0 / UTC+1 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

12. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.** Cumbria is a single city-like scope (one ceremonial county, five interconnected railway lines all radiating from/through Carlisle hub). No sub-city line-map distinction needed at v1; one direction model sufficient for all five lines (all converge at Carlisle).

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See East Midlands, South Wales, Greater Manchester, Liverpool City Region, Rest of Scotland oracle-clash-reports for parallel account-level blocker context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Train Operating Company branding per service (Northern Trains, Avanti West Coast, TransPennine Express, Caledonian Sleeper operator).
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Rail Delivery Group via Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = prohibited.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 2026-09-01). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.
