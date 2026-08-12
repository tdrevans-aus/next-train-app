# Direction collapse heuristic (city-agnostic)

**Status:** v8 — first consumer Perth (Whitfords / Yanchep class)  
**Code:** `lib/direction-collapse-heuristic.js`  
**Perth data:** `lib/cities/perth/line-map.json`

## Problem

Live boards often expose **per-train terminal strings** (short turns), not line identity. Riders save a direction like **Yanchep** and miss Whitfords-terminated trains on the same corridor.

## Ruleset

| ID | Rule | Action |
|----|------|--------|
| **R1** | Nested short-turns on an ordered corridor | Farthest terminus is canonical; nearer terminals are members |
| **R2** | Two termini co-list at ≥3 non-junction stations | Propose merge under outer/canonical |
| **R3** | Either terminus is a known branch name | Do not auto-merge |
| **R4** | Pair only co-occurs at a branched junction | Reject / undo merge (e.g. High Wycombe vs Ellenbrook at Bayswater) |

## Process for any city

1. Pull distinct destinations from live (or static) boards at major hubs + every station on candidate corridors.
2. Build an ordered station list per corridor (GTFS shapes or official map).
3. Mark **branched junctions** (where two lines diverge).
4. Run `proposeDirectionGroups({ terminals, lineStationsOrdered, coOccurrenceByStation, branchedJunctions })`.
5. Product-review proposed groups; ship as `LINE_DESTINATION_GROUPS` (server) + `LINE_DIRECTION_GROUPS` (client).
6. QA: picker collapses members; trip filter includes short-turns under canonical.

## Perth shipped groups (v8)

| Canonical | Members |
|-----------|---------|
| Yanchep | Whitfords, Clarkson, Butler |
| Mandurah | Cockburn |
| Fremantle | Claremont |

Explicitly **not** grouped: High Wycombe ↔ Ellenbrook; Byford ↔ Cockburn; Claremont ↔ High Wycombe.

## Coverage gaps

See `line-map.json` → `coverageGaps` (Ellenbrook line stations, Alkimos/Eglinton, Byford naming).
