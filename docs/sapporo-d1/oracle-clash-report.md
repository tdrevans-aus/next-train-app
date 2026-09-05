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
