# Jim brief: Outside active day — preview hero + browse swipe

**For:** Implement + QA  
**From:** Tim (product)  
**Status:** Ready to code  
**Backlog:** Extends **FB-20** (journey pin/target); follows Saturday pin fix (Aug 2026)  
**Related:** `docs/pin-behavior.md` · `docs/jim-brief-journey-pin-preferred-target.md` · `docs/jim-brief-commute-target-train-face.md` · `android/.../NextCommutePreview.java` · `public/pin-state.js`  
**Deferred:** **Brief 2** — Active from/to field simplification (separate pass after ship + test)  
**Out of scope:** Widget layout changes; route-journey pin rules; changing `remindDays` UX; Brief 2 schedule-field redesign

---

## 1. Problem

On a **non-active day** (e.g. Saturday for a Mon–Fri commute), the **widget** correctly shows the **next target commute** (e.g. **Monday · 15:30**) via outside-hours / `NextCommutePreview` idle face.

The **main Journeys hero** still behaves like a **live route board** — it defaults to **today’s true next** train. After the Aug 2026 Saturday pin fix, today’s trains are no longer wrongly labelled **Target train**, but the **default face** still does not match the widget’s commute-intent story.

**User expectation (Tim, locked):**

1. **Default hero** = next **target** commute (like widget), not true next.  
2. **Swipe left/right** = optional browse of the **live board** (true next and later trains on the route).  
3. **Leave-by** hidden while browsing unless the user **pins** a train.  
4. When the target trip is **not in the API yet**, show a **preview hero** (e.g. **Monday · 15:30**) with **no countdown**.

---

## 2. Locked decisions

| Topic | Lock |
|-------|------|
| Default hero (outside active **day**) | Next **target** on next **remind day** — preview or live trip when present in `upcoming` |
| Preview when trip missing | **Monday · 15:30** style (day word + preferred clock); **no** departure countdown |
| Swipe outside active day | **Allowed** — browse live board; does **not** retarget commute |
| Swipe inside active window | **Existing FB-20** — pin/target locks swipe when hero shows active pin (unchanged) |
| Labels on browse | **Next train** / **Later train** — never **Target train** on a non–remind-day departure |
| Target chrome on browse | **Off** on today’s trains; **on** only when hero shows the remind-day target |
| Leave-by outside active day | **Hidden** unless user has **pinned** a train (day override or explicit pin on a departure) |
| Leave-by while browsing (unpinned) | **Hidden** — browsing is exploration only |
| Pin icon (unpinned target) | Unfilled when showing default target preview; filled only when override/pin active |
| Widget | **No change** — app may be richer (swipe); widget stays preview idle |
| Active from / until fields | **Unchanged in this brief** — still drive in-window behaviour; Brief 2 will revisit UX |

---

## 3. Mode matrix

Perth clock. **Active day** = `remindDays` includes today. **Active window** = active day **and** `defaultFrom`–`defaultUntil` (`journeyMatchesSchedule` in app).

| Mode | Example | Default hero | Countdown | Swipe | Leave-by | Secondary “Next” |
|------|---------|--------------|-----------|-------|----------|------------------|
| **A. Inside active window** | Mon 07:00, target 07:30 | Live target / pin | Yes | Locked when pin/target owns hero (FB-20) | Per existing pin + window rules | When true next ≠ pin |
| **B. Outside hours, same active day** | Mon 22:00, window 06–09 | True next (live board) | Yes | Browse | Hidden unless pinned | Per existing outside-hours fixture |
| **C. Outside active day** | Sat 10:00, Mon–Fri commute | **Preview or live target** (Mon 15:30) | **No** on preview; yes if live trip in API | **Unlocked** browse | **Hidden** unless pinned | Optional: muted true next when on preview face |
| **D. Target dismissed today** | Sat, user unpinned target | Preview target chrome, **unfilled** pin | No on preview | Unlocked browse | Hidden unless pinned | Hidden or true next per §5 |

**This brief owns mode C** (and preview branches of D). Modes A–B stay as documented in `pin-behavior.md` unless explicitly noted below.

---

## 4. Default hero — outside active day (mode C)

### 4.1 Resolution priority

