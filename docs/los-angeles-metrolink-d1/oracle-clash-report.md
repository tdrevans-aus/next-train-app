# Los Angeles — Metrolink oracle clash report

**Lane:** Nico research. **Date:** 2026-10-25. **Status:** research complete for Luke's D1 transcription. Metrolink is the second operator to merge onto the existing Los Angeles board.

**Context:** Tim's ruling (US ledger, 25 Oct 2026): Metrolink verdict is `in` — walk-up ticketing, no compulsory seat reservation. This research confirms the feed URLs, auth type, and identifies which in-catalog LA Metro Rail stations Metrolink calls at. No new stations are added; only in-catalog stations where Metrolink actually stops receive Metrolink departures on this pass.

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Southern California Regional Rail Authority (Metrolink) |
| Official info | Metrolink GTFS page — https://metrolinktrains.com/about/gtfs/ . Schedules index — https://metrolinktrains.com/schedules/ . System map (May 2026) — https://metrolinktrains.com/globalassets/rider-info/general-info/metrolink_system-map_editable_may_2026b.pdf |
| Static GTFS | https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip — no key. Transitland Onestop **f-9qh-metrolinktrains**, last fetch 2026-10-05. Mobility Database **mdb-96** (official rail; 7 routes; America/Los_Angeles). |
| GTFS-RT / live | Trips & Vehicles: https://metrolink-gtfsrt.gbsdigital.us/feed/gtfsrt-trips + https://metrolink-gtfsrt.gbsdigital.us/feed/gtfsrt-vehicles (protobuf, 30-second refresh). Alerts: https://cdn.simplifytransit.com/metrolink/alerts/service-alerts.pb (keyless). Transitland Onestop **f-metrolinktrains~rt** (alerts fetch status 1 minute ago). Extended REST API: https://metrolink-gtfsrt.gbsdigital.us/extended/trips and https://metrolink-gtfsrt.gbsdigital.us/extended/vehicles . |
| Auth | GTFS zip: none. GTFS-RT Trips/Vehicles: `X-Api-Key` header (HTTP header, keyed). Alerts: keyless. Auth registration: https://metrolinktrains.com/about/gtfs/gtfs-rt-access/ . Never paste a key. |
| Timezone | America/Los_Angeles (HAS DST) |
| Stop IDs | Union Station: **107** (`stop_id` in Metrolink GTFS). Pomona - North: **109** (`stop_id` in Metrolink GTFS). |

Static GTFS verified 25 Oct 2026 against Metrolink's official zip (service 2026-05-05 through 2036-05-01). GTFS-RT endpoints verified via Metrolink's own GTFS page and Transitland atlas. No alternative feeds found.

## Metrolink lines calling at in-catalog LA stations

Seven Metrolink lines operate systemwide. Six of them call at **L.A. Union Station** (GTFS `stop_id` 107). Only the **San Bernardino Line** also calls at **Pomona - North** (GTFS `stop_id` 109). The Inland Empire–Orange County Line calls at neither. Controller opened `gtfs.zip` on 25 Oct 2026 and the stop_times join matches this table.

The LA catalog prints these stations as `Union Station` and `Pomona North` (`lib/cities/los-angeles/stations.json`). GTFS spells the second `Pomona - North`. Do not invent a second Pomona stop. `Pomona - Downtown` (stop_id 120) is a different Metrolink station and is not in the LA catalog.

| Line | Termini | In-catalog LA stations served | Notes |
| --- | --- | --- | --- |
| **San Bernardino Line** | L.A. Union Station ↔ San Bernardino–Downtown (or Redlands–University limited service) | **Union Station** (A/B/D serve) · **Pomona - North** (A only serves in catalog) | 7 routes in GTFS: stop IDs 107 (Union Station) and 109 (Pomona North) both served. Route short name: **SB Line** . Intermediate stops (Cal State L.A., El Monte, Baldwin Park, Covina) are not in the Los Angeles Metro Rail catalog — not added. |
| Antelope Valley Line | Lancaster Station ↔ L.A. Union Station | **Union Station** (A/B/D serve) | Does not call at Pomona North or any other in-catalog LA Metro Rail station. |
| Ventura County Line | Ventura–East ↔ L.A. Union Station | **Union Station** (A/B/D serve) | Does not call at Pomona North. |
| Orange County Line | L.A. Union Station ↔ Oceanside | **Union Station** (A/B/D serve) | Does not call at Pomona North. |
| 91/Perris Valley Line | L.A. Union Station ↔ Perris–South | **Union Station** (A/B/D serve) | Does not call at Pomona North. |
| Riverside Line | L.A. Union Station ↔ Riverside–Downtown | **Union Station** (A/B/D serve) | Does not call at Pomona North. |
| Inland Empire–Orange County Line | San Bernardino–Downtown ↔ Oceanside | Not applicable | Does not serve Union Station. Does not call at Pomona North. |

