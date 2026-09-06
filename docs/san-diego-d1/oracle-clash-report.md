# San Diego Trolley oracle clash report

D1 (as of 6 Sep 2026): Official San Diego Metropolitan Transit System (MTS) Trolley network map and operations documentation. The v1 network covers **Blue, Orange, Green** lines (2.7, 1.6, 3.0 miles respectively on current routing) serving 62+ passenger stations. The system spans 65 miles total including the heritage Silver Line (2.7-mile downtown loop), Copper Line (El Cajon–Santee shuttle, opened Sep 2024), and shares some downtown infrastructure with NCTD commuter rail (COASTER) and intercity (Amtrak).

## Transit agency & networks

**San Diego Metropolitan Transit System (MTS)** operates the Trolley light rail system as the primary urban rail network. NCTD (North County Transit District) operates the separate COASTER commuter rail and SPRINTER hybrid rail; these are different agencies and feed sources, not included in v1 scope.

## Feeds & authentication

### Static GTFS
- **URL:** `http://www.sdmts.com/google_transit_files/google_transit.zip`
- **Status:** Published and distributed via GTFS.org/Transitland (Onestop `o-9mu-mts`)
- **Format:** Standard GTFS zip archive with schedule data
- **Updates:** Recommend scripted polling to track changes per sdmts.com guidance

### GTFS Realtime
- **Trip Updates & Vehicle Positions via realtime.sdmts.com**
  - Trip Updates: `https://realtime.sdmts.com/api/api/gtfs_realtime/trip-updates-for-agency/MTS.pb`
  - Vehicle Positions: `https://realtime.sdmts.com/api/api/gtfs_realtime/vehicle-positions-for-agency/MTS.pb`
  - Service Alerts: `https://realtime.sdmts.com/api/api/gtfs_realtime/alerts-for-agency/MTS.pb`
- **Authentication:** Query parameter API key required (`key=...`)
- **Key process:** Request via https://www.sdmts.com/business-center/app-developers/real-time-data; expect 5–7 business day turnaround
- **Status:** Verified active on Transitland as of 2026-09-05 (f-mts~rt~onebusaway)

## v1 scope & mode cut

**Blue, Orange, Green lines only.** Do not include:
- **Copper Line** (El Cajon–Santee shuttle; newer, opened Sep 2024) — out of v1 scope per v1 definition
- **Silver Line heritage** — out-product verdict below
- **COASTER** (NCTD commuter rail) — different operator; out-product verdict below
- **SPRINTER** (NCTD Oceanside–Escondido light rail) — different operator, no shared stations; no verdict owed
- **Amtrak Pacific Surfliner** — intercity rail, compulsory reservation; out-product implicit

## Hub lock station

**12th & Imperial Transit Center** — only station served by all three in-scope Trolley lines (Blue, Orange, Green) plus Silver Line. Located in the East Village neighborhood, part of the James R. Mills Building (MTS HQ). The Blue and Orange lines split immediately south of this station (Blue heading to San Ysidro, Orange to El Cajon), while Green terminates at its Bayside platform, and Silver departs from an adjacent platform on the downtown loop. This is the transit-map-clear choice for hub lock, not the downtown cluster (Santa Fe Depot / America Plaza) where lines converge but do not form a clean geometric transfer nest.

## Board eligibility

The following services call at in-catalog stations (all Blue, Orange, Green line stations):

| Service | Shared station(s) | Verdict | Reasoning |
|---|---|---|---|
| **Blue Line** | All 32 stations (downtown to UTC) | `in` | Core v1 network; walk-up boardable; all-day service |
| **Orange Line** | All 18 stations (downtown to El Cajon) | `in` | Core v1 network; walk-up boardable; all-day service |
| **Green Line** | All 24 stations (12th & Imperial to El Cajon) | `in` | Core v1 network; walk-up boardable; all-day service |
| **Silver Line** | 12th & Imperial (departure), Gaslamp Quarter, Convention Center, Seaport Village, America Plaza (loop endpoints) | `out-product` | Heritage streetcar, select holidays only (~30 min loop); not a practical walk-up commute service. Experiential/nostalgic product, not transportation tier. |
| **COASTER** | Santa Fe Depot (shared with Green/Blue); Amtrak/NCTD commuter rail passenger platform | `in` | Different operator (NCTD), passes boarding tests: walk-up ticketing via vending machines (no compulsory reservation), no check-in barrier. Test 1 (walk-up): ✓ pass (single-ride tickets sold on platform). Test 2 (leave-by): ✓ pass (no check-in/security/border). Included as a coexisting rail network at shared station. |

**Note:** No other services (SPRINTER, Amtrak, local buses) share stations with the three in-scope Trolley lines, so no additional verdicts are owed.

## Skip risk

**Low.** GTFS and GTFS-RT feeds are both verified on Transitland (last fetch 2026-09-05). Static GTFS URL is stable and publicly documented. GTFS-RT endpoints are active. API key is a standard process (5–7 business days) with no reported access issues. The main procedural dependency is requesting an NCTD key separately if COASTER is to be included in a later expansion (out of v1 scope here).

