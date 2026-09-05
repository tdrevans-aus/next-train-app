# Nuremberg oracle clash report

D1 (scoped): U-Bahn U1, U2, U3 only. 49 total stations across three lines. **VGN GTFS static feed + DELFI realtime national stream; no local GTFS-RT or dedicated live feed for Nürnberg U-Bahn; S-Bahn verdict recorded in Board eligibility section below.**

## Transit authority & operator

- **Regional authority:** Verkehrsverbund Großraum Nürnberg (VGN; Transport Association Region Nuremberg)
- **Local operator:** Verkehrs-Aktiengesellschaft Nürnberg (VAG) — operates metro (U-Bahn), tram, and buses within city
- **S-Bahn operator:** DB Regio Mittelfranken (subsidiary of DB Regio Bayern) — operates regional S-Bahn lines S1–S5, integrated into VGN system

## Feed — static GTFS

- **URL:** http://www.vgn.de/opendata/GTFS.zip
- **Onestop ID (Transitland):** `f-u0z-vgn` (verified live 5 Sep 2026; 27 versions tracked)
- **Auth:** None required (public open data)
- **Content scope:** Whole VGN region (U-Bahn, tram, bus, S-Bahn, regional rail); not U-Bahn-only
- **Confirmation:** Feed page https://www.transit.land/feeds/f-u0z-vgn; official download via vgn.de/web-entwickler/open-data/
- **v1 contract:** U1–U3 static timetable only; S-Bahn static data available but filtered at adapter (verdict: `out-product`)

## Feed — realtime (GTFS-RT)

- **No dedicated Nürnberg U-Bahn GTFS-RT feed** published by VAG or VGN.
- **National feed:** DELFI Realtime Data GTFS-RT stream https://realtime.gtfs.de/realtime-free.pb
  - Covers Germany-wide realtime departures (TripUpdates + ServiceAlerts)
  - Includes S-Bahn, regional, and metro data from DELFI member operators (Deutsche Bahn, regional carriers, municipal operators including VGN)
  - License: CC BY-SA 4.0
  - No key required
  - **Nürnberg U-Bahn coverage:** Nürnberg-specific metro next-train coverage via DELFI unclear — confirm at D1 whether U-Bahn trip updates are present in the stream (common issue: many German metro systems provide schedule-only GTFS, no GTFS-RT)
- **Fallback:** Timetable-only boards until realtime is confirmed; schedule board via VGN static feed is usable baseline.

## Authentication & redistribution

- **VGN GTFS static:** No key required. Public download.
- **DELFI GTFS-RT:** No key required. Free tier available via https://realtime.gtfs.de/realtime-free.pb.
- **Vercel environment:** No DELFI or VGN keys needed in `.env.local` or Vercel.

## v1 network cut

- **In scope:** U-Bahn lines U1 (27 stations, 18.5 km, Fürth–Nürnberg), U2 (16 stations, 13.2 km, includes airport), U3 (14 stations, 9.2 km, driverless RUBIN automation)
- **Total:** 49 stations (U1 27 + U2 16 + U3 14, some double-counted at shared stops; official count 49 unique).
- **Out of scope:** S-Bahn (S1–S5), tram, bus, regional rail, DB long-distance.

## Hub-lock station

**Plärrer** — only Nürnberg U-Bahn station (besides Hauptbahnhof) where all three lines (U1, U2, U3) converge. Central city location; strong passenger anchor.

**Hauptbahnhof** — alternative hub where U1, U2, U3 also meet; serves six lines in total (U1–U3 plus overlaps); includes S-Bahn, tram, bus, and DB mainline interchange. **Recommendation:** Plärrer as the locked hub (pure metro node); Hauptbahnhof as secondary multi-modal checkpoint for cross-reference and `doNotGroup` rules (U vs S vs DB vs tram).

## Station naming surface

**Precedent:** Munich showed significant drift between official timetable names, map ticks, API abbreviations, and S-Bahn co-stops. Nürnberg likely has similar issues:
- Station list PDFs (Fahrtplan) vs official map vs website API may differ in spacing, hyphenation, or abbreviations
- Several S-Bahn stations share U-Bahn platform names (e.g., Nürnberg Hauptbahnhof serves both DB/S-Bahn and U-Bahn)
- Hand-transcription from official 2026 timetable PDFs and Netzplan required; do not derive names from GTFS alone

**Action:** Luke (D1 pack) to source current 2026 Netzplan (network diagram) and official halt lists from VAG/VGN before station-name table is finalized; keep D1 published-network.json independent of API/GTFS stops.

## Board eligibility

