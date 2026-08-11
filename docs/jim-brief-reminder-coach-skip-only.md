# Jim brief: Reminder coach — only after Skip tour (middle ground)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Implemented — middle ground (2026-08-10)  
**Related:** `public/stickiness-coaches.js`, `public/leave-reminders.js`, `public/app.js` (template wizard Skip), `docs/jim-brief-stagger-stickiness-coaches.md`  
**Out of scope:** Changing widget coach; Reminder settings UI; forcing Reminder on

---

## 1. Problem

Auto **Leave Now Reminders** coach overlaps the journey wizard’s new **Reminder** step. **Turn on** opening a single journey detail feels odd with multiple journeys. Stickiness still matters for people who **Skip** the tour and never see Reminder.

---

## 2. Decision (locked — Tim middle ground)

Keep the reminder coach, but **narrow** it:

Show auto reminder coach only when **all** of:

1. Existing stagger gates still pass (widget arc finished; open ≥3 **or** first weekday after config; coach not done/exhausted/snoozed).  
2. **Zero** configured journeys have **Reminder** on (`remindMe`).  
3. User **Skipped** the template wizard tour (not **Got it** / completed).

**Turn on** → open **My Journeys** (journey list), **not** a single journey detail.

**Not now** / snooze / exhaust — unchanged.

If Reminder is already on any journey → never show (mark done as today).

If user completed the wizard through the Reminder step (**Got it**) → **never** show this coach (they already saw the ask).

---

## 3. Skip vs completed

Today both Skip and Got it call `markTemplateWizardSeen()`. Split:

| Action | `nextTrainTemplateWizardSeen` | New: `nextTrainTemplateWizardSkipped` |
|--------|-------------------------------|----------------------------------------|
| **Skip tour** | `"1"` | `"1"` |
| **Got it** (finish tour) | `"1"` | clear / `"0"` / absent |
| Never ran tour | absent | absent → coach **does not** use Skip gate (no show from this rule) |

Coach Skip gate: `localStorage nextTrainTemplateWizardSkipped === "1"`.

---

## 4. Acceptance

1. Skip tour + no Reminder on + stagger ok → reminder coach can show.  
2. Finish tour with Got it → coach never shows (even if Reminder left off).  
3. Any journey Reminder on → coach never shows.  
4. **Turn on** → My Journeys list opens; coach marked done.  
5. QA logic test covers Skip gate.  
6. `npm run cap:sync` after web changes.

---

## 5. Summary for Jim

> Reminder coach middle ground: only if user **Skipped** the journey wizard **and** no journey has Reminder on. **Turn on** → **My Journeys**, not one detail.