**"A/B/D serve" in the table above means LA Metro Rail lines A, B and D call at that station.** "A only" at Pomona North means only Metro's A Line. It is not a Metrolink service-pattern code.

**Catalog cut (this pass):** Metrolink departures are added only at in-catalog stations where Metrolink actually calls: Union Station and Pomona North. No other Metrolink station is added. At Union Station the board owes all six lines in the table above. At Pomona North the board owes the San Bernardino Line only. Filtering the other five lines off Union Station would be a silent board cut.

**Direction facts for Luke:** Each line uses its GTFS short name plus the far terminus (AV Line, VC Line, OC Line, 91-PV Line, RIV Line, SB Line). SB Line's far ends are San Bernardino–Downtown, with limited weekday trips to Redlands–University. A trip that terminates at the board station is not a direction chip for that station. Metrolink chips stay in their own direction group, not collapsed into Metro Rail's "A Line + …" chips. Same shape as Brussels STIB + SNCB: one station board, directions not merged. The Metro hub lock stays 7th St/Metro Ctr and is never a Metrolink direction.

**Hub clarification:** Union Station hosts both LA Metro Rail (A/B/D lines) and Metrolink (6 lines: AV, VC, OC, 91-PV, RIV, SB). The catalog's hub lock remains **7th St/Metro Ctr** for LA Metro Rail only (A × B × D × E). Union Station is a separate transfer building, already identified in the LA oracle and hazard pack.

## Ticketing and walk-up boarding (verified)

Metrolink offers walk-up ticketing at all stations:
- **Station ticket machines:** Touch-screen machines installed at all Metrolink stations, including Union Station and Pomona - North.
- **LA Union Station ticket windows:** Two staffed windows (East/West Portals) offer all ticket types.
- **Mobile app:** Official Metrolink mobile app for iOS/Android.
- **Ticket types:** One-Way Ticket (5-hour expiration from purchase), SoCal Day Pass (systemwide), L.A. Zone Day Pass (Downtown LA zone, fixed $5 fare), Multi-day passes (5-Day Flex, Monthly), and reciprocal multi-line options.
- **No compulsory advance reservation:** All Metrolink fares are walk-up valid; no seat assignment or booking requirement. Tickets are valid on purchase date only (one-way and day passes); they do not enforce a specific train departure.
- **Free transfers included:** Each Metrolink ticket/pass includes free transfers to most local transit (LA Metro bus, subway, light rail, etc.), helping riders complete their trip without extra cost.

Source: https://metrolinktrains.com/ticketsOverview/ticket-info/ticket-types/ (verified 25 Oct 2026).

Test 1 (walk-up boardable): **Pass.** No compulsory seat reservation; walk-up tickets are available at station machines and staffed windows; riders board on purchase.

Test 2 (leave-by valid): **Pass.** No check-in, security barrier, or border control between station entrance and platform. Standard platform access like LA Metro.

**Verdict: `in`.** Metrolink passes both board-eligibility tests.

## License