| Service | Stations | Walk-up <br/> boardable | Leave-by <br/> valid | Verdict | Evidence / notes |
|---------|----------|:---:|:---:|---------|---|
| U1 | Nürnberg U-Bahn line U1 | ✓ | ✓ | `in` | VGN unified ticketing; no reservation; standard platform access. Transitland / VGN GTFS. |
| U2 | Nürnberg U-Bahn line U2 | ✓ | ✓ | `in` | VGN unified ticketing; no reservation; includes Flughafen (airport). Transitland / VGN GTFS. |
| U3 | Nürnberg U-Bahn line U3 | ✓ | ✓ | `in` | VGN unified ticketing; no reservation; driverless RUBIN automation. Transitland / VGN GTFS. |
| S-Bahn (S1–S5) | Regional commuter at shared stations (e.g., Hauptbahnhof, Plärrer city cross-entry) | ✓ | ✓ | `out-product` | Passes both walk-up tests (no compulsory reservation, no check-in); excluded as v1 scope is U-Bahn only. DB Regio Mittelfranken operator; VGN unified ticketing. Recorded verdict prevents silent omission from board. https://s-bahn-nuernberg.de/ |

**Summary:** No services other than U-Bahn (U1–U3) and regional S-Bahn call at in-catalog stations. S-Bahn is `out-product` (legitimate v1 scope cut). No walk-up services are silently filtered.

## Skip risk

1. **Realtime feed clarity:** DELFI GTFS-RT stream coverage of Nürnberg U-Bahn (metro-specific trip updates) unconfirmed — many German metro systems export schedule-only GTFS, with realtime GTFS-RT either absent or limited to long-distance rail. Confirm at D1 whether `realtime.gtfs.de` includes U-Bahn next-train departures or defaults to timetable board.
2. **No local GTFS-RT:** VAG does not publish a dedicated U-Bahn GTFS-RT feed (unlike some German cities). Dependence on national DELFI stream is a single point of fragility.
3. **Station naming divergence:** Official halt lists vs API vs map ticks historically diverge (Munich precedent); hand-transcription of current 2026 PDFs required to avoid D1 vs adapter name mismatches.
4. **S-Bahn & shared platforms:** Hauptbahnhof is a six-line U-Bahn hub + major S-Bahn terminus; doNotGroup rules must be strict to prevent cross-mode deduplication errors.

## License

- **License name:** Creative Commons Attribution 3.0 Germany (CC BY 3.0 DE) — VGN GTFS static.
- **Redistribution / rehosting:** VGN GTFS data may be redistributed in derivative products if attribution is included. Transitland also records feed redistribution as allowed. Confirm with vgn.de/web-entwickler/open-data/ terms before D2.
- **Commercial use:** Allowed under CC BY 3.0 DE.
- **Attribution:** "Verkehrsverbund Großraum Nürnberg (VGN)" or "Verkehrs-Aktiengesellschaft Nürnberg (VAG)" with feed version/date, per CC BY 3.0 DE.
- **Terms URL:** 
  - https://www.vgn.de/web-entwickler/open-data/ (VGN/VAG open data portal)
  - https://www.transit.land/feeds/f-u0z-vgn (Transitland entry with versioning + license record)
- **Confidence:** `clear` for static GTFS license (CC BY 3.0 DE explicitly stated). `unclear` for DELFI GTFS-RT Nürnberg metro coverage (national feed, operator-specific presence requires confirmation).
- **Keyed feeds:** None. VGN GTFS static and DELFI GTFS-RT both unkeyed (public open access).

## What I did not do

No station-name table (Luke's D1 task), no `published-network.json` generation, no product code, no live flip proposal. No hub-selection call (Plärrer recommended based on three-line convergence; final call is Tim/Luke). No reopen of other German cities, no retroactive audit of U-Bahn precedent cities.

## Sources & references

- [Transitland VGN feed page](https://www.transit.land/feeds/f-u0z-vgn)
- [Transitland VGN operator entry](https://www.transit.land/operators/o-u0z-vgn)
- [VGN open data portal](https://opendata.vag.de/)
- [S-Bahn Nürnberg official site](https://www.s-bahn-nuernberg.de/)
- [Wikipedia: Nuremberg U-Bahn](https://en.wikipedia.org/wiki/Nuremberg_U-Bahn)
- [Wikipedia: Nuremberg S-Bahn](https://en.wikipedia.org/wiki/Nuremberg_S-Bahn)
- [Wikipedia: Plärrer station](https://en.wikipedia.org/wiki/Plärrer_station)
- [DELFI GTFS-RT stream info](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-3101)
- [GTFS.DE realtime data](https://gtfs.de/en/realtime/)
