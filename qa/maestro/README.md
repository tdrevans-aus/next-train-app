# Maestro Android smoke

Native Android smoke flows for the installed APK (debug or Play closed build). Complements Playwright web tests in `qa/run-all.mjs`.

## Install Maestro

https://maestro.mobile.dev/docs/getting-started/installing-maestro

```bash
maestro --version
```

Windows: follow Maestro docs (installer / scoop / chocolatey).

## Emulator prep

```bash
adb devices
npm run cap:sync
cd android && ./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
npm run test:maestro
```

## Seed strategy

**Option B (default in flows):** debug-only deep link before launch:

```
nexttrain://test/seed?fixture=normal&station=Edgewater%20Stn&direction=Perth&reset=1&test=1
```

- Injects a configured journey into `nextTrainSettings` (real Transperth API on device).
- Ignored on release builds (`BuildConfig.DEBUG` / `isDebugBuild` guard).

**Option A (manual):** open the app once, add **Morning into town**, then run Maestro with `clearState: false` in flows.

## Widget flow (flow 4)

One-time setup on the test emulator:

1. Pin the **2×1 Next Train** widget on the home screen.
2. Run `npm run test:maestro` — `widget-face.yaml` taps the widget and asserts the app opens.

Optional: `npm run test:maestro -- --widget` includes the widget flow (requires pinned widget).

If launcher text is unreadable on API 34+, the flow still asserts app-open after tap (`Next Train` content-desc).

Does **not** replace `TESTING.md` §22 (stale face, Updated clipping, etc.).

## Flows

| File | Covers |
|------|--------|
| `smoke-app-opens.yaml` | Cold start → nearby board visible |
| `journeys-dialog.yaml` | Seed journey → double-tap My Journeys → list |
| `menu-reminders.yaml` | Menu → Reminder settings |
| `widget-face.yaml` | Home screen widget tap → app foreground |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `adb devices` empty | Start Android emulator or plug in device; enable USB debugging |
| Maestro not found | Install CLI; reopen terminal |
| App not installed | Rebuild debug APK and `adb install -r` |
| Journeys flow fails seed | Use debug APK; verify `nexttrain://test/seed` intent filter |
| Reminders flow fails | Must be native APK (`Capacitor.isNativePlatform()`), not browser |

## CI (optional)

Not wired in GHA yet — local emulator only. See `docs/jim-brief-maestro-android-qa.md` for nightly/pre-release notes.
