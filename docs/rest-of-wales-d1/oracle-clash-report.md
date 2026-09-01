# Rest of Wales oracle clash report

D1 (unpublished, research as of 1 Sep 2026): **National Rail** (Darwin/OpenLDBWS) covers all mainline services across Wales outside the South Wales region (Cardiff/Valleys catchment). Rest of Wales encompasses three transport corridors: **North Wales** (Wrexham hub, North Wales Coast Line to Holyhead, Borderlands Line to Bidston/Liverpool), **Mid Wales** (Aberystwyth terminus via Cambrian Line), and **West Wales** (Carmarthen junction and branches to Pembroke Dock, Milford Haven, Fishguard). All services are National Rail; no dedicated local rail operator (unlike Valley Lines in South Wales). Transport for Wales operates the schedules as the appointed National Rail franchisee. **Account-level blocker:** Darwin/OpenLDBWS requires DARWIN_LDB_TOKEN via Rail Data Marketplace — same blocker as South Wales. EvansAppStudio re-registering from UK address; unblock required before D1 pack stage.

## V1 scoping — National Rail only, account-level blocker on Darwin

**National Rail assumption:** Darwin/OpenLDBWS for all mainline services (static GTFS via Transitland, real-time via OpenLDBWS API). Same account-level friction as South Wales: EvansAppStudio (AU-registered on RDM) must re-register with UK company address before DARWIN_LDB_TOKEN can be provisioned. All three regional corridors (North, Mid, West Wales) feed through Darwin; no split needed for D1 unless geographic complexity forces it. Unblock first before wiring.

**Regional scope:** Rest of Wales is defined as National Rail-served Wales excluding South Wales region (Cardiff Central hub + Valley Lines Valleys catchment, already in D1). Boundary to South Wales: services terminate at or pass through shared junction points with South Wales Main Line (e.g., Severn Tunnel boundary, through-running only). No additional stations enter Rest of Wales from that direction.

**v1 mode cut:** National Rail only (no buses, trams, ferries, or heritage railways). Commuter and intercity rail services walk-up boardable on the Cambrian Line, North Wales Coast Line, Borderlands Line, and West Wales lines.

## H2 — three corridors, one Darwin feed

| Corridor | Route | Key stations | Operator | Through-running |
|----------|-------|--------------|----------|---|
| **North Wales** | North Wales Coast Line (Crewe–Holyhead) + North Wales Main Line (Chester–Wrexham) + Borderlands Line (Wrexham–Bidston) | Chester (CTR, England, pass-through); Wrexham General (WRX, hub lock candidate); Llandudno Junction (LLJ); Conwy (CON); Bangor (BNG); Holyhead (HOY, terminus) | Transport for Wales | From Chester through North Wales; Borderlands continues to Bidston (England/Merseyside). Same operator, cross-border service. |
| **Mid Wales** | Cambrian Line (Shrewsbury–Aberystwyth / Pwllheli) | Welshpool (WEL); Machynlleth (MCH); Aberystwyth (AYW, terminus); Pwllheli (PWL, terminus) | Transport for Wales | Shrewsbury (England pass-through) to Mid Wales via Machynlleth junction. No inter-Wales through-running north/south. |
| **West Wales** | West Wales lines (Carmarthen–Pembroke Dock / Milford Haven / Fishguard) | Carmarthen (CMN, junction); Whitland (WLD); Narberth (NAR); Tenby (TNB); Pembroke Dock (PMD); Milford Haven (MLH); Fishguard Harbour (FGW, terminus). Llanelli branch (Llanelli LLE–Carmarthen). | Transport for Wales | East: Carmarthen continues toward Swansea on South Wales Main Line (to South Wales region, not Rest of Wales). West: branches from Whitland to Fishguard, Milford, Pembroke. No through-running north/south. |

