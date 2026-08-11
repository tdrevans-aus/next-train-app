# Jim brief: Widget coach “Not now” → Menu hint

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/widget.js` (`widget-coach-later-btn`), `public/stickiness-coaches.js`, `public/index.html` (`#menu-btn` / `#menu-chrome-action`), `docs/jim-brief-stagger-stickiness-coaches.md`  
**Out of scope:** Changing Menu contents

**Also:** Reminder coach **Not now** uses the same tip + Menu pulse pattern (`showReminderCoachNotNowHint`) — copy: *You can turn on reminders anytime from **Menu**.*

---

## 1. Problem

User taps **Not now** on the home-screen widget coach and the tip vanishes with no breadcrumb. They may never discover **Menu → Add home screen widget**.

---

## 2. Goal

On **Not now**:

1. Dismiss the widget coach as today (`markCoachNotNow("widget")`).  
2. Tell them they can add a widget anytime from **Menu**.  
3. Briefly **draw attention to the Menu icon** (flash / pulse).

Do **not** open the Menu or the widget-help dialog automatically.

---

## 3. UX

### Copy

Short toast or floating tip (one line):

> You can add a widget anytime from **Menu**.

Optional second beat (skip if crowded): nothing else.

### Placement

Small tip **under the Menu chrome control** (top-right), not the bottom of the canvas. Auto-dismiss ~**3.5s**, or dismiss on tap.

### Menu flash

On `#menu-chrome-action` / `#menu-btn`:

- Class `chrome-action--pulse` for ~**2.2s** (stronger glow + scale, ~3 pulses).  
- Accent wash / border + glow — more visible than the light Journeys onboarding pulse.  
- Then remove the class.

Accessible: toast text is enough; pulse is reinforcement. `aria-live="polite"` on the toast.

### Sequence

```
Not now
  → hide widget coach
  → markCoachNotNow("widget")
  → show toast
  → pulse Menu icon
  → toast auto-hides; pulse ends
```

Do **not** chain into the reminder coach in the same session (already gated by stagger brief).

---

## 4. Acceptance

1. Widget coach → **Not now** → coach gone.  
2. Toast/tip visible with Menu copy.  
3. Menu icon pulses / glows briefly (~2s).  
4. Tip sits under Menu (top-right), not bottom of screen.  
5. Menu does not open by itself.  
6. User can still open Menu → **Add home screen widget** as today.  
7. Web: no widget coach (unchanged) — no work if coach never shows.

---

## 5. Files

| File | Change |
|------|--------|
| `public/widget.js` | Not-now handler: toast + pulse |
| `public/index.html` | Toast element (or create in JS) |
| `public/styles.css` | Toast + `chrome-action--pulse` |
| `TESTING.md` | Not-now → Menu hint row |

---

## 6. Summary for Jim

> On widget coach **Not now**: dismiss as today, show *You can add a widget anytime from Menu*, and briefly pulse the Menu chrome icon. Don’t auto-open Menu.
