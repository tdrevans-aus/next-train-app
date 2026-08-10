# Jim brief: Active days on journey (display + reminders)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** Journey detail Timing, Reminders dialog, `findScheduledJourneyId` / commute auto-select, `PreferredTrainReminder` / `remindDays`  
**Out of scope:** Migration of old installs (nobody live yet), public holidays, per-day different hours

---

## 1. Problem

**Active from / until** only care about clock time. A Mon–Fri commute can still auto-show on **Saturday** if the hours match.

**Days** chips live under **Reminders** and only gate notifications — so “I don’t commute Sat” isn’t expressed for the main screen, and the control is in the wrong place for journey identity.

---

## 2. Decisions

| Topic | Decision |
|-------|----------|
| Days gate **display**? | **Yes** — auto-select journey only if today ∈ days **and** now ∈ active window |
| Where do chips live? | **Journey detail → Timing** (with Active from / until) |
| Reminders chips? | **Remove** duplicate row — reminders reuse the same day list |
| Storage key | Keep JSON field **`remindDays`** (Mon=1 … Sun=7) — no rename required; UI label **Active days** |
| Templates | Morning / Evening / defaults: **Mon–Fri** `[1,2,3,4,5]` as today |
| Manual override | Switcher / opening a journey still allowed any day |
| Near me | Unchanged |
| Old data / migration | **Don’t care** — greenfield OK |

---

## 3. UI

### Journey detail — Timing section (order)

```
Timing
  ☑ Time to station     [slider]
  Active days
  (M)(T)(W)(T)(F)  S  S     ← same chip row component as today
  Active from
  Active until
```

| Element | Copy |
|---------|------|
| Label | **Active days** |
| Hint (one short line) | **When this journey can show on the main screen (and get reminders).** |
| Chips | M T W T F S S — reuse existing remind-day chip styles / a11y |

Save journey detail → persist `remindDays` on the journey (same as list/detail save path).

### Reminders dialog

Per journey card: keep **Reminder** toggle + **Usual train time**.

**Remove** the Days chip row from Reminders (no second editor).

If useful, one muted line under usual train time (optional, skip if noisy):

> Reminders follow this journey’s active days (set under My Journeys).

Prefer **no** extra line unless Tim asks — Timing hint is enough.

---

## 4. Behaviour — auto-select / default journey

Update whatever powers `findScheduledJourneyId` / commute mode (web + any native shared rules if applicable):

A journey is **eligible to auto-show** only if:

1. Configured (station + direction)  
2. Has active window (`defaultFrom` / `defaultUntil`) as today’s rules  
3. **Today (Australia/Perth, ISO weekday) ∈ `remindDays`**  
4. Current time ∈ active window (existing overlap logic)

If **no** journey eligible → default to **Near me** (same as “no scheduled journey” today).

**Empty `remindDays`:** treat as **no days** → never auto-show / never remind (force user to pick), **or** default chips to Mon–Fri on create so empty is rare. **Prefer:** templates and new journeys always get Mon–Fri; Save on detail with zero days selected → block or restore Mon–Fri — **block Save with “Pick at least one active day.”**

### Active-window conflict on Save

Today, two journeys cannot share overlapping **Active from/until** even if they’re on different days. That blocks “weekday morning” + “Saturday morning” with the same hours.

**Update** `findJourneyDefaultWindowConflict` (and any native equivalent): treat as conflict only if **time windows overlap and active days overlap** (at least one weekday in both `remindDays`). Same hours + disjoint days → **allowed**.

Reminders scheduler: keep using `remindDays` (already). No logic change beyond data still being set from Timing.

Widget: uses active journey selection — inherits day gate once web/native selection is fixed. Confirm widget/refresh path uses the same eligibility if it has its own picker.

---

## 5. Acceptance

1. Timing shows **Active days**; Reminders does **not** show day chips.  
2. Journey Mon–Fri, Saturday morning in window → **Near me** (or other eligible journey), not that commute.  
3. Same journey Monday in window → auto-shows as today.  
4. User can still open that journey from My Journeys on Saturday.  
5. Reminders only fire on active days (unchanged scheduler contract).  
6. Save with no days selected → blocked with clear error.  
7. Morning/Evening templates still Mon–Fri.  
8. Two journeys, same hours, different days → Save allowed. Same hours + overlapping days → still blocked.

---

## 6. Files (expected)

| File | Change |
|------|--------|
| `public/index.html` | Active days in Timing; strip days from reminders markup if any |
| `public/app.js` | Day gate in `findScheduledJourneyId` (or equivalent); detail populate/save; remove list/reminders day editors as needed |
| `public/leave-reminders.js` | Stop rendering/saving days on Reminders cards; still read `remindDays` for schedule display |
| `public/styles.css` | Spacing if needed |
| Android | Only if journey picker duplicated in Java — must apply same day gate; `remindDays` key unchanged |
| `docs/leave-by-notification.md` / chrome Timing notes | Active days shared |
| `TESTING.md` | Saturday vs weekday auto-select case |

---

## 7. Summary for Jim

> Move day chips to journey **Timing** as **Active days**. Use them to gate **auto-display** and keep reminders on the same `remindDays`. Remove Days from the Reminders UI. No migration work.
