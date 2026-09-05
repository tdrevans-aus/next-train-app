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
