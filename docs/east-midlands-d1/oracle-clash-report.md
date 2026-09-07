# East Midlands oracle clash report

D1 (published, as of 31 Aug 2026): **Nottingham Express Transit (NET)** operates two light-rail tram lines. Static GTFS via [UK Department for Transport Bus Open Data Service](https://data.bus-data.dft.gov.uk/downloads/) (Onestop ID `f-bus~dft~gov~uk`, no key required; verified 30 Aug 2026). **National Rail** (Darwin/OpenLDBWS) covers Nottingham (NOT, CRS code) and surrounding regional/through-running stations, requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/). NET real-time: **no public GTFS-RT API confirmed**. National Rail realtime: OpenLDBWS available via RDM subscription (free tier: 100,000 calls/month). Both services call **Nottingham Station** hub (tram viaduct above main rail platforms; footbridge connects).

## V1 scoping — NET schedule-only, National Rail slot TBD

**NET v1 assumption:** schedule-only boards at Nottingham Station (light rail). No real-time feed found in public sources (confirm with Nottingham City Council / Keolis whether such data exists and may be published). **National Rail:** blocked at account level by EvansAppStudio's Au-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region). Unblock first before wiring. Once unblocked, Nottingham (NOT) will show Darwin departures for regional trains (East Midlands Trains cross-boundary services).

## Station name table

Match rule: published NET tram stop name vs. National Rail station print vs. official agency map.

| published (NET tram / NR rail) | agency print | class |
| --- | --- | --- |
| Nottingham Station | NET tram: Nottingham Station; NR rail: Nottingham Station (NOT CRS) | **hub lock** — shared tram/rail interchange. Footbridge connects viaduct to main platforms. |
| Tamworth | Tamworth railway station (TAM CRS, West Midlands region) | **through-running point, not merge**. National Rail only; NR trains call both East Midlands and West Midlands regions at same platform. De-duplicate at D2 if both regions enter the app. |
| Leicester | Leicester railway station (LEI CRS) | **through-running only** (East Midlands operators continue into adjacent region). National Rail only. No shared tram/rail platform. |
| Kettering | Kettering railway station (KET CRS) | **through-running only**. National Rail only. |
| Wellingborough | Wellingborough railway station (WEL CRS) | **through-running only**. National Rail only. |
| Chesterfield | Chesterfield railway station (CHD CRS) | **through-running only**. National Rail only. |
| Alfreton | Alfreton railway station (ALF CRS) | **through-running only**. National Rail only. |

NET tram lines do not extend beyond Nottingham city. Through-running stations are served by East Midlands Trains (Keolis) regional services only; they are not de-dup points but may appear in both regions' feeds if both regions add National Rail slices. Flag for Luke at D1 pack stage.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail + NET tram at in-catalog stations):**

**National Rail services at Nottingham and through-running stations:**
- **East Midlands Railway (EMR/Keolis regional services)**: `in` (open seating, no compulsory reservation; walk-up boarding confirmed via operator help pages)
- **CrossCountry**: `in` (optional reservations only, walk-up boardable)
- **Northern Rail**: `in` (regional commuter services, optional reservations only, walk-up boardable)
- **LNER**: Not applicable — East Coast Main Line (London–Edinburgh) does not serve Nottingham, Chesterfield, or Alfreton. LNER operates via Peterborough and Doncaster only.
- **Sleeper services (Caledonian Sleeper, Night Riviera)**: Not confirmed at any East Midlands in-catalog stations. If any call at through-running points (e.g., Chesterfield), they would be `out-reservation` (compulsory sleeping-car reservation).

**NET tram services at Nottingham Station:**
- **NET Lines 1 & 2 (Hucknall–Beeston/Chilwell and Phoenix Park–Nottingham Station)**: `out-product` — Walk-up service (light rail, no reservation system), passes both boarding-contract tests, but excluded due to unconfirmed feed status. **Feed verification:** DFT Bus Open Data bulk GTFS archive (pulled 31 Aug 2026) does not contain Nottingham Express Transit as an agency (confirmed by Jim's D2 finding). No public GTFS-RT real-time feed confirmed in Transitland or Mobility Database. Adapter surfaces `NetFeedUnconfirmedError` explicitly (error-surfacing preferred to silent board omission per board-eligibility principle). **Reason:** "Feed unconfirmed (no GTFS-RT; static GTFS pull 31 Aug 2026 found NET absent from DFT aggregator). Board surfaces error until feed is confirmed." **Note:** Tim's explicit approval of the error-surfacing approach (and NET verdict) is required at flip-PR merge time.

**Stations with multi-operator overlaps (National Rail only):**
- **Nottingham Station (NOT, hub-lock):** National Rail platforms (East Midlands, CrossCountry, Northern) separate from NET tram viaduct. Two distinct operator sets; each boarded separately (doNotGroup by mode: rail vs. metro).

**No check-in barriers:** Platform access at all in-catalog East Midlands and NET stations is unrestricted. Ticket checking is on-board by conductors or low-level gating (not airport-style). Walk-up boarding is unobstructed for all `in` services listed above.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **East Midlands Railway (regional services)** | Nottingham, Leicester, Kettering, Wellingborough, Chesterfield, Alfreton, and regional stations | No (open seating, no compulsory reservation on regional services) | No | `in` | [East Midlands Railway travel info](https://www.eastmidlandsrailway.co.uk/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); walk-up boarding available on all services |
| **CrossCountry (through-running services)** | Nottingham and through-running stations (Leicester, Kettering, Wellingborough, Chesterfield, Alfreton) | No (optional reservation only, not compulsory) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); walk-up boardable |
| **Northern Rail (regional services via through-running)** | Chesterfield, Alfreton, and regional stations (if services call these points via East Midlands region) | No (optional reservation only; open seating on most regional services) | No | `in` | [Northern Rail help pages](https://help.northernrailway.co.uk/); walk-up boarding available |
| **NET Tram Line 1 (Hucknall – Beeston/Chilwell)** | Nottingham Station (and intermediate tram stops) | No (walk-up only, light rail with no reservation system) | No | `out-product` | Feed unconfirmed (no GTFS-RT; static GTFS pull 31 Aug 2026 found NET absent from DFT aggregator; see [Transitland NET operator](https://www.transit.land/operators/o-gcrj-nottinghamexpresstransittram)). Board surfaces explicit error until feed is confirmed. |
| **NET Tram Line 2 (Phoenix Park – Nottingham Station)** | Nottingham Station (and intermediate tram stops) | No (walk-up only, light rail with no reservation system) | No | `out-product` | Feed unconfirmed (no GTFS-RT; static GTFS pull 31 Aug 2026 found NET absent from DFT aggregator). Board surfaces explicit error until feed is confirmed. |

**Board eligibility summary:** All walk-up National Rail services (East Midlands, CrossCountry, Northern) calling at Nottingham and through-running stations pass both boarding-contract tests (`in` verdicts recorded). NET tram services pass both tests but are excluded by product decision due to unconfirmed feed status (`out-product` verdicts recorded). **All verdicts decided; no silent omissions. Tim's approval of NET error-surfacing approach to be confirmed at flip-PR merge.**

**Correction (7 Sep 2026):** The Line 1 terminus catalogued above as "Beeston/Chilwell" was never a real stop name — it is NET's own label for the branch. The real, geocoded terminus is **Toton Lane** (in Chilwell, NaPTAN ATCO 9400ZZNOTOT); Beeston's own main stop (Beeston Centre) is a separate, uncatalogued intermediate stop, consistent with the termini-only rule already in force for both lines. This is a naming correction only — the board eligibility verdict for NET Line 1 (`out-product`, unconfirmed feed) is unchanged. See `docs/jim-brief-net-toton-lane-and-stockport-tram.md`.

## H2 clash surface

**NET:** No product `lib/cities/east-midlands/` exists. No live adapter. GTFS from DFT aggregator is static (monthly refresh). No official Nottingham Express Transit GTFS landing page; data served via national DFT feed only. No published next-train GTFS-RT endpoint.

**National Rail:** OpenLDBWS documented. Keolis / East Midlands Trains service codes (crosses into adjacent regions at through-running points). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for West Midlands / Manchester / Liverpool; not a feed problem).

**Clash:** schedule-only NET (no RT source found) + account-blocked National Rail RT (unblock required before D1). Both call Nottingham Station; tram on viaduct, rail on main platforms (separate infrastructure, doNotGroup). No L3 / S-Bahn / Metro other than NET tram.

## C2/C3 to put in front of Jim

1. **city=east-midlands** (or split by agency). NET = Nottingham Express Transit (tram only). National Rail = Darwin LDBWS (Keolis East Midlands Trains + cross-boundary services via through-running stations).
2. **Nottingham Station (NOT CRS)** is the hub lock (tram + rail, separate platforms, footbridge connect).
3. **doNotGroup Nottingham Station tram vs. rail platforms.** NET tram viaduct is above the main-line railway — different infrastructure, different operators, different boarding areas.
4. **NET tram lines:** Line 1 (Hucknall — Beeston/Chilwell via city centre), Line 2 (Phoenix Park — city centre). No Line 3 passenger service. Both call Nottingham Station.
5. **No real-time tram feed found.** NET boards are schedule-only in v1. Confirm with Nottingham City Council whether real-time will be published (Keolis operator).
6. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.
7. **Through-running stations (Tamworth / Leicester / Kettering / Wellingborough / Chesterfield / Alfreton):** These are National Rail only. They may appear in both East Midlands and adjacent-region feeds if both regions include National Rail slices. Tamworth is a true shared platform (both regions' trains call the same platform) — flag for de-dup at D2. Leicester/Kettering/Wellingborough/Chesterfield/Alfreton are through-running pass-throughs, not merge points — same train operator continuing across regional boundary, not two separate operators on shared infrastructure.
8. **No buses, no MetroLink, no other operators in v1 scope.** Network Rail corridor between regions, Keolis sole operator on National Rail tracks.

## License

- **NET GTFS (DFT Bus Open Data Service):**
  - **License name:** Open Government Licence v3.0 (OGL 3.0).
  - **Redistribution / rehosting:** OGL 3.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially." Derived products allowed; redistribution to third-party users via Next Train API is permitted.
  - **Commercial use:** allowed under OGL 3.0.
  - **Attribution:** "Contains public sector information licensed under the Open Government Licence v3.0" or link to https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Name source as Department for Transport Bus Open Data Service and Nottingham Express Transit operator (Keolis).
  - **Terms URL:** https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Feed landing: https://data.bus-data.dft.gov.uk/downloads/ (aggregator); Transitland entry: https://www.transit.land/feeds/f-bus~dft~gov~uk.
  - **Confidence:** `clear` for GTFS static license. Feed is live 200 on DFT platform (verified 30 Aug 2026). No key required for download.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Keolis for train service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license.
