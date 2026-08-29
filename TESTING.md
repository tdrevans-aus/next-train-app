# Testing — Next Train App

Manual smoke-test playbook and fixture API for local QA (including Cursor testing agents).

Fixture mode works **only with the local dev server** (`npm start`). Production / Vercel always uses live Transperth data.

## Release versioning

We ship **semver** (`versionName`, e.g. `2.1.3`) and a monotonic Play **`versionCode`** (e.g. `10`). Patch = tester bugfixes only; minor = feature backlog (e.g. **2.2.0**). Tag each Play upload (`v2.1.2`, …); hotfix from the tag, features on `develop`. Full rules: **`docs/release-versioning.md`**.

| Shipped | Next patch | Next features |
|---------|------------|---------------|
| **2.1.2** (code **9**) | **2.2.1** (code **12**) | **2.3.0** (code **13+**) |

Before every Play upload: bump all version fields (see doc), run **`npm run release:prep`** (or at minimum **`npm run test:pre-upload`**), tag, upload AAB. See `docs/aab-signing-closed-testing.md` and `docs/jim-brief-play-hygiene.md` (**FB-41**).

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
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

Production liveness (after Vercel deploy of `api/health.js` / `api/ready.js`):

```bash
curl https://next-train-app.vercel.app/api/health
curl https://next-train-app.vercel.app/api/ready
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
2. **Expect:** Journeys dialog with **Add journey** button and template shortcuts (Morning into town / Evening home). **Custom** chip removed — use **Add journey** to create a blank journey.
3. Tap **Morning into town**.
4. **Expect:** Brief wait while nearest station is detected. Detail view opens with name **Morning into town**, default window **06:00–09:00**, **nearest suburban station** selected, direction **towards Perth**. Setup coach: **Name** → **Route** → **Time to station** → **Active hours** → **Reminder** (5 steps). **Got it** on Reminder. Scrim tap does **not** dismiss; **Skip tour** marks seen same as Got it. On Name step you can edit the journey name while the coach stays open.

Repeat with **Evening home** (15:00–18:00, **Perth** departure towards your line home) and **Custom** (4 steps: route → time → hours → reminder, no Name step). **Custom** Active days: **today's Perth weekday only** (e.g. Friday → **F** only); hint *Starts on today — add more days if this repeats more often.* Morning/Evening stay Mon–Fri.

**Custom Active days (automated):**

```bash
node qa/custom-active-days-today.mjs
```

**New journey shows on main screen (automated):**

```bash
node qa/new-journey-show-now.mjs
```

**Manual:** Evening home active by hours → add **Custom** (no Active from/until) → **Save** → main shows **Custom**, not Evening home. Re-save Evening home → no forced switch.

### 13c. Outside Active hours → Near me

Morning 6–9 + Evening 15–18; at midday (no journey in window):

```bash
node qa/outside-hours-nearby.mjs
```

**Expect:** No scheduled journey at noon; sole Custom with no Active hours never auto-selects; manual override cleared when nothing is in-hours → **Near me** default.

**Widget (Android, rebuild APK):** Same settings at midday → **NEXT COMMUTE** preview (e.g. **Today 15:00–18:00** + route), **not** a live countdown or stuck **Updating…**. Tap → app opens **Near me**. No journeys configured → calm **NEAR ME** idle.

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

**Android (Play closed test / internal test — not sideloaded debug APK):**

1. **Play Console:** one-time product `com.tdrevans.nexttrain.adfree` at **A$7.99**; your Google account on **License testing**.
2. Install from the **Play** opt-in link (same track as the uploaded AAB).
3. Open **Menu** → **Remove ads** → purchase sheet → **Remove ads** → Google Play sheet.
4. **Expect:** Play purchase UI **or** a clear toast (never silent). Cancel → main screen usable (no stuck grey overlay).
5. **Restore purchases** is on the purchase sheet (not duplicated in Menu while buying). After purchase, Menu shows **Ads removed**; **Restore** stays in Menu for re-sync.
6. Sideloaded `debug` APK / emulator without Play: billing often unavailable — toast explains; use a Play test install to validate IAP.

**After code change:** `npm run cap:sync` then upload a new AAB (or local debug only for UI; IAP needs Play).

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
| Journey detail | ← Journeys, Cancel, Save, **Delete** |
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

### 20c. Widget appearance (colour presets)

Automated:

```bash
node qa/widget-theme-palettes.mjs
```

**Manual (Android):**

1. Widget installed. **Menu → Widget → Widget appearance**.
2. Pick **Midnight** → widget background goes dark within one refresh.
3. Pick **Ocean** → light blue card, blue accent on train number.
4. **Leave now** / urgent line still orange (not recoloured to accent).
5. Kill app, relaunch → choice persists.
6. API 31+ device: **Match system** follows system dark mode (spot-check).
7. Web: menu item hidden; no regression.

**Opacity (FB-36):**

1. Slider at **40%** → swatch previews fade; widget card faint after sync.
2. **Transparent card** ON → slider disabled at 0%; widget has no card fill/border.
3. Toggle OFF at **50%** → border returns; transparent flag cleared.
4. Change preset at 40% → opacity preserved.
5. Kill app → opacity + transparent state persist.

Jim brief: `docs/jim-brief-widget-colour-presets.md`, `docs/jim-brief-widget-appearance-opacity.md`

### 20d. Widget setup on placement (configure + preview)

Automated:

```bash
node qa/widget-appearance-setup.mjs
```

**Manual (Android):**

1. Launcher → Widgets → Next Train → drag to home → **Set up your widget** opens before placement.
2. Pick preset + opacity on **Vibrant** preview → **Add widget** → home widget matches.
3. Back out of setup → widget **not** placed.
4. In-app **Add widget** pin → setup opens once after pin sheet.
5. Menu → Widget appearance still works (edit path regression).

Jim brief: `docs/jim-brief-widget-configure-on-drop.md`

### 20e. Match system — Material You (FB-38)

Automated:

```bash
node qa/widget-theme-palettes.mjs
```

**Manual (Android 12+):**

1. Menu → **Widget appearance** → **Match system** → swatch shows live wallpaper colours (not light/dark split).
2. Change wallpaper → widgets repaint within ~1 refresh cycle.
3. Toggle system dark mode → widgets repaint; swatch updates when reopening appearance.
4. API 26–30 device/emulator → Match system uses Default preset (no crash).

Jim brief: `docs/jim-brief-widget-material-you-system.md`

### 20f. Jetpack Glance + blend-first appearance (FB-40)

Automated:

```bash
node qa/widget-theme-palettes.mjs
node qa/widget-appearance-setup.mjs
```

**Manual (Android):**

1. Widget appearance shows **Blend in / Match wallpaper / Brand teal** — no 8-preset grid.
2. Default = **Blend in** (transparent-friendly).
3. Blend: opacity + transparent controls; wallpaper/brand hide slider.
4. Wallpaper mode uses Monet on API 31+ device.
5. Legacy `widgetThemeId` migrates without crash.

Jim brief: `docs/jim-brief-widget-glance.md`

### 28. Menu layout (two tiers)

1. Open **Menu**.
2. **Expect:** Title **Menu** only — no Near me / My Journeys subtitle.
3. **Expect:** **Widget** block (Android only) with **Add home screen widget** and **Widget appearance** underneath; hidden on web.
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

### 34. Unsupported region (outside Perth rail)

```bash
node qa/unsupported-region.mjs
```

**Manual (Android adb):**

1. Set location far from WA (e.g. Sydney). On API 35 emulators, plain `adb emu geo fix` often returns OK without updating fused GPS — use:
   ```powershell
   .\scripts\emulator-set-location.ps1 -Latitude -33.8688 -Longitude 151.2093
   ```
   Or Android Studio → Emulator **…** → **Location** → **Single point** (latitude / longitude fields).
2. Open app with no saved journeys → **Near me**.
3. **Expect:** Hero **Perth rail only**; no direction chips or departures board. **My Journeys** CTA opens journey mode / setup.
4. Deny location → existing permission / station-picker UX (not Perth rail only).
5. Set Perth location → **Near me** loads normal nearby board.

Jim brief: `docs/jim-brief-unsupported-region.md`

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

**Expect:** `repaintSnapshot_showsDegradedWhenUpdatingRetryExhausted`, `repaintSnapshot_retriesOnceBeforeDegraded`, `repaintSnapshot_showsDegradedWhenRefreshAgeExceeded`, `degradedPrimary_keepsCountdownWhileDepartureStillFuture`, `needsLocalRepaint_trueWhileUpdating`, `compactPrimary_shortensUpdatingForNarrowWidget` all pass.

**Manual (emulator/device):**

1. Pin widget; let a departure pass without network → brief **Updating…** / **Fetching…** (2×1 primary shows **…**, not clipped **Upd**).
2. After ~90s without network → one automatic retry, then degraded: **last train clock** (if &lt;20 min past) or **Open** + **Open app** / **Times may be out of date** — never **—** / **Tap app**.
3. **Tap widget** → app opens within ~1s and triggers refresh (`onResume` / `onNewIntent`).
4. **Near me idle widget** tap → app opens **Near me** (`nexttrain://nearby` deep link).
5. Restore network → widget recovers next train.

