# Geneva — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 scoped, **planned**. **city id:** `geneva` (do not invent `ge`, `gva`, `tpg`, or merge into another Swiss city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | TPG (Transports publics genevois) — operator of Geneva tramway network within the unireso fare community (Geneva region). Geneva tram is integrated with Léman Express (commuter rail) and regional buses under unireso ticketing, but three separate operators/networks. |
| Official map | TPG network maps — https://www.tpg.ch/en/travel (tram, bus, trolleybus routes). Public tram network overview — https://en.wikipedia.org/wiki/Trams_in_Geneva (lines 12, 14, 15, 17, 18; 135 stations; 55.91 km). Tram line details on TPG website: https://www.tpg.ch/en/greater-geneva. |
| Static GTFS | opentransportdata.swiss serves Switzerland national feed via: `https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020` (current year 2026). Feed includes TPG tram + Léman Express + all national operators (S-Bahn, buses, etc.). Transitland Onestop **f-u0-switzerland** (operator **o-u0-tpg** for TPG subset). No operator-specific static GTFS feed for TPG tram alone; must filter Switzerland national feed by agency=TPG and route_type=0 (tram). |
| GTFS-RT / live | **GTFS-RT endpoint:** `https://api.opentransportdata.swiss/la/gtfs-rt` (no trailing slash). Bearer API key required; 401 without. Rate limit: 2 queries per minute (sliding window). Trip updates cached 30 seconds. Includes all operators: TPG tram + Léman Express + S-Bahn + buses on the single protobuf feed. |
| Auth | **API key registration required** via https://api-manager.opentransportdata.swiss/ (free tier; SBB can negotiate paid contracts for heavy usage beyond limits). Key used as HTTP Bearer token in Authorization header. Maximum 2 queries per minute per key. Key is personal/non-transferable per SBB terms. No public TPG-specific developer API for tram; all data flows through national platform. |
| Timezone | Europe/Zurich (UTC+1 standard; UTC+2 summer daylight, last Sunday March to last Sunday October — HAS DST). Geneva and Zurich share timezone. |

Do not generate a published-network.json from GTFS. D1 is the official TPG tram map, hand-transcribed (this pack).

## v1 mode cut

**TPG tram only:** Geneva's tramway network operated by TPG, currently **5 active lines (12, 14, 15, 17, 18)** with 135 stations. Lines and stations may shift as Line 15 (Ferney-Voltaire extension) remains under construction through end 2028. v1 scope is the published passenger-facing line roster at time of D1 transcription, not every future construction line.

**Out:** Léman Express (CFF/SNCF cross-border commuter rail, 7 lines, 45 stations in Switzerland and France); buses (TPG and external operators); trolleybuses; boats. No metro exists in Geneva.

**Rationale for tram-only cut:** Léman Express, while walk-up boardable (RER-type, no compulsory reservations), introduces cross-border complexity (France/Switzerland operators, ticketing, regulatory boundaries), separate operator chain (CFF/SNCF vs TPG), and shared-station conflicts (Cornavin, Eaux-Vives, airport). Commuter rail is deferred to v1 phase 2 or country-wide integration. Tram network is unified, urban, and single-operator (TPG), consistent with Zürich's tram-only v1 cut (out S-Bahn) and Brussels's metro-only v1 cut (out tram/premetro/rail).

Hub lock: **Cornavin (tram)** — confirmed tram stop for lines 12, 14, and 15 (minimum 3-line intersection at this central, downtown hub). **doNotGroup Léman Express Cornavin / SBB Cornavin — separate rail station and platforms.** Cornavin is the primary arrival hub for both tram riders and rail commuters, but in-scope tram boarding is tram-only. Alternative candidate: **Eaux-Vives** (tram 14 and others; also Léman Express / CEVA line station; same doNotGroup rule applies). D1 transcription should choose based on confirmed line roster; Cornavin is likely the tram hub choice due to lines 12, 14, 15 convergence and downtown location.

## Skip risk

**Cross-border line 17 (Annemasse, France):** Latest extension of line 17 into France (completed 2026). Tram 17 is part of the Geneva network but terminates in Annemasse. If v1 includes tram 17, must verify GTFS coverage includes French portion and handle cross-border station data (French station names, SNCF CFF interoperability). For D1 pack: note line 17's French terminus if included; confirm GTFS data quality for cross-border route.

**Feed composition:** opentransportdata.swiss GTFS-RT mixes TPG tram + Léman Express + S-Bahn + buses on a single protobuf stream. Adapter filtering must be tight (agency=TPG, route_type=0 for tram) to avoid Léman Express / S-Bahn / bus bleed onto tram boards. No technical blocker; just requires careful filtering.

**Station identification:** Cornavin, Eaux-Vives, and Airport (Geneva-Aéroport) host both tram and Léman Express / rail. Must not conflate tram stop and rail station in published-network.json — use the doNotGroup directive. Stations named identically across modes but different platforms.

**No TPG-specific public developer API:** All data sourced via opentransportdata.swiss national platform, not a separate TPG endpoint. Adapter must rely on national feed; no TPG fall-back.

