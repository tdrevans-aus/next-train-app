# Perth hazard pack (H1–H7)

Evidence: Transperth System Map October 2025, official train timetable PDFs retrieved 2026-08-27, Stations & Maps index, LiveTimes line filters (H2 names only). Modes v1: TRAIN. Perth stays live.

## H1 — parent + child

LiveTimes / Stations & Maps treat each passenger rail stop as one named station (`* Stn` / `* Station`). There is no public GTFS parent/child split in this pack.

doNotGroup: **Perth vs Perth Underground vs Elizabeth Quay** (three printed stations). The live sweep already clusters Perth Underground Stn plus Perth Stn as one *fetch* — that is a client optimisation, not a D1 name collapse.

doNotGroup: Elizabeth Quay Station (train) vs Elizabeth Quay Bus Station vs Elizabeth Quay Jetty (ferry). Same precinct, three modes. Ferry/CAT/bus out of v1.

doNotGroup: Perth Stadium Station vs Perth Stadium Bus Station. Map dashes Perth Stadium as Special Events Station; Armadale and TCL covers still list it.

## H3 — thin / event / overlay

- **Showgrounds**: map dashed Special Events Station, between Loch Street and Claremont. On Fremantle + Airport covers. LiveTimes Fremantle station filter omits Showgrounds Stn. Treat as event overlay sitting on a printed Fremantle/Airport stop, not a ninth line.
- **Perth Stadium**: map dashed Special Events Station. On Armadale + TCL covers as a normal listed stop (between Claisebrook and Burswood). Event extras (Optus Stadium pages) are overlay; the stop itself stays on those two D1 rows.
- **Airport P**: some Airport Line trips terminate / originate at Perth (surface), not Claremont / Fremantle.
- **Yanchep K/W, Mandurah W, Fremantle C**: printed short-workings (see H5), not separate lines.
- Nightly closures appear on the Transperth home live-status strip (Armadale/TCL, Yanchep, Midland, Mandurah on various days). Overlay, not D1 topology.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Bayswater | Midland (Ashfield–Midland) vs Airport (Redcliffe–High Wycombe) vs Ellenbrook (Morley–Ellenbrook) | Map junction; three official covers; product doNotGroup High Wycombe vs Ellenbrook already |
| Beckenham | Armadale (Kenwick–Byford) vs Thornlie-Cockburn (Thornlie–Cockburn Central) | Map; two covers; composite Perth–Cannington |
| Cockburn Central | Mandurah south (Aubin Grove–Mandurah) vs TCL west (Ranford Road–Thornlie–Perth) | Map; TCL cover ends here; Mandurah W short also ends here |
| Claremont | Fremantle west (Swanbourne–Fremantle) vs Airport east (Loch Street–High Wycombe) vs Fremantle C short | Map Airport colour + Fremantle T footnote + C short |
| Perth Underground / Elizabeth Quay | Yanchep north vs Mandurah south | Two covers; map olive vs orange; not a surface-Perth stop |

No inbound/outbound hub: Yanchep–Mandurah through the tunnel, Airport through-running toward Fremantle, TCL joining Mandurah only at Cockburn Central.

## H5 — nested short turns

| nest | parent | evidence |
| --- | --- | --- |
| Clarkson (K) | Yanchep | Yanchep 30/11/2025: K Terminates at / Departs from Clarkson Stn |
| Whitfords (W) | Yanchep | Same booklet: W Terminates at / Departs from Whitfords Stn |
| Cockburn Central (W) | Mandurah | Mandurah 30/11/2025: W Terminates at / Departs from Cockburn Central Stn |
| Claremont (C) | Fremantle | Fremantle 01/02/2026: C Terminates at / Departs from Claremont Stn |
| Perth (P) | Airport | Airport 13/10/2025: P Terminates at / Departs Perth Station |

Not printed on the D1 booklets (product has them; do not invent as official shorts): **Butler** as a Yanchep terminate; **Armadale** as a Byford-line terminate. Armadale Line 13/10/2025 is To Byford / To Perth with F = Fridays-only and P = Platform 6 at Perth Station — not an Armadale short.

Do not label a K trip as Yanchep. Do not label a TCL trip as Mandurah.

## H6 — inner city (where §3 lives)

Locked set: **Perth**, **Perth Underground**, **Elizabeth Quay**. Also printed on the inner diagram: McIver, Claisebrook, City West, West Leederville, Perth Stadium.

This is **not** a single Adelaide-style hub and **not** a Brisbane numbered spine:

- Surface east–west: Fremantle / Airport / Midland / Ellenbrook / Armadale / TCL use **Perth** (plus McIver / Claisebrook on the eastern lines).
- North–south tunnel: Yanchep / Mandurah use **Perth Underground** and **Elizabeth Quay**. They do not list Perth (surface) on the covers.
- Airport trains that through-run keep using Perth (surface) then City West westward; they do not become Yanchep/Mandurah trains.

A label that only says “inbound” is false at Perth Underground (the train is already on a through corridor, or about to be) and false at Bayswater (three legal next outer termini).

## H7 — no DST

**Australia/Perth does not observe daylight saving.** AWST year-round. Do not copy Adelaide H7. LiveTimes and timetable times are Perth wall-clock. A DST offset helper is wrong here.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Perth vs Perth Underground vs Elizabeth Quay | Three printed stations; different lines |
| Elizabeth Quay train vs jetty vs bus station | Three modes |
| High Wycombe vs Ellenbrook at Bayswater | Different branches |
| Byford vs Cockburn Central | Different lines (Armadale vs Mandurah / TCL) |
| Claremont vs High Wycombe as one west-side group | Airport through-run vs Fremantle C short vs Fremantle full |
| Thornlie-Cockburn vs Mandurah south of Cockburn Central | TCL official terminus is Cockburn Central |
| Armadale Line vs “Armadale / Byford Line” as a second line | One printed line; Byford is the outer terminus |
| Showgrounds as its own line | Special events station on Fremantle / Airport |
| Perth Stadium as its own line | Special events marking; still an Armadale / TCL stop |
| Alkimos / Eglinton as “not open yet” | Printed open on the Oct 2025 map and Yanchep 30/11/2025 cover |
| City West / West Leederville / Cottesloe / East Guildford as closed leftovers | All printed on 2025–2026 covers + map |
| Bus / CAT / ferry | Out of v1 |

## What I did not do

No generator, no assertion tables, no LiveTimes client edit, no live city flip.
