# Jim brief: Journey Reminder block — label, scroll, wizard step

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — locked with wizard Skip brief  
**Depends on / pair with:** `docs/jim-brief-reminders-on-journey.md`, `docs/jim-brief-template-wizard-skip.md`  
**Related:** `#detail-reminder-section`, template wizard steps, `.settings-detail-scroll`  
**Out of scope:** Changing scheduler; Early Reminder / Pause (stay on Menu → Reminder settings)

---

## 1. Problems (Tim)

1. **Reminder / Reminder** — section title + toggle title duplicate.  
2. **Clipped** — Reminder block sits under / behind the sticky Cancel–Save footer.  
3. **Not wizarded** — only block on journey detail the setup coach skips; feels inconsistent.

---

## 2. Decisions (locked)

### Label

One **Reminder** word only.

```
Reminder                         [toggle]
```

- Drop the extra inner title (or drop the `h3` and keep a single toggle-row title — either is fine; **no duplicate**).  
- When on: **Preferred train** + hint unchanged (*First train at or after this time.*).  
- Optional one-line hint when off is **not** required.

### Scroll / footer

Ensure `#detail-reminder-section` is fully readable above the sticky footer:

- Increase `.settings-detail-scroll` bottom padding enough to clear footer + safe area (roughly ≥ footer height; tune on phone).  
- When the wizard highlights Reminder (and on coach **Turn on** → highlight), `scrollIntoView` so the block isn’t under the footer.

### Wizard step

Add a **Reminder** step after **Active hours**. New order:

| Step | Morning/Evening | Custom (no Name) |
|------|-----------------|------------------|
| 1 | Name | Route |
| 2 | Route | Time to station |
| 3 | Time to station | Active hours |
| 4 | Active hours | **Reminder** |
| 5 | **Reminder** | — |

- Highlight `#detail-reminder-section`.  
- Copy (locked): **Get a notification when it’s time to leave.** Turn on and set preferred train if you want.  
- Primary: **Got it** on this last step (was on Active hours).  
- **Next** on earlier steps; **Skip tour** still on all steps (per Skip brief).  
- Do **not** force Reminder on — tour only explains the control.

---

## 3. Acceptance

1. No double “Reminder” label.  
2. Full Reminder block visible without being hidden by Cancel/Save (scroll if needed).  
3. First-setup wizard includes Reminder as final step before Got it.  
4. `npm run cap:sync` after web changes.

---

## 4. Summary for Jim

> Journey detail Reminder: one label only; pad/scroll so it clears the sticky footer; add final wizard step for Reminder (Got it). Pair with `jim-brief-template-wizard-skip.md`.