Jim brief: `docs/jim-brief-widget-phase-a-trust.md` (supersedes stuck-updating brief for degraded copy)

### 20. Stickiness coach gating (logic regression)

Pure Node — **no browser**, no `npm start`:

```bash
node qa/stickiness-coaches-logic.mjs
```

**Expect:** `10 PASS · 0 FAIL`. Mirrors stagger rules in `docs/jim-brief-stagger-stickiness-coaches.md`. Reminder coach only if user **Skipped** the template wizard **and** no journey has Reminder on; silenced if Reminder already on.

| Automated case | Rule under test |
|----------------|-----------------|
| open 1: no widget | 1st app open — widget coach **not** eligible |
| open 2: widget pending | 2nd open — widget coach **eligible** |
| open 2: no reminder while widget pending | Reminder coach **blocked** while widget arc unfinished |
| open 3: reminder after skip + widget done | 3rd open + widget `done` + **Skipped** tour — reminder coach **eligible** |
| open 3: no reminder coach if wizard completed | Finished tour with **Got it** — coach **not** shown |
| open 3: silence reminder coach if already on | Any journey `remindMe` → coach **not** shown |
| widget snoozed blocks reminder | Widget `snoozed` (within 7-day window) — reminder **blocked** |
| weekday after config day opens reminder gate | First **weekday** (Mon–Fri Perth) **after** config calendar day opens reminder OR-gate |
| same config day weekday does not open gate | Config day itself — weekday gate **closed** |
| second not now exhausts coach | After snooze expires, one more show; 2nd **Not now** → `exhausted`, no auto-show |

**Manual (Android, optional):** End-to-end coach UI is **not** covered by this script. After `cap:sync`, cold-launch on device:

1. **Session 1** — save first Journey → **no** widget or reminder auto-coach that session.
2. **2nd cold open** — widget coach only (if not done and **no** widget pinned yet).
3. **3rd cold open** (widget resolved) — leave-reminder coach only; **not** stacked with widget same session.

