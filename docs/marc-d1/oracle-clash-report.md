# Maryland MARC (Commuter Rail) — oracle clash report

**Lane:** Nico research + Luke D1 transcription. **Date:** 2026-09-06. **Status:** Research complete, city **to do**. **city id:** `marc` (do not invent `marc-train`, `mdot-marc`, or merge into washington/baltimore).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Maryland Transit Administration (MDOT MTA) — MARC Train division |
| Official map | MARC Route Maps — https://www.mta.maryland.gov/marc-station-information |
| Static GTFS | https://feeds.mta.maryland.gov/gtfs/marc → S3 redirect (no key) |
| GTFS-RT Trip Updates | https://mdotmta-gtfs-rt.s3.amazonaws.com/MARC+RT/marc-tu.pb (S3 direct, no key) |
| GTFS-RT Vehicle Positions | https://mdotmta-gtfs-rt.s3.amazonaws.com/MARC+RT/marc-vp.pb (S3 direct, no key) |
| Service Alerts | https://feeds.mta.maryland.gov/alerts.pb (shared with Metro, Light Rail, commuter bus; no key) |
| Auth | None. All feeds unkeyed; static and RT available via S3 without registration. |
| Timezone | America/New_York (HAS DST) |

All feeds indexed on Transitland: MDOT MTA MARC Onestop f-dq-mtamaryland~marc (static), f-mtamaryland~marc~train~rt/ (GTFS-RT).

## v1 mode cut

**All three MARC lines: Penn, Camden, and Brunswick.** 44 stations total across the Baltimore–Washington corridor.

**Penn Line:** 13 stations, Washington DC Union Station (Union Station) to Perryville, Maryland. Primary terminus Baltimore Penn Station. Serves BWI Thurgood Marshall Airport, Odenton, Bowie, New Carrollton, Seabrook, and northern Maryland corridor (Edgewood, Aberdeen, Martin State Airport, Perryville).

**Camden Line:** 12 stations, Washington DC Union Station to Baltimore Camden Yards/Camden Station. Serves College Park, Laurel, Dorsey, St. Denis, and Maryland suburbs on CSX Capital Subdivision. As of 2026-09-28, direct weekday through-service to Brunswick Line available (new routing).

**Brunswick Line:** 19 stations, Washington DC Union Station to Martinsburg, West Virginia via Silver Spring, Rockville, Gaithersburg, and Frederick (branch). Operates on CSX infrastructure through Montgomery County and into West Virginia.

**Hub lock:** **Washington Union Station** (all three lines converge; primary hub). Alternative: Baltimore Penn Station (Penn Line terminus with connections to Light RailLink and Amtrak).

## Board eligibility

| Service | Call at in-catalog stations? | Walk-up test | Reservation test | Verdict | Evidence |
|---|---|---|---|---|---|
| MARC Penn Line | Yes (all 13) | Yes | No compulsory reservation; walk-up allowed, capacity permitting | **in** | Commuter rail walk-up service. Ticket purchase on board allowed (conductor accepts cash, $5 surcharge if purchasing on-board at staffed station). No seat reservation required. Transitland confirms active GTFS-RT feed. |
| MARC Camden Line | Yes (all 12) | Yes | No compulsory reservation; walk-up allowed | **in** | Same operator, same walk-up policy. Transitland confirms GTFS coverage. |
| MARC Brunswick Line | Yes (all 19) | Yes | No compulsory reservation; walk-up allowed | **in** | Same operator, same walk-up policy. New through-service to Camden Line (effective 2026-09-28) does not impose reservation requirements. |
| Amtrak Northeast Regional (Penn Line shared tracks) | Yes (New Carrollton, BWI Airport, Baltimore Penn, Aberdeen) | Yes (walk-up occurs at these stations) | **Reserved seating required**; advance booking mandatory | **out-product** | Amtrak Northeast Regional operates on shared Northeast Corridor tracks with MARC Penn Line but imposes seat reservation requirement. No walk-up boarding without advance reservation (e-ticket system). Does not meet walk-up test. Separate operator (Amtrak national, not MDOT MTA). |
| Amtrak Acela (Penn Line, limited stops) | Yes (Baltimore Penn, New Carrollton, Aberdeen) | Yes (these stations exist) | **Premium reserved seating required**; advance booking mandatory | **out-product** | Acela requires advance reservation and premium fare. Does not meet walk-up test. Out of scope. |

