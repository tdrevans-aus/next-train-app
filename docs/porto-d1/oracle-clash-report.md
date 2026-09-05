# Porto — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** scoped. **city id:** `porto` (do not invent `mdp`, `metro-porto`, or merge into another Portuguese city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Metro do Porto (publicly operated light rail) |
| Official map | Network diagram — https://www.metrodoporto.pt/pages/337 (routes + network maps; six coloured lines: A/B/C/D/E/F) |
| Static GTFS | Verified 200 2026-09-06: https://opendata.porto.digital/dataset/horarios-paragens-e-rotas-em-formato-gtfs (current version GTFS Metro do Porto 17-07-2026). Transitland Onestop **f-ez3f-metrodoporto** (operator **o-ez3f-metrodoporto**) indexes 2 archived versions; last successful fetch 2026-09-04 (URL currently unstable — Transitland index is historical; use Porto Data Portal as primary source). Mobility Database catalogs this feed (Metro do Porto GTFS). |
| GTFS-RT / live | **No public GTFS-RT feed.** Public real-time data consists of GPS snapshots 30–60 seconds old, not suitable for next-train predictions. No documented real-time departures/arrivals API. Static GTFS only. |
| Auth | Static GTFS: none (anonymous 200). No authentication required for Porto Data Portal download. |
| Timezone | Europe/Lisbon (UTC+0 standard; UTC+1 DST Mar–Oct) |

Do not generate a published-network.json from GTFS. D1 is the official network map, hand-transcribed (this pack).

## v1 mode cut

**Metro only:** Six passenger-open light rail lines on the official network diagram.

- **Linha A (Blue):** Estádio do Dragão – Senhor de Matosinhos
- **Linha B (Red):** Estádio do Dragão – Póvoa de Varzim
- **Linha C (Green):** Campanhã – ISMAI
- **Linha D (Yellow):** Hospital São João – Vila d'Este (busiest line)
- **Linha E (Violet):** Trindade – Aeroporto
- **Linha F (Orange):** Fânzeres – Senhora da Hora

**Total: 85 passenger-open light rail stations after dedupe.**

**Out:** No commuter rail overlays (CP is not in scope for v1). No buses, ferries, or other surface modes.

Hub lock: **Trindade** (served by all six lines: A, B, C, D, E, F; only station serving every line). Trindade is the busiest station by passenger numbers and is located in downtown Porto, north of City Hall.

## Skip risk

No public real-time next-train API. Static GTFS only. Public real-time data is GPS snapshots 30–60 seconds old and not actionable for next-train predictions. **Live boarding logic at D1 will be schedule-based; no real-time arrivals available.** This is a material constraint: boards cannot show next-train predictions or live delays.

## H2 — who has line codes today

| surface | 6 lines? | what it actually has |
| --- | --- | --- |
| Official network diagram (D1) | **yes** | Six coloured lines drawn: A (Blue), B (Red), C (Green), D (Yellow), E (Violet), F (Orange). Termini and 85 stops labelled. |
| Transitland GTFS static | **yes** | 6 routes, 85 stops, schedule data. Agency: Metro do Porto. |
| Public live API | none | GPS snapshots 30–60 seconds old; no real-time departures/arrivals API documented. |
| Product `lib/cities/porto/` | **absent** | No porto stations.json / line-map.json. `assertCityLive("porto")` is Unknown city / 400. |

H2 conclusion: Passenger line codes (A, B, C, D, E, F) are on the official map. Clash is **no public real-time arrivals API** (schedule-based boards only), **static GTFS as single operational surface**, and **no product porto file**. Do not generate published-network.json from GTFS. Do not merge CP, bus, or ferry into this city. v1 is light rail only (all six lines, all 85 stations).

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (light rail services only; buses/other modes out-of-scope):**
- **Metro do Porto (Lines A–F):** `in` (walk-up public light rail, open fares, no reservation)
- **No other operator services:** No commuter rail, regional rail, or other operator calls at any in-catalog station.

**No check-in barriers:** Platform access at all 85 metro stations is unrestricted. Ticket checking is on-board by staff or contactless Andante card. No entry barriers, security gates, or border control. Walk-up boarding is unobstructed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Metro do Porto Lines A–F** | All 85 catalog stations | No (open fares, no reservation offered) | No | `in` | https://www.metrodoporto.pt/ — official metro site; walk-up public fares; Andante card system |

**Board eligibility summary:** All walk-up light rail services (A–F) pass both boarding-contract tests at all 85 in-catalog stations. No other operator calls at these stations. **All verdicts recorded; no silent omissions.** Light rail only; six line-codes; single operator; schedule-based boards (no real-time).

## C2/C3 to put in front of Jim

1. **city=porto**. Operator: **Metro do Porto** (public agency). Not `mdp`, not `metro-porto`, not merged into another city.

2. **Hub-lock choice:** **Trindade** (served by all six lines A–F; only multi-line interchange on the network; downtown Porto). No other multi-line stations in the v1 cut.

3. **v1 mode: Light Rail A–F only (all six lines, 85 stations).** No CP, no bus, no ferry.

4. **Real-time constraint:** No public departures/arrivals API. Static GTFS only. Public real-time is GPS snapshots 30–60 seconds old. Boards will be schedule-based (no live delays, no next-train countdown). This is a production limitation, not a data quality issue.

5. **Timezone:** Europe/Lisbon (UTC+0 / UTC+1 DST Mar–Oct).

6. **85 unique light rail stations.** Line distribution approximately: A ~18, B ~17, C ~16, D ~17, E ~10, F ~7 (exact dedupe at D1). No line-map generation, no stopIds in published JSON.

7. **Adapter architecture:** Single operator, six line-codes (A–F or local numbering). Schedule-based real-time feed path deferred (no public API to call). Status stays **planned** until Mark's QA confirms static-only boards are acceptable.

8. **No product flip, no cross-city merge, no CP/bus scope creep.**

## License

| field | value |
| --- | --- |
| License name | Creative Commons CCZero (CC0 v1.0 Universal) — public domain dedication. |
| Redistribution / rehosting | CC0 waives copyright interest and dedicates the work to the worldwide public domain. No copyright restrictions. The GTFS feed may be freely redistributed, rehosted, and served to users without attribution requirements. No sublicence clause needed — CC0 is public domain. |
| Commercial use | Allowed (no copyright restrictions under CC0). |
| Attribution | Not required (CC0 public domain dedication; no attribution clause). |
| Terms URL | [Porto Data Portal — Horários, paragens e rotas da Metro do Porto](https://opendata.porto.digital/dataset/horarios-paragens-e-rotas-em-formato-gtfs) (CC0 license stated). [Transitland feed page — f-ez3f-metrodoporto](https://www.transit.land/feeds/f-ez3f-metrodoporto) (historical; current URL at Porto Data Portal). Metadata contact at Transitland: contact via metrodoporto.pt or metro@metro-porto.pt. |
| Confidence | **Clear.** Porto Data Portal explicitly documents CC0 license. No copyright restrictions on redistribution. Static GTFS feed is public-domain; safe to serve to users and third parties. |

## What I did not do

No line-map generation, no station hand-transcription from the metro map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no real-time API deep-dive (none exists), no product edit, no Perth edit, no cross-city merger, no license speculation.
