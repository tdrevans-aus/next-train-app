# Boston — oracle clash report

**Lane:** Nico research + Luke D1 transcription. **Date:** 2026-08-29. **Status:** D1 pack written, city **planned**. **city id:** `boston` (do not invent `bos`, `mbta`, or merge into another US city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Massachusetts Bay Transportation Authority (MBTA) |
| Official map | MBTA subway map — https://www.mbta.com/maps (rapid transit / subway map) |
| D1 plate | [2026-06-14-subway-map-v01.pdf](https://cdn.mbta.com/sites/default/files/2026-06-14-subway-map-v01.pdf) — PDF title **MBTA \| Subway and frequent bus routes \| Effective June 14, 2026**, HTTP Last-Modified **Thu, 18 Jun 2026 15:25:24 GMT**, footer **© Massachusetts Bay Transportation Authority — June 2026**. `/subway-map` 302s here. |
| Static GTFS | https://cdn.mbta.com/MBTA_GTFS.zip — no key. Transitland Onestop **f-drt-mbta**, last fetch 2026-08-28 |
| GTFS-RT / live | MBTA V3 API https://api-v3.mbta.com/ (optional `x-api-key`; unauthenticated is allowed but rate-limited) + GTFS-RT from the developers page |
| Auth | GTFS zip: none. V3 API: optional key from https://www.mbta.com/developers. Never paste a key. |
| Timezone | America/New_York (HAS DST) |

Stations arrays **hand-transcribed from rendered map images**. `pdftotext` extracted **zero** text (outlined Illustrator 30.4). **Not generated from GTFS.** Not generated from api-v3.mbta.com. Map printed names win.

## v1 mode cut

**Subway / rapid transit only:** Red, Orange, Blue, Green, Mattapan (printed as rapid transit — legend **M**). **Out:** Silver Line (BRT), bus, ferry, Commuter Rail, CapeFlyer, Massport shuttles.

Hub lock: **Park Street** (Red × Green). Not Downtown Crossing (Red × Orange), not Government Center / **Gov't Center** (Green × Blue), not State (Orange × Blue), not South Station, not Downtown. There is no single station on all colours — Park Street is the inner Red/Green lock. doNotGroup Park Street vs Downtown Crossing vs Gov't Center vs State.

## Skip risk

Silver Line BRT leaking into subway; Commuter Rail name-family at South Station / North Station; folding Mattapan into Red as if it were heavy rail; inventing city=`bos`. Feed itself is verified. Not a skip.

## D1 map transcription (29 Aug 2026)

D1 (published, as of 29 Aug 2026): [Maps](https://www.mbta.com/maps) **Subway Map** [2026-06-14-subway-map-v01.pdf](https://cdn.mbta.com/sites/default/files/2026-06-14-subway-map-v01.pdf) (PDF title **MBTA | Subway and frequent bus routes | Effective June 14, 2026**, subject plate **Rapid Transit & Frequent Bus Routes**, HTTP Last-Modified **Thu, 18 Jun 2026 15:25:24 GMT**). `/subway-map` 302s to the same PDF. Stations arrays **hand-transcribed from map images**. **Not generated from GTFS.**

Legend terminal pairs (large type on the plate):

- **Red Line** • Alewife / Ashmont & Braintree — **22** (trunk Alewife–JFK/UMass **13**; Ashmont branch **4**; Braintree branch **5**)
- **Orange Line** • Oak Grove / Forest Hills — **20**
- **Blue Line** • Wonderland / Bowdoin — **12**
- **Green Line B** • Boston College / Gov't Center — **23**
- **Green Line C** • Cleveland Circle / Gov't Center — **20**
- **Green Line D** • Riverside / Union Sq — **25**
- **Green Line E** • Heath St / Medford/Tufts — **25**
- **Mattapan Line** • Ashmont / Mattapan — **8** (printed; not folded into Red)

Eight passenger services (four Green branches). **125** unique passenger-open rapid-transit stops after dedupe.

Supporting official line pages (ordered stops; **map still wins**): [Red](https://www.mbta.com/schedules/Red/line), [Orange](https://www.mbta.com/schedules/Orange/line), [Blue](https://www.mbta.com/schedules/Blue/line), [Green](https://www.mbta.com/schedules/Green), [Green-B](https://www.mbta.com/schedules/Green-B/line), [Green-C](https://www.mbta.com/schedules/Green-C/line), [Green-D](https://www.mbta.com/schedules/Green-D/line), [Green-E](https://www.mbta.com/schedules/Green-E/line), [Mattapan](https://www.mbta.com/schedules/Mattapan/line), [subway stops](https://www.mbta.com/stops/subway). Hub page [Park Street](https://www.mbta.com/stops/place-pktrm).

Hub lock: **Park Street** (Red × Green; all four Green services). Not Downtown Crossing, not Gov't Center, not State, not South Station.

H2 clash surface (after transcription): **no** product `lib/cities/boston/`. Clash is **map vs stops-page long form** plus **doNotCollapse pairs on the same map**. Not GTFS. Silver Line / bus / ferry / Commuter Rail out of v1 oracle.

## Station name table

Match rule: published D1 string (subway map) vs official stops page / historic print. `rename` = same place, different printed string. Map wins.

| published (D1) | other print | class |
| --- | --- | --- |
| Park Street | Stops page **Park Street**; hub card the same | **match (lock)**. Do not use Downtown Crossing / Gov't Center / State / South Station / Downtown / Boston / Park St. All four Green services + Red. |
| Downtown Crossing | Map + Red/Orange | **lock pair**. Walking concourse to Park Street on the map. **Not Park Street.** |
| Gov't Center | Stops page **Government Center**; Blue + Green; B/C inner end | **rename (Gov't vs Government)**. Locked to map **Gov't Center**. **Not Park Street.** |
| State | Map + Orange/Blue | **lock pair**. **Not Park Street.** |
| South Station | Map Red; Silver Line / Commuter Rail / bus icons | match. **Not the hub lock.** doNotGroup subway vs SL / CR / bus. |
| Tufts Medical Ctr | Stops page **Tufts Medical Center** | **rename**. Locked to map **Ctr**. **Not Medford/Tufts.** |
| Mass. Ave | Stops page **Massachusetts Avenue** (Orange) | **rename**. Locked to map **Mass. Ave**. |
| Hynes Convention Ctr | Stops page **Hynes Convention Center** | **rename**. Locked to map **Ctr** (same plate family as Tufts Medical Ctr). |
| Northeastern | Stops page **Northeastern University** | **rename**. Locked to map **Northeastern**. |
| Sullivan Sq / Jackson Sq / Ball Sq / Magoun Sq / Gilman Sq / Union Sq / Washington Sq | Stops page often **Square** | **rename**. Locked to map **Sq**. Union Sq is Green D Somerville — **not** Union Sq (Allston) bus. |
| BU East / BU Central | Stops page **Boston University East / Central** | **rename**. Locked to map **BU**. Amory St is the ex-BU West stop (map prints **Amory St**). |
| Blandford St, Amory St, Babcock St, Griggs St, … / Central Ave, Capen St, Valley Rd, Fenwood Rd, Heath St | Stops page often **Street / Avenue / Road / Heath Street** | **rename**. Locked to map **St / Ave / Rd** family. |
| Science Park/West End | Map two-line label | **joined**. Match. |
| Kendall/MIT, Charles/MGH, JFK/UMass, Medford/Tufts | Map slash forms | match. |
| Chestnut Hill | Green D only | **lock pair**. **Not Chestnut Hill Ave** (Green B). |
| Chestnut Hill Ave | Green B only | **lock pair**. **Not Chestnut Hill.** |
| Longwood | Green D only | **lock pair**. **Not Longwood Medical Area** (Green E). |
| Longwood Medical Area | Green E only | **lock pair**. **Not Longwood.** |
| Harvard | Red only | **lock pair**. **Not Harvard Ave** (Green B). |
| Central | Red only | **lock pair**. **Not Central Ave** (Mattapan). |
| Washington St | Green B only | **lock pair**. **Not Washington Sq** (Green C). |
| Ashmont | Red Ashmont branch + Mattapan start | match. Do not fold Mattapan into Red. |
| Assembly | Map + Orange (open) | match. On this plate. |
| All other D1 names in published-network.json | same map print | match |

**125** unique D1 names. Product `lib/cities/boston/` **absent**. `assertCityLive("boston")` is Unknown city.

## H2 — who has line codes today

| surface | R/O/B/GL/M? | what it actually has |
| --- | --- | --- |
| Subway Map June 2026 (D1) | **yes** | Legend BL / OL / RL / M / GL (B)(C)(D)(E) with the four Green terminus pairs including B/C **to Gov't Center** and D **Union Sq** / E **Medford/Tufts** |
| Line / stops pages (support) | **yes** | Color names Red/Orange/Blue/Green-B/C/D/E/Mattapan. Long forms expand Gov't / Ctr / Ave / Sq. Map still wins. |
| Product `lib/cities/boston/` | **absent** | No boston stations.json / line-map.json. `assertCityLive("boston")` is Unknown city. Not in `LIVE_CITY_IDS`. |
| V3 API `/predictions` | live (optional key) | Empty-key **200** on 29 Aug 2026, rate-limit 20. Not a D1 generator. Not a D1 blocker. |
| GTFS / GTFS-RT | **not used** | Static zip unkeyed. Not a D1 source. Stations[] were not built from GTFS. |

H2 conclusion: passenger colors on the map already agree (Red Orange Blue Green B/C/D/E Mattapan). Clash is **Gov't Center vs Government Center**, **Ctr / Ave / Sq / BU abbreviations**, **same-name-family pairs**, and **no product boston file**. Do not generate published-network.json from GTFS. Do not invent city=bos.

## C2/C3 to put in front of Jim

1. **city=boston**, displayName **Boston**. Not `bos`, not `mbta`, not `boston-mbta`, not `us`. Do not merge into washington / chicago / bart.
2. **Park Street** is the locked inner-city hub (Red × Green). Not Downtown Crossing, not Gov't Center, not State, not South Station.
3. **Park Street ≠ Downtown Crossing ≠ Gov't Center ≠ State.** Do not collapse.
4. **Modes v1: subway / rapid transit only.** Silver Line out. Bus / ferry / Commuter Rail / CapeFlyer out.
5. **Mattapan is its own line** from Ashmont. Do not fold into Red.
6. **Green B/C end at Gov't Center.** Green D is Union Sq. Green E is Medford/Tufts. E does not serve Hynes / Kenmore.
7. **Red splits at JFK/UMass** (Ashmont vs Braintree).
8. **America/New_York HAS DST.** Do not copy Perth / Brisbane no-DST.
9. **V3 API key optional later.** Empty-key 200. Not a D1 blocker. Never paste a key. Product child stopIds stay out of this file.
10. Cut #1 is Rotterdam only. This pack stays **planned**. `assertCityLive("boston")` must fail.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=bos, no API key, no merge of other PRs, no `status: "live"` / tester-live.

## License

- **License name:** MassDOT Developers License Agreement (governs MBTA static + realtime data).
- **Redistribution / rehosting:** Grants non-exclusive, limited, revocable rights to use, reproduce, and redistribute the Data (clause 3.1 of the 2023-08 agreement). Do not treat this as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that.
- **Commercial use:** Transitland indexes commercial use allowed = Yes. Agreement is revocable.
- **Attribution:** Required. Transitland: "Clearly Acknowledge Massdot As The Provider Of The Data." Use without attribution = No.
- **Terms URL:** https://cdn.mbta.com/sites/default/files/2023-08/mbta-massdot-develop-license-agreement.pdf (linked from https://www.mbta.com/developers). Older Transitland pointer: https://www.mass.gov/files/documents/2017/10/27/develop_license_agree_0.pdf
- **Confidence:** `clear` on attribution + revocable redistribute; `unclear` on passing the feed itself to third parties.
- **Keyed feeds:** V3 API key agreement is the same MassDOT licence. Optional key.
