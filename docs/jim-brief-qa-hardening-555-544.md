# Jim brief — two small QA gaps from #555 and #544

tim-review: no (QA only). Lane: bug-fix / product mode. No `lib/providers/` change is expected, so no lane
lock is needed. If you find you need one, check `node qa/lane-lock.mjs check australia` first.

## 1. #555: the refresh's per-mode wiring is untested
Mark's #555 QA (https://github.com/tdrevans-aus/next-train-app/pull/555#issuecomment-7132751514) found that if
`processUnit` in `scripts/refresh-hand-published-gtfs.mjs` stops passing `staleModes` into `decideRefresh`,
`qa/sydney-mode-freshness.mjs` stays green. That test only checks `sydney.modeFreshness` is truthy. The
post-publish read-back throw isn't covered either.

Required: drive `processUnit` (or the function it delegates to) with stubbed download, publish and read-back
for the sydney unit, network-free. Assert that:
- (a) a snapshot whose metro calendar expired is refreshed even when the probe says unchanged;
- (b) the job fails when the read-back still shows a stale mode after the retries. Make the retry delay
  injectable so the test is quick.

Mutation: remove `staleModes` from the `processUnit` → `decideRefresh` call, and the test must go red.

## 2. #544: the sweep's realtime gate isn't run by CI
`qa/prod-sweep-realtime-gate.mjs` (network-free, from #544) isn't registered in `qa/run-all.mjs`, so CI never
runs it. Mark confirmed that registering it doesn't conflict with the "sweep never in run-all" rule, because
that rule is about the networked `qa/prod-sweep.mjs`. Register it next to `prod-sweep-refresh-failed-gate.mjs`
in the same list(s).

## Acceptance criteria
- Both new or registered checks pass. The item 1 mutation goes red. Mark will mutation-check it.
- `node qa/run-all.mjs --smoke` passes.

## Process
Worktree, branch `fix/qa-hardening-555-544`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-qa-hardening-555-544.md` (untracked in the main checkout)
into your worktree and commit it with the PR. Commit, push, open a PR linking it. Another Jim is working on
the retired-city message (`public/`). Don't touch `public/`.
