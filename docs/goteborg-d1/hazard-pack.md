# Göteborg hazard pack (H1–H7)

Evidence: Västtrafik Spårvagns- stombuss- och båttrafik PDF 2026-06-15; Expressbussar och pendeltåg PDF 2026-06-15; both linked from vasttrafik.se linjekartor. Hand-transcribed. Trafiklab GTFS Regional `vt` has **static** (key required) but **no TripUpdates** for Västtrafik as of 2026-08-28 — schedule-only until that changes.

## H1 — parent + child

Västtrafik groups nearby halt areas under one resecentrum / station parent. That is not permission to treat them as one Next Train stop.

doNotGroup:

- Drottningtorget (tram, renamed 15 Jun 2026) vs Göteborg Central (Västtågen) vs Nils Ericsonsplatsen (tram) vs Nils Ericson Terminalen (coach)
- Liseberg Station (tram 5) vs Liseberg Station (tåg) vs Liseberg Södra (tram 4/12)
- Gamlestads Torg (tram) vs Gamlestaden Station (pendeltåg)
- Mölndals Innerstad (tram) vs Mölndal Station (pendeltåg)
- Frölunda Torg tram vs Frölunda bus terminal
- Brunnsparken vs Nordstan vs Lilla Bommen (three printed inner-city places)

## H3 — thin / event / overlay

- **Line 12**: new Mölndal–Lindholmen from the December 2025 Lindholmen opening. On this 2026-06-15 map. Not an overlay.
- **Line 2**: Högsbotorp–Biskopsgården on this map. The old Mölndal reading is withdrawn. Do not restore it.
- **Line 10**: Guldheden–Lindholmen (was Biskopsgården). Chalmers–Chalmers coupling.
- **Jubileumsparken / Pumpgatan / Lindholmen**: new Hisingen stops on 10 and 12.
- **Stombuss 16/17/18/19/21/25** and **båt 281–287**: same tram PDF. Overlay / later mode.
- **Express X-bus**: same pendeltåg PDF. Later mode.
- **Västlänken** (Haga / Korsvägen train): not passenger-open as a v1 halt set.
- Royal events / Liseberg extras: not on the network PDF; treat as overlay if they appear later.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Brunnsparken | 10 of 12 trams through-run | Lines 8 and 12 miss it |
| Korsvägen | 4/5/6/8/12 | Line 8/12 live here instead of Brunnsparken |
| Marklandsgatan | 1/2/3/7/8 west fork | 3 leaves toward Kungsladugård / Klintens Väg; 1/7/8 toward Frölunda / Tynnered |
| Gamlestads Torg | 4/6/7/8/9/11 | Angeredsbanan vs Bergsjön / Kortedala |
| Järntorget | 1/3/6/9/11 | Stenpiren vs Hagakyrkan / Masthugget |
| Wavrinskys Plats | 6/7/8/10 | Guldheden vs Sahlgrenska vs Chalmerstunneln |
| Lindholmen | 10 vs 12 | Same new branch; different south ends (Guldheden vs Mölndal) |

Trams **do** through-run the inner city. Inbound/outbound vs CBD is a poor fit. Labels at Brunnsparken are the **far legend terminus plus line number**.

## H5 — nested short turns

| nest | parent | evidence |
| --- | --- | --- |
| Opaltorget | Tynnered (1, 7) | First halt, not the legend word |
| Axel Dahlströms Torg | Högsbotorp (2) | First halt |
| Väderilsgatan | Biskopsgården (2, 5) | First halt |
| Varmfrontsgatan | Länsmansgården (5, 6) | Map spelling. Not Vardfrontsgatan |
| Aprilgatan | Kortedala (6) | First halt |
| Komettorget | Bergsjön (7, 11) | First halt |
| Frölunda Torg | Frölunda (8) | First halt / legend pair |
| Mölndals Innerstad | Mölndal (4, 12) | First halt |
| Virginsgatan | Kålltorp (3) | First halt |
| Doktor Sydows Gata | Guldheden (10) | First halt |
| Älvängen resecentrum | Ale | First halt |
| Angereds Centrum | Angered | First halt |

Do not label an Opaltorget-short as if the legend were a different line.

## H6 — inner city (where §3 lives)

Locked set: **Brunnsparken** (tram). Shared approaches: Drottningtorget, Korsvägen, Järntorget, Kungsportsplatsen, Valand, Nordstan, Lilla Bommen. Västtågen spine starts at **Göteborg Central**. Nearby **not** the v1 tram lock: Centralstationen, Nils Ericson Terminalen.

This is **through-running**, not an Adelaide hub. “To City” is false on this network.

## H7 — DST

**Europe/Stockholm observes DST (CEST/CET).** Do not copy Brisbane H7. Wall-clock is Stockholm local. Any Perth offset helper must include EU DST rules.

## H2 feed skip risks

- Unfiltered Trafiklab `vt.zip` includes stombuss / båt / X-bus / regional rail — adapter must keep the v1 short-name / corridor allowlist.
- Calling Trafiklab RT for `vt` will 404 or empty (availability blank as of 2026-08-28); treat as optional, not a hard board failure. Schedule-only is expected until Trafiklab adds VT TripUpdates or Planera Resa OAuth is wired.
- Do not invent a second city id (`gothenburg`, `sweden`).

## Later modes (same official PDFs — out of v1)

| product | numbers | map note |
| --- | --- | --- |
| Stombuss | 16, 17, 18, 19, 21, 25 | Same tram PDF |
| Båt | 281–287 | Same tram PDF |
| Expressbuss | X1–X6, X40, X76, X77, X90 | Same pendeltåg PDF |
| Regional Västtågen | Uddevalla, Strömstad, Vänersborg, Borås, Varberg, … | Separate tågkarta |

Not first-class Next Train v1 unless Tim later promotes them. They **are** on the official sheets, so the hazard is accidental grouping, not “missing from the PDF”.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Drottningtorget vs Göteborg Central vs Nils Ericsonsplatsen vs Nils Ericson Terminalen | Four printed names, four jobs |
| Liseberg Station vs Liseberg Station (tåg) vs Liseberg Södra | Three printed places |
| Gamlestads Torg vs Gamlestaden Station | Tram vs pendeltåg |
| Mölndals Innerstad vs Mölndal Station | Tram vs pendeltåg |
| Line 8/12 vs Brunnsparken | Those two miss the hub |
| Stombuss / båt / X-bus / regional Västtågen | Same PDFs, later mode |
| city=sweden / Stockholm / Malmö | Not this city |

## What I did not do

No generator from GTFS for D1 JSON, no live city flip, no Västtrafik OAuth client (Trafiklab static + schedule-only board only).
