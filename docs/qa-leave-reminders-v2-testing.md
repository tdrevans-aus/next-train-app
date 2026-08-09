# QA plan: Leave reminders v2

**Companion to:** `docs/jim-brief-leave-reminders-v2.md`  
**For:** Tim (QA) + Jim (build hooks)  
**Status:** Plan — v2 not fully wired yet (`PreferredTrainReminder.java` exists; `LeaveReminderScheduler` still v1 “next train”)

---

## What we can and cannot test today

| Layer | Tool | Can verify | Cannot verify |
|-------|------|------------|----------------|
| **Web** | Playwright + `TESTING.md` | Menu toggles, hints, journey form fields (once shipped), settings JSON | Notification delivery, alarm scheduling |
| **Logic** | Android JUnit (new) | Preferred train pick, days, once/day gate, notify-at math | OS notification UI, Doze |
| **Android manual** | Device + debug API | Real notification, tap deep link, permission | Fully automated in CI without flakiness |
| **Fixtures** | `?fixture=` on localhost | Schedule math inputs (if exposed to JS) | Capacitor app (uses live/Vercel API) |

**Bottom line:** Notifications need **native tests + device manual**; web smoke only covers settings UX.

---

## Recommended testing stack (minimal new infra)

### 1. JUnit — `PreferredTrainReminder` (ask Jim — **high ROI**)

Pure logic tests on the JVM, no alarms:

- **Train pick:** preferred 7:20, trips 7:10 + 7:30 → **7:30** (not 7:10).
- **No early spam:** preferred 7:20 → never targets 6:00 train.
- **Days:** `remindDays` Mon–Fri → no target on Saturday (`PerthTime` mocked or fixed clock).
- **Once per day:** second `computeForJourney` same day → `null` after `hasLeaveNowFiredForDay`.
- **Get ready:** notifyAt = leaveBy − offset; offset 0 → notifyAt = leaveBy.
- **Pause:** when paused in settings → `null` (once Jim adds gate).
- **Horizon:** no train after preferred within `defaultUntil` → `null`.

**Fixture data:** JSON files in `android/app/src/test/resources/leave-reminders/` mirroring `lib/fixtures.js` departures (relative times → fixed ISO in tests).

**Effort:** ~1 day for Jim; runs in CI via `./gradlew test`.

### 2. Schedule readout API — **shipped**

**Brief:** `docs/jim-brief-leave-reminder-schedule-debug.md`

`LeaveReminders.getSchedule()` + Reminders dialog line **“Next reminder: 7:15 for 7:30 train”** when reminders are on. Same compute path as the scheduler; `reason` codes for paused / wrong_day / already_fired / etc.

### 3. Optional fast-test mode (debug builds only)

When `sessionStorage.nextTrainReminderTest=1` or build flag:

- Schedule alarm **60s** from reschedule (still exercise Receiver → Notifier → tap).
- Mark day-fired after fire so second alarm doesn’t spam.

Use for **one** instrumented/manual pass per release; not daily CI.

### 4. Playwright — web smoke (Tim can own now)

Add **TESTING.md test 17** when UI ships:

1. Native mock: `Capacitor.isNativePlatform` + fake `LeaveReminders` plugin.
2. Toggle **Leave reminders** → plugin `enable` called.
3. **Get ready** / **Pause** toggles persist in `nextTrainLeaveReminders` localStorage.
4. Journey save includes `preferredTrainTime`, `remindDays` in `nextTrainSettings`.

Does **not** prove notification fires.

### 5. Android manual checklist (required sign-off)

Use **§4 roleplay** from Jim brief on a **real device** (emulator is flaky for exact alarms + Doze):

| Step | Action | Expect |
|------|--------|----------|
| Setup | Journey: Active 6–9, Preferred 7:20, buffer 10, Get ready 5, Mon–Fri | Fields saved |
| Enable | Menu → Leave reminders ON, grant permission | Debug shows notify ~7:15, train 7:30 |
| Morning | From 6:00, don’t touch phone | **No** notification at 5:50 / 6:00 |
| Fire | At ~7:15 | **One** notification (get-ready copy) |
| Same day | 7:30 train passes | **No** second auto notification |
| Saturday | Same settings | **No** notification; debug `reason: wrong_day` |
| Pause | Pause ON | Pending cancelled; debug `scheduled: false` |
| Timetable | Change fixture/API times, refresh | notifyAt recomputes (no frozen leave-by) |

**Tap:** notification → app opens Journey mode for that journey.

Document in `qa/latest.md` with device model + Android version.

### 6. ADB helpers (optional script)

`qa/android-dump-reminders.sh`:

- `adb shell dumpsys alarm | grep nexttrain` — pending alarms
- `adb shell cmd notification post` — not for prod; only if Jim adds test action

Low priority unless debug API isn’t built.

---

## What not to build (yet)

| Idea | Why skip |
|------|----------|
| Playwright “wait for notification” | Browsers can’t see Android notifications |
| Full Espresso E2E every PR | Slow, flaky with AlarmManager + permissions |
| Server push test harness | Out of scope v2 |
| Auto public-holiday tests | Out of scope v2 |

---

## CI proposal

| Job | When | What |
|-----|------|------|
| `npm test` / smoke 1–16 | Every web change | Unchanged |
| `./gradlew :app:testDebugUnitTest` | When Jim adds JUnit | PreferredTrainReminder cases |
| Manual Android sheet | Before release / after reminder changes | §4 roleplay + pause + Saturday |

---

## Dependencies on Jim (prioritized)

1. **Wire v2:** `LeaveReminderScheduler` → `PreferredTrainReminder.computeForJourney` (replace v1 next-train path).
2. **Settings store:** `hasLeaveNowFiredForDay`, pause, get-ready rename from early heads-up.
3. **JUnit** for `PreferredTrainReminder` + fixture JSON (§4 scenario).
4. ~~**Schedule readout** — `docs/jim-brief-leave-reminder-schedule-debug.md` (`getSchedule` + Menu “Next reminder…”).~~ **Done.**
5. Update `docs/leave-by-notification.md` when shipped.

---

## Suggested `TESTING.md` entries (when ready)

### 17. Leave reminders — web UI (automated)

`node qa/leave-reminders-web.mjs` with native mocks.

### 18. Leave reminders v2 — schedule logic (automated)

`./gradlew :app:testDebugUnitTest` — PreferredTrainReminderTest.

### 19. Leave reminders v2 — device roleplay (manual)

Jim brief §4 + pause + Saturday; debug API or notification observed.

---

## Summary for Tim

- **Don’t** try to fully automate notification delivery in Playwright.
- **Do** push Jim for **JUnit on PreferredTrainReminder** + a **debug “next fire time”** readout — that’s the cheapest infra for reliable v2 QA.
- **You** still need **one real-device run** per release for permission, Doze, and notification tap.
- Reuse **§4 roleplay** as the single canonical manual scenario; extend with pause and Saturday only.
