# Jim brief: Backup glance — preferred-train commute strip (non-FGS)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Date:** 11 Aug 2026  
**Status:** Ready to code — Tim prioritising now  
**Related:** leave reminders v2 · widget · `docs/stickiness-ideas.md` #4 · dead Heading FGS already removed (`docs/jim-brief-remove-commute-fgs.md`)  
**Out of scope:** Foreground service / `FOREGROUND_SERVICE*` / `DATA_SYNC`; all-day Near me notif; PiP / overlays; iOS Live Activities; replacing the homescreen widget; resurrecting `CommuteNotificationService`

---

## 1. Why

Homescreen widget is still the bet — Tim wants a **plan B glance** for walk-out that works with the app closed.

Leave reminder = one interrupt at notify-at.  
**Commute strip** = persistent shade notification for the **preferred-train leave window only** — countdown you can keep glancing at while leaving.

**Architecture lock (11 Aug 2026):** build this **without** a foreground service. Dead Heading-to-station FGS is gone for Play Console; do **not** bring FGS back for the strip. Use alarms + an ongoing notification + system chronometer (same family as leave reminders).

---

## 2. Decision (locked)

| Rule | Lock |
|------|------|
| **What** | Ongoing (persistent, non-dismiss-by-swipe if possible) notification with leave/train countdown for the **preferred train** |
| **How** | **No FGS** — `AlarmManager` (or existing leave-reminder scheduler hooks) posts / updates / cancels the notif; chronometer paints the tick |
| **When** | Remind day + leave window only — same spirit as leave reminders, not Near me |
| **When not** | Strip toggle off; outside window; no preferred train; notification permission denied; all-day “next train anywhere” |
| **vs widget** | Widget stays primary; strip is backup / complement |
| **vs leave reminder** | Independent controls. Reminder = one ping; strip = persistent companion. User can want reminders **without** strip |
| **PiP / overlay / FGS** | **Do not build** |

---

## 3. Real-life behaviour

**Morning (remind day):** User has Edgewater → Perth, preferred train, Reminder path on, and **Commute strip** on (default **off**). Around Early Reminder time (or leave-by − N if Early off), an ongoing notification appears **without opening the app**.

They glance while getting ready:

- Title: **Leave in 8 min** → **Leave now** (prefer leave-by when `useLeaveBefore`; else departure countdown)
- Body: **Edgewater → Perth** · train clock · optional status if already known
- System chronometer / countdown where API fits (Samsung may show a timer-like chip — OEM-dependent; shade is the guarantee)

Leave reminder can still fire once at notify-at. Strip **stays** until end conditions.

**End** when any of:

- Preferred departure minute + grace (~5–10 min)
- User taps **Dismiss** (cancels strip only — **does not** disable leave reminders or the strip toggle)
- Max window ~**90 min** from start
- Journey no longer eligible / strip toggled off (reschedule clears)

**One strip at a time** — the journey that would get leave reminders that day, not every journey.

---

## 4. Trigger (exact)

**Auto only** — no manual “Heading to station” start UI.

Start when **all** are true:

1. **Commute strip** enabled (settings; default **off**)
2. Journey has Reminder path usable: remind days + preferred train (same targeting as leave reminders v2 — first train at/after preferred time)
3. Today is a **remind day**
4. Wall clock enters: **Early Reminder time** → departure + grace (if Early off: from leave-by − same Early offset default / leave-by itself — match reminder lead spirit; document chosen edge in TESTING)
5. `POST_NOTIFICATIONS` granted (if denied: never start strip)

Reuse `LeaveReminderScheduler` / preferred-train resolution — **don’t invent a second “which train” brain.** Prefer: when reminders are scheduled, also schedule **strip show** + **strip cancel** alarms (or one show + chronometer end + cancel alarm).

Boot / time-change: same reschedule path as leave reminders.

---

## 5. Implementation (non-FGS)

### Do

| Piece | Approach |
| --- | --- |
| Show | `NotificationManager.notify` from `BroadcastReceiver` / existing alarm receiver — **not** `startForeground` |
| Feel live | `setOngoing(true)` + `setUsesChronometer` / count-down to leave-by or departure ISO when API fits |
| Title honesty | On show (and rare refresh alarms if needed): wall-clock minutes, same honesty as widget B0 |
| Hide | Cancel notification from dismiss action PendingIntent + scheduled end alarm + max-runtime alarm |
| Opt-in storage | Mirror strip toggle into native-readable prefs (same pattern as reminder settings) so alarms work with WebView dead |
| Channel | New or renamed low-annoyance channel e.g. “Commute countdown” — **not** a high-importance interrupt channel; don’t steal leave-reminder importance |
| Data | Prefer absolute times already resolved for reminders / commute snapshot; **no** GPS; **no** 30s poll loop |

### Do not

- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `foregroundServiceType`
- Restore `CommuteNotificationService` / `CommuteModePlugin` / `commute-mode.js`
- All-day Near me ongoing notif
- PiP / draw-over-apps
- Tie “Dismiss” to turning off leave reminders

### Optional later (out of this brief)

If Tim’s Samsung feels “dead” without process-held updates, open a **separate** brief for FGS + Play declaration — don’t sneak it into this build.

---

## 6. Settings / copy

**Menu → Reminder settings** (near leave-reminder controls, not ads):

- Toggle: **Show commute countdown in notifications**  
- Subtitle: *While you’re leaving for your preferred train — not all day. Separate from leave reminders.*  
- Default: **off**  
- No coach in this brief unless Tim asks

Dismiss on the notification ≠ toggle off (toggle stays on for tomorrow unless they change settings).

---

## 7. Acceptance

1. Strip **on**, remind morning in window → ongoing notif with countdown **without** opening the app; **no** FGS in logcat / manifest for this feature.  
2. Strip **off** or outside window → no commute strip notif (leave reminders still work if enabled).  
3. User with reminders **on** + strip **off** → reminder fires; no strip.  
4. **Dismiss** clears strip only; reminders and strip toggle unchanged.  
5. No PiP / overlay / `FOREGROUND_SERVICE*`.  
6. `TESTING.md`: enable strip → window or debug trigger → shade notif → chronometer if OEM shows → dismiss; confirm reminders still scheduled.  
7. Grep ship tree: zero new FGS for strip.

---

## 8. Slack / Jim one-liner

> Jim — `docs/jim-brief-commute-strip-notification.md`: preferred-train leave-window **ongoing notification**, opt-in, independent of reminders, **no FGS**. Alarm show/cancel + chronometer; reuse leave-reminder targeting. Don’t resurrect Heading service.
