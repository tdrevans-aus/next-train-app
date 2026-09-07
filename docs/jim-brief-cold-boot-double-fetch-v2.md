# Jim brief v2 — PR #349 sent back: coalescer snapshot taken before the id bump

**Lane:** bug-fix / product mode, continuation of `docs/jim-brief-cold-boot-double-fetch.md`
(on branch `cold-boot-fetch-coalesce`, PR #349). Work on that branch. `tim-review: no`.

## Mark's fail note

https://github.com/tdrevans-aus/next-train-app/pull/349#issuecomment-5573671189

Summary: `fetchJourneyBoardCoalesced()` snapshots `journeyBoardFetchId` into
`journeyBoardFetchInFlightStartId` *before* calling `runJourneyBoardFetchCycle()`, whose first
synchronous line is `const fetchId = ++journeyBoardFetchId;`. So while any cycle is in flight the
live id always differs from the snapshot, and every overlapping trigger schedules a spurious
follow-up fetch even with no route/mode change. `qa/cold-boot-fetch-coalesce.mjs` passes only
because its request listener attaches after the two natural init fetches have completed, so it
counts the spurious rerun cycle rather than proving the two explicit calls coalesced.

## Fix

- Snapshot the id *after* the cycle has bumped it (have `runJourneyBoardFetchCycle` return or
  expose its `fetchId`, or bump inside the coalescer and pass it in), and schedule a follow-up
  only when a *later* `discardStaleJourneyBoard()` / switch moved the id past that value.
- Make the test honest: attach the request listener before page load (or use
  `page.route`/`waitForRequest` counting from a known quiescent point), then fire two
  `fetchNextTrain()` calls and assert exactly one `/api/next-train` request from that point.
  Add a second case: two calls where a route switch bumps the id between them → exactly two
  requests, the second with the new station param.
- Prove the negative: the test must fail on master's code (report the count you saw).

## Acceptance

Same list as v1 plus the two cases above. Push to `cold-boot-fetch-coalesce`, comment the
root cause on PR #349 in two sentences, leave no background loops or servers running.
