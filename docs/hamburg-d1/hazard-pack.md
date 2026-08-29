# Hamburg hazard pack (H1–H7)

Evidence: HVV U/S/A/R-Plan 01.06.2026; current U1–U4 Linienfahrplan PDFs gültig 14.12.2025–12.12.2026 retrieved 29 Aug 2026; Hochbahn U-Bahn-Streckennetz + U5 + U4 Horner Geest pages; hvv.de/de/ohlsdorf (U1 overlay); GTI Anwenderhandbuch 63.4; product `lib/cities/hamburg/` absent.

## H1 — parent + child

D1 has no stopIds. HVV USAR sheet and GTI changing-nodes collapse U-Bahn + S-Bahn + Regional under nearby printed names.

doNotGroup: **Jungfernstieg** (U1/U2/U4) vs **S Jungfernstieg** (S1/S2/S3); **Hauptbahnhof Süd** (U1/U3) vs **Hauptbahnhof Nord** (U2/U4) vs **S Hauptbahnhof** vs **DB Hamburg Hbf** vs ZOB; **Berliner Tor** U2/U3/U4 vs S Berliner Tor; **Landungsbrücken** U3 vs S; **Sternschanze (Messe)** U3 vs S Sternschanze; **Ohlsdorf** U1 vs S Ohlsdorf; **Barmbek** U3 vs S Barmbek; **Wandsbeker Chaussee** U1 vs S; **Elbbrücken** U4 vs S Elbbrücken; **Stephansplatz (Oper/CCH)** vs **Dammtor** (S/DB — different stop). **Jungfernstieg** is the U+S inner lock — U3 is absent there.

## H3 — thin / event / overlay

- **U5 not passenger-open.** Hochbahn: trial Sengelmannstraße–City Nord from 2027, passengers from 2029. Absent from the 01.06.2026 USAR sheet and the 2025/26 Linienfahrplan. Out of v1.
- **U4 Horner Geest / Stoltenstraße** unopened. Hochbahn: Fahrgäste Herbst / Ende 2027. Current U4 folder still **Elbbrücken – Billstedt**. Overlay / coverage gap. Not D1 rows.
- **U4 Grasbrook** (south of the Elbe) unopened. Out of v1.
- **U3 Fuhlsbüttler Straße** (between Habichtstraße and Barmbek) planning only. Out of v1.
- **U1 Ohlsdorf 2026** (as of 29 Aug 2026): full closure **Fuhlsbüttel Nord <> Lattenkamp** 13 Jul–14 Oct 2026 (SEV bus); 15–28 Oct Ohlsdorf skip-stop inbound. Official U1 folder still prints the full path. Overlay, not deleted D1 rows. Replacement bus out of v1.
- **S-Bahn / AKN / Regional / MetroBus / NachtBus / HADAG ferry** on the same official Pläne / Linienfahrplan index. Out of v1. Hamburg has **no tram**.
- USAR Einstieghilfen note: Jungfernstieg barrier-free works into **2027**. Overlay on access, not a deleted stop.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Jungfernstieg | U1 north–south vs U2/U4 east–west vs U4 south to Elbbrücken. Plus S. U3 absent | USAR; U1/U2/U4 folders; legend als über Jungfernstieg |
| Volksdorf | U1 Ohlstedt vs U1 Großhansdorf | U1 folder Y-fork |
| Hauptbahnhof Süd | U1 vs U3. Plus S / DB at the same cluster | U1/U3 folders; GTI Hbf. Süd |
| Hauptbahnhof Nord | U2 vs U4. Plus S / DB | U2/U4 folders; GTI Hbf. Nord |
| Berliner Tor | U2/U4 vs U3. Plus S | Folders |
| Schlump | U2 vs U3 | Folders |
| Kellinghusenstraße | U1 vs U3 | Folders |
| Horner Rennbahn | U2 to Mümmelmannsberg vs U4 to Billstedt (future U4 Horner Geest OUT) | Folders; Hochbahn Horner Geest page |
| Billstedt | U4 terminates vs U2 continues | U2/U4 folders |
| Barmbek | U3 ring through vs U3 spur to Wandsbek-Gartenstadt vs S | U3 folder lists Barmbek twice |
| Wandsbek-Gartenstadt | U3 terminates vs U1 through | Folders |
| Lübecker Straße | U1 vs U3 | Folders |

