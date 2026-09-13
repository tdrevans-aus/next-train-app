# Mark brief — QA review of PR #361 (GTFS refresh cron crash)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/361, branch
  `gtfs-refresh-cron-crash`.
- `docs/jim-brief-gtfs-refresh-cron-crash.md` — the brief Jim worked to, with its seven acceptance
  criteria.

## Background

The daily GTFS refresh job (`/api/health`, cron `17 3 * * *`) crashed on every run from 4 to 11 Sep
with `ERR_MODULE_NOT_FOUND: Cannot find package '@vercel/blob' imported from
/var/task/lib/gtfs-refresh.js` — seven runs, seven crashes, never once completing. That is why
Newcastle is still serving a synthetic test fixture, and why Canberra and Gold Coast have not been
refreshed since at least 4 Sep. `/api/health` returned 200 throughout.

Jim confirmed the mechanism on real Vercel preview deployments: **any bare npm import from a file
under `lib/` fails in the deployed bundle**, even where the same package resolves from `api/`. A
control package, `gtfs-realtime-bindings`, failed identically.

The fix: `@vercel/blob`'s `put` is now imported only in `api/health.js`'s cron branch and threaded
through `lib/gtfs-refresh.js` and `lib/providers/gtfs/snapshot-manifest.js` as a required `putImpl`
parameter. New offline gate `qa/lib-bare-import-gate.mjs`. A new `gtfs/_refresh-status.json` blob
records each run's outcome, and `qa/prod-sweep.mjs` now fails its own hourly run when that status is
stale, failed or missing.

**Once this merges, I will trigger the production cron myself and verify the result.** Your review is
the last gate before that happens.

## The four things that need your judgement

**1. A destructive command reverted work mid-task, and the file was reconstructed from scratch.**
Jim reports an errant `git checkout -- lib/gtfs-refresh.js` wiped his uncommitted changes; he caught
it and rebuilt the file. He says nothing was lost. Do not take that on trust. Diff
`lib/gtfs-refresh.js` on this branch against master and account for **every** change: the ones the
fix needs, and nothing else missing or altered. In particular confirm the `STANDALONE` list, the
`SHARED_GROUPS`, Newcastle's `headers: () => tfnswAuthHeaders(readTfnswApiKey())`, and the
change-detection and forced-refresh logic (`isCityStale`) are all intact. A silently dropped line
here would re-break the job in a way no local test catches.

**2. Does every caller pass `putImpl`?** The refactor turns an import into a required parameter. A
single missed call site produces a runtime `TypeError` in production — in the cron path, which local
QA does not exercise. Find every call of `publishCity`, `refreshCityIfChanged`, `runGtfsRefresh` and
`writeManifest` across the repo, including `scripts/`, and confirm each passes it. Say what you
searched.

**3. The refresh-status check will fail the moment this merges.** `qa/prod-sweep.mjs` now fails when
`gtfs/_refresh-status.json` is **missing** — and it will be missing until the first successful cron
run after merge, because the job has never succeeded. So the hourly sweep goes red immediately on
merge, before any real problem exists. I intend to run the cron straight after merge, which should
close that window — but confirm my reading of the logic, and say whether "missing" should be treated
differently from "stale" or "failed" for exactly this reason. A monitor that fires on its own
deployment is the cry-wolf problem again.

**4. The gate — and are there other broken imports in production right now?** Verify
`qa/lib-bare-import-gate.mjs` is offline, catches the defect class by construction, and scans every
file under `lib/` reachable from an `api/` entry point. Then use it for what matters most: if any
**other** bare npm import in `lib/` is reachable from `api/`, that code path is broken in production
today, silently, exactly as the refresh was. The gate passing on this branch implies there are none —
confirm that is because there genuinely are none, not because the gate is missing some.

## Also verify

- Criterion 2 was proven on a real Vercel deployment, as Jim reports — check the PR for the evidence,
  since local QA passes before and after this fix alike.
- No write to the production blob store occurred during development.
- `/api/health` still returns 200 when healthy — it is the UptimeRobot liveness monitor.
- `CRON_SECRET` was never sourced or used.
- Overlap with PR #356: both edit `lib/gtfs-refresh.js` and `qa/run-all.mjs`, and #356 deletes
  `scripts/gtfs-refresh-large-feeds.mjs`, which this PR edits. Confirm this merging first leaves #356
  a clean, obvious rebase.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Jim reports 119/119. Do not run
  the full untiered suite.

## Deliverable

Post a single pass/fail note as a PR comment on #361 via `gh pr comment 361`, with the seven
acceptance criteria checked one by one, your verdict on the four judgement items, and a clear
verdict line. Write the same note to `docs/mark-note-gtfs-refresh-cron-crash.md`. Do not merge.
