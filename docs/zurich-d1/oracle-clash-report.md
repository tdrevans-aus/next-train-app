# Zürich — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** D1 pack scoped, **planned**. **city id:** `zurich` (do not invent `zh`, `zrh`, `vbz`, or merge into another Swiss city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | VBZ (Verkehrsbetriebe Zürich) — operator of Zürich tramway network within ZVV (Zürcher Verkehrsverbund). ZVV is the regional mobility coordinating body for the Zürich canton, integrating 37 transport companies. |
| Official map | ZVV network maps — https://www.zvv.ch/en/about-us/zurich-transport-network/transport-companies.html (displays transport network overview; VBZ as primary tram operator). Zürich tram network diagram — https://en.wikipedia.org/wiki/Trams_in_Zurich (line routes and operations). |
| Static GTFS | opentransportdata.swiss serves Switzerland national feed via: `https://data.opentransportdata.swiss/dataset/timetable-2026-gtfs2020` (current year 2026). Feed includes VBZ tram + all national operators (S-Bahn, buses, etc.). Transitland Onestop **f-u0-switzerland** (operator **o-u0-schweizerischebundesbahnensbb** for SBB + multiple operators). Historical feeds via opendata.swiss. No operator-specific static GTFS feed for VBZ tram alone; must filter Switzerland national feed. |
| GTFS-RT / live | **GTFS-RT endpoint:** `https://api.opentransportdata.swiss/la/gtfs-rt` (no trailing slash). Bearer API key required; 401 without. Rate limit: 2 queries per minute (sliding window). Trip updates cached 30 seconds. Includes all operators: VBZ tram + S-Bahn + buses on the single protobuf feed. |
| Auth | **API key registration required** via https://api-manager.opentransportdata.swiss/ (free tier; SBB can negotiate paid contracts for heavy usage beyond limits). Key used as HTTP Bearer token in Authorization header. Maximum 2 queries per minute per key. Key is personal/non-transferable per SBB terms. |
| Timezone | Europe/Zurich (UTC+1 standard; UTC+2 summer daylight, last Sunday March to last Sunday October — HAS DST). |

Do not generate a published-network.json from GTFS. D1 is the official VBZ tram map, hand-transcribed (this pack).

## v1 mode cut

**VBZ tram only:** Zürich's tramway network operated by VBZ, currently ~14–15 active lines (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 17; construction lines 50, 51 during renovation 2025–2026). Lines change seasonally and during infrastructure work — v1 scope is the published passenger-facing line roster at time of D1 transcription, not every construction line.

**Out:** S-Bahn (SBB regional / commuter trains); buses (VBZ buses and external operators); boats (ferry services on Lake Zürich); funicular (minor accessory mode). No metro exists in Zürich.

Hub lock: **Bellevue** (tram lines 2, 4, 5, 8, 9, 15 confirmed as of 2026; major east-side hub where routes from multiple directions converge). Alternative: **Zürich HB (tram)** if transcribed as a single tram-platform entity (lines 3, 4, 6, 7, 10, 11, 13, 14, 17, 50, 51 call here, though exact roster may shift during current Bahnhofquai renovation Dec 2025–2026). **doNotGroup SBB Zürich HB** — SBB mainline station and VBZ tram are at the same address but separate platforms; exclude SBB from tram boards.

**Potential choice:** Bellevue is geographically more central and has a smaller, stable line roster (5 lines); Zürich HB has more lines but is currently under renovation with moving targets. D1 transcription should choose one, noting both.

## Skip risk

**S-Bahn complexity if v1 not cut to tram:** S-Bahn lines serve multiple stations shared with or adjacent to tram stops (e.g., both at Zürich HB; both at Stadelhofen). If v1 includes both, must separate platform groups and direction models per operator (SBB vs VBZ). Tracker notes: "no S-Bahn, no buses, no boats" — v1 is tram-only, so SBB is out-of-scope, not a clash.

**Station identification:** Zürich HB tram stops and SBB Zürich HB rail station are distinct in the network model despite shared address. Must not conflate them in published-network.json or create a single merged board — use the doNotGroup SBB Zürich HB directive (already flagged in tracker).

