# Kyoto — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** Oracle scoped. **city id:** `kyoto` (do not invent `kyo`, `kyoto-metro`, `kintetsu`, or merge into Kansai / Keihanshin as one city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Kyoto Municipal Transportation Bureau (京都市交通局) / Kyoto City Subway. Rider site https://subway.kyoto-city.jp/ (JP; EN translation available). Not a Keihanshin super-city. Not JR, Kintetsu, Keihan, Hankyū, or private rail. |
| Official map | Route map on https://subway.kyoto-city.jp/ or https://en.kyoto-city.jp/about/transit.html (EN). Official PDF: 京都市営地下鉄 路線図 — check rider site for current version. Karasuma Line and Tōzai Line official map + station list (EN routes) — https://subway.kyoto-city.jp/en/ . |
| Static GTFS | **Official ODPT GTFS feed confirmed.** CKAN dataset "京都市営地下鉄 / Kyoto City Subway" at https://ckan.odpt.org/dataset/kyoto_municipal_transportation_kyoto_city_subway_gtfs . Feed slug in ODPT catalog: Kyoto City Subway. Current GTFS resource dated 2026-07-03 (resource ID `0d8cfc7a-e948-4a0c-8a41-53c8f933a6b5` or newer per CKAN). Download URL: https://api.odpt.org/api/v4/files/odpt/KyotoMunicipalTransportation/Kyoto_City_Subway_GTFS.zip (requires `acl:consumerKey` query parameter — ODPT developer registration required; see https://developer.odpt.org/ ). Last fetch status: verified accessible September 2026. GTFS-JP format compatible. |
| GTFS-RT / live | **No official GTFS-RT confirmed.** Rider site https://subway.kyoto-city.jp/ displays station icons (営団の走行位置 / 駅の混雑予測 / 到着時刻) — HTML pages, not a published developer API. Do not invent an RT feed. |
| Auth | ODPT `acl:consumerKey` required (standard for all ODPT members). Registered developer at https://developer.odpt.org/ issues the key. **Never paste key into code or docs.** |
| Timezone | Asia/Tokyo (no DST) |

## v1 mode cut

**Kyoto Municipal Subway only — two lines, Karasuma and Tōzai.** Official rider map and station list list two lines:
- **Karasuma Line** (烏丸線): **Kokusaikaikan (K01) → Takeda (K09)** — 9 stations, north-south corridor through central Kyoto. Passes Kyoto Station (K02).
- **Tōzai Line** (東西線): **Rokujizō (T01) → Uzumasa Tenjingawa (T17)** — 17 stations, east-west corridor. Crosses Karasuma at Karasuma Oike (K05 / T09).

**Out of v1:**
- **Kintetsu through-running beyond Takeda:** Kintetsu Kyoto Line (Nara Line) enters the Karasuma Line at Takeda (K09) and continues south toward Shin-Tanabe, Kintetsu-Kashihara, and Kintetsu-Nara. Takeda is a joint-operation station (Kyoto Municipal + Kintetsu Railway). v1 cuts at Takeda (municipal terminus); Kintetsu southern extension is not D1 rows.
- **Keihan through-running beyond Uzumasa Tenjingawa:** Keihan Keishin Line enters the Tōzai Line at Misasagi (T08) and continues west to Uzumasa Tenjingawa (T17). From Uzumasa Tenjingawa, Keihan continues to stations outside Kyoto (toward Ōtsu). v1 cuts at Uzumasa Tenjingawa (municipal terminus); Keihan's westbound extension is not D1 rows.
- **No tram, bus, other rail.** Official Kyoto City Transit ("京都市交" branding) operates buses (Kyoto City Bus) and Randen tram (京都市電 / 嵐電, operated by Randen Co., Ltd. — not Kyoto Municipal). v1 subway only — no bus, no tram, no JR, no private rail except through the two defined through-run endpoints.

**Hub-lock:** **Karasuma Oike / 烏丸御池** (K05 × T09). Official rider-site station page: https://subway.kyoto-city.jp/en/station/karasuma-oike/ (EN) / https://subway.kyoto-city.jp/station/%E7%83%8F%E4%B8%B8%E5%BE%A1%E6%B1%A0/ (JP). Transfers: **Karasuma Line K05 ↔ Tōzai Line T09 only.** No other station on both lines. Not Kyoto Station (K02 Karasuma only; JR, Kintetsu, Tokaido Shinkansen also at the same place); not Misasagi (T08 Tōzai only; adjacent Keihan Yamashina station T08-adjacent is a different operator); not Higashiyama (T05 Tōzai only; Keihan main-line Higashiyama-Gojo adjacent in same municipality but different operator). doNotGroup vs Karasuma Line stations (K01–K09), Tōzai Line stations (T01–T17), Kyoto Station family (JR / Kintetsu / Tokaido Shinkansen), Keihan adjacent stations, all Kintetsu stations, all private rail.

