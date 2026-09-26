# Release notes — 3.0.4 (versionCode 28)

**Date:** 20 September 2026
**Previous release:** 3.0.3 (27) — the first public (production) release on Play.

**Why PATCH:** fixes only. 3.0.3 went public with two defects found the same day; this release
exists to correct them. No new features, regions or copy.

---

## Play release notes (short form, for the Console)

Almost nobody has 3.0.3 yet, so the text still introduces the app, with one line for the fix.
Under Play's 500-character limit, en-AU:

```
Welcome to Next Train.

• Live train departures for 34 cities and regions across Australia, the UK, Sweden, Finland and Norway
• Save your commute and see when to walk out the door, delays included
• Near me opens the board for your closest station
• Search any station in your country by name
• Leave-by reminders and a home screen widget
• Free with ads. One purchase removes them, no subscription

This update fixes a start-up problem from our first release.
```

---

## What's in it

Merges since 3.0.3 was built (`android/` and `public/` only; expansion work merged in the same
window rides along as already-live web content):

- **#434** — **Banner ads never started.** `public/ads.js` began itself only from the window
  `load` event, but it is injected lazily after first train paint, by which time `load` has
  usually already fired. No AdMob call was ever made in the Play build (confirmed on a Samsung
  S24+ from the store, and on an emulator). It now starts immediately when the document is
  already complete. New smoke gate `qa/ads-init-after-deferred-load.mjs`. Verified 20 Sep on the
  Pixel 9 emulator: cold start, no manual trigger, consent check → initialise → banner shown.
- **#406, #407** — **Release builds prune dev-only assets.** Gradle's pre-build asset copy
  re-added the gitignored `dogfood-origin.json` (an internal LAN origin; security review D-06)
  after `cap:sync` had pruned it, so the 3.0.3 AAB shipped it. The prune now runs whenever a
  release packaging task is in Gradle's execution graph. New gate `qa/aab-no-dev-assets.mjs`
  inspects the built AAB.
- **#405** — Release prep runs `cap:sync` before the gates that read synced assets.

Known and unchanged: Play's "no deobfuscation file" warning is expected (`minifyEnabled false`).

---

## Upgrade / build notes

| File | Change |
|---|---|
| `android/app/build.gradle` | `versionCode` 27 → 28, `versionName` 3.0.3 → 3.0.4 |
| `package.json` | 3.0.3 → 3.0.4 |
| `public/site-config.json` | `appVersion` 3.0.4, `appVersionCode` 28 |
| `config/site-config.example.json` | `appVersion` 3.0.4, `appVersionCode` 28 |

Build steps for Tim:

1. `npm run release:prep` (now syncs first, then gates).
2. Android Studio → Generate Signed App Bundle → release.
3. `node qa/aab-no-dev-assets.mjs android/app/release/app-release.aab` — must PASS before upload.
4. After install from Play: a banner should appear at the bottom of Near me within a few seconds.
   A brand-new AdMob app can serve few real ads for the first day or two; an empty slot then is
   fill, not this bug. The device log will show `Ads` SDK lines either way.

Tag after merge: `v3.0.4` (and `v3.0.3` on the commit 27 was built from, if wanted).
