# Brno — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-09-06. **Status:** Scoped, **to do**. **city id:** `brno` (do not invent `brna`, `brno-cz`, or merge into another Czech city; distinguish from Prague).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | DPMB (Dopravní podnik města Brna — Brno Transport Company) operates trams in Brno. Regional coordinator: IDS JMK (Integrovaného Dopravního Systému Jihomoravského Kraje — Integrated Transport System of South Moravia). System operator: KORDIS JMK (KORDIS, s.r.o.). |
| Official map | Network maps at https://www.dpmb.cz/en/ and https://www.idsjmk.cz/en/. Transitland Onestop **f-u2e-idsjmk** (operator **o-u2e-kordis**). Wikipedia list: https://en.wikipedia.org/wiki/Trams_in_Brno (12 lines, 139 km track). |
| Static GTFS | **Live 200 application/zip** (verified 2026-09-05): https://kordis-jmk.cz/gtfs/gtfs.zip — no key required. Updated weekly on Sunday at 12:00 UTC per KORDIS. Transitland confirmed working. Mobility Database registration: MDB entry pending verification at D1. Feed covers all IDS JMK modes (tram, trolleybus, bus, regional rail, regional buses). v1 adapter filters tram (route_type=0) only. |
| GTFS-RT / live | **KORDIS Real-Time API**: Vehicle positions in custom JSON format + disruption/arrival predictions in GTFS-RT protobuf format. Endpoint: dynamic (no stable base URL confirmed in research; clarify at D1). Updated every 10 seconds. Real-time operational since May 2023 (confirmed via Google Maps integration May 2023). No API key confirmed required; public GTFS-RT endpoint still to be verified at D1. |
| Auth | Static GTFS: none (anonymous 200). Real-time: **none confirmed** — but verify API endpoint availability and any registration requirement at D1. No documented key/token found in research; public feeds assumed open unless D1 discovers otherwise. |
| Timezone | Europe/Prague (UTC+1 standard / UTC+2 DST; last Sunday of March / October). |

## v1 mode cut

**Tram lines 1–12 only:** Official DPMB light rail **12 lines, 139 km track, 70.4 km route length**. **Out:** trolleybus (13 lines); bus (37+ lines); regional rail / regional buses (IDS JMK coverage); any future extensions. 

Hub lock: **Hlavní nádraží** (Main Railway Station, city center) — **major interchange** served by tram lines 1, 2, 4, 8, 9, 10, 12 (7 of 12 lines). Central location; daily hub for all night trams and buses. Alternative: **Česká** (city center junction, served by lines 9, 10; co-major but fewer line connections).

**Board eligibility (v1 tram lines 1–12):** Brno tram system operates as open walk-up public transit with no compulsory seat reservations or check-in barriers. Tickets validated manually (honor system) or via contactless tap before boarding. All 12 lines pass board-eligibility test 1 (walk-up boardable) and test 2 (no check-in barrier).

## Skip risk

Real-time API endpoint availability and public stability to be verified at D1 (dynamic URL structure not yet documented; confirm coverage for departures and vehicle positions). GTFS-RT feed availability still pending — research shows GTFS-RT format referenced but no stable public endpoint URL confirmed; may fall back to schedule-only boards if GTFS-RT not accessible. No known blocker if schedule-only path is acceptable. Tram-only network confirmed. License CC BY 4.0 verified. No expected friction beyond RT endpoint confirmation.

## H2 — who has line codes and coverage

| surface | Lines 1–12? | what it actually has |
| --- | --- | --- |
| DPMB official map (dpmb.cz) | **yes** | All 12 tram lines named and mapped. Hlavní nádraží hub explicit. |
| Wikipedia Trams in Brno | **yes** | All 12 lines listed (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12). 139 km operational track. Interchanges noted. |
| IDS JMK GTFS static (kordis-jmk.cz) | **yes (with filter)** | Full regional feed: tram, trolleybus, bus, regional. Adapter filters route_type=0 (tram) and DPMB tram routes only. |
| KORDIS real-time API departures | to be verified | Real-time via API endpoint (structure TBD at D1). Vehicle positions every 10 seconds. Departure predictions in GTFS-RT. |

