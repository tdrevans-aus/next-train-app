# Release notes — 2.5.2 (18)

**Track:** App Store (iOS first public release)  
**Type:** Minor line ship (aligned with Play **2.5.2** / `versionCode` **18**)

---

## App Store Connect — What’s New (paste)

**Release name (optional):**
```
2.5.2 — Leave-by for Perth rail
```

**What’s New:**
```
Welcome to Next Train on iPhone.

• Near me — live departures from your nearest station
• Saved journeys with leave-by times and target train
• Home-screen widget with leave-in countdown
• Leave reminders when it’s time to walk out
• On-the-way countdown after you tap I’ve left
• Cancel or snooze reminders from the notification
• Optional one-time remove ads purchase

Unofficial Transperth companion — always check station boards.
```

---

## Shorter variant (if ASC character limit bites)

```
First iPhone release — leave-by for Perth rail.

Near me, saved journeys, home-screen widget, leave reminders, and on-the-way countdown after you’ve left. Free with optional one-time remove ads.

Unofficial — check station boards.
```

---

## TestFlight delta (if testers already had 2.2.x)

Use this instead of the first-release copy above:

```
2.5.2 — reminders and polish

• Leave-now notification when it’s time to walk out
• Cancel or snooze from the notification shade
• On-the-way countdown after I’ve left
• Widget layout and pin behaviour improvements
• Routes and journeys split (saved journeys may need re-setup)
```

---

## Tim device smoke (~20 min)

| # | Flow | Expect |
|---|------|--------|
| 1 | Cold start → Near me | Live board within ~10s |
| 2 | Save journey → leave-by hero | Plausible countdown; refreshes |
| 3 | Menu → Remove ads | Sheet shows store price → sandbox purchase works |
| 4 | Add widget → compare to app | Countdown ±1 min of in-app hero |
| 5 | Journey Remind me on → grant notifications | Schedule readout in Reminder settings |
| 6 | Tap I’ve left (when late or at leave-by) | On-the-way countdown starts |
| 7 | About | Version **2.5.2 (18)** |

---

## Build

```bash
npm run cap:sync:ios
npx cap open ios
```

Xcode → **Any iOS Device** → **Product → Archive** → Upload to App Store Connect.

**Version / Build in Xcode:** `2.5.2` / `18` (App + NextTrainWidget targets).
