# Southwest oracle clash report

D1 (as of 2026-09-01): **National Rail** (Darwin/OpenLDBWS) covers the Southwest region of England (Devon and Cornwall) via **Exeter St Davids** (EXD) as hub-lock and **Plymouth** (PLY) as secondary hub, plus surrounding stations on the South West Main Line through **Penzance** (PNZ) terminus. Static GTFS not published by National Rail; Darwin is a realtime-only SOAP API feed, subscribed via [Rail Data Marketplace](https://raildata.org.uk/) using DARWIN_LDB_TOKEN (Onestop ID `f-nre-national_rail_enquiries_darwin_ldb_ws`). Services operated by **Great Western Railway** (GWR) as primary operator; **CrossCountry** long-distance through-running via Bristol/Midlands; **Night Riviera Sleeper** (London–Penzance, compulsory sleeping-car reservation, excluded by boarding contract).

## V1 scoping — National Rail schedule + Darwin realtime

**National Rail v1 assumption:** Schedule and realtime departures at Exeter St Davids (EXD), Plymouth (PLY), Penzance (PNZ), and surrounding South West Main Line stations via Darwin OpenLDBWS. GWR regional and inter-city services (London Paddington–Bristol–Exeter–Plymouth–Penzance corridor); CrossCountry long-distance through-running from Scotland/Midlands via Bristol; continuation to boundary at Taunton (shared with West of England region). **Account-level blocker:** EvansAppStudio AU-registered on Rail Data Marketplace; Darwin/OpenLDBWS tokens blocked for Australian registrations. Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region / East Midlands / South Wales). Unblock first before wiring. Once unblocked, Darwin LDBWS will provide realtime trip updates and alerts for all GWR and CrossCountry services at in-scope stations.

## Station name table

Match rule: published National Rail print name vs official CRS code vs agency timetable.

| published (National Rail) | CRS code | class |
| --- | --- | --- |
| Exeter St Davids | EXD | **hub lock** — principal rail terminus for Exeter city; all GWR InterCity and regional services call here. Main interchange between London Paddington services and Southwest corridor (Plymouth–Penzance direction). Through-running point for CrossCountry services via Midlands/Bristol. |
| Plymouth | PLY | **hub secondary** — Plymouth city station; frequent service to Exeter St Davids (30–60 min), direct service to Penzance via Riviera Line. Regional connections north to Exeter; served by GWR and CrossCountry. Largest passenger station in southwest region after Exeter. |
| Penzance | PNZ | **terminus** — westernmost and southernmost station on National Rail network; terminus of Cornish Main Line. GWR regional/InterCity terminus. Night Riviera sleeper terminus (London–Penzance). |
| Taunton | TAU | **through-running point, boundary to West of England region**. Not a merge. National Rail only; GWR and CrossCountry services cross into West of England region (Bristol/Bath/London Paddington direction) at this point. De-duplicate at D2 if West of England region enters the app (already has D1 pack as of 31 Aug 2026). |
| Newton Abbot | NAB | **through-running point** (South West Main Line). GWR and CrossCountry services continue south to Plymouth. No through-running to adjacent regions (standalone station on trunk corridor). |
| Totnes | TON | **through-running point** (Riviera Line branch). GWR regional services continue south to Plymouth. No through-running to adjacent regions. |
| Truro | TRU | **Truro branch** (branch line off Cornish Main Line). GWR services call between Exeter and Penzance. Intermediate stop, no through-running. |
| St Austell | SAU | **St Austell branch** (Cornish Main Line). Intermediate stop between Truro and Penzance. No through-running to adjacent regions. |
| St Erth | SER | **St Erth branch** (Cornish Main Line). Penultimate station before Penzance terminus. No through-running to adjacent regions. |

