# Thames Valley oracle clash report

**D1 (as of 2026-09-01):** National Rail (Darwin/OpenLDBWS) covers the Thames Valley region with primary hubs at **Reading** and **Oxford**, plus surrounding regional/through-running stations. Static GTFS not published by National Rail; Darwin is a realtime-only SOAP API feed, subscribed via [Rail Data Marketplace](https://raildata.org.uk/) using DARWIN_LDB_TOKEN (Onestop ID `f-nre-national_rail_enquiries_darwin_ldb_ws`). Services operated by **Great Western Railway** (GWR) as primary operator (London Paddington–Bristol/Bath–Penzance corridor); **CrossCountry** long-distance through-running; **Chiltern Railways** Oxford-Marylebone services; and **South Western Railway** through-running from Solent region at Westbury boundary.

## V1 scoping — National Rail schedule + Darwin realtime

**National Rail v1 assumption:** Schedule and realtime departures at Reading (RDG) and Oxford (OXF) via Darwin OpenLDBWS. GWR regional and inter-city services (London Paddington–Reading–Oxford–Bristol/Bath–Penzance corridor), through-running to Westbury (West of England/Solent boundary), and to Marylebone via Chiltern main line. **Account-level blocker:** EvansAppStudio AU-registered on Rail Data Marketplace; Darwin/OpenLDBWS tokens blocked for Australian registrations. Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region / East Midlands / and other UK regions). Unblock first before wiring. Once unblocked, Darwin LDBWS will provide realtime trip updates and alerts for all GWR, CrossCountry, Chiltern, and SWR services at in-scope stations.

## Station name table

Match rule: published National Rail print name vs official CRS code vs agency timetable.

| published (National Rail) | CRS code | class |
| --- | --- | --- |
| Reading | RDG | **hub lock** — principal rail terminus and interchange for Thames Valley; 15 platforms, busiest station in Berkshire and third busiest in South East England outside London. GWR Paddington services, Bristol/Bath connections, CrossCountry long-distance, South Western Railway through-running from Solent. Major interchange point. |
| Oxford | OXF | **hub secondary** — Oxford city station; direct service to Reading (22–32 min frequency). GWR regional connections to London/Reading/Bristol direction; Chiltern Railways services to London Marylebone. Regional through-hub for north-south routing (GWR line) and east-west routing (Chiltern line). |
| Swindon | SWI | **through-running point, GWR main line**. Not a merge. National Rail only; GWR regional/intercity services London–Bristol–Penzance continue through. Oxford/Banbury to Swindon via GWR line; no regional split at this station. Not shared with West of England (Swindon is upstream of Westbury boundary). |
| Banbury | BAN | **through-running point, Chiltern main line + GWR Oxford branch**. Chiltern Railways services from Marylebone via Oxford. GWR services from London Paddington via Oxford–Banbury to Birmingham. Not a merge point; two separate TOC operations on separate infrastructure at same town. |
| Westbury | WSB | **through-running point, boundary to West of England / Solent regions**. Not a merge. National Rail only; GWR services to Reading/Oxford (Thames Valley) and South Western Railway services to Southampton/Portsmouth (Solent) call at same platform but operate separate franchises. De-duplicate at D2 if adjacent regions enter the app. |
| Henley-on-Thames | HOT | Regional station on GWR branch line. Single operator (GWR). No through-running to other regions. |
| Didcot Parkway | DID | GWR main-line station, east of Oxford. Connection point for Cotswold Line (west to Hereford/Worcestershire); main line continues to Reading. Served by GWR regional only; no separate operators. |

GWR services dominate the Thames Valley route map (main line London–Reading–Oxford–Bristol–Penzance, plus Cotswold branch). Chiltern services (Marylebone–Oxford–Banbury) are a second TOC on different infrastructure; Marylebone terminus itself (the origin point) is part of London & South East National Rail region, not Thames Valley. Reading is the primary interchange hub with clear single lock-point status. Oxford is secondary but critical for north-south direction splitting (GWR toward London/Bristol, Chiltern toward Marylebone).

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail only; no other modes in v1 scope):**
- **GWR (Great Western Railway) regional/InterCity services at Reading, Oxford, and other in-catalog Thames Valley stations**: `in` (optional reservation only, not compulsory)
- **CrossCountry long-distance through-running at Reading**: `in` (optional reservation only, not compulsory)
- **Chiltern Railways at Oxford and Banbury**: `in` (optional reservation only, not compulsory; walk-up boarding typical)
- **South Western Railway through-running at Westbury**: `in` (optional reservation only, not compulsory)

