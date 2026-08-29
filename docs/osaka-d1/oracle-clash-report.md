# Osaka — oracle clash report

**Lane:** Nico research + Luke D1 pack (completed in this PR). **Date:** 2026-08-29. **Status:** D1 pack written. **city id:** `osaka` (do not invent `osk`, `osaka-metro`, `kintetsu`, or merge into Tokyo / Keihanshin as one city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Osaka Metro — 大阪市高速電気軌道株式会社 (Osaka Municipal Subway / Osaka Metro Co., Ltd.). Rider site https://subway.osakametro.co.jp/ . Corporate https://www.osakametro.co.jp/ . Not Tokyo Metro. Not a Keihanshin super-city. |
| Official map | Route map page (EN) — https://subway.osakametro.co.jp/en/guide/routemap.php (JP: https://subway.osakametro.co.jp/guide/routemap.php). Oracle PDF on both pages: **路線図** https://subway.osakametro.co.jp/img/osakametro_rosenzu_20250404.pdf — empty-key **200** 2026-08-29 (application/pdf; 1,101,136 bytes; Last-Modified Fri, 04 Apr 2025 05:34:16 GMT). Vector plate — little extractable text; ordered stops from the official routes list, not from the PDF bytes. Official routes / station list (EN) — https://subway.osakametro.co.jp/en/station_guide/ (JP: https://subway.osakametro.co.jp/station_guide/). Status icons on the subway top page also print New Tram as a ninth row — v1 is the eight subway legends only. |
| Static GTFS | **No official Osaka Metro subway GTFS found.** Transitland: no Onestop. Atlas search `repo:transitland/transitland-atlas` for Osaka Metro / 大阪メトロ / 大阪市高速電気軌道 — **0 hits** 2026-08-29. Invented slugs `f-osakametro` / `f-osaka~metro` are SPA shells (same size as a fake id; no Last Fetch) — not feeds. Real contrast: Tokyo Metro **f-tokyometro~data~tokyometro~train~gtfs~jp** (ODPT zip; `acl:consumerKey`; last fetch 2026-08-22). Mobility Database `feeds_v2.csv` downloaded 2026-08-29: **0 rows** for Osaka Prefecture / Osaka municipality / Osaka Metro. Toei Train is **mdb-3176** via ODPT — that is Tokyo, not this city. ODPT catalog search 「大阪」 on https://ckan.odpt.org/dataset/?q=%E5%A4%A7%E9%98%AA returns **Hankyu Ferry**, not Metro. Members list as of **1 Aug 2026** (https://www.odpt.org/en/about/member/) has Tokyo Metro, Toei, Yokohama, Sendai, Kyoto Municipal — **not** Osaka Metro / 大阪市高速電気軌道 / Kita-Osaka Kyuko / Hankyu Railway / Hanshin / Nankai / Kintetsu / Keihan / JR West. City open-data landing https://www.city.osaka.lg.jp/contents/wdu290/opendata/ has no GTFS / 地下鉄 / メトロ string. `data.city.osaka.lg.jp` timed out 2026-08-29 — do not invent a zip there. Osaka Metro 駅レポート https://osakametro-data-report.jp/ is paid gate-count statistics, not GTFS. Do not invent an ODPT `OsakaMetro-Train-GTFS.zip`. |
| GTFS-RT / live | **No official GTFS-RT.** Rider site prints 列車走行位置 / 列車混雑予測 on https://subway.osakametro.co.jp/index.php — HTML pages, not a published developer feed. Unpublished app backends are not a product contract. Do not treat a gist or an empty-key 403 on `api.odpt.org` as proof a Metro RT feed exists (that host 403s without `acl:consumerKey` on invented paths too). |
| Auth | No official Metro GTFS to key. ODPT consumer key from https://developer.odpt.org/ is required for *other* JP operators (Tokyo Metro / Toei) — **not this city**. Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official subway map + official routes list, hand-transcribed.

## v1 mode cut

**Osaka Metro subway only:** official eight subway lines on the routes list and on the 2025-04-04 路線図 PDF — **Midosuji** (M11 Esaka–M30 Nakamozu), **Tanimachi** (T11 Dainichi–T36 Yao-minami), **Yotsubashi** (Y11 Nishi-Umeda–Y21 Suminoekoen), **Chuo** (C09 Yumeshima–C23 Nagata), **Sennichimae** (S11 Nodahanshin–S24 Minami-Tatsumi), **Sakaisuji** (K11 Tenjimbashisuji 6-chome–K20 Tengachaya), **Nagahori Tsurumi-ryokuchi** (N11 Taisho–N27 Kadoma-minami), **Imazatosuji** (I11 Itakano–I21 Imazato). JP print: 御堂筋線 / 谷町線 / 四つ橋線 / 中央線 / 千日前線 / 堺筋線 / 長堀鶴見緑地線 / 今里筋線. Yumeshima (C09) is on that list — in. **New Tram out of v1:** official routes list prints a ninth section **New Tram** (P09 Cosmosquare–P18 Suminoekoen; JP station heading **ニュートラム**; also called Nanko Port Town Line). Same site groups 地下鉄・ニュートラム. That is the printed extra — v1 is subway only. **Through-run out:** official M11 Esaka transfer is **Kita-Osaka Kyuko Line (Mutual Line Operation)** — Kitakyu stations north of Esaka (Senri-Chuo / Momoyamadai / Minoh-Kayano) are not Metro-operated and are not M-codes. v1 is Metro-operated Midosuji stations M11–M30 only, not the through-run. Boarding-position PDF on that same routes page is named `m_minohkayano.pdf` — that filename is the trap, not a D1 terminus. Same pattern: K11 **Hankyu Line (Mutual Line Operation)**; C23 Nagata **Kintetsu Line (Mutual Line Operation)**. Digital-ticket page treats “[Osaka Metro] All lines (Including Yumeshima Station)” as one product and Kita-Osaka Kyuko Esaka–Senri-chuo as a *different* add-on — https://subway.osakametro.co.jp/en/guide/fare/category_digital_tickets/digital_tickets/digital_joshaken.php . **Out:** New Tram / Nanko Port Town; Imazato Liner BRT (https://brt.osakametro.co.jp/en/ ); Osaka City Bus (https://citybus-osaka.co.jp/howto-english/ ); JR West (Osaka Loop Line and the rest); Hankyu; Hanshin; Nankai; Kintetsu; Keihan; Kita-Osaka Kyuko; Osaka Monorail; Hankai.

Hub lock: **Hommachi / 本町** (M18 × Y13 × C16). Official EN station page — https://subway.osakametro.co.jp/en/station_guide/m/m18/ — transfers **Y13 Hommachi Yotsubashi** + **C16 Hommachi Chuo** only. Official JP — https://subway.osakametro.co.jp/station_guide/M/m18/ — 乗り換え **Y13本町四つ橋線** + **C16本町中央線** only. Not Umeda (M16; official transfers Tanimachi + Yotsubashi + **JR / Hankyu / Hanshin**), not Namba (M20; official transfers Yotsubashi + Sennichimae + **JR / Hanshin / Kintetsu / Nankai**), not Shinsaibashi (M19 × N15; Yotsubashi is **Yotsubashi** Y14, a different station), not Sakaisuji-Hommachi (C17 × K15), not Tennoji, not Downtown. There is no station on all eight subway lines — Hommachi is the inner Midosuji × Yotsubashi × Chuo lock. doNotGroup Hommachi vs Sakaisuji-Hommachi vs Umeda vs Higashi-Umeda vs Nishi-Umeda vs Hankyu Osaka-Umeda vs Hanshin Osaka-Umeda vs JR Osaka vs Namba vs Nankai Namba vs JR Namba vs Kintetsu Osaka-Namba vs Hanshin Osaka-Namba vs Yotsubashi vs Shinsaibashi vs Esaka vs Kitakyu Senri-Chuo / Minoh-Kayano vs Nagata vs Kintetsu beyond Nagata vs Tenjimbashisuji 6-chome Hankyu through-run vs Tennoji JR/Kintetsu.

## Station name table

Match rule: published D1 string (official EN routes list) vs official JP print of the same Metro stop vs private-rail / through-run print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Hommachi | EN **Hommachi** M18; JP **本町**; official transfers Y13 + C16 only | **match (lock)**. Do not use Honmachi / Downtown / City. Not Sakaisuji-Hommachi. |
| Sakaisuji-Hommachi | EN **Sakaisuji-Hommachi** C17 / K15; JP **堺筋本町** | **match**. doNotGroup vs Hommachi. Not the hub. |
| Umeda | EN **Umeda** M16; JP **梅田** | **match Metro**. doNotGroup vs Higashi-Umeda / Nishi-Umeda / Hankyu Osaka-Umeda / Hanshin Osaka-Umeda / JR Osaka. Not the hub. |
| Higashi-Umeda | EN **Higashi-Umeda** T20; JP **東梅田** | **match Metro**. doNotGroup vs Umeda family. |
| Nishi-Umeda | EN **Nishi-Umeda** Y11; JP **西梅田** | **match Metro**. doNotGroup vs Umeda family. |
| Namba | EN **Namba** M20 / Y15 / S16; JP **なんば** | **match Metro**. doNotGroup vs Nankai Namba / JR Namba / Kintetsu Osaka-Namba / Hanshin Osaka-Namba. Not the hub. |
| Shinsaibashi | EN **Shinsaibashi** M19 / N15; JP **心斎橋** | **match Metro**. doNotGroup vs Yotsubashi (Y14). Not the hub. |
| Yotsubashi | EN **Yotsubashi** Y14; JP **四ツ橋** | **match Metro**. Different station from Shinsaibashi. |
| Esaka | EN **Esaka** M11; JP **江坂**; transfer Kita-Osaka Kyuko (Mutual Line Operation) | **match. v1 terminus.** Kitakyu Senri-Chuo / Momoyamadai / Minoh-Kayano are not D1 rows. |
| Yumeshima | EN **Yumeshima** C09; JP **夢洲** | **match. IN.** |
| Nakamozu | EN **Nakamozu** M30; JP **なかもず** | **match. Midosuji south terminus.** |
| Tenjimbashisuji 6-chome | EN **Tenjimbashisuji 6-chome** T18 / K11; JP **天神橋筋六丁目** | **match Metro**. Hankyu mutual operation beyond K11 is out of v1. |
| Nagata | EN **Nagata** C23; JP **長田** | **match Metro**. Kintetsu mutual operation beyond Nagata is out of v1. |
| Cosmosquare | EN **Cosmosquare** C10; JP **コスモスクエア**; New Tram P09 same place | **match as Chuo subway**. New Tram P-codes out of v1. |
| Suminoekoen | EN **Suminoekoen** Y21; JP **住之江公園**; New Tram P18 same place | **match as Yotsubashi subway**. New Tram P-codes out of v1. |
| Higashimikuni | official EN **Higashimikuni** (one word) M12; JP **東三国** | **match official EN**. Not Higashi-Mikuni. |
| Minamimorimachi | official EN **Minamimorimachi** T21 / K13; JP **南森町** | **match official EN**. Not Minami-Morimachi. |
| Nishinagahori | official EN **Nishinagahori** S14 / N13; JP **西長堀** | **match official EN**. Not Nishi-Nagahori. |
| Nippombashi | official EN **Nippombashi** S17 / K17; JP **日本橋** | **match official EN**. Not Nipponbashi. |
| Gamo 4-chome | official EN **Gamo 4-chome** N23 / I18; JP **蒲生四丁目** | **match official EN**. Not Gamou. |
| All other D1 names in published-network.json | same official EN routes-list title | match |

**101** unique D1 names. **124** line ticks. Product `lib/cities/osaka/` is the planned catalog (names + official codes only; no GTFS stopIds). `assertCityLive("osaka")` must fail (planned / 501).

## H2 — who has line codes today

No official public GTFS, so there is **no feed route_id** to clash against. Official passenger tokens are the roman letters **M / T / Y / C / S / K / N / I** plus the official EN line names. Do not invent ODPT / Transitland route ids.

## Skip risk

Kitakyu / Hankyu / Kintetsu through-run leaking past Esaka / Tenjimbashisuji 6-chome / Nagata (boarding PDF `m_minohkayano.pdf` is the Kitakyu filename trap); New Tram printed on the official routes list leaking into subway; Umeda / Namba name-family folded into Hankyu / Hanshin / JR / Nankai / Kintetsu; inventing city=`osk` / `osaka-metro` / `kintetsu` or merging into Tokyo / Keihanshin; inventing an ODPT GTFS zip because Tokyo Metro has one. **No official public GTFS / GTFS-RT** — live path is unverified; that is tracker friction for a later adapter, not a missing map. Official subway plate + routes list are verified. Not a skip.

## License

- **License name:** No Osaka Metro GTFS/GTFS-RT licence found (`not found`). The only published reuse text is the rider-site copyright on **About this website** (JP 著作権について). ODPT **Public Transportation Open Data Basic License** (rev. 1 Jun 2021) exists and is keyed — it does **not** apply here; Osaka Metro is not an ODPT member as of 1 Aug 2026.
- **Redistribution / rehosting:** Website copyright (EN https://www.osakametro.co.jp/en/site_info.php ; JP https://www.osakametro.co.jp/site_info.php ): photos, illustrations, audio, video, and articles are copyright; the site as a compilation is copyright; “use or reproduction without permission is prohibited.” “Excluding replication for personal use and citation, etc. recognized under the Copyright Act, This Company must be consulted in advance when replicating, or using for a different purpose, the contents published on This Company’s website.” That is website content, not a GTFS grant. Do not treat it as a right to rehost a feed that does not exist. ODPT Basic License Art. 4(3): “not to display all or part of the Basic License Data anywhere other than in the Deliverable.” Art. 8(4)(1): without prior written approval, prohibited “to release, redistribute, publicly transmit, or assign Basic License Data and Others … whether with or without consideration in a form reusable by a third party.” Those clauses govern ODPT members’ data — **not** Osaka Metro. Do not interpret either text as allowed.
- **Commercial use:** Metro site copyright does not say commercial use of a data feed is allowed or prohibited; it requires prior consultation for reuse beyond personal/citation. Unclear. ODPT Art. 4(7) allows for-profit or nonprofit use of *Basic License Data* — again, not this city.
- **Attribution:** Metro site: no required GTFS attribution wording (no GTFS). Trademarks: company/product names on the site are trademarks. ODPT Guideline attribution would apply only if this were ODPT data — it is not.
- **Terms URL:** Metro site copyright — https://www.osakametro.co.jp/en/site_info.php / https://www.osakametro.co.jp/site_info.php . Official map — https://subway.osakametro.co.jp/en/guide/routemap.php + PDF https://subway.osakametro.co.jp/img/osakametro_rosenzu_20250404.pdf . Official routes list — https://subway.osakametro.co.jp/en/station_guide/ . ODPT (not this city’s path): members https://www.odpt.org/en/about/member/ ; developer index https://developer.odpt.org/ ; rules index https://developer.odpt.org/terms/ ; Basic License https://developer.odpt.org/terms/data_basic_license.html . Transitland: no Onestop to cite. Mobility Database CSV: no `mdb-*` for Osaka Metro. Station-report (not a feed): https://osakametro-data-report.jp/ .
- **Confidence:** `not found` on a Metro GTFS/GTFS-RT data licence; `clear` that the rider-site copyright requires prior consultation beyond personal use/citation and that ODPT is keyed / not this operator; `unclear` whether a later unpublished live API would even be licensable — do not interpret as allowed.
- **Keyed feeds:** No official Osaka Metro key agreement, because no official Metro feed. Japan subway GTFS that *does* exist (Tokyo Metro / Toei) is ODPT `acl:consumerKey` — that pattern is verified for those cities and **absent** here. Never paste a key.

## C2 for this D1 pack

1. city=`osaka`. displayName Osaka.
2. Hommachi / 本町 hub. doNotGroup Sakaisuji-Hommachi / Umeda / Higashi-Umeda / Nishi-Umeda / Hankyu Osaka-Umeda / Hanshin Osaka-Umeda / JR Osaka / Namba / Nankai Namba / JR Namba / Kintetsu Osaka-Namba.
3. Modes v1 Osaka Metro subway only (Midosuji, Tanimachi, Yotsubashi, Chuo, Sennichimae, Sakaisuji, Nagahori Tsurumi-ryokuchi, Imazatosuji). New Tram out. Kitakyu / Hankyu / Kintetsu through-run beyond Esaka / Tenjimbashisuji 6-chome / Nagata out. JR / private rail / bus / Imazato Liner out.
4. assertCityLive("osaka") must fail (planned / 501). adapterReady false. No official public feed.
