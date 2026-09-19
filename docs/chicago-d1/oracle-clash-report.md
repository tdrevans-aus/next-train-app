# Chicago oracle clash report

D1 (published, as of 29 Aug 2026): [Maps](https://www.transitchicago.com/maps/) **‘L’ (rail) system diagram** [ctamap_Lsystem.pdf](https://www.transitchicago.com/assets/1/6/ctamap_Lsystem.pdf) (PDF title **[FE-7861-R31] P19 L (rail) system diagram WEB**, Last-Modified **11 Aug 2026 19:34:54 GMT**, form code **FE-7861-R31**). Stations arrays **hand-transcribed** from rendered map images plus official line-page `rld-stopname` columns as ordered-stop support. **Not generated from GTFS.** Not generated from Train Tracker. Map printed names win.

Supporting official pages (ordered stops / tokens, not the stop-name oracle):

- Line pages: [red](https://www.transitchicago.com/redline/) [blue](https://www.transitchicago.com/blueline/) [brown](https://www.transitchicago.com/brownline/) [green](https://www.transitchicago.com/greenline/) [orange](https://www.transitchicago.com/orangeline/) [pink](https://www.transitchicago.com/pinkline/) [purple](https://www.transitchicago.com/purpleline/) [yellow](https://www.transitchicago.com/yellowline/)
- Brochures index: [brochures](https://www.transitchicago.com/brochures/) still links the older [ctamap_LMap.pdf](https://www.transitchicago.com/assets/1/6/ctamap_LMap.pdf) (Last-Modified 5 Aug 2024). Not the D1 plate.
- Bus+rail brochure: [ctamap_SystemMap.pdf](https://www.transitchicago.com/assets/1/6/ctamap_SystemMap.pdf) (Last-Modified 7 Aug 2026). Support only.

Hub lock: **Clark/Lake** (map Blue × Brown/Green/Orange/Pink/Purple transfer on the Loop rectangle). **The Loop** is the structure / region label, not a station. Not State/Lake, not Washington/Wabash, not Lake, not Downtown.

H2 clash surface (after transcription): **no** product `lib/cities/chicago/`. Clash is **map-vs-line-page**. Zero mix-in with washington / rotterdam. Not GTFS. Bus / Metra / Pace / South Shore out of v1 oracle.

## Station name table

Match rule: published D1 string (system diagram) vs official line-page `rld-stopname`. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Clark/Lake | Line pages **Clark/Lake** | **match (lock)**. Do not use Downtown / The Loop / Loop as a hub token. |
| State/Lake | Pages **State/Lake** + *Station temporarily closed*; alert closed into **2029** (use Clark/Lake or Washington/Wabash) | **match (printed; overlay closed)**. Kept. Not the hub lock. |
| Library | Pages **Harold Washington Library-State/Van Buren**; Metra LaSalle Street icon | **rename (short map)**. Locked to map **Library**. Not a Metra stop. |
| Washington/Wabash | Pages **Washington/Wabash**; Metra/South Shore Millennium icon | **match**. Not Blue **Washington**. Not **Washington/Wells**. Not Millennium Station. |
| Washington | Blue page **Washington**; Red page has **no** Washington (Lake→Monroe) | **match (Blue only)**. Map Red-side Washington is the out-of-system transfer annotation (legend: accessible transfer Washington/Wabash ‘L’ ↔ Lake Red subway). Not inserted on Red. |
| Lake | Red page **Lake** | **match**. Not Clark/Lake. Not State/Lake. |
| Harlem | Blue page **Harlem (O'Hare Branch)** / **Harlem (Forest Park Branch)**; Green **Harlem/Lake** | **rename (page branch suffix)**. Map prints **Harlem** twice on Blue and **Harlem/Lake** on Green. Three places. |
| Western | Blue page **Western (O'Hare Branch)** / **Western (Forest Park Branch)**; also Brown, Pink, Orange | **rename (page branch suffix)**. Map prints **Western**. Five places. |
| Merchandise Mart | Pages **Merchandise Mart** | **match**. Not a direction token. |
| Damen (Green) | Green page **Damen** StopId 150 between California and Ashland | **match**. On this map. Distinct from Blue / Brown / Pink Damen. |
| King Drive | Green page *Harlem-bound boarding, only*; map **Harlem-bound only** | **match**. One-way boarding. |
| Dempster-Skokie | Yellow page **Dempster-Skokie** | **match**. Not Purple **Dempster**. |
| Oakton-Skokie | Yellow page **Oakton-Skokie** | **match**. |
| 95th/Dan Ryan | Red page **95th/Dan Ryan**; map dotted extension 103rd / 111th / Michigan / 130th | **match**. Extension is under construction — not inserted. |
| Quincy | Pages **Quincy** + Union Station Metra/Amtrak icon | **match**. ‘L’ stop. Not Union Station (Metra). |
| LaSalle/Van Buren | Pages **LaSalle/Van Buren** + LaSalle Street Metra icon | **match**. Not Blue **LaSalle**. Not LaSalle St Metra. |
| Washington/Wells | Pages **Washington/Wells** + Ogilvie icon | **match**. Not Ogilvie. |
| Conservatory-Central Park Drive | Green page same | **match**. |
| Illinois Medical District | Blue page same | **match**. Not “Medical Center”. |
| UIC-Halsted | Blue page same | **match**. |
| Kedzie-Homan | Blue page same | **match**. Not the several **Kedzie**. |
| Sox-35th | Red page **Sox-35th** | **match**. |
| 35th-Bronzeville-IIT | Green page same | **match**. |
| 35th/Archer | Orange page same | **match**. |
| 54th/Cermak | Pink page same | **match**. |
| Cermak-Chinatown / Cermak-McCormick Place | Red / Green pages | **match**. Two places. |
| All other D1 names in published-network.json | same map / page primary | match |

**143** unique D1 passenger stops (shared-transfer nest counted once; same-name different-line counted separately). Product `lib/cities/chicago/` is **absent**. **Zero** mix-in with washington / rotterdam / perth / any other city file.

## H2 — who has line codes today

| surface | Red/Blue/Brown/Green/Orange/Pink/Purple/Yellow? | what it actually has |
| --- | --- | --- |
| ‘L’ (rail) system diagram (D1) | **yes (colors)** | Eight color lines. Purple dashed = rush Express. Green two south branches labeled. No Metra/Pace/bus as D1 lines. |
| Official line pages | **yes (live pages)** | Color line titles + `rld-stopname` columns. Library long form. Blue branch suffixes. State/Lake closed callout. |
| Product `lib/cities/chicago/` | **absent** | No chicago stations.json / line-map.json. `assertCityLive("chicago")` is Unknown city |
| Train Tracker / GTFS | not used as D1 | Key later, not a D1 blocker. Not this H2 stop-order surface |

H2 conclusion: eight color lines already agree (map + line pages). Clash is **Library vs Harold Washington Library-State/Van Buren**, **Blue Harlem/Western branch suffixes**, **Red Washington absent on the page**, **State/Lake closed overlay**, and **no product chicago file**. Do not generate published-network.json from GTFS or from any other city. Do not invent city=chi / cta / chicago-l. Do not merge with washington.

## C2/C3 to put in front of Jim

1. **city=chicago**, not `chi`, not `cta`, not `chicago-l`. Do not invent city=dc. Do not merge into washington or rotterdam.
2. **Clark/Lake** is the locked inner-city hub (Blue × Loop elevated). **The Loop** is the structure, not a hub token and not a station.
3. **doNotCollapse** Clark/Lake vs State/Lake vs Washington/Wabash vs Lake vs Clark/Division vs Washington (Blue) vs Washington/Wells.
4. **doNotCollapse** same-name different-line: Harlem (Blue O'Hare vs Blue Forest Park vs Green Harlem/Lake), Pulaski / Western / Cicero / Ashland / Kedzie / Damen / Belmont / Chicago / Grand / Addison / Garfield / 47th / Halsted / Central / Clinton / Oak Park / Austin / Dempster vs Dempster-Skokie.
5. **Purple** local is Linden–Howard. **Purple Express** (weekday rush, map dashed) continues to the Loop clockwise. Not a ninth line.
6. **Green** two south branches: Ashland/63rd and Cottage Grove. King Drive is Harlem-bound only.
7. **Yellow** is Skokie only (Dempster-Skokie–Howard). Does not enter the Loop.
8. **Brown / Orange / Pink / Purple** circulate the Loop. They do not have a Loop terminus token. Line + suburban end (Brown + Kimball, Orange + Midway, Pink + 54th/Cermak, Purple + Linden).
9. **America/Chicago HAS DST.** Do not copy Perth / Brisbane no-DST.
10. Modes v1: **CTA ‘L’ only**. No bus / Metra / Pace / South Shore leak. doNotGroup Quincy vs Union Station Metra; Washington/Wells vs Ogilvie; Washington/Wabash vs Millennium Station; Library vs LaSalle St Metra.
11. State/Lake stays in D1 (printed) with H3 overlay closed into 2029.
12. Developer key later. Not a D1 blocker. Never paste a key.
13. Cut #1 is Rotterdam only. Washington stays planned and untouched. This pack stays **planned**.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=chi / dc, no call to the live API with a real key, no API key in any file, no mix-in with washington/rotterdam.

## License

- **License name:** CTA Developer License Agreement and Terms of Use.
- **Redistribution / rehosting:** Limited, non-exclusive, non-assignable, non-transferable, revocable licence to use, reproduce, and distribute CTA Data *for the sole purpose of assisting mass transportation riders or promoting public transportation*. Express permission required to copy/distribute otherwise.
- **Commercial use:** Allowed only inside that rider-assistance purpose. Trademark rules apply (do not lead with CTA name/logo).
- **Attribution:** Optional phrasing such as "Data provided by Chicago Transit Authority" is permitted; CTA marks follow https://www.transitchicago.com/developers/branding/
- **Terms URL:** https://www.transitchicago.com/developers/terms/ (from https://www.transitchicago.com/developers/)
- **Confidence:** `clear` on purpose-limited redistribute; Train Tracker API is separately keyed.
- **Keyed feeds:** Train Tracker / Bus Tracker keys. GTFS zip at https://www.transitchicago.com/downloads/sch_data/ includes a copy of the DLA.

## Board eligibility

No services other than the in-scope operator call at any in-catalog station — verified.

**Verification method:** Researched Metra (Union Station, Ogilvie, LaSalle Street), Amtrak (Union Station), South Shore Line (Millennium Station), and O'Hare ATS people-mover as potential non-'L' services at in-catalog 'L' stations.

| Operator | In-catalog 'L' station | Distance / building | Status |
|---|---|---|---|
| Metra (commuter rail) | Quincy (Union Station); Washington/Wells (Ogilvie); LaSalle/Van Buren (LaSalle Street) | Adjacent separate buildings (137 yards to 3 blocks) | `out-mode` — separate station infrastructure; also referenced in station-name table note 10 as explicitly separated |
| Amtrak | Quincy (Union Station) | Adjacent separate building (137 yards, 2-minute walk) | `out-reservation` — all Chicago routes (Capitol Limited, Lake Shore Limited, Empire Builder, Illinois Zephyr/Carl Sandburg) require reserved coach seating; no walk-up boarding |
| South Shore Line | Washington/Wabash (Millennium Station) | Adjacent separate building (281 yards, 4-minute walk); also Van Buren, McCormick Place, 57th St in Chicago — none in-catalog 'L' stations | `out-mode` — separate station; only Chicago terminus is Millennium Station, which connects to 'L' at Washington/Wabash but is not the same facility |
| O'Hare ATS (people-mover) | O'Hare ('L' Blue Line) | Separate facility within airport; O'Hare Transfer station distinct from O'Hare Blue Line station | `out-product` — automated people-mover, not scheduled walk-up rail service; operates within airport terminals, not public transit in the rider-boardable sense |

**Real-time API status (for reference):**
- Metra: GTFS-Realtime API at https://gtfsapi.metrarail.com (formerly), new version available via developers portal; real-time tracker at metratracker.com
- Amtrak: No real-time individual-service API; web booking required
- South Shore Line: GTFS-Realtime feeds public via NICTD S3 (no API key required); real-time tracker at trains.fyi
- O'Hare ATS: No public real-time API

**Controller note (20 Sep 2026):** Metra, Amtrak and South Shore terminals are separate buildings, not in-catalog stations, so under rule §3 ("catalog cuts need no per-service verdict") no verdict is owed and the `out-mode` labels above should be read as "not at an in-catalog station". Net position per §5: no services other than the in-scope operator call at any in-catalog station — verified.
