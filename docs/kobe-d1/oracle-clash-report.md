# Kobe — oracle clash report

**Lane:** Nico research + Luke D1 pack (D1 pack to follow). **Date:** 2026-09-06. **Status:** Oracle report scoped. **city id:** `kobe` (do not invent `kob`, `kobe-metro`, `kobe-subway`, or merge into Osaka / Keihanshin as one city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Kobe Municipal Transportation Bureau — 神戸市交通局 (Kōbe-shi Kōtsū-kyoku). Subway operator site https://kotsu.city.kobe.lg.jp/ . Official map at https://kotsu.city.kobe.lg.jp/ . Corporate https://www.city.kobe.lg.jp/kurashi/access/kotsukyoku/index.html . Not Osaka Metro. Not a Keihanshin super-city. |
| Official map | Route map and station information available on official Kobe Municipal Transportation Bureau portal at https://kotsu.city.kobe.lg.jp/ (JP/EN). Official route maps and station guide pages (navigational data ordered from official station lists, not extracted from image files). Accessible metro map with NaviLens integration confirmed at https://www.navilens.com/en/case-studies/kmtb-kobe (case study 2026). |
| Static GTFS | **No official public Kobe Municipal Subway GTFS feed located.** Transitland: no Onestop ID found for Kobe Metro. ODPT catalog search (https://ckan.odpt.org/dataset/?q=%E7%A5%9E%E6%88%B8) returns **0 results** for Kobe Municipal / 神戸市交通局 / Kobe Subway 2026-09-06. ODPT members list as of 1 Aug 2026 (https://www.odpt.org/en/about/member/) includes Tokyo Metro, Toei, Kyoto Municipal, Osaka Metro (Osaka Metro is **not** an ODPT member; this agency is listed as a non-member), Yokohama, Sendai — **not** Kobe Municipal Transportation Bureau. Mobility Database `feeds_v2.csv` (accessed 2026-09-06): **0 rows** for Kobe Prefecture / Kobe Municipality / Kobe Metro / 神戸市営地下鉄. Reference to "KMTB GTFS feed" in NaviLens case study (https://www.navilens.com/en/case-studies/kmtb-kobe) appears to refer to data supplied to that accessibility service, not a published developer feed or public endpoint. City open-data portal at https://www.city.kobe.lg.jp/kurashi/access/kotsukyoku/english/data.html (redirects to https://kotsu.city.kobe.lg.jp/) lists no GTFS download or developer feed. Do not invent an ODPT GTFS zip or a municipal GTFS endpoint. |
| GTFS-RT / live | **No official GTFS-RT located.** Official website lists バスロケ (bus location tracking) at https://kotsucitykobe.bus-service.jp/ja/ for city buses only. Subway next-train API or real-time feed: **unverified and not published as a documented developer resource**. Unpublished app backends or third-party partnerships are not a product contract. |
| Auth | No GTFS to key. ODPT consumer key is not required for this agency (not an ODPT member). Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official subway map + official routes list, hand-transcribed.

## v1 mode cut

**Kobe Municipal Subway: Seishin-Yamate, Kaigan, and Hokushin lines only.** The 2020 municipalization of Hokushin Kyuko Railway (June 1, 2020) brought the Hokushin Line under municipal operation. Official network includes:

- **Seishin-Yamate Line (Blue Line):** Seishin-chūō to Tanigami (via Shin-Kobe, Sannomiya) — official stations list on https://kotsu.city.kobe.lg.jp/ and official map. Through-run connections: **none within Kobe Metro system.**
- **Kaigan Line (Green Line):** Sannomiya-Hanadokeimae to Shin-Nagata (coastal route, opened July 1, 2001) — official stations list and maps on https://kotsu.city.kobe.lg.jp/ . Through-run connections: **none within Kobe Metro system.**
- **Hokushin Line (extension, municipalized 2020):** Shin-Kobe to Tanigami (formerly private Hokushin Kyuko Railway, 7.5 km, 2 stations as of June 1, 2020). Fares reduced on municipalization; now part of unified Kobe Metro fares. Official confirmation: https://tokyostudio.jp/en/topics/20200601328 and https://en.wtmnews.net/2020060196 . **Included in v1.**

**Out of v1:**

- **Port Liner (Port Island Line / Port Island New Transit):** Operated by Kobe New Transit Company (not Kobe Municipal Subway). Automated Guideway Transit (AGT), connects Sannomiya to Port Island and Kobe Airport (opened 1981, branch to airport 2006). Different vehicle type. Out-mode.
- **Rokko Liner (Rokko Island Line):** Operated by Kobe New Transit Company (not Kobe Municipal Subway). Automated Guideway Transit (AGT), connects Sumiyoshi (JR/Hanshin) to Rokko Island (opened 1990, 6 stations). Different vehicle type, does not call at Kobe Metro stations. Out-mode.
- **JR West (Sanyo Shinkansen, Kobe Line):** Calls at Shin-Kobe (Shinkansen) and Sannomiya (conventional). Walk-up rail in the region, not Kobe Metro. See Board eligibility section for verdicts.
- **Hankyu Railway (Kobe Line, Kobe Kosoku Line):** Calls at Kobe-Sannomiya. Private rail operator, not Kobe Metro. See Board eligibility section.
- **Hanshin Electric Railway (Main Line):** Calls at Kobe-Sannomiya (printed as Hanshin Kobe-Sannomiya). Private rail operator, not Kobe Metro. See Board eligibility section.
- **Kobe New Transit Port Liner / Rokko Liner:** Already listed above.
- **Kobe city buses:** Operated by Kobe Municipal Transportation Bureau bus division; not subway. Out-mode.

Hub-lock: **Sannomiya / 三ノ宮** (Seishin-Yamate Line × Kaigan Line). Official EN station pages at https://kotsu.city.kobe.lg.jp/ list Sannomiya as a transfer between Seishin-Yamate and Kaigan lines only (within Kobe Metro). Nearby stations Sannomiya-Hanadokeimae (Kaigan terminus) and Sannomiya-area JR/Hankyu/Hanshin stations are separate properties. doNotGroup Shin-Kobe (Hokushin terminus, Seishin-Yamate Line) / Sannomiya-Hanadokeimae (Kaigan Line terminus) / Tanigami (Hokushin + Seishin-Yamate terminus) / Shin-Nagata (Kaigan terminus) / Seishin-chūō (Seishin-Yamate terminus) / Kobe-Sannomiya (Hanshin) / Kobe-Sannomiya (Hankyu) / Kosoku Kobe (Hankyu) / JR Sannomiya / JR Shin-Kobe / Port Liner Sannomiya / Sumiyoshi (JR/Hanshin; Rokko Liner terminus).

## Station name table

Match rule: published D1 string (official Kobe Municipal Transportation Bureau station name in English) vs official JP print of the same Kobe Metro stop.

| published (D1) | other print | class |
| --- | --- | --- |
| Sannomiya | EN **Sannomiya**; JP **三ノ宮** (Seishin-Yamate S03, Kaigan K05); official transfer Y13 + C16 equivalents | **match (lock)**. Seishin-Yamate and Kaigan interchange. Do not use Sannomiya-Hanadokeimae (separate station on Kaigan Line endpoint). doNotGroup vs JR/Hankyu/Hanshin family. |
| Sannomiya-Hanadokeimae | EN **Sannomiya-Hanadokeimae**; JP **三ノ宮花時計前** (Kaigan Line K04, western terminus) | **match Metro**. Different station from Sannomiya. doNotGroup vs Sannomiya. |
| Shin-Kobe | EN **Shin-Kobe** / **New Kobe**; JP **新神戸** (Seishin-Yamate S01, Hokushin terminus); Sanyo Shinkansen also serves this station | **match as Seishin-Yamate and Hokushin stop**. doNotGroup vs JR Shin-Kobe / Shinkansen terminus. |
| Shin-Nagata | EN **Shin-Nagata**; JP **新長田** (Kaigan K06, eastern terminus) | **match. Kaigan terminus.** |
| Tanigami | EN **Tanigami**; JP **谷上** (Hokushin H02, northern terminus; also Seishin-Yamate S02 serving same area via different line) | **match. Hokushin and Seishin-Yamate serve area.** |
| Seishin-chūō | EN **Seishin-Chuo** / **Seishin-Central**; JP **西神中央** (Seishin-Yamate S17, southwestern terminus) | **match. v1 terminus.** |
| All other D1 names in published-network.json | official EN/JP station names from Kobe Municipal Transportation Bureau roster | match |

**Kobe Metro network:** 3 lines (Seishin-Yamate, Kaigan, Hokushin), 28 stations per 2026. v1 includes all three lines and all 28 stations. Hokushin extension (2020 municipalization) included as requested. Product `lib/cities/kobe/` is the planned catalog (names + official codes only; no GTFS stopIds). `assertCityLive("kobe")` must fail (planned / 501). adapterReady false. No official public feed.

## H2 — who has line codes today

No official public GTFS, so there is **no feed route_id** to clash against. Official Kobe Municipal Transit uses roman letter codes (line codes not yet confirmed in English official print, but JP codes exist: 西神線 / 海岸線 / 北神線). Do not invent ODPT / Transitland route ids.

## Board eligibility

Every rail service calling at in-catalog Kobe Metro stations is listed below with verdict (pass/fail boarding contract tests):

| Service | Calls at | Test 1: Walk-up? | Test 2: Entry-to-platform? | Verdict | Notes |
|---|---|---|---|---|---|
| Sanyo Shinkansen (Nozomi) | Shin-Kobe | Compulsory reservation on most days (reserved-seat only during peak periods and certain seasons) | Yes | `out-reservation` | All Nozomi cars reserved 24/7 on many occasions; Obon/New Year all-reserved confirmed. https://selfguidejapan.com/blog/shinkansen-obon-2026 |
| Sanyo Shinkansen (Hikari, Kodama) | Shin-Kobe | Non-reserved seating offered; walk-up boarding possible | Yes | `in` | Hikari and Kodama offer non-reserved seating on standard operating days. Non-reserved seats first-come-first-served; no pre-booking required. https://www.japan-bullettrain.com/articles/blog/shinkansen-reserved-vs-non-reserved |
| Sanyo Shinkansen (Mizuho, Sakura) | Shin-Kobe | Non-reserved seating offered; walk-up boarding possible | Yes | `in` | Mizuho and Sakura offer non-reserved seating. https://livejapan.com/en/in-tokyo/in-pref-tokyo/in-tokyo_train_station/article-a0005420/ |
| JR Kobe Line (Local/Rapid/Special Rapid) | Sannomiya | Yes, all services walk-up boardable | Yes, standard station entry | `in` | Conventional commuter rail, no reservation required. https://www.jrailpass.com/blog/sannomiya-station-kobe |
| Hankyu Kobe Line | Kobe-Sannomiya | Yes, standard commuter rail | Yes, standard station entry | `in` | Conventional commuter service. Private rail; not Kobe Metro. https://www.hankyu.co.jp/en/station/sannomiya.html |
| Hanshin Main Line | Kobe-Sannomiya (printed as Hanshin) | Yes, standard commuter rail | Yes, standard station entry | `in` | Conventional commuter service. Private rail; not Kobe Metro. https://en.wikipedia.org/wiki/Kobe-Sannomiya_Station |
| Port Liner (Kobe New Transit, AGT) | Sannomiya | Yes, walk-up boardable | Yes, standard entry | `out-mode` | Automated Guideway Transit (AGT), not railway/metro. Different vehicle type. https://www.railwaygazette.com/knowledge-hub/kobe-new-transit-company/ |
| Rokko Liner (Kobe New Transit, AGT) | Does not serve Kobe Metro stations | — | — | N/A | AGT system connects Sumiyoshi (JR/Hanshin) to Rokko Island; no Kobe Metro station calls. https://en.wikipedia.org/wiki/Rokk%C5%8D_Island_Line |

**Verdict summary:** JR Kobe Line, Hankyu, and Hanshin are walk-up rail services at shared stations (`in`). Nozomi Shinkansen requires reservation (`out-reservation`); Hikari/Kodama/Mizuho/Sakura walk-up available (`in`). Port Liner is a different mode — AGT, not metro (`out-mode`). Rokko Liner does not call at Kobe Metro stations (not a board eligibility issue).

## Skip risk

No official GTFS / GTFS-RT published as a documented public feed (similar to Osaka Metro situation). NaviLens case study references KMTB data for accessibility services, but this does not constitute a public developer API. Hokushin Line municipalization (June 2020) complete; Hokushin stations now integrated into Kobe Metro fares and network. Port Liner / Rokko Liner (Kobe New Transit Company, different operator) clearly marked out-of-scope as AGT. No merger risk with Osaka or other cities. Sannomiya hub confirmed. Shinkansen walk-up boarding verdicts recorded per service (Nozomi out-reservation; others in). **Not a skip** — official subway plate + routes list are verified; live adapter path is unverified but does not block D1.

## License

- **License name:** No Kobe Municipal Subway GTFS/GTFS-RT licence found (`not found`). Kobe city open-data portal and official transportation website (https://kotsu.city.kobe.lg.jp/) do not publish a GTFS data license or terms. Bus location service (バスロケ) is buses only, not subway. No published data-sharing agreement located for municipal subway network.
- **Redistribution / rehosting:** Website copyright text on Kobe Municipal Transportation Bureau portal (https://kotsu.city.kobe.lg.jp/) is standard: content, maps, and service information are provided for reference use. No explicit GTFS / realtime data reuse license exists. City of Kobe open-data policy (https://www.city.kobe.lg.jp/) encourages open data under Creative Commons or CC0 for datasets it publishes; however, this framework does not yet extend to subway static/realtime data as of 2026-09-06. Do not treat general open-data policy as a grant for data that has no published GTFS feed. Unclear whether a future feed, if published, would fall under Kobe's CC0 / CC-BY policy or require separate negotiation.
- **Commercial use:** Not stated. Kobe city open-data framework permits non-profit and for-profit use of published datasets under CC-BY/CC0; however, no subway GTFS feed is currently published, so commercial-use permission is moot until a feed exists.
- **Attribution:** No subway GTFS attribution required (no GTFS). City of Kobe trademarks (神戸市 logo, 交通局 service marks) are reserved. If a future feed is published under Kobe's open-data CC0/CC-BY scheme, follow attribution language in that scheme at point of publication.
- **Terms URL:** Kobe Municipal Transportation Bureau portal — https://kotsu.city.kobe.lg.jp/ (JP/EN). City of Kobe open-data policy — https://www.city.kobe.lg.jp/kurashi/access/kotsukyoku/index.html . ODPT members and non-members (Kobe Municipal is not listed as member) — https://www.odpt.org/en/about/member/ . Transitland Onestop: none for Kobe Metro. Mobility Database: no `mdb-*` for Kobe Municipal Subway.
- **Confidence:** `not found` on GTFS data license (no feed published). `clear` that Kobe city encourages open data under CC0/CC-BY for published datasets. `unclear` whether municipal subway data would fall under that framework if/when published, or whether a separate license negotiation applies. Do not interpret the city's general open-data spirit as a blanket permission for data that does not exist. The legal status of any future Kobe Metro GTFS is a D1-pack question, not resolved in this research pass.
- **Keyed feeds:** No official Kobe Metro key agreement. Japan metro/subway GTFS systems that do exist and use ODPT (Tokyo Metro, Toei) require `acl:consumerKey` — that pattern is **absent** for Kobe. Never paste a key.

## C2 for this D1 pack

1. city=`kobe`. displayName Kobe.
2. Sannomiya / 三ノ宮 hub (Seishin-Yamate × Kaigan interchange).
3. Modes v1 Kobe Municipal Subway: Seishin-Yamate, Kaigan, Hokushin lines (all 28 stations, all three operators under municipal umbrella as of June 1, 2020). Port Liner and Rokko Liner (Kobe New Transit Company, AGT, out-mode) excluded. JR/Hankyu/Hanshin out but recorded as board-eligible at shared stations (Sannomiya, Shin-Kobe). Shinkansen Nozomi out-reservation; Hikari/Kodama/Mizuho/Sakura in.
4. assertCityLive("kobe") must fail (planned / 501). adapterReady false. No official public GTFS/GTFS-RT feed.
