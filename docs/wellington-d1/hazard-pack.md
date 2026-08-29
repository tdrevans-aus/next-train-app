# Wellington hazard pack (H1–H7)

Evidence: Metlink Regional Rail Network PDF; KPL timetable 23-03-2026; Metlink Open Data GTFS + GTFS-RT; Melling Station closure reporting (RiverLink / Te Wai Takamori o Te Awa Kairangi).

## H1 — parent + child

Metlink GTFS uses `location_type=1` parents (`WELL`, `PAEK`, …) plus platform children. Catalog pins parent `stopIds` where known. Passengers print `* Station`.

doNotGroup:

- **Wellington Station** vs bus stops named Wellington / Lambton
- **Melling Station** (closed) vs **Western Hutt Station** (live MEL terminus)
- HVL **Upper Hutt** vs WRL through-running at Upper Hutt / Waterloo / Petone
- Cable Car / ferry terminals that share suburb names

## H3 — thin / event / overlay

- **Melling Station closed** for RiverLink (~late 2028). MEL shortens to Western Hutt. Not a new line.
- Express / limited Wairarapa patterns still use WRL code — not extra D1 rows.
- Bus replacements during disruption are out of v1.

## H4 — branches

| node | branches | evidence |
| --- | --- | --- |
| Wellington Station | all five lines | Regional Rail Network hub |
| Petone | HVL / MEL / WRL | Shared Hutt corridor |
| Upper Hutt | HVL terminus vs WRL through | Map + GTFS |
| Ngauranga | HVL + MEL | Shared approach |

## H5 — nested short turns

HVL / KPL may short-turn operationally. D1 termini remain Waikanae / Upper Hutt / Western Hutt / Johnsonville / Masterton ↔ Wellington Station.

## H6 — inner city

Locked hub **Wellington Station**. Direction is **line + terminus** (Kāpiti Line + Waikanae Station), not inbound/outbound vs CBD.

## H7 — DST

**Pacific/Auckland observes DST** (NZDT/NZST). Same as Auckland. Do not copy Brisbane no-DST.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| wellington vs auckland | Separate city; different agency feeds |
| Melling Station vs Western Hutt Station | Closed vs live MEL terminus |
| Taitā vs Taita Station | Print vs GTFS |
| bus / ferry / cable car | Same Metlink brand, out of v1 |
| Capital Connection | Not Metlink suburban D1 |

## What I did not do

No generator, no stopIds in published-network.json, no live flip, no silent adapter “fix” for allowlist (flagged in qa-note).
