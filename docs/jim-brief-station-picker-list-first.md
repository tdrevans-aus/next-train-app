# Jim brief: Station picker — list-first (keyboard secondary)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P2** (polish; typeahead already in tree) → **Implemented** (2026-08-10)  
**Supersedes (interaction):** typing-first open in `docs/jim-brief-station-typeahead.md` §3 — keep filter/substring behaviour; change **how the list opens** on phone  
**Related:** `createStationCombobox` (`public/app.js`), journey detail `#detail-station-combobox`, Near me `#nearby-station-combobox`, `#settings-detail-view` sticky footer  
**Out of scope:** Full-screen station sheet redesign (nice later); map picker; changing nearest-station behaviour

---

## 1. Problem

On journey detail, tapping the station field **focuses an input → keyboard (~40%)** while Cancel / Save / Delete keep another ~20%. Dropdown only fits ~4 stations — scrolling feels broken. Typing should stay available but **not** be the first tap behaviour.

---

## 2. Decision (locked — Tim: options 2 + 1)

**List-first; typing secondary; hide footer while open.**

| Step | Behaviour |
|------|-----------|
| 1 | Tap the station **field / chevron** → open the **station list** with **no keyboard** (do **not** focus the text input on first open). |
| 2 | List shows browsable stations (current selection highlighted if any). Max-height + scroll — use the space freed by hiding the footer. |
| 3 | Top row (or sticky header control): **Search stations** — only **then** focus the filter input and allow the keyboard. |
| 4 | While list is open on **journey detail**: **hide** Cancel / Save / Delete footer (or `visibility`/`inert` so it doesn’t eat space). Restore footer when list closes. |
| 5 | Tap a station → select, close list, restore footer, same `onChange` as today (directions refresh). |
| 6 | Escape / tap outside / Done on search → close list; restore footer; keep previous selection if none chosen. |

Same pattern on **Near me** Don’t-wait / fallback picker (no journey footer there — still list-first / Search secondary).

---

## 3. Interaction detail

### Collapsed field

- Shows current station label (or placeholder **Choose station**).  
- Acts like a **button** that opens the list (role/button or combobox that expands without focusing a text field).

### Open — browse mode

- No soft keyboard.  
- First row: **Search stations** (magnifying glass OK if you already have icon language; text is enough).  
- Remaining rows: stations (full list or last filter if reopening mid-search — prefer full list on fresh open).

### Open — search mode

- After **Search stations**: show filter input (placeholder **Type a station**), keyboard OK.  
- Filter = existing substring / case-insensitive rules.  
- Optional: clear control returns to browse mode (hide keyboard) or clears query only — pick simplest.

### Footer (journey detail only)

- `#settings-detail-view .settings-detail-footer` (Cancel / Save / Delete) **not visible** while station list open.  
- Do not leave a blank gap that still blocks taps if avoidable — collapse / hide so the list can grow.

---

## 4. Acceptance

1. First tap on Departure station: list opens, **keyboard stays down**.  
2. **Search stations** → keyboard up; typing filters as today.  
3. While list open on journey detail: Cancel / Save / Delete **not** on screen.  
4. Pick station → list closes, footer back, directions load.  
5. Near me picker: same list-first / Search secondary.  
6. Use nearest station still works.  
7. `npm run cap:sync` after web changes.

---

## 5. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | `createStationCombobox` open modes (browse vs search); don’t auto-focus input |
| `public/index.html` | Optional Search row markup if not created in JS |
| `public/styles.css` | List height with footer hidden; browse vs search chrome |
| `docs/jim-brief-station-typeahead.md` | Point to this brief for open interaction |
| `TESTING.md` / QA | List-first; no keyboard on first open |

---

## 6. Summary for Jim

> Station picker polish: **list-first** (no keyboard on first tap), **Search stations** opens typing, **hide Cancel/Save/Delete** while the list is open on journey detail. Same for Near me picker. Keep existing filter rules.
