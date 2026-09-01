# Glasgow oracle clash report

D1 (research phase, as of 2026-09-01): **Glasgow Subway** (Strathclyde Partnership for Transport / SPT) operates a 15-station, single-circle metro system with 2 directional routes (Inner Circle and Outer Circle). Static GTFS via [TravelWhiz GB-Bus-Train-Metro-GTFS](https://github.com/travelwhiz-ltd/GB-Bus-Train-Metro-GTFS) community feed (`uk-busmetro-S.gtfs.zip`, Scotland region; Onestop ID in Transitland pending verification; license CC BY 4.0 for curated data, source datasets retain original licenses). Real-time: **no public GTFS-RT API confirmed** — SPT does not publish a real-time feed. **National Rail** (Darwin/OpenLDBWS) covers Glasgow Central (GLC) and Glasgow Queen Street (GLQ) rail terminals, requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/) (same account-level blocker as East Midlands / South Wales / other UK regions — EvansAppStudio registered with AU address, Tim re-registering with UK address). Subway and rail converge at **Buchanan Street subway station** (travelator/moving walkway connects directly to Queen Street rail platform).

## V1 scoping — Subway schedule-only, National Rail slot TBD

**Glasgow Subway assumption:** Schedule-only boards at all 15 Subway stations (Partick, Kelvinhall, Hillhead, Kelvinbridge, St George's Cross, Cowcaddens, Buchanan Street, St Enoch, Bridge Street, West Street, Shields Road, Kinning Park, Cessnock, Ibrox, Govan). System operates as a single circular line with two simultaneous directional routes (Outer Circle clockwise in orange; Inner Circle counterclockwise in blue). No real-time GTFS-RT feed found in public sources. Data sourced from TravelWhiz community GTFS feed; license clear but source data (SPT's own timetables) not formally published by SPT itself. **High skip risk:** Confirm with SPT whether official GTFS static and/or GTFS-RT feeds will be published (data@spt.co.uk or contact form); if not, Subway boards remain schedule-only pending TransXChange→GTFS conversion path or continue using TravelWhiz-aggregated feed.

**National Rail assumption:** Darwin departures at Glasgow Central (GLC) and Glasgow Queen Street (GLQ). Central serves cross-border services (Avanti West Coast to London Euston, Caledonian Sleeper, ScotRail through-running). Queen Street serves primarily Scottish regional services (ScotRail to Edinburgh, Aberdeen, Inverness, Oban, Mallaig, Carlisle). Account-level blocker: EvansAppStudio registered on Rail Data Marketplace with Australian company address; RDM rejects AU registrations for GB services. Tim re-registering with UK company address (same pattern as East Midlands / South Wales / West of England / South Yorkshire / North East / West Yorkshire this wave). Unblock first before wiring Darwin departures.

**Boundary:** Falkirk High (FKK) on the Glasgow–Edinburgh corridor marks the exclusive-territory split with the Edinburgh region — Glasgow's catalog owns its side only. No merged/shared board at boundary; Falkirk High is excluded from Glasgow catalog (owned by Edinburgh region D1).

## Station name table

Match rule: published Glasgow Subway stop name vs. National Rail station print (CRS code) vs. official SPT operator map.

| published (Subway / NR rail) | agency print | class |
| --- | --- | --- |
| Buchanan Street | Subway: Buchanan Street (busiest station); NR rail: Glasgow Queen Street station (GLQ CRS, directly accessible via travelator) | **hub lock** — interchange between Subway and National Rail. Travelator connects Buchanan Street Subway directly to Queen Street rail platform. |
| Glasgow Queen Street | Subway: not served (nearest: Buchanan Street via travelator); NR rail: Glasgow Queen Street (GLQ CRS) | **National Rail terminus** — Scottish regional services (ScotRail to Edinburgh, Aberdeen, Inverness). Direct travelator connection to Buchanan Street Subway. |
| Glasgow Central | Subway: not directly served (nearest: St Enoch and Buchanan Street within walk); NR rail: Glasgow Central (GLC CRS) | **National Rail terminus** — cross-border services (Avanti West Coast to London Euston, Caledonian Sleeper, ScotRail through-running). St Enoch and Buchanan Street Subway within short walk. |
| Partick | Subway: Partick (Outer Circle start) | Subway station only. |
| Kelvinhall | Subway: Kelvinhall | Subway station only. |
| Hillhead | Subway: Hillhead | Subway station only. |
| Kelvinbridge | Subway: Kelvinbridge | Subway station only. |
| St George's Cross | Subway: St George's Cross | Subway station only. |
| Cowcaddens | Subway: Cowcaddens | Subway station only. |
| St Enoch | Subway: St Enoch (within walk of Glasgow Central) | Subway station only; near Glasgow Central. |
| Bridge Street | Subway: Bridge Street | Subway station only. |
| West Street | Subway: West Street | Subway station only. |
| Shields Road | Subway: Shields Road | Subway station only. |
| Kinning Park | Subway: Kinning Park | Subway station only. |
| Cessnock | Subway: Cessnock | Subway station only. |
| Ibrox | Subway: Ibrox | Subway station only. |
| Govan | Subway: Govan | Subway station only. |

**Total: 15 Subway stations + 2 National Rail termini (Central and Queen Street)** in D1 scope. Falkirk High (FKK, boundary station 25 miles northeast) excluded (owned by Edinburgh region). No L3 / S-Bahn / metro-plus services other than Glasgow Subway.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail services only; Subway is schedule-only, not a rail service):**

