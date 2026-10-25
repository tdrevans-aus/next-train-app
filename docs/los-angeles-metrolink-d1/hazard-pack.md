# Los Angeles — Metrolink hazard pack (H1–H7)

Evidence: oracle clash report `docs/los-angeles-metrolink-d1/oracle-clash-report.md` (Nico research, 25 Oct 2026); US ledger `docs/united-states-ledger.md` §Los Angeles table (Tim ruling, 25 Oct 2026). Static GTFS zip verified 25 Oct 2026 (Metrolink, Transitland Onestop f-9qh-metrolinktrains, Mobility Database mdb-96). GTFS-RT not wired — live board blocked by EULA (see §License below). Product `lib/cities/los-angeles/` is the primary LA Metro Rail catalog; this pack is the Metrolink second-operator supplement. No new stations are introduced.

## H1 — parent + child / doNotGroup

D1 has no stop-level IDs in this pack. Jim will resolve GTFS stop_id `107` (`L.A. Union Station`) → catalog `Union Station`, and GTFS stop_id `109` (`Pomona - North`) → catalog `Pomona North` during wiring. Both catalog entries already exist in the LA Metro Rail pack; this pack adds Metrolink departures to those two boards only.

**doNotGroup — direction groups:**

- Metrolink direction chips form a **separate group** from LA Metro Rail chips on the same station board. Do not collapse "SB Line + San Bernardino–Downtown" into "A Line + Pomona North" even though both call at Pomona North. Same Brussels STIB + SNCB shape: one station board, directions not merged. (Source: oracle clash report §Direction facts for Luke)
- **7th St/Metro Ctr** is the Metro Rail hub lock (A × B × D × E). It is **never** a Metrolink direction chip. No Metrolink line calls at 7th St/Metro Ctr. (Source: oracle clash report §Hub clarification)
- **Union Station** is the Metrolink terminal building and also a through-stop for Metro Rail A/B/D. Union Station is **not** the Metro Rail hub lock — that is 7th St/Metro Ctr. Do not merge these. (Source: LA Metro Rail hazard pack H6; oracle clash report §Hub clarification)

**doNotGroup — station name collisions:**

- `Pomona North` (catalog, Metro A Line) vs `Pomona - North` (Metrolink GTFS stop_id 109). Same physical station; one catalog name `Pomona North`. Jim maps GTFS 109 to the existing catalog entry. (Source: oracle clash report §Stop IDs and §Metrolink lines table)
- `Pomona - Downtown` (Metrolink GTFS stop_id 120) is a **different Metrolink station** and is not in the LA catalog. Do not add it. Do not confuse with `Pomona North`. (Source: oracle clash report — "Do not invent a second Pomona stop")
- `Union Station` (catalog) vs `L.A. Union Station` (Metrolink GTFS stop_id 107). Same physical station; one catalog entry. Jim maps GTFS 107 to the existing `Union Station` entry. (Source: oracle clash report §Stop IDs)

## H3 — thin / event / overlay

- **Inland Empire–Orange County (IE-OC) Line**: Does not call at Union Station or Pomona North. IE-OC produces no chip at any in-catalog station board. (Source: oracle clash report — "IE-OC calls at neither")
- **Redlands–University limited service**: The SB Line has limited weekday trips that continue to Redlands–University beyond San Bernardino–Downtown. Whether these generate a separate direction chip ("SB Line → Redlands–University") is an **open question for Tim** — see H.flag.1 below. Do not suppress; do not assert as the primary terminus without Tim's decision.
- **SB Line service patterns A/B/D at Union Station vs A only at Pomona North**: The oracle records that all service patterns (A, B, D) call at Union Station (stop_id 107), but only pattern A calls at Pomona North (stop_id 109). This is a departure-frequency difference, not a direction-chip difference; the board at Pomona North will see fewer SB Line departures than Union Station. Jim must filter stop_times by stop_id 109 for the Pomona North board. (Source: oracle clash report §Metrolink lines table)
- **Metrolink/Amtrak/FlyAway logos** on the Metro Rail map: already flagged as transfers in the LA Metro Rail hazard pack H3. This pack covers Metrolink only. Amtrak Pacific Surfliner has a separate research report (`docs/pacific-surfliner-d1/oracle-clash-report.md`); its live wiring is also blocked pending Tim's approval of redistribution terms (US ledger §LA table).
- **Metro A Line Extension Project** (dashed, east of Pomona North) and **D Line Extension** (west of Wilshire/La Cienega): overlay / future; not Metrolink stops; not affected by this pack.

## H4 — branches (doNotGroup candidates)

| node | Metrolink direction chips | evidence |
| --- | --- | --- |
| **Union Station** | AV Line → Lancaster; VC Line → Ventura–East; OC Line → Oceanside; 91/Perris Valley Line → Perris–South; RIV Line → Riverside–Downtown; SB Line → San Bernardino–Downtown (+ limited SB Line → Redlands–University — see H.flag.1) | Oracle clash report §Lines table. All six lines depart Union Station outbound. Trains arriving and terminating at Union Station are not chips there. |
| **Pomona North** | SB Line → San Bernardino–Downtown (eastbound); SB Line → Union Station (westbound) | Oracle clash report: SB Line is the only Metrolink line at Pomona North. Pomona North is an intermediate station; both directions are present. |

