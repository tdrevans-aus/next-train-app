# Göteborg oracle clash report

D1 (published): [Spårvagns- stombuss- och båttrafik](https://www.vasttrafik.se/globalassets/media/kartor/linjenatskartor/sparvagn/sparvagn_stombuss_bat_juni_2026.pdf), linked from [Linjekartor](https://www.vasttrafik.se/reseplanering/mer-om-reseplanering/linjekartor/). Caption **Spårvagn, stombuss och båt**. Gäller från **2026-06-15**. Retrieved `2026-08-29`. Format is **PDF**. Stations in `published-network.json` are **hand-transcribed from that map**. Not generated from GTFS.

City-map pendeltåg (D1 train rows): [Expressbussar och pendeltåg](https://www.vasttrafik.se/globalassets/media/kartor/linjenatskartor/expressbussar/expressbuss_pendeltag_juni_2026.pdf), same index, gäller från **2026-06-15**. Only the three printed Västtågen city-map rows: Göteborg–Kungsbacka, Göteborg–Alingsås, Göteborg–Ale.

Regional tågkarta `tagkarta_dec_24.pdf` is **not** D1 — it draws Vänersborg / Uddevalla / Strömstad / Borås / Varberg. Out of v1.

## Agency / feed / auth (H2 product path)

| field | value |
| --- | --- |
| Agency | Västtrafik |
| Product | Trafiklab **GTFS Regional** operator `vt` (same coverage as GTFS Sweden 3 slice for VT) |
| Static URL | `https://opendata.samtrafiken.se/gtfs/vt/vt.zip?key={TRAFIKLAB_API_KEY}` |
| Auth | Trafiklab API key in query (`TRAFIKLAB_API_KEY` on Vercel). Portal: https://www.trafiklab.se/ |
| GTFS-RT TripUpdates URL scheme | `https://opendata.samtrafiken.se/gtfs-rt/vt/TripUpdates.pb?key=…` |
| GTFS-RT availability | **None for `vt`** — Trafiklab operator table (updated 2026-08-28) shows Static ✔️, Real-time blank, Vehicle positions blank. Adapter still points at the RT URL and **falls back to schedule-only**. |
| v1 mode cut | Tram **1–12** (`route_type` tram family) + three city-map pendeltåg corridors. No stombuss, båt, X-bus, metro, regional Västtågen. |
| Hub lock | **Brunnsparken** (tram; lines 8 and 12 miss it). Västtågen hub **Göteborg Central**. Do not lock Centralstationen. |
| Skip risks | Bus/stombuss leak if unfiltered; collapsing Drottningtorget ↔ Göteborg Central; inventing city=sweden / gothenburg; treating Trafiklab RT as live when VT has none. |

Västtrafik’s own [developer.vasttrafik.se](https://developer.vasttrafik.se) Planera Resa v4 OAuth is a **later** live-board option if Trafiklab never publishes VT TripUpdates. Not wired in v1 adapter.

## Station name table (locks + known clashes)

Match rule: published D1 string (map) vs typical GTFS / API string. `rename` = same place, different printed string.

| published (D1) | typical feed / nearby | class |
| --- | --- | --- |
| **Brunnsparken** | Brunnsparken | **lock tram**. 10 of 12. Lines 8/12 miss it. |
| **Drottningtorget** | Drottningtorget (Centralstation) on tram PDF | **rename 15 Jun 2026**. Do not lock Centralstationen. |
| **Göteborg Central** | Centralstationen / Göteborg C on train maps | **lock pendeltåg**. Different stop from Drottningtorget. |
| Nils Ericsonsplatsen | tram halt by the station | **do not collapse** into Drottningtorget or Göteborg Central |
| Nils Ericson Terminalen | coach terminal | **not v1** |
| Liseberg Station | tram 5 | **do not collapse** into Liseberg Station (tåg) or Liseberg Södra |
| Liseberg Station (tåg) | Liseberg on pendeltåg PDF | Kungsbacka line |
| Gamlestads Torg | tram | **do not collapse** into Gamlestaden Station |
| Gamlestaden Station | Gamlestaden station on pendeltåg PDF | Alingsås + Ale |
| Tynnered | Opaltorget | legend vs first halt |
| Högsbotorp | Axel Dahlströms Torg | legend vs first halt |
| Biskopsgården | Väderilsgatan | legend vs first halt |
| Länsmansgården | Varmfrontsgatan | legend vs first halt |
| Ale | Älvängen resecentrum | legend vs first halt |

## H2 — who has line codes today

| surface | tram 1–12 + three pendeltåg? | what it actually has |
| --- | --- | --- |
| Västtrafik tram PDF 2026-06-15 (D1) | **yes** | Linjeförteckning 1–12. Stombuss / båt also drawn — out of v1. |
| Västtrafik pendeltåg PDF 2026-06-15 (D1) | **yes** | Göteborg–Kungsbacka / Alingsås / Ale. X-bus out of v1. |
| Trafiklab GTFS Regional `vt` static | **yes (with key)** | Full VT network; adapter filters to tram 1–12 + three corridors. |
| Trafiklab GTFS-RT `vt` TripUpdates | **no** | Availability blank. Schedule-only board. |
| Västtrafik Planera Resa v4 | OAuth, not D1 | Later optional live path. |

H2 conclusion: passenger tram numbers and the three city-map pendeltåg **agree** across the two official PDFs. Feed clash is **hub splitting**, **legend vs first halt**, **tram vs train Liseberg / Gamlestaden**, and **no Trafiklab RT for vt**. Do not generate `published-network.json` from `routes.txt`.

## C2/C3 to put in front of Jim

1. **Brunnsparken** is the tram lock. Lines **8** and **12** do not serve it.
2. **Centralstationen** is not the 2026 tram print. Use **Drottningtorget**.
3. **Göteborg Central** is the Västtågen hub. Not a tram name.
4. **Line 12** is new Mölndal–Lindholmen. **Line 2** is Högsbotorp–Biskopsgården, not Mölndal.
5. **132 + 25 = 157** unique names. Do not swallow stombuss / båt / X-bus / regional Västtågen.
6. City id **goteborg**. Not gothenburg. Not city=sweden. Not Stockholm. Not Malmö.
7. **Europe/Stockholm HAS DST.**
8. Adapter uses shared `lib/providers/gtfs/realtime-board.js`. Status stays **planned**.

## What I did not do

No live city flip, no UI picker wiring, no Västtrafik OAuth client, no generator from GTFS, no Perth/Stockholm/Rotterdam product edits.
