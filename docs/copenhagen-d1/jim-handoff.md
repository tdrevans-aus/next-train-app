Copenhagen D1 + research pack (Luke), 30 Aug 2026. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("copenhagen")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

**Do not build the Copenhagen adapter from this pack in an unattended/overnight session.** Per
explicit instruction from the task that produced this pack, Copenhagen's D2 adapter work is
scoped for a **supervised session** given how much the board-eligibility scope grew tonight
(Metro-only v1 became Metro + S-tog + DSB Regional/InterCity + Öresundståg at four shared
stations). This file is a research handoff, not a green light to proceed unattended.

Pack files: `docs/copenhagen-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=copenhagen**, three-operator v1: Metroselskabet (Metro M1-M4, 44 stations, all in-catalog)
  + S-tog (DSB, 7 lines A/B/Bx/C/E/H/F) + DSB Regional/InterCity/InterCityLyn + Öresundståg
  (Skånetrafiken co-branded). Not `city=denmark`. Per `docs/denmark-ledger.md`, Rejseplanen is a
  genuine national platform - build Copenhagen as a **config over a shared Rejseplanen provider**,
  not a per-city clone (same architecture as UK/Darwin, opposite of Sweden's/Finland's per-city
  adapters). Confirm this decision still holds if you're the one wiring D2.
- **Hub lock: Kongens Nytorv** (Metro-only, all four lines, confirmed zero rail/S-tog transfer via
  its own row in the station-list table). Do not fold Nørreport/København H/Nørrebro/Nordhavn into
  it - those are separate multi-operator nodes.
- **Station graph for Metro M1-M4 (44 stations) is hand-transcribed from Wikipedia's station list +
  4 station infoboxes, cross-validated two independent ways**: (1) the "Time to Nørreport" minute
  column on the master list reproduces every trunk/branch ordering used in `published-network.json`;
  (2) each shared station's own `Adjacent stations` table (a separate, independently-sourced
  Wikipedia infobox field) confirms the immediate neighbours at every branch point. M3 is a **true
  ring** with no linear terminus (direction = clockwise/counter-clockwise, sourced from Nørrebro's
  infobox literally using those words) - do not reuse the Oslo line-5 loop-then-spur recipe here,
  it's a different topology.
- **Two corrections against the oracle report's C2/C3 section, both evidence-backed (hazard-pack.md
  H2)**: Nordhavn is **five** S-tog lines (A, B, Bx, C, E), not six - line H stopped serving Nordhavn
  in 2017, confirmed independently by Nordhavn's own infobox/adjacent-stations data AND the H line's
  own Wikipedia article. Nørreport is **six** S-tog lines (A, B, Bx, C, E, H), not just "C line" as
  the oracle report's phrasing implied. **Use the tables in direction-model-memo.md, not the oracle
  report's C2/C3 prose, for the S-tog filter allow-list per station.**
- **doNotGroup, four shared stations, each independently sourced**: Nørreport (Metro M1/M2 vs S-tog
  all 6 vs DSB/Öresundståg, 3-way, widest single-node surface), Nørrebro (Metro M3 vs S-tog F only,
  2-way, simplest), København H (Metro M3/M4 vs S-tog all 6 vs DSB/Öresundståg vs EuroCity-excluded,
  4-way, widest overall), Nordhavn (Metro M4 vs S-tog 5-of-6 lines sharing one island platform, 2-way
  but the highest single-platform line count). Full detail and worked chip examples in
  direction-model-memo.md, especially the Nordhavn section (task brief flagged this as the hardest
  case - do not collapse the five lines to a shared neighbour-station token, keep line letter as the
  primary key on every departure row).
- **License: CC BY 4.0** for Rejseplanen GTFS static (attribution required, redistribution/commercial
  use permitted). API 2.0/SIRI-ET terms need confirmation at registration (per oracle report).
- **Europe/Copenhagen HAS DST.**

## What is still NOT solid - resolve before/at D2, don't wire around

1. **Two unverdicted cross-border services at København H**: SJ (Stockholm, Southern Main Line) and
   České dráhy (Prague, RJ) both call at København H per the primary source data pulled for this
   pack, but neither has a board-eligibility verdict in the oracle report's table. Per
   `docs/board-eligibility-rule.md`, silence is a QA failure - **get a verdict from Nico/Tim, added
   to the oracle report or the Denmark ledger, before deciding either way.** Not in
   `published-network.json`.
2. **Öresundståg at Nørreport, not just København H.** København H's own Adjacent-stations data
   names Nørreport as an Öresundståg call point (all four corridors), but the oracle report's Board
   eligibility table only verdicted København H. I've included Nørreport in `published-network.json`
   on the reasoning that it's the same service/same boarding contract just an earlier stop, but this
   is flagged for Tim to confirm, not a settled call - see direction-model-memo.md open question 4.
3. **M3 direction token wording** (`Clockwise`/`Counter-clockwise` in English vs Danish "med
   uret"/"mod uret") - no printed passenger-facing convention found in sources. Open question 1 in
   direction-model-memo.md.
4. **S-tog A's short-turn handling** (fixed Hillerød↔Køge chip pair vs per-trip far-end from the live
   feed) - same open-question shape as Malmö's ring line. Recommend fixed pair for D1/D5, per-trip
   overlay at D2+.
5. **Regionaltog/InterCity destination lists are indicative, not exhaustive** - sourced from one
   station's Adjacent-stations snapshot (Valby, København S, Høje Taastrup, Ringsted, Odense,
   Copenhagen Airport), not a full DSB timetable. Verify against the live feed at D2.
6. **Rejseplanen API 2.0 real-time coverage for all three operators** - oracle report says confirmed
   working (2026-08-30 note) but flags it as something to re-verify while building, not settled.
   Same for SIRI-ET/GTFS-RT via Dataudveksleren.
7. **DSB EuroCity exclusion is seasonal** (compulsory reservation 26 Jun-16 Aug only) - the current
   `published-network.json` excludes it entirely rather than modeling a seasonal in/out toggle. If
   Tim wants seasonal display, that's a D2+ product decision, not assumed here.

## Direction model (full detail: direction-model-memo.md)

- **Metro linear lines (M1, M2, M4)**: line + terminus, e.g. `M1 + Vestamager`.
- **Metro M3 (ring)**: clockwise / counter-clockwise, never a fake terminus pair.
- **S-tog (A, B, Bx, C, E, H, F)**: line letter + official terminus, scoped to the shared stations
  only (not the full network) - e.g. `C + Klampenborg`. Nordhavn's five-line shared platform keeps
  the line letter as the primary token on every row.
- **DSB Regional/InterCity/InterCityLyn/Öresundståg**: no line code exists - service type +
  destination, e.g. `Regionaltog + Ringsted`, `Öresundståg + Lund`.
- Kongens Nytorv is the only hub-lock string; never a direction token anywhere in this pack.

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no live fetch of the official m.dk PDF map or the Rejseplanen GTFS feed (used
Wikipedia as the checkable D1 source instead, per hazard-pack.md), no resolution of the SJ/České
dráhy board-eligibility gap (flagged, not decided), no Aarhus scoping (unscoped, Later, per
`docs/denmark-ledger.md`), no edits to any other city's pack or to the Denmark ledger itself (that's
Nico's/the country-lane's job if the SJ/České dráhy gap or the Öresundståg-at-Nørreport question
gets resolved).

## Lane status

`node qa/lane-lock.mjs release Denmark` was run after this pack was written - the pack is complete
by the shape of every other `docs/<city>-d1/` folder (4 files) and every claim in it is sourced.
The **adapter build is intentionally NOT started** - that's the one open item, and it's open by
design (supervised session), not because this pack is incomplete.
