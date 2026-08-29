# BART oracle clash report

D1 (published, as of 29 Aug 2026): [System Map](https://www.bart.gov/system-map) **detailed connecting-rail plate** [BART-Detailed-Map-Web.pdf](https://www.bart.gov/sites/default/files/2025-01/BART-Detailed-Map-Web.pdf) (PDF title **BART Website Map PDF Format**, Last-Modified **Mon, 13 Jan 2025 08:02:35 GMT** = Mon 13 Jan 2025 16:02 PT, printed **© BART 2025**). Stations arrays **hand-transcribed** from rendered map images (`sources/bart-map-1.png` + `sources/crop-*.png` + the 5-line PNG). Official [stations](https://www.bart.gov/stations) index and [August 10, 2026 line timetable PDFs](https://www.bart.gov/schedules/pdfs) are ordered-stop support only. **Not generated from GTFS.** Not generated from the Legacy API. Map printed names win.

Supporting official pages (tokens / termini, not the stop-name oracle):

- 5-line daytime PNG: [BART-system-map-everyday-until-9pm.png](https://www.bart.gov/sites/default/files/2025-01/BART-system-map-everyday-until-9pm.png) (Last-Modified 13 Jan 2025 08:01:22 GMT)
- Evening 3-line PNG: [BART-system-map-9pm-to-midnight.png](https://www.bart.gov/sites/default/files/2025-01/BART-system-map-9pm-to-midnight.png) (Last-Modified 13 Jan 2025 08:02:11 GMT)
- Stations index: [bart.gov/stations](https://www.bart.gov/stations) (50 names including Oakland International Airport)
- Line timetable index: [bart.gov/schedules/pdfs](https://www.bart.gov/schedules/pdfs) (schedule as of 10 Aug 2026)

Hub lock: **Embarcadero** (first downtown SF stop after the Transbay Tube; Yellow/Blue/Green/Red). The map prints Embarcadero / Montgomery St / Powell St / Civic Center/UN Plaza as an **equal four-stop downtown SF trunk**, not a single named transfer diamond. **Powell St is not the lock** (Muni/cable-car mix). Orange never calls Embarcadero.

H2 clash surface (after transcription): **no** product `lib/cities/bart/`. Clash is **map-vs-stations-page**. Zero mix-in with chicago / washington / rotterdam / perth. Not GTFS. Muni / Caltrain / ACE / Capitol Corridor / VTA / ferry out of v1 oracle.

## Station name table

Match rule: published D1 string (detailed system map) vs official stations-index token. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Embarcadero | Stations **Embarcadero** | **match (lock)**. Do not use Downtown / SF / Powell / Civic Center as a hub token. |
| Montgomery St | Stations **Montgomery St.** | **rename (map drops the period)**. Locked to map **Montgomery St**. |
| Powell St | Stations **Powell St.** | **rename (map drops the period)**. Not the hub lock. Muni mix. |
| Civic Center/UN Plaza | Stations **Civic Center / UN Plaza** | **rename (map slash, no spaces)**. Not the lock. |
| 12th St/Oakland City Center | Stations **12th St. Oakland City Center** | **rename (map slash)**. Not 19th St/Oakland. Green/Blue never call here. |
| 19th St/Oakland | Stations **19th St. Oakland** | **rename**. Timed transfer northbound. |
| 16th St Mission | Stations **16th St. Mission** | **rename (map drops the period)**. |
| 24th St Mission | Stations **24th St. Mission** | **rename**. Do not collapse into 16th. |
| Berryessa/North San José | Stations **Berryessa / North San Jose**; timetable **Berryessa/N San Jose** | **rename (map accent + tight slash)**. Locked to map **Berryessa/North San José**. |
| San Francisco International Airport (SFO) | Stations **San Francisco International Airport**; legend **SFO Int’l Airport** | **rename (map keeps (SFO))**. Yellow daytime far end. Not Red on this map. |
| Oakland International Airport (OAK) | Stations **Oakland International Airport**; legend **Oakland Int’l Airport** | **rename (map keeps (OAK))**. OAK Airport line. |
| Dublin/Pleasanton | Stations **Dublin / Pleasanton** | **rename (map tight slash)**. Not West Dublin/Pleasanton. |
| West Dublin/Pleasanton | Stations **West Dublin / Pleasanton** | **rename**. Two places. |
| Warm Springs/South Fremont | Stations **Warm Springs / South Fremont** | **rename**. |
| Pittsburg/Bay Point | Stations **Pittsburg / Bay Point** | **rename**. eBART transfer platform is east of here — not a named station. |
| Pittsburg Center | Stations **Pittsburg Center** | **match**. Yellow / eBART. Not Pittsburg/Bay Point. |
| Pleasant Hill/Contra Costa Centre | Stations **Pleasant Hill / Contra Costa Centre** | **rename**. |
| North Concord/Martinez | Stations **North Concord / Martinez** | **rename**. |
| El Cerrito del Norte | Stations **El Cerrito del Norte** | **match**. |
| Millbrae | Stations **Millbrae**; Caltrain icon | **match**. Red far end + Yellow evening / dashed SFO–Millbrae. Not a Caltrain D1 stop. |
| Coliseum | Stations **Coliseum**; Capitol Corridor + OAK icons | **match**. Orange/Blue/Green + OAK transfer. Not Amtrak. |
| Irvington | Map **Irvington (PLANNED FUTURE STATION)** | **not inserted**. Between Fremont and Warm Springs/South Fremont. |
| 28th St/Little Portugal / Downtown San José / Diridon / Santa Clara | Map Future Service (gray) | **not inserted**. Phase II. Not 2026 openings. |
| All other D1 names in published-network.json | same map / stations primary | match |

**50** unique D1 passenger stops (shared-transfer nest counted once; no same-name different-line places). Product `lib/cities/bart/` is **absent**. **Zero** mix-in with chicago / washington / rotterdam / perth / any other city file.

## H2 — who has line codes today

| surface | Yellow/Blue/Green/Red/Orange (+ OAK)? | what it actually has |
| --- | --- | --- |
| Detailed system map (D1) | **yes (colors + OAK legend)** | Five color lines. OAK Airport in the same BART service legend (gray / plane). Evening 3-line overlay. eBART prints as Yellow. No Muni/Caltrain/ACE as D1 lines. |
| 5-line / 3-line PNGs | **yes (same plate)** | Daytime 5-line; evening Yellow flips to Millbrae; Red/Green no service after 9pm. |
| Stations index | **station list only** | 50 names. No color line columns. Periods / spaced slashes. |
| August 10 2026 timetable PDFs | **yes (line titles)** | Yellow Antioch–SFO; Blue Dublin/Pleasanton–Daly City; Green Berryessa–Daly City; Orange Berryessa–Richmond; Red Richmond–Millbrae (weekend file +SFO). No OAK PDF. |
| Product `lib/cities/bart/` | **absent** | No bart stations.json / line-map.json. `assertCityLive("bart")` is Unknown city |
| Legacy API / GTFS | not used as D1 | Key later, not a D1 blocker. Not this H2 stop-order surface |

H2 conclusion: five color lines already agree (map + timetable titles). Clash is **map slash/accent vs stations-page periods/spaces**, **Red +SFO weekend timetable vs map Red–Millbrae**, **SFO as Yellow not Red**, and **no product bart file**. OAK is on the map legend and the 50-station index. Do not generate published-network.json from GTFS or from any other city. Do not invent city=sf / san-francisco / bay-area. Do not merge with chicago or washington.

## C2/C3 to put in front of Jim

1. **city=bart**, not `sf`, not `san-francisco`, not `bay-area`. Do not invent city=oakland / sfo. Do not merge into chicago or washington.
2. **Embarcadero** is the locked inner-city hub (first downtown SF stop; Yellow/Blue/Green/Red). **Powell St is not the lock.** The four-stop downtown SF trunk is structure, not a hub token.
3. **doNotCollapse** Embarcadero vs Montgomery St vs Powell St vs Civic Center/UN Plaza vs 16th St Mission vs 24th St Mission.
4. **doNotCollapse** 12th St/Oakland City Center vs 19th St/Oakland vs West Oakland vs Lake Merritt. Green/Blue skip 12th/19th. Orange skips West Oakland and all of SF. Red/Yellow skip Lake Merritt.
5. **doNotCollapse** Dublin/Pleasanton vs West Dublin/Pleasanton; Pittsburg/Bay Point vs Pittsburg Center; SFO vs OAK; Berryessa/North San José vs (future) Downtown San José.
6. **Yellow** daytime far end is **SFO**. Evening far end is **Millbrae** (dashed SFO–Millbrae; after 9pm change at SFO). eBART Antioch + Pittsburg Center print as Yellow.
7. **Red** is Richmond–Millbrae on this map. Does not enter the SFO spur. Weekend +SFO timetable is overlay.
8. **Orange** is East Bay only. Never label an Orange train “to Embarcadero” or “to SF”.
9. **OAK Airport** is the gray BART-to-OAK people-mover, listed in the BART service legend — included. No ETD. No PDF.
10. **America/Los_Angeles HAS DST.** Do not copy Perth / Brisbane no-DST.
11. Modes v1: **BART only**. No Muni / Caltrain / ACE / Capitol Corridor / VTA / ferry leak.
12. Irvington and Phase II stay out. No 2026 opening is printed as open.
13. Developer key later. Not a D1 blocker. Never paste a key.
14. Cut #1 is Rotterdam only. Chicago and Washington stay planned and untouched. This pack stays **planned**.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Perth edit, no Chicago/Washington edit, no GTFS-derived station arrays, no invent city=sf / san-francisco / bay-area, no call to the live API with a real key, no API key in any research file, no mix-in with chicago/washington/rotterdam.

## License

- **License name:** BART Developer License Agreement.
- **Redistribution / rehosting:** Non-exclusive, limited, revocable rights to use, reproduce, and redistribute BART Data. BART retains title/ownership. No official BART trademarks or copyrighted system map in association with the Data (editable CC-BY map is separate).
- **Commercial use:** Not prohibited on the face of the DLA. Open Data Policy says published datasets are placed into the public domain — that policy vs the DLA is a Tim judgment; DLA is the click-wrap for the GTFS permalink.
- **Attribution:** DLA does not require specific wording. GTFS page asks for a shout-out / link back. Transitland: use allowed without attribution = Yes.
- **Terms URL:** https://www.bart.gov/schedules/developers/developer-license-agreement
- **Confidence:** `clear` on DLA redistribute; `unclear` whether Open Data Policy "public domain" overrides the DLA.
- **Keyed feeds:** Static GTFS permalink needs no registration. Legacy API has a public key plus optional registered keys.
