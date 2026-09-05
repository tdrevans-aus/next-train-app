# Phoenix oracle clash report

D1 (published, as of 6 Sep 2026): [Valley Metro Rail](https://www.valleymetro.org/rail) system information from [Wikipedia Valley Metro Rail](https://en.wikipedia.org/wiki/Valley_Metro_Rail) and official line information at [A Line](https://en.wikipedia.org/wiki/A_Line_(Valley_Metro_Rail)) [B Line](https://en.wikipedia.org/wiki/B_Line_(Valley_Metro_Rail)). Stations arrays **hand-transcribed** from rendered map images plus official line Wikipedia pages as ordered-stop support. **Not generated from GTFS.** Not generated from Valley Metro's real-time tracking. Map printed names win.

Supporting official pages (tokens / termini, not the stop-name oracle):

- A Line (east-west): 26 stations, Downtown Phoenix Hub (western terminus) to Gilbert Road/Main Street (eastern terminus in Mesa)
- B Line (north-south): 29 stations, Metro Parkway (northern terminus) to Baseline/Central Avenue (southern terminus, opened June 7, 2025)
- Stations index: [List of Valley Metro Rail stations](https://en.wikipedia.org/wiki/List_of_Valley_Metro_Rail_stations)
- Downtown hub reference: [Downtown Phoenix Hub](https://en.wikipedia.org/wiki/Downtown_Phoenix_Hub)

Hub lock: **Downtown Phoenix Hub** (A × B line transfer in downtown Phoenix; occupies city block bounded by Central Avenue, 1st Avenue, Jefferson Street, and Washington Street; four side platforms across multiple streets). The hub comprises one-way side platforms: northbound B Line on Central Avenue, southbound B Line on 1st Avenue, eastbound A Line on Jefferson Street, and terminating westbound A Line on Washington Street. **Not Roosevelt/Central**, not individual street stations. A single coherent hub for transfer purposes.

H2 clash surface (after transcription): **no** product `lib/cities/phoenix/`. Clash is **map-vs-line-pages**. Zero mix-in with chicago / washington / bart / rotterdam. Not GTFS. Bus / Tempe Streetcar (S Line) / Sky Harbor PHX Train out of v1 oracle. Tempe Streetcar shares Dorsey/Apache with A Line but is a distinct streetcar/tram mode (out-mode verdict).

## Station name table

Match rule: published D1 string (Wikipedia map sources + line pages) vs official line Wikipedia stop lists. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Downtown Phoenix Hub | Hub page **Downtown Phoenix Hub**; also **Central at Washington** | **match (lock)**. Do not use individual street names (Central/Washington, Jefferson/Washington, etc.) as the hub token. The hub is a single four-platform interchange at the block bounded by all four streets. |
| Metro Parkway | B Line **Metro Parkway** (northern terminus) | **match**. |
| Mountain View/25th Avenue | B Line **Mountain View/25th Avenue** | **match**. |
| 25th Avenue/Dunlap | B Line **25th Avenue/Dunlap** | **match**. |
| Roosevelt/Central Avenue | B Line **Roosevelt/Central Avenue** | **match**. |
| Camelback/Central Avenue | B Line **Camelback/Central Avenue** | **match**. |
| Thomas/Central Avenue | B Line **Thomas/Central Avenue** | **match**. |
| McDowell/Central Avenue | B Line **McDowell/Central Avenue** | **match**. |
| Van Buren/Central Avenue | B Line **Van Buren/Central Avenue** | **match**. |
| Baseline/Central Avenue | B Line **Baseline/Central Avenue** (southern terminus, opened June 7, 2025) | **match**. |
| 3rd Street/Jefferson | A Line **3rd Street/Jefferson** | **match**. |
| 12th Street/Jefferson | A Line **12th Street/Jefferson** | **match**. |
| 24th Street/Jefferson | A Line **24th Street/Jefferson** | **match**. |
| 38th Street/Washington | A Line **38th Street/Washington** | **match**. |
| 44th Street/Washington | A Line **44th Street/Washington**; PHX Sky Train airport connection | **match**. Not PHX Sky Train; A Line stop. |
| 50th Street/Washington | A Line **50th Street/Washington** | **match**. |
| Priest/Washington | A Line **Priest/Washington** | **match**. |
| Price Road/101 Freeway | A Line **Price Road/101 Freeway** | **match**. |
| Smith/Martin/Apache | A Line **Smith/Martin/Apache** | **match**. |
| Dorsey/Apache | A Line **Dorsey/Apache**; S Line (Tempe Streetcar) shared platform | **match**. Streetcar is separate mode (out-mode verdict). |
| Veterans Way/College | A Line **Veterans Way/College** (Tempe transit center) | **match**. |
| McClintock/Apache | A Line **McClintock/Apache** | **match**. |
| Sycamore/Main Street | A Line **Sycamore/Main Street** (Mesa, original eastern terminus) | **match**. |
| Stapley/Main Street | A Line **Stapley/Main Street** (opened 2019) | **match**. |
| Gilbert Road/Main Street | A Line **Gilbert Road/Main Street** (current eastern terminus, opened 2019) | **match**. |
| All other D1 names in published-network.json | same map / line pages | match |

**55** unique D1 passenger stops on A and B lines (Downtown Phoenix Hub counted once; same-name different-line counted separately). Product `lib/cities/phoenix/` is **absent**. **Zero** mix-in with chicago / washington / bart / rotterdam / any other city file.

## H2 — who has line codes today

| surface | A Line / B Line ? | what it actually has |
| --- | --- | --- |
| Wikipedia A Line / B Line pages (D1) | **yes (color names)** | A Line (east-west, light rail). B Line (north-south, light rail, opened June 7, 2025). No bus, no streetcar as D1 lines. |
| Downtown Phoenix Hub page | **yes (transfer point)** | Four-platform hub, A × B interchange. Maps and diagrams. |
| Stations Wikipedia list | **yes (all 55 stations)** | A Line: 26 stations. B Line: 29 stations. |
| Product `lib/cities/phoenix/` | **absent** | No phoenix stations.json / line-map.json. `assertCityLive("phoenix")` is Unknown city. |
| GTFS feed (Phoenix Open Data) | not used as D1 | Includes light rail + bus + streetcar. v1 light rail only. GTFS-RT is bus-only (no light rail RT). Not a D1 blocker; static GTFS covers v1. |

H2 conclusion: two color lines already agree (Wikipedia A + B pages). Clash is **Downtown Phoenix Hub naming** (single four-platform interchange, not individual street stations), **no product phoenix file**, and **GTFS-RT currently bus-only**. Do not generate published-network.json from GTFS or from any other city. Do not invent city=phx / phoenix-metro / valley-metro. Do not merge with chicago, washington, or bart.

## C2/C3 to put in front of Jim

1. **city=phoenix**, not `phx`, not `valley-metro`, not `phoenix-metro`. Do not invent city=tempe / mesa. Do not merge into chicago or washington.
2. **Downtown Phoenix Hub** is the locked inner-city hub (A × B line transfer). The hub occupies a city block (Central Avenue, 1st Avenue, Jefferson Street, Washington Street) with four one-way side platforms. Do not use individual street names as the hub token.
3. **A Line** is east-west, 26 stations, Downtown Phoenix Hub to Gilbert Road/Main Street (Mesa). Westbound terminus is at the hub on Washington Street. Eastbound terminus is Gilbert Road/Main Street.
4. **B Line** is north-south, 29 stations, Metro Parkway (northern terminus) to Baseline/Central Avenue (southern terminus, opened June 7, 2025). Platforms occupy Central Avenue and 1st Avenue through downtown.
5. **doNotCollapse** street-name stations on the same line (e.g. multiple Roosevelt/Central stations if they exist; multiple 25th Avenue stations). Verify line pages for exact stop ordering.
6. **Tempe Streetcar (S Line)** is a streetcar/tram mode (not rail). It shares Dorsey/Apache with A Line but operates separately. Board eligibility verdict: **out-mode** (v1 scope is Valley Metro Rail light rail only).
7. **Modes v1: Valley Metro Rail A Line and B Line only.** No bus, no streetcar/tram (S Line), no PHX Sky Train airport connector, no other operators.
8. **America/Phoenix HAS DST.** Do not copy Perth / Brisbane no-DST.
9. GTFS-RT is currently **bus-only** (no light rail real-time data in public feed). Static GTFS covers A & B lines. Not a D1 blocker. Next-train via GTFS-RT would require tracking with the static schedule or awaiting Valley Metro to extend GTFS-RT to light rail.
10. Developer key not required. Static GTFS from Phoenix Open Data; no registration, no auth. Not a D1 blocker.
11. Cut #1 is Rotterdam only. Washington / Chicago / BART stay planned and untouched. This pack stays **planned**.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=phx / valley-metro / phoenix-metro, no call to the live API with a real key, no API key in any file, no mix-in with chicago/washington/bart/rotterdam.

## Board eligibility

Valley Metro Rail operates two light rail lines (A and B) plus the Tempe Streetcar (S Line, a separate streetcar/tram operator). The board eligibility rule requires verdicts for all services calling at in-catalog stations.

| Service | Station | Verdict | Reason | Evidence |
|---------|---------|---------|--------|----------|
| A Line | All 26 stations (Downtown Phoenix Hub to Gilbert Road/Main Street) | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier | [A Line (Valley Metro Rail)](https://en.wikipedia.org/wiki/A_Line_(Valley_Metro_Rail)) — public light rail, standard fares |
| B Line | All 29 stations (Metro Parkway to Baseline/Central Avenue) | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier | [B Line (Valley Metro Rail)](https://en.wikipedia.org/wiki/B_Line_(Valley_Metro_Rail)) — public light rail, opened June 7, 2025 |
| Tempe Streetcar (S Line) | Dorsey/Apache (shared with A Line) | `out-mode` | Streetcar/tram mode; v1 scope is Valley Metro Rail light rail only (A & B lines) | [Valley Metro Streetcar](https://en.wikipedia.org/wiki/Valley_Metro_Streetcar) — 14 stations in Tempe, opened May 20, 2022; distinct vehicle type from light rail |

No other rail services call at A or B line stations.

## Feeds & authentication

**Static GTFS:** https://www.phoenixopendata.com/dataset/3eae9a4a-98b9-40c8-8df7-8c00c1756235/resource/28ccc0a5-49c8-495c-b91f-193de5ce2cb7/download/googletransit.zip
- **Updated:** July 27, 2026 (active schedule July 27–October 25, 2026)
- **Authentication:** None (public download, no key required)
- **Coverage:** Includes A Line, B Line, Tempe Streetcar, and Valley Metro bus routes

**GTFS-RT:** https://www.phoenixopendata.com/dataset/general-transit-feed-specification
- **Resources:** Vehicle positions, trip updates, service alerts via three separate feeds
- **Authentication:** None (public access)
- **Coverage:** Currently **bus services only** — light rail real-time data not yet published in the public GTFS-RT feed
- **Last refresh:** Daily

## License

- **License name:** Open Data Commons Attribution License (ODC-BY).
- **Redistribution / rehosting:** May use, reproduce, and distribute the Data. Derivative works are permitted. Transitland caches GTFS-RT for redistribution where licenses allow.
- **Commercial use:** Allowed, with attribution.
- **Attribution:** Required when using the data. Standard practice: "Data provided by Valley Metro / City of Phoenix" or similar.
- **Terms URL:** https://www.phoenixopendata.com/dataset/valley-metro-bus-schedule (includes link to Open Data Commons Attribution License terms)
- **Confidence:** `clear` on redistribution rights and commercial use under ODC-BY. Bus vs light rail GTFS-RT coverage currently unclear (bus-only as of Sep 2026); Tim may decide whether this affects redistribution of light-rail-only data.
- **Keyed feeds:** None. Static GTFS and GTFS-RT are both unkeyed.

## Sources & notes

- Transitland GTFS feed: https://www.transit.land/feeds/f-9tb-valleymetro
- Transitland GTFS-RT feed: https://www.transit.land/feeds/f-valleymetro~rt
- Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-147
- Phoenix Open Data portal: https://www.phoenixopendata.com/