If a Next Train widget is **already on the home screen**, the widget coach must **not** appear (coach marked `done` via native `getWidgetInstanceCount`).

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
node qa/reminders-permission-gate.mjs
```

**Expect:** `PASS` — Menu has **no** Reminder settings sheet. Pause reminders lives in Menu (when a journey has Remind me). Journey detail order: Route → **Timing** → **Target train** (+ Remind me / Live countdown when target set).

**Permission gate (web, mocked native):** `node qa/reminders-permission-gate.mjs` — Remind me / Live countdown cannot stay on without notification permission; deny shows hint; grant then toggle works; heal clears orphan Live countdown when permission is later denied.

**Native emulator CDP (optional):** with debug WebView attached,

```bash
node qa/reminders-permission-native-cdp.mjs
```

| Platform | Expect in dialog |
|----------|------------------|
| **Web** (`localhost`) | Hint: *Leave reminders are available in the Android app.* Native controls **hidden**. |
| **Android** (after `cap:sync`) | Empty state: lead line + card (*No leave alerts on yet* / *No journeys yet*) + **Open My Journeys** CTA. When ≥1 Reminder on → armed lead + schedule + **Early Reminder** + **Pause reminders** directly. No master toggle. No journey cards. |

**Journey detail (Android):**

1. Open a journey → order is Route → **Timing** → **Target train** (Remind me / Live countdown appear when a target is set).
2. Set **Target train**, turn **Remind me** on → Live countdown available; permission prompt on first enable.
3. Save with Remind me on but no target → blocked with clear error.
4. Save with Remind me on + target → native `enabled` heals on.

**Manual (Android) — Early Reminder / Pause:**

1. With Reminder live → turn **Early Reminder** on → **5 / 10 / 15** chips appear; tap **10** → reschedule uses 10 min offset.
2. **Pause reminders** → tap **1 day** → status **Paused until …** + **Resume reminders**; schedule line matches.
3. Tap **Custom** → days field appears; set e.g. **5** → **Set** → chip reads **5 days**, status **Paused until …**.
4. Tap **Resume reminders** → pause clears; next-reminder line returns.
5. **Timed auto-resume:** set `pauseUntil` in the past (or wait for expiry) → open app or Reminder settings → pause cleared without manual resume (native `getSchedule` / `getSettings` path).

**Manual (Android) — core:**

1. Configure a journey (e.g. Morning into town).
2. **Menu** → **Reminder settings**.
3. **Expect:** dialog opens (not silent no-op).
4. With no Reminder on any journey → lead line + empty card + **Open My Journeys** (opens Journeys, dismisses dialog).
5. Turn **Remind me** on in journey detail → Early Reminder + Pause appear in Reminder settings.
6. **Done** dismisses immediately.

**Done double-tap (web):**

```bash
node qa/done-double-tap-repro.mjs
```

**Expect:** All scenarios `PASS (1 Done closes all)` — Menu, Menu→Reminders→Done, after Journeys activity.

**Manual (Android):** Reminder on without preferred train → inline error (not silent first tap); fix time → **Done** once closes.

Jim brief: `docs/jim-brief-done-double-tap.md`

**Known bug (2026-08-10):** If **Reminders** does nothing, check console for `DEFAULT_REMIND_DAYS has already been declared` — `leave-reminders.js` fails to load (duplicate `const` in `app.js` + `leave-reminders.js`). Until fixed, `window.nextTrainLeaveReminders` is undefined.

### 22. Widget homescreen — times & refresh (Android manual)

**Not automatable** on the launcher (no Playwright for pinned widgets). Run on device after `cap:sync` with a **configured journey** and widget pinned.

**Read the widget:**

| Line | Meaning |
|------|---------|
| Big number (`12 min` / `NOW`) | Minutes until **live** departure (from last good fetch + local repaint) |
| Small clock (`09:13`) | **Scheduled** platform time — not “next train in the timetable at 9:13” by itself |
| Leave line (`Leave in` / `Leave now`) | Through **1 min** after leave-by show **Leave now**; then **hide** leave — never `Leave N min ago` |
| `Updated …` | **Medium+** only — full line (`Updated just now`, etc.). **2×1** omits Updated and shows **station** instead |

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

**Pin checklist (v2.2.0 — manual on device):**

Run after `cap:sync` with widget pinned (**2×1** and **medium** if you use both). Compare app and widget at the same moment.

| Check | Journey mode (FB-20) | Near me pin (FB-14) |
|-------|----------------------|---------------------|
| Face | Hero + widget show **pinned** train (default = Preferred target in Active hours), not every true-next | Widget shows **pinned** departure + leave-by; pin **beats** journey Active hours |
| Countdown | Big number matches app hero (±1 min) | Same |
| Leave line | Leave in / Leave now matches app leave card when armed | Leave-by uses **Time to station** buffer from pin session |
| Override | Pin another train → widget follows **today only**; Preferred in settings unchanged | Unpin / hold expiry → widget returns to journey or idle face |
| Secondary | App may show **Next** when true next ≠ pin; widget stays on pin | — |
| Clipping | Full primary + inline clock on **2×1**; no `Upd` / truncated `Updated …` on medium | Same |

**Fail:** widget still on old train after pin change; journey face ignores Preferred pin; clipped clock or Updated line (see regressions above).

**Automated helper (logic only, not launcher UI):**

```bash
./gradlew :app:testDebugUnitTest --tests com.tdrevans.nexttrain.CommuteScheduleTest --tests com.tdrevans.nexttrain.WidgetUiBuilderTest --tests com.tdrevans.nexttrain.WidgetUiBuilderRobolectricTest
```

Also run via `npm run test:pre-release` (widget JVM tests; skips if Java not installed locally). CI runs the full Android unit suite on every PR.

Covers local repaint, compact strings, and **Robolectric widget bind regression** (fixture snapshots → RemoteViews text/visibility + layout id smoke checks on 2×1 + medium) — not launcher pixels. See **FB-28**.

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
2. Same journey detail → **Reminder** section has **Reminder** toggle + **Preferred train** (no day chips on Reminder).
3. **Menu → Reminder settings** has no per-journey cards — only schedule / Early Reminder / Pause when a Reminder is on.
3. Mon–Fri journey with active hours covering “now” on a **weekday** → main screen auto-shows that journey (or stays on it).
4. Same journey on **Saturday** (in active hours) → defaults to **Near me** unless user picks the journey manually.
5. Deselect all active days → **Save** → alert **Pick at least one active day.**
6. Two journeys, same hours, **Sat–Sun** vs **Mon–Fri** → **Save** allowed. Same hours + overlapping days → overlap error.

Jim brief: `docs/jim-brief-active-days-display.md`

### 35. Station picker — list-first (journey detail + Near me)

Automated:

```bash
node qa/station-typeahead.mjs
```

**Manual:**

1. **My Journeys → Custom** (or edit journey) → tap **Departure station** → **station list opens, keyboard stays down**.
2. Tap **Search stations** → keyboard up → type `War` → **Warwick** in list → pick → **Direction of travel** loads.
3. While list is open on journey detail: **Cancel / Save / Delete footer hidden**; returns after pick or dismiss.
4. **Use nearest station** still fills the field and loads directions.
5. Clear station → **Save** → blocked until a station is chosen.
6. **Near me** with slow GPS → **Don't wait** → same list-first / Search pattern; **Show departures** works.

Jim brief: `docs/jim-brief-station-picker-list-first.md` (supersedes type-first open in `docs/jim-brief-station-typeahead.md`)

### 36. Widget 2×1 empty-leave layout (Android manual)

**Not automatable** on the launcher. Rebuild APK after native changes.

1. Pin widget at default **2×1** with a configured journey in active hours.
2. **Leave showing:** Right column = **Leave in** + **station** underneath. **No** Updated line (never bare **Just now**).
3. **Leave hidden** (after grace): leave line gone; **station** still readable on the right — not a lonely freshness crumb.
4. Resize wider/taller to **medium:** full **Updated just now** / **Updated 3m ago** returns with station.
5. Countdown on 2×1: **large digit(s)** + small **min** unit (e.g. `5` + `min`); **NOW** stays one word.

**Automated (logic only):**

```bash
cd android && ./gradlew :app:testDebugUnitTest
```

Jim brief: `docs/jim-brief-widget-empty-leave-layout.md`

### 38. Widget Phase B — advance reliability (Android)

**Automated (JUnit):**

```bash
cd android && ./gradlew :app:testDebugUnitTest --tests "com.tdrevans.nexttrain.CommuteScheduleTest" --tests "com.tdrevans.nexttrain.PerthTimeTest"
```

**Expect:** `needsLocalRepaint_trueForFarFutureCountdown`, `resolveFollowingTrip_*`, `shouldOpportunisticRefresh_*`, `needsPreDeparturePrefetch_*`, `minutesUntilWallClock_statusBarExample_843To856` pass.

**Manual — wall-clock alignment (B0):**

1. Pin widget with train **90+ min** out (e.g. status bar `8:43`, train clock `9:56` → primary **`13`**).
2. Watch status bar minute roll → widget **X min** drops within ~1 min (or immediately on unlock/tap).
3. Do **not** expect sub-minute precision — wall-clock minutes only.

**Manual — departure advance (B1/B2):**

| Case | Expect |
|------|--------|
| Departure passes, following cached, airplane briefly | Promote locally → live next train |
| Departure passes, no following, network OK | Updating → live next within ~90s (Phase A) |
| Departure in ≤3 min, following thin | Background prefetch warms cache before minute rolls |

**Manual — opportunistic refresh (B3):**

- Live commute, phone unlocked, network data **12+ min** old → widget refreshes without waiting for 15‑min alarm alone.

**Doze note:** `setExactAndAllowWhileIdle` at Perth minute boundaries can slip under deep Doze; unlock/tap/`USER_PRESENT` repaints from cache immediately then refreshes.

Jim brief: `docs/jim-brief-widget-phase-b-advance.md`

### 39. Widget Phase C — trust polish (Android)

**Automated (JUnit):**

```bash
cd android && ./gradlew :app:testDebugUnitTest --tests "com.tdrevans.nexttrain.WidgetUiBuilderTest" --tests "com.tdrevans.nexttrain.CommuteScheduleTest.repaintSnapshot_hidesUpdatedLineWhileFetching"
```

**Expect:** `resolveMediumUpdatedLine_*` pass; Updating state has empty `updatedLine` (no conflicting Updated while Fetching).

**Logcat (Tim builds):**

```bash
adb logcat -s NextTrainWidget
```

Look for `refresh start`, `refresh done`, `paint reason=` lines with `primary`, `secondary`, `stale`, `refreshedAtMs`, `following`.

**In-app debug panel (`?widgetDebug=1`):**

1. Open app with `?widgetDebug=1` on the URL (debug builds / sideload).
2. **Menu → Help** — one-line monospace panel shows cached widget snapshot fields.
3. Panel hidden without the flag (not shown to normal users).

**Manual — medium stale copy:**

| State | Medium Updated line |
|-------|---------------------|
| Fresh | `Updated just now` / `Updated Nm ago` |
| Degraded | **Times may be out of date** + secondary **Open app** |
| Fetching | Updated **hidden** (only **Fetching next train…**) |

Jim brief: `docs/jim-brief-widget-phase-c-polish.md`

### 40. Widget outside hours — designed idle / next commute (Android)

**Automated (JUnit):**

```bash
cd android && ./gradlew :app:testDebugUnitTest --tests "com.tdrevans.nexttrain.NextCommutePreviewTest" --tests "com.tdrevans.nexttrain.CommuteScheduleTest.outsideHoursSnapshot_showsNextCommutePreview" --tests "com.tdrevans.nexttrain.CommuteScheduleTest.needsLocalRepaint_falseForOutsideHoursIdle"
```

**Expect:** `findNext_fridayEveningJumpsToMondayMorning`, `outsideHoursSnapshot_showsNextCommutePreview`, `needsLocalRepaint_falseForOutsideHoursIdle` pass.

**Manual — midday with Morning + Evening journeys:**

1. Rebuild/install APK after `cap:sync`.
2. Pin widget at **12:00** (no journey in Active hours).
3. **Expect:** Label **NEXT COMMUTE**; primary like **Today 15:00–18:00** or **Today 7:30** (preferred train); route on secondary line; **no** live **N min** countdown; **no** **Updating…** / **Fetching…**.
4. Tap widget → app opens **Near me** (`nexttrain://nearby`).
5. Enter Active hours (or wait until window) → widget switches to live countdown within one refresh/paint.
6. Leave Active hours → preview returns immediately (no stuck Fetching).
7. **No journeys** → calm **NEAR ME** / **See trains near you** idle.

