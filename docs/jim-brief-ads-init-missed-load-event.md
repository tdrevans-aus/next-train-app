# Jim brief — No ads in the Play build: `ads.js` waits for a `load` event that has already fired

**Lane:** bug-fix / product mode. `tim-review: no` — restores intended behaviour; no copy, IA or
API response shape change. **Priority: high** — 3.0.3 (27) is the first public release and it
shows no banner to anyone, so ad revenue is zero and the Remove-ads purchase has nothing to
remove. **Lane lock:** none (`public/ads.js`, `qa/`, `docs/`). Foreground smoke with explicit
`timeout: 600000`; tail the output file in the foreground if backgrounded; never park; leave no
background sleep/poll loops, emulators or dev servers running.

## Symptom

Tim installed 3.0.3 (versionCode 27) from the Play Store on 20 Sep 2026 (Samsung S24+,
installer `com.android.vending`). No banner ad ever appears, on any screen.

## Root cause (confirmed on device and emulator)

`public/ads.js` starts itself only from the window `load` event (line ~470):

```js
window.addEventListener("load", () => { installOverlayAdGuard(); … initAds(); });
```

But `ads.js` is not in the initial HTML. `public/index.html` (~lines 1556–1590, `loadDeferred`)
injects it, with the other non-critical scripts, only **after first train paint**
(`NextTrainDeferred.load()` from `app.js` / `nearby-mode.js`). By then `document.readyState` is
already `"complete"`, so the `load` listener never fires, `initAds()` never runs, and
`installOverlayAdGuard()` is never installed. It is a race: on a slow cold start the deferred
load can beat `load`, which is why ads were seen in earlier testing.

Every other deferred script already guards this (`analytics.js:69`, `widget.js:1816`,
`leave-reminders.js:1581`, `stickiness-coaches.js:307` all check `document.readyState` first).
`ads.js` is the only one that does not.

## Evidence

- **Phone, Play build 3.0.3 (27):** over a full launch the app process made zero AdMob plugin
  calls and the device log has zero Google Mobile Ads SDK (`Ads`) lines — the SDK logs every ad
  request even in release, so no request was ever made. Billing worked and returned
  `0 purchases`, so the user is not ad-free. The bundled `site-config.json` has the production
  AdMob app and banner IDs with `admobTestMode: false`; the manifest carries the AdMob
  `APPLICATION_ID`.
- **Emulator (Pixel_9), debug APK:** same behaviour — plugin calls for Geolocation, WidgetSync,
  NativePurchases and LeaveReminders, none for AdMob. Inspecting the live WebView:
  `readyState: "complete"`, `NextTrainDeferred._ready: true`, body class `native-app` only (no
  dialog/region/widget overlay), `NextTrainAdFree.isEntitled(): false`, `NextTrainAdsNative`
  fully loaded, `#ad-container` hidden and empty.
- Calling `Capacitor.Plugins.AdMob.requestConsentInfo()` by hand returned
  `{status: "NOT_REQUIRED", canRequestAds: true}` — the UMP consent gate (#370) is **not** the
  cause.
- Calling `window.NextTrainAds.reload()` by hand immediately produced
  `requestConsentInfo` → `initialize` → `showBanner`, the SDK's "request is sent from a test
  device" line, and the `native-ad-banner` body class. Nothing else was changed.

## Fix (decided)

In `public/ads.js`, run the startup block immediately when the document has already loaded, and
keep the listener for the case where it has not:

- Extract the listener body into a function (e.g. `bootAds`) and call it via the same pattern
  the sibling scripts use: if `document.readyState === "complete"` run now, else wait for `load`.
  It must run exactly once.
- Keep `waitForCapacitor().then(initAds)` and `installOverlayAdGuard()` inside it, unchanged.
- Do not move `ads.js` out of the deferred list and do not change the consent, ad-free or
  overlay-suppression logic.

## Acceptance criteria

1. New QA script `qa/ads-init-after-deferred-load.mjs`, in the smoke tier: loads the app in the
   browser harness, waits until `document.readyState === "complete"` **and then** triggers
   `NextTrainDeferred.load()` (the production order), and asserts that ads initialisation ran —
   on web that means `#ad-container` is un-hidden with the placeholder or ad unit rendered (pick
   the observable the web path really produces and say which). Header says how to see it fail
   (restore the bare `load` listener). It must fail on current master and pass with the fix; show
   both results in the PR.
2. A second case in the same script (or `qa/ad-consent-gate.mjs` if that harness fits better):
   with a stubbed native bridge (`Capacitor.isNativePlatform() === true`, stub
   `NextTrainAdsNative`), the same late-load order results in exactly one
   `showNativeBanner` call. Reuse the existing `__setAdMobClientForTests` seam where practical.
3. The startup block runs exactly once whether `ads.js` loads before or after `load`.
4. `node qa/ads-init-after-deferred-load.mjs`, `node qa/ad-consent-gate.mjs`, the existing
   above-ad layout scripts (`journey-detail-footer-above-ad`, `nearby-content-above-ad`,
   `static-page-above-ad`, `dialog-above-ad`) and `node qa/run-all.mjs --smoke` pass. The
   above-ad scripts may have been passing only because they force the banner state; if any
   now behaves differently because ads really initialise, report it rather than loosening it.
5. If an Android emulator is available (`Pixel_9` exists on Tim's PC; SDK path is `sdk.dir` in
   `C:\Users\tdrev\Projects\next-train-app\android\local.properties`, read-only), build a debug
   APK from your worktree, install it on the **emulator only** (never on the attached phone
   `R5CXC0FWWVN`), and confirm `pluginId: AdMob, methodName: showBanner` appears in logcat on a
   cold start without any manual call. Shut the emulator down afterwards. If not possible, say so
   plainly.

## Ships how

`public/` is bundled into the APK at build time, so this needs a new Play release (3.0.4,
versionCode 28 or later) — the web deploy alone does not fix installed apps. Do not bump versions
in this PR; the controller cuts the release PR after merge.

## Delivery

Copy this brief into your worktree (untracked on the controller's checkout by design), commit it
with the fix, push, and open a PR that links it. No version bumps, regenerated
`public/city-directions/*.json` or bundle outputs in the diff.