When `!journeyMatchesActiveDay(journey)` and journey has a **preferred target**:

1. **Live target trip** — first upcoming departure on a **remind day** at or after preferred time (existing `resolveJourneyPreferredTargetDepartureOnRemindDays` / `widgetFaceDeparture` parity).  
2. **Preview face** — if no matching trip in `upcoming`, build preview from journey settings (align with `NextCommutePreview.findNext` / widget `outsideHoursSnapshot`):
   - Primary line: preferred clock (e.g. `15:30`)  
   - Day line: day word (e.g. `Monday`)  
   - Route: `Edgewater → Perth` (existing route formatting)  
   - Label: **Target train** (or **Next Journey** when no preferred — out of scope for typical commute)  
   - **No** `depart-countdown` / minutes-primary

### 4.2 Entering Journeys / tab return

- `restoreJourneyTargetPinFace` must position on **remind-day target slot**, not “first train at/after preferred time **today**”.  
- Skip index = index of live target trip in `upcoming`, or **preview position** (skip 0 with preview hero flag) when trip absent.  
- Must **not** clear `journeyPinDismissedDate`.

### 4.3 Parity with widget

| Surface | Saturday, target Mon 15:30, API has only Sat trains |
|---------|-----------------------------------------------------|
| Widget idle | `TARGET TRAIN` / `15:30` / `Monday` / route |
| App default hero | Same story + route; swipe available |

Native reference: `CommuteSchedulePreview.outsideHoursSnapshot`, `NextCommutePreview.formatDayWord`, `idleWidgetLabel`.

---

## 5. Swipe — outside active day

### 5.1 Contract change (from Aug 2026 hotfix)

Recent fix set `isHeroPinLockingSwipe: true` when future remind-day target owns hero. **This brief relaxes that for mode C only:**

- `isHeroPinLockingSwipe === false` when outside active **day** and user is browsing (`skipTrains` points at non-target train).  
- Default return position after fetch/tab enter remains **target** (preview or live slot).

### 5.2 While swiping (unpinned)

| Hero showing | Label | Target chrome | Pin btn | Leave-by |
|--------------|-------|---------------|---------|----------|
| Preview Mon 15:30 | Target train | Blue target | Unfilled (unless dismissed rules) | Hidden |
| Today true next | Next train | Off | Unfilled | Hidden |
| Later today train | Later train | Off | Unfilled | Hidden |
| Live Mon target in API | Target train | On | Per dismiss/override | Hidden unless pinned |

### 5.3 Pin while browsing

- Pin tap on a **non-target** departure → **day override** for today (existing override semantics).  
- Then: **Pinned train** chrome, leave-by **may** arm per existing in-window maths if applicable; on Saturday override of a Saturday train, leave-by follows override pin rules (still no “Monday preview” leave-by).  
- Pin tap to **unpin** override → return toward default target preview / live remind-day target.

### 5.4 Return to target

- Swipe back to target index, or re-enter Journeys tab (`restoreJourneyTargetPinFace`).  
- Optional v1: existing jump-to-target affordance must resolve to **remind-day target**, not today’s preferred-time match.

---

## 6. Leave-by

| Context | Leave-by card |
|---------|----------------|
| Mode C, default preview/live target, **not pinned** | **Hidden** |
| Mode C, browsing true next, **not pinned** | **Hidden** |
| Mode C, user **pinned** a departure (override) | Show per existing leave-by rules for that pinned trip |
| Mode A (inside window) | Unchanged — follow pin |

**Rationale:** Outside active day the user is planning the next commute, not being told to leave for a train today. Browsing must not surface misleading leave-by for Monday when viewing Saturday’s board.

---

## 7. Pin / target chrome

- **Target train** label + blue chrome only when hero shows the **remind-day target** (preview or live).  
- Saturday afternoon train at 15:30 must **never** show target chrome unless it is genuinely the remind-day target (it is not on Sat for Mon–Fri).  
- `isPinnedToday` may still be true (preferred exists, not dismissed) while pin button stays **unfilled** on preview — same as existing unpinned-target semantics.  
- `showsTargetTrain` must use remind-day-aware resolution (not unfiltered “first at/after preferred today”).

---

## 8. Implementation map

