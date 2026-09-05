# Hanover oracle clash report

D1 (scoped): Üstra Stadtbahn lines 1–18 (Hanover city only). S-Bahn Hannover verdict recorded. GVH open data GTFS static + national DELFI GTFS-RT fallback; no dedicated Hanover Stadtbahn realtime feed. Station names to be transcribed from official Üstra network maps and halt lists; not GTFS-derived.

## Transit agency & feed access

**Agency:** Üstra Hannoversche Verkehrsbetriebe AG (branded as Üstra/ÜMO since April 2024) operates the Hanover Stadtbahn (light metro/Stadtbahn) for the city. Großraum-Verkehr Hannover (GVH; Greater Hanover Transport) is the regional transit authority coordinating data and fares across the Hanover region.

**Static GTFS feed:** Multiple sources provide comprehensive regional GTFS for Hanover area:
- **Regional feed:** Connect-Fahrplanauskunft provides GTFS for Northern Germany (Niedersachsen/Bremen region) via the DELFI OpenData Platform. Hannover is Hannover-based; feeds available through https://connect-fahrplanauskunft.de/ and DODP (DELFI OpenData Platform).
- **National feed:** GTFS.DE aggregated German feed (https://gtfs.de/en/feeds/) includes Hanover via DELFI dataset conversion (CC BY-SA 4.0). Feed includes Stadtbahn, S-Bahn, tram, bus, and regional rail across Hanover region.
- **Fallback:** GTFS.DE DELFI-generated feed is public and live; license CC BY-SA 4.0.

**Authentication:** Connect feeds and GTFS.DE / DELFI static GTFS require no key. Public open data access.

**GTFS-Realtime feed:**
- **No dedicated Hanover Stadtbahn GTFS-RT feed** published by Üstra or GVH.
- **National feed:** DELFI Realtime Data GTFS-RT stream https://realtime.gtfs.de/realtime-free.pb covers Germany-wide realtime departures (TripUpdates + ServiceAlerts). License: CC BY-SA 4.0. No key required.
- **Hanover Stadtbahn coverage:** Hanover-specific metro next-train coverage via DELFI unclear — confirm at D1 whether DELFI includes Hanover Stadtbahn trip updates or defaults to timetable board (common issue: many German metro systems export schedule-only GTFS, with realtime either absent or limited to long-distance rail).
- **Fallback:** Timetable-only boards until realtime presence is confirmed. Connect static feed and GTFS.DE are usable baseline.

## Network overview

**Hanover Stadtbahn lines (v1 scope):**

The Hanover Stadtbahn is a modern urban light rail system combining underground metro tunnels in the city center with reserved surface alignments and reserved track sections. Total: 201 stations (19 underground, 124 high-platform), 121 km of route, 12 main lines plus two supplemental lines.

**v1 cut: Lines 1–18 (Hanover city only, all urban Stadtbahn)**
- **Line list:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10E (weekend night express), 11, 16, 17, 18 (comprehensive Hannover Stadtbahn network)
- All lines are Üstra-operated, walk-up, non-reserved, and serve in-catalog stations.

All eighteen lines are Üstra-operated, walk-up, and serve in-catalog stations.

## Hub-lock station

**Kröpcke (recommended primary lock):**
- Central junction where most Stadtbahn lines converge; serves at minimum lines 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 16, 18 (12+ lines)
- Central city location, largest and deepest Hanover station (33 meters underground)
- Major passenger anchor: approximately 150,000 passengers daily use Kröpcke as starting point, end point, or transfer station
- Dual-platform station with four 33-meter escalators leading to the deepest platforms in the Hannover network
- **Verdict: Kröpcke as v1 hub-lock** for the Hanover Stadtbahn network

**Hannover Hauptbahnhof (secondary, co-modal):**
- Serves Stadtbahn lines and S-Bahn, plus DB mainline
- Co-located Stadtbahn/S-Bahn/DB interchange; separate fare systems and boards
- **doNotGroup Hauptbahnhof Stadtbahn vs S-Bahn vs DB** — same physical building, three separate transit networks

## Station naming surface

**Precedent:** Frankfurt and Nuremberg show drift between official timetable names, network maps, API stops, and operator data. Hanover likely has similar issues:
- Official Üstra halt lists (Fahrtplan) vs. printed network maps (Netzplan) vs. GTFS stops may differ in spacing, hyphenation, abbreviations
- Co-located stations (Hauptbahnhof hosts Stadtbahn, S-Bahn, DB mainline; Kröpcke has multiple platform levels)
- Hand-transcription from official 2026 Üstra network diagram and published timetable PDFs required

**Action:** Luke (D1 pack) to source current Üstra Netzplan (network diagram) and official halt lists before station-name table is finalized. Keep published-network.json independent of GTFS API stops.

## S-Bahn Hannover (walk-up commuter rail)

**Operator:** Transdev Hannover GmbH (took over from DB Regio in June 2022)

**Lines:** S1, S2, S3, S4, S5, S6, S7 (10 total S-Bahn lines; full list to be confirmed at D1)

**Calling at in-catalog stations:** S-Bahn lines call at Hauptbahnhof and other in-catalog Hannover Stadtbahn interchanges.

**Board eligibility test:**
- Test 1 (walk-up): Pass — no compulsory seat reservation; standard ticketing with unified GVH day passes or contactless tap (unified Üstra/S-Bahn/GVH tariff)
- Test 2 (leave-by valid): Pass — no check-in barriers or security gates
- **Result:** S-Bahn Hannover lines pass both technical tests

**Verdict: `out-product`.** S-Bahn Hannover is walk-up and would ordinarily appear on boards at shared stations. However, v1 scope is **Üstra Stadtbahn only** — Hanover city urban light rail network. Regional S-Bahn integration (Transdev operator, regional commuter lines) is a separate product decision, not a technical exclusion. S-Bahn lines calling at in-catalog Stadtbahn stations are recorded `out-product` to prevent silent omission.

| Service | Verdict | Rationale |
|---|---|---|
| S-Bahn Hannover (S1–S7) | `out-product` | Passes walk-up and leave-by tests; excluded by v1 product scope (Üstra Stadtbahn only, not regional S-Bahn). Transdev Hannover operator. Boards must not silently filter S-Bahn without verdict. |

## v1 network cut summary

**In scope:** Üstra Stadtbahn lines 1–18 (12 main lines plus supplementals; all Hanover city only).

**Out of scope (product cut):**
- S-Bahn Hannover (S1–S7): regional commuter. **`out-product`** (v1 scope is Stadtbahn only)
- Tram, bus, DB long-distance, regional rail (outside S-Bahn): **`out-mode`**

## Board eligibility

### Hanover Stadtbahn services (v1 in-scope)

All eighteen lines (1–18) are Üstra-operated, walk-up, non-reserved, and serve in-catalog stations. **All in-scope Stadtbahn services: `in`.** Boardings open to any traveler with a standard GVH ticket, day pass, or contactless RFID card; no seat reservation, no check-in barrier.

| Line | Verdict | Notes |
|---|---|---|
| 1 | `in` | Üstra Stadtbahn line 1; no reservation; unified GVH ticketing. |
| 2 | `in` | Üstra Stadtbahn line 2; no reservation; unified GVH ticketing. |
| 3 | `in` | Üstra Stadtbahn line 3; no reservation; unified GVH ticketing. |
| 4 | `in` | Üstra Stadtbahn line 4; no reservation; unified GVH ticketing. |
| 5 | `in` | Üstra Stadtbahn line 5; no reservation; unified GVH ticketing. |
| 6 | `in` | Üstra Stadtbahn line 6; no reservation; unified GVH ticketing. |
| 7 | `in` | Üstra Stadtbahn line 7; no reservation; unified GVH ticketing. |
| 8 | `in` | Üstra Stadtbahn line 8; no reservation; unified GVH ticketing. |
| 9 | `in` | Üstra Stadtbahn line 9; no reservation; unified GVH ticketing. |
| 10E | `in` | Weekend express night line; no reservation; unified GVH ticketing. |
| 11 | `in` | Üstra Stadtbahn line 11; no reservation; unified GVH ticketing. |
| 16 | `in` | Üstra Stadtbahn line 16; no reservation; unified GVH ticketing. |
| 17 | `in` | Üstra Stadtbahn line 17; no reservation; unified GVH ticketing. |
| 18 | `in` | Üstra Stadtbahn line 18; no reservation; unified GVH ticketing. |

**Confirmation needed at D1:** Exact published passenger termini from official 2026 Üstra timetable PDFs for all lines. Wikipedia and GTFS may list extended/planned termini not shown to passengers.

### S-Bahn Hannover (excluded, out-product)

| Service | Verdict | Rationale |
|---|---|---|
| S-Bahn Hannover (S1–S7 at in-catalog stations) | `out-product` | Transdev Hannover operator; passes both walk-up and leave-by tests; no compulsory reservation, no check-in barrier. v1 product scope is Üstra Stadtbahn only; regional S-Bahn is future. No silent omission. |

### Tram, bus, DB long-distance

No tram, bus, DB Fernverkehr, or regional rail (outside S-Bahn) in v1 scope. **Verdict: `out-mode`.** Hanover has regional tram and bus networks; excluded by product mode cut.

## Skip risk

1. **GTFS-RT coverage clarity:** Dedicated Hanover Stadtbahn GTFS-RT feed does not exist in published form. DELFI national stream coverage of metro-specific trip updates (real-time arrivals for Stadtbahn) unconfirmed — common issue: many German metro systems export schedule-only GTFS, with realtime either absent or limited to long-distance rail. Confirm at D1 whether DELFI or Connect RT includes Hanover Stadtbahn next-train data or defaults to timetable board.

2. **Connect regional GTFS provisioning:** Connect-Fahrplanauskunft is Hannover-based and provides Northern German feeds. Confirm feed availability, URL stability, and update frequency before D2.

3. **S-Bahn & shared platforms:** Hauptbahnhof and other major stations are multi-modal (Stadtbahn + S-Bahn + DB); doNotGroup rules must be strict.

4. **Station naming divergence:** Official Üstra halt lists vs GTFS stops vs map ticks may differ; hand-transcription from 2026 PDFs required to prevent D1 vs adapter mismatches.

5. **Feed URL stability:** Connect and GTFS.DE feed URLs must remain live (200 OK). Verify before final hand-off to Luke.

6. **S-Bahn operator transition:** Transdev took over from DB Regio in June 2022; feed data must reflect current operator. Confirm S-Bahn lines and calling patterns in Connect/DELFI feeds.

## License

- **License name:** GTFS.DE / DELFI feed under CC BY-SA 4.0. Connect regional feed terms to be confirmed at D1.
- **Redistribution / rehosting:** GTFS.DE CC BY-SA 4.0 explicitly allows redistribution, derivative works, and rehosting with attribution and same license. Confirm Connect feed terms (may differ). DELFI realtime also CC BY-SA 4.0.
- **Commercial use:** GTFS.DE CC BY-SA 4.0 permits commercial use under attribution.
- **Attribution:** When using GTFS.DE / DELFI: "GTFS.DE" and underlying source (DELFI, Hannover, etc.). When using Connect: "Connect-Fahrplanauskunft" per Connect terms. OSM attribution required if OSM data included.
- **Terms URL:**
  - https://gtfs.de/en/ (GTFS.DE, CC BY-SA 4.0)
  - https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0 deed)
  - https://connect-fahrplanauskunft.de/datenbereitstellung/ (Connect data provisioning)
  - https://www.transit.land/feeds/f-nvh~de (Transitland Hannover entry, archived)
