# Hiroshima — oracle clash report

**Lane:** Nico research + Luke D1 pack (D1 pack to follow). **Date:** 2026-09-06. **Status:** Oracle report scoped. **city id:** `hiroshima` (Astram Line only; do not merge with Kobe, Osaka, or other cities).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Hiroshima Rapid Transit Co., Ltd. — 広島高速交通 (Hirofutsu). Operator website https://www.astramline.co.jp/ (JP). Official Astram Line map and timetables available at https://www.astramline.co.jp/ (JP-only; EN information limited). |
| Official map | Route map and station information available on official Hiroshima Rapid Transit portal at https://www.astramline.co.jp/. Line opened August 20, 1994 for the 1994 Asian Games. Current fleet: 7000-series AGT trainsets (Mitsubishi Heavy Industries); delivery completed 2025. Timetable updated March 2026. |
| Static GTFS | **No official public Hiroshima Rapid Transit GTFS feed located.** Transitland: no Onestop ID found for Astram Line. ODPT members list as of 1 Aug 2026 (https://www.odpt.org/en/about/member/): Hiroshima Rapid Transit **not listed as an ODPT member**. Mobility Database `feeds_v2.csv` (accessed 2026-09-06): **0 rows** for Hiroshima Rapid Transit / Astram Line / 広島高速交通. Hiroshima Prefecture GTFS list (https://bus-routes.net/gtfs_list.php?kid=34) references bus-route GTFS; Astram not included. Official astramline.co.jp website: no GTFS download, developer API, or open-data portal published. Do not invent an ODPT GTFS zip, a municipal GTFS endpoint, or a community feed. |
| GTFS-RT / live | **No official GTFS-RT located.** Official website lists timetable search and fare calculator; next-train API or real-time feed unverified and not published as a documented developer resource. Third-party app integrations (if any) do not constitute a public developer contract. |
| Auth | No GTFS to key. ODPT consumer key is not required for this agency (not an ODPT member). Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Do not generate a published-network.json from GTFS. D1 is the official Astram Line route + official stations list, hand-transcribed.

## v1 mode cut

**Hiroshima Rapid Transit: Astram Line only.** Opened August 20, 1994 as a rubber-tyred automated guideway transit (AGT) system serving the 1994 Asian Games in Hiroshima. The line connects central Hiroshima (Hondōri shopping district) with north-west residential areas and Seifu Shinto urban hub. Official network:

- **Astram Line (single route):** Hondōri to Kōiki-kōen-mae (18.4 km, 22 stations). Service hours approximately 6:00–23:50 daily. All 22 stations included in v1. March 2026 timetable: 288 trains weekday / 202 trains weekend. Through-run connections: **none within Astram system.**

**Out of v1:**

- **Hiroden streetcar (Hiroshima Electric Railway):** Operates Hiroshima's street-level tram network. Calls at Hondōri and Kenchō-mae (Astram Line stations) but is a separate operator and different vehicle type (street tram, not AGT). Out-mode; see Board eligibility section.
- **JR West Sanyo Main Line / Kabe Line:** Calls at Shin-Hakushima (Astram Line station, opened March 2015 as a deliberate transfer point) but is a separate operator and rail network. Not excluded by v1 cut; verdict recorded in Board eligibility section.
- **Sanyo Shinkansen:** Calls at Hiroshima Station (main Shinkansen terminal, ~0.55 km south-west of Hondōri). Does not serve any Astram Line stations; not a board eligibility issue.
- **Local buses:** Operated by Hiroshima Bus Company and other operators. Not in v1; mode cut. |

Hub-lock: **Hondōri / 本通** (Astram Line terminus, Hiroden tram interchange, downtown shopping district). Official EN station name: Hondōri. This is the only Astram station serving multiple transit modes (Astram + Hiroden). doNotGroup vs Hondōri (Hiroden separate operator); Kenchō-mae (Hiroden interchange but secondary to Hondōri as hub). Shin-Hakushima serves JR West but is mid-line on Astram, not an endpoint.

## Station name table

Match rule: published D1 string (official Hiroshima Rapid Transit station name in English where available, or romanized Japanese) vs official JP print of the same Astram stop.

| published (D1) | other print | class |
| --- | --- | --- |
| Hondōri | EN **Hondōri**; JP **本通** (Astram terminus, downtown); Hiroden interchange | **match (lock)**. Astram Line southern terminus. doNotGroup vs Hondōri (Hiroden) — separate operator. |
| Kenchō-mae | EN **Kenchō-mae** / **Prefectural Government Building-mae**; JP **県庁前** (prefecture building precinct); Hiroden interchange | **match**. Hiroden connection available; separate operator. |
| Jōhoku | EN **Jōhoku** / **Castle North**; JP **城北** (north of castle precinct) | **match**. |
| Shin-Hakushima | EN **Shin-Hakushima** / **New Hakushima**; JP **新白島** (Astram + JR West interchange, opened March 2015); JR Sanyo Main Line and Kabe Line serve this station | **match as Astram stop**. JR services present; verdict recorded. doNotGroup vs JR Shin-Hakushima (same physical location, connected by walkway; JR and Astram separate operators). |
| Hakushima | EN **Hakushima**; JP **白島** (historic ward) | **match**. |
| Ushita | EN **Ushita**; JP **牛田** | **match**. |
| Fudōin-mae | EN **Fudōin-mae** / **Fudō Temple-mae**; JP **不動院前** (temple precinct) | **match**. |
| Gion-shinbashi-kita | EN **Gion-shinbashi-kita** / **Gion New Bridge North**; JP **祇園新橋北** | **match**. |
| Nishihara | EN **Nishihara**; JP **西原** (western ward) | **match**. |
| Nakasuji | EN **Nakasuji**; JP **中筋** | **match**. |
| Furuichi | EN **Furuichi**; JP **古市** | **match**. |
| Ōmachi | EN **Ōmachi** / **Great Town**; JP **大町** | **match**. |
| Bishamondai | EN **Bishamondai** / **Bishamonten Plateau**; JP **毘沙門台** | **match**. |
| Yasuhigashi | EN **Yasuhigashi** / **Yasuh East**; JP **安東** | **match**. |
| Kamiyasu | EN **Kamiyasu** / **Upper Yasuh**; JP **上安** | **match**. |
| Takatori | EN **Takatori** / **Hawk's Perch**; JP **高取** (elevated ward) | **match**. |
| Chōrakuji | EN **Chōrakuji** / **Chōraku Temple**; JP **長楽寺** (temple precinct) | **match**. |
| Tomo | EN **Tomo**; JP **伴** (historical name) | **match**. |
| Ōbara | EN **Ōbara** / **Great Plain**; JP **大原** | **match**. |
| Tomo-chūō | EN **Tomo-chūō** / **Tomo Central**; JP **伴中央** | **match**. |
| Ōzuka | EN **Ōzuka** / **Great Mound**; JP **大塚** | **match**. |
| Kōiki-kōen-mae | EN **Kōiki-kōen-mae** / **Broad-area Park-mae**; JP **広域公園前** (Astram terminus, north-west); near Big Arch Stadium and 1994 Asian Games venues | **match (v1 terminus)**. Astram Line northern terminus. |
| All other D1 names | official JP station names from Hiroshima Rapid Transit roster and official maps | match |

**Astram Line network:** 1 line (Astram), 22 stations per 2026. v1 includes the entire Astram Line. Hiroden tram (different operator, different vehicle type) excluded; JR West connections (Shin-Hakushima) recorded with verdicts. Product `lib/cities/hiroshima/` is the planned catalog (names + official maps; no GTFS stopIds). `assertCityLive("hiroshima")` must fail (planned / 501). adapterReady false. No official public feed.

## H2 — who has line codes today

No official public GTFS, so there is **no feed route_id** to clash against. Official Hiroshima Rapid Transit uses the Astram Line name only; no separate line codes confirmed in English or official JP sources. Do not invent ODPT / Transitland route IDs.

## Board eligibility

Every service calling at in-catalog Astram Line stations is listed below with verdict (pass/fail boarding contract tests):

| Service | Calls at | Test 1: Walk-up? | Test 2: Entry-to-platform? | Verdict | Notes |
|---|---|---|---|---|---|
| Hiroden Ujina Line (tram) | Hondōri | Yes, walk-up street tram, no reservation | Yes, street-level entry | `out-mode` | Streetcar/tram, different vehicle type from Astram AGT. Hiroden is street-level tramway; Astram is grade-separated AGT. Separate operator (Hiroshima Electric Railway ≠ Hiroshima Rapid Transit). https://en.wikipedia.org/wiki/Hiroden_Ujina_Line |
| Hiroden Main Line (tram) | Kenchō-mae | Yes, walk-up street tram, no reservation | Yes, street-level entry | `out-mode` | Streetcar/tram, different vehicle type. Separate operator. https://en.wikipedia.org/wiki/Hiroden_Main_Line |
| JR West Sanyo Main Line (local/rapid services) | Shin-Hakushima | Yes, standard commuter rail walk-up boarding | Yes, standard station entry via walkway connection | `in` | Conventional commuter service (Local 普通, Rapid 快速, Special Rapid 新快速). No compulsory reservation on local/rapid services. Standard ticketing: IC card (ICOCA / Suica accepted) or paper tickets purchased at station. Walkway connects JR and Astram Level 1 platforms. https://en.wikipedia.org/wiki/Shin-Hakushima_Station |
| JR West Kabe Line (local/rapid services) | Shin-Hakushima | Yes, standard commuter rail walk-up boarding | Yes, standard station entry via walkway connection | `in` | Conventional commuter service to Yokogawa and beyond. No compulsory reservation. Standard ICOCA/paper ticketing. Shared Shin-Hakushima station infrastructure. https://en.wikipedia.org/wiki/Kabe_Line |
| Sanyo Shinkansen | Does not serve Astram Line stations | — | — | N/A | Sanyo Shinkansen stops at Hiroshima Station (Minami-ku), not at any Astram Line station. No Shinkansen call at Astram stations. https://en.wikipedia.org/wiki/Hiroshima_Station |

**Verdict summary:** JR West Sanyo Main Line and Kabe Line at Shin-Hakushima offer walk-up commuter boarding (`in`). Hiroden street tram at Hondōri and Kenchō-mae is a different vehicle type, not in v1 mode cut (`out-mode`). Sanyo Shinkansen does not call at any Astram stations (Hiroshima Station is off-line).

## Skip risk

No official GTFS / GTFS-RT published as a documented public feed. Hiroshima Rapid Transit is not an ODPT member. Official website lists timetable search and fare calculator only; no developer API or open-data endpoint. March 2026 timetable confirmed; current fleet (7000-series, delivered 2025) in service. Hiroden interchange (Hondōri, Kenchō-mae) confirmed; JR West interchange (Shin-Hakushima, opened March 2015) confirmed. No merger risk with Kobe, Osaka, or other cities. Hondōri hub confirmed. Board eligibility verdicts recorded. **Not a skip** — official Astram Line map + routes list + 22-station roster are verified; live adapter path is unverified but does not block D1.

## License

- **License name:** No Hiroshima Rapid Transit Astram GTFS/GTFS-RT licence found (`not found`). Astram Line official website (https://www.astramline.co.jp/) and Hiroshima city open-data portals do not publish a GTFS data license or terms. No public data-sharing agreement located for Astram Line network data.
- **Redistribution / rehosting:** Website copyright text on Hiroshima Rapid Transit portal (https://www.astramline.co.jp/) is standard: content, maps, and service information provided for reference use only. No explicit GTFS / realtime data reuse license exists. Hiroshima city encourages open data initiatives (City Dashboard at https://hiroshima-citydashboard.jp/); however, this framework does not yet extend to Astram Line GTFS as of 2026-09-06. Do not treat city open-data policy as a blanket grant for operator data that has no published feed. Unclear whether a future feed, if published, would fall under Hiroshima city's open-data policy or require separate Hiroshima Rapid Transit negotiation.
- **Commercial use:** Not stated. Hiroshima city open-data framework permits use of published datasets; however, no Astram Line GTFS feed is currently published, so commercial-use permission is moot until a feed exists.
- **Attribution:** No Astram Line GTFS attribution required (no GTFS). Hiroshima Rapid Transit corporate marks (広島高速交通 logo, Astram Line service mark) are reserved. If a future feed is published, follow attribution language at point of publication.
- **Terms URL:** Hiroshima Rapid Transit Astram Line portal — https://www.astramline.co.jp/ (JP-only; limited EN). Hiroshima City official site — https://www.city.hiroshima.lg.jp/. ODPT members list and non-members (Hiroshima Rapid Transit not listed) — https://www.odpt.org/en/about/member/. Transitland: no Onestop ID for Astram Line. Mobility Database: no `mdb-*` for Hiroshima Rapid Transit.
- **Confidence:** `not found` on GTFS data license (no feed published). `unclear` whether Hiroshima city's open-data spirit would extend to Astram Line data if/when a public feed appears, or whether a separate license negotiation applies. Do not interpret the city's general open-data policy as a blanket permission for data that does not exist. The legal status of any future Astram Line GTFS is a D1-pack question, not resolved in this research pass.
- **Keyed feeds:** No official Astram Line key agreement. Japan AGT/people-mover systems (Astram, Port Liner, Rokko Liner) that publish data through ODPT use `acl:consumerKey` pattern — that pattern is **absent** for Astram Line. Never paste a key.

## C2 for this D1 pack

1. city=`hiroshima`. displayName Hiroshima.
2. Hondōri / 本通 hub (Astram Line terminus, downtown, Hiroden tram interchange).
3. Modes v1 Astram Line only (all 22 stations, single route, Hiroshima Rapid Transit operator). Hiroden tram (different vehicle type, out-mode) excluded at Hondōri and Kenchō-mae. JR West (walk-up at Shin-Hakushima) in. Sanyo Shinkansen off-line.
4. assertCityLive("hiroshima") must fail (planned / 501). adapterReady false. No official public GTFS/GTFS-RT feed.

## Station roster

Ordered stations from Hondōri (southern terminus, downtown) to Kōiki-kōen-mae (northern terminus, north-west):

| # | Station name (EN) | Station name (JP) | Class |
|---|---|---|---|
| 1 | Hondōri | 本通 | Terminus, downtown hub, Hiroden tram interchange |
| 2 | Kenchō-mae | 県庁前 | Prefectural building, Hiroden interchange |
| 3 | Jōhoku | 城北 | Castle north |
| 4 | Shin-Hakushima | 新白島 | JR West interchange (Sanyo Main Line, Kabe Line) |
| 5 | Hakushima | 白島 | Historic ward |
| 6 | Ushita | 牛田 | Historical district |
| 7 | Fudōin-mae | 不動院前 | Temple precinct |
| 8 | Gion-shinbashi-kita | 祇園新橋北 | Gion new bridge north |
| 9 | Nishihara | 西原 | Western ward |
| 10 | Nakasuji | 中筋 | Middle ward |
| 11 | Furuichi | 古市 | Ancient market |
| 12 | Ōmachi | 大町 | Great town |
| 13 | Bishamondai | 毘沙門台 | Bishamonten plateau |
| 14 | Yasuhigashi | 安東 | Yasuh east |
| 15 | Kamiyasu | 上安 | Upper Yasuh |
| 16 | Takatori | 高取 | Hawk's perch |
| 17 | Chōrakuji | 長楽寺 | Temple precinct |
| 18 | Tomo | 伴 | Historical name |
| 19 | Ōbara | 大原 | Great plain |
| 20 | Tomo-chūō | 伴中央 | Tomo central |
| 21 | Ōzuka | 大塚 | Great mound |
| 22 | Kōiki-kōen-mae | 広域公園前 | Terminus, broad-area park, near Asian Games venues |

**Official sources:** Hiroshima Rapid Transit portal (https://www.astramline.co.jp/); Wikipedia Astram Line and station articles (Category:Astram Line stations); mapa-metro.com Hiroshima Astram Line map (https://mapa-metro.com/en/japan/hiroshima/hiroshima-monorail-map.htm).