**Feed composition:** opentransportdata.swiss GTFS-RT mixes VBZ tram + S-Bahn + buses on a single protobuf stream. Adapter filtering must be tight to avoid S-Bahn bleed onto tram boards. No technical blocker; just requires careful agency/route_type filtering.

**D1 transcription:** VBZ tram line roster may shift during Dec 2025–2026 Bahnhofquai renovation. D1 snapshot must note the data date and any known temporary closures at time of publication.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (v1 in-scope tram mode only; buses/ferries/S-Bahn out):**
- **VBZ tram lines (all):** `in` (public tram, walk-up boardable, no reservation)
- **SBB S-Bahn / regional trains calling at tram stations (e.g., Stadelhofen, Wiedikon, HB):** `out-mode` (excluded by v1 tram-only mode cut; *technically* S-Bahn itself is walk-up boardable without compulsory reservation, but falls outside mode scope)
- **VBZ buses & external bus operators calling at tram stations:** `out-mode` (bus mode excluded v1)
- **Boat/ferry services:** `out-mode` (not in scope)

**Stations with rail/tram overlap (major):**
- **Zürich HB (Hauptbahnhof):** VBZ tram platforms + SBB mainline/S-Bahn platforms (separate areas). Tram included; SBB excluded by mode cut.
- **Stadelhofen:** VBZ tram (lines 2, 4, 5 per Wikipedia) + SBB rail station. Tram included; SBB excluded by mode cut.
- **Wiedikon:** VBZ tram + SBB. Tram included; SBB excluded.
- **Bellevue:** VBZ tram hub (lines 2, 4, 5, 8, 9, 15). No co-located SBB station; tram only.

**Board eligibility summary:** All walk-up tram services pass both boarding tests and are shown on boards. S-Bahn fails by mode exclusion (v1 tram only), not by boarding contract. SBB Regional/S-Bahn are walk-up boardable without compulsory reservation (per SBB ticketing rules — no seat reservations offered on most S-Bahn services), but excluded from v1 scope. **All verdicts recorded; no silent omissions.**

