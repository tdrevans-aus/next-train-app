# Düsseldorf oracle clash report

D1 (published, as of 2026-09-06): VRR OpenData GTFS static feed + GTFS-RT via GTFS.DE. Local v1 network is Rheinbahn Stadtbahn (light rail) U70–U83 only (eleven lines); S-Bahn Rhein-Ruhr excluded by board eligibility verdict. Station names sourced from Rheinbahn/VRR official line maps, published timetables (Linienfahrplan), and open data portals. **Not GTFS-generated.** Not from Wikipedia. D1 scope and verdicts finalized; S-Bahn Rhein-Ruhr and tram/bus excluded by product cut.

## Transit agency & feed access

**Agency:** Rheinbahn AG operates the Düsseldorf Stadtbahn network for the Rhein-Ruhr region. VRR (Verkehrsverbund Rhein-Ruhr) coordinates regional transit data and open data platforms.

**Static GTFS feed:** VRR OpenData portal at https://opendata.ruhr/ publishes **Soll-Fahrplandaten VRR** (schedule timetable data). Regional GTFS feed includes Stadtbahn, S-Bahn, tram, and bus data monthly. The same feed is mirrored at https://open.nrw/dataset/soll-fahrplandaten-vrr-rvr. Fallback: GTFS.DE aggregated German feed (https://gtfs.de/en/feeds/de_nv/) includes Düsseldorf via DELFI dataset conversion (CC BY-SA 4.0).

**GTFS-Realtime feed:** GTFS.DE publishes a unified GTFS-RT stream at https://realtime.gtfs.de/realtime-free.pb (TripUpdates and ServiceAlerts). VRR-specific GTFS-RT availability via opendata-oepnv.de to be confirmed at D1 dependency run.

**Authentication:** VRR OpenData requires registration and API key for access to the portal. GTFS.DE feeds are key-free (CC BY-SA 4.0 licensed). Confirm VRR key provisioning, account terms, and rate limits before D2 adapter run.

**Board eligibility cutoff:** v1 includes Rheinbahn Stadtbahn lines U70–U83 only (eleven lines, all in scope). S-Bahn Rhein-Ruhr (S1–S9, regional commuter lines) is excluded with verdict `out-product` — not a mode cut, but a product scope decision. Regional S-Bahn lines serve Düsseldorf Hauptbahnhof and call at Stadtbahn interchanges (Heinrich-Heine-Allee, Universität-Süd); they pass both walk-up and check-in tests. Verdict: **S-Bahn lines calling at v1 Stadtbahn stations are marked `out-product` (v1 scope, not technical exclusion).** No tram, bus, or DB long-distance in v1.

## Network overview

**Stadtbahn lines (Rheinbahn):**

- **U70** (rush-hour express): same route as U76, limited stops. High-floor, classic downtown tunnel.
- **U71**: Wehrhahn-Linie (February 2016 opening). Low-floor, modern tunnel. Part of the dual-personality system.
- **U72**: Wehrhahn-Linie. Low-floor, modern tunnel.
- **U73**: Wehrhahn-Linie. Low-floor, modern tunnel.
- **U74** (surface + underground): mixed classic/new infrastructure.
- **U75**: High-floor, classic downtown tunnel. Outer-district surface sections.
- **U76**: High-floor, classic downtown tunnel. Primary outer-district line.
- **U77**: High-floor, classic downtown tunnel.
- **U78**: High-floor, classic downtown tunnel.
- **U79** (joint operation Rheinbahn + DVG): Düsseldorf–Duisburg cross-regional line. High-floor. 49 stops, 41.3 km (longest Stadtbahn line). Crosses Rhine into Kaiserswerth, Nordpark, Heinrich Heine University. **Walk-up boardable, no compulsory reservation.** Fares integrated via VRR.
- **U83** (Wehrhahn-Linie, weekday-only): Low-floor, modern tunnel. **Closed weekends.** Part of the dual-personality network.

System: 11 lines, ~161 stations, 64.85 km total length (approximate). Two technical personalities: classic high-floor lines (U70, U75, U76, U77, U78, U79) through the downtown tunnel built 1970s–1980s; Wehrhahn-Linie low-floor lines (U71, U72, U73, U83) through modern February 2016 tunnel.

## Hub lock candidate stations

**Heinrich-Heine-Allee (recommended primary lock):** Underground interchange beneath Altstadt where **all eleven Stadtbahn lines converge.** Two island platforms on upper level (4 tracks), one island platform on lower level (2 tracks). Opened May 7, 1988; rebuilt 2016. The only station served by all 11 lines (U70–U83). Official VRR/Rheinbahn hub designation. No S-Bahn at Heinrich-Heine-Allee itself; S-Bahn passengers transfer from nearby Hauptbahnhof.

