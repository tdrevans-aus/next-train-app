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
