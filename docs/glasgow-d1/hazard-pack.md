# Glasgow hazard pack (H1–H7)

Evidence: `docs/glasgow-d1/oracle-clash-report.md` only (this lane's sole input, per the
read-only-the-report rule). No GTFS was fetched or parsed by this pack — the TravelWhiz Subway
feed and National Rail's Transitland reference feed are both cited in the oracle report but not
independently pulled here.

## H1 — parent + child

**Unknown, not verified.** No GTFS dump was consulted, so parent/child stop relationships (e.g.
whether Glasgow Central or Glasgow Queen Street have location_type=1 parents with platform-level
children in the Transitland National Rail feed, or whether TravelWhiz's Subway feed nests
platforms under station parents) cannot be confirmed here. Flagged for Jim/D2 to verify against a
live GTFS pull before wiring — same posture as london-se-national-rail's CRS-verification gap.

doNotGroup (established from the report, not GTFS):
- **Buchanan Street** (Subway, SPT) vs **Glasgow Queen Street** (National Rail, GLQ) — travelator-
  connected but separate station entities, separate operators, separate infrastructure. Not a
  merge point.
- **St Enoch** (Subway) vs **Glasgow Central** (National Rail, GLC) — "within a short walk" per
  report line 21/28, not physically connected. Not a merge point.
- **Glasgow Central** vs **Glasgow Queen Street** — two separate National Rail termini, not
  rail-connected to each other (free bus via Buchanan bus station, ~15-20 min walk, or Subway +
  travelator per report line 87). Do not collapse into one board.
- **Falkirk High** (owned by Edinburgh region) vs anything in this catalog — excluded entirely,
  not a doNotGroup case so much as an out-of-catalog station. Recorded per report line 11/91.

## H2 — clash surface

Already covered in the oracle report itself (Subway schedule-only / no RT source found vs
National Rail account-blocked). Nothing new found by this pack — no GTFS was independently pulled
to compare against the report's claims.

## H3 — thin / event / overlay

- Subway: no event-only overlay services in the report. No stated frequency figures either — the
  report doesn't give a headway, only that it's a circular metro. **Gap:** frequency/hours of
  operation not in the oracle report; flag back to Nico if needed for a §3 walk-up experience, not
  invented here.
- National Rail: no thin/overlay services named beyond the three already verdicted (ScotRail,
  Avanti West Coast, Caledonian Sleeper). No stated seasonal/event-only trains.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Buchanan Street | Subway (SPT) vs National Rail (Queen Street, via travelator) | Report line 3, 19, 77, 89 |
| St Enoch | Subway (SPT) vs National Rail (Central, short walk) | Report line 21, 28 |
| Glasgow Central | Avanti West Coast (cross-border) vs ScotRail (through-running) vs Caledonian Sleeper (excluded) | Report line 45-49, 58 |

No Subway branch — the report describes one circular line with two directional workings (Inner
Circle / Outer Circle), not two branching lines. No evidence of any Subway short-turn or
non-circular working.

## H5 — nested short turns

**No official nested codes or short-turn workings found in the report.** Glasgow Subway is
described as a single continuous circle with two directions (Inner Circle anticlockwise, Outer
Circle clockwise) — the report gives no indication of trains terminating mid-loop or running a
partial circuit. Absence of evidence is not confirmation, though: the report does not explicitly
rule short turns out either, it simply never mentions them. Treat "no short turns" as the D1
working assumption, not a verified fact — flag to Nico for explicit confirmation (does every
Subway train complete the full 15-station circle every trip?) before this assumption survives
into a live adapter's direction logic.

## H6 — inner city (where §3 lives)

Locked hub: **Buchanan Street** (Subway). Busiest station, city-center, travelator to Queen Street
rail (report line 89). This is the Subway's hub-lock, not a merged Subway+NR hub — see H1
doNotGroup above and direction-model-memo.md.

Two SEPARATE National Rail "inner city" points exist alongside it: **Glasgow Central** and
**Glasgow Queen Street**. Unlike Newcastle/Rotterdam (one hub, one mode), Glasgow's §3 has to
cover three physically distinct interchange points that testers will encounter within a few
minutes' walk of each other: Buchanan Street (Subway), Queen Street (NR north), Central (NR
south). This is the same "no single hub" shape as london-se-national-rail, just at a much smaller
scale (2 NR groups, not 7) plus one additional non-NR hub-locked line.

## H7 — DST

**Europe/London observes DST (BST/GMT).** Glasgow is on UK civil time, not a separate Scotland
zone. Same as every other UK region packed so far — do not copy any no-DST assumption from an
Australian/NZ pack.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Buchanan Street (Subway) vs Glasgow Queen Street (NR) | Travelator-connected, separate entities/operators |
| St Enoch (Subway) vs Glasgow Central (NR) | Short walk only, not connected |
| Glasgow Central vs Glasgow Queen Street | Two separate NR termini, not rail-connected to each other |
| Falkirk High vs Glasgow catalog | Owned by Edinburgh region, out of catalog entirely |
| Caledonian Sleeper vs ScotRail/Avanti at Glasgow Central | Board-eligibility `out-reservation` vs `in` |

## What I did not do

No generator, no assertion tables, no live city flip, no GTFS fetch/parse, no invented Subway
stop sequence beyond flagging the report table's order as unverified, no invented Subway frequency
or short-turn facts, no `docs/united-kingdom-ledger.md` creation (flagged as overdue, not this
pack's job to write), no reading of any other city's in-progress pack.
