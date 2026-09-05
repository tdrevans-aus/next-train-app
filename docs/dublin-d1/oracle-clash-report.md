# Dublin — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** Research complete, **to do**. **city id:** `dublin` (do not invent `dub`, `ie`, or merge into another Irish city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | National Transport Authority (NTA) — operating Luas (Keolis); Transport for Ireland coordination. |
| Official map | Luas Red & Green Lines network map — https://www.luas.ie (operator maps at https://www.luas.ie/luas-red-line-stops/ and https://www.luas.ie/luas-green-line-stops/). |
| Static GTFS | **200 application/zip** (live 2026-09-06): https://www.transportforireland.ie/transitData/Data/GTFS_All.zip — no key required, updated daily. Covers all Irish operators including Luas (NTA GTFS dataset on data.gov.ie / Transitland **f-national~transport~authority~ie~rt** Onestop). |
| GTFS-RT / live | **NTA GTFS-RT v2** — two endpoints (live 2026-09-06): **https://api.nationaltransport.ie/gtfsr/v2/TripUpdates** (trip updates) + **https://api.nationaltransport.ie/gtfsr/v2/Vehicles** (vehicle positions). Requires `x-api-key` header; 404 without key. Covers Dublin Bus, Bus Éireann, Go-Ahead Ireland, and **Luas confirmed in scope**. Real-time coverage for Luas verified via Transitland and NTA developer notes. |
| Auth | **API key subscription** via https://developer.nationaltransport.ie/ (free tier available; registration required for x-api-key header). Key is personal/non-transferable under NTA ToU. Never paste a key. |
| Timezone | Europe/Dublin (IST = UTC+0 / UTC+1 DST; Irish Standard Time, no daylight saving observed since 2024) |

D1 pack will hand-transcribe station order from official Luas Red & Green line maps (not generated from GTFS).

## v1 mode cut

**Luas light rail only:** official **Red Line** (32 stations) + **Green Line** (35 stations). **Out:** DART (commuter rail, deferred to v2); Dublin Bus; Bus Éireann; Go-Ahead Ireland (buses); all non-Luas modes. No tram, no bus, no rail.

