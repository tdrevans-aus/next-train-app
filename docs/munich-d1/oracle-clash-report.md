# Munich oracle clash report

D1 (published, as of 29 Aug 2026): [Pläne und Fahrplanauskunft](https://www.mvg.de/verbindungen/fahrplaene-netzplaene.html) **Netz- und Tarifplan Zone M** [2026_layout_SURTX_M.pdf](https://www.mvg.de/dam/jcr:e9fbaf6f-4ec1-40de-8488-a75787ddbf50/2026_layout_SURTX_M.pdf) (© MVV GmbH | Januar 2026, created 13 Nov 2025) plus [MVV Linienverzeichnis 2026](https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/fahrplanmedien/MVV-2026_Neuerungen_Gesamt.pdf) and current U1/U2/U4/U5/U7/U8 [Minifahrplan 2026](https://www.mvv-muenchen.de/netz-plaene-medien/fahrplanmedien/) PDFs + U3/U6 [Aushangfahrplan](https://www.mvg.de/aushangfahrplan/U3_H_MO_52.pdf) stacks (gültig ab 14.12.2025). Stations arrays **hand-transcribed**. **Not generated from GTFS.** Not generated from the MVG website API. Not generated from Wikipedia.

Current ordered-stop pages (official 2026 halt lists as linked 29 Aug 2026):

- U1: [21-U1-s26-1-MFP_M.pdf](https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/fahrplanmedien/2026/21-U1-s26-1-MFP_M.pdf) — **U1 Olympia-Einkaufszentrum – Mangfallplatz.** 15 stops.
- U2: [21-U2-s26-1-MFP_M.pdf](https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/fahrplanmedien/2026/21-U2-s26-1-MFP_M.pdf) — **U2 Feldmoching – Messestadt Ost.** 27. Prints **Giesing Bahnhof** and **Karl-Preis-Platz**.
- U3: [U3_H_MO_52.pdf](https://www.mvg.de/aushangfahrplan/U3_H_MO_52.pdf) — **U3 Moosach → Fürstenried West.** 25. No 2026 Minifahrplan PDF on the Fahrplanmedien index. ★ some trains terminate at Sendlinger Tor.
- U4: [21-U4-s26-1-MFP_M.pdf](https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/fahrplanmedien/2026/21-U4-s26-1-MFP_M.pdf) — **U4 Westendstraße – Arabellapark.** 13. Folder title puts Theresienwiese in parentheses; full official ends stay Westendstraße / Arabellapark.
- U5: [21-U5-s26-1-MFP_M.pdf](https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/fahrplanmedien/2026/21-U5-s26-1-MFP_M.pdf) — **U5 Laimer Platz – Neuperlach Süd.** 18. Does **not** call Karl-Preis-Platz. West end is Laimer Platz, not Pasing.
- U6: [U6_H_GF_52.pdf](https://www.mvg.de/aushangfahrplan/U6_H_GF_52.pdf) — **U6 Garching-Forschungszentrum → Klinikum Großhadern.** 26. Aushang header **Garching, Forschungsz.** Locked D1 string is Linienverzeichnis / 2026 map **Garching-Forschungszentrum**. South end is Klinikum Großhadern, not Martinsried.
- U7: [21-U7-U8-s26-1-MFP_M.pdf](https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/fahrplanmedien/2026/21-U7-U8-s26-1-MFP_M.pdf) — **U7 Olympia-Einkaufszentrum – Neuperlach Zentrum.** 19. Weekday Zusatzlinie.
- U8: same PDF — **U8 Olympiazentrum – Neuperlach Zentrum.** 19. Saturday Zusatzlinie.

Hub lock: **Marienplatz** (2026 SUR Zone M Altstadt S+U node; official Linienverzeichnis via-node for U3/U6). Odeonsplatz is the U-Bahn-only 4-line inner cross (U3/U4/U5/U6) — shared approach, not the lock. Hauptbahnhof is the six-line + S + DB cluster — separate string.

H2 clash surface (after transcription): **no** product `lib/cities/munich/`. Clash is **map-vs-halt-list** (Giesing vs Giesing Bahnhof; Garching-Forschungszentrum hyphen vs comma/abbreviation; Hauptbahnhof vs Hauptbahnhof (U, Tram); Ostbahnhof vs München, Ostbahnhof) plus **U vs S-Bahn name family** at every S+U tick. Not GTFS. S-Bahn / tram / bus / DB out of v1 oracle.

## Station name table

Match rule: published D1 string (official 2026 folder / Linienverzeichnis passenger name) vs official map tick vs S-Bahn / DB / website-API print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Marienplatz | 2026 SUR **Marienplatz**; Linienverzeichnis U3/U6 via-node | **match (lock)**. Do not use City / Mitte / Munich / Altstadt. Same building as S-Bahn Stammstrecke — doNotGroup U vs S. Only U3/U6 call it. |
| Odeonsplatz | 2026 map **Odeonsplatz**; U3/U4/U5/U6 | **match (U-Bahn-only 4-line inner cross)**. Shared approach, not the lock. No S-Bahn. |
| Hauptbahnhof | folders **Hauptbahnhof**; API **Hauptbahnhof (U, Tram)**; DB **München Hbf** | **match U-Bahn folder**. doNotGroup U vs S vs DB. Not the lock. Six U-Bahn lines (misses U3/U6). |
| Sendlinger Tor | folders + map **Sendlinger Tor**; U1/U2/U3/U6/U7/U8 | match. Six U-Bahn lines (misses U4/U5). Shared approach. |
| Karlsplatz (Stachus) | U4/U5 folders **Karlsplatz (Stachus)** | match. Keep parenthetical. doNotGroup U vs S Stachus. |
| Garching-Forschungszentrum | Linienverzeichnis + 2026 map **Garching-Forschungszentrum**; aushang header **Garching, Forschungsz.**; API **Garching, Forschungszentrum** | **rename (hyphen vs comma / abbreviation)**. Locked to Linienverzeichnis / map. |
| Giesing Bahnhof | U2/U7/U8 folders **Giesing Bahnhof**; map/API **Giesing** | **rename (Bahnhof suffix)**. Locked to halt list. doNotGroup U vs S3/S5 Giesing. |
| Ostbahnhof | U5 folder **Ostbahnhof**; API **München, Ostbahnhof** | **rename (city prefix)**. Locked to folder. doNotGroup U vs S vs DB München Ost. |
| Thalkirchen (Tierpark) | U3 aushang + 2026 map | match. Do not emit Thalkirchen alone. |
| Laimer Platz | U5 folder west end; 2026 map | **match passenger end**. Pasing / Baumschule Laim are unopened — coverage gap, not D1 rows. |
| Klinikum Großhadern | U6 aushang + Linienverzeichnis south end | **match passenger end**. Martinsried unopened. |
| Arabellapark | U4 folder; tram map sometimes **Arabellapark (Klinikum Bogenhausen)** | match U-Bahn folder short form. |
| All other D1 names in published-network.json | same 2026 folder / aushang / map tick | match |

**96** unique D1 names. Product `lib/cities/munich/` absent. `assertCityLive("munich")` is Unknown city.

## H2 — who has line codes today

| surface | U1–U8? | what it actually has |
| --- | --- | --- |
| MVG 2026 SUR Zone M (D1) | **yes** | U1–U8 drawn. Mixed S+U+tram+Regional sheet. U5 to Laimer Platz. U6 to Klinikum Großhadern. No U9. |
| Current U1–U8 halt lists (D1) | **yes** | Official termini pairs and ordered ticks. U7 weekday Zusatzlinie. U8 Saturday Zusatzlinie. |
| MVV Linienverzeichnis 2026 (D1) | **yes** | Eight U-Bahn path titles. Marienplatz via-node on U3/U6. |
| Product `lib/cities/munich/` | **absent** | No munich stations.json / line-map.json. `assertCityLive("munich")` is Unknown city |
| mvg.de `/api/bgw-pt/v3/lines` | yes (website) | Exactly eight `transportType: UBAHN` (U1–U8, network SWM). Not a D1 generator. Mixes Nürnberg U-Bahn on `/stations`. |
| MVV GTFS static | not used as D1 | GTFS-MVV-Gesamt 07/2026 on the developer page. Not this H2 stop-order surface. No GTFS-RT on that page. |
| MVV TRIAS | closed beta | Official next-train path after `trias@mvv-muenchen.de`. Not D1. |

H2 conclusion: passenger codes on the map and line pages already agree (**U1–U8**). Clash is **folder vs API abbreviation / U vs S at S+U ticks / unopened Pasing and Martinsried**, and **no product munich file**. Do not generate published-network.json from GTFS. Do not merge S-Bahn or Nürnberg into this city.

## C2/C3 to put in front of Jim

1. **city=munich**, agency **MVG / SWM**, not `germany`, not `mvv`, not merged into an S-Bahn city. London TfL / Amsterdam / Rotterdam / Sweden / Berlin untouched.
2. **Marienplatz** is the locked inner-city U-Bahn hub (U3/U6). Not Hauptbahnhof, not Odeonsplatz, not City. **Odeonsplatz** is the U-Bahn-only 4-line node (U3/U4/U5/U6) — shared approach.
3. **doNotGroup Marienplatz U vs S.** Same printed name family, two modes on the 2026 SUR sheet.
4. **doNotGroup Hauptbahnhof U vs S vs DB München Hbf.** Six U-Bahn lines; still not the lock.
5. **U5 passenger termini are Laimer Platz / Neuperlach Süd.** Pasing is unopened. Chip is not `U5 + Pasing`.
6. **U6 passenger termini are Garching-Forschungszentrum / Klinikum Großhadern.** Martinsried is unopened. Chip is not `U6 + Martinsried`.
7. **Garching-Forschungszentrum** not `Garching, Forschungszentrum`. **Giesing Bahnhof** not `Giesing`. **No U9.** No S-Bahn, tram, bus, DB.
8. **Europe/Berlin HAS DST.** Official live path is MVV TRIAS (closed beta, `trias@mvv-muenchen.de`). Website `bgw-pt/v3/departures` is unpublished. D1 stays planned.
9. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin.
