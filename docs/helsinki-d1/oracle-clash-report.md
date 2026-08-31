# Helsinki oracle clash report

D1 (published, as of 29 Aug 2026): [Reittikartat ja asemakartat](https://www.hsl.fi/matkustaminen/reitti_ja_asemakartat) **Metro haarukka / vaunutarra** [metrohaarukka_10-2023.pdf](https://staticfiles.hsl.fi/globalassets/matkustaminen/tulostettavat-aikataulut-ja-kartat/reittikartat/liikennevalineittain/metrohaarukka_vaunutarra_1370x230_cmyk_10-2023_www.pdf) (footer **10/2023**, Illustrator 4 Oct 2023 — still the current haarukka on staticfiles.hsl.fi on 29 Aug 2026) plus **Tervetuloa metroon!** [tervetuloa_metroon_022025.pdf](https://staticfiles.hsl.fi/globalassets/matkustaminen/tulostettavat-aikataulut-ja-kartat/tulostettavat-aikataulukoosteet/talvi-2023-2024/metro/tervetuloa_metroon_865x1180_peruskoko_022025_www.pdf) (**2/2025**, created 20 Jan 2025). 2026 confirmation: official metro station sheets **Rautatientori / Kamppi / Helsingin yliopisto / Itäkeskus 02/2026**. Stations arrays **hand-transcribed**. **Not generated from GTFS.** Not generated from Digitransit Routing / GTFS-RT / HFP. Not generated from Wikipedia.

Current official folders (HSL trunk page + 2/2025 sheet as linked 29 Aug 2026):

- M1: **M1 Kivenlahti-Vuosaari.** 27 ticks. West of Tapiola the M1-only tail is Kivenlahti – Espoonlahti – Soukka – Kaitaa – Finnoo – Matinkylä – Niittykumpu – Urheilupuisto. East of Itäkeskus the M1-only tail is Puotila – Rastila – Vuosaari.
- M2: **M2 Tapiola-Mellunmäki.** 19 ticks. West end **Tapiola**. East of Itäkeskus the M2-only tail is Myllypuro – Kontula – Mellunmäki.

Common trunk **Tapiola – Itäkeskus** (16 stations, both lines). No M3. Matinkylä is a stop, not a current west terminus (Länsimetro phase-1 west end 2017–2 Dec 2022; Kivenlahti opened 3 Dec 2022).

Hub lock: **Rautatientori** (both lines; official metro-sheet English subtitle *Central Railway Station*; first/last tables on Tervetuloa are written from here). Kamppi is the west neighbour + bus terminal — **doNotGroup**, not the lock. Helsingin yliopisto is the east neighbour — not the lock. Päärautatieasema / Helsinki Central railway is a different HSL product (`juna-asemat/helsinki_1730x1180_02_2026.pdf`) — **doNotGroup**, not the lock. Pasila has **no metro**. The haarukka *Helsingin keskusta / Helsinki City Centre* blob is not a stop.

H2 clash surface (after transcription): **no** product `lib/cities/helsinki/`. Clash is **stale index caption vs sheet** (hsl.fi printable card still says *M1 Matinkylä-Vuosaari*; the 2/2025 sheet and 10/2023 haarukka print **Kivenlahti**) plus **metro vs VR/commuter name family** at Rautatientori / Helsinki Central and at Pasila. Not GTFS. Tram / bus / ferry / commuter rail out of v1 oracle.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verification:** The 30 in-catalog stations (M1 and M2 metro only) have no other rail services calling at them. VR (national/regional rail) operates commuter trains at Helsinki Central / Päärautatieasema (`juna-asemat/helsinki_1730x1180_02_2026.pdf`), a separate stop-place explicitly doNotGroup'd from all in-catalog metro stations. VR does not serve Rautatientori metro or any other in-catalog metro station. No services other than the in-scope operator call at any in-catalog station — verified.

**Stop-place separation evidence:**
- **In-catalog Rautatientori (metro):** HSL metro stations M1 and M2 only. Digitransit stop-place UUID for metro (in published-network.json sources).
- **Out-of-scope Päärautatieasema / Helsinki Central (railway):** VR rail operations. Separate HSL product category (`juna-asemat` sheet, not `metroasemat`). Confirmed on 02/2026 official station map.
- **Coverage gap:** published-network.json explicitly lists "HSL / VR commuter rail letters A, E, L, U, X, Y, I, P, K, R, D, Z, T at Helsinki Central, Pasila, Leppävaara, Tikkurila, Airport. Out of v1. doNotGroup the metro stop string vs the railway stop of the same name family."

## Station name table

Match rule: published D1 string (HSL haarukka / Tervetuloa **Finnish** tick) vs official map tick vs railway print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Rautatientori | haarukka / Tervetuloa **Rautatientori** + **Järnvägstorget** + **Central Railway Station**; 02/2026 metro sheet title the same; first/last tables from here | **match (lock)**. Do not use City / Helsingin keskusta / Helsinki / Päärautatieasema. Both lines. |
| Päärautatieasema / Helsinki | 02/2026 **juna-asemat** sheet title Helsinki / Helsingfors | **railway**. doNotGroup vs Rautatientori metro. Not a D1 row. |
| Kamppi | haarukka / 02/2026 metro sheet **Kamppi** + bus terminal | **match metro**. doNotGroup vs Kamppi bus terminal. Not the lock. |
| Helsingin yliopisto | haarukka **Helsingin yliopisto**; 02/2026 sheet same; Tervetuloa Swedish *Helsingfors universitetet* (extra t vs haarukka *universitet*) | **match Finnish**. Not University of Helsinki as the D1 string. Not Kaisaniemi (old name). |
| Aalto-yliopisto | haarukka / Tervetuloa **Aalto-yliopisto** + Aalto-universitetet + Aalto University | **match Finnish**. Not Aalto University as the D1 string. |
| Tapiola | M2 west end; M1 through | match. Not Matinkylä as the M2 token. |
| Kivenlahti | M1 west end (open 3 Dec 2022) | match. Current west branch. |
| Vuosaari | M1 east end | match. |
| Mellunmäki | M2 east end | match. Keep ä. |
| Matinkylä | haarukka / Tervetuloa stop; stale index *M1 Matinkylä-Vuosaari* | **match as a stop**. Not a terminus chip. |
| Itäkeskus | east fork; 02/2026 sheet | match. M1 Vuosaari vs M2 Mellunmäki. Light rail 15 out of v1. |
| Siilitie | haarukka **Siilitie** + Igelkottsvägen | match Finnish. |
| Sörnäinen | haarukka **Sörnäinen** | match. Keep ö. |
| All other D1 names in published-network.json | same HSL haarukka / Tervetuloa Finnish title | match |

**30** unique D1 names. Product `lib/cities/helsinki/` absent. `assertCityLive("helsinki")` is Unknown city.

## H2 — who has line codes today

| surface | M1/M2? | what it actually has |
| --- | --- | --- |
| HSL haarukka 10/2023 (D1) | **yes** | M1 Kivenlahti–Vuosaari and M2 Tapiola–Mellunmäki drawn. Mixed City Centre blob + rail/tram/bus icons. No M3. |
| Tervetuloa metroon 2/2025 (D1) | **yes** | Official termini pairs, Reitti ticks, first/last from Rautatientori. |
| HSL trunk-route page | **yes** | Copy: M1 Kivenlahti-Vuosaari; M2 Tapiola-Mellunmäki. |
| 02/2026 metro station sheets | **yes** | Same names. Rautatientori title lock. |
| hsl.fi printable index caption | stale | Card text still *M1 Matinkylä-Vuosaari*. Sheet disagrees. Lock the sheet. |
| Product `lib/cities/helsinki/` | **absent** | No helsinki stations.json / line-map.json. `assertCityLive("helsinki")` is Unknown city |
| Digitransit Routing v2 HSL | live (key from portal-api.digitransit.fi) | `stop.stoptimesWithoutPatterns`. Official next-train path. Not D1. Filter subway / M1\|M2. |
| HSL GTFS-RT (`realtime.hsl.fi` v2) | live | trip-updates + service-alerts + vehicle-positions. Not D1. |
| HFP MQTT `mqtt.hsl.fi` | live | `/hfp/v2/journey/#`, filter metro. Not D1. |
| HSL static GTFS | not used as D1 | Not this H2 stop-order surface. |
| reittiopas.hsl.fi / HSL-app | passenger UI | Digitransit-backed. Not a product contract. |

H2 conclusion: passenger codes on the map and trunk page already agree (**M1 / M2**). Clash is **stale Matinkylä index caption / metro vs Helsinki Central at Rautatientori**, and **no product helsinki file**. Do not generate published-network.json from GTFS. Do not merge tram, bus, ferry, or commuter rail into this city.

## C2/C3 to put in front of Jim

1. **city=helsinki**, agency **HKL / HSL**, not `finland`, not merged into a VR / commuter city. London TfL / Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg / Oslo untouched.
2. **Rautatientori** is the locked inner-city metro hub (both lines; first/last tables). Not Kamppi, not Helsingin yliopisto, not City / Helsingin keskusta / Helsinki / Päärautatieasema.
3. **doNotGroup Rautatientori metro vs Helsinki Central / Päärautatieasema / VR / commuter.**
4. **doNotGroup Pasila** (no metro) vs any metro row.
5. **doNotGroup Kamppi metro vs Kamppi bus terminal.**
6. **Current west branches are Kivenlahti (M1) and Tapiola (M2).** Matinkylä is a stop, not a chip.
7. **Current east branches are Vuosaari (M1) and Mellunmäki (M2).**
8. **No tram, no bus, no HSL/VR commuter rail, no Suomenlinna ferry, no Itämetro.**
9. **Europe/Helsinki HAS DST.** Official live path is Digitransit Routing `stoptimesWithoutPatterns` + HSL GTFS-RT `realtime.hsl.fi`. D1 stays planned.
10. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg / Oslo.

## License

- **License name:** Creative Commons Attribution 4.0 International (CC BY 4.0) for HSL datasets and APIs (since 1 Sep 2015), except Journey Planner OSM geometry/address (ODbL) and city-bike OD (City Bike Finland).
- **Redistribution / rehosting:** CC BY 4.0 allows copy, redistribute, and derived works including commercial, with attribution. Digitransit: CC BY is a global, gratuitous, non-exclusive, non-revocable right to use the data for any purpose including copy, rework, and distribute.
- **Commercial use:** allowed under CC BY 4.0.
- **Attribution:** Cite the licensee and the time HSL delivered the data, e.g. "© HSL 2026". Digitransit API terms ask for "© Digitransit {year}" when using that API.
- **Terms URL:** https://www.hsl.fi/en/hsl/open-data and https://digitransit.fi/en/developers/apis/7-terms-of-use/
- **Confidence:** `clear` for HSL GTFS + GTFS-RT. `unclear` only if we later mix in Digitransit routing geometry (ODbL). Transitland Onestop **f-ud9-helsinginseudunliikenne**.
- **Keyed feeds:** Static GTFS zip unkeyed (https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip). Digitransit GraphQL needs `digitransit-subscription-key`. GTFS-RT trip-updates at realtime.hsl.fi is unkeyed.
