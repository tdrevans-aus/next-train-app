# Jim brief — last two Perth-zone reminder calls (follow-up to PR #398)

**Lane:** bug-fix / product mode, Android. `tim-review: no`. **Lane lock:** none. Leave no
background loops, emulators or servers; run gradle tests and `node qa/run-all.mjs --smoke` in
the foreground with explicit 600000 ms timeouts, tailing output in the foreground if
backgrounded. **Must land before release 3.0.2 (PR #397) merges** — it is small; do it fast.

## Finding (Mark, PR #398 review, 15 Sep 2026)

https://github.com/tdrevans-aus/next-train-app/pull/398#issuecomment-5681550175, item 3:
`CommuteStripScheduler.computeStripPlanForJourney` (about line 440) and `LeaveReminderScheduler`'s
alarm-reason check (about line 768) still call the zero-argument, Perth-zone
`PreferredTrainReminder.isRemindDay(journey)` although `journey.cityId` is in scope. A UK or
European journey evaluated near a UTC day boundary can be skipped or fired on the wrong day.
PR #398 introduced `CityTimeZones` and zone-aware overloads; these two call sites were missed.

## Fix

1. Route both call sites through the zone-aware overload using `CityTimeZones` for
   `journey.cityId`, defaulting to Perth only when the id is empty (Perth-era journeys).
2. Grep for every remaining zero-arg call of `isRemindDay`, `PerthTime.now()`/`today()` and
   similar in `android/app/src/main/java` and either convert it or list it in the PR body with
   the reason it is genuinely Perth-only. The only accepted leftover is the `NextCommutePreview`
   idle ranking already flagged in #398.
3. Add unit tests: a Europe/London journey at 23:30 UK time on a remind day is treated as that
   day (not the next UTC day) by both call sites.

## Acceptance criteria

1. `:app:testDebugUnitTest` green including the new cases; `android-unit` CI green.
2. `node qa/run-all.mjs --smoke` green.
3. Diff confined to `android/app/src/**` plus this brief.

## Process

Worktree from current master (after #398); copy this brief in; commit, push; PR "Reminders:
use the journey's city zone for remind-day checks (closes #398 follow-up)".
