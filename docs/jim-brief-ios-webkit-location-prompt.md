# Jim brief: iOS app shows a second, web-style location prompt and can hang on "Loading…"

Written 26 Sep 2026 by the Mac session (Bob), while doing an iOS simulator run for 3.0.4.
tim-review: no (native permission plumbing, no copy/IA/API change)

## Symptom

In the iOS app (Capacitor, `capacitor://localhost`), after iOS location permission has already
been granted to Next Train, WebKit shows a *second*, website-style prompt:

> "localhost" would like to use your current location. This website will use your precise
> location because "Next Train" currently has access to your precise location.
> [Don't Allow] [Allow]

On a warm relaunch with saved state, the same pending prompt appears to block first paint: the
screen sits on "Loading…" / "Updating…" with dashes, Near me does nothing, and the WebKit log
says `makeViewBlankIfUnpaintedSinceLastLoadCommit: Making the view blank because of a JS prompt
before the first paint for its page`. A fresh install eventually renders the board with the
prompt on top.

## Reproduction

1. Build the `App` scheme for an iOS 26.5 simulator (iPad Pro 13" M5 used), `npx cap copy ios` first.
2. `xcrun simctl privacy <udid> grant location com.tdrevans.nexttrain`;
   `xcrun simctl location <udid> set -31.9510,115.8605`.
3. Launch. The native Capacitor Geolocation call succeeds (log: `[Geo] getCurrentPosition success`),
   then the "localhost would like to use your current location" WebKit panel appears.

## Evidence / suspect code

The native shell has a proper path — `window.NextTrainGeo` (public/geo-bundle.js, backed by the
Capacitor Geolocation plugin) — and `app.js`'s `getAppGeolocationPosition` uses it. But some
callers go straight to `navigator.geolocation`, which inside WKWebView triggers WebKit's own
per-origin permission panel:

- `public/city-session.js:791-803` `geolocateHint()` — called at boot (`:1099`) for the region
  mismatch check. **Most likely culprit** (runs ~1s after boot, before first paint on a slow load).
  In place since 03e6cdd (24 Aug 2026), so shipped builds are probably affected too.
- `public/app.js:5441-5462` `getGeolocationPosition()` — direct `navigator.geolocation`, no native branch.
- `public/geo-bundle.js:352-430` — web fallback; check it is never reached when
  `Capacitor.isNativePlatform()` is true.

## Acceptance criteria

1. In the native shell (`isRealNativeShell()` true), no code path calls `navigator.geolocation`
   directly; all location reads go through `window.NextTrainGeo` / the Capacitor plugin.
2. Plain web behaviour unchanged (browser still uses `navigator.geolocation`).
3. iOS simulator: fresh install and warm relaunch both render the Perth board with only the one
   native iOS permission prompt, never the "localhost would like to use…" panel.
4. A QA script (new or extended, e.g. alongside `qa/pin-behavior*`) stubs a native Capacitor
   shell and fails if `navigator.geolocation.getCurrentPosition` is called.
5. `node qa/run-all.mjs --smoke` green.

## Unrelated, noticed in the same run (flag, don't fix here)

- `public/station-combobox.js:183` fetches relative `/api/country-stations`, which in the native
  shell resolves to `capacitor://localhost/api/...` and fails (`Could not load
  /api/country-stations`). It should go through the API-origin helper like other API calls.
- Console shows `JS Eval error A JavaScript exception occurred` at every launch (Capacitor
  bridge eval before the page's own JS). Worth identifying.
