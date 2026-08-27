# Gold Coast oracle clash report

D1 (published, live as of 27 Aug 2026): [Route G:link tram network PDF, Effective August 2026](https://translink.com.au/sites/default/files/acquiadam-assets/timetables/260809-gold-coast-tram.pdf) linked from [Translink maps](https://translink.com.au/plan-your-journey/maps) as **Tram network (PDF)** / **G:link network map (PDF)**. Stations arrays hand-transcribed. **Not generated from GTFS.**

SEQ diagram (cite with D1; does not replace the tram PDF): [SEQ network map Version 4 – GCLR3, effective 10 August 2026](https://translink.widen.net/content/szuvbcshyi/original/260809-seq-network-map-.pdf) — legend tram **Helensvale – Burleigh Heads**.

Stage 3 opening (names, not D1 generator): [New Gold Coast tram stations now open from 6:00 am Sunday 9 August 2026](https://translink.com.au/updates/1092351) — eight new stations Mermaid Beach, Mermaid Beach South, Nobby Beach, Miami North, Miami, Christine Avenue, Second Avenue, Burleigh Heads. Line token **L1 Helensvale / Burleigh Heads**.

GTFS (H2 names only; not D1): public zip **no key** [https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip](https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip) (`feed_publisher` Department of Transport and Main Roads - Translink Division). `feed_start_date` 20260822, `feed_end_date` 20261021. `agency_timezone` **Australia/Brisbane**. One tram row: `route_id` `L1-5029`, `route_short_name` **L1**, `route_long_name` **Helensvale - Burleigh Heads**, `route_type=0`, `route_color` `FFC425`.

GTFS-RT **no key**: [https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates](https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates) HTTP 200 protobuf (`SEQ_TripUpdates.pb`) 27 Aug 2026. Filter to light rail / L1. Same SEQ agency as Brisbane; **city remains gold-coast**.

Bus / QR Gold Coast line / ferry out of v1 oracle.

## Station name table

Match rule: published D1 string (tram PDF long form) vs SEQ GTFS `location_type=1` parent `stop_name`. `rename` = same place, different printed string.

| published (D1) | GTFS parent | class |
| --- | --- | --- |
| Helensvale | Helensvale station (`place_helsta`) | match family (GTFS adds station). **Shared QR Gold Coast line parent** — train platforms 1–2 and tram platforms 4–5. doNotGroup |
| Parkwood | Parkwood station | match family |
| Parkwood East | Parkwood East station | match family |
| Gold Coast University Hospital | Gold Coast University Hospital station | match family. Do not use GCUH as the lock |
| Griffith University | Griffith University station (Southport) (`place_gristn`) | **rename**. Separate parent **Griffith University station** (`place_grunbs`) is the Nathan **busway**. doNotGroup |
| Queen Street | Queen Street station (Southport) (`place_qssstn`) | **rename**. Separate Brisbane bus parent **Queen Street bus station** / **Queen Street station**. doNotGroup |
| Nerang Street | Nerang Street station | match family. SEQ diagram: Nerang St |
| Southport | Southport station | match family. Bus children: Southport bus station stop A/B |
| Southport South | Southport South station | match family |
| Broadwater Parklands | Broadwater Parklands station | match family |
| Main Beach | Main Beach station | match family |
| Surfers Paradise North | Surfers Paradise North station | match family |
| Cypress Avenue | Cypress Avenue station | match family. SEQ diagram: Cypress Ave |
| Cavill Avenue | Cavill Avenue station | match family |
| Surfers Paradise | Surfers Paradise station | match family |
| Northcliffe | Northcliffe station | match family |
| Florida Gardens | Florida Gardens station | match family |
| Broadbeach North | Broadbeach North station | match family |
| Broadbeach South | Broadbeach South station | match family. Former southern terminus; still a stop |
| Mermaid Beach | Mermaid Beach station | match family. Live from 9 Aug 2026 |
| Mermaid Beach South | Mermaid Beach South station | match family |
| Nobby Beach | Nobby Beach station | match family |
| Miami North | Miami North station | match family |
| Miami | Miami station | match family. Do not swap with Miami North |
| Christine Avenue | Christine Avenue station | match family. SEQ diagram: Christine Ave |
| Second Avenue | Second Avenue station | match family |
| Burleigh Heads | Burleigh Heads station | match family. New southern terminus from 9 Aug 2026 |
| Twenty Seventh Ave / Nineteenth Ave / Palm Beach / Gold Coast Airport (SEQ mixed map only) | bus / not G:link parents | not inserted; not passenger G:link |
| Arundel / Olsen Ave (tram PDF geography labels) | bus streets | not stops |

## H2 — who has L1 / G:link today

| surface | L1 / G:link? | what it actually has |
| --- | --- | --- |
| G:link tram PDF (D1) | G:link, no L1 glyph in extracted text | Route G:link. Frequency Helensvale ↔ Burleigh Heads. Effective August 2026 |
| SEQ diagram 10 Aug 2026 | pair, no L1 glyph in extracted text | Tram: Helensvale – Burleigh Heads |
| Translink homepage / updates | **yes** | L1 Helensvale / Burleigh Heads. Stations-open article 9 Aug 2026 |
| SEQ GTFS `route_short_name` | **yes** | `L1` / `Helensvale - Burleigh Heads` / `route_type=0`. Versioned `L1-5029`. Colour `FFC425` is feed metadata, not D1 print |
| SEQ GTFS-RT TripUpdates | codes ride trips | no key (200) |

H2 conclusion: passenger L1 and GTFS L1 already agree. Clash is **map omits station**, **(Southport) disambiguators** on Queen Street / Griffith University, **Helensvale shared with QR**, **St vs Street / Ave vs Avenue**. Do not generate published-network.json from `routes.txt`. Do not merge into Brisbane.

## C2/C3 to put in front of Jim

1. **gold-coast is its own city.** Same SEQ feed as Brisbane; filter to L1 / `route_type=0`. Helensvale train is Brisbane T5 / QR, not this oracle.
2. **Burleigh Heads is the live southern terminus** (9 Aug 2026). Broadbeach South stays a stop. Do not keep a Helensvale–Broadbeach-only spine.
3. **Helensvale** lock vs GTFS **Helensvale station** (shared train parent).
4. **Queen Street** vs **Queen Street station (Southport)** vs Brisbane **Queen Street bus station**.
5. **Griffith University** vs **Griffith University station (Southport)** vs Nathan busway **Griffith University station**.
6. **Avenue vs Ave** on Cypress / Cavill / Christine / Second. Tram PDF long form is the lock.
7. **Australia/Brisbane NO DST** (same as Brisbane).

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub PR, no merge into Brisbane, no Perth/Melbourne touch.
