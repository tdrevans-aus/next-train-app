# Berlin oracle clash report

D1 (published, as of 29 Aug 2026): [Netzpläne & Liniennetz](https://www.bvg.de/de/verbindungen/netzplaene-und-linien) **S+U-Bahnnetz – Tarifbereich ABC** [S+U-Bahn_03_2026-Internetversion-BVG.pdf](https://www.bvg.de/dam/jcr:3f8025f2-285b-4fa0-8cef-72def24c6c21/S+U-Bahn_03_2026-Internetversion-BVG.pdf) (Stand **30. März 2026**, Last-Modified 19 Aug 2026) plus **S+U-Bahnnetz – Innenstadt** and current U1–U9 [Linienverlauf](https://www.bvg.de/de/verbindungen/netzplaene-und-linien/u-bahn) PDFs + [linienuebersicht](https://www.bvg.de/de/verbindungen/linienuebersicht) halt stacks. Stations arrays **hand-transcribed**. **Not generated from GTFS.** Not generated from VBB GTFS-RT. Not generated from HAFAS. Not generated from Wikipedia.

Current ordered-stop pages (BVG halt lists + Linienverlauf as linked 29 Aug 2026):

- U1: [u1](https://www.bvg.de/de/verbindungen/linienuebersicht/u1) — **U1 S+U Warschauer Str. ◂▸ U Uhlandstr.** 13 stops.
- U2: [u2](https://www.bvg.de/de/verbindungen/linienuebersicht/u2) — **U2 S+U Pankow ◂▸ U Ruhleben.** 29. Prints **U Anton-Wilhelm-Amo-Str.** (not Mohrenstraße).
- U3: [u3](https://www.bvg.de/de/verbindungen/linienuebersicht/u3) — **U3 S+U Warschauer Str. ◂▸ U Krumme Lanke.** 24.
- U4: [u4](https://www.bvg.de/de/verbindungen/linienuebersicht/u4) — **U4 U Nollendorfplatz ◂▸ S+U Innsbrucker Platz.** 5.
- U5: [u5](https://www.bvg.de/de/verbindungen/linienuebersicht/u5) — **U5 U Hönow ◂▸ S+U Hauptbahnhof.** 26. Former U55 is this west end. **U Magdalenenstr. (Campus für Demokratie).**
- U6: [u6](https://www.bvg.de/de/verbindungen/linienuebersicht/u6) — **U6 U Kurt-Schumacher-Platz ◂▸ U Alt-Mariendorf.** 24 passenger-open. Folder: north section closed; map still prints Alt-Tegel.
- U7: [u7](https://www.bvg.de/de/verbindungen/linienuebersicht/u7) — **U7 S+U Rathaus Spandau ◂▸ U Rudow.** 40.
- U8: [u8](https://www.bvg.de/de/verbindungen/linienuebersicht/u8) — **U8 S+U Wittenau ◂▸ S+U Hermannstr.** 24.
- U9: [u9](https://www.bvg.de/de/verbindungen/linienuebersicht/u9) — **U9 U Osloer Str. ◂▸ S+U Rathaus Steglitz.** 18.

Hub lock: **Alexanderplatz** (Innenstadtausschnitt Mitte node; BVG halte title **S+U Alexanderplatz**; U2/U5/U8). Nollendorfplatz is the U-Bahn-only 4-line node — shared approach, not the lock. Hauptbahnhof is the U5 west terminus — separate string.

H2 clash surface (after transcription): **no** product `lib/cities/berlin/`. Clash is **map-vs-halt-list** (U / S+U prefix; Straße vs Str.; Mohrenstraße → Anton-Wilhelm-Amo-Str.; Magdalenenstr. subtitle; U6 Alt-Tegel on the map vs Kurt-Schumacher-Platz passenger) plus **U vs S-Bahn name family** at every S+U tick. Not GTFS. S-Bahn / tram / bus / DB out of v1 oracle.

## Station name table

Match rule: published D1 string (BVG U-Bahn halt-list name **without** the `U` / `S+U` prefix) vs official map tick vs S-Bahn / DB print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Alexanderplatz | BVG halte **S+U Alexanderplatz**; map **Alexander-** | **match (lock)**. Do not use Alex / Mitte / City / Berlin. Halte page also lists S3/S5/S7/S9 + Regionalverkehr — doNotGroup U vs S vs Regional. |
| Nollendorfplatz | BVG halte **U Nollendorfplatz**; U1–U4 | **match (U-Bahn-only 4-line node)**. Shared approach, not the Innenstadt lock. No S-Bahn. |
| Wittenbergplatz | BVG halte **U Wittenbergplatz**; U1/U2/U3 | match. U1 Uhlandstr. vs U3 Krumme Lanke split. |
| Hauptbahnhof | BVG halte **S+U Hauptbahnhof**; map **Hauptbahnhof**; U5 folder west end | **match U5 terminus**. doNotGroup U vs **S-Bahn Hauptbahnhof** vs **DB Berlin Hbf** vs FEX BER. Not the U-Bahn lock. |
| Warschauer Str. | BVG **S+U Warschauer Str.**; map **Warschauer**; U1+U3 east end | **match**. doNotGroup U vs S Warschauer Straße. Locked to BVG abbreviation **Str.** |
| Uhlandstr. | BVG **U Uhlandstr.**; map **Uhlandstr.**; U1 west end | match. Not Uhlandstraße spelled out. |
| Anton-Wilhelm-Amo-Str. | BVG U2 halt + [Angebotsänderungen 14 Dec 2025](https://www.bvg.de/dam/jcr:4674de3d-c2a2-4f32-a406-d1d46f82402d/Angebots%C3%A4nderungen%2014.%20Dezember%202025.pdf) **U Anton-Wilhelm-Amo-Str.** (seit 23 Aug 2025); map **Anton- / Amo-Str.**; old print **Mohrenstraße** | **rename**. Locked to current BVG string. Do not emit Mohrenstraße. |
| Magdalenenstr. (Campus für Demokratie) | BVG U5 halt + 14 Dec 2025 bulletin subtitle; map **Magdalenenstr.** + **Campus für Demokratie** | **rename (subtitle)**. Locked to halt-list long form. |
| Kochstr./Checkpoint Charlie | BVG U6 **U Kochstr./Checkpoint Charlie**; map **Kochstr.** + **Checkpoint Charlie** | match. Locked to halt-list slash form. |
| Freie Universität (Thielplatz) | BVG U3 halt | match. Do not emit Thielplatz alone. |
| Kienberg (Gärten der Welt) | BVG U5 halt; map **Gärten der Welt** near Hönow | match. Locked to halt-list long form. |
| Olympia-Stadion | BVG U2 **U Olympia-Stadion**; sightseeing page Olympiastadion | **rename (hyphen)**. Locked to halt list. |
| Schloßstr. | BVG U9 **U Schloßstr.** | match. Keep ß. |
| Franz-Neumann-Platz | BVG U8 halt (no subtitle); older maps **Franz-Neumann-Platz (Am Schäfersee)** | **rename (dropped subtitle)**. Locked to 2026 halt list. |
| Yorckstr. | BVG U7 **S+U Yorckstr.** | match. doNotGroup U vs S Yorckstraße / Großgörschenstraße. |
| Kurt-Schumacher-Platz | BVG U6 current north terminus; map still draws Alt-Tegel beyond it | **match passenger end**. Map ticks Otisstr. / Holzhauser Str. / Borsigwerke / Alt-Tegel are **closed** — coverage gap, not D1 rows. |
| Friedrichstr. | BVG U6 **S+U Friedrichstr.** | match. doNotGroup U vs S / Regional Friedrichstraße. |
| Zoologischer Garten | BVG U2/U9 **S+U Zoologischer Garten** | match. doNotGroup U vs S / Regional Zoo. |
| Potsdamer Platz | BVG U2 **S+U Potsdamer Platz** | match. doNotGroup U vs S / Regional. |
| All other D1 names in published-network.json | same BVG halt title minus U / S+U prefix | match |

**170** unique D1 names. Product `lib/cities/berlin/` absent. `assertCityLive("berlin")` is Unknown city.

## H2 — who has line codes today

| surface | U1–U9? | what it actually has |
| --- | --- | --- |
| BVG S+U-Bahnnetz 30 Mar 2026 (D1) | **yes** | U1–U9 drawn. Mixed S+U+Regional sheet. U5 to Hauptbahnhof. U6 north still drawn to Alt-Tegel (closed). No U10. No U55. |
| Current U1–U9 halt lists + Linienverlauf (D1) | **yes** | Official termini pairs and ordered ticks. U6 passenger end **Kurt-Schumacher-Platz**. |
| Product `lib/cities/berlin/` | **absent** | No berlin stations.json / line-map.json. `assertCityLive("berlin")` is Unknown city |
| S-Bahn Berlin liniennetze page | S+U caption | Hosts the **same PDF bytes** as the BVG 30 Mar 2026 sheet under a 15.06.2026 caption. Not a second map. Not the U-Bahn agency. |
| VBB GTFS static | not used as D1 | 2× weekly at unternehmen.vbb.de/gtfs. Not this H2 stop-order surface. |
| VBB GTFS-RT | live but degraded | `https://production.gtfsrt.vbb.de/data` 200 on 29 Aug 2026. Banner: limited coverage since 2026-06-04. Not D1. |
| VBB REST API | live (key) | departureBoard after api@VBB.de. Official next-train path. Not D1. |
| BVG app HAFAS `bvg-apps.hafas.de` | unpublished | App backend from bvg.de CSP. Not a product contract. |

H2 conclusion: passenger codes on the map and line pages already agree (**U1–U9**). Clash is **prefix / abbreviation / 2025 renames / U6 closed north / U vs S at S+U ticks**, and **no product berlin file**. Do not generate published-network.json from GTFS. Do not merge S-Bahn into this city.

## C2/C3 to put in front of Jim

1. **city=berlin**, agency **BVG**, not `germany`, not merged into an S-Bahn city, not VBB as a city id. Perth / London TfL / Amsterdam / Rotterdam / Sweden untouched.
2. **Alexanderplatz** is the locked inner-city U-Bahn hub (U2/U5/U8). Not Hauptbahnhof, not Mitte, not City. **Nollendorfplatz** is the U-Bahn-only 4-line node (U1–U4) — shared approach.
3. **doNotGroup Alexanderplatz U vs S vs Regional.** Same printed name family, three modes on the BVG halte page.
4. **doNotGroup Hauptbahnhof U5 vs S-Bahn vs DB Berlin Hbf vs FEX.** U5-only U-Bahn terminus. Former **U55 is U5**.
5. **U6 passenger termini are Kurt-Schumacher-Platz / Alt-Mariendorf.** Alt-Tegel + three intermediates are closed (map still prints them). Not D1 rows. Chip is not `U6 + Alt-Tegel`.
6. **Anton-Wilhelm-Amo-Str.** not Mohrenstraße (23 Aug 2025). **Magdalenenstr. (Campus für Demokratie)** subtitle 14 Dec 2025.
7. **No U10.** No S-Bahn, tram, bus, ferry, BER.
8. **Europe/Berlin HAS DST.** Official live path is VBB REST departureBoard (key) and/or degraded VBB GTFS-RT. D1 stays planned.
9. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Perth edit, no GTFS-derived station arrays, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden.