GWR services dominate the Southwest route map (main line London–Bristol–Exeter–Plymouth–Penzance). CrossCountry through-running stations are served by both operators but no shared tram/rail infrastructure like East Midlands Nottingham Station — all National Rail standard-gauge heavy rail on Network Rail infrastructure. Through-running boundary at Taunton already documented in West of England D1 pack (dated 31 Aug 2026); flag for Luke at D1 pack stage for consistency.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail only, no buses/trams/ferries in v1 scope):**
- **GWR (Great Western Railway) at Exeter St Davids, Plymouth, Penzance, and other Southwest Main Line stations**: `in` (optional reservation only, not compulsory booking)
- **CrossCountry at Exeter St Davids, Plymouth, and intermediate Southwest stations**: `in` (optional reservation only, not compulsory booking)
- **Night Riviera Sleeper at Exeter St Davids, Plymouth, Penzance**: `out-reservation` (compulsory sleeping-car cabin reservation required; cannot walk up and board)

**No check-in barriers:** Platform access at all in-catalog stations is unrestricted. Ticket checking is on-board by conductors or at low-level station barriers (not airport-style check-in). Walk-up boarding is unobstructed for all walk-up services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **GWR Regional/InterCity (London–Penzance corridor)** | Exeter St Davids, Plymouth, Penzance, Newton Abbot, Totnes, Truro, St Austell, St Erth, and other Southwest Main Line stations | No (optional reservation only, not compulsory) | No | `in` | [GWR seat reservations](https://www.gwr.com/your-tickets/seat-reservations); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — seat reservations optional for flexible (Off-Peak/Anytime) and some Advance tickets. No boarding restrictions. |
| **CrossCountry Long-distance (Scotland/Midlands–Southwest)** | Exeter St Davids, Plymouth, and intermediate stations via through-running via Bristol | No (optional reservation only, not compulsory) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/customer-service/contact-us-and-faqs/buying-tickets/how-can-i-reserve-a-seat-for-my-crosscountry-journey); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — reservations bookable but not required for walk-up boarding on standard services. Walk-up section available on non-fully-booked trains. |
| **Night Riviera Sleeper (London Paddington–Penzance)** | Exeter St Davids, Plymouth, Penzance, Truro, St Austell, St Erth, and intermediate stops | **Yes (compulsory sleeping-car cabin reservation)** | No | `out-reservation` | [GWR Night Riviera Sleeper](https://www.gwr.com/travelling-with-us/night-riviera-sleeper); [Night Riviera Wikipedia](https://en.wikipedia.org/wiki/Night_Riviera) — sleeping compartments cannot be booked online; must be reserved at station or via GWR telesales (+44 3457 000 125). Reservation is mandatory for boarding. |

**Board eligibility summary:** GWR and CrossCountry walk-up regional/intercity services calling at Exeter St Davids, Plymouth, Penzance, and intermediate Southwest Main Line stations pass both boarding-contract tests. Seat reservations are optional only (not compulsory) for both operators on this corridor; no stations have check-in barriers. **All verdicts recorded; no silent omissions.** Night Riviera Sleeper is excluded by compulsory sleeping-car reservation requirement (out-reservation verdict), consistent with other UK regions (Caledonian Sleeper at London & South East National Rail, Night Riviera at London & South East National Rail, London termini). No other rail operator calls at these in-catalog stations. **Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at Exeter St Davids, Plymouth, Penzance, and surrounding stations with these verdicts enforced in filtering logic.**

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. GWR and CrossCountry service codes (two operators sharing single National Rail infrastructure at hub and through-running points). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same blocker for West Midlands / Manchester / Liverpool / South Wales / East Midlands; not a feed problem).

**Boundary consistency:** Taunton (TAU) is documented in West of England D1 pack (31 Aug 2026) as a through-running point toward the Southwest/Devon region (GWR services continue west to Exeter and beyond). This report recognizes Taunton as the eastern boundary of Southwest scope; no duplicate or conflicting definition.

