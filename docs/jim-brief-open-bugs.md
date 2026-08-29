# Jim brief: Open QA bugs (10 Aug 2026)

**For:** Jim  
**From:** Tim (QA)  
**Priority:** Fix all items below before next Tim QA pass  
**Master log:** `qa/latest.md` (10 Aug entries)

---

## Repo guardrails

- **Scope:** Bug fixes only — no new features, no unrelated refactors.
- **Web:** `public/` — test on `npm start` → `http://localhost:3000`.
- **Android:** `npm run cap:sync` + rebuild debug APK after `public/` or native changes.
- **Commits:** Jim’s usual flow; Tim does not need per-bug commits.
- **When done:** Run every automated repro in the checklist → all **PASS**. Mark items resolved in `qa/latest.md` or tell Tim to re-run QA.

---

## Checklist (work in order)

| # | Bug | Priority | Detail | Repro / test | Pass when |
|---|-----|----------|--------|--------------|-----------|
| 1 | **Menu → Reminders silent** | **High** | `leave-reminders.js` never loads — duplicate `const DEFAULT_REMIND_DAYS` in `app.js` + `leave-reminders.js` | `node qa/reminders-dialog.mjs` · TESTING.md **21** | **PASS** — dialog opens, Done visible |
| 2 | **Other directions in My Journeys** | Medium | `#nearby-directions` leaks after Near me → Done in Journeys dialog | `docs/jim-brief-other-directions-in-journey-mode.md` · `node qa/repros/other-directions-journey-repro.mjs` · TESTING.md **23** | **PASS** — block hidden in journey mode |
| 3 | **Custom template slow** | Medium | Custom should open blank detail immediately; `populateJourneyDetailForm` awaits `findNearestStation` for all unconfigured journeys | `qa/latest.md` (~10:05) · `node qa/repros/custom-template-delay-repro.mjs` | Detail opens **without** geo delay on Custom |
| 4 | **Morning template — dead first tap** | Medium | Same geo path with no loading UI; chips disabled 1–15s | `qa/latest.md` (~07:10) · `node qa/repros/morning-template-wizard-repro.mjs` | Visible progress while geo runs; reuse `nearbySession` when possible |
| 5 | **Duplicate Morning + overlap on Save** | Medium | Second “Morning into town” from wizard → overlap error with self | `docs/jim-brief-duplicate-morning-template.md` | Save succeeds; no false overlap |
| 6 | **Widget stale times + truncated Updated** | Medium | NOW + old scheduled clock + Updated stuck; `Updated 9:10 A…` on 2×1 | TESTING.md **22** · `docs/widget-homescreen.md` · `android/.../CommuteSchedule.java`, `WidgetDepartureAdvanceScheduler`, `widget_small.xml` | Manual on device: fresh Updated, readable crumb, next train after departure passes |
| 7 | **Custom — no route wizard; Morning shows it later** | Medium | First setup: Custom skips 3-step coach; Morning later shows it | `qa/latest.md` (~10:28) · `node qa/repros/custom-template-no-wizard-repro.mjs` | Custom first-setup shows same coach flow (custom copy) |
| 8 | **Widget NOW + old clock after departure** | **High** | Post-departure minute: **NOW** + stale scheduled clock, not next train | `docs/jim-brief-widget-post-departure-staleness.md` · TESTING.md **22** | Next train or **Updating…** after departure; never stale **NOW** + old clock |
| 9 | **Widget 2×1 train clock clipped** | Medium | Scheduled time under countdown cut off; **Updated** truncated | `qa/latest.md` (~12:23) · `widget_small.xml` | Full **12:34** readable; **Updated just now** not clipped |
| 10 | **Widget stuck Updating + tap won’t open** | **High** | **Upd** / Fetching / **58m ago** after ~1h; tap fails | `docs/jim-brief-widget-stuck-updating-tap.md` · test **22** | Tap opens app; widget recovers or shows honest stale |
| 11 | **Journey cap not enforced (7–8+ journeys)** | Medium | Cap hides chips only; no save/create guard; Morning chip wrong; no cap hint | `docs/jim-brief-journey-cap.md` · `node qa/repros/journey-cap-repro.mjs` | Cannot save 7th; Morning chip hidden; cap hint at 6 |

**Regression (keep green):**

```bash
node qa/button-visibility.mjs
```

Expect **PASS** (Delete button no longer clipped on 390×844).

---

## Bug notes (quick reference)

### 1. Reminders

Remove or rename duplicate `DEFAULT_REMIND_DAYS` in `leave-reminders.js` (inline `[1,2,3,4,5]`, IIFE, or read from shared `window` export). One-line class of fix.

### 3. Custom template

`createJourneyFromTemplate("custom")` → blank shell → `openJourneyDetail`. But `populateJourneyDetailForm` calls `applyDefaultJourneyRoute` for any `isUnconfiguredJourney`, which blocks on `findNearestStation()` before showing detail.

**Fix direction:** Skip auto-route for Custom (flag on journey or template context), **or** show detail immediately and auto-fill in background with station-field loading hint only.

### 4. Morning template UX

Shares geo slowness with #3 but Morning *should* auto-fill. Add loading label on chips/dialog; don’t disable chips without visible progress; consider reusing `nearbySession` instead of re-requesting geo.

### 6. Widget (Android native)

Two sub-issues:

1. **Stale snapshot** — e.g. phone 9:29, widget shows NOW + scheduled 09:13 + Updated ~19 min old. Departure-advance / network refresh likely missed.
2. **Truncated Updated** — `widget_updated` ellipsize in narrow 2×1; use full width and/or `PerthTime.formatUpdatedAgo`.

JUnit pointer: `android/app/src/test/java/com/tdrevans/nexttrain/CommuteScheduleTest.java`

### 7. Custom — no route wizard

Onboarding → Custom: detail opens but `#template-route-coach` stays hidden. Morning/Evening call `completeTemplateRouteSetup` → `showTemplateRouteCoach`. Custom path does not.

**Fix:** Invoke coach for Custom with appropriate copy (no “defaulted to nearest” unless user taps Use nearest). Align first-journey onboarding so all templates get the 3-step guide.

---

## Out of scope (this pass)

| Item | Why |
|------|-----|
| **Remove ads on web** (TESTING.md **15**) | By design not purchasable in browser; link should stay hidden |
| **Remove ads on Android** | Needs Tim device details unless you fix `applyEntitlement` ↔ `initAds` stack overflow from logs |
| **Leave reminders v2 scheduling** (tests **17–19**) | Native scheduler shipped; separate pass unless broken by #1 |

---

## Slack-ready

> Open QA batch (10 Aug) — fix all in `docs/jim-brief-open-bugs.md`: Reminders parse error, Other directions in journey mode, Custom/Morning template geo UX, duplicate Morning overlap, widget stale + truncated Updated. Run all `node qa/*-repro.mjs` + test 21–23.
