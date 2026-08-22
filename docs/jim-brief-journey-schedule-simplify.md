# Jim brief: Journey schedule simplification — derive Active hours from Target

**For:** Implement + QA  
**From:** Tim (product)  
**Status:** **Backlog** — pick up after outside-day hero browse (`docs/jim-brief-outside-day-hero-browse.md`) + FB-43 Phase 1.5 device QA  
**Backlog:** **FB-46** (`docs/feature-backlog.md`)  
**Follows:** `docs/jim-brief-outside-day-hero-browse.md` (Brief 1)  
**Supersedes (partial, when implemented):** U-14 hard block · U-15 explicit user-edited Active hours · `jim-brief-preferred-always-visible.md` §2.1 soft hint  
**Related:** `docs/pin-behavior.md` · `docs/jim-brief-target-train-master.md` · `docs/jim-brief-journey-overlap-friendly.md` · `public/journey-detail.js` (`journeyWindowAroundTarget`)  
**Out of scope:** Changing `remindDays` UX; route journeys; renaming storage keys (`defaultFrom` / `defaultUntil` / `preferredTrainTime`)

---

## 1. Problem

After Brief 1, the user-facing commute story is **Active days** + **Target train**. The **Journey window** fields (From / Until) feel redundant; the app already derives ±90 min from target when blank. Users rarely edit them; on non-active days they do not match how the product behaves (preview + browse).

**Question:** Hide From/Until and derive `defaultFrom` / `defaultUntil` on Save from target?

---

## 2. Decision (locked — Tim, not yet scheduled)

| Topic | Lock |
|-------|------|
| User-facing schedule | **Active days** + **Target train** only |
| `defaultFrom` / `defaultUntil` | **Keep in storage** — derive target ±90 min on Save |
| UI | **Hide** Journey window from primary commute detail |
| U-14 Save block | **Remove** when implemented |
| Custom hours Advanced toggle | **Not v1** — optional later (Brief 3) |
| Overlap validation | **Keep** on derived windows |

---

## 3. Implementation summary

See full spec sections in git history / prior draft. Key touchpoints:

- `public/journey-detail.js` — derive on Save, hide `#detail-journey-window`, remove U-14  
- `public/pin-state.js` — delegate `journeyMatchesSchedule` to journey-model only  
- Templates / wizard — drop “target must be within window” copy  
- Migration — preserve custom windows until user changes target  
- QA — morning + evening templates, overlap, Brief 1 mode regression  

---

## 4. When to promote from backlog

- [ ] Brief 1 shipped and device-tested (Saturday preview, swipe browse, leave-by when pinned only)  
- [ ] FB-43 Phase 1.5 (live 2×1 bottom route) verified on device  
- [ ] Tim explicitly schedules FB-46 for a release  

---

## 5. Acceptance (when implemented)

- [ ] Journey window fields hidden from commute detail  
- [ ] Save derives from/until from target ± 90 min  
- [ ] U-14 block and outside-target hint removed  
- [ ] Overlap validation still works on derived windows  
- [ ] Brief 1 modes A/B/C regression pass  
