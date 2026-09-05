# Dresden oracle clash report

D1 (scoped): DVB tram lines 1–4, 6–12 & 13 (Dresden city only; note line 5 absent from current network). S-Bahn verdict recorded as `out-product`. VVO GTFS static + national DELFI GTFS-RT fallback (CC BY-SA 4.0); no dedicated Dresden tram realtime feed confirmed. Station names to be transcribed from official DVB network maps and halt lists; not GTFS-derived.

## Recommendation: DVB tram as v1 (not S-Bahn)

The tracker lists S-Bahn as v1, but **assessment recommends DVB tram as the v1 cut** for the following reasons:

**Tram as primary network:**
- DVB tram dominates the city center and forms the backbone of Dresden's urban mobility. The tram network covers the Altstadt (historic center) comprehensively, with 12 active lines and 132.7 km route length.
- Postplatz (central hub) is served by 8 tram lines (1, 2, 3, 4, 7, 9, 11, 12), making it one of Europe's busiest tram junctions.
- Tram provides the highest walk-up boarding density for city residents and visitors.
- Comparable to Cologne precedent: Cologne v1 is Stadtbahn (light metro), not regional S-Bahn; Dresden tram serves the same function.

**S-Bahn's complementary role:**
- S-Bahn consists of only 3–4 lines (S1, S2, S3; S4 status pending) serving regional and suburban destinations (Meissen, Pirna, Freiberg, airport via S2).
- S-Bahn does not blanket the city center; lines radiate outward from Hauptbahnhof.
- S-Bahn is operated by DB Regio, not DVB — a different operator and fare system from city tram.
- Both walk-up and leave-by tests pass for S-Bahn; the exclusion is a product decision (regional commuter rail, not urban metro).

**Verdict:** v1 scope = **DVB tram only**. S-Bahn Köln precedent (Cologne): regional S-Bahn is recorded `out-product`, not silent omission. Same logic applies to Dresden S-Bahn.

## Transit agency & feed access

**Agencies:**
- **DVB (Dresdner Verkehrsbetriebe AG):** operates the city tram network (12 lines, 13 lines active if Line 13 confirmed in current operation).
- **VVO (Verkehrsverbund Oberelbe):** regional transit authority coordinating data and fares for Dresden and surrounding districts. Also handles S-Bahn.
- **DB Regio NRW:** operates S-Bahn services (S1, S2, S3).

