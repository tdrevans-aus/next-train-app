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
- **Redlands - University is not a chip at these stations.** The static zip (opened 25 Oct 2026) has 39 San Bernardino Line trips that end at `Redlands - University`, and none of them call at stop 107 or 109. The trips that do call at both stations and run past San Bernardino end at `Redlands - Downtown`: one each way, weekday `service_id` 1146. That final stop is a chip under the same short-turn rule LA Metro already uses. See H5.
- **"A/B/D" is Metro Rail, not a Metrolink calendar.** In the oracle table it means Metro lines A, B and D serve Union Station, and only the A Line serves Pomona North. Both stations get the same SB Line trips (30 to `San Bernardino - Downtown`, 25 back to Union Station, plus the one Redlands pair). Filter by stop_id, not by a pattern letter.
- **Metrolink/Amtrak/FlyAway logos** on the Metro Rail map: already flagged as transfers in the LA Metro Rail hazard pack H3. This pack covers Metrolink only. Amtrak Pacific Surfliner has a separate research report (`docs/pacific-surfliner-d1/oracle-clash-report.md`); its live wiring is also blocked pending Tim's approval of redistribution terms (US ledger §LA table).
- **Metro A Line Extension Project** (dashed, east of Pomona North) and **D Line Extension** (west of Wilshire/La Cienega): overlay / future; not Metrolink stops; not affected by this pack.

## H4 — branches (doNotGroup candidates)

| node | Metrolink direction chips | evidence |
| --- | --- | --- |
| **Union Station** | Primary: `AV Line + Lancaster`, `VC Line + Ventura - East`, `OC Line + Oceanside`, `91-PV Line + Perris - South`, `RIV Line + Riverside - Downtown`, `SB Line + San Bernardino - Downtown`. Short turns that are real final stops of trips calling at stop 107 are also chips (H5). | `stops.txt` / `stop_times.txt` join, 25 Oct 2026. Strings are exact GTFS `stop_name`s. Trains whose final stop is 107 are not chips here. |
| **Pomona North** | `SB Line + San Bernardino - Downtown`, `SB Line + Union Station`, and `SB Line + Redlands - Downtown` for the one weekday trip that ends there. | Same join. Only the SB Line calls at stop 109. Westbound chip uses the catalog name `Union Station` (GTFS `L.A. Union Station`). |

A trip that terminates at the board station is **not** a direction chip at that station. (Source: oracle clash report §Direction facts for Luke)

Dropping any of the six lines from the Union Station board is a silent board cut. (Source: oracle clash report §Catalog cut)

## H5 — nested short turns

Same rule as LA Metro (`docs/jim-brief-la-short-turn-chips.md`): if a trip calls at the board station and its final stop is somewhere else, that final stop is a chip. Counts below are trips in the 5 May 2026 zip whose path includes the station. Primary termini are the majority; the rest are short turns, not optional.

**Union Station (stop 107), final stops other than Union Station:**

| route_id | route_short_name | final stop_name | trips |
| --- | --- | --- | --- |
| Antelope Valley Line | AV Line | Lancaster | 19 |
| Antelope Valley Line | AV Line | Via Princessa | 6 |
| Antelope Valley Line | AV Line | Vista Canyon | 4 |
| Ventura County Line | VC Line | Moorpark | 9 |
| Ventura County Line | VC Line | Ventura - East | 6 |
| Ventura County Line | VC Line | Chatsworth | 1 |
| Orange County Line | OC Line | Oceanside | 14 |
| Orange County Line | OC Line | Laguna Niguel / Mission Viejo | 11 |
| 91 Line | 91-PV Line | Perris - South | 17 |
| 91 Line | 91-PV Line | Riverside - Downtown | 1 |
| Riverside Line | RIV Line | Riverside - Downtown | 5 |
| San Bernardino Line | SB Line | San Bernardino - Downtown | 30 |
| San Bernardino Line | SB Line | Redlands - Downtown | 1 |

**Pomona North (stop 109):** the same SB Line trips. Eastbound finals are `San Bernardino - Downtown` (30) and `Redlands - Downtown` (1). Westbound finals are `L.A. Union Station` (26, including the Redlands trip). Chip text for that westbound end is `SB Line + Union Station`.

`Redlands - University` (stop_id 191) is a real SB Line terminus for 39 other trips. None of those trips call at 107 or 109, so it is not a chip on either board.

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

## Flags closed from the static zip (25 Oct 2026)

The four flags in the first draft of this pack are closed. `route_id` in this feed is the long line name, not the short name.

- **H.flag.1.** `Redlands - University` does not call at Union Station or Pomona North. The catalog-reaching extension ends at `Redlands - Downtown` (one weekday trip each way) and is a short-turn chip. Not a Tim question.
- **H.flag.2.** "A/B/D" in the oracle is Metro Rail lines. It is not a Metrolink `service_id`. Weekday services in `calendar.txt` are the `service_id`s with Monday–Friday set (1141, 1142, 1146, 1149–1151, 1153). The Redlands - Downtown pair is 1146.
- **H.flag.3.** Exact `stop_name`s, hyphen with spaces: `Ventura - East` (169), `Perris - South` (184), `Riverside - Downtown` (123), `San Bernardino - Downtown` (185), `Redlands - Downtown` (190), `L.A. Union Station` (107), `Pomona - North` (109), `Lancaster` (162), `Oceanside` (144). Also short-turn names `Via Princessa`, `Vista Canyon`, `Moorpark`, `Chatsworth`, `Laguna Niguel / Mission Viejo`.
- **H.flag.4.** `route_id` / `route_short_name`: `Antelope Valley Line` / `AV Line`; `Ventura County Line` / `VC Line`; `Orange County Line` / `OC Line`; `91 Line` / `91-PV Line`; `Riverside Line` / `RIV Line`; `San Bernardino Line` / `SB Line`; `Inland Emp.-Orange Co. Line` / `IE-OC Line` (out of scope).

The GTFS-RT EULA is still open. That one waits on Tim. It is not one of these four flags.

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no provider code, no LA Metro Rail pack edit, no GTFS-RT key, no Pomona - Downtown entry, no IE-OC entry, no new stations.
