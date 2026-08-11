# Jim brief: Outside Active hours → default to Near me (app + widget)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P1** → **Implemented** (2026-08-10)  
**Related:** `shouldDefaultToNearby`, `findScheduledJourneyId`, `isManualOverrideBlockingAuto` (`public/app.js`); `JourneySelector.java`, `CommuteSchedule` empty/setup; `docs/widget-homescreen.md` §3  
**Out of scope:** Full live Nearby board inside the widget (no geo board v1); changing Active hours matching math; reminders

---

## 1. Problem

When **no** saved journey is inside its Active hours (and Active days), Tim still often sees a **journey** on the main screen and widget (last `activeJourneyId` / first configured). Preferred: fall back to **Near me**.

In-app already has `shouldDefaultToNearby()` when `findScheduledJourneyId()` is null — but:

- Manual override can keep Journey mode even with **no** scheduled journey.  
- A **sole** journey with **no** Active window is treated as always scheduled.  
- Widget **never** falls back to Near me — it keeps showing a commute journey (`JourneySelector` → activeId → first).

---

## 2. Decision (locked — Tim)

**If no journey is in Active hours right now → default to Near me** on:

1. **Main screen**  
2. **Homescreen widget**

---

## 3. What counts as “in Active hours”

A journey is eligible for auto Journey mode / widget commute content only if **right now** (Perth) it matches:

- Active from / until window, **and**  
- Active days (same rules as today)

**Do not** treat as in-hours:

- Last selected / `activeJourneyId` alone  
- “Only one journey” with **no** Active window  
- First configured journey fallback  

Journeys with **blank** Active from/until are **never** auto-selected by the clock (user can still open them via My Journeys / switcher — sets override).

---

## 4. Main screen

### Auto / cold start / resume

When `findScheduledJourneyId()` is null:

- Enter **Near me** (`shouldDefaultToNearby` → true).  
- **Do not** stay on Journey mode just because a manual override exists **and** there is no in-hours journey.  
  - Update `isManualOverrideBlockingAuto`: if `scheduledId` is null, **clear override** (or return false) so Near me wins.  
  - If `scheduledId` is set, keep today’s override behaviour (user can pin another journey during overlapping windows).

### Align `findScheduledJourneyId`

Remove (or stop using) the special case:

```js
if (configured.length === 1 && !hasDefaultWindow(configured[0])) {
  return configured[0].id;
}
```

Only return an id when `journeyMatchesSchedule` hits.

### Manual Journey mode still allowed

User opens **My Journeys** / switcher → that journey (override) until:

- An Active-hours context change clears override (existing), **or**  
- We clear override when outside all windows (this brief).

U-05 “show new journey now” still sets override on first Save — that’s fine for the session while they look; once they’re outside hours with no matching window, next auto pass → Near me.

### Chrome

Near me active styling when in this default; My Journeys still available.

---

## 5. Widget

Widget cannot run full Near me geo board in v1 without a larger native nearby pipeline.

**When no journey matches Active hours:**

- Do **not** show the last commute’s next train / leave.  
- Show a **Near me idle / prompt** state, e.g.  
  - Label: **NEAR ME** (or keep **NEXT TRAIN** if NEAR ME is too sharp — prefer **NEAR ME**)  
  - Primary: **Open app** / **Near me** (short)  
  - Secondary: **See trains near you** (or empty)  
- Tap → open app into **Near me** (deep link / same as today but force Nearby mode, not journey).

**When a journey matches Active hours:** keep current commute widget content.

**Zero journeys:** keep existing empty / set-up journey state (not this brief’s Near me idle).

Update `JourneySelector` / `CommuteSchedule`:

- If no in-window journey → return null / flag `nearbyFallback: true` (name as you like) → snapshot for Near me idle.  
- Stop falling through to `activeJourneyId` / first configured when outside hours.

---

## 6. Acceptance

1. Morning 6–9 + Evening 15–18; at midday with no other in-window journey → app opens / resumes on **Near me**; widget shows Near me idle (not Evening/Morning trains).  
2. During 7:00 → Morning journey on app + widget.  
3. Sole Custom with **no** Active hours → auto **Near me** (not stuck on that Custom), unless user just picked/saved it via override (then clears when outside-hours rule applies on next auto pass).  
4. User can still open a journey manually from My Journeys.  
5. `npm run cap:sync` after web changes; rebuild APK for widget.

---

## 7. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | `findScheduledJourneyId`, override vs Near me |
| `android/.../JourneySelector.java` | No activeId/first fallback outside windows |
| `android/.../CommuteSchedule.java` + `WidgetUiBuilder` | Near me idle snapshot + tap → Near me |
| `docs/widget-homescreen.md` | §3 rewrite |
| `TESTING.md` | Outside hours → Near me |
| Unit tests | `JourneySelector` / schedule helpers |

---

## 8. Summary for Jim

> Outside all Active hours: main screen and widget default to **Near me** (widget = idle “Open Near me”, not last commute). Only in-window journeys auto-select. Drop sole no-window and activeId fallbacks for auto pick. Clear manual override when nothing is in-hours so Near me can win.
