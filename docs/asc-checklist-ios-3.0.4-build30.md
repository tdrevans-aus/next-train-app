# App Store Connect checklist — iOS 3.0.4 (build 30), no tracking (FB-68)

For Tim, to do in a browser on any computer. Written 2026-10-24 by the Mac session.
Background and the reasoning behind each step: `docs/mac-brief-ios-3.0.4-build30-no-tracking.md`.

## Already done (24 Oct, on the Mac)

- [x] The code fix is merged to master. This is PR #516, which adds non-personalised iOS ads,
  removes `NSUserTrackingUsageDescription`, sets `NSPrivacyTracking` false and bumps the build to 30.
- [x] Archived 3.0.4 (30). The archive contains no tracking key. The app, widget, Capacitor and
  Cordova manifests say tracking false.
- [x] Xcode privacy report generated. **Every data type says Tracking: NO except one:** Google
  Mobile Ads' own manifest marks **Device ID → Tracking: YES**. That's Google's file, and the brief
  says not to edit it. Part 3's review reply covers it. Google's
  [data disclosure guide](https://developers.google.com/admob/ios/privacy/data-disclosure?hl=en)
  doesn't say whether Device ID counts as tracking. It leaves that to the developer. Without ATT
  the advertising identifier is unavailable, and requests are non-personalised, so "not tracking"
  fits Apple's definition.
- [x] Uploaded build 30 to App Store Connect, and it has finished processing.

The three "Upload Symbols Failed" warnings for GoogleMobileAds, Sentry and UserMessagingPlatform
are expected, because those are prebuilt frameworks with no dSYMs. Ignore them.

## Still to do

Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com), open **Apps**, then
**Next Train**. You need the Account Holder or Admin role. **Do Part 2 (swap the build) before Part 1.**
App Store Connect checks the privacy label against the build *attached to the version*, not the newest
upload. With build 29 still attached, setting Advertising Data to "not used for tracking" is refused
with the `NSUserTrackingUsageDescription` warning (seen 24 Oct). App Privacy still has to be published
before you submit.

**Done 24 Oct 2026:** build 30 attached; Advertising Data published as not tracking (no "Data Used to
Track You" section); reply sent; iPad TestFlight check passed; resubmitted 10:02 AM, now
**Waiting for Review**.

### Part 1: App Privacy

1. In the left sidebar, under General, click **App Privacy**.
2. Each data type has an **Edit** link. Open each of these seven:
   - [ ] Coarse Location
   - [ ] Device ID (already set to not tracking on 24 Oct, so just confirm it)
   - [ ] Product Interaction
   - [ ] Advertising Data (**still set to tracking, so this is the one that matters**)
   - [ ] Crash Data
   - [ ] Performance Data
   - [ ] Other Diagnostic Data
3. In each one, **change only the tracking answer**:
   - Purposes: leave whatever is ticked.
   - "Linked to the user's identity": leave the existing answer.
   - "Is this data used for tracking purposes?": choose **No**.
   - Save or Next through to the end.
4. If Advertising Data still refuses **No** with a warning about `NSUserTrackingUsageDescription`,
   stop. Build 30 should have cleared that warning, so it's a sign something is wrong.
5. - [ ] Click **Publish** at the top right. The product page should no longer show a "Data Used to
     Track You" section.

### Part 2: Swap build 29 for build 30

1. Open the **Distribution** tab (it may be called **App Store**), then **iOS App → 3.0.4**.
2. Scroll to the **Build** section. Hover over build 29 and click the remove (−) or trash icon.
3. Click **Add Build**, choose **30**, then click **Done**.
4. If it asks about encryption or export compliance, answer the same way as for build 29.
5. - [ ] Click **Save** at the top right.

### Part 3: Reply to App Review

1. Open **App Review** (or **Resolution Center**) and find the **Guideline 2.1** thread for
   3.0.4 (29). Click **Reply**.
2. - [ ] Paste this and click **Send**:

> Thank you for the review. Next Train does not track users. It does not request App Tracking
> Transparency permission, does not access the advertising identifier, and requests only
> non-personalised AdMob ads on iOS. In 3.0.4 (30) we removed NSUserTrackingUsageDescription, set
> NSPrivacyTracking to false in the app's privacy manifest, and updated our App Privacy
> information to declare no tracking.
>
> The Google Mobile Ads SDK's privacy manifest lists Device ID as potentially used for tracking.
> That applies when an app obtains App Tracking Transparency permission and the SDK can use the
> advertising identifier. Next Train never requests ATT, so the advertising identifier is
> unavailable, and all iOS ad requests are non-personalised. We declare Device ID as collected for
> third-party advertising and analytics, but not used for tracking.

### Part 4: Submit

1. Go back to **Distribution → 3.0.4**.
2. At the top right, click **Update Review**. This takes you to the review submission, where the
   item becomes **Ready for Review**. **Resubmit to App Review** stays greyed out until you've done
   this. (The License Agreement banner on the Apps page can still be showing; it doesn't block.)
3. Check that the summary shows **3.0.4 (30)**, then submit.
4. - [ ] The status should change to **Waiting for Review**.

### Part 5: Check on your iPhone while it's in review

Install build 30 from **TestFlight**, deleting any older Next Train first so it's a fresh install.
This replaces the simulator check, which couldn't run on the Mac because its security software
kills simulator apps.

- [ ] No tracking prompt appears when the app first opens.
- [ ] The banner ad still shows at the bottom.
- [ ] Next Train is **not** listed under Settings → Privacy & Security → Tracking.

If any of these fail, pull the submission (**Remove from Review** on the 3.0.4 page) before Apple
reviews it.

## Later (not part of this release)

- **Is AdMob worth keeping on iOS?** Since the iOS "Remove ads" purchase was dropped in September
  (GST/ABN), the iOS banner is the only iOS income. Check the AdMob console for the iOS app's
  last-30-day earnings. If they're small, a no-ads iOS build would mean near-empty privacy labels
  (only Sentry crash data) and no more tracking questions from App Review.
- **Versioning doc gap:** `docs/release-versioning.md` has no rule for iOS build numbers
  (Mark noticed this on PR #516). Add an iOS row sometime.
