# Los Angeles — oracle clash report

**Lane:** Nico research. **Date:** 2026-08-29. **Status:** scoped, D1 pack not written. **city id:** `los-angeles` (do not invent `la`, `lax`, `metro`, or merge into another US city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Los Angeles County Metropolitan Transportation Authority (LA Metro / LACMTA) |
| Official map | Metro Rail six-line rider page — https://www.metro.net/riding/how-ride-rail/ . May 2026 Rail and Busway Map — https://cdn.beta.metro.net/wp-content/uploads/2026/05/09224824/26-1362_map_GM_Master_DCR-2-copy.pdf (linked from https://www.metro.net/riding/schedules/). Plate also prints G/J busway — v1 is the Metro Rail legend only. |
| Static GTFS | https://gitlab.com/LACMTA/gtfs_rail/raw/master/gtfs_rail.zip — no key. Transitland Onestop **f-9q5-metro~losangeles~rail**, last fetch 2026-08-28. Mobility Database **mdb-30** (official rail; 6 routes; America/Los_Angeles). Bus zip **f-9q5-metro~losangeles** / **mdb-29** is a different feed — do not use for v1. |
| GTFS-RT / live | Swiftly rail — https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-vehicle-positions + https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-trip-updates. Transitland Onestop **f-metro~losangeles~rail~rt**, last fetch 2026-08-29. Empty-key **401** (WWW-Authenticate: Bearer) verified 2026-08-29. Alerts Onestop **f-metro~losangeles~alerts** last fetch is 404 — not a substitute. |
| Auth | GTFS zip: none. GTFS-RT: Swiftly `Authorization` header key from https://goswift.ly/realtime-api-key. Never paste a key. |
| Timezone | America/Los_Angeles (HAS DST) |

Do not generate a published-network.json from GTFS. D1 is the official Metro Rail map, hand-transcribed, later.

## v1 mode cut

**Metro Rail only:** A, B, C, D, E, K (printed as Metro Rail on the May 2026 map and on How to Ride Metro Rail — six train lines / 115 stations). Termini on that rider page: A Pomona–Long Beach; B Union Station–North Hollywood; C Norwalk–LAX/Metro Transit Center; D Union Station–Wilshire/La Cienega; E East Los Angeles–Santa Monica; K Expo/Crenshaw–Redondo Beach. **Out:** buses; BRT / Metro Busway including G Line and J Line (Silver); Metrolink; Amtrak; street-running tourist; airport people movers / FlyAway unless they are on the official Metro Rail legend (they are not). D Line Section 1 to Wilshire/La Cienega opened 8 May 2026 — that end is in. Further D Line west and further A Line east print as under construction — out until the map says open.

Hub lock: **7th Street/Metro Center** (A × B × D × E). Map prints **7th St/Metro Ctr**. Not Union Station (A/B/D + Metrolink/Amtrak), not Civic Center/Grand Park (B × D; map **Civic Ctr/Grand Park**), not Pershing Square (B × D), not Historic Broadway (A × E), not Pico, not Downtown. C and K do not serve this station. There is no station on all six Metro Rail lines — 7th Street/Metro Center is the inner A/B/D/E lock. doNotGroup 7th Street/Metro Center vs Union Station Metrolink/Amtrak vs Civic Center/Grand Park vs Pershing Square vs Historic Broadway vs East LA Civic Center (different place).

## Skip risk

J Line / G Line busway leaking into Metro Rail; Union Station Metrolink/Amtrak name-family folded into subway; inventing city=`la` / `lax` / `metro`. Swiftly GTFS-RT key required (empty-key 401) — tracker friction, not a missing feed. Static rail feed itself is verified. Not a skip.

## License

- **License name:** Metro Developer Terms & Conditions (LACMTA / developer.metro.net). GTFS-RT is separately under the Swiftly API License Agreement.
- **Redistribution / rehosting:** Metro T&C 1.1 limits use to the purposes stated on registration; 2.1.f says access is subject to terms “prohibiting unauthorized redistribution and publication”; 2.1.j says “not make the transport information feeds available to any third parties.” Serving riders in our app is the registration-purpose display in 1.1/1.2 — Tim judges that. Do not treat this as sublicensable. Swiftly clause 2: limited, non-sublicensable, non-transferable licence to display Content in the Application; “no right to distribute or allow access to the stand-alone APIs.” Swiftly 4(vi): shall not sell, lease, share, transfer, or sublicense Content to any third party.
- **Commercial use:** Metro T&C do not say allowed or prohibited; use is purpose-limited to the registration. Unclear. Swiftly does not ban a commercial Application but 4(iv) forbids charging incremental fees for the Content.
- **Attribution:** Metro T&C 2.1.i: “acknowledge Metro as the provider of the Transport Information as set forth in the Web Services Developer Guidelines.” No Metro trademark. Transitland indexes rail **Use allowed without attribution: Yes** — that disagrees with 2.1.i. Do not treat Transitland’s flag as the terms.
- **Terms URL:** https://developer.metro.net/docs/policies/terms-conditions/ (same text at https://developer.metro.net/terms-conditions/). Transitland older pointer: http://developer.metro.net/the-basics/policies/terms-and-conditions/ . Swiftly: https://www.goswift.ly/api-license (updates effective 22 Sep 2025). Agency developer index: https://developer.metro.net/ . Static rail landing: https://developer.metro.net/gtfs-schedule-data/ .
- **Confidence:** `clear` that feed-to-third-parties is prohibited (2.1.j) and that Swiftly RT is keyed / non-sublicensable; `unclear` on commercial use and on attribution (Metro vs Transitland disagree).
- **Keyed feeds:** Swiftly key agreement governs GTFS-RT, not the static zip. Never paste a key. Metro T&C 5.3 also deactivates unused Metro developer keys after 60 days — that clause is for Metro Services, not the public GitLab zip.

## C2 for a later D1 pack (not this file's job)

1. city=`los-angeles`. displayName Los Angeles.
2. 7th Street/Metro Center hub. doNotGroup Union Station Metrolink/Amtrak / Civic Center / Pershing Square.
3. Modes v1 Metro Rail only (A B C D E K). J Line / G Line out.
4. assertCityLive("los-angeles") must fail until wired.
