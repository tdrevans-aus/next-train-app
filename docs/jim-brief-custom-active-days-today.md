# Jim brief: Custom journey — Active days default to today’s weekday (U-06 A)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **locked A**  
**Related:** `createJourneyFromTemplate` (`custom`), `createDefaultJourney`, `remindDays` / Active days chips, `DEFAULT_REMIND_DAYS` (`public/app.js`)  
**Out of scope:** Changing Morning/Evening defaults (stay Mon–Fri); calendar-date one-offs (chips are weekdays)

---

## 1. Problem

Custom journeys inherit **Mon–Fri** Active days — same shape as the commute templates. After Morning/Evening exist, most Customs are more like **weekly** trips (e.g. Friday night out), not another daily commute.

---

## 2. Decision (locked — Tim)

**Option A:** New **Custom** journeys default Active days to **today’s weekday only** (Perth local day).

Active days are **day-of-week chips**, not calendar dates — so “Friday only” means **every Friday**, which matches weekly nights out.

Morning / Evening unchanged: **Mon–Fri**.

---

## 3. Behaviour

When creating a Custom journey (`createJourneyFromTemplate("custom")` / equivalent):

1. Set `remindDays` to a **single** day: today’s weekday in `Australia/Perth`  
   - Match existing day numbering used by chips (`1` = Monday … `7` = Sunday, same as current `data-day` / `normalizeRemindDays`).  
2. Populate Active day chips from that when the detail form opens.  
3. User can still add/remove days before Save (Save still requires ≥1 day).

### Hint (Custom only)

Under Active days (or the existing Active days hint), when `templateKey === "custom"` (or while editing a journey that was created as custom — at minimum on first Custom create):

> **Starts on today — add more days if this repeats more often.**

Morning/Evening keep their current Active days hint copy.

### Do not

- Default Custom to empty days (Save would fail).  
- Change Mon–Fri for Morning/Evening.  
- Use UTC “today” — use Perth.

---

## 4. Acceptance

1. Create Custom on a Friday (Perth) → only **F** selected.  
2. Create Custom on a Sunday → only Sunday chip selected.  
3. Hint visible for Custom Active days.  
4. Morning/Evening still Mon–Fri.  
5. User can turn on more days and Save.  
6. `npm run cap:sync` after web changes.

---

## 5. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | Custom create: `remindDays: [todayPerthWeekday]` |
| `public/index.html` | Optional Custom-specific Active days hint (or swap hint in JS) |
| `TESTING.md` | Custom Active days = today only |
| `docs/undecided-issues.md` | U-06 → Resolved A |

---

## 6. Summary for Jim

> Custom journeys: default Active days to **today’s Perth weekday only** (weekly on that day). Hint: *Starts on today — add more days if this repeats more often.* Morning/Evening stay Mon–Fri.