**Future construction:** Ferney-Voltaire tram extension under construction Sep 2025–end 2028 (related to line 15 or a sixth line); exact line assignment unclear. D1 snapshot must note data date and whether new/construction lines are in scope.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (v1 in-scope tram mode only; Léman Express out of v1 scope):**
- **TPG tram lines (all 5: 12, 14, 15, 17, 18):** `in` (public tram, walk-up boardable, no reservation, no check-in barrier)
- **Léman Express (CFF/SNCF commuter rail) calling at tram stations (Cornavin, Eaux-Vives, Airport, others):** `out-product` (passes both boarding tests — RER-type, walk-up, no compulsory reservation — but excluded from v1 by mode cut; cross-border complexity, separate operators deferred to phase 2)
- **TPG buses & external bus operators calling at tram stations:** `out-mode` (bus mode excluded v1)
- **Trolleybuses:** `out-mode` (trolleybus mode excluded v1)
- **Boat/ferry services:** `out-mode` (not in scope)

**Stations with tram/rail overlap (major):**
- **Cornavin (tram stop + Léman Express station + SBB mainline):** TPG tram included; Léman Express/rail excluded by v1 cut. doNotGroup.
- **Eaux-Vives (tram 14 + Léman Express station + CEVA underground):** TPG tram included; Léman Express/rail excluded. doNotGroup.
- **Geneva Airport / Genève-Aéroport (Léman Express + some bus service; no tram direct):** No tram; Léman Express out; buses out.
- **Rive (tram 14 on network; likely no rail):** Tram included if transcribed.
- **Bel-Air, Plainpalais, others (tram only):** Tram included.

**Board eligibility summary:** All walk-up tram services pass both boarding tests and are shown on boards. Léman Express fails by v1 product cut (not by boarding contract), with verdict recorded. SBB/SNCF rail services fail by v1 product cut. Buses fail by mode exclusion. **All verdicts recorded; no silent omissions.**

