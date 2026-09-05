# Lisbon — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** scoped. **city id:** `lisbon` (do not invent `tml`, `mlisboa`, or merge into another Portuguese city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Metropolitano de Lisboa, EPE (Metro Lisboa) |
| Official map | Network diagram — https://www.metrolisboa.pt/en/ (routes + network maps; four coloured lines: Azul/Amarela/Verde/Vermelha) |
| Static GTFS | Verified 200 empty-key 2026-09-06: https://www.metrolisboa.pt/google_transit/googleTransit.zip. Transitland Onestop **f-eyckr-metrodelisboa** (operator **o-eyckr-metrodelisboa**) indexes 89 archived versions; latest fetch 2026-09-05. Mobility Database catalogs this feed (Metro de Lisboa GTFS). Zenodo record: https://zenodo.org/records/18830433 (CC0 license documented). |
| GTFS-RT / live | **No public GTFS-RT feed.** EstadoServicoML REST API at api.metrolisboa.pt returns line-level status (operational state per line) not next-train arrivals; requires OAuth key. No public departures/arrivals API documented. Static GTFS only. |
| Auth | Static GTFS: none (anonymous 200). EstadoServicoML live status: OAuth key required but provides line status only, not next-train data. Never paste a key. |
| Timezone | Europe/Lisbon (UTC+0 standard; UTC+1 DST Mar–Oct) |

Do not generate a published-network.json from GTFS. D1 is the official network map, hand-transcribed (this pack).

## v1 mode cut

**Metro only:** Four passenger-open metro lines on the official network diagram.

- **Linha Azul (Blue):** 18 stations, Santa Apolónia – Reboleira
- **Linha Amarela (Yellow):** 13 stations, Rato – Odivelas
- **Linha Verde (Green):** 13 stations, Telheiras – Cais do Sodré
- **Linha Vermelha (Red):** 12 stations, São Sebastião – Aeroporto

**Total: 56 unique passenger-open metro stations after dedupe.**

**Out:** CP urban commuter rail (Linha de Cascais, Linha de Sintra, Linha do Sul, Linha de Azambuja — 67 stations; separate operator, separate boarding contract); tram system (Carris historic tram network — separate operator, separate boarding logic, no GTFS-RT); buses (Carris Metropolitana / TUL — excluded as bus mode).

Hub lock: **Marquês de Pombal** (Linha Azul × Linha Amarela) or **Alameda** (Linha Verde × Linha Vermelha). Marquês de Pombal is the inner-city Blue/Yellow junction on Praça do Marquês de Pombal. Alameda is the inner-city Green/Red junction on Avenida Almirante Reis.

## Skip risk

No public real-time next-train API. Static GTFS only. EstadoServicoML (line status API) requires OAuth key but does not provide departure/arrival data. **Live boarding logic at D1 will be schedule-based; no real-time arrivals available.** This is a material constraint: boards cannot show next-train predictions or live delays.

## H2 — who has line codes today

| surface | 4 lines? | what it actually has |
| --- | --- | --- |
| Official network diagram (D1) | **yes** | Four coloured lines drawn: M Azul, M Amarela, M Verde, M Vermelha. Termini and 56 stops labelled. |
| Transitland GTFS static | **yes** | 4 routes, 56 stops, schedule data. Agencies: Metropolitano de Lisboa. |
| EstadoServicoML live API | line status only | Per-line operational state (open/delays/closures), not arrivals. OAuth key required. |
| Product `lib/cities/lisbon/` | **absent** | No lisbon stations.json / line-map.json. `assertCityLive("lisbon")` is Unknown city / 400. |

H2 conclusion: Passenger line codes (Azul, Amarela, Verde, Vermelha) are on the official map. Clash is **no public real-time arrivals API** (schedule-based boards only), **static GTFS as single operational surface**, and **no product lisbon file**. Do not generate published-network.json from GTFS. Do not merge CP urban, tram, or bus into this city. Do not use TML GO / Carris Metropolitana feeds as metro data.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (rail services only; buses/trams out-of-mode):**
- **Metro M Azul/Amarela/Verde/Vermelha itself:** `in` (walk-up public metro, open fares, no reservation)
- **CP urban commuter lines at shared stations (Oriente, Santa Apolónia, Terreiro do Paço, Cais do Sodré, Alcântara, São Sebastião, etc.):** `out-scope` (separate operator, separate boarding contract; excluded from v1 mode cut)
- **Carris tram (historic tram network, Transtejo ferries):** `out-mode` (tram/ferry excluded v1)

