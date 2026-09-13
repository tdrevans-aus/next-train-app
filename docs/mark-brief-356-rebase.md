# Mark brief — re-review of PR #356 after rebase onto #361 (+ retired-city skip)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/356, branch
  `newcastle-stale-snapshot` (force-pushed with the rebase).
- `docs/jim-brief-356-rebase-and-retired-city-oom.md` — the brief for this round.
- `docs/mark-note-newcastle-stale-snapshot.md` — your two previous notes on this PR (FAIL, then PASS).

## Why this needs a fresh look

You passed #356 already. Since then **PR #361 merged** (`9b09833`), fixing the refresh job's
`ERR_MODULE_NOT_FOUND` by threading `@vercel/blob`'s `put` down as `putImpl`. #356 conflicted with it
and has been rebased. And a new change was added.

I triggered the production cron at 11:58:23 UTC on 11 Sep. Newcastle published real data for the
first time — but the run then died:

```
gtfs-refresh: vancouver: no manifest on record
Vercel Runtime Error: instance was killed because it ran out of available memory
```

Canberra, Gold Coast and Brisbane got no manifest and `gtfs/_refresh-status.json` was never written.
Vancouver is `status: "retired"` but was still in the `STANDALONE` refresh list. So this round:

1. Rebased #356 onto master (removes Vancouver).
2. **New:** `runGtfsRefresh()` now skips any city whose `getCity(id).status !== "live"`, for both
   `STANDALONE` and `SHARED_GROUPS`, logging and recording the skip. Plus a new offline gate
   `qa/gtfs-refresh-retired-city-skip-gate.mjs`.

## The three things that need your judgement

**1. Did the rebase keep every one of #361's `putImpl` changes?** This is the file that has to run in
production with no local test covering the cron path. Jim reports the only textual conflicts were in
the file-level doc comment. Do not accept that — diff `lib/gtfs-refresh.js` on this branch against
**current master** (`9b09833` or later) and account for every line: #361's `putImpl` threading must
be intact in every function, and the only intended differences are Vancouver's removal, the
Malmö/Uppsala note, and the new registry skip. Re-check that all call sites of `publishCity`,
`refreshCityIfChanged`, `runGtfsRefresh` and `writeManifest` still pass `putImpl` after the rebase.

**2. Can the registry skip silently stop refreshing a LIVE city?** This is the risk I care about most,
because it is the quiet failure mode: an over-eager skip does not error, it just stops refreshing a
city, and we would find out when its calendar expires weeks later. Check specifically:

- What `getCity(id)` returns for an id **not in the registry**. In `lib/providers/registry.js` it has
  the signature `getCity(cityId = "perth")` — confirm whether an unknown id returns `undefined`,
  throws, or silently falls back to a different city, and what the skip then does in each case. A
  fallback to Perth would make every unknown id look "live" (under-skip); `undefined` would skip it
  (safe but silent).
- Every id in `STANDALONE` and `SHARED_GROUPS` is a real registry id with the expected status —
  enumerate them. Canberra, Gold Coast, Newcastle and Brisbane must all still be refreshed.
- In a `SHARED_GROUPS` entry containing **both** a live and a retired city, the shared download must
  still happen for the live one. Confirm the skip is per-city, not per-group.

**3. Does the retired-city gate genuinely prove anything?** Jim reports it stubs `global.fetch` and
`putImpl` to throw, injects synthetic entries for `vancouver`/`amsterdam`, and asserts neither is
fetched or published. Confirm it also asserts that a **live** city *is* still attempted — a gate that
only proves "retired cities are skipped" passes just as happily when *everything* is skipped.

## Also verify

- `qa/gtfs-live-blob-snapshot-integrity.mjs` exits **0** now that Newcastle is real (40,027 bytes,
  `feed_publisher_name: Newcastle Light Rail`, 954 trips), and the exit-2 "known, tracked" path does
  not fire.
- `qa/run-all.mjs` carries `lib-bare-import-gate.mjs`, `gtfs-live-blob-snapshot-integrity.mjs`, the new
  retired-city gate, and the `KNOWN_TRACKED_EXIT_CODES` mechanism — each exactly once.
- `scripts/gtfs-refresh-large-feeds.mjs` and `.github/workflows/gtfs-refresh.yml` are deleted.
- No production cron trigger and no `CRON_SECRET` use during development.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Jim reports 121 PASS. Do not run
  the full untiered suite.

## What happens after

On your PASS I merge, confirm the production deployment is `Ready`, and re-run the cron. If Canberra,
Gold Coast and Brisbane then get manifests and the status record is written, Vancouver was the OOM
cause. If it still dies, the next suspect is the shared SEQ feed (~32 MB, Brisbane + Gold Coast).

## Deliverable

Post a single pass/fail note as a PR comment on #356 via `gh pr comment 356`, with a clear verdict
line and your answers on the three judgement items. Update `docs/mark-note-newcastle-stale-snapshot.md`.
Do not merge.
