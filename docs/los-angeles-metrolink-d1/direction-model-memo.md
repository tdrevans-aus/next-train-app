# Los Angeles — Metrolink direction model memo (§3 for Tim)

Context **today (25 Oct 2026)**: Metrolink is a second operator on the existing Los Angeles board. Two in-catalog stations receive Metrolink departures: **Union Station** (six Metrolink lines) and **Pomona North** (San Bernardino Line only). The direction model uses **line name + far terminus** — the same shape as the LA Metro Rail pack (`docs/los-angeles-d1/direction-model-memo.md`) but in a **separate Metrolink direction group**. Metro Rail chips and Metrolink chips coexist on the same station board and are never merged. Same shape as Brussels STIB + SNCB: one station board, two operator groups, directions not collapsed. (Source: oracle clash report §Direction facts for Luke)

The Metro Rail hub lock (**7th St/Metro Ctr**, A × B × D × E) is **never** a Metrolink direction token. No Metrolink line calls at 7th St/Metro Ctr.

A trip that **terminates at the board station** is **not** a direction chip there. This matters at Union Station (the Metrolink terminal for all six lines): inbound trains terminating at Union Station are not chips at Union Station. Outbound departures from Union Station toward the far terminus are the chips. At Pomona North (an intermediate station), both directions appear.

Chip strings below use GTFS `route_short_name` plus the exact GTFS `stop_name`, joined with ` + `, matching LA Metro (`A Line + Pomona North`). The four draft flags are closed in the hazard pack. Live wiring still waits on the GTFS-RT EULA.

## Recommendation

**Line name + far terminus** (example: `AV Line + Lancaster`, `SB Line + San Bernardino - Downtown`).

Use the **far printed terminus** on trains leaving the board station. Use **Union Station** only as the westbound chip label at Pomona North — never as a direction token for departures from Union Station itself.

## Direction chips at each in-catalog station

### Union Station — Metrolink group

All six lines depart Union Station. Dropping one is a silent board cut. Labels use the GTFS short name. Trip counts are departures whose final stop is that name (hazard pack H5).

| line | direction chip | trips |
| --- | --- | --- |
| AV Line | AV Line + Lancaster | 19 |
| AV Line | AV Line + Via Princessa | 6 |
| AV Line | AV Line + Vista Canyon | 4 |
| VC Line | VC Line + Moorpark | 9 |
| VC Line | VC Line + Ventura - East | 6 |
| VC Line | VC Line + Chatsworth | 1 |
| OC Line | OC Line + Oceanside | 14 |
| OC Line | OC Line + Laguna Niguel / Mission Viejo | 11 |
| 91-PV Line | 91-PV Line + Perris - South | 17 |
| 91-PV Line | 91-PV Line + Riverside - Downtown | 1 |
| RIV Line | RIV Line + Riverside - Downtown | 5 |
| SB Line | SB Line + San Bernardino - Downtown | 30 |
| SB Line | SB Line + Redlands - Downtown | 1 |

**Union Station does not emit a "to 7th St/Metro Ctr" chip or any Metro Rail hub token.** Metrolink chips stay in the Metrolink group.

### Pomona North — Metrolink group

Only the San Bernardino Line calls at Pomona North. Any chip for another Metrolink line at Pomona North is a station graph error. IE-OC Line does not call at Pomona North or Union Station; no IE-OC chip at either station. (Source: oracle clash report)

| line | direction chip | trips |
| --- | --- | --- |
| SB Line | SB Line + San Bernardino - Downtown | 30 eastbound |
| SB Line | SB Line + Redlands - Downtown | 1 weekday eastbound (`service_id` 1146) |
| SB Line | SB Line + Union Station | 26 westbound. Catalog name, not the GTFS string `L.A. Union Station`. |

A trip terminating at Pomona North is not a chip at Pomona North.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line name + terminus** (recommend) | AV Line + Lancaster; SB Line + San Bernardino - Downtown | Matches GTFS short name + exact `stop_name`; stays separate from Metro Rail chips | Short-turn finals add chips (H5). That is the LA Metro rule, already shipped. |
| **B. Terminus only** | Lancaster; Oceanside; San Bernardino–Downtown | Shorter labels | At Union Station, RIV Line (Riverside–Downtown) and SB Line (San Bernardino–Downtown) both head east — no family label to separate them without the line name |
| **C. Inbound/outbound vs Downtown** | To City / To Lancaster | Familiar concept | False shape: Union Station is the Metrolink hub, not a through-cross; "Downtown" / "City" is not a Metrolink terminus |

## §3 examples (illustrative — not D5)

Assume model A. Separate Metrolink direction group on each board.

### Union Station — Metrolink departures

| train | label |
| --- | --- |
| AV Line to Lancaster | AV Line + Lancaster |
| VC Line to Ventura - East | VC Line + Ventura - East |
| OC Line to Oceanside | OC Line + Oceanside |
| 91-PV Line to Perris - South | 91-PV Line + Perris - South |
| RIV Line to Riverside - Downtown | RIV Line + Riverside - Downtown |
| SB Line to San Bernardino - Downtown | SB Line + San Bernardino - Downtown |
| SB Line weekday trip to Redlands - Downtown | SB Line + Redlands - Downtown |

**Union Station is not a direction token.** Do not emit "to Union Station" from Union Station itself. Do not emit "to 7th St/Metro Ctr" or "to Downtown" as a Metrolink chip.

### Pomona North — Metrolink departures

| train | label |
| --- | --- |
| SB Line eastbound | SB Line + San Bernardino - Downtown |
| SB Line weekday extension | SB Line + Redlands - Downtown |
| SB Line westbound | SB Line + Union Station |

**Pomona North is an intermediate SB Line station.** Both directions appear. A trip terminating at Pomona North is not a chip there.

## Still open

**Live wiring.** No Metrolink row is served until Tim accepts the GTFS-RT EULA or Metrolink grants written consent. Chip shape above does not depend on that.

Closed, not open: Redlands - University is not a chip here; "A/B/D" is Metro Rail; stop names and `route_id`s are the H5 table; the board label is the GTFS short name `91-PV Line`.
