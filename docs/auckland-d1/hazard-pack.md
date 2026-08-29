# Auckland hazard pack (H1–H7)

Evidence: AT train network maps page and current line PDFs retrieved 2026-08-24; Waitematā Station page 16/07/2026; CRL opening confirmed 13 Sep 2026; public GTFS 13 Aug 2026 (`20260806`–`20261129`).

## H1 — parent + child

GTFS `stops.txt`: 140 `location_type=1` parents, 6991 rows whole feed (bus/ferry mixed). Rail passengers print timetable names; GTFS rail parents are `* Train Station`.

doNotGroup: **Waitemata Train Station** vs bus parents **Britomart**, **Customs St/Britomart**, **Britomart Queens Arcade**, **Britomart Lower Albert**; **Manukau Train Station** vs **Manukau Bus Station** / **Manukau Station**; **Maungawhau Train Station** vs **Maungawhau Station** (bus); **Te Waihorotiu / Karanga-a-Hape** train vs bus parents; **Newmarket Train Station** vs Westfield Newmarket; **The Strand Train Station** (Te Huia) vs Waitematā.

## H3 — thin / event / overlay

- **CRL overlay from 13 Sep 2026**: whole network rebrand (S-C / E-W / O-W) and two new city stations. Not live D1.
- **Maungawhau / Mt Eden**: temporarily closed for CRL (Western timetable). Overlay, not a current stop.
- **Ngākōroa**: under construction / 2027.
- **Henderson–Maungawhau** on the 2026 in-carriage map: “runs all week except peak times” — future Onehunga West short, not a D1 line.
- **South City peak shorts** (preview): some trains finish at Waitematā. Future H5.
- **Rail-bus overlays** (e.g. n44gnojn Southern 27–28 Sep 2025) are not the all-stops oracle.
- **Te Huia** Strand: regional overlay, out of v1.
- **AirportLink** at Puhinui: bus, out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Newmarket | Southern + Western to Waitematā via Parnell vs Onehunga terminating here | Maps index; ONE page |
| Penrose | Southern (Ellerslie–Newmarket) vs Onehunga (Te Pāpapa–Onehunga) | ONE via Penrose and Ellerslie; Southern via Penrose |
| Ōtāhuhu / Puhinui | Southern continues Penrose vs Eastern via Sylvia Park | Shared south-east corridor |
| Waitematā | Eastern vs Southern vs Western (no through-run until CRL) | Waitematā page: all lines except Onehunga terminate here today |

No city loop in the **current** product. CRL South City will loop Newmarket–Grafton–Karanga-a-Hape–Te Waihorotiu–Waitematā–Parnell–Newmarket — that is a **future** H4, not D1.

## H5 — nested short turns

Current D1: no official nested codes like Adelaide GAW/SALIS. ONE is a full line that simply does not reach Waitematā.

Future (notes only): Onehunga West peak Maungawhau vs off-peak Henderson; East West extra Sylvia Park–Kingsland at peak; South City some peak finish Waitematā.

## H6 — inner city (where §3 lives)

Locked set: **Waitematā Station**. Shared Newmarket–Parnell on Southern and Western. Grafton is Western-only today (Southern uses Parnell, not Grafton). Onehunga never reaches the hub.

This is a **hub**, not a through-run, until 13 Sep 2026. After CRL, Waitematā becomes a through station — §3 must not freeze inbound/outbound vs CBD.

## H7 — DST

**Pacific/Auckland observes DST (NZDT/NZST).** Do not copy Brisbane H7. Wall-clock in GTFS is Auckland local. Agency timezone in GTFS `agency.txt` is `Pacific/Auckland`.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Britomart bus vs Waitematā rail | Retired rail name still on bus parents |
| Waitemata (no macron, Train Station) vs Waitematā Station | GTFS vs lock |
| Manukau Bus Station vs Manukau Train Station | Two modes |
| Maungawhau Station (bus) vs Maungawhau Train Station | Two modes; rail currently closed |
| Mount Eden vs Maungawhau | Old vs gifted name |
| Te Waihorotiu / Karanga-a-Hape | Not passenger-open as of 24 Aug 2026 |
| The Strand vs Waitematā | Te Huia vs Metro |
| Te Pāpapa vs Te Papapa | Macron |
| Takanini vs Takaanini | 2017 map vs 2026 timetable |
| Ngākōroa vs Drury | Different stations; Ngākōroa not open |
| East West vs Eastern+Western | Future merge, not current D1 |
| Onehunga vs Onehunga West | Future extension to Henderson/Maungawhau |

## What I did not do

No generator, no assertion tables, no live city flip.