Jim brief: `docs/jim-brief-widget-designed-idle.md` (supersedes `docs/jim-brief-widget-nearby-live-cache.md`)

### 41. Maestro Android smoke (device / emulator)

Jim brief: `docs/jim-brief-maestro-android-qa.md` · setup: `qa/maestro/README.md`

**Prereqs:** debug APK installed (or Play closed build); Maestro CLI; Android emulator or device (`adb devices`).

```bash
npm run cap:sync
cd android && ./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
npm run test:maestro
```

**Flows:**

| Flow | Covers |
|------|--------|
| `smoke-app-opens` | Cold start → nearby board (`Near you` / `Near me`) |
| `journeys-dialog` | Debug seed deep link → **My Routes** / **My Journeys** chrome → double-tap **My Journeys** → **Journeys** library list |
| `menu-reminders` | Menu → **Reminder settings** → **Done** |
| `widget-face` | Home widget tap → app foreground (pin widget once; see README) |

Complements §22 widget manual matrix — does not replace stale-face / clipping checks (JVM + manual).

### 44. Device smoke sheet (Play closed test)

**Doc:** `docs/DEVICE-SMOKE.md`

Run after every Play closed-test upload: **15 checks in ~30 min** on a **Play install** (not local debug APK). Covers cold start, journeys, widget face, IAP, reminders readout, outside-hours idle, version.

