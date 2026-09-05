# Basel — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack scoped, **to do**. **city id:** `basel` (do not invent `bs`, `bsl`, `bvb`, `blt`, or merge into another Swiss city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agencies | **BVB (Basler Verkehrs-Betriebe)** — operator of inner-city tramway network (9 tram routes) within Basel-Stadt canton. **BLT (Baselland Transport AG)** — operates 4 of 5 longer suburban tram routes across Basel-Stadt and Basel-Landschaft cantons, plus buses. **SBB (Swiss Federal Railways)** / **DB Regio** / **SNCF TER Grand Est** — operate Basel S-Bahn, a trinationale suburban rail system across Switzerland, Germany, and France with 108 stations (out-of-scope v1). |
| Official map | ZVV network maps / BVB website — https://www.bvb.ch/ (displays BVB/BLT tram network and Basel SBB S-Bahn). Basel tram network diagram — https://en.wikipedia.org/wiki/Trams_in_Basel (line routes, operations, BVB/BLT cooperation model). Basel S-Bahn — https://en.wikipedia.org/wiki/Basel_S-Bahn (trinationale service area and cross-border extent). |
| Static GTFS | opentransportdata.swiss serves Switzerland national feed via: `https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020` (current year 2026). Feed includes BVB/BLT tram + all national operators (S-Bahn, buses, etc.). Transitland Onestop **f-u0-switzerland** (aggregates all Swiss operators including BVB, BLT, SBB). Historical feeds via opendata.swiss. No operator-specific static GTFS feed for BVB/BLT tram alone; must filter Switzerland national feed by agency (BVB, BLT) and route_type=0 (tram). |
| GTFS-RT / live | **GTFS-RT endpoint:** `https://api.opentransportdata.swiss/la/gtfs-rt` (no trailing slash). Bearer API key required; 401 without. Rate limit: 2 queries per minute (sliding window). Trip updates cached 30 seconds. Includes all operators: BVB/BLT tram + S-Bahn + buses on the single protobuf feed. Adapter filtering must separate BVB/BLT tram (route_type=0, agency_id=BVB or BLT) from S-Bahn (route_type=2, agency_id=SBB/DB/TER). |
| Auth | **API key registration required** via https://api-manager.opentransportdata.swiss/ (free tier; SBB can negotiate paid contracts for heavy usage beyond limits). Key used as HTTP Bearer token in Authorization header. Maximum 2 queries per minute per key. Key is personal/non-transferable per SBB terms. |
| Timezone | Europe/Zurich (UTC+1 standard; UTC+2 summer daylight, last Sunday March to last Sunday October — HAS DST). |

Do not generate a published-network.json from GTFS. D1 is the official BVB/BLT tram map, hand-transcribed (this pack).

## v1 mode cut

**BVB + BLT tram only:** Basel's tramway network operated jointly by BVB (inner-city, 9 routes) and BLT (suburban, 4–5 longer routes). Current active tram lines: approximately 12–15 lines across both operators serving the Basel metropolitan area. v1 scope is the published passenger-facing tram line roster at time of D1 transcription, not construction lines or seasonal variations.

**Out:** S-Bahn (trinationale suburban rail: SBB/DB/SNCF regional/commuter trains across Switzerland/Germany/France, 108 stations); buses (BVB buses and external operators); boats/ferries; funicular or other accessory modes. No metro exists in Basel.

**Rationale for tram-only cut:** Basel S-Bahn is a trinationale service crossing borders into France (Grand Est / Alsace) and Germany (Baden-Württemberg). While walk-up boardable and technically eligible for boards, the three-operator coordination (SBB + DB + TER), cross-border documentation complexity, and 108-station network make it a v2+ candidate, not a v1 priority. Tram is self-contained within the Basel metropolitan area (BVB + BLT) and offers a clean, focused initial scope.

Hub lock: **Basel SBB** (Swiss Federal Railways main terminal, also served by 6 tram lines: 1, 2, 8, 10, 11, 16; central hub where BVB inner-city routes converge). Alternative hub-lock candidates: **Bahnhofplatz** (central tram hub, lines 2, 8 converge in city centre) or tram interchange point at **Marktplatz** (if hand-transcribed as a major interchange). **doNotGroup S-Bahn Basel SBB mainline** — S-Bahn platforms and BVB tram stops are at the same address but separate platforms; exclude S-Bahn from tram boards.

**Potential choice:** Basel SBB is geographically most central and has the most tram lines (6 confirmed). D1 transcription should choose one hub, noting both alternatives.

## Skip risk

