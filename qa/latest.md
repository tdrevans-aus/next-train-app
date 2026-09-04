## Overnight — 27 Aug 2026 (release for closed upload)

**Candidate:** `2.5.4` (`versionCode` **20**). Working tree was **not committed**. AAB is ready locally.

| Gate | Result |
|------|--------|
| **Pre-upload** (`node qa/pre-upload-check.mjs`) | **PASS** |
| **Android JVM** (`npm run test:android:unit`) | **PASS** (after pin-hero parity + widget test hours) |
| **Full web** (`node qa/run-all.mjs`) | **79 PASS · 2 PASS\* · 24 FAIL** · ~3506s |
| **Smoke** (`npm run test:web` smoke) | **19 PASS · 4 FAIL** — `release:prep` still blocked on smoke |
| **`cap:sync`** | **PASS** |
| **AAB** | `android/app/build/outputs/bundle/release/app-release.aab` · **16.5 MB** · 27 Aug 2026 01:39 AWST |

**Upload this morning:** Gradle `bundleRelease` / `signReleaseBundle` succeeded, but `android/keystore.properties` is **not** in the repo tree. Confirm in Android Studio that this AAB is signed with the **upload key** before Play. If not, **Generate Signed Bundle** over the same tree.

**Ship fix in this tree (uncommitted):** `openJourneysDialogSync` / `populateJourneyListView` no longer crash when deferred `journey-detail.js` is not loaded yet. Android pin-state hero outside Active hours now matches web fixtures (preview next target, skip tonight’s late trains).

**Do not treat as Play-green until smoke is green.** Failures grouped:

| Bucket | Scripts | Notes |
|--------|---------|--------|
| Hidden Active hours (product) | `active-hours-clear-pair`, `smoke-browser` (was fill), `template-wizard-hours-zindex`, `target-active-combo-hints` | From/Until UI hidden; tests still poke those fields. Partial test patches applied. |
| Wizard copy / steps | `first-use-*`, `smoke-11-13` (until hours assert loosened), `template-wizard-*` | Custom-first / Reminders step vs Morning-into-town + hours step |
| Env / fixtures | `adelaide-line-map-conformance`, `run-sydney-sweep-once`, `devtools-*` | Missing Adelaide `published-network.json`; no TfNSW env; `QA_DEVTOOLS` |
| Product / pin | `fb-23-auto-selection`, `journeys-after-nearby-pin`, `leave-by-preferred-gate`, `pin-behavior`, `preferred-always-visible` | Repro in this tree; leave-by hung ~19 min until killed |
| Native CDP | `reminders-permission-native-cdp` | No CDP bytes on 9222 |
| Maestro | `run-maestro.mjs` | **PASS** (~179s) |

**Not done:** git commit / tag `v2.5.4` / Play upload. Say the word to commit.

---



**Shipped to `master`:** `b0e5f01` — journey wizard deferred init, target-train hero preview (outside hours / empty board), post-save stale-board clear + target face restore, geo/nearby hardening, pin-resolution fixture `journey-tuesday-night-morning-preview`.

| Gate | Result |
|------|--------|
| **Full web** (`npm run test:full`) | **82 PASS · 2 PASS\* · 14 FAIL** · ~877s |
| **Release prep** (`npm run release:prep`) | **FAIL** — smoke 18 PASS · 3 FAIL (blocked before `cap:sync`) |

**Tonight's fixes — QA green:** `template-wizard-skip`, `template-wizard-coach-overlap`, `template-wizard-hours-zindex`, `pin-resolution-fixtures`, `new-journey-show-now`, `morning-template-wizard-repro`, `first-use-wizard-repro`, `journey-wizard-after-route`.

**Failures to triage tomorrow (likely mix of env + regressions):**

| Script | Notes |
|--------|-------|
| `reminders-dialog.mjs` | `saveSettingsToStorage is not defined` — suspect deferred `journey-detail.js` / init order |
| `smoke-browser.mjs` | `waitForFunction` timeout (test 12?) |
| `region-selection.mjs` | Mismatch prompt not shown (region UX removed/changed?) |
| `target-outside-active-hint.mjs` | `closeJourneysDialog` / journeys helper timeout after dialog changes |
| `security-xss-share.mjs` | Share URL journey not created |
| `button-visibility.mjs` | |
| `nearby-cache-last-station.mjs` | |
| `nearby-exit-during-gps-refine.mjs` | |
| `nearby-location-hint-keeps-cache.mjs` | |
| `unsupported-region.mjs` | |
| `perth-static-directions.mjs` | Static directions assertion |
| `adelaide-line-map-conformance.mjs` | |
| `run-sydney-sweep-once.mjs` | No TfNSW env (skip) |
| `reminders-permission-native-cdp.mjs` | Native CDP strip/heal |

**Not uploaded:** release prep did not reach `cap:sync` / AAB. Re-run `npm run release:prep` after smoke fixes or known-waiver triage.

---


## QA nightly triage — 17 Aug 2026 (run [#31994432594](https://github.com/tdrevans-aus/next-train-app/actions/runs/31994432594))

**CI:** 19 FAIL / 73 scripts · ~20 min (job limit 45 min — not a timeout).

