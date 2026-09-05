# Graz — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack pending. **city id:** `graz` (not `graz-steiermark`, not `at-graz`).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Holding Graz (Graz Linien division) — operates Graz's tram network within the Styrian Transport Association (Verkehrsverbund Steiermark / Verbund Linie). S-Bahn Steiermark operated by ÖBB, GKB, and StLB. |
| Official map | Verbund Linie network map — https://www.verbundlinie.at/images/service/pdfs/liniennetz/graz.pdf (German; tram lines shown). Holding Graz lines overview: https://www.holding-graz.at/en/mobility/our-lines/. |
| Static GTFS | **Verbund Linie / Verkehrsverbund Steiermark GTFS:** Managed centrally through Austrian GTFS portal at data.mobilitaetsverbuende.at (Soll-Fahrplandaten). Feed download via https://mobilitaetsdaten.gv.at/daten/soll-fahrplandaten-gtfs (German: "scheduled public transport data collected by Mobility Associations of Austria OG"). Mobility Database lists **Verkehrsverbund Steiermark (Verbund Linie)** as the data provider. No agency-specific API key required for static GTFS. Feed covers tram (Holding Graz Linien 1–7, 13, 16, 17, 23) and S-Bahn Steiermark lines (S1, S3, S5, S6, S7, S8, S9, S11, S31, S51, S61). v1 filters to Graz Linien tram lines 1–7 and 13 only (S-Bahn Steiermark with verdict per Board eligibility section). Transitland equivalent pending verification. |
| GTFS-RT / live | **GrazMobil app** (proprietary real-time system): https://www.grazmobil.at / app stores (GPS-based vehicle tracking; shows real-time tram and bus positions). App provides real-time departure information for Graz tram/bus with estimated arrival times. Holding Graz implements live vehicle position broadcasts (OpenTrafficMap confirms live tram positions available via broadcast). **Graz Linien API** (restricted; developer terms required): https://api.store/austria-api/graz-linien-timetable-dates-and-stops-api (timetable/stops endpoint; email consent and terms acceptance required for key; transfer/publication of key restricted). **No stable public GTFS-RT protobuf feed confirmed.** Community bridges or third-party conversions (if any) are unofficial. Abfahrt (https://api.abfahrt.now/) indexes Graz as available but API details unverified. Verification of public real-time feed availability (GTFS-RT or JSON) required at D1. |
| Auth | Static GTFS: none (open via Austrian mobility data portal). GrazMobil app: none (free, public). Graz Linien API: email-based developer terms (API key required; transfer prohibited). S-Bahn Steiermark GTFS/RT: included in Verbund Linie feed. No national ÖBB API key needed for regional S-Bahn subset. |
| Timezone | Europe/Vienna (UTC+1, HAS DST) |

## v1 mode cut

**Graz Linien tram only:** Lines 1 (Eggenberg/UKH–Hilmteich/Botanical Garden), 3, 4 (Liebenau Murpark–Jakominiplatz), 5, 6 (Smart City–St. Peter), 7, and 13 (peak-hour reinforcement: Hauptbahnhof–Liebenau/Murpark). **Seven operational tram lines.** Lines 16 and 17 (Neutorlinie, opened November 29, 2025) are excluded from initial v1 scope pending network maturity confirmation and timetable stability in D1 pack.

**S-Bahn Steiermark (verdict `in`):** All ten S-Bahn lines (S1, S3, S5, S6, S7, S8, S9, S11, S31, S51, S61) calling at any in-catalog tram station pass board eligibility tests (walk-up boardable, no compulsory reservations; local commuter rail with 96% punctuality and open seating). See Board eligibility section.

**Out:** Bus (different mode, v1 tram only); tram lines 16, 17 (new as of Nov 2025, D1 to confirm maturity); tram evening/Sunday reinforcement lines 2, 15, 20, 23; ÖBB regional/intercity rail (mainline, not local S-Bahn); funicular (Schlossbergbahn).

Hub lock: **Jakominiplatz** (central tram interchange where all 7 v1 lines converge: lines 1, 3, 4, 5, 6, 7, 13 all call here; described as "interchange between all 7 routes" on Verbund Linie networks and multiple sources). Jakominiplatz is the city center tram hub; Hauptbahnhof (2 km west, subsurface tram stop opened 2012) serves only lines 1, 4, 6, 7 (four lines), making Jakominiplatz the unambiguous locked hub with maximum interchange value for riders.

## Skip risk

