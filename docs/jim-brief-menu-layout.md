# Jim brief: Menu — drop hint, promote Reminders

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/index.html` (`#menu-dialog`), `docs/chrome-modes-and-labels.md` § Menu  
**Out of scope:** Reminders dialog internals, widget help copy, ad-free purchase logic

---

## 1. Problem

Menu is a flat list of equal rows. **Reminders** (core behaviour) sits between **How it works** and **About** / **Privacy**. The subtitle under **Menu** restates chrome labels and adds clutter.

---

## 2. Decisions

| Topic | Decision |
|-------|----------|
| Subtitle | **Remove** *“Near me shows nearby trains. My Journeys holds the routes you save.”* |
| Where that copy goes | Already covered in **How it works** — no need to duplicate; optional one-line there only if missing |
| Layout | **Two tiers** — actions first, then info / system |
| Visual | Same row style; **gap** (or light divider) between tiers — no new card language required |

---

## 3. Order (final)

```
Menu                         ← title only, no hint

Reminders                    ← actions (Android: always show row; web: Android-only hint inside dialog as today)
Add home screen widget       ← Android only (hidden on web as today)

        ── gap / divider ──

Help
Remove ads / Restore / Ad-free status   ← existing entitlement UI, unchanged rules

About · Privacy                         ← quiet text links (not full rows)

[ Done ]
Clear all data
```

**Actions tier:** **Reminders** first, then **Add home screen widget**.  
**Info tier:** **Help** → ad-free block. **About · Privacy** are demoted legal links under the list.

---

## 4. Implementation notes

- Remove `.menu-dialog-hint` / the `<p class="settings-hint menu-dialog-hint">` from `#menu-dialog`.  
- Reorder DOM (or flex `order`) so Reminders + widget sit above How it works.  
- Add spacing between the two groups (e.g. `margin-top` on the first info row, or a `menu-dialog-divider` with `aria-hidden`).  
- **Done** + **Clear all data** stay in the footer as today.  
- Do not change button styling to make Reminders a different component — hierarchy = **position + gap** only.

---

## 5. Acceptance

1. Menu has **no** Near me / My Journeys subtitle.  
2. **Reminders** is the first row (or first after title).  
3. **Add home screen widget** directly under Reminders on Android; still hidden on web.  
4. **Help** (and ad-free) sit **below** a clear gap after the action rows.  
5. **About** · **Privacy** are quiet text links — not full menu rows.  
6. Ad-free / Restore behaviour unchanged.  
7. Help still explains Near me vs My Journeys.

---

## 6. Files

| File | Change |
|------|--------|
| `public/index.html` | Drop hint; reorder menu links |
| `public/styles.css` | Tier gap / divider |
| `docs/chrome-modes-and-labels.md` | Menu section order |
| `TESTING.md` | Menu order row if listed |

---

## 7. Summary for Jim

> Strip the Menu subtitle. Put **Reminders** and **Add home screen widget** at the top; How it works / ads / About / Privacy below a gap. Same row chrome — hierarchy by order and spacing only.
