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

## References & sources

- Transitland feed page (f-mts~rt~onebusaway): https://www.transit.land/feeds/f-mts~rt~onebusaway
- MTS Developer Resources: https://www.sdmts.com/business-center/app-developers
- MTS Real-Time Data: https://www.sdmts.com/business-center/app-developers/real-time-data
- MTS Trolley system: https://www.sdmts.com/transit-services/trolley
- 12th & Imperial Transit Center (Wikipedia): https://en.wikipedia.org/wiki/12th_%26_Imperial_Transit_Center
- Silver Line (heritage) route: https://en.wikipedia.org/wiki/Silver_Line_(San_Diego_Trolley)
- COASTER Santa Fe Depot shared platform: https://www.subwaynut.com/california/san_diego_trolley/santa_fe_depot/index.php
