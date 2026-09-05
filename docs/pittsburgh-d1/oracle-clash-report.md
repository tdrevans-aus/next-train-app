# Pittsburgh oracle clash report

D1 (published, as of 6 Sep 2026): Pittsburgh Regional Transit operates **The T** light rail system, published at [rideprt.org](https://www.rideprt.org/). The system consists of three lines — **Red Line**, **Blue Line**, and **Silver Line** — covering 26.2 miles and 53 stations across Pittsburgh and suburban communities.

System map and line information: [Pittsburgh Light Rail overview](https://www.rideprt.org/) and [Wikipedia system map](https://en.wikipedia.org/wiki/Pittsburgh_Light_Rail). All three lines share common corridors in the North Shore and Downtown subway area, then diverge at South Hills Junction to serve different suburban branches.

## Station topology and hub lock

**Hub lock: Station Square** (Carson Street at Smithfield Street Bridge). All three lines — Red, Blue, and Silver — pass through or converge near this station after the Downtown subway section and before branching at South Hills Junction. Station Square is the primary transfer point and walking hub for cross-line movement. Downtown free-fare zone includes First Avenue, Steel Plaza, Wood Street, and Gateway stations (separate from incline access).

## D1 scope — light rail only, three lines

**v1 network:** Red Line + Blue Line + Silver Line (all active light rail). Each line independently operates; no other operators call at light rail stations. Amtrak services (Pennsylvanian, once daily) terminate at Pittsburgh Union Station (1100 Liberty Avenue), which is not a light rail station and has no walking connection to the light rail network — separate systems.

**Specialty modes — out of scope with verdicts:**

- **Monongahela Incline** and **Duquesne Incline** (funicular/cable-car systems, not light rail). Both are accessible by walking from Station Square station but are separate systems operated under different credentials. `out-mode` (neither is part of The T light rail system).

## H2 clash surface

1. **No product `lib/cities/pittsburgh/` exists yet.** Clash is between published Port Authority materials and GTFS content.
2. **Station naming:** GTFS stop names must match Port Authority's published names (e.g. "Station Square", "Steel Plaza", "Wood Street", line-specific stops).
3. **Three independent light rail lines with shared sections.** No branch confusion (unlike Chicago's Purple Express).
4. **No cross-operator conflict at light rail stations.** Amtrak/regional rail is a separate station; inclines are separate systems with different boarding contracts.
5. **Free-fare zone is downtown (First Avenue, Steel Plaza, Wood Street, Gateway, North Side, Allegheny) — no product change needed; v1 includes all three light rail lines.**

## Recommendations for Jim (C2/C3)

1. **city=pittsburgh**, not `prt` or `the-t`. Do not invent aliases.
2. **Station Square** is the locked inner-city hub (Red × Blue × Silver convergence before South Hills split).
3. **Three lines only:** Red, Blue, Silver. No bus, no incline, no Amtrak.
4. **doNotCollapse same-name different-context:** Verify GTFS stop names match Port Authority published names (e.g., no confusion with downtown landmarks or similar-named stations in other cities).
5. **Incline access is walking only** — Monongahela and Duquesne Inclines are separate ticketed systems, not part of The T. Riders access them from Station Square by foot. Exclude from rail boards.
6. **No regional rail overlap.** Amtrak is at a different station (Pittsburgh Union Station); no need to handle shared stops.
7. **GTFS data is current.** Transitland feed (f-dppn-portauthorityofalleghenycounty) is actively maintained and verified as of 5 Sep 2026.
8. Developer key required for real-time (account registration at rideprt.org/business-center). Key timing is not a D1 blocker — static GTFS is current and public.
9. This pack stays **planned** until developer resources confirm real-time availability.

## License

- **License name:** Port Authority of Allegheny County Developer License Agreement.
- **Redistribution / rehosting:** Non-exclusive, limited, and revocable license to use, reproduce, and redistribute GTFS and GIS data. Licensees cannot sublicense to third parties without their agreement to the same terms. Port Authority retains all intellectual property rights.
- **Commercial use:** Not explicitly prohibited; any derivative works must include required attribution and disclaimer that PAAC provides data "as is" without warranties or liability.
- **Attribution:** Derivative works must state "Reproduced with permission granted by Port Authority of Allegheny County (PAAC)." PAAC's disclaimer ("without warranties of accuracy, adequacy, completeness, or usefulness") must be included.
- **Terms URL:** https://www.rideprt.org/business-center/developer-resources/developer-license-agreement/
- **Confidence:** `clear` on redistribution terms; terms are explicit in the Developer License Agreement. Keyed real-time feed adds account-based access control (registration required via rideprt.org/business-center/developer-resources).

## Board eligibility

| Service | Station | Verdict | Evidence |
|---|---|---|---|
| **Red Line** | All 53 stations (shared + branch) | `in` | Walk-up boarding, no reservation required. Part of The T network. |
| **Blue Line** | All 53 stations (shared + branch) | `in` | Walk-up boarding, no reservation required. Part of The T network. |
| **Silver Line** | All 53 stations (shared + branch) | `in` | Walk-up boarding, no reservation required. Part of The T network. |
| **Monongahela Incline** | Accessible from Station Square by foot | `out-mode` | Funicular/cable-car system, not light rail. Different operator (Mon Incline, Inc.) and separate ticketing. Not part of The T. |
| **Duquesne Incline** | Accessible from Station Square by foot | `out-mode` | Funicular/cable-car system, not light rail. Different operator (Duquesne Incline Co., Inc.) and separate ticketing. Not part of The T. |
| **Amtrak Pennsylvanian** | Pittsburgh Union Station (not a light rail station) | `out-product` | Separate station, no walking connection to light rail network. Requires compulsory reservation. |

No services other than the three in-scope light rail lines (Red, Blue, Silver) call at any in-catalog light rail station — verified via Port Authority network topology and Transitland operator data (f-dppn-portauthorityofalleghenycounty).

---

## Feed details

- **GTFS static:** https://www.rideprt.org/developerresources/GTFS.zip (no API key required; publicly accessible)
- **GTFS Realtime:** https://truetime.portauthority.org/gtfsrt-train/ (account registration required; developer key via rideprt.org/business-center/developer-resources/)
- **Transitland ID:** f-dppn-portauthorityofalleghenycounty
- **Status:** Active and current (verified 5 Sep 2026; next update scheduled).
- **Authentication:** Account-based (login required to request developer access; key issued for real-time feed).
- **Skip risk:** None for static GTFS; real-time feed requires account setup at Port Authority developer portal. This is typical for regional transit authorities and does not block D1.
