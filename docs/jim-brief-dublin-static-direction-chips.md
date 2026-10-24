# Jim brief — Dublin: derive direction chips from the static Luas timetable (any hour), times stay live-only

**Lane:** bug-fix / product mode. **City:** dublin, country ireland (acquire the lane lock — edits lib/providers/dublin.js). **Date:** 27 Sep 2026. **tim-review:** no. **Run AFTER Dublin's flip PR merges** (do not start while a `flip`-labelled Dublin PR is open).

## Symptom
lib/cities/dublin/dogfood-next-train.js derives Dublin's direction chips from live NTA trips, so outside Luas hours (~00:30–06:30) `/api/directions?city=dublin` returns no chips and a rider setting up a journey at night sees nothing to pick. Vienna/Hong Kong don't have this problem (24 h or REST-based), Melbourne/Copenhagen share it.

## Prior art to port (not to merge)
Closed PR #470 (branch `flip-dublin-live`, `git fetch origin flip-dublin-live`) implemented `directionsFromStatic({ stopIds, staticData, stationName, onUnresolved })` in lib/providers/dublin.js: chips derived from the published Luas GTFS snapshot (trips.txt/stop_times.txt + the terminus rule), never a bare colour label, with the Green city-centre loop direction-exclusive stops respected. Read it, port the idea onto current master's dublin.js/dogfood module, do not cherry-pick the branch (it conflicts and predates #468/#476).

## Rules that must hold
- Departure TIMES remain live-only (no static time ever reaches a rider; `tripHasRealtimeConfirmation()` unchanged).
- Chips at Marlborough (southbound-only), O'Connell GPO / O'Connell Upper (northbound-only) match the loop rule; Abbey Street never a chip.
- At service hours the chip set equals what the live-derived path produced (compare at Abbey Street, Tallaght, Sandyford, Belgard).

## Acceptance
1. `/api/directions?city=dublin&station=Abbey%20Street` returns Red + Tallaght / Red + Saggart / Red + The Point (whatever the terminus rule yields) at 03:00 Europe/Dublin (simulate with a fixture or stubbed clock, and once live outside hours).
2. Per-direction TRIP COUNT at three stations during service is unchanged vs master.
3. qa/dublin-dogfood-gate.mjs extended: chips present with an empty live feed; loop-stop exclusivity; `node qa/run-all.mjs --smoke` green.
4. PR title: "Dublin: direction chips from the static timetable (any hour), times stay live". Link this brief and closed PR #470.
