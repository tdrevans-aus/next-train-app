# Jim brief: Reminders screen — UX redesign (v2)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **supersedes the visual IA in `jim-brief-reminders-screen.md` §3–4** (Menu → Reminders shell stays; scheduler / data model unchanged)  
**Related:** `docs/jim-brief-leave-reminders-v2.md`, `docs/jim-brief-leave-reminder-schedule-debug.md`, `docs/leave-by-notification.md`  
**Platform:** Android first; web = Android-only hint

---

## 0. Why this redesign

Shipped Reminders dialog feels like an engineer’s panel:

- **“Get ready · 5 min”** — meaningless on first look  
- **“Pause all”** — absurd next to someone who is *just turning reminders on*  
- **“Preferred train”** — power-user slang for “the train I usually catch”  
- **APP / YOUR JOURNEYS** + three peer toggles — equal weight to things that are *not* equal  
- Content **squashed to the bottom** with empty air under the title  

Users don’t want settings. They want: *“Nudge me so I leave on time for my morning train.”*

---

## 1. How the user should feel

### First open (reminders off, one journey)

> “OK — I turn this on, pick my train and days, and I’m done.”

They should **not** feel: *What is Pause? Why is Get ready off? What does Preferred mean?*

### Returning (reminders already working)

> “Next reminder is clear. I can tweak my train or pause for holidays.”

### Mental model (product truth, plain English)

| Product concept | User language |
|-----------------|---------------|
| Master + journey `remindMe` | Reminders on for this journey |
| `preferredTrainTime` | **Usual train time** (hint: first train at or after this time) |
| `remindDays` | **Which days** |
| Leave-by − buffer | (computed — don’t teach the math here) |
| Get ready / early offset | **Nudge me a few minutes before leave time** |
| Pause | **Stop reminders for now** (holiday / WFH) — *advanced* |

---

## 2. Wizard or not?

**No multi-step wizard every time the dialog opens.** Returning users hate that.

**Yes to progressive disclosure + one focused setup moment:**

| Moment | UX |
|--------|-----|
| Dialog open, reminders off | Simple off state + one clear CTA |
| User turns **Reminders** on (or turns on a journey) | Card expands; if preferred train empty → focus that field with a short hint |
| Coach “Turn on” from stagger | Opens this dialog (already planned) — land on the setup state, not a separate wizard |

**Do not** add a 3-step Reminders wizard (route coach already covers journey setup). This screen is **configure**, not **educate at length**.

---

## 3. Screen structure (final)

Dialog fills like Journeys: **content from the top**, body scrolls, **Done sticky at bottom**. Fix the “everything crushed to the footer” flex bug (see §7).

```
┌──────────────────────────────────────┐
│ Reminders                            │
│                                      │
│ Get a notification when it’s time    │  ← one-line lead (muted)
│ to leave for your train.             │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Reminders                   [on] │ │  ← ONE master (was “Leave reminders”)
│ └──────────────────────────────────┘ │
│                                      │
│ Next: Today 7:15 · 7:30 train        │  ← status (only when meaningful)
│ [Turn on notifications]              │  ← only if needed
│                                      │
│ FOR EACH JOURNEY                     │  ← not “APP” / not empty section titles
│ ┌──────────────────────────────────┐ │
│ │ Morning into town                │ │
│ │ Armadale → Perth                 │ │  ← muted route crumb
│ │ Reminder                    [on] │ │
│ │                                  │ │
│ │ (when Reminder on — expanded)    │ │
│ │ Usual train time                 │ │
│ │ [ 7:20 AM              ✕ ]       │ │
│ │ First train at or after this     │ │  ← hint under field
│ │ time.                            │ │
│ │                                  │ │
│ │ Days                             │ │
│ │ (M)(T)(W)(T)(F)  S  S            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ▸ More options                       │  ← collapsed by default
│   (expanded:)                        │
│   Nudge early · 5 min          [on]  │  ← was Get ready
│   Pause reminders              [off] │  ← was Pause all
│                                      │
│              [Done]                  │
└──────────────────────────────────────┘
```

