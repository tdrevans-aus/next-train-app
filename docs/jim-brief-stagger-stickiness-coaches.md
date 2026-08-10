# Jim brief: Stagger widget + reminder coaches (Ruth Option A)

**For:** Jim  
**From:** Tim + Ruth + Simon  
**Priority:** High — first-session pushiness risk  
**Related:** `docs/leave-by-notification.md` § discovery, `docs/widget-homescreen.md` §9, `public/widget.js`, `public/leave-reminders.js`  
**Platform:** Android native coaches first (same as today); web has no widget/reminder coaches

---

## 1. Problem

Today (shipped):

1. User finishes **first Journey** setup (already a multi-step wizard).  
2. ~1.2s later → **widget** coach (`nexttrain:journey-configured-first`).  
3. Widget **Not now** / dismiss → event `nexttrain:widget-coach-dismissed` → **leave reminders** coach ~2s later (same session).  

Three asks in one sitting. Feels pushy. Journey is the only must-have; widget + reminders are retention amplifiers and need OS effort.

Ruth + Tim: **Option A** — Journey only in session 1; widget on a later open; reminders on a later open still.

---

## 2. Principle

| Session | Ask |
|---------|-----|
| **1** | Value + **one** commitment: save a Journey (Nearby + light onboarding + template wizard as today). **No** widget or reminder auto-coach. |
| **Later** | Ask for OS features when leave-by already feels useful. |
| **Always** | Menu → **Reminders** · Add home screen widget |

Never show widget coach and reminder coach in the **same** session.

---

## 3. Target behaviour (source of truth)

### Definitions

- **Configured journey:** same as `hasConfiguredCommute()` — at least one journey with station + direction.  
- **App open (cold or warm):** increment a counter when the app becomes visible / main UI boots (once per process start is enough; don’t increment on every `visibilitychange` flicker — prefer **once per calendar day max** *or* once per JS cold load).  
  - **Recommended:** `appOpenCount` += 1 on each **cold start** of the WebView/app session (Capacitor launch), capped so background→foreground within a few minutes doesn’t double-count. Simple v1: increment once per `DOMContentLoaded` / app init in native.  
- **Eligible for stickiness tips:** native Android **and** ≥1 configured journey.

### Sequence

| When | Show | Do not show |
|------|------|-------------|
| First Journey save (any session) | Nothing extra for widget/reminders | Widget + reminder coaches |
| **2nd app open** (or later) with configured journey, widget tip not done | **Widget coach** | Reminder coach |
| **3rd app open** (or later) **and** widget tip already resolved (accepted **How** / pinned path, or dismissed/snoozed past), reminder tip not done | **Leave reminder coach** | Widget coach again |
| Same open as widget coach | — | Reminder coach |
| User used Menu to add widget / enable reminders already | Skip that tip forever | — |

**Ruth tweak — reminders timing (pick one; implement both gates with OR):**

Show reminder coach when **all** of:

1. Eligible + widget phase resolved (see §4), and  
2. **Either** `appOpenCount >= 3`, **or** first **weekday** local open **after** the calendar day the first journey was configured (Perth `Australia/Perth`).  

Whichever comes first wins. Still never same session as widget coach.

### Not now / snooze (both coaches)

Replace permanent dismiss-on-Not-now.

| Action | Behaviour |
|--------|-----------|
| **How** (widget) / **Turn on** (reminders) | Mark that tip **completed** (`status: done`). Never auto-show again. |
| **Not now** | Set `status: snoozed`, `snoozeUntilMs` = now + **7 days**. Hide coach. |
| After snooze expires, next eligible open | Show **one** more time. |
| Second **Not now** | Mark `status: exhausted`. **Menu only** forever (no more auto coaches). |
| Completing via Menu (open widget help / enable reminders) | Treat as `done` for that tip. |

Do **not** fire reminder coach immediately when widget is dismissed (remove `nexttrain:widget-coach-dismissed` → `scheduleLeaveReminderCoach` chain).

---

## 4. State to persist (`localStorage`)

Replace boolean-only keys with small JSON (migrate old `"1"` → `{ status: "done" }`).

### `nextTrainAppEngagement` (new)

```json
{
  "appOpenCount": 2,
  "firstConfiguredJourneyAtMs": 1712345678901,
  "lastOpenDayKey": "2026-08-09"
}
```