Reminder **notification delivery** on Play: schedule readout only (**11a**). For ~60s alarm proof use debug APK fast-test (**11b** / TESTING §19b).

### 42. Adelaide provider probe (adapter only — not live)

Jim brief: `docs/jim-brief-adelaide-provider.md`

1. `assertCityLive("adelaide")` still returns **501** (`status: planned`, `adapterReady: true`).
2. `npm run probe:adelaide -- Adelaide` → JSON board with upcoming rail trips (no API key required).
3. `npm run probe:adelaide -- --list` → catalog station names.
4. Dev board: `GET /api/dev/board?city=adelaide&station=Adelaide` with `ALLOW_CITY_PROBES=1`.
5. `/api/next-train?city=adelaide&station=…` still **501** on production paths.

### 42b. Adelaide route conformance (offline)

Luke pack + Jim D2–D6. City stays `planned`. Perth, Sydney, and Brisbane live-gates unchanged. No generator.

1. `node qa/adelaide-line-map-conformance.mjs` — C0–C7 vs `qa/fixtures/adelaide/published-network.json` + `lib/cities/adelaide/line-map.json`. No network.
2. Hub locked as **Adelaide Railway Station**. Chips are **line + terminus** (`Belair line Belair`).
3. Port Dock is a seventh printed TRAIN line. Tonsley is a Flinders station, not a line.
4. `assertCityLive("adelaide")` still fails.
5. H2: public GTFS + GTFS-R need no key. H7: `Australia/Adelaide` has DST.
6. Live sweep (not CI): `npm run sweep:adelaide` — every catalog station to `qa/reports/adelaide-sweep-*.json`. Excluded from `qa/run-all.mjs`.
7. Sideload: `docs/mark-dogfood-adelaide.md`. `node qa/adelaide-dogfood-gate.mjs`.

### 43. Canberra provider probe (adapter only — not live)

Jim brief: `docs/jim-brief-canberra-provider.md`

1. `assertCityLive("canberra")` still returns **501** (`status: planned`, `adapterReady: true`).
2. Without ACT credentials: `npm run probe:canberra -- Gungahlin` exits with a clear message.
3. With `ACT_GTFS_BASIC` or `ACT_GTFS_CLIENT_ID` + `ACT_GTFS_CLIENT_SECRET`: probe returns light-rail departures.
4. `npm run probe:canberra -- --list` → catalog station names (no keys required).
5. Dev board: `GET /api/dev/board?city=canberra&station=Gungahlin` with `ALLOW_CITY_PROBES=1` + ACT env; without keys → **503**.
6. `/api/next-train?city=canberra&station=…` still **501** on production paths.

### 37. Near me — cached last station (P1)

Automated:

```bash
node qa/nearby-cache-last-station.mjs
```

**Manual:**

1. Open Near me once with location → board loads for nearest station.
2. Close app, reopen (or tap **Near me** again) → **same station’s departures** start loading immediately (route shows station name; hero **Loading departures…**, not only *Finding your nearest station…*).
3. GPS refines in background — distance km appears when ready; if nearest changed, board swaps quietly (*Updated to nearest station*).
4. First install / `?reset=1` → no cache → original locate UX + **Don't wait** at ~7s.
5. Manual station pick via Don't wait → saved to cache; late GPS must not overwrite pick.

Jim brief: `docs/jim-brief-nearby-cache-last-station.md`

### 17–19. Leave reminders v2 (native scheduling)

Plan: `docs/qa-leave-reminders-v2-testing.md` · device sheet: `docs/DEVICE-SMOKE.md`

- **17** — Superseded by **21** for Menu UI; native plugin mocks optional  
- **18** — `PreferredTrainReminder` JUnit + `LeaveReminderFastTestTest` (`./gradlew :app:testDebugUnitTest`)  
- **19** — Android device roleplay (Jim brief §4: no 5:50 spam, one ping ~7:15, no Saturday)  
- **19b** — **Fast-test** (debug APK): `nexttrain://test/reminder-fast` → notification ~60s — `docs/DEVICE-SMOKE.md` §11b

### 20. Commute strip notification (non-FGS)

Jim brief: `docs/jim-brief-commute-strip-notification.md`

