# Jim brief: Type-to-filter station picker

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Shipped (combobox) — **open interaction superseded** by `docs/jim-brief-station-picker-list-first.md` (list-first; keyboard secondary)  
**Related:** `#detail-station-select`, `#nearby-station-select`, `renderStationOptions`, `getStationsList` (`public/app.js`)  
**Backlog link:** Was considered FB-05; **briefed for Perth now** (required before Sydney-scale lists)  
**Out of scope:** Multi-city station packs; changing “Use nearest station”; direction picker; map picker

---

## 1. Problem

Departure station is a long native `<select>`. Manageable in Perth; painful on phone and a cliff for Sydney-sized lists. Users should **start typing to narrow** the list.

---

## 2. Goal

Replace (or wrap) station `<select>`s with a **combobox**: type to filter, tap a station to choose.

**Surfaces (both):**

1. Journey detail — **Departure station**  
2. Near me — station fallback picker (`#nearby-station-select` / equivalent)

Same interaction pattern and shared helper if practical.

---

## 3. Behaviour

| Action | Result |
|--------|--------|
| Focus / open | Show filter field (placeholder e.g. **Type a station**) + list of stations (or current selection visible) |
| Type | Case-insensitive filter on station display name; update list live |
| Clear query | Show full list again (or keep current selection labelled) |
| Tap row | Select that station; close list; run same change handlers as today’s `<select>` (`input`/`change` → directions refresh, etc.) |
| Empty filter match | Short empty: **No stations match** |
| Keyboard (where relevant) | Enter selects highlighted / first match if one; Escape closes list without changing selection if possible |

**Nearest station** button unchanged — still sets the chosen station via the same underlying value.

**Required:** Journey Save still requires a station (existing validation).

### Filter rules

- Match substring on the visible station name ( Persisting value stays the canonical station id/name string the API already uses).  
- Ignore leading/trailing spaces; case-insensitive.  
- Do not require fuzzy/typo tolerance v1.

### Accessibility

- Combobox pattern: input + listbox (or button + listbox) with `aria-expanded`, `aria-controls`, option roles.  
- Don’t leave a broken native `<select>` hidden that steals focus oddly — either replace markup or keep a sync’d hidden select only if needed for form `required` (prefer real validation in JS if you drop select).

---

## 4. Visual

- Fit existing field styles (journey detail / Near me).  
- Dropdown/list should not escape the dialog awkwardly — max-height + scroll inside the sheet.  
- Selected station readable when collapsed (name shown in the field or a summary row).

---

## 5. Acceptance

1. Journey detail: type “War” → Warwick (etc.) appears; tap → station set; directions update as today.  
2. Near me picker: same filter behaviour.  
3. Use nearest station still works.  
4. Save without a station still blocked.  
5. Works in Android WebView after `npm run cap:sync`.  
6. No regress on Morning/Evening auto-route station fill.

---

## 6. Files (likely)

| File | Change |
|------|--------|
| `public/index.html` | Combobox markup for detail + nearby station |
| `public/app.js` | Shared filter/select helper; wire existing station change paths |
| `public/styles.css` | List panel, field |
| `TESTING.md` | Type-to-filter station pick |

---

## 7. Summary for Jim

> Replace station `<select>` on journey detail and Near me with type-to-filter combobox (substring, case-insensitive). Keep nearest-station and existing save/direction behaviour. P2 after current P1 queue.
