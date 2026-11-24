# Jim brief — Uppsala next-train 500 "Unknown Uppsala station" after its snapshot was refreshed

tim-review: no (restores service). Lane: bug-fix / product mode. Country sweden, city uppsala: run
`node qa/lane-lock.mjs check sweden` and acquire before touching shared files.

## Symptom (production, since ~24 Nov 2026)
- `/api/next-train?city=uppsala&station=Uppsala%20C&direction=M%C3%A4lart%C3%A5g%20mot%20Flemingsberg&destination=...`
  → 500 `{"error":"Failed to fetch train times"}`. `/api/directions` and `/api/city-stations` still 200.
- Sweep issue #551 alerting on uppsala (`next-train: HTTP 500`, error x4).
- Vercel log: `[api] 500 city=uppsala station=Uppsala C: Error: Unknown Uppsala station: Uppsala C
  at resolveStopIds (lib/providers/uppsala.js:98) at fetchGtfsRealtimeBoard (lib/providers/gtfs/realtime-board.js:37)`.

## Suspected cause
On 22 Nov the `TRAFIKLAB_API_KEY` Actions secret was added and the daily refresh
(`refresh-hand-published-gtfs.yml`) republished Uppsala's blob from a fresh Trafiklab `ul` zip (published
calendar now 20261119..20270612; previously Sept data ending 20261212). `resolveStopIds` resolves catalog
names against the static snapshot at request time (runtime name match, like malmo.js). The fresh feed
likely renamed/restructured stops (e.g. "Uppsala Centralstation" vs "Uppsala C", parent/child stop
changes), or the trim kept different route types. Malmö was refreshed the same way — check it too
(sweep shows it ok, but sample several stations).

## Required work
1. Reproduce against the current published `gtfs/uppsala.zip` (read-only download, once) and find which
   catalog stations no longer resolve, and why.
2. Fix at the right layer: catalog aliases in `lib/cities/uppsala/stations.json`, the resolver, or the
   trim/refresh step — whichever matches how the feed actually changed. Don't hard-code stop_ids that the
   next refresh will break unless the D1 pattern for this city already does that.
3. Make it impossible to go silent again: a QA check that every Uppsala (and Malmö) catalog station
   resolves against the published snapshot's stops, run by the refresh workflow **before** publishing
   (fail the unit, keep the old blob) — or, if that's impractical, as an offline gate on a committed
   stops fixture plus a refresh-time check. Explain the choice.

## Acceptance criteria
- Every Uppsala catalog station resolves; production Uppsala C next-train returns 200 with a trip in
  service hours (Jim reports curl; controller re-verifies). Malmö sampled at 3+ stations, all 200.
- The new check goes red on the pre-fix state (Mark will mutation-check).
- `node qa/run-all.mjs --smoke` passes.

## Process
Worktree, branch `fix/uppsala-unknown-station`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-uppsala-unknown-station-after-refresh.md` (untracked
in the main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it.
Another Jim is fixing Sydney in parallel — don't touch `lib/providers/sydney.js`, `lib/cities/sydney/`,
`lib/providers/gtfs/realtime.js` or `vercel.json`. If the refresh-workflow change is needed, you own
`scripts/refresh-hand-published-gtfs.mjs` for this PR.
