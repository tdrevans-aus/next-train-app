# Rest of Scotland oracle clash report

D1 (planned): **National Rail** (Darwin/OpenLDBWS) covers all rail services across Scotland outside Glasgow and Edinburgh urban catchments. **ScotRail** is the primary operator for regional trains within Scotland. Static GTFS via [Rail Delivery Group GTFS feed on Transitland](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/) (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`, verified 2026-09-01). Real-time via **OpenLDBWS** requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/) (free tier: 100,000 calls/month); **account-level blocker:** EvansAppStudio registered on RDM as an Australian company — Tim is re-registering with UK company address (same block affects East Midlands, West Midlands, Greater Manchester, Liverpool City Region, South Wales). Hub-lock candidates: **Perth** (junction of three major lines: Highland Main Line north to Inverness, Tayside line east to Dundee/Aberdeen, cross-country south to Glasgow/Edinburgh), **Inverness** (terminus of four lines: Highland Main Line, Aberdeen–Inverness line, Kyle of Lochalsh line, Far North Line), **Aberdeen** (terminus of two lines: Dundee–Aberdeen line, Aberdeen–Inverness line), **Dundee** (junction: Dundee–Perth line west, Dundee–Aberdeen line north, Dundee–Edinburgh line south). Through-running services include **Caledonian Sleeper** (London Euston to Aberdeen, Inverness, Fort William, plus Edinburgh/Glasgow), **CrossCountry** (cross-border long-distance), **London North Eastern Railway (LNER)** Highland Chieftain service (London King's Cross to Inverness via East Coast Main Line and Highland Main Line).

## V1 scoping — National Rail at hub stations, Caledonian Sleeper verdicts required

**Geographic boundary (Rest of Scotland = outside Central Belt):** Rest of Scotland encompasses all National Rail services across Scotland excluding Glasgow urban catchment (Glasgow Queen Street, Glasgow Central, Dalmarnock, Rutherglen stations) and Edinburgh urban catchment (Edinburgh Waverley, Haymarket, Morningside, Musselburgh, Wallyford stations). Falkirk High (station north of Central Belt, on Glasgow–Edinburgh via Falkirk line) sits likely within Rest of Scotland scope, but exact boundary vs. future Glasgow/Edinburgh regions remains unresolved (Glasgow and Edinburgh regions not yet built; internal boundary dispute at Falkirk High documented in their draft oracle reports — do not attempt to resolve here). **Recommendation for Luke's D1 pack:** flag boundary coordination points with future Glasgow/Edinburgh regions during pack stage; Rest of Scotland regions' own boundary is well north of Central Belt, so low collision risk with those regions' eventual scopes.

**National Rail assumption:** Departures at main hub stations (**Perth, Inverness, Aberdeen, Dundee**) and branch-line terminus stations. ScotRail regional services (no compulsory reservation for walk-up passengers). Through-running services (Caledonian Sleeper, CrossCountry, LNER) documented with board-eligibility verdicts per §3 below. Account-level Darwin blocker must be resolved at Tim's end before wiring.

**No ScotRail static GTFS separate from National Rail:** ScotRail is a Train Operating Company (TOC) within National Rail; its services are included in the Rail Delivery Group GTFS feed used by Transitland. No separate public GTFS feed for ScotRail-only routes confirmed.

## Station name table — hub locks and network junctions

Match rule: published rail station name vs. National Rail station print (CRS code) vs. official operator map. Four primary hubs identified; branch-line termini below.

| published | agency print | class |
| --- | --- | --- |
| **Perth** | Perth railway station (PTH CRS) | **Hub lock — tier 1**. Junction of three major lines: Highland Main Line (north to Inverness), Tayside line (east to Dundee, Aberdeen), and cross-country routes (south to Glasgow, Edinburgh). ScotRail regional, CrossCountry, LNER services converge. Physically one main station with east-side "wing" for Dundee-bound trains. |
| **Inverness** | Inverness railway station (INV CRS) | **Hub lock — tier 1**. Terminus of four lines: Highland Main Line (from Perth/south), Aberdeen–Inverness line (from Aberdeen), Kyle of Lochalsh line (west to Kyle), Far North Line (north to Thurso/Wick). ScotRail, Caledonian Sleeper, LNER Highland Chieftain, CrossCountry services. 7 platforms. |
| **Aberdeen** | Aberdeen railway station (ABD CRS) | **Hub lock — tier 1**. Southern terminus of Aberdeen–Inverness line (connects north to Inverness), northern terminus of Dundee–Aberdeen line (connects south to Dundee). ScotRail, Caledonian Sleeper, CrossCountry, LNER services. 6 platforms. |
| **Dundee** | Dundee railway station (DDE CRS) | **Hub lock — tier 1**. Junction: Dundee–Perth line (west to Perth via Tayside corridor), Dundee–Aberdeen line (north to Aberdeen), Dundee–Edinburgh line (south toward Edinburgh). Connects to Central Belt. ScotRail regional, CrossCountry services. |
| Kyle of Lochalsh | Kyle of Lochalsh railway station (KLS CRS) | Branch terminus (west coast, Inverness–Kyle line). ScotRail Hebridean connection. End-of-line; no through-running to other regions. |
| Thurso | Thurso railway station (THR CRS) | Far North Line terminus (northernmost passenger railway in Great Britain). ScotRail only. No through-running. |
| Wick | Wick railway station (WCK CRS) | Far North Line terminus. ScotRail only. No through-running. |
| Mallaig | Mallaig railway station (MLG CRS) | West Highland Line terminus (Inverness–Mallaig). ScotRail, Caledonian Sleeper. Branch terminus. |
| Fort William | Fort William railway station (FTW CRS) | West Highland Line (Inverness–Mallaig via Fort William). Caledonian Sleeper, ScotRail, CrossCountry. Through-running to Inverness. |
| [All other Scottish National Rail stations] | Published name (CRS code) | Pass-through or single-operator stations. No conflicts with other UK regions identified at this stage; will be verified at D1 pack stage. |

**Four tier-1 hub stations identified.** Perth is the primary cross-country interchange (three-line junction); Inverness, Aberdeen, Dundee are secondary hubs serving different geographical corridors. No live adapter yet; product `lib/cities/rest-of-scotland/` absent.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail services calling at Rest of Scotland hub stations):**
- **ScotRail regional trains (cross-regional routes, local routes)**: `in` (no compulsory reservation; open seating, walk-up boardable)
- **CrossCountry (long-distance intercity, cross-border services)**: `in` (optional reservation only, not compulsory walk-up boarding; seats available walk-up)
- **London North Eastern Railway (LNER) Highland Chieftain (London King's Cross to Inverness via East Coast Main Line)**: `in` (optional reservation only, not compulsory; walk-up boardable as available)
- **Caledonian Sleeper (overnight services London Euston to Aberdeen, Inverness, Fort William)**: `out-reservation` (compulsory berth reservation; all passengers must book overnight accommodation in advance; boarding only after staff document check-in on platform at boarding time)

**Check-in procedure clarification for Caledonian Sleeper:** Staff check-in on platform (not formal airport-style barrier) occurs at origin stations (London Euston, Aberdeen, Inverness, Fort William, Glasgow, Edinburgh) ~60–90 minutes before departure. Boarding restricted to passengers with pre-booked berths. This is a compulsory reservation check (test 1 failure), not a travel-document verification like airport security (test 2 alternative). Verdict: `out-reservation` per board-eligibility-rule.md §6 ("Sleepers → `out-reservation` in practice everywhere so far").

**Stations with multiple operators (hubs):**
- **Perth (PTH)**: ScotRail + CrossCountry + LNER services. All pass both tests → `in`.
- **Inverness (INV)**: ScotRail + CrossCountry + LNER Highland Chieftain + Caledonian Sleeper services. ScotRail/CrossCountry/LNER → `in`; Caledonian Sleeper → `out-reservation`.
- **Aberdeen (ABD)**: ScotRail + CrossCountry + Caledonian Sleeper services. ScotRail/CrossCountry → `in`; Caledonian Sleeper → `out-reservation`.
- **Dundee (DDE)**: ScotRail + CrossCountry services. All pass both tests → `in`.
- **Mallaig (MLG), Fort William (FTW)**: ScotRail + Caledonian Sleeper. ScotRail → `in`; Caledonian Sleeper → `out-reservation`.

**No check-in barriers:** Platform access at all in-catalog Scottish rail stations is unrestricted. Ticket checking is on-board by conductors or at revenue protection officers (low-level gating, not airport-style check-in). Walk-up boarding is unobstructed for all services marked `in` above. Caledonian Sleeper check-in on platform (compulsory berth verification) occurs at boarding time but does not constitute a travel-document "check-in barrier" (test 2); the primary blocker is compulsory reservation (test 1).

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **ScotRail Regional trains** | Perth, Inverness, Aberdeen, Dundee, Mallaig, Fort William, Kyle of Lochalsh, Thurso, Wick, and connecting local routes | No (open seating, no reservation offered or required) | No | `in` | [ScotRail Passenger Charter (April 2025)](https://scotrail.co.uk/media/59957/download?inline=); ScotRail operates 350+ stations in Scotland with ticket barriers at only 17 locations; revenue protection is on-board or at selected stations, not platform-barrier gating. Walk-up boarding standard practice for all regional services. |
| **CrossCountry long-distance intercity** | Perth, Inverness, Aberdeen, Dundee, Fort William (selected services) | No (optional reservation only, not compulsory; walk-up boarding available as seats allow) | No | `in` | [UK Rail Seat Reservations Guide](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); CrossCountry reservations are available but not required for flexible (Off-Peak/Anytime) fares or walk-up purchase. |
| **London North Eastern Railway (LNER) Highland Chieftain (London–Inverness)** | Inverness (primary); may call at Perth / Dundee on through-route | No (optional reservation only, not compulsory; walk-up available) | No | `in` | [LNER seat reservations](https://www.lner.co.uk/); optional for standard/walk-up fares; no compulsory booking requirement. |
| **Caledonian Sleeper** | Aberdeen, Inverness, Fort William, Mallaig, plus Edinburgh/Glasgow (if in-catalog) | Yes (compulsory berth/cabin booking; all passengers must reserve overnight accommodation in advance) | Platform check-in by staff (document verification, not travel barrier) | `out-reservation` | [Caledonian Sleeper Before Your Trip](https://www.sleeper.scot/help-support/before-your-trip/); [Caledonian Sleeper Policies](https://www.sleeper.scot/about/policies/); [Discovery Trains Sleeper Guide](https://www.discoverytrains.net/en/blog/caledonian-sleeper-what-you-need-about-this-overnight-train); all berths are reserved; boarding restricted to booked passengers; staff meet guests on platform 60–90 minutes before departure for document check-in and carriage assignment. Fails test 1 (compulsory reservation). |

**Board eligibility summary:** ScotRail regional, CrossCountry, and LNER Highland Chieftain services calling at Perth, Inverness, Aberdeen, Dundee, Mallaig, Fort William pass both boarding-contract tests (walk-up boardable, no check-in barriers). All three operators offer optional or walk-up-only booking for these routes. Caledonian Sleeper fails test 1 (compulsory berth reservation) at all Scottish origin stations (Aberdeen, Inverness, Fort William) and is excluded with verdict `out-reservation`. **All verdicts recorded; no silent omissions.** Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at all hub stations (Perth, Inverness, Aberdeen, Dundee) and branch termini with these verdicts enforced in filtering logic.

## H2 clash surface

**National Rail:** Darwin/OpenLDBWS documented. ScotRail, CrossCountry, LNER service operators. Static GTFS via Rail Delivery Group (verified on Transitland). Real-time via OpenLDBWS (blocked at account level by EvansAppStudio's AU-registered RDM account — same blocker as East Midlands / West Midlands / Greater Manchester / Liverpool City Region / South Wales). **Account-level blocker:** Tim must complete UK re-registration on Rail Data Marketplace before DARWIN_LDB_TOKEN can be provisioned.

**Caledonian Sleeper:** Overnight long-distance service (London Euston to Aberdeen, Inverness, Fort William; also Edinburgh, Glasgow). Operates on National Rail infrastructure but with distinct boarding contract (compulsory berth reservation). Verdict: `out-reservation` per board-eligibility rule. Service calls at Aberdeen (ABD), Inverness (INV), Fort William (FTW), Mallaig (MLG), and South (Edinburgh, Glasgow — future regions).

**Cross-border operators:** CrossCountry and LNER services cross Rest of Scotland boundaries (south to England, east/south to other UK regions). Dundee and Perth are through-running points on national long-distance corridors, not merge points within Scotland. De-duplication at D2 if adjacent regions (future Southern Scotland / Northern England regions) enter the app.

**Clash:** Account-blocked National Rail RT feed + multiple operators at shared hubs + Caledonian Sleeper board-eligibility verdict required + cross-region through-running at Dundee/Perth + regional boundary coordination with future Glasgow/Edinburgh regions. No L3 / S-Bahn / Metro other than National Rail in v1 scope.

## C2/C3 to put in front of Jim

1. **city=rest-of-scotland** (or split by region if future expansion splits Scotland further). Operators: **ScotRail** (primary regional operator, TOC within National Rail), **Caledonian Sleeper** (long-distance overnight, operator: Serco / Caledonian Sleeper Ltd), **CrossCountry** (cross-border long-distance), **London North Eastern Railway / LNER** (East Coast Main Line services to Inverness via Highland Main Line).

2. **Four tier-1 hub stations lock the scope:**
   - **Perth (PTH CRS)** — three-line junction: Highland Main Line (north to Inverness), Tayside line (east to Dundee/Aberdeen), cross-country (south). One main station with east-side wing for Dundee-bound trains.
   - **Inverness (INV CRS)** — four-line terminus: Highland Main Line (from south), Aberdeen–Inverness line (from south), Kyle of Lochalsh line (west), Far North Line (north). 7 platforms.
   - **Aberdeen (ABD CRS)** — two-line hub: Dundee–Aberdeen line (south to Dundee), Aberdeen–Inverness line (north to Inverness). 6 platforms.
   - **Dundee (DDE CRS)** — three-line junction: Dundee–Perth (west), Dundee–Aberdeen (north), Dundee–Edinburgh (south).

3. **Branch termini (one operator, no through-running to other regions):**
   - Kyle of Lochalsh (KLS), Thurso (THR), Wick (WCK), Mallaig (MLG), Fort William (FTW).
   - Caledonian Sleeper calls at Mallaig and Fort William (nights only).

4. **Regional boundary (Rest of Scotland = outside Central Belt):** Rest of Scotland encompasses all National Rail services across Scotland excluding Glasgow urban catchment (GQT, GCN, etc.) and Edinburgh urban catchment (EDB, HYM, MSB, etc.). Falkirk High (FKK, north of Central Belt on Glasgow–Edinburgh via Falkirk line) likely sits within Rest of Scotland scope, but exact boundary vs. future Glasgow/Edinburgh regions remains **unresolved — do not attempt to resolve**. Glasgow and Edinburgh regions have documented internal boundary dispute at Falkirk High in their draft oracle reports. Flag boundary coordination with Luke at D1 pack stage.

5. **Caledonian Sleeper board eligibility: `out-reservation`.** Compulsory berth booking required. Calls at Aberdeen, Inverness, Fort William, Mallaig (nights only). Staff platform check-in 60–90 minutes before departure. Excluded from v1 boards per board-eligibility-rule.md. Do not include in live board filtering.

6. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration (same blocker as East Midlands / West Midlands / Manchester / Liverpool; account re-registration in progress).

7. **Through-running stations (Dundee, Perth):** National Rail trains continue across Scottish regional boundaries (and potentially future region boundaries). Dundee carries through-running from Dundee–Edinburgh line (south toward Central Belt). Perth carries through-running from cross-country routes (south to Glasgow/English regions). Flag for de-dup at D2 if adjacent regions enter the app.

8. **No tram, no metro, no buses in v1 scope.** National Rail (dark rail) only. ScotRail operates 350+ stations; light rail / tram services (none identified in Scotland at this stage) excluded by mode.

9. **Europe/London timezone (UTC+0 / UTC+1 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

10. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See East Midlands, South Wales oracle-clash-report for parallel account-level blocker context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. ScotRail, CrossCountry, LNER for operator branding.
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