**S-Bahn complexity and cross-border hazard:** Basel S-Bahn spans Switzerland, Germany, and France. While walk-up boardable (no compulsory reservation on S-Bahn services per SBB ticketing rules), the trinationale network involves:
- **Multi-operator coordination:** SBB (Switzerland) + DB Regio (Germany) + TER Grand Est (France) must all be represented in the adapter
- **Border station behavior:** Some stations may have customs/documentation requirements or special boarding procedures (e.g., Mulhouse TER, Strasbourg TER, Lörrach DB)
- **108 stations across three countries:** Large scope for a first Swiss city wave beyond tram
- **Potential regulatory differences:** Fare structures, ticket validation, boarding rules may differ by operator/country

**Recommendation:** v1 is tram-only; defer S-Bahn to a future country-lane or expanded Basel wave. This is not a feed-availability issue (opentransportdata.swiss includes S-Bahn); it is a **scope and coordination risk**. Tram alone is a clean, self-contained MVP.

**Tram hazards (none):** BVB/BLT tram is walk-up, no reservation, no border crossing. Feed composition (opentransportdata.swiss) mixes tram + S-Bahn + buses, so adapter filtering must be tight (route_type=0 and agency=BVB/BLT) to avoid bleed. Same filtering pattern as Zurich; no technical blocker.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (v1 in-scope tram mode only; S-Bahn out):**
- **BVB tram lines (all 9 in-city routes):** `in` (public tram, walk-up boardable, no reservation)
- **BLT tram lines (suburban routes):** `in` (public tram, walk-up boardable, no reservation)
- **Basel S-Bahn / trinationale services (SBB/DB/TER cross-border lines calling at Basel SBB and other Basel stations):** `out-mode` (excluded by v1 tram-only mode cut; *technically* S-Bahn itself is walk-up boardable without compulsory reservation, but falls outside mode scope as a future expansion)
- **BVB buses & external bus operators:** `out-mode` (bus mode excluded v1)
- **Boat/ferry services:** `out-mode` (not in scope)

**Stations with rail/tram overlap (major):**
- **Basel SBB (Hauptbahnhof):** BVB/BLT tram platforms + SBB/DB/TER S-Bahn mainline platforms (separate areas). Tram included; S-Bahn excluded by mode cut.
- **Basel Dreispitz:** BVB/BLT tram + S-Bahn station (if S-Bahn calls). Tram included; S-Bahn excluded.
- **Basel St. Johann:** BVB/BLT tram + S-Bahn station (if S-Bahn calls). Tram included; S-Bahn excluded.

**Board eligibility summary:** All walk-up tram services (BVB + BLT) pass both boarding tests and are shown on boards. S-Bahn fails by mode exclusion (v1 tram only), not by boarding contract. **All verdicts recorded; no silent omissions.**

