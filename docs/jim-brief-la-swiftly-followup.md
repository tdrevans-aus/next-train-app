# Jim brief — Los Angeles PR #520 follow-up: Mark's FAIL (matcher precedence, scheduled-only leak)

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. The lane lock is held by
#520's branch `worktree-agent-adecd07a14fe5a5d9`. Work **on that same branch** (`gh pr checkout 520`) and
push to it; don't open a new PR. **Date:** 24 Oct 2026. **tim-review:** no.
**Previous brief:** `docs/jim-brief-la-swiftly-auth-header.md` (in the PR).
**QA note (the input):** https://github.com/tdrevans-aus/next-train-app/pull/520#issuecomment-6382024180

## What failed

1. **Station matcher merges stations (hard fail).** The old substring step in `findRailStopIdsForName`
   runs *before* the new normalised matcher, which only runs when the substring step finds nothing.
   Confirmed merges:
   - `Pico` also pulls in Pico/Aliso
   - `Crenshaw` also pulls in Expo/Crenshaw (E and K)
   - `Washington` also pulls in San Pedro Street and Grand/LATTC
   - `Lake` also pulls in Westlake/MacArthur Park and Lakewood Blvd
   - `1st St` also pulls in the Arcadia 1st Street Ramp entrances
   
   `Grand Av Arts/Bunker Hill` still throws.
2. **A scheduled-only time can reach a rider.** `indexTripUpdates` records a stop entry for every
   StopTimeUpdate, even when departure and delay are both null (SKIPPED, NO_DATA or arrival-only).
   The new filter keeps that row, and `board.js` then shows the scheduled time as if it were live.
   Found in the code, not yet seen in a live feed.
3. **Flip blocker, fix now:** `fetchStationBoard` returns no board-level `realtime` field.
4. **Stale text:** the LA notes in `lib/providers/registry.js` still say `Bearer` and "UNVERIFIED".

## Fix

1. **Matcher precedence for LA.** Use an exact or normalised-equal match on the catalog name and its
   aliases first. Fall back to anything looser only if that finds nothing, and never substring-match
   over entrance or ramp names (parent station vs entrance: use `location_type` / `parent_station`).
   If changing shared `findRailStopIdsForName` would affect other cities, keep the change local to
   `los-angeles.js`, or put it behind an option that only LA passes. Don't change other cities' behaviour.
   Resolve `Grand Av Arts/Bunker Hill`. If the static feed genuinely lacks it, record that, with the
   evidence, as a coverage note for the flip.
2. **Live filter.** A row reaches a rider only if its StopTimeUpdate has a non-null departure (or
   arrival) time or a delay, and the trip and stop aren't SKIPPED or NO_DATA. Otherwise drop it.
3. Add the board-level `realtime` field the same way other GTFS-RT adapters do (check
   `lib/providers/dublin.js` or the shared builder).
4. Update the registry notes.

## QA

- Extend `qa/los-angeles-planned-gate.mjs` (offline) with:
  - Every pair above resolves to its own stop set, with no overlap (fixture or the static zip;
    no network in CI).
  - A synthetic TripUpdate with departure/delay null (and one SKIPPED) yields **no** rider row.
  - `realtime` is present on the board.
- Mutation check: each new assertion fails with its fix reverted.
- `node qa/los-angeles-planned-gate.mjs` and `node qa/run-all.mjs --smoke` pass (plain, with a
  600000 ms timeout, in the foreground).
- **Live probe:** only if it's LA service hours (05:00–24:00 America/Los_Angeles) while you work.
  Otherwise record the hour and leave it. The controller schedules a daytime Mark re-check.
  `SWIFTLY_API_KEY` is in the main checkout's `.env.local`. Never print it, and stay under
  180 requests per 15 min.

LA stays `planned`. Push to #520's branch, comment on the PR with what changed, and leave no
background loops running.