| Concern | Primary files |
|---------|----------------|
| Preview hero resolution | `public/pin-state.js` — new `resolveJourneyPreviewHero` or extend `resolvePinState` with `heroMode: 'preview' \| 'live'` |
| Render preview UI | `public/app.js` — `render()` hero block; hide countdown; day + clock layout |
| Swipe lock | `public/pin-state.js` `isHeroPinLockingSwipe`; `public/train-navigation.js` `isHeroPinLockingSwipe` |
| Skip restore | `public/train-navigation.js` `findPreferredTripSkipIndex`, `restoreJourneyTargetPinFace` |
| Leave-by gate | `public/app.js` / leave card helpers — suppress in mode C unless override pin |
| Preview data (parity) | Port or share logic from `NextCommutePreview.java` (web port or JSON contract from native — prefer **web-first** pure function in `public/` for fixtures) |
| Docs | `docs/pin-behavior.md` §6 + §8 — mode C table; relax swipe-lock note |

### 8.1 Suggested `resolvePinState` outputs (additive)

```ts
heroMode: 'live' | 'preview'
heroPreviewDayLabel: string | null   // e.g. "Monday"
heroPreviewClock: string | null      // e.g. "15:30"
isBrowseSwipeAllowed: boolean
leaveCardArmed: boolean              // false in mode C unless pinned
```

---

## 9. Fixtures & tests

### 9.1 Pin-resolution fixtures (`qa/fixtures/pin-resolution/`)

| Fixture id | Covers |
|------------|--------|
| `journey-saturday-monday-target` | Live Mon trip in API; hero = Mon; swipe lock **false** (update expected from hotfix) |
| `journey-saturday-monday-target-stale-skip` | Stale skip on Sat train; hero still Mon |
| **New** `journey-saturday-monday-preview-no-trip` | Sat clock; **no** Mon trip in `upcoming`; `heroMode: preview`; `heroDeparture: null`; preview labels |
| **New** `journey-saturday-browse-true-next` | `skipTrains: 1`; hero = Sat true next; `showsTargetTrain: false`; `isHeroPinLockingSwipe: false`; `leaveCardArmed: false` |

Run:

```bash
node qa/pin-resolution-fixtures.mjs --validate-only
IMPLEMENT_PIN_STATE=1 node qa/pin-resolution-fixtures.mjs
```

### 9.2 Playwright

Extend `qa/pin-behavior.mjs` or add `qa/outside-day-hero-browse.mjs`:

- Saturday fixture journey → enter Journeys → hero shows **Monday** / target label, **no** countdown when preview.  
- Swipe → **Next train** on today; leave-by hidden.  
- Tab away and back → returns to target preview.

### 9.3 Manual QA (Tim)

1. **Sat afternoon**, Mon–Fri commute, preferred 15:30 — hero default **Monday · 15:30**, not today’s next.  
2. Swipe to today’s next — **Next train**, no target chrome, swipe works, leave-by hidden.  
3. Swipe back / re-enter tab — back to Monday target.  
4. **Mon morning inside window** — live countdown, FB-20 swipe lock when pinned (regression).  
5. Pin today’s train on Saturday — **Pinned train**, leave-by appears for that pin only.  
6. Widget unchanged — still shows Monday idle face.

---

## 10. Non-goals

- Changing widget 2×1 layout or outside-hours idle copy.  
- Merging or removing **Active from / until** (Brief 2).  
- Auto-pinning today’s train when user swipes on Saturday.  
- Showing leave-by for unpinned Monday preview countdown.

---

## 11. Acceptance checklist

- [ ] Mode C default hero matches widget commute story (day + target time).  
- [ ] Preview hero when Monday ∉ API — no countdown.  
- [ ] Swipe browse works on Saturday; today never labelled Target train.  
- [ ] Leave-by hidden in mode C until user pins.  
- [ ] Mode A Monday morning regression: target pin + swipe lock unchanged.  
- [ ] Fixtures + pin-behavior QA green.  
- [ ] `pin-behavior.md` updated for mode C.

---

## 12. After ship

Tim will return for **Brief 2: Journey schedule simplification** (whether **Active from / to** stay, hide, or become derived). Do not block this brief on Brief 2.