**Static GTFS feed:**
- **VVO GTFS static:** available through multiple portals. GTFS.DE (https://gtfs.de/en/feeds/) aggregates German transit data including VVO, published under CC BY-SA 4.0. VVO Open Data portal offers regional GTFS; exact URL to be confirmed at D1 (likely download.vrsinfo.de-style or similar, pending verification).
- **GTFS.DE fallback:** includes Dresden via DELFI dataset conversion. Public, key-free, CC BY-SA 4.0.

**GTFS-Realtime feed:**
- **Dedicated DVB/VVO GTFS-RT:** No confirmed public GTFS-RT feed for Dresden tram identified. VVO may offer GTFS-RT via Mobilithek/SIRI 2.0 (vehicle positions, delays; 5-minute refresh) but coverage and access confirmation required at D1.
- **DELFI National Realtime:** GTFS-RT stream https://realtime.gtfs.de/realtime-free.pb (TripUpdates + ServiceAlerts, updated every 10 seconds). License: CC BY-SA 4.0. No key required. Fallback for schedule-only boards if dedicated Dresden feed unavailable.

**Authentication:**
- VVO GTFS static (if available via Open Data portal): no key required (open data).
- DELFI GTFS-RT: no key required.
- Mobilithek (VVO SIRI-RT if available): may require registration; terms to be confirmed at D1.

## Network overview

**DVB tram network (v1 scope):**

DVB operates 12 confirmed tram lines (1–4, 6–12; note line 5 is absent from the current network). A 13th line (Line 13) has been referenced in operations; status to be confirmed at D1.

**Active tram lines:**
- **Line 1:** Leutewitz – Prohlis Gleisschleife (radial)
- **Line 2:** Kleinzschachwitz Freystraße – Gorbitz (radial)
- **Line 3:** Coschütz – Wilder Mann (radial)
- **Line 4:** Weinböhla – Laubegast (radial)
- **Line 6:** Wölfnitz – Niedersedlitz, S-Bf. Niedersedlitz (radial, connects to S-Bahn)
- **Line 7:** Weixdorf – Pennrich Gleisschleife (radial)
- **Line 8:** Hellerau Kiefernweg – Südvorstadt (radial)
- **Line 9:** Prohlis Gleisschleife – Kaditz Riegelplatz (radial)
- **Line 10:** Striesen – Messe Gleisschleife (radial)
- **Line 11:** Zschertnitz – Bühlau (radial; serves Hauptbahnhof)
- **Line 12:** Leutewitz – Striesen (radial; serves Postplatz hub)
- **Line 13:** Kaditz Riegelplatz – Prohlis Gleisschleife (radial, if confirmed active)

**Note:** Line 5 is conspicuously absent from the current network—do not include in GTFS or stations until confirmed as returning to service.

Total network: 132.7 km route length, 210 km line length (includes branches).

All DVB tram lines are walk-up, non-reserved, and serve city stations within catalog scope.

## Hub-lock station candidates

**Postplatz (recommended primary lock):**
- **Tram lines:** 8 of 12 tram lines call at Postplatz (1, 2, 3, 4, 7, 9, 11, 12).
- **Centrality:** Postplatz is a central square in Dresden, within the Altstadt and major business/cultural quarter.
- **Passenger volume:** One of Europe's busiest tram hubs; night bus service (GuteNachtLinie) uses Postplatz as the central transfer point.
- **DVB service center:** Located at Postplatz 1 (Wilsdruffer Kubus) in 01067 Dresden.
- **Interchange:** Multiple tram directions available at all times due to high frequency.
- **doNotGroup:** Postplatz is tram-only; Hauptbahnhof (S-Bahn + DB) is separate.
- **Verdict: Postplatz as v1 tram hub-lock** — eight lines, central, high passenger anchor.

**Albertplatz (secondary candidate):**
- Multiple tram lines call (confirmation needed on exact count at D1).
- Also a major open square with high frequency and passenger volume.
- Could serve as secondary lock if Postplatz does not cover all required line overlaps.

**Hauptbahnhof (S-Bahn locked, out-product):**
- Serves S-Bahn S1, S2, S3 (and S4 if confirmed) for regional commuter connections.
- Tram line 11 calls at Hauptbahnhof tram stop, but Hauptbahnhof is primarily a DB/S-Bahn station, not the tram hub.
- **doNotGroup:** Hauptbahnhof tram (line 11) vs S-Bahn vs DB mainline — three separate services, three separate boards.
- Not recommended as primary tram hub-lock; use Postplatz instead.

## Station naming surface

**Precedent:** Station names often drift between official timetable PDFs, printed network maps, GTFS API stops, and operator databases. Dresden likely has similar issues:
- Official DVB halt lists (Fahrtplan) vs. printed Netzplan (network diagram) vs. GTFS stops may differ in spacing, hyphenation, abbreviations, diacritics.
- Postplatz and Albertplatz are major open squares with multiple tram stops nearby; exact stop names need official transcription.
- S-Bahn stations (e.g., S-Bf. Niedersedlitz on tram line 6) use different naming conventions.

**Action:** Luke (D1 pack) to source current DVB Netzplan (network diagram) and official halt lists before station-name table is finalized. Keep published-network.json independent of GTFS API stops. Confirm line 5 status, line 13 status, and exact termini for all 12–13 lines.

## S-Bahn Köln verdict applied

**Lines:** S1 (Dresden – Meissen), S2 (Airport – Heidenau/Pirna), S3 (Dresden – Tharandt), and S4 (status pending).

**Calling at in-catalog stations:** S-Bahn lines call at Hauptbahnhof and outer tram interchange stations (e.g., S-Bf. Niedersedlitz on tram line 6). Do not call at Postplatz hub.

**Board eligibility test:**
- Test 1 (walk-up): Pass — no compulsory seat reservation required on S-Bahn services; standard ticketing with VVO day passes or contactless tap available.
- Test 2 (leave-by valid): Pass — no check-in barriers or security gates; boarding is platform-direct.
- **Result:** S-Bahn lines pass both technical tests.

**Verdict: `out-product`.** S-Bahn operates under DB Regio and serves regional/suburban destinations, not city-center urban mobility. This is a v1 product scope decision (DVB tram only), not a technical exclusion — S-Bahn is walk-up, passes both tests, and would ordinarily appear on boards at shared stations. However, regional S-Bahn integration is a future product decision. S-Bahn lines calling at in-catalog tram stations are recorded `out-product` to prevent silent omission.

| Service | Verdict | Rationale |
|---|---|---|
| S-Bahn Dresden (S1, S2, S3, S4* at in-catalog stations) | `out-product` | Passes walk-up and leave-by tests; excluded by v1 product scope (DVB tram only, not regional commuter rail). DB Regio NRW operator. Boards must not silently filter S-Bahn without verdict. |

## v1 network cut summary

**In scope:** DVB tram lines 1–4, 6–12, and 13 (if confirmed; 12–13 lines, all Dresden city only).

**Out of scope (product/operator cut):**
- S-Bahn (S1, S2, S3, S4*): regional commuter. **`out-product`** (v1 scope is urban tram only)
- Line 5 (absent): do not include until confirmed returning to service. **`not-applicable`**
- Bus, DB long-distance, other regional rail: **`out-mode`**

## Board eligibility

### DVB tram services (v1 in-scope)

All 12–13 tram lines (1–4, 6–12, 13*) are DVB-operated, walk-up, non-reserved, and serve in-catalog stations. **All in-scope tram services: `in`.** Boardings open to any traveler with a standard VVO ticket, day pass, or contactless RFID card; no seat reservation, no check-in barrier.

| Line | Verdict | Terminus A – Terminus B | Central Stops (e.g. Postplatz) |
|---|---|---|---|
| 1 | `in` | Leutewitz – Prohlis Gleisschleife | Yes |
| 2 | `in` | Kleinzschachwitz Freystraße – Gorbitz | Yes |
| 3 | `in` | Coschütz – Wilder Mann | Yes |
| 4 | `in` | Weinböhla – Laubegast | Yes |
| 6 | `in` | Wölfnitz – Niedersedlitz, S-Bf. | No (outer radial) |
| 7 | `in` | Weixdorf – Pennrich Gleisschleife | Yes |
| 8 | `in` | Hellerau Kiefernweg – Südvorstadt | No (outer radial) |
| 9 | `in` | Prohlis Gleisschleife – Kaditz Riegelplatz | Yes |
| 10 | `in` | Striesen – Messe Gleisschleife | No (outer radial) |
| 11 | `in` | Zschertnitz – Bühlau | Yes (serves Hauptbahnhof) |
| 12 | `in` | Leutewitz – Striesen | Yes (Postplatz hub) |
| 13* | `in` (if confirmed) | Kaditz Riegelplatz – Prohlis Gleisschleife | Yes |

**Confirmation needed at D1:** Exact published passenger termini from official 2026 DVB timetable PDFs and Netzplan for all lines. Status of line 5 (absent?) and line 13 (active?). Wikipedia and GTFS may list extended/planned termini not shown to passengers.

### S-Bahn (excluded, out-product)

| Service | Verdict | Rationale |
|---|---|---|
| S-Bahn Dresden (S1, S2, S3, S4* at in-catalog stations) | `out-product` | DB Regio NRW operator; passes both walk-up and leave-by tests; no compulsory reservation, no check-in barrier. v1 product scope is DVB tram only; regional S-Bahn is future. No silent omission. |

### Bus, DB long-distance, other rail

No bus, DB Fernverkehr, or other regional rail in v1 scope. **Verdict: `out-mode`.** Dresden has extensive bus network operated by DVB; excluded by product mode cut.

## Skip risk

1. **GTFS-RT coverage clarity:** No dedicated Dresden tram GTFS-RT feed confirmed in public form. DELFI national stream and VVO SIRI-RT availability for tram-specific trip updates (real-time arrivals for DVB) unconfirmed — common issue: many German tram systems export schedule-only GTFS, with realtime either absent, tram-specific, or limited to long-distance rail. Confirm at D1 whether DELFI or VVO Mobilithek RT includes DVB tram next-train data or defaults to timetable board.

2. **VVO GTFS feed URL verification:** VVO static GTFS URL requires confirmation. Candidate: GTFS.DE (CC BY-SA 4.0, key-free), Saxony Open Data portal, or VVO-online.de direct download. Exact URL and refresh schedule to be confirmed before D2.

3. **Line 5 & line 13 status:** Line 5 is conspicuously absent from current DVB network maps. Line 13 has been referenced in some sources. Confirm current active roster and do not include line 5 in adapter until confirmed operational. Line 13 inclusion depends on current status verification.

4. **Postplatz hub confirmation:** Verify that 8 tram lines (1, 2, 3, 4, 7, 9, 11, 12) all call at Postplatz stop, and that this is the single best hub-lock. Confirm exact stop name and platform layout.

5. **Station naming divergence:** Official DVB halt lists vs GTFS stops vs map ticks may differ; hand-transcription from 2026 DVB PDFs required to prevent D1 vs adapter mismatches.

6. **S-Bahn & shared platforms:** Hauptbahnhof and line 6 interchange (S-Bf. Niedersedlitz) host multi-modal boarding (tram + S-Bahn); doNotGroup rules must be strict.

7. **Feed URL stability:** VVO and GTFS.DE/DELFI URLs must remain live (200 OK). Verify before final hand-off to Luke.

8. **Operator data for S-Bahn:** If D1 charts S-Bahn board verdicts, confirm all four S-Bahn line numbers (S1, S2, S3, and whether S4 is operational 2026–09).

## License

- **License name:** VVO GTFS static data license to be confirmed at D1 (likely open data / CC BY-SA 4.0 or equivalent). DELFI / GTFS.DE fallback under CC BY-SA 4.0.
- **Redistribution / rehosting:** VVO open data terms typically permit redistribution of derived products (schedule data, boards) with attribution. GTFS.DE CC BY-SA 4.0 explicitly allows redistribution, derivative works, and rehosting with attribution and same-license requirement. Confirm VVO account terms (if SIRI-RT or Mobilithek keyed access needed, account agreement may impose stricter redistribution limits than static GTFS).
- **Commercial use:** VVO open data and GTFS.DE CC BY-SA 4.0 both permit commercial use under attribution. Verify in VVO terms for any keyed access (SIRI-RT, Mobilithek).
- **Attribution:** When using VVO GTFS static: "Verkehrsverbund Oberelbe (VVO)" or per VVO terms. When using GTFS.DE / DELFI: "GTFS.DE" and underlying source (DELFI, DVB, etc.). OSM attribution required if OSM data included.
- **Terms URL:** 
  - https://gtfs.de/en/ (GTFS.DE, CC BY-SA 4.0)
  - https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0 deed)
  - https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101 (Mobility Database entry for DELFI GTFS-RT)
  - https://www.vvo-online.de/ (VVO portal; open data terms page to be located at D1)
  - https://data.europa.eu/datasets (Saxony/German open data portal, if applicable)
