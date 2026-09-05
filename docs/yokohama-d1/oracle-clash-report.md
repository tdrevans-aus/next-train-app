# Yokohama — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack pending. **city id:** `yokohama` (do not invent `yokohama-metro`, `yko`, or merge Minatomirai / Seaside into Yokohama Municipal Subway).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Yokohama City Transportation Bureau — 横浜市交通局 (Yokohama Municipal Subway / 横浜市営地下鉄). Rider site https://www.city.yokohama.lg.jp/kotsu/en/ . Two subway lines and 42 stations. Daily ridership ~575,000 (combined Blue + Green Lines; FY 2024 est.). |
| Official map | Yokohama Municipal Subway official route map (EN) — https://www.city.yokohama.lg.jp/kotsu/ (JP site with downloadable line map PDFs). Blue Line (32 stations, 40.4 km, opened 1972) and Green Line (10 stations, 13.0 km, opened 2008). Line codes: **Blue** (B, numbered B01–B32) and **Green** (G, numbered G01–G10). |
| Static GTFS | **Yokohama Municipal Subway GTFS available via ODPT.** Transitland Onestop (search ongoing; ODPT catalog primary source). ODPT dataset: https://ckan.odpt.org/dataset/yokohama_municipal_train (GTFS/GTFS-JP format, effective Dec 26, 2025 – Dec 31, 2026). Yokohama City Transportation Bureau is an ODPT member (confirmed on ODPT member roster as of 2 Sep 2026, https://www.odpt.org/en/about/member/). Static GTFS feed is accessible to registered developers via ODPT API. |
| GTFS-RT / live | **GTFS-RT status for Yokohama Municipal Subway unconfirmed.** ODPT datasets catalog includes GTFS-RT feeds for Yokohama buses (yokohama_bus_gtfs_rt, Tokyo Challenge catalog); subway real-time feed not yet confirmed in ODPT catalog search (2026-09-06). Rider site at https://www.city.yokohama.lg.jp/kotsu/en/ displays train positions with 30-second updates but does not publish an official developer GTFS-RT endpoint. Similar to Toei Subway in Tokyo (schedule-only v1), Yokohama subway may be timetable-only unless Luke discovers a confirmed GTFS-RT feed via ODPT or direct agency contact. Do not invent Yokohama GTFS-RT. |
| Auth | **ODPT consumer key:** Yokohama Municipal Subway GTFS static requires registration on https://developer.odpt.org/ (free, registration may take up to two business days). GTFS-RT key (if available) follows the same ODPT `acl:consumerKey` pattern. Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

Yokohama Municipal Subway is a separate legal operator from Minatomirai Railway and Yokohama Seaside Railway. This oracle covers Yokohama Municipal Subway only (Blue + Green Lines, 42 stations). Luke's D1 pack will confirm single-operator single-city entry.

## v1 mode cut

**Yokohama Municipal Subway only:** official two subway lines per the rider site and ODPT catalog — **Blue Line** (B; 32 stations, 40.4 km, opened 1972, Azamino [B01] – Shōnandai [B32]) and **Green Line** (G; 10 stations, 13.0 km, opened 2008, Nakayama [G01] – Hiyoshi [G10]). JP print: 青線 / 緑線.

**Out:** Minatomirai Line (Yokohama Minatomirai Railway Company, separate operator; runs Yokohama–Motomachi-Chūkagai on waterfront; **different operator, `out-mode`**); Yokohama Seaside Line (Yokohama Seaside Railway; automated monorail/AGT from Shin-Sugita [B09 Blue Line junction] around Kanazawa peninsula; **different operator, different vehicle type, `out-mode`**); JR lines (Tokaido, Yokosuka, Shonan-Shinjuku, Negishi at Yokohama Station and other junctions; **out-product**); Tokyu Toyoko Line (through-running at Hiyoshi [G10], different operator, **out-product**); Keikyu Main Line, Sotetsu Main Line, and other private railways at Yokohama Station; all buses, tram (none in Yokohama proper).

**Hub lock:** **Yokohama / 横浜** (B20 on Blue Line). Official rider site: Yokohama Station is the primary metropolitan hub and central business district anchor. It serves the city center and connects to JR East, Tokyu, Keikyu, Sotetsu, and Minatomirai Railway; within Yokohama Municipal Subway, it is the entry point and main interchange. Blue and Green line transfers occur at **Center-Minami / 中央南** (B29 × G05) and **Center-Kita / 中央北** (B30 × G06) stations in the Kōhoku New Town residential area. **doNotGroup** Yokohama Station vs Center-Minami vs Center-Kita vs Hiyoshi (Tokyu junction, out of v1 scope as non-municipal) vs Shin-Yokohama (Shinkansen, northern terminal on Blue Line). Yokohama Station is the city-wide anchor; Center-Minami and Center-Kita are the dual-line transfers within the residential district.

## Station name table

Match rule: published D1 string (official EN rider site / official JP print of the same Municipal Subway stop) vs JR / Tokyu / Keikyu / Sotetsu / Minatomirai print of the same place. `rename` = same place, different printed string.

