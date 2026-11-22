# Jim brief — QA nightly red every night since 22 Sep 2026

tim-review: no (QA only, unless a failure turns out to be a real product bug, in which case stop and report)
Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Written 21 Nov 2026 by the controller.

## Symptom
`.github/workflows/qa-nightly.yml` (`node qa/run-all.mjs --no-native`, the full suite) last passed
**2026-09-21** (run 35573820632). It has failed every night since. Latest run (20 Nov) summary:
`243 PASS · 6 FAIL · 1 KNOWN-RED`, 1309 s. Failing scripts (names truncated in the log; get the
exact list from the run):
- a `…-all-stations-live-sweep.mjs`: timeout after 180 s
- `qa/tampere-all-stations-live-sweep.mjs`: timeout after 180 s
- two `…-dogfood-gate.mjs` (one ends `…st-dogfood-gate.mjs`): exit 1
- `…al-snapshot-fixture-freshness.mjs`: exit 1
- `qa/nearby-manual-station-no-location.mjs`: exit 1 (station combobox timeout)

```
gh run list -w qa-nightly.yml --limit 1
gh run view <id> --log | grep -E "FAIL|Summary"
```

## Required work
For **each** failing script, classify it, then act:
- **Real production defect.** Expect overlap with Sydney (`docs/jim-brief-sydney-fixture-expired.md`)
  and Melbourne (`docs/jim-brief-melbourne-gtfs-url-404.md`), which other Jims own. Don't fix those
  here. Record "covered by <brief>" and move on. For any *other* real defect, stop and report it
  with evidence. It needs its own brief.
- **Test defect** (stale expectation, brittle selector, a fixed date baked in): fix the test.
- **Budget mismatch** (all-stations live sweeps exceeding the 180 s per-script limit): make the
  script fit the limit, e.g. a nightly sample size or a paced subset with a coverage note. Raising the
  limit is a last resort, and only with a reason in the PR. Don't move these scripts out of nightly.
- **Upstream-dependent** (a third-party feed down): use the existing KNOWN-RED mechanism in
  `qa/run-all.mjs` with a dated reason, not deletion.

Do **not** switch nightly to `--smoke` or `--release`, and don't add per-script retries beyond the
three already listed in CLAUDE.md.

## Update 22 Nov 2026: PR #542 is merged
#542 refreshed all seven `qa/fixtures/gtfs-snapshots/` fixtures. The `brisbane-dogfood-gate`,
`gold-coast-dogfood-gate` and `gtfs-local-snapshot-fixture-freshness` nightly failures should now be
gone. Confirm them on a fresh nightly run before classifying anything else. Also tidy Mark's
non-blocking flags from #542 here:
- Sydney's preserved hand-maintained trip rows reference service_id `TA+0q400+7`, which is no longer
  in the regenerated `calendar.txt` (19 trips). Fix the dangling reference.
- The fixture READMEs' "Source zip" lines point at deleted session scratchpad paths. Record the real
  provenance instead (the blob path or upstream URL, plus the date).

## Update 22 Nov 2026: PR #541 and #543 are merged too
Sydney (#541) and Melbourne (#543) are fixed on master, so any nightly failure from those two should
be gone. Also take Mark's two non-blocking flags from #543:
- `resolveStatewideGtfsUrl()` in `scripts/trim-melbourne-gtfs.mjs` picks the newest ZIP resource on
  the CKAN record. Also require the resource URL or name to match `/gtfs/i`, so a docs or GTFS-RT ZIP
  can't be picked. Add a fixture case for it to `qa/melbourne-gtfs-url-resolution.mjs`.
- That QA script doesn't exercise the melbourne probe in `scripts/refresh-hand-published-gtfs.mjs`
  (`resolveProbeUrl`). Extend it so reverting only the probe goes red.

## Acceptance criteria
- A table in the PR: each failing script → classification → action → evidence.
- Every script classified as a test defect or budget mismatch passes when run on its own.
- A `workflow_dispatch` run of `qa-nightly.yml` on the PR branch is green, apart from scripts marked
  "covered by <brief>". Those stay red until their fixes merge, and the PR says so.
- `node qa/run-all.mjs --smoke` passes.

## Process
Worktree, branch `fix/qa-nightly-red`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-qa-nightly-red-since-sep.md` (untracked in the
main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it.
Another Jim is working on `qa/prod-sweep.mjs` and `.github/workflows/prod-sweep.yml` at the same time
(docs/jim-brief-prod-sweep-realtime-check.md), so don't touch those two files. The Melbourne script
edits listed above are now in scope. `lib/providers/melbourne.js` stays out of scope.
