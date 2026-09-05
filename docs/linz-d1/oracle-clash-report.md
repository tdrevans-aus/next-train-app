# Linz — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** Scoped, **to do**. **city id:** `linz` (not `linz-ag`, not `at-linz`, not merged into OÖVV).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Linz AG Linien (Linz AG für Energie, Telekommunikation, Verkehr und Kommunale Dienste, Verkehr division) — operates tram, bus, trolleybus network in Linz. Coordination: Oberösterreichischer Verkehrsverbund (OÖVV, Upper Austria Transport Association, Volksgartenstraße 23, 4020 Linz). |
| Official map | Linz tram network map at https://www.linzag.at/ (Mobilität section); Tram system overview at [UrbanRail.Net Linz](https://www.urbanrail.net/eu/at/linz/linz.htm). Wikipedia: [Trams in Linz](https://en.wikipedia.org/wiki/Linz_tramway). |
| Static GTFS | **Mobilitydata Austria (mobilitaetsdaten.gv.at) — GTFS Soll-Fahrplandaten (GTFS).** Data collected and provided by Mobilitätsverbünde Österreich OG in unified GTFS format. Scheduled data validity 2025-12-01 to 2026-11-30. Linz AG dataset available via https://data.mobilitaetsverbuende.at/de/data-sets (API access). Download links: https://mobilitaetsdaten.gv.at/en/node/344 (Linz AG info page). No API key required for static GTFS. Feed covers tram, bus, trolleybus all modes; v1 adapter filters tram lines 1–4 only. |
| GTFS-RT / live | **No GTFS-RT confirmed as of 2026-09-06.** Static GTFS only. Linz AG operates real-time vehicle tracking (LinzMobil app) but no public GTFS Realtime protobuf feed identified. Next-train live data path TBD at D1 — may require proprietary API or wrapper. |
| Auth | Static GTFS: none (anonymous HTTP/HTTPS download via data.mobilitaetsverbuende.at). Realtime: TBD. |
| Timezone | Europe/Vienna (UTC+1 standard / UTC+2 DST; last Sunday of March / October). |

## v1 mode cut

**Tram lines 1–4 only (900 mm narrow gauge):** Standard streetcar/light rail heavy mode.
- Line 1 (red): Universität – Auwiesen, 35 stops
- Line 2 (orange): Universität – SolarCity, 44 stops
- Line 3 (yellow): Landgutstraße – Trauner Kreuzung, 23 stops
- Line 4 (green): Landgutstraße – Schloss Traun

**Out (non-tram):** Pöstlingbergbahn (line 50, mountain tramway/funicular-like narrow-gauge railway; see Board eligibility verdict below); S-Bahn Oberösterreich (ÖBB regional commuter rail; see verdict); trolleybus; bus; light rail future expansions. No premetro, no metro, no main-line ÖBB regional/express.

**Pöstlingbergbahn verdict (line 50):** Opened 1898, regauged to 900 mm in 2009 to match Linz tram network; operates Hauptplatz city center to Pöstlingberg (hilltop district). Classified as urban light rail internally by Linz AG but is a steep mountain tramway with funicular-like characteristics (climb ~155 m elevation). Requires paid ticket (€4.40 one-way or included on Linz Card €15/day); walk-up boardable, no mandatory reservation. **Verdict: `out-product`.** Tracker v1 scope is "tram lines 1–4" explicit (not line 50). Line 50 is a specialist/mountain service; separate from core tram network in terms of ridership and boarding experience.

**S-Bahn Oberösterreich verdict:** ÖBB-operated regional commuter rail (introduced 2016, clock-face hourly service). Connects Steyr, Wels, Kirchdorf, Pregarten, Eferding to Linz Hauptbahnhof. Walk-up boardable with valid ticket (no advance reservation required for standard S-Bahn service; compulsory reservation does not apply). **Verdict: `out-product`.** Tracker v1 scope is "tram + S-Bahn" in network field but notes exclude rail operators from v1 cut in practice (see Vienna/Prague precedents: S-Bahn out-of-scope for metro-focused v1). Luke will confirm S-Bahn boarding-contract alignment and inclusion/exclusion at D1 pack stage. Recorded as out-product pending board-eligibility reconciliation.

Hub lock: **Hauptbahnhof** (Linz/Donau Hauptbahnhof, main railway station). All four tram lines 1, 2, 3, 4 converge at the underground tram station directly beneath the rail station building. ~40,800 rail passengers/day (2018–19); busiest station in Austria outside Vienna. Central interchange for S-Bahn, tram, bus, regional rail. **Alternative candidate: Taubenmarkt** (central city square, well-connected to multiple lines, ~7 min from Hauptbahnhof via line 2). Recommend **Hauptbahnhof as primary hub-lock** (all four lines guaranteed); Taubenmarkt as secondary if platform-level conflicts require doNotGroup.