A trip that terminates at the board station is **not** a direction chip at that station. (Source: oracle clash report §Direction facts for Luke)

Dropping any of the six lines from the Union Station board is a silent board cut. (Source: oracle clash report §Catalog cut)

## H5 — nested short turns

No official Metrolink short-turn codes in this pack. The SB Line's Redlands–University trips are limited weekday service, not a timetabled short-turn set with their own code. Record as a separate chip only if Tim confirms it (H.flag.1); otherwise treat San Bernardino–Downtown as the canonical SB terminus.

## H6 — inner city (where §3 lives)

**Metrolink has no inner-city hub lock in this pack.** Union Station is the single Metrolink terminal for all six in-catalog lines. There is no through-cross shape for Metrolink within the LA catalog.

Metro Rail hub lock stays **7th St/Metro Ctr** (A × B × D × E). Metrolink direction chips must never emit "7th St/Metro Ctr" as a destination or token.

## H7 — DST

**America/Los_Angeles observes DST (PDT/PST).** Wall-clock is Pacific local. Do not copy Perth / Brisbane no-DST. (Source: oracle clash report §Agency/feed table; US ledger §LA table)

## License / live-wire status

Static GTFS: `https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip` — no key required. No explicit open-data license; `feed_info.txt` has no license field. Metrolink's GTFS page invites developer use but publishes no named license. Redistribution terms: `unclear`.

GTFS-RT Trips and Vehicles: `X-Api-Key` header required. EULA §1 limits use to "own internal business purposes"; EULA §3 prohibits "copy, modify, distribute, sell, or transfer the API Access or any part thereof without the prior written consent of Metrolink." **Serving live Metrolink departures via this app's API is not authorized by the EULA as written. Live wiring waits on Tim.** (Source: oracle clash report §License)

Alerts endpoint (`https://cdn.simplifytransit.com/metrolink/alerts/service-alerts.pb`): keyless protobuf; no stated redistribution restriction on this URL, but governed by the broader Metrolink EULA.

**Do not write provider code. Do not wire the GTFS-RT feed. This pack stays `planned` until Tim approves the EULA or Metrolink grants written consent.**

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Metrolink direction group vs LA Metro Rail direction group | Separate groups on the same board — do not collapse. Brussels STIB + SNCB shape. |
| 7th St/Metro Ctr (Metro hub) vs Union Station (Metrolink terminal) | Metro hub is never a Metrolink direction chip |
| Union Station (catalog) vs L.A. Union Station (GTFS stop_id 107) | Same station; one catalog entry |
| Pomona North (catalog) vs Pomona - North (GTFS stop_id 109) vs Pomona - Downtown (GTFS stop_id 120) | 109 → catalog entry; 120 is a different station, not in catalog, never added |
| SB Line chips vs A Line chips at Pomona North | Same platform building; different direction group |
| IE-OC Line at any board | Does not call at any in-catalog station — no chip at Union Station or Pomona North |
| los-angeles-metrolink vs los-angeles (Metro Rail pack) | Second-operator supplement — do not overwrite Metro Rail pack |
| Other-city hub strings (Chicago Loop, Beurs, T-Centralen, Brunnsparken, Centraal Station, Waitematā Station, Metro Center, Rautatientori) | Do not copy |

## Ambiguities flagged for Tim

**H.flag.1 — SB Line Redlands–University chip**: The oracle confirms "limited weekday trips to Redlands–University" beyond San Bernardino–Downtown on the SB Line. Should the board at Union Station and Pomona North show a separate chip "SB Line → Redlands–University" for these trips, or group them all under "SB Line → San Bernardino–Downtown"? The oracle does not decide this. Jim cannot wire without Tim's answer. (Source: oracle clash report §Direction facts for Luke — "SB Line's far ends are San Bernardino–Downtown, with limited weekday trips to Redlands–University")

**H.flag.2 — SB Line service pattern A/B/D meaning**: The oracle records "A/B/D serve" at Union Station and "A only serves in catalog" at Pomona North for the SB Line, and uses the same "A/B/D serve" notation for the other five lines at Union Station. The oracle does not define what A, B, D denote (likely calendar types: weekday / Saturday / Sunday). Jim should identify the service_id values in `calendar.txt` before writing stop_times filters. This does not affect which direction chips appear but does affect departure counts per day.

**H.flag.3 — Far terminus GTFS stop_name values**: The oracle gives "Lancaster," "Ventura–East," "Oceanside," "Perris–South," "Riverside–Downtown," "San Bernardino–Downtown," "Redlands–University" as the far termini for the six lines. It does not confirm whether these are the exact `stop_name` values in Metrolink's `stops.txt`. Jim must verify from the GTFS zip before wiring direction chip strings. "Ventura–East" and "Perris–South" in particular are oracle shorthand and may differ from GTFS. (Source: oracle clash report §Lines table notes)

**H.flag.4 — GTFS route_id values**: The oracle confirms stop_ids 107 and 109 and route short names (AV Line, VC Line, OC Line, 91-PV Line, RIV Line, SB Line), but does not list the individual `route_id` values for each line from Metrolink's `routes.txt`. Jim must extract these from the GTFS zip.

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no provider code, no LA Metro Rail pack edit, no GTFS-RT key, no Pomona - Downtown entry, no IE-OC entry, no new stations.
