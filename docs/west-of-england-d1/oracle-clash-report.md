# West of England oracle clash report

D1 (as of 31 Aug 2026): **National Rail** (Darwin/OpenLDBWS) covers Bristol Temple Meads (BRI) and Bath Spa (BTH) plus surrounding regional/through-running stations. Static GTFS not published by National Rail; Darwin is a realtime-only SOAP API feed, subscribed via [Rail Data Marketplace](https://raildata.org.uk/) using DARWIN_LDB_TOKEN (Onestop ID `f-nre-national_rail_enquiries_darwin_ldb_ws`). Services operated by **Great Western Railway** (GWR) as primary operator; **Transport for Wales** services to South Wales; **CrossCountry** long-distance via Gloucester; **South Western Railway** through-running from adjacent Solent region.

## V1 scoping — National Rail schedule + Darwin realtime

**National Rail v1 assumption:** Schedule and realtime departures at Bristol Temple Meads (BRI) and Bath Spa (BTH) via Darwin OpenLDBWS. GWR regional and inter-city services (London Paddington–Bristol/Bath–Penzance corridor), through-running to Chepstow (South Wales), Gloucester (West Midlands), Westbury (Solent/Thames Valley), Taunton (Southwest Devon). **Account-level blocker:** EvansAppStudio AU-registered on Rail Data Marketplace; Darwin/OpenLDBWS tokens blocked for Australian registrations. Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region / East Midlands). Unblock first before wiring. Once unblocked, Darwin LDBWS will provide realtime trip updates and alerts for all GWR, TfW, CrossCountry, SWR services at in-scope stations.

## Station name table

Match rule: published National Rail print name vs official CRS code vs agency timetable.

| published (National Rail) | CRS code | class |
| --- | --- | --- |
| Bristol Temple Meads | BRI | **hub lock** — principal rail terminus for Bristol city; all regional and inter-city services call here. GWR ticket office, Paddington services, Southwest connections. |
| Bath Spa | BTH | **hub secondary** — Bath city station; direct service to Bristol Temple Meads (11–19 min frequency). Regional connections north to Gloucester and east to Westbury. |
| Chepstow | CPW | **through-running point, boundary to South Wales region**. Not a merge. National Rail only; GWR and Transport for Wales services cross into Wales at this point. De-duplicate at D2 if South Wales region enters the app. |
| Gloucester | GCR | **through-running point, boundary to West Midlands region**. Not a merge. National Rail only; GWR regional services and CrossCountry long-distance (Cardiff–Nottingham) pass through en route. Cross-region operator continuity (same train, different franchises at boundary). |
| Westbury | WSB | **through-running point, boundary to Solent/Thames Valley regions**. Not a merge. National Rail only; GWR services to Reading/Oxford (Thames Valley) and South Western Railway services to Southampton/Portsmouth (Solent) call at same platform but operate separate franchises. De-duplicate at D2 if adjacent regions enter the app. |
| Taunton | TAU | **through-running point toward Southwest/Devon region**. Not a merge. National Rail only; GWR services continue west to Exeter and beyond. |

GWR services dominate the West of England route map (main line London–Bristol–Bath–Exeter–Penzance). Through-running stations are served by multiple operators but no shared tram/rail infrastructure like East Midlands Nottingham Station — all National Rail standard-gauge heavy rail. Flag for Luke at D1 pack stage if adjacent regions are in scope.

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. GWR, Transport for Wales, CrossCountry, South Western Railway service codes (multiple operators crossing franchise boundaries at Chepstow / Gloucester / Westbury / Taunton). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same blocker for West Midlands / Manchester / Liverpool; not a feed problem).

**Clash:** National Rail realtime available via Darwin OpenLDBWS only (static GTFS not published by NRE; no GTFS-RT protocol buffer feed). No buses, no light rail, no metros in v1 scope. Multiple operators on single infrastructure (GWR + TfW + CrossCountry + SWR at boundary stations); doNotGroup by operator or line code at hub stations if any. Bristol Temple Meads is a single-operator terminus (GWR-dominated); Bath Spa is GWR-only for v1.

## C2/C3 to put in front of Jim

1. **city=west-of-england** (or split by primary hub). National Rail = Darwin LDBWS (multiple operators: GWR primary, TfW/CrossCountry/SWR at boundaries).
2. **Bristol Temple Meads (BRI CRS)** is the hub lock (primary rail terminus for the city).
3. **Bath Spa (BTH CRS)** is a secondary hub (frequent service to Bristol Temple Meads, regional connections).
4. **no doNotGroup needed at hub stations in v1.** Bristol Temple Meads and Bath Spa are GWR-operated single-platform groups (distinct platforms for different routes, but same operator). Separate boards per platform standard. Boundary stations (Chepstow / Gloucester / Westbury / Taunton) are through-running only; if adjacent regions add National Rail slices, flag these stations for de-dup at D2.
5. **no schedule data available from NRE.** Darwin provides realtime only (SOAP API response includes trip/stop details but no static GTFS publication). Next Train must combine trip updates from Darwin with a third-party GTFS source or ingest live departures directly from Darwin. Check with Tim/Luke: does the app support Darwin-only next-train (no static GTFS) or does it require a GTFS supplement?
6. **Multiple operators on single infrastructure.**  GWR operates the core London–Bristol–Bath–Exeter line. Transport for Wales and CrossCountry serve South Wales and Nottingham routes via Gloucester. South Western Railway connects at Westbury to Solent services. All run on Network Rail track; no separate operator sections at in-scope hubs (unlike East Midlands tram/rail split). Treat as a single National Rail city in D1.
7. **No buses, no light rail, no trams in v1 scope.** MetroWest (planned half-hourly frequency, future Portishead/Henbury reopenings) are out. Network Rail National Rail Darwin only.
8. **Account-level unblock required.** Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration. Same unblock path as West Midlands / Manchester / Liverpool. Tim re-registering EvansAppStudio on RDM.

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. See East Midlands report (same feed) for identical licence ambiguity.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. GWR for train service operator branding; Transport for Wales / CrossCountry / South Western Railway for other operators' service codes.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (or 5 million requests per 4-week railway period for SOAP APIs). Subscription terms govern API use, not a separate data license.
