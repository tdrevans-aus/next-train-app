# Tokyo — oracle clash report

**Lane:** Nico research + Luke D1 pack (pending). **Date:** 2026-09-06. **Status:** Oracle scoped. **city id:** `tokyo` (do not invent `tky`, `tokyo-metro`, `odpt`, or merge Toei into Tokyo Metro as one operator).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | **Tokyo Metro** — 東京メトロ (Tokyo Metro Co., Ltd., a joint-stock private company) operates 9 lines. Rider site https://www.tokyometro.jp/lang_en/ . **Toei Subway** — 東京都交通局 (Tokyo Metropolitan Bureau of Transportation) operates 4 lines. Rider site https://www.kotsu.metro.tokyo.jp/eng/services/subway.html . These are **two distinct operators**; do not merge them into one city. See Osaka report (§ on v1 cut) for precedent of operator-specific cut vs regional grouping. |
| Official maps | Tokyo Metro route map (EN) — https://www.tokyometro.jp/lang_en/station/index.html ; official PDF (JP link on https://www.tokyometro.jp/ts/other/linner/metroline_map.html). Toei Subway route map (EN) — https://www.kotsu.metro.tokyo.jp/eng/maps/ . Line list: Tokyo Metro 9 lines (Ginza G, Marunouchi M, Hibiya H, Tōzai T, Chiyoda C, Yūrakuchō Y, Hanzōmon Z, Namboku N, Fukutoshin F) = 180 stations, 195.1 km. Toei 4 lines (Asakusa A, Mita I, Shinjuku S, Ōedo E) = 106 stations, 109 km. Official Tokyo Metro line-code sheet (JP PDF) — https://www.tokyometro.jp/ts/other/linner/metroline_map.html; official Toei sheet (JP) — https://www.kotsu.metro.tokyo.jp/services/subway.html . |
| Static GTFS | **Tokyo Metro:** https://api.odpt.org/api/v4/files/TokyoMetro/data/TokyoMetro-Train-GTFS.zip (Transitland Onestop **f-tokyometro~data~tokyometro~train~gtfs~jp**; last fetch **2026-09-05** empty-key **200**). **Toei Subway:** https://api-public.odpt.org/api/v4/files/Toei/data/Toei-Train-GTFS.zip (Transitland Onestop **f-toei~data~toei~train~gtfs~jp**; last fetch **2026-09-05** empty-key **200**). Both feeds require ODPT developer key. Do not invent separate GTFS zips. |
| GTFS-RT / live | **Tokyo Metro:** GTFS-RT available — 東京メトロ 鉄道関連リアルタイム情報 (Protocol Buffers format) confirmed in ODPT catalog (ckan.odpt.org dataset query, verified 2026-09-05). GTFS-RT trip updates and vehicle positions hosted on ODPT API. **Toei Subway:** **No official GTFS-RT found.** ODPT dataset search for 東京都交通局 returns 19 datasets; none are realtime/GTFS-RT. Toei rider site (https://www.kotsu.metro.tokyo.jp/services/subway.html) shows no documented developer realtime API. Static GTFS only for Toei v1. This is a primary hazard: Tokyo Metro has next-train, Toei does not. |
| Auth | **ODPT consumer key:** Both Tokyo Metro and Toei GTFS feeds require registration on https://developer.odpt.org/signup . Registration may take up to two business days. Key is `acl:consumerKey` parameter in ODPT API calls. Transitland fetches both feeds successfully without key (public-mirror behavior), but live deployments require the key. Never paste a key. |
| Timezone | Asia/Tokyo (no DST) |

**Tokyo Metro and Toei are separate legal operators and catalog entries.** This oracle covers both (combined 13 lines, 286 stations, 304.1 km in Tokyo proper). Luke's D1 pack will decide whether both operators fit one city entry or two. Osaka precedent: one city entry, one operator. Tokyo decision: **pending Luke scope call**. Adapter scope: v1 is subway only; through-running JR and private railways are the main product hazard (see Board eligibility, Skip risk, v1 mode cut below).

## v1 mode cut

**Tokyo Metro + Toei Subway only:** all 9 Tokyo Metro lines (G, M, H, T, C, Y, Z, N, F) + all 4 Toei lines (A, I, S, E) = 13 subway lines.

**Through-running OUT of v1:** Tokyo Metro and Toei operate direct-control subways; several Tokyo Metro lines participate in direct-operation through-service agreements with JR East and private railways:
- **Fukutoshin Line (F):** through-service with Tokyu Toyoko Line (direct operation at Shibuya; Tokyu trains branch onto F beyond)
- **Chiyoda Line (C):** through-service with Odakyu Odawara Line (direct operation from Yoyogi-Uehara); Keio services also noted
- **Namboku Line (N):** through-service with Saitama Railway (2020 start; direct operation from Akabane; Saitama trains branch onto N)
- **Yūrakuchō Line (Y):** future through-service planned with Tobu Isesaki/Nikko Lines (under construction Yūrakuchō Line Branch, opening 2030 planned; Tobu trains planned to interline)
- **Tōzai Line (T):** no current through-service; future Tobu Skytree Line connection under study

**Toei Asakusa Line (A):** physical gauge difference (narrow-gauge Toei vs standard-gauge Tokyo Metro) allows mutual accommodation with private railways (Keikyu Airport Line through-service at Asakusa). Asakusa platform is Toei infrastructure; Keikyu service is separate vehicle operator.

**v1 scope:** Tokyo Metro all 9 lines (no cuts) + Toei all 4 lines (no cuts). Through-running vehicles from Tokyu / Odakyu / Keio / Saitama Railway / Keikyu are **out-product** — product decision to exclude non-subway operators. These are walk-up boardable (no compulsory reservation, no check-in) but are different operators and vehicle types (JR/private rail, not Tokyo Metro/Toei). v1 catalog is subway, not rail. See Board eligibility (§ below) for per-service verdicts.

**No tram, no bus, no monorail, no light rail, no S-Bahn-equivalent:**
- Tokyo Monorail: separate operator, off-network (Haneda airport shuttle, not Tokyo Metro/Toei). Out.
- Tokyo Tram (Arakawa Line, 1 line, 13 stations): separate operator, Toei-operated but is tram not subway. **v1 is subway only.** Out.
- Toei Bus: separate from subway. Out.
- Tokyo Metro Bus: separate from subway. Out.
- Yurikamome (New Transit Yurikamome, 1 driverless AGT line): separate operator, off-network. Out.
- Rinkai Line (Tokyo Waterfront New Transit): separate operator, off-network. Out.

**Hub lock:** **Ōtemachi / 大手町** (M18 Marunouchi × T09 Tōzai × C11 Chiyoda × Z08 Hanzōmon × I09 Toei Mita). Official Tokyo Metro station page — https://www.tokyometro.jp/lang_en/station/otemachi/index.html — lists transfers: Marunouchi, Tōzai, Chiyoda, Hanzōmon, and Toei Mita. Wikipedia confirms: "It is served by five lines, more than any other station on the Tokyo underground network, and is thus the biggest subway station in Tokyo." Ōtemachi is the inner business district interchange lock for both Tokyo Metro and Toei. **doNotGroup** Ōtemachi vs Tokyo Station (JR hub, not subway-only) vs Ginza Station (only 3 Tokyo Metro lines) vs other stations. Not every station needs to be in the catalog; filter stations into the app. Ōtemachi is the anchor for north-central Tokyo. Other hubs by region (Shinjuku for west; Shibuya for south; Asakusa for northeast), but Ōtemachi is the broadest metro-native hub.

## Station name table

Match rule: published D1 string vs official EN / JP metro site print. (Metro systems do not typically publish GTFS station name tables, so alignment is against the rider-site official English names and JP print.)

Since Tokyo Metro and Toei operate separately, they have distinct station lists. Shared-platform transfer stations (Ōtemachi, Meguro, Gotanda, Shirokanedai, and others) are **separate Tokyo Metro + separate Toei rows** in the published network — both operators, one place, different codes.

**Ōtemachi example:**
| published (D1) | line | official EN code | official JP | status |
| --- | --- | --- | --- | --- |
| Ōtemachi | Marunouchi | M-18 | 大手町 | match metro |
| Ōtemachi | Tōzai | T-09 | 大手町 | match metro |
| Ōtemachi | Chiyoda | C-11 | 大手町 | match metro |
| Ōtemachi | Hanzōmon | Z-08 | 大手町 | match metro |
| Ōtemachi | Mita (Toei) | I-09 | 大手町 | match Toei |

Toei and Tokyo Metro do **not** use hyphen in official EN station names (no "Ōtemachi-Mita" vs "Ōtemachi-Marunouchi"; the line name is the disambiguator when needed).

**Tokyo Metro 180 stations + Toei 106 stations = 286 total unique places (including shared-platform transfers).**

Do not enumerate all 286 here (precedent: Osaka D1 did this; Tokyo is 3.5× larger). D1 name set from official Tokyo Metro + official Toei station lists (published-network.json will anchor to official codes). Validate against https://www.tokyometro.jp/lang_en/station/index.html (searchable) and https://www.kotsu.metro.tokyo.jp/eng/maps/ (line PDFs).

## H2 — who has line codes today

Official passenger tokens:
- Tokyo Metro: **G, M, H, T, C, Y, Z, N, F** (one letter per line, with station number; e.g., M-18 Marunouchi).
- Toei: **A, I, S, E** (one letter per line with station number; e.g., I-09 Mita).

Through-running (out of v1) vehicle operators use **different codes** (e.g., Tokyu uses "Tk"; Odakyu "OH"; Keio "KO"; Saitama Railway "SR"; Keikyu "KK"). Do not invent route_ids from Transitland / ODPT until the D1 pack runs GTFS through the published-network and confirms the route_id keys. Do not treat GTFS route_id as line-code without that step.

## Skip risk

1. **Toei has no GTFS-RT.** Tokyo Metro GTFS-RT exists; Toei is timetable-only. This is a major product hazard for board live-time. Mark's QA gate will need to check: does the adapter treat Toei Timetable correctly (schedule-only, no next-train predictions)? Do not invent Toei RT.
2. **Through-running leakage:** Tokyu, Odakyu, Keio, Saitama Railway, Keikyu vehicles can appear at Tokyo Metro platforms (especially Shibuya on Fukutoshin, Yoyogi-Uehara on Chiyoda, Akabane on Namboku). These are **out-product** but they will appear in raw GTFS if Tokyo Metro GTFS includes the through-service route rows. Luke must filter them. Do not treat a through-service route_id in Tokyo Metro's GTFS as an in-scope Tokyo Metro line without confirming the vehicle is Tokyo Metro-operated (not Tokyu/Odakyu/Keio/Saitama/Keikyu at a through-run terminus).
3. **Private-railway through-running at Toei Asakusa (Keikyu A-line junction):** Keikyu Airport Line (Keisei-Ushio Express) calls at Asakusa via Toei infrastructure. Keikyu is a separate operator; A-line is Toei. A-line stations are Toei-operated; Keikyu vehicle is not Tokyo Metro/Toei. Same out-product logic as Tokyo Metro through-run.
4. **Inventing a single city entry for Tokyo Metro + Toei without legal separation:** They are two distinct operators with separate GTFS feeds, separate GTFS-RT (Tokyo only), separate line codes, separate corporate structures. If the adapter tries to merge them as one city/operator by mistake, downstream QA will fail. Luke's scope call will clarify: two rows in published-network (one per operator, same geographic area) or one city row with a note about dual-operator split. **Do not invent `tokyo-combined` or `tokyo-metro-and-toei`.**
5. **Name clash:** Tokyo (city) vs Tōkyō (archaic spelling) vs "Tokyo Metro" (operator name, not city name). City is `tokyo`. Operator is "Tokyo Metro Co., Ltd." Do not use operator name as city.

**Not a skip: official GTFS exists for both operators, both are on Transitland, both are ODPT members, registration path is clear, no paywalls (ODPT is free for developer sign-up), Ōtemachi hub is unambiguous.** GTFS-RT for Toei is absent but that is a feature gap (schedule-only v1), not a feed-missing skip. No inventing feeds.

## Board eligibility

Tokyo Metro and Toei Subway operate pure walk-up subway services (no compulsory reservation, no check-in). All services are scheduled in GTFS and appear as regular stations accessible from street level or interchanges.

**In-scope for board eligibility:** Tokyo Metro lines (G, M, H, T, C, Y, Z, N, F) + Toei lines (A, I, S, E).

**Services to verdict:**

| Service | Operator | Verdict | Rationale |
| --- | --- | --- | --- |
| All Tokyo Metro scheduled trains (routes from published GTFS route_id) | Tokyo Metro | `in` | Walk-up boardable, no compulsory reservation, no check-in barrier. Standard subway fares apply. |
| All Toei Subway scheduled trains (routes from published GTFS route_id) | Toei Subway | `in` | Walk-up boardable, no compulsory reservation, no check-in barrier. Standard subway fares apply. |
| Tokyu Toyoko Line via Fukutoshin (direct operation at Shibuya–Ebisu transfers) | Tokyu Corporation | `out-product` | Through-running private railway (different operator, not Tokyo Metro). Walk-up boardable, but v1 mode cut excludes non-subway rail. Not `out-mode` (same gauge rail); `out-product` by explicit scope. |
| Odakyu Odawara / Keio Line via Chiyoda (direct operation Yoyogi-Uehara–Yoyogi transfers) | Odakyu Electric Railway / Keio Electric Railway | `out-product` | Through-running private railways (different operators, not Tokyo Metro). Walk-up boardable, but v1 mode cut excludes non-subway rail. Not `out-mode`. |
| Saitama Railway via Namboku (direct operation Akabane–Asakabane-Iwatsuki, 2020 start) | Saitama Railway | `out-product` | Through-running private railway (different operator, not Tokyo Metro). Walk-up boardable, but v1 mode cut excludes non-subway rail. Not `out-mode`. |
| Keikyu (Keisei-Ushio Express) via Toei Asakusa Line (direct operation Asakusa–Haneda Airport) | Keikyu Corporation | `out-product` | Through-running private railway (different operator, not Toei). Walk-up boardable, but v1 mode cut excludes non-subway rail. Not `out-mode`. |
| Tobu Railway (future via Yūrakuchō Line Branch, planned 2030 opening) | Tobu Railway | `out-product` | Future through-service planned. When live, will be treated as through-running private railway (different operator). Not relevant to v1 launch. |
| Tokyo Tram (Arakusa Line, 1 line) | Toei (tram operator) | `out-mode` | Different vehicle type (street tram, not subway). Separate mode cut. |
| Tokyo Monorail | Tokyo Monorail | `out-mode` | Different vehicle type and operator. Haneda shuttle, not subway. Separate network. |
| Yurikamome (New Transit Yurikamome) | Yurikamome | `out-mode` | Different vehicle type (AGT, driverless) and operator. Off-network. |
| Rinkai Line (Tokyo Waterfront New Transit) | Rinkai Line | `out-mode` | Different vehicle type (elevated light metro) and operator. Off-network. |

**Summary:** No services other than Tokyo Metro subway (9 lines) and Toei Subway (4 lines) call at Tokyo Metro/Toei in-catalog stations. All through-running private railways are at junction/terminus stations (Shibuya, Yoyogi-Uehara, Asakusa, Akabane) and have been identified with `out-product` verdicts recorded here. No `undecided` rows.

## License

- **License name:** **ODPT Public Transportation Open Data Basic License** (both Tokyo Metro and Toei feeds are ODPT members; Toei is Bureau of Transportation, Tokyo Metropolitan Government). Also cited as CC BY 4.0 equivalent. Official rules at https://developer.odpt.org/terms/ and member-specific terms.
- **Redistribution / rehosting:** ODPT Basic License Article 4(3): "not to display all or part of the Basic License Data anywhere other than in the Deliverable" (a defined product). Article 8(4)(1): without prior written approval, prohibited "to release, redistribute, publicly transmit, or assign Basic License Data and Others … whether with or without consideration in a form reusable by a third party." This is a **keyed license model**: data is provided to registered developers on a per-application basis. Next Train is a registered application of ODPT (via Vercel deployment or local API key storage). **Redistribution to end-users via our app API is permitted** (Article 4(2) defines "Deliverable" as the developer's product application). Rehosting to a third-party data service or republishing the raw GTFS without ODPT consent is not permitted. Do not treat as a free CC-BY dataset; treat as a keyed API license.
- **Commercial use:** Permitted for both nonprofit and commercial applications under ODPT terms (Article 4(7)). Next Train's business model (free app, commercial transit partnership) is explicitly allowed.
- **Attribution:** ODPT Guideline attribution (from the developer portal) requires "Powered by Public Transportation Open Data Center (ODPT)" or similar wording. Tokyo Metro and Toei riders site should also be cited. No trademark license required beyond standard corporate attribution.
- **Terms URL:** ODPT main — https://www.odpt.org/en/ . Developer terms index — https://developer.odpt.org/terms/ . Public Transportation Open Data Basic License — https://developer.odpt.org/terms/data_basic_license.html . Toei Subway site — https://www.kotsu.metro.tokyo.jp/eng/services/subway.html . Tokyo Metro site — https://www.tokyometro.jp/lang_en/ . Transitland (no Onestop license info, only feed URLs): https://www.transit.land/feeds/f-tokyometro~data~tokyometro~train~gtfs~jp and https://www.transit.land/feeds/f-toei~data~toei~train~gtfs~jp . ODPT member list (as of 1 Aug 2026 per Osaka report, and confirmed for Tokyo): https://www.odpt.org/en/about/member/ .
- **Confidence:** `clear` — both Tokyo Metro and Toei are documented ODPT members with clear CC BY 4.0 / ODPT Basic License terms. No ambiguity. Keyed API is standard for ODPT (not a hidden paywall). Developer registration is free and routine (up to 2 business days).
- **Keyed feeds:** Both Tokyo Metro and Toei feeds require ODPT developer API key. Account terms govern; never paste a key into public repo or commit logs. Vercel environment + local .env.local pattern applies (precedent: Trafiklab keys in other cities, same pattern). The key agreement itself does not restrict our redistribution right (Article 4(2) grants the right; Article 8(4) restricts *third-party* resale, which we are not doing).

## C2 for this D1 pack

**Pending Luke scope call:** 
1. **city=`tokyo`** with displayName Tokyo. Operators: Tokyo Metro (9 lines) + Toei Subway (4 lines). Decision: single city entry or two rows? (Osaka precedent: one city, one operator; Tokyo is two operators, same metro area.) 
2. Hub: **Ōtemachi / 大手町** (M18 × T09 × C11 × Z08 × I09, 5 lines). doNotGroup: Tokyo Station / Ginza Station / Shinjuku / Shibuya / Asakusa / other regional hubs.
3. Modes v1: **Tokyo Metro 9 lines + Toei 4 lines subway only.** No tram, no bus, no monorail, no light rail. Through-running Tokyu / Odakyu / Keio / Saitama Railway / Keikyu **out**. (See Board eligibility for verdicts.)
4. **assertCityLive("tokyo")** must fail (planned / 501 expected). adapterReady false. Toei is timetable-only (no GTFS-RT); Tokyo Metro GTFS-RT exists but next-train availability per Toei will lag.
5. **Double-check with Luke:** Should the adapter split Tokyo Metro and Toei into separate city entries (like Osaka is one operator per entry), or should one city entry have a note about dual-operator split? This oracle covers both as one geographic/product footprint; D1 pack will clarify operator model for the published-network.
