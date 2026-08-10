# Jim brief: Reminders screen (unified)

**For:** Jim  
**From:** Tim + Simon  
**Priority:** High — fixes split-brain reminder UX  
**Related:**  
- `docs/jim-brief-leave-reminders-v2.md` (scheduler logic — unchanged)  
- `docs/jim-brief-leave-reminder-schedule-debug.md` (schedule readout — moves here)  
- `docs/jim-brief-stagger-stickiness-coaches.md` (coaches deep-link here)  
- `docs/leave-by-notification.md`  
**Platform:** Android native reminders first; web shows “available in the Android app”

> **UX redesign (Aug 2026):** Visual IA, copy, progressive disclosure, and layout in §3–4 below are **superseded** by [`docs/jim-brief-reminders-ux-redesign.md`](jim-brief-reminders-ux-redesign.md). Keep this brief for Menu → Reminders shell, journey-detail strip, data model, and sequencing — implement the **look and feel** from the redesign brief.

---

## 1. Problem

Reminder settings are split across two places:

| Today | What |
|-------|------|
| **Menu** | Leave reminders (master), Get ready, Pause — three toggle cards with subtitles |
| **Journey detail** | Remind me checkbox, preferred train, remind-on days |

Users don’t think “app-level vs journey-level.” They think *“I want a nudge for my morning train.”* Two hunts = clunky.

**Decision:** One **Reminders** screen. Journey detail keeps **Route + Timing only** (buffer, active hours).

---

## 2. Goal

**Menu → Reminders** opens a dedicated dialog/sheet with everything reminder-related in one place:

1. **App** — master on, get ready, pause, notifications, next-fire readout  
2. **Your commutes** — per configured journey: remind on/off, preferred train, day chips

No fourth chrome tab. Reminders is not a live mode like Near me / Journeys.

---

## 3. Information architecture

### Menu (after)

Replace the inline toggle block (`#menu-leave-reminders-section`) with a **single row**:

```
Reminders
```

Same style as **How it works** / **Add home screen widget** — tap opens the Reminders dialog.

Remove from Menu:
- Leave reminders toggle card  
- Get ready toggle card  
- Pause toggle card  
- Inline schedule line (moves into Reminders screen)  
- Inline permission hint button (moves into Reminders screen)

Keep in Menu: Help, Widget, Ad-free (if applicable), About, Privacy, Clear data.

### Journey detail (after)

**Route** + **Timing** only.

**Remove** `#detail-remind-section` entirely from `#settings-detail-view`. Do not duplicate reminder fields here.

### Reminders dialog (new)

`<dialog id="reminders-dialog">` — same visual language as `menu-dialog` / `journeys-dialog` (rounded sheet, Done footer).

```
┌─────────────────────────────────┐
│ Reminders                       │
│                                 │
│ APP                             │
│  Leave reminders          [on]  │
│  Get ready · 5 min        [off] │
│  Pause all                [off] │
│  Next reminder: 7:15 for 7:30 train   (when ok)
│  [Turn on notifications]        (when needed)
│                                 │
│ YOUR COMMUTES                   │
│  Morning into town              │
│    Remind me              [on]  │
│    Preferred 7:20   M T W T F S S
│                                 │
│  Evening home                   │
│    Remind me              [off] │
│                                 │
│  (empty: Save a commute first)  │
│                                 │
│              [Done]             │
└─────────────────────────────────┘
```

**Copy rules:**
- Section labels: `APP` / `YOUR COMMUTES` — small caps, same as `settings-section-title`  
- **No** subtitle paragraphs on toggles (Menu cards were too wordy)  
- Day chips: **one row**, single letters `M T W T F S S` with `aria-label` (Mon–Sun) — reuse journey-detail chip styles  
- Preferred train: optional-time control (same as journey form)

---

## 4. Behaviour

### App block

| Control | Maps to (existing) | Notes |
|---------|-------------------|--------|
| Leave reminders | `LeaveReminders` master `enabled` | On → request notification permission (existing `enableReminders`) |
| Get ready | `earlyHeadsUp` + `earlyOffsetMinutes` (default 5) | Toggle only in v1; stepper later OK |
| Pause all | `paused` | Cancels pending alarms (existing) |

**Schedule readout** — implement per `docs/jim-brief-leave-reminder-schedule-debug.md`:

- Call `LeaveReminders.getSchedule()` when dialog opens and after any toggle/journey save  
- Show: `Next reminder: 7:15 for 7:30 train` when `reason: ok`  
- Quiet empty states: `No reminder today`, `Reminders paused`, `No reminder scheduled`, etc.  
- **Location:** App block, below Pause — **not** Menu anymore

**Notifications:** If master on but permission missing → `Turn on notifications` link → `openNotificationSettings`.

### Your commutes block

One card/row per **configured** journey (`station` + `direction` set). Unconfigured shells do not appear.

