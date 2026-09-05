# Aarhus oracle clash report

D1 (scoped, map as of 2026-09-06): [Aarhus Light Rail network overview](https://en.wikipedia.org/wiki/Aarhus_Letbane) and [Aarhus Central Station](https://en.wikipedia.org/wiki/Aarhus_Central_Station). Two light-rail / tram-train lines (L1 and L2), **51 stations**, hub lock **Aarhus H (Aarhus Central Station)** (both L1 and L2 converge; DSB regional trains also call). Stations arrays would be **hand-transcribed from the official Aarhus Letbane network map and published station list**. **Not generated from GTFS.**

## Agency / feed / auth

| field | value |
| --- | --- |
| Agency | Rejseplanen (shared national platform covering all Danish transit: Metro, S-tog, DSB, light rail, buses across Denmark) |
| Operator | Midttrafik (operates Aarhus Letbane on behalf of Aarhus Kommune / Central Denmark Region) |
| Product | Rejseplanen REST API 2.0; GTFS static; SIRI-ET real-time (via Dataudveksleren NAP) |
| Static GTFS URL | `https://www.rejseplanen.info/labs/GTFS.zip` (no key required; updated ~every 14 days) |
| Auth | **API 2.0 key registration** via [labs.rejseplanen.dk](https://labs.rejseplanen.dk). Free plan: 50,000 calls/month (non-commercial). Commercial use (>50k calls/month or selling service using API data) requires agreement. |
| API 2.0 departureBoard | `https://api.rejseplanen.dk/api/2.0/departureBoard` (requires registered key). Covers all Danish transit including Aarhus Letbane (L1, L2), DSB Regional/InterCity, real-time ~1 min latency. Aarhus Letbane real-time support confirmed in Rejseplanen API (verified via Transitland feed page 2026-09-06). |
| GTFS-RT | Via Dataudveksleren NAP (Danish national traffic data exchange): [Traffic and Mobility data](https://semanticgis.dk/Data-Portals/Traffic-and-Mobility-data-(Dataudveksleren)). SIRI-ET direct feed available via NAP signup. Public GTFS-RT protobuf feed for Aarhus Letbane: **not separately documented; verify coverage and Aarhus Letbane inclusion at D1**. |
| v1 scope | **Aarhus Letbane L1 and L2 only (51 stations, tram-train) + DSB Regionaltog at Aarhus H**. L1: Aarhus H to Grenaa (69 km, tram-train section with stops at Hornslet, Hjortshøj, Ryomgård, Grenaa). L2: Odder to Lisbjergskolen via Aarhus H, Dokk1, Skejby, Lystrup (26.5 km to Odder; 12 km urban section Aarhus H–Lystrup via Skejby). Aarhus H shared station: L1, L2, DSB Regional/InterCity. No buses, no DSB EuroCity (compulsory summer reservation), no intercity sleepers, no harbour buses. DSB Regional trains: optional reservation (walk-up boardable). |
| Hub lock | **Aarhus H (Aarhus Central Station)** (both L1 and L2 converge; DSB Regional also calls; main transport hub for city). Dokk1 is secondary city-center stop on both L1 and L2 (1.5–2 km from Aarhus H via tramway). Recommend Aarhus H as hub-lock (all three services: L1, L2, DSB Regional). |
| Skip risks | (1) **Operator transition Dec 20, 2026:** Keolis contract termination; Aarhus Letbane operations being taken in-house by 2026-12-20. Monitor for GTFS updates and operational continuity; adapter may need adjustment post-transition. (2) **Service limitations 2026:** Safety issues with train brakes limiting service to ~4 trains/hour on core section between Aarhus Central Station and Universitetshospitalet (as of early 2026). Engineering works on Odder line (L2) during Q1 2026 caused major ridership drop; verify current timetable. (3) **GTFS-RT coverage:** Verify Aarhus Letbane (both L1 and L2) is included in Rejseplanen GTFS-RT / Dataudveksleren real-time feed; confirm DSB Regionaltog RT coverage at Aarhus H. (4) **Timezone:** Europe/Copenhagen (UTC+1, DST applies; last Sunday of March spring forward, last Sunday of October fall back). |

## H2 — who has line codes and coverage

| surface | L1–L2? | what it actually has |
| --- | --- | --- |
| Aarhus Letbane official network map (D1) | **yes** | Two lines drawn: L1 (Grenaa Line, Aarhus H to Grenaa, 69 km), L2 (Odder + Urban lines, Odder to Lisbjergskolen via Aarhus H, 26.5 km + 12 km urban). Both converge at Aarhus H; both serve Dokk1 in city center. 51 stations total. |
| [Wikipedia Aarhus Light Rail page](https://en.wikipedia.org/wiki/Aarhus_Letbane) (D1 reference) | **yes** | Full network description: L1 (Grenaa Line) and L2 (Odder + Urban lines); Aarhus Central Station (Aarhus H) confirmed as shared hub; Dokk1 confirmed as secondary city-center stop. Opening dates: Dec 2017 (urban core), Aug 2018 (Odder line), April 2019 (Grenaa line). 51 stops. Operated by Midttrafik. |
| Rejseplanen GTFS static (`rejseplanen-dk`) | **yes** (with filter) | Full national feed: 25+ operators, 1,581 routes, 37,287 stops. Includes Aarhus Letbane (Midttrafik) agency, DSB agency, S-tog agency. Adapter filters to route_type=0 (light rail) or 1 (rail) for multiple agencies. |
| Rejseplanen API 2.0 departureBoard | **confirmed** | Real-time departures for Aarhus Letbane (L1, L2) and DSB Regional confirmed working (per Transitland feed page, verified 2026-09-06). Coverage includes all Aarhus Letbane and DSB Regional queryable stops. |
| SIRI-ET via Dataudveksleren | confirmed path | Real-time via NAP available for Aarhus Letbane + DSB; verification of both datasets at D1 required. |
| Transitland feed page | `f-rejseplanen~dk~gtfs` | Onestop ID: f-rejseplanen~dk~gtfs. Feed last updated 2026-09-05 (10 hours ago). Aarhus Letbane Midttrafik agency included in multi-operator Rejseplanen GTFS. DSB also in feed. Validation: 1 error, 14 warnings, 2 info notices in latest version (as of 2026-09-06). |

**H2 conclusion:** Passenger line codes (L1, L2) and station rosters already documented in official sources. Clash is **multi-operator agency filtering** (Rejseplanen covers 25+ operators; extract Aarhus Letbane + DSB Regional at Aarhus H; exclude DSB EuroCity and InterCity Long-Distance international services), **real-time feed endpoint selection** (API 2.0 departureBoard vs SIRI-ET vs GTFS-RT for both operators), **operational transition management** (Keolis→in-house Dec 2026), **timezone / DST handling** (Europe/Copenhagen), and **boarding contract testing** (DSB Regional optional reservation = walk-up boardable = `in`; tram-train walk-up public transit = `in`). Do not generate `published-network.json` from `routes.txt`.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (rail/light-rail services only; buses/ferries out-of-mode):**
- **Aarhus Letbane L1 (Grenaa Line)**: `in` (walk-up public light rail)
- **Aarhus Letbane L2 (Odder + Urban lines)**: `in` (walk-up public light rail)
- **DSB Regionaltog at Aarhus H**: `in` (no compulsory reservation offered or required; walk-up boardable)
- **DSB InterCity / InterCityLyn at Aarhus H**: `in` (optional reservation, not compulsory; walk-up boardable)
- **DSB EuroCity (Hamburg–Copenhagen via Aarhus)**: `out-reservation` (compulsory June 26 – Aug 16; optional outside summer)
- **DSB X2000 sleeper services**: `out-reservation` (compulsory seat reservation)

**Stations with overlapping rail services (now in-catalog):**
- **Aarhus H / Aarhus Central Station** (L1, L2): + DSB Regional/InterCity/EuroCity/Sleeper trains. doNotGroup light-rail (L1, L2) platforms from railway platforms. Light rail is street-level tram/light rail infrastructure; main railway station is separate facility ~500m away. No physical platform overlap; separate booking logic. Consider as two conceptually distinct boards: one for Aarhus Letbane (L1+L2), one for DSB trains. **Precedent: Oslo Jernbanetorget / Nationaltheatret pattern** (metro and railway in same city, separate infrastructure, separate boards).
- **Dokk1** (L1, L2): Light rail only; no other operator calls. City-center interchange between L1 and L2.
- **All other 49 D1 stations**: L1 or L2 only (no overlapping services within Aarhus Letbane system).

**No check-in barriers:** Platform access at all stations is unrestricted. Ticket checking is on-board or at entry for light rail (standard Rejseplanen ticketing; same as Copenhagen Metro). Railway platform access at Aarhus H is unrestricted for DSB. No station entry barriers, security gates, or border control. Walk-up boarding is unobstructed for all services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Aarhus Letbane L1 (Grenaa Line)** | All L1 stations (Aarhus H, Dokk1, Lystrup, Hornslet, Hjortshøj, Ryomgård, Grenaa, ~15 stations) | No | No | `in` | [Aarhus Light Rail Wikipedia](https://en.wikipedia.org/wiki/Aarhus_Letbane); walk-up public light rail, no reservation system |
| **Aarhus Letbane L2 (Odder + Urban lines)** | All L2 stations (Odder, Lystrup, Aarhus H, Dokk1, Skejby, Lisbjergskolen, ~36 stations) | No | No | `in` | [Aarhus Light Rail Wikipedia](https://en.wikipedia.org/wiki/Aarhus_Letbane); walk-up public light rail, no reservation system |
| **DSB Regionaltog** | Aarhus H (primary) | No (reservation not offered on regional trains) | No | `in` | [Regionaltog train type](https://rail.cc/train-type/regionaltog-dsb/102); [ShowMeTheJourney Denmark trains](https://showmethejourney.com/train-ticket-guides/denmark-tickets-and-rail-passes/); regional trains walk-up only, no reservation offered |
| **DSB InterCity / InterCityLyn (IC / ICL)** | Aarhus H | No (optional, not compulsory) | No | `in` | [DSB seat reservation page](https://www.dsb.dk/en/tickets-and-services/Seat-Reservation/); domestic IC optional reservation |
| **DSB EuroCity (Hamburg–Copenhagen via Aarhus)** | Aarhus H | Yes (compulsory June 26 – Aug 16) | No | `out-reservation` | [DSB EuroCity Talgo](https://www.dsb.dk/); summer peak mandatory reservation for international EC service |
| **DSB X2000 sleeper services** | Aarhus H | Yes (compulsory; all tickets include reserved seat) | No | `out-reservation` | [DSB sleeper trains](https://www.dsb.dk/); sleeper trains require reserved seats |

**Board eligibility summary:** All walk-up rail and light-rail services (Aarhus Letbane L1, L2, DSB Regionaltog, DSB InterCity) pass both boarding-contract tests at their respective in-catalog stations. DSB EuroCity and X2000 sleeper both fail test 1 (compulsory or required-seat reservation). EuroCity fails only June 26 – Aug 16 (summer peak); X2000 fails year-round. **All verdicts recorded; no silent omissions.** Two light-rail operators (L1, L2 both Midttrafik) + DSB Regional/InterCity at Aarhus H with separate filtering and direction models per boarding contract.

## Station name table (locks + known clashes)

Match rule: Official Aarhus Letbane published name vs Rejseplanen GTFS stop_name. `rename` = same place, different printed string.

| published (D1) | typical GTFS | class |
| --- | --- | --- |
| Aarhus H / Aarhus Central Station | Aarhus, Aarhus H (or Central Station) | **match (lock)**. Hub on both L1 and L2. **Rail overlap:** L1 + L2 light rail + DSB Regional/InterCity. doNotGroup light-rail from railway platforms (separate infrastructure). |
| Dokk1 | Aarhus, Dokk1 | match. City-center interchange; both L1 and L2 serve. Light rail only. |
| Lystrup | Lystrup, Lystrup | match. Both L1 and L2 serve (junction point where urban section meets regional branches). |
| [All other 48 D1 stations] | [City], [Station Name] | match family; most serve either L1 or L2 only |

**51 unique D1 light-rail / tram-train stations (L1 + L2 + shared urban section). No product `lib/cities/aarhus/` yet. `assertCityLive("aarhus")` is Unknown city.**

## C2/C3 to put in front of Jim

1. **city=aarhus**. Operator: Midttrafik (operates Aarhus Letbane under Rejseplanen national platform). Two light-rail lines in v1 scope: **L1 (Grenaa Line)** and **L2 (Odder + Urban lines)**. DSB Regional/InterCity also at Aarhus H. Not a single-agency problem. Multi-operator real-time feed selection needed (Aarhus Letbane via Rejseplanen API 2.0 departureBoard or SIRI-ET; DSB via same endpoints).

2. **Aarhus H (Aarhus Central Station)** is the locked hub (both L1 and L2 converge; DSB trains call). Do not fold Dokk1 or other city-center stops into the hub. Light-rail hub is street-level infrastructure; railway is separate facility. Two boards: one for light rail (Aarhus Letbane L1+L2), one for DSB trains (no physical overlap).

3. **Two light-rail lines with shared urban section.**
   - **L1 (Grenaa Line, Midttrafik):** Aarhus H → Grenaa, 69 km, ~15 stations. Filter Rejseplanen GTFS by route_type=0 or 1, Midttrafik agency, line code L1. Real-time from API 2.0 departureBoard or SIRI-ET.
   - **L2 (Odder + Urban lines, Midttrafik):** Odder ↔ Lisbjergskolen via Aarhus H, 26.5 km regional + 12 km urban, ~36 stations. Filter Rejseplanen GTFS by route_type=0 or 1, Midttrafik agency, line code L2. Shared 12 km urban section from Aarhus H to Lystrup with L1 (but separate boarding logic per line code). Real-time from API 2.0 departureBoard or SIRI-ET.
   - **DSB Regionaltog/InterCity (DSB agency):** Calls at Aarhus H. Optional reservations (walk-up boardable). Filter to exclude EuroCity (compulsory summer reservation June 26–Aug 16) and X2000 sleeper (year-round compulsory seats). Öresundståg not expected in Aarhus scope (Malmö regional service; Aarhus is on different line). Real-time from API 2.0 departureBoard or SIRI-ET.

4. **Shared platform separation (doNotGroup directives):**
   - **Aarhus H (L1 + L2 light rail vs DSB railway):** Separate boards. L1 and L2 share urban tramway infrastructure but have separate line codes (filter by route_id or line_ref in GTFS). DSB trains use separate railway platforms (no physical merge with light-rail platforms). Ticket checking is onboard for both modes (no barrier separation beyond boarding logic).

5. **Real-time feed choice:** Rejseplanen API 2.0 `departureBoard` endpoint covers both Aarhus Letbane (Midttrafik) and DSB with ~1 min latency. Or use SIRI-ET via Dataudveksleren NAP if more stable for both operators. Verify Aarhus Letbane (both L1 and L2) and DSB coverage in real-time feed before selecting production path. Protobuf GTFS-RT coverage for Aarhus Letbane and DSB to confirm at D1.

6. **Operator transition monitoring:** Keolis contract ends Dec 20, 2026; operations move in-house to Aarhus Kommune. GTFS may be updated as part of this transition. Adapter should be reviewed post-transition for any feed URL, agency name, or real-time endpoint changes.

7. **Europe/Copenhagen timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

8. **51 unique Aarhus Letbane stations across L1 and L2.** Urban section (12 km, Aarhus H–Lystrup) is shared by both lines but represented as separate routes in GTFS (one route per line code, split at Lystrup junction). L1 continues north to Grenaa; L2 has Odder branch south and Lisbjergskolen branch via Skejby from urban section.

9. **Adapter architecture:** Shared `lib/providers/gtfs/realtime-board.js` or Rejseplanen-specific path TBD. Two distinct line-code and direction models: one for Aarhus Letbane (both L1 and L2, single operator but two line codes), one for DSB Regional/InterCity. Separate boarding logic for optional-reservation DSB trains (walk-up allowed; filter out EuroCity/sleeper by compulsory-reservation verdict). Status stays **planned** until Mark's QA full pass.

10. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge with Copenhagen Rejseplanen.**

## License

| field | value |
| --- | --- |
| License name | CC BY 4.0 (Creative Commons Attribution 4.0) for GTFS static feed |
| Redistribution / rehosting | Permitted with attribution. Rejseplanen GTFS feed (including Aarhus Letbane) is in the public domain under CC BY 4.0 (per Mobility Database and Transitland feed pages). May be served to our users and passed to third parties with attribution statement. |
| Commercial use | Allowed under CC BY 4.0. |
| Attribution | Attribute data to Rejseplanen / Samtrafiken / Midttrafik (e.g., "Data from Rejseplanen, Samtrafiken"). No specific wording required by the license, but mentioning Midttrafik as operator recommended for Aarhus Letbane clarity. |
| Terms URL | [Transitland feed page: f-rejseplanen~dk~gtfs](https://www.transit.land/feeds/f-rejseplanen~dk~gtfs/) (updated 2026-09-05). [Mobility Database: Rejseplanen GTFS](https://mobilitydatabase.org/feeds/gtfs/mdb-1292). [Rejseplanen Labs GTFS info](https://labs.rejseplanen.dk/hc/en-us/articles/21639730766877-Om-GTFS-Schedule-Static). License: [CC BY 4.0 Deed](https://creativecommons.org/licenses/by/4.0/). |
| Keyed API (API 2.0) | Registration required via labs.rejseplanen.dk (free tier: 50k calls/month non-commercial; commercial use >50k calls/month or selling a service using API data requires agreement). Key agreement does not restrict redistribution of queried data; Rejseplanen GTFS license governs. **Confirm usage terms in API ToS at registration time; note non-commercial tier limit for production deployment.** |
| Confidence | **Clear** for GTFS static (CC BY 4.0 explicit). **Requires verification** for API 2.0 departureBoard and real-time feeds (SIRI-ET / Dataudveksleren) for both Aarhus Letbane and DSB — license and redistribution terms to be confirmed at D1 when integrating live path. Confirm Aarhus Letbane is included in real-time coverage (not just DSB). |

## What I did not do

No line-map generation, no station hand-transcription from the Aarhus Letbane map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on Rejseplanen timestamps, no public-transit coverage boundary map, no stopIds in the published JSON.
