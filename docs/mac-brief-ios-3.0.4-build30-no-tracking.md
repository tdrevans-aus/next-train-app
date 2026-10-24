# Brief for the Mac session — iOS 3.0.4 (build 30): stop declaring tracking (App Review 2.1 rejection)

Written 2026-10-24 by the Windows controller session, which can't build iOS. Backlog: **FB-68**
(`docs/feature-backlog.md`, Release section).

## Why

App Review rejected **3.0.4 (29)** on 3 Oct 2026 under **Guideline 2.1 – Information Needed**
(submission `e37edd6f-28b2-4cfc-9e47-6b3324ef9d74`, reviewed on iPad Air 11" M3 + iPhone 17 Pro Max,
iOS/iPadOS 27.0). The binary declares App Tracking Transparency, but reviewers never saw the
permission prompt.

Root cause: the app **never asks**. `ios/App/App/Info.plist` has `NSUserTrackingUsageDescription`,
`ios/App/App/PrivacyInfo.xcprivacy` has `NSPrivacyTracking = true`, and App Store Connect's App
Privacy says data is "used for tracking". But `web-sources/ads-native.mjs` calls
`admobClient.initialize()`, and in `@capacitor-community/admob` 8.0.0 that only runs
`MobileAds.shared.start` (`AdMobPlugin.swift:46-57`). `requestTrackingAuthorization` is never
called.

Tim's decision (24 Oct): **Next Train does not track.** Make the code, the binary and the App
Store Connect declaration all say that, and make it actually true. With no ATT prompt, iOS already
withholds the IDFA. But `showBanner` doesn't pass `npa`, so Google's SDK defaults to personalised
ads from other signals. That's why we're shipping a new build rather than just changing the label
on build 29.

## Code changes

1. **Non-personalised ads on iOS only.** In `web-sources/ads-native.mjs`, in the `showBanner` call
   (~line 198), pass `npa: true` when `window.Capacitor?.getPlatform?.() === "ios"`. The
   `margin` line just above already branches on platform the same way. **Android is unchanged.**
   Its consent/personalisation is governed by UMP and the Play data-safety form, not this brief.
2. **Remove `NSUserTrackingUsageDescription`** from `ios/App/App/Info.plist`.
3. **Privacy manifest:** in `ios/App/App/PrivacyInfo.xcprivacy`, set `NSPrivacyTracking` to
   `<false/>` and empty `NSPrivacyTrackingDomains` (`<array/>`). These must agree with item 2 and
   with App Store Connect. Leave `NSPrivacyAccessedAPITypes` alone.
   The widget's manifest (`ios/NextTrainWidget/PrivacyInfo.xcprivacy`) is already `false`, so
   leave it.
4. **Don't add any ATT call.** Don't call `requestTrackingAuthorization` /
   `trackingAuthorizationStatus` anywhere. Grep `web-sources/` and `public/` to confirm.
5. **Optional, if quick:** extend `qa/ad-consent-gate.mjs` (stub via `qa/helpers/native-ad-sim.mjs`)
   to assert the iOS `showBanner` call carries `npa: true` and the Android one doesn't. If that's
   not quick, say so in the PR and skip it.
6. **Build bump only:** keep `MARKETING_VERSION` at **3.0.4** (it was rejected, never released, so App Store Connect accepts a new build on the same version). Bump `CURRENT_PROJECT_VERSION` 29 → **30**
   in `ios/App/App.xcodeproj/project.pbxproj` (both configurations). See
   `docs/release-versioning.md` for whether Android/package.json bump with it.
7. **Rebuild the bundle:** `npm run cap:sync:ios`. This runs `build:ads`, so `public/ads-bundle.js`
   picks up the change. The app loads bundled web assets (`webDir: "public"`, no `server.url`), so
   nothing reaches iOS without a new build.

## Verify before upload

- `node qa/run-all.mjs --smoke` passes. Before pushing, run `--release` (see CLAUDE.md).
- `grep -c NSUserTracking ios/App/App/Info.plist` → 0.
- Device or simulator: a fresh install shows **no** tracking prompt, the banner still loads, and
  Settings → Privacy & Security → Tracking does **not** list Next Train.
- Xcode → Product → Archive → Generate Privacy Report: shows "Tracking: No" for the app target.
  If a **third-party SDK manifest** (e.g. GoogleMobileAds) still declares tracking domains, note it
  in the PR and tell Tim. Don't edit vendor manifests.

Open a PR linking this brief, and don't commit to local master. Don't upload to App Store Connect
yourself. Tim does the archive upload and the steps below.

## App Store Connect — Tim, at upload time (3.0.4, build 30)

Needs Account Holder or Admin.

**Order matters: upload build 30 and wait for it to finish processing *before* editing App
Privacy.** On 24 Oct, App Store Connect blocked setting *Advertising Data* to "not used for
tracking" with a warning that the app contains `NSUserTrackingUsageDescription`. It validates the
label against the uploaded binary, so it won't accept the change until a build without that key
exists. **Current state (24 Oct):** *Device ID* is already published as not used for tracking;
*Advertising Data* is still "used for tracking".

1. **App Privacy → Data Types:** open each data type currently declared. In the AdMob-related ones
   (typically *Identifiers → Device ID*, *Usage Data → Advertising Data / Product Interaction*,
   *Diagnostics*, *Location → Coarse Location*), **untick "Used to track you"** on every one.
   Keep the data types themselves and their purposes (e.g. *Third-Party Advertising*, *Analytics*,
   *App Functionality*) as they are: Google's SDK still *collects* data for serving ads, it just
   doesn't track.
2. Save → **Publish** the App Privacy changes. The product page's "Data Used to Track You" section
   should disappear.
3. **Version 3.0.4** (the rejected version, still editable): in the Build section, swap build 29 for build 30.
   No new version record is needed.
4. **Reply to App Review** on the 2.1 thread (or put it in App Review Information → Notes):

   > Next Train does not track users. It does not request App Tracking Transparency permission,
   > does not access the advertising identifier, and requests only non-personalised AdMob ads on
   > iOS. In 3.0.4 (30) we removed NSUserTrackingUsageDescription, set NSPrivacyTracking to false,
   > and updated the App Privacy information to declare no tracking.

5. Submit for Review.

**Android / Play:** no change from this brief. Don't touch the Play data-safety form for it.

## Reverting later

If Tim ever wants personalised iOS ads, that's the other route: re-add the usage string, call
`AdMob.requestTrackingAuthorization()` before `ensureConsent()`, drop `npa`, declare tracking
again, and attach a physical-device screen recording of the prompt on a fresh install to the
review notes. Treat that as a separate decision, not part of this build.
