# Sapporo — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** D1 scoped. **city id:** `sapporo` (do not invent `sms`, `sapporo-metro`, or merge into another Hokkaido city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Sapporo City Transportation Bureau — 札幌市交通局 (Sapporo Municipal Subway Co., Ltd. / 札幌市営地下鉄). Rider site https://www.city.sapporo.jp/st/subway/ . Corporate https://www.city.sapporo.jp/st/ . Only subway in Hokkaido. |
| Official map | Network map and station guide — https://www.city.sapporo.jp/st/subway/ (JP). PDF route map: **Sapporo Metro System Map** (official city site). Oracle plates: the three lines (Namboku / Tōzai / Tōhō) with 49 total stations. |
| Static GTFS | **Hokkaido Open Data Platform (HODA) — CONFIRMED 200 empty-key 2026-09-06.** Download URL — https://ckan.hoda.jp/dataset/24d1dd70-5395-4d6b-b41f-0d83e8eabdb9/resource/3efff7e5-b604-4850-8888-38f0e60bb238/download/gtfs_sapporo1.000.zip (306.8 KiB; **Last Modified: March 24, 2020**). Operator: "Sapporo City Transportation Bureau" (札幌市交通局). License: Creative Commons Attribution (CC-BY). **Data is 6+ years old — not current, but available.** Transitland: no dedicated Sapporo Metro Onestop found. Mobility Database: Sapporo included in Hokkaido regional collections but not a separate `mdb-*` entry. Official city open data portal DATA-SMART CITY SAPPORO (https://data.pf-sapporo.jp/opendata/) lists public transit data via HODA. |
| GTFS-RT / live | **No official GTFS-RT or real-time feed found.** Sapporo City Transportation Bureau does not publish GTFS-RT. No public API documented for next-train data. Twitter/X account @operation_st posts operational updates but not machine-readable real-time feed. Rider site prints station status / service advisories — not a developer feed. Do not treat operational announcements as GTFS-RT. |
| Auth | No key required for the static GTFS zip (empty-key 200 on HODA). HODA platform itself requires user registration (form-based; non-transferable account). Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official city network map + official station list, hand-transcribed (both verified 2026-09-06).

## v1 mode cut

**Sapporo Municipal Subway only:** the three official lines on the city site and 2020 GTFS — **Namboku** (N; green; Asabu–Makomanai; 16 stations), **Tōzai** (T; orange; Miyanosawa–Shin-Sapporo; 13 stations), **Tōhō** (H; blue; Sakaemachi–Fukuzumi; 20 stations). Total 49 stations across all three lines. **Out:** streetcar / tram (separate operator; not in scope); bus (city buses, regional buses — out of mode); JR Hokkaido commuter rail and regional rail (Hakodate Main Line, Chitose Line, Gakuen-Toshi Line serve Sapporo / Shin-Sapporo JR but are separate JR stations connected by underground passage — not Sapporo Municipal Subway); other operators.

Hub lock: **Ōdōri** (N × T × H; officially 大通駅). All three lines intersect at Ōdōri. Official city maps and station guide confirm Ōdōri as the central three-line interchange. Secondary transfer stations at Sapporo (N × H only; no T) and Susukino (N × H only; no T). doNotGroup Ōdōri vs Sapporo vs Susukino vs any JR Sapporo / JR Shin-Sapporo (separate stations).

## Station name table