**Glasgow Central (GLC):**
- **ScotRail regional/through-running services** (Edinburgh via Carstairs, Carlisle via Dumfries-Gretna): `in` (optional reservations; no compulsory booking)
- **Avanti West Coast to London Euston**: `in` (optional reservations only, despite staff encouragement at Glasgow Central — see evidence below)
- **Caledonian Sleeper London Euston–Glasgow Central**: `out-reservation` (compulsory sleeping-car reservation; berths/compartments non-negotiable)

**Glasgow Queen Street (GLQ):**
- **ScotRail regional services** (Edinburgh, Aberdeen via Dundee/Stonehaven, Inverness via Pitlochry/Aviemore, Oban via Crianlarich/Connel Ferry, Mallaig via Crianlarich/Fort William/Glenfinnan, Dumfries via Carlisle): `in` (optional reservations; walk-up boardable)

**No check-in barriers:** UK rail stations (Central and Queen Street) do not have airport-style check-in barriers; platform access is unrestricted. Ticket checking is conducted on-board or at low-level ticket gates (not pre-boarding).

**Glasgow Subway:** No rail services; all stations are Subway-only local metro service with no reservation or check-in gates. Board eligibility test does not apply to Subway as a mode; Subway boards are schedule-only.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **ScotRail Regional (Edinburgh/Carlisle direction)** | Glasgow Central, Glasgow Queen Street | No (optional only, not compulsory) | No | `in` | [ScotRail seat reservations policy](https://www.scotrail.co.uk/plan-your-journey/plan-your-journey); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — seat reservations optional for flexible tickets. Walk-up boarding permitted. |
| **Avanti West Coast (London Euston)** | Glasgow Central | No (technically optional; staff encourage reservations at station, but not compulsory) | No | `in` | [Avanti West Coast seat reservations](https://www.avantiwestcoast.co.uk/travel-information/onboard/seat-picker); [RailUK Forums: Avanti reservations policy](https://www.railforums.co.uk/threads/avanti-compulsory-reservations.249116/) — reservations not compulsory for Advance/Off-Peak/Anytime tickets, despite station staff encouragement. No boarding block without reservation. |
| **Caledonian Sleeper (London Euston–Glasgow Central)** | Glasgow Central | Yes (compulsory sleeping-car reservation; berth/compartment assignment mandatory) | No | `out-reservation` | [Caledonian Sleeper booking policy](https://www.sleeper.scot/destinations/a-z-destinations/glasgow/); [ShowMeTheJourney: UK sleeper trains](https://showmethejourney.com/travel-on/train/155-caledonian-sleeper-uk/) — all sleeping accommodations require advance reservation; no walk-up boarding. |

**Board eligibility summary:** ScotRail and Avanti West Coast services (all with optional reservations, no check-in barriers) pass both boarding-contract tests and are marked `in`. Caledonian Sleeper fails test 1 (compulsory reservation) and is marked `out-reservation`. **All verdicts recorded; no silent omissions.** Glasgow Subway is schedule-only and does not require service-level verdicts (no rail services, no reservation/check-in gates). **Once National Rail adapter is unblocked at Tim's account level (UK re-registration on RDM), Jim will wire Darwin departures to boards at both Central and Queen Street with these verdicts enforced in filtering logic.**

## H2 clash surface

**Glasgow Subway:** No product `lib/cities/glasgow/` exists. No live adapter. Static GTFS from TravelWhiz aggregator is schedule-only (daily refresh ~22:00–00:00 UTC). No published next-train GTFS-RT endpoint from SPT. Source data (TravelWhiz feed) is derived from official SPT timetables but aggregated by community; SPT does not publish official GTFS itself.

**National Rail:** Darwin/OpenLDBWS documented. ScotRail and Avanti West Coast service cards at Glasgow Central and Queen Street. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for East Midlands / South Wales / West of England / South Yorkshire / North East / West Yorkshire this wave; not a feed problem).

**Clash:** Schedule-only Subway (no RT source found) + account-blocked National Rail RT (unblock required before D1). Subway and National Rail converge at different infrastructure (Subway tunnel ↔ Queen Street platforms via travelator). Glasgow Central is separated from Subway by a short walk (St Enoch/Buchanan Street nearby). No multi-operator platform merging required; two termini serve different directional flows (Central: cross-border south/England; Queen Street: north/Scotland regional).

## C2/C3 to put in front of Luke

1. **city=glasgow** (or split by operator: `glasgow-subway` + `national-rail-glasgow` slice). Glasgow Subway = 15 circular metro stations. National Rail = Darwin departures at 2 termini (Central & Queen Street).

2. **Buchanan Street subway station (no CRS code; local identifier)** is the locked interchange point (Subway ↔ Queen Street rail via travelator). Not Glasgow Central, not Glasgow Queen Street alone — the Subway's hub is Buchanan Street, which connects to Queen Street rail.

3. **Glasgow Subway real-time feed status: UNKNOWN — DO NOT ASSUME.** Contact SPT directly (data@spt.co.uk or via spt.co.uk contact form) and confirm:
   - Whether public GTFS static feed will be published (currently relying on TravelWhiz aggregation).
   - Whether public GTFS-RT real-time feed will be published.
   - License/attribution terms if SPT provides feeds.
   - If neither public feed exists, Subway boards stay schedule-only pending TransXChange→GTFS conversion path or continue using TravelWhiz-aggregated feed.

4. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.

5. **Two National Rail termini in one city:** Glasgow Central (GLC, cross-border south) and Glasgow Queen Street (GLQ, regional north/Scotland). Not a single hub-lock; both are in-catalog. Central and Queen Street are separate buildings, not connected by rail. Central ↔ Queen Street: free bus via Buchanan bus station, or ~15–20 min walk, or Subway + travelator (Buchanan Street Subway → travelator → Queen Street platform).

6. **Buchanan Street subway is the natural Subway hub.** It is the busiest station (city-center), is directly connected to Queen Street via travelator, and is within short walk of Central. Recommend as hub-lock for Subway; flag to Luke that it connects to National Rail but is not a National Rail station itself.

7. **Falkirk High (FKK, boundary station):** Exclusive-territory split with Edinburgh region — Glasgow's catalog owns stations up to but not including Falkirk High. Services continue beyond Falkirk to Edinburgh but are not in Glasgow's scope.

8. **Board eligibility:** ScotRail + Avanti West Coast both in; Caledonian Sleeper out (compulsory reservation). Board tables above (§ Board eligibility) show all verdicts; no silent omissions.

9. **Subway-only stations:** All 15 Subway stations are served by Subway only (no National Rail services). No cross-mode platform merging. Buchanan Street is the exception: it hosts Subway + has travelator to Queen Street rail (but Queen Street is a separate transport hub, not shared infrastructure).

10. **No buses, no tram, no ferries in v1 scope.** Glasgow has bus services (operated by various companies via SPT) and tram options under review (subway is the only public-transport metro mode in v1).

11. **Europe/London HAS DST.** Official live path for National Rail is Darwin/OpenLDBWS via RDM subscription (free tier: 100,000 calls/month). Subway live path unknown pending feed confirmation.

## License

- **Glasgow Subway static GTFS (TravelWhiz):**
  - **License name:** Creative Commons Attribution 4.0 (CC BY 4.0) for TravelWhiz curated datasets and transformations; source datasets retain original licenses.
  - **Redistribution / rehosting:** CC BY 4.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially" with attribution. Derived products allowed; redistribution to third-party users via Next Train API is permitted under CC BY 4.0 baseline. **Caveat:** Source dataset (SPT's official timetables or derivative TransXChange data) may have its own licensing terms; TravelWhiz aggregates from Traveline TNDS, Bus Open Data Service (BODS), and other official sources, which may impose additional restrictions. Recommend clarifying with TravelWhiz/SPT whether source data permits public-API relay.
  - **Commercial use:** Allowed under CC BY 4.0 baseline.
  - **Attribution:** TravelWhiz GB-Bus-Train-Metro-GTFS project; Strathclyde Partnership for Transport (SPT) for source operator data. GitHub repository attribution: https://github.com/travelwhiz-ltd/GB-Bus-Train-Metro-GTFS.
  - **Terms URL:** https://github.com/travelwhiz-ltd/GB-Bus-Train-Metro-GTFS (repository with CC BY 4.0 license notice for curated data); original source terms depend on TNDS/BODS/OpenStreetMap contributions — see repository README.
  - **Confidence:** `unclear` on source-data redistribution. TravelWhiz's own curation is CC BY 4.0 (clear), but the underlying SPT timetable data (if derived from official TNDS or direct contact) may have separate terms. Tim should clarify with TravelWhiz and SPT whether redistributing the feed to third-party API consumers is permitted before launch. Current advisory: treat as clear for static feed download; add confidentiality flag for public-API relay pending clarification.

- **Glasgow Subway official GTFS (SPT):**
  - **License name:** Unknown — SPT does not appear to publish public GTFS data.
  - **Redistribution / rehosting:** Unknown.
  - **Commercial use:** Unknown.
  - **Attribution:** Unknown.
  - **Terms URL:** Contact SPT data team: data@spt.co.uk or spt.co.uk contact form. No public developer API or GTFS landing page confirmed.
  - **Confidence:** `not found`. SPT has not published a public static GTFS or GTFS-RT feed in any source checked (Transitland, Mobility Database, SPT website). Current data sourcing via TravelWhiz aggregation only. **This is a D1 blocker if SPT feed availability is required.** Do not assume SPT will publish GTFS; verify with SPT before proceeding past D1 pack stage.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. (See East Midlands / South Wales oracle-clash reports for parallel context.)
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. ScotRail and Avanti West Coast for train service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 2026-09-01). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration before DARWIN_LDB_TOKEN can be provisioned.
