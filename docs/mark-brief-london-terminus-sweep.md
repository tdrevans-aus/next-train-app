# Mark brief — London terminus sweep: placeholder-timing / unreachable-direction audit

**Lane: QA (flag only).** Investigate and report. Do not fix anything, do not open a fix PR.
Findings become a follow-up Jim brief that the top-level session writes.

tim-review: no (this brief authorises the investigation; any resulting code change gets its own brief)

**Sequencing: do not start until the PR for
`docs/jim-brief-london-overground-empty-direction.md` has merged.** Before that fix lands the whole
region reports broken and the sweep tells you nothing.

## Why this exists

A rider selected Barking Riverside → "Suffragette Gospel Oak" and got "No upcoming trains", at a
time when the line was running every 15 minutes. Root cause: TfL's `/StopPoint/{id}/Arrivals` has
no usable timing for services **originating** at a terminus — it reports them with an identical
placeholder `timeToStation` (2 seconds at Barking Riverside, 22–23 at Gospel Oak). Those rows then
fail the `liveDeparture > now` filter and vanish, leaving a direction that is offered in the
picker but can never be populated.

The fix switches National-Rail-backed (910G) stops to `/StopPoint/{id}/ArrivalDepartures`.
**The open question this sweep answers: how many other London termini have the same defect?**
The Overground lines (Suffragette, Mildmay, Windrush, Weaver, Lioness) are all 910G NR-backed and
are the prime suspects; whether DLR, tram and Elizabeth-line termini are affected is unknown.

## Critical: the existing sweep would not have caught this

`qa/uk-london-tfl-network-sweep.mjs` probes 6 targeted stops and only warns when
`tripCount === 0`. Broken Barking Riverside returned **8 trips** — all of them in the terminating
direction — so it would have reported `PASS`. A non-zero trip count is not evidence that a
station's board is correct. Your sweep must check reachability per direction, not per station.

## Target list — 43 candidate termini

Derive it rather than hand-copying, so it stays correct: from
`public/city-directions/uk-london-tfl.json`, a station `S` is a terminus candidate when some
published direction string is `"<Line> S"` and `S` is itself a key in the file. That currently
yields 43 stations out of 434, including Barking Riverside, Gospel Oak, Brixton, Cockfosters,
Epping, Edgware, High Barnet, Chesham, Amersham, Ealing Broadway, Clapham Junction, Euston,
Cheshunt, Chingford, Enfield Town, Crystal Palace, Highbury & Islington, Beckton, Lewisham, Bank,
Elmers End, Beckenham Junction, Heathrow T4/T5 and others.

Record each station's naptan prefix (910G vs 940G) and modes alongside the result — the
910G/940G split is the hypothesis under test.

## Three signatures to detect, per terminus

1. **Unreachable direction.** For every direction listed for that station in the direction JSON,
   does at least one trip on the live board match it via `pickUpcomingTrips`? A direction with
   zero matches at a time the line is running is a finding.
2. **Placeholder timing.** In the raw feed for that stop, three or more rows sharing a
   destination whose `timeToStation` values all fall within a few seconds of each other. This is
   the signature that identifies the defect directly, independent of whether the board looks empty.
3. **Row loss.** Raw rows fetched vs trips reaching the board, broken down by destination. A large
   asymmetric drop in one direction is the same bug wearing a different hat.

Run it at a time of day when the lines are actually running, and say in the note when you ran it.
A quiet late-night board is not a finding — distinguish the two explicitly rather than reporting
every empty board as broken.

## Output

Write `docs/london-terminus-sweep-findings.md`:

- A table: station, naptan prefix, modes/lines, directions offered, directions reachable, which of
  the three signatures fired.
- A clear list of confirmed defective stations, separated from "quiet at time of sweep" and
  from "clean".
- Whether the defect tracks the 910G/940G split cleanly, or whether some 940G (tube/DLR/tram)
  termini are affected too — this determines whether the follow-up fix is a one-line endpoint
  rule or something broader.
- An explicit recommendation on whether a permanent QA gate is warranted, and if so which of the
  three signatures it should assert. Note that a committed gate must run from a fixture with no
  network and no `TFL_APP_KEY`; a live sweep stays a manual `npm run sweep:*` script.

## Constraints

- A throwaway probe script is fine for the sweep itself; if you commit anything, keep it to the
  sweep script and the findings note. **Do not change adapters, core, or direction data** — that
  is Jim's, under a separate brief.
- `TFL_APP_KEY` is in `.env.local`; use `loadEnvLocal()` as the existing sweep does.
- Run `node qa/run-all.mjs --smoke` if you commit a script. Do not run the full suite.
- Leave no background sleep, poll, or watch loops running when you finish.
