# Jim brief: Template wizard coach under highlighted feature (Active hours step)

**Copy-paste for Jim:**

```
Jim fix this docs/jim-brief-template-wizard-z-index.md
```

**For:** Jim  
**From:** QA (Tim)  
**Date:** 10 Aug 2026  
**Status:** **Fixed locally** (11 Aug ~10:05 AWST) — see `public/styles.css` + `qa/template-wizard-hours-zindex.mjs`. Jim can close after Tim device spot-check on rebuilt APK/AAB.

**Related:** `docs/jim-brief-template-wizard-skip.md`, `docs/jim-brief-journey-reminder-polish.md`

---

## Summary

On the **Active hours** template wizard step (and likely **Reminder**), the coach card appears **under** the highlighted timing fields. Tim sees **Active from / Active until** overlapping the **Next** button — wizard copy is buried behind the feature it’s explaining.

Screenshot: device ~20:20 AWST, Morning template, step **Active hours**.

---

## Root cause (confirmed — CSS stacking)

```css
.template-wizard-highlight {
  z-index: 21;
}

.journeys-dialog .template-route-coach {
  z-index: 20;
}

.journeys-dialog .template-route-coach .onboarding-coach-card {
  z-index: 1; /* inside coach stacking context */
}
```

Highlighted target (`#detail-journey-window` on Active hours step) is **z-index 21**. The coach overlay is **z-index 20**. The coach **card** cannot paint above the highlight because it’s trapped inside the z-20 stacking context.

`syncTemplateWizardCoachPosition()` positions the card above the target geometrically, but the highlight still wins paint order → fields overlap the card (matches Tim’s screenshot).

Same risk on **Reminder** step (`#detail-reminder-section.template-wizard-highlight`).

---

## Fix direction

Goal stack (bottom → top):

1. Form content  
2. Scrim (dim non-focused areas)  
3. Highlighted section (bright, interactive — user can edit while coach open)  
4. **Coach card** (always readable, above highlight)

**Option A (CSS — preferred if minimal):**

- Keep highlight at `z-index: 21`
- Raise **coach card** above highlight, e.g. `z-index: 22` with `position: fixed` (or restructure so card isn’t capped by parent `z-index: 20`)
- Update `syncTemplateWizardCoachPosition()` if card becomes `fixed` (use viewport `getBoundingClientRect`, not coach-relative offsets)

**Option B (structure):**

- Split overlay: scrim layer z-20, coach card as sibling at z-22 (not child of scrim container)

**Do not** lower highlight below scrim — Active hours / Reminder must stay editable and visible during the tour.

---

## Repro

1. `?reset=1&test=1&fixture=normal`
2. **Journeys** → **Morning into town** (or Custom first-setup)
3. Advance wizard to **Active hours** (step 3 or 4 with Name step)
4. **Expect (bug):** Active from/until fields overlap coach **Next** button
5. Advance to **Reminder** — check same layering

Web: journey detail in Journeys dialog, narrow viewport (390×844).

---

## Acceptance criteria

1. On **Active hours** step: coach card fully readable; no overlap from time fields / Next button
2. Highlighted section still visible (teal ring) and **editable** while coach open
3. **Reminder** step: same — coach above `#detail-reminder-section` highlight
4. Other steps (Name, Route, Time to station) unchanged
5. `node qa/template-wizard-skip.mjs` still **PASS**

---

## QA log

`qa/latest.md` — 10 Aug 2026 ~20:21 AWST
