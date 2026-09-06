# Seattle oracle clash report

## Service scope and D1 feeds

**Transit agency:** Sound Transit (Puget Sound Regional Transit Authority)

**v1 network in D1:** Link light rail (Lines 1 & 2 only; commuter rail Sounder, Tacoma Link T Line, and Seattle Streetcar are mode cuts / product decisions per board eligibility verdicts below).

**GTFS static feed:** https://gtfs.sound.obaweb.org/prod/40_gtfs.zip
- Sourced from OneBusAway Puget Sound consolidated feed
- Covers all Sound Transit rail modes (Link, Sounder, T Line) and regional bus
- Live as of 2026-09-05 per Transitland; archived versions available via API

**GTFS-RT feed (trip updates, vehicle positions, alerts):** OneBusAway API, api.pugetsound.onebusaway.org
- Requires API key; request to oba_api_key@soundtransit.org (20 business day turnaround)
- Real-time available only for Link 1 Line, Link 2 Line, Tacoma T Line, and ST Express bus
- Transitland Onestop ID: f-soundtransit~rt

**Authentication:** API key required for GTFS-RT endpoints. Static GTFS zip is freely downloadable. All feeds fall under Sound Transit's Open Transit Data terms (see License section below).

## D1 preparation summary

**Recommended v1 cut:** Link 1 Line (Lynnwood–Federal Way) and Link 2 Line (Lynnwood–Redmond via I-90 Crosslake Connection, opened March 2026). Metro-style high-capacity light rail, flat $3 fare, no mode bleed (bus routes are separate agency responsibility or Metro bus).

**Hub-lock station:** **Westlake** (downtown Seattle, Pine St & 4th Ave; served by both 1 Line and 2 Line; within downtown transit tunnel). Downtown transit tunnel also includes Symphony, Pioneer Square, and International District/Chinatown stations. Westlake is the most central interchange point within the tunnel.

**System map D1 oracle:** Obtain current Sound Transit system map from soundtransit.org/maps or developer resources. The 1 Line (north-south Lynnwood–Federal Way corridor) and 2 Line (cross-lake Lynnwood–Redmond via I-90 bridge, opened 2026-03) share the downtown Seattle tunnel (4 stations: Westlake, Symphony, Pioneer Square, International District/Chinatown) and branch after exiting downtown. Link 2 Line opened mid-2026 and should be current in published schedules.

**Stations:** Hand-transcribe from published Sound Transit system map (official network diagram), not from GTFS. Upstream boundary (north): Lynnwood City Center. Downstream boundary (south): Federal Way (1 Line terminus); Eastgate Station / Mercer Island area (2 Line; verify final terminal via map). Westside terminus (2 Line): Redmond Station area (post-I-90 bridge). Do not auto-generate from GTFS.

**Skip risk:** GTFS-RT API key required for real-time next-train (static schedule available without key). API request process has 20 business day SLA. Confirm key availability before D1 -> adapter handoff.

## Board eligibility

All services listed below call at in-catalog stations (Link 1 Line and 2 Line stations in Seattle). Every service gets a verdict.

| Service | Mode | Booking | Check-in barrier | Verdict | Evidence / Notes |
|---------|------|---------|------------------|---------|------------------|
| **Link 1 Line** | Light rail | Walk-up, standard ORCA/Transit GO/cash day pass; no compulsory reservation | No | `in` | Flat $3 fare, proof-of-payment system (ORCA reader before boarding). Opens to Lynnwood & Federal Way. |
| **Link 2 Line** | Light rail | Walk-up, standard ORCA/Transit GO/cash day pass; no compulsory reservation | No | `in` | Flat $3 fare, same proof-of-payment as 1 Line. I-90 Crosslake Connection (opened 2026-03). |
| **T Line (Tacoma)** | Street-level light rail | Walk-up, standard ORCA/Transit GO/cash day pass; no compulsory reservation | No | `out-product` | Passes both walk-up tests, but operates in Tacoma as separate product. v1 scope = Seattle metro Link only. |
| **Seattle Streetcar (South Lake Union & First Hill lines)** | Light rail / streetcar | Walk-up, standard ORCA/Transit GO/cash day pass; no compulsory reservation | No | `out-product` | Passes both walk-up tests, but City of Seattle operates; separate GTFS feed (f-seattlestreetcar). v1 scope = Sound Transit Link only. |
| **Sounder (N & S commuter rail)** | Commuter rail | Proof of payment required (ORCA / ticket); no explicit walk-up boarding reservation documented | No | `out-mode` | Commuter rail, not metro/light rail. v1 is urban light rail only. |

**No other services call at Link 1/2 Line stations.** All in-scope services are documented above.

## H2 — System lines and feed alignment

| Surface | 1 Line / 2 Line coverage? | What it has |
|---------|---------------------------|-------------|
| Sound Transit published maps | Yes (colors: 1 Line green, 2 Line blue; 2026) | Two light rail lines, downtown shared tunnel, branching suburbs. T Line in Tacoma in legend only (separate product). Sounder shown but not in Link lines. Streetcar not shown (City of Seattle). |
| OneBusAway GTFS (consolidated) | Yes (route IDs per agency) | All regional services (Link, Sounder, T Line, ST Express bus, Community Transit, Pierce Transit, etc.). v1 must filter to Link agency only (stopId or route_type logic). |
| GTFS-RT feed | Trip updates + vehicle positions for 1 Line, 2 Line, T Line, ST Express bus only. Sounder RT not confirmed. Streetcar RT separate (City of Seattle). | Covers v1 lines + excluded modes. |
| Product v1 scope | Link 1 & 2 only. | Sounder, T Line, Streetcar, Metro bus, Community Transit, Pierce Transit out. |