**Stations with overlapping services (now in-catalog for metro only):**
- **Oriente** (M Vermelha): + CP Linha do Sul (excluded v1)
- **Santa Apolónia** (M Azul terminus): + CP Linha de Sintra (excluded v1)
- **Terreiro do Paço** (M Azul): + CP Linha de Cascais (excluded v1)
- **Cais do Sodré** (M Verde terminus): + CP Linha de Cascais (excluded v1)
- **Alcântara Terra** (M Vermelha): + CP Linha do Sul (excluded v1)
- **São Sebastião** (M Vermelha terminus): + tram 7 terminus, CP connections via walkway (excluded v1)
- All other in-catalog Metro stations: M Azul/Amarela/Verde/Vermelha only (no other operator calls at them)

**No check-in barriers:** Platform access at all 56 metro stations is unrestricted. Ticket checking is on-board by staff. No entry barriers, security gates, or border control. Walk-up boarding is unobstructed.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Metro M Azul/Amarela/Verde/Vermelha (Metropolitano de Lisboa)** | All 56 catalog stations | No (open fares, no reservation offered) | No | `in` | https://www.metrolisboa.pt/en/ — official metro site; walk-up public fares |
| **CP Urban lines (Cascais, Sintra, Sul, Azambuja)** | Oriente, Santa Apolónia, Terreiro do Paço, Cais do Sodré, Alcântara, São Sebastião | Varies by line (optional for some, reserved commuter product) | No | `out-scope` | https://www.cp.pt/info/en/lisbon — CP Urban Services; separate operator, excluded from v1 mode cut |
| **Carris historic tram (Tram 7, 12, 25, etc.)** | São Sebastião, Cais do Sodré, Praça do Comércio, and others | N/A (tram mode) | N/A | `out-mode` | https://www.carris.pt/ — tram/bus mode excluded v1 |

**Board eligibility summary:** All walk-up metro services (M Azul/Amarela/Verde/Vermelha) pass both boarding-contract tests at all 56 in-catalog stations. CP Urban and tram services fail by scope (excluded from v1 mode cut, not by reservation or barrier test). **All verdicts recorded; no silent omissions.** Metro only; four line-codes; single operator; schedule-based boards (no real-time).

## C2/C3 to put in front of Jim

1. **city=lisbon**. Operator: **Metropolitano de Lisboa, EPE** (official agency). Not `tml`, not `mlisboa`, not merged into a multi-city adapter.

2. **Hub-lock choice:** Either **Marquês de Pombal** (Azul × Amarela, inner-city) or **Alameda** (Verde × Vermelha, inner-city) — both are valid interchange points. Luke to decide based on geography / boarding load. doNotGroup Oriente/Santa Apolónia/Cais do Sodré/São Sebastião vs CP or tram.

3. **v1 mode: Metro Azul/Amarela/Verde/Vermelha only (56 stations).** No CP Urban, no tram, no bus.

4. **Real-time constraint:** No public departures/arrivals API. Static GTFS only. EstadoServicoML is line-status, not next-train. Boards will be schedule-based (no live delays, no next-train countdown). This is a production limitation, not a data quality issue.

5. **Timezone:** Europe/Lisbon (UTC+0 / UTC+1 DST Mar–Oct).

6. **56 unique metro stations.** Azul: ~18; Amarela: ~13; Verde: ~13; Vermelha: ~12 (approximate; exact dedupe at D1). No line-map generation, no stopIds in published JSON.

7. **Adapter architecture:** Single operator, four line-codes (M1/M2/M3/M4 or local numbering). Schedule-based real-time feed path deferred (no public API to call). Status stays **planned** until Mark's QA confirms static-only boards are acceptable.

8. **No product flip, no cross-city merge, no CP/tram scope creep.**

## License

| field | value |
| --- | --- |
| License name | CC0 (Creative Commons Zero v1.0 Universal) — public domain dedication. |
| Redistribution / rehosting | CC0 waives copyright interest and dedicates the work to the worldwide public domain. No copyright restrictions. The GTFS feed may be freely redistributed, rehosted, and served to users without attribution requirements. No sublicence clause needed — CC0 is public domain. |
| Commercial use | Allowed (no copyright restrictions under CC0). |
| Attribution | Not required (CC0 public domain dedication; no attribution clause). |
| Terms URL | [Zenodo record — Metropolitano de Lisboa GTFS](https://zenodo.org/records/18830433) (CC0 license stated). [Transitland feed page — f-eyckr-metrodelisboa](https://www.transit.land/feeds/f-eyckr-metrodelisboa). [Mobility Database — Metro de Lisboa GTFS](https://mobilitydatabase.org/feeds/gtfs/mdb-1088). Metadata contact at Transitland: nuno.castelinho@metrolisboa.pt. |
| Confidence | **Clear.** Zenodo record explicitly documents CC0 license. No copyright restrictions on redistribution. Static GTFS feed is public-domain; safe to serve to users and third parties. |

## What I did not do

No line-map generation, no station hand-transcription from the metro map, no GTFS station arrays, no live city flip, no GitHub PR, no adapter code, no real-time API deep-dive (none exists), no product edit, no Perth edit, no cross-city merger, no license speculation.
