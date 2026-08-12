# Jim brief: Maestro Android QA (device smoke flows)

**For:** Jim (implement)  
**From:** Tim (product) / QA infrastructure plan  
**Date:** 11 Aug 2026  
**Priority:** P2 — **not** blocking closed testing; **before public** sign-off confidence  
**Status:** Shipped (flows + `npm run test:maestro`)

**Related:** `docs/qa-infrastructure-plan.md` (QA-P2-08) · `TESTING.md` §22 widget · `TESTING.md` §41 Maestro · `docs/qa-leave-reminders-v2-testing.md` · `qa/run-all.mjs` (Playwright — keep; Maestro supplements)

**Out of scope:** Appium · iOS Maestro (parallel later) · replacing Playwright web smoke · notification schedule proof (still fast-test + manual)

---

## Summary

Add **Maestro** flows for **native Android** smoke on emulator/device. Playwright already covers web UI in Chrome; Maestro covers **installed APK** (debug or Play closed build): app shell, WebView on device, launcher widget tap, deep links.

**Do not** build Appium. **Do not** duplicate full `qa/*.mjs` regression in Maestro — **3–5 short flows** only.

---

## Goals

| Goal | Maestro | Still manual / other |
|------|---------|----------------------|
| App opens on device with journey times | ✅ flow 1 | — |
| My Journeys dialog opens (double-tap chrome) | ✅ flow 2 | Playwright on web |
| Menu → Reminder settings opens | ✅ flow 3 | `qa/reminders-dialog.mjs` (web) |
| Widget on launcher shows plausible text | ✅ flow 4 (spike) | TESTING.md §22 full matrix |
| Widget tap opens app | ✅ flow 4 | — |
| Notification fires at leave time | ❌ | fast-test mode + device (separate brief) |
| IAP purchase | ❌ | license tester manual |

---

## Deliverables

### 1. Directory layout

```
qa/maestro/
  README.md                 # install Maestro, emulator prep, how to run
  config.yaml               # optional: appId, env defaults
  flows/
    smoke-app-opens.yaml
    journeys-dialog.yaml
    menu-reminders.yaml
    widget-face.yaml        # home screen + optional tap
  scripts/
    seed-debug.sh           # optional: adb seed before flows (see § Seed)
```

### 2. npm script

```json
"test:maestro": "node qa/run-maestro.mjs"
```

`qa/run-maestro.mjs`:

- Check `maestro` CLI on PATH (print install link if missing — do not bundle Maestro in npm)
- Require one device/emulator (`adb devices`)
- Run `maestro test qa/maestro/flows/` (or explicit file list)
- Exit non-zero on failure; print which flow failed

### 3. TESTING.md entry

Add **§41 Maestro Android smoke** (§25 is Founding Pro):

- Prereqs: debug APK installed **or** Play closed build; Maestro CLI; emulator running
- Command: `npm run test:maestro`
- What each flow covers; link `qa/maestro/README.md`
- Note: complements §22 widget manual — does not replace full §22 matrix

### 4. Update `docs/qa-infrastructure-plan.md`

Mark QA-P2-08 **shipped** when flows green on emulator.

---

## App identifiers

| Item | Value |
|------|--------|
| `appId` (Maestro) | `com.tdrevans.nexttrain` |
| Deep links (existing) | `nexttrain://home` · `nexttrain://journey` · `nexttrain://nearby` · `nexttrain://paywall` |
| Debug seed (Option B) | `nexttrain://test/seed?station=…&direction=…&reset=1&test=1` — **debug APK only** |

---

## Flow specs (acceptance)

### Flow 1 — `smoke-app-opens.yaml`

1. `launchApp` (optionally `clearState: false` if using pre-seeded emulator — document in README)
2. Wait for WebView content (timeout generous — cold start + Capacitor)
3. **Assert visible** one of:
   - `Near me` / `Near you` (nearby mode), **or**
   - route text containing `towards` / station name (journey mode), **or**
   - `No journeys yet` (empty — only if seed failed; flow should fail with clear message)

**Pass:** App renders main chrome without crash; not stuck on splash forever.

### Flow 2 — `journeys-dialog.yaml`

1. Launch app (seeded with ≥1 journey — see Seed)
2. Tap **My Journeys** (`android:id` or text `My Journeys` / accessibility from `#journeys-btn`)
3. If dialog not open, tap **My Journeys** again (double-tap pattern — same as `qa/helpers/journeys-dialog.mjs`)
4. **Assert:** journey list **or** template chips visible (`Morning into town`, `Add a journey`, journey name)

