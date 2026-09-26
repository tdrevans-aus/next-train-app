# Jim brief: CI check that NTA GTFS-R v2 trip_ids join to the published Luas snapshot

**For:** Jim (bug-fix / product mode). This brief authorises `qa/` and `.github/workflows/` changes.
**tim-review:** no

## Why
Dublin (planned) passed Mark's offline QA (`docs/dublin-d1/mark-qa-note.md` on branch
`mark/dublin-qa-note`). The static snapshot `gtfs/dublin.zip` was published from GTFS_LUAS.zip on
26 Sep: 2 routes (Red, Green), agency 10000 LUAS, 128 stops
(`docs/dublin-d1/ci-snapshot-evidence.md` on branch `claude/busy-heisenberg-47ovag`). Still
unproven: do NTA GTFS-R v2 TripUpdates trip_ids join to that snapshot's trip_ids? If not, the live
board would be empty. Sandboxes can't reach NTA or the blob store, and `NTA_API_KEY` exists only
in Vercel and (from today) as a GitHub Actions secret.

## Do
1. Add `qa/dublin-rt-join-check.mjs`. It fetches the published snapshot
   (`gtfsFixtureBlobUrl("dublin")`) and the NTA TripUpdates feed, using the same URL, auth header
   and protobuf decode path as `lib/providers/dublin.js` and `lib/providers/gtfs/auth.js`; reuse
   them, don't reimplement. Print: total TripUpdates, how many reference a trip_id in the snapshot,
   the resolved share, and 5 sample unmatched trip_ids plus 5 matched ones. Fail if fewer than the
   STALE_RESOLVED_SHARE_THRESHOLD used by `lib/providers/gtfs/board.js` resolve, counted over
   updates whose route is Luas where that can be told, or over all updates otherwise (say which).
   With no NTA_API_KEY, exit 0 with a clear "skipped: no key" line, so it's safe in local smoke runs.
   Don't register it in run-all.mjs.
2. Add a step to `.github/workflows/publish-gtfs-snapshot.yml`, after verify and for dublin only,
   that runs it with `NTA_API_KEY` from secrets. Also let the workflow run just the check without
   re-publishing: add a boolean input `check_only` (default false) that skips the trim and publish.
3. Document it in `docs/dublin-d1/jim-handoff.md`.

## Acceptance
`node --check` passes. The script exits 0 with "skipped" when no key is set. The YAML parses.
`node qa/run-all.mjs --smoke` passes apart from named environmental failures. The top-level
session will run the workflow with check_only=true from your branch before merging. The PR links
this brief. No background loops.
