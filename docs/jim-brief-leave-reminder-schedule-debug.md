# Jim brief: Leave reminder schedule readout

**For:** Jim  
**From:** Tim + Simon (Mark’s ask)  
**Priority:** High — best manual QA tool for leave reminders v2  
**Related:** `docs/jim-brief-leave-reminders-v2.md`, `docs/qa-leave-reminders-v2-testing.md`, `docs/leave-by-notification.md`  
**Platform:** Android Capacitor plugin `LeaveReminders` + Menu UI in `public/leave-reminders.js`

---

## 1. Why

Without a schedule readout, Tim can only verify preferred-train / once-per-day / pause / wrong-day by waiting for real clock times or faking device time. That blocks §4 roleplay QA.

**Agree with Mark:** expose the next computed fire(s) from the same path that arms alarms, and surface a one-line status in Menu when reminders are on.

This is **not** debug-build-only chrome. Treat it as:

1. **QA infra** — structured `reason` codes for pass/fail without waiting  
2. **User trust** — “Next reminder: 7:15 for 7:30 train” so people know what they opted into  

Ship in release builds. Keep the API rich enough for QA; keep the Menu line calm and short.

---

## 2. Plugin API

### Method

```
LeaveReminders.getSchedule()
```

Alias `getScheduleDebug()` is fine if you already sketched it — prefer **`getSchedule`** as the public name.

### When to call

- Menu open / **Reminders dialog** open / leave-reminders section render  
- After `setSettings` / `enableReminders` / journey save / widget-driven `CommuteRefreshService.refreshAll`  
- Optional: pull-to-refresh or app resume if Menu is open  

Web: no-op / hide the line (reminders already “available in the Android app”).

### Response shape

Always resolve (don’t reject for “nothing scheduled”). Use `reason` for the empty cases.

```json
{
  "enabled": true,
  "paused": false,
  "scheduled": true,
  "reason": "ok",
  "journeyId": "abc",
  "journeyName": "Into town",
  "route": "Edgewater → Perth",
  "trainTime": "7:30 am",
  "departureIso": "2026-08-10T07:30:00+08:00",
  "leaveByIso": "2026-08-10T07:20:00+08:00",
  "leaveByClock": "7:20 am",
  "getReady": {
    "scheduled": true,
    "notifyAtIso": "2026-08-10T07:15:00+08:00",
    "notifyAtClock": "7:15 am",
    "offsetMinutes": 5
  },
  "leaveNow": {
    "scheduled": true,
    "notifyAtIso": "2026-08-10T07:20:00+08:00",
    "notifyAtClock": "7:20 am"
  },
  "primaryNotifyAtIso": "2026-08-10T07:15:00+08:00",
  "primaryNotifyAtClock": "7:15 am",
  "primaryType": "get_ready",
  "localDate": "2026-08-10",
  "computedAtIso": "2026-08-09T16:20:00+08:00"
}
```

### Field rules

| Field | Rule |
|-------|------|
| `scheduled` | `true` if **any** future alarm would be armed for today (get-ready and/or leave-now) |
| `primaryNotifyAt*` / `primaryType` | The **soonest** future notify among get-ready / leave-now — what Menu shows |
| `getReady` / `leaveNow` | Nested objects; `scheduled: false` + omit times if that ping isn’t armed |
| Clocks | Perth local, same formatter as the rest of the app/widget |
| ISO | Source of truth for QA; clocks for UI |

### `reason` codes (exact set)

| `reason` | Meaning | `scheduled` |
|----------|---------|-------------|
| `ok` | Next fire(s) computed and would be armed | `true` |
| `reminders_off` | Master leave reminders disabled | `false` |
| `paused` | Pause leave reminders on | `false` |
| `no_permission` | Notifications permission not granted | `false` |
| `no_journey` | No configured journey to target | `false` |
| `wrong_day` | Today ∉ journey `remindDays` | `false` |
| `no_preferred` | Preferred train time missing / invalid | `false` |
| `buffer_off` | Time to station off → no leave reminders for journey | `false` |
| `no_trip` | No upcoming train at/after preferred within horizon | `false` |
| `already_fired` | Today’s leave-now (and get-ready if used) already fired / day marked | `false` |
| `stale` | Times too stale to trust (>120 min) — same guard as scheduler | `false` |
| `leave_in_past` | Computed notify-at already passed and nothing left to arm today | `false` |
| `error` | Unexpected failure; include `errorMessage` string | `false` |

