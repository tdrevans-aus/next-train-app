# Jim brief: Template wizard — no scrim dismiss + Skip + editable Name (U-04)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **locked A + Skip + C**  
**Related:** `public/app.js` (`dismissTemplateRouteCoach`, `advanceTemplateWizard`, `showTemplateRouteCoach`, scrim listener), `public/index.html` (`#template-route-coach`), `docs/jim-brief-location-wait-ux.md`  
**Out of scope:** Re-showing the wizard after **Got it** / **Skip tour**; other coaches (Nearby / widget / reminders). Reminder **final wizard step** + label/scroll polish → see `docs/jim-brief-journey-reminder-polish.md` (implement together).

---

## 1. Problem

Scrim tap dismisses the journey setup wizard. Step 1 says the name can be changed — tapping the name field (or “off” the card) kills the coach. It does not resume; after Save, `shouldShowTemplateRouteCoach` stays false forever (configured journeys &gt; 0). Users lose Route / Time to station / Active hours tips.

---

## 2. Decisions (locked — Tim)

| | Decision |
|---|----------|
| **A** | Scrim does **not** dismiss the wizard. Only **Next**, **Got it**, or **Skip tour**. |
| **Skip tour** | Explicit secondary control ends the tour and marks wizard seen (same as finishing with Got it — do not re-coach later). |
| **C** | On the **Name** step (and preferably all steps), the user can interact with the highlighted form field **without** dismissing the coach — especially `#detail-journey-name`. |

---

## 3. Behaviour

### Dismiss paths

| Action | Result |
|--------|--------|
| **Next** | Advance step (unchanged) |
| **Got it** (last step) | `markTemplateWizardSeen()` + dismiss |
| **Skip tour** | `markTemplateWizardSeen()` + dismiss (same once-only rule) |
| Scrim / outside card | **No-op** — do not call `dismissTemplateRouteCoach` |
| Close Journeys / Cancel detail | Existing close paths may dismiss coach for this session; **do not** mark seen unless they used Got it / Skip (so an unfinished shell can still show coach if `shouldShowTemplateRouteCoach` still true on re-open) |

Remove (or no-op) the current scrim click listener that calls `dismissTemplateRouteCoach()`.

### Skip tour control

- Secondary button on the coach card: **Skip tour**  
- Place under / beside primary (**Next** / **Got it**) — secondary style (`btn-secondary` or text button; keep tappable ≥44px).  
- Visible on **all** wizard steps.  
- Label locked: **Skip tour**

### C — interact with Name (and fields under the coach)

While the coach is open:

- Clicks on the **coach card** (and its buttons) work as today.  
- Clicks on the **highlighted field** (name on step 1; ideally route / time-to-station / active hours on later steps) must reach the form — user can type a new name, then tap **Next**.  
- Typical approach: `pointer-events: none` on the coach shell/scrim; `pointer-events: auto` on `.onboarding-coach-card` (and ensure highlight target isn’t blocked).  

Do **not** require dismissing the coach to edit the name.

---

## 4. Acceptance

1. Tapping dimmed area / scrim does **not** close the wizard.  
2. **Skip tour** closes it and never re-shows (same storage as Got it).  
3. On Name step, user can focus/edit `#detail-journey-name` while the coach stays open, then **Next**.  
4. Completing with **Got it** still marks seen and dismisses.  
5. `npm run cap:sync` after web changes.

---

## 5. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | Remove scrim dismiss; Skip handler → mark seen + dismiss |
| `public/index.html` | **Skip tour** button on `#template-route-coach` |
| `public/styles.css` | pointer-events so form fields work under coach; Skip layout |
| `TESTING.md` | Scrim no-dismiss; Skip; edit name mid-tour |
| `docs/undecided-issues.md` | U-04 → Resolved |

---

## 6. Summary for Jim

> Template wizard: scrim no longer dismisses. Add **Skip tour** (marks seen, same as Got it). Let the user edit the journey name (highlighted fields) while the coach stays open — pointer-events through scrim to the form. Next/Got it unchanged.
