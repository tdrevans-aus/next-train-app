# West Midlands oracle clash report

D1 (as of 2 Sep 2026): **National Rail** (Darwin/OpenLDBWS) covers West Midlands Combined Authority region (75 National Rail CRS stations: ORR 6329 base set, Camp Hill three new stations, plus Kidderminster as test station) and **West Midlands Metro** (35 Current Service stops, Birmingham–Wolverhampton light rail line). Darwin via [Rail Data Marketplace](https://raildata.org.uk/) using DARWIN_LDB_TOKEN (Onestop ID `f-nre-national_rail_enquiries_darwin_ldb_ws`). Metro real-time: **TfWM GTFS-RT trip_updates**, requires API portal registration at [api-portal.tfwm.org.uk](https://api-portal.tfwm.org.uk/) (Onestop ID `f-transport~for~west~midlands`; TFWM_API_APP_ID and TFWM_API_APP_KEY credentials). Services operated by **West Midlands Railway** (WMR) as primary National Rail operator; **London North Western Railway** (LNWR), **Avanti West Coast**, **CrossCountry**, **Chiltern Railways**, **Transport for Wales** (TfW), and **East Midlands Railway** (EMR) at regional boundaries.

## V1 scoping — National Rail + Metro schedule and realtime

**National Rail v1 assumption:** Schedule and realtime departures at National Rail stations via Darwin OpenLDBWS (DARWIN_LDB_TOKEN required). Multiple operators (WMR, LNWR, Avanti, CrossCountry, Chiltern, TfW, EMR at boundaries) all walk-up boardable. **Former account-level blocker resolved (2 Sep 2026):** Darwin OpenLDBWS is live via the `uk-darwin.js` REST rewrite (PR #188), verified with real departures at Bristol Temple Meads and Nottingham. West of England and East Midlands flipped live on it.

**West Midlands Metro v1 assumption:** Schedule and realtime departures at 35 Current Service stops via TfWM GTFS-RT. Walk-up, no reservation. **Credentials blocker:** TFWM_API_APP_ID and TFWM_API_APP_KEY not yet set on Tim's machine or in production. `lib/providers/uk-metro-wm.js` throws `MissingTfwmCredentialsError` so Metro board surfaces an explicit error rather than silently omitting the service (per board-eligibility principle — filter stations in, never trains off a board silently). Tim must register at TfWM API portal (`https://api-portal.tfwm.org.uk/`) and provide credentials before Metro board can display real-time.

## Hub lock

**Birmingham New Street (BHM, CRS code):** principal rail terminus for Birmingham city; all major National Rail services call here. CRS code: BHM. Coordinates: 52.4778°N 1.9002°W. All regional and inter-city departures.

## Station catalog summary

**National Rail:** 75 stations across West Midlands Combined Authority + Kidderminster (test station). Catalog sourced from ORR Table 6329 (31 Mar 2026 snapshot; Camp Hill three stations added 7 Apr 2026). Total: 71 ORR base + 3 Camp Hill (Moseley Village, Kings Heath, Pineapple Road) + 1 Kidderminster = 75 National Rail stations. All keyed by CRS code.

**West Midlands Metro:** 35 Current Service stops (Birmingham city centre to Wolverhampton via Dudley line, plus Birmingham extensions). Not National Rail; separate TfWM operation. Line names: line 1 (Birmingham–Wolverhampton via Dudley), line 2 (Birmingham–Wolverhampton via Brierley Hill via *future* Wednesbury–Brierley Hill extension, not yet open). Current service only; Wednesbury–Brierley Hill extension and Digbeth/Curzon Street stops are out-of-catalog (not open as of 2026-09-02, not listed on TfWM "Current Service" map).

## Hazards / skip risks

**National Rail account block:** resolved 2 Sep 2026 (Darwin live, PR #188). No longer a skip risk.

**Metro credentials:** TfWM API credentials (TFWM_API_APP_ID / TFWM_API_APP_KEY) not yet registered. `uk-metro-wm.js` adapter throws explicit error (MissingTfwmCredentialsError) so riders see a clear "credentials missing" message instead of a silent board omission. This is the correct behaviour per the board-eligibility rule. Tim must register at https://api-portal.tfwm.org.uk/ and provide credentials at flip time.

**Kidderminster Severn Valley Railway:** Kidderminster main-line station (KID, CRS code) shares a National Rail platform with Severn Valley Railway heritage services (steam trains, heritage carriages, volunteer-run operation). Severn Valley services do not pass the walk-up boarding contract test (heritage-museum experience, not a scheduled National Rail service). See board eligibility section, verdict `out-mode`.

**No sleeper services confirmed** at any in-catalog station.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail + Metro at in-catalog stations):**

**National Rail services at West Midlands stations:**
- **West Midlands Railway (regional services, primary operator):** `in` (walk-up, no compulsory reservation; open seating on regional services; confirmed via WMR help pages)
- **London North Western Railway (LNWR, Avanti franchise successor):** `in` (walk-up, no compulsory reservation; services to London and regional connections pass both tests)
- **Avanti West Coast (long-distance, no compulsory reservation):** `in` (walk-up long-distance services London–Manchester–Scotland pass both tests; optional reservations only; per board-eligibility rule, walk-up long-distance is `in` unless there is a real `out-product` reason)
- **CrossCountry (cross-regional services):** `in` (optional reservations only, walk-up boardable)
- **Chiltern Railways (Oxford line via Warwickshire):** `in` (optional reservations, walk-up boardable; confirmed via Chiltern Railways help pages)
- **Transport for Wales (TfW, boundary services to Wales):** `in` (walk-up regional services, no compulsory reservation; services at Kidderminster and south-border stations pass both tests)
- **East Midlands Railway (EMR, boundary services to East Midlands):** `in` (walk-up regional services, no compulsory reservation; through-running at boundary stations pass both tests)

**West Midlands Metro at 35 Current Service stops:**
- **West Midlands Metro Lines 1 & 2 (Birmingham–Wolverhampton, light rail):** `out-product` — Walk-up service (light rail, no reservation system), passes both boarding-contract tests, but excluded by product decision due to missing API credentials. **Credentials status:** TFWM_API_APP_ID and TFWM_API_APP_KEY not set. Board surfaces explicit error (`MissingTfwmCredentialsError` from `lib/providers/uk-metro-wm.js`) until Tim registers at [api-portal.tfwm.org.uk](https://api-portal.tfwm.org.uk/) and provides credentials. **Reason:** "TfWM API credentials not yet registered (TFWM_API_APP_ID/TFWM_API_APP_KEY unset); board surfaces an explicit error until Tim registers at the TfWM API portal and confirms this verdict at flip-PR merge time."

**Kidderminster special case:**
- **Severn Valley Railway heritage services (steam/heritage diesel trains at Kidderminster):** `out-mode` — Shares platform with National Rail at Kidderminster (KID). Severn Valley is a volunteer-run heritage railway (see https://svr.co.uk/), not a National Rail walk-up board service. Runs steam locomotives and heritage carriages on select timetabled dates (seasonal operation, not a daily commute or inter-city service). Does not pass the walk-up boarding contract test because services are museum-experience themed (not standard ticketing, heritage-only operation). **Reason:** "Heritage railway, not a National Rail walk-up board service; operates steam/heritage-only trains outside standard ticketing. Severn Valley Railway services are excluded; National Rail services at Kidderminster (WMR / Chiltern / CrossCountry / TfW call KID) are included as `in`."

**Stations with multi-operator National Rail:**
All 75 National Rail stations support multiple TOC services (Darwin returns all calling services per operator code). No physical tram/rail split like East Midlands Nottingham. Dozing by operator or line code at hub stations is not required for v1 (single "National Rail" board per platform).

**No check-in barriers:** Platform access at all in-catalog stations is unrestricted. Ticket checking is on-board by conductors (National Rail) or low-level gating (Metro). Walk-up boarding is unobstructed for all `in` services.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **West Midlands Railway (regional services)** | All 75 National Rail stations; primary operator | No (walk-up, open seating, no compulsory reservation on regional services) | No | `in` | [WMR help pages](https://www.westmidlandsrailway.co.uk/); walk-up boarding available on all services |
| **London North Western Railway (LNWR)** | Nationwide coverage at WM stations; successor to Avanti franchise responsibilities for regional services | No (walk-up, no compulsory reservation on regional and semi-fast services) | No | `in` | [LNWR services info](https://www.lnwr.co.uk/); walk-up boardable |
| **Avanti West Coast (long-distance)** | Principal operator London–Manchester–Glasgow line via WM hubs (Birmingham New Street, Wolverhampton) | No (long-distance, walk-up, optional reservations only; no compulsory reservation) | No | `in` | [Avanti West Coast reservations info](https://www.avantiwestcoast.co.uk/); walk-up long-distance per board-eligibility rule |
| **CrossCountry (cross-regional services)** | Services via WM stations on cross-country routes (e.g. Manchester–Bristol via Birmingham) | No (optional reservations only; walk-up boardable) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); walk-up boardable |
| **Chiltern Railways (Oxford line)** | Warwickshire / Midlands services via Stratford-upon-Avon line into WM region; optional £3 reservations | No (optional reservation at £3 cost; walk-up boardable without pre-booking) | No | `in` | [Chiltern Railways help pages](https://www.chilternrailways.co.uk/); walk-up boarding available |
| **Transport for Wales (TfW, South Wales services)** | South Wales to Kidderminster / border services | No (walk-up, no compulsory reservation on regional services) | No | `in` | [TfW services info](https://www.tfw.wales/); walk-up boardable |
| **East Midlands Railway (boundary services)** | East Midlands region through-running at boundary stations (Tamworth, etc.) | No (walk-up, open seating, no compulsory reservation on regional services) | No | `in` | [EMR help pages](https://www.eastmidlandsrailway.co.uk/); walk-up boarding available |
| **West Midlands Metro Line 1 & 2 (light rail, Birmingham–Wolverhampton)** | 35 Current Service stops (Birmingham city centre to Wolverhampton) | No (walk-up only, light rail with no reservation system) | No | `out-product` | Credentials missing (TFWM_API_APP_ID/TFWM_API_APP_KEY unset). Tim must register at [api-portal.tfwm.org.uk](https://api-portal.tfwm.org.uk/). Board surfaces explicit error until credentials are provided and verdict confirmed at flip-PR merge. |
| **Severn Valley Railway (heritage trains, Kidderminster only)** | Kidderminster station (KID) only; shares platform with National Rail | N/A (heritage experience, not standard ticketing) | No | `out-mode` | [Severn Valley Railway](https://svr.co.uk/); heritage railway volunteer-run operation, steam/heritage-only trains, not a walk-up National Rail board service. |

**Board eligibility summary:** All walk-up National Rail services (WMR, LNWR, Avanti, CrossCountry, Chiltern, TfW, EMR) calling at West Midlands stations pass both boarding-contract tests (`in` verdicts recorded). West Midlands Metro passes both tests but is excluded by product decision due to missing API credentials (`out-product` verdict recorded; board surfaces explicit error). Severn Valley Railway heritage services at Kidderminster are excluded as non-National-Rail heritage operation (`out-mode` verdict recorded). **All verdicts decided; no silent omissions. Tim's approval of TfWM credentials status and Metro error-surfacing approach to be confirmed at flip-PR merge time.**

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. See East Midlands report (same feed) for identical licence ambiguity.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. WMR / LNWR / Avanti / CrossCountry / Chiltern / TfW / EMR for train service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim accepted this same ambiguity when flipping West of England and East Midlands live on 2 Sep 2026; the same acceptance applies here.

- **West Midlands Metro / TfWM GTFS-RT:**
  - **License name:** Not confirmed in public TfWM API documentation (checked api-portal.tfwm.org.uk on 2 Sep 2026).
  - **Redistribution / rehosting:** TfWM API portal documentation (https://api-portal.tfwm.org.uk/docs) does not include an explicit public license statement. API access appears to be governed by API portal registration terms (developer account agreement). Operative clause unclear.
  - **Commercial use:** Unclear; depends on TfWM's API terms of service.
  - **Attribution:** Transport for West Midlands (TfWM). West Midlands Metro operator.
  - **Terms URL:** https://api-portal.tfwm.org.uk/ (registration required to view full API terms). TfWM main page: https://www.tfwm.org.uk/.
  - **Confidence:** `unclear` on both redistribution and commercial use. The TfWM API portal requires registration and does not publish terms in a static landing page. Tim must review the API platform agreement once TfWM credentials are registered. Do not assume public GTFS-RT availability permits redistribution; confirm with TfWM before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token (Rail Data Marketplace Consumer key), not a secret API key; no HMAC or signature. Free tier: 5 million requests / 4-week railway period, then charged. Subscription terms govern API use, not a separate data license. TFWM credentials (TFWM_API_APP_ID / TFWM_API_APP_KEY) are API portal registration tokens; account terms govern use.