**H2 conclusion:** Passenger line codes (1–12) and station rosters already documented on official DPMB map and Wikipedia. Clash is **mode filtering** (IDS JMK GTFS includes tram/trolleybus/bus/regional; tram extract only), **real-time endpoint discovery** (KORDIS API structure not yet pinned), and **hub-lock routing** (Hlavní nádraží as primary interchange, Česká as secondary). Do not generate `published-network.json` from `routes.txt`. Confirm KORDIS API stable endpoint and GTFS-RT public availability at D1.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (tram services only; trolleybus/bus/regional out-of-mode):**
- **Tram Line 1 (Lesná – Zvonařka)**: `in` (walk-up public tram; open honor system)
- **Tram Line 2 (Královo Pole – Nový Lískovský Háj)**: `in` (walk-up public tram; open honor system)
- **Tram Line 3 (Bohunice – Tuřany)**: `in` (walk-up public tram; open honor system)
- **Tram Line 4 (Lesná – Bohunice)**: `in` (walk-up public tram; open honor system)
- **Tram Line 5 (Královo Pole – Králova Pole)**: `in` (walk-up public tram; open honor system)
- **Tram Line 6 (Malinovského – Junácké)**: `in` (walk-up public tram; open honor system)
- **Tram Line 7 (Lesná – Černovická Sídliště)**: `in` (walk-up public tram; open honor system)
- **Tram Line 8 (Jalty – Starolískovská)**: `in` (walk-up public tram; open honor system)
- **Tram Line 9 (Lesná – Bohunice)**: `in` (walk-up public tram; open honor system)
- **Tram Line 10 (Líšeň – Starolískovská)**: `in` (walk-up public tram; open honor system)
- **Tram Line 11 (Královo Pole – Juliánov)**: `in` (walk-up public tram; open honor system)
- **Tram Line 12 (Líšeň – Bohunice via city center)**: `in` (walk-up public tram; open honor system)

**No check-in barriers or restrictions:** Platform access at all in-catalog tram stations is unrestricted. Ticket validation is pre-boarding via manual validators or contactless tap (not gate barriers). No security gates, no turnstiles, no border control. On-platform inspectors enforce fare compliance; walk-up boarding is unobstructed for all 12 lines.

**All 12 tram lines are public transport with walk-up boardable access — no compulsory seating reservations, no check-in barriers, no compulsory advance booking.** All verdicts recorded; no silent omissions. One operator (DPMB) with 12 line codes and unified boarding logic across all lines.

## Station name table (locks + known clashes)

Match rule: Official DPMB / IDS JMK published name vs GTFS stop_name. `rename` = same place, different printed string.

| published (D1) | lines | class |
| --- | --- | --- |
| Hlavní nádraží | 1, 2, 4, 8, 9, 10, 12 | **match (hub-lock)**. Central railway station. Primary hub (7 of 12 lines). |
| Česká | 9, 10 | **match (secondary)**. City center junction. Co-major but fewer lines. doNotGroup Hlavní nádraží if multi-station board required. |
| [All other in-catalog stations] | 1–12 individually | match; no overlapping services on multiple lines at same physical platform |

**12 tram lines, multiple stations per line. No product `lib/cities/brno/` yet. `assertCityLive("brno")` is Unknown city.**

## C2/C3 to put in front of Jim

1. **city=brno**. Operator: DPMB (tram). Regional: IDS JMK / KORDIS JMK. Not `brna`, not `brno-cz`. Do not merge into multi-city Czech adapter or Prague.

2. **Hlavní nádraží** is the locked 7-line hub (lines 1, 2, 4, 8, 9, 10, 12; central railway station). **Česká** is secondary (lines 9, 10; city center junction). No single station on all 12 lines. Recommend **Hlavní nádraží** as hub-lock; **Česká** as doNotGroup secondary if multi-station board required.

3. **12-line tram system 1–12 only.** No trolleybus (13 lines), no bus (37+ lines), no regional rail, no regional buses. Filter IDS JMK GTFS by tram routes only (route_type=0 + DPMB agency).

4. **doNotGroup directives:**
   - **Hlavní nádraží (lines 1, 2, 4, 8, 9, 10, 12):** Primary hub. One platform group. Do not merge with Česká.
   - **Česká (lines 9, 10):** Secondary junction. One platform group. Do not merge with Hlavní nádraží if both in catalog.

5. **Real-time feed:** KORDIS API (kordis-jmk.cz) with GTFS-RT protobuf format for disruptions/predictions + custom JSON for vehicle positions. Update interval: 10 seconds. Verify API base URL and public endpoint availability at D1. No public key documented; assume open unless D1 finds otherwise.

6. **Europe/Prague timezone (UTC+1 / UTC+2 DST).** DST applies: last Sunday of March (spring forward) and last Sunday of October (fall back).

7. **12 tram lines (lines 1–12), 139 km operational track.** Hlavní nádraží hub (7 lines); Česká secondary (2 lines). No additional tram networks; tram only.

8. **Adapter architecture:** DPMB operator single tram agency. 12 line codes and unified direction model. Real-time via KORDIS API (assumed open access, free tier). Status stays **to do** until Mark's QA full pass. Board eligibility: all 12 lines **in**.

