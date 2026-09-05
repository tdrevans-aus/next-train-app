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
