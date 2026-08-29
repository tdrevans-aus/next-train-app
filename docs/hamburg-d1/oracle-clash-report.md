# Hamburg oracle clash report

D1 (published, as of 29 Aug 2026): [Netz- und Tarifpläne](https://www.hvv.de/de/plaene) **U/S/A/R-Plan** [hvv_usar-plan.pdf](https://www.hvv.de/resource/blob/120104/3ff58f395fa6e8d4818231b0573b0bc6/hvv_usar-plan.pdf) (Stand **01.06.2026**, Illustrator 15 Jul 2026) plus current U1–U4 [Linienfahrplan](https://www.hvv.de/de/linienfahrplan) PDFs (gültig **14.12.2025–12.12.2026**) and Hochbahn [U-Bahn-Streckennetz](https://www.hochbahn.de/de/betrieb/u-bahn-streckennetz). Stations arrays **hand-transcribed**. **Not generated from GTFS.** Not generated from GTI listStations / listLines. Not generated from Wikipedia.

Current ordered-stop folders (HVV Linienfahrplan as linked 29 Aug 2026):

- U1: [hvv_linienfahrplan_U1.pdf](https://www.hvv.de/resource/blob/73090/9734f4e35987f27cd3d3f0b212fee7c2/hvv_linienfahrplan_U1.pdf) — **U1 Norderstedt Mitte – Hauptbahnhof Süd – Ohlstedt / Großhansdorf.** 47 stops. Volksdorf Y-fork. Header truncates **Großhansd.**
- U2: [hvv_linienfahrplan_U2.pdf](https://www.hvv.de/resource/blob/73084/4e48810f9dd89ca66c1a98cf211d09be/hvv_linienfahrplan_U2.pdf) — **U2 Niendorf Nord – Hauptbahnhof Nord – Mümmelmannsberg.** 25. Prints **Gänsemarkt (Oper)**.
- U3: [hvv_linienfahrplan_U3.pdf](https://www.hvv.de/resource/blob/73098/439fcd76010fe3b7332774dc1b41fc2e/hvv_linienfahrplan_U3.pdf) — **U3 Barmbek – Schlump – Hauptbahnhof Süd – Wandsbek-Gartenstadt.** 26 halt ticks / 25 unique. Ring through **Barmbek** twice. Prints **St.Pauli**, **Borgweg (Stadtpark)**, **Sternschanze (Messe)**, **Feldstraße (Heiligengeistfeld)**, **Baumwall (Elbphilharmonie)**. Never calls Jungfernstieg.
- U4: [hvv_linienfahrplan_U4.pdf](https://www.hvv.de/resource/blob/73080/bb74bf6bfbb892ad7083777354901f90/hvv_linienfahrplan_U4.pdf) — **U4 Elbbrücken – Hauptbahnhof Nord – Billstedt.** 12. No Horner Geest.

Hub lock: **Jungfernstieg** (USAR inner-city U1/U2/U4 + S node; map legend **als über Jungfernstieg**). Hauptbahnhof is two U-Bahn stations — **Hauptbahnhof Süd** (U1/U3) and **Hauptbahnhof Nord** (U2/U4) — plus S + DB, not the lock. Berliner Tor is the eastern U2/U3/U4 node — shared approach, not the lock.

H2 clash surface (after transcription): **no** product `lib/cities/hamburg/`. Clash is **map-vs-halt-list** (Großhansd. vs Großhansdorf; Gänsemarkt vs Gänsemarkt (Oper); parentheticals; St.Pauli spacing; Hauptbahnhof Nord vs Süd) plus **U vs S-Bahn name family** at every S+U tick. Not GTFS. S-Bahn / AKN / DB / bus / ferry out of v1 oracle.

## Station name table

Match rule: published D1 string (HVV/Hochbahn U-Bahn halt-list name **without** a `U` / `S+U` prefix) vs official map tick vs S-Bahn / DB print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Jungfernstieg | USAR **Jungfernstieg**; legend **als über Jungfernstieg**; U1/U2/U4 folders | **match (lock)**. Do not use City / Mitte / Hamburg / Hauptbahnhof. Same building family as S1/S2/S3 — doNotGroup U vs S. U3 does not call it. |
| Hauptbahnhof Süd | U1/U3 folders **Hauptbahnhof Süd**; GTI handbook **Hbf. Süd**; map **Hauptbahnhof** | **match U1/U3**. Distinct from Nord. doNotGroup vs **Hauptbahnhof Nord** vs **S Hauptbahnhof** vs **DB Hamburg Hbf**. Not the lock. |
| Hauptbahnhof Nord | U2/U4 folders **Hauptbahnhof Nord**; GTI **Hbf. Nord** | **match U2/U4**. Same doNotGroup cluster. Not the lock. |
| Berliner Tor | U2/U3/U4 folders; USAR | **match (eastern 3-line node)**. doNotGroup U vs S Berliner Tor. Shared approach, not the lock. |
| Norderstedt Mitte | U1 folder north end | match. Not Norderstedt / Garstedt as the line token. |
| Ohlstedt | U1 folder; map **Ohlstedt** | match. Volksdorf north branch. |
| Großhansdorf | U1 halt row **Großhansdorf**; folder header **Großhansd.** | **rename (truncation)**. Locked to halt-row full string. |
| Gänsemarkt (Oper) | U2 folder **Gänsemarkt (Oper)** | match. Keep parenthetical. Not Gänsemarkt alone. |
| Sengelmannstraße (City Nord) | U1 folder | match. Keep parenthetical. Future U5 interchange — U5 still OUT. |
| Stephansplatz (Oper/CCH) | U1 folder | match. doNotGroup vs S/DB **Dammtor**. |
| Lattenkamp (Sporthalle) | U1 folder | match. Keep parenthetical. |
| Borgweg (Stadtpark) | U3 folder | match. Keep parenthetical. |
| Sternschanze (Messe) | U3 folder | match. doNotGroup U vs S Sternschanze. |
| Feldstraße (Heiligengeistfeld) | U3 folder | match. Keep parenthetical. |
| Baumwall (Elbphilharmonie) | U3 folder | match. Keep parenthetical. Not Elbphilharmonie alone. |
| St.Pauli | U3 folder **St.Pauli** (no space) | **rename (spacing)**. Locked to folder. Not St. Pauli / Reeperbahn. |
| Meßberg | U1 folder **Meßberg** | match. Keep ß. |
| Straßburger Straße | U1 folder | match. Keep ß. |
| Barmbek | U3 folder (listed twice); USAR | **match**. Ring-then-spur. doNotGroup U vs S Barmbek. |
| Elbbrücken | U4 west end | match. doNotGroup U vs S Elbbrücken. Not Grasbrook. |
| Billstedt | U2 through / U4 east end | match. Not Horner Geest. |
| Mümmelmannsberg | U2 east end | match. |
| Niendorf Nord | U2 west end | match. Not Niendorf Markt (intermediate / occasional short-turn). |
| Wandsbek-Gartenstadt | U1 through / U3 east end | match. Not Wandsbek Markt. |
| Landungsbrücken | U3 folder | match. doNotGroup U vs S Landungsbrücken. |
| Ohlsdorf | U1 folder | match. doNotGroup U vs S Ohlsdorf. 2026 rebuild overlay; stay in D1. |
| All other D1 names in published-network.json | same HVV/Hochbahn halt title | match |

**93** unique D1 names. Product `lib/cities/hamburg/` absent. `assertCityLive("hamburg")` is Unknown city.

## H2 — who has line codes today

| surface | U1–U4? | what it actually has |
| --- | --- | --- |
| HVV U/S/A/R-Plan 01.06.2026 (D1) | **yes** | U1–U4 drawn. Mixed U+S+A+R sheet. No U5. No Horner Geest. |
| Current U1–U4 Linienfahrplan (D1) | **yes** | Official termini pairs and ordered ticks. U4 passenger end **Billstedt**. U1 Y-fork at Volksdorf. |
| Hochbahn U-Bahn-Streckennetz | **yes** | Four lines, **93** Haltestellen. U5 / Horner Geest / Grasbrook described as future. |
| Product `lib/cities/hamburg/` | **absent** | No hamburg stations.json / line-map.json. `assertCityLive("hamburg")` is Unknown city |
| Geofox GTI | live (key) | `departureList` + `useRealtime`. Official next-train path. Not D1. Filter `UBAHN`. |
| HVV GTFS static (Transparenzportal) | not used as D1 | Monthly. Not this H2 stop-order surface. No GTFS-RT on that portal. |
| hvv.de Abfahrten | passenger UI | Not a product contract. |

H2 conclusion: passenger codes on the map and line folders already agree (**U1–U4**). Clash is **abbreviation / parenthetical / Nord vs Süd / U vs S at S+U ticks**, and **no product hamburg file**. Do not generate published-network.json from GTFS. Do not merge S-Bahn or AKN into this city.

## C2/C3 to put in front of Jim

1. **city=hamburg**, agency **Hamburger Hochbahn / HVV**, not `germany`, not merged into an S-Bahn / AKN city. London TfL / Amsterdam / Rotterdam / Sweden / Berlin / Munich untouched.
2. **Jungfernstieg** is the locked inner-city U-Bahn hub (U1/U2/U4). Not Hauptbahnhof, not Hauptbahnhof Süd, not Berliner Tor, not City. **U3 never calls it** (Rathaus is the nearby U3 tick).
3. **doNotGroup Jungfernstieg U vs S.** Same printed name family, U + S on the USAR sheet.
4. **doNotGroup Hauptbahnhof Süd vs Hauptbahnhof Nord vs S Hauptbahnhof vs DB Hamburg Hbf.** GTI handbook names them as separate stations in one changing node (Hbf. Nord / Hbf. Süd / Hbf. ZOB).
5. **doNotGroup Berliner Tor U vs S.**
6. **U4 passenger termini are Elbbrücken / Billstedt.** Horner Geest + Stoltenstraße unopened (Ende 2027). Grasbrook unopened. Chip is not `U4 + Horner Geest`.
7. **U5 is not passenger-open** (trial 2027, passengers 2029). Not a D1 row.
8. **U1 chips are Norderstedt Mitte / Ohlstedt / Großhansdorf.** Volksdorf is the Y-fork, not a terminus token unless a short-turn overlay.
9. **No S-Bahn, no AKN, no DB, no tram, no bus, no ferry.** Hamburg has no tram.
10. **Europe/Berlin HAS DST.** Official live path is Geofox GTI `departureList` (key via api@hochbahn.de). D1 stays planned.
11. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin / Munich.