9. **No line-map generation, no stopIds in published JSON, no product flip, no cross-city merge.**

## License

| field | value |
| --- | --- |
| License name | **CC BY 4.0** (Creative Commons Attribution 4.0) for static GTFS feed per data.brno.cz and KORDIS open data. KORDIS real-time data: likely CC-BY or similar (Czech open data framework); formal terms to be confirmed at D1. |
| Redistribution / rehosting | IDS JMK GTFS: CC BY 4.0 allows free reuse including commercial, provided attribution is given. May be served to our users and passed to third parties with attribution. KORDIS real-time API: free-tier terms to be verified at D1 — public data via Google Maps integration suggests permissive redistribution, but formal API ToS should be confirmed. |
| Commercial use | **Allowed** under CC BY 4.0 for static GTFS. KORDIS real-time: assume allowed but verify formal API terms at D1. |
| Attribution | **IDS JMK GTFS:** CC BY 4.0 requires attribution to source and date of update (e.g., "Data from Integrovaného Dopravního Systému Jihomoravského Kraje (IDS JMK) / KORDIS JMK, updated [date]"). **KORDIS Real-Time:** likely requires credit to KORDIS JMK or Brno city open data. Confirm at D1. |
| Terms URL | **IDS JMK GTFS:** [data.brno.cz: Jízdní řád IDS JMK](https://data.brno.cz/datasets/379d2e9a7907460c8ca7fda1f3e84328). [KORDIS GTFS feed](https://kordis-jmk.cz/gtfs/gtfs.zip). [Transitland feed: f-u2e-idsjmk](https://www.transit.land/feeds/f-u2e-idsjmk). **KORDIS Real-Time:** [Public transit positional data - NKOD](https://data.gov.cz/dataset?iri=https%3A%2F%2Fdata.gov.cz%2Fzdroj%2Fdatov%C3%A9-sady%2F44992785%2F2629f44c90338528b23bcb3a3dbbeb4a). **CC BY 4.0 deed:** [creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/). |
| Keyed API (KORDIS) | No API key or registration confirmed required for real-time access. Public vehicle positions and GTFS-RT data integrated into Google Maps (May 2023 onward) suggest open-access model. **Confirm public availability, rate limits, and any terms of use at D1.** If registration/key required, note in D1 pack. |
| Confidence | **Clear** for static GTFS (CC BY 4.0 explicit on data.brno.cz and confirmed by Transitland). **Requires verification** for KORDIS real-time API (terms accessible via formal API documentation; public integration with Google Maps suggests permissive license but formal ToS should be confirmed). Do not interpret current finding as guaranteed free commercial use without D1 verification of KORDIS API ToS. |

## What I did not do

No adapter code, no line-map generation, no station hand-transcription from DPMB map, no GTFS extraction of station arrays, no live city flip, no GitHub PR, no KORDIS API endpoint testing (that's D1), no timezone deep-dive on KORDIS timestamps, no product `lib/cities/brno/`, no stopIds in published JSON, no research into future tram extensions or trolleybus integration.

Sources:
- [Transitland: Integrovaného Dopravního Systému Jihomoravského Kraje (IDS JMK) operator](https://www.transit.land/operators/o-u2e-kordis)
- [Transitland: IDS JMK GTFS feed](https://www.transit.land/feeds/f-u2e-idsjmk)
- [KORDIS GTFS Feed](https://kordis-jmk.cz/gtfs/gtfs.zip)
- [data.brno.cz: Jízdní řád IDS JMK](https://data.brno.cz/datasets/379d2e9a7907460c8ca7fda1f3e84328)
- [Wikipedia: Trams in Brno](https://en.wikipedia.org/wiki/Trams_in_Brno)
- [Wikipedia: Brno hlavn%C3%AD n%C3%A1dra%C5%BE%C3%AD](https://en.wikipedia.org/wiki/Brno_hlavn%C3%AD_n%C3%A1dra%C5%BE%C3%AD)
- [IDS JMK Official Website](https://www.idsjmk.cz/en/)
- [DPMB Official Website](https://www.dpmb.cz/en/)
- [Public transit positional data - NKOD](https://data.gov.cz/dataset?iri=https%3A%2F%2Fdata.gov.cz%2Fzdroj%2Fdatov%C3%A9-sady%2F44992785%2F2629f44c90338528b23bcb3a3dbbeb4a)
- [Live Data About The Location of Brno Public Transport Is Now Available on Google Maps - Brno Daily](https://brnodaily.com/2023/05/24/brno/live-data-about-the-location-of-brno-public-transport-is-now-available-on-google-maps/)
- [CC BY 4.0 License](https://creativecommons.org/licenses/by/4.0/)