| Bucket | Scripts | Action |
|--------|---------|--------|
| **Infra false positive** | `patch-ship-gate`, `release-prep`, `widget-theme-palettes` | **Excluded** from `run-all.mjs` nightly suite (need `cap sync` / pre-upload) |
| **App bug fixed** | `clearPairedActiveHourField` | Clear both active-hour fields; skip auto-refill on explicit clear |
| **Share URL bug fixed** | `readUrlSettings` | Include `settingsSchemaVersion: 2` so `migrateSettings` does not wipe journeys |
| **Tests updated** | `active-hours-clear-pair`, `new-journey-show-now`, `other-directions-journey-repro`, `security-xss-share` | Match FB-23 chrome + schema v2 |
| **CI-only flakes (pass locally)** | `button-visibility`, `first-use-wizard-repro`, `duplicate-morning-template-repro`, `morning-template-wizard-repro`, `preferred-always-visible` | Hardened `clickJourneyListItem` to use `openJourneyDetail` API first |
| **Fixed (17 Aug follow-up)** | `journey-cap-repro`, `commute-strip-cdp`, `swipe-repro`, `station-typeahead` | Cap at 5 + preferred time; schema v2 seed; `armJourneyLeaveCard`; hide train-meta when combobox open |

**Local re-check (post-fix):** `security-xss-share`, `new-journey-show-now`, `active-hours-clear-pair`, `other-directions-journey-repro`, `journey-cap-repro`, `commute-strip-cdp`, `swipe-repro`, `station-typeahead` → **PASS**.

---

## Template wizard Active hours coach z-index (~10:05 AWST 11 Aug)

**Report:** Tim — Active hours coach still hidden behind Active from/until on device during AAB prep.

**Root cause:** Same as `docs/jim-brief-template-wizard-z-index.md` — coach overlay `z-index: 20` vs highlight `z-index: 21`.

**Fix (local):** `public/styles.css` — scrim `z-index: 20`, highlight stays `21`, coach card `z-index: 22`; coach shell `z-index: auto` so card can stack above highlight.

**QA:** `template-wizard-skip.mjs` PASS · `template-wizard-hours-zindex.mjs` PASS (new — overlap paint order).

**Before closed AAB:** `npm run cap:sync` + rebuild signed bundle. Jim brief can close after device spot-check.

---

# QA Report — Tuesday 11 Aug 2026 (~08:25 AWST)

## Full web regression (post P1/P2 batch)

**28 scripts** on `localhost:3000`. Summary: **25 PASS · 1 FAIL (Jim) · 2 PASS\*** (exit 1 = good) · swipe repro informational.

### PASS (22 exit 0)

| Script | Notes |
|--------|-------|
| `smoke-browser.mjs` | Tests 1–11, 13 |
| `smoke-11-13.mjs` | |
| `button-visibility.mjs` | 6 PASS |
| `stickiness-coaches-logic.mjs` | 10 PASS |
| `reminders-dialog.mjs` | |
| `other-directions-journey-repro.mjs` | |
| `custom-template-no-wizard-repro.mjs` | |
| `morning-template-wizard-repro.mjs` | ~296 ms open |
| `duplicate-morning-template-repro.mjs` | |
| `remove-ads-check.mjs` | |
| `unsupported-region.mjs` | |
| `yanchep-whitfords-direction.mjs` | |
| `mandurah-cockburn-direction.mjs` | |
| `custom-active-days-today.mjs` | P1 |
| `new-journey-show-now.mjs` | P1 |
| `outside-hours-nearby.mjs` | P1 |
| `template-wizard-skip.mjs` | P1 |
| `journey-cap-repro.mjs` | Cap hint + 6 max |
| `active-hours-clear-pair.mjs` | Clear from → clear until |
| `template-chip-edited-hours.mjs` | Morning/Evening chips |
| `station-typeahead.mjs` | P2 #6 |
| `nearby-cache-last-station.mjs` | |
| `nearby-cold-start-no-empty-flash.mjs` | |
| `nearby-dont-wait-manual-pick.mjs` | |

### PASS\* (exit 1 = expected good)

| Script | Meaning |
|--------|---------|
| `custom-template-delay-repro.mjs` | Custom opens fast (~not slow) |
| `done-double-tap-repro.mjs` | No stuck dialog in automation |

### FAIL — Jim

| Script | Issue |
|--------|-------|
| `delete-last-journey.mjs` | Storage cleared (`journeys: 0`) but **Journeys dialog stays open**; hero still shows route, not **No journeys yet** |

```
Jim fix this docs/jim-brief-delete-last-journey.md — regression FAIL: finishAfterAllJourneysDeleted → enterJourneyMode re-opens dialog when journeyModeActive.
```

### Informational

| Script | Notes |
|--------|-------|
| `swipe-repro.mjs` | Runs; headless pointer swipe did not change countdown (manual TESTING.md 4–5 still required). Updated regex `min` vs `minute`. |

**Not automated:** widget P2 #7 on device, native reminders 17–19.

**Re-verify (~08:50 AWST):** `delete-last-journey.mjs` still **FAIL** — same symptoms. Ros summary accurate.

