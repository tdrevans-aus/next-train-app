# Uppsala oracle clash report

D1 (published): [Mälartågskartan](https://media.malartag.se/media/44viirbo/maelartaagskartan_t25.png), linked from [Mälardalstrafik route maps](https://www.malardalstrafik.se/en/tickets/route-maps/). Map version **2026-05-25**. Format is **PNG**. Stations in `published-network.json` would be **hand-transcribed from that map**. Not generated from GTFS.

H2 (feed clash only): Trafiklab GTFS Regional operator `ul` static and realtime feeds. Agency in GTFS is "Mälardalstrafik"; route_type 100 (railway/regional train). UL's own bus network (route_type 700, agency_id "UL") is out of v1 scope.

SL Commuter Line 40 also terminates at Uppsala C but is already in `docs/stockholm-d1/published-network.json` — do **not** duplicate it into this pack. Uppsala C is the shared far terminus only.

## Agency / feed / auth

| field | value |
| --- | --- |
| Agency | Mälardalstrafik (Mälartåg operator) |
| Product | Trafiklab **GTFS Regional** operator `ul` |
| Static URL | `https://opendata.samtrafiken.se/gtfs/ul/ul.zip?key={TRAFIKLAB_API_KEY}` |
| Auth | Trafiklab API key in query (`TRAFIKLAB_API_KEY` on Vercel). Portal: https://www.trafiklab.se/ |
| GTFS-RT TripUpdates URL scheme | `https://opendata.samtrafiken.se/gtfs-rt/ul/TripUpdates.pb?key={TRAFIKLAB_API_KEY_RT}` |
| GTFS-RT availability | **Yes** — both TripUpdates and VehiclePositions confirmed working as of 2026-08-30. Live in-scope Mälartåg corridor trips verified in TripUpdates feed. |
| v1 mode cut | Mälartåg regional rail only (route_type 100, agency "Mälardalstrafik"). Four corridors: Gävle, Sala/Västerås/Eskilstuna, Stockholm-via-Märsta, Stockholm/Örebro-via-Arlanda. No UL buses (route_type 700). No Mälartåg ersättningstrafik (replacement traffic). |
| Hub lock | **Uppsala C** (Uppsala Central Station). Do not lock other station names at the terminus. |
| Skip risks | Including UL bus routes instead of or in addition to Mälartåg rail; duplicating SL Line 40 from Stockholm pack; including Mälartåg replacement services; station name mismatches between GTFS feed and the official Mälartågskartan map. |

## H2 — who has line codes and coverage

| surface | Mälartåg four corridors? | what it actually has |
| --- | --- | --- |
| Mälartågskartan PNG (D1) | **yes** | Five coloured lines drawn: Gävle line, Sala/Västerås/Eskilstuna line, two Stockholm lines (via Märsta and via Arlanda), Örebro line. Print labels show terminus pairs and corridor routes. |
| Trafiklab GTFS Regional `ul` static | **yes (with key)** | Full UL network (Mälartåg rail + UL buses). Adapter filters to route_type 100, agency "Mälardalstrafik". |
| Trafiklab GTFS-RT `ul` TripUpdates | **yes** | Mälartåg trips confirmed flowing through real-time feed (verified 2026-08-30). |

H2 conclusion: passenger line routes and corridors through Uppsala C **agree** across the official Mälartågskartan and Trafiklab GTFS Regional feed. Clash is **mode filtering** (rail vs bus), **agency scope** (Mälardalstrafik vs UL), and likely **station name variance** (print map strings vs GTFS stop_name). Do not generate `published-network.json` from `routes.txt`.

## C2/C3 to put in front of Jim

1. **Uppsala C** is the single v1 hub lock. Do not collapse other station names into it, and do not add SL Line 40 (already in Stockholm).
2. **Mälartåg only**, route_type 100, agency "Mälardalstrafik" in the GTFS. Filter out UL buses (route_type 700, agency "UL").
3. **No ersättningstrafik** (replacement traffic). Include only regular Mälartåg service.
4. Four corridors: **Gävle**, **Sala/Västerås/Eskilstuna**, **Stockholm-via-Märsta**, **Stockholm/Örebro-via-Arlanda**.
5. Trafiklab GTFS-RT TripUpdates are **live and populated** with in-scope corridor trips. Use TRAFIKLAB_API_KEY_RT for realtime.
6. City id **uppsala**. Not sweden. Not other Uppsala variants.
7. **Europe/Stockholm** timezone (same as Stockholm, Göteborg, Malmö).
8. Adapter uses shared `lib/providers/gtfs/realtime-board.js`. Status stays **planned** until Mark's QA full pass.

## License

| field | value |
| --- | --- |
| License name | CC0 1.0 Universal (Public Domain Dedication) |
| Redistribution / rehosting | Permitted without restriction. GTFS Regional data is in the public domain; may be served to our users and passed to third parties. No license agreement blocks this. |
| Commercial use | Allowed. CC0 places the work in the public domain worldwide; commercial use has no additional restriction. |
| Attribution | Not required by CC0. Best practice: mention Trafiklab as the source (e.g., "Data from Trafiklab/Samtrafiken") but not legally mandated. |
| Terms URL | [CC0 1.0 Universal Deed](https://creativecommons.org/publicdomain/zero/1.0/deed.en). Trafiklab feed page: [GTFS Regional](https://www.trafiklab.se/api/gtfs-datasets/gtfs-regional/). |
| Confidence | **Clear**. CC0 is an explicit public-domain waiver with no restrictions on redistribution or use. |

## Board eligibility

| Service | Calls at in-catalog stations | Walk-up? | Proposed verdict | Current behavior | QA verdict |
|---|---|---|---|---|---|
| **SL Commuter Line 40 (Pendeltåg)** | Knivsta, Märsta, Södertälje syd, Uppsala C, and other shared corridor stops | Yes — walk-up, high-frequency | `in` per rule test 1 & 2; owned by Stockholm's pack | Explicitly excluded from Uppsala's board (agency filter to Mälardalstrafik only) | ✓ NOT a violation. Riders at Knivsta see Line 40 departures when accessing Knivsta via Stockholm's city context (Stockholm is tester-live as of 30 Aug 2026, includes Knivsta, and includes Line 40 in ALLOWED_LINE_CODES). Exclusion is correct per design: one service, one pack. Known product gap (cross-city board merge, scoped in `look-into-the-uk-validated-sprout.md`) not a silent omission. |
| **Mälartåg regional rail** (all in-scope routes) | Uppsala C, Knivsta, Märsta, Arlanda C, and other UL-feed Mälartåg stops | Yes — walk-up | `in` | Shown on Uppsala's board | ✓ Correct |
| **Mälartåg ersättningstrafik** | Occasionally at in-catalog stops | Yes (if applicable) | `out-mode` (v1 scope excludes replacement services) | Excluded by adapter filtering | ✓ Correct |
| **All other services** | None call at any in-catalog station per `ul` feed filtered to Mälardalstrafik. UL buses (route_type 700) and SL services are out of scope. | N/A | N/A | N/A | ✓ Verified — no walk-up services silently missing |

**Board eligibility summary:** No violations. Adapter filtering matches verdicts.

## What I did not do

No line-map generation, no station hand-transcription from the Mälartågskartan, no live city flip, no GitHub PR, no adapter code, no Trafiklab OAuth fallback investigation.