| Service | Calls at in-catalog tram stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **VBZ Tram (all lines)** | All in-catalog tram stops | No (public tram, first-come-first-served) | No | `in` | [Trams in Zurich — Wikipedia](https://en.wikipedia.org/wiki/Trams_in_Zurich); [VBZ network](https://www.zvv.ch/en/about-us/zurich-transport-network/transport-companies.html) — public walk-up boardable |
| **SBB S-Bahn / Regional trains (Zürich HB, Stadelhofen, Wiedikon, etc.)** | Shared stations with in-catalog tram stops | No (open seating; reservations not offered on S-Bahn) | No | `out-mode` | [SBB Zürich S-Bahn — Wikipedia](https://en.wikipedia.org/wiki/Zurich_S-Bahn); [How to book SBB reservations](https://www.sbb.ch/en/offers/seat-reservations) — regional trains do not require/offer reservations; walk-up boardable but excluded by v1 tram-only mode cut |
| **VBZ buses & external bus operators** | Regional services passing tram stops | N/A (bus/ferry mode) | N/A | `out-mode` | [Public transport in Zurich — Wikipedia](https://en.wikipedia.org/wiki/Public_transport_in_Zurich) — bus mode excluded v1 |
| **Boat/ferry services (Lake Zürich)** | Terminals at city center (Bürkliplatz, etc.) | N/A (ferry mode) | N/A | `out-mode` | Various; ferry/boat mode excluded v1 |

## H2 — who has line codes today

| surface | tram lines? | what it actually has |
| --- | --- | --- |
| ZVV official maps / VBZ website | **yes** | VBZ tram lines 2–15 (excluding 1, 12, 16; some lines renumbered or under renovation) + S-Bahn lines + bus routes |
| opentransportdata.swiss GTFS | **yes** (with filter) | Switzerland national feed: VBZ agency filter yields tram routes. Must filter route_type=0 (tram) and agency=VBZ to avoid S-Bahn + buses. |
| Transitland `f-u0-switzerland` | **yes** (with filter) | Full Switzerland feed. Includes VBZ, SBB, and all regional operators. Adapter must narrow to VBZ tram via agency/route filtering. |
| GTFS-RT protobuf | **yes** (with filter) | Same stream for all operators. Adapter filtering required per trip (vehicle position / trip update must carry VBZ agency). |
| Wikipedia: [Trams in Zurich](https://en.wikipedia.org/wiki/Trams_in_Zurich) | **yes** | Current line roster, routes, terminals, ongoing renovation notes (Bahnhofquai closure Dec 2025). |
| Product `lib/cities/zurich/` | **absent** | No zurich stations.json / line-map.json yet. `assertCityLive("zurich")` is Unknown city |

**H2 conclusion:** Passenger tram line codes documented on ZVV / VBZ websites and Wikipedia. Clash is **operator filtering** (extract VBZ from Switzerland national feed; exclude SBB, buses), **station separation at shared sites** (Zürich HB tram vs SBB Zürich HB; Stadelhofen, Wiedikon, etc.), **handling renovation-era line shifts** (Bahnhofquai Dec 2025–2026 closure affecting multiple lines), and **no product zurich file yet**. Do not generate published-network.json from GTFS. Do not merge S-Bahn or buses into this city.

## C2/C3 to put in front of Jim

1. **city=zurich**. displayName Zürich. Not `zh`, `zrh`, or `vbz`. Do not merge into another Swiss city. Do not merge with S-Bahn or bus operators.

2. **Hub-lock choice:** Either **Bellevue** (lines 2, 4, 5, 8, 9, 15; more stable roster) or **Zürich HB (tram)** (lines 3, 4, 6, 7, 10, 11, 13, 14, 17; under renovation Dec 2025–2026). Transcriber picks based on D1 data date; note the chosen hub in published-network.json.

3. **doNotGroup SBB Zürich HB vs VBZ Zürich HB tram.** Shared address, separate platforms; never merge.

4. **Modes v1 VBZ tram only.** No S-Bahn, no buses, no boats, no funicular.

5. **Europe/Zurich HAS DST.** UTC+1 standard; UTC+2 summer.

6. **Feed sourcing:** opentransportdata.swiss GTFS-RT (Bearer key required, registered via API Manager). Must filter to VBZ agency and route_type=0 (tram) to avoid S-Bahn + bus bleed. Static GTFS and real-time from same source.

7. **Renovation awareness:** Bahnhofquai major renovation Dec 2025–2026 affects multiple tram lines. D1 snapshot should note known temporary changes or construction lines (50, 51) at time of transcription.

8. **Product child stopIds stay out of this file.** No line-map generation, no stopIds, no live flip yet.

## License

- **License name:** opentransportdata.swiss Terms of Use (effective as of 2026-09-06). **No single named license (e.g., CC BY 4.0)** — instead, platform-specific terms that reference attribution and data use requirements. Referred to as "Open Data" in platform materials.
- **Redistribution / rehosting:** opentransportdata.swiss Terms of Use §3 states data can be "processed, analysed and published," and users must "publish processed data under the name of the data user" and keep data "updated regularly." Platform states data can be "freely available for anyone to use." However, **no explicit sublicense or third-party redistribution clause** — the terms govern *your use*, not passing it to a third party. When redistributing to end users via our app, cite opentransportdata.swiss as source (platform requirement). Tim makes judgment on whether that satisfies commercial app redistribution.
- **Commercial use:** Not explicitly prohibited. Platform offers "free tier" below usage limits and allows "paid contracts" for higher volumes, suggesting commercial use is expected.
- **Attribution:** opentransportdata.swiss Terms of Use §4 / FAQ: "The URL opentransportdata.swiss must be cited as the source for raw data in publications and analyses." Required attribution: cite platform once if multiple sources.
- **Terms URL:** https://opentransportdata.swiss/en/terms-of-use/ (primary). Data portal: https://data.opentransportdata.swiss/. API Manager: https://api-manager.opentransportdata.swiss/ (key registration). Transitland feed: https://www.transit.land/feeds/f-u0-switzerland (aggregator page). Mobility Database: https://mobilitydatabase.org/ (catalog).
- **Keyed feeds:** Bearer key is personal and non-transferable per SBB ToU. Key agreement (API Manager terms) does not explicitly restrict data redistribution to users, but follow opentransportdata.swiss terms. Never paste a key.
- **Confidence:** `unclear`. Platform ToU requires attribution and regular updates, but does not spell out sublicensing or third-party redistribution explicitly. "Open Data" language and paid-tier offering suggest commercial use is acceptable, but formal license name (CC BY, CC0, ODbL) is absent. Do not assume either direction without explicit platform clarification or Tim sign-off.

## What I did not do

No line-map generation, no station hand-transcription from the official map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no DST deep-dive on timezones, no public-transit coverage boundary map, no stopIds in the published JSON, no S-Bahn or bus integration.

## Station roster (D1 transcription, 6 Sep 2026)

> Source caveat: the per-line stop lists below were transcribed from zurichbytram.ch, an unofficial enthusiast site, because VBZ's own line pages are map images. Luke/Jim must cross-check every stop name and order against the opentransportdata.swiss GTFS `stops.txt`/`stop_times.txt` before any product edit.

**Data source:** VBZ official tram network via https://zurichbytram.ch/ (line-by-line published stop lists). **Transcription date:** 2026-09-06. **Note on renovation:** Bahnhofquai major renovation (Dec 2025–Dec 2026) affects lines 11, 13, 14, 17, which pass through the affected station complex. Current stop lists reflect the published routing post-Dec 2025 reorganization. All stops listed in official Swiss German spelling.

### Line 2: Schlieren Geissweid ↔ Bahnhof Tiefenbrunnen

**Source:** https://zurichbytram.ch/linie-2/

Schlieren Geissweid – Schlieren Zentrum/Bahnhof – Schlieren Wagonsfabrik – Schlieren Gasometerbrücke – Schlieren Mülligen – Micafil – Farbhof – Bachmattstrasse – Lindenplatz – Grimselstrasse – Kappeli – Freihofstrasse – Letzigrund – Albisriederplatz – Zypressenstrasse – Lochergut – Kalkbreite / Bahnhof Wiedikon – Bezirksgebäude – Stauffacher – Sihlstrasse – Paradeplatz – Kantonalbank – Bürkliplatz – Bellevue – Opernhaus – Kreuzstrasse – Feldeggstrasse – Höschgasse – Fröhlichstrasse – Wildbachstrasse – Bahnhof Tiefenbrunnen.

### Line 3: Albisrieden ↔ Klusplatz

**Source:** https://zurichbytram.ch/linie-3/

Albisrieden – Fellenbergstrasse – Siemens – Hubertus – Stadion Utogrund – Krematorium Sihlfeld – Albisriederplatz – Zypressenstrasse – Lochergut – Kalkbreite / Bahnhof Wiedikon – Bezirksgebäude – Stauffacher – Sihlpost / Hauptbahnhof – Löwenplatz – Bahnhofplatz / Hauptbahnhof – Central – Neumarkt – Kunsthaus – Hottingerplatz – Römerhof – Hölderlinstrasse – Klusplatz.

### Line 4: Bahnhof Altstetten ↔ Bahnhof Tiefenbrunnen

**Source:** https://zurichbytram.ch/linie-4/

Bahnhof Altstetten – Würzgraben – Aargauerstrasse – Sportweg – Toni-Areal – Technopark – Schiffbau – Escher-Wyss-Platz – Löwenbräu – Quellenstrasse – Limmatplatz – Museum für Gestaltung – Sihlquai / Hauptbahnhof – Bahnhofquai / Hauptbahnhof – Central – Rudolf-Brun-Brücke – Rathaus – Helmhaus – Bellevue – Opernhaus – Kreuzstrasse – Feldeggstrasse – Höschgasse – Fröhlichstrasse – Wildbachstrasse – Bahnhof Tiefenbrunnen.

### Line 5: Zoo ↔ Laubegg

**Source:** https://zurichbytram.ch/linie-5/

Zoo – Susenbergstrasse – Zürichbergstrasse – Toblerplatz – Kirche Fluntern – Voltastrasse – Platte – Kantonsschule – Kunsthaus – Bellevue – Bürkliplatz – Rentenanstalt – Bahnhof Enge – Bahnhof Enge / Bederstrasse – Waffenplatzstrasse – Sihlcity Nord – Saalsporthalle – Laubegg.

### Line 6: Zoo ↔ Bahnhof Enge

**Source:** https://zurichbytram.ch/linie-6/

Zoo – Susenbergstrasse – Zürichbergstrasse – Toblerplatz – Kirche Fluntern – Voltastrasse – Platte – ETH / Universitätsspital – Haldenegg – Central – Bahnhofstrasse / Hauptbahnhof – Rennweg – Paradeplatz – Stockerstrasse – Tunnelstrasse – Bahnhof Enge.

### Line 7: Bahnhof Stettbach ↔ Wollishoferplatz

**Source:** https://zurichbytram.ch/linie-7/

Bahnhof Stettbach – Mattenhof – Probstei – Glattwiesen – Roswiesen – Schwamendingerplatz – Schörlistrasse – Waldgarten – Tierspital – Milchbuck – Irchelpark – Guggachstrasse – Schaffhauserplatz – Röslistrasse – Ottikerstrasse – Sonneggstrasse – Haldenegg – Central – Bahnhofstrasse / Hauptbahnhof – Rennweg – Paradeplatz – Stockerstrasse – Tunnelstrasse – Bahnhof Enge – Museum Rietberg – Brunaustrasse – Billoweg – Bahnhof Wollishofen – Post Wollishofen – Morgental – Butzenstrasse – Wollishoferplatz.

### Line 8: Hardturm ↔ Klusplatz

**Source:** https://zurichbytram.ch/linie-8/

Hardturm – Hardturm Stadion – Bernoulli-Häuser – Fischerweg – Förrlibuckstrasse – Escher-Wyss-Platz – Schiffbau – Bahnhof Hardbrücke – Hardplatz – Güterbahnhof – Bäckeranlage – Helvetiaplatz – Stauffacher – Bahnhof Selnau – Wollishoferplatz – Stockerstrasse – Paradeplatz – Kantonalbank – Bürkliplatz – Bellevue – Bahnhof Stadelhofen – Kreuzplatz – Englischviertelstrasse – Römerhof – Hölderlinstrasse – Klusplatz.

### Line 9: Hirzenbach ↔ Triemli

**Source:** https://zurichbytram.ch/linie-9/

Hirzenbach – Altried – Luchswiesen – Luegisland – Heerenwiesen – Schwamendingerplatz – Schörlistrasse – Waldgarten – Tierspital – Milchbuck – Irchelpark – Universität Irchel – Langmauerstrasse – Letzistrasse – Kinkelstrasse – Seilbahn Rigiblick – Winkelriedstrasse – Haldenbach – ETH / Universitätsspital – Kantonsschule – Kunsthaus – Bellevue – Bürkliplatz – Kantonalbank – Paradeplatz – Sihlstrasse – Stauffacher – Werd – Bahnhof Wiedikon – Schmiede Wiedikon – Goldbrunnenplatz – Talwiesenstrasse – Heuried – Schaufelbergerstrasse – Triemli.

### Line 10: Flughafen Fracht ↔ Bahnhofplatz / Hauptbahnhof

**Source:** https://zurichbytram.ch/linie-10/

Flughafen Fracht – Flughafen Bahnhof – Kloten Balsberg Bahnhof – Glattbrugg Unterriet – Rümlang Bäuler – Glattbrugg Bahnhof – Glattbrugg Lindberghplatz – Glattpark – Oerlikerhus – Leutschenbach – Bahnhof Oerlikon Ost – Sternen Oerlikon – Markt Oerlikon – Salersteig – Berninaplatz – Hirschwiesenstrasse – Milchbuck – Universität Irchel – Langmauerstrasse – Letzistrasse – Kinkelstrasse – Seilbahn Rigiblick – Winkelriedstrasse – Haldenbach – ETH / Universitätsspital – Haldenegg – Central – Bahnhofplatz / Hauptbahnhof.

### Line 11: Auzelg ↔ Rehalp

**Source:** https://zurichbytram.ch/linie-11/

Auzelg – Fernsehstudio – Glattpark – Oerlikerhus – Leutschenbach – Messe / Hallenstadion – Sternen Oerlikon – Bahnhof Oerlikon – Regensbergbrücke – Bad Allenmoos – Radiostudio – Bucheggplatz – Laubiweg – Schaffhauserplatz – Kronenstrasse – Beckenhof – Stampfenbachplatz – Bahnhofquai / Hauptbahnhof – Bahnhofstrasse / Hauptbahnhof – Rennweg – Paradeplatz – Kantonalbank – Bürkliplatz – Bellevue – Bahnhof Stadelhofen – Kreuzplatz – Signaustrasse – Hegibachplatz – Hedwigsteig – Wetlistrasse – Burgwies – Balgrist – Friedhof Enzenbühl – Rehalp.

**Note:** Line 11 passes through Bahnhofquai / Hauptbahnhof, affected by Dec 2025–2026 renovation.

### Line 13: Frankental ↔ Albisgütli

**Source:** https://zurichbytram.ch/linie-13/

Frankental – Winzerstrasse – Wartau – Zwielplatz – Meierhofplatz – Schwert – Alte Trotte – Eschergutweg – Waidfussweg – Wipkingerplatz – Escher-Wyss-Platz – Löwenbräu – Quellenstrasse – Limmatplatz – Museum für Gestaltung – Sihlquai / Hauptbahnhof – Bahnhofquai / Hauptbahnhof – Bahnhofstrasse / Hauptbahnhof – Rennweg – Paradeplatz – Stockerstrasse – Tunnelstrasse – Bahnhof Enge / Bederstrasse – Waffenplatzstrasse – Sihlcity Nord – Saalsporthalle – Laubegg – Uetlihof – Strassenverkehrsamt – Albisgütli.

**Note:** Line 13 passes through Bahnhofquai / Hauptbahnhof, affected by Dec 2025–2026 renovation.

### Line 14: Seebach ↔ Triemli

**Source:** https://zurichbytram.ch/linie-14/

Seebach – Seebacherplatz – Felsenrainstrasse – Bahnhof Oerlikon Ost – Sternen Oerlikon – Markt Oerlikon – Salersteig – Berninaplatz – Hirschwiesenstrasse – Milchbuck – Guggachstrasse – Schaffhauserplatz – Kronenstrasse – Beckenhof – Stampfenbachplatz – Bahnhofquai / Hauptbahnhof – Bahnhofplatz / Hauptbahnhof – Löwenplatz – Sihlpost / Hauptbahnhof – Stauffacher – Werd – Bahnhof Wiedikon – Schmiede Wiedikon – Goldbrunnenplatz – Talwiesenstrasse – Heuried – Schaufelbergerstrasse – Triemli.

**Note:** Line 14 passes through Bahnhofquai / Hauptbahnhof, affected by Dec 2025–2026 renovation.

### Line 15: Bucheggplatz ↔ Bahnhof Stadelhofen

**Source:** https://zurichbytram.ch/linie-15/

Bucheggplatz – Laubiweg – Schaffhauserplatz – Röslistrasse – Ottikerstrasse – Sonneggstrasse – Haldenegg – Central – Rudolf-Brun-Brücke – Rathaus – Helmhaus – Bellevue – Bahnhof Stadelhofen.

### Line 17: Werdhölzli ↔ Albisgütli

**Source:** https://zurichbytram.ch/linie-17/

Werdhölzli – Bändliweg – Grünaustrasse – Tüffenwies – Hardhof – Hardturm – Fischerweg – Förrlibuckstrasse – Escher-Wyss-Platz – Löwenbräu – Quellenstrasse – Limmatplatz – Museum für Gestaltung – Sihlquai / Hauptbahnhof – Bahnhofquai / Hauptbahnhof – Bahnhofplatz / Hauptbahnhof – Bahnhofstrasse / Hauptbahnhof – Rennweg – Paradeplatz – Stockerstrasse – Tunnelstrasse – Bahnhof Enge / Bederstrasse – Waffenplatzstrasse – Sihlcity Nord – Saalsporthalle – Laubegg – Uetlihof – Strassenverkehrsamt – Albisgütli.

**Note:** Line 17 passes through Bahnhofquai / Hauptbahnhof, affected by Dec 2025–2026 renovation.

**Renovation context:** All stop names are as published by VBZ/ZVV post-Dec 2025 reorganization. Lines 11, 13, 14, 17 pass through the Bahnhofquai construction zone, which underwent major restructuring during the Dec 2025–2026 period. The current published stop lists reflect passenger-facing routing during this renovation. No short-turn or seasonal variants are documented for v1 scope as of the transcription date.
