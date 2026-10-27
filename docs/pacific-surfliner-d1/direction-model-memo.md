# Los Angeles — Amtrak Pacific Surfliner direction model memo (§3 for Tim)

Context **today (25 Oct 2026)**: Pacific Surfliner is a second operator on the existing Los Angeles board. One in-catalog station receives Pacific Surfliner departures: **Union Station** (GTFS stop_id `LAX`, stop_name `Los Angeles`; catalog name `Union Station`). The direction model uses **service name + far terminus** — chip text is `Pacific Surfliner +` the exact GTFS final stop_name. This is a **separate Pacific Surfliner direction group** from both the LA Metro Rail group and the Metrolink group; three operator groups coexist at Union Station and are never merged. (Source: oracle clash report §v1 mode cut; §Correction 25 Oct 2026; ledger §LA table)

The Metro Rail hub lock (**7th St/Metro Ctr**, A × B × D × E) is **never** a Pacific Surfliner direction token. Pacific Surfliner does not call at 7th St/Metro Ctr.

A trip that **terminates at the board station** is **not** a direction chip there. Thirteen inbound trips whose final stop is `Los Angeles` (stop_id LAX) terminate at Union Station and are not chips at Union Station. Only the 31 outbound departures generate chips.

Chip strings below use the exact GTFS `stop_name` of the trip's final stop, prefixed with `Pacific Surfliner + `, matching the oracle instruction. There is one route (route_id 78, route_long_name `Pacific Surfliner`) with no distinct short name per line — the prefix is always `Pacific Surfliner`. (Source: oracle clash report §Correction 25 Oct 2026 — "Chip text is 'Pacific Surfliner +' plus the exact GTFS final stop_name")

Live wiring is **allowed**: Tim approved the transitdocs GTFS-RT feed on 25 Oct 2026. Filter by route_id 78; all other route_ids in that feed are long-distance Amtrak (`out-reservation`) and must not appear on the board.

## Recommendation

**Service name + final terminus** (example: `Pacific Surfliner + San Diego`, `Pacific Surfliner + Goleta Amtrak`).

Use the **far printed terminus** on trains leaving Union Station. `Union Station` / `Los Angeles` are never direction tokens for departures from Union Station itself.

## Direction chips at each in-catalog station

### Union Station — Pacific Surfliner group

All three terminal destinations must appear on this board. Dropping one is a silent board cut. (Source: oracle clash report §Correction 25 Oct 2026)

| direction chip | trips departing Union Station | note |
| --- | --- | --- |
| Pacific Surfliner + San Diego | 22 | Includes 13 originating at Los Angeles, 6 originating at Goleta Amtrak, 3 originating at San Luis Obispo. All pass Union Station bound for San Diego. |
| Pacific Surfliner + Goleta Amtrak | 6 | Includes 5 originating at San Diego going north, 1 originating at Los Angeles. |
| Pacific Surfliner + San Luis Obispo | 3 | Includes 2 originating at San Diego going north, 1 originating at Los Angeles. |

**Inbound trains not chipped (13 trips):** Final stop `Los Angeles`. These terminate at Union Station and are not chips. (Source: oracle clash report §Correction 25 Oct 2026)

**Union Station does not emit a "to 7th St/Metro Ctr" chip, any Metro Rail hub token, or any Metrolink line name.** Pacific Surfliner chips stay in the Pacific Surfliner group.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Service name + terminus** (recommend) | Pacific Surfliner + San Diego; Pacific Surfliner + Goleta Amtrak | Matches oracle instruction; unambiguous at Union Station where Metro Rail and Metrolink chips also appear | Slightly long label; only one "line" so prefix is redundant information — but it keeps the group visually coherent |
| **B. Terminus only** | San Diego; Goleta Amtrak; San Luis Obispo | Shorter labels | Ambiguous if a Metrolink or future operator chip happens to share a geographic name; the `Pacific Surfliner` prefix is the only thing tying these to their operator at a busy multi-operator board |
| **C. Direction / compass** | Northbound / Southbound | Familiar concept | False shape: Union Station is the LA terminal, not a through-cross; compass words add nothing vs. "to San Diego" |

## §3 examples (illustrative — not D5)

Assume model A. Separate Pacific Surfliner direction group on the Union Station board.

### Union Station — Pacific Surfliner departures

| train | label |
| --- | --- |
| Pacific Surfliner to San Diego (any origin) | Pacific Surfliner + San Diego |
| Pacific Surfliner to Goleta Amtrak (any origin) | Pacific Surfliner + Goleta Amtrak |
| Pacific Surfliner to San Luis Obispo (any origin) | Pacific Surfliner + San Luis Obispo |

**Union Station is not a direction token.** Do not emit "to Los Angeles", "to Union Station", "to Downtown", or "to 7th St/Metro Ctr" from Union Station as a Pacific Surfliner chip.

**Long-distance Amtrak in the same feed is not a chip.** The transitdocs GTFS-RT feed includes Coast Starlight, Southwest Chief, Sunset Limited, Texas Eagle, and other Amtrak services. Jim must filter by route_id 78. No other route_id from this feed appears on the board.

## Still open

None from the oracle report. Tim's feed approval (25 Oct 2026) is the operative gate; no further hold.

Feed attribution: transitdocs asks to be notified (asm-contact@transitdocs.com) as a courtesy when their feed is used — not a formal attribution clause, but record the contact for provider notes.

Closed, not open: Pomona North is not a Pacific Surfliner station; seasonal peak-holiday all-reserved days do not change the `in` verdict (walk-up default, per board-eligibility rule §6); long-distance Amtrak stays `out-reservation`.
