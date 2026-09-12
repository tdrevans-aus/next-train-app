# Jim brief — rebase PR #356 onto #361, and stop refreshing retired cities (OOM)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `lib/gtfs-refresh.js`,
`qa/`, `scripts/`, and the files PR #356 already touches.

tim-review: no — #356 is Mark-approved and Tim approved the refresh-pipeline fix on 11 Sep 2026.

Lane locks: **"Australia"** and **"Sweden"** both reported **free** at dispatch (top-level check,
11 Sep 2026). #356 touches both. Acquire before touching shared files.

## Where things stand

- **PR #361 merged** (`9b09833`): the daily GTFS refresh no longer crashes on
  `ERR_MODULE_NOT_FOUND` — `@vercel/blob`'s `put` is imported in `api/health.js` and passed down as
  `putImpl`.
- **I triggered the production cron at 11:58:23 UTC on 11 Sep.** Newcastle published real data for
  the first time: 40,027 bytes, `feed_publisher_name: Newcastle Light Rail`, 954 trips, calendar
  2026-09-07 → 2026-12-17, manifest written. Riders now get a real board.
- **But the run did not complete.** Runtime logs for that invocation:

```
11:58:23  GET /api/health  500
  gtfs-refresh: vancouver: no manifest on record
  Vercel Runtime Error: instance was killed because it ran out of available memory
  gtfs-refresh: newcastle: no manifest on record
```

Canberra, Gold Coast and Brisbane still have **no manifest**, and `gtfs/_refresh-status.json` was
**never written** — the instance died before reaching the end.

The line immediately before the kill is **Vancouver**. Vancouver is `status: "retired"` in
`lib/providers/registry.js` (release-1 scope cut, `efefad1`) but is still in `STANDALONE` in
`lib/gtfs-refresh.js` on master, pulling TransLink's full GTFS
(`https://gtfs-static.translink.ca/gtfs/google_transit.zip`) every run for a city nobody can select.
It is the prime suspect for the OOM. **Suspect, not proven** — see verification below.

Note also: `get_runtime_errors` returned **no errors** for this window. The OOM kill is logged at
`info` level with a 500, so it does not appear in the error clusters. Worth knowing for anyone
debugging this later.

## Task 1 — rebase #356 onto current master

PR #356 (`newcastle-stale-snapshot`) is Mark-approved but now conflicts with #361. Rebase it onto
master and resolve:

- **`lib/gtfs-refresh.js`** — keep #361's `putImpl` threading intact everywhere; apply #356's
  Vancouver removal and its Malmö/Uppsala exclusion documentation. #361's changes are the ones that
  make the job run at all — losing any of them re-breaks production silently.
- **`qa/run-all.mjs`** — keep **both** sets of additions: #361's `lib-bare-import-gate.mjs`
  registration, and #356's integrity gate plus its `KNOWN_TRACKED_EXIT_CODES` / `classifyResult`
  mechanism.
- **`scripts/gtfs-refresh-large-feeds.mjs`** — #356 deletes it; #361 modified it. **Deletion wins:**
  the workflow it served (`.github/workflows/gtfs-refresh.yml`) is also deleted by #356 and only ever
  refreshed retired Amsterdam and Rotterdam.

Push to the existing branch so #356 updates in place.

## Task 2 — a retired city must never be refreshed again

Removing Vancouver fixes this instance. The class is "the refresh list is hand-maintained and drifts
from the registry" — the same shape as the integrity gate's hand-maintained city list that Mark
caught on this very PR. Make the refresh loop **skip any city whose registry status is not
`"live"`**, logging that it skipped and why, so retiring a city in the registry removes it from the
refresh with no second edit. This applies to `STANDALONE` and every `SHARED_GROUPS` entry.

Keep the static lists as the declaration of *how* to refresh a city; the registry decides *whether*.

## Task 3 — Newcastle is now real, so #356's gate should pass

#356's `gtfs-live-blob-snapshot-integrity.mjs` was deliberately red (exit 2, "known, tracked") because
Newcastle served synthetic data. That data is now real. Confirm the gate now exits **0**, and that
the exit-2 path no longer fires — the "self-clears when real data lands" behaviour was designed for
exactly this moment, so verify it actually does.

## Verification — honest limits

You cannot prove the OOM fix locally or on a preview without running the refresh, and running the
refresh writes to the production blob store. **Do not trigger the production cron and do not source
`CRON_SECRET`.** After merge, I will re-run it and check that Canberra, Gold Coast and Brisbane get
manifests and that `gtfs/_refresh-status.json` is written. If it still dies, the next suspect is the
shared SEQ feed (~32 MB, Brisbane + Gold Coast), and that will be a separate brief.

What you *can* verify: that the refresh loop, given the current registry, would no longer attempt
Vancouver (or any other retired city) — prove by construction with a unit-level check that does not
download anything.

## Acceptance criteria

1. #356 is rebased cleanly onto master; every `putImpl` change from #361 survives. Name each conflict
   and how you resolved it.
2. Vancouver is no longer refreshed; the refresh loop skips every non-live city, proven by
   construction without a network download.
3. `qa/gtfs-live-blob-snapshot-integrity.mjs` exits 0 now that Newcastle is real.
4. Both new gates (`lib-bare-import-gate`, blob integrity) are registered and pass.
5. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## Handoff

Push to the existing branch `newcastle-stale-snapshot`, updating PR #356 in place. Copy this brief
into the branch. Leave a PR comment listing each conflict and its resolution, so Mark's re-review
starts from it. Do not merge.