---

# QA Report — Tuesday 11 Aug 2026 (~09:40 AWST)

## Clarkson → Yanchep line group (confirmed + merged)

**Tim:** Clarkson / Yanchep merge like Whitfords / Yanchep.

**Live check** (`/api/directions?station=Perth Underground Stn`): directions included **Clarkson** and **Yanchep** separately — same-line duplicate.

**Merged:** `Yanchep: ["Yanchep", "Whitfords", "Clarkson"]` in `lib/train-times.js`, `public/app.js`, bundle rebuilt. `node qa/yanchep-whitfords-direction.mjs` **PASS**.

**Deploy:** run `npx vercel --prod` again so production API drops Clarkson from Perth picker (local change only until deploy).

---


## Post P2 #6 / #7 regression (local working tree)

**Trigger:** Tim asked for full regression after Jim finishes P2 **#6** (station typeahead) and **#7** (widget 2×1 empty-leave layout).

**P2 status in repo (uncommitted local):**

| Item | Evidence |
|------|----------|
| **#6 Station typeahead** | `createStationCombobox()` in `public/app.js`; combobox markup in `index.html` (journey + Near me) |
| **#7 Widget empty-leave** | `WidgetUiBuilder.shouldParkUpdatedOnLeft()` + `WidgetUiBuilderTest` |

**Web regression** (`localhost:3000`, 21 scripts):

| Script | Result | Notes |
|--------|--------|-------|
| `smoke-browser.mjs` | **FAIL** | Timeout — looks for journey list `out` (legacy name; journeys now template names) |

**Fixed (11 Aug ~14:30 AWST):** Test bug — single `#journeys-btn` tap when app is on Near me (outside active hours). Patched `openJourneysDialog()` + `data-journey-id="j-out"`; `closeJourneysDialog()` now clears backdrop. **12 PASS · 0 FAIL** · `smoke-11-13.mjs` **2 PASS**.
| `smoke-11-13.mjs` | **FAIL** | Same class of journey-list naming / flow |
| `button-visibility.mjs` | **PASS** | |
| `stickiness-coaches-logic.mjs` | **PASS** | |
| `reminders-dialog.mjs` | **PASS** | |
| `other-directions-journey-repro.mjs` | **PASS** | |
| `custom-template-no-wizard-repro.mjs` | **PASS** | |
| `custom-template-delay-repro.mjs` | **PASS*** | exit 1 = Custom fast (~not slow) |
| `morning-template-wizard-repro.mjs` | **PASS** | |
| `duplicate-morning-template-repro.mjs` | **PASS** | |
| `done-double-tap-repro.mjs` | **PASS*** | exit 1 = did not reproduce stuck dialog |
| `remove-ads-check.mjs` | **PASS** | |
| `unsupported-region.mjs` | **PASS** | |
| `yanchep-whitfords-direction.mjs` | **PASS** | |
| `mandurah-cockburn-direction.mjs` | **PASS** | |
| `custom-active-days-today.mjs` | **PASS** | P1 |
| `new-journey-show-now.mjs` | **PASS** | P1 |
| `outside-hours-nearby.mjs` | **PASS** | P1 |
| `template-wizard-skip.mjs` | **PASS** | P1 |
| `journey-cap-repro.mjs` | **PASS** | Cap hint + 6 max enforced |
| `delete-last-journey.mjs` | **PASS** | Can delete sole journey |

**Android unit tests:** `WidgetUiBuilderTest` not run here (no JAVA_HOME on QA machine). Tim/Jim: run on device after `cap:sync`.

**Follow-up:** Update `smoke-browser.mjs` / `smoke-11-13.mjs` for current journey names. Manual widget **#7** on 2×1 after APK rebuild.

---

# QA Report — Monday 10 Aug 2026 (~20:21 AWST)

## Template wizard — Active hours step under highlighted fields

**Tim:** On **Active hours** wizard step, **Active from / until** overlap the coach **Next** button — wizard appears under the feature.

**Cause:** `#detail-journey-window.template-wizard-highlight` is `z-index: 21`; `.template-route-coach` is `z-index: 20` — coach card trapped below highlight.

**Jim:** `Jim fix this docs/jim-brief-template-wizard-z-index.md`

---

# QA Report — Monday 10 Aug 2026 (~23:25 AWST)

## Active from cleared alone → error on Save

**Tim:** Clear **Active from**, **Save** → alert *Set both default from and until times, or leave both blank.*

**Wanted:** Auto-clear **Active until** and save (no active hours = manual journey only).

**Jim:** `Jim fix this docs/jim-brief-active-hours-clear-pair.md`

---

# QA Report — Monday 10 Aug 2026 (~17:51 AWST)

## Morning template chip visible when “Morning into town” already exists

**Tim:** Four journeys including **Morning into town** (Warwick → Perth) but **Morning into town** template chip still shown. **Evening home** chip correctly hidden.

### Root cause (confirmed)

Template chip hiding uses `journeyMatchesTemplate()`:

1. `journey.templateKey === "morning"` → hide chip, **or**
2. Legacy: name **exactly** `"Morning into town"` **and** `defaultFrom === "06:00"` **and** `defaultUntil === "09:00"`

