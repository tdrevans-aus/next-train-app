# Cologne oracle clash report

D1 (scoped): KVB Stadtbahn lines 1–15 & 17 (Cologne city only; lines 16 & 18 excluded — Bonn-bound cross-border lines). S-Bahn Köln verdict recorded. VRS open data GTFS static + national DELFI GTFS-RT fallback; no dedicated Cologne Stadtbahn realtime feed. Station names to be transcribed from official KVB network maps and halt lists; not GTFS-derived.

## Transit agency & feed access

**Agency:** Kölner Verkehrsbetriebe (KVB) operates the Cologne Stadtbahn (light metro/Stadtbahn) for the city. Verkehrsverbund Rhein-Sieg (VRS) is the regional transit authority coordinating data and fares across the Cologne-Bonn region.

**Static GTFS feed:** VRS Open Data portal provides regional GTFS at http://download.vrsinfo.de/gtfs/google_transit.zip. Feed includes KVB Stadtbahn, S-Bahn, tram, bus, and regional rail across the VRS area. Fallback: GTFS.DE aggregated German feed (https://gtfs.de/en/feeds/de_nv/) includes Cologne via DELFI dataset conversion (CC BY-SA 4.0).

**GTFS-Realtime feed:** 
- **No dedicated Cologne Stadtbahn GTFS-RT feed** published by KVB or VRS.
- **National feed:** DELFI Realtime Data GTFS-RT stream https://realtime.gtfs.de/realtime-free.pb covers Germany-wide realtime departures (TripUpdates + ServiceAlerts). License: CC BY-SA 4.0. No key required.
- **VRS GTFS-RT:** VRS offers GTFS-RT via OpenService with a usage agreement; local realtime availability for Cologne Stadtbahn to be confirmed at D1.
- **Fallback:** Timetable-only boards until realtime presence is confirmed. VRS static feed is usable baseline.