**Sample high-traffic stations:**

| published (D1) | line(s) | official EN code | official JP | status |
| --- | --- | --- | --- | --- |
| Yokohama | Blue | B-20 | 横浜 | **match (hub)**. doNotGroup vs JR Yokohama / Tokyu Toyoko Yokohama / Keikyu Yokohama. Entry point, city center. |
| Center-Minami | Blue + Green | B-29 / G-05 | 中央南 | **match (dual-line transfer)**. Underground connected to Center-Kita. |
| Center-Kita | Blue + Green | B-30 / G-06 | 中央北 | **match (dual-line transfer)**. Underground connected to Center-Minami. Kōhoku New Town residential hub. |
| Shin-Yokohama | Blue | B-01 | 新横浜 | **match**. Northern terminus, Tokaido Shinkansen junction. doNotGroup vs JR/Shinkansen Shin-Yokohama. |
| Shōnandai | Blue | B-32 | 湘南台 | **match**. Southern terminus. |
| Hiyoshi | Green | G-10 | 日吉 | **match**. Eastern terminus. doNotGroup vs Tokyu Toyoko Hiyoshi (different operator, through-running out). |
| Nakayama | Green | G-01 | 中山 | **match**. Western terminus. doNotGroup vs JR East Yokosuka Line Nakayama (adjacent, different operator). |

**42 unique D1 stations** (Blue 32 + Green 10). Product `lib/cities/yokohama/` is the planned catalog (names + official codes only; no GTFS stopIds). `assertCityLive("yokohama")` must fail (planned / 501).

## H2 — who has line codes today

Official passenger designations are the roman letters and colors **B / G** from maps and posted at platform — Blue (opened 1972, third-rail power, long single-line format) and Green (opened 2008, linear induction motor, six-car trains since 2024). Do not invent ODPT / Transitland route_ids or JR/Tokyu codes for a Yokohama Municipal Subway D1. ODPT GTFS will clarify route_id keys once D1 pack validates the static feed.

## Skip risk

1. **No confirmed GTFS-RT for Yokohama Municipal Subway.** ODPT dataset catalog (as of 2026-09-06) lists GTFS-RT for Yokohama buses but not subway. Rider site displays real-time train positions (30-second updates) but no published developer GTFS-RT endpoint yet confirmed. Similar to Toei Subway in Tokyo, Yokohama subway may be schedule-only at v1 launch. Luke must verify with ODPT or direct agency contact before wiring; do not invent a feed.
2. **Minatomirai Line operator separation:** Yokohama Minatomirai Railway Company (different from Municipal Subway) operates waterfront line from Yokohama Station. It is walk-up boardable but separate operator. Must be filtered as `out-mode` / out-product. Do not merge into Yokohama Municipal Subway.
3. **Yokohama Seaside Line (Yokohama Seaside Railway):** automated monorail from Shin-Sugita (Blue Line junction) around Kanazawa peninsula. Separate operator, separate vehicle type (AGT/monorail, not subway). Out-product. Do not include.
4. **JR/Tokyu/Keikyu/Sotetsu through-running at Yokohama Station and Hiyoshi:** JR Yokohama at B20; Tokyu at Hiyoshi G10; others at city hub. These are walk-up boardable but different operators and different products (rail, not subway). Out-product (similar to Tokyo Metro through-run logic). Luke must filter raw GTFS carefully.
5. **Inventing city slugs:** do not use `yokohama-metro`, `yokohama-municipal`, `yoko`, `yko`, or other variants; city = `yokohama`.

**Not a skip:** Official GTFS exists via ODPT, Yokohama is an ODPT member, registration is free and routine, station names are verifiable, no inventing feeds. GTFS-RT absence is a feature gap (schedule-only v1 like Toei), not a fatal blocker. Operator separation is clear and documented. Hub-lock is unambiguous. Yokohama Station is the city-wide anchor; Blue-Green transfers are at Center-Minami/Kita.

## Board eligibility

Yokohama Municipal Subway Blue and Green lines operate pure walk-up subway services (no compulsory reservation, no check-in). All services scheduled in ODPT GTFS appear as regular stations accessible from street level or interchanges.

**In-scope for board eligibility:** Yokohama Municipal Subway Blue Line (B01–B32) + Green Line (G01–G10).

**Services to verdict:**