**`templateKey` is not persisted** — `normalizeJourney()` omits `templateKey` / `autoRoute`, so every **Save** strips them from `localStorage`. After reload, matching is legacy-only (name + exact preset hours).

If you kept the name but changed active hours (e.g. **05:30–09:00**), legacy match **fails** → chip stays visible. Evening chip hides because **Evening home** still has preset **15:00–18:00**.

### Web repro

Morning template → change active hours to **05:30–09:00** → Save → reopen Journeys:

- `templateKey: undefined` in storage
- `morningChipHidden: false` (bug)
- Name still `"Morning into town"`

### Jim fix direction

1. **Persist** `templateKey` (and `autoRoute`) in `normalizeJourney`.
2. **Broaden match:** hide morning/evening chip when `templateKey` matches **or** journey name matches preset name (hours may differ after edit).
3. Related: `docs/jim-brief-duplicate-morning-template.md` — same chip logic allows duplicate morning rows.

**Jim:** `Jim fix this docs/jim-brief-duplicate-morning-template.md` (extend with persist + name match)

---

# QA Report — Monday 10 Aug 2026 (~17:56 AWST)

## Seven journeys — cap is UI-only, not enforced on save

**Tim:** **7** configured journeys (last row **Warwick → Perth** duplicates **Morning into town** route). Expected 6 cap to block 7th.

### Clarification on earlier QA note

Web test “7th blocked” = **Add journey chips hidden** at 6. **Not** a hard limit. `createJourneyFromTemplate` and `saveJourneyDetailFromForm` have **no max check** — saves can exceed 6.

### How 7 is possible

| Factor | Detail |
|--------|--------|
| Cap check | `atCap = settingsDraftJourneys.length >= 6` — **hides chips only** |
| Persist | No trim on save — 7 rows can land in `localStorage` |
| Morning chip bug | Chip visible when hours ≠ preset → extra adds while draft &lt; 6 |
| Warwick → Perth | Same route as Morning — likely Custom or duplicate Morning create |

Jim: `MAX_JOURNEYS` + guard on create/save (count **configured** journeys) + cap hint UX.

---


## “System UI isn’t responding” after adding 4th journey (overlap test)

**Tim:** Android showed **System UI isn’t responding** while on journey detail — **Canning Bridge**, native **time picker** open (5:34 AM), Reminder section visible. Context: adding **fourth journey** to test overlap.

### Repro attempt (web)

**Script:** `node qa/journey-cap-repro.mjs` → **could not reproduce hang** on Chromium.

| Check | Result |
|-------|--------|
| Add 4 Custom journeys with **overlapping** active hours (06–09 ×2, 15–18 ×2) | Saves **~850 ms** each; **no** main-thread block |
| Overlap guard on save | J2 blocks vs J1; J4 blocks vs J3 — overlap error shown, **not saved** |
| Persisted count after overlap batch | **2** journeys (only non-conflicting saves) |

**Overlap on 4th save is expected** if hours match an existing journey — in-app error, not a crash.

### Likely cause of System UI ANR (device)

**System UI isn’t responding** = Android **ANR** (system shell thread blocked), not an in-app toast.

Screenshot shows the **native Material time picker** over the journey form — common WebView/Capacitor trigger when the picker + dialog stack misbehaves on emulator or under load. **Not reproduced** by overlap validation alone on web (~850 ms saves).

**Also possible:** emulator stress + widget/refresh work after journey save (separate from overlap logic). Correlation with “4th journey” may be coincidence with overlap editing + time picker, not count-specific.

**Jim:** No code fix identified from web repro. If Tim can reproduce on device: grab **adb logcat** during ANR; note whether picker was open and whether overlap error was on screen. Optional hardening: avoid blocking work on save path on Android (widget sync already flagged in widget briefs).

---

## Journey count limit

**Code:** `updateJourneyTemplatesVisibility()` — cap when `settingsDraftJourneys.length >= 6`.

| At 6 journeys | Behaviour |
|-----------------|-----------|
| **Add a journey** chips (Morning / Evening / Custom) | **Hidden** — entire `#journey-templates` block |
| **Explicit message** | **None** — section disappears silently |
| **7th attempt** | Templates already hidden — **cannot add** via UI |
| **Backend guard** | **No** — `createJourneyFromTemplate` does not check cap (UI-only) |

**Web test:** Six non-overlapping Custom journeys → **6 persisted**, templates hidden, 7th attempt `templates-hidden` → **PASS**.

**UX gap:** User at cap sees list + **Done** only — no “You’ve reached the maximum (6 journeys)” hint. Worth a one-line message when `atCap` (Jim polish, not blocking).

**Script:** `qa/journey-cap-repro.mjs`

---

# QA Report — Monday 10 Aug 2026 (~17:15 AWST)

## First load flash: Updating → “No upcoming trains” → data (~2s)

**Tim:** On first open — loading, then **No upcoming trains** for a few seconds, then screen populates correctly.

**Likely cause (code review):**