**Authentication:** VRS GTFS static (http://download.vrsinfo.de) requires no key. DELFI GTFS-RT is key-free. VRS OpenService GTFS-RT requires registration and user agreement. Confirm account provisioning and API terms with VRS before D2.

## Network overview

**Cologne Stadtbahn lines (v1 scope):**

Twelve regular lines serve the Cologne metropolitan area. The system combines underground metro tunnels (28 km through city center), reserved surface alignments, and hybrid tram sections. Total: 236 stations, 199 km of tracks.

**v1 cut: Lines 1, 3, 4, 5, 7, 9, 12, 13, 15, 17 (Cologne city only)**
- **Low-floor east-west lines:** 1 (Düsseldorf-Flingern – Bad Honnef), 7 (Frechen-Süd – Bensberg), 9 (Cologne-Poll – Königsforst)
- **High-floor central/radial lines:** 3 (Cologne-Nippes – Roggendorf/Thenhoven), 4 (Cologne-Nippes – Hürth-Kalstert), 5 (Cologne-Longerich – Bad Honnef), 12 (Cologne-Chorweiler – Hürth-Mittelkassel), 13 (Cologne-Niehl – Cologne-Zollstock), 15 (Cologne-Weiß – Frechen-Königsdorf), 17 (Cologne-Sürth – Severinstraße)

All ten lines are KVB-operated, walk-up, and serve in-catalog stations.

## Lines 16 & 18 — boundary decision (excluded from v1)

**Line 16 (Rheinuferbahn):** Connects Cologne (Dom/Hauptbahnhof) via Bonn Hauptbahnhof to Bad Honnef. Jointly operated by KVB and SWB (Stadtwerke Bonn). Part of Stadtbahn Rhein-Sieg, shared infrastructure with Bonn.

**Line 18 (Vorgebirgsbahn):** Connects Cologne (Dom/Hauptbahnhof) via Brühl, Hürth, and Bonn Bahnhof to Au/Sieg. Jointly operated by KVB and SWB. Also Stadtbahn Rhein-Sieg (shared with Bonn).

**Verdict: Lines 16 & 18 OUT of v1.** Both cross regional boundaries to Bonn and are jointly operated under Stadtbahn Rhein-Sieg branding. Keeping v1 to Cologne city lines (1–17, excluding 16 & 18) preserves a single administrative and operational scope. Cross-border lines introduce dual-authority complexity (KVB + SWB / Bonn) and pass through intermediate municipalities (Brühl, Hürth). This is a v1 scope decision, not a technical exclusion — lines are walk-up and pass both board eligibility tests. Future: lines 16 & 18 may be added if/when a Bonn city page launches.

## Hub-lock station candidates

**Neumarkt (recommended primary lock):**
- Junction between low-floor lines (1, 7, 9) and high-floor lines (3, 4, 16*, 18*)
- Five or six KVB lines converge (excluding 16 & 18 in v1 leaves 1, 3, 4, 7, 9)
- Central city location, major passenger anchor
- Dual-level station (overground for low-floor, underground for high-floor) with HUGO-Passage concourse connecting both levels
- **Verdict: Neumarkt as v1 hub-lock** for the Cologne Stadtbahn network

**Dom/Hauptbahnhof (secondary, co-modal):**
- Serves lines 5, 16, 18 (v1 includes line 5 only)
- Co-located with S-Bahn Köln (S6, S11, S12, S19) and DB mainline Hauptbahnhof
- Underground station beneath Cologne Central Railway Station
- Interchange point but fewer KVB lines than Neumarkt
- **doNotGroup Dom/Hauptbahnhof Stadtbahn vs S-Bahn vs DB** — same physical building, three separate fare systems and boards

## Station naming surface

**Precedent:** Frankfurt and Nuremberg show drift between official timetable names, network maps, API stops, and operator data. Cologne likely has similar issues:
- Official KVB halt lists (Fahrtplan) vs. printed network maps (Netzplan) vs. GTFS stops may differ in spacing, hyphenation, abbreviations
- Co-located stations (Dom/Hauptbahnhof hosts Stadtbahn, S-Bahn, DB mainline; Neumarkt has two physical levels)
- Hand-transcription from official 2026 KVB network diagram and published timetable PDFs required

**Action:** Luke (D1 pack) to source current KVB Netzplan (network diagram) and official halt lists before station-name table is finalized. Keep published-network.json independent of GTFS API stops.

## S-Bahn Köln (walk-up commuter rail)

**Lines:** S6, S11, S12, S19 (operated by DB Regio NRW / Rhine-Ruhr S-Bahn)

**Calling at in-catalog stations:** S-Bahn lines call at Hauptbahnhof and connect to Dom/Hauptbahnhof Stadtbahn station; S6, S11, S12 also pass through outer Cologne Stadtbahn interchanges.

**Board eligibility test:**
- Test 1 (walk-up): Pass — no compulsory seat reservation; standard ticketing with VRS day passes or contactless tap
- Test 2 (leave-by valid): Pass — no check-in barriers or security gates
- **Result:** S-Bahn lines pass both technical tests

**Verdict: `out-product`.** S-Bahn Köln is walk-up and would ordinarily appear on boards at shared stations. However, v1 scope is **KVB Stadtbahn only** — Cologne city metro/light rail network. Regional S-Bahn integration (DB Regio operator, cross-regional lines) is a separate product decision, not a technical exclusion. S-Bahn lines calling at in-catalog Stadtbahn stations are recorded `out-product` to prevent silent omission.

| Service | Verdict | Rationale |
|---|---|---|
| S-Bahn Köln (S6, S11, S12, S19) | `out-product` | Passes walk-up and leave-by tests; excluded by v1 product scope (KVB Stadtbahn only, not regional S-Bahn). DB Regio NRW operator. Boards must not silently filter S-Bahn without verdict. |

## v1 network cut summary

**In scope:** KVB Stadtbahn lines 1, 3, 4, 5, 7, 9, 12, 13, 15, 17 (ten lines, all Cologne city only).

**Out of scope (mode/product cut):**
- Lines 16, 18: regional/cross-border (Bonn-bound Stadtbahn Rhein-Sieg). **`out-product`** (v1 city scope, not technical exclusion)
- S-Bahn Köln (S6, S11, S12, S19): regional commuter. **`out-product`** (v1 scope is Stadtbahn only)
- Tram, bus, DB long-distance, regional rail (outside S-Bahn): **`out-mode`**

## Board eligibility

### Cologne Stadtbahn services (v1 in-scope)

All ten lines (1, 3, 4, 5, 7, 9, 12, 13, 15, 17) are KVB-operated, walk-up, non-reserved, and serve in-catalog stations. **All in-scope Stadtbahn services: `in`.** Boardings open to any traveler with a standard VRS ticket, day pass, or contactless RFID card; no seat reservation, no check-in barrier.

| Line | Verdict | Terminus A – Terminus B | Notes |
|---|---|---|---|
| 1 | `in` | Düsseldorf-Flingern – Bad Honnef | Low-floor east-west line |
| 3 | `in` | Cologne-Nippes – Roggendorf/Thenhoven | High-floor central radial |
| 4 | `in` | Cologne-Nippes – Hürth-Kalstert | High-floor central radial |
| 5 | `in` | Cologne-Longerich – Bad Honnef | High-floor radial |
| 7 | `in` | Frechen-Süd – Bensberg | Low-floor east-west line |
| 9 | `in` | Cologne-Poll – Königsforst | Low-floor east-west line |
| 12 | `in` | Cologne-Chorweiler – Hürth-Mittelkassel | High-floor central radial |
| 13 | `in` | Cologne-Niehl – Cologne-Zollstock | High-floor central radial |
| 15 | `in` | Cologne-Weiß – Frechen-Königsdorf | High-floor radial |
| 17 | `in` | Cologne-Sürth – Severinstraße | High-floor central radial |

**Confirmation needed at D1:** Exact published passenger termini from official 2026 KVB timetable PDFs for all lines. Wikipedia and GTFS may list extended/planned termini not shown to passengers.

### Lines 16 & 18 (excluded, out-product)

| Service | Verdict | Rationale |
|---|---|---|
| Line 16 (Rheinuferbahn) | `out-product` | Jointly operated with Bonn (SWB); crosses regional boundary; part of Stadtbahn Rhein-Sieg. v1 scope is Cologne city only. Not a mode cut; walk-up boardable. Future: add if Bonn page launches. |
| Line 18 (Vorgebirgsbahn) | `out-product` | Jointly operated with Bonn (SWB); crosses regional boundary to Bonn Bahnhof; Stadtbahn Rhein-Sieg shared line. v1 scope is Cologne city only. Walk-up boarding; product decision, not technical exclusion. |

### S-Bahn Köln (excluded, out-product)

| Service | Verdict | Rationale |
|---|---|---|
| S-Bahn Köln (S6, S11, S12, S19 at in-catalog stations) | `out-product` | DB Regio NRW operator; passes both walk-up and leave-by tests; no compulsory reservation, no check-in barrier. v1 product scope is KVB Stadtbahn only; regional S-Bahn is future. No silent omission. |

### Tram, bus, DB long-distance

No tram, bus, DB Fernverkehr, or regional rail (outside S-Bahn) in v1 scope. **Verdict: `out-mode`.** Cologne has extensive tram and bus networks; excluded by product mode cut.

## Skip risk

1. **GTFS-RT coverage clarity:** Dedicated Cologne Stadtbahn GTFS-RT feed does not exist in published form. DELFI national stream and VRS OpenService agreement coverage of metro-specific trip updates (real-time arrivals for Stadtbahn) unconfirmed — common issue: many German metro systems export schedule-only GTFS, with realtime either absent or limited to long-distance rail. Confirm at D1 whether DELFI or VRS RT includes Cologne Stadtbahn next-train data or defaults to timetable board.

2. **VRS GTFS-RT provisioning:** VRS OpenService GTFS-RT requires user agreement and account registration. Confirm key issuance, rate limits, and lifecycle (expiry, refresh) before D2.

3. **Lines 16 & 18 adapter filtering:** Boards must exclude lines 16 & 18 without silent omission; adapter must record verdicts. Shared Dom/Hauptbahnhof station serves 5 (in) and 16/18 (out); deduplication logic must not accidentally group them.

4. **Station naming divergence:** Official KVB halt lists vs GTFS stops vs map ticks may differ; hand-transcription from 2026 PDFs required to prevent D1 vs adapter mismatches.

5. **S-Bahn & shared platforms:** Hauptbahnhof and other major stations are multi-modal (Stadtbahn + S-Bahn + DB); doNotGroup rules must be strict.

6. **Feed URL stability:** VRS OpenData feed URL must remain live (200 OK). Verify before final hand-off to Luke.

## License

- **License name:** VRS GTFS static data under Deutschland Zero Version 2.0 (public, open access). DELFI / GTFS.DE fallback under CC BY-SA 4.0.
- **Redistribution / rehosting:** VRS open data terms typically permit redistribution of derived products (schedule data, boards) with attribution. GTFS.DE CC BY-SA 4.0 explicitly allows redistribution, derivative works, and rehosting with attribution and same license. Confirm VRS account terms (key agreement for GTFS-RT may impose stricter redistribution limits than static data).
- **Commercial use:** VRS Deutschland Zero and GTFS.DE CC BY-SA 4.0 both permit commercial use under attribution. Verify in VRS account terms for GTFS-RT.
- **Attribution:** When using VRS GTFS static: "Verkehrsverbund Rhein-Sieg (VRS)" or per VRS terms. When using GTFS.DE / DELFI: "GTFS.DE" and underlying source (DELFI, KVB, etc.). OSM attribution required if OSM data included.
- **Terms URL:** 
  - https://www.vrsinfo.de/fahren/fahrplanauskunft/opendata-/-openservice (VRS Open Data / Open Service portal)
  - https://gtfs.de/en/ (GTFS.DE, CC BY-SA 4.0)
  - https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0 deed)
  - https://mobilitydatabase.org/feeds/gtfs/mdb-778 (Mobility Database entry for VRS GTFS)
