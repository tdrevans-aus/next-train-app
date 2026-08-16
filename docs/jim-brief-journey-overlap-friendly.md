# Jim brief: Journey Active hours overlap — friendlier copy + Fix for me

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Shipped — **Fix for me revised 2026-08-10** (minimal shift; new journey wins)  
**Related:** `formatJourneyOverlapError`, Save journey detail (`public/app.js`), Active from / until fields  
**Out of scope:** Dual-chip “adjust mine vs theirs” — **closed U-01** (Aug 2026): always adjust the *other* journey.

---

## 1. Problem

On Save, overlap shows cold jargon — and the first **Fix for me** snapped the *editing* journey to Morning/Evening presets (e.g. 15:00–18:00 → 06:00–09:00), far from what the user chose, often still overlapping another journey.

---

## 2. Copy (locked — Tim)

> Only one journey can be active at one time. These hours overlap **Evening home** (15:00–18:00).

Rules:

- Use the **conflict** journey’s display name + `formatJourneyDefaultWindow(conflict)` in parentheses.  
- Drop “Default times” / “default at any moment.”

Duplicate same-name edge:

> Only one journey can be active at one time. Another **Morning into town** already uses these hours.

---

## 3. Presentation

**Prefer inline** under Active hours (Timing):

- Show the locked sentence.  
- Highlight Active from / until.  
- Scroll error into view.  
- Keep Save blocked until resolved.

---

## 4. Fix for me (revised — locked)

**Fix for me** (chip next to the error).

### Precedence (Tim)

**The journey being saved keeps its Active hours.** Fix amends the **conflicting (older) journey** in the draft.

Do **not** jump to Morning/Evening presets. Do **not** move the editing journey’s times.

(Deferred: a second control “Adjust these hours instead.” Default path is enough.)

### Minimal change

Pick the candidate with the **smallest** total absolute change to the conflict’s from+until (minutes), that:

1. No longer overlaps the editing journey (same Active days rules as Save).  
2. Does not create a new overlap with any *other* journey.  
3. Prefers a real window over clearing.

**Candidates (same-day windows):**

1. **Trim end** — conflict until = editing from (keep conflict from), if a ≥1 min window remains.  
2. **Trim start** — conflict from = editing until (keep conflict until), if a ≥1 min window remains.  
3. **Slide before** — keep conflict duration; place window immediately before editing from.  
4. **Slide after** — keep duration; place immediately after editing until.  
5. **Clear** Active hours on the conflict journey (last resort; high cost).

Overnight windows → clear the conflict journey (don’t invent presets).

**Tie-break:** lower score wins; if tied, prefer the earlier start time.

### After apply

- Update the conflict row in `settingsDraftJourneys` only.  
- Leave the form’s Active from / until as the user set them.  
- Replace the error with a confirmation, e.g.  
  *Adjusted Evening home to 12:00–15:00 so yours can keep 15:00–18:00. Tap Save.*  
  or *Cleared Active hours on …*  
- Hide **Fix for me** until a new overlap appears.  
- Do **not** auto-Save — user still taps Save (persists both journeys from draft).

---

## 5. Acceptance

1. Overlap message matches locked copy.  
2. **Fix for me** does **not** change the editing journey’s times.  
3. Conflict journey moves by the smallest valid trim/slide (or clear).  
4. Example: editing 15:00–18:00 vs existing 15:00–18:00 → other becomes 12:00–15:00 (or 18:00–21:00); editing stays 15:00–18:00; Save succeeds.  
5. Never snaps editing journey to 06:00–09:00 as a “fix.”  
6. Confirmation names the adjusted journey and new window.  
7. `npm run cap:sync` after web changes.  
8. Overlap error fully visible on Save (scroll into view).

---

## 6. Files

| File | Change |
|------|--------|
| `public/app.js` | Minimal-fix conflict adjuster; confirmation UI |
| `public/index.html` | Inline error + Fix for me |
| `public/styles.css` | Error + fixed confirmation styling |
| `TESTING.md` | Overlap Fix for me cases |

---

## 7. Summary

> Overlap: locked copy under Active hours. **Fix for me** keeps the journey being saved; adjusts the *other* journey by the smallest trim/slide (or clear). No Morning/Evening preset snaps. User still Saves.
