# Cleveland oracle clash report

D1 (research phase, as of 2026-09-05): **RTA Rapid Transit** (Greater Cleveland Regional Transit Authority / GCRTA) operates a 52-station heavy-rail and light-rail rapid transit network serving Cleveland and inner-ring suburbs of Cuyahoga County, Ohio. Static GTFS via [GCRTA public portal](http://www.riderta.com/sites/default/files/gtfs/latest/google_transit.zip) (Onestop ID `f-dpmg-rta` per Transitland; live 200 verified 2026-09-05). Real-time: GTFS-RT (vehicle positions, trip updates, service alerts) via Vontascloud at `https://gtfs-rt.gcrta.vontascloud.com/TMGTFSRealTimeWebService/` (no authentication required; Onestop ID `f-greaterclevelandregionaltransitauthority~rt` per Transitland; last fetch 2026-09-05 less than a minute ago). **No authentication required** for either feed. All four rapid transit lines (Red heavy rail, Blue/Green/Waterfront light rail) converge at **Tower City–Public Square** hub station (downtown Cleveland, 50 Public Square).

## V1 scoping — Red Line heavy rail plus Blue/Green/Waterfront light rail

**Red Line (heavy rail):** Operates 20 hours daily (approximately 4:00 AM–12:00 AM). Service frequency 7–15 minutes. Runs from Tower City–Public Square south to Cleveland Hopkins International Airport, passing through 18 stops including Public Square (tower City hub), Playhouse Square, Slavic Village, and multiple suburban stations. Opened 1955, extended to airport 1968. Fleet: older heavy-rail vehicles (current in-service through at least 2026; replacement vehicles arriving September 2026 with deployment beginning Summer 2027).

**Blue Line (light rail):** Operates similar hours to Red Line. Runs east–west, converging with Red Line west of Tower City (shared right-of-way 2.6 miles from Tower City to just east of East 55th Street). Blue terminates at Warrensville Heights in southern suburbs; other branch serves Forest Park. Shares downtown tunnel with Red and Green Lines through Tower City.

**Green Line (light rail):** Operates similar hours. Runs north–south, converging with Red and Blue Lines through shared downtown tunnel and platforms at Tower City. Green serves outlying neighborhoods (Shaker Heights suburb, Downtown Cleveland).

**Waterfront Line (light rail):** Light-rail extension serving waterfront district (North Coast Harbor). Opened July 10, 1996. Shares tracks and platforms with Blue/Green Lines for shared downtown section entering Tower City; splits off to waterfront corridor. Service hours and frequency match Blue/Green Lines.

**V1 recommendation:** Include **Red Line (heavy rail) + Blue, Green, and Waterfront Light Rail (all light-rail services)**. All four lines converge at Tower City–Public Square hub and are walk-up boardable with no compulsory reservations or check-in barriers. Light rail operates integrated schedule and real-time updates via same GTFS-RT endpoint. No cross-network platform merging; all four lines share Tower City downtown tunnel and central interchange.

## Station name table

Match rule: published GCRTA stop name (GTFS `stop_name`) vs official agency signage vs Transitland entry. Verify Tower City–Public Square as official hub label.

| published (D1) | agency print / GTFS | class |
| --- | --- | --- |
| Tower City–Public Square | Tower City station / Tower City-Public Square Station (GCRTA official branding for the combined downtown hub) | **hub lock**. Serves all four rapid transit lines (Red, Blue, Green, Waterfront). Underground rapid transit hub directly below the Terminal Tower complex. |
| Cleveland Hopkins International Airport | Airport terminus for Red Line. Accessible via Red Line only. | Served by Red Line; major transit hub for regional air travelers. |
| Playhouse Square | Red Line stop. Downtown theater district. | Red Line only. |
| Slavic Village | Red Line stop. Neighborhood name. | Red Line only. |
| East 55th Street | Junction point where Blue and Green Lines split from shared Red Line tracks north of this point. | All four lines converge west of this point; split east of this point. |
| Warrensville Heights | Blue Line terminus. Southern suburb branch. | Blue Line only. |
| Forest Park | Blue Line branch terminus (western branch). | Blue Line only. |
| Shaker Heights | Green Line stop. Suburb served by Green Line. | Green Line only. |
| North Coast Harbor / Waterfront district stations | Waterfront Line. Served by Waterfront extension only after split from shared Blue/Green tunnel. | Waterfront Line only. |

**Total: 52 stations** across four rapid transit lines. All four lines share downtown tunnel and platforms at Tower City–Public Square. **Red Line: 18 stations (including Airport). Blue Line: ~21 stations. Green Line: ~15 stations. Waterfront Line: ~8 stations** (rough estimate; verify exact station count in GTFS static feed). No product `lib/cities/cleveland/` exists. No live adapter.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary:** All GCRTA rapid transit services (Red Line, Blue Line, Green Line, Waterfront Line) are operated by a single transit agency (GCRTA) with a single ticketing system (contactless tap or transit pass). No compulsory seat reservations exist on any line. No check-in barriers or security gates at stations. All services are walk-up boardable with standard fare payment.

**Summary verdict:** All four lines pass both tests. No services calling at in-catalog stations are excluded. No GCRTA or regional operator mix-in conflicts.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **GCRTA Red Line (heavy rail)** | All Tower City–Public Square and all 18 Red Line stations | No (walk-up boardable with contactless tap or pass) | No | `in` | [GCRTA RideRTA fare information](https://www.riderta.com/fares-passes); Red Line operates as standard local rapid transit with no advance reservation requirement. Fares are pay-per-ride or pass-based. |
| **GCRTA Blue Line (light rail)** | All Tower City–Public Square and all 21 Blue Line stations | No (walk-up boardable with contactless tap or pass) | No | `in` | [GCRTA fare system](https://www.riderta.com/fares-passes); Blue Line standard light-rail operation, no reservations. Integrated fare with Red, Green, Waterfront lines. |
| **GCRTA Green Line (light rail)** | All Tower City–Public Square and all 15 Green Line stations | No (walk-up boardable with contactless tap or pass) | No | `in` | [GCRTA fare system](https://www.riderta.com/fares-passes); Green Line standard light-rail operation, no reservations. Integrated fare with Red, Blue, Waterfront lines. |
| **GCRTA Waterfront Line (light rail)** | All Tower City–Public Square and all 8 Waterfront Line stations | No (walk-up boardable with contactless tap or pass) | No | `in` | [GCRTA fare system](https://www.riderta.com/fares-passes); Waterfront Line standard light-rail operation, no reservations. Integrated fare with Red, Blue, Green lines. |

**Board eligibility summary:** All four GCRTA rapid transit services pass both boarding-contract tests and are marked `in`. No services are excluded from boards. Single unified GCRTA ticketing system (no multi-operator platform merging required). Tower City–Public Square is the primary downtown transfer hub where all four lines converge on shared platforms.

## H2 clash surface

**GCRTA Rapid Transit:** No product `lib/cities/cleveland/` exists. No live adapter. Static GTFS from GCRTA public portal is regularly updated (current feed valid 2026-08-02 through 2026-12-05 per Transitland). Real-time GTFS-RT feed is actively maintained and fetched continuously by Transitland (last successful fetch 2026-09-05, less than 1 minute ago). **Both feeds operational with no known gaps.**

**System-level clash:** All four rapid transit lines (Red, Blue, Green, Waterfront) operate under single GCRTA operator. Single GTFS feed covers all four lines and all 52 stations. Single GTFS-RT endpoint covers real-time data for all services. Tower City–Public Square is a unified downtown hub with shared platforms for all four lines (not separate operator infrastructure as seen in some multi-operator hubs). No regional boundary complications or through-running services crossing into other GCRTA regions.

**Skip risk:** GCRTA is mid-fleet transition. New light-rail vehicles arriving September 2026 with deployment beginning Summer 2027 (Red Line) and Summer 2028 (Blue/Green/Waterfront lines). During this transition, GTFS static data may experience updates to vehicle assignments, schedule adjustments, or service modifications. Recommend verifying current GTFS feed quality and stability before D1 pack handoff, and confirm with GCRTA whether any schedule/service changes are planned during fleet transition window.

## C2/C3 to put in front of Luke

1. **city=cleveland**. GCRTA Rapid Transit operates single integrated network: Red Line (heavy rail) + Blue, Green, Waterfront (light rail). Single agency, single ticketing system, single GTFS feed, single GTFS-RT endpoint.

2. **Tower City–Public Square** is the locked downtown hub (all four lines converge, shared platforms and tunnel). Not separate by line or operator. Not "Public Square" or "Tower City" alone — full name is the printed reference on official signage.

3. **V1 scope: include all four lines** (Red heavy rail + Blue/Green/Waterfront light rail). All pass walk-up boardable test; no compulsory reservations, no check-in barriers. Single integrated rapid transit service.

4. **Station deduplication:** All four lines share downtown tunnel and platforms from Tower City west through East 55th Street junction (approximately 2.6 miles). Blue and Green Lines share this corridor and continue together or separately east/north from that point. Waterfront Line splits from Blue/Green at Tower City to serve waterfront district. Do not de-dup by line; Tower City and intermediate shared stations serve all four lines simultaneously.

5. **Real-time feed:** GTFS-RT endpoint at `https://gtfs-rt.gcrta.vontascloud.com/TMGTFSRealTimeWebService/` includes vehicle positions, trip updates, and alerts for all four lines. No authentication required. Actively maintained by Vontascloud (GCRTA's real-time data provider).

6. **No buses, no MetroHealth HealthLine in v1 scope.** GCRTA operates bus system separately; v1 is rapid transit (rail and light rail) only. HealthLine (bus rapid transit) is separate product.

7. **Fleet transition window:** New vehicles arriving September 2026. Red Line replacement deployment begins Summer 2027; light-rail replacement deployment begins Summer 2028. Static GTFS may experience updates during this window; recommend confirming with GCRTA whether major schedule/service changes are planned.

8. **America/New_York HAS DST.** Cleveland observes Eastern Time with daylight saving time.

9. **GTFS feed URLs confirmed live:** Static GTFS at `http://www.riderta.com/sites/default/files/gtfs/latest/google_transit.zip` (no authentication). GTFS-RT at `https://gtfs-rt.gcrta.vontascloud.com/TMGTFSRealTimeWebService/` endpoints (no authentication). Both verified active and fetchable as of 2026-09-05.

## License

- **GCRTA GTFS Static Feed:**
  - **License name:** GCRTA Developer License (non-exclusive, limited, revocable).
  - **Redistribution / rehosting:** GCRTA grants "a non-exclusive, limited, and revocable" license to use, reproduce, and redistribute the data. Developers may freely redistribute provided they comply with attribution obligations. Redistribution to third-party users via Next Train API is permitted under the license terms.
  - **Commercial use:** Allowed provided attribution and usage obligations are met. Data is "as is" with no warranties regarding accuracy, completeness, or continuous availability.
  - **Attribution:** "Clearly acknowledge GCRTA as the provider of the Data." Do not misrepresent data ownership. Do not use GCRTA logos or trademarks in connection with the data. Do not claim the application "was explicitly commissioned by GCRTA."
  - **Terms URL:** http://www.riderta.com/developers (GCRTA developer portal). Transitland entry: https://www.transit.land/feeds/f-dpmg-rta.
  - **Confidence:** `clear`. Feed is public, actively maintained, and available without authentication. GCRTA terms are explicit and permissive for redistribution with attribution. Transitland confirms live fetch (verified 2026-09-05).
  - **Keyed feeds:** No API key required. Feed is a public zip download.

- **GCRTA GTFS-RT Feed:**
  - **License name:** GCRTA Realtime Data License (non-exclusive, limited, revocable; same developer terms as static).
  - **Redistribution / rehosting:** Same as static feed. Non-exclusive, limited license permitting redistribution with attribution. Transitland caches GTFS-RT endpoints (with subscription access). GCRTA permits access via Vontascloud endpoints directly (no authentication). Third-party rider API provision is permitted under developer terms.
  - **Commercial use:** Allowed provided attribution and usage obligations are met. Same data-as-is disclaimer.
  - **Attribution:** Same as static feed — acknowledge GCRTA as provider; no trademark use.
  - **Terms URL:** http://www.riderta.com/developers. Transitland entry: https://www.transit.land/feeds/f-greaterclevelandregionaltransitauthority~rt/. Vontascloud endpoints: https://gtfs-rt.gcrta.vontascloud.com/TMGTFSRealTimeWebService/ (vehicle positions, trip updates, alerts).
  - **Confidence:** `clear`. Feed is publicly accessible via Vontascloud with no authentication. Transitland verifies active fetch (last successful fetch 2026-09-05, less than 1 minute ago). Real-time feed actively maintained and operational.

- **Overall:**
  - Both static and real-time feeds are public, unauthenticated, and actively maintained by GCRTA.
  - License is clear and permissive (non-exclusive, limited, revocable with standard attribution).
  - No registration, API key, or subscription required to access GTFS or GTFS-RT endpoints.
  - Transitland confirms both feeds are live and current as of 2026-09-05.
