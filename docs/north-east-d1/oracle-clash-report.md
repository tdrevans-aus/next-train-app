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

