# Testing — Next Train App

Manual smoke-test playbook and fixture API for local QA (including Cursor testing agents).

Fixture mode works **only with the local dev server** (`npm start`). Production / Vercel always uses live Transperth data.

## Quick start

```bash
npm start
```

Open in a browser:

```
http://localhost:3000/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth
```

| Query param | Purpose |
|-------------|---------|
| `reset=1` | Clears `localStorage` + `sessionStorage` once, then removes itself from the URL |
| `test=1` | Skips geolocation auto-setup and **defers the onboarding coach timer** (use for most automated smoke tests) |
| `fixture=<name>` | Uses deterministic mock train data (see table below) |
| `station` + `direction` | Seeds a configured journey (same as share links) |

List fixtures:

```bash
curl http://localhost:3000/api/fixtures
```

## Fixtures

Times are relative to **now** when the API responds, so countdowns stay stable for the session but drift on refresh (by design).

| Fixture | What you should see |
|---------|---------------------|
| `normal` | Hero: **18 minutes** to departure. Leave card: calm, leave in ~8 min. **Then** section shows a following train. Four trains available for swipe-left. |
| `urgent` | Leave card in **urgent** styling (~2 min to leave). |
| `late` | Leave card shows **you should have left** (~3 min late). Train still in 7 min. |
| `delayed` | Hero scheduled line visible. Status shows **5 min late**. |
| `ahead` | Live 1 min before schedule. Status **On Time**. No scheduled subline. |
| `estimated` | Live 2 min before schedule. Status **Estimated**. Hero subline shows **Estimated**. |
| `empty` | Hero: no upcoming trains. Leave card hidden. |
| `error` | Red error banner; “Update failed” timestamp. |

Example URLs:

```
/?reset=1&fixture=urgent&station=Edgewater%20Stn&direction=Perth
/?reset=1&fixture=late&station=Edgewater%20Stn&direction=Perth
/?reset=1&fixture=empty&station=Edgewater%20Stn&direction=Perth
/?reset=1&fixture=error&station=Edgewater%20Stn&direction=Perth
```

Direct API check:

```bash
curl "http://localhost:3000/api/next-train?fixture=normal&station=Edgewater%20Stn&direction=Perth"
```

## Smoke tests

Run against `http://localhost:3000` unless noted. Report each as **PASS** / **FAIL** with steps and what you observed.

### 1. First launch — Nearby mode (no journey)

1. Open `http://localhost:3000/?reset=1&test=1&fixture=normal` (no `station` / `direction`).
2. **Expect:** App in **Near me** mode (`#nearby-btn` pressed). Route shows **Near you** (nearest station board). Leave card hidden. Journey switcher hidden. Hero shows nearby departures (not “Tap to get started”). Journeys dialog does **not** auto-open.

`test=1` skips geolocation auto-configuration so this flow is reliable in automation.

### 12. Onboarding coach (first run)

Manual only (omit `test=1`; allow location or pick a fallback station if prompted):

1. Open `http://localhost:3000/?reset=1&fixture=normal`.
2. Wait until the nearby board has loaded (~6s after populate).
3. **Expect:** Floating coach step 1 — **Near you** + “Got it”. After **Got it**, step 2 — **Saved commutes** with **Set up a journey** / **Maybe later**.
4. Tap **Maybe later**. **Expect:** Coach dismisses; app stays in Nearby mode; coach does not return on refresh (stored in `localStorage` key `nextTrainOnboardingDone`).

With `test=1`, the coach timer does not run — use this test for the timed coach only.

### 13. Journey templates (create from wizard or Add journey)

1. From test 12 step 2, tap **Set up a journey** (or: `?reset=1&test=1&fixture=normal` → **Journeys** twice → template chips visible).
2. **Expect:** Journeys dialog with template chips (Morning into town / Evening home / Custom). **Add journey** hidden while chips are shown.
3. Tap **Morning into town**.
4. **Expect:** Brief wait while nearest station is detected. Detail view opens with name **Morning into town**, default window **06:00–09:00**, **nearest suburban station** selected, direction **towards Perth**. Three-step coach: (1) route picked, (2) time to station, (3) active hours **06:00–09:00**. Dismiss with **Got it** on step 3.

Repeat with **Evening home** (15:00–18:00, **Perth** departure towards your line home) and **Custom** (no auto route, user picks station/direction).

### 13b. Double wizard / double template (duplicate morning)

