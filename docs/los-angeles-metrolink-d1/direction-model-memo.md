# Los Angeles — Metrolink direction model memo (§3 for Tim)

Context **today (25 Oct 2026)**: Metrolink is a second operator on the existing Los Angeles board. Two in-catalog stations receive Metrolink departures: **Union Station** (six Metrolink lines) and **Pomona North** (San Bernardino Line only). The direction model uses **line name + far terminus** — the same shape as the LA Metro Rail pack (`docs/los-angeles-d1/direction-model-memo.md`) but in a **separate Metrolink direction group**. Metro Rail chips and Metrolink chips coexist on the same station board and are never merged. Same shape as Brussels STIB + SNCB: one station board, two operator groups, directions not collapsed. (Source: oracle clash report §Direction facts for Luke)

The Metro Rail hub lock (**7th St/Metro Ctr**, A × B × D × E) is **never** a Metrolink direction token. No Metrolink line calls at 7th St/Metro Ctr.

A trip that **terminates at the board station** is **not** a direction chip there. This matters at Union Station (the Metrolink terminal for all six lines): inbound trains terminating at Union Station are not chips at Union Station. Outbound departures from Union Station toward the far terminus are the chips. At Pomona North (an intermediate station), both directions appear.

Do not write D5 assertion tables until Tim locks this and resolves H.flag.1 (Redlands–University chip, hazard pack).

## Recommendation

**Line name + far terminus** (example: `AV Line + Lancaster`, `SB Line + San Bernardino–Downtown`).

Use the **far printed terminus** on trains leaving the board station. Use **Union Station** only as the westbound chip label at Pomona North — never as a direction token for departures from Union Station itself.

## Direction chips at each in-catalog station

### Union Station — Metrolink group

All six in-catalog Metrolink lines depart from Union Station. Dropping any of the five is a silent board cut. (Source: oracle clash report §Catalog cut)

| line | direction chip | notes |
| --- | --- | --- |
| AV Line | AV Line → Lancaster | All Union Station departures head outbound. Trains arriving and terminating at Union Station are not chips. |
| VC Line | VC Line → Ventura–East | "Ventura–East" is oracle shorthand — verify exact GTFS `stop_name` from `stops.txt` before wiring (H.flag.3). |
| OC Line | OC Line → Oceanside | |
| 91/Perris Valley Line | 91/Perris Valley Line → Perris–South | Oracle GTFS short name: `91-PV Line`. Verify exact GTFS `stop_name` (H.flag.3). Confirm board chip label (91-PV Line vs 91/Perris Valley Line) — see open question 3 below. |
| RIV Line | RIV Line → Riverside–Downtown | Verify exact GTFS `stop_name` (H.flag.3). |
| SB Line | SB Line → San Bernardino–Downtown | Limited weekday trips continue to Redlands–University — see H.flag.1. |

**Union Station does not emit a "to 7th St/Metro Ctr" chip or any Metro Rail hub token.** Metrolink chips stay in the Metrolink group.

### Pomona North — Metrolink group

Only the San Bernardino Line calls at Pomona North. Any chip for another Metrolink line at Pomona North is a station graph error. IE-OC Line does not call at Pomona North or Union Station; no IE-OC chip at either station. (Source: oracle clash report)

| line | direction chip | notes |
| --- | --- | --- |
| SB Line | SB Line → San Bernardino–Downtown | Eastbound. SB Line service pattern A serves Pomona North; patterns B and D serve Union Station but not Pomona North. Board will show fewer SB Line departures per day than Union Station. |
| SB Line | SB Line → Union Station | Westbound. Union Station is the Metrolink terminus; chip uses catalog name `Union Station`. |

A trip terminating at Pomona North is not a chip at Pomona North.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line name + terminus** (recommend) | AV Line + Lancaster; SB Line + San Bernardino–Downtown | Matches GTFS route short name + terminus; separates Metrolink from Metro Rail chips; disambiguates six lines at Union Station | Far terminus strings need GTFS verification (H.flag.3); Redlands–University ambiguity (H.flag.1) |
| **B. Terminus only** | Lancaster; Oceanside; San Bernardino–Downtown | Shorter labels | At Union Station, RIV Line (Riverside–Downtown) and SB Line (San Bernardino–Downtown) both head east — no family label to separate them without the line name |
| **C. Inbound/outbound vs Downtown** | To City / To Lancaster | Familiar concept | False shape: Union Station is the Metrolink hub, not a through-cross; "Downtown" / "City" is not a Metrolink terminus |

## §3 examples (illustrative — not D5)

Assume model A. Separate Metrolink direction group on each board.

### Union Station — Metrolink departures

| train | label |
| --- | --- |
| AV Line outbound | AV Line + Lancaster |
| VC Line outbound | VC Line + Ventura–East |
| OC Line outbound | OC Line + Oceanside |
| 91/Perris Valley Line outbound | 91/Perris Valley Line + Perris–South |
| RIV Line outbound | RIV Line + Riverside–Downtown |
| SB Line outbound | SB Line + San Bernardino–Downtown |
| SB Line limited outbound | SB Line + Redlands–University (if Tim confirms chip — H.flag.1) |

**Union Station is not a direction token.** Do not emit "to Union Station" from Union Station itself. Do not emit "to 7th St/Metro Ctr" or "to Downtown" as a Metrolink chip.

### Pomona North — Metrolink departures

| train | label |
| --- | --- |
| SB Line eastbound | SB Line + San Bernardino–Downtown |
| SB Line westbound | SB Line + Union Station |

**Pomona North is an intermediate SB Line station.** Both directions appear. A trip terminating at Pomona North is not a chip there.

## Open §3 questions for Tim

1. **Redlands–University chip (H.flag.1):** Limited weekday SB Line trips continue to Redlands–University past San Bernardino–Downtown. Show as a separate chip ("SB Line + Redlands–University") at Union Station and Pomona North, or group all SB Line outbound under San Bernardino–Downtown? (Source: oracle clash report §Direction facts for Luke)

2. **Far terminus stop_name confirmation (H.flag.3):** "Ventura–East," "Perris–South," "Riverside–Downtown" are oracle shorthand. Jim must verify exact GTFS `stop_name` values from `stops.txt` before wiring these chips. Direction chip strings should match GTFS.

3. **91-PV Line vs 91/Perris Valley Line chip label:** Oracle GTFS short name is `91-PV Line`. Should the board chip use the GTFS short name or the official long-form "91/Perris Valley Line"? Rec: use GTFS short name unless the official Metrolink system map prints a different string.

4. **Live wiring gate:** No direction chip is rendered until Tim approves the GTFS-RT EULA and Jim wires the provider. This memo is for shape only. (Source: oracle clash report §License; US ledger §LA table)
