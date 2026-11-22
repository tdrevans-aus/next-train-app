# Jim brief — Sydney production boards are timetable-only: add TfNSW realtime on Vercel

tim-review: no. Tim decided this in chat on 22 Nov 2026 ("Make Sydney live"). Record that in the PR.
Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Country australia, city sydney: acquire the
lane lock (this touches `lib/cities/sydney/` and possibly `lib/providers/sydney.js`).

## Problem
`lib/cities/sydney/dogfood-next-train.js` `loadSydneyBoard()`: when `VERCEL === "1"` it **always** calls
`boardFromFixture()`. That builds trips from the hand-published static snapshot
(`gtfsFixtureBlobUrl("sydney")`, refreshed daily since #541) with `realtimeIndex: indexTripUpdates([])`.
So every production Sydney time is a timetable time. The trips also don't carry `realtime:false`, so
they reach `/api/next-train` looking live. The sweep's new schedule-only check (#544) can't see it
either. Mark confirmed this in his #544 QA comment. Off Vercel, `fetchStationBoard()` in
`lib/providers/sydney.js` loads the full TfNSW static (three ~100 MB authenticated zips) plus three
GTFS-RT TripUpdates feeds: sydneytrains, metro, and nswtrains (v1).

The likely reason the Vercel branch exists: the full static download is too big and slow for a Vercel
function (see docs/jim-brief-sydney-board-oom-on-429.md: a 429 led to a V8 out-of-memory abort). Confirm
that from git history and the briefs before changing anything.

## Required change
1. On Vercel, keep the **trimmed blob snapshot** as the static source and join it against **live
   TfNSW GTFS-RT TripUpdates** from the same three feeds `loadSydneyRealtime()` already uses. Production
   already has `TFNSW_API_KEY`. Reuse the existing helpers (`indexTripUpdates`, `buildBoardForStops`,
   `checkSnapshotFreshness`). Don't fork them.
2. Every trip must carry an honest `realtime` value: `true` when it has a matching RT update, and
   `false` when it is a timetable row. Do this the same way the local `fetchStationBoard` path does, so
   prod and local agree. Follow the honest-empty-state rule (memory rule; Red Cow / Dublin pattern) and
   the live-boards-only posture of comparable GTFS-RT cities (Melbourne, Dublin). If they differ for a
   station that has no RT rows, follow Melbourne and document it.
3. RT failure: if all three feeds fail (401/403/429/5xx/timeout), the board must not silently become a
   timetable board labelled live. Either mark every row `realtime:false`, or refuse the way Melbourne
   does. Pick whichever matches Melbourne, and say which in the PR. One feed failing (metro or
   nswtrains) degrades only that operator's rows, as `loadSydneyRealtime()` already does.
4. Performance (hard rule: memory "30 s cap is a ceiling"): do not touch `maxDuration`. RT fetches are
   shared across directions and briefly cached. The existing 15 s `sharedSydneyBoard` reuse covers the
   join, and the RT fetch must be in-flight-coalesced too. Targets at Sydney Central (the slowest board,
   20 directions): `/api/board` warm < 3 s, cold < 10 s on Vercel. Measure on the PR's preview
   deployment, or production after merge, and report the numbers.
5. TfNSW rate limits: in-flight coalescing plus a short TTL means one RT fetch per feed per instance per
   ~15 s, regardless of how many directions or stations ask. Honour 429 / Retry-After.
6. Remove the fixture fallback **only** for the Vercel path. The local-dev fallback on 401/403/missing
   key can stay, but those trips must also be marked `realtime:false`.

## Acceptance criteria
- A network-free QA script (stubbed RT feed): matched trip → `realtime:true` with the live time;
  unmatched → `realtime:false`; all feeds failing → behaviour per item 3. It must go red against
  master's `boardFromFixture` path, and Mark will mutation-check it.
- Production after merge: Central → T1 Hornsby and two other chips return `next` with `realtime:true`
  in service hours. The sweep line for sydney shows `live=N scheduled=M` with N > 0 from real RT data.
  The controller re-verifies.
- Central `/api/board` timings (warm and cold) reported against the targets in item 4.
- Sydney gates, `node qa/sydney-direction-match.mjs`, and `node qa/run-all.mjs --smoke` pass.

## Out of scope
Copenhagen (also timetable-only without per-trip `realtime:false`; no Rejseplanen key). Leave it alone
and mention it in the PR as the remaining case.

## Process
Worktree, branch `fix/sydney-live-on-vercel`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-sydney-live-on-vercel.md` (untracked in the main
checkout) into your worktree and commit it with the PR. Commit, push, and open a PR linking it. Another
Jim is working on the QA nightly in parallel (docs/jim-brief-qa-nightly-red-since-sep.md). Don't touch
`qa/run-all.mjs` unless you must register your new script, and say so in the PR if you do.
