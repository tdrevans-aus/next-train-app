# Bern — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack scoped, **to do**. **city id:** `bern` (do not invent `be`, `bls`, `rbs`, or merge into another Swiss city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agencies | **Bernmobil (Städtische Verkehrsbetriebe Bern)** — operator of city tramway network (5 tram routes, 1,000 mm metre gauge) within Bern. **BLS AG** — operator of Bern S-Bahn standard-gauge commuter rail (main network, ~12 lines). **RBS (Regionalverkehr Bern-Solothurn)** — operator of metre-gauge interurban light rail (S7, S8, S9, RE lines) to Solothurn and Worb, converging at underground Tiefbahnhof Bern below central station (out-of-scope v1). |
| Official map | Bernmobil tram network — https://www.bernmobil.ch/ (tram line maps, stops, schedules). Bern S-Bahn network — https://en.wikipedia.org/wiki/Bern_S-Bahn. Trams in Bern — https://en.wikipedia.org/wiki/Trams_in_Bern (line roster, history, operations). Bern railway station — https://en.wikipedia.org/wiki/Bern_railway_station (infrastructure overview: 12 standard-gauge tracks for BLS, 4 metre-gauge tracks 21–24 for RBS). |
| Static GTFS | opentransportdata.swiss serves Switzerland national feed via: `https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020` (current year 2026). Feed includes Bernmobil tram + all national operators (S-Bahn, buses, etc.). Transitland Onestop **f-u0-switzerland** (aggregates all Swiss operators including Bernmobil, BLS, RBS). Historical feeds via opendata.swiss. No operator-specific static GTFS feed for Bernmobil tram alone; must filter Switzerland national feed by agency (Bernmobil) and route_type=0 (tram). |
| GTFS-RT / live | **GTFS-RT endpoint:** `https://api.opentransportdata.swiss/la/gtfs-rt` (no trailing slash). Bearer API key required; 401 without. Rate limit: 2 queries per minute (sliding window). Trip updates cached 30 seconds. Includes all operators: Bernmobil tram + BLS S-Bahn + RBS + buses on the single protobuf feed. Adapter filtering must separate Bernmobil tram (route_type=0, agency_id=Bernmobil) from S-Bahn (route_type=2, agency_id=BLS/RBS). |
| Auth | **API key registration required** via https://api-manager.opentransportdata.swiss/ (free tier; SBB can negotiate paid contracts for heavy usage beyond limits). Key used as HTTP Bearer token in Authorization header. Maximum 2 queries per minute per key. Key is personal/non-transferable per SBB terms. |
| Timezone | Europe/Zurich (UTC+1 standard; UTC+2 summer daylight, last Sunday March to last Sunday October — HAS DST). |

Do not generate a published-network.json from GTFS. D1 is the official Bernmobil tram map, hand-transcribed (this pack).

## v1 mode cut

**Bernmobil tram only:** Bern's tramway network operated by Bernmobil, currently 5 active lines (3, 6, 7, 8, 9) on 1,000 mm metre gauge, spanning 33.4 km with ~71 stops. v1 scope is the published passenger-facing tram line roster at time of D1 transcription.

**Out:** S-Bahn (BLS AG standard-gauge commuter rail; RBS metre-gauge interurban light rail to Solothurn/Worb). Buses (Bernmobil buses and external operators). Boats/ferries; funicular or other accessory modes. No metro exists in Bern.

**Rationale for tram-only cut:** Bernmobil tram is self-contained urban transit within Bern city centre (metre gauge, ~71 stops, high frequency). S-Bahn is complex in this city due to architectural layering: BLS AG operates standard-gauge commuter rail on tracks 1–10, 12–13 at Bern station; RBS operates metre-gauge interurban on separate tracks 21–24, with a new underground Tiefbahnhof (opened 2024/2025) creating dual-level infrastructure. While walk-up boardable and technically eligible for boards, the dual-operator coordination (BLS + RBS) and underground station complexity make S-Bahn a v2+ candidate. Tram is clean, focused MVP within v1 scope.

