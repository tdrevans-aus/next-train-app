# Vijay brief — Next Train iOS v6 + WidgetKit

> **Superseded (15 Aug 2026):** Use **`docs/vijay-brief-ios.md`** for the current Mac session (2.2.1 build + smoke).

**From:** Jon (PM) · **Date:** 12 Aug 2026  
**Priority:** P0 — Golf Bag on hold  
**Branch:** `cursor/reminders-dialog-p1` (v6+ baseline — tip `e12eabb` v7)  
**Repo:** `~/Projects/next-train-app`

---

## Locked product decisions (Tim)

| Decision | Value |
|----------|--------|
| Android parity baseline | **v6** (this branch) |
| Widget in v1 iOS | **Yes — essential** |
| TestFlight | **Blocked until widget works on device** |
| ASC / $149 fee | ~17 Aug (after Play closed-test weekend) |

---

## Your mission

Ship **Next Train iOS v1** with **WidgetKit parity** to Android v6, then unblock TestFlight.

**Day-one story:** Near me + Journeys + leave-by + ads + IAP + **home-screen widget**.

---

## Phase 1 — Today (device + core app)

### NT-5 Install on Holly's iPhone

Phone is connected: **hollys phone** · UDID `00008110-001129EA11EA401E`

```bash
cd ~/Projects/next-train-app
nvm use 22
npm run cap:sync:ios
npx cap run ios --target-name "hollys phone"
# or: npx cap open ios → select iPhone → Run
```

- Signing: Tim's Apple ID team (free provisioning OK for now)
- On phone: Settings → General → VPN & Device Management → trust developer

### NT-6 Smoke (Tim signs off)

- [ ] App launches
- [ ] Near me + location permission
- [ ] Save a journey
- [ ] Leave-by displays
- [ ] Ads load (test mode)
- [ ] Remove-ads IAP path opens (don't need purchase yet)

### Fix any reds

Plugins on iOS: AdMob, Geolocation, Native Purchases (`@capgo/native-purchases`)

---

## Phase 2 — WidgetKit (P0, blocks TestFlight)

**Spec:** `docs/widget-homescreen.md` + `docs/widget-redesign-v2.md`  
**Android reference (v6):** port behaviour from:

| Android file | What to port |
|--------------|--------------|
| `CommuteSchedule.java` | Journey selection, active hours, outside-hours → Near me idle |
| `WidgetUiBuilder.java` | Layout states, leave-by copy, stale/loading |
| `WidgetDataService.java` | API fetch `/api/next-train`, cache |
| `WidgetSyncPlugin.java` | Settings sync from web layer |
| `NextTrainWidgetProvider.java` | Widget lifecycle, refresh triggers |
| `JourneySelector.java` | Which journey the widget shows |
| `NextCommutePreview.java` | Preview / countdown math |

### iOS architecture (build this)

1. **App Group** — shared container between app + widget extension  
   e.g. `group.com.tdrevans.nexttrain`
2. **Widget Extension target** in Xcode — WidgetKit  
   - `systemSmall` (2×1 intent — tight layout)  
   - `systemMedium` (roomier + Updated line)
3. **Capacitor bridge** — iOS `WidgetSync` plugin (mirror Android `WidgetSyncPlugin`)  
   - `syncSettings(settingsJson)` → write to App Group UserDefaults  
   - `requestPinWidget()` → iOS widget gallery guidance (no Android pin API)  
   - `getLaunchDeepLink()` / `isAvailable()` / `getWidgetInstanceCount()`
4. **Timeline provider** — fetch times, 15-min network refresh, 1-min local countdown paint
5. **Deep links** — `nexttrain://journey/{id}`, `nexttrain://nearby` in URL types
6. **Web guard** — `public/widget.js` already calls `WidgetSync`; plugin must exist on iOS

### Widget acceptance (from `widget-homescreen.md` §12)

- [ ] Default small widget: Next Train countdown + leave-by
- [ ] Outside active hours → Near me idle face
- [ ] Tap → Journey mode (or Near me when idle)
- [ ] Zero journeys → Add journey CTA
- [ ] Stale / loading states honest (no fake dashes)
- [ ] No ads in widget
- [ ] Matches Android v6 behaviour on same journey data

---

## Phase 3 — After widget QA

| Step | Owner |
|------|-------|
| Tim pays ASC + creates app record + IAP `com.tdrevans.nexttrain.adfree` @ A$3.99 | Tim |
| Archive → Upload → TestFlight internal | Vijay |
| Listing from `docs/store-listing.md` | Tim + Jon |

**No App Store submit** until Tim back from holiday (post 9 Oct).

---

## Optional (don't block TF)

- iOS leave reminders (local notifications) — defer if not ready
- Lock screen / Live Activity widgets — later

---

## Commands cheat sheet

```bash
cd ~/Projects/next-train-app
nvm use 22
npm install
npm run cap:sync:ios
npx cap open ios
npx cap run ios --target-name "iPhone 17 Pro"      # simulator
npx cap run ios --target-name "hollys phone"       # device
```

---

## Report back to Jon

When each phase completes, Tim replies in chat:

- `NT-5 done` / `NT-5 blocked: <reason>`
- `NT-7 widget builds` / `NT-7 blocked: <reason>`
- `TF uploaded` + link

---

## Related docs

- `docs/jon-handoff-ios.md` — ASC / TF path (widget defer overruled)
- `docs/jim-brief-closed-aab-v6-ship-gate.md` — what v6 shipped on Android
- `docs/jim-brief-widget-phase-a-trust.md` — widget phase A (staleness trust)
