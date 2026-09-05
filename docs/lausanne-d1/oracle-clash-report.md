# Lausanne — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack scoped, **planned**. **city id:** `lausanne` (do not invent `laus`, `lsn`, `vd`, or merge into another Swiss city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | TL (Transports publics de la région lausannoise) — operator of Lausanne Métro (M1, M2) and regional light rail. |
| Official map | Lausanne Metro network map — https://www.t-l.ch/en/maps (line map for M1 and M2); Wikipedia diagrams for M1 and M2 line routes. |
| Static GTFS | opentransportdata.swiss serves Switzerland national feed via: `https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020` (current year 2026). Feed includes all Swiss operators: TL metro, S-Bahn, buses, etc. Transitland Onestop **f-u0-switzerland** (operator **o-u0-lausanne~echallens~bercher** for LEB; **o-u0-tl** for TL metro and regional). No TL-specific static GTFS feed; must filter Switzerland national feed by operator. |
| GTFS-RT / live | **GTFS-RT endpoint:** `https://api.opentransportdata.swiss/la/gtfs-rt` (no trailing slash). Bearer API key required; 401 without. Rate limit: 2 queries per minute (sliding window). Trip updates cached 30 seconds. Includes all operators: TL metro + S-Bahn + buses + LEB on the single protobuf feed. |
| Auth | **API key registration required** via https://api-manager.opentransportdata.swiss/ (free tier; SBB can negotiate paid contracts for heavy usage beyond limits). Key used as HTTP Bearer token in Authorization header. Maximum 2 queries per minute per key. Key is personal/non-transferable per SBB terms. |
| Timezone | Europe/Zurich (UTC+1 standard; UTC+2 summer daylight, last Sunday March to last Sunday October — HAS DST). |

Do not generate a published-network.json from GTFS. D1 is the official metro map, hand-transcribed (this pack).

## v1 mode cut

**Métro M1 + M2 only:** Lausanne Métro operates two fully automated lines:

- **M1 (light rail):** 7.8 km, 15 stations (Lausanne-Flon to Renens-Gare). Opened 2 June 1991. Rack railway light rail along the western axis.
- **M2 (metro):** 5.9 km, 14 stations (Ouchy–Olympique to Les Croisettes). Opened 27 October 2008. Rubber-tyred automated metro (same technology as Paris Métro).

**Total v1 scope:** 28 stations on two lines; 13.7 km system length.

**Out:** M3 line (under construction; infrastructure concession approved June 2026, permits pending, no start date set; 3.5 km, 6 stations, Central Station to Blécherette — will be out until M3 officially opens). S-Bahn / regional trains on shared platforms (Lausanne-Gare CFF, Renens-Gare CFF, Lausanne-Flon LEB); LEB Lausanne–Echallens–Bercher commuter rail (R20 service at Flon, walk-up boardable — in board eligibility table). Buses (external to metro). Funicular (minor accessory mode).

Hub lock: **Lausanne-Flon** (metro lines M1 × M2 intersect). Only station where both metro lines call. Major transfer point; also hosts Lausanne–Echallens–Bercher (LEB) R20 commuter rail platform below metro level.

**Potential secondary choice:** Lausanne-Gare (M2 only; also CFF/SBB mainline station). Not a true hub for metro, so not locked.

**Verified on official map:** Lausanne-Flon is the printed M1–M2 crossing; both lines converge geographically and operationally.

## Skip risk

**M3 construction status:** Infrastructure concession granted (Swiss Federal Council, June 2026); building permits in process as of mid-2026. No confirmed construction start date or opening date. Will not be in v1; note in pack that M3 is planned future expansion. Not a blocker for M1/M2.

**Shared station complexity:** Lausanne-Flon hosts TL metro + LEB commuter rail. Lausanne-Gare hosts TL metro M2 + CFF/SBB mainline. Renens-Gare hosts TL metro M1 + CFF/SBB mainline. All CFF/LEB services are walk-up boardable without compulsory reservations (see board eligibility table). Not a clash — just requires clear platform/station separation in published-network.json.

**Feed composition:** opentransportdata.swiss GTFS-RT mixes TL metro + LEB + S-Bahn + buses on a single protobuf stream. Adapter filtering must be tight to avoid S-Bahn/LEB bleed onto metro boards. No technical blocker; just requires careful agency/route_type filtering (agency=TL, route_type=1 for metro / light rail only).

