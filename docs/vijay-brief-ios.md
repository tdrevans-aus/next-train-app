# Vijay brief — Next Train iOS build (2.2.1)

**From:** Ros (PM) · **Date:** 15 Aug 2026  
**Priority:** P0 — iOS build + device smoke  
**Repo:** `~/Projects/next-train-app`  
**Branch:** `hotfix/2.2.1` (or `master` once PR #31 is merged)  
**Version:** **2.2.1** · `versionCode` **12** (align Xcode with Android)

---

## Start here (Mac)

```bash
cd ~/Projects/next-train-app
git fetch origin
git checkout hotfix/2.2.1    # or: git checkout master && git pull
nvm use 22
npm install
npm run cap:sync:ios
npx cap open ios
```

In Xcode: set **Team** + bundle id **`com.tdrevans.nexttrain`** · confirm version **2.2.1**.

---

## Your mission

Build **Next Train iOS** from the **2.2.1** line. Smoke the core app + **WidgetKit** on device. Unblock TestFlight once widget passes and Tim has paid ASC.

**Day-one story:** Near me + Journeys + leave-by + ads + IAP + **home-screen widget**.

**Not in scope tonight:** App Store submit (waits until Tim back from holiday, post 9 Oct).

---

## Phase 1 — Core app smoke (NT-5 / NT-6)

Run on simulator or device (e.g. **hollys phone** · UDID `00008110-001129EA11EA401E`):

```bash
npx cap run ios --target-name "hollys phone"
# or: npx cap open ios → select iPhone → Run
```

- [ ] App launches
- [ ] Near me + location permission
- [ ] Save a journey
- [ ] Leave-by displays
- [ ] Ads load (test mode OK)
- [ ] Remove-ads IAP path opens (purchase not required yet)

**Plugins to watch:** AdMob, Geolocation, `@capgo/native-purchases`

---

## Phase 2 — Widget on device (NT-7, blocks TestFlight)

Widget code is already in repo (`ios/NextTrainWidget/`, `WidgetSync` plugin). Verify on **real device**:

- [ ] Add widget (small + medium)
- [ ] Countdown + leave-by match the app
- [ ] Outside active hours → Near me idle face
- [ ] Tap → correct deep link (`nexttrain://journey/{id}` or `nexttrain://nearby`)
- [ ] Zero journeys → Add journey CTA
- [ ] Stale / loading states honest (no fake dashes)
- [ ] No ads in widget

**Specs:** `docs/widget-homescreen.md` · `docs/widget-redesign-v2.md`

---

## Phase 3 — TestFlight (after widget QA + ASC)

| Step | Owner |
|------|-------|
| Tim pays Apple Developer (~A$149) + ASC app record + IAP `com.tdrevans.nexttrain.adfree` @ A$3.99 | Tim |
| Archive → Upload → TestFlight internal | Vijay |
| Listing copy from `docs/store-listing.md` | Tim |

**Do not upload to TestFlight** until Tim confirms ASC is paid and widget smoke passes.

---

## Optional (don't block TF)

- iOS leave reminders (local notifications) — defer if not ready
- Lock screen / Live Activity widgets — later

---

## Report back

Reply in chat when each phase completes:

- `NT-5 done` / `NT-5 blocked: <reason>`
- `NT-7 widget builds` / `NT-7 blocked: <reason>`
- `TF uploaded` + link

---

## Related docs

- `docs/jon-handoff-ios.md` — ASC / signing / browser setup (Tim)
- `docs/vijay-brief-ios-v6.md` — earlier brief (superseded by this file)
- `docs/launch-program.md` — program schedule

---

## Change log

| Date | Note |
|------|------|
| 2026-08-15 | Current brief for 2.2.1 iOS build session |