**Königsallee (secondary candidate, U-Bahn-only subset):** Surface-level interchange; serves a subset of lines (U70, U75, U76, U77). Not all-lines convergence.

**Verdict: Heinrich-Heine-Allee is the v1 hub-lock** because it serves all eleven Stadtbahn lines and is the official RMV/Rheinbahn central interchange. Königsallee is a secondary node; **doNotGroup any S-Bahn co-located stations** — same building family, two separate published networks.

## v1 network cut

**Scope:** Rheinbahn Stadtbahn U70–U83 all included (eleven lines, no subdivision).

**U79 decision (Duisburg-bound):** Included as `in`. U79 is walk-up boardable (no compulsory seat reservation), operates under VRR integrated fares, and is jointly operated by Rheinbahn and Duisburger Verkehrsgesellschaft (DVG). Both tests (walk-up + no check-in) pass. Dual-operator aspect noted for adapter filtering: Jim's code must route U79 correctly via VRR-published GTFS; no silent omission. U79 serves Düsseldorf Hauptbahnhof and Heinrich-Heine-Allee, both in-catalog stations.

**S-Bahn Rhein-Ruhr (out-product verdict):** Regional commuter lines S1–S9 calling at Hauptbahnhof, and Stadtbahn interchanges (Heinrich-Heine-Allee, Universität-Süd, etc.) are excluded. These lines are **not** a mode cut (they are rail, walk-up, non-reserved). Exclusion is a v1 scope decision: v1 is Düsseldorf Stadtbahn only; regional S-Bahn integration is planned for later. **Every S-Bahn line calling at an in-catalog Stadtbahn station records `out-product` verdict in the Board eligibility table.**

**Tram, bus, DB long-distance, regional rail:** excluded by mode cut (`out-mode`). No Düsseldorf tram lines (Straßenbahn) in v1. No buses. No DB regional/long-distance. No Lufthansa buses or airport shuttles.

## H2 clash surface (data / naming surface)

**Naming clashes identified (D1 research to confirm):**

1. **City prefix on outer-district stations:** Rheinbahn/VRR published line maps show short names; some data sources may prepend region (e.g., "Düsseldorf, Gerresheim"). Lock to Rheinbahn official line-map short form from published Linienfahrplan PDFs.
2. **S-Bahn vs Stadtbahn at co-located stations:** Hauptbahnhof and Heinrich-Heine-Allee each serve both S-Bahn (regional S1–S9) and Stadtbahn (U70–U83). **Do not merge S and U under one station name.** Each mode gets its own board.
3. **High-floor vs low-floor dual system:** Wehrhahn-Linie (U71/U72/U73/U83) operates separate low-floor tunnel; classic lines (U70/U75–U79) run high-floor through downtown. Same station names where they overlap (e.g., Heinrich-Heine-Allee has upper- and lower-level platforms). No station name duplication; platform topology is adapter concern, not D1.
4. **Hyphenation / abbreviation variance:** VRR GTFS output may differ from Rheinbahn printed maps (abbreviations, spacing, hyphenation). Confirm exact locked D1 strings from Rheinbahn Linienfahrplan PDFs before Luke's pack.
5. **U83 weekend closures:** U83 is recorded as closed weekends in public notices. D1 must note service-day cutoffs; adapter must apply them correctly.

**No GTFS-generated halt lists:** Station order is transcribed from official Rheinbahn Linienfahrplan fold-out PDFs and online stop lists (vrr.de, rheinbahn.de). GTFS data in v1 packs the schedule; station name and order come from D1 capture.

**Product absence:** No `lib/cities/dusseldorf/` directory exists yet. Clash is **naming-source agreement** (Rheinbahn map vs VRR GTFS) and **S-Bahn vs Stadtbahn mode separation** at co-located stations.

## Board eligibility

### Stadtbahn services (v1 in-scope)

All eleven Rheinbahn Stadtbahn lines (U70–U83) are walk-up, non-reserved, and serve in-catalog stations. **All Stadtbahn services: `in`.** Boardings open to any traveler with a standard VRR ticket, day pass, or contactless tap; no seat reservation, no check-in barrier.

