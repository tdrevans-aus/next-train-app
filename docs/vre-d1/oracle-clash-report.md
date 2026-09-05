# Northern Virginia (VRE) oracle clash report

D1 (published, as of 6 Sep 2026): **Virginia Railway Express** operates two commuter rail lines from northern Virginia to Washington, D.C., running on weekday mornings inbound and weekday afternoons/evenings outbound only. The two lines are the **Fredericksburg Line** (Spotsylvania to Union Station) and the **Manassas Line** (Broad Run/Bristow to Union Station). Both lines converge at Alexandria Union Station and share common stations through Crystal City, L'Enfant, and terminate at Washington Union Station (lower-level platforms shared with Amtrak long-distance and some Northeast Regional services). No official public maps with line diagrams are published by VRE in the style of metro/transit agency printed networks; station information is published via the VRE website [stations page](https://www.vre.org/stations/) and [schedule guides](https://www.vre.org/schedules/). Stations arrays may require transcription from GTFS-derived static feed or official station listing pages.

## Agencies and feeds

### Virginia Railway Express (VRE)

| field | value |
| --- | --- |
| Operator | **Virginia Railway Express (VPRA)** — two-line commuter rail: Fredericksburg Line (CSX-owned right-of-way) and Manassas Line (Norfolk Southern-owned right-of-way). |
| Static GTFS | [Transitland Onestop `f-dqc-virginiarailwayexpress`](https://www.transit.land/feeds/f-dqc-virginiarailwayexpress) — GTFS static feed at `https://gtfs.vre.org/containercdngtfsupload/google_transit.zip`. Updated ~daily. No key required. Verified live 5 Sep 2026. Covers Fredericksburg and Manassas lines, service dates May 4, 2026 through December 4, 2026. |
| Real-time (GTFS-RT) | **Vehicle Positions** and **Trip Updates** feeds available (Transitland Onestop `f-vre~rt`): `https://gtfs.vre.org/containercdngtfsupload/VehiclePositionFeed` and `https://gtfs.vre.org/containercdngtfsupload/TripUpdateFeed`. No key specified in documentation. Verified live (200 response) 5 Sep 2026 via Transitland. Feed health and coverage depth (percentage of trips) unconfirmed at D1 stage. |
| Auth type | **No authentication specified in public documentation.** Static GTFS and GTFS-RT endpoints return 200 without headers or query parameters. Assume open access; confirm with VRE if production deployment requires registration or rate-limiting. |
| VRE developer docs | [VRE Mobile Developer's Guide (2024 PDF)](https://www.vre.org/assets/1/6/VRE_Mobile_Developer_2024.pdf) — licensing, API usage, and terms. PDF content not fully extracted; see License section for summary. |

### Amtrak at shared stations

VRE shares lower-level platforms (tracks 22–29) at Washington Union Station with Amtrak long-distance services (Carolinian, Crescent, Silver Meteor, etc.) and Amtrak Northeast Regional. Amtrak Acela Express uses upper-level tracks (7–20). No direct service overlap on the Fredericksburg or Manassas rights-of-way; Amtrak Northeast Regional may call at shared stations (e.g., Woodbridge on the Fredericksburg Line) but is a separate operator with separate ticketing and reservation policy.

## V1 scoping — Fredericksburg and Manassas lines

**Service scope:**
- **Lines:** Fredericksburg Line (Spotsylvania to Washington Union Station) + Manassas Line (Broad Run to Washington Union Station).
- **Stations:** 19 regular stops across both lines (some stations serve both lines: Union Station, L'Enfant, Crystal City, Alexandria).
- **Mode:** Commuter rail only. No bus, light rail, or other modes.
- **Schedule pattern:** **Weekday peak-direction service only** (critical hazard for v1). Trains run:
  - **Morning (inbound to DC):** Limited morning rush-hour service to Union Station (approximate window 6 AM–10 AM).
  - **Midday:** One early afternoon departure on each line (allow half-day work / reverse commute).
  - **Evening (outbound from DC):** Limited afternoon/evening rush-hour service (approximate window 3 PM–7 PM).
  - **No weekend service.** Saturday, Sunday, and holidays: **no VRE service.**
  - **No late-night service.** Schedule ends by ~8 PM typical.

**Hazard:** The peak-direction-only pattern means a v1 rider at, e.g., 2 PM with no return train until 3 PM+ creates a visibility problem: boards will show no outbound service for long mid-day stretches, but this is not a feed error — it's the intended schedule. This needs clear product explanation (see board-eligibility rule precedent).

**Hub-lock and key stations:**
- **Primary hub-lock: Washington Union Station (lower-level, tracks 22–29, ADA-accessible)** — southern terminus for both lines, interchange with Amtrak, MARC, and Metro. Rider-facing station name: "Union Station".
- **Secondary hub candidate: L'Enfant** — shared by both lines, in-city hub before Union Station (some passengers may board here instead of walking to Union Station).
- **Common shared stations (both lines):** Union Station, L'Enfant, Crystal City (Arlington, Virginia, south of bridge), Alexandria Union Station (Callahan Drive).
- **Fredericksburg Line stations:** Spotsylvania, Fredericksburg, Leeland Road, Brooke, Quantico, Rippon, Woodbridge, Lorton, Alexandria Union Station.
- **Manassas Line stations:** Broad Run (Bristow, Virginia), Manassas, Manassas Park, Burke Centre, Rolling Road, Backlick Road, Alexandria Union Station.

**doNotGroup directives (against WMATA/Amtrak at shared stations):**
- **Union Station:** WMATA has no station at this location (WMATA's Gallery Place-Chinatown, Metro Center, L'Enfant Plaza are separate metro stations). However, Amtrak uses the same building. VRE lower-level platforms are separate infrastructure from Amtrak upper-level. Recommend **doNotGroup VRE vs Amtrak** at the same Union Station name. Product may want a single "Union Station (Washington)" chip with mode filter, or separate entries — defer to Tim. Note: **MARC also uses Union Station upper level** — three separate rail networks.
- **L'Enfant:** VRE platforms are separate from **WMATA L'Enfant Plaza (Metro)** (noted in Washington oracle report). **doNotGroup VRE vs WMATA** at this location.
- **Crystal City:** **WMATA Crystal City station** is on the Blue and Silver Lines. VRE Crystal City station is separate (1503 South Crystal Drive, Arlington). **doNotGroup** if both in catalog.
- **King Street–Old Town / Alexandria:** **Not a VRE station.** King Street–Old Town is a WMATA Metro station in Old Town Alexandria. VRE uses **Alexandria Union Station** (110 Callahan Drive), which is a separate facility. Both are in Alexandria but different platforms/buildings. Do not conflate.
- **Franconia–Springfield:** **WMATA terminus (Blue/Silver Lines).** Not a VRE station. Manassas Line stops before reaching this WMATA terminus. No overlap.

**Shared-station verdict note:** Union Station and L'Enfant require board filtering: show VRE service separately from Amtrak/MARC at Union Station, and separately from WMATA at L'Enfant.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**VRE walk-up boarding policy:**
- **No compulsory seat reservations.** VRE help pages and rider information confirm that seats are not reserved; walk-up boarding with a VRE pass or standard ticket is the normal practice.
- **No check-in barrier.** Ticket checking occurs on-board (conductor or self-service), not at platform entry. Riders can walk up to the platform and board (ADA-accessible boarding platforms at all listed stations).
- **No sleeper services.** VRE operates only daytime commuter rail; no overnight sleeper cars.

**Amtrak Northeast Regional at shared stations (Union Station, Woodbridge Fredericksburg Line):**
- Amtrak Northeast Regional (NE Regional service between Boston and Virginia) serves **Woodbridge** on the Fredericksburg Line and terminates at **Union Station (Washington DC upper-level)**.
- **Walk-up boarding:** Northeast Regional allows walk-up boarding with a standard ticket or rail pass; seat reservations are optional, not compulsory.
- **Leave-by valid:** No airport-style check-in barrier (unlike Amtrak Acela Express, which requires U.S. ID / passport).
- **Verdict:** `in` (passes both boarding-contract tests).
- **Shared platform note:** At Woodbridge, VRE and Amtrak NE Regional use separate platforms/operations; no physical platform-sharing conflict.
- **At Union Station:** Amtrak uses upper-level (tracks 7–20); VRE uses lower-level (tracks 22–29). Separate infrastructure, no conflict.

**Amtrak long-distance services (Carolinian, Crescent, Silver Meteor, etc.):**
- These trains call at **Union Station** and may pass through other southern stops, but do not operate the Fredericksburg or Manassas lines as scheduled service.
- **Walk-up boarding:** Most Amtrak long-distance services require compulsory advance seat reservations (sleeper-car berth or coach-class reservation).
- **Verdict:** `out-reservation` (compulsory booking, fails test 1).

**WMATA services at L'Enfant and Crystal City (not VRE service, different networks):**
- L'Enfant Plaza is a WMATA station (Blue, Silver, Orange Lines). Crystal City is a WMATA station (Blue, Silver Lines). Neither is served by VRE.
- These are separate networks with their own boarding models; verdicts belong in the WMATA oracle, not here.
- **Board eligibility note:** If VRE L'Enfant and WMATA L'Enfant Plaza are both in the app's in-catalog stations, filtering must separate them (doNotGroup).

**VRE service verdicts:**

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **VRE Fredericksburg Line (all stations)** | Spotsylvania, Fredericksburg, Leeland Road, Brooke, Quantico, Rippon, Woodbridge, Lorton, Alexandria, Crystal City, L'Enfant, Union Station | No (walk-up, no compulsory booking) | No | `in` | [VRE Schedules & Fares](https://www.vre.org/schedules/); [VRE Help: Tickets](https://www.vre.org/fares-passes/) — walk-up boarding confirmed. |
| **VRE Manassas Line (all stations)** | Broad Run, Manassas, Manassas Park, Burke Centre, Rolling Road, Backlick Road, Alexandria, Crystal City, L'Enfant, Union Station | No (walk-up, no compulsory booking) | No | `in` | [VRE Schedules & Fares](https://www.vre.org/schedules/) — walk-up boarding standard. |
| **Amtrak Northeast Regional (Woodbridge Fredericksburg Line, Union Station)** | Woodbridge, Union Station | No (optional reservation only, not compulsory) | No | `in` | [Amtrak Northeast Regional seat reservations](https://www.amtrak.com/northeast-regional) — reservations available but not required. Walk-up boarding valid. [ShowMeTheJourney: Northeast Regional](https://showmethejourney.com/train-ticket-guides/northeast-regional/). |
| **Amtrak long-distance (Carolinian, Crescent, Silver Meteor, Cardinal, Piedmont; Union Station)** | Union Station | Yes (compulsory coach/sleeper reservation) | No | `out-reservation` | [Amtrak sleeper/coach reservations](https://www.amtrak.com/sleeper-cars) — advance booking required. [Amtrak long-distance booking](https://www.amtrak.com/routes). |

**Board eligibility summary:** All VRE services on the Fredericksburg and Manassas lines pass both walk-up boarding tests and are `in`. Amtrak Northeast Regional also passes both tests and is `in`. Amtrak long-distance services (sleeper/coach-required) fail test 1 (compulsory reservation) and are `out-reservation`. **All verdicts recorded; no silent omissions.** Peak-direction-only service is a *schedule* fact, not a board-eligibility exclusion — VRE is walk-up boardable during the hours it operates.

## H2 clash surface

**VRE:** Static GTFS verified via Transitland. GTFS-RT endpoints live (200 confirmed 5 Sep 2026). **Real-time feed coverage (trip update percentage, vehicle position latency) unconfirmed at D1 stage — Transitland caches do not show health depth.** Schedule-only boards (timetable-derived) are acceptable if GTFS-RT fails; precedent: TfL Overground planned-only, Valley Lines schedule-only pending TfW confirmation.

**Amtrak:** Northeast Regional and long-distance services use Union Station; separate operators, separate platforms, separate realtime feed (Amtrak has its own GTFS-RT, not in VRE GTFS). No clash inside VRE GTFS itself.

**WMATA:** L'Enfant and Crystal City are WMATA stations, not VRE. Separate networks, separate GTFS feeds, separate operator. **doNotGroup at shared place names.**

**Clash points:**
1. **Weekday peak-direction-only service pattern.** Boards will show no mid-day or weekend service. This is not a feed error; product must surface this clearly (half-day early departure, evening return, no Saturday/Sunday). Consider a visual affordance (e.g., "Weekday rush-hour service only") on the VRE chip or fare mode.
2. **Union Station / L'Enfant platform separation** (VRE lower-level vs Amtrak upper-level; VRE vs WMATA separately). Boarding must filter by mode/platform.
3. **No published D1 station-order map** (unlike Washington WMATA, which has a published system map). Station order derived from GTFS static feed or official station pages.
4. **License terms sparse** (as-is, agency retains rights; see License section).

**H2 conclusion:** Two lines, shared stations in-city (Union Station, L'Enfant, Crystal City), weekday peak-direction schedule only, no geographic gaps (Fredericksburg and Manassas are separate lines, not a regional network). VRE GTFS-RT is live but coverage depth unconfirmed.

## C2/C3 to put in front of Luke/Jim

1. **City identifier:** `city=northern-virginia-vre` (following tracker format) or `city=vre` (shorter). Confirm exact kebab-case slug with Tim.

2. **Hub-lock:** **Washington Union Station (lower-level, ADA-accessible, VRE tracks 22–29).** Not Amtrak upper-level. Not WMATA L'Enfant Plaza (separate network). Rider-tools title: "Union Station" (VRE).

3. **Lines in v1:** **Fredericksburg Line + Manassas Line only.** No other VRE services (no planned expansions like the Broad Run bypass or the proposed new routes in this scope).

4. **Two-line diagram:** Both lines converge at Alexandria Union Station before heading to DC (shared corridor: Alexandria → Crystal City → L'Enfant → Union Station). 19 regular stops total (13 Fredericksburg, 10 Manassas, 4 shared in DC/Alexandria area). No separate "metro-style" hub network — linear commuter rail.

5. **Weekday peak-direction schedule only (HAZARD):**
   - Morning (inbound): 6 AM–10 AM typical window.
   - Midday: One reverse commute departure per line (~1–3 PM).
   - Evening (outbound): 3 PM–7 PM typical window.
   - No weekend service.
   - No late-night service.
   - This is the scheduled intent, not a feed glitch. Product must surface this clearly.

6. **Board-eligibility verdicts:**
   - **VRE Fredericksburg & Manassas:** `in` (walk-up, no compulsory reservation).
   - **Amtrak Northeast Regional (Woodbridge, Union Station):** `in` (optional reservation, walk-up valid).
   - **Amtrak long-distance (Carolinian, Crescent, etc.):** `out-reservation` (sleeper/coach booking required).

7. **doNotGroup at shared places:**
   - **Union Station:** Separate VRE (lower-level) from Amtrak (upper-level) and MARC (upper-level). Three distinct networks.
   - **L'Enfant:** Separate VRE platform from WMATA L'Enfant Plaza (Metro). Different GTFS feeds.
   - **Crystal City:** Separate VRE station from WMATA Crystal City (Blue/Silver). Different buildings/platforms.

8. **No WMATA integration in v1.** King Street–Old Town is WMATA, not VRE. Franconia–Springfield is WMATA, not VRE. VRE's southernmost DC stations are L'Enfant and Union Station (stops before reaching WMATA southern suburbs).

9. **Static GTFS:** Transitland `f-dqc-virginiarailwayexpress`, `https://gtfs.vre.org/containercdngtfsupload/google_transit.zip`. No key required. Updated ~daily.

10. **Real-time (GTFS-RT):** Transitland `f-vre~rt`. Vehicle Positions: `https://gtfs.vre.org/containercdngtfsupload/VehiclePositionFeed`. Trip Updates: `https://gtfs.vre.org/containercdngtfsupload/TripUpdateFeed`. No key specified; assume open. Feed health (coverage %) unconfirmed at D1 stage; schedule-only fallback is acceptable.

11. **Skip risks:**
    - **Weekday peak-only schedule** creates unusual board visibility (empty mid-day/weekend). Needs strong product labeling.
    - **GTFS-RT feed health unconfirmed.** Verify coverage % and latency before live flip. If feed is sparse, consider schedule-only boards initially.
    - **License terms sparse** (as-is, agency retains rights). No explicit redistribution prohibition found, but also no explicit permission. Confirm with VRE before serving to third-party APIs.

12. **Timezone:** America/New_York (Eastern Time, DST last Sunday March / October per US rules).

13. **Amtrak cross-honour:** Amtrak Northeast Regional serves Woodbridge (Fredericksburg Line) and Union Station with walk-up boarding; included as `in`. Long-distance sleeper/coach services are `out-reservation`. No single "Amtrak at VRE" adapter — Amtrak runs its own realtime feed separate from VRE GTFS.

14. **No live flip until fully scoped.** Status stays **To Do/planned** until Luke completes D1 pack (confirm station order, verify GTFS-RT coverage, finalize board-eligibility verdicts) and Jim wires adapter (filter board by mode, handle weekday-only schedule, doNotGroup at shared places).

## License

- **License name:** Agency-specific terms, "as-is" provision. Virginia Department of Rail and Public Transportation (DRPT) GTFS Clearinghouse baseline: "GTFS data provided without warranties; agencies retain full rights to the data." No explicit Creative Commons or open license found in public sources.
- **Redistribution / rehosting:** DRPT guideline states third-party apps must be clearly identified as third-party and cannot display VRE logos without authorization. No explicit permission or prohibition of serving data via third-party APIs found. **Confidence: unclear.** Operative terms not confirmed in a signed developer agreement or published license document.
- **Commercial use:** No explicit restriction found in DRPT guidelines or VRE public pages. Likely allowed (precedent: most US transit agencies allow commercial apps to use GTFS-static). **Confidence: unclear.**
- **Attribution:** VRE logo/branding restrictions apply (third-party apps must be identified as such, no VRE logo without permission per DRPT guidelines). Standard attribution: "Data from Virginia Railway Express" recommended.
- **Terms URL:** [DRPT GTFS Feed Clearinghouse](https://drpt.virginia.gov/data/gtfs-feed-clearinghouse/); [Virginia GTFS](https://virginia-gtfs.com/); [VRE main website](https://www.vre.org/); [VRE Developer Guide (PDF)](https://www.vre.org/assets/1/6/VRE_Mobile_Developer_2024.pdf) (full license terms inside PDF, not extracted at D1 stage).
- **Confidence:** `unclear` on redistribution and commercial use. VRE provides GTFS "as-is" (verified via Transitland) with no explicit public license (CC0, CC-BY, ODbL, etc.). DRPT baseline says agencies retain full rights. **Recommend:** Luke/Jim contact VRE directly before D1 pack completion to confirm: (1) permission to redistribute GTFS data to third-party riders via Next Train API, and (2) whether API key or usage registration is required for production deployment.
- **Keyed feeds:** No API key specified in public documentation for static GTFS or GTFS-RT endpoints. Assume open access. If registration/rate-limiting is required in production, update before live flip.

