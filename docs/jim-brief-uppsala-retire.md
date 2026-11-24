# Jim brief — take Uppsala out of the live app (no rail data upstream)

tim-review: no. Tim decided it in chat on 24 Nov 2026: "Take it out." No outreach to Trafiklab.
Lane: bug-fix / product mode. Country sweden. **Start only after PR #554 has merged** (it holds the sweden
lock and touches `lib/providers/uppsala.js`). Then `node qa/lane-lock.mjs check sweden` and acquire it.

## Why
Trafiklab's regional `ul` static feed has had no rail routes since about 22 Nov 2026. No other regional
feed carries Mälartåg/SL-pendeln, and GTFS Sverige trip ids don't join to the `ul` realtime feed. Uppsala has
returned 500 (503 after #554) at every station since 24 Nov. Tim's rules: cities are in or out (memory "No
Coming Soon in picker"), with no timetable fallbacks and live boards only. So Uppsala comes out until rail
returns.

## Required changes
1. `lib/providers/registry.js`: move Uppsala off `status: "live"`. Use whatever status retired cities
   already use (Release 1 retired NZ/NL/Canada; follow that exact pattern). Add a dated `statusNote` /
   coverage note giving the reason (no rail in Trafiklab `ul` since about 22 Nov 2026) and what brings it
   back (rail routes back in `ul`, then a refresh and re-flip).
2. Every live-city list and the picker, in the same commit, per `qa/live-city-lists-sync.mjs`:
   MULTI_CITY_IDS, journey-model persisted lists, dogfood mount map, picker rows, CITY_BOUNDS, etc. Sweden stays
   in the picker (Stockholm and Malmö are still live).
3. Saved routes: riders with a saved Uppsala station must get a clear, honest state, not a crash or a blank
   board. Follow whatever retired-city path already exists. If none exists, stop and report; that is a
   product change for Tim.
4. Refresh workflow: drop `uppsala` from the scheduled units in `scripts/refresh-hand-published-gtfs.mjs`,
   so the daily job stops going red for a retired city. Keep the unit's code so it can be re-enabled. The
   sweep stops checking Uppsala automatically, because it reads `status: "live"`.
5. Don't delete Uppsala's adapter, catalog, gates or D1 pack. Make the Uppsala-specific gates assert the
   retired state (the "flipping a planned anchor city breaks nine gates" lesson applies in reverse; update
   them, don't delete them).

6. Small hardening carried over from Mark's #554 re-QA (comment 7132065661): add a source-level check to
   `qa/snapshot-catalog-resolution-gate.mjs`. It should confirm that `main()` in
   `scripts/publish-gtfs-snapshot-to-blob.mjs` calls `publishSnapshot(` and never calls `put(` directly.
   Today a `main()` that bypassed `publishSnapshot` would stay green. Mutation: make `main()` call `put()`
   directly, and the gate must go red.

## Acceptance criteria
- `/api/city-stations?city=uppsala` and the picker behave exactly like an existing retired city. Report the
  curl output from a local dev server.
- `node qa/live-city-lists-sync.mjs` and every Uppsala/Malmö/Stockholm gate pass. `node qa/run-all.mjs --smoke` passes.
- A refresh dry run shows no uppsala unit. Malmö is unaffected.

## Process
Worktree, branch `fix/uppsala-retire`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-uppsala-retire.md` (untracked in the main checkout) into
your worktree and commit it with the PR. Commit, push, open a PR linking it.