No city loop as a single passenger code — U3 is published as **Barmbek – Wandsbek-Gartenstadt** via the ring, not as “Circle”. Inbound/outbound vs City is false at **Jungfernstieg** (three U compass headings + S; U3 missing), **Hauptbahnhof Süd/Nord** (split stations, other modes), **Volksdorf** (two official eastern ends), and **Barmbek** (ring-then-spur).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Four passenger codes only: **U1–U4**. No U5.

U1 some trips start Ochsenzoll / short-turn Volksdorf; U2 some columns terminate Billstedt or Niendorf Markt; U4 some early/late trips stay Elbbrücken–Jungfernstieg. Overlays, not extra D1 rows. `shortTurns` arrays left empty.

Night extras (NachtBus, S-Bahn “als über Jungfernstieg”) are overlays, not extra D1 rows.

## H6 — inner city (where §3 lives)

Locked set: **Jungfernstieg**. Shared approaches: Hauptbahnhof Süd (U1/U3), Hauptbahnhof Nord (U2/U4), Berliner Tor (U2/U3/U4), Schlump (U2/U3), Rathaus (U3, next to the lock), Landungsbrücken (U3), Kellinghusenstraße (U1/U3).

Jungfernstieg is a **through-cross**, not a single-end hub. **U3 never calls it.** Inbound/outbound vs City is false here (U1/U2/U4 leave in several compass directions; S-Bahn is a different mode). Hauptbahnhof Süd / Nord are split U-Bahn stations — still not the all-lines lock. Berliner Tor is the eastern 3-line node — still not the printed inner lock.

## H7 — DST

**Europe/Berlin observes DST (CEST/CET).** Do not copy no-DST cities. Wall-clock is Berlin local. GTI handbook §1.6.5: minute offsets are real elapsed minutes across the spring jump.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| hamburg vs city=germany / hvv / sbahn / akn | Separate city; agency Hochbahn / HVV |
| hamburg vs berlin / munich / rotterdam / goteborg / amsterdam / london-tfl | Other packs; do not reopen |
| Jungfernstieg vs City / Mitte / Hamburg / Hauptbahnhof | Hub lock vs marketing / split Hbf |
| Jungfernstieg U vs S Jungfernstieg | USAR mixes U + S |
| Hauptbahnhof Süd vs Hauptbahnhof Nord vs S vs DB Hamburg Hbf | Two U-Bahn stations + other modes in one GTI node |
| Berliner Tor U vs S Berliner Tor | U vs S |
| Großhansd. vs Großhansdorf | Folder header truncation vs halt row |
| Gänsemarkt vs Gänsemarkt (Oper) | Parenthetical |
| St. Pauli vs St.Pauli | Folder has no space |
| Stephansplatz (Oper/CCH) vs Dammtor | Nearby S/DB, different stop |
| Baumwall (Elbphilharmonie) vs Elbphilharmonie | Halt-list long form |
| Wandsbek-Gartenstadt vs Wandsbek Markt | Two U1 stops |
| Niendorf Nord vs Niendorf Markt | Terminus vs intermediate |
| Billstedt vs Horner Geest | Passenger end vs unopened extension |
| U5 vs U1–U4 | Unopened |
| U4 Elbbrücken vs Grasbrook | Unopened south extension |
| Barmbek U vs S Barmbek | U vs S; U3 lists it twice |
| Ohlsdorf U vs S Ohlsdorf | U vs S; 2026 overlay |
| English USAR URL vs German 01.06.2026 PDF | Same bytes; one authority |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin / Munich.
