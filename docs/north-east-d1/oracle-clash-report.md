# North East oracle clash report

D1 (planned): **Tyne and Wear Metro** (DB Regio operator for Nexus) operates two light-rail lines serving Newcastle, Gateshead, South Tyneside, North Tyneside, and Sunderland. Static GTFS via [UK Department for Transport Bus Open Data Service](https://data.bus-data.dft.gov.uk/downloads/) (Onestop ID `f-bus~dft~gov~uk`, no key required; verified 31 Aug 2026). **National Rail** (Darwin/OpenLDBWS) covers Newcastle Central (NCL) and surrounding regional/through-running stations via [Rail Data Marketplace](https://raildata.org.uk/); requires DARWIN_LDB_TOKEN subscription. Metro real-time: **no public GTFS-RT API confirmed**. National Rail real-time: OpenLDBWS available via RDM subscription (free tier: 100,000 calls/month). Both services call **Newcastle Central** hub (Metro station directly below railway station, separate platforms). Green Line shares tracks with Northern Trains freight/passenger services between Pelaw Junction and Sunderland station (shared platform arrangement).

## V1 scoping — Metro schedule-only, National Rail slot TBD

**Metro v1 assumption:** schedule-only boards at Newcastle Central Metro station (light rail, both Yellow and Green lines converge). No real-time feed found in public sources (confirm with Nexus whether GTFS-RT or custom API exists and may be published). Unofficial RTI API at metro-rti.nexus.org.uk is for the Pop app, not a documented public endpoint. **National Rail:** blocked at account level by EvansAppStudio's AU-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region / East Midlands). Unblock first before wiring. Once unblocked, Newcastle Central (NCL) will show Darwin departures for regional trains (Northern Trains East Coast Main Line and Durham Coast Line services).

## Station name table

Match rule: published Metro stop name vs. National Rail station print vs. official agency map.

| published (Metro / NR rail) | agency print | class |
| --- | --- | --- |
| Newcastle Central | Metro: Central Station; NR rail: Newcastle Central Station (NCL CRS) | **hub lock** — shared Metro/rail interchange. Metro Central is deep tube directly below main rail platforms. Separate infrastructure, separate boardings. |
| Sunderland | Metro: Sunderland; NR rail: Sunderland Station | **shared platform, through-running point**. Green Line Metro and Northern Trains share tracks from Pelaw to Sunderland; same platforms used by both services. Unique arrangement in UK (only two stations UK-wide use same platforms for light + heavy rail: Sunderland and Rotherham Central, South Yorkshire). |
| South Hylton | Metro: South Hylton | **Metro-only terminus**. Green Line exclusive track south of Sunderland. |
| Tynemouth | Metro: Tynemouth | **Metro-only terminus** (Yellow Line). Converted from traditional railway station. |
| St James | Metro: St James | **Metro-only terminus** (Yellow Line). Newcastle city centre. |
| Pelaw | Metro: Pelaw | **through-running junction only**. Green Line tracks become shared with Northern Trains north of Pelaw toward Sunderland. Metro has exclusive use south of Pelaw to South Hylton. No separate National Rail station at Pelaw Junction itself. |
| Berwick-upon-Tweed | (NR rail only) | Berwick-upon-Tweed railway station (BWK CRS). **Scotland boundary**. Northernmost East Coast Main Line station in England; 67 miles north-west of Newcastle. Northern Trains through-running point into Scotland. National Rail only; no Metro service at border. |
| Darlington | (NR rail only) | Darlington railway station (DRL CRS). **East Midlands region boundary candidate**. County Durham, East Coast Main Line. Northern Trains and through-running services (Transpennine Express, Hull trains). National Rail only; no Metro service. Flag for Luke at D1 pack stage — confirm if North East or East Midlands scope. |

Green Line and Yellow Line do not extend beyond Tyne and Wear county boundaries. Through-running stations are served by Northern Trains regional services only; they are not de-dup points but may appear in both regions' feeds if both regions add National Rail slices. Green Line's unique shared-platform arrangement at Sunderland must be explicitly modeled in v1 boards: passengers can walk up to the same platform and board either Metro (light rail) or National Rail (heavy rail) services.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary:**

### Tyne and Wear Metro (all services, schedule-only v1)
- **All Metro services** (Yellow and Green lines, 72 stops total): `out-product` — No confirmed public GTFS-RT or documented real-time API found. Static GTFS is confirmed via DFT Bus Open Data Service, but no real-time feed exists publicly (Tim, 5 Sep 2026, decision per docs/jim-brief-north-east-metro-out-product.md). Unofficial metro-rti.nexus.org.uk API serves Pop app only, not documented public API. Schedule-only v1 assumed.

### National Rail at Newcastle Central and Sunderland (optional reservation or unreserved only)
- **LNER (long-distance, unreserved-coach policy)**: `in` — unreserved coach always available; walk-up permitted
- **Northern Railway (regional commuter services)**: `in` — optional seat reservations only, not compulsory for walk-up boarding
- **TransPennine Express (regional/intercity)**: `in` — optional seat reservations only for premium fares; walk-up available on standard fares
- **CrossCountry (through-running intercity)**: `in` — optional seat reservations only, not compulsory for walk-up
- **Lumo (open-access)**: `in` — boardable without compulsory reservation; some seats unreserved (green-light marked)

**Excluded services (confirmed not calling at in-catalog stations):**
- Caledonian Sleeper does not call at Newcastle Central, Sunderland, or other North East stations.
- No Eurostar or check-in-barrier services.

**No check-in barriers:** Platform access at Newcastle Central and Sunderland is unrestricted. Ticket checking is on-board by conductors or at low-level gating (not airport-style). Walk-up boarding is unobstructed for all National Rail services listed above.

**Stations with multi-operator platforms:**
- **Newcastle Central (National Rail only in v1):** Five National Rail operators (LNER, Northern, TPE, CrossCountry, Lumo) call same location on separate platforms. Each operator has walk-up boarding available. (Metro runs in separate deep-tube box, doNotGroup, but is `out-product` in v1 due to missing real-time feed.)
- **Sunderland Station (shared-platform unique case):** Metro Green Line and Northern Trains share same platforms on same track (Pelaw–Sunderland). Both services depart from same boarding area. v1 must model this as one mixed board with per-service mode/operator tagging, not split by mode tab. Both Metro `out-product` and National Rail `in` verdicts apply at same station.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Tyne and Wear Metro (all lines)** | Newcastle Central, Sunderland, St James, Tynemouth, South Hylton, South Shields, 66 other stops | Data source known (static GTFS confirmed) but no real-time confirmed | No | `out-product` | [DFT Bus Open Data Service](https://data.bus-data.dft.gov.uk/downloads/) — static GTFS confirmed (OGL 3.0), no public GTFS-RT found; official decision per docs/jim-brief-north-east-metro-out-product.md (Tim, 5 Sep 2026) |
| **LNER (long-distance)** | Newcastle Central, plus through-running stations | No (unreserved coach always available, walk-up permitted) | No | `in` | [LNER unreserved coach policy](https://www.lner.co.uk/); walk-up boarding standard on all services |
| **Northern Railway (regional)** | Newcastle Central, Sunderland, Berwick-upon-Tweed, plus North East and cross-boundary stations | No (optional seat reservations only, not compulsory) | No | `in` | [Northern Trains seat reservations](https://www.northernrailway.co.uk/); walk-up boarding available for all services |
| **TransPennine Express (regional/intercity)** | Newcastle Central, plus regional stations | No (optional reservations only for premium products, walk-up available) | No | `in` | [TransPennine Express seat reservations](https://www.tpexpress.co.uk/travelling-with-us/seat-reservations-and-upgrades); standard and walk-up fares available without reservation |
| **CrossCountry (intercity through-running)** | Newcastle Central, plus through-running stations | No (optional reservations only, not compulsory for walk-up) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); walk-up standard fares available |
| **Lumo (open-access)** | Newcastle Central | No (boardable without compulsory reservation; some seats unreserved) | No | `in` | [Lumo tickets](https://www.lumo.co.uk/tickets/our-tickets); unreserved carriage always available |

**Board eligibility summary:** Tyne and Wear Metro (both lines, walk-up frequency-based in principle, but no real-time feed publicly available) is `out-product` in v1 per Tim's decision (5 Sep 2026). Static boards offered for Metro in v1, but boards must surface `MetroFeedUnconfirmedError` (no real-time data). All National Rail operators calling at Newcastle Central and other in-catalog stations (LNER, Northern, TPE, CrossCountry, Lumo) offer walk-up boarding with optional reservations only (or unreserved) — no compulsory booking and no check-in barriers. **All verdicts recorded; no silent omissions.** Sunderland's unique shared-platform arrangement requires explicit mixed-mode modeling once National Rail is unblocked: board must show both Metro and National Rail services on same platform with per-service operator/mode tags, not split into separate mode tabs. Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at Newcastle Central and Sunderland with these verdicts enforced in filtering logic.

## H2 clash surface

**Metro:** DB Regio operator; Nexus owner (Tyne and Wear Passenger Transport Executive). No product `lib/cities/north-east/` exists. No live adapter. GTFS from DFT aggregator is static (monthly refresh). No official Nexus/DB Regio GTFS landing page; data served via national DFT feed only. No published next-train GTFS-RT endpoint (unofficial metro-rti.nexus.org.uk API is Pop app only, not documented public API).

**National Rail:** OpenLDBWS documented. Northern Trains service codes (East Coast Main Line, Durham Coast Line; cross-regional through-running on both). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for West Midlands / Manchester / Liverpool City Region / East Midlands; not a feed problem).

**Clash:** schedule-only Metro (no RT source found) + account-blocked National Rail RT (unblock required before D1). Newcastle Central uses separate Metro/rail platforms (different infrastructure). Sunderland is unique UK shared-platform station (same track, same platforms, both Metro Green Line and Northern Trains). Green Line through-running on National Rail-owned tracks (Pelaw–Sunderland) requires care in v1: both services call same infrastructure; must not double-show arrivals for the same train on different mode tabs. No L3 / S-Bahn / Metro other than Tyne and Wear light rail.

## C2/C3 to put in front of Jim

1. **city=north-east**. Tyne and Wear Metro = DB Regio (Nexus owner). National Rail = Darwin LDBWS (Northern Trains + cross-boundary services via through-running stations).
2. **Newcastle Central (NCL CRS)** is the hub lock (Metro + rail, separate platforms, distinct infrastructure, separate boarding areas).
3. **doNotGroup Newcastle Central Metro vs. rail platforms.** Metro Central is a deep-tube station directly below the railway station — different mode, different operator, different boarding areas. No walk-through connection; no automatic interchange grouping.
4. **Sunderland Station: shared platform, unique layout.** Metro Green Line and Northern Trains use the same platforms on the same track from Pelaw to Sunderland. This is a real shared-platform station (only two such stations in UK). Both services depart from the same boarding area. v1 must model this explicitly: Sunderland board shows both Metro and National Rail services on the same platform, not split by mode. Verify with Nexus how passenger signage / mode distinction works on physical platform.
5. **Green Line through-running: Pelaw–Sunderland shared track.** Metro Green Line (light rail) operates on National Rail-owned and operated tracks between Pelaw Junction and Sunderland. Same infrastructure. Do not de-dup as two separate operators; model as shared infrastructure with two legally distinct service brands.
6. **Metro v1 lines:** Yellow Line (St James ↔ South Shields), Green Line (Airport ↔ South Hylton via Sunderland). Both converge on shared central section South Gosforth–Pelaw. No other lines or branches. Yellow Line: 41 stations. Green Line: 31 stations (per Wikipedia category breakdown; verify in GTFS static).
7. **South Hylton terminus (Green Line only):** Exclusive Metro track south of Sunderland. No National Rail service. South of Sunderland, Green Line has no through-running.
8. **Berwick-upon-Tweed (BWK):** Scotland boundary, East Coast Main Line, National Rail only. 67 miles north-west of Newcastle. Northern Trains through-running into Scotland; not a Metro station.
9. **Darlington (DRL):** East Coast Main Line, County Durham. National Rail only. Flag for Luke: confirm whether Darlington is in North East scope or should be flagged as East Midlands boundary / split region. East Midlands oracle report lists through-running stations but does not include Darlington explicitly; needs clarification.
10. **No real-time Metro feed found.** Metro boards are schedule-only in v1. Confirm with Nexus whether real-time GTFS-RT, custom API, or timetable-API (e.g., Trafiklab model) will be published (DB Regio operator).
11. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.
12. **Through-running stations (Berwick-upon-Tweed, and candidate Darlington):** These are National Rail only. They may appear in both North East and adjacent-region feeds if both regions include National Rail slices. Berwick is Scotland boundary; confirm if it's North East's northern terminus or if additional ECML stations between Newcastle and Berwick belong to North East (e.g., Morpeth, Alnmouth). Darlington needs regional ownership clarification with East Midlands before D1.
13. **No buses, no other modes, no Overground in v1 scope.** Network Rail corridor between regions, Northern Trains sole operator on National Rail tracks in North East scope.

## License

- **Tyne and Wear Metro GTFS (DFT Bus Open Data Service):**
  - **License name:** Open Government Licence v3.0 (OGL 3.0).
  - **Redistribution / rehosting:** OGL 3.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially." Derived products allowed; redistribution to third-party users via Next Train API is permitted.
  - **Commercial use:** allowed under OGL 3.0.
  - **Attribution:** "Contains public sector information licensed under the Open Government Licence v3.0" or link to https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Name source as Department for Transport Bus Open Data Service and Tyne and Wear Metro operator (DB Regio for Nexus).
  - **Terms URL:** https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Feed landing: https://data.bus-data.dft.gov.uk/downloads/ (aggregator); Transitland entry: https://www.transit.land/feeds/f-bus~dft~gov~uk.
  - **Confidence:** `clear` for GTFS static license. Feed is live 200 on DFT platform (verified 31 Aug 2026). No key required for download.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Northern Trains for train service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license.