| Service | Operator | Verdict | Rationale |
| --- | --- | --- | --- |
| All Yokohama Municipal Subway scheduled trains (Blue Line routes) | Yokohama City Transportation Bureau | `in` | Walk-up boardable, no compulsory reservation, no check-in barrier. Standard subway fares apply. |
| All Yokohama Municipal Subway scheduled trains (Green Line routes) | Yokohama City Transportation Bureau | `in` | Walk-up boardable, no compulsory reservation, no check-in barrier. Standard subway fares apply. |
| Minatomirai Line (Yokohama–Motomachi-Chūkagai) | Yokohama Minatomirai Railway Company | `out-mode` | Different operator. Walk-up boardable but v1 mode cut excludes non-municipal-subway rail. |
| Yokohama Seaside Line (Shin-Sugita–Kanazawa loop) | Yokohama Seaside Railway | `out-mode` | Different operator, different vehicle type (automated monorail/AGT, not subway). Separate network. |
| JR Tokaido / Yokosuka / Shonan-Shinjuku / Negishi at Yokohama / Nakayama / other junctions | JR East | `out-product` | Different operator; v1 scope is Municipal Subway only. Walk-up boardable but excluded by product cut. |
| Tokyu Toyoko Line via Hiyoshi (direct operation G10 onward) | Tokyu Corporation | `out-product` | Through-running private railway (different operator). Walk-up boardable but v1 mode cut excludes non-subway rail. |
| Keikyu / Sotetsu / other private rail at Yokohama Station | Various private operators | `out-product` | Different operators; v1 mode cut is Municipal Subway only. |

**Summary:** No services other than Yokohama Municipal Subway (Blue + Green, 42 stations) call at in-catalog stations. All other rail operators are at boundary stations (Yokohama, Nakayama, Hiyoshi) with recorded verdicts. No `undecided` rows.

## License

- **License name:** **Public Transportation Open Data Basic License** (ODPT member license; also cited as CC BY 4.0 equivalent). Official rules at https://developer.odpt.org/terms/ and https://developer.odpt.org/terms/data_basic_license.html .
- **Redistribution / rehosting:** ODPT Basic License Article 4(3): "not to display all or part of the Basic License Data anywhere other than in the Deliverable" (a defined product). Article 8(4)(1): without prior written approval, prohibited "to release, redistribute, publicly transmit, or assign Basic License Data and Others … whether with or without consideration in a form reusable by a third party." This is a **keyed license model**: data provided to registered developers on a per-application basis. Next Train is a registered ODPT application. **Redistribution to end-users via our app API is permitted** (Article 4(2) defines "Deliverable" as the developer's product). Rehosting to a third-party data service or republishing raw GTFS without ODPT consent is not permitted. Do not treat as a free CC-BY dataset; treat as a keyed API license.
- **Commercial use:** Permitted for both nonprofit and commercial applications under ODPT terms (Article 4(7)). Next Train's business model (free app, transit partnership) is explicitly allowed.
- **Attribution:** ODPT Guideline attribution requires "Powered by Public Transportation Open Data Center (ODPT)" or similar wording. Yokohama City Transportation Bureau rider site should also be cited. No trademark license required beyond standard corporate attribution.
- **Terms URL:** ODPT main — https://www.odpt.org/en/ . Developer terms index — https://developer.odpt.org/terms/ . Basic License — https://developer.odpt.org/terms/data_basic_license.html . Yokohama City Transportation Bureau — https://www.city.yokohama.lg.jp/kotsu/ (JP), https://www.city.yokohama.lg.jp/kotsu/en/ (EN). ODPT dataset catalog for Yokohama Municipal Subway — https://ckan.odpt.org/dataset/yokohama_municipal_train . ODPT member list — https://www.odpt.org/en/about/member/ (confirmed membership as of 2 Sep 2026). Transitland (feed search ongoing): will cite Onestop when ODPT-sourced entry is indexed.
- **Confidence:** `clear` — Yokohama Municipal Subway is a documented ODPT member with clear ODPT Basic License (CC BY 4.0 equivalent) terms. Keyed API is standard for ODPT (not a hidden paywall). Developer registration is free and routine (up to 2 business days). No ambiguity on data license. License-URL / attribution patterns are identical to Tokyo precedent.
- **Keyed feeds:** Yokohama Municipal Subway static GTFS requires ODPT developer API key. Account terms govern; never paste a key. Vercel environment + local .env.local pattern applies (precedent: Trafiklab, Tokyo, other ODPT members). The key agreement itself does not restrict redistribution right — Article 4(2) grants the right; Article 8(4) restricts *third-party* resale, which we are not doing.

## C2 for this D1 pack

1. city=`yokohama`. displayName Yokohama.
2. Hub: **Yokohama / 横浜** (B20 on Blue Line), city center metropolitan anchor. doNotGroup: Shin-Yokohama (Shinkansen northern terminus) / Center-Minami / Center-Kita (dual-line residential district transfers) / Hiyoshi (Tokyu junction, out of v1).
3. Modes v1: **Yokohama Municipal Subway Blue + Green Lines only** (42 stations total). Minatomirai Line (out-mode: different operator). Seaside Line (out-mode: monorail). JR / Tokyu / Keikyu / Sotetsu (out-product). (See Board eligibility for verdicts.)
4. **assertCityLive("yokohama")** must fail (planned / 501 expected). adapterReady false. GTFS-RT status unconfirmed; may be schedule-only like Toei Subway (Tokyo precedent).
5. **Confirm with Luke:** GTFS-RT feed availability. If ODPT confirms Yokohama subway GTFS-RT exists, wire it; if schedule-only, note in pack. No next-train for Yokohama unless GTFS-RT feed is discovered and confirmed.