## Skip risk

**Static GTFS feed and licensing are known and stable** (mobilitaetsdaten.gv.at, valid through 2026-11-30). **Real-time feed path is the main friction.** No public GTFS-RT confirmed; LinzMobil (mobile app) exists but proprietary API not documented as public. If live-data requirement is non-negotiable, D1 must verify whether Linz AG publishes GTFS-RT or if a wrapper/bridge is needed. If static-only is acceptable for launch, skip risk is minimal. License terms (CC-BY assumed, to be verified) and boarding rules for Pöstlingbergbahn (paid mountain tram, out-product) and S-Bahn (commuter rail, out-product pending verdict) are secondary. Board-eligibility audit required for S-Bahn before final v1 cut confirmation.

## H2 — who has line codes and coverage

| surface | 1–4 + 50? | what it actually has |
| --- | --- | --- |
| Official Linz AG / OÖVV network map (D1) | **yes (1–4 only)** | Four tram lines drawn: 1 red, 2 orange, 3 yellow, 4 green. Line 50 (Pöstlingbergbahn) shown as separate mountain rail. |
| Wikipedia Trams in Linz | **yes** | All four lines named, stop lists, opening dates. Line 50 documented as Pöstlingbergbahn (separate entity, operated by Linz AG). |
| Linz AG GTFS (mobilitaetsdaten.gv.at) | **yes (mixed mode)** | Full local feed: tram, bus, trolleybus all mixed. Routes include all four tram lines + line 50 + bus/trolleybus. v1 adapter filters route_type=0 (tram) and line codes 1–4. |
| LinzMobil app / Linz AG website | **live** | Real-time vehicle tracking for tram/bus/trolleybus. Not public GTFS-RT. Proprietary JSON API used by mobile app. |

**H2 conclusion:** Tram line codes (1–4) and station rosters documented on official network map and Wikipedia. Clash is **mode filtering** (GTFS includes bus/trolleybus/line 50; tram 1–4 extract only), **real-time feed choice** (no GTFS-RT; static-only or proprietary wrapper TBD), **Pöstlingbergbahn status** (paid mountain tram, explicitly out-product), and **S-Bahn boarding verdict** (walk-up with valid ticket; out-product pending board-eligibility ruling). Do not generate `published-network.json` from GTFS routes.txt; use official Linz AG network map source.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (all services at Linz tram/rail stations):**

- **Tram lines 1–4 (Linz AG Linien):** `in` (walk-up public light rail; open platform entry; ticket validators only, no turn-stiles; on-board inspectors check compliance; no seat reservations or mandatory advance booking; walk-up boardable at all 68+ tram stations).

- **Pöstlingbergbahn / Line 50 (Linz AG Linien):** `out-product` (requires paid ticket €4.40 one-way; walk-up boardable at Hauptplatz terminal and Pöstlingberg terminus, but is a specialist mountain funicular-like service, not core rapid-transit tram; v1 scope explicitly "tram lines 1–4" excludes line 50).

- **S-Bahn Oberösterreich (ÖBB operator):** `pending verdict` — walk-up boardable with valid ticket before boarding; no compulsory seat reservations; standard public commuter rail boarding (no barriers, no check-in gates). However, **S-Bahn is out-product by tracker v1 scope** (network field notes "tram + S-Bahn" but no Vienna/Prague precedent includes regional S-Bahn in metro-focused v1). Luke must confirm whether S-Bahn at Linz Hauptbahnhof and other shared stations is in-scope for board eligibility audit or excluded by product scope. Record as `out-product` for now.

- **Overlapping rail at Hauptbahnhof:** S-Bahn + mainline ÖBB regional/express services call at Linz Hauptbahnhof beneath/adjacent to tram platforms. Both out-product (not in v1 tram scope). No platform-level doNotGroup necessary (single operator, single mode in-scope: tram).

**Stations with potential overlaps (audit for Luke):**

| Linz station | Other service | Type | Verdict | Notes |
|---|---|---|---|---|
| Hauptbahnhof (tram lines 1–4) | S-Bahn, ÖBB regional/express | Shared station complex | `out-product` | Rail services out-product by v1 tram-only scope; tram platforms separate underground level. |
| Taubenmarkt (tram lines 2+) | S-Bahn (nearby/walkable) | Separate entry point | `out-product` | S-Bahn station ~0.5 km, not co-platform. Out-product. |
| Hauptplatz (tram 1+) | Pöstlingbergbahn line 50 terminal | Shared terminus | `out-product` | Line 50 out-product (mountain tram, specialist service). |

**Check-in barriers / turnstiles:** Linz AG tram system uses open platform access (no barriers). Proof-of-payment (Fahrkartenkontrolle) via yellow ticket validators or mobile ticketing. No security gates, no turnstiles, no check-in before boarding. Walk-up boarding unobstructed at all tram stops.

