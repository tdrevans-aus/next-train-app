# Prague — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** Scoped, **planned**. **city id:** `prague` (do not invent `praha`, `pida`, `pid`, or merge into another Czech city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Pražská integrovaná doprava (PID) — Prague Integrated Transport. Operator: DPP (Dopravní podnik hlavního města Prahy — Prague Public Transit Company) for metro, trams, trolleybuses. Coordinated by ROPID (Regionální organizace Pražské integrované dopravy). |
| Official map | Network maps at https://pid.cz/en/ and metro-specific map at [pid.cz transport schemes](https://pid.cz/en/). Wikipedia List of Prague Metro stations: https://en.wikipedia.org/wiki/List_of_Prague_Metro_stations (61 stations total, three lines A/B/C). |
| Static GTFS | **Live 200 application/zip** (verified 2026-08-28): https://data.pid.cz/PID_GTFS.zip — no key required. Updated daily ~4:00–4:30 UTC per PID opendata. Transitland Onestop **f-u2f-pražskáintegrovanádoprava** (operator **o-u2f-pražskáintegrovanádoprava**) confirmed working. Mobility Database **mdb-860** (official). Feed covers all PID modes (metro A–C, trams, buses, trolleybuses, regional rail, funicular, ferries). v1 adapter filters metro A/B/C only. |
| GTFS-RT / live | **Golemio API, not GTFS-RT.** Prague publishes real-time via Golemio (api.golemio.cz, operated by Operator ICT), not as GTFS-RT protobuf. Endpoints include vehicle positions and stop departure boards. No public GTFS-RT feed confirmed. Live data requires X-Access-Token (API key). Golemio free registration: https://api.golemio.cz/api-keys (free tier; email verification required). API documentation: https://api.golemio.cz/docs/openapi/. |
| Auth | Static GTFS: none (anonymous 200). Golemio RT: **X-Access-Token** header (JWT/API key from free registration). Registration required, non-commercial tier available. Key is personal and non-transferable. |
| Timezone | Europe/Prague (UTC+1 standard / UTC+2 DST; last Sunday of March / October). |

## v1 mode cut

**Metro A, B, C only:** Official heavy metro **3 lines, 61 stations**. Three-line interchange triangle: **Muzeum** (lines A/C), **Můstek** (lines A/B), **Florenc** (lines B/C). **Out:** Line D (under construction; first section not expected until 2031–2032; no passenger service as of 2026). Out: tram; bus; trolleybus; funicular (Petřín); regional rail (Esko); ferries; bike-sharing.

**Tracker discrepancy note:** The expansion tracker row lists "Metro A–C + Esko" in the network field but notes "Metro A/B/C/D" in the v1 mode. **Verify:** Line D is under construction with no passenger service; Esko is regional rail, explicitly out per tracker "no tram, bus, funicular, Esko." This report follows the detailed tracker note: **A/B/C only, no D, no Esko.**

Hub lock: **Muzeum** (lines **A × C**) — major interchange beneath Wenceslas Square / National Museum building. Opened Line C section 1974, Line A section 1978. Alternative: **Můstek** (lines **A × B**), also central. Tracker lists both; Muzeum listed first. No single station serves all three lines (unlike Brussels or Copenhagen). Recommend **Muzeum** as hub-lock; **Můstek** as doNotGroup secondary.

**Board eligibility (v1 metro A/B/C):** Prague Metro operates on an honor system with open walk-up boarding (no turnstiles, no check-in barriers, no seat reservations). Tickets are validated manually before boarding at yellow validators; on-board inspectors check compliance. Compulsory reservation does not apply. All three lines pass board-eligibility test 1 (walk-up boardable) and test 2 (no check-in barrier).

## Skip risk

Golemio API key required for live path; registration is free but must be completed before D1 can wire real-time. Line D tracker mention is stale — confirm D is out-of-scope (under construction, no passenger service). Verify Golemio API endpoint coverage for PID departures and vehicle positions at D1. No known blocker; key friction is manageable if Golemio registration and API stability are confirmed.

## H2 — who has line codes and coverage

