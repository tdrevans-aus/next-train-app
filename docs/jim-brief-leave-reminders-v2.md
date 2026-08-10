# Jim brief: Leave reminders v2 (preferred train)

**For:** Jim  
**From:** Tim + Simon  
**Status:** Implemented — see `PreferredTrainReminder.java`, journey fields, Menu pause/get ready  
**Related:** `docs/leave-by-notification.md` (updated), widget/`CommuteSchedule` shared engine  
**Platform:** Android first (match existing LeaveReminders plugin); web stays “available in the Android app”

---

## 1. Problem with v1 (shipped)

Today we schedule leave reminders from **whatever “next” train** is when refresh runs. With Active 6:00–9:00 and trains every ~10 min, that can notify at **5:50** for a 6:00 train.

**Tim’s intent:**

- **Active from / until** = which journey the **main screen / widget** should show (e.g. breakfast from 6:00).  
- **Not** = “start reminding for every early train.”  
- He typically aims ~**7:20** → wants **one** reminder around leave-by for that commute (e.g. notify ~7:15 / leave by ~7:20 for a ~7:30 train), **not** 5:50, **not** every 10 minutes, **not** Saturday spam.

---

## 2. Product rules (source of truth)

### Split responsibilities

| Setting | Controls |
|--------|----------|
| **Active from / until** | Journey auto-select for UI / widget only |
| **Preferred train time** | Which departure reminders aim at |
| **Days** | Which weekdays reminders may fire |
| **Time to station** | Leave-by = train − minutes to station (`leaveBeforeMinutes`) |
| **Get ready** (was Early heads-up) | Notify at = leave-by − get-ready minutes |
| **Pause reminders** | Hard off until user unpauses (holidays / WFH / leave) |

### Train selection

1. Fetch upcoming departures for the journey (live/cache as today).  
2. Pick the **first train at or after Preferred train time** (Perth local).  
   - Example: preferred **7:20**, trains **7:10** and **7:30** → choose **7:30** (not closest-earlier 7:10).  
3. **Leave-by** = that train − time to station (if off → no leave reminders for this journey).  
4. **Notify at** = leave-by − **get ready** minutes (if get ready is 0 / off → notify at leave-by).

### Cadence

- **At most one leave-now (and one get-ready ping if enabled) per journey per local day** on an eligible day.  
- Do **not** chain every successive train in the active window after the first fire.  
- After the day’s reminder has fired (or been acknowledged), do not schedule another for that journey until the **next eligible day**.  
- Exception (nice-to-have if cheap): if user in-app **swipes to a later train** and taps an explicit **Remind me for this train**, allow retargeting **today** once — otherwise skip for v2.

### Days

- Per journey: **Mon–Sun** multi-select.  
- Morning into town template default: **Mon–Fri**.  
- Evening template default: **Mon–Fri**.  
- Custom: default Mon–Fri or all blank until set — **prefer default Mon–Fri** so reminders aren’t weekend-noisy.  
- No reminder unless today ∈ selected days.

### Pause

- Global **Pause leave reminders** in Menu (and/or per journey if easy — global is enough for v2).  
- When paused: cancel pending; schedule nothing; UI shows paused state.  
- **Do not** auto-detect public holidays in v2.

### Timetable changes

- Do **not** store a fixed train ID or frozen leave-by as the long-term source of truth.  
- On each refresh: recompute train from preferred time + upcoming list, then leave-by / notify-at.  
- User only edits preferred time when *their* habit changes.

### Active window vs notify

- Do **not** require leave-by ∈ Active from–until as the primary gate anymore for Tim’s case (display window can start at 6:00 while preferred is 7:20).  
- Eligibility = preferred/days/pause/buffer + computed notify-at in the future.  
- Still **cancel** nonsense alarms if journey deselected / reminders off / paused / data stale (>120 min without refresh — keep existing stale guard).

---

## 3. UI copy / fields

### Journey Timing section (add)

- **Preferred train** — time control; hint: *Train you usually aim for. We’ll pick the next service at or after this time.*  
- **Remind on** — day chips Mon–Sun.  
- Keep Active from/until hint: *When this journey is selected automatically on the main screen.*  
- Add under reminders-related fields: *Leave reminders use preferred train + days — not every train in the active hours.*

### Menu

- Rename **Early heads-up** → **Get ready** (minutes before leave-by to notify). Default e.g. **5** or keep **10**; allow off / 0.  
- Add **Pause leave reminders** toggle.  
- Master **Leave reminders** still opt-in + OS permission.

### Main screen (optional v2.1 — not blocking)

- **Remind me for this train** while viewing a departure — overrides today’s target. Skip if time-boxed; core v2 is preferred time + days.

---

## 4. Roleplay (acceptance)

Journey: Active **6:00–9:00**, Preferred train **7:20**, buffer **10**, Get ready **5**, Days **Mon–Fri**, trains every 10 min including 7:10 and 7:30. Reminders on, not paused. Phone untouched.

| Expect | |
|--------|--|
| From 6:00 | Main screen may show this journey |
| **No** notification at 5:50 / 6:00 for early trains | |
| Selected train | **7:30** (at/after 7:20) |
| Leave-by shown | **7:20** |
| Notification | **~7:15** (“Leave now” or get-ready copy — see below) |
| Later trains same morning | **No** further auto reminders |
| Saturday | **No** reminder |

Copy for notify-at before leave-by: keep title **Leave now** at leave-by if get-ready is 0; if get-ready > 0 and notify is early, title **Leave in X min** / **Time to get ready** — pick one consistent with current notifier strings and document in PR.

---

## 5. Implementation notes

- Extend journey JSON: `preferredTrainTime` (HH:mm), `remindDays` (e.g. `[1,2,3,4,5]`), sync to native prefs with widget settings bridge (same path as journeys today).  
- `LeaveReminderScheduler`: replace “alarm at next.leaveBy” with compute-from-preferred; after fire mark **day fired** for journey id + local date.  
- Widget may still show current next train / leave-by for display; **reminder targeting** uses preferred-train rules (widget content can stay “next useful” — don’t block v2 on widget redesign).  
- Reschedule triggers: unchanged set (app resume, journey save, toggle, refresh) + days/preferred/get-ready/pause changes.  
- If no train at/after preferred today within a sane horizon (e.g. none before end of active until or before midnight): schedule nothing; don’t fall back to earlier trains.

---

## 6. Out of scope (v2)

- Auto public-holiday calendar  
- Tesla / watch  
- Server push  
- Multiple reminders per day chaining every service  

---

## 7. Done when

1. No 5:50-style ping when preferred is ~7:20 and Active starts 6:00.  
2. Mon–Fri only when configured.  
3. One auto reminder per journey per eligible day.  
4. Timetable shift still works without user edit (recompute from live list).  
5. Pause works.  
6. Get ready offsets notify before leave-by.  
7. `docs/leave-by-notification.md` status/notes updated to match shipped v2.

---

## Summary

> Active hours = UI journey only. Reminders = **preferred train (at/after)** + **days** + **once/day** + time to station + **get ready** + **pause**. Fix the shipped “next train” reminder behaviour.
