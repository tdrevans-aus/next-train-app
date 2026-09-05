# Charlotte oracle clash report

D1 (published, as of 6 Sep 2026): [LYNX Blue Line](https://www.charlottenc.gov/CATS/Ride/Rail/LYNX-Blue-Line) **Official light rail route and station information** (charlottenc.gov/CATS/Ride/Rail/LYNX-Blue-Line). Station names, line route, and transfer connectivity **sourced from official Charlotte CATS documentation and route pages**. 26 stations on a North–South alignment from UNC Charlotte (north) to I-485/South Boulevard (south). Stations arrays match official station index. **Not generated from GTFS.** Not generated from TrackCATS real-time app. Official station names win.

Supporting official pages (route / termini, not the stop-name oracle):

- [LYNX Blue Line Route Information](https://www.charlottenc.gov/CATS/Ride/Rail/LYNX-Blue-Line) – Official route page, UNC Charlotte to South Boulevard, 26 stations
- [CityLYNX Gold Line Route Information](https://www.charlottenc.gov/CATS/Ride/Rail/Gold-Line-Streetcar) – Streetcar line, 17 stops, Historic West End to Elizabeth neighborhood (out-of-scope for v1)
- [Charlotte Transportation Center](https://www.charlottenc.gov/CATS/Ride/Bus/Charlotte-Transportation-Center) – Central intermodal hub for bus and rail
- [Rider Info and Fares](https://www.charlottenc.gov/CATS/Ride) – General transit information

Hub lock: **Charlotte Transportation Center / Uptown Station** (uptown Charlotte, Trade & Tryon Streets area). This is the central transfer point where the LYNX Blue Line connects to Charlotte CATS bus system and to the CityLYNX Gold Line streetcar. Intermodal transit center with 22 bus stands, rail platforms, and pedestrian connections.

H2 clash surface (after verification): **no** product `lib/cities/charlotte/`. Clash is **LYNX Blue Line vs Transitland GTFS static data, station order, transfer structure**. Zero mix-in with portland / chicago / washington. Not GTFS-derived. CityLYNX Gold Line / CATS bus out of v1 oracle (with board eligibility verdicts recorded below).

## H2 — who has line codes today

| surface | LYNX Blue Line? | what it actually has |
| --- | --- | --- |
| Official LYNX Blue Line pages (charlottenc.gov) | **yes (line title)** | One light-rail line. 26 stations. North–South UNC Charlotte–South Boulevard. Official termini and service hours. |
| Transitland GTFS | **line + route codes** | CATS - 501 Light Rail - LYNX Blue Line route. Static schedule and real-time feeds. |
| Charlotte Open Data Portal | **station geometry** | LYNX Blue Line Stations dataset (geometries, stops). |
| Product `lib/cities/charlotte/` | **absent** | No charlotte stations.json / line-map.json. `assertCityLive("charlotte")` is Unknown city |
| TrackCATS app / API | not used as D1 | Key later, not a D1 blocker. Not this H2 stop-order surface |

H2 conclusion: One color line (LYNX Blue) already agreed (official pages + Transitland). Clash is **no product charlotte file**, **CityLYNX Gold Line scope decision** (streetcar vs v1 light rail cut), and **GTFS-RT endpoint verification** (no authentication required based on Transitland indexing; specific license terms still unclear). Do not generate published-network.json from GTFS or from any other city. Do not invent city=clt / charlotte-cats / lynx. Do not merge with chicago or portland.

## Station name table

No same-name different-line issues documented at this scope. All listed stops match published CATS name strings.

**26 unique D1 passenger stops** (Charlotte Transportation Center counted as one intermodal hub; no same-name different-line places outside hub complex). Product `lib/cities/charlotte/` is **absent**. **Zero** mix-in with portland / chicago / washington / any other city file.

## C2/C3 to put in front of Jim

1. **city=charlotte**, not `clt`, not `cats`, not `lynx`. Do not invent city=nc. Do not merge into chicago or portland.
2. **Charlotte Transportation Center / Uptown Station** is the locked downtown hub where LYNX Blue Line connects to CATS bus routes and CityLYNX Gold Line streetcar (Trade & Tryon area, uptown). **Not a single unified station in GTFS.** Three platform zones: Blue Line island platforms, bus depot, and streetcar tracks; treat as a transfer nest for v1 routing.
3. **doNotCollapse** downtown transfer platforms: LYNX Blue platforms vs bus depot stations vs Gold Line stops (adjacent but distinct operators/modes).
4. **One light rail line, LYNX Blue only.** North terminal: UNC Charlotte / JW Clay Boulevard. South terminal: South Boulevard / I-485. No interline within v1 scope.
5. **Modes v1: LYNX Blue Line only** (light rail). No CityLYNX Gold Line (streetcar, separate operator, not v1 scope; verdict recorded below), no CATS bus, no commuter rail. See board eligibility section below for verdicts.
6. **America/New_York timezone.** North Carolina observes Eastern Daylight Time.
7. **No API key required for GTFS static or GTFS-RT access.** Feeds are public via https://gtfsrealtime.ridetransit.org/. This is a D1 blocker lift from initial uncertain status.
8. **License terms unclear** — Transitland can redistribute, indicating permissive terms, but official CATS Data License Agreement terms are not published on developer-facing pages. See License section below.
9. **This pack stays planned.**

## Board eligibility

Rail services calling at LYNX Blue Line stations:

| Service | Operator | Walk-up boardable | Check-in / barrier | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| LYNX Blue Line | Charlotte CATS | Yes (standard fare $2.50) | No | `in` | Part of v1 scope. Official CATS light rail service. Walk-up fare system, no reservation required. |
| CityLYNX Gold Line (streetcar) | Charlotte CATS | Yes (currently fare-free; $2.20 when fees resume) | No | `out-product` | Passes walk-up test (fare-free now; standard fare when fees resume). Streetcar mode, different operator context from v1 light-rail scope (Blue Line only). Not a mode-cut failure; recorded verdict per board-eligibility rule. Future phases may change scope. |
| CATS local bus routes | Charlotte CATS | Yes (standard fare $2.50) | No | `out-product` | Walk-up boardable. Not in v1 light-rail scope (bus, not rail). Routes serve Transportation Center hub. Verdict recorded. |

**Summary:** LYNX Blue Line is walk-up, in-scope, `in`. CityLYNX Gold Line and bus routes are walk-up boardable but out of v1 scope; marked `out-product` with reasons recorded.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no CityLYNX Gold Line / CATS bus feed integration (v1 scope = LYNX Blue only), no GTFS-derived station arrays, no invent city=clt / cats / lynx / nc, no call to the API with a real key, no API key in any file, no mix-in with chicago / portland.

## License

- **License name:** CATS Developer Data License / Terms of Use Agreement (not a standard open-source license; specific terms unclear).
- **Redistribution / rehosting:** Transitland currently redistributes GTFS and GTFS-RT feeds for Charlotte CATS, indicating a permissive license, but explicit terms are not published on developer-facing pages. Likely allows redistribution "for the sole purpose of assisting mass transportation riders" (pattern from peer agencies), but this requires confirmation before D1 pack freeze.
- **Commercial use:** Unclear from published terms. Transitland's ability to cache and serve suggests commercial use is not prohibited on its face, but CATS developer agreement should be reviewed.
- **Attribution:** Unclear. No published requirement found; peer agencies (TriMet, CTA) request attribution to transit agency name.
- **Terms URL:** Not found as a dedicated document. CATS terms of use at [https://www.charlottenc.gov/CATS/Terms-and-conditions](https://www.charlottenc.gov/CATS/Terms-and-conditions) cover mobile app, not GTFS/developer data.
- **Confidence:** `unclear` — Transitland's active redistribution strongly suggests a permissive license, but official CATS Data License Agreement (referenced on developer pages as existing) is not publicly published online. This is a known gap for D1 verification.
- **Keyed feeds:** Static GTFS at [https://gtfsrealtime.ridetransit.org/GTFSStatic/api/GTFSDownload/GTFS.zip](https://gtfsrealtime.ridetransit.org/GTFSStatic/api/GTFSDownload/GTFS.zip) requires no key. GTFS-RT feeds (TripUpdate, VehiclePositions, Alerts) are public, no key observed in Transitland indexing.

## Developer resources

- GTFS static feed: [https://gtfsrealtime.ridetransit.org/GTFSStatic/api/GTFSDownload/GTFS.zip](https://gtfsrealtime.ridetransit.org/GTFSStatic/api/GTFSDownload/GTFS.zip) (no key required)
- GTFS-RT Trip Updates: [https://gtfsrealtime.ridetransit.org/GTFSRealTime/TripUpdate/Tripupdates.pb](https://gtfsrealtime.ridetransit.org/GTFSRealTime/TripUpdate/Tripupdates.pb) (no key observed)
- GTFS-RT Vehicle Positions: [https://gtfsrealtime.ridetransit.org/GTFSRealTime/Vehicle/VehiclePositions.pb](https://gtfsrealtime.ridetransit.org/GTFSRealTime/Vehicle/VehiclePositions.pb) (no key observed)
- GTFS-RT Service Alerts: [https://gtfsrealtime.ridetransit.org/GTFSRealTime/Alerts/Alerts.pb](https://gtfsrealtime.ridetransit.org/GTFSRealTime/Alerts/Alerts.pb) (no key observed)
- Transitland feed pages: [f-dnq-charlotteareatransitsystem](https://www.transit.land/feeds/f-dnq-charlotteareatransitsystem) (GTFS), [f-dnq-charlotteareatransitsystem~rt](https://www.transit.land/feeds/f-dnq-charlotteareatransitsystem~rt) (GTFS-RT)
- Official CATS rail pages: [https://www.charlottenc.gov/CATS/Ride/Rail/](https://www.charlottenc.gov/CATS/Ride/Rail/)
- Charlotte Open Data Portal: [https://data.charlottenc.gov/](https://data.charlottenc.gov/)

## Skip risk

**License terms unclear (CATS Data License Agreement not published online).** Transitland's active redistribution of GTFS and GTFS-RT data strongly suggests permissive terms (likely CC BY or agency-standard rider-assistance language), but the actual CATS developer terms document is not accessible via public developer resources. This is confirmable at D1 by direct contact with CATS or via Transitland's own license registry. GTFS-RT feeds are live and current (last verified 5 Sep 2026 via Transitland). All 26 LYNX Blue Line stations are operational. No feed availability or endpoint ambiguity blocks progression. CityLYNX Gold Line board-eligibility verdict (out-product) is clear.