**Important:** `getSchedule()` must use the **same compute path** as `LeaveReminderScheduler` (preferred train → leave-by → get-ready → once/day gates). Do **not** reimplement a second “debug only” picker — otherwise QA lies.

If get-ready already fired but leave-now still pending: `reason: "ok"`, `primaryType: "leave_now"`, getReady.scheduled false.

---

## 3. UI placement

**Superseded:** schedule readout lives in the **Reminders** dialog App block — see `docs/jim-brief-reminders-screen.md`. Not inline Menu toggle cards.

### Placement

Inside `#reminders-dialog` App section, below Pause, above permission link.

Visible when native Android and leave reminders **enabled** (master on).

### Copy

**Happy path (get ready on):**  
`Next reminder: 7:15 for 7:30 train`

**Happy path (get ready off):**  
`Next reminder: 7:20 for 7:30 train`  
(notify = leave-by)

**Already fired today:**  
`No more reminders today`

**Paused:**  
`Reminders paused`

**Wrong day:**  
`No reminder today`  
(optional subtitle / same line is enough — don’t explain Mon–Fri unless space)

**No trip / no preferred / buffer off / stale:**  
`No reminder scheduled`  
(Don’t dump `reason` strings into UI.)

**Permission:** keep existing permission hint button; schedule line can say `Notifications off` or stay hidden until granted — prefer show `Notifications off` so QA sees it.

### Style

- Read-only one line (or two if you need route): muted menu subtitle typography  
- Not a button  
- No emoji  
- Refresh when **Reminders** dialog opens and when toggles change  

Example markup intent:

```html
<p class="reminders-schedule-line" id="reminders-schedule-line" hidden>
  Next reminder: 7:15 for 7:30 train
</p>
```

Optional second line (only if cheap): journey route in quieter type — **not required** for v1 of this brief.

---

## 4. Acceptance (Tim can check without waiting)

| Setup | Menu / `getSchedule` expect |
|-------|-----------------------------|
| Preferred 7:20, buffer 10, get ready 5, Mon–Fri, trains 7:10 + 7:30, Tue | `reason: ok`, primary ~7:15, train 7:30 |
| Same, Saturday | `wrong_day`, scheduled false |
| Pause on | `paused` |
| After leave-now fired today | `already_fired` → “No more reminders today” |
| Buffer off | `buffer_off` |
| Reminders master off | Section nested UI / schedule hidden; API may still return `reminders_off` |

Device time **unchanged**. Toggle Menu after each settings change.

---

## 5. Out of scope

- Changing device time helpers  
- ADB dump scripts (nice later; this replaces the need for them day-to-day)  
- Fast-test “fire in 60s” mode (separate optional item in QA plan)  
- Showing preferred-train math in the widget  
- iOS until iOS reminders ship  

---

## 6. Implementation notes

1. Add `getSchedule` on `LeaveReminderPlugin` → call shared helper e.g. `LeaveReminderScheduler.describeSchedule(context)` that returns the JSON above **without** requiring a reschedule side effect (idempotent read; may refresh times if that’s already how schedule works).  
2. Wire `public/leave-reminders.js` `renderLeaveRemindersMenu` to call it and set the line.  
3. Update `docs/qa-leave-reminders-v2-testing.md` dependency #4 to “done” when shipped.  
4. No need for `?test=1` gate.

---

## 7. Summary for Jim

> Expose `LeaveReminders.getSchedule()` from the **same** preferred-train scheduler path, with stable `reason` codes. When reminders are on, Menu shows **“Next reminder: {time} for {train} train”** (or a short empty state). Ship in release — QA + user trust. This is the infra item to push hardest alongside wiring v2.
