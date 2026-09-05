# Minneapolis–Saint Paul oracle clash report

**Agency:** Metro Transit (Metropolitan Council), Minneapolis–Saint Paul, Minnesota.

**D1 Oracle:** METRO light rail network — Blue and Green lines only (37 light rail stations total as of 2026-09-06). v1 excludes all BRT lines (A/C/D/Gold/Orange) and Northstar Commuter Rail (service ended January 5, 2026).

**Static GTFS feed:**
- URL: `https://svc.metrotransit.org/mtgtfs/gtfs.zip`
- Authentication: None (public, no key required)
- Format: ZIP archive containing standard GTFS CSV tables

**GTFS Realtime feeds:**
- **Trip Updates:** `https://svc.metrotransit.org/svc/tripupdates.pb`
- **Vehicle Positions:** `https://svc.metrotransit.org/svc/vehiclepositions.pb`
- **Format:** Protocol Buffers (.pb)
- **Authentication:** None (public, no key required)

## v1 Network Cut

**In scope (light rail only):**
- METRO Blue Line: 19 stations, Target Field (downtown Minneapolis) to Mall of America (Bloomington)
- METRO Green Line: 18 stations, Target Field (downtown Minneapolis) to downtown Saint Paul via University of Minnesota campus

**Out of scope (BRT / bus mode):**
- METRO A Line (Snelling Ave / 46th St, Rosedale to 46th Street Station)
- METRO C Line (Penn Ave, downtown Minneapolis to Brooklyn Center Transit Center)
- METRO D Line (Brooklyn Center Transit Center to Mall of America)
- METRO Gold Line (downtown St. Paul to Woodbury, opened March 2025)
- METRO Orange Line (downtown Minneapolis to Burnsville via I-35W)
- Any additional BRT lines opened after this research (B: June 2025, E: December 2025 per operator timeline)

**Out of scope (service ended):**
- Northstar Commuter Rail (Target Field to Big Lake corridor) — service ceased January 5, 2026; replaced with expanded bus network. Not available for v1 oracle.

## Hub-Lock Station

**U.S. Bank Stadium** (429 Park Ave South, downtown Minneapolis). Both Blue and Green lines converge at this station; it is the last shared stop where riders can easily transfer between lines before they diverge (Blue continues to Target Field and Mall of America; Green continues to downtown Saint Paul and University of Minnesota). The Blue and Green share the same tracks and stations from U.S. Bank Stadium to Target Field.

Alternative downtown hub candidate: **Target Field** (home of Minnesota Twins), where both lines also meet and share tracks before diverging (Blue to Mall of America; Green to St. Paul / University). U.S. Bank Stadium is chosen for its exclusive dual-line transfer role before shared-track divergence.

## H2 — Clash Surface

No product `lib/cities/minneapolis/` exists yet. Clash is **map vs published operator station lists** (METRO light rail page on metrotransit.org and Transitland feed verification). Station names, stop order, and line assignment from GTFS feed + official METRO line pages. Do not use BRT/Northstar in v1 oracle; those are mode-cuts and service-ended cuts respectively, not name collisions.

## Board Eligibility

| Service | In-catalog stations | Verdict | Evidence & reason |
|---|---|---|---|
| METRO Blue Line | 19 (Target Field to Mall of America, all stations) | `in` | Light rail; walk-up boardable; no compulsory reservation or check-in barrier. |
| METRO Green Line | 18 (downtown Minneapolis to downtown St. Paul, all stations) | `in` | Light rail; walk-up boardable; no compulsory reservation or check-in barrier. |
| METRO A Line (BRT) | Calls at 46th Street Station (shared with Blue Line) | `out-mode` | Bus Rapid Transit; excluded by v1 mode cut (light rail only). |
| METRO C Line (BRT) | Does not call at in-catalog light rail stations | `out-mode` | Bus Rapid Transit; excluded by v1 mode cut. |
| METRO D Line (BRT) | Calls at Blue Line station (transfer point, no shared platform) | `out-mode` | Bus Rapid Transit; excluded by v1 mode cut (light rail only). |
| METRO Gold Line (BRT) | Does not call at in-catalog light rail stations | `out-mode` | Bus Rapid Transit; excluded by v1 mode cut. |
| METRO Orange Line (BRT) | Calls at Blue Line downtown (potential transfer) | `out-mode` | Bus Rapid Transit; excluded by v1 mode cut (light rail only). |
| Northstar Commuter Rail | Target Field and downtown transfer stations | `out-product` | Service ceased January 5, 2026; replaced with expanded bus network. No longer available to board. Permanent service end; not a v1 exclusion based on reservation or access, but service no longer exists. |

**Summary:** The v1 light rail network (Blue and Green lines) operates as standalone walk-up services with no compulsory reservations or check-in barriers. BRT lines are buses and are excluded by mode cut. Northstar ended service before this report and is noted for completeness — a historic rail service that no longer operates.

## License

- **License name:** Implied public domain / open data; Transitland records "Use allowed without attribution: Yes; Creating derived products allowed: Yes."
- **Redistribution / rehosting:** Permitted without attribution. Metro Transit's data is published as open data for developers and the public; redistribution and derivative works are explicitly allowed per Transitland feed registry.
- **Commercial use:** Allowed (no restriction noted in available terms).
- **Attribution:** Not required; use without attribution is permitted.
- **Terms URL:** https://svc.metrotransit.org (main data endpoint; no separate Terms of Service page found; Transitland feed registry is primary source for licensing language).
- **Confidence:** `unclear`. The Transitland feed registry states "Use allowed without attribution" and "Creating derived products allowed," but a formal license document (CC0, CC BY, or agency-specific terms) is not explicitly published at the data URL or readily found on metrotransit.org. This should be confirmed during D1 (Luke's data pack phase) by checking the agency's official developer documentation or contacting Metro Transit directly.

## Keyed Feeds

None. Both GTFS static and GTFS-RT feeds are public endpoints requiring no API key or authentication token.

## Skip Risk (one-line)

Northstar commuter rail service ended January 5, 2026; v1 is light rail only (Blue/Green lines), which have public GTFS feeds and no known blockers.

## H3 Notes for Luke (D1 Pack)

1. Light rail only: 37 total stations (Blue 19 + Green 18, with Target Field as final shared station before divergence).
2. Hub U.S. Bank Stadium (downtown transfer point) or Target Field (secondary hub, shared Blue/Green tracks).
3. Blue Line runs south/west to Mall of America (Bloomington); Green Line runs east/north to downtown St. Paul and University of Minnesota campus.
4. Green Line Extension to Eden Prairie (14.5 miles, 2027) is not in v1 scope — future expansion.
5. GTFS feed includes Metro Transit extensions (cardinal direction tags for trip direction).
6. BRT lines (A, C, D, Gold, Orange, and future B/E) are buses, mode-cut from v1. Do not include in light rail network.
7. Northstar Commuter Rail is permanently ended — do not attempt to include in RT feeds. Bus replacements operate under different route codes.
8. No key friction: both static and realtime feeds are free/public. Verify license terms directly with Metro Transit to close the "unclear" confidence level if a formal CC0 or agency license document exists.
9. Do not invent city=msp, mpls, or twin-cities-metro; use city=minneapolis per tracker convention. Verify final city token at D1.