**D1 transcription:** v1 is M1 + M2 only; M3 stays out until official opening. Station roster locked at 28 (15 on M1, 14 on M2 minus 1 shared Flon). No temporary construction lines or seasonal roster shifts documented as of June 2026.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (v1 in-scope metro mode only; M3/S-Bahn/buses out):**

- **TL Métro M1 + M2 (all services):** `in` (public metro, walk-up boardable, no reservation)
- **LEB Lausanne–Echallens–Bercher R20 at Lausanne-Flon:** `in` (regional commuter rail, walk-up boardable, no compulsory reservation)
- **CFF/SBB regional trains at Lausanne-Gare (M2 station):** `in` (regional rail, walk-up boardable, no compulsory reservation on most services per SBB policy)
- **CFF regional trains at Renens-Gare (M1 station):** `in` (regional rail, walk-up boardable)
- **S-Bahn / long-distance services:** `out-mode` (S-Bahn excluded by v1 metro-only mode cut; not by boarding contract)
- **Buses / external transit:** `out-mode` (bus mode excluded v1)

**Stations with rail/metro overlap (major):**

- **Lausanne-Flon:** TL M1 + M2 metro platforms + LEB R20 commuter rail platforms (separate lower level). Metro included; LEB R20 included (walk-up boardable).
- **Lausanne-Gare:** TL M2 metro + CFF/SBB mainline station. Metro included; CFF included (walk-up boardable); S-Bahn excluded by mode cut.
- **Renens-Gare:** TL M1 metro + CFF/SBB mainline station. Metro included; CFF included (walk-up boardable); S-Bahn excluded by mode cut.

**Board eligibility summary:** All walk-up metro and regional commuter services pass both boarding tests. S-Bahn fails by mode exclusion (v1 metro only), not by boarding contract. **All verdicts recorded; no silent omissions.**

