# Canberra direction model memo (§3 for Tim)

Context **today (27 Aug 2026)**: **single line, hub-and-spoke**. R1 runs **Gungahlin Place – Alinga Street**. Official pages talk “Gungahlin to the City” / “Gungahlin to Civic” and interchange maps talk “R1 to City” / “R1 to Gungahlin”. The printed stop at the city end is **Alinga Street**.

There is no branch and no city loop. Inbound/outbound vs Civic happens to work *on this one line today* and becomes false the moment Stage 2A runs through Alinga Street to Commonwealth Park / Woden.

## Recommendation

**Line + terminus** (example: `R1 + Gungahlin Place`, or `R1 + Alinga Street`).

Use **Gungahlin Place** on services leaving the hub. Use **Alinga Street** (not Civic, not City, not City Interchange) on services arriving at the hub.

Do not write D5 assertion tables until Tim locks this. After Stage 2A, keep the same model with a new far-end token (Commonwealth Park, then Woden) — that is a **new D1**, not a silent merge.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | R1 + Gungahlin Place; R1 + Alinga Street | Matches the map; survives Stage 2A through-running | Official UI says City / Civic not Alinga Street |
| **B. Terminus only** | Gungahlin Place; Alinga Street | Matches destination blinds | Fine while there is one line; fails when Stage 2B adds more than one LR family |
| **C. Inbound/outbound vs Civic + terminus** | To City / To Gungahlin | Close to interchange “R1 to City” | False after Stage 2A through-run. Civic is not the hub lock |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Alinga Street**. Current network.

### Alinga Street (hub)

| train | label |
| --- | --- |
| R1 | R1 + Gungahlin Place |

### Gungahlin Place

R1 + Alinga Street.

### Dickson Interchange

R1 + Gungahlin Place vs R1 + Alinga Street. Line is the same; terminus is the direction.

### After Stage 2A (preview only — not D1)

R1 + Gungahlin Place vs R1 + Commonwealth Park (then Woden). Do not call the city-end “Civic”.

## Open §3 questions for Tim

1. Spoken/printed line token: `R1` (interchange maps) vs `Gungahlin – City` (R1 map title) vs TC card `Gungahlin to Civic`. Rec: **R1 + terminus**.
2. Hub far-end string: `Alinga Street` (lock) vs official tab `City` / `Civic` vs bus GTFS `City West Alinga St`.
3. Whether Stage 2A through-running is a new D1 (yes).
