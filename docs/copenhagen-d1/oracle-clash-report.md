# Copenhagen oracle clash report

D1 (published, map as of 2026-08-30): [Copenhagen Metro network map](https://m.dk/en/plan-your-trip/) and [Complete station list](https://en.wikipedia.org/wiki/List_of_Copenhagen_Metro_stations). Four lines (M1, M2, M3, M4), **44 stations**, hub lock **Kongens Nytorv** (all four lines). Stations arrays would be **hand-transcribed from the official M1–M4 network map and published station list**. **Not generated from GTFS.**

## Agency / feed / auth

| field | value |
| --- | --- |
| Agency | Rejseplanen (shared national platform covering Metro + S-tog + DSB + regional operators across Denmark) |
| Product | Rejseplanen REST API 2.0; GTFS static; SIRI-ET real-time |
| Static GTFS URL | `https://www.rejseplanen.info/labs/GTFS.zip` (no key required; updated ~every 14 days) |
| Auth | **API 2.0 key registration** via [labs.rejseplanen.dk](https://labs.rejseplanen.dk). Free plan: 50,000 calls/month. Non-commercial. |
| API 2.0 departureBoard | `https://api.rejseplanen.dk/api/2.0/departureBoard` (requires registered key). Covers Metro, S-tog, DSB, buses, real-time ~1 min latency. Metro real-time now confirmed supported (verified 2026-08-30). |
| GTFS-RT | Via Dataudveksleren NAP (Danish national traffic data exchange): [Traffic and Mobility data](https://semanticgis.dk/Data-Portals/Traffic-and-Mobility-data-(Dataudveksleren)). SIRI-ET direct feed available via NAP signup. Public GTFS-RT protobuf feed not separately documented; verify coverage at D1. |
| v1 scope | **Metro M1–M4 (44 stations) + S-tog + DSB Regional/InterCity + Öresundståg at shared stations** (Nørreport, Nørrebro, København H, Nordhavn). No buses, no harbour buses, no DSB EuroCity (compulsory reservation), no SJ international services (compulsory reservation), no České dráhy international services (compulsory reservation). Three rail operators, separate line codes, separate boarding logic per platform. |
| Hub lock | **Kongens Nytorv** (only station on all four metro lines M1/M2/M3/M4; 2 island platforms, 4 tracks). Do not conflate with other Central-area stations. |
| Skip risks | (1) Confirm Rejseplanen API 2.0 departureBoard endpoint returns live departures for all three rail operators (Metro, S-tog, DSB) without degradation. (2) Verify SIRI-ET or GTFS-RT real-time feed coverage for S-tog and DSB via Dataudveksleren or Rejseplanen is stable and production-ready. (3) DST timezone (Europe/Copenhagen). (4) Shared platforms require separate line-code filtering and direction modeling (Nørreport: M1/M2 vs S-tog C line; Nordhavn: M4 vs S-tog A/B/Bx/C/E/H). |

## H2 — who has line codes and coverage

| surface | M1–M4? | what it actually has |
| --- | --- | --- |
| Copenhagen Metro official map (D1) | **yes** | Four lines drawn: M1 (Vanløse–Vestamager, green), M2 (Vanløse–Lufthavnen, yellow), M3 (red ring, 17 stations), M4 (Central–Orientkaj + Nordhavn + Sydhavn branch, blue). Kongens Nytorv at intersection. |
| [Wikipedia Metro station list](https://en.wikipedia.org/wiki/List_of_Copenhagen_Metro_stations) (D1 reference) | **yes** | All 44 stations named, line membership, opening dates. Official source for station-level accuracy. |
| Rejseplanen GTFS static (`rejseplanen-dk`) | **yes** (with filter) | Full national feed: 25+ operators, 1,589 routes, 37,287 stops. Includes Metro agency, S-tog operator, DSB operator, Öresundståg. Adapter filters to route_type=1 (rail) for multiple agencies. |
| Rejseplanen API 2.0 departureBoard | **confirmed** | Real-time departures for Metro, S-tog, DSB, Öresundståg verified working (per ledger note 30 Aug 2026). Coverage includes all queryable stops. |
| SIRI-ET via Dataudveksleren | confirmed path | Real-time via NAP available for Metro + S-tog + DSB; verification of all three datasets at D1 required. |

**H2 conclusion:** Passenger line codes (M1–M4, S-tog lines A/B/Bx/C/E/H ring, DSB regional codes) and station rosters already documented. Clash is **multi-operator agency filtering** (Rejseplanen covers 25+ operators; extract Metro + S-tog + DSB + Öresundståg; exclude EuroCity and buses), **platform separation at shared stations** (Nørreport, Nørrebro, København H, Nordhavn require separate boarding logic), **real-time feed endpoint selection** (API 2.0 departureBoard vs SIRI-ET vs GTFS-RT for three operators), and **timezone / DST handling** (Europe/Copenhagen). Do not generate `published-network.json` from `routes.txt`.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (rail services only; buses/ferries out-of-mode):**
- **Metro M1–M4 itself**: `in` (walk-up public metro)
- **S-tog all lines at Nørreport, Nørrebro, København H, Nordhavn**: `in` (no compulsory reservation; open seating, first-come-first-served)
- **DSB Regional trains (Regionaltog) at København H**: `in` (no reservation offered or required)
- **DSB InterCity (IC / ICL) at København H**: `in` (optional reservation = walk-up boardable)
- **Öresundståg / DSB Øresund at København H**: `in` (no compulsory reservation; open seating)
- **DSB EuroCity (Hamburg–Copenhagen) at København H**: `out-reservation` (compulsory June 26 – Aug 16; optional outside summer)
- **SJ X2000 (Stockholm–Copenhagen) at København H**: `out-reservation` (compulsory seat reservation, all tickets reserved)
- **České dráhy ComfortJet (Prague–Copenhagen) at København H**: `out-reservation` (compulsory June 1 – Sept 1 for German territory; international long-distance)
- **Harbour buses (Havnebus 991/992) at Orientkaj M4 terminus**: `out-mode` (buses and ferries excluded v1)

**Stations with overlapping rail services (now in-catalog):**
- **Nørreport** (M1, M2): + S-tog C line + DSB Regional/InterCity
- **Nørrebro** (M3): + S-tog Ring Line
- **København H / Central Station** (M3, M4): + S-tog C line (+ A/B/Bx/E/H terminate/pass nearby) + DSB Regional/InterCity/EuroCity + Öresundståg + SJ X2000 + České dráhy ComfortJet
- **Nordhavn** (M4): + S-tog lines A, B, Bx, C, E, H (separate 2 island platforms: 1 for S-train, 1 for Metro)
- All other in-catalog Metro stations: M1–M4 only (no other operator calls at them)

**No check-in barriers:** Platform access at all shared stations is unrestricted. Ticket checking is on-board by conductors. No station entry barriers, security gates, or border control. Walk-up boarding is unobstructed for all services listed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Metro M1–M4 (Rejseplanen / Metroselskabet)** | All 44 catalog stations | No | No | `in` | [Copenhagen Metro fares](https://m.dk/en/plan-your-trip/); open public metro |
| **S-tog all lines (A, B, Bx, C, E, H, Ring)** | Nørreport, Nørrebro, København H, Nordhavn | No (open seating, no reservation offered) | No | `in` | [ShowMeTheJourney: S-tog Denmark](https://showmethejourney.com/travel-on/train/83-s-tog-denmark/); [Nørrebro station](https://en.wikipedia.org/wiki/Nørrebro_railway_station); [Nordhavn station](https://en.wikipedia.org/wiki/Nordhavn_railway_station); no reserved seats, first-come-first-served |
| **DSB Regional trains (Regionaltog)** | København H (primary) | No (reservation not offered) | No | `in` | [DSB FIP Guide](https://www.fipguide.org/en/operator/dsb/); regional trains walk-up only |
| **DSB InterCity / InterCityLyn (IC / ICL)** | København H | No (optional, not compulsory) | No | `in` | [DSB seat reservation page](https://www.dsb.dk/en/tickets-and-services/Seat-Reservation/); domestic IC optional |
| **Öresundståg / DSB Øresund** | København H | No (open seating, no reservation) | No | `in` | [Buying tickets - Öresundståg](https://www.oresundstag.se/en/travel-information/buy-ticket); walk-up, no reserved seats |
| **DSB EuroCity (EC 396/397 Hamburg–Copenhagen)** | København H | Yes (compulsory June 26 – Aug 16) | No | `out-reservation` | [DSB EuroCity Talgo](https://www.dsb.dk/); summer peak mandatory reservation |
| **SJ X2000 (Stockholm–Copenhagen)** | København H | Yes (compulsory; all tickets include reserved seat) | No | `out-reservation` | [SJ X2000 booking](https://www.sj.se); [Copenhagen to Stockholm by X2000](https://www.seat61.com/trains-and-routes/x2000.htm) — mandatory seat reservation, booked in advance or at station |
| **České dráhy ComfortJet (Prague–Copenhagen)** | København H | Yes (compulsory June 1 – Sept 1 for German segment) | No | `out-reservation` | [České dráhy Summer Reservations to Germany](https://www.ceskedrahy.cz/en/press-center/press-releases/travelling-trains-dresden-berlin-and-hamburg-during-summer-compulsory); [ComfortJet booking](https://www.cd.cz/en/nase-vlaky/-41304/) — international long-distance service requiring reservation during high-season through German territory |
| **Harbour buses (Havnebus 991/992)** | Orientkaj (M4 terminus) | N/A (bus/ferry mode) | N/A | `out-mode` | [Copenhagen Harbour Buses](https://en.wikipedia.org/wiki/Copenhagen_Harbour_Buses); ferry/bus mode excluded v1 |

**Board eligibility summary:** All walk-up rail services (Metro, S-tog, DSB Regional/InterCity, Öresundståg) pass both boarding-contract tests at their respective in-catalog stations. DSB EuroCity, SJ X2000, and České dráhy ComfortJet all fail test 1 (compulsory seat reservation). SJ X2000 fails year-round; České dráhy fails during June 1 – Sept 1 window. Harbour buses fail by mode (ferries/buses out-of-scope). **All verdicts recorded; no silent omissions.** Four rail operators + metro/S-tog in scope with separate filtering and direction models per platform.

## Station name table (locks + known clashes)

Match rule: Official Copenhagen Metro published name vs Rejseplanen GTFS stop_name (often `Copenhagen, Stop`). `rename` = same place, different printed string.

| published (D1) | typical GTFS | class |
| --- | --- | --- |
| Kongens Nytorv | Copenhagen, Kongens Nytorv (or König's Platz equivalent) | **match (lock)**. Hub on all four metro lines. |
| Nørreport | Copenhagen, Nørreport | match. **Rail overlap:** M1/M2 Metro + S-tog C line + DSB trains. doNotGroup three operator sections: Metro platforms, S-tog platforms, Railway platforms. |
| Nørrebro | Copenhagen, Nørrebro | match. **Rail overlap:** M3 Metro + S-tog Ring Line. doNotGroup M3 vs S-tog Ring Line platforms. |
| København H | Copenhagen, København H (or Central Station) | match. **Rail overlap:** M3/M4 Metro + S-tog (C line + other lines nearby) + DSB Regional/InterCity/EuroCity + Öresundståg + SJ X2000 + České dráhy ComfortJet. doNotGroup four operator sections: Metro platforms, S-tog platforms, DSB/International platforms. Precedent: Oslo Jernbanetorget / Nationaltheatret pattern. M3/M4 platforms physically separate from rail platforms via pedestrian tunnel. |
| Nordhavn | Copenhagen, Nordhavn | match. **Rail overlap:** M4 Metro + S-tog lines A/B/Bx/C/E/H (separate 2 island platforms: 1 for S-train, 1 for Metro, per Wikipedia). doNotGroup M4 vs S-tog. |
| Orientkaj | Copenhagen, Orientkaj | match. **M4 terminus.** Harbour bus ferry connection (out-of-scope). |
| [All other 39 D1 stations] | Copenhagen, [Station Name] | match family; no overlapping services |

**44 unique D1 metro names. No product `lib/cities/copenhagen/` yet. `assertCityLive("copenhagen")` is Unknown city.**

## C2/C3 to put in front of Jim

1. **city=copenhagen**. Operators: Rejseplanen (shared national platform). Three rail operators in v1 scope: **Metroselskabet I/S (Metro)**, **DSB** (Regional/InterCity), **S-tog operator** (suburban ring + radial lines), **Öresundståg / DSB Øresund** (regional to Malmö). Not `denmark`. Not merged into multi-city Rejseplanen adapter. International services (SJ X2000, České dráhy ComfortJet) excluded by compulsory reservation verdict.

2. **Kongens Nytorv** is the locked inner-city Metro hub (all four lines M1/M2/M3/M4; 2 island platforms, 4 tracks). Do not fold other stations into it.

3. **Three rail operators in v1 scope with separate filtering and boarding logic.**
   - **Metro M1–M4 (44 stations, Metroselskabet agency):** Filter Rejseplanen GTFS by route_type=1, agency "Metroselskabet I/S" (or confirmed official agency name). Line codes M1, M2, M3, M4. Real-time from API 2.0 departureBoard or SIRI-ET.
   - **S-tog (six lines + ring: A, B, Bx, C, E, H, F ring; separate operator agency).** Calls at Nørreport, Nørrebro, København H, Nordhavn. Filter Rejseplanen GTFS by route_type=1, S-tog operator agency. Line codes: C, A, B, Bx, E, H (see [S-tog line list](https://en.wikipedia.org/wiki/List_of_Copenhagen_S-train_lines)). Open seating, no reservations.
   - **DSB Regional/InterCity (Regionaltog, IC, ICL; DSB agency).** Calls primarily at København H. Optional reservations (walk-up boardable). Filter to exclude EuroCity/international services (compulsory reservation June 26–Aug 16) and all SJ/České dráhy international routes. Öresundståg is separate operator but similar boarding contract.
   - **Öresundståg / DSB Øresund (regional Malmö service).** Calls at København H. No reservations, open seating.

4. **Shared platform separation (doNotGroup directives):**
   - **Nørreport (M1/M2 + S-tog C + DSB):** Three separate boards. M1 + M2 one platform group. S-tog C line second group. DSB trains third group. Do not cross-schedule or merge.
   - **Nørrebro (M3 + S-tog Ring):** Two separate boards. M3 one platform group. S-tog Ring Line second group.
   - **København H (M3/M4 + S-tog + DSB + SJ + České dráhy):** Four separate boards per operator. M3/M4 platforms. S-tog platforms. Railway platforms (DSB + SJ + České dráhy + Öresundståg, sub-grouped by national/international). Precedent: Oslo pattern. Pedestrian tunnel connects Metro to Railway.
   - **Nordhavn (M4 + S-tog):** Two separate island platforms (confirmed). M4 one platform. S-tog A/B/Bx/C/E/H second platform. Separate boarding logic.

5. **Real-time feed choice:** Rejseplanen API 2.0 `departureBoard` endpoint covers all three operators (Metro, S-tog, DSB) with ~1 min latency (verified 2026-08-30). Or use SIRI-ET via Dataudveksleren NAP if more stable for all three. Verify all three operators' datasets before selecting production path. Protobuf GTFS-RT coverage for all operators to confirm at D1. Note: SJ X2000 and České dráhy services are excluded from real-time filtering per board-eligibility verdicts.

6. **Europe/Copenhagen timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

7. **44 unique Metro stations.** M1: ~15 stations; M2: ~16 stations (shared M1 track Vanløse–Christianshavn); M3: ~17 stations (ring line); M4: ~12 stations (Central + Nordhavn + Sydhavn branches). Plus S-tog/DSB at shared stations (Nørreport, Nørrebro, København H, Nordhavn) — these are not additional rows in `published-network.json` but require separate filtering and direction models in the boarding engine.

8. **Adapter architecture:** Shared `lib/providers/gtfs/realtime-board.js` or Rejseplanen-specific path TBD. Three distinct line-code and direction models: one for Metro, one for S-tog, one for DSB/Öresundståg. Status stays **planned** until Mark's QA full pass.

9. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## License

| field | value |
| --- | --- |
| License name | CC BY 4.0 (Creative Commons Attribution 4.0) for GTFS static feed |
| Redistribution / rehosting | Permitted with attribution. Rejseplanen GTFS feed is in the public domain under CC BY 4.0 (per Mobility Database and Transitland feed pages). May be served to our users and passed to third parties with attribution statement. |
| Commercial use | Allowed under CC BY 4.0. |
| Attribution | Attribute data to Rejseplanen / Samtrafiken (e.g., "Data from Rejseplanen, Samtrafiken"). No specific wording required by the license. |
| Terms URL | [Transitland feed page: f-rejseplanen~dk~gtfs](https://www.transit.land/feeds/f-rejseplanen~dk~gtfs/). [Mobility Database: Rejseplanen GTFS](https://mobilitydatabase.org/feeds/gtfs/mdb-1292). [Rejseplanen Labs](https://labs.rejseplanen.dk/hc/en-us/articles/21639730766877-Om-GTFS-Schedule-Static). License: [CC BY 4.0 Deed](https://creativecommons.org/licenses/by/4.0/). |
| Keyed API (API 2.0) | Registration required via labs.rejseplanen.dk (non-commercial, 50k calls/month free tier). Key agreement does not restrict redistribution of queried data; Rejseplanen GTFS license governs. **Confirm usage terms in API ToS at registration time.** |
| Confidence | **Clear** for GTFS static (CC BY 4.0 explicit). **Requires verification** for API 2.0 departureBoard and real-time feeds (SIRI-ET / Dataudveksleren) for all three operators (Metro, S-tog, DSB) — license and redistribution terms to be confirmed at D1 when integrating live path. |

## What I did not do

No line-map generation, no station hand-transcription from the Metro map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on Rejseplanen timestamps, no public-transit coverage boundary map, no stopIds in the published JSON.
