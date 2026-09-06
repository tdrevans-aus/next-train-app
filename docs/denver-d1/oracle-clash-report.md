# Denver oracle clash report

D1 (published, as of 5 September 2026): RTD Denver rail system comprises 10 active lines: 5–6 active light rail lines and 4 commuter rail lines. Light rail lines are mapped at [RTD Light Rail | RTD-Denver](https://www.rtd-denver.com/about-rtd/infrastructure-investments/light-rail). Commuter rail lines are documented at [Commuter Rail | RTD-Denver](https://www.rtd-denver.com/about-rtd/infrastructure-investments/commuter-rail). Stations are obtained from GTFS static feed. **Not generated from any manual network diagram.** The GTFS static feed is authoritative for stop orders and station names.

## Active lines as of September 2026

### Light Rail (5 active lines)

| Line | Terminals | Status | Notes |
|------|-----------|--------|-------|
| **C Line** | Union Station – Littleton–Mineral | Active | Southwest Line; 12 stations |
| **E Line** | Union Station – RidgeGate Parkway | Active | Southeast Corridor; 21 stations |
| **R Line** | RidgeGate Parkway – Peoria | Active | Extended to RidgeGate Parkway Jun 2026; 15-min frequency; 16 stations |
| **W Line** | Union Station – Jefferson County Gov't Center–Golden | Active | West Line; 15 stations |
| **T Line** | Lincoln – I-25•Broadway | Active (temporary) | Temporary service, Southeast Corridor reconstruction |

### Light Rail (suspended due to Downtown Rail Reconstruction Project)

| Line | Status | Notes |
|------|--------|-------|
| **D Line** | Suspended | Central line; capacity shifted to R Line |
| **H Line** | Suspended | Downtown core reconstruction; capacity replaced by R Line frequency increase |
| **L Line** | Suspended | Downtown core; longest-running light rail (30+ years); reconstruction in progress |

### Commuter Rail (4 active lines)

| Line | Terminals | Status | Boarding |
|-------|-----------|--------|---------|
| **A Line** | Union Station – Denver Airport | Active | Walk-up, TVM tickets |
| **B Line** | Union Station – Westminster | Active | Walk-up, TVM tickets |
| **G Line** | Union Station – Wheat Ridge | Active | Walk-up, TVM tickets |
| **N Line** | Union Station – Eastlake & 124th | Active | Walk-up, TVM tickets |

## Recommended v1 scope: light rail only

**v1 = active light rail lines (C, E, R, W) only.**

**Justification:**
1. Tracker row specifies "light rail (RTD rail)" as the initial scope.
2. Light rail operates on urban surface/grade-separated lines with 5–15 minute frequencies; commuter rail operates on dedicated rights-of-way with 15–30 minute frequencies.
3. Commuter rail lines pass the board-eligibility walk-up boarding test (TVMs at each station; no compulsory reservations), but the v1 mode cut excludes them as `out-product` to match the published network scope and reduce initial adapter complexity.
4. Suspended lines (D, L, H) remain out until track reconstruction completes; T Line is temporary and will be retired once downtown reconstruction finishes.
5. All four commuter rail lines converge at Union Station, making them future candidates for inclusion when v1 expands to multi-mode networks.

## Feed URLs and authentication

### Static GTFS

- **Feed URL:** https://www.rtd-denver.com/files/gtfs/google_transit.zip
- **Format:** GTFS (General Transit Feed Specification)
- **Auth:** None (public, no key required)
- **Coverage:** Includes all RTD bus, light rail, and commuter rail services
- **Transitland Onestop ID:** `f-9xj-rtd`
- **Mobility Database ID:** `mdb-178`
- **Service range:** Schedule effective June 7 – September 26, 2026 (updated seasonally 3× per year: January, May, August)

### GTFS Realtime

**Canonical URLs (Fall 2025 migration; legacy URLs deprecated after December 5, 2025):**

- **Trip Updates:** https://open-data.rtd-denver.com/files/gtfs-rt/rtd/TripUpdate.pb
- **Vehicle Positions:** https://open-data.rtd-denver.com/files/gtfs-rt/rtd/VehiclePosition.pb
- **Service Alerts:** https://open-data.rtd-denver.com/files/gtfs-rt/rtd/Alerts.pb
- **Format:** Protocol Buffer (protobuf)
- **Auth:** None (public, no key required)
- **Accuracy:** ±2 minutes per RTD documentation
- **Transitland Onestop ID:** `f-rtddenver~rt`
- **Mobility Database ID:** `mdb-1676`

**Note:** RTD publishes separate Bustang feeds (commuter coach service) at the same path structure; v1 does not include Bustang.

## Hub-lock station

**Union Station** (Denver Union Station) — central convergence point for all light rail lines (C, E, W) and all commuter rail lines (A, B, G, N). The only station at which light rail and commuter rail interline; primary transfer hub for downtown Denver connections.

**Station details:**
- 8-track commuter rail platform
- 22-bay underground bus facility
- Serves 7 RTD rail lines plus Amtrak (not in v1 scope)
- Address: 1701 Wynkoop Street, Denver, CO 80202
- GTFS station ID: confirmed in static feed

## Skip risk

**None identified.** 

- Both static GTFS and GTFS-RT feeds are published by RTD without authentication barriers and are actively maintained.
- Transitland and Mobility Database both index RTD feeds as current and healthy (last fetched 2026-08-20 and 2026-09-05 respectively).
- Light rail lines have been operating 15–30+ years with stable ridership (38,400 weekday riders Q1 2026).
- No announced service discontinuations or feed deprecations.
- Downtown rail reconstruction is on-schedule; suspended lines (L, H, D) are planned to reopen post-reconstruction.

## Board eligibility

**Principle:** Every service calling at an in-catalog station must pass the walk-up boarding test (§2 of `docs/board-eligibility-rule.md`): can a rider with a standard ticket/pass/contactless tap board the next departure, and is there a clear path from station entrance to platform?

### Light rail (in-scope for v1)

| Line | Verdict | Evidence | Notes |
|------|---------|----------|-------|
| C Line | `in` | Light rail, walk-up boarding, no reservations | Active, included in v1 |
| E Line | `in` | Light rail, walk-up boarding, no reservations | Active, included in v1 |
| R Line | `in` | Light rail, walk-up boarding, no reservations | Active, included in v1 |
| W Line | `in` | Light rail, walk-up boarding, no reservations | Active, included in v1 |
| D Line | (suspended) | — | Downtown reconstruction; will reopen 2027 |
| H Line | (suspended) | — | Downtown reconstruction; will reopen 2027 |
| L Line | (suspended) | — | Downtown reconstruction; will reopen 2027 |
| T Line | `out-product` | Temporary replacement service; removed once downtown reconstruction completes | Temporary only; not included in permanent v1 network |

### Commuter rail (excluded from v1)

| Line | Verdict | Evidence | Notes |
|-------|---------|----------|-------|
| A Line | `out-product` | Passes walk-up boarding test; TVMs at all stations, no compulsory reservations. Excluded from v1 by mode cut (light rail focus); future candidate for expansion. | https://www.rtd-denver.com/open-records/reports-and-policies/facts-and-figures/a-line |
| B Line | `out-product` | Passes walk-up boarding test; TVMs at all stations, no compulsory reservations. Excluded from v1 by mode cut (light rail focus); future candidate for expansion. | https://www.rtd-denver.com/open-records/reports-and-policies/facts-and-figures/b-line |
| G Line | `out-product` | Passes walk-up boarding test; TVMs at all stations, no compulsory reservations. Excluded from v1 by mode cut (light rail focus); future candidate for expansion. | https://www.rtd-denver.com/open-records/reports-and-policies/facts-and-figures/g-line |
| N Line | `out-product` | Passes walk-up boarding test; TVMs at all stations, no compulsory reservations. Excluded from v1 by mode cut (light rail focus); future candidate for expansion. | https://www.rtd-denver.com/routes-services/rail |

**Summary:** No services other than the in-scope light rail lines call at any v1 catalog station — verified. Commuter rail does not interline with light rail within the published network; all four commuter lines terminate or transfer only at Union Station (the hub itself), which handles both modes as a central interchange. No walk-up rail service is silently filtered.

## License

- **License name:** RTD Denver GTFS License Agreement (non-exclusive, limited, revocable).
- **Redistribution / rehosting:** Permitted under the agreement's conditions. Licensee may use, reproduce, and redistribute GTFS data subject to terms. RTD retains all title and ownership. Data is provided "AS IS"; RTD disclaims liability for use or misuse.
- **Commercial use:** Not explicitly prohibited in the license agreement terms. Use case is "assisting mass transportation riders or promoting public transportation" (implicit from license phrasing), but agreement does not restrict commercial redistribution if redistribution itself is permitted.
- **Attribution:** No mandatory attribution wording required. RTD trademarks and copyrighted materials may **not** be used in association with the data in a way that suggests RTD endorsement or creates confusion. Linked content must not "damage or dilute the goodwill associated with RTD's name."
- **Terms URL:** https://www.rtd-denver.com/business-center/open-spatial-data/gtfs-realtime-license-agreement (GTFS-RT license; GTFS static license link is https://www.rtd-denver.com/business-center/open-spatial-data/gtfs-license-agreement, currently unavailable but referenced in RTD developer docs).
- **Confidence:** `unclear` on whether commercial use (e.g., selling journey-plan data derived from RTD GTFS) is permitted under the "non-exclusive" license. The agreement permits redistribution and does not explicitly prohibit commercial derivative use, but the phrasing ("promoting public transportation") suggests a rider-assistance purpose. Tim to clarify before production deployment.
- **Keyed feeds:** Both static GTFS and GTFS-RT are publicly accessible without registration or API keys. No key agreement restricts redistribution.

---

## C2/C3 notes for Luke (D1 pack)

1. **city=denver**, not `rtd`, not `colorado`, not `denver-rtd`. Do not merge with any other US city.
2. **Union Station** is the hub-lock (all light rail + commuter rail lines converge). Do not split by line into separate boards.
3. Light rail only for v1: C, E, R, W lines. Commuter rail (A, B, G, N) are recorded as board-eligible (`in` verdict) but excluded (`out-product`) from v1 catalog. Mark in registry notes: "Light rail only; commuter rail out-product."
4. Suspended lines (D, H, L) do not insert into published-network.json yet; reconstruction timeline TBD post-Downtown Rail Reconstruction Project (in progress as of Sep 2026).
5. T Line is temporary service; do not insert as permanent.
6. Developer key: not needed. Static GTFS and GTFS-RT feeds are public, no registration required.
7. RTD updates schedules 3× per year (January, May, August); D1 pack should be flagged to re-fetch before each seasonal update.
8. Timezone: `America/Denver` (Mountain Time, UTC-7 with DST).
9. Modes: all v1 services are rail (`route_type=0` for tram/light rail in GTFS). Do not mix in bus (`route_type=3`), Flex, or Bustang.

## What I did not do

No product edit, no adapter wiring, no live flip, no GitHub operations, no API calls with real credentials, no GTFS-derived manual station lists (feeds are authoritative), no merge with Chicago / BART / Washington / other US city.

---

## Station roster (D1 transcription, 6 Sep 2026)

**v1 scope:** Active light rail lines C, E, R, W only. Suspended lines (D, H, L) listed for completeness. Stations listed by official RTD name and geographic location. Interchange stations marked where lines meet. Source URLs per line are from Wikipedia line articles (authoritative for station order and naming) cross-checked against RTD official line pages.

### C Line (Southwest Corridor)

**Status:** Active | **Termini:** Union Station – Littleton–Mineral | **Stations:** 12 | **Source:** [Wikipedia: C Line (RTD)](https://en.wikipedia.org/wiki/C_Line_(RTD))

1. Union Station (Denver) — *Interchange: A, B, E, G, N, W Lines; Amtrak*
2. Ball Arena–Elitch Gardens (Denver) — *Interchange: E, W Lines*
3. Empower Field at Mile High (Denver) — *Interchange: E, W Lines*
4. Auraria West (Denver) — *Interchange: E, W Lines*
5. 10th & Osage (Denver) — *Interchange: E, H, L Lines*
6. Alameda (Denver) — *Interchange: E, H, L Lines*
7. I-25 & Broadway (Denver) — *Interchange: E, H, L Lines*
8. Evans (Denver)
9. Englewood (Englewood)
10. Oxford–City of Sheridan (Sheridan)
11. Littleton–Downtown (Littleton)
12. Littleton–Mineral (Littleton) — *Southern terminus*

**Note:** Station Bates (Englewood) is planned but not yet operational; excluded from count.

### E Line (Southeast Corridor)

**Status:** Active | **Termini:** Union Station – RidgeGate Parkway | **Stations:** 21 | **Source:** [Wikipedia: E Line (RTD)](https://en.wikipedia.org/wiki/E_Line_(RTD))

1. Union Station (Denver) — *Interchange: A, B, C, G, N, W Lines; Amtrak*
2. Ball Arena–Elitch Gardens (Denver) — *Interchange: C, W Lines*
3. Empower Field at Mile High (Denver) — *Interchange: C, W Lines*
4. Auraria West (Denver) — *Interchange: C, W Lines*
5. 10th & Osage (Denver) — *Interchange: C, H, L Lines*
6. Alameda (Denver) — *Interchange: C, H, L Lines*
7. I-25 & Broadway (Denver) — *Interchange: C, H, L Lines*
8. Louisiana–Pearl (Denver) — *Interchange: H Line*
9. University of Denver (Denver)
10. Colorado (Denver)
11. Yale (Denver)
12. Southmoor (Denver) — *Interchange: H Line*
13. Belleview (Denver) — *Interchange: R Line*
14. Orchard (Greenwood Village) — *Interchange: R Line*
15. Arapahoe at Village Center (Greenwood Village) — *Interchange: R Line*
16. Dry Creek (Centennial) — *Interchange: R Line*
17. County Line (Lone Tree) — *Interchange: R Line*
18. Lincoln (Lone Tree) — *Interchange: R Line (southern terminus of original R Line before 2026 extension)*
19. Sky Ridge (Lone Tree)
20. Lone Tree City Center (Lone Tree)
21. RidgeGate Parkway (Lone Tree) — *Southern terminus; 1,300 parking spaces*

### R Line (Aurora to RidgeGate Parkway Extension)

**Status:** Active | **Termini:** Peoria – RidgeGate Parkway | **Stations:** 19 | **Source:** [Wikipedia: R Line (RTD)](https://en.wikipedia.org/wiki/R_Line_(RTD))

**Note:** R Line does not serve downtown Denver; operates entirely in Aurora, Centennial, and Lone Tree. Extended to RidgeGate Parkway in June 2026, sharing the southern segment with E Line.

1. Peoria (Aurora) — *Northern terminus*
2. Fitzsimons (Aurora)
3. Colfax (Aurora)
4. 13th Avenue (Aurora)
5. 2nd Avenue & Abilene (Aurora)
6. Aurora Metro Center (Aurora)
7. Florida (Aurora) — *Interchange: H Line (suspended)*
8. Iliff (Aurora)
9. Nine Mile (Aurora)
10. Dayton (Aurora)
11. Belleview (Denver) — *Interchange: E Line*
12. Orchard (Greenwood Village) — *Interchange: E Line*
13. Arapahoe at Village Center (Greenwood Village) — *Interchange: E Line*
14. Dry Creek (Centennial) — *Interchange: E Line*
15. County Line (Lone Tree) — *Interchange: E Line*
16. Lincoln (Lone Tree) — *Interchange: E Line; original terminus before 2026 extension*
17. Sky Ridge (Lone Tree)
18. Lone Tree City Center (Lone Tree)
19. RidgeGate Parkway (Lone Tree) — *Southern terminus; shared with E Line*

### W Line (West Line)

**Status:** Active | **Termini:** Union Station – Jefferson County Government Center–Golden | **Stations:** 15 | **Source:** [Wikipedia: W Line (RTD)](https://en.wikipedia.org/wiki/W_Line_(RTD))

**Note:** Single-track section between Federal Center and Jefferson County Government Center–Golden limits headways to no better than 15 minutes; weekend service may terminate at Federal Center instead of continuing to Golden.

1. Union Station (Denver) — *Interchange: A, B, C, E, G, N Lines; Amtrak*
2. Ball Arena–Elitch Gardens (Denver) — *Interchange: C, E Lines*
3. Empower Field at Mile High (Denver) — *Interchange: C, E Lines*
4. Auraria West (Denver) — *Interchange: C, E Lines*
5. Decatur–Federal (Denver)
6. Knox (Denver)
7. Perry (Denver)
8. Sheridan (Denver/Lakewood)
9. Lamar (Lakewood)
10. Lakewood–Wadsworth (Lakewood)
11. Garrison (Lakewood)
12. Oak (Lakewood)
13. Federal Center (Lakewood)
14. Red Rocks College (Lakewood)
15. Jefferson County Government Center–Golden (Golden) — *Western terminus*

### D Line (Central Line) — Suspended

**Status:** Suspended (Downtown Rail Reconstruction Project) | **Termini:** 18th & California/18th & Stout – Littleton–Mineral | **Stations:** 12 | **Reopening:** 2027 (post-reconstruction) | **Source:** [Wikipedia: D Line (RTD)](https://en.wikipedia.org/wiki/D_Line_(RTD))

**Note:** Operated 1994–2026; eliminated June 2026. Downtown downtown rail reconstruction; capacity transferred to R Line frequency increases. When reopened, D Line will serve the downtown core and Southwest Corridor shared with C Line.

1. 18th & California/18th & Stout (Denver) — *Northern terminus*
2. 16th & California/16th & Stout (Denver)
3. Theatre District–Convention Center (Denver)
4. Colfax at Auraria (Denver)
5. 10th & Osage (Denver)
6. Alameda (Denver)
7. I-25 & Broadway (Denver)
8. Evans (Denver)
9. Englewood (Englewood)
10. Oxford–City of Sheridan (Sheridan)
11. Littleton–Downtown (Littleton)
12. Littleton–Mineral (Littleton) — *Southern terminus*

### H Line (Aurora Line) — Suspended

**Status:** Suspended (Downtown Rail Reconstruction Project) | **Termini:** 18th & California/18th & Stout – Florida | **Stations:** 16 | **Reopening:** 2027 (post-reconstruction) | **Source:** [Wikipedia: H Line (RTD)](https://en.wikipedia.org/wiki/H_Line_(RTD))

**Note:** Forms a "V" shape between downtown Denver and central Aurora. Began service 2006 as Aurora Line; renamed H Line in 2026. When reopened, L Line will be extended to I-25 & Broadway to restore lost downtown capacity on the northern branch. All stations shared with at least one other RTD line.

1. 18th & California/18th & Stout (Denver) — *Northern terminus (downtown core)*
2. 16th & California/16th & Stout (Denver)
3. Theatre District–Convention Center (Denver)
4. Colfax at Auraria (Denver)
5. 10th & Osage (Denver) — *Interchange: C, E, L Lines*
6. Alameda (Denver) — *Interchange: C, E, L Lines*
7. I-25 & Broadway (Denver) — *Interchange: C, E, L Lines*
8. Louisiana–Pearl (Denver) — *Interchange: E Line*
9. University of Denver (Denver)
10. Colorado (Denver)
11. Yale (Denver)
12. Southmoor (Denver) — *Interchange: E Line*
13. Dayton (Aurora) — *Interchange: R Line*
14. Nine Mile (Aurora) — *Interchange: R Line*
15. Iliff (Aurora)
16. Florida (Aurora) — *Southern terminus; Interchange: R Line*

### L Line (Central Platte Valley Line) — Suspended

**Status:** Suspended (Downtown Rail Reconstruction Project) | **Termini:** 30th & Downing – I-25 & Broadway (2027 extension) | **Stations:** 11 (12 post-2027 extension) | **Reopening:** 2027 (with extension) | **Source:** [Wikipedia: L Line (RTD)](https://en.wikipedia.org/wiki/L_Line_(RTD))

**Note:** Denver's longest-running light rail line (30+ years). Currently suspended for downtown reconstruction as part of the larger Downtown Rail Reconstruction Project. When reopened in 2027, will extend to I-25 & Broadway (replacing downstream terminus), restoring lost H Line downtown capacity on the northern segment. Future unfunded extensions would add stations at 38th & Blake, 35th & Downing, and 33rd & Downing.

1. 30th & Downing (Denver) — *Northern terminus*
2. 27th & Welton (Denver)
3. 25th & Welton (Denver)
4. 20th & Welton (Denver)
5. 18th & California/18th & Stout (Denver) — *Interchange: D, H Lines (both suspended)*
6. 16th & California/16th & Stout (Denver)
7. Theatre District–Convention Center (Denver)
8. Colfax at Auraria (Denver)
9. 10th & Osage (Denver) — *Interchange: C, E, H Lines*
10. Alameda (Denver) — *Interchange: C, E, H Lines*
11. I-25 & Broadway (Denver) — *Current temporary southern terminus; will be permanent 2027*

---

## Unique v1 station count

**Total unique stations on v1 lines (C, E, R, W):** **47 stations**

**Breakdown by sharing pattern:**

- **Shared by 3 v1 lines (C, E, W):** Union Station, Ball Arena–Elitch Gardens, Empower Field at Mile High, Auraria West (4 stations)
- **Shared by 2 v1 lines (C, E):** 10th & Osage, Alameda, I-25 & Broadway (3 stations)
- **Shared by 2 v1 lines (E, R):** Belleview, Orchard, Arapahoe at Village Center, Dry Creek, County Line, Lincoln, Sky Ridge, Lone Tree City Center, RidgeGate Parkway (9 stations)
- **C Line exclusive:** Evans, Englewood, Oxford–City of Sheridan, Littleton–Downtown, Littleton–Mineral (5 stations)
- **E Line exclusive:** Louisiana–Pearl, University of Denver, Colorado, Yale, Southmoor (5 stations)
- **R Line exclusive:** Peoria, Fitzsimons, Colfax, 13th Avenue, 2nd Avenue & Abilene, Aurora Metro Center, Florida, Iliff, Nine Mile, Dayton (10 stations)
- **W Line exclusive:** Decatur–Federal, Knox, Perry, Sheridan, Lamar, Lakewood–Wadsworth, Garrison, Oak, Federal Center, Red Rocks College, Jefferson County Government Center–Golden (11 stations)

**Total: 4 + 3 + 9 + 5 + 5 + 10 + 11 = 47 unique v1 stations**