- **License name:** No unified license stated for Metrolink's static GTFS download. Metrolink does not publish a Creative Commons or open-data license for the schedule data (unlike many US transit agencies). The GTFS-RT API is separately governed by an End-User License Agreement (EULA).
- **Redistribution / rehosting:** Static GTFS: Metrolink does not explicitly authorize or prohibit redistribution in publicly available terms; the download is available without registration or key. GTFS-RT (Trips/Vehicles/Alerts): EULA §3 (Restrictions) prohibits copying, modification, distribution, sale, or transfer of the API without written consent from Metrolink. Quote: "You may not copy, modify, distribute, sell, or transfer the API Access or any part thereof without the prior written consent of Metrolink." Alerts endpoint (https://cdn.simplifytransit.com/metrolink/alerts/service-alerts.pb) is keyless and does not carry a stated redistribution restriction in the available terms; however, the EULA governs the broader API offering.
- **Commercial use:** Static GTFS: not stated. GTFS-RT EULA §1 (Grant of License) restricts use to "your own internal business purposes" and forbids rental, lease, lending, or sublicensing. A commercial application using the API would require explicit written consent from Metrolink.
- **Attribution:** No attribution requirement stated for static GTFS. GTFS-RT EULA does not mention attribution.
- **Terms URL:** Static GTFS info: https://metrolinktrains.com/about/gtfs/ . GTFS-RT EULA: https://metrolinktrains.com/about/gtfs/gtfs-rt-terms-and-conditions/ . GTFS-RT API Key signup and terms of use: https://metrolinktrains.com/about/gtfs/gtfs-rt-access/ .
- **Confidence:** `unclear` for a live board. The static-GTFS page says the format is open and that "other software developers may be able to use this data for other applications." It does not grant a named open license, and `feed_info.txt` has no license field. The GTFS-RT EULA is narrower: internal business purposes only, and no copy or distribution of the API without prior written consent. The sentence on that page about Creative Commons Attribution 3.0 describes the GTFS-realtime *specification*, not Metrolink's feed. Serving live Metrolink departures through this app's API is not authorized by the EULA as written. Tim has to approve that use, or get Metrolink's written consent, before any adapter calls the real-time feed. A draft of this report also cited an "EULA 4(vi)" Content clause; that numbered clause is not on the terms page and has been removed (controller, 25 Oct 2026).

**Keyed feeds:** Trips and Vehicles require `X-Api-Key`. Never paste a key. The EULA above is the key agreement. Alerts are a separate keyless protobuf URL and are not a departure board.

## Board eligibility

Four rail services call at in-catalog LA Metro Rail stations where Metrolink operates or other Amtrak/regional services stop. Metrolink passes the walk-up tests. Other services are already recorded in the existing LA oracle and US ledger.

| Service | Station(s) | Verdict | Evidence |
| --- | --- | --- | --- |
| **Metrolink** (AV, VC, OC, 91-PV, RIV, SB at Union Station; SB only at Pomona North) | Union Station · Pomona North | `in` — **Tim, 25 Oct 2026** | Walk-up ticketing at station machines; no advance reservation — https://metrolinktrains.com/ticketsOverview/ticket-info/ticket-types/ . All six Union Station lines are in. SB Line is the only Metrolink service at Pomona North. |
| **Amtrak Pacific Surfliner** | Union Station | `in` — per US ledger | Unreserved coach. Feed gate still blocked. See `docs/pacific-surfliner-d1/oracle-clash-report.md`. Not re-researched here. |
| **Amtrak Coast Starlight, Southwest Chief, Sunset Limited, Texas Eagle** | Union Station | `out-reservation` — per US ledger | Compulsory seat reservation. The LA ledger list; this report does not add other long-distance names. |
| **LA Metro G Line / J Line (busways)** | North Hollywood (B passes nearby; not a served station) · Union Station / 7th St/Metro Ctr (services these via bus rapid transit) | `out-mode` | Buses. v1 is rail only. Already recorded in LA oracle (144–145 rows). |

**No services other than Metrolink and the Amtrak services listed above call at any in-catalog LA Metro Rail station** — verified against Metrolink's public GTFS and LA Metro's own system. Metro Bike Share, airport people movers (SkyLink, FlyAway), and other modes are not rail services and are explicitly out of v1.

The existing LA oracle already records Amtrak and busway verdicts. This pass records Metrolink `in` at Union Station (six lines) and Pomona North (San Bernardino Line only). No new stations are introduced. Live wiring still waits on Tim's reading of the GTFS-RT EULA.

---

## What this report covers

1. **Metrolink agency identity and feeds:** Confirmed static GTFS (unkeyed), GTFS-RT endpoints (keyed Trips/Vehicles, keyless Alerts), timezone, and stop IDs for Union Station and Pomona North.
2. **Walk-up boarding:** Verified ticketing options and walk-up policy at both in-catalog stations. Metrolink passes board-eligibility tests 1 and 2.
3. **Lines and termini:** Six lines call at Union Station (AV, VC, OC, 91-PV, RIV, SB). Only the San Bernardino Line also calls at Pomona North. The Inland Empire–Orange County Line calls at neither in-catalog station.
4. **Catalog cuts:** No new stations are added. Only in-catalog stations where Metrolink actually stops (Union Station, Pomona North) receive Metrolink departures.
5. **License:** Static GTFS has no public license; redistribution terms unclear. GTFS-RT API is keyed and restricted by EULA; Tim must verify whether serving Metrolink data to riders in our app is permitted.
6. **Board eligibility:** Metrolink is `in` at Union Station and Pomona North. Amtrak and busway verdicts are recorded in the existing LA oracle and US ledger — no re-research.

## Skip risk

The feeds exist. Wiring a live board is blocked until Tim accepts the GTFS-RT EULA (internal use only; no distribution without written consent) or Metrolink grants consent. The static zip is unkeyed and the agency page invites other developers to use it; that does not clear the real-time EULA. Not a missing-feed skip.

**Decision 27 Oct 2026 (Tim):** Los Angeles flips with Metrolink live, accepting the EULA risk. This supersedes "blocked until Tim accepts" above. The ledger's 25 Oct reading stands (one server-side key, rider-facing boards, no raw protobuf republished), but the licence question is not cleared by Metrolink and the risk is Tim's.
