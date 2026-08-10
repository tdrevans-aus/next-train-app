# Jim brief: Journey name on detail (Option B — Name field)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Decision:** **Option B** — always-visible **Name** text field on detail (not a pencil-to-edit pattern). We can revisit if Tim dislikes it after trying.  
**Related:** `public/app.js` (`createJourneyFromTemplate`, `populateJourneyDetailForm`, `saveJourneyDetail`, list render), `public/index.html` (`#settings-detail-view`)  
**Out of scope:** Main-screen pencil (stays Manage journeys), template coach steps, reminders

---

## 1. Problem

**Custom** template creates `Journey N`, opens detail with **no way to name**, Save dumps **Journey 2** on the live board. List has a separate **Rename** control the Custom path never uses.

---

## 2. Goal

1. **Name** field on journey detail (create + edit) — Option B.  
2. Custom starts with **empty** name + placeholder.  
3. Blank on Save → route fallback **Station → direction** (not `Journey N`).  
4. **Remove** list **Rename** — one place to name: open journey → edit **Name** → Save.

---

## 3. UI — detail

Replace static `#detail-journey-heading` with:

```
← My Journeys

Name
[ e.g. School run                    ]

Route
  …
Timing
  …
```

| Element | Spec |
|---------|------|
| Label | **Name** |
| Control | Text `<input type="text">` matching other fields |
| Placeholder | `e.g. School run` |
| `id` | `#detail-journey-name` |
| Max length | ~40 chars (trim on save) |

No duplicate heading. No pencil on this screen.

### Create

| Template | Initial name |
|----------|----------------|
| **Custom** | `""` — focus name field if easy |
| **Morning / Evening** | Preset (`Morning into town` / `Evening home`) — still editable |

---

## 4. Save rules

1. Validate station + direction (unchanged).  
2. `name = trim(#detail-journey-name)`.  
3. If empty → `{formatStationLabel(station)} → {direction}`.  
4. Never write `Journey N` on save.  
5. Cancel / back: discard unconfigured draft as today.

---

## 5. List — remove Rename

In `renderJourneyListView` (or equivalent):

- **Delete** the **Rename** button and `startJourneyNameEdit` wiring from list cards.  
- Row / open control still opens detail (where Name is edited).  
- After Save, list + switcher + main pill show the new name.

Migration: leave existing `Journey 2` names until user edits — no mass rename.

---

## 6. Acceptance

1. Custom → **Name** empty with placeholder; no list Rename needed to name it.  
2. Typed name → Save → everywhere updates.  
3. Blank name + route → Save → **Station → direction**.  
4. Edit existing → Name prefilled; change + Save works.  
5. Morning/Evening presets appear in Name field.  
6. My Journeys list has **no Rename** button.  
7. Main-screen pencil still opens list / manage (unchanged).

---

## 7. Files

| File | Change |
|------|--------|
| `public/index.html` | `#detail-journey-name`; remove heading if redundant |
| `public/app.js` | Populate/save name; Custom `name: ""`; remove list Rename UI |
| `public/styles.css` | Field matches Route/Timing |
| `TESTING.md` | Name field + no list Rename |

---

## 8. Summary for Jim

> Option B: **Name** text field on journey detail. Custom starts empty; Save falls back to **Station → direction**. **Remove** list **Rename**. Main-screen pencil unchanged.
