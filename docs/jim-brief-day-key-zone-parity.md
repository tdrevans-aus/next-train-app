# Jim brief — day-key read/write zone parity (last gate before release 3.0.2)

**Lane:** bug-fix / product mode, Android, small. `tim-review: no`. **Lane lock:** none.
Foreground gradle and `node qa/run-all.mjs --smoke` with explicit 600000 ms timeouts; tail
output in the foreground if backgrounded; leave nothing running.

## Finding (Mark, PR #400 review, 15 Sep 2026)

https://github.com/tdrevans-aus/next-train-app/pull/400#issuecomment-5682220870.
Since PR #398, `PreferredTrainReminder.ScheduleClock.live` reads `hasLeaveNowFiredForDay` with
a zone-aware day key (the journey's `CityTimeZones` zone) and that read gates real scheduling
(`clock.leaveNowFiredToday`, `PreferredTrainReminder.java` ~line 137). Every write site
(`LeaveReminderReceiver`, `LeaveReminderPlugin`, and the other `markFiredForDay` /
dismissed-for-day / day-key writers) still writes the key with the zero-argument, Perth-zone
`PerthTime.localDateKey()`. Perth is UTC+8; a Europe/London journey between about 17:00 and
midnight local time has a different Perth date from its local date, so the read never matches
the write: the "already fired today" guard fails and the leave-now reminder can fire again.
3.0.1 was consistent (both sides Perth); 3.0.2 would ship this regression.

## Fix

1. One helper, `DayKeys.forJourney(journey, nowMs)` (or equivalent), that produces the day key in
   the journey's zone with Perth as the empty-`cityId` fallback, and use it at **every** read and
   write site of the fired-for-day, dismissed-for-day, alarm request-code and on-the-way session
   keys. Read/write symmetry per key is the requirement; grep every `PerthTime.localDateKey(` and
   `dayOfWeekIso(` call and convert or, if a key is genuinely device-local, say so in the PR and
   keep both its read and write on the same zone.
2. Migration: keys written by 3.0.1 in Perth-zone form must not cause a spurious second fire on
   upgrade day; either accept both forms for 48 h after install of the new version or clear the
   day-key store once on first run after upgrade (say which and why).
3. Unit tests: a Europe/London journey at 22:00 local writes and then reads the same key; the
   same instant evaluated for a Perth journey yields Perth's date; upgrade-day migration case.

## Acceptance criteria

1. No zero-argument `PerthTime.localDateKey()` / `dayOfWeekIso()` calls remain on a path that
   also has a zone-aware counterpart; the PR body lists every call site with its disposition.
2. `:app:testDebugUnitTest` green including the new cases; `android-unit` CI green.
3. `node qa/run-all.mjs --smoke` green. Diff confined to `android/app/src/**` plus this brief.

## Process

Worktree from current master (after #400); copy this brief in; commit, push; PR "Reminders:
day keys read and written in the journey's zone (closes #400 follow-up)".
