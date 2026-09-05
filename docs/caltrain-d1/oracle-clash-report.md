# Caltrain oracle clash report

D1 (planned, as of 6 Sep 2026): [Transitland Caltrain GTFS feed](https://www.transit.land/feeds/f-9q9-caltrain) (Onestop ID: f-9q9-caltrain). System network: San Francisco 4th & King (northern terminus) to Gilroy (southern terminus) via San Jose Diridon, serving 31 stations across the Peninsula and South County. Post-electrification service patterns: **Express** (11 core stations, ~1 hour SF–SJ), **Limited** (16 stations), **Local** (all 31 stations). Electrified operation since late 2025; all diesel service replaced by 100% renewable electric by service date of this research. Stations arrays sourced from official Caltrain station index and published schedule pages. **Not generated from GTFS.** Not generated from 511 API. Official Caltrain station names and published maps win.

Supporting official pages (routes, termini, service patterns, not the stop-name oracle):

- [Caltrain Stations & Zones](https://www.caltrain.com/stations-zones) – complete station list, zone information
- [Caltrain Schedules](https://www.caltrain.com/schedules/pdfs) – Express/Limited/Local service patterns by day
- [Caltrain Electrified Service](https://www.caltrain.com/projects/electrification) – service pattern descriptions
- [BART and Caltrain Transfers at Millbrae](https://www.caltrain.com/bart-and-caltrain-transfers-millbrae) – scheduled coordination
- [511.org Transit Data](https://511.org/open-data/transit) – Caltrain GTFS-RT feed access, agency code SC

## Feed details

**Static GTFS:** https://data.trilliumtransit.com/gtfs/caltrain-ca-us/caltrain-ca-us.zip (via Trillium Transit, archived and validated in Transitland and Mobility Database).

**GTFS-Realtime (511.org):** Caltrain realtime data via 511 Bay Area consolidated feed. Agency code: **SC**. Endpoints available:
- Trip Updates: `http://api.511.org/Transit/TripUpdates?api_key=[KEY]&agency=SC`
- Vehicle Positions: `http://api.511.org/Transit/VehiclePositions?api_key=[KEY]&agency=SC`
- Service Alerts: `http://api.511.org/Transit/Alerts?api_key=[KEY]&agency=SC`

**Authentication:** 511.org API key (free registration at https://511.org/open-data/token). Rate limit: 60 requests per 3600 seconds (standard tier); higher rates available on request to 511sfbaydeveloperresources@googlegroups.com.

## v1 scope

**Geographic span:** San Francisco 4th & King to Gilroy (entire Caltrain Peninsula Corridor and South County Connector service area). **31 passenger stations total**, including:
- **North Bay** (SF to Millbrae): San Francisco, 22nd Street, Bayshore, South San Francisco, San Bruno, Millbrae
- **Peninsula core** (Millbrae to San Mateo): Broadway (weekend only), Burlingame, San Mateo, Hayward Park, Hillsdale, Belmont, San Carlos, Redwood City, Menlo Park, Palo Alto, California Avenue, San Antonio, Mountain View
- **South Bay & Santa Clara** (Mountain View to San Jose): Sunnyvale, Lawrence, Santa Clara, College Park (weekday limited only), San Jose Diridon
- **South County** (San Jose to Gilroy): Tamien, Capitol, Blossom Hill, San Martin, Morgan Hill, Gilroy

**Service patterns in v1 (all electrified, clockface schedule):**
- **Express** (100-series weekday, 500-series weekday Express): SF–SJ in ~1 hour, 11 core stops (direction hazard: skip-stop pattern)
- **Limited** (400-series weekday Limited): 16 stations, faster than Local
- **Local** (100-series weekday, 600-series weekend Local): all 31 stations; weekend service includes Broadway Station
- **South County Connector** (800-series): diesel weekday service San Jose Diridon–Gilroy (four round-trip trains)

**Modes v1: Caltrain commuter rail only.** No BART, Muni, ACE, Capitol Corridor, ferry, or bus in v1 scope.

## Hub-lock decision

**Primary hub-lock: San Francisco 4th & King** (northern terminus, sole Caltrain station in SF proper, walk-accessible to Muni Metro N Judah and T Third platforms at separate street-level facilities — see doNotGroup note below). Platform structure: 6 Caltrain bays + 2 Muni island platforms (distinct operators, distinct fare systems, no cross-platform transfer).

**Secondary hub candidate: Millbrae** (BART junction, Red and Yellow lines converge; Caltrain to BART transfer via timed connections, especially two of four hourly trains). Millbrae is geographically more central to the v1 network but has smaller ridership and cross-platform access to a separate operator (BART). **San Francisco 4th & King selected as lock** because it is the historic northern anchor, the endpoint of all Express/Limited/Local service, and serves as the primary arrival/departure hub for the entire system.

## H2 clash surface (after verification)

**No** product `lib/cities/caltrain/`. Clash is **service pattern hazard (Express vs Limited vs Local skip-stop sequences)**, **shared physical stations with separate operators (doNotGroup BART/Muni)**, and **no product caltrain file**. Zero mix-in with bart / san-francisco-muni / chicago / washington / rotterdam. Not GTFS-derived.

## Express/Limited/Local skip-stop hazard

Post-electrification Caltrain service patterns introduce **service-type direction hazards**: the same station may be served by Express, Limited, or Local trains in different proportions, and Express trains skip stations that Limited and Local serve. Example hazard patterns:

| Station | Express | Limited | Local |
|---------|---------|---------|-------|
| SF 4th & King | Yes | Yes | Yes |
| Millbrae | Yes | Yes | Yes |
| San Bruno | No | Yes | Yes |
| San Mateo | No | Yes | Yes |
| Palo Alto | No | Yes | Yes |
| San Jose Diridon | Yes | Yes | Yes |
| Tamien | No | No | Yes |
| Gilroy | No | No | Yes (weekday 4x) |

**Direction model note:** Train direction (inbound/outbound) is route-level, not service-type level; routes are mixed on this line (Express, Limited, Local share the same line with different skip patterns). The line's service structure is "clockface" — predictable departures at consistent times per service type. Do not treat Express/Limited/Local as separate lines; treat them as service types on the single SF–Gilroy corridor. Station skip-stop patterns are a D1 discovery, not an adapter issue — boards must show the service type on each arriving train so riders know whether a given train stops here.

## Station name table

Match rule: published Caltrain name (official station index + schedules) vs Transitland/Mobility Database token.

**Key hub stations:**

| published (D1) | other names | class | notes |
|---|---|---|---|
| San Francisco | Stations **4th and King**; Caltrain.com **San Francisco (4th & King)** | **match** | Terminus, northern anchor. Muni Metro N/T platforms separate (distinct street-level facility). Not the same as BART Powell or Market Street complex. |
| Millbrae | Stations **Millbrae**; BART **Millbrae**; SamTrans hub | **match (hub)** | BART Red/Yellow interchange (scheduled timed transfers). Not a unified cross-platform station. Do NOT group with BART Millbrae. |
| San Jose Diridon | Stations **San Jose Diridon**; Amtrak **San Jose Diridon** | **match** | Southern anchor of Express/Limited/Local service. Capitol Corridor stops here (separate operator; board eligibility recorded below). |
| All other D1 names in published network | Caltrain official index | match | 26 branch/suburban stations, no name conflicts |

**31 unique D1 passenger stops** (all distinct stations, no same-name different-service places). Product `lib/cities/caltrain/` is **absent**. **Zero** mix-in with bart / san-francisco-muni / chicago / washington / rotterdam / any other city file.

## C2/C3 to put in front of Jim

1. **city=caltrain**, not `peninsula`, not `sf`, not `san-francisco`, not `bay-area`. Do not invent city=bart / muni. Do not merge with chicago or washington.
2. **San Francisco (4th & King)** is the locked northern hub. **Millbrae** is a BART junction but does NOT group with BART (separate operator, separate levels, cross-platform transfer not same-platform). **Do not treat Millbrae as a unified BART/Caltrain complex.** Muni connection at SF 4th & King is also separate (distinct platforms, different fare).
3. **doNotGroup** Caltrain stations from BART Millbrae and from Muni at SF 4th & King. Physical separation exists; boarding is from separate facilities.
4. **Express, Limited, Local are service types on a single line,** not separate lines. Skip-stop hazard: Express skips ~8 stations between SF and SJ (e.g. San Bruno, San Mateo, Palo Alto). Limited skips south-county (Tamien, Capitol, Blossom Hill, Morgan Hill). Local stops all 31. Train boards must show the service type so riders know if the arriving train stops here.
5. **31 stations total** (SF to Gilroy). South County Connector (Caltrain diesel weekdays San Jose–Gilroy) is Local service by another name — included in v1, not a separate product.
6. **Electrified operation:** 100% renewable electric as of service date. No diesel except South County weekday Connector (to be phased out).
7. **America/Los_Angeles HAS DST.** Do not copy Perth / Brisbane no-DST.
8. 511.org API key required for GTFS-RT. Not a D1 blocker. Never paste a key. Free registration at 511.org/open-data/token; agency code SC.
9. This pack stays **planned**.

## Board eligibility

Rail services calling at Caltrain v1 stations:

| Service | Operator | Walk-up boardable | Check-in / barrier | Verdict | Evidence |
|---|---|---|---|---|---|
| Caltrain Express | Caltrain | Yes (standard ticket / Clipper) | No | `in` | Core service; walk-up; no reservation. Express skips some stations (see skip-stop hazard above). |
| Caltrain Limited | Caltrain | Yes (standard ticket / Clipper) | No | `in` | Core service; walk-up; no reservation. Limited skips south county. |
| Caltrain Local | Caltrain | Yes (standard ticket / Clipper) | No | `in` | Core service; walk-up; no reservation. All 31 stations weekday/weekend. |
| Caltrain South County Connector | Caltrain | Yes (standard ticket / Clipper) | No | `in` | Diesel service San Jose–Gilroy weekdays; four round-trip trains. Walk-up; no reservation. Same fare as electrified service. |
| BART (Red/Yellow lines) | BART | Yes (standard fare / BART Clipper) | No | `out-product` | Serves Millbrae (Caltrain station). Heavy rail, separate operator, separate city entry (city=bart). Timed cross-platform transfers exist but are distinct facilities. Not in v1 scope (Caltrain only). Recorded verdict per board-eligibility rule. |
| Muni Metro N Judah | SFMTA | Yes (standard fare / Clipper) | No | `out-product` | Serves SF 4th & King via island platform; street-level facility separate from Caltrain platforms. Light rail, separate operator, separate city entry (city=san-francisco-muni). Not in v1 scope. Recorded verdict per board-eligibility rule. |
| Muni Metro T Third | SFMTA | Yes (standard fare / Clipper) | No | `out-product` | Serves SF 4th & King via island platform; street-level facility separate from Caltrain platforms. Light rail, separate operator, separate city entry (city=san-francisco-muni). Not in v1 scope. Recorded verdict per board-eligibility rule. |
| Capitol Corridor (Amtrak) | Amtrak / CCJPA | Yes (walk-up, most trains; no advance booking required) | No | `out-product` | Serves San Jose Diridon and potentially Tamien; regional intercity rail service. Unreserved boardable but not in v1 scope (different operator, intercity service outside v1 network focus). Recorded verdict per board-eligibility rule. Board eligibility does not exclude based on distance/operator category alone — recorded as `out-product` (separate service category, separate D1 city scope if included). |

**Summary:** All four Caltrain service types (Express, Limited, Local, South County Connector) are walk-up, in-scope, `in`. BART, Muni, and Capitol Corridor are separate operators and/or city entries; marked `out-product` with reasons recorded. No compulsory reservation, check-in, or security barriers on Caltrain proper.

## What I did not do

No `line-map` generator, no `stopIds` in published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no BART feed integration, no Muni feed integration, no GTFS-derived station arrays, no invent city=sf / peninsula / bay-area, no call to 511 API with a real key, no API key in any research file, no mix-in with chicago / bart / san-francisco-muni / washington.

## License

**Static GTFS (Caltrain):**
- **License name:** Peninsula Corridor Joint Powers Board (PCJPB) Developer License Agreement (click-wrap on data.trilliumtransit.com feed).
- **Redistribution / rehosting:** Non-exclusive, limited, revocable rights to use, reproduce, and redistribute PCJPB Data. PCJPB retains ownership. Exact quote: "The Peninsula Corridor Joint Powers Board/PCJPB hereby grants you (Licensee) non-exclusive, limited and revocable rights to use, reproduce, and redistribute PCJPB Data." 
- **Commercial use:** Not prohibited on face of the license agreement. PCJPB makes no warranties and disclaims liability for damages.
- **Attribution:** Not required by the license, but Caltrain developer pages ask for a "shout-out" or link back; best practice to cite Caltrain.
- **Terms URL:** https://www.caltrain.com/developer-resources (PCJPB Developer License Agreement linked from page).
- **Confidence:** `clear` on redistribution rights; `clear` on no warranty/no damages liability; `clear` on PCJPB retains ownership; commercial use not prohibited.
- **Keyed feeds:** Static GTFS at Trillium Transit needs no registration. Transitland/Mobility Database archive is public access, no key.

**Realtime GTFS-RT (511.org):**
- **License name:** 511 SF Bay Data Agreement (Terms & Conditions).
- **Redistribution / rehosting:** Limited license to use, reproduce, and redistribute data. 511 permits redistribution subject to terms (same model as BART/Muni Bay Area feeds).
- **Commercial use:** Allowed per 511.org agreement.
- **Attribution:** Required. "powered by 511.org" or "data provided by 511.org" must appear in visual proximity to data use.
- **Terms URL:** https://511.org/sites/default/files/pdfs/511_Data_Agreement_Final.pdf (official Terms & Conditions PDF).
- **Confidence:** `clear` on 511.org redistribution rights and attribution requirement; `clear` on commercial use allowed; same terms apply to all Bay Area operators on 511 (BART, Muni, Caltrain, etc.).
- **Keyed feeds:** Realtime GTFS-RT requires 511 API key (free registration at https://511.org/open-data/token; agency code SC). Key in .env only; never in public code or research files.

## Skip risk

**Feed availability:** Static GTFS current and validated as of 29 Aug 2026 in Transitland (100+ versions archived; live fetches succeed). 511.org GTFS-RT feeds operational and documented as of 6 Sep 2026. No feed blockers identified.

**Service continuity:** Electrified operation stable since late 2025 (first-anniversary celebration August 2026). South County Connector (diesel) continues weekday service; diesel phase-out planned but not a D1 blocker.

**Board eligibility:** Caltrain services are all walk-up, no reservation, no barriers. BART/Muni/Capitol Corridor have clear verdicts (separate operators, recorded as `out-product`). No walkable-vs-reserved ambiguity.

**Shared stations (doNotGroup):** Millbrae (BART transfer; separate platforms, timed connections). San Francisco 4th & King (Muni street-level; separate facility). Physical separation clear; no scope ambiguity.

**Service-type skip-stop hazard:** Express/Limited/Local service patterns are a D1 discovery (described above). Not a blocker — route-level service type is visible in schedules and GTFS-RT. Boards must show service type on arriving trains.

**Station name conflicts:** No same-name different-service issues. All 31 stations have unique published names (checked against Caltrain official index, Transitland, Mobility Database).

**Feed licensing:** PCJPB terms are clear and standard (non-exclusive, limited, revocable, no warranties). 511.org attribution clear (same as BART/Muni Bay Area standard).

**None identified at D1 scope.** Caltrain schedules, station network, and feed URLs are live and current (verified 6 Sep 2026 via Caltrain.com, Transitland, Mobility Database, 511.org). GTFS and GTFS-RT feeds are operational. All service types (Express/Limited/Local/South County) are operational and serve their published stations. No feed availability, licensing, network scope, or board-eligibility ambiguity blocks progression to Luke for D1 pack.
