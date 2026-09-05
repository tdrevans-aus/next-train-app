# Honolulu oracle clash report

D1 (draft, as of 6 Sep 2026): **Honolulu Skyline** light metro system, City and County of Honolulu Department of Transportation Services (DTS) with Honolulu Authority for Rapid Transportation (HART) as capital project authority. **13 operational stations** (Segments 1–2 complete; Segment 3 under construction, scheduled 2031). System integrates with TheBus via unified HOLO card fare structure. Stations manually verified from official HART route map and Segment opening announcements. **Not generated from GTFS.** Skyline GTFS data coverage in TheBus feed (merged static data) verified as of October 2025 Segment 2 opening.

Supporting official pages (ordered stops / tokens):

- [Honolulu Authority for Rapid Transportation (HART) Stations](https://honolulutransit.org/about/stations/)
- [Honolulu Authority for Rapid Transportation Route Map](https://honolulutransit.org/about/route-map/)
- [City and County of Honolulu DTS — Stations and Parking](https://www.honolulu.gov/dts/skyline/stations-and-parking/)
- [Segment 2 Opening — Oct 16, 2025](https://www.staradvertiser.com/2025/10/16/hawaii-news/segment-2-of-honolulus-skyline-rail-system-opens-to-the-public-today/)
- [Skyline (Honolulu) Wikipedia](https://en.wikipedia.org/wiki/Skyline_(Honolulu))

Hub lock: **Hālawa** (Aloha Stadium, Station #9). Hālawa is the operational junction between Segment 1 (East Kapolei–Aloha Stadium, opened June 30, 2023) and Segment 2 (Aloha Stadium–Kalihi Transit Center, opened Oct 16, 2025). Major transfer hub connecting to multiple TheBus regional routes serving Pearl Harbor corridor and event-day stadium destinations. Only station where Segments 1 and 2 physically connect on the single automated line.

H2 clash surface (after transcription): **no** product `lib/cities/honolulu/`. Clash is **single-line system with phased segment openings**. 13 stations currently operational; 6 additional stations (Segment 3, Civic Center line) under construction, opening 2031. Skyline is Hawaii's first automated driverless urban light metro. No mix-in with other US cities. No TheBus bus service v1 cut — Skyline rail only.

## Station name table

Match rule: published HART system map + official Segment opening announcements vs official route map stop sequence. All Skyline stations use consistent official naming.

| # | Published D1 (HART map) | Segment | Opening Date | Area / Landmark | Class |
| --- | --- | --- | --- | --- | --- |
| 1 | Kualakaʻi | 1 | Jun 30, 2023 | East Kapolei | Segment 1 western terminus |
| 2 | Keoneʻae | 1 | Jun 30, 2023 | UH–West Oʻahu | **match** |
| 3 | Honouliuli | 1 | Jun 30, 2023 | Hoʻopili | **match** |
| 4 | Hōʻaeʻae | 1 | Jun 30, 2023 | West Loch | **match** |
| 5 | Pouhala | 1 | Jun 30, 2023 | Waipahu Transit Center | **match** |
| 6 | Hālaulani | 1 | Jun 30, 2023 | Leeward Community College | **match** |
| 7 | Waiawa | 1 | Jun 30, 2023 | Pearl Highlands | **match** |
| 8 | Kalauao | 1 | Jun 30, 2023 | Pearlridge Center | **match** |
| 9 | Hālawa | 1 | Jun 30, 2023 | Aloha Stadium | **match (lock)**. Segment 1–2 junction. Major bus transfer hub. |
| 10 | Makalapa | 2 | Oct 16, 2025 | Joint Base Pearl Harbor–Hickam | Segment 2 western station |
| 11 | Lelepaua | 2 | Oct 16, 2025 | Daniel K. Inouye International Airport (HNL) | Airport rail link; **match** |
| 12 | Āhua | 2 | Oct 16, 2025 | Lagoon Drive | **match** |
| 13 | Kahauiki | 2 | Oct 16, 2025 | Middle Street–Kalihi Transit Center | Segment 2 eastern terminus; major bus hub |

**13** unique D1 passenger stops (operational as of Sep 2026). Segment 3 (Civic Center extension, 6 stations, 2031) under construction; not in v1 scope. Product `lib/cities/honolulu/` is **absent**. **Zero** mix-in with any other US city file.

## H2 — who has line codes today

| Surface | Single Line? | What it actually has |
| --- | --- | --- |
| System Map + HART Pages (D1) | **yes (Skyline automated)** | One driverless light metro line, 13 stations. No branches. No other rail modes in v1. |
| Official HART pages + Segment announcements | **yes (live pages)** | Unified Skyline branding. Stop sequences from HART route map + official Segment 2 opening Oct 16, 2025. Hālawa segment junction callout. |
| Product `lib/cities/honolulu/` | **absent** | No honolulu stations.json / line-map.json. `assertCityLive("honolulu")` is Unknown city |
| TheBus GTFS Static (google_transit.zip) | no key required | Routes include TheBus bus service + merged Skyline rail data post-Oct-2025. v1 cut to Skyline rail only. |
| GTFS-RT (vehicle positions + trip updates) | requires API key | Feed via GoSwift/Swiftly (third-party aggregator); requires API key (header: Authorization). Not first-party TheBus RT API (TheBus does not maintain direct GTFS-RT, relies on GoSwift). |

H2 conclusion: single automated line with no branches or junctions to other lines at any station. Clash is **no published stop-name mismatches between HART map and official route pages**, **Hālawa is the single operational segment-junction hub**, and **no product honolulu file**. Do not generate published-network.json from GTFS. Do not invent city=hnl / honolulu-rail / skyline-rail. Skyline is single-line system; no merge ambiguity. TheBus bus service explicitly excluded from v1 (mode cut: rail only). Segments 1–2 operational Oct 2025; Segment 3 (Civic Center, 2031) outside v1 scope.

## C2/C3 to put in front of Jim

1. **city=honolulu**, not `hnl`, not `honolulu-rail`, not `skyline-rail`. Do not invent city=bus or split rail/bus.
2. **Hālawa** (Aloha Stadium, Station #9) is the operational segment-junction hub (Segment 1–2 connection). Major TheBus regional transfer point. Only transfer node on the single line. Not Lelepaua (airport), not Kahauiki (eastern terminus).
3. **Single line: Skyline (automated driverless light metro).** No branches. No junction with other lines (no commuter rail, no other metro). Hālawa segment-junction only; not a multi-line transfer.
4. **13 stations operational as of Sep 2026** (Segments 1–2). Segment 3 (Civic Center extension, 6 stations, 2031) is out-of-scope for v1 oracle.
5. **Segment openings (material for skip risk):** Segment 1 (East Kapolei–Aloha Stadium, 9 stations) opened Jun 30, 2023. Segment 2 (Aloha Stadium–Kalihi Transit Center, 4 new stations) opened Oct 16, 2025. Segment 3 (Civic Center line) scheduled 2031.
6. **v1: Skyline rail only.** No TheBus bus service in v1. No cross-regional surface transit, no ferry, no tram. Skyline is single metro line; mode cut is clean.
7. **Modes v1: One Skyline automated light metro line** (13 stations as of Sep 2026). Hawaii's first driverless urban light metro system.
8. **America/Anchorage HAS DST.** [sic: Honolulu does NOT observe daylight saving time] — Hawaii Standard Time (HST) UTC-10 year-round. Do not copy Perth / Brisbane DST logic; do not use US continent DST rules.
9. **GTFS Static: no auth required.** Feed URL: https://www.thebus.org/transitdata/production/google_transit.zip. Hosted by Oahu Transit Services (TheBus). Skyline data merged into TheBus feed post-Oct-2025; field verification needed on merge completeness and stop-order conformance to HART map.
10. **GTFS-RT: API key required.** Provided via GoSwift/Swiftly (third-party aggregator, not first-party TheBus API). Vehicle Positions: https://api.goswift.ly/real-time/thebus/gtfs-rt-vehicle-positions. Trip Updates: https://api.goswift.ly/real-time/thebus/gtfs-rt-trip-updates. API key registration at GoSwift; auth header: `Authorization`. License: Swiftly API (non-sublicensable; **prohibits third-party redistribution** — "You may not sell, lease, or share API content to any third party, including any data broker, ad network, ad exchange."). **Not suitable for Next Train v1 public API if third-party redistribution is planned.** Static GTFS is the only unlicensed-to-third-party option.
11. Do not generate published-network.json from GTFS or from any other city. Do not merge with chicago, atlanta, perth, or any other city product file. Skyline is single line with no cross-city entanglement. This pack stays **planned**.
12. **Hālawa as hub-lock:** Station code/ID must match HART official designation. Unified HOLO card fare integrates Skyline + TheBus. No separate rail fare zone or access gate.

## Board eligibility

Honolulu Skyline is the sole rail operator calling at all in-catalog Skyline stations. The system is operated by City and County of Honolulu Department of Transportation Services with no commuter rail, no regional intercity rail, no other metro system, and no secondary rail operator with walk-up access at any Skyline station.

**TheBus bus service:** Operates as a separate bus network with separate fare structure (but unified HOLO card payment accepted). Explicitly excluded from v1 scope per mode cut (rail only). Not subject to board eligibility verdict — out-product cut is mode/product, not fare/service.

**Summary:** All walk-up rail services at in-catalog Skyline stations are Skyline automated light metro (single line, 13 stations). No rail service other than Skyline calls at these stations. No board eligibility verdicts beyond the mode cut (Skyline rail, exclude TheBus bus). No service exclusions on boarding contract grounds (compulsory reservation, check-in barriers) — Skyline is walk-up boardable, no reserved seating, no check-in process.

## License

- **License name:** Honolulu Open Data Portal Policy (GTFS static); Swiftly API License Agreement (GTFS-RT).
- **Redistribution / rehosting — GTFS Static:** Unclear. Honolulu Open Data Portal Terms of Use state "Each dataset carries its own license" and require attribution ("The data made available here was modified for use from its original source, which is data.Honolulu.gov. The City & County of Honolulu does not vouch for the quality and timeliness of the data presented herein..."), but specific GTFS dataset license (CC BY, ODbL, proprietary) not found in public documentation. TheBus feed hosted at thebus.org/transitdata/production/google_transit.zip with no license statement on the feed URL itself. **Recommendation:** Contact City and County of Honolulu DTS or Oahu Transit Services directly to confirm GTFS redistribution terms before third-party API publication.
- **Redistribution / rehosting — GTFS-RT:** Explicitly **prohibited**. Swiftly API License states: "You may not sell, lease, or share API content to any third party, including any data broker, ad network, ad exchange." Non-sublicensable. Next Train cannot rehost or relay Swiftly GTFS-RT data to third parties. **Static GTFS is the only option if public API redistribution is required.**
- **Commercial use — GTFS Static:** Unclear (per Honolulu Open Data Portal policy). Field verification needed.
- **Commercial use — GTFS-RT:** Allowed for app development, but no incremental fees to users permitted. Swiftly prohibits charging users "any incremental fees (including any unique, specific, or premium charges) for access to the Content." Commercial use of static GTFS unclear; commercial app use of GTFS-RT subject to Swiftly's non-redistribution clause.
- **Attribution — GTFS Static:** Required per Honolulu Open Data Portal (standard notice, above). Specific GTFS dataset attribution (logo/mark) unclear.
- **Attribution — GTFS-RT:** Swiftly API does not mandate attribution phrasing; Swiftly marks are confidential material.
- **Terms URL — GTFS Static:** https://data.honolulu.gov/terms-of-use (general policy); https://www.thebus.org/transitdata/production/google_transit.zip (feed URL, no license doc).
- **Terms URL — GTFS-RT:** https://www.goswift.ly/api-license (Swiftly API License Agreement).
- **Confidence — GTFS Static:** `unclear`. No dedicated license document on TheBus feed URL or Honolulu Open Data Portal GTFS dataset page found in public sources. Per-dataset license required but not publicly specified. Contact DTS for clarification.
- **Confidence — GTFS-RT:** `clear`. Swiftly API License explicitly prohibits third-party redistribution. Non-sublicensable.
- **Keyed feeds:** GTFS-RT requires API key (Swiftly/GoSwift). Account terms (above) govern, including non-redistribution clause. Static GTFS is unkeyed/public.

---

## Station roster (13 operational, Sep 2026)

**Segment 1** (opened Jun 30, 2023; East Kapolei to Aloha Stadium):

1. Kualakaʻi (East Kapolei)
2. Keoneʻae (UH–West Oʻahu)
3. Honouliuli (Hoʻopili)
4. Hōʻaeʻae (West Loch)
5. Pouhala (Waipahu Transit Center)
6. Hālaulani (Leeward Community College)
7. Waiawa (Pearl Highlands)
8. Kalauao (Pearlridge Center)
9. Hālawa (Aloha Stadium) [**hub-lock**]

**Segment 2** (opened Oct 16, 2025; Aloha Stadium to Kalihi Transit Center):

10. Makalapa (Joint Base Pearl Harbor–Hickam)
11. Lelepaua (Daniel K. Inouye International Airport, HNL)
12. Āhua (Lagoon Drive)
13. Kahauiki (Middle Street–Kalihi Transit Center)

**Segment 3** (under construction, scheduled 2031; not in v1 scope):

- Mokauea (Kalihi / Kapalama)
- Niuhelewai (Honolulu Community College)
- Kūwili (Iwilei)
- Hōlau (Chinatown)
- Kuloloia (Downtown)
- Kaʻākaukukui (Civic Center Station, temporary terminus)

Deferred (indefinitely): Kūkuluaeʻo (Kakaʻako), Kālia (Ala Moana Center).

---

## Skip risk

**Single-line, phased-opening system:** Skyline is Hawaii's first automated light metro with no branches. v1 oracle covers 13 operational stations (Segments 1–2, as of Sep 2026). Segment 3 (Civic Center extension, 6 stations, 2031 opening) is out-of-scope and introduces a long planning horizon; infrastructure commissioning delays are common in automated transit. If Segment 3 opens early or late, station roster and line-end logic will shift.

**GTFS-RT via third-party aggregator:** TheBus real-time feed is hosted by GoSwift/Swiftly, not a first-party TheBus API. This introduces aggregator failure risk (GoSwift outage = no GTFS-RT) and non-redistribution licensing (cannot pass to third-party users). v1 must use static GTFS only unless Swiftly API key can be wired directly into Next Train backend without public relay.

**Skyline GTFS coverage in merged TheBus feed:** TheBus GTFS static feed was merged with Skyline data after Segment 2 opening (Oct 16, 2025). **Field verification required** on: (1) whether Skyline route(s) / stop(s) conform to HART official names and stop order; (2) whether feed is updated post-Oct-2025 for Segment 2 additions; (3) route service calendar alignment (schedules, holiday adjustments).

**Fare integration via HOLO card:** Skyline and TheBus share unified HOLO card fare system (no separate purchase needed). No known conflicts, but fare structure may change with Segment 3 opening (2031).

---

**Status:** D1 draft scoped as of 6 Sep 2026. Segment 1–2 operational (13 stations). Segment 3 under construction (2031 target). GTFS-RT licensing prohibits third-party redistribution (Swiftly API). Static GTFS requires field verification for Skyline coverage completeness post-Oct-2025.
