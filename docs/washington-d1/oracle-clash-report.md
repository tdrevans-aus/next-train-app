# Washington, D.C. oracle clash report

D1 (published, as of 29 Aug 2026): [Maps and Schedules](https://www.wmata.com/ride/maps.html) **Metro Rail System Map** [system-map-rail.pdf](https://www.wmata.com/content/dam/wmata-com/maps/system-map-rail.pdf) (PDF title **Metro Rail System Map**, subject **Metrorail System Map - Jan 2026**, HTTP Last-Modified **Sat, 18 Apr 2026 13:04:09 GMT** = Sat 18 Apr 2026 21:04 PT). `https://www.wmata.com/schedules/maps/` 301s to the same index. Stations arrays **hand-transcribed from map images** (`sources/metro-map-1.png` + `sources/crop-*.png`). `pdftotext -bbox` is layout-scrambled and was **not** used to build stations[]. **Not generated from GTFS.** Not generated from developer.wmata.com. No API key used.

Legend terminal stations (large type on the map):

- **Red Line** • Glenmont / Shady Grove — **27**
- **Yellow Line** • Huntington / Mt Vernon Sq & Greenbelt — **22** (solid to Mt Vernon Sq; dashed every-other-train to Greenbelt)
- **Green Line** • Branch Av / Greenbelt — **21**
- **Orange Line** • New Carrollton / Vienna — **26** (printed stop **Vienna/Fairfax-GMU**)
- **Silver Line** • Ashburn / Downtown Largo & New Carrollton — **34** on the Ashburn–Downtown Largo path; New Carrollton is the second east end (shared Orange east of Stadium-Armory)
- **Blue Line** • Franconia-Springfield / Downtown Largo — **28**

Six color lines. Map circles **R O B S G Y**. No seventh. **98** unique passenger-open Metrorail stops after dedupe.

Supporting official line pages (rider-tools live boards, **not** ordered timetable columns; map still wins): [red](https://www.wmata.com/ridertools/line/red), [orange](https://www.wmata.com/ridertools/line/orange), [blue](https://www.wmata.com/ridertools/line/blue), [silver](https://www.wmata.com/ridertools/line/silver), [green](https://www.wmata.com/ridertools/line/green), [yellow](https://www.wmata.com/ridertools/line/yellow). Hub page [Metro Center](https://www.wmata.com/ridertools/station/metro-center).

Hub lock: **Metro Center** (Red × Orange/Blue/Silver transfer; rider-tools title Metro Center). Not Gallery Place, not Union Station, not L'Enfant Plaza.

H2 clash surface (after transcription): **no** product `lib/cities/washington/`. Clash is **map vs rider-tools / historic rename** plus **doNotCollapse pairs on the same map**. Not GTFS. Metrobus / Streetcar / MARC / VRE / Amtrak out of v1 oracle.

## Station name table

Match rule: published D1 string (system map) vs rider-tools / historic print. `rename` = same place, different printed string. Map wins.

| published (D1) | other print | class |
| --- | --- | --- |
| Metro Center | Rider-tools **Metro Center**; parent grouping STN_A01_C01 | **match (lock)**. Do not use Gallery Place / Union Station / L'Enfant Plaza / Downtown / DC / Capitol / Washington. doNotGroup Red A01 vs Orange/Blue/Silver C01. |
| Gallery Place-Chinatown | Map **Gallery Place** + **Chinatown**; boards often **Gallery Pl-Chinatown** | **rename (Place vs Pl)**. Locked to map **Gallery Place**. **Not Metro Center.** |
| Farragut North | Map + Red only | **lock pair**. **Not Farragut West.** Two stations, two streets. |
| Farragut West | Map + Orange/Blue/Silver only | **lock pair**. **Not Farragut North.** |
| Downtown Largo | Map legend + Blue/Silver terminus circle **Downtown Largo**; boards often **Largo**; historic **Largo Town Center** | **rename**. Locked to map **Downtown Largo**. Zero Largo Town Center on this map. |
| Ashburn | Map Silver far-west circle **Ashburn** | **match**. Wiehle-Reston East is a through stop, not the far end. |
| Potomac Yard-VT | Map **Potomac Yard** + subtitle **VT** | **joined two-line label**. On the map (Blue/Yellow). Inserted. |
| West Falls Church-VT | Map **West Falls Church** + subtitle **VT** | **joined**. Map does **not** print UVA. Do not restore West Falls Church-VT/UVA. |
| Woodley Park-Zoo/Adams Morgan | Map **Woodley Park** + **Zoo/Adams Morgan** | joined two-line label |
| Rhode Island Av-Brentwood | Map **Rhode Island Av** + **Brentwood** | joined. **Av** family (not Ave). |
| Addison Rd-Seat Pleasant | Map **Addison Rd** + **Seat Pleasant** | joined |
| U St/African-Amer Civil War Mem'l/Cardozo | Map **U St** + **African-Amer Civil War Mem'l/Cardozo** | joined. Map prints **Mem'l**, not Memorial. |
| Mt Vernon Sq/7th St-Convention Center | Map **Mt Vernon Sq** + **7th St-Convention Center** | joined. Yellow solid short + Green through. |
| Archives-Navy Mem'l-Penn Quarter | Map **Archives** + **Navy Mem'l-Penn Quarter** | joined |
| Vienna/Fairfax-GMU | Map **Vienna** + **Fairfax-GMU**; legend **Vienna** | joined. Legend short; stop string is the two-line label. |
| Dunn Loring-Merrifield | Map **Dunn Loring** + **Merrifield** | joined |
| Grosvenor - Strathmore | Map primary with spaces around the hyphen | **lock map spacing**. Not Grosvenor-Strathmore collapsed. |
| North Bethesda | Historic **White Flint** | **rename**. Map prints **North Bethesda**. |
| Hyattsville Crossing | Historic **Prince George's Plaza** | **rename**. Map prints **Hyattsville Crossing**. |
| Tysons | Historic **Tysons Corner** | **rename**. Map prints **Tysons**. |
| Foggy Bottom-GWU | Map subtitle **Kennedy Center** (landmark only) | **not joined**. Stop string is Foggy Bottom-GWU. |
| Smithsonian | Map subtitle **National Mall** (landmark only) | **not joined**. Stop string is Smithsonian. |
| Georgia Av-Petworth | Map **Av** family (Rhode Island Av, Minnesota Av, Southern Av, Branch Av, Eisenhower Av, Potomac Av) | match map **Av**, not Ave. |
| Washington Dulles International Airport | Map long form + airplane icon | match. Not Dulles, not IAD as the stop string. |
| Ronald Reagan Washington National Airport | Map long form + airplane icon | match. Not National Airport, not DCA as the stop string. |
| L'Enfant Plaza | Map transfer; VRE icon | match. **Not the hub lock.** doNotGroup metro vs VRE. |
| Union Station | Map Red; MARC / Amtrak / VRE icons | match. **Not the hub lock.** doNotGroup metro vs MARC/VRE/Amtrak. |
| All other D1 names in published-network.json | same map print | match |

**98** unique D1 names. Product `lib/cities/washington/` **absent**. `assertCityLive("washington")` is Unknown city.

## H2 — who has line codes today

| surface | R/O/B/S/G/Y? | what it actually has |
| --- | --- | --- |
| Metro Rail System Map (D1) | **yes** | Legend circles R O B S G Y with termini pairs including Silver **Ashburn / Downtown Largo & New Carrollton** and Yellow **Huntington / Mt Vernon Sq & Greenbelt** |
| Rider-tools line boards (support) | **yes** | Color names Red/Orange/Blue/Silver/Green/Yellow. Destination tokens currently include overlay shorts (Friendship Heights on Red). Map still locks Shady Grove–Glenmont. Boards often print **Largo** not Downtown Largo. |
| Product `lib/cities/washington/` | **absent** | No washington stations.json / line-map.json. `assertCityLive("washington")` is Unknown city |
| developer.wmata.com Station Prediction | not used as D1 | Empty-key **401** on 29 Aug 2026. Key later (Auckland pattern). Not a D1 generator. Not a D1 blocker. |
| GTFS / GTFS-RT | **not used** | Portal-keyed. Not a D1 source. Stations[] were not built from GTFS. |

H2 conclusion: passenger colors on the map already agree (Red Orange Blue Silver Green Yellow). Clash is **Downtown Largo vs Largo vs Largo Town Center**, **Gallery Place vs Gallery Pl**, **Farragut North vs Farragut West**, **historic renames** (White Flint / Prince George's Plaza / Tysons Corner), and **no product washington file**. Do not generate published-network.json from GTFS. Do not invent city=dc.

## C2/C3 to put in front of Jim

1. **city=washington**, displayName **Washington, D.C.** Not `dc`, not `washington-dc`, not `wmata`, not `us`. Do not merge into any other Next Train city.
2. **Metro Center** is the locked inner-city hub (Red × Orange/Blue/Silver). Not Gallery Place, not Union Station, not L'Enfant Plaza.
3. **Farragut North ≠ Farragut West.** **Metro Center ≠ Gallery Place-Chinatown.** Do not collapse.
4. **Downtown Largo** (map). Not Largo Town Center. Boards saying Largo are a rename.
5. **Silver far end is Ashburn.** Wiehle-Reston East is a through stop. Silver second east end is **New Carrollton** (legend &).
6. **Potomac Yard-VT is on the map** (Blue/Yellow). Inserted.
7. **Yellow** solid ends at Mt Vernon Sq; dashed every-other-train continues to Greenbelt. Yellow does **not** serve Arlington Cemetery or Rosslyn.
8. **Modes v1: WMATA Metrorail only.** No Metrobus, Streetcar, MARC, VRE, Amtrak.
9. **America/New_York HAS DST.** Do not copy Perth / Brisbane no-DST.
10. **developer.wmata.com key later.** Empty-key 401. Not a D1 blocker. Never paste a key. Product child stopIds stay out of this file.
11. Cut #1 is Rotterdam only. This pack stays **planned**. `assertCityLive("washington")` must fail.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=dc, no API key, no post.
