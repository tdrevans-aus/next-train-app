# Bergen oracle clash report

D1 (published, as of 6 Sep 2026): [Bybanen linjekart](https://www.skyss.no/en/travel/timetables-and-maps/maps/) official network map from Skyss, plus **Rutetabeller for Bybanen** [line 1](https://www.skyss.no/globalassets/reise/rutetabellar/bybanen/1.pdf) and [line 2](https://www.skyss.no/globalassets/reise/rutetabellar/bybanen/2.pdf) (PDFs from skyss.no). Stations arrays **hand-transcribed** from official timetable schedules. **Not generated from GTFS.** Not generated from Entur Journey Planner / SIRI / stop-place register.

Current official system coverage (Skyss timetables as of 6 Sep 2026):

- 1: **1 Bergen Sentrum - Bergen lufthavn Flesland.** 27 stations from Byparken north-east to Bergen Airport Flesland. Opened initially June 22, 2010 (city centre to Nesttun); extended to airport April 21, 2017.
- 2: **2 Bergen Sentrum - Fyllingsdalen.** 10 stations from Kaigaten south through Kronstad to Fyllingsdalen terminal. Opened November 21, 2022.

Both lines share the city centre section (Byparken–Kaigaten–Nonneseter–Bystasjonen) and intersect at Kronstad station.

Total: **35 unique stations** across both lines (city centre section shared).

Hub lock: **Byparken** (both lines meet in city centre; Line 1 terminus; Line 2 departs nearby at Kaigaten). Jernbanetorget (Bergen Railway Station) is separate, hosting Vy regional trains, not Bybanen infrastructure. Nonneseter is the adjacent Bybanen stop to Bergen Railway Station.

H2 clash surface (after transcription): **no product `lib/cities/bergen/`**. Clash is **map-vs-halt-list** (line 2 opened 2022, newer than line 1 official PDF materials; timetable precision vs printed linjekart) plus **Bybanen vs NSB/Vy regionalbaner at Bergen station** (separate infrastructure, separate platforms, separate ticketing). Not GTFS. **Bybanen light rail only; Vy regional/commuter rail out of v1 scope.**

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier). A service passing both is marked `in` and appears on boards.

**Verdict for Bybanen lines 1 and 2 (walk-up public metro service):** Both tests pass. Bybanen is a walk-up light rail system with no compulsory reservations and no barriers between station entrance and platform. All in-catalog Bybanen stations are public access points with standard ticket or pass boarding.

**Vy regional/commuter rail at Bergen Railway Station (out of v1 scope):** The main Bergen railway station (Bergen S / Jernbanetorget) serves Vy regional trains (Oslo-Bergen line, Voss line, Arna line). These services do not call at any in-catalog Bybanen station — they operate from a separate railway station infrastructure approximately 500 meters north-west of Byparken. No shared platforms, separate ticketing systems, separate operator. **No verdict required; out of v1 mode scope.**

**doNotGroup implications:** Byparken, Kaigaten, Nonneseter, and other Bybanen stations serve only Bybanen infrastructure and one operator (Skyss). No platform grouping complications arise from multi-operator conditions at catalog stations.

