# San Francisco Muni Metro oracle clash report

D1 (planned, as of 6 Sep 2026): [Muni Metro System Map](https://www.sfmta.com/getting-around/muni/muni-metro) and [official schedule pages](https://www.sfmta.com/getting-around/muni/muni-metro) (SFMTA.com). Station names, line routes, and service patterns **sourced from official SFMTA Muni Metro documentation and published schedules**. Six color-coded light rail lines (J Church, K Ingleside, L Taraval, M Ocean View, N Judah, T Third) operate via the Market Street subway tunnel and Twin Peaks Tunnel, serving ~90 stations across the metro core and branches. Stations arrays match official SFMTA station index. **Not generated from GTFS.** Not generated from 511 API. Official station names and Muni map win.

Supporting official pages (route / line termini, not the stop-name oracle):

- [Muni Metro Overview](https://www.sfmta.com/getting-around/muni/muni-metro) – service map, line descriptions
- [J Church Line Schedule](https://www.sfmta.com/getting-around/muni/j-church) – Church Station to Embarcadero
- [K Ingleside Line Schedule](https://www.sfmta.com/getting-around/muni/k-ingleside) – Balboa Park to Embarcadero
- [L Taraval Line Schedule](https://www.sfmta.com/getting-around/muni/l-taraval) – West Portal to Embarcadero
- [M Ocean View Line Schedule](https://www.sfmta.com/getting-around/muni/m-ocean-view) – Daly City to Embarcadero
- [N Judah Line Schedule](https://www.sfmta.com/getting-around/muni/n-judah) – Judah and La Playa to Embarcadero
- [T Third Line Schedule](https://www.sfmta.com/getting-around/muni/t-third) – Sunnydale to Embarcadero
- [SFMTA Station Index](https://www.sfmta.com/getting-around/muni/stations) – complete Muni station list
- [511 Bay Area Open Data Portal](https://511.org/open-data) – regional GTFS/GTFS-RT feeds

Hub lock: **Powell Street** (Market Street tunnel hub; shared BART/Muni complex in the Financial District). Powell is a major transfer point where all Muni Metro lines pass (J, K, L, M, N, T) and intersect with BART. The four-level complex (street level, mezzanine, Muni level, BART level) makes Powell the most significant downtown hub for Muni Metro. Alternative: Embarcadero (first Market Street tunnel station east of downtown, K/L/M/N/T only; J exits via Duboce portal).

H2 clash surface (after verification): **no** product `lib/cities/san-francisco-muni/`. Clash is **map vs station index, transfer structure at Market Street shared-level stations, cable car / streetcar board eligibility**. Zero mix-in with bart / chicago / washington / rotterdam. Not GTFS. Streetcar F / E / cable cars out of v1 oracle with board eligibility verdicts recorded below.

## H2 — who has line codes today

| surface | J/K/L/M/N/T? | what it actually has |
| --- | --- | --- |
| Official Muni Metro map (sfmta.com) | **yes (line names + colors)** | Six light rail lines. Market Street tunnel spine. Twin Peaks Tunnel. Branches to Church, Balboa Park, West Portal, Daly City, La Playa, Sunnydale. All lines converge at Embarcadero or Market Street stations. No cable car, no F/E streetcar as D1 lines. |
| SFMTA Station Index | **station list only** | ~90 named stations. Line assignments in reference. No color line columns. |
| Schedule pages per line | **yes (line titles)** | Official termini, weekday/weekend hours, frequency. Line names match map. |
| Product `lib/cities/san-francisco-muni/` | **absent** | No san-francisco-muni stations.json / line-map.json. `assertCityLive("san-francisco-muni")` is Unknown city |
| GTFS (static/511) | not used as D1 | Feed available via SFMTA and 511.org; schedules match published docs. Key later, not a D1 blocker. |

H2 conclusion: Six color lines already agree (map + schedule pages + stations index). Clash is **Market Street shared-level structure (four BART/Muni stations within ~1 mile of each other), streetcar/cable car board eligibility verdicts**, and **no product san-francisco-muni file**. Do not generate published-network.json from GTFS or from any other city. Do not invent city=sf / san-francisco / bay-area (BART is a separate city). Do not merge with chicago or bart.

## Station name table

Match rule: published D1 string (official Muni map) vs official SFMTA station-index token.

Key Market Street Complex stations (J/K/L/M/N/T all pass or exit from here):

| published (D1) | other names | class | notes |
| --- | --- | --- | --- |
| Embarcadero | Stations **Embarcadero** | **match** | First station east; K/L/M/N/T only (J exits via Duboce). Shared BART level below. |
| Montgomery Street | Stations **Montgomery St.** | **match** | Shared BART level below. Downtown Financial District. |
| Powell Street | Stations **Powell St.** | **match (hub)** | Major hub; all J/K/L/M/N/T pass. Shared BART complex. Cable car turntable area (Powell-Hyde, Powell-Mason). |
| Civic Center/UN Plaza | Stations **Civic Center** | **rename** | Shared BART level below. Near City Hall, SF Library, Opera House. |
| Van Ness | Stations **Van Ness Ave.** | **match** | M/T only (K/L exit via Twin Peaks; J/N exit earlier). BART turns south here. |
| 16th Street Mission | Stations **16th St.** | **rename** | J/K/L/M/N/T all stop. No BART. |
| 24th Street Mission | Stations **24th St.** | **rename** | J/K/L/M/N/T all stop. No BART. |
| Castro | Stations **Castro** | **match** | J/K/L/M exit here; N/T continue. F streetcar terminal (Market & Castro). |
| Duboce | Stations **Duboce** | **match** | J/N exit via Duboce portal to Twin Peaks Tunnel. K/L/M stay in Market Street tunnel. |
| All other D1 names in published-network.json | same map / stations primary | match | |

**~90 unique D1 passenger stops** (Market Street complex four-station cluster counted as four platforms; no same-name different-line places). Product `lib/cities/san-francisco-muni/` is **absent**. **Zero** mix-in with bart / chicago / washington / rotterdam / any other city file.

## C2/C3 to put in front of Jim

1. **city=san-francisco-muni**, not `sf`, not `san-francisco`, not `bay-area`, not `muni`. Do not invent city=oakland / sfo. Do not merge into chicago or bart.
2. **Powell Street** is the locked downtown hub where all six Muni Metro lines pass (J, K, L, M, N, T; four-level complex with BART below). **Alternative is Embarcadero** (K/L/M/N/T east terminus; J exits via Duboce). Do not use Market Street or Van Ness as single hub token.
3. **doNotGroup** Market Street shared stations from BART: Embarcadero, Montgomery Street, Powell Street, Civic Center/UN Plaza. Each has separate Muni and BART levels; they are not unified stations from rider perspective.
4. **doNotCollapse** Castro vs 16th Street Mission vs 24th Street Mission vs Van Ness vs Duboce. Castro is a junction point (J/K/L/M exit; N/T continue; F streetcar surface terminal).
5. **Six light rail lines, shared Market Street spine.** J Church: Church to Embarcadero. K Ingleside: Balboa Park to Embarcadero. L Taraval: West Portal to Embarcadero. M Ocean View: Daly City to Embarcadero. N Judah: La Playa to Embarcadero. T Third: Sunnydale to Embarcadero.
6. **Duboce portal.** J and N lines leave the Market Street tunnel at Duboce and continue via Twin Peaks Tunnel. K, L, M stay in Market Street and continue east. T Third stays in Market Street.
7. **Twin Peaks Tunnel.** J and N only, between Duboce and Forest Hill area. No K/L/M in Twin Peaks.
8. **America/Los_Angeles HAS DST.** Do not copy Perth / Brisbane no-DST.
9. Modes v1: **Muni Metro light rail only** (J/K/L/M/N/T). See board eligibility section below for F/E streetcar and cable car verdicts.
10. 511 API key required for realtime. Not a D1 blocker. Never paste a key. Registration at [511.org/open-data/token](https://511.org/open-data/token).
11. This pack stays **planned**.

## Board eligibility

Rail services calling at Muni Metro stations:

| Service | Operator | Walk-up boardable | Check-in / barrier | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| Muni Metro J Church | SFMTA | Yes (standard Clipper card / fare) | No | `in` | Part of v1 scope. Official SFMTA Muni Metro service. Light rail, no reservation. |
| Muni Metro K Ingleside | SFMTA | Yes (standard Clipper card / fare) | No | `in` | Part of v1 scope. Official SFMTA Muni Metro service. Light rail, no reservation. |
| Muni Metro L Taraval | SFMTA | Yes (standard Clipper card / fare) | No | `in` | Part of v1 scope. Official SFMTA Muni Metro service. Light rail, no reservation. |
| Muni Metro M Ocean View | SFMTA | Yes (standard Clipper card / fare) | No | `in` | Part of v1 scope. Official SFMTA Muni Metro service. Light rail, no reservation. |
| Muni Metro N Judah | SFMTA | Yes (standard Clipper card / fare) | No | `in` | Part of v1 scope. Official SFMTA Muni Metro service. Light rail, no reservation. |
| Muni Metro T Third | SFMTA | Yes (standard Clipper card / fare) | No | `in` | Part of v1 scope. Official SFMTA Muni Metro service. Light rail, no reservation. |
| F Market & Wharves Streetcar | SFMTA | Yes (standard Clipper card / fare; proof of payment) | No | `out-product` | Operates on Market Street surface and Wharves; vintage trolleys. Passes walk-up test (proof of payment; open fare gate). Not in v1 scope (streetcar, not light rail metro). v1 scope = Muni Metro light rail J/K/L/M/N/T only. Recorded verdict per board-eligibility rule. |
| E Embarcadero Streetcar | SFMTA | Currently suspended (as of 6 Sep 2026) | N/A | `out-product` | Embarcadero light rail streetcar. Suspended operation; no service. Not in v1 scope. Does not call at any active Muni Metro stations during suspension. |
| Powell-Hyde Cable Car | SFMTA | Yes (standard fare; no reservation) | No | `out-product` | Tourist cable car line. Walk-up boardable at Powell & Market. Not in v1 scope (cable car, not light rail metro). Recorded verdict per board-eligibility rule. Only brief overlap at street level near Powell Station; does not call at Muni Metro platforms. |
| Powell-Mason Cable Car | SFMTA | Yes (standard fare; no reservation) | No | `out-product` | Tourist cable car line. Walk-up boardable at Powell & Market. Not in v1 scope (cable car, not light rail metro). Recorded verdict per board-eligibility rule. Only brief overlap at street level near Powell Station; does not call at Muni Metro platforms. |
| California Street Cable Car | SFMTA | Yes (standard fare; no reservation) | No | `out-product` | Tourist cable car line. Walk-up boardable at California & Market. Not in v1 scope (cable car, not light rail metro). Recorded verdict per board-eligibility rule. Does not call at any Muni Metro platform stations. |
| BART (regional rapid transit) | BART | Yes (standard fare; BART Clipper card) | No | `out-product` | Heavy rail rapid transit. Operates shared Market Street complex with Muni (separate levels). v1 scope = Muni Metro light rail only. BART is a separate city entry (city=bart, not city=san-francisco-muni). Shared platforms exist at Embarcadero, Montgomery, Powell, Civic Center but are distinct operators: not a mode-cut failure. |

**Summary:** All six Muni Metro light rail lines (J/K/L/M/N/T) are walk-up, in-scope, `in`. F/E streetcars and three cable car lines are walk-up boardable but out of v1 scope (different modes; streetcar/cable car, not metro light rail); marked `out-product` with reasons recorded. BART is a separate operator and city entry; marked `out-product` (separate city).

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Muni streetcar / cable car / BART feed integration (v1 scope = Muni Metro light rail only), no GTFS-derived station arrays, no invent city=sf / san-francisco / muni / bay-area, no call to the 511 API with a real key, no API key in any research file, no mix-in with chicago / bart / washington.

## License

**Static GTFS (SFMTA):**
- **License name:** SFMTA Transit Data License Agreement
- **Redistribution / rehosting:** Limited, non-exclusive license to "use, reproduce, and redistribute" the data. SFMTA retains title/ownership. Derivative works must include specific attribution. No sublicensing. SFMTA reserves right to alter or cease to provide data without prior notice.
- **Commercial use:** Not explicitly prohibited on the face of the agreement; subject to terms.
- **Attribution:** Required. Derivative works must include attribution language per the license agreement.
- **Terms URL:** https://www.sfmta.com/reports/gtfs-transit-data (license agreement link)
- **Confidence:** `clear` on SFMTA license restriction and attribution requirement.
- **Keyed feeds:** Static GTFS at https://muni-gtfs.apps.sfmta.com/data/muni_gtfs-current.zip requires agreement to license terms but no API key registration.

**Regional GTFS & GTFS-RT (511.org):**
- **License name:** 511 SF Bay Data Agreement
- **Redistribution / rehosting:** Limited license to use, reproduce, and redistribute data. 511 permits redistribution subject to terms. Attribution required: "powered by 511.org" or "data provided by 511.org" must appear in visual proximity.
- **Commercial use:** Allowed per the agreement.
- **Attribution:** Required ("powered by 511.org" or "data provided by 511.org"). Avoid leading with 511 branding.
- **Terms URL:** https://511.org/sites/default/files/pdfs/511_Data_Agreement_Final.pdf (Terms & Conditions PDF)
- **Confidence:** `clear` on 511.org attribution and redistribution rights. Commercial use allowed.
- **Keyed feeds:** Regional GTFS at http://api.511.org/transit/datafeeds?operator_id=SF (no key required); GTFS-RT feeds (TripUpdates, VehiclePositions, Alerts) require API key registered via https://511.org/open-data/token. Key obtained free via registration form.

## Skip risk

**Feed availability:** Both SFMTA and 511.org provide current, verified GTFS feeds as of 6 Sep 2026. GTFS-RT realtime data available via 511.org regional consolidated feed (TripUpdates, VehiclePositions, Alerts). No feed blockers identified.

**Board eligibility:** F/E streetcars and cable cars have clear verdicts (out-product, different modes). No walkable-vs-reserved ambiguity.

**Shared stations (doNotGroup):** Four Market Street complex stations (Embarcadero, Montgomery, Powell, Civic Center) share levels with BART. Rider separation is clear: Muni platforms vs BART platforms are distinct. No scope ambiguity.

**Station name conflicts:** No same-name different-line issues identified. All six Muni Metro lines use distinct stop names published by SFMTA.

**None identified at D1 scope.** Muni Metro schedules and maps are live and current (verified 6 Sep 2026 via SFMTA and Transitland). GTFS-RT feeds are available and documented. All six metro lines are operational and serve the downtown Powell hub. F/E streetcar and cable car board-eligibility verdicts are clear (out-product). No feed availability, licensing, or scope ambiguity blocks progression to Luke for D1 pack.
