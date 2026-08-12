# Jon handoff — iOS / App Store

**For:** Jon (Mac) · Tim (product / App Store Connect) · PM  
**Date:** 12 Aug 2026  
**Mac:** Available (Tim’s daughter’s MacBook) — Jon can start Xcode / sync / TestFlight path.  
**ASC / Apple Developer fee:** Short hold until Play closed-test first reactions (~weekend 15–16 Aug). If OK → Tim pays fee + creates ASC app shell + IAP in browser; then Jon can upload builds.

**Repo already has:** `ios/` Capacitor project · `@capacitor/ios` in `package.json` · bundle id target **`com.tdrevans.nexttrain`** · location usage string + AdMob `GADApplicationIdentifier` in `Info.plist`

---

## What needs a Mac (Jon)

| Step | Notes |
| --- | --- |
| Open in Xcode | `npx cap open ios` (on Mac after sync) |
| Signing / team / provisioning | Apple Developer team; automatic signing OK for TestFlight |
| CocoaPods / SPM resolve | First open may fetch packages |
| Run on simulator / device | Smoke Near me, Journeys, ads, IAP |
| Archive → Upload → TestFlight | Needs ASC app record + paid Apple membership first |
| iOS device screenshots | If Ruth needs phone frames from real UI |

**Until ASC fee is paid:** Jon can still sync, open Xcode, fix build/signing reds on simulator with a personal/team cert if Tim’s Apple ID is enrolled — but **TestFlight upload waits** on Developer Program + ASC app.

---

## What Tim does in browser (no Mac required)

1. Apple Developer Program membership active for Evans / Tim (**after** weekend ASC green light).  
2. Create app record: name **Next Train**, bundle id **`com.tdrevans.nexttrain`** (must match Capacitor `appId`).  
3. Privacy policy URL: `https://next-train-app.vercel.app/privacy.html`  
4. Support URL / email: About + `EvansAppStudio@gmail.com`  
5. **IAP:** one-time non-consumable `com.tdrevans.nexttrain.adfree` @ **A$3.99** (mirror Play).  
6. Age rating / encryption export answers (standard HTTPS = usually exempt questionnaire).  
7. Draft listing from `docs/store-listing.md` (subtitle locked: *Know when to walk out*).  

Ruth signs off marketing later; Tim creates the empty shell when fee is paid.

---

## Engineering notes (this repo)

| Item | Status / action |
| --- | --- |
| Feature parity table | § below — **locked for v1 iOS** |
| Sync iOS | `npm run cap:sync:ios` or `npx cap sync ios` |
| Info.plist privacy strings | Location present; add notification / tracking strings when plugins land |
| Web guards | Prefer `isNativePlatform()`; hide Android-only widget UI on iOS |
| Leave reminders on iOS | **Not** Android `PreferredTrainReminder` — need Capacitor local notifications (or defer) |
| Widget | **Android-only** for v1 iOS |
| Deep links `nexttrain://` | Document for Associated Domains / URL types on Mac |

---

## Feature parity — iOS v1 (locked proposal)

| Feature | Android today | iOS v1 | Notes |
| --- | --- | --- | --- |
| Near me + Journeys + leave-by | Yes | **Ship** | Core product |
| Live Transperth via Vercel API | Yes | **Ship** | Same web layer |
| Location (When In Use) | Yes | **Ship** | String already in Info.plist |
| AdMob banner | Yes | **Ship** | GAD id already in Info.plist |
| Remove ads IAP (A$3.99) | Play Billing | **Ship** | Capgo native purchases + ASC product |
| Leave reminders (local) | Native Android scheduler | **Ship if ready** / else **defer** | Needs iOS notification plugin + permission UX; don’t fake Android plugin |
| Home-screen widget | Yes | **Defer** | Play differentiator; WidgetKit = later |
| Commute FGS / strip | Removed / P2 | **N/A** | |
| Exact alarm quirks | Android | **N/A** | iOS uses notification scheduling model |

**Day-one story:** “Leave-by + Near me on iPhone” — not “widget parity.”

---

## Jon — first Mac session (checklist)

```text
1. Clone repo / pull latest; npm install
2. npm run cap:sync:ios
   (or: build:ads + ad-free + train-times + geo + analytics, then npx cap sync ios)
3. npx cap open ios
4. Set Team + bundle com.tdrevans.nexttrain; align version with Android 2.1.x
5. Run on simulator — Near me, save journey, leave-by
6. Fix any red plugins (AdMob, Purchases, Geolocation)
7. After Tim pays ASC: Device + TestFlight internal
8. Ping Tim: TF link + anything blocked
```

**Tim holiday 27 Sep – 9 Oct:** Jon may continue TestFlight builds; **no App Store submit** until Tim back + Dwayne/Ruth sign-offs.

---

## Deep links / URL scheme (for Jon)

Android uses `nexttrain://` (journey, nearby, home). iOS needs matching URL types in Xcode. Confirm hosts match `DeepLinkHelper` allowlist before TestFlight deep-link tests.

---

## Risks

- ASC app id / IAP setup slips into holiday if weekend green light slips  
- Parity fights during TF (“where’s the widget?”) — table above prevents that  
- Notification permission copy not written — do before TF if shipping reminders  

---

## Slack / WhatsApp (Tim → Jon)

> Jon — Mac is available. Pull latest, then open **`docs/jon-handoff-ios.md`**.  
> Start: `npm install` → build scripts in the doc → `npx cap sync ios` → `npx cap open ios`.  
> v1 = leave-by + Near me + ads/IAP; **no widget**. Reminders only if local-notifications path is ready.  
> Apple Developer / TestFlight upload waits on ASC fee (likely after this weekend). Simulator / Xcode reds you can knock out now.  
> Tim OOO 27 Sep–9 Oct: TF OK, no App Store submit.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First Jon handoff; PC-parallel work while Mac unavailable |
| 2026-08-12 | Mac available; ASC still short-gated on closed-test reactions |