- `firstConfiguredJourneyAtMs` — set once when first journey becomes configured.  
- Optional `lastOpenDayKey` if you choose “max +1 open per Perth day.”

### `nextTrainWidgetCoach` (replace `nextTrainWidgetCoachDismissed`)

```json
{
  "status": "pending" | "snoozed" | "done" | "exhausted",
  "snoozeUntilMs": null,
  "notNowCount": 0
}
```

### `nextTrainLeaveReminderCoach` (replace `nextTrainLeaveReminderCoachDismissed`)

Same shape as widget coach.

**Migration:** if old key `=== "1"`, treat as `done` (don’t re-nag existing users who already tapped Not now / completed).

---

## 5. Evaluation order (on each native app open, after UI ready)

Run **once** per open, after settings loaded, ~1–2s delay (don’t fight board paint / onboarding):

```
if (!native) return
if (!hasConfiguredCommute()) return
if (onboarding or template wizard coach visible) return   // wait; retry next open or after those dismiss
if (journeys/menu dialog open) return

if (widgetCoach.shouldShow(openCount, state)) {
  showWidgetCoach()
  return   // hard stop — no reminder this open
}

if (reminderCoach.shouldShow(openCount, state, widgetResolved)) {
  showLeaveReminderCoach()
}
```

`widgetResolved` = widget status ∈ `done | exhausted` **or** snooze still active is **not** resolved — wait until done/exhausted **or** they’ve had their widget show opportunity.  

Clarification for Jim:

- Reminder coach requires widget tip **finished** (`done` or `exhausted`), **not** merely “not showing today.”  
- If widget is `snoozed`, do **not** show reminders yet — finish widget arc first (2nd open showed it → Not now → 7 days later widget again → then reminders).  
- Exception: if user enabled reminders from Menu early, mark reminder coach `done` and never show.

If that feels too strict for Tim: **fallback** — after widget snoozed once, reminders may show on open ≥3 even while widget snoozed. **Default for this brief: finish widget arc first** (cleaner, less stacky).

---

## 6. What to remove / stop

1. `document.addEventListener("nexttrain:journey-configured-first", () => showWidgetCoach)` — **remove** immediate post-save show (keep event if useful for analytics / setting `firstConfiguredJourneyAtMs` only).  
2. `nexttrain:widget-coach-dismissed` → `scheduleLeaveReminderCoach` — **remove**.  
3. Boot path that shows reminder coach if `nextTrainWidgetCoachDismissed === "1"` shortly after load — **remove** / replace with §5 evaluator.

Keep Menu entry points unchanged.

---

## 7. Copy (unchanged intent)

**Widget:** *See your next train — and when to leave — on your home screen.* · **How** / **Not now**  

**Reminders:** *Get a nudge when it’s time to leave for your train.* · **Turn on** / **Not now**  

No combined “Make this commute stick” sheet (Ruth Option E — avoid).

---

## 8. Acceptance / QA

| Scenario | Expect |
|----------|--------|
| Fresh install → set up Journey | No widget/reminder coach that session |
| 2nd cold open, has Journey | Widget coach only |
| Widget **How** → help | Widget `done`; no reminder same open |
| Widget **Not now** | No reminder same open; widget snoozed 7 days |
| 3rd open, widget already `done` | Reminder coach (if not done) |
| Reminder **Not now** twice | `exhausted`; Menu only |
| Old user with dismiss key `"1"` | Migrated to `done`; no re-prompt |
| Web | No coaches (as today) |
| Menu widget / leave reminders | Always available |

---

## 9. Docs to sync when shipped

- `docs/widget-homescreen.md` §9  
- `docs/leave-by-notification.md` discovery bullets  
- `docs/nearby-first-onboarding.md` if it mentions post-journey tips  

---

## 10. Summary for Jim

> Stop stacking Journey wizard → widget → reminders in one session. **Session 1 = Journey only.** **2nd open** → widget coach. **3rd open** (or first weekday after Journey exists) → reminders coach — never same open as widget. **Not now** = 7-day snooze, one retry, then Menu only. Remove post-save widget trigger and dismiss→reminder chain. Persist open count + coach status JSON; migrate old dismiss flags to `done`.
