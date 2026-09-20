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

## License

- **License name:** WMATA Developer License Agreement / Transit Data licence (developer.wmata.com).
- **Redistribution / rehosting:** Limited, non-exclusive, non-assignable, non-transferable, non-sublicensable, revocable licence to download, use, reproduce, and redistribute Transit Data *within your Application*. API access is similarly limited and non-sublicensable.
- **Commercial use:** Currently no licence fee; WMATA may charge later. Serving riders in a commercial app is not prohibited on the face of the terms; sublicensing the feed is.
- **Attribution:** WMATA Transit Information must appear in legible bold print on the same page, close to the data: "WMATA Transit information provided on this …" (full sentence on the WMATA Developer License Agreement page).
- **Terms URL:** https://developer.wmata.com/license and https://www.wmata.com/about/developers/WMATA-Developer-License-Agreement.cfm
- **Confidence:** `clear` that a key is required for GTFS/API portal access; `clear` that redistribution is in-app only / non-sublicensable.
- **Keyed feeds:** Registration + API key required. Account terms govern, not a public-domain dump.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier). A service passing both is marked `in` and appears on boards.

**Services calling at in-catalog Metrorail stations:**

**MARC (Penn, Brunswick, Camden Lines) at Union Station, Rockville, Silver Spring, New Carrollton:** Both walk-up tests pass. MARC offers walk-up tickets at Quik-Trak machines and ticket agents at each station, and no seats require compulsory reservations (first-come-first-served seating). Platform access has no check-in cutoff or border control. Verdict: **`out-product`** — v1 ships on WMATA's own prediction API only; MARC needs a separate agency real-time feed and provider relationship that is not justified before launch. Revisit post-launch. (Tim, 20 Sep 2026) ([MARC tickets](https://www.mta.maryland.gov/MARC_for_Metro); real-time via MARC Tracker).

**VRE (Fredericksburg & Manassas Lines) at Union Station, L'Enfant Plaza, Franconia-Springfield:** Both walk-up tests pass. VRE requires ticket validation before boarding, but tickets are purchased at stations with walk-up availability and no seat reservations are compulsory; seating is unreserved and first-come-first-served. Platform access has no check-in barrier. Verdict: **`out-product`** — same reason; VRE is also peak-direction weekday-only. Revisit post-launch. (Tim, 20 Sep 2026) ([VRE fares and tickets](https://www.vre.org/service/fares-and-tickets/); real-time via Transit app integration).

**Amtrak Northeast Regional at Union Station, New Carrollton:** Verdict: **`out-reservation`** — coach is reserved (a ticket is a reservation for a specific train), so test 1 fails. *Controller correction, 20 Sep 2026: the first Nico pass argued `in` here; that contradicted the Boston pass and Amtrak's reserved-seating policy, and the table row below was corrected in #409. US packs disagree with each other on this service (`in` / `out-product` / `out-reservation`); the single authoritative verdict is to be recorded in `docs/united-states-ledger.md`.* ([Amtrak reserved seating](https://www.amtrak.com/reserved-seating))

