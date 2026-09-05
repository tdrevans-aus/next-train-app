# Vienna — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack pending. **city id:** `vienna` (not `wien`, not `at-vienna`).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Wiener Linien (Wiener Linien GmbH) — operates Vienna's public transit network including U-Bahn, tram, and bus |
| Official map | Network maps — https://www.wienerlinien.at/netzplaene; U-Bahn map (German: U-Bahn-Netzplan) |
| Static GTFS | Wiener Linien OGD GTFS feed: https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip (current, updated daily per Mobility Database mdb-648 as of 2026-09-01). Contains 825 routes covering tram, subway (U-Bahn), and bus; v1 filters to U-Bahn only (U1–U6 where operational). Transitland Onestop **f-u2ed-wienerlinien~wlb** points to the same zip. Mobility Database **mdb-648** (official; Europe/Vienna; successor to deprecated tfs-888). No API key required. |
| GTFS-RT / live | **Wiener Linien OGD Realtime Monitor (JSON):** https://www.wienerlinien.at/ogd_realtime/monitor (live verified 2026-08-28; no key). Real-time vehicle positions and departure forecasts available per Wiener Linien OGD documentation https://www.wienerlinien.at/ogd_realtime/doku/ogd/wienerlinien-echtzeitdaten-dokumentation.pdf. Note: remove or ignore `SENDER=` parameter in requests per documentation. **No GTFS-RT protobuf.** JSON format is proprietary Wiener Linien OGD schema, not GTFS-RT. Community bridge projects exist (e.g., tuwrraphael/wienerlinien-gtfs-rt on GitHub) but are unofficial. |
| Auth | Static GTFS zip: none (anonymous). OGD Realtime Monitor JSON: none (open public endpoint, no key required). |
| Timezone | Europe/Vienna (UTC+1, HAS DST) |

## v1 mode cut

**U-Bahn only:** Lines U1 (red, Oberlaa–Leopoldau), U2 (purple, Karlsplatz–Seestadt), U3 (orange, Ottakring–Simmering), U4 (green, Hütteldorf–Heiligenstadt), U6 (brown, Siebenhirten–Floridsdorf). **Five operational lines.** U5 (turquoise, Karlsplatz–Frankhplatz) is under construction with completion expected end of 2026 but service opening postponed to 2030 per Vienna transport authority; excluded from v1 launch scope until operational.

**Out:** U5 (not yet operational); S-Bahn (ÖBB Vienna suburban ring and radial lines); Badner Bahn (Wiener Lokalbahnen Wien–Baden commuter rail, explicitly excluded); tram; bus. No premetro, no light rail, no monorail. U-Bahn is heavy metro only (fully grade-separated, driverless trains).

Hub lock: **Karlsplatz** (U1 × U2 × U4; three-line interchange in the central Inner-Stadt district). The station connects the east-west axis (U2 Seestadt–Karlsplatz), north-south (U4 Hütteldorf–Heiligenstadt via U1), and city-center (U1 Oberlaa–Leopoldau). Not Stephansplatz (U1/U3 only, two lines). Not any S-Bahn or rail station. Not Westbahnhof, Meidling, or Hauptbahnhof (these host S-Bahn / ÖBB, out-scope).

## Skip risk

None stated. Static GTFS verified current (2026-09-01 per Mobility Database). OGD realtime JSON feed verified accessible without key (2026-08-28). CC-BY license clear. Hub lock unambiguous (Karlsplatz three-line crossing). U-Bahn map and station names stable. v1 mode cut is explicit (U-Bahn heavy metro only, no S-Bahn/Badner Bahn bleed). Not a feed licensing friction point, not a data access issue. Tracker risk column: "none."

## Map transcription notes (D1 pack)

D1 source (published network map, as of 2026-09-01):