**Pass:** My Journeys list/dialog opens reliably on device.

### Flow 3 — `menu-reminders.yaml`

1. Launch app
2. Open **Menu** (`#menu-btn` / aria `Menu`)
3. Tap **Reminder settings** (or `menu-reminders-btn` label)
4. **Assert:** `Reminder settings` title; **Done** visible
5. On web build in emulator, native block may be hidden — flow should target **debug APK** where `Capacitor.isNativePlatform()` is true. Document in README.

**Pass:** Reminders dialog opens; Menu closes.

### Flow 4 — `widget-face.yaml` (spike → keep if stable)

**Prereq:** Widget pinned on test emulator (document one-time setup in README).

1. `pressHome`
2. **Assert** on launcher (widget provider label / widget text):
   - Contains plausible commute text: `min`, `NOW`, `Updating`, station fragment, or `NEAR ME` idle — **not** empty provider crash
3. **Tap** widget (Maestro `tapOn` widget bounds or widget label `Next Train`)
4. **Assert:** app in foreground — route or hero visible within timeout

**Fail gracefully:** If Maestro cannot read widget text on API 34+ launcher, document limitation; keep tap + app-open assertions only.

**Does not replace** TESTING.md §22 post-departure stale / Updated clipping — JVM tests + manual still required.

---

## Seed strategy (pick one — implement A or B)

Maestro cannot use `localhost:3000` fixtures. Flows need a **configured journey** on device.

### Option A — Pre-seeded emulator (minimal code)

README documents:

1. Install debug APK: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
2. Open app once; add **Morning into town** or use existing journey; pin **2×1** widget for flow 4
3. Run Maestro with `clearState: false`

**Jim:** No app code; flows assume data exists. Fastest.

### Option B — Debug seed deep link (preferred if flows need `clearState`)

Add **debug-only** handler (not release):

- URI e.g. `nexttrain://test/seed?fixture=normal&station=Edgewater%20Stn&direction=Perth&test=1&reset=1`
- On load: inject configured journey into `nextTrainSettings` (real Transperth API on device — no localhost fixture)
- Guard: debug APK only (`isDebugBuild` + `BuildConfig.DEBUG` on Android); no-op in release

Maestro preamble:

```yaml
- openLink: nexttrain://test/seed?fixture=normal&station=Edgewater%20Stn&direction=Perth&test=1&reset=1
- launchApp
```

**Shipped:** Option B.

---

## Maestro install (document in README)

Windows / macOS:

```bash
# https://maestro.mobile.dev/docs/getting-started/installing-maestro
curl -Ls "https://get.maestro.mobile.dev" | bash   # mac/linux
# Windows: see Maestro docs (or scoop/chocolatey if available)
maestro --version
```

Emulator:

```bash
adb devices
npm run cap:sync
cd android && ./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
npm run test:maestro
```

---

## CI (optional P2 — do not block this brief)

If flows stable locally for 2 weeks:

- GHA job `maestro` on `ubuntu-latest` with `reactivecircus/android-emulator-runner` OR Maestro Cloud
- Run on **main** nightly or pre-release — **not** every PR initially (slow/flaky)

Document in README; skip CI in first PR if emulator setup is painful.

---

## What Maestro must not do

- Commit Maestro binary to repo
- Fail closed-testing upload if Maestro not run
- Replace `./gradlew :app:testDebugUnitTest` widget logic tests
- Use production AdMob clicks in flows (debug build / test mode OK)

---

## Acceptance criteria

1. `npm run test:maestro` runs 3 core flows (**opens**, **journeys**, **reminders**) green on Android emulator with debug APK.
2. `qa/maestro/README.md` — install, seed (A or B), widget pin steps, troubleshooting (`adb devices`, reinstall APK).
3. TESTING.md updated with Maestro section + command.
4. Flow 4 **widget-face** either passes on emulator **or** README states “tap-only” fallback with reason.
5. No change to release `minifyEnabled` / signing.

---

## QA log

Tim / Mark after merge:

```bash
npm run test:maestro
```

Log PASS/FAIL in `qa/latest.md` with emulator API level + APK source (debug vs Play).

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | Brief created — Maestro Phase 2; Appium explicitly out |
| 2026-08-11 | Shipped — flows, runner, debug seed deep link, TESTING.md §41 |
