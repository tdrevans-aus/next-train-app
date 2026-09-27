# Jim brief — Dublin: phantom self-terminus direction ("Red + Tallaght" offered AT Tallaght); terminus guard fed the mapped label (flip blocker)

**Lane:** bug-fix / product mode. **City:** dublin, country ireland (acquire the lane lock). **Date:** 27 Sep 2026. **tim-review:** no.

## Symptom (Mark, QA-5, note on branch `mark/dublin-flip-5` → docs/dublin-d1/mark-qa-note.md, pushed to origin)
- `/api/directions?city=dublin&station=Tallaght` in the flip-commit state offers "Red + Tallaght" alongside the correct "Red + The Point"; `board.scheduledCandidates` at Tallaght is ~half phantom self-terminus entries.
- Root cause (confirmed by Mark, verify): lib/providers/dublin.js `.map()` at ~lines 193–201 overwrites `trip.destination` with the marketing label ("Red + Tallaght") BEFORE the filter at ~line 214 calls `isTerminatingAtStation(stationName, trip.destination)`. `canonicalStationName("Red + Tallaght")` never resolves, so the guard never fires for the exact case it exists for. Adelaide's identical guard is unaffected because it never overwrites `destination` first.
- qa/dublin-dogfood-gate.mjs missed it: it calls `isTerminatingAtStation("Tallaght","Tallaght")` with raw names and never exercises `fetchStationBoard()` end to end.

## Fix
1. Capture the raw GTFS headsign / terminus name before the label mapping (e.g. keep `rawDestination`/`terminus` on the trip) and pass THAT to `isTerminatingAtStation`; apply the same to the `scheduledCandidates` path (it must also drop self-terminus candidates, since the honest-empty-state and direction discovery read it). Check every other place `trip.destination` is compared to a station name in lib/providers/dublin.js and lib/cities/dublin/dogfood-next-train.js.
2. qa/dublin-dogfood-gate.mjs: add a `fetchStationBoard()`-level test with a synthetic RT+static fixture where a Red trip's headsign is "Tallaght" arriving at Tallaght — assert no "Red + Tallaght" chip/trip at Tallaght, and that the same trip still appears at Belgard as "Red + Tallaght". Same for Green at Brides Glen/Broombridge and Red at The Point.
3. Make the gate status-agnostic: it currently asserts `status === "planned"`; change it to read the registry status and assert the right invariants for either state (so Mark's flip commit does not have to rewrite the gate — note this in the PR).
4. Live check (Dublin daytime; it is ~16:00 Sunday there): `/api/directions` at Tallaght, Saggart-bound trunk stop Belgard, The Point, Brides Glen, Broombridge — no station offers a chip naming itself; per-direction trip counts > 0 for the remaining chips.

## Acceptance
- New gate cases green; `node qa/dublin-dogfood-gate.mjs`, `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs`, `node qa/run-all.mjs --smoke` (PLAIN) green (known time-of-day flakes: no-live-feed-stops-gate, melbourne-dogfood-gate after Melbourne midnight — re-run alone if only failure).
- Status stays "planned". PR title: "Dublin: terminus guard uses the raw headsign (no self-terminus chips); status-agnostic dogfood gate (flip prerequisite)". Link this brief and Mark's note.
