# Perth D1 official published-network pack (do not change Perth product)

Perth stays **live**. Do not edit the LiveTimes client. Do not edit `lib/providers/perth.js`, `lib/cities/perth/line-map.json`, or `lib/cities/perth/static-directions.js`. Do not flip other cities. No PR, no issues, no generator. Tim copies files if/when wanted. Jim may later align `line-map.json` to this oracle — that is Jim, not this pack.

Research pack is `/workspace/perth-pack/`:

- `published-network.json` (D1)
- `oracle-clash-report.md`
- `hazard-pack.md`
- `direction-model-memo.md`
- `jim-handoff-d1.md` (this file; the existing sweep `jim-handoff.md` is untouched)
- keep `perth-network-sweep.mjs` / `README.md` / `jim-handoff.md` as the D6 LiveTimes sweep drop-in

Drop later (Jim D2, if Tim asks): `qa/fixtures/perth/published-network.json`. Not a generated line-map.

## D1 oracle

Official Transperth System Map, Updated October 2025: https://www.transperth.wa.gov.au/Portals/0/SYSTEM%20MAP%20OCTOBER%202025.pdf (same bytes as the Byford Rail Extension System Map thumbnail on https://www.transperth.wa.gov.au/journey-planner/network-maps) plus passenger timetable PDF covers:

- Airport Line 13/10/2025
- Armadale Line 13/10/2025
- Ellenbrook Line 13/10/2025
- Fremantle Line 01/02/2026
- Mandurah Line 30/11/2025
- Midland Line 13/10/2025
- Thornlie-Cockburn Line 13/10/2025
- Yanchep Line 30/11/2025

Hand-transcribed. Not generated from GTFS. Not generated from line-map.json. Modes v1: TRAIN only. Timezone Australia/Perth, **no DST**.

## C2/C3

1. Lock **Perth**, **Perth Underground**, **Elizabeth Quay** as three strings. Do not collapse.
2. **Byford is open** (map + Armadale cover). Official name remains **Armadale Line**. Terminus Byford.
3. **Ellenbrook** is a printed line at Bayswater. doNotGroup vs High Wycombe.
4. **Airport–Fremantle through-running** is on the map and in the Fremantle **T** footnote; Airport booklet cover ends at Claremont.
5. **Thornlie-Cockburn** official outer terminus is **Cockburn Central**, not Mandurah.
6. Line-map is missing Alkimos, Eglinton, City West, West Leederville, Cottesloe, East Guildford; extra Perth Stn on Yanchep/Mandurah and extra Perth Underground Stn on the surface lines.

## H2

Live feed is Transperth LiveTimes XML, not GTFS. Do not edit the LiveTimes client. Clash names against line-map `* Stn` only.

## §3 rec

Line + terminus, matching current live product (e.g. Mandurah Line + Mandurah). Do not recommend inbound/outbound. Hold D5. Jim owns any later line-map alignment. Do not flip perth off live.