**Stations with National Rail overlap:**
- **Reading (RDG, hub-lock)**: GWR + CrossCountry + SWR at different platforms, all National Rail. No multi-operator platform mixing (unlike London Bridge or Copenhagen). Boards must show all three operators per boarding-contract test.
- **Oxford (OXF, secondary hub)**: GWR (main line) + Chiltern Railways (Marylebone branch) at different platforms. Two separate operators on different infrastructure. Boards must show both.
- **Banbury (BAN)**: Chiltern Railways (from Marylebone) + GWR (from Paddington via Oxford). Two separate TOCs, different platform groups. Boards must show both.
- **Westbury (WSB, boundary station)**: GWR (Reading direction) + SWR (Solent direction) at same platform. Both continue across regional boundary; no duplication within Thames Valley, flagged for D2 ledger.

**No check-in barriers (except Eurostar, out of scope):** Platform access at all in-catalog Thames Valley stations is unrestricted. Ticket checking is on-board by conductors or at low-level ticket barriers (not airport-style). Walk-up boarding is unobstructed for all National Rail services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **GWR (Great Western Railway) Regional/InterCity** | Reading, Oxford, Swindon, Didcot, Banbury (via Oxford branch), Henley, plus other Thames Valley stations | No (optional only, not compulsory) | No | `in` | [GWR seat reservations](https://www.gwr.com/your-tickets/seat-reservations); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — seat reservations optional for flexible (Off-Peak/Anytime) and some Advance tickets. No boarding restrictions. |
| **CrossCountry Regional/Long-distance** | Reading (through-running north-south route) | No (optional only, not compulsory) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — reservations available but not required for walk-up boarding. |
| **Chiltern Railways Regional** | Oxford, Banbury (Marylebone–Banbury line), plus Oxfordshire stations | No (optional only, not compulsory; open seating typical) | No | `in` | [Chiltern Railways travel info](https://www.chilternrailways.co.uk/); walk-up boarding, no reserved seats typical on most services. |
| **South Western Railway through-running** | Westbury (boundary station, Solent direction) | No (optional only, not compulsory) | No | `in` | [SWR travel info](https://www.southwesternrailway.com/); walk-up boarding on regional/InterCity. |

**Board eligibility summary:** All National Rail services (GWR, CrossCountry, Chiltern Railways, SWR) calling at Reading, Oxford, and other in-catalog Thames Valley stations pass both boarding-contract tests. Seat reservations are optional only (not compulsory) for all operators on this corridor; no stations have check-in barriers. **All verdicts recorded; no silent omissions.** Marylebone (London terminus, origin point for Chiltern services into Oxford) is out-of-scope for Thames Valley (it falls within London & South East National Rail region). **Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at both in-catalog stations with these verdicts enforced in filtering logic.**

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. GWR, CrossCountry, Chiltern Railways, SWR service codes (multiple operators crossing franchise boundaries at Westbury / Oxford / Banbury). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same blocker for West Midlands / Manchester / Liverpool; not a feed problem).

**Clash:** National Rail realtime available via Darwin OpenLDBWS only (static GTFS not published by NRE; no GTFS-RT protocol buffer feed). No buses, no light rail, no metros, no Elizabeth Line in v1 scope. Multiple operators on single infrastructure at boundary/junction stations (GWR + CrossCountry + SWR at Reading; GWR + Chiltern at Oxford; Chiltern + GWR at Banbury); doNotGroup by operator or line code at hub stations if any. Reading is the single lock-point and primary interchange; Oxford is secondary but requires separate boarding logic for two operators on distinct platforms (like London Bridge). Westbury boundary flagged for D2 deduplication.

## C2/C3 to put in front of Jim

1. **city=thames-valley** (National Rail only; single region, Reading/Oxford core). National Rail = Darwin LDBWS (multiple operators: GWR primary, CrossCountry/Chiltern/SWR at specific stations).

2. **Reading (RDG CRS)** is the hub lock (principal interchange and busiest station in Thames Valley region; 15 platforms, third busiest South East England outside London).

3. **Oxford (OXF CRS)** is a secondary hub (major city, frequent service to Reading, regional connections on two separate TOC lines — GWR and Chiltern).

4. **doNotGroup logic at hub stations:** Reading hosts GWR + CrossCountry + SWR on different platforms but same physical station — no multi-operator platform separation required (unlike Copenhagen's Metro or London Bridge's Thameslink/Southeastern/Southern split), so standard "separate boards per platform" pattern applies. Oxford hosts GWR (main line) + Chiltern (branch line) on different platforms and infrastructure — separate boarding logic required per operator.

5. **no schedule data available from NRE.** Darwin provides realtime only (SOAP API response includes trip/stop details but no static GTFS publication). Next Train must combine trip updates from Darwin with a third-party GTFS source or ingest live departures directly from Darwin. Same constraint as West of England and South Wales.

6. **Multiple operators on single/adjacent infrastructure.** GWR operates the core London–Reading–Oxford–Bristol–Penzance line (primary route through Thames Valley). Chiltern Railways operates Marylebone–Oxford–Banbury line (secondary north-south route, separate platforms from GWR at Oxford and Banbury). CrossCountry and SWR pass through as through-running services. All run on Network Rail track; separate operator sections at Reading (three operators at different platforms, same terminus), Oxford (two operators on separate infrastructure), and Banbury (two operators on different infrastructure). Reading is the unified lock point; Oxford and Banbury are secondary hubs requiring separate boarding engines per operator. Treat as a single National Rail city in D1 (not split by operator).

7. **No buses, no light rail, no trams, no Elizabeth Line in v1 scope.** National Rail Darwin only. Elizabeth Line (TfL) serves Reading as well; out of v1 scope.

8. **Account-level unblock required.** Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration. Same unblock path as West Midlands / Manchester / Liverpool / East Midlands. Tim re-registering EvansAppStudio on RDM.

9. **Westbury boundary (West of England / Solent):** Through-running point on the main line west of Reading. GWR services to Bristol/Bath continue through; SWR services branch south to Solent. Not a merge or de-dup point within Thames Valley, but flag for D2 multi-region ledger if West of England region also enters app (both regions claim the boundary station, separate platforms/operators).

10. **Marylebone boundary (London & South East National Rail):** Chiltern Railways originate from Marylebone (London terminus) and run through Oxford and Banbury to Birmingham. Marylebone is part of L&SE National Rail (London terminus), not Thames Valley. Chiltern services calling at Oxford are `in` for Thames Valley; origin point is in a different region. Flag for D2 ledger deduplication if L&SE also enters app (same Chiltern trains, different region starting points).

## Skip risks

1. **Account-level Darwin blocker:** EvansAppStudio AU registration on RDM blocks DARWIN_LDB_TOKEN provisioning. Tim must complete UK re-registration with RDM before any wiring. This is the same block affecting East Midlands / South Wales / West of England / West Midlands / Manchester / Liverpool and all other UK regions in this wave — not a Thames Valley-specific issue.

2. **No static GTFS feed from NRE:** National Rail does not publish static GTFS directly. Transitland republishes UK National Rail GTFS (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`) derived from CIF data; this is production-ready and verified. No key required. Same constraint as other UK National Rail regions — shared solution.

3. **Chiltern Railways operator transition:** Chiltern Railways transitions from Arriva to DfT Operator on 20 September 2026 (per March 2026 infrastructure update). Verify that Darwin real-time data correctly attributes Chiltern services after the transition and that GTFS agencies align with the new operator structure. Not a blocker, but a timing flag — D1 pack and adapter wiring should account for September 2026 operator change.

4. **Marylebone closure for engineering:** Chiltern main line saw engineering closures 14–15 March and 28–29 March 2026 at Marylebone. Ongoing engineering may affect real-time data quality during maintenance windows. Standard closure handling (no v1 scope impact).

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See East Midlands / West of England / South Wales oracle-clash-reports for parallel account-level blocker context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. GWR for primary operator branding; CrossCountry / Chiltern Railways / SWR for other operators' service codes.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 2026-09-01). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.
