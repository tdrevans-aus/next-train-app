# Jim brief — production sweep must go red when any city's GTFS refresh fails

Mode: bug-fix / product (CLAUDE.md "Bug-fix lane"). tim-review: no — tooling only.
Lane lock: not required. Written 13 Sep 2026 by the top-level session; Tim chose this over
raising function memory (see `docs/jim-brief-vercel-memory-not-applied.md`, PR #374).

## Symptom

The nightly GTFS refresh (`lib/gtfs-refresh.js`, Vercel cron 03:17 UTC via `/api/health`)
writes `gtfs/_refresh-status.json` with `ok`, `succeeded`, `failed`, `results[]`. The
production sweep (`qa/prod-sweep.mjs`, `checkRefreshStatus()` at roughly lines 105–140) only
turns red when `report.ok` is false or the record is over 30 h old. But the writer sets
`ok: failed.length !== results.length` (`lib/gtfs-refresh.js` ~line 296): **`ok` is only false
when every city fails.** One city failing every night for a month is invisible. Canberra did
exactly this from 12 Sep (`download failed (403)`) and nobody was told; it was found by reading
the record by hand. Tim is away 27 Sep – 9 Oct and wants any refresh failure to surface on its
own, instead of buying memory headroom he has no evidence of needing.

## Fix

1. In `qa/prod-sweep.mjs` `checkRefreshStatus()`: after the `!report.ok` and staleness checks,
   add a check that `report.failed > 0` (or any `results[]` entry with `ok: false`) returns
   `status: "error"` with a detail that names each failed city and its `error` string, e.g.
   `refresh failed for 1/31 cities: canberra — download failed (403) …`. Keep the existing
   "all failed" and "stale" branches unchanged. The existing exit logic (`GTFS REFRESH CRON
   FINDING`, `process.exitCode = 1`) then does the rest — do not add a second exit path.
2. Do not change the writer's `ok` semantics or the record shape; other readers may rely on it,
   and the sweep is the right place for the policy.
3. `report.skipped[]` (sydney, auckland, wellington, amsterdam, rotterdam) is a documented
   allowlist, not a failure — leave it out of the count.
4. Extend the existing gate `qa/gtfs-refresh-status-cache-gate.mjs` (which already drives the
   real exported `checkRefreshStatus()` with a stubbed `fetch`) with three cases: `failed: 0`
   → ok; `failed: 1` with a named city → error whose detail contains the city id and its error
   text; all failed → still the existing "reported failure" branch. Prove by mutation that
   removing the new check fails the gate. If that gate's name makes the addition awkward, add
   `qa/prod-sweep-refresh-failed-gate.mjs` instead and register it in the smoke tier and the
   offline set in `qa/run-all.mjs` (keep master's lists, add one line each).
5. Update the comment block above `checkRefreshStatus()` and the one-liner in
   `.github/workflows/prod-sweep.yml`'s header if it describes what the sweep catches.

## Ordering note

PR #373 (pin the refresh cron to syd1 for Canberra) fixes the one known failing city. If this
lands before #373's first successful cron run, the sweep will go red naming canberra — that is
correct behaviour, not a false positive. Say so in the PR description so the merger expects it.

## Acceptance

1. With a status record of `failed: 1`, `node qa/prod-sweep.mjs` prints a
   `GTFS REFRESH CRON FINDING` line naming the city and exits 1; with `failed: 0` and a fresh
   `ranAt`, it does not. Show both in the PR description (a stubbed record via the gate is
   enough; do not write to the blob store or hit production more than the sweep normally does).
2. Gate passes on the branch and fails when the new check is removed (show the failing output).
3. `node qa/no-hardcoded-qa-port.mjs`, `node qa/lib-bare-import-gate.mjs`,
   `node qa/run-all.mjs --smoke` all pass, each run as a foreground Bash call with an explicit
   600000 ms timeout, never in the background; do not end the turn while a run is going.
4. Diff touches only `qa/prod-sweep.mjs`, the gate file(s), `qa/run-all.mjs` registration
   lines, and comments/workflow header. No `lib/` change.

## Process

Worktree isolation; branch `jim/prod-sweep-refresh-failed-alarm`. Copy this brief into the
worktree and commit it with the change. Commit, push, open a PR linking the brief. Do not
merge. Leave no dev servers, headless Chrome or poll loops running; confirm with
`netstat -ano | findstr LISTENING`.
