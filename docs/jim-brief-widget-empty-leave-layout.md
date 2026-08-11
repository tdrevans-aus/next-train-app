# Jim brief: Widget 2×1 layout polish (leave empty + station vs Updated)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** **Implemented** — verified vs acceptance; unit tests hardened (2026-08-10)  
**Related:** `widget_small.xml`, `WidgetUiBuilder.java`, `CommuteSchedule` leave-hide (U-03), `docs/widget-homescreen.md`  
**Out of scope:** Redesigning medium hierarchy beyond “Updated returns”; new widget sizes; changing leave-hide rules (grace still 1 min then hide)

---

## 1. Problem

Tim screenshot (2×1): **NEXT TRAIN** / big countdown / **18:03** on the left; right side only **Just now** — leave line hidden after grace. Feels fiddly:

1. **Lonely / broken Updated** — bare **`Just now`** (compact form) does **not** read without **`Updated`** in front. Don’t use that short crumb.  
2. **Tight left stack** — label / primary / clock cramped; unit text fights the digit and can clip.  
3. **Station missing on 2×1** — we hid station to fit leave + Updated; Tim would rather see **where** than a freshness crumb on the default size.  
4. Empty leave state wasn’t designed when we shipped “hide leave after grace.”

---

## 2. Goals (locked — Tim trial)

### Station over Updated on 2×1

**Try option B:**

| Size | Leave showing | Leave empty |
|------|---------------|-------------|
| **2×1 (small)** | Right: **Leave in / Leave now** + **station** under it. **No Updated** on small. | No orphan **Just now**. Prefer **station** on the right (or under clock if right collapses). **No Updated** on small for this trial. |
| **Medium+** (user resized wider/taller) | Keep today’s roomier layout: leave + **station** + full **`Updated …`** (see §2.2). |

Do **not** invent fake leave copy to fill the gap.  
Do **not** ship compact **`Just now`** / **`3m ago`** without the word **Updated**.

### Updated reappears when bigger — yes

Existing layout switch already picks `widget_medium` when the cell is wide/tall enough (`minWidth` / `minHeight` thresholds in `WidgetUiBuilder`). On **medium**:

- Show full freshness line: **`Updated just now`** / **`Updated 3m ago`** (never the bare compact form).  
- Keep **station**.  

So if Tim resizes up, **Updated comes back**. No new size family required for this trial.

### Primary countdown hierarchy (locked — Tim)

When space is tight on 2×1, **prioritise the number**:

- Digit(s) **large** (hero of the left stack).  
- Unit (**`min`** / **`mins`**) **quite small** beside/after it — still present, never dropped.  
- Prefer a dual-size primary (e.g. `Spannable` / two `TextView`s) over shrinking the whole string equally or clipping to a bare **`3`**.  
- **`NOW`** stays a single word (no unit).  
- Do **not** invent compact forms like **`3m`** for the primary unless Tim reopens this.

Slightly ease left vertical rhythm on `widget_small` (spacing / sizes) without blowing past 2×1 height (previous clip bugs).

---

## 3. Acceptance

1. 2×1 with leave showing: **station** visible; **no** Updated crumb (and no bare **Just now**).  
2. 2×1 with leave hidden: no orphan **Just now**; **station** still readable if we have a label.  
3. Resize to medium: **Updated …** (full word) **and** station both visible with leave when applicable.  
4. Primary shows a **large number** + **small unit** (`min` / `mins`); never a clipped bare digit with no unit.  
5. 2×1 still fits without re-clipping clock in the leave-visible state.  
6. Unit tests updated for visibility helpers / compact Updated (stop asserting bare **Just now** on small if we drop Updated).

---

## 4. Files (likely)

| File | Change |
|------|--------|
| `android/.../widget_small.xml` | Room for station on right; dual-size primary if needed; drop/park Updated |
| `android/.../WidgetUiBuilder.java` | 2×1: station over Updated; medium: full Updated; big digit + small unit |
| `WidgetUiBuilderTest.java` | Station / Updated visibility; no bare Just now |
| `docs/widget-homescreen.md` | Align with this trial |

---

## 5. Summary for Jim

> **Verify & finish for prod** — code is largely already in the working tree. Match acceptance (station over Updated on 2×1; medium keeps full Updated; big digit + small `min`). Fill test gaps; do **not** rewrite from scratch.  