| surface | A/B/C? | what it actually has |
| --- | --- | --- |
| PID official map (pid.cz) | **yes** | Three lines: A (green, 17 stations), B (yellow, 24 stations), C (red, 20 stations). Interchange triangle marked. Line D not shown (not yet open). |
| Wikipedia Prague Metro station list | **yes** | All 61 stations named, line membership, opening dates. Interchange hubs explicit (Muzeum A/C, Můstek A/B, Florenc B/C). |
| PID GTFS static (data.pid.cz) | **yes** (with filter) | Full national feed: all PID modes. Includes all three metro agencies/routes. Adapter filters route_type=1 (rail) and agency "DPP metro" (or confirmed name). |
| Golemio API departures | confirmed path | Real-time via free-tier API key. Endpoint coverage for metro departures to be verified at D1. |

**H2 conclusion:** Passenger line codes (A, B, C) and station rosters already documented on official PID map and Wikipedia. Clash is **mode filtering** (PID GTFS includes tram/bus/regional; metro extract only), **real-time feed choice** (Golemio API vs unconfirmed GTFS-RT), and **three-line interchange routing** (Muzeum, Můstek, Florenc require doNotGroup directives). Do not generate `published-network.json` from `routes.txt`. Confirm Golemio API production stability at D1.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (metro services only; trams/buses/regional out-of-mode):**
- **Metro Line A (Nemocnice Motol – Depo Hostivař, 17 stations)**: `in` (walk-up public metro; open honor system)
- **Metro Line B (Zličín – Černý Most, 24 stations)**: `in` (walk-up public metro; open honor system)
- **Metro Line C (Letňany – Háje, 20 stations)**: `in` (walk-up public metro; open honor system)

**No check-in barriers or restrictions:** Platform access at all 61 catalog metro stations is unrestricted. Ticket validation is pre-boarding via yellow validators (not gate barriers). No security gates, no turnstiles, no border control. On-board inspectors enforce fare compliance; walk-up boarding is unobstructed for all three lines.

**All three lines are public transport with walk-up boardable access — no compulsory seating reservations, no check-in barriers, no compulsory advance booking.** All verdicts recorded; no silent omissions. One metro operator (DPP) with three line codes and unified boarding logic across A/B/C.

## Station name table (locks + known clashes)

Match rule: Official PID published name vs GTFS stop_name. `rename` = same place, different printed string.

| published (D1) | line(s) | class |
| --- | --- | --- |
| Muzeum | A, C | **match (interchange lock)**. Two-line interchange beneath Wenceslas Square. Hub A × C. |
| Můstek | A, B | **match (interchange secondary)**. Central interchange. Hub A × B. doNotGroup Muzeum. |
| Florenc | B, C | **match (interchange)**. Third vertex of triangle. Hub B × C. doNotGroup vs Muzeum / Můstek. |
| [All other 58 D1 stations] | A / B / C individually | match; no overlapping services |

**61 unique D1 metro names. No product `lib/cities/prague/` yet. `assertCityLive("prague")` is Unknown city.**

## C2/C3 to put in front of Jim

1. **city=prague**. Operator: DPP (metro), ROPID (coordinator). Not `praha`, not `pida`. Do not merge into multi-city Czech adapter.

2. **Muzeum** is the locked two-line interchange (A × C; central hub beneath Wenceslas Square). **Můstek** is secondary (A × B). **Florenc** is third (B × C; do not conflate). No single station on all three lines.

3. **Three-line metro A/B/C only.** No Line D (under construction, no passenger service as of 2026). No tram, bus, regional rail (Esko), funicular, ferries. Filter PID GTFS by metro routes only.

4. **doNotGroup directives:**
   - **Muzeum (A/C):** One platform group. Do not merge with Můstek or Florenc.
   - **Můstek (A/B):** One platform group. Do not merge with Muzeum or Florenc.
   - **Florenc (B/C):** One platform group. Do not merge with Muzeum or Můstek.

5. **Real-time feed:** Golemio API (api.golemio.cz) via X-Access-Token header. Free registration required. No public GTFS-RT confirmed. Verify API endpoint coverage for departure boards and vehicle positions at D1.

6. **Europe/Prague timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

7. **61 unique Metro stations.** Line A: 17 stations (green line, northwest–east corridor). Line B: 24 stations (yellow line, southwest–northeast; longest line). Line C: 20 stations (red line, north–southeast; oldest line). No additional services; metro only.

