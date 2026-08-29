# Berlin hazard pack (H1–H7)

Evidence: BVG S+U-Bahnnetz 30. März 2026 and Innenstadtausschnitt; current U1–U9 Linienverlauf PDFs and linienuebersicht halt lists retrieved 29 Aug 2026; BVG halte pages Alexanderplatz / Hauptbahnhof / Nollendorfplatz / Wittenbergplatz; Angebotsänderungen 14 Dec 2025 (Amo + Magdalenen); U6 folder closure banner; VBB API + GTFS-RT pages 29 Aug 2026; product `lib/cities/berlin/` absent.

## H1 — parent + child

D1 has no stopIds. BVG halte pages collapse U-Bahn + S-Bahn + Regional + tram/bus under the same printed `S+U` name.

doNotGroup: **Alexanderplatz** (U2/U5/U8) vs **S Alexanderplatz** (S3/S5/S7/S9) vs Regional at the BVG halte **S+U Alexanderplatz**; **Hauptbahnhof** (U5 only) vs S-Bahn Hauptbahnhof vs **DB Berlin Hbf** vs FEX BER; **Friedrichstr.** U6 vs S / Regional Friedrichstraße; **Zoologischer Garten** U2/U9 vs S / Regional Zoo; **Potsdamer Platz** U2 vs S / Regional; **Warschauer Str.** U1/U3 vs S Warschauer Straße; **Gesundbrunnen** U8 vs S / Ring / Regional; **Yorckstr.** U7 vs S Yorckstraße / Großgörschenstraße; **Wittenau** U8 vs S Wittenau; **Rathaus Spandau** U7 vs S Spandau / Regional; **Neukölln** U7 vs S Neukölln (not Rathaus Neukölln); **Hermannstr.** U8 terminus vs **Hermannplatz** U7/U8 (two places); **Nollendorfplatz** is U-Bahn-only — no S-Bahn child.

## H3 — thin / event / overlay

- **U6 north closed** since 7 Nov 2022: Otisstr., Holzhauser Str., Borsigwerke, Alt-Tegel. Official U6 folder (23 Aug 2026) still says *Bis ca. Ende 2026* and *nur … Kurt-Schumacher-Platz*. BVG press 30 Jul 2026: reopen target **16 Aug 2027**. Overlay / coverage gap. Map still draws the four ticks — **not D1 rows**. Replacement bus out of v1.
- **23 Aug 2025 halt rename**: Mohrenstraße → **Anton-Wilhelm-Amo-Str.** Overlay on old print, not a deleted stop. D1 locks the new BVG string.
- **14 Dec 2025 subtitle**: Magdalenenstraße → **Magdalenenstr. (Campus für Demokratie)**. Overlay. D1 locks the long form.
- **U5 / U55 merge** (already passenger-complete): no U55 on the 2026 index. West end Hönow–Hauptbahnhof is one line. Overlay for anyone still searching U55.
- **S-Bahn / Regional / FEX / tram / bus / ferry / Nachtnetz** on the same official Netzpläne index. Out of v1.
- **U10** unbuilt. Out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Alexanderplatz | U2 Kleinprofil vs U5 east–west vs U8 north–south. Plus S + Regional | Innenstadt map; U2/U5/U8 folders; BVG halte S+U Alexanderplatz |
| Nollendorfplatz | U1/U3 through vs U2 through vs U4 terminates. U-Bahn-only | U1–U4 folders; halte U Nollendorfplatz |
| Wittenbergplatz | U1 Uhlandstr. vs U3 Krumme Lanke vs U2 Zoo | Map; U1/U2/U3 columns |
| Warschauer Str. | Shared U1+U3 east terminus vs S | U1/U3 folders |
| Gleisdreieck | U1/U3 east–west vs U2 north–south | Map; folders |
| Stadtmitte | U2 vs U6 | Map; folders |
| Unter den Linden | U5 vs U6 | Map; folders |
| Hallesches Tor | U1/U3 vs U6 | Map; folders |
| Möckernbrücke | U1/U3 vs U7 | Map; folders |
| Kottbusser Tor | U1/U3 vs U8 | Map; folders |
| Hermannplatz | U7 vs U8 | Map; folders |
| Osloer Str. | U9 terminates vs U8 through | U8/U9 folders |
| Zoologischer Garten | U2 vs U9 vs S / Regional | Map; folders |
| Hauptbahnhof | U5 terminates vs S vs DB | U5 folder; halte S+U Hauptbahnhof |
| Leopoldplatz | U6 vs U9 | Folders |
| Fehrbelliner Platz | U3 vs U7 | Folders |
| Bayerischer Platz | U4 vs U7 | Folders |
| Bismarckstr. | U2 vs U7 | Folders |
| Berliner Str. | U7 vs U9 | Folders |
| Spichernstr. | U3 vs U9 | Folders |
| Kurfürstendamm | U1 vs U9 | Folders |

