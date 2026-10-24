# Jim brief — FB-68: iOS 3.0.4 (30) declares no tracking (App Review 2.1)

Bug-fix / product lane (CLAUDE.md "Bug-fix lane"). Written 2026-10-24 by the top-level session on
the Mac. `tim-review: no`. The change is privacy config plus one ad-request flag, with no copy, IA
or API-shape change.

**The spec is `docs/mac-brief-ios-3.0.4-build30-no-tracking.md`. Read the whole file.** Do its
"Code changes" items 1–7 and the "Verify before upload" checks you can run headlessly. This file
only adds the lane mechanics and the triage evidence.

## Triage evidence (master @ 8ed34910)

- `ios/App/App/Info.plist:44-45`: `NSUserTrackingUsageDescription` is present.
- `ios/App/App/PrivacyInfo.xcprivacy:5-10`: `NSPrivacyTracking` is `<true/>`, and
  `NSPrivacyTrackingDomains` lists googleadservices.com and googlesyndication.com.
- `web-sources/ads-native.mjs:196-198`: the iOS margin branch exists, and `showBanner` has no `npa`.
- `ios/App/App.xcodeproj/project.pbxproj`: `CURRENT_PROJECT_VERSION = 29` appears 4×, and
  `MARKETING_VERSION = 3.0.4` appears 4×. Bump every `CURRENT_PROJECT_VERSION` to 30.
- No `requestTrackingAuthorization` / `trackingAuthorizationStatus` call exists in `web-sources/`
  or `public/`.

## Acceptance criteria

1. On iOS only, `showBanner` passes `npa: true`. The Android call is byte-for-byte unchanged in
   behaviour.
2. `grep -c NSUserTracking ios/App/App/Info.plist` → 0.
3. App `PrivacyInfo.xcprivacy`: `NSPrivacyTracking` is `<false/>` and `NSPrivacyTrackingDomains`
   is `<array/>`. `NSPrivacyAccessedAPITypes` and the widget manifest are untouched.
4. There are no ATT calls anywhere.
5. `CURRENT_PROJECT_VERSION = 30` appears in every configuration, `MARKETING_VERSION` stays 3.0.4,
   and Android/package.json follow `docs/release-versioning.md`.
6. `npm run cap:sync:ios` has been run, and the regenerated `public/ads-bundle.js` contains the
   `npa` change.
7. QA: extend `qa/ad-consent-gate.mjs` (via `qa/helpers/native-ad-sim.mjs`) to assert that iOS
   `showBanner` carries `npa: true` and Android's doesn't. If that isn't quick, say why in the PR.
   That script and `node qa/run-all.mjs --smoke` must both pass.
8. Third-party SDK manifests: grep the resolved Pods / SPM checkouts for `PrivacyInfo.xcprivacy`
   files declaring `NSPrivacyTracking` true or tracking domains (e.g. GoogleMobileAds). List them in
   the PR for Tim, and don't edit them.
9. If a simulator build is quick, run it: `xcodebuild` for an iOS Simulator destination must
   succeed. If it isn't quick, say so in the PR. The top-level session runs the fresh-install /
   no-prompt check in the simulator.

## Out of scope

App Store Connect, uploading, archiving for distribution, Android/Play consent, and vendor
manifests.