1. **Journey detail → Remind me on** → Early Reminder + Shade countdown visible under Remind me.
2. **Menu** → **Pause reminders** only when a journey has Remind me (no Reminder settings row).
3. Strip **on**, remind morning in window → ongoing shade notif without opening app; **no** FGS.
4. Strip **off** → no commute strip notif; leave reminders still work if enabled.
5. **Dismiss** on strip → notif clears; strip toggle still on; reminders unchanged.
6. Window start: Early Reminder **on** → strip from early offset before leave-by; Early **off** → strip from leave-by. End: departure + ~10 min grace or 90 min from start (whichever sooner).
7. `CommuteStripSchedulerTest` JUnit for start/end math.

### 21. Crash reporting + min analytics (config-gated)

Jim brief: `docs/jim-brief-crash-analytics.md`

1. Default build: `sentryDsn` empty in `site-config.json` → no Sentry init; `window.NextTrainAnalytics.isEnabled()` false.
2. Paste release DSN into `site-config.json` → rebuild (`npm run cap:sync`) → cold start sends session to Sentry; events as breadcrumbs (`journey_saved`, `reminder_enabled`, `api_error_shown`, `iap_*`, `widget_pin_requested`).
3. **Debug only:** with DSN set, in WebView console run `await window.NextTrainAnalytics.testCrash()` → confirm event in Sentry (not on production user builds).

### 22. Brisbane provider probe (adapter only — not live)

Jim brief: `docs/jim-brief-brisbane-provider.md`

1. `assertCityLive("brisbane")` still returns **501** (`status: planned`, `adapterReady: true`).
2. `npm run probe:brisbane -- Central` → JSON board with upcoming rail trips (ISO departures, destination, platform).
3. `npm run probe:brisbane -- --list` → catalog station names.
4. **Sideload dogfood (not Play):** `docs/mark-dogfood-brisbane.md`. Debug APK uses the **same Near me / chips / hero UI** as Perth against this PC (`npm run dev` + `ALLOW_CITY_PROBES=1`). Vercel `/api/next-train?city=brisbane` stays **501**. `/api/dev/board` on Vercel always **404**.
5. `/api/next-train?city=brisbane&station=…` still **501** on production paths. Release/Play has no BNE control.
6. Perth `/api/next-train` unchanged (default city).

### 22b. Brisbane route conformance (offline)

Jim brief: `docs/jim-brief-brisbane-route-conformance.md`

1. `node qa/brisbane-line-map-conformance.mjs` — C1–C7 vs `published-network.json` + `line-map.json`. No network.
2. C2/C3 extras must be listed in `DOCUMENTED_STATION_DIFFS` (and `line-map.json` `coverageGaps`). Do not guess which oracle is right.
3. `LABEL_EXPECTATIONS`: Central locked at **12 chips** (Luke) — T1 Caboolture/Ipswich, T2 Kippa-Ring/Springfield Central, T3 Doomben/Roma Street, T4 Cleveland/Shorncliffe, T5 Brisbane Airport/Varsity Lakes, T6 Beenleigh/Ferny Grove. Nests (Rosewood, Nambour, Gympie North) are not extra Central chips. Exhibition suppressed.
4. `assertCityLive("brisbane")` still fails. Perth `qa/perth-static-directions.mjs` unchanged.
5. Live sweep (not CI): `npm run sweep:brisbane` — every catalog station, S1–S6 anomalies to `qa/reports/brisbane-sweep-*.json`. Optional `--time=am-peak|midday|pm-peak|late` `--day=weekday|sat|sun`. Excluded from `qa/run-all.mjs`.
6. **Before commit:** `npm run sweep:brisbane -- --time=am-peak --day=weekday` on a **real weekday morning**. That run stresses Doomben, through-running, and S3. Clean, or the same “one RT past the board” S5 pattern, is enough. City stays `planned`. Perth `qa/perth-static-directions.mjs` must stay green.

### 23. Sydney provider probe (adapter only — not live)

Jim brief: `docs/jim-brief-sydney-provider.md`

1. `assertCityLive("sydney")` still returns **501** (`status: planned`, `adapterReady: true`).
2. Without `TFNSW_API_KEY`: `npm run probe:sydney -- Central` exits with a clear message (no silent empty board).
3. With key: `TFNSW_API_KEY=... npm run probe:sydney -- Central` → JSON board with upcoming Trains/Metro trips.
4. `npm run probe:sydney -- --list` → catalog station names (no key required).
5. Dev board (optional): `GET /api/dev/board?city=sydney&station=Central` with `ALLOW_CITY_PROBES=1` + `TFNSW_API_KEY` on server; without key → **503** with message.
6. `/api/next-train?city=sydney&station=…` still **501** on production paths.

### 23b. Sydney route conformance (offline)

Luke pack + Jim D2–D6. City stays `planned`. Perth and Brisbane live-gates unchanged.

1. `node qa/sydney-line-map-conformance.mjs` — C1–C7 vs `qa/fixtures/sydney/published-network.json` + `lib/cities/sydney/line-map.json`. No network.
2. C2/C3 extras must be listed in `DOCUMENTED_STATION_DIFFS` (and `line-map.json` `coverageGaps`). Do not guess which oracle is right.
3. `LABEL_EXPECTATIONS`: Central = line + terminus chips (T1 Berowra / Emu Plains / Richmond, T2 Leppington / Parramatta, T3 Liverpool / Lidcombe, T4 Bondi Junction / Cronulla / Waterfall, T8 Macarthur, T9 Gordon / Hornsby). **Central Metro** is M1 Tallawong / Sydenham only. City Circle is not a terminus.
4. Catalog split: Central / Martin Place / Epping / Chatswood / Sydenham vs `* Metro` — disjoint `stopIds`.
5. `assertCityLive("sydney")` still fails.
6. Live sweep (not CI): `npm run sweep:sydney` — every catalog station, S1–S6 anomalies to `qa/reports/sydney-sweep-*.json`. Needs `TFNSW_API_KEY`. Excluded from `qa/run-all.mjs`.
7. H7: `Australia/Sydney` has DST — do not copy Brisbane no-DST.

### 23c. Sydney sideload city UI (not live)

