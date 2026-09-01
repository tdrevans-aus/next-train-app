# Edinburgh direction model memo (§3 for Tim)

Two independent direction problems in this city — do not solve them with the same model.

## Part 1 — Edinburgh Trams T50: line + terminus, the standard model

Unlike Glasgow Subway (a closed loop with no termini — see `docs/glasgow-d1/direction-model-memo.md`
Part 1), Edinburgh Trams T50 is a conventional point-to-point line with two named termini:
**Newhaven** and **Edinburgh Airport** (report line 3, 20, 23). This is the same "line + terminus"
model used by Newcastle NLR, Rotterdam Metro, and every AU/NZ/CA light-rail line packed so far —
no new model needed here.

### Recommendation: line + terminus label ("T50 towards Edinburgh Airport" / "T50 towards Newhaven")

Use the standard label form: line number/name plus the terminus the tram is heading toward. No
open direction-modeling question for this line — it is the simplest case in the pipeline so far,
structurally.

### Stop-order caveat

The `stations` array on the Trams line entry is carried in the oracle report's line 21 list order
(Newhaven, Ocean Terminal, Port of Leith, ... Edinburgh Airport), which reads as a plausible
end-to-end sequence, but the report presents it as a set of named stops in prose form, not as an
explicit numbered stop_sequence, and no official Edinburgh Trams map or GTFS `stop_times` dump was
consulted by Nico or by this pack. **Do not treat it as verified** — see hazard-pack.md and
`published-network.json`'s `coverageGaps`. Confirm against the DFT BODS GTFS `stop_sequence`
(Onestop ID `f-bus~dft~gov~uk`) or an official Edinburgh Trams route map before this array drives
an adapter's next-station/direction logic.

## Part 2 — National Rail: destination + operator, no printed line map (same model as every other UK NR region)

Edinburgh Waverley, Haymarket, and Slateford have no printed route/line map — Darwin departure
boards are destination lists, not lines. Same model as every prior UK National Rail region (East
Midlands, North East, West of England, South Wales, Rest of Wales, Rest of Scotland, West
Yorkshire, london-se-national-rail, Glasgow): **destination + operator** on a flat departure board.

- **Edinburgh Waverley:** destination + operator (ScotRail vs LNER vs Avanti West Coast vs
  CrossCountry vs TransPennine Express) distinguishes services; no separate line/branch tokens
  needed since there's no printed line map to draw from. Report gives no evidence of separate
  platform/boarding-section logic per operator at Waverley (unlike London Bridge/Liverpool Street
  in london-se-national-rail) — treat as one flat board, same posture as Glasgow Central.
- **Haymarket:** destination + operator, through-running point. No separate boarding-section
  evidence in the report.
- **Slateford:** destination + operator, through-running point on the Glasgow–Edinburgh corridor.
  No separate boarding-section evidence in the report.

Waverley, Haymarket, and Slateford are **not** rendered as separate hub-locked stations in the way
Glasgow Central/Queen Street are two independent hubs — this is a single National Rail hub
(Waverley) with two through-running satellite stations, not a multi-hub city. See hazard-pack.md H6.

### No §3 examples table

Holding off on §3 example rows for both halves of Edinburgh, same posture as Glasgow's pack:

- Trams: termini are confirmed (Newhaven, Edinburgh Airport per report line 3) so illustrative
  rows would be safer here than for Glasgow Subway, but the stop order caveat above means a
  next-station example row could still misstate the sequence — deferring row construction to Jim/
  D2 once the stop_sequence is independently confirmed.
- National Rail: destination strings would need real Darwin data (blocked, see coverageGaps) —
  same posture as every other UK NR region's D1 pack. Do not fabricate destination strings.

## Falkirk High and direction modeling

Falkirk High is excluded from Edinburgh's catalog (see hazard-pack.md's boundary-consistency
section). This has no direction-model consequence for Edinburgh's remaining stations —
Haymarket and Slateford's destination-list model does not depend on whether Falkirk High is a
catalog member, since destination strings for Glasgow-bound trains are still shown (the trains are
`in` on Edinburgh boards per report line 9; only the Falkirk High station itself is out of
catalog). De-duplication of identical services once/if Glasgow's National Rail slice and
Edinburgh's National Rail slice both go live is explicitly a D2 task (report line 9, 19, 87), not
resolved here.

## Open §3 questions for Tim

1. **Confirm the T50 stop order** against an official Edinburgh Trams map or the DFT BODS GTFS
   `stop_sequence` — required before next-station logic can be wired correctly, even though
   termini are already confirmed.
2. **Whether testers see Edinburgh Trams and Edinburgh National Rail as one city picker entry or
   two.** This pack assumes one (`edinburgh`), consistent with how Glasgow (`glasgow`, Subway +
   National Rail) and every other single-city pack handle one city id with multiple modes plus
   doNotGroup exclusions. Flag if that assumption is wrong.
3. **D2 de-dup of Glasgow-direction through-running services at Haymarket/Slateford** once
   Glasgow's National Rail slice is also wired live — not a D1 blocker, but noted so it isn't
   forgotten (report line 9, 19, 87; also flagged in Glasgow's own pack).