8. **Adapter architecture:** DPP operator single metro agency. One line-code and direction model. Real-time via Golemio API (free-tier, non-commercial). Status stays **planned** until Mark's QA full pass.

9. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## License

| field | value |
| --- | --- |
| License name | **CC BY 4.0** (Creative Commons Attribution 4.0) for static GTFS feed per PID opendata. Golemio API data: likely CC-BY or similar (Prague open data license); formal terms to be confirmed. |
| Redistribution / rehosting | PID GTFS: CC BY 4.0 allows free reuse including commercial, provided attribution is given. May be served to our users and passed to third parties with attribution. Golemio API: free-tier terms to be verified at D1 — likely permits query results to be displayed to end users but not to resell the raw data itself. |
| Commercial use | **Allowed** under CC BY 4.0 for static GTFS. Golemio API registration: free tier is non-commercial; verify API ToS whether derivative products (boarding boards, schedules) are permitted. |
| Attribution | **PID GTFS:** CC BY 4.0 requires attribution to source and date of update (e.g., "Data from Pražská integrovaná doprava (PID), updated [date]"). Golemio API: likely requires credit to Operator ICT / Prague open data platform. |
| Terms URL | **PID GTFS:** [PID Opendata](https://pid.cz/en/opendata/) (official feed source). [Transitland feed: f-u2f-pražskáintegrovanádoprava](https://www.transit.land/feeds/f-u2f-pražskáintegrovanádoprava). [Mobility Database: mdb-860](https://mobilitydatabase.org/feeds/gtfs/mdb-860). **Golemio API:** [Golemio API documentation](https://api.golemio.cz/docs/openapi/). [Golemio API key management](https://api.golemio.cz/api-keys). [Golemio open data documentation](https://operator-ict.gitlab.io/golemio/documentation/en/open-data-api/). **CC BY 4.0 deed:** [creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/). |
| Keyed API (Golemio) | Free registration at https://api.golemio.cz/api-keys (email verification; free tier available). Key is personal and non-transferable. Non-commercial tier. **Confirm usage terms and commercial exemption in Golemio API ToS at registration time.** API key agreement likely restricts redistribution to own product only (not third-party sublicense). |
| Confidence | **Clear** for static GTFS (CC BY 4.0 explicit on PID opendata and confirmed by Transitland). **Requires verification** for Golemio API (license terms accessible only via registration; non-commercial tier may restrict commercial use of boarding boards). Recommend Tim review Golemio API ToS before D1 wiring. Do not interpret current finding as permitted for commercial products. |

## What I did not do

No adapter code, no line-map generation, no station hand-transcription from PID map, no GTFS extraction of station arrays, no live city flip, no GitHub PR, no Golemio API key testing (that's D1), no timezone deep-dive on Golemio timestamps, no product `lib/cities/prague/`, no stopIds in published JSON, no research into regional Esko services or future Line D operations.

Sources:
- [Transitland: Pražská integrovaná doprava (PID) operator](https://www.transit.land/operators/o-u2f-pra%C5%BEsk%C3%A1integrovan%C3%A1doprava)
- [Transitland: PID GTFS feed](https://www.transit.land/feeds/f-u2f-pra%C5%BEsk%C3%A1integrovan%C3%A1doprava)
- [Mobility Database: Prazska integrovana doprava (PID) GTFS Schedule Feed](https://mobilitydatabase.org/feeds/gtfs/mdb-860)
- [PID Open Data](https://pid.cz/en/opendata/)
- [Wikipedia: Prague Integrated Transport](https://en.wikipedia.org/wiki/Prague_Integrated_Transport)
- [Wikipedia: List of Prague Metro stations](https://en.wikipedia.org/wiki/List_of_Prague_Metro_stations)
- [Wikipedia: Muzeum (Prague Metro)](https://en.wikipedia.org/wiki/Muzeum_(Prague_Metro))
- [Wikipedia: Line D (Prague Metro)](https://en.wikipedia.org/wiki/Line_D_(Prague_Metro))
- [Wikipedia: Prague Metro](https://en.wikipedia.org/wiki/Prague_Metro)
- [Golemio API Documentation](https://api.golemio.cz/docs/openapi/)
- [Golemio Open Data API Documentation](https://operator-ict.gitlab.io/golemio/documentation/en/open-data-api/)
- [Prague Public Transport Information](https://prague.eu/en/public-transport/)