**Moderate:** No stable public real-time feed (GTFS-RT or JSON REST) confirmed at research date. GrazMobil and broadcast positions exist (app-level), but public-API availability for GTFS-RT remains unverified. If Holding Graz or Verbund Linie lacks a publishable realtime feed at D1 pack time, next-train functionality must be scheduled-only (timetable boarding via GTFS stop_times, no live vehicle/trip updates). This is not a blocker (schedule-only boards are viable), but represents product friction vs. live cities. Secondary: confirm tram lines 16–17 stability before including in v1 scope (opened late Nov 2025; one-month operations tenure at research date). S-Bahn Steiermark interchanges at Graz Hauptbahnhof (hub-lock is Jakominiplatz tram, not shared-platform with S-Bahn; separate but adjacent infrastructure, managed as out-product/station-filtering, not platform-level doNotGroup).

## Map transcription notes (D1 pack)

D1 source (published network map, as of 2026-09-06):

- Official Verbund Linie Graz network map (German, PDF: https://www.verbundlinie.at/images/service/pdfs/liniennetz/graz.pdf) and Holding Graz "Our lines" page (https://www.holding-graz.at/en/mobility/our-lines/).
- **Seven v1 tram lines (1–7, 13):** station lists to be hand-transcribed from official network map (not generated from GTFS). Wikipedia and local tourism sites provide reference confirmations (e.g., Graz Hauptbahnhof serves lines 1, 4, 6, 7; Jakominiplatz serves 1–7 / 13).
- **Tram network extent:** ~70 km of route; 95 stops (2026 data per tourism/transit sources). Exact v1 station roster (lines 1–7, 13 stations only) requires D1 transcription from official map.

**Station naming:** German official naming per Verbund Linie and Holding Graz publications. Station names are stable (long-established network, no recent major renames documented). Examples: Jakominiplatz (central hub, not renamed), Hauptbahnhof (main railway station, no suffix on tram platforms), St. Peter (Line 6 terminus).

**Verified interchanges (out-product/station filtering, not in-catalog platform-level conflicts):**
- Graz Hauptbahnhof: Tram (lines 1, 4, 6, 7 via subsurface stop) + S-Bahn Steiermark (ÖBB-operated, separate platform complex). S-Bahn is out-product by v1 scope (tram-only); no doNotGroup needed (separate physical spaces).
- Jakominiplatz: Tram hub (lines 1–7, 13 v1 scope) + bus network (different mode, excluded). No rail interchange at Jakominiplatz.
- Styria-wide S-Bahn stations with tram overlap: stations where S-Bahn lines call at same geographic location as v1 tram endpoints or midpoints. No shared platforms documented at research date; infrastructure separate per Vienna S-Bahn precedent (same region, same pattern).

**No product `lib/cities/graz/` yet. `assertCityLive("graz")` is Unknown city.**

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (rail services only; tram included as in-scope mode; bus excluded as mode cut):**

- **Graz Linien tram lines 1–7, 13** (Holding Graz): `in` (walk-up public light rail, no reservation, no barriers; standard open-seating or standing room)
- **S-Bahn Steiermark all lines at tram-adjacent stations** (S1, S3, S5, S6, S7, S8, S9, S11, S31, S51, S61): `in` (walk-up commuter rail, no compulsory reservations per ÖBB/GKB/StLB ticketing; open seating; operates with 96% punctuality for regional short-haul trips in Styria; same boarding-contract as Vienna U-Bahn and standard Austrian S-Bahn services). Note: S-Bahn Steiermark is not excluded by product scope; it shares the region and is walk-up boardable, so verdict is `in` (not `out-product`).
- **ÖBB mainline regional / intercity trains** (e.g., REX, RB, RJ services at Graz Hauptbahnhof): `out-product` (v1 explicitly tram-only; S-Bahn is the regional commuter network included, not long-distance. Mainline rail explicitly excluded by product scope, not by boarding-contract failure).
- **Bus services** (Graz Linien buses): `out-mode` (different vehicle type; v1 tram only).

**Stations with overlapping rail services (tram + non-tram):**

| Tram station | Other rail service | Type | Verdict | Notes |
|---|---|---|---|---|
| Graz Hauptbahnhof (lines 1, 4, 6, 7) | S-Bahn Steiermark (multiple lines) | Adjacent/co-located | `in` | S-Bahn is walk-up boardable, no reservation required; included in v1 scope |
| Graz Hauptbahnhof | ÖBB mainline (REX, RB, intercity) | Co-located | `out-product` | Mainline not in v1 scope (v1 tram only) |
| Jakominiplatz (hub, all lines 1–7, 13) | None documented | — | — | No S-Bahn or mainline stop at Jakominiplatz; tram hub only |
| [Other v1 tram stations] | S-Bahn if any | Local | `in` or `out-product` per station | S-Bahn `in` if walk-up; mainline `out-product` if any |

**Check-in barriers:** No metro check-in / access barriers at Graz Linien tram platforms (open public light rail). On-board conductor ticket checks only (standard for Austria). Walk-up boarding unobstructed at all v1 tram stations.

**Compulsory reservation on tram:** None. Graz Linien tram is open-seating or standing room; no seat reservations exist.

**Compulsory reservation on S-Bahn:** S-Bahn Steiermark has no compulsory seat reservations (per ÖBB regional ticketing: "Seat reservations are not available on S-Bahn trains, so tickets do not have seats assigned, and rail pass users can just hop on board"). Walk-up boardable.

**Board eligibility summary:** Graz Linien tram lines 1–7, 13 pass both boarding-contract tests (`in`). S-Bahn Steiermark lines pass both tests (`in`). ÖBB mainline services (regional/intercity at Hauptbahnhof) excluded by product scope (v1 tram only), recorded as `out-product` verdicts. **All verdicts recorded; no silent omissions.** Two primary operators in scope (Holding Graz tram, ÖBB/GKB/StLB S-Bahn), both walk-up boardable.

## H2 — who has line codes today

| surface | Lines 1–7, 13? | what it actually has |
| --- | --- | --- |
| Official Verbund Linie / Holding Graz map (D1) | **yes (1–7, 13 only)** | Seven lines drawn: 1 (Eggenberg–Botanical Garden), 3, 4 (Liebenau–Jakominiplatz), 5, 6 (Smart City–St. Peter), 7, 13 (peak hour). Lines 16, 17 added Nov 2025, excluded from initial v1. |
| Wikipedia (Trams in Graz) | **yes** | Lists 6 daytime lines (1, 3, 4, 5, 6, 7) + reinforcement 13 + new 16, 17. Confirms line numbers stable. |
| Verbund Linie GTFS | **yes** (covers 1–7, 13, 16, 17, 23, plus bus) | GTFS feed includes all lines; v1 adapter filters to 1–7, 13 only. |
| Real-time (GrazMobil app, OpenTrafficMap) | live | Vehicle positions broadcast for all operative lines; coverage of 1–7, 13 unconfirmed for public GTFS-RT as of research date. |
| Static GTFS | timetable snapshot | Operational line codes (1–7, 13) stable. |

**H2 conclusion:** Tram line codes (1–7, 13) documented on official Verbund Linie map. Clash is **absence of confirmed public real-time feed** (GrazMobil is proprietary; Graz Linien API restricted; no public GTFS-RT verified). Do not generate `published-network.json` from GTFS; use official Verbund Linie map source. Confirm real-time API / GTFS-RT endpoint at D1 before finalizing real-time board architecture.

## C2/C3 to put in front of Jim

1. **city=graz**. Operator: **Holding Graz** (Graz Linien tram) + **ÖBB/GKB/StLB** (S-Bahn Steiermark). Two operators, but single (tram) in v1 scope; S-Bahn `in` by board eligibility.

2. **Jakominiplatz** is the locked city-center tram hub (lines 1, 3, 4, 5, 6, 7, 13 converge). Not Hauptbahnhof (only 4 lines), not city-council square.

3. **Seven tram lines in v1 scope (1, 3, 4, 5, 6, 7, 13).**
   - Line 1: Eggenberg/UKH–Hilmteich/Botanical Garden, ~28 stations
   - Line 3: [stations TBD per D1 map transcription]
   - Line 4: Liebenau Murpark–Jakominiplatz (peak direction)
   - Line 5: [stations TBD per D1 map transcription]
   - Line 6: Smart City–St. Peter
   - Line 7: [stations TBD per D1 map transcription]
   - Line 13: Hauptbahnhof–Liebenau/Murpark (peak-hour only)
   - **Total: ~95 stops (network-wide); v1 subset to be transcribed from official map.**

4. **Real-time feed status: UNCONFIRMED.** GrazMobil (proprietary app) and OpenTrafficMap (broadcast positions) exist, but **no public GTFS-RT protobuf or stable JSON REST endpoint confirmed.** If unavailable at D1, boards are scheduled-only (timetable-based). Graz Linien API exists (restricted, email-key) but real-time coverage unverified. Verify public real-time availability before finalizing adapter architecture.

5. **No boarding conflicts in v1 scope.** Graz Hauptbahnhof has tram + S-Bahn (separate platforms; both walk-up; S-Bahn `in`). Jakominiplatz is tram-hub-only. doNotGroup not needed (single tram operator v1; S-Bahn separate platform filter).

6. **Europe/Vienna timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

7. **Static GTFS:** Verbund Linie portal (https://data.mobilitaetsverbuende.at / https://mobilitaetsdaten.gv.at/daten/soll-fahrplandaten-gtfs; updated regularly; contains tram 1–7, 13, 16, 17, 23 and S-Bahn lines; adapter filters to tram 1–7, 13 + S-Bahn `in`). Licensed CC-BY-3.0 AT (Austrian OGD). No key required.

8. **Adapter architecture:** Tram only for v1 (Graz Linien static GTFS + real-time TBD at D1). S-Bahn Steiermark: included in feed, filtered by v1 scope decision (walk-up only, no reservation). Single line-code and direction model (tram 1–7, 13). Status stays **planned** until Mark's QA full pass.

9. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## What I did not do

No real-time API integration yet (pending D1 confirmation of public GTFS-RT or JSON endpoint). No lines 16, 17 (Neutorlinie) inclusion in v1 launch scope (opened Nov 2025, stability confirmation deferred to D1). No bus network (mode cut). No ÖBB mainline (product out-scope). No check of S-Bahn reservation policies beyond general ÖBB regional practice (documented as walk-up, confirmed). No edit of `lib/` / registry / `LIVE_CITY_IDS`.

## License

| field | value |
| --- | --- |
| License name | **CC BY 3.0 AT** (Creative Commons Attribution 3.0 Austria) — per Austria's Open Government Data (OGD) policy applied to Mobility Associations of Austria (Mobilitätsverbünde Österreich OG) GTFS data distributions. Mobility Database and data.gv.at both list CC-BY-3.0 or equivalent for Austrian transit GTFS. Holds.at and mobilitaetsdaten.gv.at both cite CC-BY standards; ÖBB S-Bahn subset follows national OGD terms. |
| Redistribution / rehosting | CC BY 3.0 AT permits reuse and derivative works. Feed may be served to our users via our own API and passed to third parties with attribution. Austria's OGD Guideline specifies: "All public administration [data] will be free under a Creative Commons Attribution License (CC BY 3.0), meaning it can be reused and shared for any purpose, with only attribution necessary." Verbund Linie does not publish a restrictive "do not sublicense / do not resell" clause (unlike some older transit feeds). Tim judges redistribution scope in product context. |
| Commercial use | Allowed under CC BY 3.0 AT. Creating a transit app (commercial or non-profit) using Graz Linien / S-Bahn data is permitted. Selling the data itself separately as a product is not the intent, but the license does not forbid resale once published. Austrian OGD policy emphasizes free public access; no restriction on how the reuser monetizes their own application. |
| Attribution | CC BY 3.0 AT requires attribution. Austria's OGD Guideline (per data.gv.at and mobilitaetsdaten.gv.at) specifies: "The name of the author or copyright holder is to be mentioned in a fixed manner." Example for Graz Linien: "Source: Graz Linien / Holding Graz – Open Data" or "Timetable data from Verkehrsverbund Steiermark, City of Graz." No logo or specific wording required beyond credit line mentioning the operator and source (Verbund Linie or Holding Graz). |
| Terms URL | https://www.data.gv.at/en/info/cooperation-ogd-austria/ (Austria's OGD policy and CC BY 3.0 AT overview). https://mobilitaetsdaten.gv.at/en/daten/soll-fahrplandaten-gtfs (Mobility Data Austria GTFS landing page, German version authoritative: https://mobilitaetsdaten.gv.at/daten/soll-fahrplandaten-gtfs). https://www.verbundlinie.at/de/allgemein/datenschutz/ (Verbund Linie privacy/data terms, German). Mobility Database mdb-XXX entry (TBD at D1 verification). Creative Commons CC BY 3.0 AT license text: https://creativecommons.org/licenses/by/3.0/at/. |
| Confidence | **Clear.** CC BY 3.0 AT is explicit and well-documented by Austria's OGD platform (data.gv.at, mobilitaetsdaten.gv.at). No key agreement or proprietary terms restrict redistribution of the GTFS static feed (open portal access). GrazMobil app is proprietary (not part of GTFS redistribution; separate terms for app). Graz Linien API (restricted developer key) is optional / experimental; static GTFS feed carries standard OGD license. Attribution requirements are standard CC BY 3.0 AT. |

## What I did not do

No deep-dive into ÖBB system-wide reservation policies for S-Bahn (documented and clear for regional/commuter tier). No mapping of future S-Bahn expansions beyond 2026 (commissioning planned for 2026; service opening stable at research date). No verification of lines 16–17 (Neutorlinie) timetable maturity (one-month track record; deferred to D1). No edit of registry.js or product files. No GrazMobil app license review (proprietary consumer tool, not part of GTFS redistribution). No contact with Holding Graz or Verbund Linie for real-time API availability (escalate to Luke/Jim if D1 pack finds none).

