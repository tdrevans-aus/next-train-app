# Mark brief — re-review of PR #355 after fix-ups (FB-64 production sweep)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/355, branch
  `prod-sweep-scheduled-check`, now at commit `6ee885f`. Check it out with `gh pr checkout 355`.
- `docs/mark-note-prod-sweep.md` — **your own previous note**, the FAIL this fix-up answers.
- `docs/jim-brief-prod-sweep-fixups.md` — the fix-up brief, with its eight acceptance criteria.
- `docs/jim-brief-prod-sweep.md` — the original brief and its seven criteria.

This is a re-review, not a fresh one. You already passed all seven original acceptance criteria and
verified the service-hours and DST logic empirically across the 4 Oct 2026 Australian boundary. **Do
not redo that work.** Confirm it has not regressed and focus on the two items you failed.

## Item 1 — Brisbane false positive

Two changes were made: `checkStation` now checks up to three chips per station and reports `empty`
only if none return a trip; and `sampleStations` prefers a hub station read from
`lib/cities/<city>/direction-hubs.json` via the existing shared helper, falling back to
alphabetical-first where no hub file exists.

Verify Brisbane now reports `ok` by running the sweep yourself, and confirm the state file is reset
so no stale threshold counts ride into production.

Then judge this, which the fix-up brief did not anticipate: **the hub preference only bites for UK
regions**, because they are the only cities with a `direction-hubs.json`. Every non-UK live city —
Brisbane included — still samples alphabetically, so the three-chip check is doing all the real
work. Is that good enough, or is the Brisbane class of false positive still latent at some other
non-UK city with a quiet first station? Give me your view rather than treating criterion 3 as
satisfied because the code technically prefers a hub where one exists.

## Item 2 — state mechanism

The workflow now uses `actions/cache/restore` + `actions/cache/save` with a run-unique key and
prefix `restore-keys`, and declares `permissions: contents: read` — no repo write capability. The
commit-back to master is gone.

Verify there is genuinely no path by which this workflow writes to the repo, that the cache
save/restore keys actually work across runs (a subtly wrong key means counters silently never
persist, which fails the same way the old mechanism could — invisibly), and that the documented
eviction behaviour in the workflow header and `docs/go-live-ops.md` matches what the code does.

## Also verify

- Newcastle correctly still reports `error` — it is a real outage being fixed under PR #356 and
  must not have been worked around here.
- The seven original criteria have not regressed: no push/pull_request triggers, not a required
  check, excluded from `qa/run-all.mjs` at every tier, no secret read or echoed, live-city list
  still derived from `registry.js`, service-hours and DST logic untouched.
- `node qa/prod-sweep.mjs` run once by you, with the output compared against what the PR claims.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite.
- One housekeeping point Jim raised: he could not check out the branch directly because another
  worktree held it, so he pushed from a differently-named local branch to
  `prod-sweep-scheduled-check` on origin (`da45848..6ee885f`, fast-forward). Confirm the branch
  state is coherent and nothing was lost in that manoeuvre.

## Deliverable

Post a single pass/fail note as a PR comment on #355 via `gh pr comment 355`, with a clear verdict
line and your view on the hub-fallback question. Update `docs/mark-note-prod-sweep.md` in your
worktree with the re-review outcome. If it passes, say so unambiguously — this PR is the monitoring
that has to be in place before Tim is away 27 Sep – 9 Oct, and it is otherwise ready to merge. Do
not merge it yourself.