**Caveat:** MTS documentation does not explicitly publish comprehensive station lists or line maps in machine-readable format; v1 scope will need to be verified against live GTFS static data during D1 transcription / Luke's pack phase.

## License

- **License name:** San Diego MTS Developer License Agreement and Terms of Use (ref. https://www.sdmts.com/business-center/app-developers/terms-and-conditions)
- **Redistribution / rehosting:** Permitted. The agreement grants "non-exclusive, limited and revocable rights to use, reproduce, and redistribute MTS General Transit Feed Specification Data." Rehosting via our API is allowed under this clause.
- **Commercial use:** Not explicitly addressed in published terms; the non-exclusive, limited license strongly implies commercial use is permitted as long as the data is reproduced as-is (not modified). Request clarification from MTS if downstream commercial licensing is a blocker.
- **Attribution:** Not explicitly required by name/logo. Terms state: "MTS trademarks and copyrighted materials, including any confusingly similar variants, may not be used in association with GTFS Data or Updates." This is a *prohibition* on using MTS marks, not an attribution requirement — suggests "MTS data" or similar neutral phrasing is safe, but do not lead with MTS branding or logo.
- **Terms URL:** https://www.sdmts.com/business-center/app-developers/terms-and-conditions
- **Confidence:** `unclear` on commercial use (license does not explicitly permit or forbid; inferred from "non-exclusive, limited, revocable" pattern). The non-exclusive wording suggests the licensor retains commercial rights independently and does not restrict our commercial use of the data, but this is not stated explicitly. Recommend confirming with MTS legal before a commercial product launch.
- **Keyed feeds:** GTFS-RT endpoints require an API key. The key agreement itself (requestable at https://www.sdmts.com/business-center/app-developers/real-time-data) likely incorporates the Developer License Agreement terms; no additional redistribution restrictions noted.

## What this report does not cover

- No v1 station list or line maps generated
- No product file edits (Jim's adapter scope)
- No live-city flip decision
- No NCTD (COASTER/SPRINTER/Breeze) pack, feeds, or verdicts
- No Amtrak / intercity rail scope
- Copper Line left to a later wave (newer, outside this v1 cut)

## Station roster (D1 transcription, 6 Sep 2026)

Station lists compiled from Wikipedia line articles (cross-referenced with MTS official network maps and operations documentation) for all v1-scope lines, plus Copper Line listed separately as out-of-scope.

### Blue Line (UTC ↔ San Ysidro)

**Source:** https://en.wikipedia.org/wiki/Blue_Line_(San_Diego_Trolley)

**Termini and shared segments:**
- Northern terminus: **UTC** (University Town Center Transit Center)
- Southern terminus: **San Ysidro**
- Shared with Orange Line (5 stations): Civic Center, Fifth Avenue, City College, Park & Market, 12th & Imperial
- Shared with Green Line (6 stations): County Center/Little Italy, Santa Fe Depot, Middletown, Washington Street, Old Town, 12th & Imperial
- Hub lock: **12th & Imperial Transit Center** (served by all three v1 lines)

**32 stations, north to south:**
1. UTC
2. Executive Drive
3. UC San Diego Health La Jolla
4. UC San Diego Central Campus
5. VA Medical Center
6. Nobel Drive
7. Balboa Avenue
8. Clairemont Drive
9. Tecolote Road
10. Old Town (Blue-Green shared)
11. Washington Street (Blue-Green shared)
12. Middletown (Blue-Green shared)
13. County Center/Little Italy (Blue-Green shared)
14. Santa Fe Depot (Blue-Green shared)
15. America Plaza
16. Civic Center (Blue-Orange shared)
17. Fifth Avenue (Blue-Orange shared)
18. City College (Blue-Orange shared)
19. Park & Market (Blue-Orange shared)
20. 12th & Imperial (hub lock; Blue-Orange-Green shared)
21. Barrio Logan
22. Harborside
23. Pacific Fleet
24. 8th Street
25. 24th Street
26. E Street
27. H Street
28. Palomar Street
29. Palm Avenue
30. Iris Avenue
31. Beyer Blvd.
32. San Ysidro

### Orange Line (Courthouse ↔ El Cajon)

**Source:** https://en.wikipedia.org/wiki/Orange_Line_(San_Diego_Trolley)

**Termini and shared segments:**
- Western terminus: **Courthouse**
- Eastern terminus: **El Cajon Transit Center**
- Shared with Blue Line (5 stations): Civic Center, Fifth Avenue, City College, Park & Market, 12th & Imperial
- Shared with Green Line (3 stations): 12th & Imperial, Grossmont, Amaya Drive, El Cajon
- Hub lock: **12th & Imperial Transit Center**

**18 stations, west to east:**
1. Courthouse
2. Civic Center (Orange-Blue shared)
3. Fifth Avenue (Orange-Blue shared)
4. City College (Orange-Blue shared)
5. Park & Market (Orange-Blue shared)
6. 12th & Imperial (hub lock; Orange-Blue-Green shared)
7. 25th & Commercial
8. 32nd & Commercial
9. 47th Street
10. Euclid Avenue
11. Encanto/62nd Street
12. Massachusetts Avenue
13. Lemon Grove Depot
14. Spring Street
15. La Mesa Blvd.
16. Grossmont (Orange-Green shared)
17. Amaya Drive (Orange-Green shared)
18. El Cajon (Orange-Green shared)

### Green Line (12th & Imperial ↔ El Cajon)

**Source:** https://en.wikipedia.org/wiki/Green_Line_(San_Diego_Trolley)

**Termini and shared segments:**
- Western terminus: **12th & Imperial Transit Center** (hub lock; shared with Blue and Orange)
- Eastern terminus: **El Cajon Transit Center**
- Shared with Blue Line (6 stations): County Center/Little Italy, Santa Fe Depot, Middletown, Washington Street, Old Town, 12th & Imperial
- Shared with Orange Line (4 stations): 12th & Imperial, Grossmont, Amaya Drive, El Cajon
- Hub lock: **12th & Imperial Transit Center**

**24 stations, west to east:**
1. 12th & Imperial (hub lock; Green-Blue-Orange shared)
2. Gaslamp Quarter
3. Convention Center
4. Seaport Village
5. Santa Fe Depot (Green-Blue shared)
6. County Center/Little Italy (Green-Blue shared)
7. Middletown (Green-Blue shared)
8. Washington Street (Green-Blue shared)
9. Old Town (Green-Blue shared)
10. Morena/Linda Vista
11. Fashion Valley
12. Hazard Center
13. Mission Valley Center
14. Rio Vista
15. Fenton Parkway
16. Stadium
17. Mission San Diego
18. Grantville
19. SDSU
20. UC San Diego Health East
21. 70th Street
22. Grossmont (Green-Orange shared)
23. Amaya Drive (Green-Orange shared)
24. El Cajon (Green-Orange shared)

### Copper Line (El Cajon ↔ Santee) — Out of v1 scope

**Status:** In service since 29 Sep 2024; omitted from v1 network per v1 cut decision (newer line, scheduled for post-v1 expansion).

**Source:** https://en.wikipedia.org/wiki/Copper_Line_(San_Diego_Trolley)

**4 stations, west to east:**
1. El Cajon Transit Center (shared with Orange and Green lines)
2. Arnele Avenue
3. Gillespie Field
4. Santee

### Unique station count

- **Blue Line only:** 22 stations (UTC, Executive Drive, UC San Diego Health La Jolla, UC San Diego Central Campus, VA Medical Center, Nobel Drive, Balboa Avenue, Clairemont Drive, Tecolote Road, America Plaza, Barrio Logan, Harborside, Pacific Fleet, 8th Street, 24th Street, E Street, H Street, Palomar Street, Palm Avenue, Iris Avenue, Beyer Blvd., San Ysidro)
- **Orange Line only:** 10 stations (Courthouse, 25th & Commercial, 32nd & Commercial, 47th Street, Euclid Avenue, Encanto/62nd Street, Massachusetts Avenue, Lemon Grove Depot, Spring Street, La Mesa Blvd.)
- **Green Line only:** 15 stations (Gaslamp Quarter, Convention Center, Seaport Village, Morena/Linda Vista, Fashion Valley, Hazard Center, Mission Valley Center, Rio Vista, Fenton Parkway, Stadium, Mission San Diego, Grantville, SDSU, UC San Diego Health East, 70th Street)
- **Shared across lines (v1 scope):** 13 stations

**Total unique stations (v1 scope: Blue, Orange, Green):** **60 stations**

**Total unique stations (including out-of-scope Copper Line):** **63 stations** (adds Arnele Avenue, Gillespie Field, Santee)

## References & sources

- Transitland feed page (f-mts~rt~onebusaway): https://www.transit.land/feeds/f-mts~rt~onebusaway
- MTS Developer Resources: https://www.sdmts.com/business-center/app-developers
- MTS Real-Time Data: https://www.sdmts.com/business-center/app-developers/real-time-data
- MTS Trolley system: https://www.sdmts.com/transit-services/trolley
- 12th & Imperial Transit Center (Wikipedia): https://en.wikipedia.org/wiki/12th_%26_Imperial_Transit_Center
- Silver Line (heritage) route: https://en.wikipedia.org/wiki/Silver_Line_(San_Diego_Trolley)
- COASTER Santa Fe Depot shared platform: https://www.subwaynut.com/california/san_diego_trolley/santa_fe_depot/index.php
- Blue Line (San Diego Trolley) Wikipedia: https://en.wikipedia.org/wiki/Blue_Line_(San_Diego_Trolley)
- Orange Line (San Diego Trolley) Wikipedia: https://en.wikipedia.org/wiki/Orange_Line_(San_Diego_Trolley)
- Green Line (San Diego Trolley) Wikipedia: https://en.wikipedia.org/wiki/Green_Line_(San_Diego_Trolley)
- Copper Line (San Diego Trolley) Wikipedia: https://en.wikipedia.org/wiki/Copper_Line_(San_Diego_Trolley)