No city loop as a single passenger code. Inbound/outbound vs Mitte is false at **Alexanderplatz** (three U compass headings + S), **Nollendorfplatz** (U4 ends; U1/U2/U3 through), **Wittenbergplatz** (U1 vs U3 split), and **Hauptbahnhof** (U5 only; every other mode is not this city).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Nine passenger codes only: **U1–U9**. No U55. No U10.

U6 closed north is a construction overlay, not a nested short of Alt-Tegel. `shortTurns` arrays left empty.

Night extras (U-Bahn Fr/Sa etc.; N1–N9 night buses) are overlays, not extra D1 rows.

## H6 — inner city (where §3 lives)

Locked set: **Alexanderplatz**. Shared approaches: Nollendorfplatz (U1–U4), Wittenbergplatz (U1–U3), Hauptbahnhof (U5), Stadtmitte (U2/U6), Zoologischer Garten (U2/U9), Friedrichstr. (U6), Potsdamer Platz (U2), Gleisdreieck (U1/U2/U3).

Alexanderplatz is a **through-cross**, not a single-end hub. U1, U3, U4, U6, U7, U9 **never call it**. Inbound/outbound vs Mitte is false here (U2/U5/U8 leave in several compass directions; S-Bahn is a different mode). Hauptbahnhof is a U5 terminus — still not the all-lines lock. Nollendorfplatz is the U-Bahn-only 4-line node — still not the Innenstadt printed lock.

## H7 — DST

**Europe/Berlin observes DST (CEST/CET).** Do not copy Perth / Brisbane no-DST. Wall-clock is Berlin local.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| berlin vs city=germany / vbb / sbahn | Separate city; agency BVG |
| berlin vs rotterdam / goteborg / amsterdam / london-tfl | Other packs; do not reopen |
| Alexanderplatz vs Alex / Mitte / City / Berlin | Hub lock vs marketing |
| Alexanderplatz U vs S Alexanderplatz vs Regional | BVG halte mixes three modes |
| Hauptbahnhof U5 vs S Hauptbahnhof vs DB Berlin Hbf vs FEX | U-Bahn-only vs everything else in the same building |
| Nollendorfplatz vs Alexanderplatz as “the” hub | 4 U-Bahn lines vs printed Mitte lock — two nodes, one lock |
| Mohrenstraße vs Anton-Wilhelm-Amo-Str. | 23 Aug 2025 rename |
| Magdalenenstr. vs Magdalenenstr. (Campus für Demokratie) | 14 Dec 2025 subtitle |
| Alt-Tegel vs Kurt-Schumacher-Platz | Map geographic end vs 2026 passenger end |
| U55 vs U5 | Merged; no passenger U55 |
| U10 vs U1–U9 | Unbuilt |
| Warschauer Str. vs Warschauer Straße (S) | U vs S |
| Hermannstr. vs Hermannplatz | Two U8-family names |
| Neukölln vs Rathaus Neukölln | Two U7 stops |
| Friedrichstr. vs Friedrich-Wilhelm-Platz | U6 vs U9 |
| Yorckstr. vs S Yorckstraße / Großgörschenstraße | U vs S |
| Freie Universität (Thielplatz) vs Thielplatz | Halt-list long form |
| Olympia-Stadion vs Olympiastadion | Hyphen vs sightseeing spelling |
| Franz-Neumann-Platz vs (Am Schäfersee) | 2026 halt list dropped the subtitle |
| S-Bahn Berlin 15.06.2026 caption vs BVG 30 Mar 2026 PDF | Same bytes; one authority |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden.