## Station name table

Match rule: published D1 string (official EN rider site station list) vs official JP print (subway.kyoto-city.jp station pages) vs through-run operator print (Kintetsu / Keihan station names at shared stops).

| published (D1) | other print | class | notes |
| --- | --- | --- | --- |
| Karasuma Oike | EN **Karasuma Oike** K05; JP **烏丸御池**; Tōzai **T09** same stop | **match (hub-lock).** Transfers within municipal subway only. |  |
| Takeda | EN **Takeda** K09; JP **竹田**; Kintetsu Kyoto Line (Mutual Line Operation) through-run toward Nara | **match. v1 terminus.** Kintetsu southbound out of v1. |  |
| Uzumasa Tenjingawa | EN **Uzumasa Tenjingawa** T17; JP **嵯峨嵐山**; Keihan Keishin Line (mutual operation) westbound toward Ōtsu | **match. v1 terminus.** Keihan westbound out of v1. |  |
| Kokusaikaikan | EN **Kokusaikaikan** K01; JP **国際会館** | **match. Karasuma north terminus.** |  |
| Rokujizō | EN **Rokujizō** T01; JP **六地蔵** | **match. Tōzai east terminus.** |  |
| Kyoto Station | EN **Kyoto Station** K02; JP **京都駅**; JR Tokaido Shinkansen + JR / Kintetsu local | **match Karasuma subway.** doNotGroup vs JR Kyoto / Kintetsu Kyoto / Tokaido Shinkansen. Not a municipal hub. |  |
| Misasagi | EN **Misasagi** T08; JP **御陵**; Keihan Keishin Line (mutual operation) toward Yamashina; adjacent Keihan Yamashina | **match Tōzai.** Keihan adjacent station (`keihan-yamashina`) is a different stop, not merged. doNotGroup. |  |
| All other D1 names | official EN rider-site station list | match |  |

**26 unique D1 names:** Karasuma Line K01–K09 (9 stations); Tōzai Line T01–T17 (17 stations); hub at both line numbers simultaneously (1 shared).

## H2 — who has line codes today

Official Kyoto Municipal rider-site print uses roman numerals **K** (Karasuma / 烏丸線) and **T** (Tōzai / 東西線) as published route designators. No route_id / feed route id conflict with through-run operators at termini (Kintetsu uses different numbering; Keihan uses different numbering).

## Board eligibility

Two through-run operators call at in-catalog termini (Takeda, Uzumasa Tenjingawa). Both pass the walk-up boarding test for local/regular services; Limited Express services on both operators require compulsory seat reservation and fail Test 1.