`docs/mark-dogfood-sydney.md`. Debug APK + `npm run dev` + `ALLOW_CITY_PROBES=1`. Settings / first-launch city picker. Geolocate is a hint. Saved city persists. Ask once on mismatch; never silent-switch. Local `/api/next-train?city=sydney` uses the same hero/chips as Perth (`T1 Emu Plains`). Production next-train stays **501**. `/api/dev/board` on Vercel stays **404**. No `ALLOW_CITY_PROBES` on Vercel. Leave Melbourne/Adelaide/Canberra out. `node qa/sydney-dogfood-gate.mjs`.

### 24a. Stockholm provider (catalog / planned — not live)

D1 pack: `docs/stockholm-d1/` (Expansion-room five-file). D2 fixture is a verbatim copy at `qa/fixtures/stockholm/published-network.json`. Not generated from GTFS.

1. `assertCityLive("stockholm")` still returns **501** (`status: planned`, `adapterReady: true`).
2. Picker: country **Sweden** (`se`) → **Stockholm (Coming Soon)**. No live board. Do not invent `city=sweden`. Do not merge Göteborg / Malmö.
3. Hub lock: **T-Centralen** (metro) ≠ **Stockholm City** (pendeltåg Citybanan) ≠ **Stockholms central** (SJ, not pickable).
4. Line 48 does not through-run City. Direction is line + terminus (`Röda linjen + Norsborg`), not inbound/outbound.
5. `node qa/stockholm-planned-gate.mjs` and `node qa/stockholm-line-map-conformance.mjs` — offline. Perth / Amsterdam / `LIVE_CITY_IDS` / `MULTI_CITY_IDS` untouched.
6. Mark probes in those tests: T-Centralen, Stockholm City, Stockholms central (negative), Odenplan pair, Slussen, Fridhemsplan, Östermalmstorg, Arlanda central, Södertälje centrum, Hjulsta, Norsborg.
7. Probe (optional, not CI): `npm run probe:stockholm -- "T-Centralen"` uses SL Transport (no key). Trafiklab GTFS Sweden keys exist on Vercel as `TRAFIKLAB_GTFS_SWEDEN_KEY` / `TRAFIKLAB_GTFS_SWEDEN_RT_KEY` (env names only).
8. Live sweep (not CI): `npm run sweep:stockholm`. `/api/next-train?city=stockholm&station=…` stays **501**. Melbourne stays planned. Do not wire UK NR.

### 24. Melbourne provider probe (adapter only — not live)

Jim brief: `docs/jim-brief-melbourne-provider.md`

1. `assertCityLive("melbourne")` still returns **501** (`status: planned`, `adapterReady: true`).
2. Without `PTV_DEVID` / `PTV_API_KEY`: `npm run probe:melbourne -- "Flinders Street"` exits with a clear message.
3. With keys: probe returns metro departures with ISO times, destination, optional platform.
4. `npm run probe:melbourne -- --list` → catalog station names (no keys required).
5. Dev board: `GET /api/dev/board?city=melbourne&station=Flinders%20Street` with `ALLOW_CITY_PROBES=1` + PTV env; without keys → **503**.
6. `/api/next-train?city=melbourne&station=…` still **501** on production paths.

### 25. Founding Pro (widget + no ads)

Jim brief: `docs/jim-brief-founding-pro.md` · design: `public/design/founding-pro.html`

1. Menu **Try the widget** when no trial (`free_no_trial`); **Unlock Pro** after trial expiry.
2. First widget add → founding claim or **30-day trial** sheet (non-blocking).
3. Trial nudge (day **21–25**; firm at day 30) dismissible via **Not now** in Menu.
4. After trial without purchase: widget shows **Widget paused** + **Unlock Pro** (not Updating/stale).
5. Paywall: one-time, restore, benefits = widget + no ads.
6. Free in-app leave-by still works with ads when trial expired.

### 45. Pin exclusivity & tab transitions (automated)

Product rules: **`docs/pin-behavior.md`** (one global pin; tab transitions; hold semantics).

```bash
node qa/pin-behavior.mjs
```

**Expect:** 12× **PASS** — journey pin clears nearby/route; route pin dismisses target; nearby pin dismisses target; `enterJourneyMode` does not re-pin dismissed target; persisted nearby survives `exitNearbyMode`; page load keeps `holdingUntilMs` pin; reconcile keeps nearby over journey pins; dismissed target on true next stays **Next Train**; dismissed target on preferred slot shows **Target train** chrome; **enterJourneyMode** selects pinned commute journey.

Included in release gate:

```bash
npm run test:web:release
```

Related pin tests (also in release gate):

```bash
node qa/pin-swipe-notify.mjs      # swipe + Next Train + pin advance matrix
node qa/pin-resolution-fixtures.mjs --validate-only
```

**Manual (optional):** Target train pinned → pin in **Near me** → **My Journeys** shows only nearby pin active (target dismissed). Unpin target → **Near me** → **My Journeys** → target stays unpinned.

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
2. **Expect:** Inline error under Active hours: *Only one journey can be active at one time. These hours overlap …* plus **Fix for me** chip. Invalid window not saved. **Fix for me** keeps the journey you’re saving and minimally adjusts the other.

### 32. Widget already on home screen (Android manual)

1. **No widget** → Menu → **Add home screen widget** → pin-first copy; **Add widget** primary.
2. **≥1 widget pinned** → same Menu row → *You already have a Next Train widget…* + long-press tip; **Done** primary, **Add another** secondary (still pins).

Jim brief: `docs/jim-brief-widget-already-have.md`

### 33. Journey overlap — Fix for me

1. Two journeys with the same Active hours (e.g. both **15:00–18:00**) on shared days → Save second journey.
2. **Expect:** Inline overlap error; **Fix for me** keeps the editing journey at **15:00–18:00** and adjusts the *other* journey (e.g. to **12:00–15:00**), with a confirmation line.
3. Save succeeds; editing journey hours unchanged. Never snaps the editing journey to **06:00–09:00**.

