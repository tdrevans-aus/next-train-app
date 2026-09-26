# Jim brief: iOS release-readiness fixes before the first App Store build (3.0.4)

Written 26 Sep 2026 by the Mac session (Bob) after auditing the Xcode project and App Store
Connect for Next Train's first iOS submission (ASC app id 6803145625, version 3.0.4, build 28).
tim-review: yes — item 2 changes user-facing permission copy.

## Precondition — do not start until this is true

Tim has uncommitted local iOS work on the Mac checkout (`ios/App/App/Info.plist` adds the
`nexttrain://` URL scheme and reorders keys; `ios/App/App.xcodeproj/project.pbxproj`;
`ios/NextTrainWidget/NextTrainWidget.swift`). This brief edits the same files. The top-level
session dispatches you only after that work is committed and on `origin/master`; if `git log
origin/master -- ios/App/App/Info.plist` does not show a commit adding `CFBundleURLTypes`, stop and
report instead of proceeding.

## Items

1. **Export compliance.** Add `ITSAppUsesNonExemptEncryption` = `false` to
   `ios/App/App/Info.plist` (and the widget's `ios/NextTrainWidget/Info.plist` if the extension is
   uploaded as part of the app bundle — it is). The app only uses HTTPS via the OS. Without the key,
   every uploaded build waits on a manual export-compliance question in App Store Connect.

2. **Location permission copy and scope.**
   - Both `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription`
     say "find the nearest **Transperth** station" — wrong now the app covers Melbourne, Boston,
     etc. Proposed: "Next Train uses your location to find the nearest station and show its
     departures." (tim-review: copy change.)
   - Determine whether anything requests *Always* authorization or background location
     (Capacitor Geolocation plugin config, `UIBackgroundModes`, native code). Nothing obvious does
     (no `UIBackgroundModes`, no `requestAlwaysAuthorization` found). If nothing needs it, remove
     `NSLocationAlwaysAndWhenInUseUsageDescription` so App Review doesn't ask why an app with no
     background feature declares Always. If something does need it, keep it and say what in the PR.

3. **Privacy manifest.** There is no app-level `PrivacyInfo.xcprivacy` (Capacitor's framework ships
   its own; the app and widget targets don't). Add one to the App target (and the widget target if
   it needs its own) declaring every required-reason API the app's and widget's own Swift code uses
   — start with `WidgetSettingsStore` / `CommuteSchedule` (App Group shared storage: likely
   `NSPrivacyAccessedAPICategoryUserDefaults`, reason `1C8F.1` for App Group access) and any file
   timestamp / disk-space / boot-time API use. Include `NSPrivacyTracking` and tracking domains
   consistent with the AdMob/ATT setup (`NSUserTrackingUsageDescription` is present). Make sure
   the file is in the target's Copy Bundle Resources phase.

4. **Required device capability.** `UIRequiredDeviceCapabilities` is `armv7` (Capacitor template
   leftover). Change to `arm64`.

## Acceptance criteria

- `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination
  'generic/platform=iOS Simulator' build` succeeds with no new warnings about the plist or
  privacy manifest.
- The built `App.app` contains `PrivacyInfo.xcprivacy`; `plutil -lint` passes on every plist you
  touched.
- `Info.plist` has `ITSAppUsesNonExemptEncryption` false, `arm64`, the new location copy, and
  (unless justified) no Always-location key.
- No change to web code under `public/` (the separate location-prompt fix is
  `docs/jim-brief-ios-webkit-location-prompt.md` — don't touch that area).
- No QA suite run needed: `qa/run-all.mjs` doesn't exercise native iOS config (CLAUDE.md: no suite
  for changes no QA script exercises). The Release simulator build above is the verification.
- Commit, push, open a PR against master linking this brief, labelled for Tim's review. Don't merge.
