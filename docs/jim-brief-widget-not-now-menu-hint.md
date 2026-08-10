# Jim brief: Widget coach “Not now” → Menu hint

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/widget.js` (`widget-coach-later-btn`), `public/stickiness-coaches.js`, `public/index.html` (`#menu-btn` / `#menu-chrome-action`), `docs/jim-brief-stagger-stickiness-coaches.md`  
**Out of scope:** Reminder coach “Not now” (unless trivial to mirror later), changing Menu contents

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

Prefer a **small toast** near the bottom of the main canvas (above ads if present), auto-dismiss ~**3s**, or dismiss on tap. Same visual family as other light tips (not a full coach card).

Alternative if toast infra is missing: tiny tip card anchored under the header pointing at Menu — only if cheaper than toast. **Prefer toast.**

### Menu flash

On `#menu-chrome-action` / `#menu-btn`:

- Add a short CSS class e.g. `chrome-action--pulse` for **~1.2–1.5s** (1–2 pulses).  
- Accent wash / border flash matching Journeys onboarding pulse if one exists — reuse pattern.  
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
3. Menu icon pulses once/briefly.  
4. Menu does not open by itself.  
5. User can still open Menu → **Add home screen widget** as today.  
6. Web: no widget coach (unchanged) — no work if coach never shows.

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
