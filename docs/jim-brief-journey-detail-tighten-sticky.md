# Jim brief: Journey detail — tighten + sticky footer

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **do not** split into two screens yet  
**Related:** Journey detail form in `public/index.html` (`#settings-detail-view`), `public/styles.css`  
**Out of scope:** Template coach copy, reminder logic, widget, Add journey / Custom IA

---

## 1. Problem

Journey create/edit (Route + Timing: buffer, active hours, preferred train, remind days) no longer fits one phone viewport. Save/Cancel sit below the fold; the form feels like a wall of fields + hint essays.

**Product decision:** Keep **one screen** + scroll. Prefer **tighten spacing/hints** and a **sticky action footer** over a two-step wizard (that can wait if this isn’t enough).

---

## 2. Goal

On a typical phone (~640–700px usable dialog height):

1. **Cancel / Save always visible** while scrolling the form.  
2. Form content **scrolls underneath** the footer.  
3. Visual density drops ~15–25% without removing fields or changing behaviour.  
4. Hints stay scannable — not three long paragraphs competing with inputs.

---

## 3. Layout (sticky footer)

### Structure

`#settings-detail-view` becomes a **column flex** filling the journeys dialog body:

```
┌─────────────────────────────┐
│ ← Journeys                  │  fixed top (existing back)
│ Morning into town           │  fixed or scrolls with content — prefer scrolls
├─────────────────────────────┤
│                             │
│  [ scrollable form body ]   │  Route + Timing sections only
│                             │
├─────────────────────────────┤
│  Cancel    Save             │  STICKY footer (always on screen)
│  [delete]                   │
└─────────────────────────────┘
```

### Implementation intent

- Dialog already `display: flex; flex-direction: column; overflow: hidden; max-height: 90dvh`.  
- Detail view should: `flex: 1; min-height: 0; display: flex; flex-direction: column`.  
- **Scroll region:** wrap Route + Timing (everything above `.settings-detail-footer`) in a container with `flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch`.  
- **Footer:** `.settings-detail-footer` **outside** the scroll region: `flex-shrink: 0`, light top border or soft shadow so it reads as pinned, padding safe for home indicator.  
- Back link + heading: either inside scroll (simpler) or sticky under dialog chrome — **inside scroll is fine** so sticky effort stays on Save/Cancel.

### Scroll affordance (lightweight)

Optional: 1–2px gradient fade above the footer when content overflows (CSS only). Skip if fiddly — sticky Save is the main fix.

---

## 4. Tighten (density)

Do **not** remove Preferred train / Remind on / Active hours / buffer.

### Spacing targets

| Token | Current ballpark | Target |
|-------|------------------|--------|
| `#settings-detail-view` gap | ~0.85rem | ~0.55–0.65rem |
| `.settings-section` padding | ~0.85rem | ~0.65–0.7rem |
| `.settings-section` inner gap | ~0.7rem | ~0.45–0.55rem |
| `#settings-detail-view .field` margins | whatever ships | shave ~20% |

Keep tap targets: selects, time buttons, day chips, slider thumb **unchanged** in hit size.

### Hints — shorten, don’t delete meaning

| Field | Current | Replace with |
|-------|---------|--------------|
| Direction | “What the platform sign says — not necessarily where you get off.” | **Platform sign direction — not where you get off.** |
| Active from/until | “When this journey is selected automatically on the main screen.” | **When this journey auto-selects on the main screen.** |
| Preferred train | “Train you usually aim for. We'll pick the next service at or after this time.” | **Usual train — we use the next at or after this time.** |
| Remind on | “Leave reminders use preferred train + days — not every train in the active hours.” | **Reminders use preferred train + days, not every train in active hours.** |

One line each. Same colour/size as existing `.settings-section-hint`. No new “?” popovers in this brief.

### Section titles

Keep **Route** / **Timing**. No extra cards or accordions in this pass.

---

## 5. Behaviour unchanged

- Validation: station + direction required on Save (already shipping).  
- Template coach / highlight behaviour unchanged.  
- Field set and save payload unchanged.  
- List view / Done footer on list view unchanged (only **detail** footer sticks).

---

## 6. Acceptance

1. Open journey detail on a short phone / emulator: **Save and Cancel visible without scrolling**.  
2. Scroll Timing: footer stays put; fields move.  
3. All fields still reachable; preferred train + remind days still present.  
4. Hints are one line each (no overflow clipping of controls).  
5. No two-screen split; no accordion v1.

---

## 7. Explicit non-goals

- Split Route / Timing into two screens  
- Collapsible “Advanced” for reminders  
- Redesigning day chips or time pickers  
- Changing Add journey / Custom IA (separate if Tim asks)

---

## 8. Summary for Jim

> Journey detail stays **one form**. Make the **body scroll** and **pin Cancel/Save** (and delete) as a sticky footer. Tighten section/field gaps ~20% and shorten the four hint strings to one line each. No field removal, no second screen.
