# Leipzig / Halle oracle clash report

D1 (scoped): S-Bahn Mitteldeutschland lines S1–S6 through the Leipzig City Tunnel only (opened December 2013). LVB tram and regional RE/RB services with recorded verdicts. DB Regio Südost / MDV open data GTFS static + national DELFI GTFS-RT fallback; no dedicated S-Bahn Mitteldeutschland realtime feed published separately. Regional operator (Erfurter Bahn, Mitteldeutsche Regiobahn) walk-up boardings recorded as `in`. Station names to be confirmed from official DB/MDV network maps and timetable PDFs.

## Transit agency & feed access

**Agency:** Deutsche Bahn (DB Regio Südost) operates S-Bahn Mitteldeutschland. Mitteldeutscher Verkehrsverbund (MDV) is the regional transit authority coordinating data and fares across the Leipzig-Halle region. Abellio Rail Mitteldeutschland GmbH also operates portions of the S-Bahn network.

**Static GTFS feed:** MDV Open Data provides regional GTFS covering S-Bahn, regional trains, tram, and bus. The feed is indexed on Transitland (Onestop ID: f-u30u-de~leipziger~mitteldeutscher) and available via open data portals. Feed last successfully fetched: September 5, 2026. Fallback: GTFS.DE aggregated German feed (https://gtfs.de/en/feeds/de_nv/) includes Leipzig via DELFI dataset conversion (CC BY-SA 4.0).

LVB (Leipziger Verkehrsbetriebe) tram schedule data available at the Leipzig Open Data Portal (opendata.leipzig.de) in GTFS format.

**GTFS-Realtime feed:**
- **No dedicated S-Bahn Mitteldeutschland GTFS-RT feed** published by DB Regio Südost or MDV separately.
- **National DELFI feed:** DELFI Realtime Data GTFS-RT stream at https://realtime.gtfs.de/realtime-free.pb covers Germany-wide realtime departures (TripUpdates + ServiceAlerts). License: CC BY-SA 4.0. No key required.
- **LVB realtime:** Tram next-train feed status (static-only or realtime included) to be confirmed at D1.
- **Fallback:** Timetable-only boards until realtime presence confirmed for S-Bahn.

**Authentication:** MDV GTFS static requires no key. DELFI GTFS-RT is key-free. LVB data via open portal requires no key.

## Network overview

**S-Bahn Mitteldeutschland (v1 scope):**

Six lines serve the Leipzig-Halle metropolitan area via the Leipzig City Tunnel, opened 15 December 2013, connecting the city center to regional rail terminals. The system operates 24/7 commuter and regional service with high-frequency service (trains every 5 minutes through the tunnel).

**v1 cut: Lines S1, S2, S3, S4, S5, S5X, S6 through Leipzig City Tunnel**
- **S1:** Leipzig Miltitzer Allee – Leipzig-Leutzsch – Leipzig-Gohlis – City Tunnel – Leipzig-Stötteritz (walk-up commuter)
- **S2:** Lutherstadt Wittenberg / Dessau – Bitterfeld – Delitzsch – Leipzig Messe – City Tunnel – Leipzig-Stötteritz (walk-up commuter)
- **S3:** Halle (Saale) – Schkeuditz – Leipzig-Gohlis – City Tunnel – Leipzig-Stötteritz – Wurzen (walk-up commuter)
- **S4:** Hoyerswerda – Torgau – Eilenburg – Taucha – Leipzig-Mockau – City Tunnel – Leipzig-Connewitz – Markkleeberg-Gaschwitz (walk-up commuter)
- **S5:** Halle (Saale) – Leipzig Messe – City Tunnel – Leipzig-Connewitz – Markkleeberg – Altenburg – Zwickau (walk-up commuter)
- **S5X:** Halle (Saale) – Leipzig/Halle Airport – Leipzig Messe – City Tunnel – Leipzig-Connewitz – Markkleeberg – Altenburg – Zwickau (walk-up commuter, express variant)
- **S6:** Leipzig Messe – City Tunnel – Leipzig-Connewitz – Markkleeberg – Borna – Geithain (walk-up commuter)

All lines are DB Regio Südost / Abellio-operated, walk-up, and serve in-catalog City Tunnel and urban stations.

## City Tunnel stations (v1 in-scope)

**Leipzig Hauptbahnhof (tief):** Underground terminal platforms 1–2, all S-Bahn lines call. Co-located with surface Hauptbahnhof; separate from regional/long-distance platform above.

**Leipzig Markt:** Central city island platform 140m long, 22m underground. Opened December 2013. Serves S1, S2, S3, S4, S5, S5X, S6 (all six lines). Primary urban interchange in city center.

**Leipzig Wilhelm-Leuschner-Platz:** City Tunnel intermediate stop.

**Leipzig MDR:** City Tunnel intermediate stop.

**Leipzig-Connewitz:** City Tunnel southern terminus, serves S4, S5, S5X, S6.

All City Tunnel stations are walk-up, no reservation required.

## Hub-lock station candidates

**Leipzig Markt (recommended primary lock):**
- Junction point for all six S-Bahn lines (S1–S6)
- Central city location, opened 2013, purpose-built for commuter interchange
- Island platform with single boarding surface; no physical split between lines
- Direct access to city center (Markt square), retail, dining
- Serves as geographic/operational hub within tunnel system
- **Verdict: Leipzig Markt as v1 hub-lock** for S-Bahn Mitteldeutschland network

**Leipzig Hauptbahnhof (tief) (secondary, terminal/infrastructure lock):**
- Underground terminal platforms for all S-Bahn lines
- Long-distance and regional rail termini above (surface platforms)
- Interchange point; fewer city-center riders than Markt
- **doNotGroup Hauptbahnhof (tief) S-Bahn vs Hauptbahnhof surface DB / regional** — same building, different platforms, different fare/ticket systems

Leipzig Markt is the functional commuter hub; Hauptbahnhof (tief) is the regional/terminal lock. Either can serve as v1 primary; Markt recommended for city-centric scope.

## Station naming surface

**Precedent:** German S-Bahn systems show consistent drift between official timetable names, network maps, GTFS stops, and operator data. Leipzig City Tunnel is newer (2013) but still subject to:
- Official DB Netzplan vs. timetable PDFs may differ slightly in station nomenclature
- Hauptbahnhof platform designation (tief vs. surface) critical to routing
- LVB tram stops vs. S-Bahn stations may share geographic proximity but require separate stops

**Action:** Luke (D1 pack) to obtain current official DB network diagram (Netzplan) and published timetable PDFs for all S-Bahn lines S1–S6 and City Tunnel stations before station-name table is finalized. Keep published-network.json independent of GTFS API stops.

## LVB tram (Leipzig city light rail)

**Lines:** Extensive tram network operated by Leipziger Verkehrsbetriebe (LVB).

**Calling at in-catalog S-Bahn stations:** LVB tram lines call at or near Markt, Hauptbahnhof, and other central stations.

**Board eligibility test:**
- Test 1 (walk-up): Pass — no compulsory seat reservation; standard VRS/MDV day passes or contactless tap
- Test 2 (leave-by valid): Pass — no check-in barriers or security gates
- **Result:** LVB tram passes both technical tests

**Verdict: `out-product`.** LVB tram (urban light rail) is walk-up and would ordinarily appear on boards at shared stations. However, v1 scope is **S-Bahn Mitteldeutschland only** — commuter/regional S-Bahn network, not urban tram/streetcar. LVB tram integration (LVB operator, separate GTFS feed, different product tier) is a separate product decision, not a technical exclusion. LVB lines calling at in-catalog S-Bahn stations are recorded `out-product` to prevent silent omission.

| Service | Verdict | Rationale |
|---|---|---|
| LVB tram (all lines at in-catalog stations) | `out-product` | Passes walk-up and leave-by tests; excluded by v1 product scope (S-Bahn Mitteldeutschland only, not urban tram). LVB operator, separate feed. Boards must not silently filter LVB without verdict. |

## Regional rail operators (RE/RB services)

**Erfurter Bahn:** Operates regional trains Leipzig–Zeitz–Gera and Leipzig–Saalfeld–Blankenstein, calling at Leipzig Hauptbahnhof and other regional stations.

**Mitteldeutsche Regiobahn (MRB):** Operates RB 110 (Leipzig–Döbeln), RE 6 (Leipzig–Chemnitz), RE 3, RB 30, RB 45 in central Saxony.

**Board eligibility test:**
- Test 1 (walk-up): Pass — both operators allow walk-up boarding with standard MDV/regional passes. MRB RB 110 explicitly permits on-board ticket purchase at local transit rate, no surcharge. Erfurter Bahn operates on German regional rail standards (walk-up).
- Test 2 (leave-by valid): Pass — no check-in barriers or security gates
- **Result:** Both operators pass both technical tests

**Verdict: `in` at in-catalog stations.** Erfurter Bahn and MRB regional trains are walk-up and non-reserved; no compulsory booking. When calling at in-catalog S-Bahn stations (Hauptbahnhof, etc.), they appear on station boards. Regional trains may be long-distance (4+ hours) but this is a display tier refinement, not a walk-up disqualifier per board-eligibility rule §6.

| Service | Verdict | Rationale |
|---|---|---|
| Erfurter Bahn (Zeitz–Gera, Saalfeld–Blankenstein routes at in-catalog stations) | `in` | Walk-up, no compulsory reservation. Regional operator calling at Leipzig Hauptbahnhof and urban stations. Standard MDV/regional ticketing. |
| Mitteldeutsche Regiobahn (RB 110, RE 6 Leipzig–Chemnitz at in-catalog stations) | `in` | Walk-up, on-board ticket purchase allowed (no surcharge). Regional operator calling at Leipzig Hauptbahnhof and urban stations. Standard MDV/regional ticketing. |

## v1 network cut summary

**In scope:** S-Bahn Mitteldeutschland lines S1, S2, S3, S4, S5, S5X, S6 through Leipzig City Tunnel (all six lines, central urban only).

**Out of scope (mode/product cut):**
- LVB tram (all lines): **`out-product`** (v1 scope is commuter S-Bahn, not urban light rail)
- Long-distance DB (ICE, EC, etc.): **`out-mode`** (not commuter rail)
- Bus, metro (none exist in this region): **`out-mode`**

**In scope by operator agreement:**
- Erfurter Bahn (RE/RB at in-catalog stations): **`in`** (walk-up, no reservation)
- Mitteldeutsche Regiobahn (RB 110, RE 6 at in-catalog stations): **`in`** (walk-up, no reservation)

## Board eligibility

### S-Bahn Mitteldeutschland services (v1 in-scope)

All six lines (S1, S2, S3, S4, S5, S5X, S6) are DB Regio Südost / Abellio-operated, walk-up, non-reserved, and serve in-catalog City Tunnel stations. **All in-scope S-Bahn services: `in`.** Boardings open to any traveler with a standard MDV/VRS ticket, day pass, or contactless RFID card; no seat reservation, no check-in barrier.

| Line | Verdict | Terminus A – Terminus B | Notes |
|---|---|---|---|
| S1 | `in` | Leipzig Miltitzer Allee – Leipzig-Stötteritz | Commuter, City Tunnel service |
| S2 | `in` | Lutherstadt Wittenberg / Dessau – Leipzig-Stötteritz | Regional, City Tunnel service |
| S3 | `in` | Halle (Saale) – Wurzen | Commuter, City Tunnel service via Halle |
| S4 | `in` | Hoyerswerda – Markkleeberg-Gaschwitz | Regional, City Tunnel service |
| S5 | `in` | Halle (Saale) – Zwickau | Regional, City Tunnel service via Halle & Messe |
| S5X | `in` | Halle (Saale) – Zwickau (express via airport) | Express variant, walk-up boarding |
| S6 | `in` | Leipzig Messe – Geithain | Commuter, City Tunnel service |

**Confirmation needed at D1:** Exact published passenger termini from official 2026 DB timetable PDFs for all lines. GTFS and Wikipedia may list extended/planned termini not shown to passengers.

### Regional rail services (in-scope by walk-up)

| Service | Verdict | Rationale |
|---|---|---|
| Erfurter Bahn (Zeitz–Gera, Saalfeld–Blankenstein routes at in-catalog stations) | `in` | Walk-up, no compulsory reservation. Regional operator calling at Leipzig Hauptbahnhof and urban City Tunnel stations. Standard MDV/regional ticketing. |
| Mitteldeutsche Regiobahn (RB 110 Leipzig–Döbeln, RE 6 Leipzig–Chemnitz at in-catalog stations) | `in` | Walk-up boarding; MRB explicitly allows on-board ticket purchase. Regional operator calling at Leipzig Hauptbahnhof. Standard MDV/regional ticketing. |

### LVB tram (excluded, out-product)

| Service | Verdict | Rationale |
|---|---|---|
| LVB tram (all lines at in-catalog S-Bahn stations) | `out-product` | Walk-up, no compulsory reservation, passes both tests. v1 product scope is commuter S-Bahn only; urban tram is future. LVB operator, separate GTFS feed. No silent omission. |

### Long-distance rail, bus, etc.

Long-distance DB (ICE, EC, etc.), bus, and other modes outside scope. **Verdict: `out-mode`.** Leipzig has extensive bus network; excluded by product mode cut. Long-distance rail (separate ticketing, routing) excluded from v1 commuter scope.

## Skip risk

1. **GTFS-RT coverage clarity:** No dedicated S-Bahn Mitteldeutschland GTFS-RT feed published by DB Regio Südost or MDV separately. DELFI national stream coverage of S-Bahn-specific trip updates (real-time arrivals through City Tunnel) unconfirmed — common issue: many German regional S-Bahn systems export schedule-only GTFS, with realtime either absent or limited to long-distance rail. Confirm at D1 whether DELFI GTFS-RT includes S-Bahn Mitteldeutschland next-train data or defaults to timetable board.

2. **LVB tram realtime:** LVB feed status (static-only or with realtime) unconfirmed. If static-only, LVB tram boards fall to timetable.

3. **Regional train RT data:** Erfurter Bahn and MRB realtime coverage in DELFI stream unconfirmed. Regional operators may be absent from national realtime feeds.

4. **Feed URL stability:** MDV GTFS download URL and open data portal availability must remain live. DELFI feed URL https://realtime.gtfs.de/realtime-free.pb must remain stable. Verify before final hand-off.

5. **LVB GTFS feed URL:** Leipzig Open Data Portal URL for LVB GTFS must be confirmed live before D1.

6. **Station naming / Hauptbahnhof split:** City Tunnel platforms (tief) vs. surface Hauptbahnhof platforms require clear distinction in adapter routing logic. GTFS stop IDs may conflate them; hand-transcribed station names from official PDFs prevent mismatches.

7. **City Tunnel consistency:** All six S-Bahn lines run through the tunnel; adapter must ensure no silent line cuts when DELFI realtime is missing S-Bahn data (fallback to timetable board, not silent omission).

## License

- **License name:** MDV GTFS static data under Creative Commons Attribution 4.0 (CC BY 4.0). DELFI GTFS-RT under CC BY-SA 4.0. LVB GTFS under Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de-by-2.0 / German Data License Attribution v2.0).
- **Redistribution / rehosting:** All three licenses (CC BY 4.0, CC BY-SA 4.0, dl-de-by-2.0) explicitly allow redistribution of derived products (schedule data, boards) with attribution. DELFI CC BY-SA 4.0 requires same-license derivative works. dl-de-by-2.0 permits commercial use and republishing with attribution to LVB/Leipzig. MDV CC BY 4.0 permits any derivative without copyleft requirement.
- **Commercial use:** All three licenses permit commercial use under attribution. Confirm LVB dl-de-by-2.0 terms for commercial rehosting specifics.
- **Attribution:** When using MDV GTFS static: "Mitteldeutscher Verkehrsverbund (MDV)" per license. When using DELFI: "GTFS.DE / DELFI" and underlying source (DB Regio Südost, etc.). When using LVB: "Leipziger Verkehrsbetriebe (LVB)" per license. OSM attribution required if OSM data included.
- **Terms URL:**
  - https://www.mdv.de/ (MDV main portal; open data terms via associated sites)
  - https://gtfs.de/en/realtime/ (DELFI GTFS-RT, CC BY-SA 4.0)
  - https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0 deed)
  - https://opendata.leipzig.de/de/dataset/lvb-fahrplandaten (LVB GTFS on Leipzig Open Data Portal)
  - https://www.gesetze-im-internet.de/dl-de/v2.0/ (Datenlizenz Deutschland v2.0 official text)
  - https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101 (Mobility Database DELFI GTFS-RT entry)