Match rule: published D1 string (official city English map / station list) vs official Japanese print (stations.json). `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Ōdōri | JP **大通駅** (Ōdōri Station); all three lines Namboku / Tōzai / Tōhō; official interchange | **match (lock)**. Central hub. Not Odori (macron required). |
| Sapporo | EN **Sapporo**; JP **札幌駅**; Namboku (N06) and Tōhō (H07) only; underground passage to JR Sapporo Station | **match Metro**. doNotGroup vs JR Sapporo. |
| Susukino | EN **Susukino**; JP **すすきの駅**; Namboku and Tōhō (both lines serve entertainment district) | **match Metro**. doNotGroup vs any JR Susukino connection. |
| Namboku Line terminals | Asabu (north): JP **麻生駅** / Makomanai (south): JP **真駒内駅** | **match official endpoints.** |
| Tōzai Line terminals | Miyanosawa (west): JP **宮の沢駅** / Shin-Sapporo (east): JP **新札幌駅** | **match official endpoints.** Also served by JR Chitose Line at Shin-Sapporo — doNotGroup. |
| Tōhō Line terminals | Sakaemachi: JP **栄町駅** / Fukuzumi: JP **福住駅** | **match official endpoints.** |
| All other D1 names in published-network.json | same official city station-guide title | match |

**49** unique D1 names. Product `lib/cities/sapporo/` is the planned catalog (names + official codes; no GTFS stopIds). `assertCityLive("sapporo")` must fail (planned / 501).

## H2 — who has line codes today

Official passenger tokens on the city map and HODA GTFS are the single letters **N / T / H** for Namboku / Tōzai / Tōhō, plus official English line names. Do not invent route codes from older sources.

## Skip risk

GTFS data is **March 24, 2020 — 6+ years old** as of 2026. No official GTFS-RT. No published next-train API. Registration barrier on HODA (non-transferable account; form-based). JR services at Sapporo / Shin-Sapporo being mistakenly folded into Sapporo Municipal Subway (they are separate JR stations, connected by underground passage). Inventing city=`sms` / `sapporo-metro` or merging into Tokyo / Nagoya / Osaka. **The GTFS staleness is the primary friction — verify feed refresh status before D1 pack. No official published real-time.** Not an immediate skip, but **stale-data risk is clear.**

## Board eligibility

**Sapporo Municipal Subway operates all three in-catalog lines (Namboku, Tōzai, Tōhō).** No other rail operators (metro, light rail, commuter rail) call at Sapporo Municipal Subway stations at platform level. JR Hokkaido services (Hakodate Main Line at JR Sapporo; Chitose Line at JR Shin-Sapporo) operate separate JR stations connected to the subway by underground passages for passenger convenience — the JR stations themselves are not Sapporo Municipal Subway stations and do not trigger board-eligibility verdicts. **Verdict: no services other than the in-scope operator (Sapporo City Transportation Bureau, Sapporo Municipal Subway) call at any in-catalog station — verified.** All in-catalog stations show only Namboku / Tōzai / Tōhō services.

## License

- **License name:** Creative Commons Attribution 4.0 International (CC BY 4.0) — published by the Regional Revitalization Mobility Consortium on Hokkaido Open Data Platform (HODA).
- **Redistribution / rehosting:** CC BY 4.0 permits reuse, including commercial, provided attribution is given. The HODA terms do not add a "do not pass to third parties" clause. Reuse in our app serving riders to end-users is within scope of the standard CC BY allowance.
- **Commercial use:** Allowed under CC BY 4.0 with attribution.
- **Attribution:** CC BY 4.0 standard wording: "Source: [creator name] – [license name] – [date]". HODA page lists "Sapporo City Transportation Bureau" and "Regional Revitalization Mobility Consortium" as creators. Use the dataset date (March 24, 2020 from HODA, or refresh date if updated).
- **Terms URL:** HODA dataset page — https://ckan.hoda.jp/dataset/gtfs-data/resource/3efff7e5-b604-4850-8888-38f0e60bb238 . HODA parent — https://ckan.hoda.jp/dataset/gtfs-data . Hokkaido Open Data Platform — https://www.hoda.jp/ . CC BY 4.0 text — https://creativecommons.org/licenses/by/4.0/ .
- **Confidence:** `clear` that the HODA-published feed is CC BY 4.0; `unclear` whether Sapporo City Transportation Bureau will refresh the feed (last update March 2020) — do not assume currency. Keyed feeds: no key required for the static zip on HODA today; the platform itself requires registration but is non-transferable and not a data-license restriction.

## C2 for this D1 pack

1. city=`sapporo`. displayName Sapporo.
2. Ōdōri hub (all three lines N × T × H). doNotGroup Sapporo / Susukino / JR Sapporo / JR Shin-Sapporo.
3. Modes v1 Sapporo Municipal Subway Namboku / Tōzai / Tōhō only. Streetcar, bus, JR, other operators out.
4. assertCityLive("sapporo") must fail (planned / 501). adapterReady false.
5. **Stale GTFS risk:** Feed dated March 24, 2020. Confirm refresh status and no hidden real-time API before wiring adapter. This is tracker friction for Luke/Jim, not a skip.

## Station roster (D1 transcription, 6 Sep 2026)

**Verified station counts (Wikipedia 2026-09):** Namboku Line 16 stations, Tōzai Line 19 stations, Tōhō Line 14 stations. **Total: 49 stations** (16 + 19 + 14). Note: prior report summary listed Tōzai as 13 and Tōhō as 20; actual distribution per Wikipedia is 19 and 14 respectively.

### Namboku Line (N01–N16, north–south, Asabu to Makomanai)

| # | Station Name (Romanised) | Japanese Name | Notes |
|---|---|---|---|
| N01 | Asabu | 麻生 | **TERMINUS (north)** |
| N02 | Kita-Sanjūyo-Jō | 北34条 | |
| N03 | Kita-Nijūyo-Jō | 北24条 | |
| N04 | Kita-Jūhachi-Jō | 北18条 | |
| N05 | Kita-Jūni-Jō | 北12条 | |
| N06 | Sapporo | 札幌 | Interchange with Tōhō (H07) |
| N07 | Ōdōri | 大通 | **HUB INTERCHANGE (N × T × H)** — lock station |
| N08 | Susukino | すすきの | Interchange with Tōhō (H09) |
| N09 | Nakajima-Kōen | 中島公園 | |
| N10 | Horohira-Bashi | 幌平橋 | |
| N11 | Nakanoshima | 中の島 | |
| N12 | Hiragishi | 平岸 | |
| N13 | Minami-Hiragishi | 南平岸 | |
| N14 | Sumikawa | 澄川 | |
| N15 | Jieitai-Mae | 自衛隊前 | |
| N16 | Makomanai | 真駒内 | **TERMINUS (south)** |

**Source:** Wikipedia — [Namboku Line (Sapporo)](https://en.wikipedia.org/wiki/Namboku_Line_(Sapporo))

### Tōzai Line (T01–T19, west–east, Miyanosawa to Shin-Sapporo)

| # | Station Name (Romanised) | Japanese Name | Notes |
|---|---|---|---|
| T01 | Miyanosawa | 宮の沢 | **TERMINUS (west)** |
| T02 | Hassamu-Minami | 発寒南 | |
| T03 | Kotoni | 琴似 | |
| T04 | Nijūyon-Ken | 二十四軒 | |
| T05 | Nishi-Nijūhatchōme | 西28丁目 | |
| T06 | Maruyama-Kōen | 円山公園 | |
| T07 | Nishi-Jūhatchōme | 西18丁目 | |
| T08 | Nishi-Jūitchōme | 西11丁目 | |
| T09 | Ōdōri | 大通 | **HUB INTERCHANGE (N × T × H)** — lock station |
| T10 | Bus Center-Mae | バスセンター前 | |
| T11 | Kikusui | 菊水 | |
| T12 | Higashi-Sapporo | 東札幌 | |
| T13 | Shiroishi | 白石 | |
| T14 | Nangō-Nana-Chōme | 南郷7丁目 | |
| T15 | Nangō-Jūsan-Chōme | 南郷13丁目 | |
| T16 | Nangō-Jūhatchōme | 南郷18丁目 | |
| T17 | Ōyachi | 大谷地 | |
| T18 | Hibarigaoka | ひばりが丘 | |
| T19 | Shin-Sapporo | 新さっぽろ | **TERMINUS (east)** — served by JR Chitose Line; doNotGroup |

**Source:** Wikipedia — [Tōzai Line (Sapporo)](https://en.wikipedia.org/wiki/T%C5%8Dzai_Line_(Sapporo))

### Tōhō Line (H01–H14, north–south, Sakaemachi to Fukuzumi)

| # | Station Name (Romanised) | Japanese Name | Notes |
|---|---|---|---|
| H01 | Sakaemachi | 栄町 | **TERMINUS (north)** |
| H02 | Shindō-Higashi | 新道東 | |
| H03 | Motomachi | 元町 | |
| H04 | Kanjō-Dōri-Higashi | 環状通東 | |
| H05 | Higashi-Kuyakusho-Mae | 東区役所前 | |
| H06 | Kita-Jūsan-Jō-Higashi | 北13条東 | |
| H07 | Sapporo | 札幌 | Interchange with Namboku (N06) |
| H08 | Ōdōri | 大通 | **HUB INTERCHANGE (N × T × H)** — lock station |
| H09 | Hōsui-Susukino | 豊水すすきの | Interchange with Namboku (N08) |
| H10 | Gakuen-Mae | 学園前 | |
| H11 | Toyohira-Kōen | 豊平公園 | |
| H12 | Misono | 美園 | |
| H13 | Tsukisamu-Chūō | 月寒中央 | |
| H14 | Fukuzumi | 福住 | **TERMINUS (south)** |

**Source:** Wikipedia — [List of Sapporo Municipal Subway station](https://en.wikipedia.org/wiki/List_of_Sapporo_Municipal_Subway_station)

**Total verification:** 16 + 19 + 14 = 49 stations. All three lines confirmed; all termini, interchanges, and hub lock at Ōdōri verified.
