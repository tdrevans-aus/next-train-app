# Sacramento oracle clash report

D1 (published, as of 6 Sep 2026): [Sacramento Light Rail System Map](https://www.sacrt.com/wp-content/uploads/2024_Light-Rail-System-Map.pdf) **Official light rail route map and station guide** (sacrt.com, Last verified 6 Sep 2026). Station names, line routes, and transfer connectivity **sourced from official SacRT documentation, light rail pages, and schedule files**. Three color-coded lines (Blue, Gold, Green) operate 53 stations across 42.9 miles of track. Stations array matches official SacRT station index. **Not generated from GTFS.** Not generated from BusTime API. Official station names win.

Supporting official pages (route / line termini, not the stop-name oracle):

- [Blue Line](https://www.sacrt.com/transit/light-rail/blue-line/) – Watt/I-80 (north) to Cosumnes River College (south), 28 stations
- [Gold Line](https://www.sacrt.com/transit/light-rail/gold-line/) – Sacramento Valley Station (west) to Historic Folsom (east), 27 stations
- [Green Line](https://www.sacrt.com/transit/light-rail/green-line/) – 7th & Richards/Township 9 (north) to 13th Street (south), 7 stations
- [SacRT Light Rail Stations Index](https://www.sacrt.com/transit/light-rail/) – complete station list and amenities
- BusTime realtime: [SacRT BusTime Map](https://bustime.sacrt.com/bustime/map/displaymap.jsp) (not a data source for D1)

Hub lock: **Archives Plaza** (downtown Sacramento, 11th Street & O Street). This is the central point in the SacRT light rail system where all three color-coded lines (Blue, Gold, Green) intersect and transfer. Station serves as the major transfer hub for the entire light rail network. Two side platforms; wheelchair accessible; located near California State Capitol complex.

H2 clash surface (after verification): **no** product `lib/cities/sacramento/`. Clash is **map vs SacRT official stations index, line termini, transfer structure**. Zero mix-in with portland / chicago / bart / washington / rotterdam. Not GTFS. Bus, Amtrak corridor connections, paratransit out of v1 oracle (with board eligibility verdicts recorded below).

## H2 — who has line codes today

| surface | Blue/Gold/Green? | what it actually has |
| --- | --- | --- |
| Official Light Rail System Map (sacrt.com) | **yes (colors)** | Three color lines. Central downtown transfer hub at Archives Plaza. Regional branches to Folsom (east), Cosumnes River College (south), 7th & Richards (north). No intercity, no commuter rail, no bus as D1 lines. |
| Official line pages | **yes (line titles)** | Color line titles + official termini, weekday/weekend hours, frequency. Line colors match map. |
| Schedule pages per line | **yes (line titles)** | Official termini, weekday/weekend hours, frequency. Line colors match map. |
| Product `lib/cities/sacramento/` | **absent** | No sacramento stations.json / line-map.json. `assertCityLive("sacramento")` is Unknown city |
| GTFS / BusTime API | not used as D1 | Key later, not a D1 blocker. Not this H2 stop-order surface |

H2 conclusion: Three color lines already agree (map + official line pages + schedule pages). Clash is **downtown transfer hub (Archives Plaza serves all three lines)** and **no product sacramento file**. Do not generate published-network.json from GTFS or from any other city. Do not invent city=sac / sacrt / srt. Do not merge with portland or chicago.

## Station name table

No same-name different-line issues documented at this scope. All listed stops match published SacRT name strings.

**53 unique D1 passenger stops** (central downtown hub Archives Plaza counted once; no same-name different-line places outside transfer complex). Product `lib/cities/sacramento/` is **absent**. **Zero** mix-in with portland / chicago / washington / rotterdam / any other city file.

## C2/C3 to put in front of Jim

1. **city=sacramento**, not `sac`, not `sacrt`, not `srt`. Do not invent city=ca / california. Do not merge into portland or chicago.
2. **Archives Plaza** is the locked downtown hub where all three light rail lines interconnect (Blue, Gold, Green cross at 11th Street & O Street). Single station complex with 2 side platforms; major transfer point. **Not multiple split platforms like Portland.** Treat as unified transfer nest.
3. **doNotCollapse** Archives Plaza vs 13th Street (Green terminus) vs 8th & K vs other downtown stops (16th Street, Alkali Flat/Ballpark, etc.).
4. **Three color lines, no interline within v1 scope.** Blue Watt/I-80–Cosumnes River College; Gold Sacramento Valley–Historic Folsom; Green 7th & Richards–13th Street. Archives Plaza is the shared hub only; no single terminus serves all three.
5. **Green** terminates at 13th Street; does not extend beyond downtown core. Blue and Gold pass through Archives Plaza and extend regionally.
6. **Blue** northbound serves Watt/I-80 terminus; southbound serves Cosumnes River College. Runs full north-south corridor through downtown.
7. **Gold** eastbound to Historic Folsom; westbound to Sacramento Valley Station (Amtrak junction). Runs full east-west corridor through downtown.
8. **Yellow is not a SacRT light rail line.** Three lines only: Blue, Gold, Green.
9. **America/Los_Angeles HAS DST.** California observes DST. Verify timezone assignment with SacRT.
10. Modes v1: **SacRT light rail only** (Blue/Gold/Green). No bus, Amtrak, paratransit leak. See board eligibility section below for verdicts.
11. Developer AppID not required. GTFS feeds are public. Registration not a D1 blocker.
12. This pack stays **planned**.

## Board eligibility

Rail services calling at SacRT light rail stations:

| Service | Operator | Walk-up boardable | Check-in / barrier | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| Blue Line | Sacramento Regional Transit | Yes (standard fare) | No | `in` | Part of v1 scope. Official SacRT service. Walk-up proof-of-payment fare system. |
| Gold Line | Sacramento Regional Transit | Yes (standard fare) | No | `in` | Part of v1 scope. Official SacRT service. Walk-up proof-of-payment fare system. |
| Green Line | Sacramento Regional Transit | Yes (standard fare) | No | `in` | Part of v1 scope. Official SacRT service. Walk-up proof-of-payment fare system. |
| Amtrak (Sacramento Valley Station connection) | Amtrak | No (advance reservation required) | Yes (check-in barrier) | `out-product` | Intercity rail service connecting at Sacramento Valley Station (Gold Line terminus). Requires advance reservation; not walk-up boardable. Separate operator and mode (heavy rail intercity). Not in v1 scope. Verdict per board-eligibility rule. |
| SacRT Bus | Sacramento Regional Transit | Yes (standard fare) | No | `out-product` | Operates on city streets; separate from light rail. v1 scope = light rail lines only. Verdict per board-eligibility rule. |
| SacRT GO Paratransit | Sacramento Regional Transit | No (eligible riders only; advance booking) | No (paratransit) | `out-product` | Accessible paratransit service for eligible riders; advance booking required. Not walk-up boardable. Not in v1 light rail scope. |

**Summary:** All three SacRT light rail lines (Blue, Gold, Green) are walk-up, in-scope, `in`. Amtrak and bus services are walk-up / accessible but out of v1 scope (different operators/modes); marked `out-product` with reasons recorded. Paratransit is not walk-up and marked `out-product`.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no bus / paratransit / Amtrak feed integration (v1 scope = light rail only), no GTFS-derived station arrays, no invent city=sac / sacrt / srt / ca, no call to the BusTime API with a key, no API key in any file, no mix-in with portland / chicago / washington.

## License

- **License name:** SacRT Open Data (permissive; no standard open-source license designation).
- **Redistribution / rehosting:** Permitted. SacRT grants non-exclusive, limited, and revocable rights to use, reproduce, and redistribute SacRT Data. Data may be rehosted and served to users via our API per feed terms (use without attribution permitted; derivative products allowed). SacRT reserves the right to terminate access without notice.
- **Commercial use:** Allowed. SacRT does not explicitly prohibit commercial use in feed terms. SacRT trademarks and copyrighted materials may not be used in association with data without separate permission.
- **Attribution:** Not required. Transitland feed metadata indicates "use_without_attribution": "yes". Attribution is optional, though crediting SacRT / Sacramento Regional Transit is courteous.
- **Terms URL:** [https://www.transit.land/feeds/f-9qce-sacramentoregionaltransit](https://www.transit.land/feeds/f-9qce-sacramentoregionaltransit) (Transitland feed details); SacRT terms available at [https://www.sacrt.com/](https://www.sacrt.com/)
- **Confidence:** `clear` on redistribution and commercial use rights. Feed is openly published without authentication. GTFS-RT feeds are public and no key required.
- **Keyed feeds:** Static GTFS at [http://iportal.sacrt.com/GTFS/SRTD/google_transit.zip](http://iportal.sacrt.com/GTFS/SRTD/google_transit.zip) requires no registration. GTFS-RT feeds (TripUpdates, Alerts, VehiclePositions) at bustime.sacrt.com/gtfsrt/ require no key and are publicly accessible.

## Developer resources

- GTFS static feed: [http://iportal.sacrt.com/GTFS/SRTD/google_transit.zip](http://iportal.sacrt.com/GTFS/SRTD/google_transit.zip)
- GTFS-RT Vehicle Positions: [https://bustime.sacrt.com/gtfsrt/vehicles](https://bustime.sacrt.com/gtfsrt/vehicles)
- GTFS-RT Trip Updates: [https://bustime.sacrt.com/gtfsrt/trips](https://bustime.sacrt.com/gtfsrt/trips)
- GTFS-RT Service Alerts: [https://bustime.sacrt.com/gtfsrt/alerts](https://bustime.sacrt.com/gtfsrt/alerts)
- Transitland feed information: [https://www.transit.land/feeds/f-9qce-sacramentoregionaltransit](https://www.transit.land/feeds/f-9qce-sacramentoregionaltransit)
- SacRT main site: [https://www.sacrt.com/](https://www.sacrt.com/)
- BusTime realtime: [https://bustime.sacrt.com/bustime/](https://bustime.sacrt.com/bustime/)

## Skip risk

**None identified at D1 scope.** SacRT GTFS feeds are live and current (last verified 6 Sep 2026 via Transitland; successful fetch 2026-09-05). GTFS-RT feeds are publicly accessible at bustime.sacrt.com with no authentication required. All three light rail lines (Blue, Gold, Green) are operational and serve the downtown Archives Plaza hub. No feed availability, licensing, licensing, or scope ambiguity blocks progression to Luke for D1 pack.
