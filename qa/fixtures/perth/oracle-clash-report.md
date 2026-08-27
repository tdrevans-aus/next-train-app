# Perth oracle clash report

D1 (published): [Transperth System Map — Updated October 2025](https://www.transperth.wa.gov.au/Portals/0/SYSTEM%20MAP%20OCTOBER%202025.pdf) linked from [System Map](https://www.transperth.wa.gov.au/journey-planner/network-maps) as “Transperth System Map - Updated October 2025”. Same bytes as [Byford Rail Extension System Map October 2025](https://www.transperth.wa.gov.au/Portals/0/Asset/Documents/Using%20Transperth/System%20Maps/Byford%20Rail%20Extension%20System%20Map%20October%202025.pdf) (the thumbnail on the same page). Retrieved `2026-08-27T00:59:22Z`.

Line timetable covers (ordered stops + footnotes): [Airport Line 13/10/2025](https://www.transperth.wa.gov.au/timetablepdfs/Airport%20Line%2020251013.pdf), [Armadale Line 13/10/2025](https://www.transperth.wa.gov.au/timetablepdfs/Armadale%20Line%2020251013.pdf), [Ellenbrook Line 13/10/2025](https://www.transperth.wa.gov.au/timetablepdfs/Ellenbrook%20Line%2020251013.pdf), [Fremantle Line 01/02/2026](https://www.transperth.wa.gov.au/timetablepdfs/Fremantle%20Line%2020260201.pdf), [Mandurah Line 30/11/2025](https://www.transperth.wa.gov.au/timetablepdfs/Mandurah%20Line%2020251130.pdf), [Midland Line 13/10/2025](https://www.transperth.wa.gov.au/timetablepdfs/Midland%20Line%2020251013.pdf), [Thornlie-Cockburn Line 13/10/2025](https://www.transperth.wa.gov.au/timetablepdfs/Thornlie-Cockburn%20Line%2020251013.pdf), [Yanchep Line 30/11/2025](https://www.transperth.wa.gov.au/timetablepdfs/Yanchep%20Line%2020251130.pdf). Retrieved `2026-08-27T01:00:05Z`.

Train index: [Timetables : All Train Services](https://www.transperth.wa.gov.au/timetables/results?train=) prints the same eight line names plus composites Perth to Bayswater / Cannington / Claremont.

Stations index (suffix only): [Stations & Maps](https://www.transperth.wa.gov.au/Using-Transperth/Station-Facilities/Stations-Maps) prints `{Name} Station`.

H2 names only — not D1: existing live product `lib/cities/perth/line-map.json` (manual audit 2026-08-25 from `public/stations.json` + line topology). Stations use LiveTimes `* Stn`. Feed is Transperth LiveTimes XML, not GTFS. No `stopIds` written into the published fixture. This file was not generated from line-map or GTFS.

Bus / ferry / CAT are on the same map. Out of v1 oracle.

## Station name table

Match rule: D1 printed string (map + timetable cover; bare name) vs line-map / LiveTimes `* Stn` vs Stations & Maps `* Station`. `rename` = same place, different printed string. `missing-in-line-map` = official rail station not in the current live line-map. `extra-in-line-map` = live line-map lists a stop the official line cover does not.

| published (D1 map / cover) | LiveTimes / line-map | Stations & Maps | class |
| --- | --- | --- | --- |
| Perth | Perth Stn | Perth Station | match (lock). Do not use City / Perth CBD / Perth Central. Do not collapse with Perth Underground. |
| Perth Underground | Perth Underground Stn | Perth Underground Station | match (lock). Map prints Perth + Underground stacked as its own station. |
| Elizabeth Quay | Elizabeth Quay Stn | Elizabeth Quay Station | match (lock). Yanchep + Mandurah only. Ferry jetty / bus station are other-mode. |
| Perth Stadium | Perth Stadium Stn | Perth Stadium Station | match. Map: dashed Special Events Station. On Armadale + TCL covers as a listed stop. |
| Showgrounds | Showgrounds Stn (on Fremantle + Airport line-map rows; **omitted** from LiveTimes Fremantle station filter) | Showgrounds Station | match on covers + map (dashed Special Events). LiveTimes Fremantle filter clash. |
| Airport Central | Airport Central Stn | Airport Central Station | match. Map prints T1 T2 icons. Not a station named Perth Airport. |
| Redcliffe | Redcliffe Stn | Redcliffe Station | match. Map prints T3 T4 icons. |
| High Wycombe | High Wycombe Stn | High Wycombe Station | match. Airport Line outer terminus. |
| Ellenbrook | Ellenbrook Stn | Ellenbrook Station | match. Ellenbrook Line outer terminus. |
| Byford | Byford Stn | Byford Station | match. Armadale Line outer terminus; map shows it open. |
| Cockburn Central | Cockburn Central Stn | Cockburn Central Station | match. TCL official outer terminus. Mandurah continues south. |
| City West | **missing-in-line-map** | City West Station | missing-in-line-map. On Fremantle + Airport covers and the map. |
| West Leederville | **missing-in-line-map** | West Leederville Station | missing-in-line-map. On Fremantle + Airport covers and the map. |
| Cottesloe | **missing-in-line-map** (line-map coverageGaps guessed “Mosman Park / Grant Street corridor”) | Cottesloe Station | missing-in-line-map. On Fremantle cover + map. |
| East Guildford | **missing-in-line-map** | East Guildford Station | missing-in-line-map. On Midland cover + map, between Guildford and Woodbridge. |
| Alkimos | **missing-in-line-map** (line-map coverageGaps: “Alkimos / Eglinton not in stations.json yet”) | Alkimos Station | missing-in-line-map. On Yanchep cover + map, between Butler and Eglinton. |
| Eglinton | **missing-in-line-map** (same coverageGaps note) | Eglinton Station | missing-in-line-map. On Yanchep cover + map, between Alkimos and Yanchep. |
| Perth (surface) on Yanchep / Mandurah | Perth Stn listed on both Yanchep and Mandurah line-map rows | Perth Station | extra-in-line-map. Official Yanchep cover is Elizabeth Quay–Perth Underground–…–Yanchep. Official Mandurah cover is Perth Underground–Elizabeth Quay–…–Mandurah. |
| Perth Underground on Fremantle / Midland / Airport / Ellenbrook / Armadale / TCL | Perth Underground Stn listed on those line-map rows | Perth Underground Station | extra-in-line-map on the **surface** lines. Official covers for those six lines list Perth (surface), not Perth Underground. |
| Kenwick on Thornlie-Cockburn | Kenwick Stn listed on the product TCL row (between Thornlie and Beckenham) | Kenwick Station | extra-in-line-map **on TCL**. Official TCL cover is Beckenham → Thornlie → Nicholson Road (no Kenwick). Kenwick remains an Armadale Line stop. |
| Mandurah…Aubin Grove on TCL | Mandurah Stn … Aubin Grove Stn listed on the product TCL row | those Station names | extra-in-line-map **on TCL**. Official TCL cover ends at Cockburn Central. Those stops belong to Mandurah Line. |
| All other D1 stations in published-network.json | `{Name} Stn` | `{Name} Station` | match |

## H2 — who has line names today

| surface | eight line names? | what it actually has |
| --- | --- | --- |
| Oct 2025 system map (D1) | **yes** | Legend: Airport, Fremantle, Yanchep, Mandurah, Armadale, Midland, Thornlie-Cockburn, Ellenbrook. No T-numbers. No hex in extracted text. |
| Train timetable index + PDF covers | **yes** | Same eight. Composites: Perth to Bayswater (Airport / Ellenbrook / Midland); Perth to Cannington (Armadale / TCL); Perth to Claremont (Airport / Fremantle). |
| LiveTimes line filter + home “Live Train Status” | **yes** | Airport, Armadale, Ellenbrook, Fremantle, Mandurah, Midland, Thornlie-Cockburn, Yanchep. Station dropdowns use `* Stn`. |
| line-map.json (live product) | **yes, with two name clashes** | Yanchep Line, Mandurah Line, Fremantle Line, Midland Line, Airport Line, Ellenbrook Line, **Armadale / Byford Line** (official: Armadale Line), **Thornlie–Cockburn Line** (en-dash; official map: Thornlie-Cockburn). |
| GTFS | not used | Live Perth product is LiveTimes XML, not GTFS. Do not generate published-network.json from `routes.txt`. |

H2 conclusion: passenger line names already agree at eight lines. Clash is **inner-city three-name lock**, **missing stations in line-map**, **Perth vs Perth Underground attached to the wrong lines**, **Airport through-run booklet split vs map colour**, **TCL terminus Mandurah vs Cockburn Central**, **Armadale Line vs Armadale / Byford Line**.

## C2/C3 to put in front of Jim

1. **Perth / Perth Underground / Elizabeth Quay** are three locked strings. Map prints all three. Do not collapse. Current product clusters Perth Underground Stn + Perth Stn as one fetch (existing sweep note) and also **lists Perth Stn on Yanchep/Mandurah and Perth Underground Stn on the surface lines**.
2. **Byford is open** on the Oct 2025 map and the Armadale 13/10/2025 cover. Official line name remains **Armadale Line** (not Armadale / Byford Line). Terminus is Byford. No printed Armadale-short-of-Byford footnote on that booklet.
3. **Ellenbrook is a printed eighth line**, branching at Bayswater. doNotGroup Ellenbrook vs High Wycombe.
4. **Airport–Fremantle through-running is on the map** (Airport colour the full Fremantle corridor) and in the Fremantle booklet **T** footnote (continuation of an Airport Line service). Airport booklet itself only covers High Wycombe–Claremont. LiveTimes Airport Line station filter stops at Claremont Stn; Fremantle Line filter holds Swanbourne–Fremantle. Product Airport row already through-runs to Fremantle Stn but is missing City West / West Leederville / Cottesloe.
5. **Thornlie-Cockburn official outer terminus is Cockburn Central**, not Mandurah. Product TCL row currently lists Mandurah…Aubin Grove as if TCL were the Mandurah Line, and still lists **Kenwick** between Thornlie and Beckenham (not on the official TCL cover).
6. **Missing in line-map vs D1:** Alkimos, Eglinton, City West, West Leederville, Cottesloe, East Guildford.
7. **Yanchep official shorts** are Clarkson (K) and Whitfords (W). Product `shortTurnGroups.Yanchep` also includes **Butler**, which is not a printed terminate code on the 30/11/2025 booklet.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no LiveTimes client edit, no live city flip (perth stays live), no PR, no writes under the next-train-app checkout.