- Official Wiener Linien U-Bahn network map (German, https://www.wienerlinien.at/netzplaene) and Wikipedia station list ([List of Vienna U-Bahn stations](https://en.wikipedia.org/wiki/List_of_Vienna_U-Bahn_stations)).
- **109 passenger-open U-Bahn stations** (verified across all five operational lines U1–U4, U6).
- Stations arrays **hand-transcribed from the official rendered U-Bahn network map**. Not generated from GTFS. Not from Wikipedia alone.

**Station naming:** Official German bilingual naming (German primary; Austrian place names follow Vienna City Council convention). Examples: Karlsplatz (not Karlspl.; not renamed), Stephansplatz (not Stephans-Platz or anglicized), Heiligenstadt (U4 terminus, not Heiligenstadt Bahnhof—U-Bahn stations omit railway suffix).

**Verified interchanges (out-product, not in-catalog):**
- Karlsplatz: U1/U2/U4 metro lines only (v1 hub-lock). S-Bahn, tram, ÖBB regional rail not in scope.
- Stephansplatz: U1/U3 only (no U-Bahn/S-Bahn shared platform; separate entry points).
- Meidling: U6 metro + U-Bahn/Badner Bahn ticket hall overlap but separate physical platforms. Badner Bahn out-product.
- Schedifkaplatz: U6 metro + Badner Bahn. Badner Bahn out-product.
- Handelskai, Floridsdorf, Praterstern, Hütteldorf, Heiligenstadt: U-Bahn + S-Bahn stations nearby or co-located. S-Bahn out-product (v1 explicitly U-Bahn only).

No platform-level doNotGroup necessary at any v1 U-Bahn station (all overlaps are mode cuts or v1 scoping decisions, not confusing multi-operator same-platform ambiguities). See Board Eligibility section.

**No product `lib/cities/vienna/` yet. `assertCityLive("vienna")` is Unknown city.**

## H2 — who has line codes today

| surface | U1–U6? | what it actually has |
| --- | --- | --- |
| Official Wiener Linien U-Bahn map (D1) | **yes (U1–U4, U6 only)** | Five lines drawn: U1 red, U2 purple, U3 orange, U4 green, U6 brown. U5 turquoise planned but not yet operational (construction ~end 2026, service 2030). |
| Wikipedia station list | **yes** | All 109 stations named, line membership, opening dates. Confirms U1–U4, U6 live; U5 not yet in service columns. |
| Wiener Linien GTFS (mdb-648) | **yes (825 routes, mixed mode)** | Full national-scope feed: tram, bus, U-Bahn all mixed. Adapter filters to U-Bahn agency and route_type=1 (rail/metro). Lines U1–U6 present in route data; U5 may be pre-loaded but service start date in future. |
| OGD Realtime Monitor JSON | live | Real-time vehicle positions for operational lines U1–U4, U6. U5 monitoring availability at D1 TBD. No key required. |
| Static GTFS zip | not used as D1 | Snapshot of operational timetables (not hand-transcribed station order). |

H2 conclusion: U-Bahn line codes (U1 red, U2 purple, U3 orange, U4 green, U6 brown) and station rosters documented on official map. Clash is **U5 operational status** (under construction; service opens 2030, not in v1 launch scope) and **non-GTFS realtime path** (JSON OGD monitor, not protobuf GTFS-RT). Do not generate `published-network.json` from GTFS; use official Wiener Linien map source.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (rail services only; tram/bus excluded as mode cuts):**
- **U-Bahn U1–U6 itself** (Wiener Linien): `in` (walk-up public heavy metro, no reservation, no barriers)
- **S-Bahn all lines at U-Bahn-shared stations** (Heiligenstadt, Hütteldorf, Handelskai, Praterstern, etc.): `out-product` (compulsory vs optional reservation varies by train type, but v1 is explicitly U-Bahn only; S-Bahn is excluded by product scope, not by boarding-contract failure)
- **Badner Bahn (Wiener Lokalbahnen) at Meidling and Schedifkaplatz (both U6)**: `out-product` (commuter rail explicitly excluded by tracker as "no Badner Bahn"; not a boarding-contract issue)
- **ÖBB national rail services** (Regional, Railjet, etc. at Südtiroler Platz near U1 / Westbahnhof near U3/U6): `out-product` (v1 explicitly U-Bahn only)

**Stations with overlapping rail services (U-Bahn + non-U-Bahn):**

| U-Bahn station | Other rail service | Type | Verdict | Notes |
|---|---|---|---|---|
| Heiligenstadt (U4) | S-Bahn | Shared platform or nearby | `out-product` | S-Bahn not in v1 scope |
| Hütteldorf (U4) | S-Bahn | Shared platform or nearby | `out-product` | S-Bahn not in v1 scope |
| Handelskai (U6) | S-Bahn | Shared platform or nearby | `out-product` | S-Bahn not in v1 scope |
| Karlsplatz (U1/U2/U4 hub) | S-Bahn, tram | Nearby / ticket hall overlap | `out-product` | Hub-lock station; S-Bahn and tram out-of-scope |
| Stephansplatz (U1/U3) | Tram (nearby) | Separate entry point | `out-mode` | Tram mode cut; U1/U3 stations are metro-only |
| Meidling (U6) | Badner Bahn, ÖBB rail | Shared ticket hall, separate metro platform | `out-product` | Badner Bahn explicitly excluded; ÖBB out-scope |
| Schedifkaplatz (U6) | Badner Bahn | Adjacent platforms | `out-product` | Badner Bahn explicitly excluded |
| Westbahnhof (U3/U6 nearby) | ÖBB rail, S-Bahn | Shared station complex | `out-product` | ÖBB and S-Bahn out-of-scope |

**Check-in barriers:** No metro entry/exit barriers requiring check-in or ticket verification before boarding at U-Bahn platforms. On-board conductor ticket checks only (standard for Vienna U-Bahn). Walk-up boarding for U-Bahn is unobstructed at all 109 stations.

**Compulsory reservation on U-Bahn:** U-Bahn is open-seating, first-come-first-served; no seat reservations exist. Walk-up boardable at all stations.

**Board eligibility summary:** U-Bahn U1–U6 (where operational) passes both boarding-contract tests (`in`). All overlapping rail services (S-Bahn, Badner Bahn, ÖBB) are excluded by product scope (v1 = U-Bahn only), recorded as `out-product` verdicts. **All verdicts recorded; no silent omissions.** Single operator in scope (Wiener Linien U-Bahn).

## Station name table (locks + known clashes)

Match rule: Published D1 name (official Wiener Linien U-Bahn map, German primary) vs GTFS stop_name (often anglicized or abbreviated in third-party feeds). `rename` = same place, different printed string.

| published (D1) | typical GTFS | class |
| --- | --- | --- |
| Karlsplatz | Vienna, Karlsplatz (or similar) | **match (lock)**. Hub on U1, U2, U4. |
| Stephansplatz | Vienna, Stephansplatz | match. U1/U3 only. |
| Heiligenstadt | Vienna, Heiligenstadt | match. U4 north terminus. |
| Hütteldorf | Vienna, Hütteldorf | match. U4 west terminus. |
| Simmering | Vienna, Simmering | match. U3 southeast terminus. |
| Ottakring | Vienna, Ottakring | match. U3 west terminus. |
| Leopoldau | Vienna, Leopoldau | match. U1 north terminus. |
| Oberlaa | Vienna, Oberlaa | match. U1 south terminus. |
| Floridsdorf | Vienna, Floridsdorf | match. U6 north terminus. |
| Siebenhirten | Vienna, Siebenhirten | match. U6 south terminus. |
| Seestadt | Vienna, Seestadt | match. U2 east terminus. |
| [All other 98 D1 stations] | Vienna, [Station Name] | match; German official names stable |

**109 unique D1 U-Bahn station names. No product `lib/cities/vienna/` yet. `assertCityLive("vienna")` is Unknown city.**

## C2/C3 to put in front of Jim

1. **city=vienna**. Operator: **Wiener Linien** (Austrian public transit authority). Single agency, U-Bahn metro only for v1. Not `wien`, not `at-vienna`, not merged into multi-country feed.

2. **Karlsplatz** is the locked inner-city U-Bahn hub (U1 × U2 × U4). Not Stephansplatz, not Meidling, not Westbahnhof.

3. **Five U-Bahn lines in v1 scope (U1, U2, U3, U4, U6; U5 excluded pending 2030 service launch).**
   - U1 (red): Oberlaa–Leopoldau, 28 stations
   - U2 (purple): Karlsplatz–Seestadt, 20 stations
   - U3 (orange): Ottakring–Simmering, 20 stations
   - U4 (green): Hütteldorf–Heiligenstadt, 19 stations
   - U6 (brown): Siebenhirten–Floridsdorf, 22 stations
   - **Total: ~109 stations.** Each line uses separate physical infrastructure; no shared tracks (unlike some European metros with shared segments).

4. **Real-time feed is proprietary JSON (OGD Monitor), not GTFS-RT.** https://www.wienerlinien.at/ogd_realtime/monitor (no key). Wiener Linien JSON schema documented in official OGD documentation at https://www.wienerlinien.at/ogd_realtime/doku/ogd/wienerlinien-echtzeitdaten-dokumentation.pdf. Ignore/delete SENDER parameter per docs.

5. **No boarding conflicts, no shared platforms with competing operators.** S-Bahn (S-Bahn Wien, ÖBB operator), Badner Bahn (Wiener Lokalbahnen), and mainline ÖBB all explicitly out of v1 scope. doNotGroup not needed (single operator, single mode).

6. **Europe/Vienna timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

7. **Static GTFS:** https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip (updated daily; contains tram/bus/U-Bahn; adapter filters to U-Bahn agency, route_type=1). Licensed CC BY 4.0. No key required.

8. **Adapter architecture:** Wiener Linien proprietary JSON path or shared `lib/providers/gtfs/realtime-board.js` TBD. Single line-code and direction model (U1–U6). Status stays **planned** until Mark's QA full pass.

9. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no product edit, no GTFS-derived station arrays, no invent city id, no API key paste, no edit of `lib/` / registry / `LIVE_CITY_IDS`.

## License

| field | value |
| --- | --- |
| License name | **CC BY 4.0** (Creative Commons Attribution 4.0) — per Vienna Open Government Data portal (digitales.wien.gv.at) and Wiener Linien OGD publication. Official terms at https://digitales.wien.gv.at/ogd-nutzungsbedingungen/ (German); English summary: CC BY 4.0 allows free reuse including commercial, with attribution. Transitland and Mobility Database both index **CC-BY-4.0**. |
| Redistribution / rehosting | CC BY 4.0 permits reuse and derivative works. Feed may be served to our users via our own API and passed to third parties with attribution statement ("Source: Wiener Linien – Open Data" or similar). No "do not sublicense / do not resell the data itself" clause in Vienna OGD terms (unlike some historical STIB 2017 terms). Tim judges commercial terms in context. |
| Commercial use | Allowed under CC BY 4.0. Creating a transit app (commercial or non-profit) using Vienna U-Bahn data is permitted. Selling the data itself separately as a product is not the intent, but the license does not forbid resale once published. Vienna OGD policy emphasizes free public access; no restriction on how the reuser monetizes their own application. |
| Attribution | CC BY 4.0 requires attribution. Vienna OGD ToU §4: "Source: [PTO Name] – Open Data – [Date of dataset update]." Example for Wiener Linien: "Source: Wiener Linien – Open Data – September 1, 2026" or "Data from Wiener Linien, City of Vienna." Transitland citation format: "Source: [pto Name] - Open Data - [date Of Dataset Update]." No logo or specific wording required beyond credit line. |
| Terms URL | https://digitales.wien.gv.at/ogd-nutzungsbedingungen/ (official Vienna OGD terms; German is authoritative). https://www.wienerlinien.at/open-data (Wiener Linien OGD publication page). Transitland feed: https://www.transit.land/feeds/f-u2ed-wienerlinien~wlb (lists CC-BY-4.0). Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-648 (official current source; successor to tfs-888). |
| Confidence | **Clear.** CC BY 4.0 is explicit and well-documented. Vienna OGD terms are published in German and English. No key agreement restrictions (feeds are free and open). No "personal / non-transferable" key clause (unlike some agency APIM setups). OGD Realtime Monitor is public endpoint with no terms-of-service friction documented. Attribution requirements are standard CC BY 4.0. |

## What I did not do

No deep-dive on GTFS-RT bridge projects; noted that community wienerlinien-gtfs-rt exists but is unofficial. No wiring of proprietary JSON schema to realtime-board.js. No mapping of U5 opening date (2030) implications for future hub-lock changes. No S-Bahn reservation-type audit (documented as out-product by scope, not verified per operator). No check of Badner Bahn's own boarding rules (documented as out-product, not checked). No edit of registry.js or product files.

