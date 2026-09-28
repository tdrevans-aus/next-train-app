# Jim brief — Prague: Pankrác–Budějovická–Kačerov–Roztyly unserved in both live and static (probable temporary Line C closure) — flip prerequisite

**Lane:** bug-fix / product mode. **City:** prague, country czechia (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no (coverage copy follows the approved honest pattern).

## Finding (Mark, origin/mark/prague-flip-2 → docs/prague-d1/mark-qa-note.md)
Budějovická, Kačerov, Pankrác, Roztyly (Line C, consecutive) were empty on 18/18 polls across two sweeps ~30 min apart in weekday peak; `fetchStationBoard()` returns trips 0, scheduledCandidates 0, emptyReason null; a raw Golemio call for Kačerov's own ids returns 200 with `departures: []`. Combined with the short-turns already found (southbound trips ending at Pražského povstání, northbound trips starting at Chodov — PR #493), this is the signature of a **section closure between Pražského povstání and Chodov**.

## Investigate (record in docs/prague-d1/jim-handoff.md, appended, dated)
1. stop_times.txt in the committed fixture and a fresh PID_GTFS.zip: any metro trip referencing the four stations' platform ids in the current feed period? Which service dates? Does a later feed period (calendar_dates / feed_info end) restore them?
2. PID / DPP notices (pid.cz, dpp.cz "výluky"/closures) for Metro C in Sep–Oct 2026: closure reason, dates, replacement bus (XC?). Cite URLs.
3. Why qa/prague-dogfood-gate.mjs's new static-coverage assertion (every catalog station ≥ 1 stop_time) passed — stale fixture, or the assertion counts non-metro rows? Fix the assertion so it would have failed.

## Fix
- If confirmed a temporary closure: keep the four stations in lib/cities/prague/stations.json but mark them `notServed: { since, until?, reason, replacement }` (add this small optional field), have the adapter/dogfood return an explicit `emptyReason: "not-currently-served"` with rider copy "No metro service at this station at the moment — <reason>; replacement bus <route> runs" (mode-aware noun), and list them under coverage.json `notCovered` with the same copy and the expected reopening if PID publishes one. Make sure `/api/directions` at those stations returns [] + the reason rather than a blank, and that the honest-empty-state UI renders it (extend qa/honest-empty-state.mjs fixtures with the new reason; the sweep must accept `not-currently-served` as a pass). Do NOT filter them out of the catalog: they reopen without an app change when the feed restores them — implement the `notServed` detection from the static feed automatically (zero stop_times in the current feed period ⇒ not served) rather than hardcoding dates, so Flora can be handled the same way and un-filtered (put Flora back on the same mechanism).
- If instead the feed simply lacks these ids while service runs (check Golemio with the parent-station id `U…S1` and with `names=`), fix the id mapping like the brief for Flora anticipated.

## Acceptance
- `node qa/prague-dogfood-gate.mjs` (with the corrected static-coverage assertion and not-served cases) green; `node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs` during Prague daytime passes with the four (and Flora) reported `not-currently-served`, everything else served; `node qa/honest-empty-state.mjs`, `node qa/coverage-notes-gate.mjs` (temporarily live), `node qa/run-all.mjs --smoke` PLAIN green.
- Status stays "planned". PR title: "Prague: auto-detect stations not currently served from the static feed (Line C section closure, Flora) with honest rider copy (flip prerequisite)". Link this brief and Mark's note.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; pace Golemio ≤ 15 req/8 s.
