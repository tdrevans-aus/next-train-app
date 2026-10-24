# Brief for the Mac session — iOS: use iOS AdMob IDs (no ads on iOS)

Written 2026-10-24 by the Windows controller session. Backlog: **FB-69**
(`docs/feature-backlog.md`, Release section). Target: the first iOS build after 3.0.4 (30) is
approved. Don't pull 30 from review for this (Tim's decision, 24 Oct).

## Symptom

TestFlight 3.0.4 (30) on Tim's iPad shows **no banner ad at all**.

## Root cause (confirmed 24 Oct)

iOS is wired to the **Android** AdMob app:

- `ios/App/App/Info.plist` `GADApplicationIdentifier` = `ca-app-pub-2659068072900088~2367537790`.
  That's the same value as Android's `admob_app_id` in `android/app/src/main/res/values/strings.xml`.
- `public/site-config.json` has a single `admobBannerId` (`…/7567893589`), the Android unit, which
  both platforms use (`web-sources/ads-native.mjs` ~line 189).
- `GOOGLE_TEST_BANNER_ID` in `ads-native.mjs` is Google's **Android** sample banner
  (`ca-app-pub-3940256099942544/6300978111`), so iOS debug builds use the wrong test unit too.
- The AdMob console (checked in Tim's account, 24 Oct) lists **one app, platform Android**, with ID
  `~2367537790`. **There is no iOS AdMob app.**

AdMob app IDs and ad units are specific to one platform, so iOS ad requests made with Android IDs
get no ads. This predates FB-68. iOS has most likely never served a real ad.

## Prerequisite — Tim, in AdMob (apps.admob.com), before the Mac work

**Tim's plan (24 Oct):** wait for Apple to approve 3.0.4, then create the iOS AdMob app already
linked to the live App Store listing. So this brief is blocked until the IDs are added below.

1. **Apps → Add app → iOS.** If 3.0.4 is already live, answer "Yes, it's listed" and pick Next Train
   from the App Store. Otherwise add it as unlisted and link the store later.
2. On the new iOS app: **Ad units → Add → Banner**. Name it e.g. `ios-banner`.
3. Paste both IDs into the PR thread or the top of this brief:
   - iOS AdMob **app ID**: `ca-app-pub-2659068072900088~__________`
   - iOS **banner unit ID**: `ca-app-pub-2659068072900088/__________`

The Mac session should not invent or guess these. If they're missing, stop and ask Tim.

## Code changes

1. **Info.plist:** set `GADApplicationIdentifier` to the **iOS app ID**. Leave Android's
   `strings.xml` alone.
2. **site-config:** add `admobIosAppId` and `admobIosBannerId` to `public/site-config.json`, and to
   `config/site-config.example.json` with placeholder values. Keep the existing `admobAppId` /
   `admobBannerId` as the Android values. Check what writes or validates site-config
   (grep `admobBannerId` in `scripts/`, `qa/`, `api/`) and extend it the same way.
3. **`web-sources/ads-native.mjs`:**
   - On iOS, use `admobIosBannerId`. On Android, use `admobBannerId` as today.
   - Make the test unit per-platform too: iOS uses Google's iOS sample banner
     (`ca-app-pub-3940256099942544/2934735716`, or the adaptive-banner sample
     `…/2435281174`; check Google's current "test ads" page for iOS and use what it lists).
     Android keeps `…/6300978111`.
   - Keep `npa: true` on iOS (FB-68).
4. **`public/ads.js` `isAdMobConfigured`:** on iOS, require the iOS IDs. If they're missing, iOS
   should fall back to "no native banner" (today's placeholder path), **never** to the Android IDs.
5. **QA:** extend `qa/ad-consent-gate.mjs` (stub: `qa/helpers/native-ad-sim.mjs`) to assert
   iOS `showBanner` gets the iOS unit (and the iOS test unit in test mode), and Android gets the
   Android unit. Confirm the new assertion fails if you revert the platform switch.
6. `npm run cap:sync:ios` (rebuilds `public/ads-bundle.js`). Bump `CURRENT_PROJECT_VERSION`, and
   `MARKETING_VERSION` per `docs/release-versioning.md` (likely 3.0.5).

## Verify

- `node qa/ad-consent-gate.mjs` and `node qa/run-all.mjs --smoke` pass; `--release` before push.
- **Debug build on device or simulator:** the Google **test** banner appears at the bottom. This
  proves the wiring, since test ads always fill.
- **TestFlight (release) build:** expect few or no real ads until the iOS AdMob app is linked to the
  live App Store listing and has passed AdMob review. An empty banner there is not a failure by
  itself. Check the Xcode console for AdMob errors that mention an app ID or ad unit mismatch.
  There should be none.
- No tracking prompt still (FB-68 unchanged). `grep -c NSUserTracking ios/App/App/Info.plist` → 0.

Open a PR linking this brief; don't commit to local master. Tim uploads.

## Tim, after the build is live

- In AdMob, link the iOS app to its App Store listing (**App settings → Add store**) so serving
  isn't limited.
- **App Privacy:** no change needed. AdMob data types are already declared as not used for tracking.

## Found alongside (Android, separate item, not for the Mac session)

The Android AdMob app is **"Requires review — Limited ad serving — Add store to lift limit"**, and
"Apps to confirm" lists `com.tdrevans.nexttrain` as "Setup incomplete", with only **5 ad requests in
the last 7 days**. Tim should link the Play listing in AdMob. Whether 5 requests a week is a real
signal of low Android usage, or a sign the consent gate is failing closed, needs its own triage.
There's also no `app-ads.txt` published. AdMob expects it on the developer website listed in the
store.