- **Confidence:** `clear` on GTFS.DE / DELFI CC BY-SA 4.0. `unclear` on Connect feed terms and GTFS-RT provisioning specifics. Connect feed availability to be confirmed at D1.
- **Keyed feeds:** None for static GTFS. Connect and GTFS.DE realtime both unkeyed (public open access).

## What I did not do

No `lib/cities/hanover/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking confirmation until D1 official Üstra network plan is in hand.

## Sources & references

- [Transitland HNV GTFS feed page](https://www.transit.land/feeds/f-nvh~de)
- [GVH – Greater Hanover Transport (Visit Hannover)](https://www.visit-hannover.com/en/Hannoverweb/Beruf-Weiterbildung/Service,-Infos,-Mobilit%C3%A4t/%C3%96ffentlicher-Nahverkehr/GVH-%E2%80%93-Gro%C3%9Fraum-Verkehr-Hannover)
- [Üstra Hannover official site](https://www.uestra.de/)
- [S-Bahn Hannover official site](https://www.sbahn-hannover.de/de/ueber-uns/ueber-uns)
- [Wikipedia: Hanover Stadtbahn](https://en.wikipedia.org/wiki/Hanover_Stadtbahn)
- [Wikipedia: Hanover S-Bahn](https://en.wikipedia.org/wiki/Hanover_S-Bahn)
- [Wikipedia: Kröpcke station](https://de.wikipedia.org/wiki/U-Bahn-Station_Kr%C3%B6pcke)
- [Wikipedia: Hannover Hauptbahnhof](https://en.wikipedia.org/wiki/Hannover_Hauptbahnhof)
- [GTFS.DE realtime data](https://gtfs.de/de/realtime/)
- [Connect-Fahrplanauskunft data provisioning](https://connect-fahrplanauskunft.de/datenbereitstellung/)
- [DELFI GTFS-RT information](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101)
- [Hannover Transportation OSM Wiki](https://wiki.openstreetmap.org/wiki/Hannover/Transportation/GVH-Linien-gesamt)

## C2/C3 deliverables to put in front of Luke

1. **city=hanover**, agency **Üstra / GVH**, not merged into national German feed or another region.
2. **Kröpcke** is the locked Stadtbahn hub (junction of all major Stadtbahn lines; 150,000 daily passengers; deepest station at 33m). Hauptbahnhof is secondary (multi-modal co-location with S-Bahn + DB). **doNotGroup Hbf Stadtbahn vs S-Bahn vs DB.** Same building; separate boards.
3. **Üstra Stadtbahn lines 1–18 all in scope** (14 main lines + supplementals 10E/16/17, Hanover city only).
4. **S-Bahn Hannover** out-product verdict at every in-catalog Stadtbahn station. Not a mode cut. v1 scope is urban Stadtbahn only; regional S-Bahn is future. Transdev Hannover operator (took over from DB Regio June 2022).
5. **Connect regional GTFS feed availability and URL stability** to be confirmed at D1. GTFS.DE / DELFI fallback is key-free (CC BY-SA 4.0). Confirm feed coverage and update frequency before D2.
6. **Board eligibility lock:** All 14 Üstra Stadtbahn lines `in`; S-Bahn all `out-product`; tram/bus/DB all `out-mode`.
7. **No product hanover/ directory yet.** `assertCityLive("hanover")` is Unknown city.

## Next steps (D2 / Luke's pack)

- Obtain official 2026 Üstra Netzplan (network diagram) and complete halt lists for all lines (1–18).
- Confirm Kröpcke hub-lock and Hauptbahnhof secondary node against official Üstra collateral.
- Verify Connect-Fahrplanauskunft GTFS feed URL, coverage, and update frequency; confirm Hannover inclusion and feed stability.
- Confirm DELFI national GTFS-RT coverage includes Hanover Stadtbahn trip updates (real-time next-train data); if not, confirm timetable-only baseline is acceptable for launch.
- Transcribe station names and order from official Üstra PDFs into published-network.json (not GTFS-derived).
- Confirm all S-Bahn lines (S1–S7) calling at each Stadtbahn station for adapter filtering and Board eligibility table.