1. **Initial HTML** shows `Updating…` + `—` before any fetch completes.
2. **First `fetchNextTrain` finishes with `next === null`** → `render()` sets **No upcoming trains** (journey mode) or nearby board empty state.
3. **~2s later** a **second fetch** succeeds (common triggers: `visibilitychange` on app foreground also calls `fetchNextTrain`; or Vercel API empty then live-times client / retry).

**Contributing factors:**

- No **in-flight guard** on `fetchNextTrain` — overlapping calls can race; slower call wins last.
- **No “still loading”** state during journey fetch — empty API response is shown as final empty, not as loading.
- **Direction filter** on first API response can yield zero trips (e.g. Whitfords-terminated vs journey saved as Yanchep before line groups on server) → false empty until retry/client path.

**Not a regression catch** in web suite (smoke uses fixtures with immediate data).

**Jim fix direction:** Hold loading UI until first successful fetch OR stale cache; debounce/single-flight `fetchNextTrain`; don’t show **No upcoming trains** until fetch confirmed empty + optional short delay.

---

# QA Report — Monday 10 Aug 2026 (~17:09 AWST)

## Full web regression run

All scripts **PASS** (15/15). Dev server `localhost:3000`.

| Script | Result | Notes |
|--------|--------|-------|
| `qa/smoke-browser.mjs` | **PASS** | |
| `qa/smoke-11-13.mjs` | **PASS** | |
| `qa/button-visibility.mjs` | **PASS** | |
| `qa/stickiness-coaches-logic.mjs` | **PASS** | |
| `qa/reminders-dialog.mjs` | **PASS** | |
| `qa/other-directions-journey-repro.mjs` | **PASS** | |
| `qa/custom-template-no-wizard-repro.mjs` | **PASS** | |
| `qa/custom-template-delay-repro.mjs` | **PASS** | Custom ~312 ms with 4 s geo sim (exit 1 = not slow) |
| `qa/morning-template-wizard-repro.mjs` | **PASS** | |
| `qa/duplicate-morning-template-repro.mjs` | **PASS** | |
| `qa/done-double-tap-repro.mjs` | **PASS** | exit 1 = did not reproduce |
| `qa/remove-ads-check.mjs` | **PASS** | |
| `qa/unsupported-region.mjs` | **PASS** | |
| `qa/yanchep-whitfords-direction.mjs` | **PASS** | |
| `qa/mandurah-cockburn-direction.mjs` | **PASS** | |

**Not automated:** TESTING.md **22** widget on device, **17–19** native reminders, manual journeys UX.

---

# QA Report — Monday 10 Aug 2026 (~16:18 AWST)

## Direction line groups — Tim approved

| Group? | Canonical | Also include | Notes |
|--------|-----------|--------------|-------|
| ✅ | **Yanchep** | Whitfords, **Butler** | Northbound Yanchep line |
| ✅ | **Mandurah** | Cockburn Central | Southbound Mandurah line |
| ✅ | **Fremantle** | Claremont | Westbound Fremantle line |
| ❌ | — | High Wycombe + Ellenbrook | Branched lines — do **not** group |

**Jim:** `docs/jim-brief-direction-line-groups.md`

---

# QA Report — Monday 10 Aug 2026 (~16:02 AWST)

## Bull Creek — Cockburn + Mandurah same line

**Tim:** Bull Creek shows 3 directions: Cockburn, Mandurah, Perth — Cockburn/Mandurah duplicate same southbound line (Whitfords/Yanchep pattern).

**Fix:** `Mandurah: ["Mandurah", "Cockburn"]` in `LINE_DESTINATION_GROUPS` + client mirror; `Cockburn Central` → Cockburn alias.

**Test:** `node qa/mandurah-cockburn-direction.mjs` → **PASS**

**Brief:** `docs/jim-brief-mandurah-cockburn-direction.md`

**Manual:** Bull Creek → direction picker shows **Perth** + **Mandurah** only (no Cockburn). Mandurah journey includes Cockburn-short trains.

---

# QA Report — Monday 10 Aug 2026 (~15:53 AWST)

## I've left — double tap (Leave by card)

**Tim:** **I've left** on Leave by card needed **2 clicks** once in a session (intermittent).

**Root cause:** `fetchNextTrain()` set `lastRenderedNext = null` **before** the network `await`. UI still showed buttons from prior render; click handler no-oped until fetch finished.

**Fix (local):** `getLeaveAckTarget()` falls back to `lastApiData`; removed early `lastRenderedNext = null` on fetch start.

**Retest:** While **Updating…** or mid-refresh, tap **I've left** once when late — card should dismiss immediately.

---

# QA Report — Monday 10 Aug 2026 (~15:44 AWST)

## Overlap error scroll fix (local)

**Change:** `showJourneyOverlapError` → `scrollIntoView({ block: "center" })` after reveal; removed focus on Active from (was scrolling error off-screen).

**Retest:** Journeys → edit journey → set overlapping Active hours → Save → error + Fix for me visible without manual scroll.

---

# QA Report — Monday 10 Aug 2026 (~15:40 AWST)

## Overlap error hidden under Save footer

**Tim:** On Save with overlapping Active hours, inline error (pink box + **Fix for me**) sits **under** sticky Cancel/Save — barely visible unless scroll.