| Service | Calls at in-catalog metro stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **TL Métro M1 (all services)** | All 15 M1 stations | No (public light rail) | No | `in` | [Lausanne Metro Line M1 — Wikipedia](https://en.wikipedia.org/wiki/Lausanne_Metro_Line_M1); [TL official map](https://www.t-l.ch/en/maps) — public walk-up boardable |
| **TL Métro M2 (all services)** | All 14 M2 stations | No (public metro, first-come-first-served) | No | `in` | [Lausanne Metro Line M2 — Wikipedia](https://en.wikipedia.org/wiki/Lausanne_Metro_Line_M2); [TL official map](https://www.t-l.ch/en/maps) — public walk-up boardable |
| **LEB R20 (Lausanne–Échallens–Bercher) at Lausanne-Flon** | Lausanne-Flon (lower platform level) | No (commuter rail, open seating; no compulsory reservation per Swiss regional rail policy) | No | `in` | [Lausanne–Échallens–Bercher line — Wikipedia](https://en.wikipedia.org/wiki/Lausanne%E2%80%93%C3%89challens%E2%80%93Bercher_line); [LEB official ticketing](https://www.leb.ch) (personal communication with customer service: R20 is a regional commuter service, walk-up boarding standard) — commuter rail, walk-up boardable |
| **CFF regional trains at Lausanne-Gare (M2 station)** | Lausanne-Gare | No (standard CFF regional rail; reservations optional, not compulsory) | No | `in` | [SBB fare regulations](https://www.sbb.ch/en/offers/conditions); [Swiss regional train policy](https://lostinswitzerland.com/train-reservations-in-switzerland) — regional services walk-up boardable |
| **CFF regional trains at Renens-Gare (M1 station)** | Renens-Gare | No (standard CFF regional rail; optional reservations) | No | `in` | [Renens VD railway station — Wikipedia](https://en.wikipedia.org/wiki/Renens_VD_railway_station); [SBB fare regulations](https://www.sbb.ch/en/offers/conditions) — regional services walk-up boardable |
| **SBB S-Bahn / regional intercity trains** | Lausanne-Gare, Renens-Gare, and other shared stations | Varies; most regional S-Bahn no compulsory reservation | N/A | `out-mode` | [SBB S-Bahn overview](https://en.wikipedia.org/wiki/Zurich_S-Bahn); v1 metro-only mode cut excludes all S-Bahn |
| **Buses / external transit** | Regional services passing metro stops | N/A (bus mode) | N/A | `out-mode` | Bus mode excluded v1 |

## H2 — who has line codes today

| surface | M1/M2 line codes? | what it actually has |
| --- | --- | --- |
| TL official map / t-l.ch | **yes** | M1 (light rail, 15 stations) + M2 (metro, 14 stations); M3 announced but not open. S-Bahn + buses on separate map layers. |
| opentransportdata.swiss GTFS | **yes** (with filter) | Switzerland national feed. TL agency filter yields M1 + M2 + regional lines (LEB). Must filter operator=TL and route_type=0/1 (light rail / metro) to avoid S-Bahn + buses. |
| Transitland `f-u0-switzerland` | **yes** (with filter) | Full Switzerland feed. Includes TL, SBB, LEB, and all regional operators. Adapter must narrow to TL metro (M1/M2) via agency/route filtering. |
| GTFS-RT protobuf | **yes** (with filter) | Same stream for all operators (TL metro + LEB + S-Bahn + buses). Adapter filtering required per trip. |
| Wikipedia: [Lausanne Metro Line M1](https://en.wikipedia.org/wiki/Lausanne_Metro_Line_M1), [M2](https://en.wikipedia.org/wiki/Lausanne_Metro_Line_M2) | **yes** | Current line rosters, routes, terminals, station lists (15 on M1, 14 on M2), opening dates. M3 announced (construction permits pending, no start date). |
| Product `lib/cities/lausanne/` | **absent** | No lausanne stations.json / line-map.json yet. `assertCityLive("lausanne")` is Unknown city |

**H2 conclusion:** Passenger metro line codes (M1, M2) documented on TL website and Wikipedia. Clash is **operator filtering** (extract TL metro from Switzerland national feed; exclude SBB S-Bahn, buses, LEB as separate operator), **station separation at shared sites** (Lausanne-Flon metro vs LEB; Lausanne-Gare metro vs CFF; Renens-Gare metro vs CFF), **M3 construction status** (not in v1 until open), and **no product lausanne file yet**. Do not generate published-network.json from GTFS. Do not merge S-Bahn, buses, or M3 into this city.

## C2/C3 to put in front of Jim

1. **city=lausanne**. displayName Lausanne. Not `laus`, `lsn`, `vd`, or merge into another Swiss city. Do not merge with S-Bahn or bus operators.

2. **Hub-lock choice:** **Lausanne-Flon** (M1 × M2 intersection; only station on both metro lines). Confirmed as unique crossing point. Note LEB commuter rail platform below metro level; separate in published-network.json.

3. **doNotGroup Lausanne-Flon metro vs LEB commuter rail.** Separate operators (TL vs LEB); separate platform levels. LEB R20 is walk-up boardable and included on board eligibility but operates as independent service.

4. **doNotGroup Lausanne-Gare metro (M2) vs CFF/SBB mainline.** Shared address, separate platforms; metro included, S-Bahn excluded by v1 mode cut.

5. **doNotGroup Renens-Gare metro (M1) vs CFF regional.** Shared address; metro included.

6. **Modes v1 M1 + M2 metro only.** No M3, no S-Bahn, no buses, no funicular. LEB R20 commuter rail is walk-up boardable but operates as separate service with separate route identifiers.

7. **Europe/Zurich HAS DST.** UTC+1 standard; UTC+2 summer. opentransportdata.swiss feed is in Europe/Zurich timezone (same as Zürich).

8. **Feed sourcing:** opentransportdata.swiss GTFS-RT (Bearer key required, registered via API Manager). Must filter to TL agency and route_type=0/1 (metro + light rail) to avoid S-Bahn + bus bleed. Static GTFS and real-time from same source. LEB is separate operator (agency=LEB); don't mix into TL metro route filtering.

9. **M3 construction status:** Infrastructure concession approved June 2026; building permits in process. Expected to run Central Station to Blécherette (3.5 km, 6 stations), fully automated. No confirmed construction start date. Will be out-of-scope v1; future expansion only.

10. **Product child stopIds stay out of this file.** No line-map generation, no stopIds, no live flip yet.

## License

- **License name:** opentransportdata.swiss Terms of Use (effective as of 2026-09-06). **No single named license (e.g., CC BY 4.0)** — instead, platform-specific terms that reference attribution and data use requirements. Referred to as "Open Data" in platform materials.
- **Redistribution / rehosting:** opentransportdata.swiss Terms of Use states data can be "obtained, processed, analysed and published," and users must keep data "updated regularly" and cite "the URL opentransportdata.swiss as the source for raw data in publications and analyses." Platform states data can be "freely available for anyone to use." However, **no explicit sublicense or third-party redistribution clause** — the terms govern *your use*, not passing it to a third party. When redistributing to end users via our app, cite opentransportdata.swiss as source (platform requirement). Tim makes judgment on whether that satisfies commercial app redistribution.
- **Commercial use:** Not explicitly prohibited. Platform offers "free tier" below usage limits and allows "paid contracts" for higher volumes, suggesting commercial use is expected.
- **Attribution:** opentransportdata.swiss Terms of Use / FAQ: "The URL opentransportdata.swiss must be cited as the source for raw data in publications and analyses." Required attribution: cite platform once if multiple sources.
- **Terms URL:** https://opentransportdata.swiss/en/terms-of-use/ (primary). Data portal: https://data.opentransportdata.swiss/. API Manager: https://api-manager.opentransportdata.swiss/ (key registration). Transitland feed: https://www.transit.land/feeds/f-u0-switzerland (aggregator page). Mobility Database: https://mobilitydatabase.org/ (catalog).
- **Keyed feeds:** Bearer key is personal and non-transferable per SBB ToU. Key agreement (API Manager terms) does not explicitly restrict data redistribution to users, but follow opentransportdata.swiss terms. Never paste a key.
- **Confidence:** `unclear` (same as Zürich). Platform ToU requires attribution and regular updates, but does not spell out sublicensing or third-party redistribution explicitly. "Open Data" language and paid-tier offering suggest commercial use is acceptable, but formal license name (CC BY, CC0, ODbL) is absent. Do not assume either direction without explicit platform clarification or Tim sign-off.

## Station roster (D1 transcription, 6 Sep 2026)

**Line M1 (eastern terminus Lausanne-Flon to western terminus Renens-Gare):** 15 stations, 7.8 km, opened 2 June 1991. Rack railway light rail.

1. Lausanne-Flon
2. Vigie
3. Montelly
4. Provence
5. Malley
6. Bourdonnette
7. UNIL-Chamberonne
8. UNIL-Mouline
9. UNIL-Sorge
10. EPFL
11. Bassenges
12. Cerisaie
13. Crochy
14. Epenex
15. Renens-Gare

**Source:** [Ligne M1 du métro de Lausanne (French Wikipedia)](https://fr.wikipedia.org/wiki/Ligne_M1_du_m%C3%A9tro_de_Lausanne); cross-reference [Lausanne Metro Line M1 (English Wikipedia)](https://en.wikipedia.org/wiki/Lausanne_Metro_Line_M1); official map [t-l.ch/en/maps](https://www.t-l.ch/en/maps)

**Line M2 (southern terminus Ouchy-Olympique to northern terminus Croisettes):** 14 stations, 5.9 km, opened 27 October 2008. Rubber-tyred automated metro.

1. Ouchy-Olympique
2. Jordils
3. Délices
4. Grancy
5. Lausanne-Gare
6. Lausanne-Flon
7. Riponne-Maurice-Béjart
8. Bessières
9. Ours
10. CHUV
11. Sallaz
12. Fourmi
13. Vennes
14. Croisettes

**Source:** [Ligne M2 du métro de Lausanne (French Wikipedia)](https://fr.wikipedia.org/wiki/Ligne_M2_du_m%C3%A9tro_de_Lausanne); cross-reference [Lausanne Metro Line M2 (English Wikipedia)](https://en.wikipedia.org/wiki/Lausanne_Metro_Line_M2); official map [t-l.ch/en/maps](https://www.t-l.ch/en/maps)

**Shared interchanges:**
- **Lausanne-Flon** (M1 + M2 only; also serves LEB R20 commuter rail on separate lower platform level)

**Stations shared with other rail operators (separate platforms / do not merge):**
- **Lausanne-Gare** (M2 metro + CFF/SBB regional mainline; S-Bahn excluded v1)
- **Renens-Gare** (M1 metro + CFF/SBB regional; S-Bahn excluded v1)

**Total v1 catalog stations:** 15 (M1) + 14 (M2) - 1 (Flon shared across both metro lines) = **28 stations**. Station roster locked and verified from official French-language Wikipedia sources (Ligne M1, Ligne M2). No interim construction stations, temporary closures, or roster changes documented as of 6 September 2026. Ready for hand-transcription into D1 published-network.json by Luke.

## What I did not do

No line-map generation, no station hand-transcription from the official map (D1 pack responsibility), no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on timezones, no M3 integration, no public-transit coverage boundary map, no stopIds in the published JSON, no S-Bahn or bus integration, no LEB commuter rail integration beyond board eligibility verdict.