**Amtrak other services (Acela Express, Capitol Limited, Cardinal, Crescent, Silver Meteor, Silver Star, Vermonter, Carolinian, Palmetto) at Union Station and other stations:** Test 1 fails. These services are all-reserved or have compulsory seat reservations ([Amtrak seat assignments](https://www.amtrak.com/reserved-seating)). Riders cannot board walk-up with a standard ticket; a reserved seat must be purchased in advance or with fare premium at the station. Verdict: **`out-reservation`** ([Amtrak reserved seating](https://www.amtrak.com/seats-cabins/acela-seats/)).

**Maryland Purple Line (planned service, opening late 2027/early 2028):** Not yet operational as of the report date (29 Aug 2026). Future planned light rail service connecting to College Park and other Metrorail stations; verdict pending operational launch. No verdict recorded (service not currently calling at in-catalog stations).

**DC Streetcar (historical service, ended 31 Mar 2026):** Service no longer operational as of the report date (29 Aug 2026). Previously offered free walk-up boarding on the H Street/Benning Road line, but shut down before this report. No verdict recorded (service not currently calling at in-catalog stations).

| Service | Calls at in-catalog stations | Walk-up? | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|---|
| **MARC (Penn, Brunswick, Camden Lines)** | Union Station, Rockville, Silver Spring, New Carrollton | Yes (Quik-Trak, agents) | No (first-come-first-served) | No | `out-product` (Tim, 20 Sep 2026 — separate feed not justified before launch, revisit post-launch) | [MARC tickets and service](https://www.mta.maryland.gov/MARC_for_Metro); [Union Station ticketing](https://www.unionstationdc.com/rail/) |
| **VRE (Fredericksburg & Manassas Lines)** | Union Station, L'Enfant Plaza, Franconia-Springfield | Yes (tickets at station) | No (unreserved seating) | No | `out-product` (Tim, 20 Sep 2026 — same reason, also peak-direction weekday-only; revisit post-launch) | [VRE fares and tickets](https://www.vre.org/service/fares-and-tickets/); [VRE stations](https://www.vre.org/stations/) |
| **Amtrak Northeast Regional** | Union Station, New Carrollton | No (reserved coach) | Yes (all-reserved; a ticket is a reservation for a specific train) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating). Corrected by controller 20 Sep 2026 — Nico's first pass said `in`; the Boston pass and Amtrak's policy both say all-reserved. |
| **Amtrak Acela Express** | Union Station | No (reserved-only service) | Yes (all-reserved) | No | `out-reservation` | [Acela seats](https://www.amtrak.com/seats-cabins/acela-seats/); all seats reserved |
| **Amtrak Capitol Limited** | Union Station | No (reserved-only service) | Yes (long-distance all-reserved) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating); all seats include reservations |
| **Amtrak Cardinal** | Union Station | No (reserved-only service) | Yes (long-distance all-reserved) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating); all seats include reservations |
| **Amtrak Crescent** | Union Station | No (reserved-only service) | Yes (long-distance all-reserved) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating); all seats include reservations |
| **Amtrak Silver Meteor** | Union Station | No (sleeper/reserved service) | Yes (sleeper cars compulsory) | No | `out-reservation` | [Amtrak sleeping cars](https://www.amtrak.com/reserved-seating); sleeper accommodations require reservation |
| **Amtrak Silver Star** | Union Station | No (sleeper/reserved service) | Yes (sleeper cars compulsory) | No | `out-reservation` | [Amtrak sleeping cars](https://www.amtrak.com/reserved-seating); sleeper accommodations require reservation |
| **Amtrak Vermonter** | New Carrollton | No (reserved-only service) | Yes (all-reserved) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating); all seats include reservations |
| **Amtrak Carolinian** | Union Station | No (reserved-only service) | Yes (all-reserved) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating); all seats include reservations |
| **Amtrak Palmetto** | New Carrollton | No (reserved-only service) | Yes (all-reserved) | No | `out-reservation` | [Amtrak reserved seating](https://www.amtrak.com/reserved-seating); all seats include reservations |

**Summary for Jim and Luke:**
1. v1 excludes **MARC and VRE** regional commuter rail at in-catalog stations — both pass the walk-up tests but are `out-product` (Tim, 20 Sep 2026: separate agency feed/provider relationship not justified before launch; revisit post-launch). Amtrak Northeast Regional is `out-reservation` (controller correction, 20 Sep 2026 — see above).
2. v1 excludes all other **Amtrak services** (`out-reservation`: Acela, Capitol Limited, Cardinal, Crescent, Silver Meteor/Star, Vermonter, Carolinian, Palmetto) which require advance reservations.
3. **Stations with overlapping rail services:**
   - **Union Station (Red Line):** MARC (three lines) + VRE; all Amtrak services excluded (`out-reservation`).
   - **L'Enfant Plaza (Orange/Blue/Silver, Green, Yellow):** VRE only (no MARC or Amtrak).
   - **Rockville (Red Line):** MARC Brunswick only.
   - **Silver Spring (Red Line):** MARC Brunswick only.
   - **New Carrollton (Orange, Silver):** MARC Penn.
   - **Franconia-Springfield (Blue):** VRE Manassas only.
4. **doNotGroup implications:** Union Station boards must show Metro platforms separately from MARC/VRE/Amtrak platforms. L'Enfant Plaza must show Metro separately from VRE. New Carrollton must show Metro separately from MARC and Amtrak. Different operators, different line codes, different infrastructure.
5. **No other operators call at in-catalog Metrorail stations.** DC Streetcar (ended 31 Mar 2026) and Maryland Purple Line (opening late 2027, not yet operational) are out of scope for current v1 catalog.

**Controller note (20 Sep 2026):** MARC and VRE pass both walk-up tests and come from feeds other than WMATA's API — resolved `out-product`, Tim 20 Sep 2026 (see docs/united-states-ledger.md). Revisit post-launch.
