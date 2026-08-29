# Stockholm hazard pack (H1–H7)

Evidence: SL Spårtrafikkarta PNG `SL_Spartrafikkarta_250414.png` (retrieved 2026-08-24), SL Transport lines/sites/departures (no key), public ResRobot GTFS Sweden 2026-08-23 (H2 names only). Trafiklab GTFS Sweden 403 without key.

## H1 — parent + child

SL Transport concepts: **Site** groups **StopAreas** (and StopPoints). The public `/sites` list already **over-groups** the inner city: requesting departures for `T-Centralen` (9001) or `Stockholm City` (1080) returns **metro + pendeltåg + bus + Spårväg City** mixed together. That is not permission to treat them as one Next Train stop.

doNotGroup:

- T-Centralen (metro) vs Stockholm City (pendeltåg Citybanan) vs Stockholms central (SJ/fjärrtåg, site 9000)
- T-Centralen Spårväg City vs T-Centralen metro (map prints T-Centralen on line 7)
- Odenplan metro (9117) vs Stockholm Odenplan pendeltåg (1079)
- Arlanda central (pendeltåg 40, SL ticket + Arlanda tillägg) vs Arlanda Express (Arlanda Norra/Södra) vs airport bus terminals
- Farsta strand metro (green 18) vs Farsta strand pendeltåg (43) — interchange, two modes
- Sundbybergs centrum (blue 11) vs Sundbyberg (pendeltåg 43)
- Solna centrum (blue 10) vs Solna (pendeltåg 40/41)
- Gullmarsplan metro vs Tvärbanan
- GTFS `* T-bana` parent vs bus bays with the same suburb name

## H3 — thin / event / overlay

- **43X**: skip-stop Kallhäll–Nynäshamn (skips Trångsund, Skogås, Vega, Jordbro). Overlay on 43, not a D1 colour.
- **Line 18/19 Alvik shorts** and **Vällingby / Telefonplan / Tumba / Bro / Västerhaninge** nested shorts — live, not extra map rows.
- **48**: thin outer; does not enter the Citybanan.
- **42 / 44**: withdrawn from the passenger timetable 15 Dec 2024; still in `/lines`. Not D1.
- **Arenastaden / Hagastaden / Södra Hagalund**: green extension under construction (not in service on this map).
- Arlanda tillägg / UL+SL notes appear as `stop_deviations` on SL Transport — overlay fare, not a line.
- Royal events / sports extras: not on the network PNG; treat as overlay if they appear later.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Västra skogen | 10 Hjulsta (Solna centrum) vs 11 Akalla (Huvudsta) | Blue map fork |
| Liljeholmen | 13 Norsborg vs 14 Fruängen | Red south fork |
| Östermalmstorg | 13 Ropsten vs 14 Mörby centrum | Red north fork |
| Gullmarsplan | 17 Skarpnäck vs 18 Farsta strand vs 19 Hagsätra | Green south triple |
| Skärmarbrink | 17 Hammarbyhöjden vs 18 Blåsut | After Gullmarsplan |
| Alvik | green trunk vs Nockebybanan 12 / Tvärbanan 30–31 | Other mode on same PNG |
| Upplands Väsby | 40 Arlanda central–Uppsala C vs 41 Rosersberg–Märsta | Pendeltåg north fork |
| Älvsjö | 40/41 Tumba–Södertälje centrum vs 43 Farsta strand–Nynäshamn | Pendeltåg south fork |
| Stockholm Odenplan | 40/41 Solna north vs 43 Sundbyberg west | Pendeltåg |
| Södertälje hamn | 40/41 Södertälje centrum vs 48 Södertälje syd–Gnesta | 48 does not through-run City |

Metro **does** through-run the inner city (every T-line serves T-Centralen as a through station, not a suburban hub). Pendeltåg **does** through-run Citybanan (Stockholm City + Stockholm Odenplan) except **48**.

## H5 — nested short turns

| nest | parent | evidence |
| --- | --- | --- |
| Alvik / Vällingby / Åkeshov | Gröna linjen 18/19/17 | Map west end Hässelby strand; live blinds shorter |
| Telefonplan | Röda linjen 14 | Live dest vs Fruängen |
| Tumba | Pendeltåg 40/41 | Live dest vs Södertälje centrum |
| Upplands Väsby | 41 | Live dest vs Märsta |
| Bro | 43 | Live dest vs Bålsta |
| Västerhaninge | 43 | Live dest vs Nynäshamn |
| Kallhäll (43X) | 43 | Skip-stop product |
| Kungsträdgården | Blå 10/11 | Eastern terminus — not a short; the blue line does not through-run beyond here |

Do not label an Alvik-short as Hässelby strand.

## H6 — inner city (where §3 lives)

Locked set: **T-Centralen** (metro), **Stockholm City** (pendeltåg). Shared metro trunk: Gamla stan, Slussen, Hötorget, Östermalmstorg, Fridhemsplan. Pendeltåg spine: Stockholm Odenplan, Stockholms södra, Årstaberg. Nearby **not** the v1 lock: Stockholms central.

This is **through-running**, not an Adelaide hub. Labels at T-Centralen are the **far suburban terminus plus colour/number**. Inbound/outbound vs CBD is a poor fit (trains keep going).

## H7 — DST

**Europe/Stockholm observes DST (CEST/CET).** Do not copy Brisbane H7. Wall-clock in SL Transport is Stockholm local. Any Perth offset helper must include EU DST rules.

## Later modes (same official PNG — out of v1)

| product | numbers | map note |
| --- | --- | --- |
| Spårväg City | 7 | T-Centralen–Waldemarsudde on this map |
| Nockebybanan | 12 | Nockeby–Alvik |
| Lidingöbanan | 21 | Ropsten–Gåshaga brygga |
| Saltsjöbanan | 25, 26 | Slussen–Saltsjöbaden / Igelboda–Solsidan |
| Roslagsbanan | 27, 28, 29 | Stockholms östra–Kårsta / Österskär / Näsbypark |
| Tvärbanan | 30, 31 | Sickla–Solna station / Alviks strand–Bromma flygplats |

Not first-class Next Train v1 unless Tim later promotes them. They **are** on the same official rail map, so the hazard is accidental grouping, not “missing from the PDF”.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| T-Centralen vs Stockholm City vs Stockholms central | Three printed names, three sites |
| Odenplan vs Stockholm Odenplan | Two sites |
| T-Centralen metro vs Spårväg City | Same words, two modes |
| Farsta strand metro vs pendeltåg | Two modes |
| Solna centrum vs Solna | Metro vs pendeltåg |
| Sundbybergs centrum vs Sundbyberg | Metro vs pendeltåg |
| Arlanda central vs Arlanda Express | Fare/product split |
| 43 vs 43X | Skip-stop vs all-stops |
| 48 vs 40/41 at Södertälje | 48 never sees Stockholm City |
| Green 17/18/19 at Gullmarsplan | Three southern termini |
| Blue 10/11 at Västra skogen | Two northern termini |
| Roslagsbanan / Saltsjöbanan / Tvärbanan | Same PNG, later mode |
| Arenastaden construction | Not in service |

## What I did not do

No generator, no assertion tables, no live city flip.