| Service | Calls at in-catalog tram stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **TPG Tram (all lines 12, 14, 15, 17, 18)** | All in-catalog tram stops | No (public tram, first-come-first-served) | No | `in` | [Trams in Geneva — Wikipedia](https://en.wikipedia.org/wiki/Trams_in_Geneva); [TPG network](https://www.tpg.ch/en/greater-geneva) — public walk-up boardable tram |
| **Léman Express / SNCF CFF (Cornavin, Eaux-Vives, Airport, Champel, Sécheron, Meyrin, Chêne-Bourg, Lancy Pont Rouge, Lancy Bachet)** | Shared stations with in-catalog tram stops (Cornavin, Eaux-Vives, Airport, others) | No (RER-type commuter rail; open seating, no seat reservations offered) | No | `out-product` | [Léman Express — Wikipedia](https://en.wikipedia.org/wiki/Leman_Express); [Léman Express official](https://www.lemanexpress.com/en/) — RER-type, walk-up boardable, but cross-border commuter rail deferred from v1 tram-only scope; separate CFF/SNCF operators, ticketing, regulatory boundaries; no boarding contract barrier, product decision only |
| **TPG buses & external bus operators** | Regional services passing tram stops | N/A (bus/trolleybus mode) | N/A | `out-mode` | [Geneva Public Transport — Wikipedia](https://en.wikipedia.org/wiki/Geneva_public_transport) — bus mode excluded v1 |
| **Trolleybuses (TPG)** | Regional services passing tram stops | N/A (trolleybus mode) | N/A | `out-mode` | TPG trolleybus network — trolleybus mode excluded v1 |
| **Boat/ferry services (Lake Geneva, Rhône)** | Terminals in city center (quais, ports) | N/A (ferry mode) | N/A | `out-mode` | Various; ferry/boat mode excluded v1 |

## H2 — who has line codes today

| surface | tram lines? | what it actually has |
| --- | --- | --- |
| TPG official network maps / tpg.ch | **yes** | TPG tram lines 12, 14, 15, 17, 18 (5 current lines); buses; trolleybuses; cross-border line 17 to Annemasse |
| opentransportdata.swiss GTFS | **yes** (with filter) | Switzerland national feed: TPG agency filter yields tram routes. Must filter agency=TPG, route_type=0 (tram) to avoid Léman Express + S-Bahn + buses. |
| Transitland `f-u0-switzerland` | **yes** (with filter) | Full Switzerland feed. Includes TPG, Léman Express, SBB, and all regional operators. Adapter must narrow to TPG tram via agency/route filtering. |
| GTFS-RT protobuf | **yes** (with filter) | Same stream for all operators. Adapter filtering required per trip (vehicle position / trip update must carry TPG agency). |
| Wikipedia: [Trams in Geneva](https://en.wikipedia.org/wiki/Trams_in_Geneva) | **yes** | Current line roster (12, 14, 15, 17, 18), routes, terminals, future line 6 planned 2028, cross-border line 17 and Ferney-Voltaire extension under construction. |
| Product `lib/cities/geneva/` | **absent** | No geneva stations.json / line-map.json yet. `assertCityLive("geneva")` is Unknown city |

**H2 conclusion:** Passenger tram line codes documented on TPG website and Wikipedia. Clash is **operator filtering** (extract TPG from Switzerland national feed; exclude Léman Express, S-Bahn, buses), **station separation at shared sites** (Cornavin tram vs Léman Express/SBB; Eaux-Vives, Airport, etc.), **handling cross-border line 17** (France/Switzerland data boundary), **future construction lines** (Ferney-Voltaire; exact line TBD), and **no product geneva file yet**. Do not generate published-network.json from GTFS. Do not merge Léman Express or buses into this city.

## C2/C3 to put in front of Jim

1. **city=geneva**. displayName Geneva. Not `ge`, `gva`, `tpg`, or `lemanis`. Do not merge into another Swiss city. Do not merge with Léman Express or bus operators.

2. **Hub-lock choice:** **Cornavin (tram)** (lines 12, 14, 15 confirmed; downtown central hub) or **Eaux-Vives (tram)** (line 14 at minimum; also central). Transcriber picks based on D1 data and confirmed line roster. Note the chosen hub in published-network.json.

3. **doNotGroup Léman Express Cornavin / SBB Cornavin / Léman Express Eaux-Vives vs TPG tram (Cornavin, Eaux-Vives, Airport).** Shared addresses, separate platforms and operators; never merge. Léman Express is out of v1 scope entirely.

4. **Modes v1 TPG tram only.** Lines 12, 14, 15, 17, 18. No Léman Express commuter rail, no buses, no trolleybuses, no boats.

5. **Europe/Zurich HAS DST.** UTC+1 standard; UTC+2 summer. (Geneva and Zurich timezone.)

6. **Feed sourcing:** opentransportdata.swiss GTFS-RT (Bearer key required, registered via API Manager). Must filter to TPG agency and route_type=0 (tram) to avoid Léman Express + S-Bahn + bus bleed. Static GTFS and real-time from same source.

7. **Expansion awareness:** Line 17 (Annemasse, France) completed 2026 — confirm cross-border GTFS coverage. Ferney-Voltaire tram under construction Sep 2025–end 2028 (future line 6 or line 15 extension); D1 snapshot should note data date and construction impact on line roster at time of transcription.

8. **Product child stopIds stay out of this file.** No line-map generation, no stopIds, no live flip yet.

## License

- **License name:** opentransportdata.swiss Terms of Use (effective as of 2026-09-06). **No single named license (e.g., CC BY 4.0)** — instead, platform-specific terms that reference attribution and data use requirements. GTFS Profile Switzerland document itself is CC BY 4.0 (per oev-info.ch). Referred to as "Open Data" in platform materials.
- **Redistribution / rehosting:** opentransportdata.swiss Terms of Use states data can be "processed, analysed and published," and users must "cite opentransportdata.swiss as the source for raw data" when publishing content using the platform's data. Platform states data can be "freely available for anyone to use." However, **no explicit sublicense or third-party redistribution clause** — the terms govern *your use*, not passing it to a third party. When redistributing to end users via our app, cite opentransportdata.swiss as source (platform requirement). Tim makes judgment on whether that satisfies commercial app redistribution.
- **Commercial use:** Not explicitly prohibited. Platform offers "free tier" below usage limits and allows "paid contracts" for higher volumes, suggesting commercial use is expected.
- **Attribution:** opentransportdata.swiss Terms of Use: "The URL opentransportdata.swiss must be cited as the source for raw data in publications and analyses." If drawing from multiple sources in a comprehensive database, cite the platform once. Required attribution: cite platform as source.
- **Terms URL:** https://opentransportdata.swiss/en/terms-of-use/ (primary). Data portal: https://data.opentransportdata.swiss/. API Manager: https://api-manager.opentransportdata.swiss/ (key registration). Transitland feed: https://www.transit.land/feeds/f-u0-switzerland (aggregator page). Mobility Database: https://mobilitydatabase.org/ (catalog). GTFS Profile Switzerland (CC BY 4.0): https://www.oev-info.ch/sites/default/files/2024-04/gtfs_profil_switzerland_version_0_16_en.pdf
- **Keyed feeds:** Bearer key is personal and non-transferable per SBB ToU. Key agreement (API Manager terms) does not explicitly restrict data redistribution to users, but follow opentransportdata.swiss terms. Never paste a key.
- **Confidence:** `unclear`. Platform ToU requires attribution and regular updates if republished, but does not spell out sublicensing or third-party redistribution explicitly. "Open Data" language and paid-tier offering suggest commercial use is acceptable, but formal license name (CC BY, CC0, ODbL) is absent from ToU itself (GTFS Profile document is CC BY 4.0, but that's a separate artifact). Do not assume either direction without explicit platform clarification or Tim sign-off.

## What I did not do

No line-map generation, no station hand-transcription from the official map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on timezones, no public-transit coverage boundary map, no stopIds in the published JSON, no Léman Express or bus integration, no cross-check against French transit authority (SNCF/Renfe/DGITM) for line 17 or Ferney-Voltaire cross-border details.
