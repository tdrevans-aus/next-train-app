# Nagoya — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack pending. **city id:** `nagoya` (do not invent `nagoya-metro`, `nagoya-subway`, `ngy`, or merge into Osaka / Tokyo / Keihanshin).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Nagoya City Transportation Bureau — 名古屋市交通局 (Nagoya Municipal Subway / 名古屋市営地下鉄). Rider site https://www.kotsu.city.nagoya.jp/ . Six subway lines and 87 stations. Daily ridership 1,263,018 (FY 2024). |
| Official map | No dedicated official route map PDF found on main site as of 2026-09-06 (unlike Osaka's published 路線図). Transit info portal — https://www.kotsu.city.nagoya.jp/rp/route/ . Station list by line available via rider site. |
| Static GTFS | **No official Nagoya Metro subway GTFS found.** Transitland: no Onestop for Nagoya Metro / 名古屋市営地下鉄 / Nagoya City Transportation Bureau. Mobility Database `feeds_v2.csv` downloaded 2026-08-29: **0 rows** for Nagoya Prefecture / Nagoya municipality / Nagoya Metro. ODPT members list (as of 2 Sep 2026, https://www.odpt.org/en/about/member/): **no Nagoya** (Osaka Metro also absent; Tokyo Metro present). City open-data landing — Nagoya open data catalog was centralized 2025-11 from historical city transportation bureau site per Japanese municipal data consolidation. Do not invent a zip on Nagoya City Transportation Bureau or ODPT. |
| GTFS-RT / live | **No official GTFS-RT.** Rider site https://www.kotsu.city.nagoya.jp/ prints no developer documentation for real-time data feeds. Unpublished app backends are not a product contract. Do not treat empty-key 403 on invented paths as proof a Metro RT feed exists. |
| Auth | No official Metro GTFS to key. ODPT consumer key is **not applicable** — Nagoya is not an ODPT member. Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official subway six-line set + official station names from the rider site, hand-transcribed.

## v1 mode cut

**Nagoya Municipal Subway only:** official six subway lines per the rider site and historical opening dates — **Higashiyama** (H; opened 1957), **Meijo** (M; opened 1965; loop line), **Meiko** (E; opened 1971; branch Kanayama–Nagoya Port), **Tsurumai** (T; opened 1977), **Sakura-dori** (S; opened 1989), **Kamiiida** (K; opened 2003; 0.8 km link to Meitetsu Komaki Line north). JP print: 東山線 / 名城線 / 名港線 / つるまい線 / 桜通線 / 上飯田線.

**Out:** Meitetsu lines (Meitetsu Seto Line at Sakaemachi Station near Sakae; Meitetsu Komaki Line through Kamiiida as through-run beyond Kamiiida; Meitetsu main line and others); JR (Tokaido Main Line, Chuo Line, and others at Nagoya Station and Kanayama Station); Aonami Line (automatic people mover, separate operator); Nagoya Municipal Bus; tram (no tram in Nagoya); any private rail beyond through-run stops.

Hub lock: **Sakae / 栄** (M05 Meijo × H10 Higashiyama). Official transfers on rider site: Meijo M05 and Higashiyama H10 only at this physical station. Underground connected to **Hisaya-odori / 久屋大通** (M06 Meijo × S05 Sakura-dori), giving access to three major subway lines (Meijo, Higashiyama, Sakura-dori) via one interchange complex. Also connected underground to Sakaemachi (Meitetsu Seto Line), which is **out of v1**. **Not** Nagoya Station (entry point, multi-operator hub with JR/Meitetsu), **not** Kanayama (Meijo hub, also JR/Meitetsu, eastern anchor of loop), **not** Imaike (Higashiyama × Sakura-dori, east of hub), **not** Aratama-bashi (Meijo × Sakura-dori, south loop). doNotGroup Sakae vs Hisaya-odori vs Nagoya Station vs Kanayama vs Sakaemachi (Meitetsu).

## Station name table

Match rule: published D1 string (official EN rider site / official JP print of the same Metro stop) vs Meitetsu / JR / through-run print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Sakae | EN **Sakae** H10 / M05; JP **栄**; official transfers H10 + M05 only | **match (lock)**. Do not use Sakaemachi (Meitetsu Seto Line, different station). Not Hisaya-odori (underground connection, separate physical station). |
| Hisaya-odori | EN **Hisaya-odori** M06 / S05; JP **久屋大通**; underground connected to Sakae | **match**. Underground complex with Sakae. doNotGroup vs Sakae. |
| Nagoya | EN **Nagoya** S02 (on Sakura-dori); JP **名古屋**; also JR Tokaido / Shinkansen / Meitetsu main line | **match Metro**. doNotGroup vs JR Nagoya / Meitetsu Nagoya. Entry point, hub for intercity rail — not D1 lock. |
| Kanayama | EN **Kanayama** M01 / E00 / (Meiko); JP **金山**; also JR Tokaido / Chuo; Meietsu direct line | **match Metro**. Meijo loop anchor / Meiko branch origin. doNotGroup vs JR Kanayama / Meitetsu Kanayama. Eastern hub; not the city lock. |
| Imaike | EN **Imaike** H12 / S08; JP **今池**; Higashiyama × Sakura-dori transfer | **match**. East of hub, not the lock. |
| Aratama-bashi | EN **Aratama-bashi** M07 / S06; JP **荒畔橋**; Meijo × Sakura-dori transfer (south loop) | **match**. South loop interchange; not the lock. |
| Kamiiida | EN **Kamiiida** K02 (terminal); JP **上飯田**; Kamiiida Line, Meitetsu Komaki Line through-run | **match Metro**. Kamiiida Line v1 terminus. Meitetsu through-run beyond is out. |
| Heian-dori | EN **Heian-dori** K01 / M25 (Meijo loop); JP **平安通**; Kamiiida × Meijo transfer | **match**. Kamiiida Line origin, Meijo loop connection. |
| Nagoya Port / Nagoyako | EN **Nagoyakō** E07 (Meiko terminal); JP **名古屋港**; Meiko Line terminal | **match. Meiko south terminus.** |
| Kanayama (Meiko) | EN **Kanayama** E00 (Meiko branch origin); JP **金山** (Meiko designation); same place as Meijo M01 | **match as Meiko branch terminus.** Same physical station as Meijo M01. Both lines serve here. |
| All other D1 names | same official EN rider-site title / official JP station name | match |

**87** unique D1 stations (per official count). **Six subway lines + branch.** Product `lib/cities/nagoya/` is the planned catalog (names + official codes only; no GTFS stopIds). `assertCityLive("nagoya")` must fail (planned / 501).

## H2 — who has line codes today

No official public GTFS, so there is **no feed route_id** to clash against. Official passenger designations are the roman letters and colors **H / M / E / T / S / K** from maps and posted at platform. Do not invent ODPT / Transitland route ids or Meitetsu/JR codes for a Nagoya Metro D1.

## Skip risk

Meitetsu Seto Line at Sakaemachi (connected underground to Sakae, but is Meitetsu — **out**); Meitetsu Komaki Line through-running via Kamiiida beyond K02 (connection at K01 Heian-dori is Meijo, not Kamiiida — through-run is out); JR stations at Nagoya / Kanayama name-family folded into Meijo/Sakura-dori (confirmed separate on rider site — doNotGroup enforced); Aonami Line branded as "Metro" in casual English (it is not; separate operator); inventing city=`nagoya-metro` / `ngy` / other slugs or merging into Tokyo / Osaka / Keihanshin; inventing an ODPT GTFS because Tokyo Metro has one. **No official public GTFS / GTFS-RT** — live path is unverified; that is tracker friction for a later adapter, not a missing map. Official six-line set + station names from rider site are verified. Not a skip.

## Board eligibility

No services other than Nagoya Metropolitan Subway (six lines, 87 stations) call at any in-catalog station — verified. Meitetsu Seto Line at Sakaemachi and Meitetsu Komaki Line beyond Kamiiida are excluded `out-mode` (different operator + different product). JR Tokaido, Chuo, and other lines at Nagoya and Kanayama stations are excluded `out-product` (v1 scope is Nagoya Metro subway only; JR is a separate city-wide network). Aonami Line is excluded `out-mode` (distinct operator and automated people-mover technology, not subway). No walk-up long-distance / compulsory reservation / check-in barriers within Nagoya Metro scope.

| Service | Lines | Verdict | Evidence |
| --- | --- | --- | --- |
| Nagoya Municipal Subway — six lines | H / M / E / T / S / K (all 87 stations) | `in` | https://www.kotsu.city.nagoya.jp/ rider site; walk-up boarding; no reservation |
| Meitetsu Seto Line | at Sakaemachi only (outside central metro zone) | `out-mode` | Different operator; private rail product |
| Meitetsu Komaki Line | connects K01 Heian-dori via through-run past K02 Kamiiida | `out-mode` | Different operator; v1 cut at Kamiiida K02 |
| JR (Tokaido / Chuo / others) | call at Nagoya S02 / Kanayama M01 / E00 | `out-product` | Different operator; v1 scope Metro only |
| Aonami Line (Linimo) | none in v1 scope | `out-mode` | Different operator; automated people mover, not subway |

## License

- **License name:** No Nagoya Metro GTFS/GTFS-RT licence found (`not found`). Similar to Osaka Metro (also non-ODPT), the only published reuse text is the rider-site copyright. ODPT **Public Transportation Open Data Basic License** does **not** apply here; Nagoya Metro is not an ODPT member as of 2 Sep 2026.
- **Redistribution / rehosting:** Website terms on Nagoya City Transportation Bureau site (https://www.kotsu.city.nagoya.jp/ — look for サイト情報 / Site Information): copyright notice appears on municipal pages; specific reuse terms not yet fetched due to site redirects (Nov 2025 data consolidation). Do not treat absence of an explicit reuse grant as permission. Historical pattern matches Osaka: a non-ODPT metro requires prior consultation for reuse beyond personal use.
- **Commercial use:** Unclear. Metro site does not publish a data-reuse license. Website copyright holders (Nagoya City Transportation Bureau) would need to be consulted for any commercial reuse of timetables or network data.
- **Attribution:** No GTFS / data license = no required attribution wording for a feed that does not exist. Trademarks: Nagoya Metropolitan Subway and line names are trademarks.
- **Terms URL:** Nagoya City Transportation Bureau main site — https://www.kotsu.city.nagoya.jp/ . Transit info portal — https://www.kotsu.city.nagoya.jp/rp/route/ . City open data consolidated portal (as of Nov 2025, replacing historical data.city.nagoya.lg.jp). ODPT members list — https://www.odpt.org/en/about/member/ (confirms non-membership as of 2 Sep 2026). Transitland: no Onestop to cite. Mobility Database: no `mdb-*` for Nagoya Metro. Japanese public transport data format (GTFS-JP) initiative includes Nagoya City per gov.mlit.go.jp but no active Nagoya Metro feed found.
- **Confidence:** `not found` on a Metro GTFS/GTFS-RT data licence; `clear` that no official feed exists and that ODPT does not include this operator; `unclear` whether a future unpublished live API would be licensable — do not interpret as allowed. Pattern is identical to Osaka: municipal metro, non-ODPT, no public feed, website copyright is the only published term.
- **Keyed feeds:** No official Nagoya Metro key agreement, because no official Metro feed. Japan subway GTFS that *does* exist (Tokyo Metro / Toei) is ODPT `acl:consumerKey` — that pattern is verified for those cities and **absent** here. Never paste a key.

## C2 for this D1 pack

1. city=`nagoya`. displayName Nagoya.
2. Sakae / 栄 hub, underground connected to Hisaya-odori. doNotGroup Sakaemachi (Meitetsu) / Nagoya Station (JR/Meitetsu) / Kanayama (JR/Meitetsu/Meiko loop anchor).
3. Modes v1 Nagoya Municipal Subway only (Higashiyama, Meijo, Meiko, Tsurumai, Sakura-dori, Kamiiida). Meitetsu / JR / Aonami out. Meitetsu through-run at Kamiiida beyond K02 out.
4. assertCityLive("nagoya") must fail (planned / 501). adapterReady false. No official public feed.

## Station roster (D1 transcription, 6 Sep 2026)

**Overview:** Nagoya Municipal Subway operates six lines and 87 unique stations total. One short connecting line (Kamiiida) links to Meitetsu's Komaki Line via through-service. Official line color codes (H yellow, M purple, E red, T blue, S pink, K green) are printed on all maps and platform signage. Station numbers follow the pattern *[Line Letter][2-digit code]*, e.g. H01 Takabata, M05 Sakae. Interchange stations (same platform, direct transfer) appear in the table below under "Interchanges." Through-running does not extend service; the Kamiiida Line's two stations are Nagoya Metro property; Meitetsu service beyond this line is excluded from v1 scope.

### Higashiyama Line (H) — Takabata to Fujigaoka

**Termini:** H01 Takabata (west, Nakagawa Ward) ← → H22 Fujigaoka (east, Meitō Ward). 22 stations, all within Nagoya city. Opened 1957.

**Interchanges:** Sakae (H10 / M05), Fushimi (H09 / T07), Imaike (H13 / S08), Motoyama (H16 / M17).

**Stations:**

| Code | English | Japanese | Notes |
|------|---------|----------|-------|
| H01 | Takabata | 高畑 | Western terminus |
| H02 | Hatta | 八田 | |
| H03 | Iwatsuka | 岩塚 | |
| H04 | Nakamura Kōen | 中村公園 | |
| H05 | Nakamura Nisseki | 中村日赤 | |
| H06 | Honjin | 本陣 | |
| H07 | Kamejima | 亀島 | |
| H08 | Nagoya | 名古屋 | Connects to JR, Meitetsu, Sakura-dori S02 |
| H09 | Fushimi | 伏見 | Interchange with Tsurumai T07 |
| H10 | Sakae | 栄 | **Hub lock.** Interchange with Meijo M05. Underground to Hisaya-odori. |
| H11 | Shinsakae-machi | 新栄町 | |
| H12 | Chikusa | 千種 | |
| H13 | Imaike | 今池 | Interchange with Sakura-dori S08 |
| H14 | Ikeshita | 池下 | |
| H15 | Kakuozan | 覚王山 | |
| H16 | Motoyama | 本山 | Interchange with Meijo M17 |
| H17 | Higashiyama Kōen | 東山公園 | |
| H18 | Hoshigaoka | 星ヶ丘 | |
| H19 | Issha | 一社 | |
| H20 | Kamiyashiro | 上社 | |
| H21 | Hongō | 本郷 | |
| H22 | Fujigaoka | 藤が丘 | Eastern terminus |

**Source:** [Higashiyama Line — Wikipedia](https://en.wikipedia.org/wiki/Higashiyama_Line) and [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations).

---

### Meijō Line (M) — Loop (Kanayama north through Sakae, Ōzone, Nagoya University, south back to Kanayama)

**Loop configuration:** M01 Kanayama (start/end point) → M02–M27 → M28 Nishi Takakura (final station before loop closes back to M01). 28 stations total. Loop runs anticlockwise (when viewed on standard map orientation). Travel time: 48 minutes per full loop. Opened 1965.

**Interchanges:** Kanayama (M01 / E01 Meiko branch origin; JR Tokaido, Chuo; Meitetsu Nagoya Line), Sakae (M05 / H10 hub lock), Hisaya-odori (M06 / S05 Sakura-dori), Kamimaezu (M03 / T09 Tsurumai), Motoyama (M17 / H16 Higashiyama), Yagoto (M20 / T15 Tsurumai), Aratama-bashi (M23 / S14 Sakura-dori), Heian-dori (M11 / K02 Kamiiida; also noted as M25 in some historical references but confirmed M11).

**Stations:**

| Code | English | Japanese | Notes |
|------|---------|----------|-------|
| M01 | Kanayama | 金山 | Loop start/end. Meiko E01 junction. JR Tokaido/Chuo, Meitetsu link. |
| M02 | Higashi Betsuin | 東別院 | |
| M03 | Kamimaezu | 上前津 | Interchange with Tsurumai T09 |
| M04 | Yabachō | 矢場町 | |
| M05 | Sakae | 栄 | **Hub lock.** Interchange with Higashiyama H10. Underground to Hisaya-odori. |
| M06 | Hisaya-ōdōri | 久屋大通 | Interchange with Sakura-dori S05. Underground complex with Sakae. |
| M07 | Nagoyajo | 名古屋城 | |
| M08 | Meijo Koen | 名城公園 | |
| M09 | Kurokawa | 黒川 | |
| M10 | Shiga-hondōri | 志賀本通 | |
| M11 | Heian-dori | 平安通 | Interchange with Kamiiida K02 |
| M12 | Ōzone | 大曽根 | Northern loop point. Meitetsu Seto Line connection (out of v1). |
| M13 | Nagoya Dome-mae Yada | ナゴヤドーム前矢田 | |
| M14 | Sunadabashi | 砂田橋 | |
| M15 | Chayagasaka | 茶屋ヶ坂 | |
| M16 | Jiyugaoka | 自由ヶ丘 | |
| M17 | Motoyama | 本山 | Interchange with Higashiyama H16 |
| M18 | Nagoya Daigaku | 名古屋大学 | Northern loop apex |
| M19 | Yagoto Nisseki | 八事日赤 | |
| M20 | Yagoto | 八事 | Interchange with Tsurumai T15 |
| M21 | Sogo Rihabiri Center | 総合リハビリセンター | |
| M22 | Mizuho Undojo Higashi | 瑞穂運動場東 | |
| M23 | Aratama-bashi | 新瑞橋 | Interchange with Sakura-dori S14 |
| M24 | Myoon-dori | 妙音通 | |
| M25 | Horita | 堀田 | Southern loop area |
| M26 | Atsuta Jingu Tenma-cho | 熱田神宮伝馬町 | |
| M27 | Atsuta Jingu Nishi | 熱田神宮西 | |
| M28 | Nishi Takakura | 西高蔵 | Final station; loop closes back to M01 |

**Source:** [Meijō Line — Wikipedia](https://en.wikipedia.org/wiki/Meij%C5%8D_Line) and [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations).

---

### Meikō Line (E) — Kanayama to Nagoya Port (branch off Meijo loop)

**Configuration:** E01 Kanayama (junction with Meijo M01) to E07 Nagoyakō (Nagoya Port, southern terminus). 7 stations total. Branch line serving port area and southern Nagoya. Opened 1971. Roughly every other anticlockwise Meijo loop train diverts here rather than continuing to Nagoya Daigaku; integrated service.

**Interchanges:** Kanayama (E01 / M01 / JR Tokaido, Chuo / Meitetsu).

**Stations:**

| Code | English | Japanese | Notes |
|------|---------|----------|-------|
| E01 | Kanayama | 金山 | Junction with Meijo M01. Same physical station. |
| E02 | Hibino | 日比野 | |
| E03 | Rokuban-chō | 六番町 | Crosses Tokaido Main Line |
| E04 | Tōkai-dōri | 東海通 | |
| E05 | Minato Kuyakusho | 港区役所 | |
| E06 | Tsukijiguchi | 築地口 | |
| E07 | Nagoyakō | 名古屋港 | Southern terminus. Nagoya Port district. |

**Source:** [Meikō Line — Wikipedia](https://en.wikipedia.org/wiki/Meik%C5%8D_Line) and [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations).

---

### Tsurumai Line (T) — Kami Otai to Akaike

**Termini:** T01 Kami Otai (north, Nishi Ward, Nagoya) ← → T20 Akaike (south, Nisshin city, outside Nagoya). 20 stations. Opened 1977. Only Nagoya Metro line to extend beyond city limits.

**Through-running:** Direct service to Meitetsu Inuyama Line (at Kami Otai T01), Meitetsu Toyota Line (at Akaike T20), and Meitetsu Mikawa Line (at Akaike). Meitetsu through-run is excluded from v1 scope; v1 stops at line termini.

**Interchanges:** Fushimi (T07 / H09 Higashiyama), Kamimaezu (T09 / M03 Meijo), Marunouchi (T06 / S04 Sakura-dori), Gokiso (T12 / S10 Sakura-dori), Yagoto (T15 / M20 Meijo).

**Stations:**

| Code | English | Japanese | Notes |
|------|---------|----------|-------|
| T01 | Kami Otai | 上小田井 | Northern terminus. Meitetsu Inuyama Line through-run (out of v1). |
| T02 | Shonai Ryokuchi Koen | 庄内緑地公園 | |
| T03 | Shonai-dori | 庄内通 | |
| T04 | Joshin | 浄心 | |
| T05 | Sengen-cho | 浅間町 | |
| T06 | Marunouchi | 丸の内 | Interchange with Sakura-dori S04 |
| T07 | Fushimi | 伏見 | Interchange with Higashiyama H09 |
| T08 | Osu Kannon | 大須観音 | |
| T09 | Kamimaezu | 上前津 | Interchange with Meijo M03 |
| T10 | Tsurumai | 鶴舞 | Line namesake station |
| T11 | Arahata | 荒畑 | |
| T12 | Gokiso | 御器所 | Interchange with Sakura-dori S10 |
| T13 | Kawana | 川名 | |
| T14 | Irinaka | いりなか | |
| T15 | Yagoto | 八事 | Interchange with Meijo M20 |
| T16 | Shiogama-guchi | 塩釜口 | |
| T17 | Ueda | 植田 | |
| T18 | Hara | 原 | |
| T19 | Hirabari | 平針 | |
| T20 | Akaike | 赤池 | Southern terminus (outside Nagoya city). Meitetsu Toyota/Mikawa Line through-run (out of v1). |

**Source:** [Tsurumai Line — Wikipedia](https://en.wikipedia.org/wiki/Tsurumai_Line) and [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations).

---

### Sakura-dōri Line (S) — Taiko-dori to Nonami (and extensions planned)

**Termini:** S01 Taiko-dori (west, Nakamura Ward) ← → S17 Nonami (east, Midori Ward). 17 stations. Opened 1989. Line passes through central Nagoya hub (Nagoya Station S02).

**Future extensions noted:** Plans exist for connections at Takaoka (to Kamiiida Line), Fukiage (to Tōbu Line), and Sakura-hommachi (to Nambu Line), but these have not been completed as of 2026-09-06.

**Interchanges:** Nagoya (S02 / H08 Higashiyama; JR Tokaido, Shinkansen; Meitetsu, Aonami out of v1), Marunouchi (S04 / T06 Tsurumai), Hisaya-ōdōri (S05 / M06 Meijo; underground complex with Sakae), Imaike (S08 / H13 Higashiyama), Gokiso (S10 / T12 Tsurumai), Aratamabashi (S14 / M23 Meijo).

**Stations:**

| Code | English | Japanese | Notes |
|------|---------|----------|-------|
| S01 | Taiko-dori | 太閤通 | Western terminus |
| S02 | Nagoya | 名古屋 | Connects to JR Tokaido/Shinkansen, Meitetsu, Higashiyama H08 |
| S03 | Kokusai Center | 国際センター | International Center |
| S04 | Marunouchi | 丸の内 | Interchange with Tsurumai T06 |
| S05 | Hisaya-ōdōri | 久屋大通 | Interchange with Meijo M06. Underground complex with Sakae/H10. |
| S06 | Takaoka | 高岳 | (Future Kamiiida extension planned but not completed) |
| S07 | Kurumamichi | 車道 | |
| S08 | Imaike | 今池 | Interchange with Higashiyama H13 |
| S09 | Fukiage | 吹上 | (Future Tōbu Line connection planned but not completed) |
| S10 | Gokiso | 御器所 | Interchange with Tsurumai T12 |
| S11 | Sakurayama | 桜山 | (Near but separate from Tsurumai T15 Yagoto) |
| S12 | Mizuho Kuyakusho | 瑞穂区役所 | |
| S13 | Mizuho Undojo Nishi | 瑞穂運動所西 | |
| S14 | Aratamabashi | 新瑞橋 | Interchange with Meijo M23 |
| S15 | Sakura-hommachi | 桜本町 | (Future Nambu Line connection planned but not completed) |
| S16 | Tsurusato | 鶴里 | |
| S17 | Nonami | 野並 | Eastern terminus |

**Source:** [Sakura-dōri Line — Wikipedia](https://en.wikipedia.org/wiki/Sakura-d%C5%8Dri_Line) and [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations).

---

### Kamiiida Line (K) — Kamiiida to Heian-dori (short connecting line)

**Configuration:** K01 Kamiiida (north) ← → K02 Heian-dori (south). 2 stations total. Only 0.8 km long. Opened 27 March 2003. Shortest subway line in Japan by station count.

**Through-running:** Direct through-service to Meitetsu Komaki Line at Kamiiida station. Through trains continue to Komaki and Inuyama stations on Meitetsu network. Meitetsu through-run is excluded from v1 scope; v1 stops at Kamiiida K01.

**Interchanges:** Heian-dori (K02 / M11 Meijo; no direct platform transfer but underground passage).

**Stations:**

| Code | English | Japanese | Notes |
|------|---------|----------|-------|
| K01 | Kamiiida | 上飯田 | Northern terminus. Meitetsu Komaki Line through-run begins here (out of v1). |
| K02 | Heian-dori | 平安通 | Southern terminus. Interchange with Meijo M11 via underground passage. Also M25 in some historical docs but confirmed M11. |

**Source:** [Kamiiida Line — Wikipedia](https://en.wikipedia.org/wiki/Kamiiida_Line) and [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations).

---

### Summary

**Total unique stations:** 87 (per Nagoya City Transportation Bureau official count).

**Station count by line:**
- Higashiyama H: 22
- Meijō M: 28
- Meikō E: 7
- Tsurumai T: 20
- Sakura-dōri S: 17
- Kamiiida K: 2

**Stations appearing on multiple lines (interchanges):** Sakae (H10/M05), Fushimi (H09/T07), Imaike (H13/S08), Motoyama (H16/M17), Hisaya-ōdōri (M06/S05), Kamimaezu (M03/T09), Yagoto (M20/T15), Aratama-bashi (M23/S14), Marunouchi (T06/S04), Gokiso (T12/S10), Kanayama (M01/E01), Heian-dori (M11/K02), Nagoya (H08/S02). **Total unique interchange stations: 13.** All station numbers and names confirmed from official Nagoya City Transportation Bureau rider site and Wikipedia comprehensive station list (fetched 6 Sep 2026).

---

**Research sources:**
- [List of Nagoya Municipal Subway stations — Wikipedia](https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations)
- [Higashiyama Line — Wikipedia](https://en.wikipedia.org/wiki/Higashiyama_Line)
- [Meijō Line — Wikipedia](https://en.wikipedia.org/wiki/Meij%C5%8D_Line)
- [Meikō Line — Wikipedia](https://en.wikipedia.org/wiki/Meik%C5%8D_Line)
- [Tsurumai Line — Wikipedia](https://en.wikipedia.org/wiki/Tsurumai_Line)
- [Sakura-dōri Line — Wikipedia](https://en.wikipedia.org/wiki/Sakura-d%C5%8Dri_Line)
- [Kamiiida Line — Wikipedia](https://en.wikipedia.org/wiki/Kamiiida_Line)
- [Nagoya City Transportation Bureau rider site](https://www.kotsu.city.nagoya.jp/)