Hub lock: **Bern (Bern Hauptbahnhof / Bern Railway Station)** — served by all 5 Bernmobil tram lines (3, 6, 7, 8, 9), the central interchange point for the tram system. Also called Bahnhof Bern tram/bus stop. **doNotGroup BLS Bern standard-gauge S-Bahn platforms** (tracks 1–10, 12–13) — S-Bahn platforms and Bernmobil tram stops are at the same address but separate platforms and infrastructure; exclude S-Bahn from tram boards. **doNotGroup RBS Tiefbahnhof Bern** (underground metre-gauge station, tracks 21–24) — RBS underground is a separate layer; exclude from tram boards.

## Skip risk

**S-Bahn dual-operator and underground complexity:** Bern station hosts three distinct rail infrastructures:
- **BLS AG standard-gauge S-Bahn:** main commuter rail (tracks 1–10, 12–13), walk-up boardable, no reservation
- **RBS metre-gauge interurban:** light rail to Solothurn/Worb (tracks 21–24 underground Tiefbahnhof), walk-up boardable
- **Bernmobil metre-gauge tram:** urban transit (separate street-level tram platforms)

While all three are walk-up boardable, including S-Bahn (either or both operators) in v1 creates:
- **Multi-operator coordination risk:** BLS + RBS must both be represented in adapter if S-Bahn included
- **Underground station architectural complexity:** RBS Tiefbahnhof (opened ~2024/2025) is newly operational, and station data (stops, platforms, access points) may be incomplete or shifting in source GTFS
- **Feed composition:** opentransportdata.swiss mixes tram + S-Bahn (both operators) + buses on single protobuf, requiring very tight agency/route_type filtering to avoid bleed

**Recommendation:** v1 is tram-only; defer S-Bahn (both BLS and RBS) to a future country-lane or expanded Bern wave. Tram alone is a self-contained, lower-risk MVP.

**Tram hazards (none):** Bernmobil tram is walk-up, no reservation, no border crossing, no underground infrastructure. Same filtering pattern as Zurich and Basel (route_type=0, agency=Bernmobil); no technical blocker.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (v1 in-scope tram mode only; S-Bahn out):**
- **Bernmobil tram lines (all 5 urban routes):** `in` (public tram, walk-up boardable, no reservation)
- **BLS AG standard-gauge S-Bahn (main commuter rail, tracks 1–10, 12–13):** `out-mode` (excluded by v1 tram-only mode cut; *technically* walk-up boardable without compulsory reservation per SBB ticketing rules, but falls outside mode scope as a future expansion)
- **RBS metre-gauge interurban light rail (S7, S8, S9, RE; Tiefbahnhof tracks 21–24):** `out-mode` (excluded by v1 tram-only mode cut; *technically* walk-up boardable, but outside mode scope as a future expansion)
- **Bernmobil buses & external bus operators:** `out-mode` (bus mode excluded v1)
- **Boat/ferry services:** `out-mode` (not in scope)

**Stations with rail/tram overlap (major):**
- **Bern Railway Station (Hauptbahnhof / Bahnhof Bern):** Bernmobil tram stops + BLS S-Bahn mainline platforms (separate areas) + RBS underground Tiefbahnhof (separate layer). Tram included; BLS and RBS excluded by mode cut.

**Board eligibility summary:** All walk-up tram services (Bernmobil) pass both boarding tests and are shown on boards. S-Bahn (BLS + RBS) fails by mode exclusion (v1 tram only), not by boarding contract. **All verdicts recorded; no silent omissions.**

