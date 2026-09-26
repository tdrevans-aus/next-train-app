# Jim brief: remove the "Remove ads" purchase from the iOS app; fix the iOS banner position; bump iOS build to 29

Written 26 Sep 2026 by the Mac session (Bob) at Tim's request.
tim-review: requested directly by Tim in chat (26 Sep) — product change is his decision; the
top-level session merges only on his explicit "merge".

## Why

Apple won't let Tim sell the A$7.99 one-time "Remove ads" in-app purchase without registering for
GST and an ABN, which isn't worth it for the expected revenue. The iOS app must therefore ship with
**no** ad-free purchase anywhere: no CTA, no price, no paywall, no restore button, no StoreKit
calls. Android keeps the purchase exactly as today. Ads stay on iOS.

## Where it lives (master @ 83ba3286)

- `public/index.html`: `#ad-remove-link` / `#ad-remove-link-wrap` ("Remove ads" link under the
  banner, ~line 417); `#ad-free-dialog` paywall (~1020–1035, "A$7.99 · One-time purchase",
  "Restore purchases"); Menu `#menu-ad-free-section` (~1136–1152) incl. CTA, status row, restore
  button, `#menu-ad-free-web-hint` ("Remove ads is available in the Android app.") and
  `#menu-ad-free-billing-hint`.
- `public/ad-free-purchase.js`: `isNativeApp()`, `nativePlatform()`, `shouldShowPurchaseControls()`,
  `renderMenuAdFree()`, `syncPurchaseLinkVisibility()`, `ensureNativeBridge()` /
  `loadNativePurchaseBridge()`, `refreshEntitlement`, `webAdFreeHint()` ("…Android or iOS app").
- `web-sources/ad-free-native.mjs` → bundle `NextTrainAdFreeNative` (Capgo NativePurchases:
  `isBillingSupported`, `getProducts`, `purchaseProduct`, `getPurchases`).
- Callers: `public/app.js` ~2442, ~6747 (`renderMenuAdFree`), ~6975 (`refreshEntitlement`).

## Required behaviour

1. **iOS native** (`Capacitor.isNativePlatform()` and `getPlatform() === "ios"`): the whole Menu
   ad-free section is hidden (including both hints and restore), the under-banner "Remove ads" link
   never shows, the paywall dialog can't be opened by any path, `isEntitled()` is `false`, and the
   native purchase bridge is **never loaded or called** (no `NativePurchases.*` calls at all — a
   first iOS launch currently calls `isBillingSupported`, `getProducts`, `getPurchases`).
   Ads behave as today.
2. **Android native**: unchanged — every existing ad-free behaviour and QA script still passes.
3. **Web**: the Menu hint must no longer imply iOS has it. `webAdFreeHint()` says "Android or iOS
   app" while the HTML says "Android app"; make both say
   "Remove ads is available in the Android app." (copy change approved by Tim's request).
4. **Build number**: `CURRENT_PROJECT_VERSION` 28 → **29** everywhere in
   `ios/App/App.xcodeproj/project.pbxproj` (App and widget targets, Debug and Release — 4
   occurrences). `MARKETING_VERSION` stays **3.0.4**. Don't touch Android version codes.
5. Don't remove the `@capgo/native-purchases` dependency or its iOS plugin (Android needs the npm
   package; leaving the iOS plugin compiled in but unused is fine and keeps this change small).

## Part B — iOS banner floats over the list (same build, same files, so same PR)

**Symptom** (Release build of master 83ba3286, iPhone 17 Pro simulator, 26 Sep): the AdMob banner
sits ~72pt above the bottom edge, over the departures list, with list rows ("14:47", "14:52")
visible *below* the banner. Screenshot:
`/private/tmp/claude-503/-Users-timevans-Projects-next-train-app/4f45ebc8-d3e5-4115-8416-772379ff0af3/scratchpad/final-fresh.png`.

**Cause:** `web-sources/ads-native.mjs` `showNativeBanner()` calls `admobClient.showBanner({ …,
position: "BOTTOM_CENTER", margin: 72 })` on every platform. 72 suits Android (clears the app's
bottom chrome / nav bar there); on iOS it leaves a 72pt band under the banner where page content
shows through. Page padding is `body.native-ad-banner .app-body { padding-bottom: calc(var(--safe-bottom)
+ var(--ad-scroll-padding)) }` (`public/styles/base.css:172`, `--ad-scroll-padding: 8.25rem`).

**Required:** on iOS the banner sits at the bottom, just above the home indicator / safe area, with
no page content visible beneath it; the last list row can still be scrolled clear of the banner
(adjust the iOS padding if needed). Android keeps `margin: 72` and its current padding — no Android
visual change. Verify on an iPhone simulator Release build (headless `simctl`, screenshot before
and after, include both in the PR description) and on an iPad simulator.

## Follow-up after Mark's QA of PR #461 (26 Sep) — push to the same branch

Mark passed #461 except one miss: `public/about.html` (~lines 93–97, "Ads & remove ads" section)
still says "In the Android or iOS app, you can remove ads with a one-time purchase from Menu when
that option is available. We never see your card details — Google Play or the App Store handles
payment." That page ships inside the iOS app and is the App Store support URL. Change it to:
"In the Android app, you can remove ads with a one-time purchase from Menu when that option is
available. We never see your card details — Google Play handles payment." Grep `public/` for any
other copy that still offers remove-ads on iOS or mentions the App Store handling a purchase
(excluding `ad-free-purchase.js`'s iOS-guarded toasts) and fix the same way. Commit onto
`jim/ios-remove-ad-free-purchase` so it lands in PR #461; no new PR. Rerun
`node qa/ios-no-ad-free.mjs`; no full smoke needed for a static-copy-only follow-up (CLAUDE.md
"No suite at all" for static copy with no script binding).

## Acceptance criteria

- New `qa/ios-no-ad-free.mjs` (register in `SMOKE_SCRIPTS`): stub a native Capacitor shell with
  `getPlatform: () => "ios"` and an instrumented fake `NativePurchases`; assert the Menu ad-free
  section, under-banner link and paywall are all hidden/unopenable and that zero
  `NativePurchases` calls happen. Same script with `getPlatform: () => "android"` asserts the
  Android CTA still renders (so the gate is platform-specific, not a global kill). Show it fails on
  master before your change.
- Existing ad-free / consent scripts (`qa/ad-consent-gate.mjs`, `qa/pro-widget-access.mjs`, and any
  others that reference `NextTrainAdFree`) still pass.
- If you change `web-sources/`, rebuild the bundle with the repo's build script and commit it
  (`qa/bundle-freshness.mjs` must pass).
- `node qa/run-all.mjs --smoke` green.
- Commit, push, open a PR against master linking this brief; list every user-visible change on
  iOS, Android and web in the description. Don't merge.
