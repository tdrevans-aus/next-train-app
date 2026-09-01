# Glasgow direction model memo (§3 for Tim)

Two independent direction problems in this city — do not solve them with the same model.

## Part 1 — Glasgow Subway: a true circular line with no termini (first for this pipeline)

Every metro/light-rail line packed so far (Newcastle NLR, Rotterdam Metro A–E, and every AU/NZ/CA
line before that) has **named termini** — a train is always labeled "towards X" for some real
end-of-line X. Glasgow Subway has none. It is a single closed loop; a train never terminates, it
just keeps circling. The report describes it as two simultaneous directional workings: **Outer
Circle** (clockwise, orange on the operator's map) and **Inner Circle** (anticlockwise, blue).

This breaks the "line + terminus" model used everywhere else (see the Newcastle memo for that
model's canonical write-up) — there is no terminus string to put in the label. It also breaks a
naive "next station" label, because on a loop "next station" is directionally correct but not
identifying — a rider at Hillhead sees two platforms and needs to know which one gets them where
they're going, and "next stop: Kelvinbridge" doesn't tell them that unless they already have the
full station order memorized.

### Recommendation: printed direction label (Inner Circle / Outer Circle), not line+terminus

Use the operator's own printed/signed direction names directly as the label — **"Outer Circle"**
and **"Inner Circle"** — the same way SPT signs platforms in stations today. This is closer to
option C in the Newcastle memo (inbound/outbound-style label) than option A (line+terminus), but
here it's not a fallback, it's the *correct* model because no terminus exists to fall back to.

Do **not** invent a terminus by picking an arbitrary "last station before returning to start" —
that would misrepresent a loop as a point-to-point line and would need updating every time the
loop's nominal start station is redefined.

### Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Printed direction (recommend)** | Subway + Outer Circle; Subway + Inner Circle | Matches operator signage exactly; no invented terminus; stable regardless of where the rider boards | Riders unfamiliar with "Outer/Inner" need to learn the mapping to a real destination the first time (same learning curve as any circle-line signage anywhere) |
| B. Line + next major station | Subway towards Buchanan Street / towards Govan | Feels like line+terminus | No real terminus exists — the "towards" station is arbitrary and would need picking a rotating reference point, which is exactly the invented-topology guess this lane is told not to make |
| C. Clockwise/anticlockwise | Subway, clockwise | Geographically explicit | Not what riders see on platform signage (SPT uses Inner/Outer, not clockwise/anticlockwise, per the report's own wording) — a label mismatch with real-world signage is a worse rider experience than matching it |

### Open item for Tim

Confirm the exact platform-signage strings SPT uses today (this pack's only source, the oracle
report, gives "Outer Circle clockwise" / "Inner Circle counterclockwise" as descriptive text, not
as a confirmed verbatim platform sign). Recommend Nico or a follow-up pass verify the literal
signage wording before D5 assertion tables are written.

### Stop-order caveat (repeated from published-network.json)

The `stations` array on the Subway line entry is carried in the oracle report's table order, which
plausibly reflects the loop's real sequence, but the report never states this explicitly and no
official SPT map or GTFS stop_sequence was consulted. **Do not treat it as verified** — see
hazard-pack.md H5/H6 and published-network.json's coverageGaps. This matters for direction
modeling specifically: an Inner/Outer Circle label is meaningless to compute correctly (which
platform is "Outer" at a given station) without a confirmed stop order and a confirmed direction
of travel for each label. Confirm before wiring.

## Part 2 — National Rail: destination + operator, no printed line map (same model as every other UK NR region)

Glasgow Central and Glasgow Queen Street have no printed route/line map — Darwin departure boards
are destination lists, not lines. Same model as every prior UK National Rail region (East
Midlands, North East, West of England, South Wales, Rest of Wales, Rest of Scotland, West
Yorkshire, london-se-national-rail): **destination + operator** on a flat departure board.

- **Glasgow Central:** destination + operator (ScotRail vs Avanti West Coast) distinguishes
  services; no separate line/branch tokens needed since there's no printed line map to draw from.
- **Glasgow Queen Street:** destination + operator too, though only one operator (ScotRail) is in
  scope — the "+ operator" token is less load-bearing here than at Central, but keep it consistent
  across both groups rather than special-casing Queen Street.

Central and Queen Street are **not** rendered as a single board and never share a direction model
— they are unrelated destinations from a rider's point of view (see published-network.json
stationGroups and hazard-pack.md H6).

### No §3 examples table

Unlike Newcastle/Rotterdam (fixed line + terminus strings, safe to draft illustrative rows), this
pack holds off on §3 example rows for both halves of Glasgow:

- Subway: pending Tim's decision on Part 1 above and pending stop-order verification.
- National Rail: destination strings would need real Darwin data (blocked, see coverageGaps) —
  same posture as every other UK NR region's D1 pack. Do not fabricate destination strings.

## Open §3 questions for Tim

1. **Confirm SPT's literal platform-signage wording** for Subway directions (Inner Circle / Outer
   Circle vs some other phrasing) before locking the label strings.
2. **Confirm the Subway stop order** against an official SPT source or the TravelWhiz GTFS
   stop_sequence — required before Inner/Outer Circle labels can be computed correctly per
   station.
3. **Whether testers see Glasgow Subway and Glasgow National Rail as one city picker entry or
   two.** This pack assumes one (`glasgow`, per docs/uk-architecture.md's region table, "ScotRail +
   Subway" — same city, two modes), consistent with how Rotterdam and other single-city packs
   handle one city id with one dominant mode plus doNotGroup exclusions. Flag if that assumption
   is wrong.
