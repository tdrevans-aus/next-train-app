# Jim brief: Reminders — Early Reminder control + timed Pause

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Shipped (behaviour); **copy locked 2026-08-10** — row title **Early Reminder** (was Nudge early)  
**Depends on:** `docs/jim-brief-reminders-ux-redesign.md` (More options shell)  
**Related:** `docs/jim-brief-leave-reminders-v2.md`, native `LeaveReminderSettingsStore` / scheduler pause gate  
**Out of scope:** Per-journey pause, public holidays calendar, changing notify title strings

---

## 1. Problem

Inside **More options**:

1. **Early Reminder** (formerly *Nudge early · 5 min*) as a bare toggle is weak — users can’t see *what* 5 min means or change it.  
2. **Pause reminders** as an indefinite toggle is functionally “turn off until I remember.” People pause for holiday / WFH and **forget to unpause** → silent churn, stickiness dies.

---

## 2. Decisions

| Topic | Decision |
|-------|----------|
| Early Reminder | **Not** a free-range slider. **On/off + minute chips** (clearer than a tiny slider in a sheet). |
| Pause | **Timed pause** with presets. Indefinite only as an explicit last option. |
| Copy | **Reminder** is the only feature word. Early offset row = **Early Reminder** (not “Nudge”). Restore holiday / time-off language under Pause. |

---

## 3. Early Reminder

### UI (inside More options)

```
Early Reminder                      [on/off]
When on, show:
  Remind me this many minutes before leave time:
  ( Off is the master toggle above — chips only when on )
  [ 5 ] [ 10 ] [ 15 ]     ← single-select chips; default 5
```

**Copy (locked)**

| Element | Text |
|---------|------|
| Row title | **Early Reminder** |
| Hint (always under title when More options open) | **Remind me a few minutes before leave time — time to grab keys, not just the leave-by moment.** |
| Chip group label (sr-only or small) | Minutes before leave |
| Coach body (Leave Now Reminders) | **Get a reminder when it’s time to leave for your train.** |

**Behaviour**

- Toggle off → `earlyHeadsUp: false` (offset kept in storage for re-toggle).  
- Toggle on → `earlyHeadsUp: true`; if offset missing, set **5**.  
- Chip tap → set `earlyOffsetMinutes` to 5 / 10 / 15; ensure toggle on.  
- **No continuous slider** this pass (chips are enough; less fiddly than leave-buffer slider).

Maps to existing: `earlyHeadsUp`, `earlyOffsetMinutes`.

---

## 4. Timed pause (Option A — toggle)

### UI (inside More options)

Mirror **Early Reminder**:

```
Pause reminders                         [on/off]
For holidays, time off, or working from home.

When on:
  Paused until Mon 18 Aug   ← status when a timed/indefinite pause is active
  Pause for:
  [ 1 day ] [ 1 week ] [ 2 weeks ]
```

**Behaviour**

- Toggle **off** → resume (`paused: false`, clear `pauseUntil`).  
- Toggle **on** → pause immediately using last chosen duration (default **1 week**); show chips + status.  
- Chip tap → set that duration and keep paused.  
- No separate **Resume** button — toggle off is resume.
(Or keep chips and show status line above: `Paused until Mon 18 Aug` + Resume as primary text button.)

### Copy

| Element | Text |
|---------|------|
| Title | **Pause reminders** |
| Hint | **For holidays, time off, or working from home.** |
| Chip: 1 day | **1 day** |
| Chip: 1 week | **1 week** |
| Chip: 2 weeks | **2 weeks** |
| Chip: indefinite | **Until I turn back on** |
| Active status | **Paused until {weekday D Mon}** (Perth date) or **Paused until you turn them back on** |
| Clear | **Resume reminders** |

### Data model

Extend reminder settings (localStorage + native store):

```json
{
  "enabled": true,
  "paused": false,
  "pauseUntil": null,
  "earlyHeadsUp": false,
  "earlyOffsetMinutes": 5
}
```

| Field | Meaning |
|-------|---------|
| `paused` | `true` while any pause is active (timed or indefinite) — keeps existing scheduler gate simple |
| `pauseUntil` | ISO datetime string (Australia/Perth end-of-day or exact instant) when timed; `null` when not paused or when indefinite |

**Timed pause (1 day / 1 week / 2 weeks):**

1. Set `paused: true`.  
2. Set `pauseUntil` = now + duration (recommend **end of that calendar day in Perth** for “1 day”, or exact `now + 7d` / `now + 14d` — pick one and document; **prefer end of Perth calendar day** for “1 day”, and **same clock time + N days** for week/2 weeks).  
3. Cancel pending alarms (existing pause behaviour).

**Until I turn back on:**

1. Set `paused: true`, `pauseUntil: null`.  
2. Cancel pending alarms.

**Resume / expiry:**

- **Resume reminders** → `paused: false`, `pauseUntil: null`, reschedule.  
- On app open / `getSchedule` / reschedule: if `paused && pauseUntil` and `now >= pauseUntil` → auto clear pause and reschedule (**stickiness fix**).

### Status line (`getSchedule`)

| State | Copy |
|-------|------|
| Timed pause | `Paused until Mon 18 Aug` |
| Indefinite pause | `Paused until you resume` |
| Was paused, auto-cleared | Fall through to normal next-reminder line |

Native scheduler: treat as paused while `paused === true`; auto-clear path can live in JS on dialog open + existing reschedule triggers, and/or in Java when computing schedule — **at least JS + one native path so alarms return without opening Reminders**. Prefer clearing in the same place that reads settings before schedule (native), so widgets/alarms recover overnight.

---

## 5. Acceptance

1. More options: **Early Reminder** = toggle + 5/10/15 chips when on; hint explains leave-time.  
2. No continuous early-offset slider.  
3. Pause = duration chips, not a lone forever toggle (indefinite is one explicit chip).  
4. Hint mentions holidays / time off / WFH.  
5. Timed pause shows **Paused until …** and **Resume reminders**.  
6. After `pauseUntil`, reminders resume without the user hunting for a toggle.  
7. Indefinite pause still works; status makes “you must resume” obvious.  
8. Scheduler still cancels while paused; existing `paused` gate can remain if `pauseUntil` is cleared correctly.

---

## 6. Files (expected)

| File | Change |
|------|--------|
| `public/index.html` | More options markup: Early Reminder chips, pause chips / resume |
| `public/leave-reminders.js` | Settings shape, UI, auto-unpause on open |
| `public/styles.css` | Chip row styles (reuse journey day chips if possible) |
| Android settings store + scheduler | Persist `pauseUntil`; auto-clear when expired before schedule |
| `docs/leave-by-notification.md` | Pause = timed; Early Reminder = chips |
| `TESTING.md` | Timed pause + auto-resume case |

---

## 7. Summary for Jim

> In Reminders → More options: **Early Reminder** on/off + **5 / 10 / 15** chips (locked copy; was “Nudge early”). Replace indefinite **Pause** toggle with **Pause reminders** + hint (holidays / time off / WFH) and chips **1 day / 1 week / 2 weeks**, plus auto-resume when a timed pause ends. Persist `pauseUntil`; keep `paused` boolean for the scheduler gate.