| Service | Terminus | Test 1 (walk-up) | Test 2 (check-in) | Verdict | Evidence / notes |
| --- | --- | --- | --- | --- | --- |
| **Kyoto Municipal Subway — Karasuma Line K01–K09** | All 9 stations | ✓ Pass | ✓ Pass | **in** | Municipal operator; standard IC card + fare. No reservation required for any service. |
| **Kyoto Municipal Subway — Tōzai Line T01–T17** | All 17 stations | ✓ Pass | ✓ Pass | **in** | Municipal operator; standard IC card + fare. No reservation required for any service. |
| **Kintetsu Kyoto Line (Local/Express)** | Takeda (K09) | ✓ Pass | ✓ Pass | **in** | Local and express trains allow walk-up boarding with standard Kintetsu ticket / IC card. Rider can board at Takeda without advance reservation (https://www.kintetsu.co.jp/foreign/english/about/howto/before.html). |
| **Kintetsu Limited Express (Ressha, Yamato, Shimakaze)** | Takeda (K09) | ✗ Fail | ✓ Pass | **out-reservation** | Compulsory reserved seat ticket required (separate from base fare). Not walk-up boardable per https://www.ticket.kintetsu.co.jp/vs/en/e-ticket/ . |
| **Keihan Keishin Line (Local/Regular services)** | Misasagi (T08), Uzumasa Tenjingawa (T17) | ✓ Pass | ✓ Pass | **in** | Local/regular Keihan trains allow walk-up boarding with standard Keihan ticket / IC card (https://www.keihan.co.jp/travel/en/trains/purchasing-tickets/). No compulsory reservation for non-Premium services. |
| **Keihan Premium Car / Limited Express** | Misasagi (T08), Uzumasa Tenjingawa (T17) | ✗ Fail | ✓ Pass | **out-reservation** | Premium Car and some Liner services require separate reserved seat ticket (https://www.keihan.co.jp/travel/en/faq/). Not walk-up boardable. |

**Summary:** No services other than Kyoto Municipal Subway (Karasuma + Tōzai) and walk-up-eligible Kintetsu/Keihan local services appear on in-catalog station boards. Limited Express / Premium services on both through-run operators are excluded by compulsory reservation (Test 1 failure), not by mode cut or product decision — verdicts are recorded above.

## Skip risk

- Kintetsu through-run leaking north of Takeda into the Karasuma Line (Kintetsu designation is Kyoto Line / Nara Line; stations beyond Takeda toward Nara are not D1 rows).
- Keihan through-run leaking west of Uzumasa Tenjingawa into the Tōzai Line (Keihan designation Keishin Line; stations beyond Uzumasa toward Ōtsu are not D1 rows).
- Station name confusion: Kyoto Station (JR / Kintetsu main hub) vs Karasuma Line K02 station at the same physical location; Misasagi vs Keihan Yamashina adjacent stop; Uzumasa Tenjingawa vs Randen (tram) Uzumasa Tenjingawa nearby.
- Inventing city slug `kyo` or merging into Kansai / Keihanshin; confusing Kyoto Municipal Subway with Kintetsu, Keihan, or JR lines serving the same city.
- No GTFS-RT published; live path unverified. (Not a skip — official static GTFS verified.)

## License

- **License name:** Public Transportation Open Data Basic License (公共交通オープンデータ基本ライセンス), Revision 1 (effective June 1, 2021).
- **Redistribution / rehosting:** ODPT Basic License Article 4(3): "Licensee shall not display all or part of the Basic License Data anywhere other than in the Deliverable." Article 8(4)(1): without prior written approval from the operator, Licensee is prohibited from "releasing, redistributing, publicly transmitting, or assigning Basic License Data and Other Data contained in or used with the Deliverable … whether with or without consideration … in a form reusable by a third party." This means direct redistribution of the Kyoto Municipal Subway GTFS zip via our API (as-is rehosting) is **not permitted** without explicit written approval from Kyoto Municipal Transportation Bureau. The license contemplates internal derivative use (adaptation for route/stop geometry in published-network.json) but forbids public re-serving the raw feed. Tim to decide whether adaptation+publication within our client passes the "Deliverable" interpretation or requires operator approval.
- **Commercial use:** ODPT Basic License Article 4(7) permits "use by for-profit organizations as well as nonprofit organizations" for the purposes defined in the license terms. However, "use" here refers to use *within an application or service governed by this license*. Republication of the feed itself to third parties is restricted regardless of commercial intent (see above).
- **Attribution:** ODPT Guideline (Article 5) requires attribution when data is "displayed in a Deliverable." Required wording: "（資料）公共交通オープンデータセンター" / "(Source) Public Transportation Open Data Center" or equivalent EN translation. If the Kyoto GTFS is published in next-train, the attribution is owed on any screen displaying Kyoto Municipal Subway data.
- **Terms URL:** ODPT Basic License — https://developer.odpt.org/terms/data_basic_license.html (EN translation available). Developer terms index — https://developer.odpt.org/terms/ . Kyoto City Subway CKAN dataset — https://ckan.odpt.org/dataset/kyoto_municipal_transportation_kyoto_city_subway_gtfs . Kyoto Municipal Transportation Bureau official site — https://www.city.kyoto.lg.jp/kotsu/ (JP; contact for written approval questions).
- **Confidence:** `clear` on the license name and redistribution ban; `clear` on attribution requirement; `unclear` on whether our derivative publication of Kyoto station geometry + service data qualifies as a "Deliverable" under the license or requires separate written approval. The license was written for developer apps (map software, trip planners); our consumption model (serving data via our API to client apps) sits at the boundary. Recommend confirming with Kyoto Municipal before publishing. If written approval is obtained, that approval document becomes part of the license-terms record (not this report).

## C2 for this D1 pack

1. city=`kyoto`. displayName Kyoto.
2. Karasuma Oike / 烏丸御池 hub (K05 × T09). doNotGroup vs Kintetsu stations / Keihan stations / JR stations / Randen tram / all private rail.
3. Modes v1 Kyoto Municipal Subway only: Karasuma Line (K01–K09) and Tōzai Line (T01–T17). Kintetsu through-run beyond Takeda out. Keihan through-run beyond Uzumasa Tenjingawa out. No bus, tram, private rail, or JR.
4. Board eligibility: Kintetsu local/express services at Takeda `in`; Kintetsu Limited Express `out-reservation`. Keihan local/regular services at Misasagi/Uzumasa Tenjingawa `in`; Keihan Premium/Limited Express `out-reservation`.
5. `assertCityLive("kyoto")` must fail (planned / 501). adapterReady false. GTFS-RT not published. License redistribution clause requires clarification before publication.
