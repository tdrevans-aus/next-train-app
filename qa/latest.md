# QA Report — Monday 10 Aug 2026 (~10:52 AWST)

## Widget — NOW + old clock after departure (regression)

**Reported by Tim:** Phone **10:48**; widget **NOW** + **10:47**, **Leave 11 min ago**, **Ashfield**, **Updated 3m ago**. Train minute has passed — stale, not next train.

**Jim brief:** `docs/jim-brief-widget-post-departure-staleness.md`

**Verdict:** **FAIL** (test 22) — same class as earlier widget stale report; truncated Updated fixed but post-departure advance still broken on device.

---

# QA Report — Monday 10 Aug 2026 (~10:31 AWST)

**Jim batch:** `docs/jim-brief-open-bugs.md` — **all automated items PASS** (#6 widget still manual on device).

| # | Bug | Automated | Status |
|---|-----|-------------|--------|
| 1 | Menu → Reminders silent | `node qa/reminders-dialog.mjs` | **PASS** |
| 2 | Other directions in My Journeys | `node qa/other-directions-journey-repro.mjs` | **PASS** |
| 3 | Custom template slow | `node qa/custom-template-delay-repro.mjs` | **PASS** |
| 4 | Morning template dead first tap | `node qa/morning-template-wizard-repro.mjs` | **PASS** |
| 5 | Duplicate Morning + overlap | test 13b | **Fixed** |
| 6 | Widget stale + truncated Updated | TESTING.md **22** | **Code shipped** — manual device |
| 7 | Custom — no route wizard | `node qa/custom-template-no-wizard-repro.mjs` | **PASS** |

Regression: `node qa/button-visibility.mjs` → **PASS**

---

# QA Report — Monday 10 Aug 2026 (~10:38 AWST)

**Jim batch verification** — re-ran all automated repros after Jim’s fixes.

| # | Bug | Automated | Result |
|---|-----|-----------|--------|
| 1 | Menu → Reminders silent | `node qa/reminders-dialog.mjs` | **PASS** |
| 2 | Other directions in My Journeys | `node qa/other-directions-journey-repro.mjs` | **PASS** |
| 3 | Custom template slow | `node qa/custom-template-delay-repro.mjs` | **PASS** (detail ~295 ms with 4 s simulated geo) |
| 4 | Morning template dead first tap | `node qa/morning-template-wizard-repro.mjs` | **PASS** (detail ~280 ms even with 5 s geo delay) |
| 5 | Duplicate Morning + overlap | `node qa/duplicate-morning-template-repro.mjs` | **PASS** (1 row after second Morning tap) |
| 6 | Widget stale + truncated Updated | TESTING.md **22** | **Not verified here** — needs manual Android device + pinned widget |
| 7 | Custom — no route wizard | `node qa/custom-template-no-wizard-repro.mjs` | **PASS** (coach on Custom first setup) |

Regression: `node qa/button-visibility.mjs` → **PASS** (6 screens)

**Verdict:** All **web-automatable** open bugs **PASS**. **#6 widget** still needs Tim on device (`cap:sync` + rebuild).

---

# QA Report — Monday 10 Aug 2026 (~10:28 AWST)

## Custom template — no route wizard; Morning shows it later

**Reported by Tim:** Onboarding → **Set up a journey** → **Custom** — no 3-step template coach (route / time to station / active hours). Later tap **Morning into town** → coach appears.

**Repro:** `node qa/custom-template-no-wizard-repro.mjs` → **REPRODUCED** (fixed in ~10:31 pass)

| Step | Template route coach (`#template-route-coach`) |
|------|-----------------------------------------------|
| Custom (first template) | **Hidden** — detail opens with no guided steps |
| ← Journeys → Morning | **Visible** — “Route picked for you” + Next / Got it flow |

**Root cause:** `createJourneyFromTemplate("custom")` only calls `openJourneyDetail`. `showTemplateRouteCoach` runs only from `completeTemplateRouteSetup` (Morning/Evening commute templates). Custom skips the coach entirely.

**Jim fix (suggested):** After Custom detail opens, call `showTemplateRouteCoach` with `templateKey: "custom"` and copy for blank form (“Pick your station and direction…”) — same 3 steps as commute templates. Optionally track first-setup session so coach shows once per onboarding, not on every Custom.

**Jim batch:** add to `docs/jim-brief-open-bugs.md` #7.

---

# QA Report — Monday 10 Aug 2026 (~10:11 AWST)

**Jim batch:** `docs/jim-brief-open-bugs.md` — **resolved in code** (re-run QA on device for widget #6).

| # | Bug | Automated | Status |
|---|-----|-------------|--------|
| 1 | Menu → Reminders silent | `node qa/reminders-dialog.mjs` | **PASS** |
| 2 | Other directions in My Journeys | `node qa/other-directions-journey-repro.mjs` | **PASS** |
| 3 | Custom template slow | `node qa/custom-template-delay-repro.mjs` | **PASS** (~350 ms detail open with 4s geo) |
| 4 | Morning template dead first tap | `node qa/morning-template-wizard-repro.mjs` | **PASS** (detail ~300 ms; geo in background + loading label) |
| 5 | Duplicate Morning + overlap | Manual / test 13b | **Fixed** — reuse unconfigured template row; skip shells in overlap check |
| 6 | Widget stale + truncated Updated | TESTING.md **22** | **Code shipped** — `formatUpdatedAgo` + layout; **manual device** still required |

Regression: `node qa/button-visibility.mjs` → **PASS**

---

# QA Report — Monday 10 Aug 2026 (~10:05 AWST)

**Jim batch:** `docs/jim-brief-open-bugs.md` — paste into Jim’s chat: `Jim — go docs/jim-brief-open-bugs.md`

---

## Custom template — several seconds before detail opens

**Reported by Tim:** **Custom** template chip feels slow (several seconds) before journey detail appears.

**Repro:** `node qa/custom-template-delay-repro.mjs` → **REPRODUCED**

| Observation | Detail |
|-------------|--------|
| Simulated 4s geo delay | Custom detail opens after **~4236 ms** (first tap; chips disabled entire wait) |
| Same delay as Morning | Morning **~4218 ms** in same run — both blocked on geolocation |
| No loading UI | List view stays visible; chips disabled; no spinner / “Finding nearest station…” |

**Root cause:** Custom path in `createJourneyFromTemplate` only pushes a blank shell and calls `openJourneyDetail` (no geo). But `populateJourneyDetailForm` runs `applyDefaultJourneyRoute` for **any** `isUnconfiguredJourney` — including Custom — which awaits `findNearestStation()` before showing detail. Custom is meant to be blank; user picks station/direction manually.

**Jim fix (suggested):** Skip `applyDefaultJourneyRoute` in detail form when journey was created via Custom template (flag on journey or template context), or show detail immediately and auto-fill nearest in background with loading hint on station field only.

**Related:** Same dead-feel UX as Morning wizard repro (`qa/morning-template-wizard-repro.mjs`).

---

# QA Report — Monday 10 Aug 2026 (~09:38 AWST)

## Other directions in My Journeys mode

**Reported by Tim:** **OTHER DIRECTIONS** block visible while **My Journeys** chrome is active (Armadale morning journey).

**Repro:** `node qa/other-directions-journey-repro.mjs` → **FAIL**

**Steps:** Journeys dialog open → **Near me** → **Done** → Other directions still visible in Journey mode.

**Root cause:** `closeJourneysDialog` sets `journeyModeActive` without `exitNearbyMode()`; `render()` never hides `#nearby-directions`.

**Jim brief:** `docs/jim-brief-other-directions-in-journey-mode.md`

---

# QA Report — Monday 10 Aug 2026 (~09:32 AWST)

## Widget — stale times + truncated Updated

**Reported by Tim:** Phone **9:29**; widget shows **NOW** + scheduled **09:13** + **25 min late**; **Updated 9:10 A…** (truncated).

**TESTING.md:** **test 22** (homescreen times, app vs widget, stale regression).

| Issue | Verdict |
|-------|---------|
| **09:13 at 9:29** | Scheduled clock + **stale** snapshot (Updated ~19 min old). Big number is live countdown from cache, not fresh “next train 9:13”. |
| **NOW + stale Updated** | Departure-advance / 15m refresh likely missed; local repaint only. See test 22. |
| **Updated truncated** | **Layout bug** — `widget_small.xml` `widget_updated`: `ellipsize="end"`, narrow column; string `Updated 9:10 am` clipped to `Updated 9:10 A…`. Jim: `match_parent` width on crumb, and/or `PerthTime.formatUpdatedAgo` (already exists). |

---

# QA Report — Monday 10 Aug 2026 (~07:12 AWST)

## Menu → Reminders silent no-op

**Reported by Tim:** **Reminders** in Menu does nothing.

**Repro:** `node qa/reminders-dialog.mjs` → **FAIL**

**Root cause:** Page error on load — `Identifier 'DEFAULT_REMIND_DAYS' has already been declared`. Both `public/app.js` and `public/leave-reminders.js` declare `const DEFAULT_REMIND_DAYS` at global scope. **`leave-reminders.js` never runs** → no click handler, `window.nextTrainLeaveReminders` undefined.

**Fix for Jim:** Remove duplicate from `leave-reminders.js` (use inline `[1,2,3,4,5]` or share via `window` / IIFE). One-line fix.

**TESTING.md:** Added **test 21** + `qa/reminders-dialog.mjs`.

---

# QA Report — Monday 10 Aug 2026 (~07:10 AWST)

## Morning template — first tap feels dead (wizard setup)

**Reported by Tim:** **Morning into town** chip did nothing on first press, worked on second — initial setup via onboarding wizard.

**Repro script:** `node qa/morning-template-wizard-repro.mjs` (wizard path: Got it → Set up a journey → Morning).

**Verdict:** **UX bug (Medium)** — not a logic “needs two taps” bug. First tap **does** start work; UI gives **no feedback** for 1–15s.

| Observation | Detail |
|-------------|--------|
| During tap | All template chips `disabled`; **list view stays visible**; no spinner / “Finding nearest station…” |
| After `findNearestStation()` | Detail + template wizard coach open correctly |
| Slow geo (4s simulated) | ~4s of “nothing happened” then detail opens on **first** tap alone |
| Second tap while disabled | Ignored; if user taps again after first completes, may **feel** like second tap worked |

**Cause:** `createJourneyFromCommuteTemplate` → `applyDefaultJourneyRoute` → `findNearestStation()` (geolocation, up to 15s timeout) with no loading state. Nearby mode already resolved location but template path **re-requests** geo.

**Android note:** First-ever **location permission** prompt can add the same dead feel on device.

**Jim fixes (suggested):** Loading label on chips/dialog; reuse `nearbySession` station when entering from wizard; don’t disable chips without visible progress.

---

# QA Report — Sunday 9 Aug 2026 (~15:15 AWST)

## Deliverables for Jim

| File | Purpose |
|------|---------|
| `docs/jim-brief-duplicate-morning-template.md` | Duplicate morning template / double wizard overlap bug |

## Test 16 — Button visibility (`qa/button-visibility.mjs`)

**390×844 viewport:** 5 PASS · 0 FAIL (main, journeys list, journey detail including **Delete**, menu, help).

**Delete button fix:** Removed erroneous `margin-top: 4.5rem` on `#delete-journey-btn` (was clipping below dialog). Footer now uses `gap: 0.75rem`.


**Status:** **FAIL** (known bug, matches Tim’s overlap-with-self report)

Wizard + second **Morning into town** → two journeys → Save shows overlap with same name.

## Test 15 — Remove ads

### Web (`localhost:3000`)

| Check | Result |
|-------|--------|
| Menu **Remove ads** button | Hidden (`#menu-remove-ads-btn`) |
| Menu web hint | Should show *Ad-free is available in the Android app* when Menu opens |
| **Remove ads** under ad slot | Hidden on web (`syncAdRemoveLink` requires native) |
| Forced click on web (if link shown) | **Silent no-op** — `purchaseAdFree()` returns when `!isNativeApp()` with **no toast** (UX bug if link ever visible on web) |
| Mock native + billing + menu click | Toast: *Couldn't complete purchase. Try again.* (expected with mock failure) |
| Console | `Maximum call stack size exceeded` in `applyEntitlement` ↔ `initAds` loop (may break ad-free init) |

**Verdict:** On **browser**, Remove ads is **by design not purchasable**. If Tim sees a **Remove ads** control on web and nothing happens → expected broken UX (link should stay hidden; if visible, click is silent).

### Android (Tim’s device)

Not automated here. If **Remove ads** visible and tap does **nothing** (no sheet, no toast):

1. **Billing unavailable** — menu buy row should be hidden; link under ad may still show; tap should toast (if JS healthy).
2. **Stale APK** — sync + rebuild after `public/` changes.
3. **Stack overflow** during ad init — may prevent handlers / toast.
4. **User cancelled** Play sheet — intentional silent return.

**Ask Tim:** Menu row vs link under ad? Emulator vs real device? Any toast at all?

## Prior: Test 13 templates (local web)

**PASS** after Jim’s `migrateSettings` fix — Morning / Evening / Custom open detail and save.

Android debug bundle may still be stale until `npm run cap:sync` + rebuild.
