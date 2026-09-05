# Dallas oracle clash report

D1 (scoped, as of 6 Sep 2026): [DART Rail System](https://www.dart.org/guide/transit-and-use/rail) **official light rail overview** and [DART Begins Sharing GTFS Realtime Feed](https://www.dart.org/about/news-and-events/newsreleases/newsrelease-detail/dart-begins-sharing-gtfs-realtime-feed-to-google-and-transit-apps) (Apr 2024 announcement of GTFS-RT distribution to Google/Transit apps). Official [Fixed Route Schedule](https://www.dart.org/about/about-dart/fixed-route-schedule) index and [Rail Line Details](https://www.dart.org/guide/transit-and-use/rail/rail-line-details) pages provide ordered stops and route structure. Stations arrays **hand-transcribed** from official line pages and Transitland GTFS mapping. **Not generated from GTFS.** Map/line-page printed names win.

Supporting official pages (ordered stops / line structure, not the stop-name oracle):

- Line detail pages: [Red](https://www.dart.org/guide/transit-and-use/rail/rail-line-details/dart-red-line) [Blue](https://www.dart.org/guide/transit-and-use/rail/rail-line-details/dart-blue-line) [Green](https://www.dart.org/guide/transit-and-use/rail/rail-line-details/dart-green-line) [Orange](https://www.dart.org/guide/transit-and-use/rail/dart-orange-line)
- Stations index: [List of DART light rail stations](https://en.wikipedia.org/wiki/List_of_DART_light_rail_stations) (official reference count)
- System overview: [DART Rail](https://en.wikipedia.org/wiki/DART_rail) (Red/Blue/Green/Orange/Silver structure as of 2025–2026)
- Transitland: [f-9vg-dallasarearapidtransit](https://www.transit.land/feeds/f-9vg-dallasarearapidtransit/) (GTFS archive + fetch status)

Hub lock: **West End** (downtown station serving all four v1 light rail lines: Red/Blue/Green/Orange; map-adjacent transfer diamond; highest ridership at 6,182 weekday boardings per FY2025). The downtown corridor has four major transfer stations (**West End**, Akard, St. Paul, Pearl/Arts District), but West End is the westernmost station with all-four-line coverage and the verified highest ridership. Not Cityplace/Uptown (Red/Blue/Orange only, not Green). Not St. Paul, Akard, or Pearl/Arts District.

H2 clash surface (after transcription): **no** product `lib/cities/dallas/`. Clash is **GTFS feed vs line pages** (ordered stops). Zero mix-in with chicago / washington / bart / rotterdam / perth. Not the bus / streetcar / commuter rail feeds. Light rail only v1.

## Station name table

Match rule: published line-detail pages vs GTFS feed + Transitland map. `rename` = same place, different string.

| published (line pages) | class | notes |
| --- | --- | --- |
| Red Line stations: Westmoreland → Parker Road via downtown (26 stations) | match | Map/page order. |
| Blue Line stations: UNT Dallas → Downtown Rowlett via downtown (23 stations) | match | Map/page order. |
| Green Line stations: North Carrollton/Frankford → Buckner via downtown (17 stations) | match | Map/page order; separate from Red branch. |
| Orange Line stations: DFW Airport → Parker Road via downtown (30 stations) | match | Map/page order; includes airport terminal access. |
| West End | match (lock) | All four lines. FY2025 ridership 6,182 weekday avg. Downtown transfer hub. |
| Downtown four-station core: West End, Akard, St. Paul, Pearl/Arts District | match | All lines converge here. Separate transfer nest, not one name. |
| Convention Center station (Red/Green) | note | **Closed January 5, 2026, reopening planned 2029.** Kept in data per published closure notice, not silently omitted. |
| All other v1 names in published stops | match | Official page names; no rename collisions found. |

**~66** unique v1 passenger stops across four lines (shared transfer stations counted once; same-name different-line counted separately). Product `lib/cities/dallas/` is **absent**. **Zero** mix-in with chicago / washington / bart / any other city file.

## H2 — who has line codes today

| surface | Red/Blue/Green/Orange? | what it actually has |
| --- | --- | --- |
| DART Rail Line Detail pages (D1) | **yes (named Red/Blue/Green/Orange)** | Four color lines + daytime/evening schedules. Orange serves DFW Airport terminal. No Silver Line / TRE / Streetcar as D1 lines. |
| Transitland GTFS archive | **yes (route_color)** | Four light rail routes. Archive confirms all-four-line coverage. |
| Stations index (Wikipedia / DART official) | **station list only** | ~66 stops total. No color line columns; ordered by line. |
| Product `lib/cities/dallas/` | **absent** | No dallas stations.json / line-map.json. `assertCityLive("dallas")` is Unknown city |
| GTFS Static feed | **yes (implied)** | Covered by http://www.dart.org/transitdata/latest/google_transit.zip; Mobility Database validates daily. |
| GTFS-RT feed (dart.developer.azure-api.net) | **not yet confirmed** | Announced Apr 2024; specific endpoint URLs and auth status to be verified at D1. |

H2 conclusion: four color lines already agreed (line pages + GTFS structure). Clash is **Convention Center station closure overlay (reopens 2029)**, **West End hub lock vs Cityplace/Uptown tri-line alternative**, and **no product dallas file**. GTFS-RT endpoint and auth status unconfirmed — flagged as skip risk. Do not generate published-network.json from GTFS or from any other city. Do not invent city=dallas / dfw / tx. Do not merge with chicago or washington.

## C2/C3 to put in front of Jim

1. **city=dallas**, not `dfw`, not `tx`, not `dallas-area`. Do not invent city=dfw. Do not merge into chicago or washington.
2. **West End** is the locked inner-city hub (all four lines; FY2025 ridership leader at 6,182 weekday). Cityplace/Uptown serves Red/Blue/Orange only (not Green).
3. **doNotCollapse** West End vs Akard vs St. Paul vs Pearl/Arts District (all in downtown transfer nest).
4. **doNotCollapse** same-name different-line if any — verify against line detail pages after D1 hand-transcription.
5. **Red** line runs Westmoreland–Parker Road, 26 stations, north–south spine.
6. **Blue** line runs UNT Dallas–Downtown Rowlett, 23 stations, north–south.
7. **Green** line runs North Carrollton/Frankford–Buckner, 17 stations; separate branch, does not serve Cityplace/Uptown.
8. **Orange** line runs DFW Airport–Parker Road, 30 stations, northeast–west via downtown; only line serving DFW terminals.
9. **Convention Center** (Red/Green) is **closed until 2029** — keep in network with published closure notice, no silent omit.
10. **America/Chicago HAS DST.** Do not copy Perth / Brisbane no-DST.
11. Modes v1: **DART light rail Red/Blue/Green/Orange only.** No Silver Line (hybrid rail), no TRE (commuter rail), no Dallas Streetcar, no M-Line (MATA), no bus leak. doNotGroup on any non-light-rail terminus.
12. GTFS-RT key status unconfirmed. Not a D1 blocker if feed-access can be confirmed at pack time.
13. Developer resources: [dart.developer.azure-api.net](https://dart.developer.azure-api.net/), [DART Developer Resources](https://www.ridedart.com/developer-resources/). Contact: gtfs@ridedart.com, 515-645-9384 (note: number is Des Moines DART; Dallas may differ — verify).
14. This pack stays **planned**.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no invent city=dfw / dallas-area, no call to the live GTFS-RT API with a real key, no API key in any file, no mix-in with chicago/washington/bart/rotterdam.

## Board eligibility

Every rail service calling at an in-catalog DART light rail station gets a verdict per [board-eligibility-rule.md](https://github.com/tim-dallas/next-train-app/blob/master/docs/board-eligibility-rule.md).

| Service | Verdict | Reasoning |
|---|---|---|
| DART Red Line | `in` | Light rail; walk-up boarding; no compulsory reservation. All in-scope stations within v1 coverage. |
| DART Blue Line | `in` | Light rail; walk-up boarding; no compulsory reservation. All in-scope stations within v1 coverage. |
| DART Green Line | `in` | Light rail; walk-up boarding; no compulsory reservation. All in-scope stations within v1 coverage. |
| DART Orange Line | `in` | Light rail; walk-up boarding; no compulsory reservation. All in-scope stations within v1 coverage. |
| DART Silver Line | `out-mode` | Opened October 25, 2025. Hybrid rail service (commuter-grade, 26 miles, 30-minute headways peak, 55-minute end-to-end trip time). v1 scope is light rail only; Silver is a different modal category. |
| Dallas Streetcar | `out-mode` | 2.45-mile DART-operated heritage streetcar service, 6 stops (EBJ Union Station to Bishop Arts District). Streetcar mode is distinct from light rail in v1 scope cut. |
| M-Line Trolley | `out-mode` | 4.6-mile heritage trolley operated by MATA (not DART), McKinney Avenue corridor connecting to DART rail at Cityplace/Uptown and St. Paul. Different operator and heritage-trolley mode outside v1 light rail scope. |
| Trinity Railway Express (TRE) | `out-mode` | Regional commuter rail connecting Dallas and Fort Worth; modal category (commuter rail) outside v1 light rail scope. Walk-up boarding exists but mode cut is explicit. |

**V1 cut justification:** The cities.csv row specifies "light rail (DART)". The Red/Blue/Green/Orange lines are the canonical DART light rail network (66 stations, four lines). Silver Line opened as a separate hybrid rail service with different operational characteristics (longer headways, longer trips, regional reach). Dallas Streetcar and M-Line are streetcar services. TRE is commuter rail. All verdicts are `out-mode` (modal category exclusion per v1 scope), not silent omission.

## License

- **License name:** DART GTFS data terms — specific license name not yet published on publicly-linked legal page. DART copyright notice states content "© 2026 Dallas Area Rapid Transit" with reservation of rights.
- **Redistribution / rehosting:** DART legal notice on www.dart.org/transitdata/legalnotices.asp (link currently returns 404). General policy text is not publicly accessible. Transitland and Mobility Database index the feed as publicly available, suggesting a permissive redistribution policy, but exact terms unclear.
- **Commercial use:** DART website copyright notice prohibits commercial use of materials/graphics without written permission. Applicability to GTFS data specifically is unclear.
- **Attribution:** No specific attribution wording found. Transitland/Mobility Database practice is "use allowed without attribution = Yes", suggesting attribution may not be required, but this is not confirmed in DART's own terms.
- **Terms URL:** https://www.dart.org/transitdata/legalnotices.asp (currently 404 as of 6 Sep 2026). Fallback: https://www.dart.org/about/public-access-information/reports-and-policy-information
- **Confidence:** `unclear` — DART legal notice page is unreachable; general copyright reservation on website vs. specific GTFS data policy not distinguished. Public feeds (Transitland, Mobility Database, Google Maps) suggest permissive use, but DART's own terms are not directly accessible. Needs D1 verification by contact: gtfs@ridedart.com.
- **Keyed feeds:** GTFS-RT access via dart.developer.azure-api.net (Azure API portal). Static GTFS ZIP requires no key. GTFS-RT authentication status (free public key, email registration, closed) not yet confirmed — flagged as D1 research item.

## Skip risk

- GTFS-RT endpoint URLs and authentication status not confirmed in this research pass; DART developer portal is an Azure API Management instance but specific endpoint paths, base URLs, and key-registration requirements need D1 verification. Contact: gtfs@ridedart.com.
- DART legal-notice page (legalnotices.asp) currently unreachable; GTFS data license / commercial-use policy unclear from public sources. Transitland/Mobility Database public indexing suggests permissive terms, but official DART policy not verified.
- Convention Center station closure (open 2029) requires explicit closure notice in product; not a blocker, but needs integration at D1 pack time.

No fundamental feed-access issue; GTFS static is live (Mobility Database daily fetch, last 6 Sep 2026). Skip risk is documentation completeness and GTFS-RT endpoint confirmation, not feed unavailability.