**Station name matching:** National Rail CRS codes are canonical. Transport for Wales published timetables use CRS + passenger names (e.g., Wrexham General = WRX, Aberystwyth = AYW). Transitland / Darwin feeds include both; match by CRS code first, passenger name as fallback.

**Hub-lock candidates:**
- **Wrexham General (WRX, North Wales regional hub):** Junction of North Wales Main Line (Chester–Wrexham–Shrewsbury) and Borderlands Line (Wrexham–Bidston/Merseyside); largest North Wales station by connectivity. Recommended hub lock.
- **Aberystwyth (AYW, Mid Wales terminus):** Western endpoint of Cambrian Line. Lower connectivity (terminus only), but only major station on that line in Wales. Secondary candidate if North Wales proves less suitable; otherwise planned-only.
- **Carmarthen (CMN, West Wales junction):** Convergence of West Wales branches; lower priority than North or Mid Wales hubs.

**Shared platforms / through-running with South Wales / other regions:**
- **Severn Tunnel / South Wales Main Line boundary:** Services from North/Mid/West Wales that continue east toward Bristol, London, or South Wales pass through or terminate at South Wales region stations (e.g., Cardiff Central, Newport). These are through-running only — not shared platform de-dup points in Rest of Wales. Flag for de-dup at D2 if both regions enter the app.
- **Chester (CTR, England pass-through):** Crewe–Wrexham mainline; Chester is in England, not in Rest of Wales catalog. Through-running to North Wales Coast Line continues to Wrexham and beyond; not a catalog station for Rest of Wales (England north-west region keeps this stop).
- **Shrewsbury (England pass-through):** Cambrian Line originates in Shrewsbury (England); Machynlleth (MCH) is the first in-Wales station. Not a catalog point for Rest of Wales.
- **Llanelli (LLE) to Carmarthen branch:** Not a through-running boundary; local branch within West Wales lines, stays within catalog.

**Critical discovery:** No Transport for Wales public GTFS feed found for Rest of Wales National Rail (mainline) services. Like South Wales' Valley Lines situation, TfW operates the franchise but does not publish public GTFS/GTFS-RT data. All passenger mainline schedule data is channeled through Darwin/OpenLDBWS (National Rail Enquiries standard). **Real-time feed status unknown; must verify with TfW whether GTFS-RT is available before D1 pack.** If TfW does not publish real-time GTFS-RT via Darwin, boards would be schedule-only (Darwin static GTFS via Transitland).

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail only):**
- **Transport for Wales National Rail regional/commuter services (North Wales Coast, Cambrian, West Wales lines):** `in` (open seating, no compulsory reservation, no check-in barriers)
- **CrossCountry (through-running London–Manchester–Bristol; may call Wrexham, Mid Wales, West Wales stations):** `in` (optional reservation only, not compulsory)
- **GWR services (if any call Rest of Wales; mostly Bristol/South Wales area, but potential east-bound services from Swansea via Carmarthen):** `in` (optional reservation only, not compulsory; walk-up boardable)
- **Caledonian Sleeper services (if any call Rest of Wales; unlikely; would pass through South Wales or North via England):** `out-reservation` (compulsory seat reservation)

**Stations with overlapping rail services (in-catalog):**
- **Wrexham General (WRX, North Wales hub):** Multiple TfW services + potential CrossCountry through-running. No check-in barriers; walk-up boardable for all walk-up services listed.
- **Aberystwyth (AYW, Mid Wales terminus):** TfW regional services only; no national/intercity overlap expected. Walk-up boardable.
- **Carmarthen (CMN, West Wales junction):** TfW regional services; potential CrossCountry through-running to/from London via Swansea. Walk-up boardable.
- All other in-catalog Rest of Wales stations: TfW regional services only (no overlapping operators expected).

