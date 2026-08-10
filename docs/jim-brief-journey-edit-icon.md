# Jim brief: Journey manage — pencil by name (Option A)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Supersedes (canvas entry):** text link in `docs/jim-brief-journey-manage-entry.md` §3 — that link is **prime-real-estate debt**; replace it with this  
**Related:** `public/index.html` `.context`, `public/app.js` (`syncJourneyContextChrome`, `openJourneys`), leave-card sliders (different job)  
**Out of scope:** Chrome double-tap, switcher “Manage journeys” row, journey detail sticky footer, A3 icon work (already shipped)

---

## 1. Problem

**Manage journeys** as a teal text link under the route sits in **prime real estate** on the live commute screen. Users are looking at next train / leave-in — not “manage.”

We still need a **visible** path for the **1-journey** case (no switcher). Double-tap My Journeys stays as a power shortcut.

---

## 2. Decision — Option A

| Do | Don’t |
|----|--------|
| Small **pencil / edit icon** beside the journey name | Keep the full-width **Manage journeys** text link under the route |
| Icon opens `openJourneys()` (list) — same as today’s link | Reuse leave-card **sliders** icon (that = time to station only) |
| Keep switcher → **Manage journeys** (≥2) | Make `#route` tappable |
| Keep second tap **My Journeys** chrome | |

---

## 3. UI

### Layout (Journey mode, ≥1 configured journey)

**One journey:**

```
     Armadale → Perth          ← #route (static)
     Morning into town  ✎      ← name + edit icon (same row)
```

**Two or more:**

```
     Armadale → Perth
   [ Morning into town ▾ ]     ← switcher (unchanged)
                    ✎          ← edit icon still available
                                 OR: icon on the same row as switcher, trailing
```

**Preferred structure:**

```
.context
  #route
  .journey-context-row          ← NEW flex row, centered
    #journey-context-name       ← show when 1 journey OR always show active name when ≥1
    #journey-edit-btn           ← NEW icon button (replaces #journey-manage-btn text)
  #journey-switcher (+ menu)    ← still ≥2 only
```

When **≥2 journeys**: switcher already shows the name — avoid duplicating the name twice.

**Jim — pick one (document in PR):**

| Variant | When ≥2 |
|---------|---------|
| **A1 (prefer)** | Hide `#journey-context-name`; show **edit icon only** trailing beside / under the switcher pill (same tap target height) |
| **A2** | Keep name + icon row even with switcher (more clutter — avoid unless A1 is awkward) |

When **exactly 1 journey**: show muted name + edit icon (no switcher).

### Remove

- `#journey-manage-btn` text **Manage journeys** (and `.journey-manage-btn` link styles), or repurpose the element into the icon button.

### Edit icon

- Glyph: simple **pencil** (stroke `currentColor`, ~1.75, 24×24), not sliders, not A3 route icon.  
- `aria-label`: **Edit journeys** or **Manage journeys** (TalkBack — prefer **Manage journeys** to match switcher wording).  
- Hit target ≥44×44px (padding around small glyph).  
- Colour: muted idle; accent on hover/focus — match other icon buttons lightly, don’t scream teal like the old link.

### Behaviour

- Click → `openJourneys()` (list view), same as current manage link / switcher manage.  
- Visibility: Journey mode + ≥1 configured journey; hide in Nearby, empty setup, same as today’s manage link rules.  
- Leave-card sliders: **unchanged** → time to station / buffer detail only.

---

## 4. Help copy

Update How it works line that says tap **Manage journeys** under the route:

> To add or edit journeys, tap the **edit** icon beside the journey name (or tap **My Journeys** again at the top).

---

## 5. Acceptance

1. No **Manage journeys** text link under the route on the live board.  
2. **1 journey:** journey name + pencil visible; tap pencil → My Journeys list.  
3. **≥2 journeys:** switcher unchanged; edit icon still reachable (variant A1 or A2); switcher menu still has Manage journeys.  
4. Nearby / empty setup: edit icon hidden.  
5. Leave-card sliders still only edit time to station.  
6. Second tap My Journeys chrome still opens the list.  
7. TalkBack announces a clear manage/edit journeys name.

---

## 6. Files

| File | Change |
|------|--------|
| `public/index.html` | Context row; pencil SVG; remove text link; help line |
| `public/styles.css` | Row layout; icon hit target; drop/repurpose `.journey-manage-btn` |
| `public/app.js` | Wire edit btn; visibility in `syncJourneyContextChrome` |
| `docs/chrome-modes-and-labels.md` | Canvas manage = pencil, not text link |
| `docs/jim-brief-journey-manage-entry.md` | Mark canvas text link superseded by **this** brief |
| `TESTING.md` | Pencil manage entry |

---

## 7. Summary for Jim

> Remove the **Manage journeys** text link from under the route. Put a **pencil icon** beside the journey name (1 journey) / next to the switcher (≥2). Same `openJourneys()` action. Keep chrome double-tap and switcher Manage. Do not overload the leave-card sliders icon.
