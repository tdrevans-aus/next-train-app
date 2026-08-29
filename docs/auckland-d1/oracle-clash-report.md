# Auckland oracle clash report

D1 (published, live as of 24 Aug 2026): [Auckland train network maps](https://at.govt.nz/bus-train-ferry/train-services/auckland-train-network-maps) plus current passenger timetables and line pages. Stations arrays hand-transcribed. **Not generated from GTFS.**

Current ordered-stop PDFs:

- Eastern: [auckland-transport-eastern-line-train-timetable.pdf](https://at.govt.nz/media/j5qlqiir/auckland-transport-eastern-line-train-timetable.pdf) — Towards Waitematā via Panmure.
- Western: [auckland-transport-western-line-train-timetable.pdf](https://at.govt.nz/media/q2pdxp2x/auckland-transport-western-line-train-timetable.pdf) — Effective **14 June 2026**. Towards Waitematā via New Lynn and Newmarket. Legend: **Maungawhau (Mt Eden) Station temporarily closed for construction of the City Rail Link.**
- Southern corridor: maps index + [southern-line-timetable.pdf](https://at.govt.nz/media/n44gnojn/southern-line-timetable.pdf) (Sept 2025 rail-bus overlay; missing Paerātā/Drury) + [South City preview timetable](https://at.govt.nz/media/xcvhdrrl/south-city-line-timetable-auckland-transport.pdf) for Paerātā / Drury / Ngākōroa status + AT [Drury and Paerātā open 2 August 2026](https://at.govt.nz/about-us/news-events/media-centre/2026-media-releases/new-drury-and-paerata-railway-stations-to-open-on-sunday-2-august).
- Onehunga: [Onehunga West line page](https://at.govt.nz/bus-train-ferry/train-services/onehunga-west-line) (current ONE until 12 Sep) + [O-W preview timetable](https://at.govt.nz/media/vkfjkt2x/onehunga-west-line-timetable-auckland-transport.pdf) for Te Pāpapa spelling/order.

Hub lock: [Waitematā Station](https://at.govt.nz/projects-initiatives/city-centre-projects-and-initiatives/city-rail-link-auckland-s-new-network-in-2026/about-the-city-rail-link-stations/waitemata-station) last updated 16/07/2026.

CRL (not D1-live): passenger opening **Sunday 13 September 2026**, weekday timetable from Monday 14 September. [AT media release](https://at.govt.nz/about-us/news-events/media-centre/2026-media-releases/all-aboard-what-you-need-to-know-about-city-rail-link-opening-13-september). Future in-carriage map [train-network-map-auckland-transport-2026.pdf](https://at.govt.nz/media/gwrnlxzs/train-network-map-auckland-transport-2026.pdf) dated 23/06/2026 — South City / East West / Onehunga West. Preview timetables labelled “Effective once Te Waihorotiu, Karanga-a-Hape and Maungawhau Stations have opened”.

GTFS (H2 names only; not D1): public zip **no key** [https://gtfs.at.govt.nz/gtfs.zip](https://gtfs.at.govt.nz/gtfs.zip) linked from [AT GTFS page](https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification) (last updated 13 August 2026). `Last-Modified` Thu 13 Aug 2026 14:26:13 GMT. `feed_info` Auckland Transport, `20260806`–`20261129`, version `VDV_EOD_118_3_F_320.08584149764536757918505803151CU18`. Historic alias `https://cdn01.at.govt.nz/data/gtfs.zip`. Developer portal [https://dev-portal.at.govt.nz/](https://dev-portal.at.govt.nz/) is for APIs; static zip did not need a key.

Bus/ferry/AirportLink/Te Huia out of v1 oracle.

## Station name table

Match rule: published D1 string vs GTFS rail parent `stop_name` (`* Train Station`, `location_type=1`). `rename` = same place, different printed string.

| published (D1) | GTFS name | class |
| --- | --- | --- |
| Waitematā Station | Waitemata Train Station | **rename (lock)**. GTFS drops the macron and adds Train. Do not use Britomart / Waitematā (Britomart) / City Centre. Bus parents still say Britomart. |
| Ōrākei | Orakei Train Station | rename (macrons + Train) |
| Ōtāhuhu | Otahuhu Train Station | rename |
| Rānui | Ranui Train Station | rename |
| Te Pāpapa | Te Papapa Train Station | rename |
| Paerātā | Paerata Train Station | rename. Live from 2 Aug 2026. |
| Drury | Drury Train Station | match family (GTFS adds Train Station) |
| Te Mahia | Te Mahia Train Station | match family. 2026 map: Te Maahia. Western map also Te Māhia. |
| Takaanini | Takaanini Train Station | match family. 2017 maps: Takanini |
| Sturges Rd | Sturges Rd Train Station | match family |
| Fruitvale Rd | Fruitvale Rd Train Station | match family. O-W preview: Fruitvale Road |
| Baldwin Ave | Baldwin Ave Train Station | match family |
| Mt Albert | Mt Albert Train Station | match family |
| Manukau | Manukau Train Station | match family. Separate GTFS parent **Manukau Bus Station** / **Manukau Station** — do not merge |
| Newmarket | Newmarket Train Station | match family. Separate Westfield Newmarket bus parent |
| Parnell | Parnell Train Station | match family |
| Grafton | Grafton Train Station | match family |
| Maungawhau (not in current WEST array; closed) | Maungawhau Train Station | future. Also GTFS bus parent **Maungawhau Station**. Map/pages: formerly Mount Eden |
| Te Waihorotiu Station (not open) | Te Waihorotiu Train Station | future; also bus parent Te Waihorotiu Station |
| Karanga-a-Hape Station (not open) | Karanga-a-Hape Train Station | future; also bus parent Karanga-a-Hape Station |
| Ngākōroa (not inserted) | no Train Station parent | missing-in-GTFS; preview Under construction / 2027 |
| The Strand (Te Huia) | The Strand Train Station | other-product; out of v1 |
| All other D1 names in published-network.json | `{Name} Train Station` | match family (GTFS suffix Train Station; AT timetable omits it) |

## H2 — who has line codes today

| surface | STH/EAST/WEST/ONE? | what it actually has |
| --- | --- | --- |
| Maps index + current line pages (D1) | **yes** | Southern, Eastern, Western, Onehunga. Pages print STH, EAST, WEST, ONE until 12 Sep 2026 |
| 23 Jun 2026 in-carriage PDF | future codes | South City, East West, Onehunga West (and Henderson–Maungawhau off-peak overlay) |
| CRL preview timetables | **yes (future)** | S-C, E-W, O-W. Effective once CRL stations open |
| Public GTFS `route_short_name` / `route_id` | **yes (current)** | `STH-201`, `EAST-201`, `WEST-201`, `ONE-201` (`route_type=2`, agency AM / AT Metro). Colours: STH `D52923`; EAST `FDB913`; WEST `97C93D`; ONE `00AEEF`. Also `HUIA` (Waikato, out of v1). **No E-W / S-C / O-W rows in this 13 Aug 2026 feed.** Colours are feed metadata, not D1 print |

H2 conclusion: current passenger codes and GTFS codes already agree (STH/EAST/WEST/ONE). Clash is **macron vs ASCII**, **Station vs Train Station**, **Britomart leftover bus names vs Waitematā**, plus **CRL names present in GTFS stops before they are D1-live**. Do not generate published-network.json from `routes.txt`.

## C2/C3 to put in front of Jim

1. **Waitematā Station** is the locked hub string. Britomart is retired for rail. GTFS is still `Waitemata Train Station`.
2. **CRL is not open** on 24 Aug 2026. Do not emit Te Waihorotiu / Karanga-a-Hape / through-running East West as live D1. Flip after 13 Sep is a **new D1**, not a silent GTFS merge.
3. **Maungawhau closed now**, listed on future lines. Do not invent it on current WEST.
4. **Paerātā and Drury are live** (2 Aug 2026). **Ngākōroa is not.**
5. **Onehunga currently ends at Newmarket**, not Waitematā.
6. **Macrons**: Waitematā, Ōrākei, Ōtāhuhu, Rānui, Te Pāpapa, Paerātā vs GTFS ASCII.
7. **Manukau Train Station vs Manukau Bus Station**; Britomart bus parents vs Waitematā rail.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub PR.
