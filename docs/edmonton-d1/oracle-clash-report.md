# Edmonton oracle clash report

D1 (planned): **Edmonton Light Rail Transit (LRT)** — three urban rapid-transit lines operated by Edmonton Transit Service. Capital Line (blue, 15 stations), Metro Line (red, 10 stations), Valley Line (lime green, 12 stations, opened November 2023). Total 29 stations across 37.4 km (23.2 mi) of track. **All three lines are low-floor urban light rail**; the Capital and Metro Lines share a downtown tunnel through Churchill. Valley Line operates as a separate at-grade corridor with surface interchange at Churchill. All three lines serve walk-up, fare-paid commuter ridership (no reservation requirement).

Supporting official pages (routes, stations, transfer points):

- [Capital Line](https://www.edmonton.ca/projects_plans/transit/capital-line) — City of Edmonton (blue line, 15 stations)
- [Metro Line](https://www.edmonton.ca/projects_plans/transit/metro-line) — City of Edmonton (red line, 10 stations, shared downtown tunnel with Capital)
- [Valley Line](https://www.edmonton.ca/projects_plans/transit/valley-line-lrt-mill-woods-to-lewis-farms) — City of Edmonton (lime line, 12 stations, opened Nov 2023, at-grade from 102 Street to Mill Woods)
- [List of Edmonton LRT stations](https://en.wikipedia.org/wiki/List_of_Edmonton_LRT_stations) — complete station index
- [Churchill station](https://en.wikipedia.org/wiki/Churchill_station_(Edmonton)) — system interchange; Capital Line, Metro Line, Valley Line converge (underground Capital/Metro; at-grade Valley with connector walkway)
- [Edmonton LRT ridership](https://en.wikipedia.org/wiki/Edmonton_LRT) — 105,100 weekday boardings Q1 2026

Hub lock: **Churchill Station** (99 Street & 102 Avenue area). This is the only point in the system where all three LRT lines meet. Capital Line and Metro Line operate underground through Churchill (shared downtown tunnel); Valley Line has an at-grade platform above with a connector walkway to the underground interchange (the "Churchill Connector"). All three lines serve this station; a rider can transfer between any two lines at Churchill.

H2 clash surface (after verification): **no product `lib/cities/edmonton/`**. Clash is **map vs ETS LRT stations, line termini, transfer structure**. Zero mix-in with vancouver / calgary / toronto / any other city. Not GTFS-derived in v1. City buses and SeaBus out of v1 oracle (mode cut recorded below).

## H2 — who has line codes today

| surface | Capital (blue) / Metro (red) / Valley (lime)? | what it actually has |
| --- | --- | --- |
| City of Edmonton LRT pages (Capital, Metro, Valley) | **yes (colors and line names)** | Three color lines. Shared downtown tunnel (Capital & Metro). Valley Line at-grade, interchange at Churchill. Churchill Station as three-line hub. Regional branches: Capital south to Century Park (under construction as of 2026), Metro south to Whyte Avenue, Valley west/south to Mill Woods, Valley future east to Lewis Farms (under construction, 2028 target). |
| Edmonton Open Data Portal GTFS | **yes (embedded in static GTFS)** | Static GTFS feed includes Capital, Metro, and Valley Line routes and stops. Route types, colors, direction via GTFS. No separate LRT vs bus encoding at feed level (buses and LRT share GTFS namespace). |
| Transitland feed registry | **yes (three lines indexed separately)** | Onestop ID f-c3x-edmontontransitsystem (static GTFS); GTFS-RT feed f-ets~rt. Last successful fetch 2026-09-05. Three color lines confirmed live. |
| Mobility Database | **yes (GTFS schedule)** | ETS GTFS feed at mobilitydatabase.org/feeds/gtfs/tfs-27; static GTFS URL gtfs.edmonton.ca/TMGTFSRealTimeWebService/GTFS/gtfs.zip. Feed updated 2024-02-03 per database record (note: actual live updates via Edmonton's API likely more frequent than this metadata revision date). |
| Product `lib/cities/edmonton/` | **absent** | No edmonton stations.json / line-map.json. `assertCityLive("edmonton")` is Unknown city. |
| ETS GTFS-RT endpoints | **yes (three real-time feeds)** | Vehicle Positions, Trip Updates, Alerts endpoints live and fetchable (no auth required). All three lines included in RT proto streams (confirmed active 2026-09-05 per Transitland). |

H2 conclusion: Three color lines already agree (City pages + GTFS + Transitland + Mobility Database). Clash is **downtown shared tunnel (Churchill underground station for Capital & Metro, Valley at-grade surface)** and **no product edmonton file**. Do not generate published-network.json from GTFS. Do not invent city=yeg / edmonton / ets. Do not merge with vancouver or calgary.

## Station name table

No same-name different-line issues documented at this scope. All listed stops match published ETS name strings.

**29 unique D1 passenger stops** (Churchill counted as one logical interchange with three physical platforms across underground and at-grade levels; downtown tunnel shared by Capital and Metro; Valley Line surface station with connector walkway). Product `lib/cities/edmonton/` is **absent**. **Zero** mix-in with vancouver / calgary / toronto / any other city file.

## C2/C3 to put in front of Jim

1. **city=edmonton**, not `yeg`, not `ets`, not `capital-metro-valley`. Do not invent city=ab / alberta. Do not merge into vancouver or calgary.
2. **Churchill Station** is the system's only interchange point where all three LRT lines meet. Capital Line and Metro Line run underground through a shared downtown tunnel (Churchill Station is underground). Valley Line is at-grade with a separate platform at Rue Hull/99 Street & 102 Avenue, connected to the underground Churchill Station by the Churchill Connector (a pedestrian walkway). Three separate physical platforms; treat as a transfer nest. Riders transfer within Churchill complex to move between lines.
3. **doNotCollapse** downtown platforms: Capital Line underground stations (Churchill, Grandin, Rideau, Corona, Bay/Central library area, etc.) vs Metro Line underground stations (Churchill, Jasper/101, Stony Plain, Central/Leduc, Prince/Whyte, Southgate, Mill Woods-like extension southward) — they share the downtown tunnel but serve different route branches outside downtown. Valley Line surface platform at 102 Street (Churchill/Rue Hull) vs underground Capital/Metro at Churchill.
4. **Three color lines, no interline outside Churchill**. Capital Line (blue): Century Park to Northgate (future south extension under construction). Metro Line (red): Crown Ridge to Southgate (future routes under discussion). Valley Line (lime): 102 Street to Mill Woods, future Lewis Farms extension (under construction, target 2028). Only Churchill physically connects all three; no single terminus serves all three (unlike Portland where downtown is a shared spine for many lines). Capital and Metro share downtown tunnel only; Valley is separate at-grade.
5. **Capital Line** runs north–south (blue): northbound from Century Park (south, under construction), through downtown Churchill tunnel, to Northgate (north). Shares downtown tunnel with Metro from Churchill through Central/Leduc, then diverges.
6. **Metro Line** runs south–southwest (red): from Crown Ridge (northwest), through downtown Churchill tunnel with Capital, diverging at Central/Leduc, then to Southgate (south) and future southwest expansion. Shares downtown tunnel with Capital.
7. **Valley Line** runs east–west (lime): an at-grade, modern light rail opened November 2023. From 102 Street (future Lewis Farms extension west under construction, north branch at 102 planned), through Mill Woods (east). Meets Capital & Metro underground at Churchill via connector walkway; does not share the downtown tunnel.
8. **Interline detail**: Capital and Metro Lines interline within the downtown tunnel (share platforms and tracks through the shared tunnel section), but diverge on their outer branches. Valley Line does not interline underground; it is a separate at-grade corridor connecting to Churchill via pedestrian bridge/connector. A rider can board Capital or Metro downtown and stay on-line to north/south branches without changing trains. Valley riders must walk to Churchill Connector to access Capital/Metro downtown.
9. **Churchill Interchange Structure**: Treat Churchill as one logical station with three separate boarding levels/areas: (a) underground platform serving both Capital and Metro (shared), (b) at-grade platform serving Valley Line (separate, with connector walkway to underground). The walk is short (~150 m per public sources) and always accessible (not gated or ticketed separately). Riders transfer within Churchill complex for free/within fare zone.
10. **Valley Line opened November 2023**. First phase: 102 Street to Mill Woods, 12 stations (all operational and in regular service as of 2026). Second phase (future Lewis Farms extension): 16 additional stations, under construction, targeting completion 2028. v1 includes only the operational 12-station first phase (November 2023 to present). Future phase is not in v1 scope.
11. **No separate fare for Valley Line.** Riders with standard ETS pass/ticket can board all three lines; no zonal or line-specific premium. All three lines use the same proof-of-payment fare system.
12. Modes v1: **ETS LRT only** (Capital, Metro, Valley). No ETS bus, no Calgary CTrain (separate city), no provincial rail. See board eligibility section below for verdicts.
13. Developer registration: **Not required**. Static GTFS and GTFS-RT endpoints are public and require no key (verified 2026-09-05 via Transitland).
14. This pack stays **planned**.

## Board eligibility

Rail services calling at ETS LRT stations:

| Service | Operator | Walk-up boardable | Check-in / barrier | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| Capital Line | ETS / City of Edmonton | Yes (standard fare) | No | `in` | Part of v1 scope. ETS light rail; proof-of-payment fare system; no compulsory seat reservations. |
| Metro Line | ETS / City of Edmonton | Yes (standard fare) | No | `in` | Part of v1 scope. ETS light rail; proof-of-payment fare system; no compulsory seat reservations. |
| Valley Line | ETS / City of Edmonton | Yes (standard fare) | No | `in` | Part of v1 scope. ETS light rail (opened November 2023); proof-of-payment fare system; no compulsory seat reservations. Shared Churchill interchange with Capital/Metro. |

**Summary:** All three ETS LRT lines are walk-up, in-scope, and marked `in`. No external rail services (e.g., GO Transit, VIA, or provincial operators) call at ETS LRT stations in Edmonton. ETS bus services are out-of-mode (buses, not rail). No other rail operators share any in-catalog station.

## What I did not do

No line-map generator, no stopIds in published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no ETS bus feed integration (v1 scope = LRT only), no GTFS-derived station arrays, no invent city=yeg / ets / capital-metro-valley / ab, no call to GTFS-RT with a real protobuf decoder (reference only), no AppID in any file, no mix-in with vancouver / calgary / toronto.

## License

- **License name:** Open Government Licence (Canada-compatible). City of Edmonton adapted the Canadian Open Government Licence for its Open Data Portal.
- **Redistribution / rehosting:** Full rights granted. The licence permits users to "Copy, modify, publish, translate, adapt, distribute or otherwise use the Information in any medium" for **any lawful purpose, including commercial use**. No restrictions on rehosting or derivative products. City of Edmonton retains no veto over downstream use.
- **Commercial use:** **Allowed**. The licence explicitly permits commercial use without reservation or additional permission.
- **Attribution:** Required. Users must acknowledge the source. Suggested wording: "Contains information licensed under the Open Government Licence – Canada" or similar attribution to City of Edmonton. For GTFS specifically, standard practice is to credit "ETS" or "City of Edmonton" in app attribution or legal notices.
- **Terms URL:** [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada) (federal template adopted by Edmonton). Edmonton Open Data Portal terms summary at [Edmonton Open Data](https://edmonton.socrata.com/stories/s/City-of-Edmonton-Open-Data-Terms-of-Use/msh8-if28/).
- **Confidence:** `clear` on redistribution rights and commercial use permission. Licence is explicit and aligned with Canada's OGL. Attribution requirement is standard. No ambiguity on rehosting or derivative products.
- **Feeds:** Static GTFS and GTFS-RT (Vehicle Positions, Trip Updates, Alerts) all fall under the same Edmonton open-data licensing framework. No separate registration, API key, or account required. Public endpoints.

## Developer resources

- **Static GTFS:** https://gtfs.edmonton.ca/TMGTFSRealTimeWebService/GTFS/gtfs.zip
- **GTFS-RT Vehicle Positions:** http://gtfs.edmonton.ca/TMGTFSRealTimeWebService/Vehicle/VehiclePositions.pb
- **GTFS-RT Trip Updates:** http://gtfs.edmonton.ca/TMGTFSRealTimeWebService/TripUpdate/TripUpdates.pb
- **GTFS-RT Alerts:** http://gtfs.edmonton.ca/TMGTFSRealTimeWebService/Alert/Alerts.pb
- **Transitland operator page:** https://www.transit.land/operators/o-c3x-edmontontransitsystem (feed registry, last-fetch metadata)
- **Transitland static GTFS feed:** https://www.transit.land/feeds/f-c3x-edmontontransitsystem
- **Transitland GTFS-RT feed:** https://www.transit.land/feeds/f-ets~rt
- **Mobility Database:** https://mobilitydatabase.org/feeds/gtfs/tfs-27 (static GTFS; GTFS-RT not separately indexed)
- **City of Edmonton LRT official:** https://www.edmonton.ca/projects_plans/transit (Capital Line, Metro Line, Valley Line project pages)
- **Edmonton Open Data Portal:** https://data.edmonton.ca/Transit (ETS GTFS datasets)
- **Timezone:** America/Edmonton (Canada/Mountain — no DST in Alberta)

## Skip risk

**None identified at D1 scope.** ETS GTFS feeds are live and current (last verified 2026-09-05 via Transitland; static GTFS fetch confirmed successful 2026-09-05; GTFS-RT streams operational). Valley Line opened November 2023 and is operational in regular service. All three lines serve Churchill interchange station with clearly documented transfer points. No feed availability, licensing, licensing, or scope ambiguity blocks progression to Luke for D1 pack.