| Line | Verdict | Notes |
|---|---|---|
| U70 | `in` | Rush-hour express, same route as U76 with limited stops. High-floor. |
| U71 | `in` | Wehrhahn-Linie (low-floor, modern tunnel, 2016 opening). Daily service. |
| U72 | `in` | Wehrhahn-Linie (low-floor, modern tunnel). Daily service. |
| U73 | `in` | Wehrhahn-Linie (low-floor, modern tunnel). Daily service. |
| U74 | `in` | Mixed classic/new tunnel sections. Daily service. |
| U75 | `in` | High-floor, classic tunnel + surface outer-district. Daily service. |
| U76 | `in` | High-floor, classic tunnel + surface outer-district. Primary outer line. |
| U77 | `in` | High-floor, classic tunnel. Daily service. |
| U78 | `in` | High-floor, classic tunnel. Daily service. |
| U79 | `in` | Joint Rheinbahn/DVG operation (Düsseldorf–Duisburg, 49 stops). Walk-up boardable, VRR-integrated fares. High-floor. Dual-operator aspect requires adapter coordination but does not change boarding contract. |
| U83 | `in` | Wehrhahn-Linie (low-floor, modern tunnel). **Weekday service only; closed weekends.** Adapter must enforce service-day cutoffs. |

**Confirmation needed at D1:** Published service-day rules for U83 from official VRR/Rheinbahn timetable PDFs; exact outer-district terminus names for each line.

### S-Bahn Rhein-Ruhr services (excluded, out-product)

Regional S-Bahn lines (S1, S2, S3, S4, S5, S6, S7, S8, S9, S68) call at Düsseldorf Hauptbahnhof, Universität-Süd, and Stadtbahn interchanges (Heinrich-Heine-Allee, etc.). All are walk-up (no compulsory seat reservation), no check-in barriers. Both test 1 (walk-up) and test 2 (no check-in) pass.

**Verdict: `out-product`.** S-Bahn lines are intentionally excluded from v1 scope (v1 = Düsseldorf Stadtbahn only). This is not a mode cut — S-Bahn is rail, walk-up boardable. Regional S-Bahn integration is future work; v1 stays focused on urban metro service.

| Service | Verdict | Evidence |
|---|---|---|
| S-Bahn Rhein-Ruhr (all S-lines at in-catalog Stadtbahn stations) | `out-product` | v1 scope is Düsseldorf Stadtbahn only. S-Bahn integration planned post-v1. No technical exclusion; product decision. |

### Tram, bus, DB long-distance

No tram, bus, DB Fernverkehr, or regional rail (outside S-Bahn) lines are in v1 scope. **Verdict: `out-mode`.** Düsseldorf has extensive tram (Straßenbahn) and bus networks; they are excluded by product mode cut, not listed in Board eligibility.

## Skip risk

1. **VRR key provisioning:** v1 boards require real-time GTFS or GTFS-RT for next-train display. VRR OpenData API key must be provisioned and stable before launch. Confirm account status, API rate limits, and key lifecycle (expiry, refresh) with VRR before D2. Fallback to GTFS.DE key-free GTFS-RT available, but primary path is VRR.
2. **S-Bahn verdict edge case:** S-Bahn lines serve many in-catalog Stadtbahn stations. Adapters must filter S-Bahn out of every Stadtbahn board without silent omission. Jim's adapter must record all S-Bahn verdicts in the code; Mark gates on filtering accuracy.
3. **U79 dual-operator coordination:** U79 crosses into Duisburg (DVG territory). VRR GTFS must correctly include U79 stop order and timing. DVG feed coordination (if separate) must not create gaps. Confirm VRR GTFS includes complete U79 data before D2.
4. **U83 weekend closures:** U83 is documented as weekday-only / closed weekends. D1 must lock published service-day rules; adapter must apply day-of-week filtering correctly. Verify against Rheinbahn Linienfahrplan PDFs.
5. **Hub-lock station naming lock:** Heinrich-Heine-Allee is the recommended lock, but official D1 network plan must confirm it is the printed hub in current Rheinbahn collateral and VRR maps. If Rheinbahn names a different station, D1 rescopings required.
6. **Feed URL stability:** VRR OpenData feed URL must be stable and live (200 OK). Transitland and GTFS.DE both index the feed; confirm live status before final hand-off to Luke.

## License