### Off state (master off)

Hide journey Reminder toggles’ expanded fields? **No** — still show journey cards so user can turn a journey on (which turns master on). Simpler rule:

- Master **off**: show lead + master toggle + journey list with Reminder switches. Expanding a journey Reminder **on** also turns master on (existing behaviour).  
- Hide **status line**, **More options**, and expanded journey fields until at least one journey has Reminder on **or** master is on with a journey already configured.

**Even simpler (preferred):**

1. Master off → only: lead + master toggle + short empty: *Turn on to choose which journeys get a nudge.* Journey cards still listed but Reminder rows disabled until master on — **OR** tapping Reminder on a journey enables master.  
2. Master on → journey cards interactive; More options visible (collapsed).

**Jim: implement preferred rule:** Turning a journey **Reminder** on enables master (existing). Master off collapses More options and hides schedule line. Journey cards always visible when configured journeys exist.

---

## 4. Copy (locked)

### Lead

> Get a notification when it’s time to leave for your train.

### Master toggle

| Old | New |
|-----|-----|
| Leave reminders / Leave Now Reminders | **Reminders** |

### Per journey

| Old | New |
|-----|-----|
| Remind me | **Reminder** |
| Preferred train | **Usual train time** |
| (hint) | **First train at or after this time.** |
| Day chips (no label) | Label **Days** above chips |

### More options (collapsed disclosure)

| Old | New | Hint (one line under title, muted, only when row expanded) |
|-----|-----|--------------------------------------------------------------|
| Get ready · 5 min | **Nudge early · 5 min** | Notify a few minutes before leave time. |
| Pause all | **Pause reminders** | Stop all reminders until you turn this off. |

**Default:** More options **collapsed**. Do not show Pause or Nudge early on first paint for new users.

### Status line (`getSchedule`)

Keep schedule-debug meanings; friendlier prefixes:

| reason | Copy |
|--------|------|
| ok | `Next: Today 7:15 · 7:30 train` (or `Tomorrow …`) |
| paused | `Reminders paused` |
| none / no schedule | Hide line or `No reminder scheduled` |
| permission | Don’t use status — use **Turn on notifications** button |

### Empty (no journeys)

> Save a journey first to set reminders.  
> `[ Journeys ]`

### Web

> Leave reminders are available in the Android app.

### Section labels

- **Remove** `APP` and `YOUR JOURNEYS` / `Your journeys` as shouted section headers.  
- Journey cards are self-labelling by name.  
- More options is the only secondary section.

---

## 5. Interaction details

### Master on

1. Request notification permission if needed (existing).  
2. Show schedule line when `getSchedule` has something useful.  
3. Reveal **More options** (still collapsed).

### Journey Reminder on

1. Expand train + days.  
2. If preferred empty → focus time field; show hint.  
3. If master off → turn master on.  
4. Default days if empty: Mon–Fri (templates already do this).

### Journey Reminder off

Collapse train/days for that card. Keep stored values.

### Done

Persist app + all journey reminder fields (existing commit pattern). Block Done if any journey has Reminder on and empty preferred train — alert: **Choose your usual train time.**

### More options

`<details>` / button disclosure. Persist open state only for the session (don’t remember across opens — always start collapsed).

### Nudge early

Still maps to `earlyHeadsUp` + `earlyOffsetMinutes` (default 5). Toggle only — no stepper in this pass.

### Pause

Maps to `paused`. When on, schedule line shows paused; native cancels alarms (existing).

---

## 6. Layout / visual (fix the squash)

### Problem

Title at top, then a large empty region, controls jammed above Done — classic flex mis-pack (`justify-content: flex-end` or footer eating space, body not growing from top).

### Fix

