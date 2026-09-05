# Fukuoka — oracle clash report

**Lane:** Nico research + Luke D1 pack (this PR). **Date:** 2026-09-06. **Status:** D1 scope. **city id:** `fukuoka` (do not invent `fuk`, `fukuoka-metro`, `fukuoka-city`, or merge into another Japanese city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Fukuoka City Transportation Bureau — 福岡市交通局 (Fukuoka City Subway operator). Rider site https://subway.city.fukuoka.lg.jp/ . Contact: 5-31 Daimyo-2-chome, Chuo-ku, Fukuoka 810-0041, TEL 092-732-4105. Not Tokyo Metro. Not Osaka Metro. |
| Official map | Route map page (EN) — https://subway.city.fukuoka.lg.jp/eng/route/deta/map.pdf (JP: https://subway.city.fukuoka.lg.jp/route/deta/map.pdf). Oracle PDF route map **200** 2026-09-06 (application/pdf; 4.6 MB; Adobe Illustrator). Ordered stops from official station list via rider site, not from PDF bytes. |
| Static GTFS | **No official Fukuoka City Subway GTFS found.** Transitland: no Onestop ID for Fukuoka City Subway. Mobility Database `feeds_v2.csv` downloaded 2026-09-06: **0 rows** for Fukuoka / Fukuoka City Transportation Bureau / Fukuoka Subway. ODPT membership list (https://www.odpt.org/en/about/member/) checked 2026-09-02: Fukuoka City Transportation Bureau is **not a member**. Members list includes Tokyo Metro, Toei, Yokohama, Sendai, Kyoto Municipal, Kobe — **not** Fukuoka. City open-data landing page for Fukuoka City (city.fukuoka.lg.jp) has no published GTFS / 地下鉄 / メトロ feeds as of 2026-09-06. Community GTFS on GitHub (kuwayamamasayuki/GTFS-FukuokaCitySubway) exists but is not an official feed — do not treat as D1 source. Do not invent an ODPT `FukuokaSubway-GTFS.zip`. |
| GTFS-RT / live | **No official GTFS-RT.** Rider site at https://subway.city.fukuoka.lg.jp/ displays route/schedule info but does not publish a developer feed. No published GTFS-RT URL on Transitland / Mobility Database. No public API documented by Fukuoka City Transportation Bureau. Do not treat unpublished app backends as a product contract. |
| Auth | No official Metro GTFS to key. No ODPT consumer key applies (Fukuoka not a member as of Sept 2, 2026). Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official route map + official station list, hand-transcribed.

## v1 mode cut

**Fukuoka City Subway all three lines:** official subway lines on the 2026 route map and official station list — **Kūkō** (Airport Line; K01 Meinohama–K13 Fukuoka Airport; 13 stations, 13.1 km; orange), **Hakozaki** (H01 Nakasu-Kawabata–H07 Kaizuka; 7 stations, 4.7 km; blue), **Nanakuma** (N01 Hashimoto–N18 Hakata; 18 stations, 13.6 km; green). JP print: 空港線 / 箱崎線 / 七隈線. Nanakuma extension to Hakata (27 March 2023) is on the official current map — in. **Through-run out of v1-scope-strictly, in at board-eligibility:** official Kūkō (K01–K13) has mutual line operation / through-service with JR Chikuhi Line (commuter rail, walk-up boardable, no compulsory reservation; local + rapid trains). Chikuhi operates to Meinohama (K01 mutual point) and continues to Karatsu / Nishi-Karatsu beyond. v1 is Fukuoka City Subway-operated Kūkō stations K01–K13 only, not Chikuhi stations beyond Meinohama. JR through-train riders boarding at Meinohama (K01) on Fukuoka City Subway platform are walk-up boardable at that in-catalog station — verdict `in` for Chikuhi Line (board eligibility rule §6). **Out:** Nishitetsu Fukuoka (Tenjin) / Nishitetsu Tenjin-Omuta Line (a different private rail network sharing Tenjin area but not a subway station); JR Hakata mainline / Shinkansen / Tokaido / Sanyo / Kyushu operations (separate JR Hakata station, not subway); buses; trams; ferries; other private operators.

Hub lock: **Hakata** (K11 × N18). Official rider site (https://subway.city.fukuoka.lg.jp/ and EN version) lists Hakata as a transfer point between Kūkō line (K11, between Gion–Higashi-Hie) and Nanakuma line (N18, southern terminus as of 27 March 2023 extension). Hakata is the main city transport hub, serving JR Hakata station (mainline + Shinkansen, not subway). doNotGroup Hakata (K11 × N18 metro) vs JR Hakata (separate facility). No station on all three lines — Hakata is the central metro interchange (Kūkō × Nanakuma). Nakasu-Kawabata (K09 × H01) is the Kūkō–Hakozaki interchange (not all three). doNotGroup Hakata vs Nakasu-Kawabata vs Tenjin (K08, only Kūkō, no Nanakuma) vs Tenjin-Minami (N16, only Nanakuma, no Kūkō, not a hub).

## Station name table

Match rule: published D1 string (official route map + EN rider site) vs official JP print of the same Fukuoka City Subway stop vs JR / Nishitetsu / other print of a shared location. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Hakata | EN/JP **Hakata** K11 (Kūkō) and N18 (Nanakuma); transfer point between two metro lines; JR Hakata is separate | **match (lock)**. doNotGroup JR Hakata mainline / Shinkansen facility. Not Tenjin. |
| Meinohama | EN/JP **Meinohama** K01 (Kūkō); JR Chikuhi through-service mutual point | **match**. Through-run terminus (K01). Chikuhi west of Meinohama out of v1. |
| Fukuoka Airport | EN/JP **Fukuoka Airport** K13 (Kūkō); airport station; southern terminus | **match**. K-line south end. |
| Tenjin | EN/JP **Tenjin** K08 (Kūkō only); not on Nanakuma or Hakozaki | **match Metro**. K-line only. doNotGroup Tenjin-Minami (N-line), Nishitetsu Fukuoka (Tenjin) [different network]. |
| Tenjin-Minami | EN/JP **Tenjin-Minami** N16 (Nanakuma); underground linked to Tenjin via Tenjin Chikagai | **match Metro**. N-line only. Not hub. doNotGroup Tenjin. |
| Nakasu-Kawabata | EN/JP **Nakasu-Kawabata** K09 (Kūkō) and H01 (Hakozaki); transfer point | **match**. Kūkō–Hakozaki interchange. Not all three. |
| Kaizuka | EN/JP **Kaizuka** H07 (Hakozaki); north terminus | **match**. H-line north end. |
| Hashimoto | EN/JP **Hashimoto** N01 (Nanakuma); north terminus | **match**. N-line north end. |
| Kushida Shrine | EN/JP **Kushida Shrine** N17 (Nanakuma); opened 27 March 2023 in Nanakuma extension | **match**. N-line. |
| Higashi-Hie | EN/JP **Higashi-Hie** K12 (Kūkō); between Hakata–Gion | **match**. K-line. |
| Gion | EN/JP **Gion** K10 (Kūkō) | **match**. K-line. |
| Akasaka | EN/JP **Akasaka** K07 (Kūkō); between Tenjin–Nakasu-Kawabata | **match**. K-line. |
| All other D1 names on the route map / EN rider site station list | same official title | match |

**36** unique D1 names. **38** line ticks. Product `lib/cities/fukuoka/` is the planned catalog (names + official codes only; no GTFS stopIds). `assertCityLive("fukuoka")` must fail (planned / 501).

## H2 — who has line codes today

No official public GTFS, so there is **no feed route_id** to clash against. Official passenger tokens are the line letters **K / H / N** (Kūkō / Hakozaki / Nanakuma) in official kanji / romaji print. Do not invent ODPT / Transitland route ids.

## Skip risk

JR Chikuhi Line through-run leaking past Meinohama (K01) into western Chikuhi territory beyond v1 scope (boarding at in-catalog K-line stations is still `in`; Chikuhi-only stations west of Meinohama are out of v1, not a metro station). Hakata station name shared with JR mainline / Shinkansen facility (separate rail operator, not confused with metro). Nishitetsu Fukuoka (Tenjin) / Tenjin-Omuta Line name family folded into Tenjin (K08 metro only). Tenjin vs Tenjin-Minami confusion (K-line vs N-line, different metro stations). Inventing city=`fuk` / `fukuoka-metro` / `fukuoka-city` or merging into Tokyo / Osaka / Keihanshin / Kyushu regional. Inventing an ODPT GTFS zip because Tokyo Metro / Osaka has one. **No official public GTFS / GTFS-RT** — live path is unverified; that is tracker friction for a later adapter, not a missing map. Official subway map + station list are verified. Not a skip.

## License

- **License name:** No Fukuoka City Subway GTFS/GTFS-RT licence found (`not found`). The only published reuse text is the rider-site terms on the MovEasy Service (Jorudan Co., Ltd. gateway to official data; https://fukuoka-city-subway.jorudan.biz/pc/en/termsofuse). ODPT **Public Transportation Open Data Basic License** (rev. 1 Jun 2021) — **does not apply** to Fukuoka City Subway; Fukuoka is not an ODPT member as of 2 Sept 2026. Never paste a key.
- **Redistribution / rehosting:** MovEasy Terms (verified 2026-09-06): users receive limited rights to access the service on personal devices and may email or print portions using designated functions; "reproducing, duplicating, modifying, altering, and assigning The Service's content to third parties" is explicitly prohibited. Commercial redistribution and secondary use are not permitted. "All intellectual property rights, including compilation copyrights, related to The Service belong to us or the information provider licensing us the rights for use." That is website/app content, not a GTFS grant. Do not treat it as a right to rehost a feed that does not exist. Do not interpret as allowed.
- **Commercial use:** MovEasy Terms do not permit commercial reuse or selling of the data. Restricted to personal, non-commercial use only. Unclear whether a future unpublished live API would even be licensable.
- **Attribution:** No required GTFS attribution (no GTFS). MovEasy copyright vests in Fukuoka City Transportation Bureau and Jorudan Co., Ltd. Trademarks: company/product names are trademarks. Do not invent an attribution string without explicit terms.
- **Terms URL:** MovEasy Service terms — https://fukuoka-city-subway.jorudan.biz/pc/en/termsofuse (also JP version available). Rider site — https://subway.city.fukuoka.lg.jp/eng/ + https://subway.city.fukuoka.lg.jp/ . Official route map — https://subway.city.fukuoka.lg.jp/eng/route/deta/map.pdf . Transitland: no Onestop. Mobility Database CSV: no `mdb-*` for Fukuoka City Subway. ODPT members list (as of 2 Sept 2026) — https://www.odpt.org/en/about/member/ (Fukuoka not listed).
- **Confidence:** `not found` on a Metro GTFS/GTFS-RT data licence; `clear` that MovEasy website terms prohibit redistribution and require prior consultation; `unclear` whether a later unpublished live API would be licensable — do not interpret as allowed.
- **Keyed feeds:** No official Fukuoka City Subway key agreement, because no official Metro feed.

## Board eligibility

| Service | Stations | Verdict | Evidence |
|---|---|---|---|
| Fukuoka City Subway — Kūkō line (K01–K13) | All K-line stations in-catalog | `in` | Walk-up boardable, no reservation required. Official subway service. Rider-site (https://subway.city.fukuoka.lg.jp/eng/) lists all K-line stations as metro service. |
| Fukuoka City Subway — Hakozaki line (H01–H07) | All H-line stations in-catalog | `in` | Walk-up boardable, no reservation required. Official subway service. |
| Fukuoka City Subway — Nanakuma line (N01–N18) | All N-line stations in-catalog | `in` | Walk-up boardable, no reservation required. Official subway service. Includes March 2023 Hakata extension (N17–N18). |
| JR Chikuhi Line (through-service on Kūkō) | Meinohama (K01 only; JR mutual point) | `in` | Walk-up boardable commuter rail, no compulsory reservation. Local + rapid services. Through-service operates on Fukuoka City Subway Kūkō line K01–K13 platform at Meinohama. Rider boarding at K01 platform has walk-up access to JR through-train. JR Chikuhi stations west of Meinohama (Chikuzen-Maebaru, Karatsu, Nishi-Karatsu, etc.) are not in-catalog metro stations — out of v1 scope / `out-mode` (not metro). |
| Other JR services (Hakata mainline, Shinkansen, Kyushu Line, etc.) | Hakata (N18 metro separate from JR Hakata) | `out-mode` | JR mainline / Shinkansen / Tokaido / Sanyo / Kyushu services operate at a different JR Hakata station facility, not the Fukuoka City Subway metro station. Not a metro service; separate operator and ticketing. |
| Nishitetsu Rail — Tenjin-Omuta Line | Tenjin area (Nishitetsu Fukuoka Tenjin, not K08 metro) | `out-mode` | Nishitetsu Tenjin is a different rail operator and station, not the Fukuoka City Subway Tenjin (K08). Shared city name does not make it the same in-catalog station. |

All rail services calling at in-catalog Fukuoka City Subway stations have verdicts recorded. No services other than the three official metro lines and JR Chikuhi through-run on the Kūkō platform call at in-catalog stations — verified.

## C2 for this D1 pack

1. city=`fukuoka`. displayName Fukuoka.
2. Hakata (K11 × N18) hub (Kūkō–Nanakuma interchange). doNotGroup JR Hakata / Nakasu-Kawabata / Tenjin / Tenjin-Minami / Nishitetsu Tenjin.
3. Modes v1 Fukuoka City Subway only (Kūkō / Hakozaki / Nanakuma, all three lines; 36 stations). JR Chikuhi through-run `in` for board eligibility at Meinohama (K01) platform. Chikuhi-only stations west of Meinohama out. JR mainline / Shinkansen / private rail / buses / trams out.
4. assertCityLive("fukuoka") must fail (planned / 501). adapterReady false. No official public feed.
5. Board eligibility: metro lines `in`; JR Chikuhi Meinohama `in`; other JR / private operators `out-mode`.

## Station roster (D1 transcription, 6 Sep 2026)

**Kūkō Line (Airport Line / K line — orange) — 13 stations, 13.1 km**
Termini: Meinohama (K01, west; JR Chikuhi through-run boundary) ↔ Fukuoka Airport (K13, east).
Interchange: Nakasu-Kawabata (K09, with H-line); Hakata (K11, with N-line; hub).

| # | Code | English (official EN site) | Japanese (official JP print) |
|---|---|---|---|
| 1 | K01 | Meinohama | 姪浜 |
| 2 | K02 | Muromi | 室見 |
| 3 | K03 | Fujisaki | 藤崎 |
| 4 | K04 | Nishijin | 西新 |
| 5 | K05 | Tōjinmachi | 天神町 |
| 6 | K06 | Ōhorikōen | 大濠公園 |
| 7 | K07 | Akasaka | 赤坂 |
| 8 | K08 | Tenjin | 天神 |
| 9 | K09 | Nakasu-Kawabata | 中洲川端 |
| 10 | K10 | Gion | 祇園 |
| 11 | K11 | Hakata | 博多 |
| 12 | K12 | Higashi-Hie | 東比恵 |
| 13 | K13 | Fukuoka Airport | 福岡空港 |

Sources: [Fukuoka City Subway route information (English)](https://subway.city.fukuoka.lg.jp/eng/route/), [Kuko Line Fukuoka Subway](https://www.japan-experience.com/plan-your-trip/travel-by-train/train-in-japan/kuko-line-fukuoka-subway), [List of Fukuoka City Subway stations (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Fukuoka_City_Subway_stations).

**Hakozaki Line (H line — blue) — 7 stations, 4.7 km**
Termini: Nakasu-Kawabata (H01, west; shared with K-line) ↔ Kaizuka (H07, north).
Interchange: Nakasu-Kawabata (H01, with K-line).

| # | Code | English (official EN site) | Japanese (official JP print) |
|---|---|---|---|
| 1 | H01 | Nakasu-Kawabata | 中洲川端 |
| 2 | H02 | Gofukumachi | 呉服町 |
| 3 | H03 | Chiyo-Kenchōguchi | 千代県庁口 |
| 4 | H04 | Maidashi-Kyūdai-byōin-mae | 舞鶴・九大病院前 |
| 5 | H05 | Hakozaki-Miyamae | 箱崎宮前 |
| 6 | H06 | Hakozaki-Kyūdai-mae | 箱崎九大前 |
| 7 | H07 | Kaizuka | 貝塚 |

Sources: [Fukuoka City Subway route information (English)](https://subway.city.fukuoka.lg.jp/eng/route/), [Hakozaki-Kyūdai-mae Station (Wikipedia)](https://en.wikipedia.org/wiki/Hakozaki-Ky%C5%ABdai-mae_Station), [Hakozaki-Miyamae Station (Wikipedia)](https://en.wikipedia.org/wiki/Hakozaki-Miyamae_Station), [Kaizuka Station Fukuoka (Wikipedia)](https://en.wikipedia.org/wiki/Kaizuka_Station_(Fukuoka)).

**Nanakuma Line (N line — green) — 18 stations, 13.6 km**
Termini: Hashimoto (N01, west) ↔ Hakata (N18, east; opened 27 March 2023 extension; hub with K-line).
Interchange: Hakata (N18, with K-line; hub).
Extension note: Stations N17–N18 (Kushida Shrine, Hakata) opened 27 March 2023, extending service from N16 (Tenjin-Minami) to Hakata.

| # | Code | English (official EN site) | Japanese (official JP print) |
|---|---|---|---|
| 1 | N01 | Hashimoto | 橋本 |
| 2 | N02 | Jirōmaru | 次郎丸 |
| 3 | N03 | Kamo | 賀茂 |
| 4 | N04 | Noke | 野芥 |
| 5 | N05 | Umebayashi | 梅林 |
| 6 | N06 | Fukudai-mae | 福大前 |
| 7 | N07 | Nanakuma | 七隈 |
| 8 | N08 | Kanayama | 金山 |
| 9 | N09 | Chayama | 茶山 |
| 10 | N10 | Befu | 別府 |
| 11 | N11 | Ropponmatsu | 六本松 |
| 12 | N12 | Sakurazaka | 桜坂 |
| 13 | N13 | Yakuin-ōdōri | 薬院大通 |
| 14 | N14 | Yakuin | 薬院 |
| 15 | N15 | Watanabe-dōri | 渡辺通 |
| 16 | N16 | Tenjin-Minami | 天神南 |
| 17 | N17 | Kushida Shrine | 櫛田神社前 |
| 18 | N18 | Hakata | 博多 |

Sources: [Fukuoka City Subway route information (English)](https://subway.city.fukuoka.lg.jp/eng/route/), [Nanakuma Line (Wikipedia)](https://en.wikipedia.org/wiki/Nanakuma_Line), [List of Fukuoka City Subway stations (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Fukuoka_City_Subway_stations), [Kushida Shrine Station (Wikipedia)](https://en.wikipedia.org/wiki/Kushida_Shrine_Station), individual station Wikipedia pages: [Hashimoto](https://en.wikipedia.org/wiki/Hashimoto_Station_(Fukuoka)), [Jirōmaru](https://en.wikipedia.org/wiki/Jir%C5%8Dmaru_Station), [Kamo](https://en.wikipedia.org/wiki/Kamo_Station_(Fukuoka)), [Noke](https://en.wikipedia.org/wiki/Noke_Station), [Umebayashi](https://en.wikipedia.org/wiki/Umebayashi_Station), [Nanakuma](https://en.wikipedia.org/wiki/Nanakuma_Station), [Kanayama](https://en.wikipedia.org/wiki/Kanayama_Station_(Fukuoka)), [Chayama](https://en.wikipedia.org/wiki/Chayama_Station_(Fukuoka)), [Befu](https://en.wikipedia.org/wiki/Befu_Station_(Fukuoka)), [Ropponmatsu](https://en.wikipedia.org/wiki/Ropponmatsu_Station), [Sakurazaka](https://en.wikipedia.org/wiki/Sakurazaka_Station), [Yakuin-ōdōri](https://en.wikipedia.org/wiki/Yakuin-%C5%8Dd%C5%8Dri_Station), [Yakuin](https://en.wikipedia.org/wiki/Yakuin_Station), [Watanabe-dōri](https://en.wikipedia.org/wiki/Watanabe-d%C5%8Dri_Station), [Tenjin-Minami](https://en.wikipedia.org/wiki/Tenjin-Minami_Station).

**Total station count: 36 unique stations**
- K-line: 13 (K01–K13)
- H-line: 7 (H01–H07)
- N-line: 18 (N01–N18)
- Shared stations (counted once): Nakasu-Kawabata (K09 / H01), Hakata (K11 / N18)
- Unique totals: 13 + 7 + 18 − 2 shared = **36 unique named stations**

JR Chikuhi through-run boundary: Meinohama (K01). JR Chikuhi operates west of Meinohama to Karatsu / Nishi-Karatsu; stations beyond K01 (Chikuzen-Maebaru, etc.) are outside D1 v1 scope (not Fukuoka City Subway metro facilities).

**Sources (overall):**
- Official Fukuoka City Subway English site: [https://subway.city.fukuoka.lg.jp/eng/](https://subway.city.fukuoka.lg.jp/eng/)
- Official Fukuoka City Subway Japanese site: [https://subway.city.fukuoka.lg.jp/](https://subway.city.fukuoka.lg.jp/)
- Official route map (PDF): [https://subway.city.fukuoka.lg.jp/eng/route/deta/map.pdf](https://subway.city.fukuoka.lg.jp/eng/route/deta/map.pdf)
- Wikipedia list (cross-check): [List of Fukuoka City Subway stations](https://en.wikipedia.org/wiki/List_of_Fukuoka_City_Subway_stations)

## Corrections (6 Sep 2026)

Station name table corrections: Tenjin code fixed K05→K08, Akasaka fixed K04→K07, Nakasu-Kawabata fixed K03/H07→K09/H01, Kaizuka terminus code fixed H01→H07; line tick count in header corrected 62→38 (K+H+N = 13+7+18). All codes verified against Wikipedia list of Fukuoka City Subway stations with official codes. Station roster table already correct and internally consistent.
