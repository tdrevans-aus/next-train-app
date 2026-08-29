# Los Angeles — oracle clash report

**Lane:** Nico research + Luke D1 transcription. **Date:** 2026-08-29. **Status:** D1 pack written, city **planned**. **city id:** `los-angeles` (do not invent `la`, `lax`, `metro`, or merge into another US city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Los Angeles County Metropolitan Transportation Authority (LA Metro / LACMTA) |
| Official map | Metro Rail six-line rider page — https://www.metro.net/riding/how-ride-rail/ . May 2026 Rail and Busway Map — https://cdn.beta.metro.net/wp-content/uploads/2026/05/09224824/26-1362_map_GM_Master_DCR-2-copy.pdf (linked from https://www.metro.net/riding/schedules/). Plate also prints G/J busway — v1 is the Metro Rail legend only. |
| Static GTFS | https://gitlab.com/LACMTA/gtfs_rail/raw/master/gtfs_rail.zip — no key. Transitland Onestop **f-9q5-metro~losangeles~rail**, last fetch 2026-08-28. Mobility Database **mdb-30** (official rail; 6 routes; America/Los_Angeles). Bus zip **f-9q5-metro~losangeles** / **mdb-29** is a different feed — do not use for v1. |
| GTFS-RT / live | Swiftly rail — https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-vehicle-positions + https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-trip-updates. Transitland Onestop **f-metro~losangeles~rail~rt**, last fetch 2026-08-29. Empty-key **401** (WWW-Authenticate: Bearer) verified 2026-08-29. Alerts Onestop **f-metro~losangeles~alerts** last fetch is 404 — not a substitute. |
| Auth | GTFS zip: none. GTFS-RT: Swiftly `Authorization` header key from https://goswift.ly/realtime-api-key. Never paste a key. |
| Timezone | America/Los_Angeles (HAS DST) |

Stations arrays **hand-transcribed from rendered map images**. **Not generated from GTFS.** Not generated from Swiftly. Map printed names win.

## v1 mode cut

**Metro Rail only:** A, B, C, D, E, K (printed as Metro Rail on the May 2026 map and on How to Ride Metro Rail — six train lines / 115 stations). Termini on that rider page: A Pomona–Long Beach; B Union Station–North Hollywood; C Norwalk–LAX/Metro Transit Center; D Union Station–Wilshire/La Cienega; E East Los Angeles–Santa Monica; K Expo/Crenshaw–Redondo Beach. **Out:** buses; BRT / Metro Busway including G Line and J Line (Silver); Metrolink; Amtrak; street-running tourist; airport people movers / FlyAway unless they are on the official Metro Rail legend (they are not). D Line Section 1 to Wilshire/La Cienega opened 8 May 2026 — that end is in. Further D Line west and further A Line east print as under construction — out until the map says open.

Hub lock: **7th Street/Metro Center** (A × B × D × E). Map prints **7th St/Metro Ctr**. Not Union Station (A/B/D + Metrolink/Amtrak), not Civic Center/Grand Park (B × D; map **Civic Ctr/Grand Park**), not Pershing Square (B × D), not Historic Broadway (A × E), not Pico, not Downtown. C and K do not serve this station. There is no station on all six Metro Rail lines — 7th Street/Metro Center is the inner A/B/D/E lock. doNotGroup 7th Street/Metro Center vs Union Station Metrolink/Amtrak vs Civic Center/Grand Park vs Pershing Square vs Historic Broadway vs East LA Civic Center (different place).

## Skip risk

J Line / G Line busway leaking into Metro Rail; Union Station Metrolink/Amtrak name-family folded into subway; inventing city=`la` / `lax` / `metro`. Swiftly GTFS-RT key required (empty-key 401) — tracker friction, not a missing feed. Static rail feed itself is verified. Not a skip.

## D1 map transcription (29 Aug 2026)

D1 (published, as of 29 Aug 2026): [How to Ride Metro Rail](https://www.metro.net/riding/how-ride-rail/) + [Maps & Schedules](https://www.metro.net/riding/schedules/) **Metro Rail & Busway** [26-1362_map_GM_Master_DCR-2-copy.pdf](https://cdn.beta.metro.net/wp-content/uploads/2026/05/09224824/26-1362_map_GM_Master_DCR-2-copy.pdf) (printed **MAY 2026**, form **26-1362 ©2026 LACMTA**, HTTP Last-Modified **Sun, 10 May 2026 05:48:27 GMT**, InDesign 21.2, PDF ModDate Mon 4 May 2026 16:08 PT). Stations arrays **hand-transcribed from rendered map images**. **Not generated from GTFS.**

Legend Metro Rail terminal pairs (circles; large type on the plate):

- **A Line** • Pomona / Long Beach — **48** (stop strings **Pomona North** / **Downtown Long Beach**; clockwise Long Beach loop includes **Pacific Av**)
- **B Line** • North Hollywood / Union Station — **14**
- **C Line** • LAX / Norwalk — **12** (stop string **LAX/Metro Transit Center**; rider page Norwalk–LAX/Metro Transit Center)
- **D Line** • Wilshire/La Cienega / Union Station — **11**
- **E Line** • Santa Monica / East LA — **29** (stop strings **Downtown Santa Monica** / **Atlantic**)
- **K Line** • Expo/Crenshaw / Redondo Beach — **13**

Six passenger rail services. Metro Busway **G** and **J** print as squares — out of v1. **110** unique passenger-open Metro Rail stops after dedupe. How to Ride (27 Jul 2026) and [Metro Facts at a Glance](https://www.metro.net/about/facts-glance/) print **115** as the system figure (Facts updated 11 May 2026 after D Line Extension 1). Line ticks **match Facts** (A 48 / B 14 / C 12 / D 11 / E 29 / K 13, including listed shares). D1 uniqueNames is the deduped map-print set; this pack does not invent five extra names the plate does not print.

Supporting official timetable PDFs (timepoints / connections; **map still wins**): [A 801](https://cdn.beta.metro.net/wp-content/uploads/2026/06/11104336/801_TT_06-07-26-1.pdf), [B/D 802](https://cdn.beta.metro.net/wp-content/uploads/2026/06/11105233/802_TT_06-7-26-1.pdf), [C 803](https://cdn.beta.metro.net/wp-content/uploads/2026/06/11105237/803_TT_6-7-26-1.pdf), [E 804](https://cdn.beta.metro.net/wp-content/uploads/2025/12/12151402/804_TT_12-14-25.pdf), [K 807](https://cdn.beta.metro.net/wp-content/uploads/2026/06/11105241/807_TT_6-7-26-1.pdf).

Hub lock: **7th St/Metro Ctr** (A × B × D × E). C and K do not serve it. Not Union Station, not Civic Ctr/Grand Park, not Pershing Square, not Historic Broadway.

Open on this plate: D Line Section 1 **Wilshire/La Brea, Wilshire/Fairfax, Wilshire/La Cienega** (solid); A Line Foothill **Glendora, San Dimas, La Verne/Fairplex, Pomona North** (solid; Pomona North has an ML transfer icon). Dashed **METRO D LINE SUBWAY EXTENSION PROJECT** west of Wilshire/La Cienega — out. Dashed **METRO A LINE EXTENSION PROJECT** east of Pomona North — out.

H2 clash surface (after transcription): **no** product `lib/cities/los-angeles/`. Clash is **map vs timetable long form** plus **doNotCollapse pairs on the same map** plus **Facts 115 vs unique printed names 110**. Not GTFS. G/J / Metrolink / Amtrak / FlyAway out of v1 oracle.

## Station name table

Match rule: published D1 string (May 2026 map) vs How to Ride / timetable / Facts / historic print. `rename` = same place, different printed string. Map wins.

| published (D1) | other print | class |
| --- | --- | --- |
| 7th St/Metro Ctr | Clash-report / timetable **7th Street/Metro Center** | **rename (lock)**. Locked to map **7th St/Metro Ctr**. A × B × D × E. C and K do not serve it. Do not use Union Station / Civic Ctr / Pershing Square / Historic Broadway / Pico / Downtown / LA. |
| Union Station | Map + A/B/D; ML / AM / FA icons | **lock pair**. **Not the hub.** doNotGroup metro vs Metrolink/Amtrak/FlyAway. E does not serve it. |
| Civic Ctr/Grand Park | Timetable **Civic Center/Grand Park** | **rename**. Locked to map **Ctr**. B × D only. **Not 7th St/Metro Ctr.** **Not East LA Civic Ctr.** **Not Grand Av Arts/Bunker Hill.** |
| Pershing Square | Map + B/D | **lock pair**. **Not 7th St/Metro Ctr.** **Not Historic Broadway.** |
| Historic Broadway | Map + A/E | **lock pair**. **Not 7th St/Metro Ctr.** **Not Pershing Square.** |
| Grand Av Arts/Bunker Hill | Timetable **Grand Av Arts / Bunker Hill Station** | **joined**. A × E Regional Connector. **Not Grand/LATTC.** **Not Civic Ctr/Grand Park.** |
| Little Tokyo/Arts Dist | Timetable **Little Tokyo/Arts District** | **rename**. Locked to map **Dist**. |
| East LA Civic Ctr | Timetable **East LA Civic Center**; legend **East LA** | **rename**. E through-stop. East terminus stop string is **Atlantic**. **Not Civic Ctr/Grand Park.** |
| Pico | Map + A/E | **lock pair**. **Not Pico/Aliso.** South of Pico, A and E split. |
| Pico/Aliso | Map + E only | **lock pair**. **Not Pico.** |
| LATTC/Ortho Institute | Timetable **LATTC/Ortho Institute** | match. E only. **Not Grand/LATTC.** **Not 37th St/USC** (J Line, out). |
| Grand/LATTC | Map + A only | **lock pair**. **Not LATTC/Ortho Institute.** |
| Wilshire/La Cienega | Rider page + map D terminus; further west dashed | **match**. Section 1 open. Under-construction D west is out. |
| Wilshire/Fairfax / Wilshire/La Brea | Map solid; 802 timetable D columns | match. On this plate. |
| Pomona North | Legend **Pomona**; timetable **Pomona North**; ML icon | **rename**. Locked to map **Pomona North**. Further A east is dashed — out. |
| Downtown Long Beach | Legend **Long Beach** | **rename**. Clockwise loop with **5th St**, **1st St**, **Pacific Av**. |
| Pacific Av | Map A Line Long Beach loop | match. **Not** J Line Pacific Av / Downtown San Pedro. |
| LAX/Metro Transit Center | Legend **LAX**; rider page **LAX/Metro Transit Center** | **rename**. Locked to map long form. C terminus + K through. FlyAway is a transfer icon, not a stop. |
| Lynwood | Historic **Long Beach Blvd** / **Long Beach Boulevard** | **rename**. Map + C timetable print **Lynwood**. **Not** A Line Long Beach stations. |
| Lakewood Bl | Timetable **Lakewood Bl** | match. Map **Bl** family (not Blvd). |
| Expo/Crenshaw | Map + E/K | match. K north end. **Not Crenshaw** (C Line). |
| Crenshaw | Map + C only | **lock pair**. **Not Expo/Crenshaw.** |
| Aviation/Century | Map + C/K | match. **Not Aviation/Imperial.** |
| Aviation/Imperial | Map + C only | **lock pair**. K does not serve it. |
| Universal City/Studio City | Timetable **Universal/Studio City** | **rename**. Locked to map **Universal City/Studio City**. |
| Heritage Sq / Sierra Madre Villa | Map **Sq** / **Villa** | match. Locked to map abbreviations. |
| 103rd St/Watts Towers | Map two-line label | joined. |
| Willowbrook/Rosa Parks | Map + A/C | match. Not the hub lock. |
| Atlantic | Legend **East LA** | match. E east end stop string. |
| All other D1 names in published-network.json | same map print | match |

**110** unique D1 names. Product `lib/cities/los-angeles/` **absent**. `assertCityLive("los-angeles")` is Unknown city. Not in `LIVE_CITY_IDS`.

## H2 — who has line codes today

| surface | A/B/C/D/E/K? | what it actually has |
| --- | --- | --- |
| Metro Rail & Busway May 2026 (D1) | **yes** | Legend circles A B C D E K with termini pairs including C **LAX** / D **Wilshire/La Cienega** / A **Pomona**. G/J are busway squares. |
| How to Ride Metro Rail (support) | **yes** | Six train lines; 115-station system figure; rider termini including **LAX/Metro Transit Center** and **East Los Angeles**. Map still wins stop strings. |
| Line timetable PDFs (support) | **yes** | 801 A / 802 B+D / 803 C / 804 E / 807 K. Long forms expand Ctr / District / Center. Map still wins. |
| Metro Facts at a Glance | **yes** | 115 stations (11 May 2026); per-line 48/14/12/11/29/13 with listed shares. |
| Product `lib/cities/los-angeles/` | **absent** | No los-angeles stations.json / line-map.json. `assertCityLive("los-angeles")` is Unknown city. Not in `LIVE_CITY_IDS`. |
| Swiftly GTFS-RT | live (keyed) | Empty-key **401** on 29 Aug 2026, WWW-Authenticate Bearer. Not a D1 generator. Not a D1 blocker. |
| GTFS static rail zip | **not used** | Unkeyed GitLab zip. Not a D1 source. Stations[] were not built from GTFS. |

H2 conclusion: passenger letters on the map already agree (A B C D E K). Clash is **7th St/Metro Ctr vs 7th Street/Metro Center**, **Civic Ctr vs Civic Center**, **Lynwood vs Long Beach Blvd**, **LAX vs LAX/Metro Transit Center**, **East LA vs Atlantic**, **Facts 115 vs unique printed names 110**, and **no product los-angeles file**. Do not generate published-network.json from GTFS. Do not invent city=la / lax / metro.

## C2/C3 to put in front of Jim

1. **city=los-angeles**, displayName **Los Angeles**. Not `la`, not `lax`, not `metro`, not `lacmta`, not `us`. Do not merge into washington / chicago / bart / boston.
2. **7th St/Metro Ctr** is the locked inner-city hub (A × B × D × E). Clash-report long form **7th Street/Metro Center**. Not Union Station, not Civic Ctr/Grand Park, not Pershing Square, not Historic Broadway. **C and K do not serve it.**
3. **7th St/Metro Ctr ≠ Union Station ≠ Civic Ctr/Grand Park ≠ Pershing Square ≠ Historic Broadway ≠ East LA Civic Ctr.** Do not collapse. doNotGroup Union Station metro vs Metrolink/Amtrak.
4. **Modes v1: Metro Rail only (A B C D E K).** G Line / J Line busway out. Bus / Metrolink / Amtrak / FlyAway / airport people movers out.
5. **D Line Section 1 to Wilshire/La Cienega is in.** Further D west is dashed under construction — out. **A Line to Pomona North is in.** Further A east is dashed — out.
6. **C Line west end is LAX/Metro Transit Center.** K through-runs there. C station **Lynwood** (not Long Beach Bl).
7. **E east end stop string is Atlantic.** Legend/rider **East LA** is the area.
8. **America/Los_Angeles HAS DST.** Do not copy Perth / Brisbane no-DST.
9. **Swiftly key later.** Empty-key 401. Not a D1 blocker. Never paste a key. Product child stopIds stay out of this file.
10. Cut #1 is Rotterdam only. This pack stays **planned**. `assertCityLive("los-angeles")` must fail.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=la / lax / metro, no API key, no merge of other PRs (not Boston, not Toronto, not Melbourne), no `status: "live"` / tester-live, no Sweden.

## License

- **License name:** Metro Developer Terms & Conditions (LACMTA / developer.metro.net). GTFS-RT is separately under the Swiftly API License Agreement.
- **Redistribution / rehosting:** Metro T&C 1.1 limits use to the purposes stated on registration; 2.1.f says access is subject to terms “prohibiting unauthorized redistribution and publication”; 2.1.j says “not make the transport information feeds available to any third parties.” Serving riders in our app is the registration-purpose display in 1.1/1.2 — Tim judges that. Do not treat this as sublicensable. Swiftly clause 2: limited, non-sublicensable, non-transferable licence to display Content in the Application; “no right to distribute or allow access to the stand-alone APIs.” Swiftly 4(vi): shall not sell, lease, share, transfer, or sublicense Content to any third party.
- **Commercial use:** Metro T&C do not say allowed or prohibited; use is purpose-limited to the registration. Unclear. Swiftly does not ban a commercial Application but 4(iv) forbids charging incremental fees for the Content.
- **Attribution:** Metro T&C 2.1.i: “acknowledge Metro as the provider of the Transport Information as set forth in the Web Services Developer Guidelines.” No Metro trademark. Transitland indexes rail **Use allowed without attribution: Yes** — that disagrees with 2.1.i. Do not treat Transitland’s flag as the terms.
- **Terms URL:** https://developer.metro.net/docs/policies/terms-conditions/ (same text at https://developer.metro.net/terms-conditions/). Transitland older pointer: http://developer.metro.net/the-basics/policies/terms-and-conditions/ . Swiftly: https://www.goswift.ly/api-license (updates effective 22 Sep 2025). Agency developer index: https://developer.metro.net/ . Static rail landing: https://developer.metro.net/gtfs-schedule-data/ .
- **Confidence:** `clear` that feed-to-third-parties is prohibited (2.1.j) and that Swiftly RT is keyed / non-sublicensable; `unclear` on commercial use and on attribution (Metro vs Transitland disagree).
- **Keyed feeds:** Swiftly key agreement governs GTFS-RT, not the static zip. Never paste a key. Metro T&C 5.3 also deactivates unused Metro developer keys after 60 days — that clause is for Metro Services, not the public GitLab zip.