**Cause:** `#detail-active-hours-error` at bottom of `.settings-detail-scroll`; footer steals viewport; no `scrollIntoView` on show.

**Jim brief:** `docs/jim-brief-journey-overlap-friendly.md` §8

**Fix:** Scroll error into view and/or relocate above footer.

---

# QA Report — Monday 10 Aug 2026 (~13:25 AWST)

## Yanchep line — collapse Whitfords (`docs/jim-brief-yanchep-whitfords-direction.md`)

| Test | Script | Result |
|------|--------|--------|
| Line grouping + trip filter | `node qa/yanchep-whitfords-direction.mjs` | **PASS** |
| Smoke regression | `node qa/smoke-browser.mjs` | **PASS** (12 PASS · 0 FAIL) |

**Shipped:** `LINE_DESTINATION_GROUPS` in `lib/train-times.js`; mirrored `LINE_DIRECTION_GROUPS` in `public/app.js`; bundle rebuilt + `cap:sync`.

**Manual:** Tim spot-check Perth outbound during mixed short/long period — Yanchep journey should include Whitfords-terminated trains.

---

# QA Report — Monday 10 Aug 2026 (~15:30 AWST)

## Done double-tap (`docs/jim-brief-done-double-tap.md`)

| Fix | Area |
|-----|------|
| `closeMenuDialogOnly()` shared helper | `app.js` — exported for sub-screens |
| Reminders closes immediately; native save in background | `leave-reminders.js` |
| Inline validation (no alert dead-tap) | `#reminders-validation-error` |
| Cancel + backdrop dismiss | `#reminders-dialog` |
| Menu chrome reset from Reminders / widget entry | `leave-reminders.js`, `widget.js` |

`node qa/done-double-tap-repro.mjs` → web scenarios pass.

---

# QA Report — Monday 10 Aug 2026 (~15:15 AWST)

## Jim prompt latest — widget already-have + overlap Fix for me

| Brief | Result |
|-------|--------|
| `docs/jim-brief-widget-already-have.md` | **Shipped** — `getWidgetInstanceCount`; help dialog branches on count |
| `docs/jim-brief-journey-overlap-friendly.md` | **Shipped** — locked copy, inline error, **Fix for me** |

Regression: `node qa/smoke-browser.mjs` (test 10 overlap inline).

---

# QA Report — Monday 10 Aug 2026 (~14:50 AWST)

## Widget stuck Updating… + tap (`docs/jim-brief-widget-stuck-updating-tap.md`)

| Fix | Area |
|-----|------|
| `refreshAll` on background executor | `CommuteRefreshService` |
| `onResume` no longer blocks UI thread | `MainActivity` |
| Updating timeout → stale **Tap to refresh** | `CommuteSchedule.applyUpdatingState` |
| 1-min local retry while fetching | `needsLocalRepaint` during updating window |
| 2×1 **…** not **Upd** | `WidgetUiBuilder.compactPrimary` |

**Manual:** Re-pin widget after rebuild; confirm tap opens app; leave emulator through departure + failed network.

---

# QA Report — Monday 10 Aug 2026 (~15:28 AWST)

## Widget idle crash + stuck Updating (Tim screenshot)

**Tim:** Left emulator on homescreen; **“Next Train keeps stopping”** system dialog. Both widgets stuck **Updating…** / **Upd**, **Fetching…**, **17m ago** (Fremantle).

