# Canberra hazard pack (H1–H7)

Evidence: CMET R1 Route Map Gungahlin–City and TC interchange/network maps retrieved 2026-08-27 (region maps effective 20 July 2026); Built for CBR Woden page; public static GTFS bus-only calendar ended 2025-07-04; `lightrail.pb` live 27 Aug 2026.

## H1 — parent + child

Public no-key `stops.txt` has **zero** `location_type=1` parents and **zero** light-rail rows (2439 bus `location_type=0`). LR passengers print map names (Gungahlin Place, Alinga Street); bus rows at the same places are platform-coded.

doNotGroup: **Alinga Street** (LR lock) vs bus **City West Alinga St**; **Gungahlin Place** LR vs **Gungahlin Place Plt 3/4**; **Dickson Interchange** LR vs **Dickson Interchange Plt 1/2** vs **Northbourne Av opp Dickson Interchange**; **Woden Temporary Interchange** bus vs future LR to Woden (not open).

## H3 — thin / event / overlay

- **Stage 2A / 2B overlay**: not passenger-open. Construction, not a current stop list.
- **Partial/out-of-service trips**: CMET FAQ (not D1): some vehicles do not run the whole Gungahlin–City route; shown on the front of the vehicle / PIDs. Not a nested passenger code.
- **Rapid bus R2–R10** at City / Dickson / Gungahlin interchanges: bus overlay, out of v1.
- **School services** on interchange maps: out of v1.
- **Murrays / Greyhound / NSW TrainLink coaches** at City Interchange: out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Alinga Street | R1 only (until Stage 2A). Bus Rapids leave in other directions | City Interchange 20 Jul 2026: R1 to Dickson & Gungahlin only |
| Dickson Interchange | R1 through-stop (not a branch). Bus R9/30/31 | Dickson Interchange map |
| Gungahlin Place | R1 terminus. Bus R8 + locals | Gungahlin Interchange: R1 to City |

No city loop. No through-run at Alinga Street today. Stage 2A will make Alinga Street a through stop — that is a **future** H4, not D1.

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. One passenger code **R1**. Partial depot trips are operational, not a D1 row.

## H6 — inner city (where §3 lives)

Locked set: **Alinga Street**. Shared inner-north approach Elouera Street, Ipima Street, Macarthur Avenue, Dickson Interchange.

This is a **hub**, not a through-run, until Stage 2A opens. After that, Alinga Street becomes a through station toward Commonwealth Park / Woden — §3 must not freeze inbound/outbound vs Civic.

## H7 — DST

**Australia/Sydney observes DST (AEDT/AEST).** Canberra follows Sydney, not Brisbane. Do not copy Gold Coast / Brisbane H7. Agency timezone on the public (bus) GTFS is `Australia/Sydney`.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Civic vs Alinga Street | Page-card / precinct vs stop lock |
| City vs Alinga Street | Gungahlin Interchange direction vs stop |
| City Interchange vs Alinga Street | Facility title vs stop |
| Alinga St vs Alinga Street | Street label vs R1 map bubble |
| Alinga Street, City vs Alinga Street | CMET list suffix vs map lock |
| City West Alinga St vs Alinga Street | Bus vs LR |
| Gungahlin Place Plt 3/4 vs Gungahlin Place | Bus platforms vs LR |
| Dickson Interchange Plt vs Dickson Interchange | Bus vs LR |
| EPIC & vs EPIC and Racecourse | HTML vs map |
| Woden Temporary Interchange vs future Woden LR | Bus now; LR not open |
| R1 vs Rapid R2–R10 | Light rail vs bus |

## What I did not do

No generator, no assertion tables, no live city flip.
