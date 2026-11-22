# Jim brief — production sweep counts schedule-only trips as "ok"

tim-review: no (QA/monitoring only; no rider-facing change)
Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Written 21 Nov 2026 by the controller.

## Problem
`qa/prod-sweep.mjs` `checkChip()` marks a chip **ok** when `/api/next-train` returns any `next` trip
(or `arrivalsOnly`). It never looks at whether that trip is live. So a city whose realtime feed is
down, but whose static schedule still answers, passes the sweep. Examples:
- Sydney on Vercel reads only the hand-published fixture with an empty realtime index
  (`lib/cities/sydney/dogfood-next-train.js` `loadSydneyBoard`), so it is schedule-only in production.
- On 20 Sep 2026 Boston shipped scheduled times on a "live" board (`realtime: false`). See memory
  rule "flip pre-check: realtime and rider API".

`/api/next-train` already carries `realtime` on trips (`lib/train-times-core.js` ~240–390:
`realtime: false` = timetable row, `true`/`undefined` = live).

## Required changes
1. For each live city, the sweep decides whether that city is **expected** to be live. Derive this from
   the registry and provider posture (e.g. Copenhagen is deliberately schedule-only because there's
   no Rejseplanen key). Keep any allow-list of known schedule-only cities explicit, in one place,
   and give each entry a reason string. No hand list of live cities (the sweep already reads
   `status: "live"`).
2. Add outcome **`schedule-only`**: a chip returned trips, but none had `realtime !== false`, for a
   city expected to be live. It counts toward `ALERT_THRESHOLD` like `error`, with its own log label.
   Same 06:00–23:00 local-hours rule as `empty`.
3. Log the live/scheduled split per city in `sweep.log`, so a reader can see it without rerunning.
4. Workflow cadence: `prod-sweep.yml` is `7 */6 * * *`, but GitHub only fired it about twice a day
   from 17–21 Nov (runs near 07:00 and 20:00 UTC). Investigate briefly (minute offset, concurrency
   group cancelling queued runs?), and fix it if there's a cheap cause. Otherwise report it. Don't
   add runs beyond 4 a day: Actions minutes are capped (memory "GitHub Actions minutes exhausted").

## Acceptance criteria
- A network-free QA script feeds `checkChip`/`checkStation` canned responses: live trip → ok,
  `realtime:false`-only trip for a live-expected city → schedule-only, same for an allow-listed
  schedule-only city → ok. Mark will mutation-check it (revert step 2 and the script must go red).
- `node qa/prod-sweep.mjs` against production (`workflow_dispatch`, or locally with the default
  base) completes. Report the per-city live/scheduled split it prints. Sydney is expected to show
  schedule-only until a separate product decision is made. Report that; don't fix it here.
- The sweep stays off push/PR, out of required checks and out of `qa/run-all.mjs`.
- `node qa/run-all.mjs --smoke` passes.

## Process
Worktree, branch `fix/prod-sweep-realtime-check`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-prod-sweep-realtime-check.md` (untracked in the
main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it.
Another Jim is working on the QA nightly at the same time (docs/jim-brief-qa-nightly-red-since-sep.md):
don't touch `qa/run-all.mjs`, `qa/fixtures/`, `scripts/` or `.github/workflows/qa-nightly.yml`. Keep
your diff to `qa/prod-sweep.mjs`, `.github/workflows/prod-sweep.yml` and your new QA script.
Register that script in `qa/run-all.mjs` only if smoke needs it, and say so in the PR so the other PR
can be rebased.