**Board eligibility conclusion:** All three MARC lines (Penn, Camden, Brunswick) are in; all pass walk-up test. Amtrak services share tracks but impose reservation requirements and are separate operator — verdict is `out-product` (not eligibility failure, but operator/service class exclusion). No other service with out-of-scope verdict calls at v1 stations.

## Station overlaps — doNotGroup and shared-platform constraints

| Station | MARC operator/line | Other operator | Constraint | Action |
|---|---|---|---|---|
| Washington Union Station | MARC (all three lines) | WMATA Red Line metro; Amtrak; VRE | Separate but in same complex building. MARC platforms distinct from WMATA metro. | **doNotGroup:** MARC vs WMATA at Union Station. Verify platform codes during D1; they are separate stations even if co-located in same complex. |
| Baltimore Penn Station | MARC Penn Line | MTA Light RailLink (single-track spur from Camden/Hunt Valley line) | Light Rail has dedicated single-track spur terminating at Penn Station. Both use same station building but separate platforms/tracks. | **doNotGroup:** MARC Penn Line vs Light RailLink at Penn Station. Separate platforms; two operators (MARC = MDOT MTA commuter, Light Rail = MDOT MTA urban rapid transit). |
| Baltimore Camden Station / Camden Yards | MARC Camden Line | MTA Light RailLink (main line + spur to Penn) | Shared station: 6 total tracks (3 MARC Camden, 3 Light Rail). Same operator (MDOT MTA) but distinct services and platforms. | **doNotGroup:** MARC Camden Line vs Light RailLink at Camden Yards/Camden Station. Same operator but distinct networks; separate platform codes. Verify track assignment during D1. |

**Overlap resolution:** Union Station requires separation of MARC from WMATA (different modes/operators). Baltimore overlap stations require separation of MARC lines from Light Rail (different modes/operators). All separations can be handled via doNotGroup rules and platform/stop ID verification during D1.

## Skip risk

**No major blockers identified.**

- **Feeds verified and active:** MARC static GTFS and GTFS-RT confirmed accessible via Transitland (last fetch 2026-09-05). Unkeyed S3 feeds (no authentication friction). 
- **No real-time API key required:** Unlike Metro SubwayLink and Light RailLink (which require Swiftly API key registration), MARC GTFS-RT is unkeyed S3. No key-procurement gate.
- **Board eligibility clear:** MARC allows walk-up boarding; no reservation requirement. Amtrak overlap is out-product (operator/service class, not station access).
- **Station data available:** GTFS stops list and MTA station information page list all 44 stations; canonicalization can proceed.
- **No overlap violations:** Union Station separation from WMATA and Baltimore overlaps with Light Rail do not block v1 — both are resolvable via doNotGroup and platform ID mapping.

## D1 guidance — who has line codes today