| Control | Journey field | Notes |
|---------|---------------|--------|
| Remind me | `remindMe` (boolean) | Default `false`; templates set `true` |
| Preferred train | `preferredTrainTime` | Required when `remindMe` true |
| Day chips | `remindDays` | Mon–Sun ISO 1–7; default Mon–Fri for templates |

**When Remind me toggled on:**

1. Enable journey `remindMe` in draft → save on Done or auto-save per journey row (prefer **explicit Save on dialog Done** that persists all journeys + app settings in one commit).  
2. If app master off → turn app master on + permission flow (same as journey detail does today).  
3. If preferred empty → focus preferred field; block Done with alert.

**When Remind me off:** Keep `preferredTrainTime` / `remindDays` in storage for re-toggle; native scheduler ignores when `remindMe: false` (already gated in `PreferredTrainReminder.isRemindMeEnabled`).

**Empty state (zero configured journeys):**

> Save a commute first to set reminders.

Button: **Journeys** → opens journeys dialog (same as elsewhere).

### Web

- Menu shows **Reminders** row  
- Dialog body: *Leave reminders are available in the Android app.*  
- Hide App toggles and commute list

---

## 5. Data model (no schema surprise)

Journey JSON (already syncing to native):

```json
{
  "remindMe": true,
  "preferredTrainTime": "07:20",
  "remindDays": [1, 2, 3, 4, 5]
}
```

App settings (existing `LeaveReminderSettingsStore` / `nextTrainLeaveReminders` localStorage):

```json
{
  "enabled": true,
  "paused": false,
  "earlyHeadsUp": false,
  "earlyOffsetMinutes": 5
}
```

**Migration:** Journeys with `preferredTrainTime` and no `remindMe` key → `remindMe: true` (existing `journeyRemindMeEnabled` logic in `app.js`).

---

## 6. Files / refactor map

| Area | Action |
|------|--------|
| `public/index.html` | Add `reminders-dialog`; Menu link; remove `#menu-leave-reminders-section`; remove `#detail-remind-section` from journey detail |
| `public/leave-reminders.js` | Move menu toggle UI → Reminders dialog; export `openRemindersDialog`, `renderRemindersDialog` |
| `public/app.js` | Remove journey-detail remind handlers (`detailRemindMeInput`, etc.); wire Menu → open reminders; persist journey fields from reminders dialog |
| `public/styles.css` | Reminders dialog layout; reuse `.menu-toggle-row`, `.remind-day-chips--row`, `.remind-me-*` |
| `docs/chrome-modes-and-labels.md` | Menu: **Reminders** link, not inline toggles |
| Coaches | `docs/jim-brief-stagger-stickiness-coaches.md` — reminder coach **Turn on** → open Reminders dialog |

**Do not** change scheduler math (`PreferredTrainReminder`, `LeaveReminderScheduler`) except if a bug falls out of QA.

---

## 7. Coaches & discovery (update)

| Trigger | Action |
|---------|--------|
| Staggered reminder coach (2nd/3rd open) | **Turn on** → open **Reminders** dialog (not Menu scroll) |
| Widget coach | Unchanged |
| Journey save | No immediate reminder coach (Ruth Option A) |

Menu discovery: user can always open **Reminders** from Menu.

---

## 8. Acceptance

1. Menu has one **Reminders** row — no inline leave-reminder toggle cards.  
2. Reminders dialog shows App + Your commutes in one sheet.  
3. Journey detail has **no** Remind me section.  
4. Toggling Remind me on a journey + master off → enables app reminders + permission prompt.  
5. `getSchedule()` readout visible in App block when relevant.  
6. Save with Remind me on and no preferred train → blocked with clear error.  
7. Native scheduler respects `remindMe: false` per journey.  
8. Web shows Android-only hint.  
9. Templates (Morning/Evening) still create journeys with `remindMe: true`, preferred time, Mon–Fri — editable only on Reminders screen after save.

---

## 9. Out of scope

- Fourth top-chrome tab “Reminders”  
- Get-ready minute stepper (toggle is enough for v1)  
- Per-journey pause (global Pause only)  
- Auto public holidays  
- iOS until iOS reminders ship  

---

## 10. Sequencing

Suggested order for Jim:

1. **Reminders dialog** shell + Menu link  
2. **Move** app toggles from Menu into dialog  
3. **Move** per-journey UI from journey detail into dialog  
4. **Strip** journey detail remind section  
5. **Wire** `getSchedule()` readout (if not done — see schedule-debug brief)  
6. **Update** stagger coach to open Reminders dialog  
7. Docs: `chrome-modes-and-labels.md`, `leave-by-notification.md` discovery §

---

## 11. Summary for Jim

> Replace Menu’s three reminder toggle cards + journey detail’s Remind me block with **Menu → Reminders** — one dialog: **App** (master, get ready, pause, schedule line, notifications) + **Your commutes** (remind me, preferred train, day row per journey). Journey form = Route + Timing only. Coaches deep-link here. Reuse existing `LeaveReminders` plugin and `remindMe` journey field.