```
.reminders-dialog
  display: flex; flex-direction: column;
  max-height: 90dvh;

.reminders-dialog-body
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: …;
  display: flex;
  flex-direction: column;
  gap: 1rem;           /* generous — not 0.35rem */
  justify-content: flex-start;   /* NEVER flex-end */

.reminders-dialog-footer
  flex-shrink: 0;
```

### Density

- Lead under title: `0.35rem` then `1rem` before master card.  
- Journey cards: `padding ~0.85rem`, gap between cards `0.75rem`.  
- Expanded fields: label → control → optional hint; don’t stack pill-on-pill with zero air.  
- Prefer **one card per journey** (border + soft surface) containing Reminder + expanded fields — not orphan pills floating under the title.  
- Master is its own single toggle row/card at the top.

### Visual hierarchy

1. Title + lead  
2. Master  
3. Status (if any)  
4. Journey cards (the real work)  
5. More options (quiet)  
6. Done  

---

## 7. Data model — unchanged

```json
// journey
{ "remindMe": true, "preferredTrainTime": "07:20", "remindDays": [1,2,3,4,5] }

// app
{ "enabled": true, "paused": false, "earlyHeadsUp": false, "earlyOffsetMinutes": 5 }
```

No native scheduler changes unless a bug falls out.

---

## 8. What to remove / rename in code

| Remove / hide by default | Replace with |
|--------------------------|--------------|
| Section title `APP` | — |
| Section title `Your journeys` as H3 | Journey cards only |
| Label `Leave Now Reminders` / `Leave reminders` | `Reminders` |
| `Get ready · 5 min` always visible | Inside **More options** as `Nudge early · 5 min` |
| `Pause all` always visible | Inside **More options** as `Pause reminders` |
| `Preferred train` | `Usual train time` (+ hint) |
| Peer equal toggles for pause/get-ready | Progressive disclosure |

Keep: `#leave-reminders-enabled`, early/pause inputs, schedule line, permission hint, per-journey controls — **restructure markup**, don’t invent a second settings store.

---

## 9. Acceptance

1. First open with reminders off: user sees lead + master + journey name(s) — **not** Pause or Get ready.  
2. Turning Reminder on for a journey expands **Usual train time** + **Days** with clear labels.  
3. **More options** collapsed by default; contains Nudge early + Pause reminders with one-line hints when expanded.  
4. Content starts **under the title** (no empty void + crush at bottom). Body scrolls; Done sticky.  
5. Status line uses friendlier `Next: …` copy when ok.  
6. Done blocked if Reminder on without preferred time.  
7. Scheduler behaviour unchanged; `getSchedule` still wired.  
8. Web Android-only hint unchanged.  
9. Stagger coach still opens this dialog.

---

## 10. Out of scope

- Multi-step Reminders wizard  
- Get-ready minute picker / stepper  
- Per-journey pause  
- Renaming notification titles (Leave now / Leave in X) — separate if needed  
- Changing preferred-train matching math  

---

## 11. Files

| File | Change |
|------|--------|
| `public/index.html` | Restructure `#reminders-dialog` markup + copy |
| `public/leave-reminders.js` (and/or `app.js`) | Progressive show/hide; More options; schedule copy; focus preferred |
| `public/styles.css` | Top-aligned flex, journey cards, disclosure, spacing |
| `docs/jim-brief-reminders-screen.md` | Add pointer at top: visual IA superseded by **this** brief |
| `docs/leave-by-notification.md` | Discovery / Menu copy if it still says Get ready / Pause all in Menu |

---

## 12. Summary for Jim

> Rebuild Reminders UX: one lead line, one master **Reminders** toggle, journey cards with **Reminder** + **Usual train time** + **Days**, and **More options** (collapsed) for **Nudge early** and **Pause reminders**. No wizard. Fix top-empty / bottom-squash layout. Same data + scheduler; clearer language and progressive disclosure for first-time users.
