# Calgary oracle clash report

D1 (published, as of 6 Sep 2026): **Calgary Transit CTrain** is a light rail system operated by the City of Calgary. Static GTFS via [Open Calgary data portal](https://data.calgary.ca/Transportation-Transit/Calgary-Transit-GTFS/npk7-z3bj) at https://data.calgary.ca/download/npk7-z3bj/application/zip (no key required; verified 6 Sep 2026 via Transitland Onestop ID `f-c3nf-calgarytransit`). **Real-time feeds:** GTFS-RT TripUpdates, VehiclePositions, and ServiceAlerts available via Open Calgary (no key required). Both Red Line (201) and Blue Line (202) share a downtown section on the 7 Avenue Transit Mall with eight stations in the free-fare zone (downtown core). Hub lock: **City Hall/Bow Valley College** (eastern extent of free-fare zone; serves both Red and Blue lines via dual-side platforms; rebuilt 2011).

## V1 scoping — Red Line + Blue Line, downtown free-fare zone

**v1 assumption:** Red Line (201: Somerset–Bridlewood to Tuscany) and Blue Line (202: 69 Street/Saddletowne to Westgate/69 Street). Both lines share eight stations on the downtown 7 Avenue Transit Mall between Downtown West–Kerby (11 Street SW) and City Hall/Bow Valley College (Macleod Trail). V1 excludes: no LRT north extension, no commuter rail, no bus, no transfer stations outside CTrain network. Schedule + real-time next-train boards at all CTrain stations.

## Station name table

Match rule: published CTrain station name (Transitland GTFS agency index + official Calgary Transit service map).

| published (CTrain) | agency print | lines | class |
| --- | --- | --- | --- |
| City Hall/Bow Valley College | City Hall / BVC (downtown core, 7 Ave & Macleod Trail) | Red (201), Blue (202) | **hub lock** — dual-side platforms, both lines stop; eastern extent of free-fare zone. Rebuilt 2011. |
| Centre Street | Centre Street station (124 7 Avenue SE, downtown) | Red (201), Blue (202) | Shared downtown station. Part of 7 Avenue Transit Mall. |
| 1 Street SW | 1 Street SW station (121C - 7 Avenue SE, downtown) | Red (201), Blue (202) | Shared downtown station, free-fare zone. Westbound platforms only; eastbound platforms at Centre Street. |
| 3 Street SW | 3 Street SW station (333C - 7 Avenue SW) | Red (201), Blue (202) | Shared downtown station. |
| 6 Street SW | 6 Street SW station (631C - 7 Avenue SW) | Red (201), Blue (202) | Shared downtown station. |
| 7 Street SW | 7 Street SW station (840C - 7 Avenue SW) | Red (201), Blue (202) | Shared downtown station. |
| 8 Street SW | 8 Street SW station (901C - 7 Avenue SW) | Red (201), Blue (202) | Shared downtown station. |
| Downtown West–Kerby | Downtown West–Kerby station (11 Street & 7 Avenue SW) | Red (201), Blue (202) | Western end of shared downtown section; both lines stop. |

CTrain operates 45 stations total across Red and Blue lines. V1 includes all published CTrain stops (full network: Red Line terminals Tuscany and Somerset–Bridlewood; Blue Line terminals 69 Street/Saddletowne and Westgate). No same-name different-line collisions documented.

## H2 clash surface

**No product `lib/cities/calgary/` exists.** Clash is **GTFS agency ID + published CTrain line colors + station geometry**. Calgary Transit GTFS agencies: route_id format (201 Red, 202 Blue) with route_color (Red Line RGB, Blue Line RGB) per agency feed documentation. Transitland feed is live and current (100+ feed versions maintained; last verified 6 Sep 2026). GTFS-RT feeds on Open Calgary are accessible without key (unlike Transitland feeds that require tokens for some cities). No clash with vancouver / toronto / edmonton / any other Canadian city.

## C2/C3 to put in front of Jim

1. **city=calgary**, not `ctrain`, not `ct`, not `calgary-transit`. Do not merge with vancouver or edmonton.
2. **City Hall/Bow Valley College** is the locked downtown hub where both Red (201) and Blue (202) lines interconnect via dual-side platforms (rebuilt 2011). Eastern extent of the free-fare zone.
3. **Downtown 7 Avenue Transit Mall:** All eight downtown stations (Downtown West–Kerby, 8 Street SW, 7 Street SW, 6 Street SW, 3 Street SW, 1 Street SW, Centre Street, City Hall/Bow Valley College) are shared transfer points. Two distinct platforms (one per direction on the street-level transit-only corridor). Do not collapse into a single "downtown" station; keep all eight published stops.
4. **Red Line (201):** Somerset–Bridlewood (south) to Tuscany (northwest via downtown). Blue Line (202): 69 Street/Saddletowne (northeast) to Westgate (northwest) via downtown shared section.
5. **Free-fare zone:** Downtown 7 Avenue Transit Mall from Downtown West–Kerby to City Hall/Bow Valley College operates as zero-fare for both lines. Note for riders; no impact on v1 eligibility. (City Council motion May 2026 proposes ending free-fare zone from 1 Aug 2026; verify current status at D1 pack stage if live after 1 Aug 2026.)
6. **Modes v1:** CTrain light rail only (Red Line 201 + Blue Line 202). No commuter rail, bus, or other operators.
7. **GTFS-RT feeds:** All three feeds (TripUpdates, VehiclePositions, ServiceAlerts) accessible via Open Calgary without key. Next-train boards at all stops.
8. **GTFS route_id format:** 201 (Red), 202 (Blue). Agency ID in GTFS confirms Calgary Transit. No interline with other agencies.
9. This pack stays **planned**.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (CTrain Red + Blue at all in-catalog stations):**

| Service | Operator | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence |
|---|---|---|---|---|---|---|
| **Red Line (201: Somerset–Bridlewood — Tuscany)** | Calgary Transit (City of Calgary) | All 45 CTrain stations | No (walk-up only, light rail proof-of-payment fare system) | No (platform access unrestricted; fare inspection on-vehicle) | `in` | [Calgary Transit CTrain service info](https://www.calgarytransit.com/service-updates/ctrain-service.html); light rail operates open-entry platforms with on-board proof-of-payment enforcement (no airport-style gates). Walk-up boarding at all stops. |
| **Blue Line (202: 69 Street/Saddletowne — Westgate)** | Calgary Transit (City of Calgary) | All 45 CTrain stations | No (walk-up only, light rail proof-of-payment fare system) | No (platform access unrestricted; fare inspection on-vehicle) | `in` | Same as Red Line; shared fare system and platform access. Walk-up boarding at all stops. |

**Board eligibility summary:** Both CTrain Red Line and Blue Line are walk-up boardable at all 45 stations (no compulsory reservation, no check-in barrier). Both pass all walk-up boarding tests. All verdicts are `in`; no silent omissions or product-eligibility cuts. No services excluded due to reservation or barrier requirements.

## What I did not do

No `line-map` generator, no `stopIds` in published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no commingling with vancouver / edmonton / other cities, no GTFS feed download or parsing, no API calls with real credentials, no city=ct / ctrain / calgary-transit invention, no compulsory next-train gate.

## License

- **License name:** Open Data Catalogue Terms of Use (City of Calgary) / Open Government Licence – City of Calgary variant.
- **Redistribution / rehosting:** City of Calgary grants a "non-exclusive, world-wide license to use, modify, and distribute the Data" for any lawful purpose. Derivative works and redistribution to third-party rider clients via Next Train API are permitted under OGL terms.
- **Commercial use:** Allowed. License explicitly permits use "for any lawful Use," including commercial applications without restriction or fee requirements.
- **Attribution:** Not required by OGL, but encouraged. Users may voluntarily announce that data is publicly available from the City of Calgary. **Trademark restrictions:** Users are not licensed to use the City of Calgary's trademarks, official marks, logos, or crests when crediting the source.
- **Terms URL:** [Open Data Catalogue Terms of Use (City of Calgary)](https://data.calgary.ca/d/Open-Data-Terms/u45n-7awa). Base OGL reference: [Open Definition – Calgary License Review](https://opendefinition.org/licenses-md/inreview/Calgary/). Feed landing: [Transitland f-c3nf-calgarytransit](https://www.transit.land/feeds/f-c3nf-calgarytransit); [Open Calgary GTFS](https://data.calgary.ca/Transportation-Transit/Calgary-Transit-GTFS/npk7-z3bj).
- **Confidence:** `clear` on redistribution, commercial use, and attribution restrictions. OGL City of Calgary variant is published and consistent with Canadian OGL family. GTFS and GTFS-RT feeds are both live on Open Calgary (verified 6 Sep 2026). No public-domain claim, but terms are explicit and permissive.
- **Keyed feeds:** No keys required. Static GTFS (https://data.calgary.ca/download/npk7-z3bj/application/zip) and GTFS-RT feeds (TripUpdates, VehiclePositions, ServiceAlerts) are public endpoints on Open Calgary portal. No authentication, API tokens, or subscription required.

## Developer resources

- GTFS static feed: https://data.calgary.ca/download/npk7-z3bj/application/zip
- GTFS-RT TripUpdates: https://data.calgary.ca/Transportation-Transit/Calgary-Transit-Realtime-Trip-Updates-GTFS-RT/gs4m-mdc2 (data.calgary.ca API / Socrata endpoint)
- GTFS-RT Vehicle Positions: https://data.calgary.ca/Transportation-Transit/Calgary-Transit-Realtime-Vehicle-Positions-GTFS-RT/am7c-qe3u
- GTFS-RT Service Alerts: https://data.calgary.ca/Transportation-Transit/Calgary-Transit-Realtime-Service-Alerts-GTFS-RT/jhgn-ynqj
- Open Calgary data portal: https://data.calgary.ca/
- Calgary Transit official: https://www.calgarytransit.com/
- Transitland feed registry: https://www.transit.land/feeds/f-c3nf-calgarytransit (Onestop ID `f-c3nf-calgarytransit`)

## Skip risk

**None identified at D1 scope.** Calgary Transit GTFS and GTFS-RT feeds are live, current, and accessible via Open Calgary portal (no key required; verified 6 Sep 2026 via Transitland feed health). Both Red Line (201) and Blue Line (202) are operational and serve the downtown Calgary hub. License terms (OGL City of Calgary variant) are clear and permissive for redistribution and commercial use. GTFS-RT next-train boards confirmed available. No feed availability, licensing, or scope ambiguity blocks progression to Luke for D1 pack.

