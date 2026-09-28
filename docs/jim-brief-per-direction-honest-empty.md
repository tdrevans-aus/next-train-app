# Jim brief — honest empty state per direction (a direction with schedule but no live trips says so)

**Lane:** bug-fix / product mode (shared UI). **Date:** 28 Sep 2026. **tim-review:** no — extends the copy Tim approved on 27 Sep from "all directions empty" to "this direction empty", same wording, no new concept. **City lock:** none (public/ + qa/ only; Dublin/Prague data untouched).

## Why
PR #481 shipped the honest empty state only when EVERY direction at a station is empty. Dublin's NTA feed also drops a single direction for minutes (Belgard "Red + Saggart", hazard-pack H9, PR #499) while other directions show trams. Today the rider sees the plain "No upcoming trams" for that direction, indistinguishable from "no service". The API already carries per-direction `emptyReason: "no-live-predictions"` (Dublin's dogfood sets it only when the schedule expects trips) and `not-currently-served` (Prague) — only the UI ignores it unless all directions are empty.

## Fix
- public/nearby-mode.js (and any other board renderer that shows a direction's empty state): when the focused/selected direction's data has `emptyReason`, render the honest title/body for that direction (same strings as #481/#497; mode-aware noun), regardless of other directions. Keep the all-directions case unchanged. Directions with no `emptyReason` keep the plain copy.
- qa/honest-empty-state.mjs: add a fixture where one direction has `emptyReason` and another has trains — focusing the gapped direction shows the honest copy; focusing the other shows trains; a direction with no reason shows plain copy. Keep the existing exclusions.
- Rebuild public/train-times-bundle.js if the change touches its sources; `node qa/bundle-freshness.mjs` green.

## Acceptance
- `node qa/honest-empty-state.mjs`, `node qa/dublin-dogfood-gate.mjs`, `node qa/prague-dogfood-gate.mjs`, `node qa/run-all.mjs --smoke` PLAIN green. PR title: "Honest empty state per direction (live-gap and not-served reasons)". Link this brief, #481, #497, #499.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline.