**Static feeds:** MARC GTFS available unkeyed at feeds.mta.maryland.gov/gtfs/marc. Stops list should be used for station canonicalization; verify against MTA official station information page (https://www.mta.maryland.gov/marc-station-information) — do not assume GTFS row order matches geographic order (same pattern as Baltimore/Washington).

**Real-time feeds:** Trip Updates + Vehicle Positions via unkeyed S3: marc-tu.pb + marc-vp.pb. Updated every ~30 seconds per MTA spec. No key registration gate. Alerts feed (unkeyed) covers all MTA modes.

**Hub lock:** Washington Union Station (all three lines). Verify during D1 that WMATA Red Line "Union Station" and MARC "Union Station" are separate entries with doNotGroup applied; they share a building complex but are distinct operators/networks.

**Baltimore overlaps:** Penn Station (MARC vs Light Rail spur) and Camden Station/Camden Yards (MARC vs Light Rail main) both require platform-level separation via doNotGroup. Verify track IDs from GTFS stops/stop_times during D1.

**Amtrak on Penn Line:** Northeast Regional and Acela share Northeast Corridor tracks with MARC Penn Line but impose seat reservation requirements. Both are `out-product` (operator class, not station access). No verdict applies to MARC itself.

## C2/C3 to put in front of Jim

1. **city=marc**, displayName **MARC** (Maryland Area Regional Commuter). Not `marc-train`, not `mdot-marc`, not `commuter-rail`. Do not merge into washington / baltimore / any other US city.
2. **Washington Union Station is the locked hub** (all three lines). Penn / Camden / Brunswick converge there. Not Baltimore Penn, not Baltimore Camden.
3. **Three lines: Penn (13 stations) + Camden (12 stations) + Brunswick (19 stations) = 44 total.**
4. **All three lines are in v1.** No bus, no light rail, no Amtrak for the purposes of MARC operator.
5. **doNotGroup Union Station:** MARC vs WMATA (separate operators/modes, co-located). **doNotGroup Baltimore Penn:** MARC Penn Line vs Light RailLink (separate platforms). **doNotGroup Baltimore Camden:** MARC Camden Line vs Light RailLink (separate platforms, same operator but distinct networks).
6. **Amtrak Northeast Regional & Acela** (Penn Line shared tracks) are `out-product` (reserved seating, separate operator). No walk-up boarding; no conflict with MARC board eligibility.
7. **America/New_York HAS DST.** Do not copy Perth / Brisbane no-DST.
8. **GTFS feeds unkeyed.** No Swiftly key required (unlike Metro SubwayLink / Light RailLink). GTFS-RT updated every 30 seconds.
9. **Station canonicalization:** Use MTA station information page or Transitland GTFS stops list (do not assume GTFS row order). Verify platform/track IDs for Baltimore overlaps.
10. This pack stays **to do** / **planned** until D1 completion and integration testing. `assertCityLive("marc")` must fail initially.

## What I did not do

No line-map generator, no stopIds in published JSON, no live city flip, no product edit, no GTFS-derived station arrays, no invent city=marc-train, no API key paste, no product registry entry, no gate registration, no merge of other PRs.

## License

- **License name:** Public Domain (per opendata.maryland.gov designation for MDOT MTA data).
- **Redistribution / rehosting:** MDOT MTA supports open transit data initiatives; MARC GTFS feeds published at feeds.mta.maryland.gov with no explicit redistribution restriction stated. Public domain allows redistribution. Serving riders in our app via API is permitted. Sublicensing to third parties: not explicitly addressed in published terms; treat as unclear pending direct contact with MTA (same uncertainty as Baltimore MDOT MTA data).
- **Commercial use:** Allowed (public domain, no fee). MDOT MTA does not restrict commercial use of published MARC GTFS data.
- **Attribution:** Required per standard practice (agency name Maryland Transit Administration / MDOT MTA should appear in app credits). No specific wording mandated in available terms.
- **Terms URL:** https://www.mta.maryland.gov/developer-resources (primary); https://opendata.maryland.gov/ (Maryland open data portal, MDOT MTA public domain designation). MDOT MTA GTFS license terms page (https://www.mta.maryland.gov/about/publicgtfsdata.cfm) currently under construction as of 2026-09-06.
- **Confidence:** `clear` that MARC GTFS data is public domain and redistributable (same status as other MDOT MTA feeds, per Baltimore precedent). `clear` that no explicit commercial-use fee. `unclear` on third-party sublicensing — public domain statement suggests yes, but formal MTA license document (under construction) may add conditions. Recommend Tim review before go-live if sublicensing to third-party apps is planned.
- **Keyed feeds:** No keys required. MARC GTFS and GTFS-RT feeds are unkeyed S3 access. No account terms to review.
