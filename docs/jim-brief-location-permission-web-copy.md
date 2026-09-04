# Jim brief: location-permission copy assumes native Android outside iOS

**For:** Jim (implement)
**From:** Tim (via top-level session)
**Date:** 2 Sep 2026
**Status:** Ready to fix
**Related:** `public/app.js` (`isNativeApp`, `isIosNativeApp`, `locationPermissionHelpMessage`), the Journeys screen's "Use nearest station" flow
**Out of scope:** Any change to the actual geolocation permission request flow, the native Capacitor bridge, or `findNearestStation`'s region-matching logic — copy only.

---

## 1. What Tim saw

On the Journeys screen ("Add a route"), tapping toward "Use nearest station" without location access granted shows:

> Location permission is needed for Near me. Open Settings → Apps → Next Train → Location → Allow, or choose a station below.

That's Android-native, app-settings-specific instruction copy. Tim saw it while testing in a web/dev context, where there is no "Settings → Apps → Next Train" to open — the phrase doesn't correspond to anything the user can act on there.

## 2. Root cause

`public/app.js`:

```js
function isNativeApp() {
  if (window.location.hostname === "localhost" && window.location.port === "") {
    // Standard Capacitor dev webview
    return true;
  }
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function isIosNativeApp() {
  return isNativeApp() && window.Capacitor?.getPlatform?.() === "ios";
}

function locationPermissionHelpMessage() {
  if (isIosNativeApp()) {
    return "Location is off for this visit. Tap Near me and choose While Using the App, or open Settings → Next Train → Location. You can also pick a station below.";
  }
  return "Location permission is needed for Near me. Open Settings → Apps → Next Train → Location → Allow, or choose a station below.";
}
```

Two things to fix, both in this small area:

1. **`locationPermissionHelpMessage()` only branches on iOS-native vs. "everything else."** There is no distinct copy for a plain web browser (desktop or mobile). Anyone not on iOS-native — including every real web visitor — gets Android-app Settings instructions that don't apply to them. Add a third case: when `!isNativeApp()`, tell the user to use their browser's own site-permission UI (e.g. "Location is blocked for this site. Allow it from your browser's address-bar/site settings, or choose a station below.") — don't invent exact browser menu paths since they vary by browser; keep it generic and point at "choose a station below" as the reliable fallback, same as the other two branches already do.

2. **`isNativeApp()`'s dev-detection heuristic is broad.** `hostname === "localhost" && port === ""` is meant to catch "standard Capacitor dev webview," but it will also match any plain browser hitting `http://localhost` on the default port (e.g. behind a reverse proxy or preview tool that hides the port from `window.location`), which then gets treated as native — including the Android-only copy above — when it's actually a web browser. Tighten this check so it doesn't misfire for a non-Capacitor browser at `localhost`: prefer a positive signal (e.g. an actual `window.Capacitor` presence, or a dedicated dev flag set only by the Capacitor webview shell) over the current hostname/port guess alone. Investigate what currently sets/could set that positive signal in this codebase before inventing a new one — there may already be something used elsewhere (`window.Capacitor?.isNativePlatform?.()` is checked in the fallback branch already; find out why the localhost shortcut exists ahead of it and whether it can be replaced or narrowed rather than dropped outright, in case a real Capacitor dev webview genuinely doesn't set `window.Capacitor` early enough for that check to work at this call site).

## 3. Fix

- Add the third (web) branch to `locationPermissionHelpMessage()`.
- Narrow or otherwise correct `isNativeApp()`'s dev-webview detection so a plain browser at `localhost` isn't classified as native. If you determine the existing hostname/port shortcut is load-bearing for real Capacitor dev testing and can't be safely narrowed without more context, say so explicitly in your PR notes rather than guessing — don't ship a change that breaks native dev testing to fix web copy.
- No changes to `findNearestStation`, the region-mismatch logic, or the geolocation bridge itself.

## 4. Verify

- Manually exercise all three `locationPermissionHelpMessage()` branches (iOS native / other native / web) — there's likely no existing automated test keying off this exact string; check `qa/` for one before assuming you need to add one, and add a small one if none exists and it's cheap to do so (e.g. a DOM/unit-style check on the three return values, not a full browser E2E).
- Confirm `node qa/run-all.mjs --smoke` stays green.
- Report which branch of `isNativeApp()` your investigation concluded was correct, and why, in the PR description — this is a judgment call the brief deliberately leaves to you rather than prescribing a specific detection mechanism.
