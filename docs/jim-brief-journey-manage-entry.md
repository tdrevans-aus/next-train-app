# Jim brief: Journey mode — visible “Manage journeys” entry

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Partially shipped — **canvas text link superseded**  
**Superseded by:** [`docs/jim-brief-journey-edit-icon.md`](jim-brief-journey-edit-icon.md) (Option A — pencil by name; remove prime-real-estate **Manage journeys** link)

> Keep this brief only for history / switcher + double-tap rules. **Do not** re-add the text link under the route — implement the edit-icon brief instead.

---

## 1. Problem

In Journey mode, the only **visible** path to the Journeys editor is:

- **≥2 journeys:** journey switcher dropdown → “Manage journeys” at the bottom  
- **1 journey:** nothing on canvas — users must discover **second tap on Journeys** in top chrome  

Second-tap chrome is intentional but hidden. Single-journey users have no obvious affordance.

---

## 2. Decision

Add a **visible text control** on the Journey mode canvas. **Keep** second-tap on **Journeys** chrome and **Manage journeys** in the switcher menu — this is an additional path, not a replacement.

| Entry point | When | Action |
|-------------|------|--------|
| **Manage journeys** link (new) | Journey mode + ≥1 configured journey | `openJourneys()` → list view |
| Journey switcher → Manage journeys | ≥2 journeys | unchanged |
| Second tap **Journeys** chrome | Already in Journey mode | unchanged |
| Empty state **Add a journey** | 0 journeys | unchanged |
| Leave card sliders icon | Buffer only | unchanged → journey detail, buffer focus |

---

## 3. UI spec

### Placement — `.context` block

Current structure:

```
.context
  #route
  #journey-switcher (+ menu)
```

**New structure:**

```
.context
  #route                          (unchanged)
  #journey-context-name           (NEW — single journey only)
  #journey-switcher (+ menu)      (unchanged — still ≥2 only)
  #journey-manage-btn             (NEW — ≥1 configured journey)
```

**Visual order (top → bottom):**

1. **Route line** — e.g. `Edgewater → Perth` (unchanged)  
2. **Journey name** (muted subtitle) — **only when exactly 1** configured journey  
3. **Switcher pill** — **only when ≥2** configured journeys (unchanged)  
4. **Manage journeys** — text button, **when ≥1** configured journey  

### Copy

| Element | Copy | Notes |
|---------|------|-------|
| Link button | **Manage journeys** | Match switcher menu item exactly |
| Journey name subtitle | Active journey `name` | e.g. `Morning into town` — not the route string |

### Visibility rules

Show `#journey-manage-btn` and journey-name subtitle logic when **all** of:

- Journey mode active (`journeyModeActive` / not nearby)  
- Not empty setup state (`hero-setup` / no configured journeys)  
- `getConfiguredJourneys().length >= 1`

Hide when:

- Nearby mode  
- Empty state (“No journeys yet”)  
- Loading/error states that hide the commute canvas (same as leave card)

`#journey-context-name`:

- `hidden` when configured journeys !== 1  
- Text = `getActiveJourney()?.name ?? "Journey"`

`#journey-switcher`:

- **No change** to `shouldShowJourneySwitcher()` — still `>= 2` only

### Styling

Reuse existing link pattern (`.btn-link` from empty state “Back to Near me”):

- `#journey-manage-btn`: `btn-link` class  
- Margin: `0.35rem auto 0` (tight under switcher or journey name)  
- Min tap height ~44px including padding (use padding, not just font size)  
- Accent colour on hover/focus — match other text actions  

`#journey-context-name`:

```css
.journey-context-name {
  margin: 0.4rem 0 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.3;
}
```

Do **not** make the route line (`#route`) tappable — we removed that for clutter; this link is enough.

### Behaviour

- Click `#journey-manage-btn` → `openJourneys()` (same as switcher manage + second chrome tap)  
- `aria-label`: `Manage journeys`  
- No new dialog — opens existing `#journeys-dialog` list view  

---

## 4. Wire-up (`app.js`)

1. Add DOM refs for `#journey-context-name`, `#journey-manage-btn`.  
2. New helper e.g. `syncJourneyContextChrome()` called from:
   - `renderJourneySwitcher()`  
   - `renderJourneyEmptyState()`  
   - `syncChromeMode()` / `enterJourneyMode()` / `enterNearbyMode()`  
   - After save/delete journey (any path that changes configured count)  
3. Click listener on manage btn → `openJourneys()`.  
4. Ensure manage btn is **not** focusable/hidden under nearby CSS (`.app.nearby-mode` should hide `.context` manage affordances — mirror switcher: hide via JS `hidden` attribute or add to existing nearby-mode CSS rule).

Suggested nearby hide rule (extend existing block):

```css
.app.nearby-mode #journey-manage-btn,
.app.nearby-mode #journey-context-name {
  display: none !important;
}
```

---

## 5. Help copy (one line)

In **How it works** (`#help-dialog`), Journeys bullet — after the switcher sentence, add:

> To add or edit journeys, tap **Manage journeys** under the route (or tap **Journeys** again at the top).

Use plain bold for “Manage journeys” in help text (no need for inline icon).

---

## 6. Acceptance criteria

1. **1 configured journey:** route + muted journey name + **Manage journeys** link visible; no switcher pill. Tap link → Journeys dialog list.  
2. **≥2 journeys:** route + switcher pill + **Manage journeys** link. Link and switcher menu item both open same dialog.  
3. **0 journeys (empty state):** no manage link; **Add a journey** CTA only.  
4. **Nearby mode:** manage link and journey name hidden.  
5. **Second tap Journeys** chrome still works.  
6. Leave-card sliders icon still opens buffer detail only — not the full list.  
7. Tap targets meet ~44px; VoiceOver/TalkBack announces “Manage journeys”.

---

## 7. QA

| Step | Expect |
|------|--------|
| 1 journey, Journey mode | See name + Manage journeys; tap → list |
| 2 journeys | Switcher + Manage journeys both work |
| Nearby | No manage link |
| Empty Journeys mode | No manage link; Add a journey works |
| Second tap Journeys chrome | Still opens list |

---

## 8. Files (expected)

| File | Change |
|------|--------|
| `public/index.html` | Add `#journey-context-name`, `#journey-manage-btn` in `.context`; help line |
| `public/styles.css` | `.journey-context-name`; nearby hide; manage btn spacing |
| `public/app.js` | `syncJourneyContextChrome()`, listener, call sites |

No Android native changes.
