# Solent oracle clash report

D1 (as of 2026-09-01): **National Rail** (Darwin/OpenLDBWS) covers Southampton and Portsmouth areas. Static GTFS available via Transitland (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`, CC-BY-2.0 UK; verified 2026-09-01). Real-time feed: **Darwin/OpenLDBWS** via [Rail Data Marketplace](https://raildata.org.uk/) using DARWIN_LDB_TOKEN (account-level blocker: EvansAppStudio AU-registered; Tim re-registering with UK company address). Services operated by **South Western Railway** (dominant operator, South West Main Line + Portsmouth Direct Line), **Southern** (West Coastway line), **Great Western Railway** (through-running Bristol/Cardiff), and **CrossCountry** (through-running long-distance).

## V1 scoping — National Rail (Darwin) only, no light rail/tram/bus/Island Line

**National Rail v1 assumption:** Realtime and static departures at Southampton Central (SOU), Portsmouth Harbour (PMH), Portsmouth & Southsea (PMS), and regional stations on South West Main Line (Waterloo–Weymouth via Southampton) and Portsmouth Direct Line (Woking–Portsmouth via Guildford). SWR regional/InterCity (London Waterloo–Southampton–Bournemouth–Weymouth), Southern (West Coastway, Brighton–Southampton), GWR (through-running Bristol/Cardiff–Southampton–Portsmouth), CrossCountry (through-running). **Account-level blocker:** EvansAppStudio AU-registered on Rail Data Marketplace; Darwin/OpenLDBWS tokens blocked for Australian company registrations. Tim is re-registering with UK company address (same block affects East Midlands / West Midlands / Greater Manchester / Liverpool City Region / London & South East). Unblock first before wiring. Once unblocked, Darwin LDBWS provides realtime trip updates and alerts for all TOCs at in-scope stations.

**Out of scope (v1 mode cut):**
- Island Line (Ryde Pier Head–Shanklin, Isle of Wight): requires ferry connection to/from Portsmouth Harbour; ferries are out-of-scope mode (not rail). Island Line trains themselves are National Rail stock but the connection dependency is a separate transport mode.
- Any sleeper/compulsory-reservation services.
- Buses, trams, light rail, ferries.

## Hub-lock & station topology — **Two major population centers, single or multi-hub decision required**

**Observation:** Unlike single-hub regions (e.g. South Wales Cardiff Central, West of England Bristol Temple Meads) or multi-hub regions (e.g. London & South East National Rail with 6+ distinct termini), Solent presents a **two-hub scenario with distinct operator/direction splits**:

| Hub candidate | Primary TOCs | Direction | Role |
|---|---|---|---|
| **Southampton Central (SOU)** | SWR (South West Main Line primary), GWR (through-running), CrossCountry (through-running), Southern (local) | West/southwest: London Waterloo, Bournemouth, Weymouth, Bristol/Cardiff via Westbury junction | Primary terminus for west-side services; interchange with GWR through-running |
| **Portsmouth Harbour (PMH)** | SWR (Portsmouth Direct Line terminus), Southern (West Coastway line), GWR (through-running), ferry to Isle of Wight (Ryde Pier Head) | East/north: London Waterloo via Guildford, Brighton via West Coastway, ferry dock | Primary terminus for east-side services; ferry gateway (out-of-scope) |
| **Portsmouth & Southsea (PMS)** | SWR (Portsmouth Direct Line stop), Southern (West Coastway line), GWR (through-running) | East/north: London Waterloo via Woking, Brighton, Southampton | Secondary station to Portsmouth Harbour; both on Portsmouth waterfront |

**Fareham** (FRM, 15 min from both Southampton and Portsmouth) is a junction station on the South West Main Line–Portsmouth Direct Line connection, but not a terminus. Services are frequent (every 15 min) but it's not a regional hub.

**Design decision pending:** 
1. **Single hub (Southampton Central)** — models the west-side dominance (South West Main Line is the core route through the region), but leaves Portsmouth (Harbour/Southsea) as secondary or separate. Simpler adapter code, but potentially incomplete for riders using east-side termini.
2. **Two-hub model (Southampton Central + Portsmouth Harbour)** — explicit station groups per terminus, doNotGroup per operator/direction at each. More honest to actual network topology but adds complexity similar to London & South East approach.
3. **Multi-group (Option A from London SE precedent)** — explicit groups for Southampton, Portsmouth Harbour, Portsmouth & Southsea, each with their own boarding logic.

**Recommendation:** Options 2 or 3 are more honest to Solent topology than forcing a single hub. Unlike London SE (where 6+ termini necessitate multi-hub), Solent's two-hub split is simpler but still real: a rider choosing Southampton Central (Waterloo/Bristol direction) vs Portsmouth Harbour (Waterloo/Brighton direction) is a genuine choice. **This section requires Tim/Luke/Jim architecture review before D1 pack or adapter work proceeds.** I'm not forcing a single hub onto a two-center region.

## Station name table (locks + boundary points)

Match rule: published National Rail print name vs. CRS code vs. operator timetables.

| published (National Rail) | CRS code | class |
| --- | --- | --- |
| Southampton Central | SOU | **hub lock candidate (primary west-side terminus)** — South West Main Line principal terminus for the city. All regional, InterCity, and long-distance services call here. GWR ticket office, SWR frequent local/regional/InterCity services, Southern connections, CrossCountry through-running. |
| Portsmouth Harbour | PMH | **hub lock candidate (primary east-side terminus)** — Portsmouth Direct Line terminus, ferry dock (Ryde Pier Head link, out-of-scope). South Western Railway primary operator; Southern West Coastway line; GWR through-running. Historic Dockyard, ferry gateway. |
| Portsmouth & Southsea | PMS | **secondary east-side station** — Portsmouth Direct Line call, West Coastway line call. Less heavily used than Portsmouth Harbour for mainline services, but key commuter interchange (London Waterloo direct service via Woking). |
| Fareham | FRM | **junction station (not a merge)** — junction between South West Main Line and Portsmouth Direct Line. Through-running only; both SWR and Southern pass through. Not a regional hub; 15 min to both Southampton Central and Portsmouth Harbour. Flag for potential de-dup at D2 if adjacent regions enter app. |
| Eastleigh | ESL | **junction station (not a merge)** — junction for Eastleigh–Fareham Line (to Portsmouth) and Eastleigh–Romsey Line (north). South West Main Line pass-through. Through-running; SWR only. Local commuter significance but not a primary hub. |
| Westbury | WSB | **through-running boundary to West of England region** — junction where South West Main Line meets main Oxford/Reading/Bristol routes. GWR and SWR services cross here (separate franchises). Not a shared platform. De-duplicate at D2 if West of England region enters the app. |
| Waterloo | WAT | **through-running London termini, boundary to London & South East National Rail region** — SWR London terminus; services to Solent originate/terminate here. Waterloo is in-scope for London & South East region separately; Solent services are the outlying direction. De-duplicate at D2 if London & South East region enters app. |

No shared tram/light rail infrastructure at in-scope hubs. All National Rail standard-gauge heavy rail.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail services only; Island Line/sleepers out of scope):**

All **walk-up National Rail regional and InterCity services** (optional reservation only, not compulsory) at Southampton Central, Portsmouth Harbour, Portsmouth & Southsea, and South West Main Line / Portsmouth Direct Line stations: `in`
- **South Western Railway** (South West Main Line regional/InterCity, Portsmouth Direct Line services)
- **Southern** (West Coastway line regional services)
- **Great Western Railway** (through-running Bristol/Cardiff–Southampton–Portsmouth services, optional reservation only)
- **CrossCountry** (through-running long-distance services, optional reservation only)

**Services excluded by boarding contract:**
- **Island Line** (Ryde Pier Head–Shanklin): `out-mode` — rail services themselves operate as National Rail, but access requires ferry from Portsmouth Harbour (Ryde Pier Head FastCat, 22-minute crossing, Wightlink). The ferry leg is a separate mode (not rail); connection dependency prevents walk-up boardable classification. Out-of-scope v1 mode cut.

**Stations with overlapping National Rail services (multi-operator platforms):**
- **Southampton Central (SOU):** Dominant SWR services, plus Southern (West Coastway local), GWR through-running (to/from Bristol/Cardiff), CrossCountry through-running. Single platform complex (Network Rail); separate service flows by direction, handled as a single-hub boarding engine.
- **Portsmouth Harbour (PMH):** SWR (Portsmouth Direct Line terminus), Southern (West Coastway), GWR (through-running), ferry dock. Single terminus; standard boarding.
- **Portsmouth & Southsea (PMS):** SWR (direct to Waterloo via Woking), Southern (West Coastway local), GWR (through-running). Single station; two operators on separate platform groups.

**No check-in barriers:** Platform access at all National Rail stations is unrestricted. Ticket checking is on-board by conductors or at low-level gating (not airport-style). Walk-up boarding is unobstructed for all `in` services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **South Western Railway (South West Main Line regional/InterCity)** | Southampton Central, Eastleigh, plus Solent/Southwest regional stations | No (optional only, not compulsory) | No | `in` | [SWR travel information](https://www.southwesternrailway.com/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — SWR no-reservation policy; open seating or optional reservations only. Walk-up boarding. |
| **South Western Railway (Portsmouth Direct Line regional/semi-fast)** | Portsmouth Harbour, Portsmouth & Southsea, Fareham, plus Solent stations | No (optional only; regional services typically open seating) | No | `in` | [SWR Portsmouth Direct Line station info](https://www.southwesternrailway.com/travelling-with-us/at-the-station/); walk-up boarding on regional services. |
| **Southern (West Coastway line)** | Portsmouth Harbour, Portsmouth & Southsea, plus Brighton–Southampton corridor | No (optional only, not compulsory) | No | `in` | [Southern travel information](https://www.southernrailway.com/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — optional reservations only on Southern services. |
| **Great Western Railway (through-running Bristol/Cardiff–Southampton–Portsmouth)** | Southampton Central, Portsmouth Harbour, Fareham, plus through-route regional stations | No (optional only on regional/InterCity; not compulsory) | No | `in` | [GWR seat reservations](https://www.gwr.com/your-tickets/seat-reservations); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — GWR optional reservations only on flexible/Anytime tickets. Walk-up available. |
| **CrossCountry (through-running long-distance services)** | Southampton Central, Portsmouth Harbour, plus long-distance corridor | No (optional only, not compulsory) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — optional reservations only. Walk-up available. |
| **Island Line (Ryde Pier Head–Shanklin)** | Ryde Pier Head (via ferry from Portsmouth Harbour) | N/A (depends on ferry) | N/A (ferry gateway applies first) | `out-mode` | [Island Line information](https://en.wikipedia.org/wiki/Island_Line,_Isle_of_Wight); [Ryde Pier Head ferry connection](https://www.wightlink.co.uk/plan-your-journey/routes/portsmouth-ryde-route) — ferry (22 min FastCat service) is a separate mode; walk-up boarding for Island Line trains themselves is not the gating factor; ferry dependency makes this out-of-scope v1. |

**Board eligibility summary:** All walk-up National Rail regional/InterCity services (SWR, Southern, GWR, CrossCountry) calling at Southampton Central, Portsmouth Harbour, Portsmouth & Southsea, and South West Main Line / Portsmouth Direct Line regional stations pass both boarding-contract tests. Seat reservations are optional only (not compulsory) for all operators on these routes; no stations have check-in barriers. **All verdicts recorded; no silent omissions.** Island Line is out-of-scope by mode (ferry dependency) and operates separate infrastructure (off-island connection required).

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. SWR (South West Main Line + Portsmouth Direct Line dominant), Southern (West Coastway line), GWR (through-running Bristol/Cardiff routes), CrossCountry (through-running long-distance). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same blocker for all UK National Rail regions in this wave).

**Clash:** National Realtime available via Darwin OpenLDBWS only (static GTFS not published by NRE; Transitland serves as static GTFS dump via CC-BY-2.0 UK). Multiple operators on single infrastructure (SWR + Southern + GWR + CrossCountry at Southampton Central and Portsmouth termini); doNotGroup by operator or service code at hub stations (if hub-lock design decision calls for multi-group). Boundary stations flagged: Westbury (West of England region), Waterloo (London & South East region). Island Line out-of-scope (ferry required). No buses, no light rail, no trams in v1 scope.

## C2/C3 notes for Luke / Jim

1. **city=solent** (standard UK regional naming). National Rail = Darwin LDBWS (multiple operators: SWR primary, Southern/GWR/CrossCountry through-running).

2. **Hub-lock decision required before D1 pack or adapter work.** See "Hub-lock & station topology" section above. This region has two major population centers (Southampton and Portsmouth) with distinct operator/direction sets. Recommend Tim review single-hub vs two-hub options:
   - **Single hub (Southampton Central)**: simpler code, but incomplete for east-side riders (Portsmouth Harbour/Southsea).
   - **Two-hub (Southampton Central + Portsmouth Harbour)**: explicit station groups, doNotGroup per operator, more complete.
   - **Multi-group (Option A precedent from London SE)**: if Portsmouth Harbour and Portsmouth & Southsea need separate boarding logic.

3. **Southampton Central (SOU CRS)** or **Portsmouth Harbour (PMH CRS)** — pending hub-lock decision. If single-hub: SOU is primary (South West Main Line dominance). If two-hub: SOU + PMH, each with their own adapter section.

4. **No doNotGroup needed if single-hub.** Southampton Central and Portsmouth Harbour are both single termini (distinct operators, but not sharing platforms at the same physical station like London Bridge). Separate boards per platform standard. Boundary stations (Westbury / Waterloo) are through-running only; flag for de-dup at D2 if both adjacent regions enter app.

5. **Static GTFS:** Transitland `f-gc-rail~delivery~group~planar~gtfs` covers all GB National Rail. Adapter filters by:
   - **TOC agencies:** SWR, Southern, GWR, CrossCountry (filter GTFS routes.txt by agency_id)
   - **Geography:** Southampton Central, Portsmouth Harbour, Portsmouth & Southsea, plus South West Main Line (Waterloo–Weymouth) and Portsmouth Direct Line (Woking–Portsmouth) stations within Solent region bounds
   - **Board eligibility:** Exclude Island Line (out-mode), sleepers (out-reservation), other compulsory-reservation services

6. **Real-time (Darwin):** Account-level blocker must be unblocked first (Tim re-registering EvansAppStudio on RDM with UK address). Once DARWIN_LDB_TOKEN provisioned, use LDB Webservice JSON API for live departures. Filter by station code (CRS; in-scope: SOU, PMH, PMS, FRM, ESL, WAT boundary). Latency ~1 minute.

7. **Multi-operator platform handling:** Both Southampton Central and Portsmouth Harbour have multiple operators (SWR + Southern + GWR + CrossCountry), but they are physically separate stations, not multi-operator platforms at the same building. Standard National Rail station boarding logic applies (separate boards per platform, all walk-up eligible services shown). No special doNotGroup logic needed unless hub-lock decision specifies multi-group architecture.

8. **Boundary stations & through-running:**
   - **Westbury (WSB CRS, West of England region boundary):** GWR and SWR services cross into/from Bristol/Bath direction. Same train, separate franchises; Network Rail infrastructure. Flag for D2 de-dup if West of England enters the app. Not a merge point within Solent region.
   - **Waterloo (WAT CRS, London & South East region boundary):** SWR London terminus; Solent services are the outlying direction from London's perspective. In-scope for both regions (Solent origin/destination, London SE termini). Flag for D2 de-dup; do not duplicate departures.

9. **Island Line:** Out-of-scope v1 mode. Ryde Pier Head connects via ferry (Wightlink FastCat, 22 min) to Portsmouth Harbour; ferry is a separate mode. Island Line trains (Ryde Pier Head–Shanklin, 8.5 mi, South Western Railway stock) are National Rail in origin, but dependency on ferry access prevents walk-up boardable classification in this region. Leave for D2 or later expansion.

10. **Stations in scope (estimate ~40–50 major stations):**
    - **Hubs/termini:** Southampton Central (SOU), Portsmouth Harbour (PMH), Portsmouth & Southsea (PMS)
    - **South West Main Line:** Waterloo (WAT, boundary), Woking (WOK), Basingstoke (BSK), Winchester (WIN), Eastleigh (ESL), Southampton Airport Parkway (SOU nearby), plus smaller stations toward Weymouth
    - **Portsmouth Direct Line:** Woking (WOK, junction), Guildford (GLD), Haslemere (HSM), Petersfield (PES), Havant (HAV), Portsmouth (PMH/PMS)
    - **West Coastway line:** Portsmouth & Southsea (PMS), plus Brighton-direction stations
    - **Junctions:** Fareham (FRM), Eastleigh (ESL), Westbury (WSB, boundary)
    - Exact count and published-network.json scope: pending hub-lock decision and Luke's D1 pack station review.

11. **No buses, no light rail, no trams, no ferries in v1 scope.** MetroWest (planned); no tram networks; buses out. National Rail National Rail Darwin only.

12. **Account-level unblock required.** Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration. Tim re-registering EvansAppStudio on RDM.

13. **Timezone:** Europe/London (UTC+0, DST last Sunday March / October per UK rules). Confirm all adapters use this TZ, not UTC.

14. **No live product flip until QA full pass.** Status stays **planned** until Mark's QA gate confirms board-eligibility verdicts and adapter filtering matches them.

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. See London & South East and West of England reports for parallel account-level blocker and licensing ambiguity context.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. SWR, Southern, GWR, CrossCountry for operator service branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 2026-09-01). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/4-week railway period (or 5 million requests per period for SOAP APIs). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration on Rail Data Marketplace before DARWIN_LDB_TOKEN can be provisioned.

## What I did not do

No line-map generation, no station hand-transcription, no GTFS direct station array population, no live city flip, no adapter code, no Darwin real-time testing, no multi-region ledger creation, no GitHub PR, no account re-registration testing.

**Hub-lock & single vs multi-hub architecture decision is the blocking design issue.** This section requires Tim / Luke / Jim review before D1 pack or adapter work can proceed with confidence. Solent's two-hub topology (Southampton west-side + Portsmouth east-side) is distinct from both single-hub regions and the 6+-hub London model; explicit design choice needed.
