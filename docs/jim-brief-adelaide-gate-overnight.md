# Jim brief: adelaide-dogfood-gate fails whenever CI runs during Adelaide's night

**For:** Jim (bug-fix / product mode). This brief authorises `qa/` changes.
**tim-review:** no

## Symptom
PR #464's web-qa (run 36261931771, finished 18:26 UTC = 03:56 ACST) failed:
`Goodwood towards "Adelaide Railway Station (Belair line)" must return a non-null next train — this
is the exact production regression from #439` (qa/adelaide-dogfood-gate.mjs:195). The same job
passed on re-run at 21:41 UTC, once trains were running. Nothing in the diff touched Adelaide. So any
PR or master push checked in CI during Adelaide's no-service hours (roughly 00:00–05:30 local) goes red.

## Do
Keep the regression protection for #439, but stop requiring a live train to exist overnight:
- The fixture-based assertions (`qa/fixtures/adelaide/city-bound-capture.json`) already prove the
  #439 mechanism offline. Keep them unconditional.
- For the live "next train must be non-null" assertions, pass when the live feed genuinely has no
  upcoming trips for that line or station in the relevant window. Distinguish "no service right
  now" (check the live feed's trip count for the line, or Adelaide local time plus the static
  timetable's first departure) from "service exists but matching dropped it", which is the #439 bug.
  The second case must still fail.
- Check the other live gates for the same hard "next train must exist" pattern (boston, melbourne,
  sydney, etc.) and apply the same rule if they have it. List which ones you changed.
- Never skip the gate wholesale, and don't add it to KNOWN_RED.

## Acceptance
Demonstrate both branches locally with a stubbed or captured feed: no-service passes, and
service-present-but-dropped fails. `node qa/run-all.mjs --smoke` passes apart from named
environmental failures. PR links this brief. No background loops.
