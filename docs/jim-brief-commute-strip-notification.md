# Jim brief: Backup glance — ongoing preferred-train commute strip

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P2 backup** (after widget Near me live-cache; widget stays primary)  
**Related:** `CommuteNotificationService` / `CommuteModePlugin` / `public/commute-mode.js`; leave reminders v2; `docs/stickiness-ideas.md` #4  
**Out of scope:** All-day Near me ongoing notif; PiP / draw-over-apps bubbles; iOS Live Activities (separate later); replacing the homescreen widget

---

## 1. Why

Homescreen widget is still the bet — but Tim is **hopeful, not confident** we’ll nail OEM widget reliability. Need a **plan B glance** that works without living in the app.

Phone timers show a countdown near the status bar via an **ongoing notification** (+ foreground service), not a custom status-bar API. Videos float via PiP/overlays — **rejected** for Next Train (policy + spam feel).

**Backup track:** lean harder on the existing **Heading to station** ongoing notification — but only for the **preferred-train / leave window**, never all day.

---

## 2. Decision (locked)

| Rule | Lock |
|------|------|
| **What** | Ongoing (persistent) notification with live-feeling countdown for the **preferred train** commute strip |
| **When** | Only around that journey’s leave window on **remind days** — same spirit as leave reminders, not Near me |
| **When not** | Outside Active hours; no preferred train; user opted out; all-day “next train anywhere” |
| **vs widget** | Widget remains primary stickiness; this is **backup / complement** for walk-out |
| **vs leave reminder** | Reminder = one interrupt at notify-at; strip = **persistent** from ~leave window until train departed / user dismisses |
| **PiP / overlay** | **Do not build** |

---

## 3. Behaviour

### Start (auto, opt-in)

When **all** are true:

1. User enabled **Commute strip** (name TBD in UI — see §5; default **off** until coach/settings).  
2. Journey has **Reminder** path usable: remind days + preferred train (same targeting as leave reminders v2 — first train at/after preferred time).  
3. Device is on a **remind day** and within a start window: lean **from Early Reminder time** (or leave-by − N if Early off) **until** departure minute passed (+ small grace).  
4. That journey is the one that would fire leave reminders (not every journey at once — **one strip**).

Reuse `LeaveReminderScheduler` / preferred-train resolution where possible — don’t invent a second “which train” brain.

### Content

- Title: e.g. **Leave in 8 min** / **Leave now** / **Next train 12 min** (pick one primary — prefer **leave-by** when `useLeaveBefore`, else departure).  
- Body: **Edgewater → Perth** · train clock · optional status.  
- Use notification **chronometer / countdown** where it helps Samsung show a timer-like chip (`setUsesChronometer` / count-down when API fits). Update on **wall-clock minutes** (same honesty as widget B0).  
- Actions: **Open app** · **Dismiss** (stops service).

### End

Stop when any of:

- Preferred train departure minute passed (or user caught a later train — v1: stop at scheduled departure + grace ~5–10 min)  
- User dismisses  
- Max runtime (keep/adjust today’s **90 min** cap)  
- Journey no longer eligible  

### Manual start

Keep today’s **commute mode** manual start if it exists in UI — should use the **same** notification service/copy so we don’t have two competing strips.

### Data

- Prefer shared commute snapshot / same API client as widget + reminders.  
- Poll less aggressively than today’s 30s if local paint from absolute ISO is enough (minute boundary + occasional network). Don’t drain battery chasing Near me GPS.

---

## 4. Implementation sketch

- Extend `CommuteNotificationService` rather than a third notifier.  
- Native scheduler (AlarmManager / WorkManager) or hook from existing leave-reminder alarm: **start strip** at Early/leave window, not only from WebView button.  
- Mirror opt-in in settings JSON (Capacitor sync) so native can start when app is dead.  
- Notification permission already required for reminders — reuse; if denied, don’t start strip.  
- Channel: existing `commute_mode` or rename description to “Commute countdown while you leave” (low annoyance, ongoing).  
- Tests: window gate (remind day + preferred train); stop after departure; opt-out never starts.  
- `TESTING.md`: enable strip → wait for window (or debug trigger) → see ongoing notif + shade/status chip on Samsung → dismiss.

---

## 5. Settings / copy (lean)

**Menu → Reminder settings** (or Journey reminder block):

- Toggle: **Show commute countdown in notifications** (subtitle: *While you’re leaving for your preferred train — not all day.*)  
- Default: **off** until user turns on (or a later soft coach — **no coach in this brief** unless Tim asks).

Don’t bury next to unrelated ads. Don’t imply it replaces the widget.

---

## 6. Acceptance

1. With strip **on**, on a remind morning near preferred train: ongoing notification shows leave/train countdown without opening the app.  
2. Outside that window / strip **off**: no ongoing commute notif.  
3. Dismiss stops it; doesn’t disable leave reminders unless we explicitly share a control (v1: independent).  
4. No PiP / overlay.  
5. Widget Near me live-cache work is **not** blocked by this — ship strip after or in parallel only if Tim prioritises.  
6. APK + TESTING notes for Tim’s Samsung (status-bar chip appearance is OEM-dependent — document “shade always; chip if system shows it”).

---

## 7. Summary for Jim

> Plan B glance: **ongoing notification strip for preferred-train leave window only** (extend `CommuteNotificationService`; opt-in; no all-day Near me; no PiP). Widget stays primary. Brief: `docs/jim-brief-commute-strip-notification.md`.