- **Confidence:** 
  - MDV CC BY 4.0: `clear` (per multiple sources, public open data)
  - DELFI GTFS-RT CC BY-SA 4.0: `clear` (published at https://gtfs.de/ with license statement)
  - LVB dl-de-by-2.0: `clear` (German Data License, explicitly listed on Leipzig Open Data Portal)
  - Transitland notes CC-BY 2.0 for a historical version; current MDV feed uses CC BY 4.0 per source research.
- **Keyed feeds:** MDV GTFS static and DELFI GTFS-RT require no keys. LVB GTFS from open portal requires no key.

## What I did not do

No `lib/cities/leipzig/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking confirmation until D1 official DB network plan is in hand. No LVB tram inclusion decision without noting it as a product scope call requiring Mark/Tim confirmation. No adapter filtering code. No bus or long-distance data.

## Sources & references

- [Transitland S-Bahn Mitteldeutschland GTFS feed (f-u30u-de~leipziger~mitteldeutscher)](https://www.transit.land/feeds/f-u30u-de~leipziger~mitteldeutscher)
- [Mobility Database MDV GTFS feed](https://mobilitydatabase.org/feeds/gtfs/mdb-778)
- [Mobility Database DELFI GTFS-RT feed](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101)
- [DELFI GTFS-RT realtime feed service](https://gtfs.de/en/realtime/)
- [GTFS.DE aggregated German feed](https://gtfs.de/en/feeds/de_nv/)
- [Leipzig Open Data Portal – LVB Tram/Bus GTFS](https://opendata.leipzig.de/de/dataset/lvb-fahrplandaten)
- [Wikipedia: Mitteldeutschland S-Bahn](https://en.wikipedia.org/wiki/Mitteldeutschland_S-Bahn)
- [Wikipedia: Leipzig City Tunnel](https://en.wikipedia.org/wiki/Leipzig_City_Tunnel)
- [Wikipedia: Leipzig Markt station](https://en.wikipedia.org/wiki/Leipzig_Markt_station)
- [Wikipedia: Leipzig Central Station](https://en.wikipedia.org/wiki/Leipzig_Central_Station)
- [S-Bahn Mitteldeutschland official website](https://www.s-bahn-mitteldeutschland.de/)
- [Mitteldeutsche Regiobahn official website](https://www.mitteldeutsche-regiobahn.de/)
- [Erfurter Bahn official website](https://www.erfurter-bahn.de/)
- [MDV official portal](https://www.mdv.de/)

## C2/C3 deliverables to put in front of Luke

1. **city=leipzig**, agency **DB Regio Südost / MDV**, not merged into national German feed or another region. Abellio Rail Mitteldeutschland GmbH also operates S-Bahn network portion.
2. **Leipzig Markt** is the locked S-Bahn hub (junction of all six lines S1–S6; geographic center of City Tunnel network, opened 2013). Leipzig Hauptbahnhof (tief) is secondary (terminal/infrastructure lock, all lines pass through). **doNotGroup Hauptbahnhof (tief) S-Bahn vs Hauptbahnhof surface DB/regional vs Hauptbahnhof DB long-distance.** Same building; separate platforms and fare systems.
3. **S-Bahn Mitteldeutschland lines S1–S6 all in scope** (six lines through City Tunnel, central Leipzig only). All DB Regio Südost / Abellio operated, walk-up, non-reserved.
4. **LVB tram** (urban light rail, Leipziger Verkehrsbetriebe): `out-product` verdict at every in-catalog S-Bahn station. Not a mode cut. v1 scope is commuter S-Bahn only; urban tram is future.
5. **Erfurter Bahn regional trains** (Leipzig–Zeitz–Gera, Leipzig–Saalfeld–Blankenstein routes): `in` verdict at in-catalog Hauptbahnhof and City Tunnel stations. Walk-up, no reservation required.
6. **Mitteldeutsche Regiobahn (MRB)** regional trains (RB 110 Leipzig–Döbeln, RE 6 Leipzig–Chemnitz): `in` verdict at in-catalog Hauptbahnhof and City Tunnel stations. Walk-up boarding; MRB allows on-board ticket purchase without surcharge.
7. **MDV GTFS static (CC BY 4.0), DELFI GTFS-RT (CC BY-SA 4.0) fallback, no key required.** LVB GTFS under dl-de-by-2.0 (German Data License Attribution v2.0). Confirm DELFI realtime coverage includes S-Bahn trip updates before D2.
8. **Board eligibility lock:** All six S-Bahn lines `in`; Erfurter Bahn `in` (walk-up); MRB `in` (walk-up); LVB tram `out-product`; long-distance/bus/metro `out-mode`.
9. **No product leipzig/ directory yet.** `assertCityLive("leipzig")` is Unknown city.

## Next steps (D2 / Luke's pack)

- Obtain official 2026 DB Netzplan (network diagram) and complete halt lists for all six S-Bahn lines (S1–S6) through City Tunnel and termini.
- Confirm Leipzig Markt hub-lock and Hauptbahnhof (tief) secondary node against official DB collateral and network maps.
- Confirm all six S-Bahn lines (S1–S6) calling at each City Tunnel station for adapter filtering and Board eligibility table.
- Confirm Erfurter Bahn and MRB regional train verdicts (`in`) with Tim/Mark if needed; regional operator inclusion at shared stations is a product scope decision.
- Verify DELFI national GTFS-RT coverage includes S-Bahn Mitteldeutschland trip updates (real-time next-train data); if not, confirm timetable-only baseline is acceptable for launch.
- Confirm LVB GTFS feed URL (Leipzig Open Data Portal) is stable and obtain license terms from LVB/Leipzig directly.
- Transcribe station names and order from official DB PDFs into published-network.json (not GTFS-derived).
- Confirm Hauptbahnhof (tief) vs surface platform split in GTFS stop IDs to prevent routing conflicts.
- Research whether regional trains (Erfurter Bahn, MRB) are included in DELFI realtime; if not, note in adapter as timetable-only for regional services.