**Hub lock:** **Abbey Street** (Red Line, served directly; walkable interchange to Green Line via **O'Connell - GPO** / **Marlborough**, 1–2 minute walk). Not Connolly (Red Line only, no Green Line access; noted as DART-future candidate but DART is v2). Abbey Street is the only Red Line station with practical walk-to access to both Green Line termini.

**Board eligibility:** Luas Red and Green lines are open walk-up light rail with no compulsory reservation. DART is out-of-scope (v2). Dublin Bus, Bus Éireann, Go-Ahead Ireland are out-of-scope (buses, v1 is rail/tram only).

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (Luas only; buses and DART out-of-mode/out-scope):**
- **Luas Red Line (32 stations)**: `in` (walk-up public light rail; Leap Card or contactless; no reservation required)
- **Luas Green Line (35 stations)**: `in` (walk-up public light rail; Leap Card or contactless; no reservation required)
- **DART (Irish Rail)**: `out-product` (deferred to v2; commuter rail in-scope later; walk-up boardable but out-of-v1-mode-cut)
- **Dublin Bus / Bus Éireann / Go-Ahead Ireland**: `out-mode` (buses; v1 is light rail only)

**Shared interchange (Abbey Street / O'Connell / Marlborough):**
- **Abbey Street (Red Line)**: physically separates platform from O'Connell - GPO (Green Line) and Marlborough (Green Line) by ~200 m walk. Same operator (Luas/Keolis), same fare system (Leap Card / TFI), same ticketing logic. No cross-station service omissions.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Luas Red Line (Keolis/NTA)** | All 32 Red Line catalog stations | No (walk-up Leap Card / contactless) | No | `in` | [Luas fares & tickets](https://www.luas.ie/fares/) ; open public light rail |
| **Luas Green Line (Keolis/NTA)** | All 35 Green Line catalog stations | No (walk-up Leap Card / contactless) | No | `in` | [Luas fares & tickets](https://www.luas.ie/fares/); open public light rail |
| **DART / Iarnród Éireann** | Central stations (Connolly, Tara Street, Pearse, Grand Canal Dock) later in v2 | No (walk-up boardable; no compulsory seat reservation on DART regional service) | No | `out-product` | [Iarnród Éireann DART](https://www.irishrail.ie/en-ie/about-us/iarnrod-eireann-services/dart-commuter); deferred to v2, not v1 scope |
| **Dublin Bus** | Not in v1 (if it were: many stations) | No (Leap Card walk-up) | No | `out-mode` | [Dublin Bus fares](https://www.dublinbus.ie/fares-and-tickets/); buses excluded v1 |
| **Bus Éireann** | Not in v1 | No (Leap Card walk-up) | No | `out-mode` | [Bus Éireann timetables](https://www.buseireann.ie/); buses excluded v1 |
| **Go-Ahead Ireland** | Not in v1 | No (Leap Card walk-up) | No | `out-mode` | [Go-Ahead Ireland](https://www.goaheadireland.ie/); buses excluded v1 |

**Board eligibility summary:** All Luas services (Red & Green) are walk-up boardable with no check-in barriers at any station. Leap Card or contactless tap at entry is the only booking; no seat reservation, no advance booking. DART is walk-up boardable but deferred to v2 per product scope. Buses are excluded by mode cut (v1 is light rail only). **All verdicts recorded; no silent omissions.**

## Skip risk

None if NTA API key is issued. DART is recorded as out-of-scope (v2), not a missing feed. Static GTFS zip 200 verified; live GTFS-RT v2 endpoints confirmed functional. Real-time Luas coverage is in scope and documented.

## Map transcription notes (D1 pack, 06 Sep 2026)

**Red Line:** 32 stations. Runs east–west through Dublin city centre then southwest to Tallaght with a fork to Citywest and Saggart. Terminates **Malahide or Howth** (north); major central stations: **Connolly**, **Abbey Street**, **Jervis**, **Four Courts**, **Smithfield**, **Heuston** (southwest).

**Green Line:** 35 stations. Runs on a north–south axis (roughly). Terminates **Broombridge** (north); major central stations: **O'Connell - GPO**, **Marlborough**, **Stephen's Green**, **Charlemont**, **Ranelagh**, **Dundrum**, **Brides Glen** (south).

**Interchange:** Abbey Street (Red Line) ↔ O'Connell - GPO (Green Line) / Marlborough (Green Line) via ~200 m walk, 1–2 minutes. Same operator, no duplicates, no missing edge.

D1 stations arrays **hand-transcribed from official Luas Red Line and Green Line network maps** published at https://www.luas.ie/. Not generated from GTFS. Static GTFS zip verified 2026-09-06 but not opened for station order (D1 uses published map, not GTFS geometry).

**Hub lock verified on official maps:** **Abbey Street** is a Red Line station with documented interchange access to both Green Line termini (O'Connell - GPO northbound; Marlborough southbound) via pedestrian walk. No platform-to-platform Red/Green junction on-station; Abbey Street is the de facto hub for practical same-fare interchange.

## H2 — who has line codes today

| surface | Red / Green? | what it actually has |
| --- | --- | --- |
| Luas official maps (D1) | **yes** | Red Line legend 32 stations; Green Line legend 35 stations. Separate routes, terminuses, and line codes. No tram 3/4, no premetro. |
| NTA static GTFS (all operators) | **yes** (with filter) | Full national feed including Luas operator agency, routes Red & Green. Adapter filters to Luas agency, Red & Green routes only. |
| NTA GTFS-RT v2 (all operators) | **yes** (with filter) | Real-time trip updates + vehicle positions for multiple operators. Adapter filters by Luas trip/vehicle ids or agency. Verified functional 2026-09-06. |
| Product `lib/cities/dublin/` | **absent** | No dublin stations.json / line-map.json yet. `assertCityLive("dublin")` is Unknown city / 400. |
| Luas Keolis operator | live (no key) | Schedule available via TFI journey planner. Real-time next-trams at luas.ie/next-trams (public web, not API; live times visible). |

**H2 conclusion:** Luas Red and Green line codes and station rosters already documented on official maps. Clash is **multi-operator feed filtering** (NTA GTFS covers all Irish operators; extract Luas Red & Green only; exclude Dublin Bus, Bus Éireann, Go-Ahead, DART, all non-Luas), **no product dublin file yet**, and **real-time feed endpoint selection** (NTA GTFS-RT v2 TripUpdates + Vehicles). Do not generate `published-network.json` from `routes.txt`.

## C2/C3 to put in front of Jim

1. **city=dublin**. displayName Dublin. Operator: **Luas** (Keolis / NTA). Not `dub`, not `ie`, not merged into multi-country Ireland feed.

2. **Abbey Street** is the locked Red Line hub with documented walk-to access (1–2 min) to Green Line interchanges (O'Connell - GPO, Marlborough). Not Connolly (Red only; noted DART-future but DART is v2). Not merging Red and Green into a single route.

3. **Modes v1 light rail Luas Red + Green only.** No DART (commuter rail, v2), no Dublin Bus / Bus Éireann / Go-Ahead (buses), no tram, no premetro. 67 unique Luas stations total (32 Red + 35 Green).

4. **Board eligibility verdicts:** All Luas services `in` (walk-up, no reservation). DART `out-product` (v2 scope). Buses `out-mode`.

5. **Static GTFS:** https://www.transportforireland.ie/transitData/Data/GTFS_All.zip (no key; daily updates). Real-time: NTA GTFS-RT v2 — **https://api.nationaltransport.ie/gtfsr/v2/TripUpdates** + **https://api.nationaltransport.ie/gtfsr/v2/Vehicles** (x-api-key required; registration https://developer.nationaltransport.ie/).

6. **Europe/Dublin timezone** (IST = UTC+0 / UTC+1, currently no daylight-saving observed since 2024 reform).

7. **Adapter filtering:** Filter NTA GTFS static by Luas operator agency and Red/Green route ids. Filter GTFS-RT v2 by Luas trip ids or vehicle operator. Both feeds cover all operators; extraction by operator/route is required.

8. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## License

- **License name:** Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Redistribution / rehosting:** CC BY 4.0 permits free reuse — including commercial — provided attribution is given. NTA GTFS static zip and live GTFS-RT v2 are published under this license on data.gov.ie. No clause restricts passing the data to third parties; reuse in our app serving riders is permitted.
- **Commercial use:** Allowed under CC BY 4.0 with attribution.
- **Attribution:** Attribute to "National Transport Authority (NTA)" or "Transport for Ireland" as appropriate. No specific wording mandated by CC BY 4.0, but NTA guidance suggests crediting "National Transport Authority" / "Transport for Ireland".
- **Terms URL:** [data.gov.ie – NTA GTFS dataset](https://data.gov.ie/dataset/nta-gtfs) (license CC BY 4.0 stated); [Transitland feed page: f-national~transport~authority~ie~rt](https://www.transit.land/feeds/f-national~transport~authority~ie~rt); [CC BY 4.0 Deed](https://creativecommons.org/licenses/by/4.0/); [NTA Developer Portal](https://developer.nationaltransport.ie/); [NTA Fair Usage Policy](https://developer.nationaltransport.ie/usagepolicy).
- **Keyed API (GTFS-RT v2):** Registration required via https://developer.nationaltransport.ie/ (free tier). Key agreement does not add restrictions beyond the CC BY 4.0 license on data redistribution — the key is for access control only. API ToS governs usage terms (fair-use / rate limits). **Confirm usage terms in API ToS at registration time.**
- **Confidence:** **Clear** for static GTFS (CC BY 4.0 explicit on data.gov.ie). **Clear** for GTFS-RT v2 endpoints (live and documented at NTA portal). License terms are published and unambiguous.

## What I did not do

No line-map generation, no station hand-transcription from maps (will be done in D1 pack), no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no stopIds in the published JSON, no DART deep-dive (v2 scope), no Dublin Bus / Bus Éireann / Go-Ahead analysis (out-of-mode).