| Service | Calls at in-catalog tram stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Bernmobil Tram (all 5 lines: 3, 6, 7, 8, 9)** | All in-catalog tram stops in Bern city centre | No (public tram, first-come-first-served) | No | `in` | [Trams in Bern — Wikipedia](https://en.wikipedia.org/wiki/Trams_in_Bern); [Bernmobil network](https://www.bernmobil.ch/) — public walk-up boardable |
| **BLS AG S-Bahn / Commuter Rail (standard gauge, tracks 1–10, 12–13)** | Bern Railway Station and other Bern-area stations | No (open seating; reservations not offered on S-Bahn) | No | `out-mode` | [Bern S-Bahn — Wikipedia](https://en.wikipedia.org/wiki/Bern_S-Bahn) — walk-up boardable but excluded by v1 tram-only mode cut; standard-gauge network deferred to future expansion |
| **RBS Metre-Gauge Interurban (S7, S8, S9, RE; Tiefbahnhof underground)** | Bern Railway Station (Tiefbahnhof tracks 21–24) and suburban stations | No (open seating; interurban RBS services are walk-up boardable) | No | `out-mode` | [Regionalverkehr Bern-Solothurn — Wikipedia](https://en.wikipedia.org/wiki/Regionalverkehr_Bern-Solothurn); [RBS underground station](https://world-architects.com/en/theo-hotz-partner-architekten-zurich/project/rbs-underground-station-bern) — walk-up boardable but excluded by v1 tram-only mode cut; metre-gauge interurban deferred to future expansion |
| **Bernmobil buses & external bus operators** | Regional services passing tram stops | N/A (bus mode) | N/A | `out-mode` | [Bus, Train, PostBus, Tram — Bern city website](https://www.bern.ch/en/topics/mobility-and-transportation/bus-train-postbus-tram) — bus mode excluded v1 |
| **Boat/ferry services (Lake Thun, Lake Brienz, etc.)** | Regional terminals (if any) | N/A (ferry mode) | N/A | `out-mode` | Not primary to Bern urban transit; ferry mode excluded v1 |

## H2 — who has line codes today

| surface | tram lines? | what it actually has |
| --- | --- | --- |
| Bernmobil official website / schedules | **yes** | Bernmobil tram lines 3, 6, 7, 8, 9 + buses + trolleybuses |
| opentransportdata.swiss GTFS | **yes** (with filter) | Switzerland national feed: Bernmobil agency filter yields tram routes. Must filter route_type=0 (tram) and agency=Bernmobil to avoid S-Bahn + buses. |
| Transitland `f-u0-switzerland` | **yes** (with filter) | Full Switzerland feed. Includes Bernmobil, BLS, RBS, and all regional operators. Adapter must narrow to Bernmobil tram via agency/route filtering. |
| GTFS-RT protobuf | **yes** (with filter) | Same stream for all operators. Adapter filtering required per trip (vehicle position / trip update must carry Bernmobil agency). |
| Wikipedia: [Trams in Bern](https://en.wikipedia.org/wiki/Trams_in_Bern) | **yes** | Current line roster (3, 6, 7, 8, 9), routes, stops, infrastructure, operations (Stadler Tramlink fleet 2023+). |
| Product `lib/cities/bern/` | **absent** | No bern stations.json / line-map.json yet. `assertCityLive("bern")` is Unknown city |

**H2 conclusion:** Passenger tram line codes documented on Bernmobil website and Wikipedia. Clash is **operator filtering** (extract Bernmobil from Switzerland national feed; exclude BLS standard-gauge and RBS metre-gauge interurban), **station separation at shared site** (Bern Railway Station serves tram, BLS, and RBS on separate platforms/layers; never merge), **underground infrastructure awareness** (RBS Tiefbahnhof is new, data completeness to confirm at D1), and **no product bern file yet**. Do not generate published-network.json from GTFS. Do not merge S-Bahn (either operator) or buses into this city in v1.

## C2/C3 to put in front of Jim

1. **city=bern**. displayName Bern. Not `be`, `bls`, `rbs`, or `bernmobil`. Do not merge into another Swiss city. Do not merge with S-Bahn (BLS AG or RBS) or bus operators in v1.

2. **Hub-lock:** **Bern (Bern Hauptbahnhof / Bern Railway Station)** — all 5 Bernmobil tram lines (3, 6, 7, 8, 9) converge here. Central interchange point for urban tram system.

3. **doNotGroup BLS Bern mainline platforms (tracks 1–10, 12–13) and doNotGroup RBS Tiefbahnhof Bern (underground tracks 21–24).** Shared address, separate platforms/layers; never merge with tram.

4. **Modes v1 Bernmobil tram only.** No S-Bahn (BLS or RBS), no buses, no boats, no funicular.

5. **Europe/Zurich HAS DST.** UTC+1 standard; UTC+2 summer.

6. **Feed sourcing:** opentransportdata.swiss GTFS-RT (Bearer key required, registered via API Manager). Must filter to Bernmobil agency and route_type=0 (tram) to avoid S-Bahn + bus bleed. Static GTFS and real-time from same source.

7. **Underground infrastructure awareness:** RBS Tiefbahnhof (underground metre-gauge station, opened ~2024/2025) is newly operational. Confirm GTFS completeness for RBS stops/platforms at D1 if S-Bahn is added later; not blocking tram-only v1.

8. **Product child stopIds stay out of this file.** No line-map generation, no stopIds, no live flip yet.

## License

- **License name:** opentransportdata.swiss Terms of Use (effective as of 2026-09-06). **No single named license (e.g., CC BY 4.0)** — instead, platform-specific terms that reference attribution and data use requirements. Referred to as "Open Data" in platform materials.
- **Redistribution / rehosting:** opentransportdata.swiss Terms of Use states data can be "processed, analysed and published," and users must "publish processed data under the name of the data user" and keep data "updated regularly." Platform states data can be "freely available for anyone to use." However, **no explicit sublicense or third-party redistribution clause** — the terms govern *your use*, not passing it to a third party. When redistributing to end users via our app, cite opentransportdata.swiss as source (platform requirement). Tim makes judgment on whether that satisfies commercial app redistribution. Note: **If database exception applies** (ODMCH data form part of database with many different sources, not just opentransportdata.swiss), opentransportdata.swiss need only be cited once in the list of sources.
- **Commercial use:** Not explicitly prohibited. Platform offers "free tier" below usage limits and allows "paid contracts" for higher volumes, suggesting commercial use is expected.
- **Attribution:** opentransportdata.swiss Terms of Use: "The URL opentransportdata.swiss must be cited as the source for raw data in publications and analyses." Required attribution: cite platform once if multiple sources (database exception).
- **Terms URL:** https://opentransportdata.swiss/en/terms-of-use/ (primary). Data portal: https://data.opentransportdata.swiss/. API Manager: https://api-manager.opentransportdata.swiss/ (key registration). Transitland feed: https://www.transit.land/feeds/f-u0-switzerland (aggregator page). Mobility Database: https://mobilitydatabase.org/ (catalog).
- **Keyed feeds:** Bearer key is personal and non-transferable per SBB ToU. Key agreement (API Manager terms) does not explicitly restrict data redistribution to users, but follow opentransportdata.swiss terms. Never paste a key.
- **Confidence:** `unclear`. Platform ToU requires attribution and regular updates, but does not spell out sublicensing or third-party redistribution explicitly. "Open Data" language and paid-tier offering suggest commercial use is acceptable, but formal license name (CC BY, CC0, ODbL) is absent. Do not assume either direction without explicit platform clarification or Tim sign-off. Same license confidence as Zurich and Basel (all use opentransportdata.swiss).

## What I did not do

No line-map generation, no station hand-transcription from the official map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on timezones, no published-transit coverage boundary map, no stopIds in the published JSON, no S-Bahn (BLS or RBS) integration in v1.

## Technical note: RBS underground station

The RBS Tiefbahnhof (underground station) opened during 2024/2025, serving 60,000+ passengers per day on metre-gauge tracks 21–24 directly beneath Bern Railway Station. If S-Bahn is added in a future wave, Luke and Jim must:
1. Verify GTFS completeness for RBS stops and platforms (platform naming may be in flux post-opening)
2. Confirm track assignments (21–24 vs surface platforms) are accurately represented
3. Ensure RBS and Bernmobil tram do not conflate at the shared Bern location

For v1 tram-only scope, this is noted but not blocking.
