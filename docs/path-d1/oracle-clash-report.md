# New York PATH — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** scoped, D1 pack not written. **city id:** `path` (do not invent `port-authority`, `trans-hudson`, or merge into NYC Subway city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Port Authority Trans-Hudson (PATH). Transitland operator **o-dr5r-path**. Operates 13 stations, 4 daily routes + 2 late-night routes, 24/7 service. |
| Official map | PATH system map — https://www.panynj.gov/path/en/index.html (maps section; no current published digital map URL found; use Wikipedia for reference). |
| Static GTFS | http://data.trilliumtransit.com/gtfs/path-nj-us/path-nj-us.zip — no key; empty-key **200** 2026-09-05. Transitland Onestop **f-dr5r-path~nj~us**, last fetch 2026-09-05. Mobility Database **mdb-517** (official; America/New_York; 7 routes; last download 2026-09-05). Service dates July 20, 2026 — November 14, 2026. Alternative URL https://rapid.nationalrtap.org/GTFSFileManagement/UserUploadFiles/14843/PATHGTFS.zip (same feed via national RTAP source). |
| GTFS-RT / live | **Community GTFS-RT:** https://path.transitdata.nyc/gtfsrt — MIT licensed, updated every 5 seconds. Built by jamespfennell (GitHub: jamespfennell/path-train-gtfs-realtime). No official Port Authority GTFS-RT feed published. **Community API option:** https://path.api.razza.dev/ (mrazza/path-data gRPC API; MIT licensed; archived as of May 4, 2026; not officially supported by Port Authority; external consumers including Transit and Citymapper rely on this service). Neither community feed is endorsed by the Port Authority. |
| Auth | Static GTFS: none (empty-key 200; feeds are public). GTFS-RT: none (community conversions; no official key exists). Official PORT AUTHORITY APIs: not publicly documented. |
| Timezone | America/New_York (HAS DST) |

## v1 mode cut

**PATH four daily routes, all stations:** Newark–World Trade Center, Hoboken–World Trade Center, Journal Square–33rd Street (via Hoboken), Hoboken–33rd Street. All 13 in-catalog stations — Grove Street (Jersey City), Harrison (Harrison, NJ), Newark Penn Station, World Trade Center, Exchange Place, Hoboken Terminal, 33rd Street, 14th Street, 9th Street, Christopher Street, 23rd Street, Journal Square Transportation Center, and JSQ-HOB intermediate stops if any. No mode cut — PATH operates only rail; no buses, ferries, or light rail in v1. Out: nothing at PATH scale (other New Jersey/Metro-North/LIRR/NJ Transit services are not PATH and are handled separately by city or operator). **Direction hazard (weekend v1 cut):** Journal Square–33rd Street via Hoboken pattern runs weekday-only as a through-service; weekend service on that line is replaced by separate Hoboken–33rd Street service (per 2026 Port Authority restructuring). v1 must track both patterns to avoid a silent-filter failure: a rider looking for a departure from Hoboken to 33rd on Sunday should see the Hoboken–33rd line, not the JSQ-HOB portion of a missing JSQ–33 train. Adapter filtering must tag or separate these patterns.

**Hub lock:** **World Trade Center** (Manhattan terminus on all four routes; in-catalog). Alternative hub: **Journal Square Transportation Center** (Jersey City terminus; on Newark-WTC + JSQ-33 routes). WTC is the inner lock (all routes cross Manhattan between WTC and uptown; no single uptown station is on all four). doNotGroup WTC PATH against WTC Cortlandt (subway C, E), Cortlandt St (subway 1, 2), Fulton St (subway 2, 3, 4, 5, A, C, J, Z), or other subway stations sharing the "World Trade Center" naming in the area.

## Shared-name stations: doNotGroup verdicts

PATH shares station names with NYC Subway at six Manhattan locations. Board filtering must use GPS distance or canonical stop IDs to prevent silent cross-operator merges:

| Station name | PATH call(s) | NYC Subway line(s) | Path vs Subway issue |
| --- | --- | --- | --- |
| 33rd Street | JSQ–33, HOB–33 | 1, 2, 3 (at 34th St–Herald Sq); A, C, E (at 34th St–Penn Station) | Name mismatch in published station list (PATH "33rd" vs Subway "34th St–…"). Adult riders know PATH is one block south; silent merge would show the wrong platform arrangement. doNotGroup by stop_id + GPS radius (PATH 33 St ≠ Subway 34 St lines). |
| World Trade Center | NWK–WTC, HOB–WTC, HOB–33 (end), JSQ–33 (end) | C, E (WTC Cortlandt); 1, 2 (Cortlandt St, one block north); A, C, J, Z, 2, 3, 4, 5 (Fulton St/Broadway–Nassau; blocks away). | Multiple subway stops in the district use "World Trade", "Cortlandt", "Fulton" names. PATH WTC station is at the base of One World Trade Center. Cordoning by distance + stop_id is essential. |
| Christopher Street | JSQ–33 | 1 (Christopher St–Stonewall, IRT Ninth Av Line) | Separate stations, ~0.2 mi walk. Different lines (PATH does not have a "1" equivalent). |
| 9th Street | JSQ–33 | A, C, E (14th St stop nearby); 1, 2 (at 9th St on Park Pl, not on the Avenue); no exact "9th St" stop on A/C/E. | Close proximity but distinct entrances. GPS + stop_id essential. |
| 14th Street | JSQ–33 | 1, 2 (14th St); A, C, E (14th St); L (14th St). | Multiple lines converge. PATH stop is on the PATH 14 St corridor; subway 14 St stops are on different line corridors. Stop_id separation is mandatory. |
| 23rd Street | JSQ–33 | 1, 2 (23rd St); A, C, E (23rd St); N, R, W (23rd St). | Similar to 14th St: many subway lines, different stop locations by line. doNotGroup by stop_id. |

