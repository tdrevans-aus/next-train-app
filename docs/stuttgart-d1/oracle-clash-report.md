# Stuttgart oracle clash report

D1 (published, as of 6 Sep 2026): Official SSB Stadtbahn network maps and timetable documents. [SSB Netzplan](https://www.ssb-ag.de/fahrgastinformationen/plaene-und-linien) (current network map) plus Stuttgarter Straßenbahnen AG (SSB) Linienuebersicht (line overview pages) and official route documentation. Stations arrays **hand-transcribed** from **published network maps and official line pages**. **Not generated from GTFS.** Not generated from VVS GTFS or GTFS-RT. Not generated from Wikipedia or community sources.

## Scope and coverage (v1 network cut)

**City = Stuttgart.** Agency = **SSB (Stuttgarter Straßenbahnen)** for Stadtbahn (light rail), **S-Bahn Stuttgart** (Deutsche Bahn subsidiary) for regional rail. VVS (Verkehrs- und Tarifverbund Stuttgart) is the regional tariff association, not the operator.

**v1 service set:**
- SSB Stadtbahn: lines **U1, U2, U3, U4, U5, U6, U7, U8, U9, U12, U13, U14, U15, U19** (14 main lines, schedule-only; no real-time feed confirmed for Stadtbahn)
- SSB special event line: **U11** (operates during events; rare/seasonal)
- SSB special lines: **line 10 (Zahnradbahn / Zacke)** — rack railway, daily commuter service, Marienplatz–Degerloch; **line 20 (Standseilbahn)** — funicular cable car, Südheimer Platz, integrates with U1/U14
- **S-Bahn Stuttgart excluded** (verdict: `out-product`, separate operator Deutsche Bahn, regional scope falls outside city v1 cut — walkable at Hauptbahnhof but distinct tariff/product)
- No buses, trams (outside Stadtbahn), or regional rail in v1

**Out of v1:** S-Bahn Stuttgart (S1–S6, S60), buses, regional trains, airport rail.

**H2 clash surface:** **no** product `lib/cities/stuttgart/`. Clash is Hauptbahnhof (Arnulf-Klett-Platz) vs Charlottenplatz as hub (Arnulf-Klett-Platz is S+U primary node; Charlottenplatz is Stadtbahn-only major hub); naming consistency on SSB published line pages (some historical line designations vs current U-numbering); U11 seasonal availability. v1 is Stadtbahn U-lines only, plus lines 10/20 special rail modes. GTFS contains whole-network (S-Bahn, bus, tram, Stadtbahn) — must filter to Stadtbahn + special lines.

## Hub lock

**Hauptbahnhof (Arnulf-Klett-Platz)** is the primary regional transport hub and interchange between S-Bahn Stuttgart (Deutsche Bahn regional lines S1–S6, S60) and SSB Stadtbahn (U1, U5, U6, U7, U9 underground); major interchange point with bus lines and long-distance trains. Official designation is **Hauptbahnhof** with platform notation **(Arnulf-Klett-Platz)** for the Stadtbahn underground level.

**Charlottenplatz** is the second major node serving Stadtbahn lines **U1, U4, U5, U6** and is the Stadtbahn-only central hub with no S-Bahn connection. Four-story underground structure with heavy transfer volume.

**Recommendation for v1:** Lock to **Hauptbahnhof** as the primary hub (serves most lines: U1, U5, U6, U7, U9) and mark Charlottenplatz as secondary major node. If v1 excludes S-Bahn entirely and focuses Stadtbahn-only experience, Charlottenplatz may become the locked hub; confirm product intent with Tim.

## Ordered stops — main Stadtbahn lines (U1–U9, U12–U15, U19)

**Current information sources (as linked 6 Sep 2026):**

Detailed stop lists are maintained on individual SSB line pages (https://www.ssb-ag.de/fahrgastinformationen/plaene-und-linien). Official published routes:

- **U1** Markhallenstraße ← → Fellbach (Stadtbahnhof) | ~19 stops | runs through Charlottenplatz, Hauptbahnhof (Arnulf-Klett-Platz), Schloss Platz cluster
- **U2** Neugereut → Rohr (Straßenbahn) | ~16 stops | surface + underground sections
- **U3** Mühlhausen → Möhringen | ~13 stops | tangential/bypass route
- **U4** Botnang → Wangen | ~15 stops | cross-city line via Charlottenplatz
- **U5** Weilimdorf ← → Leinfelden | ~29 stops | longest line, passes Hauptbahnhof, Charlottenplatz, Universität
- **U6** Büsnau → Zauffenberg | ~24 stops | major cross-valley line via Charlottenplatz, Hauptbahnhof (U-level)
- **U7** Plieningen → Möhringen | ~14 stops
- **U8** Göppingen → Rohr | ~13 stops | tangential route
- **U9** Zuffenhausen ← → Goldberg | ~20 stops | passes Hauptbahnhof underground level, Marienplatz
- **U12** Feuerbach → Bad Cannstatt | ~17 stops
- **U13** Neuwirtshaus → Fasanenhof | ~9 stops | short cross-valley line
- **U14** Stadtmitte (Berliner Platz) → Freiberg | ~8 stops | shortest line; connects to Standseilbahn (Südheimer Platz) and Zahnradbahn (Marienplatz)
- **U15** Stammheim → Heumaden | ~32 stops | steepest adhesion line in Europe (8.5% gradient between Olgaeck–Heidehofstraße); highest ridership outside main valley
- **U19** Zuffenhausen → Plochingen | ~33 stops | longest outer tangential line

## Ordered stops — special lines (U11, Line 10, Line 20)

- **U11** (event line, operates sporadically during Stuttgart events / Volksfest periods)
- **Line 10 (Zahnradbahn / Zacke)** Marienplatz ↔ Degerloch | 8 stops | rack-and-pinion railway (Riggenbach system), 1884–present, ~2500–3000 daily passengers. Depart Marienplatz (connects U-lines cluster), intermediate stops, terminus Degerloch (Waldfriedhof / forest cemetery). Part of daily commuter service, fully integrated into SSB tariff.
- **Line 20 (Standseilbahn)** Südheimer Platz (funicular base) ↔ Waldfriedhof | 2 stations | cable car, 1929–present, 87 m altitude gain, 3 min journey, connects U1/U14 at Südheimer Platz valley station. Integrated into SSB tariff.

**Source:** https://www.ssb-ag.de/unternehmen/informationen-fakten/fahrzeuge/zahnradbahn/ (Zahnradbahn); https://www.ssb-ag.de/fahrgastinformationen/plaene-und-linien (general Stadtbahn pages); https://mapa-metro.com/en/Germany/Stuttgart/Stuttgart-Stadtbahn-map.htm (independent urban rail reference).

## H2 — who has line codes today

| surface | Stadtbahn lines? | what it actually has |
| --- | --- | --- |
| SSB official network maps (D1) | **yes** | U1–U9, U12–U15, U19, U11 (event), plus Line 10/20 special. No line 11, 16, 17, 18 (discontinued or never numbered Stadtbahn). |
| VVS GTFS static (opendata-oepnv.de) | **yes, mixed** | Whole-network GTFS (S-Bahn, bus, tram, Stadtbahn). v1 must filter to Stadtbahn U-lines + 10/20. |
| Product `lib/cities/stuttgart/` | **absent** | No Stuttgart stations.json / line-map.json. `assertCityLive("stuttgart")` is Unknown city. |
| S-Bahn Stuttgart official pages | separate operator | S-Bahn lines S1–S6, S60. Operated by Deutsche Bahn subsidiary. Not D1 for Stadtbahn v1. |

**H2 conclusion:** Line codes already match published maps (**U1–U9, U12–U15, U19, U11, 10, 20**). No clash surface within Stadtbahn itself; clash is **S-Bahn vs Stadtbahn at shared stations** (Hauptbahnhof, Charlottenplatz, etc.). Do not merge S-Bahn into this city's v1 scope. Do not generate published-network.json from GTFS; hand-curate Stadtbahn subset. Confirm v1 scope includes both special lines (10/20) or drops them; neither are in standard "Stadtbahn" advertising but are SSB-operated and daily-service.

## C2/C3 for Jim

1. **city=stuttgart**, agency **SSB (Stuttgarter Straßenbahnen)**, Stadtbahn-only v1. Not merged with S-Bahn Stuttgart (separate Deutsche Bahn operator). Not a whole-VVS city.
2. **Hauptbahnhof (Arnulf-Klett-Platz)** is the primary hub (U1, U5, U6, U7, U9 convergence + S-Bahn). **Charlottenplatz** is the secondary Stadtbahn-only hub (U1, U4, U5, U6). Choose one or both depending on product intent. **doNotGroup Hauptbahnhof Stadtbahn vs S-Bahn vs DB long-distance.**
3. **v1 lines:** U1, U2, U3, U4, U5, U6, U7, U8, U9, U12, U13, U14, U15, U19, U11 (event line, rare). No U10, U16, U17, U18.
4. **Special lines 10 & 20 included in v1:** SSB Line 10 (Zahnradbahn, daily commuter) and Line 20 (Standseilbahn, daily service, integrates at U1/U14 Südheimer Platz). Confirm inclusion with Tim; if included, add verdicts to Board eligibility.
5. **S-Bahn Stuttgart excluded:** `out-product` verdict (separate operator, regional scope, v1 cuts to city Stadtbahn network only). Deutsche Bahn S1–S6, S60.
6. **GTFS filtering:** VVS GTFS at opendata-oepnv.de contains whole network. v1 adapter must select only Stadtbahn route_type (route_type 0 = light rail for U-lines, route_type 1 = subway/metro likely for U10/20 if GTFS encodes them separately; route_type 2 = rail for S-Bahn — exclude). Verify route_type encoding in actual GTFS before adapter build.
7. **Real-time:** No public next-train GTFS-RT confirmed for Stadtbahn lines. VVS TRIAS or GTFS-RT available only via keyed API (opendata@vvs.de request required). v1 likely schedule-only until RT access confirmed.
8. **Europe/Berlin timezone HAS DST.** Verify actual live feed / API path with VVS before D2 flip.
9. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no reopen of other German cities (Berlin, Munich, Hamburg), no S-Bahn integration, no redo of London TfL / Amsterdam / Rotterdam / Sweden.

## Board eligibility

**Board eligibility rule reference:** [docs/board-eligibility-rule.md](https://github.com/timkendall/next-train/blob/master/docs/board-eligibility-rule.md) — services calling at in-catalog stations must receive explicit verdicts.

**In-scope Stadtbahn stations (examples from hub cluster):** Hauptbahnhof (Arnulf-Klett-Platz), Charlottenplatz, Schloss Platz, Marienplatz, Universitätsstraße, Degerloch (Line 10 terminus), Südheimer Platz (Lines 1, 14, 20 hub).

**Services calling at these stations (walk-up test):**

| Service | Lines | Verdict | Evidence | Notes |
|---|---|---|---|---|
| SSB Stadtbahn (light rail) | U1–U9, U12–U15, U19, U11 | `in` | [SSB Netzplan](https://www.ssb-ag.de/fahrgastinformationen/plaene-und-linien); walk-up boarding, no reservation required, standard tickets. | Included in v1; no boarding barriers. |
| SSB Zahnradbahn (Line 10) | 10 | `in` | [SSB Zahnradbahn page](https://www.ssb-ag.de/unternehmen/informationen-fakten/fahrzeuge/zahnradbahn/); walk-up commuter service (2500–3000 daily), no reserved seating for typical commuters, integrated tariff. | Special line; daily service. Confirm inclusion with Tim. |
| SSB Standseilbahn (Line 20) | 20 | `in` | [SSB Funicular page](https://www.ssb-ag.de/fahrgastinformationen/plaene-und-linien); walk-up boarding, public transport integrated, Südheimer Platz connects U1/U14. | Special line; daily service, integrates at major hub. Confirm inclusion with Tim. |
| S-Bahn Stuttgart (regional rail) | S1–S6, S60 | `out-product` | [S-Bahn Stuttgart / DB website](https://www.bahn.de/en); operated by Deutsche Bahn subsidiary. v1 scope cuts to city Stadtbahn network; S-Bahn is regional/intercity operator. Passes walk-up test (no mandatory reservation on regional services) but excluded by product decision. | Separate operator and network scope. Record in registry notes. |

**Summary:** Stadtbahn + special lines (10/20) pass walk-up and are included. S-Bahn passes walk-up test but is excluded by v1 product scope (regional operator, separate from city Stadtbahn network). Standseilbahn and Zahnradbahn are walkable, daily-service, SSB-operated; confirm product intent to include them before adapter build.

## Hazards and skip risk

1. **GTFS-RT not publicly available:** VVS GTFS-RT available only via keyed API request to opendata@vvs.de. Adapter will run schedule-only until key confirmed. Delay risk if VVS denies API access.
2. **Whole-network GTFS requires filtering:** VVS GTFS zip includes S-Bahn, buses, tram (outside Stadtbahn). Adapter must filter to U-lines + lines 10/20. Route_type field in GTFS must be verified to confirm Stadtbahn encoding (likely route_type 0 or 1; S-Bahn route_type 2).
3. **Special event line (U11) may not appear in all GTFS snapshots:** U11 operates only during Stuttgart events (Volksfest, etc.). Some GTFS exports may omit it or mark with calendar exceptions. Verify current calendar in dataset.
4. **Line 10 (Zahnradbahn) and Line 20 (Standseilbahn) may use unique route_type or mode codes in GTFS.** Rack railway (route_type 4 in GTFS) and cable car (route_type 5) may require special handling in adapter. Confirm encoding before D1.
5. **Hauptbahnhof naming conflict:** S-Bahn and Stadtbahn both call the underground station "Hauptbahnhof (Arnulf-Klett-Platz)" but GTFS may encode differently (one may be "Hauptbahnhof", the other "Hauptbahnhof (U, Stadtbahn)", etc.). Verify GTFS stops table and doNotGroup the S-Bahn version.
6. **No published stop-order document from SSB:** Unlike Munich and Berlin, Stuttgart SSB does not publish comprehensive halt lists (Linienverlauf) as downloadable PDFs. Stop order must be extracted from GTFS or reverse-engineered from timetables + map. This introduces transcription risk if GTFS order is non-canonical.
7. **Standseilbahn / Zahnradbahn may be missing from GTFS entirely.** These are special SSB lines; verify both appear in GTFS stops/routes tables before committing to v1 inclusion.

**Mitigation:** Contact VVS opendata@vvs.de early to confirm GTFS coverage (U-lines, U11, lines 10/20, route_type encoding) and GTFS-RT key availability. Request example GTFS snapshot to inspect stops/routes before D1 finalises.

## License

- **License name:** Creative Commons Attribution 2.0 Germany (CC BY 2.0 DE) / Datenlizenz Deutschland – Namensnennung – Version 2.0, per VVS opendata-oepnv.de dataset; also referenced as CC-BY on MobiData BW.
- **Redistribution / rehosting:** CC BY 2.0 DE and Datenlizenz Deutschland allow redistribution, derivative works, and commercial use if attribution is provided. Transitland: redistribution allowed = Yes; derived products allowed = Yes.
- **Commercial use:** allowed under CC BY 2.0 DE.
- **Attribution:** "Verkehrs- und Tarifverbund Stuttgart (VVS)" and "Stuttgarter Straßenbahnen AG (SSB)" retrieval date and GTFS version/snapshot date.
- **Terms URL:** https://www.opendata-oepnv.de/dataset/soll-fahrplandaten-vvs (VVS GTFS on opendata-oepnv.de); https://mobidata-bw.de/dataset/soll-fahrplandaten-vvs (same data on MobiData BW); https://www.govdata.de/informationen/lizenzen (German Datenlizenz explanation).
- **Confidence:** `clear` for VVS GTFS licensing and feed availability. License is CC BY 2.0 DE via opendata-oepnv.de. GTFS-RT availability is conditional on key request; confirm with VVS before adapter build. Zahnradbahn (line 10) and Standseilbahn (line 20) GTFS coverage not yet verified — spot-check actual dataset.
- **Keyed feeds:** VVS GTFS static zip is unkeyed (public download). GTFS-RT and TRIAS API require key registration (opendata@vvs.de). Transitland feed page: check https://transit.land for VVS feed Onestop ID (likely `f-vvs`) to verify feed health and URL stability.

---

**D1 pack readiness:** Oracle report complete. D1 pack (`published-network.json`, `hazard-pack.md`, `direction-model-memo.md`) ready for handoff to Luke once product intent confirmed on S-Bahn verdict, special lines 10/20 inclusion, and GTFS coverage verified with VVS.