- **Confidence:** 
  - VVO static GTFS: `unclear` — source/URL not yet confirmed; likely open data but terms page must be verified.
  - DELFI GTFS-RT: `clear` (CC BY-SA 4.0).
  - VVO SIRI-RT (if applicable): `unclear` — access, key agreement, and redistribution terms to be confirmed.
- **Keyed feeds:** If VVO SIRI-RT or Mobilithek access requires registration/key, account agreement terms must be reviewed for redistribution restrictions and rate limits. DELFI / GTFS.DE realtime is key-free.

## What I did not do

No `lib/cities/dresden/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking confirmation until D1 official DVB Netzplan is in hand. No line 5 or line 13 inclusion decision without confirming current network status. No S-Bahn adapter filtering code. No bus, DB long-distance, or regional rail data. No GTFS-RT coverage assumption; marked as "unconfirmed" for D1 verification.

## Sources & references

- [Transitland VVO feeds](https://www.transit.land/feeds)
- [Mobility Database GTFS feeds](https://mobilitydatabase.org/feeds)
- [GTFS.DE Germany feeds](https://gtfs.de/en/feeds/)
- [DELFI GTFS-RT realtime data](https://gtfs.de/en/realtime/)
- [DELFI Realtime Data GTFS-RT Feed (Mobility Database entry)](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101)
- [VVO-Online portal](https://www.vvo-online.de/)
- [VVO (Verkehrsverbund Oberelbe) — Wikipedia](https://en.wikipedia.org/wiki/Verkehrsverbund_Oberelbe)
- [DVB (Dresdner Verkehrsbetriebe) — Wikipedia](https://en.wikipedia.org/wiki/Dresdner_Verkehrsbetriebe)
- [Trams in Dresden — Wikipedia](https://en.wikipedia.org/wiki/Trams_in_Dresden)
- [Dresden S-Bahn — Wikipedia](https://en.wikipedia.org/wiki/Dresden_S-Bahn)
- [Postplatz (Dresden) — Wikipedia](https://en.wikipedia.org/wiki/Postplatz_(Dresden))
- [GitHub: kiliankoe/vvo community API reference](https://github.com/kiliankoe/vvo)
- [Creative Commons BY-SA 4.0 deed](https://creativecommons.org/licenses/by-sa/4.0/)

## C2/C3 deliverables to put in front of Luke

1. **city=dresden**, agency **DVB / VVO**, not merged into national German feed or another region. **v1 recommendation changed from tracker's S-Bahn to DVB tram** — reasoning: DVB tram is the primary urban network, comparable to Cologne Stadtbahn precedent (not regional S-Bahn). Tim/Mark confirmation recommended before D1 final scope lock.

2. **Postplatz** is the locked DVB tram hub (8 tram lines: 1, 2, 3, 4, 7, 9, 11, 12; central location; high passenger volume; GuteNachtLinie night hub). Albertplatz as secondary candidate. **doNotGroup Postplatz tram vs Hauptbahnhof S-Bahn/DB.** Same building; separate boards.

3. **DVB tram lines 1–4, 6–12 all in scope** (12 lines, Dresden city only). **Line 5 absent** — do not include until confirmed returning to service. **Line 13 status to be confirmed** — if active, include; if not, exclude.

4. **S-Bahn (S1, S2, S3, S4* at in-catalog stations):** `out-product` verdict at every shared station (Hauptbahnhof, S-Bf. Niedersedlitz). Not a mode cut. v1 scope is urban DVB tram only; regional S-Bahn is future. **Boards must not silently filter S-Bahn without verdict.**

5. **VVO GTFS-RT key / Mobilithek access** may be required for realtime boards (SIRI 2.0 feed). DELFI fallback is key-free (CC BY-SA 4.0). Confirm VVO account provisioning, GTFS-RT coverage for tram (schedule vs realtime), and any rate limits before D2 dependency run.

6. **Board eligibility lock:** 12–13 DVB tram lines all `in`; S-Bahn all `out-product`; bus/DB/regional rail all `out-mode`.

7. **No product dresden/ directory yet.** `assertCityLive("dresden")` is Unknown city.

## Next steps (D2 / Luke's pack)

- Confirm DVB tram v1 scope with Tim/Mark (change from tracker's S-Bahn recommendation).
- Obtain official 2026 DVB Netzplan (network diagram) and complete halt lists for all active tram lines (1–4, 6–12, 13*).
- Confirm Postplatz hub-lock (8 tram lines) and Albertplatz secondary hub against official DVB collateral.
- Verify line 5 status (dormant? returning?) and line 13 status (active? planned?) from DVB.
- Confirm VVO GTFS static feed URL and refresh schedule (GTFS.DE, VVO direct, or Saxony open data portal).
- Register VVO account if SIRI-RT / Mobilithek access required for realtime boards; obtain key, document lifecycle, rate limits, and redistribution terms.
- Confirm DELFI national GTFS-RT coverage includes Dresden DVB tram trip updates (real-time next-train data); if not, confirm timetable-only baseline is acceptable for launch.
- Transcribe station names and order from official DVB PDFs into published-network.json (not GTFS-derived). Distinguish between Postplatz (tram hub) and other central stops.
- Confirm all S-Bahn lines (S1, S2, S3, S4*) calling at each tram station for adapter filtering and Board eligibility table.
- Confirm S-Bahn verdicts with Tim/Mark before adapter wiring (product decision, not technical exclusion).
