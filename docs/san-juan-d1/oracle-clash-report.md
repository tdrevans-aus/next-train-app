# San Juan oracle clash report

D1 (draft, as of 6 Sep 2026): **San Juan Tren Urbano** is Puerto Rico's single-line automated rapid transit system, operated by the Autoridad de Transporte Integrado (ATI) under the Departamento de Transportación y Obras Públicas (DTOP). **16 stations** (Bayamón to Sagrado Corazón, 17.2 km / 10.7 miles) opened December 17, 2004, with 2025 ridership of 4,438,400. System serves San Juan, Guaynabo, and Bayamón municipalities. Stations manually verified from official ATI system map and station pages; no GTFS feed currently published.

Supporting official pages (ordered stops / tokens):

- [ATI — Autoridad de Transporte Integrado: Tren Urbano](https://www.ati.pr.gov/transportacion-urbana?tab=TREN)
- [Tren Urbano — Wikipedia](https://en.wikipedia.org/wiki/Tren_Urbano)
- [List of Tren Urbano stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Tren_Urbano_stations)
- [Sagrado Corazón station — Wikipedia](https://en.wikipedia.org/wiki/Sagrado_Coraz%C3%B3n_station)
- [Río Piedras station — Wikipedia](https://en.wikipedia.org/wiki/R%C3%ADo_Piedras_station)
- [San Juan Tren Urbano Map & Stations](https://mapa-metro.com/en/puerto-rico/san-juan/san-juan-tren-urbano-map.htm)
- [Tren Urbano | Build America (USDOT)](https://www.transportation.gov/buildamerica/projects/tren-urbano)

Hub lock: **Sagrado Corazón** (Station #16, northern terminus). Sagrado Corazón is the primary intermodal transfer hub, with direct bus connections to 9 ATI routes (numbered 1, 2, 3, 9, 10, 15, 21, 22, 35, 36, 45). The station includes a bus terminal at its south entrance serving E10 express route to Old San Juan and regional connections. Unified ATI transit card allows free transfers between train and bus within two-hour window.

H2 clash surface (after transcription): **no** product `lib/cities/san-juan/`. Clash is **single-line system with no junctions to other rail networks**. 16 stations currently operational; no expansion planned within v1 scope. Tren Urbano is Puerto Rico's sole urban rail system (no commuter rail, no metro, no other regional rail operator calls at any Tren Urbano station). No mix-in with any other Puerto Rico or US city. v1 cut to Tren Urbano rail only — no bus service, no ferry service, no other modes.

## Station name table

Match rule: published ATI system map vs official Wikipedia station pages and ATI official station roster. All Tren Urbano stations use consistent official naming, west to east (Bayamón terminus to Sagrado Corazón terminus).

| # | Published D1 (ATI / official) | Locale / Landmark | Class |
| --- | --- | --- | --- |
| 1 | Bayamón | Bayamón (western terminus) | Terminal; multiple bus routes |
| 2 | Deportivo | San Juan | **match** |
| 3 | Jardines | San Juan | **match** |
| 4 | Torrimar | Guaynabo | **match** |
| 5 | Martínez Nadal | Guaynabo | **match** |
| 6 | Las Lomas | Guaynabo | **match** |
| 7 | San Francisco | San Juan | **match** |
| 8 | Centro Médico | San Juan | **match** |
| 9 | Cupey | Río Piedras / San Juan | **match** |
| 10 | Domenech | Río Piedras / San Juan | **match** |
| 11 | Piñero | Río Piedras / San Juan | **match** (bus hub: Routes 4, 8, 17, 26, 40, 41) |
| 12 | Roosevelt | San Juan | **match** |
| 13 | Hato Rey | San Juan | **match** |
| 14 | Universidad | Río Piedras / San Juan | **match** (University of Puerto Rico campus) |
| 15 | Río Piedras | Río Piedras / San Juan | **match** |
| 16 | Sagrado Corazón | San Juan (eastern terminus) | **match (lock)**. Northern terminus; major bus hub. |

**16** unique D1 passenger stops (all operational as of Sep 2026). Single line, no branches, no junctions with other rail networks. Product `lib/cities/san-juan/` is **absent**. **Zero** mix-in with any other city file.

## H2 — who has line codes today

| Surface | Single Line? | What it actually has |
| --- | --- | --- |
| ATI System Map + official pages (D1) | **yes (Tren Urbano automated)** | One automated rapid transit line, 16 stations. No branches. No other rail modes in v1. |
| Official ATI pages + Wikipedia station roster | **yes (live pages)** | Unified Tren Urbano branding. Stop sequences from ATI map + official station pages. Sagrado Corazón hub callout (terminal + bus connections). |
| Product `lib/cities/san-juan/` | **absent** | No san-juan stations.json / line-map.json. `assertCityLive("san-juan")` is Unknown city. |
| GTFS Static | **not available** | No public GTFS feed currently published. Modernization announced March 2024 as part of $22 million investment; feed not yet released. See **Skip risk** section. |
| GTFS-RT (vehicle positions + trip updates) | **not available** | No GTFS-RT feed published or confirmed. |

H2 conclusion: single automated transit line with no branches, no junctions to other rail lines, and no other rail operator calling at any station. Clash is **no published stop-name mismatches between ATI map and official pages**, **Sagrado Corazón is the sole operational hub (terminal + bus)**, and **no product san-juan file**. GTFS feed absent; field verification required before adapter wiring. Do not generate published-network.json from GTFS. Tren Urbano is single-line system; no merge ambiguity. v1: Tren Urbano rail only (no bus, no ferry, no other modes).

## C2/C3 to put in front of Jim

1. **city=san-juan**, not `tren-urbano`, not `san-juan-rail`. Single city identifier.
2. **Sagrado Corazón** (Station #16, northern terminus) is the operational hub-lock (terminal + 9 bus routes). Not Bayamón (western terminus, also a bus hub), not Río Piedras, not Centro Médico.
3. **Single line: Tren Urbano (automated rapid transit).** No branches. No junction with commuter rail, regional rail, or other metro systems (no other rail operator in Puerto Rico calls at Tren Urbano stations).
4. **16 stations operational as of Sep 2026** (all original stations from Dec 2004 opening; no expansion within v1 scope).
5. **v1: Tren Urbano rail only.** No ATI bus service, no ferry, no surface transit. Tren Urbano is Puerto Rico's sole urban rail system; mode cut is clean.
6. **Timezone: America/Puerto_Rico** (Atlantic Standard Time, UTC-5; no daylight saving time observed).
7. **GTFS Static: not available.** No public feed currently published. ATI announced GTFS modernization (March 2024, $22 million investment), but feed has not been released as of Sep 2026. **Skip risk: feed required before adapter wiring; field verification needed once published.**
8. **GTFS-RT: not available.** No real-time feed confirmed.
9. **Auth type: N/A** (GTFS feed not yet available).
10. Do not generate published-network.json. Do not merge with any other city or Puerto Rico operator file. Tren Urbano is single line with no cross-city entanglement. This pack stays **planned** until GTFS feed is available and verified.
11. **Sagrado Corazón as hub-lock:** Station must match ATI official designation. Unified ATI transit card integrates Tren Urbano + bus network. No separate rail fare zone or access gate.

## Board eligibility

Tren Urbano is the sole rail operator calling at all in-catalog Tren Urbano stations. The system is operated by ATI (Autoridad de Transporte Integrado) under DTOP (Departamento de Transportación y Obras Públicas) with no commuter rail, no regional intercity rail, no other metro system, and no secondary rail operator with walk-up access at any Tren Urbano station.

**ATI bus service:** Operates as a separate bus network with separate fare structure, but unified ATI transit card payment accepted. Explicitly excluded from v1 scope per mode cut (rail only). Not subject to board eligibility verdict — out-product cut is mode/product, not fare/service.

**Summary:** All walk-up rail services at in-catalog Tren Urbano stations are Tren Urbano automated rapid transit (single line, 16 stations). No rail service other than Tren Urbano calls at these stations. No board eligibility verdicts beyond the mode cut (Tren Urbano rail, exclude ATI bus). No service exclusions on boarding contract grounds (compulsory reservation, check-in barriers) — Tren Urbano is walk-up boardable, no reserved seating, no check-in process.

## License

- **License name:** Puerto Rico Open Government Data Act (Act 122-2019, as amended). Tren Urbano GTFS feed status: not yet published.
- **Redistribution / rehosting:** Unclear. Puerto Rico Act 122-2019 establishes framework for open government data, administered by PRITS (Puerto Rico Innovation and Technology Service) and the Institute of Statistics. Specific GTFS dataset license (CC BY, CC0, ODbL, proprietary, or public domain) not found in public documentation. GTFS feed has not been released; license terms for the feed must be verified once published.
- **Commercial use:** Unclear (pending feed publication and license documentation).
- **Attribution:** Required per Act 122-2019 general open data policy, but specific GTFS dataset attribution requirements not yet documented.
- **Terms URL:** https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/2-ingles/122-2019.pdf (Puerto Rico Open Government Data Act); https://www.ati.pr.gov/transportacion-urbana?tab=TREN (ATI official Tren Urbano page); no dedicated GTFS license page found.
- **Confidence:** `unclear`. GTFS feed not published as of Sep 2026. Act 122-2019 applies, but specific dataset license unknown. **Recommendation:** Contact ATI / DTOP to confirm GTFS feed publication status, license terms, and redistribution permissions before adapter wiring. Public feed URL must be obtained and verified.
- **Keyed feeds:** GTFS feed not yet available; auth requirements unknown pending publication.

---

## Station roster (16 operational, Sep 2026)

**West to East (Bayamón to Sagrado Corazón):**

1. Bayamón (Terminal, western terminus; Routes 2, 20, 37, 91, 92)
2. Deportivo (San Juan)
3. Jardines (San Juan)
4. Torrimar (Guaynabo)
5. Martínez Nadal (Guaynabo)
6. Las Lomas (Guaynabo)
7. San Francisco (San Juan)
8. Centro Médico (San Juan; Routes 17, 19)
9. Cupey (Río Piedras / San Juan)
10. Domenech (Río Piedras / San Juan)
11. Piñero (Río Piedras / San Juan; Routes 4, 8, 17, 26, 40, 41)
12. Roosevelt (San Juan)
13. Hato Rey (San Juan; financial district)
14. Universidad (Río Piedras / San Juan; University of Puerto Rico campus) [precedes hub]
15. Río Piedras (Río Piedras / San Juan; intermodal with trolleys and public vans)
16. Sagrado Corazón (Terminal, northern terminus; **hub-lock**. Routes 1, 2, 3, 9, 10, 15, 21, 22, 35, 36, 45. E10 express to Old San Juan. Major bus terminal.)

**Total: 16 unique operational stations** (single line, no branches, opened December 17, 2004). No planned expansion within v1 scope.

---

## Skip risk

**GTFS feed not currently available.** Tren Urbano GTFS modernization was announced in March 2024 as part of a $22 million public transportation improvement initiative. However, as of Sep 2026, no public GTFS static feed has been published by ATI or DTOP through standard channels (Transitland, Mobility Database, or official agency developer portal). **Field verification required:** contact ATI directly to confirm feed publication status, obtain feed URL, verify license terms, and confirm GTFS coverage completeness and stop-order conformance to official ATI system map before adapter wiring.

**Single operator, no licensing conflicts:** Tren Urbano is Puerto Rico's sole urban rail system; no other operator, mode, or jurisdiction introduces feed multiplexing, boundary definition, or multi-agency licensing challenges typical of larger metro areas.

**No GTFS-RT:** No real-time vehicle position or trip-update feed found or confirmed. v1 will be schedule-only until GTFS-RT becomes available.

**Fare integration via ATI card:** Tren Urbano and ATI bus network share unified fare system (no separate purchase needed). No known conflicts, but integration may require coordination with bus GTFS if future board eligibility includes bus service.

---

**Status:** D1 draft scoped as of 6 Sep 2026. 16 stations operational (single line). GTFS feed not yet published; modernization in progress. No GTFS-RT available. Field verification required once feed is released. Pack remains **planned** until GTFS feed is verified and available for wiring.
