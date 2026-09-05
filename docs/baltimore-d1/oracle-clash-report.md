# Baltimore — oracle clash report

**Lane:** Nico research + Luke D1 transcription. **Date:** 2026-09-06. **Status:** Research complete, city **to do**. **city id:** `baltimore` (do not invent `bmore`, `mta`, or merge into another US city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Maryland Transit Administration (MDOT MTA) |
| Official map | MDOT MTA Transit Maps — https://www.mta.maryland.gov/schedule |
| Static GTFS Metro | https://feeds.mta.maryland.gov/gtfs/metro → S3 redirect (no key) |
| Static GTFS Light Rail | https://feeds.mta.maryland.gov/gtfs/light-rail → S3 redirect (no key) |
| Static GTFS MARC | https://feeds.mta.maryland.gov/gtfs/marc → S3 redirect (no key) |
| GTFS-RT Metro / Light Rail | Swiftly API (requires key registration via form; agency keys mta-maryland-metro, mta-maryland-light-rail) |
| GTFS-RT MARC | S3 direct: https://mdotmta-gtfs-rt.s3.amazonaws.com/MARC+RT/marc-tu.pb + marc-vp.pb (no key) |
| Service Alerts | https://feeds.mta.maryland.gov/alerts.pb (no key) |
| Auth | Static: none. Swiftly RT: key required (register at Swiftly docs). MARC RT: none. Alerts: none. |
| Timezone | America/New_York (HAS DST) |

All feeds indexed on Transitland: MDOT MTA operator page. Metro SubwayLink Onestop: f-dq-mtamaryland~subwaylink (static + f-dq-mtamaryland~subwaylink~rt). Light RailLink Onestop: f-dq-mtamaryland~raillink (static + f-dq-mtamaryland~raillink~rt).

## v1 mode cut

**Metro SubwayLink + Light RailLink only.** No bus, no MARC, no commuter services in v1.

**Metro SubwayLink:** 14 stations, Owings Mills (west) to Johns Hopkins Hospital (east).
- Stations: Owings Mills, Old Court, Milford Mill, Reisterstown Plaza, Rogers Ave, West Cold Spring, Mondawmin, Penn North, Upton, State Center, Lexington Market, Charles Center, Shot Tower, Johns Hopkins Hospital.

**Light RailLink:** 33 stations, Hunt Valley (north) to Glen Burnie/BWI Airport (south) with spur to Penn Station.
- Main line + Penn Station spur + branches at southern end.

**Hub lock:** **Lexington Market** (serves both Metro SubwayLink and Light RailLink with close physical transfer; inner-city interchange). Not State Center, not Penn Station.

## Board eligibility

| Service | Call at in-catalog stations? | Walk-up test | Reservation test | Verdict | Evidence |
|---|---|---|---|---|---|
| Metro SubwayLink | Yes (all 14) | Yes | No reservation required | **in** | Urban rapid transit, typical walk-up service (MBTA/WMATA model). No booking gate. Transitland: metro feed active. |
| Light RailLink | Yes (all 33) | Yes | No reservation required | **in** | Light rail walk-up service, same operator. No booking gate. Transitland: raillink feed active. |
| MARC Penn Line | Yes (Penn Station, Light Rail spur) | Yes | No compulsory reservation (walk-up allowed, capacity permitting) | **out-product** | MARC passes both walk-up tests: no seat reservation required, no check-in barrier. However, explicitly excluded from v1 product scope (commuter rail outside v1 boundaries). Tim decides if MARC inclusion is later. |

**Board eligibility conclusion:** Metro and Light Rail are in. MARC excluded by product cut, not eligibility failure. No services other than the in-scope operator pair call at v1 stations with out-of-scope verdict.

## Skip risk

**Swiftly API key requirement:** Metro SubwayLink and Light RailLink real-time feeds require Swiftly API key registration (via form at Swiftly docs portal). Key procurement is not guaranteed automated; may require manual signup and approval. **This is a real blockers if Swiftly key cannot be obtained.** Verify key availability during D1 — MARC RT is unkeyed (S3) but Metro/Light Rail RT blocks full-capability adapter without it.

**No other known blockers:** Static GTFS unkeyed and verified; MARC RT unkeyed via S3; alerts unkeyed. Metro and Light Rail GTFS-RT feeds confirmed active 2026-09-06 (Transitland last fetch dates + MTA developer resources page). Penn Station transfer between Light Rail and MARC is real; verdicts resolve the overlap.

## D1 guidance — who has line codes today

**Static feeds:** Metro SubwayLink and Light RailLink GTFS available, unkeyed. Map or Transitland stops list should be used for station canonicalization (similar to Boston/Washington hand-transcription pattern); do not assume GTFS order is map order.

**Real-time feeds:** Metro SubwayLink and Light RailLink trip updates + vehicle positions via Swiftly (required key). MARC via S3 (unkeyed) but out-of-v1 for now. Alerts feed (unkeyed) covers all modes.

**Hub lock:** Lexington Market. Both systems serve it; it's walkable between them (approx 200 m). doNotGroup Lexington Market metro vs Lexington Market light rail unless the same physical station; verify during D1.

## C2/C3 to put in front of Jim

1. **city=baltimore**, displayName **Baltimore**. Not `bmore`, not `mta`, not `baltimore-metro`, not `us`. Do not merge into washington / boston / any other US city.
2. **Lexington Market is the locked hub** (Metro SubwayLink × Light RailLink). Not State Center, not Penn Station.
3. **Metro SubwayLink = 14 stations** (Owings Mills to Johns Hopkins). **Light RailLink = 33 stations** (Hunt Valley / BWI / Penn Station).
4. **Modes v1: Metro SubwayLink + Light RailLink only.** No bus, no MARC commuter, no CityLink.
5. **MARC at Penn Station** is `out-product` (commuter rail cut; passes walk-up test but excluded from v1 scope pending product decision).
6. **Swiftly API key required for Metro/Light Rail real-time.** MARC RT is unkeyed S3. Verify key availability during D1.
7. **America/New_York HAS DST.** Do not copy Perth / Brisbane no-DST.
8. **Static GTFS hand-transcription pattern:** Use Transitland stops lists or official MTA map for station canonicalization. Do not assume GTFS row order = map order (as per Boston model).
9. This pack stays **to do** / **planned** until Swiftly key is obtained and integration verified. `assertCityLive("baltimore")` must fail.

## What I did not do

No line-map generator, no stopIds in published JSON, no live city flip, no product edit, no GTFS-derived station arrays, no invent city=bmore, no Swiftly key paste, no product registry entry, no gate registration, no merge of other PRs.

## License

- **License name:** Public Domain (per opendata.maryland.gov designation for MDOT MTA data).
- **Redistribution / rehosting:** MDOT MTA supports open transit data initiatives; GTFS feeds published at feeds.mta.maryland.gov with no explicit redistribution restriction stated. Public domain allows redistribution. Serving riders in our app via API is permitted. Sublicensing to third parties: not explicitly addressed; treat as unclear pending direct contact with MTA.
- **Commercial use:** Allowed (public domain, no fee). MDOT MTA does not restrict commercial use of published GTFS data.
- **Attribution:** Required per standard practice (agency name Maryland Transit Administration / MDOT MTA should appear in app credits). No specific wording mandated in available terms.
- **Terms URL:** https://www.mta.maryland.gov/developer-resources (primary); https://opendata.maryland.gov/Transportation/MD-iMAP-Maryland-Transit-MTA-Bus-Lines/xmhu-zntx (designation on open data portal). MDOT MTA-specific GTFS license terms page (https://www.mta.maryland.gov/about/publicgtfsdata.cfm) is under construction as of 2026-09-06.
- **Confidence:** `clear` that GTFS data is public domain and redistributable; `clear` that no explicit commercial-use fee. `unclear` on third-party sublicensing — public domain statement suggests yes, but MTA's formal license document (under construction) may add conditions. Recommend Tim review before go-live if sublicensing to third-party apps is planned.
- **Keyed feeds:** Swiftly API key agreement (for Metro/Light Rail GTFS-RT) — terms not reviewed yet. MARC GTFS-RT unkeyed. Recommend obtaining and reviewing Swiftly agreement during D1.
