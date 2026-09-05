# Sendai — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** Oracle report scoped. **city id:** `sendai` (do not invent `sms`, `sendai-metro`, or merge into another Tohoku city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Sendai City Transportation Bureau — 仙台市交通局 (Sendai-shi Kōtsū-kyoku). Rider site https://www.kotsu.city.sendai.jp/subway/ . Corporate https://www.kotsu.city.sendai.jp/english/index.html . Operating Sendai Subway only (not JR services). |
| Official map | Network map and station guide — https://www.kotsu.city.sendai.jp/subway/ (JP). Route maps and station pages for both Namboku and Tōzai lines with English translations available. Two-line system: Namboku (north–south; 17 stations) and Tōzai (east–west; 13 stations). Both lines intersect at Sendai Station. Total 30 unique stations. |
| Static GTFS | **No official public Sendai Subway GTFS feed located.** Transitland: no dedicated Onestop ID found for Sendai Subway. ODPT catalog search (https://ckan.odpt.org/dataset/?q=%E4%BB%99%E5%8F%B0) as of 2026-09-06: returns **0 results** for Sendai Subway / 仙台市営地下鉄. Results show only Sendai municipal bus data (sendai_municipal_bus, sendai_municipal_bus_realtime_information). Sendai City Transportation Bureau is **not** listed as an ODPT member for subway data (ODPT subway members confirmed: Tokyo Metro, Toei, Kyoto Municipal, Osaka Metro, Yokohama, Sapporo — Sendai is absent). Mobility Database `feeds_v2.csv` (accessed 2026-09-06): **0 rows** for Sendai Subway / Sendai Metro / 仙台市営地下鉄 / 仙台市地下鉄. Do not invent an ODPT GTFS zip or a municipal GTFS endpoint. |
| GTFS-RT / live | **No official GTFS-RT or real-time feed found.** Official website lists operational updates and service information via webpage (Japanese only) but does not publish a documented GTFS-RT or next-train API. No public developer feed. Twitter/X account @operation_st posts operational updates but not machine-readable real-time data. Unpublished app backends or third-party partnerships are not a product contract. |
| Auth | No GTFS to key. ODPT consumer key is not required for this agency (not an ODPT member for subway data). Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official city network map + official station list, hand-transcribed.

## v1 mode cut

**Sendai Municipal Subway: Namboku and Tōzai lines only.** Both lines are operated by the Sendai City Transportation Bureau and connect at Sendai Station (central hub):

- **Namboku Line (Green line; N):** Izumi-Chūō to Tomizawa via central Sendai — 17 stations, opened July 15, 1987. Official stations list on https://www.kotsu.city.sendai.jp/subway/ . Through-run connections: **none within Sendai Metro system.**
- **Tōzai Line (Light Blue line; T):** Yagiyama Zoological Park to Arai — 13 stations, opened December 6, 2015. Uses linear motor propulsion. Official stations list on https://www.kotsu.city.sendai.jp/subway/ . Through-run connections: **none within Sendai Metro system.**

**Total v1 scope:** 30 unique stations across both lines (Sendai Station serves as interchange between N and T).

**Out of v1:**

- **JR services at Sendai Station:** Tohoku Shinkansen, Tohoku Main Line, Senzan Line, Senseki Line, Senseki-Tohoku Line, Joban Line, Sendai Airport Line are separate JR East operations calling at JR Sendai Station (not Sendai Subway stations). See Board eligibility section for verdicts per service.
- **Kita-Sendai Station (Namboku Line N06):** Connected by underground passage to JR Kita-Sendai Station (Senzan Line) — separate stations, not a merge point.
- **City buses, trams, or other operators:** Out of scope. Out-mode.

Hub-lock: **Sendai / 仙台** (Namboku Line N10 × Tōzai Line T07). Official Sendai Subway maps confirm Sendai as the central two-line interchange. Secondary single-line stations: Tomizawa (N terminus), Izumi-Chūō (N terminus), Yagiyama Zoological Park (T terminus), Arai (T terminus). doNotGroup Sendai Station (JR East) / JR Kita-Sendai / JR Airport Line / Sendai Station Shinkansen platform / any third-party interchanges.

## Station name table

Match rule: published D1 string (official Sendai City Transportation Bureau station name in English) vs official Japanese print (official city site station roster).

| published (D1) | other print | class |
| --- | --- | --- |
| Sendai | EN **Sendai**; JP **仙台駅**; Namboku Line N10; Tōzai Line T07; official interchange | **match (lock)**. Central hub where both Namboku and Tōzai intersect. Do not use Sendai Station (JR). doNotGroup JR Sendai Station or Shinkansen platform. |
| Izumi-Chūō | EN **Izumi-Chuo** / **Izumi-Chūō**; JP **泉中央** (Namboku Line N01, southwestern terminus) | **match. v1 terminus.** |
| Tomizawa | EN **Tomizawa**; JP **富沢** (Namboku Line N17, southern terminus) | **match. v1 terminus.** |
| Yagiyama Zoological Park | EN **Yagiyama Zoological Park** / **Yagiyama Zoo**; JP **八木山動物公園** (Tōzai Line T01, western terminus) | **match. v1 terminus.** |
| Arai | EN **Arai**; JP **荒井** (Tōzai Line T13, eastern terminus) | **match. v1 terminus.** |
| Kita-Sendai | EN **Kita-Sendai** / **North Sendai**; JP **北仙台** (Namboku Line N06) | **match Metro**. doNotGroup JR Kita-Sendai (separate station served by Senzan Line via underground passage). |
| All other D1 names in published-network.json | official EN/JP station names from Sendai City Transportation Bureau roster | match |

**Sendai Metro network:** 2 lines (Namboku, Tōzai), 30 unique stations per 2026. v1 includes all stations on both lines. Product `lib/cities/sendai/` is the planned catalog (names + official codes only; no GTFS stopIds). `assertCityLive("sendai")` must fail (planned / 501). adapterReady false. No official public feed.

## H2 — who has line codes today

Official Sendai Subway uses alphanumeric station codes. **Namboku Line:** N01 to N17 (17 stations). **Tōzai Line:** T01 to T13 (13 stations). Do not invent route ids or station codes.

## Board eligibility

Every rail service calling at in-catalog Sendai Subway stations is listed below with verdict (pass/fail boarding contract tests):

| Service | Calls at | Test 1: Walk-up? | Test 2: Entry-to-platform? | Verdict | Notes |
|---|---|---|---|---|---|
| Tohoku Shinkansen (Hayabusa) | Sendai (JR Station, not Subway N10/T07) | All cars are reserved seating only; no non-reserved cars on Hayabusa | Yes (but separate JR platform) | `out-reservation` | Mandatory reservation. https://www.japan-bullettrain.com/articles/blog/sendai-shinkansen-boarding |
| Tohoku Shinkansen (Yamabiko) | Sendai (JR Station, not Subway N10/T07) | Non-reserved seating available; walk-up boarding possible | Yes (but separate JR platform) | `in` | Non-reserved seats first-come-first-served. https://ekitan.com/en/article/sendai-to-tokyo-shinkansen |
| Tohoku Shinkansen (Akita Shinkansen Super Komachi) | Sendai (JR Station, not Subway N10/T07) | Non-reserved seating offered; walk-up boarding possible | Yes (but separate JR platform) | `in` | Standard Shinkansen operation with non-reserved options. https://www.jrailpass.com/blog/sendai-travel-guide |
| JR Tohoku Main Line (Local/Rapid) | Sendai (JR Station, not Subway N10/T07) | Yes, all services walk-up boardable | Yes, standard station entry | `in` | Conventional commuter rail, no reservation required. https://en.wikipedia.org/wiki/Sendai_Station |
| JR Senzan Line | Sendai (JR Station, not Subway N10/T07) | Yes, walk-up boardable | Yes, standard entry | `in` | Conventional commuter/regional rail from Sendai to Yamagata. https://en.wikipedia.org/wiki/Senzan_Line |
| JR Senseki Line | Sendai (JR Station, not Subway N10/T07) | Yes, walk-up boardable | Yes, standard entry | `in` | Conventional commuter rail. https://en.wikipedia.org/wiki/Sendai_Station |
| JR Sendai Airport Line | Sendai (JR Station, not Subway N10/T07) | Yes, walk-up boardable | Yes, standard entry | `in` | Airport express, no compulsory reservation. Standard ticketing. https://en.wikipedia.org/wiki/Sendai_Airport_Line |

**Verdict summary:** Sendai Subway stations (N10 and T07 at Sendai Station) are served **only by Sendai Municipal Subway trains** (Namboku and Tōzai lines). JR services (Tohoku Shinkansen, Tohoku Main Line, Senzan Line, Senseki Line, Senseki-Tohoku Line, Joban Line, Sendai Airport Line) operate at separate JR Sendai Station platforms and do **not** call at Sendai Subway station entrances or platforms — JR platforms are accessible via underground passage but are not in-catalog Sendai Subway stop numbers (N10/T07). Kita-Sendai (Namboku N06) is similarly a separate station from JR Kita-Sendai (Senzan Line), connected by underground passage. **Therefore, no services other than the in-scope operator (Sendai City Transportation Bureau, Sendai Subway Namboku and Tōzai lines) call at any in-catalog station — verified.** All in-catalog stations show only Namboku/Tōzai services.

## Skip risk

No official GTFS / GTFS-RT published as a documented public feed (similar to Kobe and Osaka Metro). Sendai City Transportation Bureau does not participate in ODPT as a subway-data member (bus data only). Separate JR stations and Subway stations at Sendai/Kita-Sendai are clearly distinct with no platform merging. No merger risk with other Tohoku cities. Sendai hub confirmed. Namboku and Tōzai line separation verified. Tōzai Line opened December 2015 (full build-out in scope). **Not a skip** — official subway map + routes list are verified; live adapter path is unverified but does not block D1.

## License

- **License name:** No Sendai Municipal Subway GTFS/GTFS-RT licence found (`not found`). Sendai City Transportation Bureau website (https://www.kotsu.city.sendai.jp/) does not publish a GTFS data license or developer terms. ODPT listings for Sendai show only municipal bus data, not subway data. No published data-sharing agreement located for municipal subway network.
- **Redistribution / rehosting:** Website copyright text on Sendai City Transportation Bureau portal (https://www.kotsu.city.sendai.jp/) is standard: content, maps, and service information are provided for reference use. No explicit GTFS / realtime data reuse license exists. Sendai City does not yet publish subway GTFS as an open dataset (bus GTFS appears in ODPT under CC-BY 4.0 for municipal buses; no equivalent for subway). Do not treat general municipal open-data policy as a grant for data that has no published GTFS feed.
- **Commercial use:** Not stated. Sendai City ODPT participation (for buses) permits non-profit and for-profit use under CC-BY 4.0; however, no subway GTFS feed is currently published, so commercial-use permission is moot until a feed exists.
- **Attribution:** No subway GTFS attribution required (no GTFS). City of Sendai service marks (仙台市 logo, 交通局 transit authority branding) are reserved. If a future feed is published, follow licensing terms at point of publication.
- **Terms URL:** Sendai City Transportation Bureau portal — https://www.kotsu.city.sendai.jp/ (JP / EN). City of Sendai municipal websites — https://www.city.sendai.jp/ . ODPT catalog (bus data only) — https://ckan.odpt.org/dataset/?q=%E4%BB%99%E5%8F%B0 . ODPT members list — https://www.odpt.org/en/about/member/ . Transitland: no Onestop ID for Sendai Subway. Mobility Database: no `mdb-*` for Sendai Municipal Subway.
- **Confidence:** `not found` on GTFS data license (no feed published). `clear` that Sendai City does not yet publish subway GTFS as open data (only bus GTFS available). `unclear` whether municipal subway data will be published in future or under what license terms. Do not interpret the city's general municipal or bus-data open-data framework as a blanket permission for data that does not exist. The legal status of any future Sendai Subway GTFS is a D1-pack question, not resolved in this research pass.
- **Keyed feeds:** No official Sendai Subway key agreement. ODPT data that does exist (municipal buses) requires no key for published GTFS. Never paste a key.

## C2 for this D1 pack

1. city=`sendai`. displayName Sendai.
2. Sendai / 仙台 hub (Namboku N10 × Tōzai T07 interchange).
3. Modes v1 Sendai Municipal Subway: Namboku and Tōzai lines (all 30 stations, both lines fully in scope). JR services (Shinkansen, Tohoku Main Line, Senzan Line, Senseki Line, Senseki-Tohoku Line, Joban Line, Sendai Airport Line) operate separate stations, out-scope. Hayabusa Shinkansen out-reservation; Yamabiko/Akita Shinkansen/Airport Line/conventional commuter rail in (but on separate JR platforms, not triggering board eligibility for Subway stations).
4. assertCityLive("sendai")` must fail (planned / 501). adapterReady false. No official public GTFS/GTFS-RT feed.

## Station roster — Namboku Line

Ordered north to south, as published by Sendai City Transportation Bureau:

| Code | Station (English) | Station (Japanese) |
|---|---|---|
| N01 | Izumi-Chūō | 泉中央 |
| N02 | Yaotome | 八乙女 |
| N03 | Kuromatsu | 黒松 |
| N04 | Asahigaoka | 旭ヶ丘 |
| N05 | Dainohara | 台原 |
| N06 | Kita-Sendai | 北仙台 |
| N07 | Kita-Yobanchō | 北四番丁 |
| N08 | Kōtōdai-Kōen | 勾当台公園 |
| N09 | Hirose-dōri | 広瀬通 |
| N10 | Sendai | 仙台 |
| N11 | Itsutsubashi | 五橋 |
| N12 | Atagobashi | 愛宕橋 |
| N13 | Kawaramachi | 河原町 |
| N14 | Nagamachi-Itchōme | 長町一丁目 |
| N15 | Nagamachi | 長町 |
| N16 | Nagamachi-Minami | 長町南 |
| N17 | Tomizawa | 富沢 |

## Station roster — Tōzai Line

Ordered west to east, as published by Sendai City Transportation Bureau:

| Code | Station (English) | Station (Japanese) |
|---|---|---|
| T01 | Yagiyama Zoological Park | 八木山動物公園 |
| T02 | Aobayama | 青葉山 |
| T03 | Kawauchi | 川内 |
| T04 | International Center | 国際センター |
| T05 | Omachi Nishi-kōen | 大町西公園 |
| T06 | Aoba-dōri Ichibancho | 青葉通一番町 |
| T07 | Sendai | 仙台 |
| T08 | Miyagino-dōri | 宮城野通 |
| T09 | Rembo | 連坊 |
| T10 | Yakushido | 薬師堂 |
| T11 | Oroshimachi | 卸町 |
| T12 | Rokuchonome | 六丁の目 |
| T13 | Arai | 荒井 |
