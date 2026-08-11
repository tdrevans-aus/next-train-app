# Jim brief: Remind me above Timing + Reminder settings empty polish (Option A)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — Tim locked **A** → **Implemented** (2026-08-11)  
**Think doc:** `docs/jim-brief-reminders-simple-sexy.md` (B/C deferred)  
**Builds on:** `docs/jim-brief-reminders-on-journey.md`, `docs/jim-brief-journey-reminder-polish.md`  
**Out of scope:** Reminder home hub (B); preferred-time-arms-reminder (C); scheduler math; master toggle; Early/Pause behaviour changes when armed

---

## 1. Why

Tim: Remind me on journey detail sits under Timing and never gets seen. Menu → Reminder settings empty state is correct but lifeless.

**A = bandage:** make Remind me visible on the journey form; make the empty settings sheet invite action. Do **not** rip the split (that’s B later).

---

## 2. Journey detail — reorder (locked)

### DOM order

```
Name (if shown)
Route
Remind me          ← move here (was last)
Timing             ← Time to station, Active days, Active hours
```

In `public/index.html`: move `#detail-reminder-section` to **immediately after** `#detail-route-section` and **before** the Timing `<section>`.

### Behaviour (unchanged)

- Toggle title: **Remind me** (one label — no duplicate section `h3`).  
- When on: **Preferred train** + hint *First train at or after this time.*  
- Save rules, permission hint, heal — unchanged.  
- Coach / wizard `scrollIntoView` / highlight on `#detail-reminder-section` — keep working (block is now higher, so easier).

### Wizard

Keep Reminder as the **final** tour step (**Got it**) after Active hours — no need to reshuffle wizard indices for A. Highlight still targets `#detail-reminder-section` (now above Timing; `scrollIntoView` still fine).

### Scroll / footer

Keep enough `.settings-detail-scroll` bottom padding to clear Cancel/Save + delete + safe area (already ~`5.75rem`; bump only if phone QA still clips the expanded Preferred train row).

---

## 3. Menu → Reminder settings — empty polish (locked)

When journeys exist but **no** Remind me is on (and same idea if zero journeys), do **not** leave a lone centered grey paragraph + Done.

### Layout

```
Reminder settings

Get a notification when it’s time to leave for your train.

┌─────────────────────────────────────────┐
│  No leave alerts on yet                 │
│  Turn Remind me on when you edit a      │
│  journey — then Early Reminder and      │
│  Pause show up here.                    │
│                                         │
│  [ Open My Journeys ]                   │
└─────────────────────────────────────────┘

[ Done ]
```

### Copy (locked)

| State | Body |
|-------|------|
| No journeys | **No journeys yet** / *Save a journey, then turn Remind me on.* + **Open My Journeys** |
| Journeys, none armed | **No leave alerts on yet** / *Turn Remind me on when you edit a journey — then Early Reminder and Pause show up here.* + **Open My Journeys** |

Lead line under the title (always when empty): *Get a notification when it’s time to leave for your train.*

**Open My Journeys:** closes Reminder settings (and Menu if still open) and opens the Journeys list / empty journey flow — same destination as Menu → My Journeys would. Use existing navigation helpers; don’t invent a new screen.

When ≥1 Remind me is on: keep today’s armed UI (schedule line + Early Reminder + Pause). No journey cards on this screen (still not B).

### Visual

- Empty block: left-aligned, card-ish section matching `.reminders-shared-options` / settings section language (border, radius, padding) — not a floating centered orphan paragraph.  
- Primary or secondary button for **Open My Journeys** (secondary is fine if Done stays the only primary).  
- Title stays **Reminder settings**.

---

## 4. Acceptance

1. Journey detail shows **Remind me** (and Preferred train when on) **above Timing**, after Route — visible without scrolling past Active hours on a normal phone.  
2. Sticky footer does not cover Remind me / Preferred train when that block is on screen.  
3. Empty Reminder settings shows lead + titled empty card + **Open My Journeys** CTA (both zero-journey and none-armed states).  
4. CTA opens Journeys and dismisses the dialog.  
5. Armed Reminder settings (Early / Pause / schedule) unchanged.  
6. No scheduler / heal / master-toggle changes.  
7. `npm run cap:sync` after web changes.  
8. Quick device check: open journey edit → Remind me visible; Menu → Reminder settings with all Remind me off → empty card + CTA.

---

## 5. Files (likely)

| File | Change |
|------|--------|
| `public/index.html` | Move `#detail-reminder-section`; empty Reminder settings markup (title/body/button slots) |
| `public/leave-reminders.js` | Empty-state copy + wire **Open My Journeys**; show lead when empty |
| `public/styles.css` | Empty card layout (left-aligned); any padding tweak |
| `public/app.js` | Only if CTA needs an exported “open Journeys from reminders” helper |
| `TESTING.md` | Short note: Remind me above Timing; empty Reminder settings CTA |

---

## 6. Summary for Jim

> Tim locked **A**: move **Remind me** above **Timing** on journey detail. Polish empty **Reminder settings** with lead copy + card + **Open My Journeys** CTA. Do not build the Leave alerts hub (B). Scheduler unchanged. `cap:sync` when done.
