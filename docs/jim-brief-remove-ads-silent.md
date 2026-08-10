# Jim brief: Remove ads tap does nothing

**For:** Jim  
**From:** QA (Tim)  
**Date:** 9 Aug 2026  
**Priority:** High (purchase path broken or silent on device)  
**Status:** Fixed in `ad-free-purchase.js` / `ads.js` (deferred native bundles, toasts, link visibility, init loop)

---

## Tim’s report

Taps **Remove ads** (Menu or link under banner) — **no Play sheet, no toast, nothing**.

## What QA verified

### Browser (`localhost` / website)

**Remove ads purchase does not work on web** — by design (Play Billing only). Menu should show:

- *Ad-free is available in the Android app.*
- Buy row **hidden**; link under ad **hidden**.

QA: **PASS** on web UI expectations.

### Simulated Android with broken native bridge

When `Capacitor.isNativePlatform()` is true but `window.NextTrainAdFreeNative` is **missing** (bundle failed to load):

1. Menu **Remove ads** row is **hidden** (`billingAvailable` false).
2. Link **Remove ads** under the ad slot is **still shown**.
3. Tap → **`purchaseAdFree()` returns silently** — no toast, no sheet.

```javascript
// ad-free-purchase.js
if (!isNativeApp() || !native?.purchaseInAppProduct) {
  return; // ← silent on native if bridge missing
}
```

This matches “does nothing.”

### Console on load (browser)

- `Dynamic require of "@capacitor/core" is not supported` — `ad-free-bundle.js` / `ads-bundle.js` fail during parse if Capacitor not ready when scripts run.
- `Maximum call stack size exceeded` in `applyEntitlement` ↔ `initAds` loop (may leave ad-free init unhealthy).

---

## Likely causes on Tim’s Android build

1. **`ad-free-bundle.js` runs before `window.Capacitor` exists** → bundle throws → `NextTrainAdFreeNative` never defined → silent tap.
2. **`billingAvailable` false** (emulator without Play Store, product not in Play Console, plugin error) → menu row hidden; under-ad link still visible; tap should toast *Couldn't complete purchase* — if no toast, (1) or JS error.
3. **Stale APK** — run `npm run cap:sync` and rebuild.
4. **User cancelled** Play sheet — intentional silent return (unlikely if Tim says “nothing”).

---

## Debug on device (Chrome → `chrome://inspect`)

With app open, in WebView console:

```javascript
await NextTrainAdFree.ensureInit()
// → { entitled, billingAvailable }

typeof NextTrainAdFreeNative
NextTrainAdFreeNative?.purchaseInAppProduct != null
```

| `billingAvailable` | `NextTrainAdFreeNative` | Expected UI |
|--------------------|-------------------------|-------------|
| `true` | defined | Menu Remove ads → Play sheet |
| `false` | defined | Link may show; tap → toast error |
| any | **undefined** | Link may show; tap → **nothing** (bug) |

---

## Suggested fixes

1. **Defer loading** `ad-free-bundle.js` until after `Capacitor` is ready (dynamic import in `ensureInit`), or retry bundle init.
2. **Toast when native app but bridge missing:** *“Purchases aren’t available right now. Try updating the app.”*
3. **Don’t show under-ad Remove ads link** when `!billingAvailable && !NextTrainAdFreeNative`.
4. **Break `applyEntitlement` ↔ `initAds` loop** — don’t dispatch `nexttrain:adfree-changed` with `notifyAds` recursion, or guard `initAds` from re-entry.
5. Confirm Play product `com.tdrevans.nexttrain.adfree` exists and app is signed with release key for testing.

---

## QA scripts

```bash
node qa/remove-ads-check.mjs   # web UI + silent-fail repro
```

`TESTING.md` test **15** — Remove ads (web vs Android).

---

## Acceptance criteria

1. On Android with billing ready: tap opens Play purchase flow.
2. On Android without billing: visible control shows a toast (never silent).
3. On web: no purchasable Remove ads control; hint only.
4. `NextTrainAdFreeNative` defined after init on native builds.
