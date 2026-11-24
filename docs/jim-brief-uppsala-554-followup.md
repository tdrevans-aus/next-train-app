# Jim brief — PR #554 follow-up: test the publish-time wiring; don't block Göteborg wrongly

tim-review: no. Lane: bug-fix / product mode. Country sweden. The lane lock for sweden/uppsala is held
by branch `fix/uppsala-unknown-station`. Work **on that same branch** and push to the same PR #554.
Don't open a new PR.

Source: Mark's QA comment on #554 (https://github.com/tdrevans-aus/next-train-app/pull/554#issuecomment-7131738949).
The original brief is `docs/jim-brief-uppsala-unknown-station-after-refresh.md` on the branch.

## 1. The publish-time protection is untested (blocking)
Mark removed the `assertSnapshotResolvesCatalog()` call from `scripts/publish-gtfs-snapshot-to-blob.mjs`
`main()`, and `qa/snapshot-catalog-resolution-gate.mjs` stayed green. The gate calls `stripToConfig`
plus the assertion itself. Nothing proves `main()` asserts before `put()`, so "the old blob stays in
place" is untested.

Required: a network-free test that drives the real publish path (`main()` or a function `main()`
delegates to) with a rail-less raw feed fixture and a stubbed `put()`. It must assert that `put()` is
never called and the process or function fails. Mark will re-run his mutation: remove the assertion
call from the publish path, and the test must go red.

## 2. Göteborg may be wrongly blocked
The script also serves `goteborg`, which is only published by hand. Its catalog uses
`vasttrafikStopAreaGids` rather than GTFS names or stopIds. Mark couldn't confirm whether the
name-resolution assertion would refuse a healthy Göteborg publish.

Required: make the assertion city-aware. For cities whose catalog doesn't resolve by GTFS name, assert
only non-empty trips and stops, or resolve by the right key. Add a test case proving a healthy
Göteborg-shaped snapshot is accepted.

## 3. All-or-nothing station check: report, don't change
One renamed station refuses the whole Malmö (84) or Uppsala (19) publish. Keep that strict: it fails
loudly and keeps the old blob. But make the error list every unresolved station by name, so a human
can add an alias quickly. Confirm that's the case.

## Acceptance criteria
- New publish-path test green, and red when the assertion call is removed from the publish path.
- Göteborg-shaped healthy snapshot accepted. Rail-less Uppsala-shaped snapshot refused.
- `node qa/snapshot-catalog-resolution-gate.mjs` and the Malmö/Uppsala gates pass, and
  `node qa/run-all.mjs --smoke` passes.
- Don't download from Trafiklab (Bronze quota). Use fixtures.

## Process
Copy this brief from `C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-uppsala-554-followup.md` (untracked
in the main checkout) onto the branch and commit it. Push to `fix/uppsala-unknown-station` and comment on
#554 with what changed.
