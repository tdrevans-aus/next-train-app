# Design: Leave-by local notification (stickiness #2)

**For:** Jim (implement) / Tim (product) / Simon (design)  
**Backlog:** Rank **#2** in `docs/stickiness-ideas.md`  
**Status:** **Shipped v2 (Android)** — preferred train + remind days + once/day + pause + get ready  
**Related:** `docs/jim-brief-leave-reminders-v2.md`, `docs/widget-homescreen.md` (shared journey + leave-by logic), quiet hours (#9)  
**Job:** Nudge Journey-savers at the moment they should walk out — without opening the app  

**v2 behaviour:** Active from/until = UI journey selection only. Reminders target the **first train at or after preferred train time** on selected **remind days**, at most **once per journey per day**, with optional **Nudge early** minutes before leave-by. **Pause reminders** (Menu → Reminders → More options) cancels all pending alarms.  

---

## 1. Goal & non-goals

### Goal

An **opt-in local notification** that fires around **leave-by** for the user’s **active saved journey**, so D1/D7/D30 isn’t only “they remembered to open Next Train.”

One clear line, e.g.:

> **Leave now** · Edgewater → Perth · Train 7:52

Tap → app opens **Journey mode** for that journey (same deep link spirit as the widget).

### Non-goals (v1)

- Marketing / re-engagement blasts (“Come back to Next Train!”)  
- Nearby / nearest-station alerts  
- Full disruption engine (that’s stickiness **#3**) — v1 may include a **tiny** delay crumb only if already on the payload  
- Spammy countdowns every minute  
- Push from a server (v1 = **local** scheduling on device)  
- Watch / car delivery  

---

## 2. Principles

1. **Opt-in** — never enable on first install without permission + an in-app choice.  
2. **Commute-shaped** — only for saved journeys; respect **active hours** / which journey is active (align with widget §3).  
3. **Rare and sharp** — prefer **one primary fire per journey departure**, not a drip of “15 min / 10 min / 5 min” unless user opts into an early heads-up.  
4. **Quiet by default outside the commute** — no notifications when no journey is in play.  
5. **Same trust bar as widget** — don’t notify on garbage/stale times without honesty (see §7).  

---

## 3. Permission & settings

### OS permission

- Request notification permission **only after** user turns the feature on (or from a clear post-journey-save prompt) — not cold on first Nearby paint.  
- If denied: setting stays off; short explanation + link to system settings.

### In-app control (Menu → Reminders)

**Reminders** (master toggle) — default **Off** until user enables.

When On, advanced options live under **More options** (collapsed by default):

| Setting | Default | Notes |
|---------|---------|--------|
| **Remind at leave-by** | On (when master on) | The core product |
| **Nudge early** | Off | Toggle + **5 / 10 / 15** minute chips when on |
| Nudge early offset | **5 minutes** before leave-by | Default chip; stored when toggled off |
| **Pause reminders** | Off | Timed chips: **1 day**, **1 week**, **2 weeks**, or **Until I turn back on** |
| Timed pause | — | Auto-resumes after `pauseUntil` (Perth); status shows **Paused until …** |

Per-journey override (v1.1): optional. **v1 = global toggle** applies to whichever journey is active.

Copy in Reminders dialog:

- Master: **Reminders**  
- Lead: **Get a notification when it’s time to leave for your train.**  
- Restore/permission helper: **Turn on notifications**

---

## 4. When to prompt enabling (discovery)

Same light touch as widget — **not** a heavy modal.

1. **Do not** prompt on first journey save. Staggered auto-coach per **`docs/jim-brief-stagger-stickiness-coaches.md`**: widget tip from **2nd app open**; reminder tip from **3rd open** or first **weekday** after journey exists (never same open as widget). Copy: *Get a nudge when it’s time to leave* · **Turn on** / **Not now**.  
2. Prefer **separate tips** (widget vs reminder). **Do not** stack both the same session after Journey setup. **Not now** = 7-day snooze, one retry, then Menu only.  
3. Menu always has **Reminders** (opens the unified Reminders dialog).

---

## 5. Fire logic

### Active hours ≠ reminder hours (product rule — Tim)

**Active from / until** only means: *which journey the main screen / widget should prefer at this time of day.*

It does **not** mean: *start firing leave reminders for every train once that window opens.*

Example Tim: journey **Active 6:00–9:00**, typically catches ~**7:20**.  
- **OK:** main screen shows this journey from 6:00 (breakfast).  
- **Not OK:** reminder at **5:50** for a 6:00 train just because the journey is “morning.”

### Active journey

Use the **same journey selection rules as the widget** (`docs/widget-homescreen.md` §3). If none → schedule nothing.

### Time to station off

**Do not** fire leave-by reminders for that journey (there is no leave-by).  
Optional later: “Train departing” reminder — **out of scope for #2 v1**.

### When a leave-by is eligible to notify (ship this)

Only schedule early / leave-now if **leave-by clock time falls inside that journey’s Active from–until window** (same Perth local day rules as active-hours matching).

| Leave-by | Active 6:00–9:00 | Reminder? |
| -------- | ---------------- | --------- |
| 5:50 (for 6:00 train) | before window | **No** |
| 7:10 (for 7:20 train) | inside window | **Yes** |
| 9:05 (for 9:15 train) | after window | **No** |

If the journey has **no** active window set, keep today’s behaviour (next leave-by may notify) — or treat as “no automatic reminders until a window exists” (prefer: **still allow**, so manual-only journeys can remind).

### Still not desired: remind for every 10‑min train from 6–9

Even with the gate above, widget refresh could still chain **6:00 → 6:10 → 6:20…** leave-bys inside the window.

**v1.1 product intent (Tim’s commute):** prefer **at most one leave-now (and optional early) per journey per active window per day**, unless the user opens the app and clearly targets a later train (swipe / focus) — then allow reschedule for that departure.

Until v1.1 is built, document the window gate as the **must-fix** (kills 5:50); chaining inside the window is a known gap.

### Primary notification — “Leave by”

| Phase | Fire time | Title (bold) | Body |
|-------|-----------|--------------|------|
| Normal | At **leave-by** instant (± OS skew), if eligible | **Leave now** | `{Route or journey name} · Train {HH:MM}` |
| If early heads-up On | At leave-by **minus 10 min**, if that instant is also eligible (or only require leave-by eligible) | **Leave in 10 min** | `{Route} · Train {HH:MM}` |
| At leave-by (if early already sent) | Still send leave-now if eligible | **Leave now** | Same pattern |

**Early heads-up:** do not fire an early ping if it would land **before Active from** even when leave-by itself is inside the window (e.g. leave-by 6:05, early at 5:55 → skip early, keep leave-now).

### Reschedule triggers

Recompute local alarms when:

- App opens / resumes  
- Journey saved, edited, deleted  
- Leave buffer changed  
- Active hours changed  
- Master toggle / early toggle changed  
- Timezone or significant time change  
- Successful times refresh changes leave-by for the next departure  

Cancel pending leave notifications for obsolete departures when the user would have caught a different train (skip / swipe in app) — best effort on next app open.

Skip scheduling (cancel pending) when the candidate leave-by fails the active-window eligibility rule.

### Cadence / anti-spam

- Max **one leave-now** per departure (per journey id + departure key).  
- Max **one early** per that same departure.  
- No repeating every n minutes.  
- **v1.1:** max **one leave-now per journey per active window per local day** (unless user retargets a later departure in-app).  
- After fire, next schedule only for a later eligible departure (not for leave-bys before Active from).

### “I've left” / acknowledge

If in-app leave is acknowledged for that departure, **cancel** any pending early/leave-now for that departure (on next sync opportunity). Widget doesn’t have I've left; notifications should respect app ack when known.

### Copy for journey Timing UI (help under Active from/until)

Keep: *Optional hours when this journey is selected automatically.*

Add one line (reminders):  
*Leave reminders only fire for leave-by times inside this window — not for earlier trains.*

---

## 6. Notification content & channels

### Style

- Channel (Android): **Leave reminders** — default importance **High** (heads-up OK for leave-now); user can demote in system settings  
- iOS: time-sensitive optional later; v1 standard alert is enough  
- Sound: short default; no custom train horn in v1  
- Icon: app icon / small train mark  

### Copy bank

| Situation | Title | Body |
|-----------|-------|------|
| Leave-now | Leave now | Edgewater → Perth · Train 7:52 |
| Early | Leave in 10 min | Edgewater → Perth · Train 7:52 |
| Late catch-up* | Leave now — you’re late | Edgewater → Perth · Train 7:52 |

\*Only if we schedule a catch-up when app was dead at leave-by and opens shortly after — **optional v1**; else skip.

Prefer **route** over long journey names when possible (`Edgewater → Perth`).

### Tap

→ Deep link `nexttrain://journey/{id}` (same as widget) → Journey mode + refresh.

### Actions (Android, optional v1)

| Action | Behaviour |
|--------|-----------|
| **Open** | Default tap |
| **I've left** (optional) | Sets ack for that departure if possible without full WebView — only if native can write same ack store; else omit in v1 |

Keep v1 to **tap to open** if ack from notification is hard.

---

## 7. Stale data & honesty

Local notification times are only as good as last computed leave-by.

| Case | Behaviour |
|------|-----------|
| Fresh enough (e.g. refreshed in last 30–60 min, or just computed) | Fire as normal |
| Known stale / last refresh failed | Still fire if leave-by was scheduled, but body adds **· Times may be out of date** **or** skip fire if older than **2 hours** — prefer **skip if very stale** to protect trust |
| No upcoming train | Cancel pending; don’t notify |

Document the stale threshold in code (suggest **120 minutes** without successful refresh → don’t fire leave-now).

Background refresh: reuse widget’s native fetch/schedule where possible (shared worker). Notification scheduling should run after a successful compute of next leave-by.

---

## 8. Shared engine with widget (#1)

Treat as one **CommuteSchedule** module (name flexible):

- Resolve active journey  
- Compute next leave-by / depart from live or cache  
- Expose: widget snapshot + next notification fire time(s)  

Do **not** fork two divergent rule sets.

---

## 9. Platforms

| Platform | v1 |
|----------|-----|
| **Android** | Ship with/after widget — AlarmManager / WorkManager exact-ish alarms where allowed; fall back responsibly on OEM battery kill |
| **iOS** | Local notifications when iOS app ships; schedule on refresh |
| **Web / PWA** | No reliable leave-by alarms — hide toggle or “Available in the app” |

---

## 10. Acceptance criteria

1. Master **Reminders** defaults off; enabling requests OS permission.  
2. With buffer on + permission + upcoming leave-by → **Leave now** notification near leave-by.  
3. Early heads-up off by default; when on, fires ~10 min before leave-by.  
4. Buffer off → no leave reminders for that journey.  
5. Tap opens **Journey mode** for that journey.  
6. No journey / outside scheduling rules → nothing scheduled.  
7. Journey edit or toggle off cancels obsolete pending alerts (verified in QA).  
8. Very stale data → no leave-now (trust rule).  
9. No marketing re-engagement notifications in this feature.  
10. Logic aligned with widget journey selection.

---

## 11. Sequencing vs widget

| Order | Note |
|-------|------|
| Ideal | Shared schedule engine → widget UI + notification scheduler |
| If serial | Widget first (#1) still OK; extract engine when #2 starts — don’t duplicate forever |
| Prompts | Don’t demand both features the same minute as first journey save |

---

## 12. Summary for Jim

> Opt-in **local** “Leave now” notification at leave-by for the active saved journey (optional +10 min heads-up). Same journey rules as the widget; tap → Journey mode. No spam, no Nearby, no marketing pushes. Share one schedule engine with #1. Skip fire when times are badly stale.
