# South Wales oracle clash report

D1 (published, as of 31 Aug 2026): **Transport for Wales Rail** operates Valleys & Cardiff Local Routes (Valley Lines), comprising six commuter rail lines radiating from **Cardiff Central** (CRS code **CDF**). **National Rail** (Darwin/OpenLDBWS) covers through-running services at Cardiff Central and Severn Tunnel Junction, requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/) (same account-level blocker as East Midlands — EvansAppStudio re-registering from UK address). Transport for Wales Valley Lines static schedule: **no public GTFS feed confirmed** — TfW publishes timetables in TransXChange format via data@tfw.wales; real-time feed status unknown (see skip risk). National Rail static GTFS available via Transitland (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`; verified 31 Aug 2026); real-time via OpenLDBWS (blocked at account level pending UK re-registration). Cardiff Bus (urban feeder routes): GTFS via [DFT Bus Open Data Service](https://data.bus-data.dft.gov.uk/downloads/) (Onestop ID `f-bus~dft~gov~uk`, no key required).

## V1 scoping — National Rail slot TBD, Transport for Wales Valley Lines real-time status unknown

**National Rail assumption:** National Rail (Darwin departures only) at Cardiff Central (CDF); blocked at account level by EvansAppStudio's AU-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects East Midlands / West Midlands / Greater Manchester / Liverpool City Region). Unblock first before wiring.

**Transport for Wales Valley Lines assumption:** TfW operates six Valley Lines routes with 81 total stations across six Welsh authority areas. TfW is not known to publish a public GTFS static feed or GTFS-RT real-time feed. Timetable data available in TransXChange format via direct contact (data@tfw.wales); no public GTFS-RT API endpoint confirmed in published sources. **High skip risk:** Confirm with TfW whether timetable GTFS and real-time GTFS-RT feeds are available for public use before D1 pack stage. If no public feed exists, Valley Lines board support defers to National Rail cards-only at Cardiff Central, or stays planned-only.

**Cardiff Bus:** Out of v1 scope (urban/local feeder routes, not main-line services); available via DFT BODS if needed for later expansion.

## Station name table

Match rule: published TfW Valley Lines timetable name vs. National Rail station print (CRS code) vs. official operator map. Valley Lines covers 81 stations across Merthyr, Rhondda, Aberdare, Coryton, Ebbw Vale, and Taffy Vale lines — no D1 published-network.json yet pending real-time data verification.

| published (Valley Lines / NR rail) | agency print | class |
| --- | --- | --- |
| Cardiff Central | TfW: Cardiff Central; NR rail: Cardiff Central Station (CDF CRS) | **hub lock** — interchange between Valley Lines and National Rail through-running services (London / Bristol direction via Severn Tunnel; North Wales direction via Wrexham). |
| Severn Tunnel Junction | NR rail: Severn Tunnel Junction (STJ CRS, Monmouthshire, Wales-England boundary) | **through-running point, not merge** — National Rail only. Wales-to-England boundary on South Wales Main Line. NR services call both South Wales and West of England regions. De-duplicate at D2 if both regions enter the app. |
| Pontypridd | TfW: Pontypridd (junction of Merthyr and Rhondda lines) | Valley Lines hub (second tier). No through-running to adjacent regions at this station. |
| Merthyr Tydfil | TfW: Merthyr Tydfil (Merthyr line terminus) | Valley Lines end-point. Not shared with another region. |
| Treherbert | TfW: Treherbert (Rhondda line terminus) | Valley Lines end-point. Not shared with another region. |
| Aberdare | TfW: Aberdare (Aberdare line terminus) | Valley Lines end-point. Not shared with another region. |
| Coryton | TfW: Coryton (Coryton line terminus) | Valley Lines end-point. Not shared with another region. |
| Ebbw Vale Town | TfW: Ebbw Vale Town (Ebbw Vale line terminus) | Valley Lines end-point. Not shared with another region. |
| All other Valley Lines stations (79 total) | TfW / NR published names | Match to TfW timetable names for Valley Lines; match to NR print for any through-running services at those stations (none confirmed beyond Cardiff Central). |

**81** Valley Lines stations listed in [List of Valley Lines stations](https://en.wikipedia.org/wiki/Valleys_&_Cardiff_Local_Routes#Stations) (Wikipedia source pending verification against official TfW operator map). Product `lib/cities/south-wales/` absent. No live adapter.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail only; Valley Lines excluded by mode):**
- **GWR (Great Western Railway) at Cardiff Central and Severn Tunnel Junction**: `in` (optional reservation only, no compulsory booking)
- **CrossCountry at Cardiff Central and Severn Tunnel Junction**: `in` (optional reservation only, no compulsory booking)
- **Transport for Wales National Rail through-running at Cardiff Central**: `in` (open seating, no reservation offered or required for regional services)

**Valley Lines (TfW commuter rail, separate operator):** Out of v1 scope by mode (commuter/metro-style routes, not main-line National Rail services call these stations; Valley Lines operate radially from Cardiff Central on dedicated platforms with no through-running to other regions). Valley Lines are excluded at the city-scoping level, not per-service.

**Stations with National Rail overlap:**
- **Cardiff Central (CDF, hub-lock)**: GWR + CrossCountry + TfW National Rail through-running services (separate platforms from Valley Lines local services, footbridge connect)
- **Severn Tunnel Junction (STJ, through-running boundary)**: GWR + CrossCountry only; TfW through-running continues to/from North Wales via Cardiff Central

**No check-in barriers:** Platform access at both in-catalog stations is unrestricted. Ticket checking is on-board by conductors or at ticket barriers (low-level gating, not airport-style check-in). Walk-up boarding is unobstructed for all National Rail services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **GWR (Great Western Railway) Regional/InterCity** | Cardiff Central, Severn Tunnel Junction | No (optional only, not compulsory) | No | `in` | [GWR seat reservations](https://www.gwr.com/your-tickets/seat-reservations); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — seat reservations optional for flexible (Off-Peak/Anytime) and some Advance tickets. No boarding restrictions. |
| **CrossCountry Regional/Long-distance** | Cardiff Central, Severn Tunnel Junction | No (optional only, not compulsory) | No | `in` | [RailUK Forums: seat reservation policy](https://www.railforums.co.uk/threads/gwr-reservations-compulsory-or-not.208259/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — reservations available but not required for walk-up boarding. |
| **Transport for Wales National Rail through-running** | Cardiff Central | No (open seating, no reservation offered) | No | `in` | [South Wales Main Line](https://en.wikipedia.org/wiki/South_Wales_Main_Line); [Transport for Wales Cardiff Central](https://tfw.wales/places/stations/cardiff-central) — through-running regional services walk-up only. |

**Board eligibility summary:** All National Rail services (GWR, CrossCountry, Transport for Wales through-running) calling at Cardiff Central and Severn Tunnel Junction pass both boarding-contract tests. Seat reservations are optional only (not compulsory) for all three operators on this corridor; no stations have check-in barriers. **All verdicts recorded; no silent omissions.** Valley Lines are out of v1 scope by mode and operate separate platforms at Cardiff Central. **Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at both in-catalog stations with these verdicts enforced in filtering logic.**

## H2 clash surface

**Transport for Wales Valley Lines:** No product `lib/cities/south-wales/` exists. No live adapter. Valley Lines opened first electric-only service (Class 398 tram-trains) Spring 2026 between Pontypridd and Cardiff Bay. **Critical blocker:** TfW does not publish static GTFS or GTFS-RT via public API; timetable data available only via direct contact (TransXChange format). Real-time data availability unknown — must verify before D1 pack stage.

**National Rail:** Darwin/OpenLDBWS documented. CrossCountry and through-running operators service cards at Cardiff Central (London / Bristol direction). **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for East Midlands / West Midlands / Manchester / Liverpool).

**Clash:** No TfW real-time GTFS-RT feed found — Valley Lines boards would be schedule-only (TransXChange-derived, not GTFS-standard). National Rail at Cardiff Central is account-blocked at Tim's end. Cardiff Central is a shared hub (Valley Lines platforms + National Rail platforms, separate infrastructure). Severn Tunnel Junction is a through-running point on the Wales-England boundary (not a merge; same National Rail operator continues across regions).

## C2/C3 to put in front of Jim

1. **city=south-wales** (or split by operator: `transport-for-wales-valley-lines` + `national-rail-south-wales` slice). Valley Lines = six commuter routes from Cardiff Central. National Rail = through-running services (London / Bristol / North Wales direction).

2. **Cardiff Central (CDF CRS)** is the locked inner-city hub (Valley Lines + National Rail, separate platforms, footbridge connect). Not Cardiff Queen Street, not Cardiff Bay, not Pontypridd.

3. **Valleys Lines real-time feed status: UNKNOWN — DO NOT ASSUME.** Contact Transport for Wales (data@tfw.wales) and confirm:
   - Whether public GTFS static feed will be published.
   - Whether public GTFS-RT real-time feed will be published.
   - If neither, Valley Lines boards stay schedule-only (pending TransXChange→GTFS conversion path) or planned-only until TfW publishes feeds.

4. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.

5. **Severn Tunnel Junction (STJ CRS, Wales-England boundary):** Through-running point on the South Wales Main Line. National Rail trains continue from South Wales region to West of England region (Bristol / Bath / London direction) at the same platform. Not a de-dup point in this region (separate platforms); flag for de-dup at D2 if both regions add National Rail slices.

6. **Six Valley Lines routes:** Merthyr (Cardiff–Merthyr Tydfil), Rhondda (Cardiff–Treherbert), Aberdare (Abercynon–Aberdare), Coryton (Cardiff–Coryton), Ebbw Vale (Caerphilly–Ebbw Vale Town), Taffy Vale (Pontyclun–Barry Island). No through-running to adjacent regions on these lines.

7. **North Wales through-running:** National Rail services connect Cardiff Central to Wrexham and North Wales (via Welsh Marches Line); not a D1 scope point but background context for regional boundaries.

8. **Valley Lines electrification complete (Spring 2026).** Class 398 electric tram-trains between Pontypridd and Cardiff Bay; service pattern may still be rolling out. Confirm current timetables with TfW.

9. **No tram, no metro (other than new tram-train pilot), no buses in v1 scope.** Cardiff Bus via DFT BODS available for future expansion but out of scope for Valley Lines region.

10. **Europe/London HAS DST.** Official live path for National Rail is Darwin/OpenLDBWS via RDM subscription (free tier: 100,000 calls/month). Valley Lines live path unknown pending feed confirmation.

## License

- **Transport for Wales Valley Lines static GTFS:**
  - **License name:** Unknown — TfW does not appear to publish public GTFS data.
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** Contact TfW data team: data@tfw.wales. TransXChange format used internally; GTFS availability unclear.
  - **Confidence:** `not found`. TfW publishes timetables in TransXChange format and does not publish static GTFS or GTFS-RT via a public API endpoint. No public licensing terms available. **This is a critical blocker for D1.** Do not assume GTFS will be provided; verify directly with TfW before planning D1 pack or adapter work.

- **Transport for Wales Valley Lines GTFS-RT:**
  - **License name:** Unknown — no public GTFS-RT feed confirmed.
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** None found. No public API endpoint discovered in Transitland, Mobility Database, or TfW developer documentation.
  - **Confidence:** `not found`. Real-time feed status unknown. **Skip risk flagged.**

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See East Midlands oracle-clash-report for parallel account-level blocker context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. TfW for Valley Lines operator branding; CrossCountry for through-running services.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 31 Aug 2026). No key required for download.

- **Cardiff Bus GTFS (DFT Bus Open Data Service):**
  - **License name:** Open Government Licence v3.0 (OGL 3.0).
  - **Redistribution / rehosting:** OGL 3.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially." Derived products allowed; redistribution to third-party users via Next Train API is permitted.
  - **Commercial use:** Allowed under OGL 3.0.
  - **Attribution:** "Contains public sector information licensed under the Open Government Licence v3.0" or link to https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Name source as Department for Transport Bus Open Data Service and Cardiff Bus operator.
  - **Terms URL:** https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Feed landing: https://data.bus-data.dft.gov.uk/downloads/ (aggregator); Transitland entry: https://www.transit.land/feeds/f-bus~dft~gov~uk.
  - **Confidence:** `clear` for GTFS static license. Feed is live 200 on DFT platform (verified 31 Aug 2026). No key required for download. (Out of v1 scope but noted for reference.)

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.
