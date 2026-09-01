# Greater Manchester oracle clash report

D1 (published, as of 1 Sep 2026): **Transport for Greater Manchester (TfGM)** operates **Manchester Metrolink** light rail system (8 lines, 99 stops). Static GTFS via direct URL: `https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip` and archived on [Transitland Onestop ID `f-9qh-metrolinktrains`](https://www.transit.land/feeds/f-9qh-metrolinktrains) (verified 1 Sep 2026, no key required). **Real-time:** TfGM developer portal (opendata.tfgm.com) **no longer issues new API keys**; existing keys continue to function (deprecation ongoing). **National Rail** (Darwin/OpenLDBWS) covers Manchester Piccadilly (MAN, CRS code) and Manchester Victoria (MCV, CRS code) plus surrounding regional/through-running stations, requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/). Both services intersect at **Manchester Victoria** station (6 National Rail platforms + 4 Metrolink platforms integrated at same location; footbridge/corridor connect). No official Metrolink GTFS-RT feed confirmed. National Rail real-time: OpenLDBWS available via RDM subscription (free tier: 100,000 calls/month).

## V1 scoping — Metrolink real-time unknown, National Rail slot TBD

**Metrolink v1 assumption:** schedule-only boards at Manchester Victoria and other in-catalog Metrolink stops (light rail). No real-time GTFS-RT feed found in public sources. TfGM developer portal is deprecated and not issuing new keys. **National Rail:** blocked at account level by EvansAppStudio's Australian-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects East Midlands / West Midlands / Liverpool City Region / South Wales regions). Unblock first before wiring. Once unblocked, Manchester Piccadilly (MAN) and Manchester Victoria (MCV) will show Darwin departures for regional trains (Northern, Avanti, TransPennine Express, CrossCountry, East Midlands Railway, Transport for Wales).

## Station name table

Match rule: published Metrolink tram stop name vs. National Rail station print vs. official agency map.

| published (Metrolink / NR rail) | agency print | class |
| --- | --- | --- |
| **Manchester Victoria** | Metrolink: Victoria tram stop (4 platforms); NR rail: Manchester Victoria (MCV CRS, 6 platforms) | **hub lock** — integrated tram/rail interchange. Both services at same station; NR platforms connected to tram concourse via escalators/lift. Walk distance ~2–5 minutes. |
| Manchester Piccadilly | Metrolink: Piccadilly Gardens tram stop (undercroft/basement); NR rail: Manchester Piccadilly (MAN CRS, 14 platforms) | **shared station, separated vertically** — tram stop is ~100m away at street level (basement); walk distance via moving walkways ~5–10 minutes to main NR platforms 13–14. Interchange possible but not integrated at same level. |
| St Peter's Square | Metrolink hub stop in Zone 1 city centre | **Metrolink-only** — most used stop on Metrolink network; convergence point for most lines (serves as operational hub for tram planning). No National Rail service. |
| Walsden | National Rail (Calder Valley Line, CRS WDN, West Yorkshire boundary) | **through-running point, not merge** — Walsden is on the boundary between Greater Manchester (south) and West Yorkshire (north). Northern Railway services call both GM and WY regions; flag for de-dup at D2 if both regions enter app. |
| Stockport | National Rail (main station south of Manchester, CRS SMN); Metrolink: no direct station connection (Stockport town centre ~0.5km walk) | **separate modes** — National Rail only; Metrolink does not serve Stockport town centre rail station. Metrolink serves tram-only stops in Stockport (e.g., Stockport tram stop on Altrincham and Ashton lines). |
| All other Metrolink stops (81 total, citywide) | TfGM published names | Metrolink only; no National Rail service. |

Metrolink lines serve 99 stops across 8 routes (Green, Yellow, Blue, Red, Purple, Orange, Airport, Eccles lines radiating from Manchester city centre hub at Victoria/St Peter's Square). National Rail services converge at Manchester Piccadilly (main intercity/regional hub, 14 platforms) and Manchester Victoria (secondary hub, 6 platforms). No product `lib/cities/greater-manchester/` exists. No live adapter.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (both Metrolink and National Rail):**

### Metrolink (all services, walk-up only)
- **All Metrolink tram services** on 8 lines (Green, Yellow, Blue, Red, Purple, Orange, Airport, Eccles): `in` — No compulsory reservation; walk-up boarding standard. Metrolink operates tram-only frequency boarding with no booking system.

### National Rail at Manchester Piccadilly and Manchester Victoria (optional reservation only)
- **Northern Railway (regional commuter services, Manchester Victoria and Piccadilly)**: `in` — optional seat reservations only, not compulsory for walk-up boarding
- **Avanti West Coast (intercity West Coast Main Line, Manchester Piccadilly)**: `in` — optional seat reservations only for Advance/Off-Peak fares; some services bookable but walk-up also available
- **TransPennine Express (regional intercity, both stations)**: `in` — optional seat reservations only for premium fares; walk-up boardable on standard fares
- **CrossCountry (through-running intercity services, Manchester Piccadilly)**: `in` — optional seat reservations only, not compulsory for standard fares
- **East Midlands Railway (regional services via Crewe–Manchester line)**: `in` — optional seat reservations only, walk-up available on regional/standard fares
- **Transport for Wales (cross-border services to Wales via Manchester Piccadilly)**: `in` — optional seat reservations only, walk-up available

**Excluded services (none identified at in-catalog stations):**
- No Caledonian Sleeper, Night Riviera Sleeper, or other compulsory-reservation services confirmed at Manchester Piccadilly or Victoria.
- No Eurostar or check-in-barrier services.

**No check-in barriers:** Platform access at both stations is unrestricted. Ticket checking is on-board by conductors or at low-level gating (not airport-style). Walk-up boarding is unobstructed for all services listed above.

**Stations with multi-operator platforms:**
- **Manchester Victoria (NR + Metrolink):** Six National Rail operators + Metrolink trams call same location (separate platforms, footbridge connect). Each operator has walk-up boarding available.
- **Manchester Piccadilly (NR + Metrolink):** Five National Rail operators + Metrolink trams call same location (separate levels, 5–10 min walk). Each operator has walk-up boarding available.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Metrolink (all 8 lines)** | Manchester Victoria, St Peter's Square, Piccadilly Gardens, and 96 other stops | No (walk-up tram system, no reservations) | No | `in` | [Metrolink home](https://www.metrolinktrains.com/); [Wikipedia: Manchester Metrolink](https://en.wikipedia.org/wiki/Manchester_Metrolink) — tram system operates walk-up frequency service with no booking system |
| **Northern Railway (regional)** | Manchester Victoria, Manchester Piccadilly, plus Greater Manchester and North West stations | No (optional seat reservations only, not compulsory) | No | `in` | [Northern Trains seat reservations](https://www.northernrailway.co.uk/); walk-up boarding available for all services |
| **Avanti West Coast (intercity WCML)** | Manchester Piccadilly | No (optional reservations for Advance fares, walk-up available) | No | `in` | [Avanti West Coast reservations](https://www.avantiwestcoast.co.uk/seats-and-reservations); walk-up advance/walk-up standard fares available |
| **TransPennine Express (regional/intercity)** | Manchester Victoria, Manchester Piccadilly | No (optional reservations only for premium products, walk-up available) | No | `in` | [TransPennine Express seat reservations](https://www.tpexpress.co.uk/travelling-with-us/seat-reservations-and-upgrades); standard and walk-up fares available without reservation |
| **CrossCountry (intercity through-running)** | Manchester Piccadilly | No (optional reservations only, not compulsory for walk-up) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); walk-up standard fares available |
| **East Midlands Railway (regional Crewe–Manchester line)** | Manchester Piccadilly | No (optional reservations only, walk-up available) | No | `in` | [East Midlands Railway reservations](https://www.eastmidlandsrailway.co.uk/); walk-up on standard fares |
| **Transport for Wales (cross-border services)** | Manchester Piccadilly | No (optional reservations only, walk-up available) | No | `in` | [Transport for Wales reservations](https://tfw.wales/ticketsandpasses); walk-up boarding on regional services |

**Board eligibility summary:** All Metrolink tram services (walk-up frequency-based) and all National Rail regional/intercity services (optional reservations only, no compulsory booking) calling at Manchester Victoria and Manchester Piccadilly pass both boarding-contract tests. Seat reservations are optional only (not compulsory) for all six National Rail operators on this corridor; no stations have check-in barriers. **All verdicts recorded; no silent omissions.** Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at both in-catalog stations with these verdicts enforced in filtering logic. Metrolink boards are schedule-only (no real-time GTFS-RT feed) until TfGM publishes a new real-time API solution to replace the deprecated developer portal.

## H2 clash surface

**Metrolink:** No product `lib/cities/greater-manchester/` exists. No live adapter. GTFS available at `metrolinktrains.com` (static, monthly refresh). **No real-time GTFS-RT endpoint found in public sources.** TfGM developer portal (opendata.tfgm.com) is deprecated and no longer issues new API keys; existing keys continue to function but on uncertain timeline. **Critical blocker:** No public GTFS-RT feed confirmed for Metrolink. Real-time data status must be verified with TfGM before D1 pack stage.

**National Rail:** Darwin/OpenLDBWS documented. Six Train Operating Companies (Northern, Avanti, TransPennine Express, CrossCountry, East Midlands Railway, Transport for Wales) service Manchester Piccadilly and Victoria with regional and intercity coverage. Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for East Midlands / West Midlands / Liverpool City Region / South Wales / other UK regions built this wave; not a feed problem).

**Clash:** schedule-only Metrolink (no RT source found) + account-blocked National Rail RT (unblock required before D1). Both call Manchester Victoria; tram on separate platforms (footbridge/lift), rail on main platforms (integrated concourse). Metrolink also calls Manchester Piccadilly (Piccadilly Gardens undercroft, 5–10 min walk from NR main platforms). No M-Bahn, no sleepers, no sleeper-cars. Boundary flagged at Walsden (West Yorkshire shared platform with Northern operator, flag for de-dup at D2).

## C2/C3 to put in front of Jim

1. **city=greater-manchester** (or split by operator: `metrolink` + `national-rail-greater-manchester` slice).

2. **Metrolink = 8 lines (Green, Yellow, Blue, Red, Purple, Orange, Airport, Eccles), 99 stops, schedule-only in v1.** All tram services are walk-up (no reservations, no check-in). Hub: St Peter's Square (most central interchange, all lines converge in Zone 1). Secondary hub: Manchester Victoria (also connects to National Rail).

3. **National Rail = 6 operators (Northern, Avanti, TransPennine, CrossCountry, EMR, TfW) at Manchester Piccadilly (MAN, 14 platforms) and Manchester Victoria (MCV, 6 platforms).** Both stations have walk-up regional/intercity services (optional reservations only, no compulsory booking).

4. **Hub-lock recommendation: Manchester Victoria (MCV CRS).** Reason: Metrolink and National Rail both call the same station with integrated platforms (escalator/lift connect concourse). Unlike Piccadilly (where tram undercroft is 5–10 min walk from NR main platforms 13–14), Victoria merges both modes in shared ticketing area. Victoria is second-busiest NR station (after Piccadilly) and busiest Northern-managed station.

5. **doNotGroup Manchester Victoria tram vs. rail platforms.** Metrolink platforms (4) are separate from National Rail platforms (6); crossing requires concourse passage (no cross-platform interchange, but same-station walking distance).

6. **Metrolink real-time feed status: UNKNOWN — DO NOT ASSUME.** Contact TfGM (data.analytics@tfgm.com or https://tfgm.com/open-data) and confirm:
   - Whether new public GTFS-RT feed will be published to replace the deprecated developer portal API.
   - Existing keys continue to work, but on what timeline? Deprecation date?
   - If no GTFS-RT, Metrolink boards are schedule-only in v1 (and will remain so indefinitely unless TfGM commits to a new solution).

7. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.

8. **Walsden (WDN CRS, West Yorkshire boundary):** Through-running point on the Calder Valley Line. Northern Railway services call both Greater Manchester (south) and West Yorkshire (north) regions at the same platform. Not a de-dup point in this region (single operator, same platform); flag for de-dup at D2 if both regions add National Rail slices and services are pulled from both region feeds.

9. **Stockport town centre:** National Rail station (SMN, Stockport railway station) is served by East Midlands Railway and Northern services south of Manchester. Metrolink does NOT serve Stockport rail station; separate tram stops (Stockport, etc.) exist on Altrincham and Ashton lines, but are not co-located with the rail station. Do not conflate; if Stockport rail station appears in-catalog, do not expect Metrolink interchange at that location.

10. **Eight Metrolink lines radiate from city centre hub.** Green (Bury–Altrincham), Yellow (Bury–Piccadilly), Blue (Ashton-under-Lyne–Eccles), Red (Trafford Centre–Cornbrook–Imperial War Museum–Wharfside–Pomona), Purple (Altrincham–Bury), Orange (Altrincham–Rochdale), Airport (Piccadilly–Manchester Airport), Eccles (Manchester–Eccles). No through-running to adjacent regions on Metrolink lines.

11. **Europe/London timezone: GMT/BST (UTC+0/+1).** Official live path for National Rail is Darwin/OpenLDBWS via RDM subscription (free tier: 100,000 calls/month). Metrolink live path unknown pending feed confirmation.

## License

- **Metrolink (TfGM) static GTFS:**
  - **License name:** Open Government Licence v3.0 (OGL 3.0) + Open Data Commons Open Database Licence (ODbL) v1.0.
  - **Redistribution / rehosting:** OGL 3.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially." ODbL 1.0 permits use and redistribution with attribution. Both allow derived products; redistribution to third-party users via Next Train API is permitted under both licenses.
  - **Commercial use:** Allowed under both OGL 3.0 and ODbL 1.0.
  - **Attribution:** "Contains public sector information licensed under the Open Government Licence v3.0" or "Contains data licensed under the Open Data Commons Open Database Licence v1.0" (or both). Name source as Transport for Greater Manchester.
  - **Terms URL:** https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ (OGL 3.0); https://opendatacommons.org/licenses/odbl/1.0/ (ODbL 1.0); https://www.data.gov.uk/dataset/c3ca6469-7955-4a57-8bfc-58ef2361b797/gm-public-transport-schedules-gtfs (TfGM dataset landing page on data.gov.uk).
  - **Confidence:** `clear` for GTFS static license (dual OGL 3.0 + ODbL 1.0). Feed is live on data.gov.uk and direct Metrolink URL (verified 1 Sep 2026). No key required for download.

- **Metrolink real-time (GTFS-RT or proprietary API):**
  - **License name:** Unknown — no current public GTFS-RT feed; TfGM developer portal (deprecated).
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** TfGM Open Data Portal (https://tfgm.com/open-data) — currently lists no active real-time GTFS-RT subscription options. Historical APIs via developer.tfgm.com and opendata.tfgm.com are deprecated (no new keys issued).
  - **Confidence:** `not found`. Real-time feed status unknown. **Skip risk flagged.** Do not assume Metrolink GTFS-RT will be available; verify directly with TfGM before planning D1 pack or adapter work.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See East Midlands oracle-clash-report for parallel account-level blocker context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Operator names (Northern, Avanti, TransPennine, CrossCountry, EMR, TfW) for service branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 1 Sep 2026). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.
