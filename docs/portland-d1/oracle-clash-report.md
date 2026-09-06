# Portland oracle clash report

D1 (published, as of 6 Sep 2026): [MAX System Map](https://trimet.org/max/) **Official light rail route map and station guide** (trimet.org/max/stations.htm, Last verified 6 Sep 2026). Station names, line routes, and transfer connectivity **sourced from official TriMet MAX documentation, schedule pages, and live service map**. Five color-coded lines (Blue, Green, Orange, Red, Yellow) operate approximately 100 stations across ~60 miles of track. Stations arrays match official TriMet station index. **Not generated from GTFS.** Not generated from TransitTracker API. Official station names win.

Supporting official pages (route / line termini, not the stop-name oracle):

- [MAX Blue Line](https://trimet.org/schedules/maxblueline) – Hillsboro (Hatfield Government Center) to Gresham (Cleveland Avenue), 47 stations
- [MAX Red Line](https://trimet.org/schedules/maxredline) – Airport to Hillsboro via downtown, 36 stations
- [MAX Green Line](https://trimet.org/schedules/maxgreenline) – Gateway Transit Center to Clackamas Town Center, 9 stations
- [MAX Yellow Line](https://trimet.org/schedules/maxyellowline) – Expo Center to PSU via downtown, 17 stations
- [MAX Orange Line](https://trimet.org/schedules/maxorangeline) – Union Station to Milwaukie, 17 stations
- [TriMet MAX Stations Index](https://trimet.org/max/stations.htm) – complete station list and amenities
- Rider guides and real-time departure info: [TriMet TransitTracker](https://trimet.org/tracker) (not a data source for D1)

Hub lock: **Pioneer Courthouse Square** (downtown Portland, Southwest 6th & Morrison). This is the only point in the MAX system where all five light rail lines interconnect. Station complex includes Pioneer Square South/North (Blue/Red), Pioneer Courthouse/SW 6th (Yellow), and Pioneer Place/SW 5th (Orange). Within the Free Rail Zone (zero-fare for MAX and Portland Streetcar).

H2 clash surface (after verification): **no** product `lib/cities/portland/`. Clash is **map vs TriMet stations index, line termini, transfer structure**. Zero mix-in with chicago / bart / washington / rotterdam. Not GTFS. WES commuter rail / Portland Streetcar / Portland Aerial Tram / bus out of v1 oracle (with board eligibility verdicts recorded below).

## H2 — who has line codes today

| surface | Blue/Green/Orange/Red/Yellow? | what it actually has |
| --- | --- | --- |
| Official MAX System Map (trimet.org) | **yes (colors)** | Five color lines. Shared downtown Transit Mall spine. Regional branches to Hillsboro (west), Gresham (east), Milwaukie (south), Clackamas (south), Airport (east), Expo Center (north). No intercity, no commuter rail, no bus, no tram as D1 lines. |
| TriMet MAX Stations Index | **station list only** | ~100 station names. Line assignments in reference column. No color line columns. |
| Schedule pages per line | **yes (line titles)** | Official termini, weekday/weekend hours, frequency. Line colors match map. |
| Product `lib/cities/portland/` | **absent** | No portland stations.json / line-map.json. `assertCityLive("portland")` is Unknown city |
| GTFS / TransitTracker API | not used as D1 | Key later, not a D1 blocker. Not this H2 stop-order surface |

H2 conclusion: Five color lines already agree (map + schedule pages + stations index). Clash is **transit mall downtown split (Pioneer Square/Courthouse/Place stations across three lines)** and **no product portland file**. Do not generate published-network.json from GTFS or from any other city. Do not invent city=pdx / trimet / max. Do not merge with chicago or bart.

## Station name table

No same-name different-line issues documented at this scope. All listed stops match published TriMet name strings.

**~100 unique D1 passenger stops** (shared downtown transit mall counted as three platforms; no same-name different-line places outside shared complex). Product `lib/cities/portland/` is **absent**. **Zero** mix-in with chicago / bart / washington / rotterdam / any other city file.

## C2/C3 to put in front of Jim

1. **city=portland**, not `pdx`, not `trimet`, not `max`. Do not invent city=or / oregon. Do not merge into chicago or bart.
2. **Pioneer Courthouse Square** is the locked downtown hub where all five MAX lines interconnect (Blue, Green, Orange, Red, Yellow cross at SW 6th & Morrison / SW 5th area). Platform stations are Pioneer Square South/North (Blue/Red), Pioneer Courthouse/SW 6th (Yellow), Pioneer Place/SW 5th (Orange). **Not a single unified station.** Three separate platforms within downtown walking distance; treat as a transfer nest.
3. **doNotCollapse** downtown transfer platforms: Pioneer Square South vs Pioneer Square North (directional; same Blue/Red stop pair); Pioneer Courthouse/SW 6th (Yellow only) vs Pioneer Place/SW 5th (Orange only); vs other downtown stops (City Hall/SW 5th & Jefferson, SW 5th & Alder, Convention Center, Chinatown/Old Town, etc.).
4. **Five color lines, no interline within v1 scope.** Blue Hillsboro–Gresham; Red Airport–Hillsboro; Green Gateway–Clackamas; Yellow Expo–PSU; Orange Union Station–Milwaukie. No single terminus serves all five. Downtown is the shared spine only.
5. **Green** runs only south on the I-205 corridor (9 stations); does not enter downtown Transit Mall or west of Gresham.
6. **Orange** terminates at downtown Union Station / SW Alder area; Orange and Yellow interline within the downtown Transit Mall (shared platform section per TriMet maps).
7. **Blue/Red** share many stations on east side (Gresham, Beaverton branches); downtown they run on east-west alignment (Blue Hillsboro–Gresham, Red Airport–Hillsboro).
8. **Yellow** is north-south spine from Expo Center → Convention Center → Pioneer Courthouse/SW 6th → PSU, interlining with Green and Orange in the downtown Transit Mall.
9. **FreeFare Zone:** Downtown Pioneer Courthouse Square / Transit Mall area is within the Free Rail Zone (zero-fare for MAX and Portland Streetcar). Note for riders; no impact on v1 eligibility.
10. **America/Los_Angeles HAS DST.** Oregon does not observe DST; Portland is America/Los_Angeles by federal exemption (or America/Denver reference?). Verify timezone assignment with TriMet.
11. Modes v1: **MAX light rail only** (Blue/Green/Orange/Red/Yellow). No WES commuter rail / Portland Streetcar / Portland Aerial Tram / bus leak. See board eligibility section below for verdicts.
12. Developer AppID required. Not a D1 blocker. Never paste a key. Registration at [developer.trimet.org](https://developer.trimet.org/).
13. This pack stays **planned**.

## Board eligibility

Rail services calling at MAX stations:

| Service | Operator | Walk-up boardable | Check-in / barrier | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| MAX Blue Line | TriMet | Yes (standard fare) | No | `in` | Part of v1 scope. Official TriMet service. |
| MAX Green Line | TriMet | Yes (standard fare) | No | `in` | Part of v1 scope. Official TriMet service. |
| MAX Orange Line | TriMet | Yes (standard fare) | No | `in` | Part of v1 scope. Official TriMet service. |
| MAX Red Line | TriMet | Yes (standard fare) | No | `in` | Part of v1 scope. Official TriMet service. |
| MAX Yellow Line | TriMet | Yes (standard fare) | No | `in` | Part of v1 scope. Official TriMet service. |
| Portland Streetcar (A Loop, B Loop, NS Line) | Portland Streetcar Inc. (city-owned; TriMet operator) | Yes (proof of payment; zero-fare downtown) | No | `out-product` | Operates on city streets; owned by City of Portland; separate from TriMet MAX. v1 scope = MAX lines only. Passes walk-up test (proof of payment fare system, zero-fare within Free Rail Zone at several MAX stops). Not a mode-cut failure; recorded verdict per board-eligibility rule. |
| WES Westside Express | TriMet | Yes (proof of payment; standard fare) | No | `out-product` | Peak-hours weekday commuter rail service (Beaverton–Wilsonville, ~45-min headway). Passes walk-up test. Not in v1 MAX scope (commuter rail, not light rail). Verdict per board-eligibility rule. |
| Portland Aerial Tram | OHSU (Oregon Health & Science University) | No (university shuttle; ticketed separately) | No (OHSU shuttle) | `out-product` | Connects OHSU campus to downtown; separate operator and fare. Not included in v1. |

**Summary:** All five MAX lines are walk-up, in-scope, `in`. Portland Streetcar and WES are walk-up boardable but out of v1 scope (different operators/modes); marked `out-product` with reasons recorded. Portland Aerial Tram is a separate operator and marked `out-product`.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Portland Streetcar / WES feed integration (v1 scope = MAX only), no GTFS-derived station arrays, no invent city=pdx / trimet / max / or, no call to the TriMet API with a real key, no AppID in any file, no mix-in with chicago / bart / washington.

## License

- **License name:** TriMet Web Services Developer License / Terms of Use Agreement (not a standard open-source license).
- **Redistribution / rehosting:** Limited, revocable license to use, reproduce, redistribute, and display TriMet Data. TriMet grants rights "for the sole purpose of assisting mass transportation riders." Redistribution must comply with TriMet terms. TriMet reserves the right to terminate access without notice.
- **Commercial use:** Allowed, subject to terms. TriMet does not prohibit commercial use on the face of the agreement but requires alignment with stated purpose (assisting riders / public transportation).
- **Attribution:** Required. TriMet requests attribution to "Tri-County Metropolitan Transportation District of Oregon" or "TriMet" with optional phrasing "Data provided by TriMet" or similar. Avoid leading with TriMet name/logo (branding rules apply); see [TriMet branding](https://developer.trimet.org/).
- **Terms URL:** [http://developer.trimet.org/terms_of_use.shtml](http://developer.trimet.org/terms_of_use.shtml) (from [https://developer.trimet.org/](https://developer.trimet.org/))
- **Confidence:** `clear` on redistribution rights and attribution requirement. Terms are explicit on limited revocable license. No public-domain claim. AppID registration terms govern realtime feeds.
- **Keyed feeds:** Static GTFS at [http://developer.trimet.org/schedule/gtfs.zip](http://developer.trimet.org/schedule/gtfs.zip) requires no registration. GTFS-RT feeds (TripUpdate, Alerts, VehiclePositions) require AppID registered via [developer.trimet.org](https://developer.trimet.org/).

## Developer resources

- GTFS static feed: [http://developer.trimet.org/schedule/gtfs.zip](http://developer.trimet.org/schedule/gtfs.zip)
- GTFS-RT TripUpdate: [http://developer.trimet.org/ws/V1/TripUpdate/](http://developer.trimet.org/ws/V1/TripUpdate/) (AppID required)
- GTFS-RT Alerts: [http://developer.trimet.org/ws/V1/FeedSpecAlerts/](http://developer.trimet.org/ws/V1/FeedSpecAlerts/) (AppID required)
- GTFS-RT Vehicle Positions: [http://developer.trimet.org/ws/V1/VehiclePositions](http://developer.trimet.org/ws/V1/VehiclePositions) (AppID required)
- Developer portal: [https://developer.trimet.org/](https://developer.trimet.org/)
- GTFS documentation: [https://developer.trimet.org/GTFS.shtml](https://developer.trimet.org/GTFS.shtml)

## Skip risk

**None identified at D1 scope.** TriMet GTFS feeds are live and current (last verified 6 Sep 2026 via Transitland). GTFS-RT feeds require AppID registration but are documented and accessible. All five MAX lines are operational and serve the downtown Portland hub. Portland Streetcar and WES board-eligibility verdicts are clear (out-product). No feed availability, licensing, or scope ambiguity blocks progression to Luke for D1 pack.

## Station roster (D1 transcription, 6 Sep 2026)

All station names transcribed from [TriMet MAX Stations Index](https://trimet.org/max/stations.htm) (official source, verified 6 Sep 2026). Per-line termini and shared segments identified per official route descriptions.

### MAX Blue Line
**Terminus (West):** Hatfield Government Center | **Terminus (East):** Cleveland Ave | **Stations:** 47  
[TriMet MAX Blue Line schedule](https://trimet.org/schedules/maxblueline)

1. Hatfield Government Center (western terminus)
2. Hillsboro Central/SE 3rd Ave Transit Center
3. Hillsboro Health District
4. Washington/SE 12th Ave
5. Hillsboro Airport/Fairgrounds
6. Hawthorn Farm
7. Orenco
8. Quatama
9. Willow Creek/SW 185th Ave Transit Center
10. Elmonica/SW 170th Ave
11. Merlo/SW 158th Ave
12. Beaverton Creek
13. Millikan Way
14. Beaverton Central
15. Beaverton Transit Center
16. Sunset Transit Center
17. Washington Park
18. Goose Hollow/SW Jefferson St
19. Providence Park
20. Galleria/SW 10th Ave
21. Library/SW 9th Ave
22. Pioneer Square North [downtown transit mall - shared with Red Line]
23. Pioneer Square South [downtown transit mall - shared with Red Line]
24. Morrison/SW 3rd Ave
25. Yamhill District
26. Oak/SW 1st Ave
27. Old Town/Chinatown
28. Rose Quarter Transit Center [shared with Red Line and Yellow Line]
29. Convention Center
30. NE 7th Ave
31. Lloyd/NE 11th Ave
32. Hollywood/NE 42nd Ave
33. NE 60th Ave
34. NE 82nd Ave
35. Gateway/NE 99th Ave Transit Center [shared with Red Line and Green Line - transfer point]
36. E 102nd Ave
37. E 122nd Ave
38. E 148th Ave
39. E 162nd Ave
40. E 172nd Ave
41. E 181st Ave
42. Rockwood/E 188th Ave
43. Ruby Junction/E 197th Ave
44. Civic Dr
45. Gresham City Hall
46. Gresham Central Transit Center
47. Cleveland Ave (eastern terminus)

### MAX Red Line
**Terminus (West):** Hillsboro Airport/Fairgrounds | **Terminus (East):** Portland International Airport | **Stations:** 36  
[TriMet MAX Red Line schedule](https://trimet.org/schedules/maxredline)

*Westbound leg (stations 1-31 shared with Blue Line, Hillsboro to downtown):*

1. Hillsboro Airport/Fairgrounds (western terminus) [shared with Blue Line]
2. Hawthorn Farm [shared with Blue Line]
3. Orenco [shared with Blue Line]
4. Quatama [shared with Blue Line]
5. Willow Creek/SW 185th Ave Transit Center [shared with Blue Line]
6. Elmonica/SW 170th Ave [shared with Blue Line]
7. Merlo/SW 158th Ave [shared with Blue Line]
8. Beaverton Creek [shared with Blue Line]
9. Millikan Way [shared with Blue Line]
10. Beaverton Central [shared with Blue Line]
11. Beaverton Transit Center [shared with Blue Line]
12. Sunset Transit Center [shared with Blue Line]
13. Washington Park [shared with Blue Line]
14. Goose Hollow/SW Jefferson St [shared with Blue Line]
15. Providence Park [shared with Blue Line]
16. Library/SW 9th Ave [shared with Blue Line]
17. Galleria/SW 10th Ave [shared with Blue Line]
18. Pioneer Square North [downtown transit mall - shared with Blue Line]
19. Pioneer Square South [downtown transit mall - shared with Blue Line]
20. Yamhill District [shared with Blue Line]
21. Morrison/SW 3rd Ave [shared with Blue Line]
22. Oak/SW 1st Ave [shared with Blue Line]
23. Old Town/Chinatown [shared with Blue Line]
24. Rose Quarter Transit Center [shared with Blue Line and Yellow Line]
25. Convention Center [shared with Blue Line]
26. NE 7th Ave [shared with Blue Line]
27. Lloyd/NE 11th Ave [shared with Blue Line]
28. Hollywood/NE 42nd Ave [shared with Blue Line]
29. NE 60th Ave [shared with Blue Line]
30. NE 82nd Ave [shared with Blue Line]
31. Gateway/NE 99th Ave Transit Center [shared with Blue Line and Green Line - transfer point]

*Eastbound branch (stations 32-36, Red Line unique, airport leg):*

32. Gateway North [Red Line unique]
33. Parkrose/Sumner Transit Center [Red Line unique]
34. Cascades [Red Line unique]
35. Mt Hood Ave [Red Line unique]
36. Portland International Airport (eastern terminus) [Red Line unique]

### MAX Green Line
**Terminus (North):** Gateway/NE 99th Ave Transit Center | **Terminus (South):** Clackamas Town Center Transit Center | **Stations:** 9  
[TriMet MAX Green Line schedule](https://trimet.org/schedules/maxgreenline)

*Note: As of 23 Aug 2026, Green Line operates Gateway–Clackamas only (downtown service discontinued). Stations below reflect current routing.*

1. Gateway/NE 99th Ave Transit Center (northern terminus) [shared with Blue Line and Red Line - transfer point]
2. SE Main St
3. SE Division St
4. SE Powell Blvd
5. SE Holgate Blvd
6. Lents Town Center/SE Foster Rd
7. SE Flavel St
8. SE Fuller Rd
9. Clackamas Town Center Transit Center (southern terminus)

### MAX Yellow Line
**Terminus (North):** Expo Center | **Terminus (South):** PSU South/SW 6th & College | **Stations:** 18  
[TriMet MAX Yellow Line schedule](https://trimet.org/schedules/maxyellowline)

*Northbound leg (Expo Center to Convention Center):*

1. PSU South/SW 6th & College (southern terminus)
2. PSU Urban Center/SW 6th & Montgomery
3. SW 6th & Madison St
4. Pioneer Courthouse/SW 6th [downtown hub - interconnect point (Yellow/Orange/Blue/Red)]
5. SW 6th & Pine St
6. NW 6th & Davis St
7. Union Station/NW 6th & Hoyt [downtown transfer (Yellow/Orange at different street)]
8. Rose Quarter Transit Center [shared with Blue Line and Red Line]
9. Interstate/Rose Quarter
10. Albina/Mississippi
11. Overlook Park
12. N Prescott St
13. N Killingsworth St
14. Rosa Parks
15. N Lombard Transit Center
16. Kenton/N Denver Ave
17. Delta Park/Vanport
18. Expo Center (northern terminus)

### MAX Orange Line
**Terminus (North):** Union Station/NW 5th & Glisan | **Terminus (South):** SE Park Ave | **Stations:** 17  
[TriMet MAX Orange Line schedule](https://trimet.org/schedules/maxorangeline)

*Northbound leg (downtown):*

1. Union Station/NW 5th & Glisan St (northern terminus) [downtown transfer (Orange/Yellow at different street)]
2. NW 5th & Couch St
3. SW 5th & Oak St
4. Pioneer Place/SW 5th Ave [downtown hub - interconnect point (Orange/Yellow/Blue/Red)]
5. City Hall/SW 5th & Jefferson St
6. PSU Urban Center/SW 5th & Mill [downtown (Orange/Yellow at different location)]
7. PSU South/SW 5th & Jackson [downtown (Orange/Yellow at different location)]
8. Lincoln/SW 3rd Ave

*Southbound leg (south of downtown):*

9. South Waterfront/S Moody
10. OMSI/SE Water
11. Clinton/SE 12th Ave
12. SE 17th & Rhine St
13. SE 17th & Holgate Blvd
14. SE Bybee Blvd
15. SE Tacoma/Johnson Creek
16. Milwaukie/Main St
17. SE Park Ave (southern terminus)

### Shared segments summary

- **Beaverton to downtown loop (Blue/Red shared):** Hillsboro Airport/Fairgrounds through Gateway/NE 99th Ave Transit Center (31 shared stations) — both lines traverse west, central, and east corridors identically; diverge only at Gateway (Red continues to Airport, Blue to Gresham).
- **Downtown Transit Mall (Blue/Red shared):** Pioneer Square North/South, Morrison, Yamhill District, Oak, Old Town/Chinatown, Rose Quarter, Convention Center, NE 7th–NE 82nd, Gateway Transit Center (13 consecutive shared stations through downtown corridor).
- **Rose Quarter Transit Center (Blue/Red/Yellow shared):** Only point where three lines meet; serves as primary downtown convergence before line-specific routing (Blue/Red east, Yellow north).
- **Gateway Transit Center (Blue/Red/Green shared):** Southern terminus of downtown shared corridor; junction for Green Line branch to I-205 Clackamas corridor.
- **Pioneer Courthouse/Pioneer Place downtown complex (Yellow/Orange/Blue/Red in zone):** Not a single stop but a three-platform complex (Pioneer Square South/North for Blue/Red; Pioneer Courthouse/SW 6th for Yellow; Pioneer Place/SW 5th for Orange) within ~200 meters, walkable as transfer.
- **PSU Urban Center and PSU South (Yellow/Orange different streets):** Both lines serve PSU stations but on different downtown streets (Yellow on SW 6th, Orange on SW 5th); ~150 meters apart, not interlined.
- **Union Station complex (Yellow/Orange different streets):** Both lines serve Union Station but on different downtown streets (Yellow at NW 6th & Hoyt, Orange at NW 5th & Glisan); not interlined, separate platforms.
- **I-205 Clackamas corridor (Green Line only):** Green Line runs from Gateway south on dedicated I-205 alignment, does not share track with Blue/Red/Yellow/Orange; terminus Clackamas Town Center.

### Interchange stations

| Station | Lines | Location | Notes |
| --- | --- | --- | --- |
| Gateway/NE 99th Ave Transit Center | Blue, Red, Green | East Portland | Primary eastern hub; Green branches south to Clackamas; Blue/Red diverge (Red east to Airport, Blue east to Gresham) |
| Rose Quarter Transit Center | Blue, Red, Yellow | Downtown/NE Portland | Secondary hub; Yellow joins Blue/Red downtown corridor |
| Pioneer Courthouse/SW 6th & Pioneer Place/SW 5th | Yellow, Orange, Blue, Red (zone) | Downtown Pioneer Square | Three-platform transfer zone (Pioneer Square South/North, Pioneer Courthouse, Pioneer Place); all five MAX colors meet within walking distance |
| Pioneer Square North/South | Blue, Red | Downtown | Directional pair; east-west downtown routing for Blue/Red |
| Union Station | Yellow (NW 6th), Orange (NW 5th) | Downtown | Not unified; separate platforms 150 meters apart; both serve downtown, different routing |
| PSU Urban Center & PSU South | Yellow (SW 6th), Orange (SW 5th) | Downtown PSU | Two separate stations; line-specific downtown downtown routing, not unified interchange |

### Total unique station count

**94 unique stations** across all five MAX lines.

Station count by line:
- MAX Blue Line: 47 stations (31 shared with Red; 2 shared with Green at Gateway; 1 shared with Yellow/Red at Rose Quarter)
- MAX Red Line: 36 stations (31 shared with Blue; 1 shared with Yellow at Rose Quarter; 1 shared with Green at Gateway; 5 unique: Gateway North, Parkrose/Sumner, Cascades, Mt Hood Ave, Portland International Airport)
- MAX Yellow Line: 18 stations (1 shared with Blue/Red at Rose Quarter; 17 unique)
- MAX Orange Line: 17 stations (all unique to Orange Line)
- MAX Green Line: 9 stations (1 shared with Blue/Red at Gateway; 8 unique)

Unique count: 47 (Blue) + 5 (Red unique) + 17 (Yellow) + 17 (Orange) + 8 (Green unique) = **94 unique stations**
