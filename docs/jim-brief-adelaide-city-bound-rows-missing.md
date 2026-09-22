# Jim brief — URGENT production regression: every Adelaide city-bound direction is empty since #439

Mode: **bug-fix / product mode**. `tim-review: no` — restores what worked before. Written 22 Sep
2026 by the controller session. Copy this file into your worktree and include it in your PR.
This is the top priority; do nothing else first.

## Symptom (production, 22 Sep 2026 ~17:50 Adelaide time)

Every suburban Adelaide station shows zero trains for every city-bound direction, while outbound
directions are full: Alberton `Adelaide Railway Station (Outer Harbor line)` 0 / `Outer Harbor`
6; Goodwood 0/0/0 vs Belair 7, Flinders 6, Seaford 2; Woodville, Salisbury, Blackwood the same.
Tim saw it on the emulator: "Alberton, towards Outer Harbor line Adelaide Railway Station — No
upcoming trains". Running the pre-#439 adapter (commit eb068fb) locally against the live feed
returns 15 Alberton trips with destination **`City`**, plus Outer Harbor 7, Port Dock 6,
Osborne 2. So the trips are in the feed; #439's relabelling/matching no longer recognises
them.

## Root cause to confirm

Adelaide's GTFS/realtime names the city-bound terminus `City` (and possibly other short forms —
check the static `trips.txt` headsigns and `stops.txt` for the hub: "Adelaide", "Adelaide Railway
Station", "City"). PR #439 rewrote `lib/cities/adelaide/marketing-directions.js` to emit
`Adelaide Railway Station (<line> line)` for hub-bound rows and added `isTerminatingAtStation()`
(applied in `lib/providers/adelaide.js` line ~138). Somewhere in that path the `City` destination
either (a) fails to map to the new hub label so the chip has no matching trips, or (b) is treated
as terminating at the viewed station and dropped. Establish which with a unit-level check before
fixing, and write it into the PR. Note "Osborne" (a short-working on the Outer Harbor line) —
make sure short-workings still get a sensible label and are not dropped either.

## Fix
- Map every feed form of the hub (`City`, `Adelaide`, `Adelaide Railway Station`, whatever the
  static data actually uses) to the canonical hub label so city-bound trips populate the
  `Adelaide Railway Station (<line> line)` chip. The terminating-here filter must only drop trips
  whose terminus is the station being viewed — at Adelaide Railway Station itself, arrivals from
  the suburbs; nowhere else.
- Regenerate `public/city-directions/adelaide.json` if it changes.
- **Gate:** `qa/adelaide-dogfood-gate.mjs` must assert, from a REAL captured Adelaide feed
  fixture (capture it now — trim, mark synthetic rows), that a suburban station has ≥1 trip in
  every hub-bound direction whose line runs at that time, and that Adelaide Railway Station
  itself shows no arrival rows. This gap existed because the gate only checked labels, not that
  hub-bound chips had trips behind them — say so in the PR.
- Check Melbourne for the same failure class (its hub is `Flinders Street`; the controller's
  production check showed hub-bound trips present at Richmond/Eaglemont, so it is probably fine,
  but assert it in `qa/melbourne-dogfood-gate.mjs` the same way). Boston CR hub-bound rows
  (South Station / North Station) likewise.

## Acceptance
- Production-equivalent local check: Alberton, Goodwood, Woodville, Salisbury, Blackwood each show
  trains in every hub-bound direction and still in every outbound one; Adelaide Railway Station
  shows no arrival rows; old labels (`Outer Harbor line Adelaide Railway Station`) still resolve
  via the aliases and return a train.
- `node qa/adelaide-dogfood-gate.mjs`, `qa/melbourne-dogfood-gate.mjs`, `qa/boston-dogfood-gate.mjs`,
  `qa/bundled-city-directions.mjs`, `node qa/run-all.mjs --smoke` pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check australia`, then `acquire australia adelaide-hub-fix jim <branch>`.
- Branch from up-to-date `origin/master` (at or after a103ee4). `.env.local` copied in for live
  checks, loaded via `loadEnvLocal()` only, never printed or committed, deleted before committing.
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read; re-run an
  unrelated failing script once. Foreground commands with explicit timeouts only — no background
  processes, sleeps or poll loops; stop any dev server (free port, never 3000).
- Commit, push, open a PR titled "Adelaide: restore city-bound rows dropped by #439 (hub
  destination 'City' unmapped)". Do not merge.
