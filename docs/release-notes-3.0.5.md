# Release notes — 3.0.5 (Android versionCode 29 / iOS build 31)

**Date:** 26 November 2026
**Previous release:** 3.0.4 (28) on Android; iOS 3.0.4 (30) is what is on the App Store.

**Why PATCH:** no new regions or features in the app shell. It ships the client-side changes merged
since 3.0.4 (installed apps bundle `public/` at build time) and gives iOS its own AdMob IDs so iOS
shows ads at all (FB-69).

**Cut point:** 3.0.4 was built from `8547dda9` (#404, 20 Sep 2026), the commit that last touched
`android/app/build.gradle`. The PR list below is every PR merged after it that touches `public/`,
`web-sources/`, `android/`, `ios/`, `package.json` or `capacitor.config.ts`.

---

## Play release notes (short form, for the Console)

Draft only; the store listing copy in `docs/aso-pass-3-0-5.md` is authoritative. Under Play's
500-character limit, en-AU:

```
• Saved routes in a city we no longer cover now say so clearly and offer "Choose a city"
• New cities: Melbourne, Copenhagen, Washington DC, Dublin, Prague, Vienna, Hong Kong, Los Angeles, Edinburgh Trams
• Clearer messages when a station has no live predictions right now
• Get-the-app links on the About page
• Fixes and polish
```

---

## What's new (rider-facing)

- **Retired cities are explained, not broken.** If a saved city or saved journey is in a city that is
  no longer covered (for example Uppsala), the app says "<City> is no longer covered" and offers
  "Choose a city" instead of showing an error or another city's board. (#558, #556)
- **iOS shows ads.** iOS now uses its own AdMob app and banner IDs. (#550)
- **Honest empty states.** A station with no real-time predictions right now says so, per direction,
  instead of looking blank. (#481, #500)
- **Cities appear without an app release.** The picker is driven by a city manifest with a bundled
  seed, and directions load on demand. "Coming Soon" rows are gone: a city is in the picker or it
  isn't. (#476, #477)
- **Routes editor** station dropdown now anchors to its own field. (#485)
- **About page** has App Store and Google Play buttons; mobile web shows a "Get the app" banner.
  (#545) `app-ads.txt` added for AdMob verification. (#546)
- **iOS shell work** (iOS only): widget extension and `nexttrain://` scheme (#449), second location
  prompt fix (#450), export compliance, location copy and privacy manifest (#456), widget sync plugin
  registered and sentry-cocoa pinned (#457), widget help copy (#459), ad-free purchase removed and
  banner no longer floats over the list (#461, #462), declared no tracking (#516).

## Also improved (server-side, riders already have these through the API)

- **Sydney:** live times and Sydney Metro (static feed moved to the v2 endpoint, freshness checked
  per mode).
- **Melbourne** restored and live (Metro Trains + V/Line at shared stations). (#435, #438, #439)
- **Uppsala** is no longer covered (Trafiklab has no rail for it). (#556)
- New live cities and fixes on the web side: Copenhagen (#454, #508), Washington DC (#444, #482),
  Dublin (#468, #501), Prague (#497, #498), Vienna (#473), Hong Kong (#472, #474), Los Angeles
  (#529, #531, #534), Edinburgh Trams (#538), Brussels scheduled UI (#432), Boston and Metrolink
  terminus-only direction labels (#440), cold-start first-directions reliability (#504), typed
  feed-unavailable errors and honest partial boards (#502).

---

## PR list (merged after 3.0.4, touching app paths)

| PR | Summary |
|---|---|
| #435 | Melbourne: GTFS-RT static-join adapter |
| #438 | Flip Melbourne live |
| #439 | Melbourne + Adelaide terminus-only direction labels |
| #440 | Direction labels: legacy aliases; Boston CR + Metrolink terminus-only |
| #444 | Flip Washington DC live |
| #432 | Brussels: low-key Scheduled UI, scheduled metro tail |
| #454 | Flip Copenhagen live (merge) |
| #449 | iOS: widget extension, URL scheme |
| #450 | iOS WebKit second location prompt |
| #456 | iOS: export compliance, location copy, privacy manifest |
| #457 | iOS: WidgetSyncPlugin registered; sentry-cocoa pinned |
| #459 | iOS widget help copy, release notes, screenshots |
| #461 | iOS: remove ad-free purchase; banner fix; build 29 |
| #462 | Reconcile numbered widget steps onto widget-help dialog |
| #468 | Dublin: flip follow-through |
| #472 | Hong Kong: coordinates + CITY_BOUNDS |
| #473 | Flip Vienna live |
| #474 | Flip Hong Kong live |
| #476 | Picker: remove Coming Soon rows |
| #477 | Registry-driven client (manifest + seed + on-demand directions) |
| #481 | Honest empty state for live stations with no predictions |
| #482 | Washington: terminus-only directions |
| #485 | Routes editor dropdown anchoring |
| #497 | Prague: auto-detect unserved stations |
| #498 | Flip Prague live |
| #500 | Honest empty state per direction |
| #501 | Flip Dublin live |
| #502 | Bespoke adapters: typed FeedUnavailableError, honest partial boards |
| #504 | Cold start: first /api/directions succeeds |
| #508 | Copenhagen terminus guard |
| #516 | iOS 3.0.4 (30): declare no tracking |
| #529 | Los Angeles: flip follow-through |
| #531 | Los Angeles: short-turn termini chips |
| #534 | Los Angeles: flip to live |
| #538 | Edinburgh Trams: tramsLive true |
| #545 | Store links on About + mobile-web banner |
| #546 | app-ads.txt |
| #556 | Uppsala retired |
| #558 | Retired-city message |
| #550 | iOS 3.0.5 (31): iOS AdMob IDs (FB-69) |

(#454 and the Copenhagen follow-ups are listed by their merge commits; one Copenhagen commit has no
PR number in its subject.)

Known and unchanged: Play's "no deobfuscation file" warning is expected (`minifyEnabled false`).

---

## Upgrade / build notes

| File | Change |
|---|---|
| `android/app/build.gradle` | `versionCode` 28 → 29, `versionName` 3.0.4 → 3.0.5 |
| `package.json` | 3.0.4 → 3.0.5 |
| `public/site-config.json` | `appVersion` 3.0.5, `appVersionCode` 29 |
| `config/site-config.example.json` | `appVersion` 3.0.5, `appVersionCode` 29 |
| iOS project | already 3.0.5 / build 31 from #550; not changed here |

Build steps for Tim (Tim-only; not done in this PR):

1. `npm run release:prep`.
2. Android Studio → Generate Signed App Bundle → release (`docs/aab-signing-closed-testing.md`).
3. `node qa/aab-no-dev-assets.mjs android/app/release/app-release.aab` must PASS before upload.
4. iOS: `npm run setup:mac`, confirm Version 3.0.5 / Build 31 on App and NextTrainWidget, archive,
   upload; paste listing copy from `docs/aso-pass-3-0-5.md`.

Tag after merge: `v3.0.5`.