**Clash:** National Rail realtime available via Darwin OpenLDBWS only (static GTFS not published by NRE; no GTFS-RT protocol buffer feed). No buses, no light rail, no metros in v1 scope. Two operators on single infrastructure (GWR + CrossCountry at hub stations and through-running points); doNotGroup by operator or line code at hub stations (separate boards per platform standard). Exeter St Davids is the single-operator hub (GWR-dominated); Plymouth is GWR-primary with CrossCountry through-running on distinct platforms.

## C2/C3 to put in front of Jim

1. **city=southwest** (plain kebab-case, no uk- prefix; matches all other UK regions built tonight). National Rail = Darwin LDBWS (two operators: GWR primary, CrossCountry through-running).
2. **Exeter St Davids (EXD CRS)** is the hub lock (primary rail terminus for the Southwest, interchange for London/Bristol/Penzance direction).
3. **Plymouth (PLY CRS)** is a secondary hub (frequent service to Exeter St Davids, direct service to Penzance, largest passenger station after Exeter).
4. **Penzance (PNZ CRS)** is the terminus (westernmost and southernmost station on National Rail network; Night Riviera sleeper endpoint — excluded by compulsory reservation).
5. **Taunton (TAU CRS)** is the through-running boundary with West of England region (already documented in WoE D1 pack; no merge needed within this region).
6. **doNotGroup not required at hub stations in v1.** Exeter St Davids and Plymouth are GWR-operated single-platform groups for most services (distinct platforms for different routes, but same operator). CrossCountry through-running calls on distinct platforms. Separate boards per platform standard applies.
7. **No static GTFS from NRE.** Darwin provides realtime only (SOAP API response includes trip/stop details but no static GTFS publication). Next Train must combine trip updates from Darwin with a third-party GTFS source or ingest live departures directly from Darwin. Check with Tim/Luke: does the app support Darwin-only next-train (no static GTFS) or does it require a GTFS supplement? (Same question affects all UK National Rail regions tonight.)
8. **Multiple operators on single infrastructure.** GWR operates the core London–Penzance main line. CrossCountry serves via Midlands/Bristol through-running (same platform or adjacent platforms at hubs, but distinct franchise operator). All run on Network Rail track; no separate operator sections at in-scope hubs (unlike East Midlands tram/rail split). Treat as a single National Rail city in D1.
9. **Night Riviera Sleeper excluded by boarding contract.** Compulsory sleeping-car cabin reservation required. Service stops at Exeter St Davids, Plymouth, Truro, St Austell, St Erth, and Penzance. Must be recorded as `out-reservation` verdict (consistent with other UK regions' treatment of Caledonian Sleeper and Night Riviera at London termini). Do not include Night Riviera on board logic unless Tim explicitly overrides the boarding-contract rule.
10. **No buses, no light rail, no trams in v1 scope.** Network Rail National Rail Darwin only.
11. **Account-level unblock required.** Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration. Same unblock path as all other UK National Rail regions. Tim re-registering EvansAppStudio on RDM.
12. **Scope boundary:** Southwest region boundary is Taunton to the east (shared with West of England). No through-running to East Midlands or other adjacent regions at in-scope stations (LNER does not call at Exeter or Plymouth; Exeter is on the way to Cornwall, not on East Coast Main Line). Penzance is the terminus (no further through-running).

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. See East Midlands, West of England, South Wales, London & South East National Rail reports (same feed) for identical licence ambiguity.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. GWR for primary train service operator branding; CrossCountry for through-running services.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 31 Aug 2026). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (or 5 million requests per 4-week railway period for SOAP APIs). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.

## Skip risk

**Account-level blocker (not a feed problem):** Darwin/OpenLDBWS is blocked at Tim's end pending UK re-registration of EvansAppStudio on Rail Data Marketplace. This is the same blocker affecting every other UK National Rail region (West Midlands, Greater Manchester, Liverpool City Region, East Midlands, South Wales, London & South East, etc.). Build and research normally; wiring is deferred until Tim's account unblock. No feed licensing or data availability issues discovered.