- **Confidence:** `unclear` on VRS account terms and GTFS-RT provisioning specifics. VRS static GTFS feed is public and live; license portal is available but terms need explicit confirmation. GTFS.DE / DELFI license is `clear` (CC BY-SA 4.0). Deutschland Zero terms for VRS static feed: `unclear` — license name found in Transitland feed metadata, but official VRS terms page to be confirmed at D1.
- **Keyed feeds:** VRS GTFS-RT (OpenService) requires registration and key; key agreement terms must be reviewed for redistribution restrictions. DELFI / GTFS.DE realtime is key-free.

## What I did not do

No `lib/cities/cologne/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking confirmation until D1 official KVB network plan is in hand. No lines 16 & 18 inclusion decision without noting it as a product scope call requiring Mark/Tim confirmation. No S-Bahn adapter filtering code. No tram, bus, or DB long-distance data.

## Sources & references

- [Transitland VRS GTFS feed page](https://www.transit.land/feeds/f-u0z-vrs)
- [Mobility Database VRS GTFS feed](https://mobilitydatabase.org/feeds/gtfs/mdb-778)
- [VRS Open Data Service portal](https://www.vrsinfo.de/fahren/fahrplanauskunft/opendata-/-openservice)
- [VRS Open Data (Open.NRW)](https://open.nrw/dataset/vrs-verkehrsdaten-gtfs-k)
- [Transitland KVB Cologne GTFS feed](https://www.transit.land/feeds/f-u1j-kvbk%C3%B6lnerverkehrs~betriebeag~wupsiwupsigmbh~dbdeutschebahn/)
- [Wikipedia: Cologne Stadtbahn](https://en.wikipedia.org/wiki/Cologne_Stadtbahn)
- [Wikipedia: Bonn Stadtbahn](https://en.wikipedia.org/wiki/Bonn_Stadtbahn)
- [Wikipedia: Rhine-Ruhr S-Bahn](https://en.wikipedia.org/wiki/Rhine-Ruhr_S-Bahn)
- [Wikipedia: Neumarkt (KVB) station](https://en.wikipedia.org/wiki/Neumarkt_(KVB))
- [Wikipedia: Dom/Hauptbahnhof station](https://en.wikipedia.org/wiki/Dom/Hauptbahnhof_station)
- [DELFI GTFS-RT information](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101)
- [GTFS.DE realtime data](https://gtfs.de/en/realtime/)

## C2/C3 deliverables to put in front of Luke

1. **city=cologne**, agency **KVB / VRS**, not merged into national German feed or another region.
2. **Neumarkt** is the locked Stadtbahn hub (junction of low-floor 1/7/9 and high-floor 3/4/5/9/12/13/15/17 lines; six or more lines depending on v1 cut). Dom/Hauptbahnhof is secondary (line 5 + S-Bahn + DB co-location). **doNotGroup Dom/Hbf Stadtbahn vs S-Bahn vs DB.** Same building; separate boards.
3. **KVB Stadtbahn lines 1, 3, 4, 5, 7, 9, 12, 13, 15, 17 all in scope** (ten lines, Cologne city only). Lines 16, 18 excluded (Bonn-bound, joint operation).
4. **Lines 16 & 18** (Rheinuferbahn, Vorgebirgsbahn): `out-product` verdict at both line-level and service-level. Not a mode cut. Regional cross-border scope decision. Future: add if Bonn page launches.
5. **S-Bahn Köln** out-product verdict at every in-catalog Stadtbahn station. Not a mode cut. v1 scope is urban Stadtbahn only; regional S-Bahn is future.
6. **VRS GTFS-RT key / OpenService agreement required** for realtime boards. DELFI fallback is key-free (CC BY-SA 4.0). Confirm account provisioning and GTFS-RT coverage before D2 dependency run.
7. **Board eligibility lock:** Ten KVB Stadtbahn lines all `in`; lines 16, 18 `out-product`; S-Bahn all `out-product`; tram/bus/DB all `out-mode`.
8. **No product cologne/ directory yet.** `assertCityLive("cologne")` is Unknown city.

## Next steps (D2 / Luke's pack)

- Obtain official 2026 KVB Netzplan (network diagram) and complete halt lists for all ten lines (1, 3, 4, 5, 7, 9, 12, 13, 15, 17).
- Confirm Neumarkt hub-lock and Dom/Hauptbahnhof secondary node against official KVB collateral.
- Register VRS OpenData account (if needed for GTFS-RT), obtain API key, and document key lifecycle and rate limits.
- Confirm DELFI national GTFS-RT coverage includes Cologne Stadtbahn trip updates (real-time next-train data); if not, confirm timetable-only baseline is acceptable for launch.
- Transcribe station names and order from official KVB PDFs into published-network.json (not GTFS-derived).
- Confirm all S-Bahn lines (S6, S11, S12, S19) calling at each Stadtbahn station for adapter filtering and Board eligibility table.
- Confirm lines 16 & 18 verdicts with Tim/Mark before adapter wiring (product decision, not technical exclusion).