| Service | Calls at in-catalog stations | Walk-up? | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|---|
| **Bybanen (Skyss)** Lines 1–2 | All 35 D1 stations | Yes | No | No | `in` | [Skyss Bybanen fares](https://www.skyss.no/en/travel/tickets-and-fares/); open public light rail |

**Summary for Jim and Luke:**
1. Bergen v1 covers **Bybanen (light rail) lines 1 and 2 only.**
2. **Byparken is the hub-lock station** where Line 1 terminates and Line 2 departs from nearby Kaigaten in the shared city centre section.
3. **Single operator (Skyss).** No doNotGroup complications.
4. **Line 1:** Byparken (city centre) – Bergen Airport Flesland (27 stations).
5. **Line 2:** Kaigaten (city centre) – Fyllingsdalen (10 stations, shared city centre with Line 1).
6. **Shared city centre section:** Byparken – Kaigaten – Nonneseter – Bystasjonen.
7. **Key interchange:** Kronstad (where lines cross).
8. **No other operators call at these catalog stations.** Vy regional trains operate from separate Bergen Railway Station, not Bybanen infrastructure.

## Station name table

Match rule: published D1 string (Skyss timetable Rutetabeller line 1 and line 2, linjekart stops) vs official map tick.

| published (D1) | class | notes |
| --- | --- | --- |
| Byparken | **match (lock)**. Line 1 terminus; Line 2 departs from Kaigaten, 2 stops away. Both lines shared city centre. | City centre hub. Do not use Bergen Sentrum or city/central/downtown. |
| Kaigaten | **match**. Line 2 city centre terminus; Line 1 passes as Bystasjonen. | Separate stop from Byparken. |
| Nonneseter | **match**. Adjacent to Bergen Railway Station (Jernbanetorget), but separate Bybanen platform. | No shared infrastructure with Vy trains. |
| Bystasjonen | **match**. City centre on both lines. | Between Nonneseter and Fløen. |
| Fløen | **match**. Both lines. | |
| Haukeland sjukehus | **match**. Hospital station. Line 2 only. | Line 1 does not stop here. |
| Kronstad | **match**. Key interchange where lines 1 and 2 cross and share. | Both lines. Transfer point. |
| Nesttun | **match**. Line 1 terminus until 2017 airport extension. Still a major stop. | |
| Slettebakken | **match**. Line 1, north of Nesttun. | |
| Bergen lufthavn Flesland | **match**. Line 1 terminus (airport). | Opened April 21, 2017. |
| Fyllingsdalen | **match**. Line 2 terminus. | Opened November 21, 2022. |
| All other D1 names in published-network.json | **match** Skyss timetable / linjekart title | |

**35** unique D1 names. Product `lib/cities/bergen/` absent. `assertCityLive("bergen")` is Unknown city.

## H2 — who has line codes today

| surface | 1–2? | what it actually has |
| --- | --- | --- |
| Skyss linjekart (D1) | **yes** | Lines 1–2 drawn. City centre section Byparken–Fyllingsdalen tunnel loop. |
| Rutetabeller Line 1 / Line 2 (D1) | **yes** | Official termini pairs and stop lists. Line 1 (27 stops), Line 2 (10 stops). |
| skyss.no Bybanen index | **yes** | Line 1 and Line 2 listed separately. Timetable PDFs for each. |
| Product `lib/cities/bergen/` | **absent** | No Bergen stations.json / line-map.json. `assertCityLive("bergen")` is Unknown city. |
| Entur Journey Planner v3 | live (open + `ET-Client-Name`) | `stopPlace.estimatedCalls`. Official next-train path. Not D1. Filter light rail / Skyss. |
| Entur SIRI ET / GTFS-RT | live | ET + SX per dataset; GTFS-RT trip-updates + alerts. No VM / vehicle-positions for light rail. Not D1. |
| Entur static GTFS | not used as D1 | Not this H2 stop-order surface. |
| skyss.no / Skyss-appen | passenger UI | Entur-backed. Not a product contract. |

H2 conclusion: passenger codes on the map and timetables already agree (**1–2**). No clash: **Bybanen lines 1 and 2, single operator Skyss, no product Bergen file.** Do not generate published-network.json from GTFS. Do not merge buses, ferries, or regional rail into this city. **Bybanen light rail only.**

## C2/C3 to put in front of Jim

1. **city=bergen**, agency **Skyss Bybanen** (light rail only), not `norway`, not merged into a national network or regional aggregation. London TfL / Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg / Oslo untouched.
2. **Byparken** is the locked city-centre hub (Line 1 terminus; Line 2 departs nearby at Kaigaten in shared section).
3. **Kronstad** is the key transfer point where lines cross and share infrastructure.
4. **Nonneseter is NOT shared with Bergen Railway Station (Oslo-Bergen line / Vy).** Separate station, separate operator, separate infrastructure. Bergen Railway Station (Jernbanetorget) hosts Vy, not Bybanen.
5. **No passenger line 3 or higher.** Two lines only. Line 2 opened 21 Nov 2022 (very recent); verify feed maturity at D1.
6. **Line 1 termini are Byparken / Bergen Airport Flesland.** No short-turns, no restricted branches.
7. **Line 2 termini are Kaigaten / Fyllingsdalen.** Opened 2022.
8. **No buses, no ferries, no regional rail in v1.** Skyss operates regional buses in Vestland, but v1 is Bybanen light rail only.
9. **Europe/Bergen uses CET with DST.** Official live path is Entur Journey Planner `estimatedCalls` + SIRI ET filtered to Skyss. D1 stays planned (hand-transcribed timetables).
10. **Bybanen uses Entur GTFS** (dataset filtered to Skyss operator). No product child stopIds needed in published-network.json.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no reopen of Oslo/London/Amsterdam/Rotterdam.

## License

- **License name:** Norwegian Licence for Open Government Data (NLOD), as stated on Entur developer open-data pages (timetable / realtime).
- **Redistribution / rehosting:** NLOD allows copy, modify, and redistribute, including commercially, with attribution. Entur requires an `ET-Client-Name` header on API calls (identify the app, not a secret).
- **Commercial use:** allowed under NLOD.
- **Attribution:** Name Entur / the data provider. Example client header: `next-train`. Do not pretend to be Skyss or Bybanen AS.
- **Terms URL:** https://developer.entur.no/open-data/timetable and https://developer.entur.no/open-data/realtime (category National journey planning, License: NLOD). Licence text: https://data.norge.no/nlod/en/2.0
- **Confidence:** `clear` that Entur dumps + GTFS-RT for Skyss operator are NLOD. Official Skyss timetables used as D1 oracle are printed materials — NLOD covers the data within them when sourced from Entur feeds.
- **Keyed feeds:** No secret key. `ET-Client-Name` is mandatory identification.
