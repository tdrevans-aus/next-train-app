# Jim brief — Android Near me takes 30–60 s to move off the cached station (regression; blocks 3.0.5)

tim-review: no, unless the fix changes rider-facing copy. Lane: bug-fix / product mode. No lane lock
(client and shell code). **This blocks tagging `v3.0.5`**: the fix must be merged before Tim builds 3.0.5.

## Symptom (Tim, 26 Nov 2026, Android phone, demoing the app)
On the last two opens, Near me kept showing the cached station (Edgewater) for 30–60 s before switching
to the nearest station. Tim expects it within a few seconds; earlier work fixed this
(`docs/nearby-cold-start-performance.md`, `docs/jim-brief-location-wait-ux.md`,
`docs/jim-brief-nearby-cache-last-station.md`). He can't remember whether that install was a debug build
or the Play Store 3.0.4. He has since reinstalled 3.0.4 from Play; whether it is also slow is unknown.

## Prime suspect: #450 (64ba0d74, 26 Sep 2026), after the 3.0.4 cut (8547dda9)
"Route native-shell geolocation through NextTrainGeo only": to fix an iOS WebKit second prompt, it sent
`city-session.js` `geolocateHint()` and `geo-native.mjs`'s fallback through `window.NextTrainGeo` (the
Capacitor Geolocation plugin) **on every native platform, Android included**. It also removed the direct
`navigator.geolocation` fallback. If that's the cause, 3.0.4 on Play is fine and **3.0.5 would ship the
regression to every Android rider**. Prove or rule this out first.

Other things to check:
- Open and resume ask for a fresh fix: `maximumAge: 0` (`public/nearby-mode.js` ~1762, ~3159, ~3206).
- Low accuracy: `enableHighAccuracy: false`, `timeout: 8000` (~1845). On Android the Capacitor plugin's
  low-accuracy and `maximumAge: 0` handling (FusedLocationProvider priority) can wait a long time for a
  network fix. Repeated 8 s timeouts or retries would add up to 30–60 s.
- `web-sources/geo-native.mjs`: the 15 s permission race (~76) and any serial permission check before
  `getCurrentPosition`.
- #477 (registry-driven client, 27 Sep): does anything now wait on the manifest before Near me resolves?
- #558 (retired-city banner above Near me, 24 Nov): confirm it adds no wait.
- `docs/nearby-cold-start-performance.md` invariants: check none were broken.

## Required work
1. **Reproduce on Android.** Use an emulator with a mock location, or adb-driven location, and two builds:
   3.0.4 (8547dda9) and current master. Measure, from app open:
   - time to the first location fix;
   - time to the nearest station being chosen;
   - time to the board painting.

   Add timestamped debug logging if needed, and remove it before merge. Report the numbers for both
   builds. If you can't run an Android emulator here, say so straight away. Don't guess.
2. **Fix the root cause** while keeping #450's iOS fix: no second WebKit prompt on iOS. Good shapes to
   consider:
   - Android-specific options: accept a recent fix (`maximumAge` around 30–120 s) on open, then refine.
   - Race a quick last-known or low-accuracy fix against a fresh one, and use whichever arrives first.
   - Restore a fallback on Android only.

   Never block the first paint on location.
3. **Target:** within 3 s of opening, either replace the cached station with the nearest one, or clearly
   show that location is updating (existing "Locating…" UI, not a new pattern). The nearest station shows
   within about 5 s on a device with a recent fix.

## Acceptance criteria
- Before and after timings on Android for 3.0.4, master and the fix, in the PR.
- A QA script that fails if, on a stubbed native Android shell, Near me's first location request waits
  for a fresh-only fix with no faster path, or if the cached station persists past the target with a fix
  available. Follow `qa/geo-native-shell.mjs`, which must keep passing: no `navigator.geolocation` on iOS.
  It must go red on current master. Mark will mutation-check it.
- `node qa/run-all.mjs --smoke` passes. Let it run to completion, about 650 s.

## Process
Worktree, branch `fix/android-near-me-slow-location`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-android-near-me-slow-location.md` (untracked in the main
checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it. Don't touch the
release PR #560's files (version fields, release notes).