**No check-in barriers:** Platform access at all in-catalog stations is unrestricted. Ticket checking is on-board by conductors or at ticket gates (low-level gating, not airport-style check-in). Walk-up boarding is unobstructed for all services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Transport for Wales Regional/Commuter** (North Wales Coast, Cambrian, West Wales, Borderlands) | All in-catalog Rest of Wales stations | No (open seating, no reservation offered or required) | No | `in` | [Transport for Wales timetables](https://tfw.wales/); [North Wales Coast Line service pattern](https://tfw.wales/places/lines/north-wales-coast-line); [Cambrian Line service pattern](https://tfw.wales/places/lines/cambrian-line); regional TfW services walk-up only. |
| **CrossCountry Regional/Long-distance** | Wrexham General, Carmarthen (if through-running available) | No (optional only, not compulsory) | No | `in` | [RailUK Forums: seat reservation policy](https://www.railforums.co.uk/threads/gwr-reservations-compulsory-or-not.208259/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — reservations available but not required for walk-up boarding. Through-running via Shrewsbury or east-bound Swansea route. |
| **GWR services (if any)** | East of Carmarthen (potential branch to West Wales via Swansea) | No (optional only, not compulsory) | No | `in` | [GWR seat reservations](https://www.gwr.com/your-tickets/seat-reservations); optional reservations, not compulsory. |
| **Caledonian Sleeper (if any)** | Unlikely to call Rest of Wales; would route via South Wales or North via England | Yes (compulsory seat reservation) | No | `out-reservation` | [Caledonian Sleeper booking](https://www.sleeper.scot/); compulsory seat reservation, overnight long-distance service. |

**Board eligibility summary:** All walk-up rail services (Transport for Wales regional, CrossCountry if present, GWR if present) calling at in-catalog Rest of Wales stations pass both boarding-contract tests. No stations have check-in barriers; all support walk-up boarding. Caledonian Sleeper (if routed via Rest of Wales) fails test 1 (compulsory reservation). **All verdicts recorded; no silent omissions.** Once Darwin account-level blocker is cleared and real-time feed status confirmed, Jim will wire Darwin departures to boards at hub-lock and major stations with these verdicts enforced in filtering logic.

## H2 clash surface

**Feed blockage:** EvansAppStudio AU-registered on Rail Data Marketplace; RDM geography checks reject AU company registrations for GB services. Tim is re-registering with UK address (same blockers for East Midlands, West Midlands, Manchester, Liverpool, all National Rail regions). This is **not** a feed problem — Darwin is openly available — it's an account-access problem. Unblock path: UK re-registration on RDM, DARWIN_LDB_TOKEN provisioning.

**Real-time availability unknown:** Darwin static GTFS via Transitland confirmed live (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`; verified 1 Sep 2026). OpenLDBWS real-time: live standard, but **real-time feed status for Transport for Wales services specifically unconfirmed.** Must contact Transport for Wales (data@tfw.wales) and confirm:
- Whether GTFS-RT real-time feed is available via Darwin / RDM subscription.
- Whether TfW publishes real-time data through any other channel.
- If neither, boards stay schedule-only (Darwin static GTFS from Transitland) or planned-only until TfW publishes real-time feeds.

**Clash:** Darwin account blocked at Tim's end (AU registration). Real-time feed status for TfW services unknown. Three geographic corridors (North, Mid, West Wales) have no inter-regional through-running except eastward to South Wales (already a separate region). Regional hub (Wrexham) is clear; boundary definition vs South Wales / England-side regions is straightforward (Severn Tunnel = boundary; Chester/Shrewsbury = pass-through, not catalog).

## C2/C3 to put in front of Jim

1. **city=uk-wales** (REST of Wales National Rail, per `docs/uk-architecture.md`). Region id from UK expansion architecture; not `wales` or `rest-wales-nr`. Display name: "Rest of Wales".

2. **Hub lock: Wrexham General (WRX).** North Wales regional junction (North Wales Coast Line + North Wales Main Line + Borderlands Line). Do not conflate with Wrexham Central (southern terminus of Borderlands Line, lower connectivity).

3. **Three geographic corridors, one Darwin feed:**
   - **North Wales:** North Wales Coast Line (Crewe–Wrexham–Llandudno Junction–Holyhead), North Wales Main Line (Chester–Wrexham–Shrewsbury), Borderlands Line (Wrexham–Bidston/Merseyside). Hub: Wrexham General (WRX).
   - **Mid Wales:** Cambrian Line (Shrewsbury–Welshpool–Machynlleth–Aberystwyth / Pwllheli). Hub: Aberystwyth (AYW, terminus only).
   - **West Wales:** West Wales lines (Carmarthen–Fishguard / Milford Haven / Pembroke Dock, branches from Whitland). Junction: Carmarthen (CMN).

4. **No inter-corridor through-running within Wales.** North Wales ↔ Mid Wales must route via Shrewsbury (England, outside Rest of Wales). Mid Wales ↔ West Wales must route via Swansea or east (South Wales region, not Rest of Wales). Each corridor is operationally independent within Rest of Wales.

5. **All National Rail; no TfW public feed.** Transport for Wales operates mainline services but does not publish public GTFS/GTFS-RT (like Valley Lines situation). Schedule data: Darwin static GTFS via Transitland (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`). Real-time: Darwin OpenLDBWS (account-blocked pending UK re-registration) + TfW GTFS-RT availability unknown. **Contact TfW (data@tfw.wales) before D1 pack stage to confirm real-time feed availability.** If no GTFS-RT published, boards stay schedule-only or planned-only.

6. **Darwin account-level blocker:** DARWIN_LDB_TOKEN blocked at Tim's end (AU company registration on Rail Data Marketplace). Do not wire until UK re-registration complete.

7. **Boundary stations:**
   - **North Wales eastbound:** Chester (CTR, England pass-through, not Rest of Wales) and Wrexham (WRX, in-catalog hub). Services continue east to Shrewsbury (England, outside Rest of Wales).
   - **Mid Wales eastbound:** Shrewsbury (England pass-through) and Machynlleth (MCH, in-catalog junction). Services may continue east or south; no inter-Wales through-running.
   - **West Wales eastbound:** Carmarthen (CMN, in-catalog) continues to Swansea on South Wales Main Line (South Wales region, not Rest of Wales). Through-running only, no de-dup needed at this stage (separate regions).
   - **Severn Tunnel / South Wales Main Line:** South Wales region boundary; no Rest of Wales services pass through (different mainlines).

8. **No tram, metro, ferry, bus, heritage, or light rail in v1 scope.** National Rail only.

9. **Europe/London timezone (UTC+0 / UTC+1 DST).** All Rest of Wales in Europe/London (same as South Wales). DST: last Sunday of March (spring forward) and last Sunday of October (fall back).

10. **Product status: planned only.** No live adapter yet. Hub lock at Wrexham General (WRX). Await Darwin unblock and TfW real-time confirmation before D1 pack stage.

## License

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland feed: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 1 Sep 2026). No key required for download.

- **National Rail / Darwin OpenLDBWS real-time:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See South Wales oracle report for parallel context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Transport for Wales for regional service branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Transport for Wales National Rail services (real-time feed status unknown):**
  - **License name:** Unknown — no public GTFS-RT feed confirmed.
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** Contact TfW data team: data@tfw.wales. TransXChange format used internally for National Rail services; GTFS-RT availability unclear (unlike Valley Lines, which have no public static feed, TfW National Rail schedule data flows through Darwin).
  - **Confidence:** `not found` for real-time GTFS-RT. TfW publishes timetables in TransXChange format; public GTFS-RT feed status unknown. No public licensing terms available for a TfW-specific real-time feed. **This is a blocker for D1 real-time boards.** Contact TfW before D1 pack stage to confirm whether GTFS-RT is available (via Darwin subscription, separate API, or not published). If no public real-time feed exists, Rest of Wales boards defer to schedule-only (Darwin static GTFS) or planned-only until TfW publishes.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.