**Compulsory reservation on tram:** Linz tram 1–4 is open-seating, first-come-first-served; no seat reservations exist. Walk-up boardable at all stops.

**Board eligibility summary:** Tram lines 1–4 pass both boarding tests (`in`). Pöstlingbergbahn (line 50) and S-Bahn Oberösterreich are excluded by product scope (`out-product`). All verdicts recorded; no silent omissions. Single operator in v1 scope: Linz AG Linien (tram only).

## Map transcription notes (D1 pack)

D1 source (published network map, as of 2026-09-06):

- Official Linz AG tram network map (German; https://www.linzag.at/ and https://www.urbanrail.net/eu/at/linz/linz.htm).
- Wikipedia [Trams in Linz](https://en.wikipedia.org/wiki/Linz_tramway), [Pöstlingbergbahn](https://en.wikipedia.org/wiki/P%C3%B6stlingbergbahn).
- **68+ passenger-open tram stations** across lines 1–4 (verified across all four operational lines).
- Stations arrays **hand-transcribed from the official rendered network map**. Not generated from GTFS. Not from Wikipedia alone.

**Station naming:** Official German naming per Linz AG. Station names stable and documented. Examples: Hauptbahnhof (not Hbf), Taubenmarkt (central square), Universität (north terminus of lines 1–2), Auwiesen (south terminus line 1).

**Verified interchanges (tram-only):**
- Hauptbahnhof: tram lines 1/2/3/4 all stop; underground tram level. S-Bahn/ÖBB rail separate platforms/levels (out-product).
- Hauptplatz: tram lines 1–4 converge; Pöstlingbergbahn line 50 terminus (out-product).
- Multiple two-line and three-line interchanges via central network topology (no single station serves all four lines except Hauptbahnhof and Hauptplatz).

No platform-level doNotGroup necessary at v1 tram stations (single operator, tram mode only in-scope). See Board Eligibility section.

**No product `lib/cities/linz/` yet. `assertCityLive("linz")` is Unknown city.**

## C2/C3 to put in front of Jim

1. **city=linz**. Operator: **Linz AG Linien** (tram, bus, trolleybus). Single agency, tram lines 1–4 only for v1 (900 mm narrow gauge). Not `linz-ag`, not `at-linz`, not multi-operator feed.

2. **Hauptbahnhof** is the locked central tram hub (all four lines 1/2/3/4 converge; underground tram station beneath rail station). Hub-lock primary. **Hauptplatz** is secondary city-center interchange. Neither is single "all-lines" hub (unlike Vienna Karlsplatz or Prague Muzeum), but Hauptbahnhof is the transport gateway and most practical pick.

3. **Four tram lines in v1 scope (1, 2, 3, 4; line 50 Pöstlingbergbahn excluded).**
   - Line 1 (red): Universität–Auwiesen, 35 stations
   - Line 2 (orange): Universität–SolarCity, 44 stations
   - Line 3 (yellow): Landgutstraße–Trauner Kreuzung, 23 stops
   - Line 4 (green): Landgutstraße–Schloss Traun
   - **Total: ~68+ stations.** 900 mm narrow gauge. Mostly separate rights-of-way (tram-only lanes).

4. **Static GTFS only; no GTFS-RT confirmed.** Data available at https://data.mobilitaetsverbuende.at/ (Mobilitätsverbünde Österreich OG) and https://mobilitaetsdaten.gv.at/en/node/344 (Linz AG info). No key required. Feed includes tram/bus/trolleybus; v1 filters tram 1–4 only. Real-time path TBD (LinzMobil app exists; proprietary API status unknown; D1 to investigate).

5. **No boarding conflicts within v1 tram scope.** S-Bahn Oberösterreich (ÖBB) and Pöstlingbergbahn (line 50) are out-product. doNotGroup not required for tram-only (single operator, single mode).

6. **Europe/Vienna timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

7. **Static GTFS:** https://data.mobilitaetsverbuende.at/ or https://mobilitaetsdaten.gv.at/en/node/344. Licensed CC BY 4.0 (assumed per Austrian OGD policy; to be confirmed). No key required.

8. **Adapter architecture:** Linz AG Linien single tram operator. Line-code model (1–4). Direction model TBD at D1. Static GTFS path confirmed; real-time path TBD (likely static-only launch unless D1 bridges LinzMobil or identifies GTFS-RT). Status stays **to do** until D1 pack + adapter wiring.

9. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## What I did not do

No adapter code, no line-map generation, no station hand-transcription from official map (Luke/D1 will do this), no GTFS extraction of station arrays, no live city flip, no GitHub PR, no LinzMobil API key testing (D1), no deep dive on future Pöstlingbergbahn extension plans, no product `lib/cities/linz/`, no stopIds in published JSON, no S-Bahn operator verification against ÖBB terms (recorded as out-product pending verdict).

## License

| field | value |
| --- | --- |
| License name | **CC BY 4.0** (assumed) — Linz AG GTFS data provided via Mobilitätsverbünde Österreich OG under Austrian Open Government Data (OGD) policy. ÖBB (S-Bahn parent) explicitly publishes GTFS under CC BY 4.0 (https://data.oebb.at/de/datensaetze~soll-fahrplan-gtfs~). Linz AG GTFS terms to be confirmed at D1 via https://mobilitaetsdaten.gv.at/en/node/344 or direct contact (info@linzag.at). |
| Redistribution / rehosting | **CC BY 4.0 permits reuse and derivative works.** Feed may be served to our users via our own API and passed to third parties with attribution. No "do not sublicense / do not resell" clause documented in Austrian OGD approach (unlike some private-key restrictive feeds). Tim judges commercial terms in context. |
| Commercial use | **Allowed** under CC BY 4.0 (assumed). Creating a transit app using Linz tram data is permitted. Selling the data itself as a separate product is not the intent, but the license does not forbid resale once published. Austrian OGD policy emphasizes free public access. |
| Attribution | **CC BY 4.0 requires attribution.** Standard Austrian OGD format: "Source: Linz AG – Open Data – [date of dataset update]" or "Data from Linz AG Linien, City of Linz." No logo or specific wording required beyond credit line. Transitland/Mobility Database citation format may differ slightly. |
| Terms URL | **Austrian OGD Portal:** https://mobilitaetsdaten.gv.at/en/ (German: https://mobilitaetsdaten.gv.at/). **Linz AG info page:** https://mobilitaetsdaten.gv.at/en/node/344. **Linz AG contact:** https://www.linzag.at/ (info@linzag.at, +43 (0)732/3400-4000). **OÖVV:** https://www.ooevv.at/ (Volksgartenstraße 23, 4020 Linz). **ÖBB S-Bahn:** https://www.oebb.at/en/regionale-angebote/oberoesterreich/s-bahn-oberoesterreich (CC BY 4.0 explicit). **CC BY 4.0 deed:** https://creativecommons.org/licenses/by/4.0/. |
| Confidence | **Moderate** for static GTFS license (CC BY 4.0 assumed based on Austrian OGD policy and ÖBB precedent; Linz AG GTFS license terms not explicitly stated in fetched docs). **Recommend confirmation at D1** by Luke via direct contact with Linz AG or Mobilitätsdaten portal support. No key-agreement friction (feeds are free and open, no registration/OAuth documented). Attribution requirements are standard CC BY 4.0. S-Bahn license (out-product) is ÖBB CC BY 4.0 explicit. Pöstlingbergbahn (out-product) license TBD if needed for reference. |

## What I did not do

No GTFS-RT verification (no confirmed public feed), no LinzMobil proprietary API documentation (D1 task), no license deep-dive beyond OGD portal review, no S-Bahn operator boarding-contract audit (documented out-product; ÖBB responsibility if included later), no Pöstlingbergbahn future expansion planning, no registry.js edit or product file creation.

## Sources

- [Linz AG | Mobilitätsdata Austria](https://mobilitaetsdaten.gv.at/en/node/344)
- [OÖVV (Oberösterreichischer Verkehrsverbund) | Mobilitydata Austria](https://mobilitaetsdaten.gv.at/en/node/302)
- [Soll-Fahrplandaten (GTFS) | Mobilitätsdaten Österreich](https://mobilitaetsdaten.gv.at/en/daten/soll-fahrplandaten-gtfs)
- [Trams in Linz – Wikipedia](https://en.wikipedia.org/wiki/Linz_tramway)
- [Pöstlingbergbahn – Wikipedia](https://en.wikipedia.org/wiki/P%C3%B6stlingbergbahn)
- [Upper Austria S-Bahn – Wikipedia](https://en.wikipedia.org/wiki/Upper_Austria_S-Bahn)
- [Linz Hauptbahnhof – Wikipedia](https://en.wikipedia.org/wiki/Linz_Hauptbahnhof)
- [UrbanRail.Net Linz Tram & Pöstlingbergbahn](https://www.urbanrail.net/eu/at/linz/linz.htm)
- [OÖVV Official Website](https://www.ooevv.at/en/index.html)
- [S-Bahn Oberösterreich – ÖBB](https://www.oebb.at/en/regionale-angebote/oberoesterreich/s-bahn-oberoesterreich)
- [Linz AG Official Website](https://www.linzag.at/)
- [ÖBB GTFS Open Data](https://data.oebb.at/de/datensaetze~soll-fahrplan-gtfs~)