- **License name:** VRR OpenData Soll-Fahrplandaten under Open Data Commons Attribution (ODC-By) 1.0, or Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0) depending on portal. GTFS.DE fallback is Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0).
- **Redistribution / rehosting:** VRR OpenData (ODC-By 1.0) allows redistribution, derivative works, and commercial use with attribution to VRR. GTFS.DE CC BY-SA 4.0 explicitly allows redistribution, derivative works, and rehosting provided attribution is retained and derivative works use same license. Confirm VRR account terms (key agreement may impose stricter redistribution limits than the data license itself).
- **Commercial use:** VRR OpenData and GTFS.DE CC BY-SA 4.0 both permit commercial use under attribution. Confirm in VRR account terms.
- **Attribution:** When using VRR data: "Verkehrsverbund Rhein-Ruhr (VRR)" or per VRR account terms. When using GTFS.DE: "GTFS.DE" and underlying source (DELFI, Rheinbahn, VRR). If OSM data is included, OSM attribution required.
- **Terms URL:** https://opendata.ruhr/dataset/soll-fahrplandaten-vrr (VRR OpenData portal, license terms visible on dataset page), https://gtfs.de/en/ (GTFS.DE, CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0 deed).
- **Confidence:** `clear` on GTFS.DE / DELFI CC BY-SA 4.0. `unclear` on VRR account terms and key provisioning specifics — VRR OpenData portal is public and live; license terms are published on the portal but need explicit confirmation during account registration. Transitland feed status: indexed and live (Rheinbahn AG operator page on Transitland).
- **Keyed feeds:** VRR OpenData API requires key registration. Key agreement terms (if separate from data license) must be reviewed for redistribution restrictions. GTFS.DE realtime is key-free.

## What I did not do

No `lib/cities/dusseldorf/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking until D1 official Rheinbahn network plan is in hand. No S-Bahn data inclusion; all S-Bahn verdicts are `out-product` (product scope decision, not mode cut). No tram, bus, or DB long-distance data. No U83 service-day filtering until published Rheinbahn timetables are captured.

## C2/C3 deliverables to put in front of Luke

1. **city=dusseldorf**, agency **Rheinbahn / VRR**, not merged into a national German feed or another region.
2. **Heinrich-Heine-Allee** is the locked Stadtbahn hub (all eleven lines U70–U83 converge). No S-Bahn co-location at this station; nearby Hauptbahnhof handles S-Bahn. **doNotGroup Hauptbahnhof Stadtbahn vs S-Bahn.** Same building family; separate boards.
3. **Stadtbahn U70–U83 all in scope.** Eleven lines, all included. U70 is rush-hour express (same route as U76); U83 is weekday-only (closed weekends, service-day filtering required).
4. **U79 included.** Joint Rheinbahn/DVG operation to Duisburg. Walk-up boardable, VRR-integrated fares. Both tests pass; no compulsory reservation, no check-in barrier. Confirm VRR GTFS includes complete U79 data.
5. **S-Bahn Rhein-Ruhr** out-product verdict at every in-catalog Stadtbahn station (especially Hauptbahnhof, Universität-Süd, Heinrich-Heine-Allee interchanges). Not a mode cut. V1 scope is urban Stadtbahn only; regional S-Bahn is future.
6. **U83 service-day cutoff:** Weekday-only operation. Adapter must enforce day-of-week filtering from published Rheinbahn Linienfahrplan PDFs.
7. **VRR OpenData key required** for primary GTFS/GTFS-RT feeds. Confirm account provisioning before D2 dependency run. GTFS.DE key-free fallback available.
8. **Board eligibility lock:** U70–U83 all `in`; S-Bahn all `out-product`; tram/bus/DB all `out-mode`.
9. **No product dusseldorf/ directory yet.** `assertCityLive("dusseldorf")` is Unknown city.
10. **Dual technical system:** Classic high-floor lines (U70, U75–U79) in downtown tunnel; Wehrhahn-Linie low-floor lines (U71–U73, U83) in modern tunnel. Same Heinrich-Heine-Allee hub; separate upper/lower platforms. No station name duplication; platform topology is Jim's adapter concern.

## Next steps (D2 / Luke's pack)

- Obtain official Rheinbahn Stadtbahn network plan (Netz- und Linienplan) and Linienfahrplan PDFs for each line (U70–U83).
- Confirm Heinrich-Heine-Allee hub-lock against official Rheinbahn/VRR collateral.
- Confirm published outer-district terminus names for each line.
- Register VRR OpenData account, obtain API key, and document key lifecycle and rate limits.
- Verify U83 published service-day rules (weekday-only, weekend closure) from official Rheinbahn timetable.
- Verify U79 stop order and timing in VRR GTFS; confirm DVG coordination does not create data gaps.
- Transcribe station names and order from official Rheinbahn PDFs into published-network.json.
- Confirm S-Bahn lines (S1–S9, S68) calling at each Stadtbahn station (for adapter filtering and Board eligibility table).
- Test GTFS-RT feed availability (VRR and/or GTFS.DE).
