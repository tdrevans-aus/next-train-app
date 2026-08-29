# Munich hazard pack (H1–H7)

Evidence: MVG/MVV January 2026 SUR Zone M; MVV Linienverzeichnis 2026; current U1/U2/U4/U5/U7/U8 Minifahrplan 2026 PDFs and U3/U6 Aushangfahrplan stacks retrieved 29 Aug 2026; MVG Fahrplanwechsel 2026 page; MVV developer TRIAS page; product `lib/cities/munich/` absent.

## H1 — parent + child

D1 has no stopIds. Official SUR sheet and MVG halte pages collapse U-Bahn + S-Bahn + Regional + tram/bus under the same printed name.

doNotGroup: **Marienplatz** (U3/U6) vs **S Marienplatz** (S1–S8 Stammstrecke); **Hauptbahnhof** (U1/U2/U4/U5/U7/U8) vs S-Bahn Hauptbahnhof vs **DB München Hbf**; **Karlsplatz (Stachus)** U4/U5 vs S Stachus; **Ostbahnhof** U5 vs S / DB München Ost; **Giesing Bahnhof** U2/U7/U8 vs S3/S5 Giesing; **Trudering** U2 vs S4/S6; **Feldmoching** U2 vs S1; **Neuperlach Süd** U5 vs S5; **Heimeranplatz** U4/U5 vs S7/S20; **Moosach** U3 vs S1 / Regional; **Odeonsplatz** is U-Bahn-only — no S-Bahn child.

## H3 — thin / event / overlay

- **U7 weekday Zusatzlinie.** 2026 folder: *Samstag, Sonn- und Feiertag kein Betrieb*. Some weekday columns short-turn at Sendlinger Tor. Full printed path Olympia-Einkaufszentrum – Neuperlach Zentrum stays in D1; overlay is the days/hours, not a second line.
- **U8 Saturday Zusatzlinie.** Folder: *Betrieb nur am Samstag*. Some trips ● terminate at Scheidplatz. *Bei Großmessen* some trains leave at Innsbrucker Ring for **Messestadt Ost** instead of Neuperlach Zentrum. Overlay, not a second D1 line / not extra termini.
- **U4 Theresienwiese short-turn.** Folder title *(Westendstraße -) Theresienwiese … Arabellapark*. Many daytime trips start/end Theresienwiese; official ends remain Westendstraße / Arabellapark. `shortTurns`: Theresienwiese.
- **U6 short-turns** on the Aushang: Münchner Freiheit, Kieferngarten, Harras. Not nested codes.
- **U5-to-Pasing / U6-to-Martinsried** unopened. Coverage gaps. Map and 2026 folders do not insert them.
- **S-Bahn / Regional / tram / bus / Nachtnetz** on the same official Netzpläne index. Out of v1.
- **U9** unbuilt. Out of v1.
- **Nürnberg / Fürth U-Bahn** appears on the MVG website station catalog. Different city. Out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Marienplatz | U3 vs U6 through-cross. Plus S Stammstrecke | 2026 SUR; Linienverzeichnis U3/U6 via-node; U3/U6 aushang |
| Odeonsplatz | U3/U6 vs U4/U5. U-Bahn-only | Map; U3–U6 folders |
| Hauptbahnhof | U1/U2 vs U4/U5 vs U7/U8. Plus S + DB | Map; folders |
| Sendlinger Tor | U1/U2/U7/U8 vs U3/U6 | Map; folders |
| Scheidplatz | U2/U8 vs U3 | Map; U2/U3/U8 |
| Kolumbusplatz | U1 south to Mangfallplatz vs U2/U7/U8 to Giesing | U1/U2/U7 folders |
| Innsbrucker Ring | U2 to Messestadt Ost vs U5/U7/U8 to Neuperlach | U2/U5/U7/U8 folders |
| Max-Weber-Platz | U4 to Arabellapark vs U5 to Ostbahnhof | U4/U5 folders |
| Implerstraße | U3 to Fürstenried West vs U6 to Klinikum Großhadern | U3/U6 aushang |
| Westendstraße | U4 terminates vs U5 continues to Laimer Platz | U4/U5 folders |
| Olympia-Einkaufszentrum | U1/U7 vs U3 | U1/U3/U7 |
| Münchner Freiheit | U3 through vs U6 through / some U6 end | U3/U6 |

No city loop as a single passenger code. Inbound/outbound vs City is false at **Marienplatz** (U3/U6 through-cross + S), **Odeonsplatz** (four U compass headings), **Hauptbahnhof** (six U-Bahn lines + S + DB; U3/U6 never call it), and **Sendlinger Tor** (six U-Bahn lines; U4/U5 never call it).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Eight passenger codes only: **U1–U8**. No U9.

`shortTurns` arrays hold folder-printed operational shorts (U3/U7 Sendlinger Tor; U4 Theresienwiese; U6 Münchner Freiheit / Kieferngarten / Harras; U8 Scheidplatz). Trade-fair U8 to Messestadt Ost is an overlay, not a nested code.

Night extras (Nacht-U-Bahn / N-buses) are overlays, not extra D1 rows.

## H6 — inner city (where §3 lives)

Locked set: **Marienplatz**. Shared approaches: Odeonsplatz (U3–U6), Hauptbahnhof (U1/U2/U4/U5/U7/U8), Sendlinger Tor (U1/U2/U3/U6/U7/U8), Karlsplatz (Stachus) (U4/U5), Münchner Freiheit (U3/U6), Scheidplatz (U2/U3/U8), Innsbrucker Ring (U2/U5/U7/U8), Kolumbusplatz (U1/U2/U7/U8), Max-Weber-Platz (U4/U5), Implerstraße (U3/U6).

Marienplatz is a **through-cross** of Stammstrecke 1, not a single-end hub. U1, U2, U4, U5, U7, U8 **never call it**. Inbound/outbound vs City is false here (U3/U6 leave both ways; S-Bahn is a different mode). Hauptbahnhof is the six-line + S + DB cluster — still not the lock. Odeonsplatz is the U-Bahn-only 4-line node — still not the printed Altstadt lock.

## H7 — DST

**Europe/Berlin observes DST (CEST/CET).** Do not copy no-DST cities. Wall-clock is Berlin local.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| munich vs city=germany / mvv / sbahn | Separate city; agency MVG / SWM |
| munich vs berlin / rotterdam / goteborg / amsterdam / london-tfl | Other packs; do not reopen |
| Marienplatz vs City / Mitte / Munich / Altstadt | Hub lock vs marketing |
| Marienplatz U vs S Marienplatz | SUR sheet mixes two modes |
| Hauptbahnhof U vs S vs DB München Hbf | Six U-Bahn lines vs everything else in the same building |
| Odeonsplatz vs Marienplatz as “the” hub | 4 U-Bahn lines vs printed Altstadt lock — two nodes, one lock |
| Garching-Forschungszentrum vs Garching, Forschungszentrum | Folder/map hyphen vs API comma |
| Giesing Bahnhof vs Giesing | Halt-list suffix vs map/API |
| Ostbahnhof vs München, Ostbahnhof | Folder vs API city prefix |
| Laimer Platz vs Pasing | Passenger end vs unopened U5 west |
| Klinikum Großhadern vs Martinsried | Passenger end vs unopened U6 south |
| U9 vs U1–U8 | Unbuilt |
| Nürnberg / Fürth U-Bahn vs munich | Website catalog bleed; different city |