**Board eligibility verdict:** No services other than the four in-scope PATH routes call at any in-catalog station. Jersey City / Newark / Hoboken commuter rail and NJ Transit bus services are separate operators, not v1 mode. Verified that PATH is the sole in-catalog operator at its 13 stations. `in` for all four PATH routes.

## Skip risk

1. **License terms unclear:** Port Authority of New York and New Jersey does not publish GTFS data license terms on a developer portal (unlike MTA Subway, which has explicit T&Cs). Transitland/Mobility Database index the feed as "official" but do not state a license. Trillium Transit (feed host) has terms for their service but not for PATH data itself. Risk: confirm at D1 whether PANYNJ grants redistribution rights or if PATH data is "as-is" with no published agreement.
2. **GTFS-RT is community-supplied, not official:** No Port Authority GTFS-RT feed exists. The practical feeds (jamespfennell, mrazza/path-data) are community projects, MIT-licensed, but not endorsed by PANYNJ. Archived mrazza API (May 2026) may not be stable long-term. Risk: confirm at D1 that relying on community GTFS-RT is acceptable for a live v1 (or gate on static-only until Port Authority publishes official RT).
3. **Direction pattern hazard (weekend service split):** The weekend JSQ–33 service restructuring (replaced by separate HOB–33 line) introduces a boarding-contract edge case: a weekend rider at Hoboken looking for "33rd Street" service must not see a JSQ–33 train that ends before reaching 33rd on a weekday schedule. v1 adapter must segregate patterns or mark them distinctly. Mishandling creates silent-filter risk (missing trains on a weekend board).
4. **Official API not public:** Port Authority does not publish a developer API for real-time or schedule lookup. This is not a blocker (GTFS + community RT feed work), but note that future Port Authority API announcements might change feed strategy.

None of these are blockers to v1 v1 (no "do not do this" verdict), but confirm D1 pack and Tim sign-off on RT-feed choice.

## License

- **License name:** Not stated by Port Authority Trans-Hudson (PANYNJ). Feed metadata does not specify a license (unlike MTA Subway's explicit terms). Transitland and Mobility Database index it as "official" but do not publish PANYNJ's terms. This is a common case for older transit agencies without a formal developer program.
- **Redistribution / rehosting:** Unclear. Transitland's terms permit apps to use Transitland's aggregated data under Transitland's CC BY 4.0 license. However, those terms apply to Transitland's *index*, not to the underlying PANYNJ GTFS data. To confirm redistribution rights for PANYNJ PATH data itself, contact Port Authority directly or review their Transitland Agency Profile notes.
- **Commercial use:** Unclear. GTFS data in the US is often treated as public data available for commercial use (no explicit ban), but PANYNJ has not stated this publicly.
- **Attribution:** Not required (no terms state it). If PANYNJ later publishes terms, this may change.
- **Terms URL:** No official license page found. Agency developer index (not specific to PATH data): https://www.panynj.gov/path/en/index.html (general info page only). Transitland feed: https://www.transit.land/feeds/f-dr5r-path~nj~us. Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-517. Community GTFS-RT (jamespfennell): MIT License — https://github.com/jamespfennell/path-train-gtfs-realtime (see LICENSE file). Community API (mrazza): MIT License — https://github.com/mrazza/path-data (archived May 4, 2026).
- **Confidence:** `unclear` on PANYNJ data-feed terms (not published). `clear` on community feeds' MIT licensing (jamespfennell, mrazza). Recommend: D1 pack should include contact result from Port Authority for official license clarification, or record the decision to rely on Transitland/community feeds with explicit sign-off.
- **Keyed feeds:** Static GTFS is no-key; no key agreement governs it. Community GTFS-RT feeds (MIT licensed) also require no key.

## C2 for a later D1 pack (not this file's job)

1. city=`path`. displayName Port Authority Trans-Hudson.
2. Hub: World Trade Center (or Journal Square alt). doNotGroup WTC PATH against WTC Cortlandt / Cortlandt St / Fulton St / Bowling Green subway; doNotGroup Hoboken Terminal against Hoboken NJ Transit.
3. Modes v1 PATH four routes (NWK–WTC, HOB–WTC, JSQ–33, HOB–33; all 13 stations).
4. Board eligibility: All four routes `in`; no outside services call at in-catalog stations. Direction-hazard flag: weekend JSQ–33 ↔ HOB–33 pattern split (adapter must not silently omit weekend HOB–33 when showing HOB–JSQ layover).
5. License: Contact Port Authority for official GTFS data terms; record decision. If unclear, use Transitland CC BY 4.0 (feed index, not PATH data itself) or gate on static-only until PANYNJ provides RT.
6. assertCityLive("path") must fail until wired.