**H2 note:** The 1 Line (opened 2009, continuously expanded) runs north-south (Lynnwood–SeaTac–Angle Lake, with southbound extension to Federal Way opened 2024). The 2 Line (opened 2026-03) crosses Lake Washington via I-90 floating bridge to Bellevue and Redmond. Both lines share a 4-station downtown Seattle tunnel (Westlake, Symphony, Pioneer Square, International District/Chinatown), then branch. Westlake is the central transfer node. GTFS feed includes all regional agencies; adapter filtering is essential — do not leak T Line, Sounder, Community Transit, Pierce Transit, or Metro bus onto Link boards.

## License

- **License name:** Sound Transit Open Transit Data Limited, Revocable License.
- **Redistribution / rehosting:** Limited, non-exclusive, revocable license to use, reproduce, and display the Data. Recipients must receive the same terms (pass-through, not modified data). Transit Agencies retain all title and ownership. Usage metrics on request.
- **Commercial use:** Allowed, subject to restrictions: no malicious intent, no use of transit agency trademarks in app/business names, identify data source as "provided by Sound Transit" (or whichever agencies contribute, if multi-agency data).
- **Attribution:** Identify data source as "provided by Sound Transit" or per contributor agency list. No trademark claim.
- **Terms URL:** https://www.soundtransit.org/help-contacts/business-information/open-transit-data-otd/transit-data-terms-use (entry point: https://www.soundtransit.org/help-contacts/business-information/open-transit-data-otd)
- **Confidence:** `clear` on redistribution (terms explicitly allow with pass-through), `clear` on commercial use (allowed but with trademark restrictions), `clear` on attribution (naming only, no logo requirement stated).
- **Keyed feeds:** GTFS-RT endpoints require API key issued by Sound Transit (email oba_api_key@soundtransit.org); key terms governed by same Data Terms of Use (no separate API-specific license).

## What I did not do

No system map hand-transcription in this report (D1 scope); no stopIds in this report; no live city flip; no GitHub edits; no adapter wiring; no GTFS-derived station arrays; no API key storage or testing; no merge of Seattle into other cities (Washington D.C., Chicago, BART, etc.); no Sounder or streetcar as primary v1 data; no product invention of city codes.

## Station roster (D1 transcription, 6 Sep 2026)

**Link 1 Line — Lynnwood City Center to Federal Way Downtown**

Terminus north to terminus south (27 stations):

1. Lynnwood City Center (terminus; northern terminus)
2. Mountlake Terrace
3. Shoreline North/185th
4. Shoreline South/148th
5. Pinehurst (scheduled to open 30 Sep 2026)
6. Northgate
7. Roosevelt
8. U District
9. University of Washington
10. Capitol Hill
11. Westlake (downtown transit tunnel, shared with 2 Line, interchange)
12. Symphony (downtown transit tunnel, shared with 2 Line)
13. Pioneer Square (downtown transit tunnel, shared with 2 Line)
14. International District/Chinatown (downtown transit tunnel, shared with 2 Line)
15. Stadium
16. SODO
17. Beacon Hill
18. Mount Baker
19. Columbia City
20. Othello
21. Rainier Beach
22. Tukwila International Boulevard
23. SeaTac/Airport
24. Angle Lake
25. Kent Des Moines
26. Star Lake
27. Federal Way Downtown (terminus; southern terminus)

Source: [Wikipedia: 1 Line (Sound Transit)](https://en.wikipedia.org/wiki/1_Line_(Sound_Transit))

**Link 2 Line — Lynnwood City Center to Downtown Redmond**

Terminus west to terminus east (26 stations; shares 14 stations with 1 Line through International District/Chinatown):

Shared segment (westbound to downtown):
1. Lynnwood City Center (terminus; western terminus; shared with 1 Line)
2. Mountlake Terrace (shared with 1 Line)
3. Shoreline North/185th (shared with 1 Line)
4. Shoreline South/148th (shared with 1 Line)
5. Pinehurst (shared with 1 Line; scheduled to open 30 Sep 2026)
6. Northgate (shared with 1 Line)
7. Roosevelt (shared with 1 Line)
8. U District (shared with 1 Line)
9. University of Washington (shared with 1 Line)
10. Capitol Hill (shared with 1 Line)
11. Westlake (downtown transit tunnel, shared with 1 Line, interchange)
12. Symphony (downtown transit tunnel, shared with 1 Line)
13. Pioneer Square (downtown transit tunnel, shared with 1 Line)
14. International District/Chinatown (downtown transit tunnel, shared with 1 Line)

Exclusive eastbound segment (branch from downtown to Redmond):
15. Judkins Park
16. Mercer Island (interchange, spans Lake Washington)
17. South Bellevue
18. East Main
19. Bellevue Downtown
20. Wilburton
21. Spring District
22. BelRed
23. Overlake Village
24. Redmond Technology
25. Marymoor Village
26. Downtown Redmond (terminus; eastern terminus)

Source: [Wikipedia: 2 Line (Sound Transit)](https://en.wikipedia.org/wiki/2_Line_(Sound_Transit))

**Downtown Seattle transit tunnel (shared by both lines):**
Westlake, Symphony, Pioneer Square, International District/Chinatown (4 stations; both lines run all four).

**Interchange stations:**
Westlake (1 Line ↔ 2 Line transfer within downtown tunnel), Mercer Island (2 Line only; serves Lake Washington crossing).

**Total unique station count:** 39 stations
- Line 1 exclusive: 13 stations (Stadium through Federal Way Downtown)
- Line 2 exclusive: 12 stations (Judkins Park through Downtown Redmond)
- Shared (both lines): 14 stations (Lynnwood through International District/Chinatown, including 4 in downtown tunnel)