1. `?reset=1&test=1&fixture=normal` → wizard **Set up a journey** → **Morning into town** → wait for detail / route coach.
2. **← Journeys** → pick **Morning into town** again (chips visible via **Add journey** if needed).
3. **Expect (ideal):** Reuses existing row or blocks second morning — **one** “Morning into town” in the list.
4. **Current known bug:** Two rows; saving the second shows overlap with **"Morning into town"** (06:00–09:00) — looks like self-overlap but is a duplicate journey. See `docs/jim-brief-duplicate-morning-template.md`.

### 15. Remove ads (web vs Android)

**Web (`localhost` / browser):**

1. Open app with ads visible (placeholder or AdSense).
2. Open **Menu**.
3. **Expect:** **Remove ads** buy row **hidden**; hint **Ad-free is available in the Android app**. Link under ad slot **hidden**. Tapping a visible **Remove ads** control should not silently do nothing (if shown, should toast or open Menu).

**Android (device / emulator with Play Store):**

1. Open **Menu** → **Remove ads** (or link under banner).
2. **Expect:** Google Play purchase sheet **or** toast (*Couldn't complete purchase. Try again.* / cancel silent).
3. If buy row missing: billing may be unavailable (emulator without Play) — **Restore purchase** may still show.
4. If native purchase bridge failed to load: under-ad link **hidden**; any purchase tap shows *Purchases aren't available right now. Try updating the app.*

### 16. Button visibility (viewport regression)

Automated on **390×844** mobile viewport:

```bash
node qa/button-visibility.mjs
```

**Expect:** Every visible interactive control on each screen is **fully inside** its dialog or the viewport (2px tolerance):

| Screen | Key controls |
|--------|----------------|
| Main | Near me, Journeys, Menu |
| Journeys list | Done, Add journey / template chips |
| Journey detail | ← Journeys, Cancel, Save, **Delete** (with 2+ journeys) |
| Menu | Done, Clear all data, **Reminders** (first), How it works |
| Help | Got it |
| Widget help | **Add widget** (primary), **Done**; pin-first copy; manual steps only after unsupported pin |

**Manual (optional):** Repeat on Android device after `cap:sync` — same checks; journey detail **Delete** must not clip below dialog bottom.

### 20b. Widget help dialog (pin-first)

Automated (web layout):

```bash
node qa/button-visibility.mjs
```

**Expect:** widget help row **PASS** — **Add widget** primary, **Done** secondary; manual block hidden on open; lead is one benefit line (no “Tap Add widget”, no size/leave-in copy).

**Manual (Android):**

1. **Menu → Add home screen widget** (or widget coach → **How**).
2. **Expect:** Single sentence — **Add widget** puts your next train…; no long-press steps visible yet.
3. Tap **Add widget** → system pin sheet (supported device).
4. If pin unsupported → manual **Or add manually** block appears after attempt; dialog stays open.

Jim brief: `docs/jim-brief-widget-help-pin-first.md`

### 28. Menu layout (two tiers)

1. Open **Menu**.
2. **Expect:** Title **Menu** only — no Near me / My Journeys subtitle.
3. **Expect:** **Reminders** is the first row; **Add home screen widget** directly under it on Android (hidden on web).
4. **Expect:** Light divider, then **How it works**, ad-free block, **About**, **Privacy**.
5. **How it works** still explains Near me vs Journeys.

Jim brief: `docs/jim-brief-menu-layout.md`

### 29. Location wait UX (Nearby + Morning wizard)

**Nearby first open (manual):**

1. Fresh install / `?reset=1` → **Near me** loads with spinner (not dead `—`).
2. Copy stays *Finding your nearest station…*; **Don’t wait** appears ~7s (no 12s copy change).
3. Don’t wait → station picker; late GPS must not overwrite manual pick.

**Morning / Evening wizard (automated):**

```bash
node qa/morning-template-wizard-repro.mjs
node qa/custom-template-delay-repro.mjs
node qa/custom-template-no-wizard-repro.mjs
```

**Expect:** Morning coach opens immediately (step 1 **Name**); geo runs in background. Custom detail opens without geo delay; coach still 3 steps (route → time → hours).

Jim brief: `docs/jim-brief-location-wait-ux.md`

### 30. Yanchep line — collapse Whitfords direction

```bash
node qa/yanchep-whitfords-direction.mjs
```

**Expect:** `PASS  Yanchep / Whitfords line grouping` — Whitfords normalizes to Yanchep; direction list has one **Yanchep** entry; `pickUpcomingTrips("Yanchep")` includes Whitfords-terminated trains.

**Manual (Perth outbound):**

1. Journey **Perth** → direction picker shows **Yanchep** only (no separate Whitfords).
2. Saved **Yanchep** journey shows next train including short-line Whitfords services when live board has them.
3. Other directions (Mandurah, Midland, etc.) unchanged.

Jim brief: `docs/jim-brief-yanchep-whitfords-direction.md`

### 31. Widget stuck Updating… + tap won’t open (Android)

**Automated (JUnit):**

```bash
cd android && ./gradlew :app:testDebugUnitTest --tests "com.tdrevans.nexttrain.CommuteScheduleTest" --tests "com.tdrevans.nexttrain.WidgetUiBuilderTest"
```

**Expect:** `repaintSnapshot_showsStaleRefreshWhenUpdatingTimedOut`, `repaintSnapshot_showsStaleRefreshWhenRefreshAgeExceeded`, `needsLocalRepaint_trueWhileUpdating`, `compactPrimary_shortensUpdatingForNarrowWidget` all pass.

**Manual (emulator/device):**

1. Pin widget; let a departure pass without network → brief **Updating…** / **Fetching…** (2×1 primary shows **…**, not clipped **Upd**).
2. After ~3 min without network → **—** / **Tap to refresh** / **Out of date** (not endless Updating + old **Nm ago**).
3. **Tap widget** → app opens within ~1s (no ANR from sync on main thread).
4. Restore network → widget recovers next train.

Jim brief: `docs/jim-brief-widget-stuck-updating-tap.md`

### 20. Stickiness coach gating (logic regression)

Pure Node — **no browser**, no `npm start`:

```bash
node qa/stickiness-coaches-logic.mjs
```

**Expect:** `8 PASS · 0 FAIL`. Mirrors stagger rules in `docs/jim-brief-stagger-stickiness-coaches.md` (widget coach before leave-reminder coach; never same session).

| Automated case | Rule under test |
|----------------|-----------------|
| open 1: no widget | 1st app open — widget coach **not** eligible |
| open 2: widget pending | 2nd open — widget coach **eligible** |
| open 2: no reminder while widget pending | Reminder coach **blocked** while widget arc unfinished |
| open 3: reminder after widget done | 3rd open + widget `done` — reminder coach **eligible** |
| widget snoozed blocks reminder | Widget `snoozed` (within 7-day window) — reminder **blocked** |
| weekday after config day opens reminder gate | First **weekday** (Mon–Fri Perth) **after** config calendar day opens reminder OR-gate |
| same config day weekday does not open gate | Config day itself — weekday gate **closed** |
| second not now exhausts coach | After snooze expires, one more show; 2nd **Not now** → `exhausted`, no auto-show |

**Manual (Android, optional):** End-to-end coach UI is **not** covered by this script. After `cap:sync`, cold-launch on device:

1. **Session 1** — save first Journey → **no** widget or reminder auto-coach that session.
2. **2nd cold open** — widget coach only (if not done).
3. **3rd cold open** (widget resolved) — leave-reminder coach only; **not** stacked with widget same session.

Web: no widget/reminder coaches (native Android only).

**Widget coach Not now → Menu hint (manual, Android):**

1. 2nd cold open after first journey configured → widget coach visible.
2. Tap **Not now**.
3. **Expect:** Coach dismisses; toast *You can add a widget anytime from **Menu*** (~3s); Menu icon pulses briefly; Menu does **not** auto-open.
4. Open **Menu** → **Add home screen widget** still works.

Jim brief: `docs/jim-brief-widget-not-now-menu-hint.md`

### 21. Reminders dialog (Menu)

Automated (web):

```bash
node qa/reminders-dialog.mjs
```

**Expect:** `PASS` — Menu → **Reminders** opens `#reminders-dialog`; Menu closes; **Done** visible. **No** master **Reminders** toggle — only per-journey **Reminder** switches. **More options** (Early Reminder / Pause) visible when ≥1 journey Reminder is on.

| Platform | Expect in dialog |
|----------|------------------|
| **Web** (`localhost`) | Hint: *Leave reminders are available in the Android app.* Native controls **hidden**. |
| **Android** (after `cap:sync`) | Lead copy; per-journey **Reminder** + **Usual train time**; **More options** when ≥1 Reminder on → **Early Reminder** (toggle + 5/10/15 chips) and **Pause reminders** (timed chips + **Resume reminders**); schedule line when native bridge works. No master toggle. |

**Manual (Android) — More options:**

1. **More options** → turn **Early Reminder** on → **5 / 10 / 15** chips appear; tap **10** → reschedule uses 10 min offset.
2. **Pause reminders** → tap **1 day** → status **Paused until …** + **Resume reminders**; schedule line matches.
3. Tap **Resume reminders** → pause clears; next-reminder line returns.
4. **Timed auto-resume:** set `pauseUntil` in the past (or wait for expiry) → open app or Reminders → pause cleared without manual resume (native `getSchedule` / `getSettings` path).

**Manual (Android) — core:**

1. Configure a journey (e.g. Morning into town).
2. **Menu** → **Reminders**.
3. **Expect:** Reminders dialog opens (not silent no-op).
4. Enable **Reminders** → permission prompt; journey cards and **More options** appear.
5. **Done** dismisses immediately (native saves in background after close).

**Done double-tap (web):**

```bash
node qa/done-double-tap-repro.mjs
```

**Expect:** All scenarios `PASS (1 Done closes all)` — Menu, Menu→Reminders→Done, after Journeys activity.

**Manual (Android):** Reminder on without usual train time → inline error (not silent first tap); fix time → **Done** once closes.

Jim brief: `docs/jim-brief-done-double-tap.md`

**Known bug (2026-08-10):** If **Reminders** does nothing, check console for `DEFAULT_REMIND_DAYS has already been declared` — `leave-reminders.js` fails to load (duplicate `const` in `app.js` + `leave-reminders.js`). Until fixed, `window.nextTrainLeaveReminders` is undefined.

### 22. Widget homescreen — times & refresh (Android manual)

**Not automatable** on the launcher (no Playwright for pinned widgets). Run on device after `cap:sync` with a **configured journey** and widget pinned.

**Read the widget:**

| Line | Meaning |
|------|---------|
| Big number (`12 min` / `NOW`) | Minutes until **live** departure (from last good fetch + local repaint) |
| Small clock (`09:13`) | **Scheduled** platform time — not “next train in the timetable at 9:13” by itself |
| Leave line (`Leave 8 min ago`, red) | Overdue leave-by — **not** bare `8 min late` (reads as train delay) |
| `Updated …` | Last **successful network** refresh — must be **fully readable** (not ellipsized) |

**Regression — truncated Updated / clipped train clock (2026-08-10):**

- **Fail:** `Updated 9:10 A…` or scheduled clock (`12:34`) cut off at bottom of **2×1** widget.
- **Pass:** Full countdown+clock on one line (e.g. `11 min · 12:34 pm`); **Updated** fully readable (`Just now`, `3m ago`, or time).
- **Cause (layout):** Six text rows in 40dp min height; train clock and Updated were bottom casualties.

**Regression — truncated Updated line (2026-08-10):**

- **Fail:** `Updated 9:10 A…` or similar — time cut off on **2×1** (and tight **4×1**) widget.
- **Pass:** Full line visible, e.g. `Updated 9:10 am` or shorter copy (`Updated 19m ago`) that fits the crumb.
- **Cause (layout):** `widget_updated` uses `wrap_content` + `ellipsize="end"` in a narrow weighted column; `PerthTime.formatUpdatedLine` produces `Updated h:mm a` (long on some locales).

**Sanity (compare app vs widget):**

1. Open app → note hero countdown, scheduled time, leave strip, **Updated** time.
2. Read home-screen widget at the **same moment**.
3. **Expect:** Big number and leave line **match** app (within ~1 min). **Updated** on widget should be **recent** (not many minutes behind while app is fresh).

**Regression — stale / wrong train (2026-08-10):**

- Phone time **after** scheduled departure (e.g. 9:29) but widget still shows scheduled **09:13** with **NOW** and **Updated** stuck ~10+ min ago.
- **Fail:** Looks like “next train 9:13” when cache is stale or departure-advance refresh did not run.
- **Pass:** After scheduled/live departure passes, widget shows **next train** countdown, brief **Updating…** / **Fetching next train…**, or network refresh — **never** silent **NOW** + old scheduled clock for many minutes.

Jim brief: `docs/jim-brief-widget-post-departure-staleness.md`

**Automated helper (logic only, not launcher UI):**

```bash
./gradlew :app:testDebugUnitTest --tests com.tdrevans.nexttrain.CommuteScheduleTest --tests com.tdrevans.nexttrain.WidgetUiBuilderTest
```

Covers local repaint, `needsNetworkRefresh` after departure minute, late leave copy — not alarm delivery or API fetch on device.

See `docs/widget-homescreen.md` and `CommuteSchedule.java` (`WidgetDepartureAdvanceScheduler`).

### 23. Other directions hidden in My Journeys (regression)

Automated:

```bash
node qa/other-directions-journey-repro.mjs
```

**Expect:** **PASS** — in My Journeys mode, `#nearby-directions` is **hidden** (no “Other directions” label).

**Repro steps (what the script does):**

1. Configured journey (e.g. Armadale → Perth).
2. Open **Journeys** dialog → tap **Near me** (nearby board loads) → **Done** on dialog.
3. **Fail:** Other directions + nearby-style meta still visible under hero in Journey mode.
4. **Pass:** Journey layout only — hero, leave card, platform/status, **Then** (no Other directions).

**Manual:** Any path into My Journeys after using Near me — label must not appear.

Jim brief: `docs/jim-brief-other-directions-in-journey-mode.md`

### 24. Journey edit icon (manage entry)

1. Configured journey, Journey mode — **no** “Manage journeys” text link under the route.
2. **1 journey:** muted journey name + pencil icon on the same row; tap pencil → **My Journeys** list.
3. **≥2 journeys:** switcher lists journeys only (no **Manage journeys** row); pencil trails the switcher pill → **My Journeys** list.
4. Nearby / empty setup: pencil hidden. Leave-card sliders still edit time to station only.

Jim brief: `docs/jim-brief-journey-edit-icon.md`

### 25. Journey name on detail (Custom + edit)

1. **Custom** template → detail shows **Name** field empty with placeholder `e.g. Weekend into town` (not `Journey N`).
2. Type a name → set station + direction → **Save** → live board / switcher show that name.
3. Leave name blank → set station + direction → **Save** → name is **Station → direction** (e.g. `Armadale → Perth`), not `Journey N`.
4. Edit existing journey → name field shows current name; change + **Save** updates list and switcher.
5. **Morning** / **Evening** templates still open with preset names in the field.

Jim brief: `docs/jim-brief-journey-name-on-detail.md`

### 26. Custom template route wizard (open bugs #7)

Automated:

```bash
node qa/custom-template-no-wizard-repro.mjs
```

**Expect:** **PASS** — onboarding → **Custom** shows 3-step template coach (“Pick your route” / time to station / active hours), same flow as Morning/Evening.

Jim brief: `docs/jim-brief-open-bugs.md` (#7)

### 27. Active days (journey Timing)

1. Open **My Journeys** → edit a configured journey → **Timing** shows **Active days** chips above **Active from/until**.
2. **Menu → Reminders** → per-journey card has **Reminder** + **Usual train time** only (no day chips).
3. Mon–Fri journey with active hours covering “now” on a **weekday** → main screen auto-shows that journey (or stays on it).
4. Same journey on **Saturday** (in active hours) → defaults to **Near me** unless user picks the journey manually.
5. Deselect all active days → **Save** → alert **Pick at least one active day.**
6. Two journeys, same hours, **Sat–Sun** vs **Mon–Fri** → **Save** allowed. Same hours + overlapping days → overlap error.

Jim brief: `docs/jim-brief-active-days-display.md`

### 17–19. Leave reminders v2 (native scheduling)

Plan: `docs/qa-leave-reminders-v2-testing.md`

- **17** — Superseded by **21** for Menu UI; native plugin mocks optional  
- **18** — `PreferredTrainReminder` JUnit (train pick, days, once/day)  
- **19** — Android device roleplay (Jim brief §4: no 5:50 spam, one ping ~7:15, no Saturday)

### 2. Configured journey (fixture)

1. Open the quick-start URL above (`fixture=normal`).
2. **Expect:** Route shows `Edgewater Stn, towards Perth`. Hero shows **18 minutes** + departure time. Leave card visible below. Platform + Status populated. “Then” section visible.

### 3. Journey switcher

1. From test 2, open journey switcher and pick **Daily Commute - out** (or add a second configured journey in settings).
2. **Expect:** Switcher label updates. Selection does not snap back on refresh.

### 4. Swipe — later train

1. `fixture=normal` URL.
2. Swipe **left** on the hero card.
3. **Expect:** Departure time advances to the next train (~34 min bucket). Swipe hint disappears and does not return (stored in `localStorage` key `nextTrainSwipeHintSeen`).

### 5. Swipe — earlier train (undo)

1. After test 4, swipe **right** on the hero.
2. **Expect:** Returns to the first train (~18 min).

### 6. Urgent leave styling

1. Open `fixture=urgent` URL.
2. **Expect:** Leave card uses urgent border/colour. Countdown says leave in ~2 minutes.

### 7. Late leave styling

1. Open `fixture=late` URL.
2. **Expect:** Leave card label “You should have left”. Late styling on leave card.

### 8. Empty state

1. Open `fixture=empty` URL.
2. **Expect:** No crash. Hero shows no trains message. No leave card.

### 9. API error

1. Open `fixture=error` URL (or mock a 500 after a successful empty response).
2. **Expect:** Error message visible. App remains usable (settings still open).
3. If the last good response had trains → hero stays visible, dimmed, with **Update failed — times may be out of date**.
4. If the last good response had no trains (or none loaded) → hero shows **Couldn't refresh times**, not “No upcoming trains”.

### 10. Settings — overlap validation

1. Open settings → edit a journey → set default window **06:00–09:00** on journey A and overlapping window on journey B → Save.
2. **Expect:** Inline error under Active hours: *Only one journey can be active at one time. These hours overlap …* plus **Fix for me** chip. Invalid window not saved.

### 32. Widget already on home screen (Android manual)

1. **No widget** → Menu → **Add home screen widget** → pin-first copy; **Add widget** primary.
2. **≥1 widget pinned** → same Menu row → *You already have a Next Train widget…* + long-press tip; **Done** primary, **Add another** secondary (still pins).

Jim brief: `docs/jim-brief-widget-already-have.md`

### 33. Journey overlap — Fix for me

1. Two journeys with overlapping Active hours on shared days → Save second journey.
2. **Expect:** Inline error (no “default times” wording); **Fix for me** snaps this journey to Morning **06:00–09:00** or Evening **15:00–18:00** when template/conflict fits.
3. Other journey unchanged; user still taps **Save**.

Jim brief: `docs/jim-brief-journey-overlap-friendly.md`

### 11. Settings — Save vs Done

1. Edit leave-before minutes, tap **Done** without Save, reopen journey.
2. **Expect:** Value unchanged. After **Save**, value persists.

### 14. Live API (optional)

1. Open `http://localhost:3000/?reset=1&station=Edgewater%20Stn&direction=Perth` (no `fixture`).
2. **Expect:** Real Transperth times load. Countdowns change over time.

## Testing agent prompt

Paste into a **fresh** Cursor agent chat (not the coding session):

> You are a QA agent. Follow `TESTING.md` in this repo. Run `npm start` if needed. Execute smoke tests 1–11, 13, 15 (web), **16** (`node qa/button-visibility.mjs`), **20** (`node qa/stickiness-coaches-logic.mjs`), and **21** (`node qa/reminders-dialog.mjs`). Use fixture URLs with `test=1` where noted. Output a table: test #, PASS/FAIL, notes. Do not fix code unless I ask.

## Android / Capacitor

The native app loads the hosted Vercel API — **fixtures do not apply**. After web smoke passes:

1. `npm run cap:sync`
2. Run on device/emulator
3. Manually verify swipe gestures and journey switcher (tests 4–5, 3)

## Storage keys (for debugging)

| Key | Storage | Purpose |
|-----|---------|---------|
| `nextTrainSettings` | localStorage | Journeys + active journey |
| `nextTrainSkip:<journeyId>` | sessionStorage | Client-side train skip offset |
| `nextTrainManualJourneyOverride` | localStorage | Manual journey picker override |
| `nextTrainOnboardingDone` | localStorage | Onboarding coach completed |
| `nextTrainSwipeHintSeen` | localStorage | Swipe hint dismissed |
| `nextTrainAppEngagement` | localStorage | App open count + first journey configured timestamp (stickiness) |
| `nextTrainWidgetCoach` | localStorage | Widget coach status (`pending` / `snoozed` / `done` / `exhausted`) |
| `nextTrainLeaveReminderCoach` | localStorage | Leave-reminder coach status (same shape) |

Clear everything: `/?reset=1` or DevTools → Application → Clear site data.
