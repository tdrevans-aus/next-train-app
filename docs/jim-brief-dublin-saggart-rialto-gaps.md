# Jim brief — Dublin: Saggart + Rialto permanent real-time gaps; headway-aware sweep threshold (flip prerequisite)

**Lane:** bug-fix / product mode. **City:** dublin, country ireland (acquire the lane lock). **Date:** 27 Sep 2026. **tim-review:** no — rule-based (docs/board-eligibility-rule.md: filter stations, never a silent blank; Tim approved the honest-empty-state/flip path 27 Sep).

## Findings to act on (Mark's QA of PR #481, comment on that PR; qa/dublin-all-stations-live-sweep.mjs run)
- **Saggart** (Red Line branch terminus): 20/20 polls over 15 min, 45 s apart — zero stopTimeUpdates for either static stop_id anywhere in the feed, board empty, while Fortunestown and Citywest Campus (same branch, same headway) carried 2–6 rows every poll. PERMANENT, Connolly shape.
- **Rialto** (Red trunk): empty on every poll of the automated 3-poll sweep, same shape. Not deep-dived — CONFIRM with your own fixed 10-poll, 60 s foreground loop (with neighbours Fatima and Suir Road as controls) before filtering. If Rialto turns out intermittent, leave it in (the honest empty state covers it) and say so.
- Before filtering either, do one last alias check: list every stop_id present in RT stopTimeUpdates for Red Line trips that is NOT in the trimmed static snapshot's stops.txt. If such ids exist and their sequence position/neighbours match Saggart or Rialto, it is a mapping problem (fix the trim/alias instead of filtering) — record the result either way in docs/dublin-d1/jim-handoff.md (appended, dated).

## Fix
1. For each confirmed-permanent stop: remove from lib/cities/dublin/stations.json; add a `notCovered` entry in lib/cities/dublin/coverage.json with rider copy ("<Stop> Luas stop — no real-time data from the NTA feed; use <nearest covered stop>"); append dated Corrections to docs/dublin-d1/hazard-pack.md and the oracle report's Board eligibility section (`out-feed`, evidence); update qa/dublin-dogfood-gate.mjs counts and absent-assertions.
2. **Saggart is a Red terminus:** the "Red + Saggart" direction chip must keep working at every upstream stop (it names where the tram goes, not a board you can open). Assert this in the dogfood gate.
3. **Sweep threshold (Mark's recommendation):** make qa/dublin-all-stations-live-sweep.mjs headway-aware — derive each station's scheduled headway from the static snapshot's stop_times for the current hour (fallback 20 min) and fail a station only when its empty run spans ≥ 1.5× headway, with polls spaced accordingly; an empty station with `emptyReason: "no-live-predictions"` within that window passes. Keep runtime bounded (≤ 20 min, explicit progress lines, exits). Document the rule at the top of the script.
4. Regenerate public/city-directions/dublin.json is NOT needed while planned (Mark's flip does it).

## Acceptance
- Alias check recorded. `node qa/dublin-dogfood-gate.mjs` green; `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs` passes during Dublin daytime with the new threshold and reports per-station headway used; `node qa/run-all.mjs --smoke` (PLAIN) green (known local flake: no-live-feed-stops-gate — re-run alone if only failure).
- Status stays "planned". PR title: "Dublin: Saggart + Rialto real-time gaps filtered; headway-aware live sweep (flip prerequisite)". Link this brief and Mark's #481 comment.