Jim brief: `docs/jim-brief-journey-overlap-friendly.md`

### 11. Settings — Save vs Done

1. Edit leave-before minutes, tap **Done** without Save, reopen journey.
2. **Expect:** Value unchanged. After **Save**, value persists.

### 14. Live API (optional)

1. Open `http://localhost:3000/?reset=1&station=Edgewater%20Stn&direction=Perth` (no `fixture`).
2. **Expect:** Real Transperth times load. Countdowns change over time.

## Testing agent prompt

Paste into a **fresh** Cursor agent chat (not the coding session):

> You are a QA agent. Follow `TESTING.md` in this repo. Run `npm start` if needed. Execute smoke tests 1–11, 13, 15 (web), **16** (`node qa/button-visibility.mjs`), **20** (`node qa/stickiness-coaches-logic.mjs`), **21** (`node qa/reminders-dialog.mjs`), and **45** (`node qa/pin-behavior.mjs`). Use fixture URLs with `test=1` where noted. Output a table: test #, PASS/FAIL, notes. Do not fix code unless I ask.

## iOS (Capacitor) — Mac test setup

**Install once on this Mac:** Xcode, Node 22 (`nvm use 22`), `npm install`, [Maestro CLI](https://maestro.mobile.dev) (`curl -Ls "https://get.maestro.mobile.dev" | bash`), Safari **Develop** menu enabled (Safari → Settings → Advanced → *Show features for web developers*).

**No Android Studio / adb needed** for iOS QA.

### Daily workflow

| Step | Command | When |
|------|---------|------|
| 1. Web smoke | `npm run test:smoke` | Every `public/` change (fixtures, fast) |
| 2. Preflight | `npm run test:ios:preflight` | Before simulator run — checks Xcode, Maestro, booted sim |
| 3. Sync + install | `npm run test:ios:maestro -- --install` | After web changes ship to native |
| 4. iOS Maestro NT-6 | `npm run test:ios:maestro` | Repeat simulator smoke |
| 5. Manual NT-6 | Checklist below | Before TestFlight / device sign-off |

The native app uses the **live Vercel API** — web `?fixture=` URLs do not apply in the simulator.

### Automated iOS (Maestro)

Flows live in `.maestro/ios/`:

| Flow | Covers |
|------|--------|
| `01-cold-start-seed` | `nexttrain://test/seed` → Edgewater journey (debug sim only) |
| `02-app-launches` | Chrome visible |
| `03-journeys-sheet` | My Journeys → Add journey → Custom chip (no hang) |
| `04-menu-opens` | Menu → Done |
| `05-seeded-journey-hero` | Seeded route on hero (+ network) |
| `06-near-me` | Near me + location prompt |

```bash
npm run test:ios:preflight
open -a Simulator
npm run test:ios:maestro -- --install   # first time / after code changes
npm run test:ios:maestro                  # repeat runs
npm run test:ios:maestro -- --flow 03-journeys-sheet
```

**Test seed (debug simulator builds only):**

```
nexttrain://test/seed?reset=1&preset=morning&station=Edgewater%20Stn&direction=Perth
```

### NT-6 manual smoke (simulator + device)

Run on **simulator** after Maestro passes; repeat on a **physical iPhone** before TestFlight.

| # | Step | Expect |
|---|------|--------|
| 1 | Launch app | No crash; **Near me / My Journeys / Menu** visible |
| 2 | **Near me** | Location prompt (Allow) or station fallback; departures load |
| 3 | **My Journeys → Add journey → Custom** | Sheet opens; pick station + direction; **Save** |
| 4 | Hero | Route + countdown (live API) |
| 5 | Leave card | Leave-by line visible when journey configured |
| 6 | **Menu → Remove ads** (or Pro) | Store sheet opens (sandbox on device) |
| 7 | Ads | Banner loads (test AdMob in debug) |
| 8 | Force-quit → reopen | Journey data persists |

Sign-off: note simulator/device model + iOS version in `qa/latest.md`.

### Safari Web Inspector (WKWebView debug)

When the app hangs or a sheet fails to appear:

1. Run app in **iOS Simulator**
2. Safari → **Develop** → *Simulator* → **Next Train**
3. **Console** — JS errors (e.g. failed `showModal`, fetch timeouts)
4. **Network** — `/api/next-train` responses
5. **Storage** — `localStorage.nextTrainSettings`

### Build commands (reference)

```bash
nvm use 22
npm run cap:sync:ios
npx cap open ios          # Xcode → ⌘R
# or:
npx cap run ios --target "iPhone 17 Pro"
```

---

## Android / Capacitor

The native app loads the hosted Vercel API — **fixtures do not apply**. After web smoke passes:

1. `npm run cap:sync`
2. Run on device/emulator
3. Manually verify swipe gestures and journey switcher (tests 4–5, 3)
4. **Play closed test:** complete `docs/DEVICE-SMOKE.md` (~30 min, 15 checks)

## Storage keys (for debugging)

| Key | Storage | Purpose |
|-----|---------|---------|
| `nextTrainSettings` | localStorage | Journeys + active journey + `nearbyPin` (see `docs/pin-behavior.md`) |
| `nextTrainSkip:<journeyId>` | sessionStorage | Client-side train skip offset |
| `nextTrainManualJourneyOverride` | localStorage | Manual journey picker override |
| `nextTrainLastNearbyStation` | localStorage | Last successful Near me station (optimistic paint) |
| `nextTrainOnboardingDone` | localStorage | Onboarding coach completed |
| `nextTrainSwipeHintSeen` | localStorage | Swipe hint dismissed |
| `nextTrainAppEngagement` | localStorage | App open count + first journey configured timestamp (stickiness) |
| `nextTrainWidgetCoach` | localStorage | Widget coach status (`pending` / `snoozed` / `done` / `exhausted`) |
| `nextTrainLeaveReminderCoach` | localStorage | Leave-reminder coach status (same shape) |

Clear everything: `/?reset=1` or DevTools → Application → Clear site data.