**Matches:** `docs/jim-brief-widget-stuck-updating-tap.md` (#10) — post-departure **Updating** state, network refresh not succeeding, stale timestamp.

**Why idle hurts (committed APK on `a9e52cb`):**

| Trigger while idle | What runs |
|--------------------|-----------|
| **15 min** `WidgetRefreshReceiver` | `refreshAll` → **sync HTTP on broadcast thread** (up to 15s) |
| Departure passes | `WidgetDepartureAdvanceReceiver` → same |
| Unlock / boot | `WidgetUnlockReceiver` → same |
| Open app / widget tap | `MainActivity.onResume` → `requestRefresh` + **sync** `refreshAll` on **UI thread** |

Stuck **Updating** + failed fetch → widget never recovers; opening app or periodic alarms can **ANR / crash** → **“keeps stopping”**.

**Jim fix in working tree (not committed):** async `refreshAll`, 3 min updating timeout → **Tap to refresh**, compact **…** primary. **Tim needs commit + `cap:sync`** before retest.

**Tim now:** Force-stop → reopen from launcher (not widget). After rebuild, retest idle + tap per brief.

---

# QA Report — Monday 10 Aug 2026 (~15:23 AWST)

## Done needs two taps — Tim repro again (still open)

**Tim:** Happened again on device — intermittent **Done ×2** on Menu or Reminders.

**Status:** **No Jim fix yet** — same code paths as brief. Web repro still clean; **native async Reminders save** remains top suspect.

**Next capture when it happens:**
1. **Menu or Reminders?**
2. First tap: **nothing** vs **alert** vs dialog closes **after ~1–2s**?
3. **Backdrop** still dimmed after first tap?
4. Any toggles right before (nudge/pause, journey reminder)?

**Jim brief:** `docs/jim-brief-done-double-tap.md` (still accurate)

---

# QA Report — Monday 10 Aug 2026 (~15:11 AWST)

## Widget stuck Updating (#10) — Jim fix in working tree, retest

**Brief:** `docs/jim-brief-widget-stuck-updating-tap.md`

**Code status:** Fix present in **uncommitted** local changes (`CommuteRefreshService`, `CommuteSchedule`, `MainActivity`, tests). **Not on `git HEAD`** yet — Tim needs Jim to commit + `cap:sync` before emulator retest.

### What Jim shipped (code review)

| Brief item | Status |
|------------|--------|
| Async `refreshAll` (no UI-thread network) | ✅ `ExecutorService` + `refreshAllOnWorker` |
| `onResume` doesn’t block WebView | ✅ `refreshAll` async only (removed sync `requestRefresh` on resume) |
| Escape perpetual Updating | ✅ `UPDATING_TIMEOUT_MS` = **3 min** → **Tap to refresh** + **Times may be out of date** |
| Tim’s **58m ago** case | ✅ If `refreshedAtMs` ≥ 3 min old at updating entry → **stale state immediately** (not Updating + 58m ago) |
| **Upd** truncation | ✅ `compactPrimary("Updating…")` → **"…"** on 2×1 |
| Local ticks while updating | ✅ `needsLocalRepaint` true while `updatingSinceMs` &lt; 3 min |

### Automated retest

| Test | Result |
|------|--------|
| JUnit `CommuteScheduleTest` + `WidgetUiBuilderTest` | **Not run** — no `JAVA_HOME` on this machine |
| Web regression | N/A (native widget) |

### Manual retest for Tim (emulator, after `cap:sync`)

1. Pin widget, wait for departure to pass → brief **…** / **Fetching…** (not **Upd**).
2. Kill network or block API → within **~3 min** should show **Tap to refresh** + **Times may be out of date** (not stuck Updating + old “Xm ago” forever).
3. **Tap widget** → app opens immediately (WebView visible); refresh happens in background.
4. Restore network → widget recovers to next train or **No trains**.

**Verdict:** **Code looks fixed** — **manual device confirm pending** after Jim commits + APK rebuild.

---

# QA Report — Monday 10 Aug 2026 (~14:41 AWST)

## Widget stuck Updating… + tap won’t open app (emulator ~1h)

**Reported by Tim:** Emulator left ~1h. Widget shows truncated **Upd**, **Fetching…**, **58m ago**. Tap widget — app fails to open.

**Verdict:** **FAIL** (test 22) — stuck in `applyUpdatingState` after departure; network refresh not recovering; **58m ago** proves no successful fetch in ~1h.

| Observation | Detail |
|---------------|--------|
| **Upd** | **Updating…** clipped on 2×1 (26sp primary) |
| **Fetching…** | `applyUpdatingState` secondary (compact) |
| **58m ago** | Last good `refreshedAtMs`; stuck waiting on network |
| Tap fails | Suspect `MainActivity.onResume` → `refreshAll` **sync HTTP on UI thread** (ANR / no WebView) |

**Jim brief:** `docs/jim-brief-widget-stuck-updating-tap.md`

**Tim now:** Force-stop app → reopen from launcher; check emulator network; don’t rely on widget tap until fix.

---

# QA Report — Monday 10 Aug 2026 (~13:30 AWST)

## Done needs two taps (Menu / Reminders)

**Reported by Tim:** Occasionally must tap **Done** twice on Menu or Reminders; seems random, often after activity.

**Repro:** `node qa/done-double-tap-repro.mjs` → **did not reproduce on web** (single Done closes all scenarios).

**Likely causes (code review):** Reminders Done calls async `saveRemindersDialog()` on native (dialog stays open during save); validation alert blocks close if reminder on without train time; menu chrome not fully reset when opening Reminders from Menu.

**Jim brief:** `docs/jim-brief-done-double-tap.md`

**Tim manual:** Repro on Android after toggling reminder options; note alert vs slow save vs stuck backdrop.

---

# QA Report — Monday 10 Aug 2026 (~13:19 AWST)

## Perth directions — Whitfords vs Yanchep (same line)

**Reported by Tim:** From Perth, direction picker lists **Whitfords** and **Yanchep** separately; should feel like one **Yanchep line** direction.

**Verdict:** Product / data UX — not a crash. Tim approved **small line group** approach (no exception DB).

**Jim brief:** `docs/jim-brief-yanchep-whitfords-direction.md`

---

# QA Report — Monday 10 Aug 2026 (~12:56 AWST)


**Verdict:** All **automated** items **PASS**. Widget **#6 / #8 / #9** code shipped — **#9** layout fixed; **#8** post-departure logic covered by `CommuteScheduleTest` (manual device confirm for test **22**).

| # | Bug | Automated | Status |
|---|-----|-----------|--------|
| 1 | Menu → Reminders silent | `node qa/reminders-dialog.mjs` | **PASS** |
| 2 | Other directions in My Journeys | `node qa/other-directions-journey-repro.mjs` | **PASS** |
| 3 | Custom template slow | `node qa/custom-template-delay-repro.mjs` | **PASS** |
| 4 | Morning template dead first tap | `node qa/morning-template-wizard-repro.mjs` | **PASS** |
| 5 | Duplicate Morning + overlap | `node qa/duplicate-morning-template-repro.mjs` | **PASS** |
| 6 | Widget stale + truncated Updated | TESTING.md **22** (manual) | **Code shipped** (#9 layout + `formatUpdatedAgo`) |
| 7 | Custom — no route wizard | `node qa/custom-template-no-wizard-repro.mjs` | **PASS** |
| 8 | Widget NOW + old clock after departure | `CommuteScheduleTest` | **Code shipped** — manual device |
| 9 | Widget 2×1 train clock clipped | `WidgetUiBuilderTest` + manual | **PASS** (layout) |

Regression: `node qa/button-visibility.mjs` → **PASS**

---

# QA Report — Monday 10 Aug 2026 (~12:32 AWST)

## Regression run (automated)

**Branch:** `cursor/reminders-dialog-p1` (local; may be behind `origin` iOS commit `f927d81`)  
**Server:** `localhost:3000`

| Test | Script / ref | Result |
|------|----------------|--------|
| Smoke 1–11, 13 | `qa/smoke-browser.mjs` | **PASS** (12 PASS · 0 FAIL) |
| Smoke 11, 13 | `qa/smoke-11-13.mjs` | **PASS** (2 PASS · 0 FAIL) |
| 15 Remove ads (web) | `qa/remove-ads-check.mjs` | **PASS** (console: `registerPlugin` error on mock native) |
| 16 Button visibility | `qa/button-visibility.mjs` | **PASS** (6 PASS · 0 FAIL) |
| 20 Stickiness coaches | `qa/stickiness-coaches-logic.mjs` | **PASS** (8 PASS · 0 FAIL) |
| 21 Reminders dialog | `qa/reminders-dialog.mjs` | **PASS** |
| 23 Other directions | `qa/other-directions-journey-repro.mjs` | **PASS** |
| 26 Custom wizard | `qa/custom-template-no-wizard-repro.mjs` | **PASS** |
| Custom template delay | `qa/custom-template-delay-repro.mjs` | **PASS** (detail ~340 ms with 4 s geo; script exit 1 = not slow) |
| Morning wizard UX | `qa/morning-template-wizard-repro.mjs` | **PASS** (detail ~280–298 ms even with 5 s geo) |
| 13b Duplicate Morning | `qa/duplicate-morning-template-repro.mjs` | **PASS** |

**Not automated (manual / device):** **22** widget homescreen (#8 post-departure staleness, #9 2×1 clock clip), **17–19** native reminders scheduling, **24–27** journey edit icon, name on detail, active days.

**Verdict:** All **web-automatable** regressions **PASS** on this branch snapshot.

---

# QA Report — Monday 10 Aug 2026 (~12:23 AWST)

## Widget 2×1 — train clock clipped / “disappeared”

**Status (Jim):** **PASS** — `widget_small.xml` tightened (4dp padding, 22sp primary, `includeFontPadding=false`); `WidgetUiBuilder` inlines countdown + clock on 2×1 (`11 min · 12:34`), hides station on small, shortens Updated crumb (`Just now` / `3m ago`). JUnit: `WidgetUiBuilderTest`.

**Reported by Tim:** Scheduled train time under the big countdown is missing or cut off (**11 min** + half-visible **12:34**); **Updated just** truncated at bottom.

**Screenshot:** Warwick journey — **Leave in 1 min**, station **Warwick**, primary **11 min**, clock clipped at widget bottom edge.

**Verdict:** **Layout bug (FAIL test 22)** — data is present (`trainClock` set); **2×1** cell too tall for current stack.

| Column | Lines in `widget_small.xml` |
|--------|------------------------------|
| Left | NEXT TRAIN + **26sp** primary + train clock |
| Right | Leave line + **station** (`widget_route`) + Updated |

Six text rows + 8dp padding in **40dp** min height (`next_train_widget_info.xml` 2×1) → bottom row(s) clip. Train clock is often the casualty on the left.

**Jim fix (suggested):** Tighten 2×1 — e.g. smaller primary on small layout, inline clock with countdown (`11 min · 12:34`), hide station on 2×1 (medium only), or reduce padding / line count. See `docs/widget-homescreen.md` §5 (2×1 strip).

**Not** the post-departure staleness bug — times are live (**11 min**, **Leave in 1 min**).

---

# QA Report — Monday 10 Aug 2026 (~10:52 AWST)

## Widget — NOW + old clock after departure (regression)

**Reported by Tim:** Phone **10:48**; widget **NOW** + **10:47**, **Leave 11 min ago**, **Ashfield**, **Updated 3m ago**. Train minute has passed — stale, not next train.

**Jim brief:** `docs/jim-brief-widget-post-departure-staleness.md`

**Verdict:** **FAIL** (test 22) — same class as earlier widget stale report; truncated Updated fixed but post-departure advance still broken on device.

---

# QA Report — Monday 10 Aug 2026 (~10:31 AWST)


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


---

# QA Report — Monday 10 Aug 2026 (~10:11 AWST)


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