| Service | Calls at in-catalog tram stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **BVB Tram (all 9 in-city routes)** | All in-catalog BVB tram stops (Basel city centre) | No (public tram, first-come-first-served) | No | `in` | [Trams in Basel — Wikipedia](https://en.wikipedia.org/wiki/Trams_in_Basel); [BVB network](https://www.bvb.ch/) — public walk-up boardable |
| **BLT Tram (4–5 suburban routes)** | All in-catalog BLT tram stops (suburban Basel-Stadt / Basel-Landschaft) | No (public tram, first-come-first-served) | No | `in` | [Baselland Transport — Wikipedia](https://en.wikipedia.org/wiki/Baselland_Transport); [BLT network](https://www.blt.ch/) — public walk-up boardable |
| **Basel S-Bahn / Trinationale services (SBB/DB/TER across Switzerland/Germany/France)** | Shared stations with in-catalog tram stops (Basel SBB, Dreispitz, St. Johann, etc.) | No (open seating; reservations not offered on S-Bahn) | No | `out-mode` | [Basel S-Bahn — Wikipedia](https://en.wikipedia.org/wiki/Basel_S-Bahn) — walk-up boardable but excluded by v1 tram-only mode cut; trinationale service deferred to future expansion |
| **BVB buses & external bus operators** | Regional services passing tram stops | N/A (bus mode) | N/A | `out-mode` | [Public transport in Basel — Wikipedia](https://en.wikipedia.org/wiki/Basel,_Switzerland) — bus mode excluded v1 |
| **Boat/ferry services** | Terminals in city centre (if any) | N/A (ferry mode) | N/A | `out-mode` | Not confirmed in Basel; ferry mode excluded v1 |

## H2 — who has line codes today

| surface | tram lines? | what it actually has |
| --- | --- | --- |
| BVB / BLT official maps / websites | **yes** | BVB 9 in-city tram routes + BLT 4–5 suburban tram routes + buses + S-Bahn (via regional operator integration) |
| opentransportdata.swiss GTFS | **yes** (with filter) | Switzerland national feed: BVB/BLT agency filter yields tram routes. Must filter route_type=0 (tram) and agency=BVB or BLT to avoid S-Bahn + buses. |
| Transitland `f-u0-switzerland` | **yes** (with filter) | Full Switzerland feed. Includes BVB, BLT, SBB, and all regional operators. Adapter must narrow to BVB/BLT tram via agency/route filtering. |
| GTFS-RT protobuf | **yes** (with filter) | Same stream for all operators. Adapter filtering required per trip (vehicle position / trip update must carry BVB or BLT agency). |
| Wikipedia: [Trams in Basel](https://en.wikipedia.org/wiki/Trams_in_Basel) | **yes** | Current line roster, routes, BVB/BLT cooperation model, no recent major renovation notes. |
| Product `lib/cities/basel/` | **absent** | No basel stations.json / line-map.json yet. `assertCityLive("basel")` is Unknown city |

**H2 conclusion:** Passenger tram line codes documented on BVB / BLT websites and Wikipedia. Clash is **operator filtering** (extract BVB/BLT from Switzerland national feed; exclude SBB, buses), **station separation at shared sites** (Basel SBB tram vs S-Bahn; Dreispitz, St. Johann, etc.), **multi-line hubs** (Basel SBB served by 6 tram lines), and **no product basel file yet**. Do not generate published-network.json from GTFS. Do not merge S-Bahn or buses into this city in v1.

## C2/C3 to put in front of Jim

1. **city=basel**. displayName Basel. Not `bs`, `bsl`, `bvb`, or `blt`. Do not merge into another Swiss city. Do not merge with S-Bahn or bus operators in v1.

2. **Hub-lock choice:** **Basel SBB** (tram lines 1, 2, 8, 10, 11, 16 confirmed; S-Bahn platforms also call here but excluded by mode cut). Alternative hubs noted: **Bahnhofplatz** or **Marktplatz** if more central in D1 transcription. Transcriber picks based on D1 data date.

3. **doNotGroup S-Bahn Basel SBB vs BVB/BLT Basel SBB tram.** Shared address, separate platforms; never merge.

4. **Modes v1 BVB + BLT tram only.** No S-Bahn, no buses, no boats, no funicular.

5. **Europe/Zurich HAS DST.** UTC+1 standard; UTC+2 summer.

6. **Feed sourcing:** opentransportdata.swiss GTFS-RT (Bearer key required, registered via API Manager). Must filter to BVB or BLT agency and route_type=0 (tram) to avoid S-Bahn + bus bleed. Static GTFS and real-time from same source.

7. **Cross-border awareness:** Basel S-Bahn touches France (Alsace / TER Grand Est) and Germany (Baden-Württemberg / DB Regio). Some tram routes may also cross borders (verify in D1 transcription). v1 stays within Switzerland; trinationale S-Bahn is a future expansion.

8. **Product child stopIds stay out of this file.** No line-map generation, no stopIds, no live flip yet.

## License

- **License name:** opentransportdata.swiss Terms of Use (effective as of 2026-09-06). **No single named license (e.g., CC BY 4.0)** — instead, platform-specific terms that reference attribution and data use requirements. Referred to as "Open Data" in platform materials.
- **Redistribution / rehosting:** opentransportdata.swiss Terms of Use §3 states data can be "processed, analysed and published," and users must "publish processed data under the name of the data user" and keep data "updated regularly." Platform states data can be "freely available for anyone to use." However, **no explicit sublicense or third-party redistribution clause** — the terms govern *your use*, not passing it to a third party. When redistributing to end users via our app, cite opentransportdata.swiss as source (platform requirement). Tim makes judgment on whether that satisfies commercial app redistribution.
- **Commercial use:** Not explicitly prohibited. Platform offers "free tier" below usage limits and allows "paid contracts" for higher volumes, suggesting commercial use is expected.
- **Attribution:** opentransportdata.swiss Terms of Use §4 / FAQ: "The URL opentransportdata.swiss must be cited as the source for raw data in publications and analyses." Required attribution: cite platform once if multiple sources.
- **Terms URL:** https://opentransportdata.swiss/en/terms-of-use/ (primary). Data portal: https://data.opentransportdata.swiss/. API Manager: https://api-manager.opentransportdata.swiss/ (key registration). Transitland feed: https://www.transit.land/feeds/f-u0-switzerland (aggregator page). Mobility Database: https://mobilitydatabase.org/ (catalog).
- **Keyed feeds:** Bearer key is personal and non-transferable per SBB ToU. Key agreement (API Manager terms) does not explicitly restrict data redistribution to users, but follow opentransportdata.swiss terms. Never paste a key.
- **Confidence:** `unclear`. Platform ToU requires attribution and regular updates, but does not spell out sublicensing or third-party redistribution explicitly. "Open Data" language and paid-tier offering suggest commercial use is acceptable, but formal license name (CC BY, CC0, ODbL) is absent. Do not assume either direction without explicit platform clarification or Tim sign-off. Same license confidence as Zurich (both use opentransportdata.swiss).

## What I did not do

No line-map generation, no station hand-transcription from the official map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on timezones, no published-transit coverage boundary map, no stopIds in the published JSON, no S-Bahn integration in v1.
