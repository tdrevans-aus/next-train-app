# D1 pack readiness check — Vienna / Prague / Dublin (2026-09-06)

Read-only review of `docs/{vienna,prague,dublin}-d1/published-network.json` and each city's
`jim-handoff.md`. No other file touched, nothing committed.

| City | Stations per line | Hub lock set? | Direction termini set? | Ready for Jim (yes/no) | Blocking gap |
|---|---|---|---|---|---|
| Vienna | U1=24, U2=21, U3=21, U4=20, U6=24 (99 unique, 110 line-ticks) | Yes — Karlsplatz (U1 x U2 x U4); U2 terminates there, U1/U4 through | Yes — all 5 lines have both termini in `termini[]` (e.g. U1: Oberlaa/Leopoldau) | Yes | Not blocking, but flagged: (1) "Schedifkaplatz" (oracle report's claimed U6 x Badner Bahn interchange) not found in any primary source pulled — flagged, not corrected; (2) U2's single-direction chip at Karlsplatz needs Tim's confirmation before D5 assertion tables |
| Prague | A=17, B=24, C=20 (58 unique, 61 line-ticks) | Yes — Muzeum (A x C); Můstek (A x B) and Florenc (B x C) locked as distinct doNotGroup interchanges, not folded into the hub | Yes — all 3 lines have both termini in `termini[]` (e.g. A: Nemocnice Motol/Depo Hostivař) | Yes, with a flagged pre-adapter step | Station roster reproduced from the oracle report's cited Wikipedia source only — **not independently re-verified against PID GTFS `stops.txt`** (this lane had no live-fetch tool). Handoff explicitly says confirm every `stations[]` entry (incl. exact diacritic form) against GTFS before product edit. `shortTurns: []` is also a default, not a confirmed empty, pending GTFS `trip_headsign` check |
| Dublin | Red=32 unique (Saggart branch 29, Tallaght branch 27, common trunk 24), Green=35 unique (67 unique total) | Yes — Abbey Street (Red trunk only); Green's walkable interchange cluster (Marlborough / O'Connell - GPO / O'Connell Upper) explicitly doNotGroup'd against the hub | Yes — Red: Saggart/Tallaght/The Point (3-way, branches at Belgard); Green: Broombridge/Brides Glen | Yes, with an open design question held to D5 | Green's Parnell↔Trinity city-centre segment is a **one-way loop**, not a simple branch: O'Connell - GPO and O'Connell Upper are northbound-only, Marlborough is southbound-only. Data is captured in the `cityCentreLoop` object, but the handoff explicitly holds D5 (direction assertion tables) on this until Tim confirms the framing — a real open question, not just a to-do |

## Notes

- All three packs are structurally complete: 4 files present (`hazard-pack.md`,
  `direction-model-memo.md`, `published-network.json`, `oracle-clash-report.md`) plus
  `jim-handoff.md`, and all three handoffs state the city stays `planned`, no product edit was
  made, and `assertCityLive(<city>)` must still fail.
- All three handoffs say Jim owns D2–D6 and, in substance, that adapter work may proceed — none
  says "do not start." The gaps listed above are pre-existing flags for Jim/Tim to resolve during
  that work (Prague's GTFS cross-check, Dublin's direction-exclusive-stop framing, Vienna's two
  minor naming/direction flags), not blockers to starting.
- No files outside this one were created or modified; nothing was committed.
