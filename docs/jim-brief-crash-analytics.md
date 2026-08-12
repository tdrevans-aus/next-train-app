# Jim brief: Crash reporting + min analytics (go-live)

**For:** Jim (implement)  
**From:** Simon / Tim  
**Date:** 11 Aug 2026  
**Status:** Sentry locked + DSN in `public/site-config.json` (11 Aug). Jim already has `@sentry/capacitor` — no Angular install. Verify with debug `NextTrainAnalytics.testCrash()` after `cap:sync`.  
**Related:** `docs/go-live-ops.md` · `docs/go-no-go-metrics.md` · launch-program “min analytics” · LB-11  
**Out of scope:** Session replay; heatmaps; PII (names, exact GPS trails, full station lists in clear if avoidable); server-side user accounts

---

## 1. Why

Play Vitals alone is too late for Tim’s holiday window. Need:

1. **Crash / ANR** stacks for release AABs (native + JS where possible)  
2. **Few product events** for go/no-go (journey saved, reminder on, widget, API error, IAP)

---

## 2. Tool pick (Tim locks one)

| Layer | Options | Lock when Tim chooses |
| --- | --- | --- |
| Crashes | **A)** Sentry (Capacitor/JS + Android) **or** **B)** Firebase Crashlytics | **A — Sentry** (Tim 11 Aug) |
| Analytics | **A)** Plausible (privacy-light, coarse) **or** **B)** PostHog (events) **or** **C)** defer product analytics → Play only until Oct | **C — defer** until after holiday |

**Default recommendation if Tim is undecided:** Sentry (crashes) + **defer** product analytics to Play/Vitals until after holiday (crashes > funnels for OOO). If Tim wants both: Sentry + PostHog free tier.

---

## 3. Crash reporting — acceptance

- Release / Play builds send crashes; debug optional or sampling off  
- `version` / `versionCode` / `build` tagged on events  
- No secrets in breadcrumbs (API keys, AdMob internals)  
- Document in `TESTING.md`: force a test crash in a **debug** build only; confirm event in console  
- Privacy / Data safety: if SDK sends IDs, Tim updates Play Data safety to match (Dwayne facts)

---

## 4. Min analytics events (if Tim enables)

| Event | When |
| --- | --- |
| `app_open` | Cold start / resume (throttle OK) |
| `journey_saved` | User saves journey (no need for station name if Tim wants lean) |
| `reminder_enabled` | Reminder path turned on for a journey |
| `widget_pin_requested` / `widget_tap` | Best-effort |
| `api_error_shown` | User-visible fetch failure |
| `iap_purchase_success` / `iap_restore_success` | After Play confirms |
| `ad_load_fail` | Banner fail (rate-limit this) |

No ad personalization IDs in our events. No email.

Wire behind a single `public/analytics.js` (or tiny module) so swapping vendors is one file.

---

## 5. Config

- Prefer env / `site-config.json` keys Tim can set without shipping secrets in git if possible  
- If DSN must ship in client (normal for Sentry browser): use **release** project DSN only; rotate if leaked  
- Document keys in `docs/go-live-ops.md` once live (not the secret values in git)

---

## 6. Slack / Jim

> Jim — when Tim pastes crash (+ optional analytics) credentials, implement `docs/jim-brief-crash-analytics.md`. Crashes first. Few events only. No session replay.
