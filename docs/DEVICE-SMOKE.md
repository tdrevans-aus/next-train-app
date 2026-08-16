# Device smoke — Play closed test (~30 min)

**Doc ID:** `DEVICE-SMOKE`  
**Owner:** Tim  
**When:** After every Play closed-test upload (and before public promotion)  
**Build:** **Play install only** — install from the closed-test opt-in link, not a local debug APK (except check **11b** below)

**Automated gates first** (do not skip):

```bash
npm run test:pre-release
```

**Related:** `TESTING.md` · `docs/qa-infrastructure-plan.md` · `docs/qa-leave-reminders-v2-testing.md` · `npm run test:maestro` (debug APK)

---

## Setup (~3 min)

| Item | Notes |
| --- | --- |
| Phone | Real device preferred (notifications + widget); emulator OK for chrome-only checks |
| Install | Play closed-test opt-in → install/update from Play |
| Journey | **Morning into town** saved with **Remind me** on, preferred train + active hours |
| Widget | Pin **2×1** on home screen (medium optional) |
| Network | Live Transperth (fixtures do **not** apply in the native app) |

Record in `qa/latest.md`: device model, Android version, `versionName` / `versionCode` from Play or Menu → About.

---

## Checklist (15 checks · ~30 min)

Mark each **PASS** / **FAIL** / **SKIP** with one line of notes.

| # | ~min | Check | Pass criteria | TESTING.md |
| --- | --- | --- | --- | --- |
| **1** | 2 | **Cold start** | App opens to main chrome within ~10s; not stuck on splash | §41 Maestro `smoke-app-opens` |
| **2** | 2 | **Live times** | Hero shows a plausible countdown; refreshes within ~1 min | §2 configured journey |
| **3** | 2 | **My Journeys** | Double-tap **My Journeys** → list or template chips visible | §41 `journeys-dialog` |
| **4** | 1 | **Swipe later** | Swipe left → following train; hero updates | §4 |
| **5** | 2 | **Menu → Reminders** | Menu opens; **Reminder settings** opens; **Done** closes once | §21, §41 |
| **6** | 2 | **Delete not clipped** | Journey detail → **Delete** fully visible (not below dialog fold) | §16 |
| **7** | 3 | **Widget matches app** | Pinned widget countdown ±1 min of app hero; scheduled clock plausible | §22 |
| **8** | 1 | **Widget tap** | Tap widget → app foreground (no stuck “Updating…”) | §31, Maestro `widget-face` |
| **9** | 2 | **Widget layout** | **2×1:** no clipped train clock or `Updated …` truncation | §22 regressions |
| **10** | 2 | **Remove ads** | Menu **Remove ads** → Play sheet **or** clear toast; never silent no-op | §15 |
| **11a** | 2 | **Reminder schedule readout** | Reminders on + permission granted → line like **Next: … · … train** (or honest empty state) | §17–19 |
| **11b** | 3 | **Notification delivery** *(debug only)* | Fast-test path: notification ~60s after enable; tap opens journey — see below | §19 fast-test |
| **12** | 2 | **Outside hours** *(if midday)* | No in-hours journey → **Near me** or widget **NEXT COMMUTE** preview, not stuck Fetching | §13c, §40 |
| **13** | 1 | **No FGS / stray notif** | No persistent foreground service; no surprise ongoing notif (strip only if you turned it on) | LB-15 |
| **14** | 2 | **Background resume** | Home → reopen app → times reload; widget not stuck Updating | §31 |
| **15** | 1 | **Version** | Play / About matches release notes `versionName` + `versionCode` | `docs/release-versioning.md` |

**Total:** ~30 min with setup. Skip **12** when testing during active commute hours.

---

## Check 11 — reminders (Play vs debug)

Web QA cannot prove Android notifications. Use two tiers:

### 11a — Play build (every release)

1. Journey with **Remind me** on.
2. Menu → enable leave reminders → grant **Notifications** if prompted.
3. Open **Reminder settings**.
4. **Pass:** schedule readout shows a concrete next time **or** a clear reason (`wrong_day`, `paused`, `already_fired`, etc.) — not a silent blank when reminders are on.

### 11b — Debug APK fast-test (~60s alarm)

Use **once per release** to prove Receiver → Notifier → tap without waiting until tomorrow morning.

**Prereqs:** debug APK (`assembleDebug`), journey with **Remind me**, notification permission.

**Arm fast-test** (pick one):

```bash
# ADB deep link (debug APK only)
adb shell am start -a android.intent.action.VIEW -d "nexttrain://test/reminder-fast" com.tdrevans.nexttrain

# Or before opening app: sessionStorage.nextTrainReminderTest = "1" (Chrome inspect WebView)
# Or in WebView console: await Capacitor.Plugins.LeaveReminders.setFastTestMode({ enabled: true })
```

**Steps:**

1. Open app → Menu → turn **leave reminders** on (or toggle off/on to reschedule).
2. **Reminder settings** → **Pass:** line like **Test reminder ~… · … train**.
3. Wait **~60s** (phone unlocked or locked — note which you tested).
4. **Pass:** **one** notification; no spam second ping same day after dismiss.
5. Tap notification → app opens on the journey.

**Disable fast-test:**

```bash
adb shell am start -a android.intent.action.VIEW -d "nexttrain://test/reminder-fast?off=1" com.tdrevans.nexttrain
```

Full spec: `docs/qa-leave-reminders-v2-testing.md` §3.

---

## Sign-off

| Gate | Who |
| --- | --- |
| Device smoke sheet complete | Tim |
| Widget trust (LB-02) | Tim — checks **7–9**, **12** |
| Leave reminders (LB-03) | Tim — checks **11a** (+ **11b** when reminder code changed) |

Paste a short summary into `qa/latest.md`:

```text
DEVICE-SMOKE v2.x.x (code N) — Pixel … / Android …
1–15: PASS/FAIL table
Notes: …
```

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-16 | Initial sheet — QA-P2-05; integrates release checklist + fast-test §11b |
