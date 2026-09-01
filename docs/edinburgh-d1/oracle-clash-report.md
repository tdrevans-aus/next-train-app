# Edinburgh oracle clash report

D1 (planned): **Edinburgh Trams** operates one light-rail line (T50: Newhaven–Edinburgh Airport, 23 stops). Static GTFS via [UK Department for Transport Bus Open Data Service](https://data.bus-data.dft.gov.uk/downloads/) (Onestop ID `f-bus~dft~gov~uk`, no key required; verified 1 Sept 2026). **National Rail** (Darwin/OpenLDBWS) covers Edinburgh Waverley (EDB), Haymarket (HYM), Slateford (SLA) and surrounding regional/through-running stations via [Rail Data Marketplace](https://raildata.org.uk/); requires DARWIN_LDB_TOKEN subscription. Edinburgh Trams real-time: **no public GTFS-RT API confirmed** (TFE Open Data API closed, status unknown). National Rail real-time: OpenLDBWS available via RDM subscription (free tier: 100,000 calls/month). Both services call **Edinburgh Waverley** hub (National Rail main station; Trams stop at Waverley area, separate platforms).

## V1 scoping — Edinburgh Trams schedule-only, National Rail slot TBD

**Edinburgh Trams v1 assumption:** schedule-only boards at central stations and termini (T50 line). No real-time feed found in public sources (confirm with Edinburgh Trams / Transport for Edinburgh whether GTFS-RT or custom API exists and may be published). **National Rail:** blocked at account level by EvansAppStudio's AU-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region / East Midlands). Unblock first before wiring. Once unblocked, Edinburgh Waverley (EDB) will show Darwin departures for ScotRail and long-distance services (London–Edinburgh via ECML, Glasgow services via Falkirk High boundary).

**Boundary decision (Tim-approved, 30 Aug 2026):** Exclusive-territory split at Falkirk High (Glasgow–Edinburgh corridor). Edinburgh owns Waverley/Haymarket/Slateford side; Glasgow owns its side. No shared merged board; Falkirk High is Glasgow's boundary station. Through-running services calling Edinburgh's stations (e.g. Glasgow-bound trains from Waverley) are flagged `in` on Edinburgh boards; de-duplication of identical services across city boundaries is a D2 task.

## Station name table

Match rule: published National Rail station print name vs. CRS code; published Edinburgh Trams stop name vs. official maps and schedule.

| published (Trams / NR rail) | agency print | class |
| --- | --- | --- |
| Edinburgh Waverley | NR rail: Edinburgh Waverley Station (EDB CRS, 20 platforms); Trams: Waverley area stop | **hub lock** — National Rail main Edinburgh station; Trams serve nearby (separate platforms, different infrastructure, no automatic interchange). |
| Haymarket | NR rail: Haymarket railway station (HYM CRS, second busiest in Edinburgh); Trams: none | **through-running point, National Rail only** — West End interchange. Serves Glasgow, Stirling, Highlands via West Coast Main Line and cross-city services. |
| Slateford | NR rail: Slateford railway station (SLA CRS, Shotts Line); Trams: none | **through-running point, National Rail only** — Glasgow–Edinburgh corridor. Shotts Line junction, intermediate station on Edinburgh–Glasgow corridor. Flag for de-dup at D2 if Glasgow region enters app. |
| Edinburgh Park | Tram: Edinburgh Park Central (T50 stop); NR rail: Edinburgh Park station (not listed as National Rail in main catalog, serves Edinburgh Park business park; may have limited passenger service) | Tram-only for v1; Edinburgh Park railway station is not a current in-scope National Rail station. |
| All other T50 stops | Newhaven, Ocean Terminal, Port of Leith, The Shore, Foot of the Walk, Balfour Street, McDonald Road, Picardy Place, St Andrew Square, Princes Street (West End area, Murrayfield Stadium, Balgreen, Saughton, Bankhead, Edinburgh Park Central, Gyle Centre, Edinburgh Gateway, Gogarburn, Ingliston Park & Ride, Edinburgh Airport) | Tram-only, no National Rail service. |

Edinburgh Trams covers 23 stops (T50 line only, no branches). National Rail through-running stations serve London (ECML), Glasgow (via Falkirk High boundary, exclusive-territory split), Fife lines, and regional services. No L3 / S-Bahn / Metro other than Edinburgh Trams light rail in v1 scope.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**National Rail verdict summary:**
- **ScotRail (regional services)**: `in` (no compulsory reservations; Advance tickets include optional seat assignment but boarding is unrestricted)
- **LNER (London–Edinburgh East Coast Main Line)**: `in` (optional reservations only, not compulsory; one unreservable second-class carriage available)
- **Avanti West Coast (if calling Edinburgh)**: `in` (optional reservations only, not compulsory)
- **CrossCountry (if calling Edinburgh)**: `in` (optional reservations only, not compulsory)
- **TransPennine Express (if calling Edinburgh)**: `in` (optional reservations only, not compulsory)
- **Caledonian Sleeper (Edinburgh Waverley)**: `out-reservation` (compulsory sleeper service, overnight travel, no walk-up day boarding)

**Edinburgh Trams:**
- **Edinburgh Trams T50 all stops**: `in` (walk-up boarding, contactless tap-on system, no reservations; 100% wheelchair accessible; frequent service 7–10 minutes. Tickets available from vending machines or tap-on validators at every stop.)

**Stations with service overlap:**
- **Edinburgh Waverley (EDB, hub-lock)**: National Rail (ScotRail + LNER + long-distance operators listed above) + Edinburgh Trams (T50 nearby, separate platform areas). No shared platform; separate boarding areas. Walk-up boarding available for all services except Caledonian Sleeper (sleeper excluded).
- **Haymarket (HYM, through-running)**: National Rail only (ScotRail cross-city + LNER + Avanti/CrossCountry if calling). No check-in barriers; walk-up boarding available.
- **Slateford (SLA, through-running)**: National Rail only (ScotRail + through-running Glasgow-direction services). No check-in barriers; walk-up boarding available.

**Check-in barriers:** Platform access at National Rail stations (Edinburgh Waverley, Haymarket, Slateford) uses standard UK ticket barriers (low-level gating, not airport-style check-in). Conductors check tickets on-board; barrier passage is not a check-in cutoff. Walk-up boarding is unobstructed for all National Rail services listed. Edinburgh Trams have no ticket barriers; tap-on is pre-boarding only.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Edinburgh Trams T50** | All 23 stops (Newhaven–Airport corridor) | No (walk-up boarding, contactless tap-on system) | No (tap-on only, no barriers) | `in` | [Edinburgh Trams Accessibility](https://edinburghtrams.com/contact/tram-accessibility); [Edinburgh Trams FAQs](https://edinburghtrams.com/faqs); [Moovit T50 Route](https://moovitapp.com/index/en-gb/public_transportation-line-t50-scotland-402-1832803-28754540-0) — walk-up accessible, frequent 7–10 min service. |
| **ScotRail Regional** | Edinburgh Waverley, Haymarket, Slateford (and other through-running stations) | No (optional Advance seat assignment; no boarding restriction) | No | `in` | [ShowMeTheJourney: UK Rail Seat Reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); [Trainline Haymarket](https://www.thetrainline.com/stations/haymarket) — ScotRail allows walk-up boarding on all ticket types. |
| **LNER (London–Edinburgh East Coast Main Line)** | Edinburgh Waverley, Haymarket (if calling) | No (optional reservations; unreservable carriage available) | No | `in` | [LNER Edinburgh Station](https://www.lner.co.uk/stations/edinburgh/); [ShowMeTheJourney: Seat Reservations Guide](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — LNER offers unreservable second-class carriage on all trains. |
| **Avanti West Coast** | Edinburgh Waverley (if long-distance West Coast service calls) | No (optional only, not compulsory) | No | `in` | [Avanti West Coast Ticketing](https://www.avantiwestcoast.co.uk/); [ShowMeTheJourney: Seat Reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — optional reservation policy; boarding unrestricted. |
| **CrossCountry** | Edinburgh Waverley (if through-running corridor service calls) | No (optional only, not compulsory) | No | `in` | [ShowMeTheJourney: UK Reservation Guide](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); [RailUK Forums: Seat Reservation Policy](https://www.railforums.co.uk/threads/gwr-reservations-compulsory-or-not.208259/) — CrossCountry operates optional reservations. |
| **TransPennine Express** | Edinburgh Waverley (if corridor service calls) | No (optional only, not compulsory) | No | `in` | [ShowMeTheJourney: UK Rail Reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — TransPennine Express optional reservation policy. |
| **Caledonian Sleeper** | Edinburgh Waverley | **Yes (compulsory sleeper booking)** | No (but service not walk-up) | `out-reservation` | [National Rail Seat Reservations Policy](https://www.nationalrail.co.uk/tickets-railcards-and-offers/buying-a-ticket/seat-reservations/); [Caledonian Sleeper](https://www.sleeper.scot/) — sleeper service, compulsory booking for overnight travel. Not a walk-up day service. |

**Board eligibility summary:** All National Rail services calling at Edinburgh Waverley, Haymarket, Slateford pass walk-up and check-in tests, except Caledonian Sleeper (sleeper service, excluded by compulsory booking). Edinburgh Trams T50 is fully walk-up accessible with frequent, no-reservation service at all 23 stops. All verdicts recorded; no silent omissions. **Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at Waverley/Haymarket/Slateford and Edinburgh Trams schedule-only departures to T50 boards, with these verdicts enforced in filtering logic.**

## H2 clash surface

**Edinburgh Trams:** No product `lib/cities/edinburgh/` exists. No live adapter. GTFS from DFT aggregator is static (monthly refresh, verified on Transitland Onestop ID `f-bus~dft~gov~uk`). No official Edinburgh Trams GTFS landing page; data served via national DFT BODS feed only. **No published next-train GTFS-RT endpoint confirmed** — TFE Open Data API closed (status change pending clarification; contact Transport for Edinburgh for real-time data availability).

**National Rail:** Darwin/OpenLDBWS documented. ScotRail primary operator (Abellio Scotland); LNER / Avanti / CrossCountry / TransPennine Express service codes (cross-boundary through-running via Falkirk High and other junctions). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for West Midlands / Manchester / Liverpool / East Midlands; not a feed problem).

**Clash:** schedule-only Edinburgh Trams (no RT source found) + account-blocked National Rail RT (unblock required before D1). Edinburgh Waverley is a shared-hub area (Tram stops near main railway, separate infrastructure, separate boardings). Haymarket and Slateford are National Rail only (through-running points on Glasgow–Edinburgh corridor, exclusive-territory split boundary at Falkirk High — de-dup flagged for D2). No L3 / S-Bahn / Metro other than Edinburgh Trams tram.

## C2/C3 to put in front of Jim

1. **city=edinburgh** (or split by agency: `edinburgh-trams` + `edinburgh-national-rail` slice if separate). Edinburgh Trams = T50 light rail (23 stops). National Rail = Darwin LDBWS (ScotRail primary, LNER/Avanti/CrossCountry/TransPennine through-running via Falkirk High boundary).

2. **Edinburgh Waverley (EDB CRS)** is the hub lock (National Rail main station; Trams serve Waverley area, separate platforms).

3. **doNotGroup Edinburgh Waverley Tram vs. rail platforms.** Main railway station is distinct from T50 tram stops in Waverley area — different mode, different operator, separate boarding areas. No automatic interchange grouping.

4. **Boundary decision (already approved, 30 Aug 2026):** Falkirk High is the exclusive-territory split point on Glasgow–Edinburgh corridor. Edinburgh owns Waverley/Haymarket/Slateford side; Glasgow owns its side. Through-running services (e.g. Glasgow-bound trains from Edinburgh) are `in` on Edinburgh boards; de-dup at D2 if Glasgow region enters app.

5. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.

6. **Edinburgh Trams real-time feed status: UNKNOWN — DO NOT ASSUME.** Contact Transport for Edinburgh (trams@tfe.scot or via www.edinburghtrams.com) and confirm:
   - Whether public GTFS-RT real-time feed will be published.
   - If not, Edinburgh Trams boards stay schedule-only in v1 (DFT BODS static feed confirmed on Transitland).

7. **Edinburgh Trams static GTFS:** Confirmed available via DFT BODS (Onestop ID `f-bus~dft~gov~uk`, verified on Transitland 1 Sept 2026). Monthly refresh. T50 line: 23 stops, Newhaven–Edinburgh Airport.

8. **National Rail operators:** ScotRail primary (Abellio Scotland, regional and cross-city services). LNER (East Coast Main Line, London–Edinburgh). Avanti West Coast, CrossCountry, TransPennine Express (long-distance through-running, if calling Edinburgh). Caledonian Sleeper (overnight service, excluded by compulsory booking).

9. **Through-running stations:** Haymarket (HYM, West End interchange), Slateford (SLA, Shotts Line junction) are National Rail only on Glasgow–Edinburgh corridor. Not de-dup points in v1 (Edinburgh owns these on its side of Falkirk High boundary); flag for de-dup at D2 if Glasgow region adds National Rail slices.

10. **No buses, no MetroLink, no other operators in v1 scope.** Network Rail corridor between regions, Scotland-wide ScotRail + long-distance operators on National Rail tracks.

11. **Europe/London time zone: Europe/London (GMT/BST with DST).** Official live path for National Rail is Darwin/OpenLDBWS via RDM subscription (free tier: 100,000 calls/month). Edinburgh Trams live path unknown pending feed confirmation.

## License

- **Edinburgh Trams static GTFS (DFT Bus Open Data Service):**
  - **License name:** Open Government Licence v3.0 (OGL 3.0).
  - **Redistribution / rehosting:** OGL 3.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially." Derived products allowed; redistribution to third-party users via Next Train API is permitted.
  - **Commercial use:** Allowed under OGL 3.0.
  - **Attribution:** "Contains public sector information licensed under the Open Government Licence v3.0" or link to https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Name source as Department for Transport Bus Open Data Service and Edinburgh Trams operator (Transport for Edinburgh / Edinburgh Trams Ltd.).
  - **Terms URL:** https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Feed landing: https://data.bus-data.dft.gov.uk/downloads/ (aggregator); Transitland entry: https://www.transit.land/feeds/f-bus~dft~gov~uk.
  - **Confidence:** `clear` for GTFS static license. Feed is live 200 on DFT platform (verified 1 Sept 2026 via Transitland Onestop ID `f-bus~dft~gov~uk`; T50 route confirmed). No key required for download.

- **Edinburgh Trams GTFS-RT (real-time):**
  - **License name:** Unknown — no public GTFS-RT feed confirmed.
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** None found. No public API endpoint discovered in Transitland, Mobility Database, or Transport for Edinburgh / Edinburgh Trams developer documentation. TFE Open Data API formerly at tfe-opendata.readme.io is no longer active; current status unknown.
  - **Confidence:** `not found`. Real-time feed status unknown. **Skip risk flagged.** Do not assume GTFS-RT will be provided; verify directly with Transport for Edinburgh / Edinburgh Trams (trams@tfe.scot or https://www.edinburghtrams.com/contact/) before D1 pack stage. If no public feed exists, Edinburgh Trams boards stay schedule-only in v1.

- **National Rail static GTFS (Transitland Planar Network):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 1 Sept 2026). No key required for download.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. ScotRail (Abellio Scotland) for primary operator branding; LNER / Avanti / CrossCountry / TransPennine Express for through-running service operators.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.

