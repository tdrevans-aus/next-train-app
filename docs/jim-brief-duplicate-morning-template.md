# Jim brief: duplicate “Morning into town” + overlap on Save

**For:** Jim  
**From:** QA (Tim)  
**Date:** 9 Aug 2026  
**Priority:** Medium (blocks completing first journey setup after double wizard)

---

## Summary

Tim saved a journey from the **Morning into town** template and got:

> Default times overlap with **"Morning into town"** (06:00–09:00). Adjust the times so only one journey is the default at any moment.

It looks like the journey overlaps **with itself**, but the validator is comparing against a **second** journey with the same name and window.

---

## Root cause (confirmed)

`findJourneyDefaultWindowConflict` **does** skip the journey being edited (`other.id === journey.id`):

```javascript
for (const other of journeys) {
  if (other.id === journey.id || !hasDefaultWindow(other)) {
    continue;
  }
  if (journeyDefaultWindowsOverlap(journey, other)) {
    return other;
  }
}
```

Tim’s scenario: **wizard / template run twice** → two rows in `settingsDraftJourneys` / `localStorage`:

| id | name | defaultFrom | defaultUntil | station |
|----|------|-------------|--------------|---------|
| `j-…1` | Morning into town | 06:00 | 09:00 | (empty or partial) |
| `j-…2` | Morning into town | 06:00 | 09:00 | Burswood → Perth |

Saving the second one conflicts with the first. Same **display name** in the alert → feels like self-overlap.

---

## How duplicates get created

1. **Template always pushes a new journey** — `createJourneyFromCommuteTemplate` does not reuse an existing morning/evening row:

   ```javascript
   settingsDraftJourneys.push(journey);
   saveJourneyListToSettings();
   ```

2. **Unconfigured journeys now persist** (recent fix) — a failed or abandoned first attempt leaves a morning shell in `nextTrainSettings`.

3. **Second wizard run** or **second template tap** adds another morning journey with the same preset times.

4. **Double-tap** on template chip (mobile) can create two rows before detail opens.

---

## Repro

1. `?reset=1&test=1&fixture=normal`
2. Wizard **Set up a journey** → **Morning into town** (wait for route coach).
3. **← Journeys** → template chips again → **Morning into town** again.
4. Configure second journey → **Save**.
5. **Expect (current bug):** overlap alert naming “Morning into town”.

Or inspect storage:

```javascript
JSON.parse(localStorage.getItem("nextTrainSettings")).journeys
```

Two objects with `defaultFrom: "06:00"` and `defaultUntil: "09:00"`.

---

## Suggested fixes (pick one or combine)

### A. Reuse on template pick (preferred UX)

When picking **Morning into town** / **Evening home**, if an **unconfigured** journey with that template name (or matching preset window) already exists, **open that row** instead of `push`.

### B. Block duplicate template

If a journey with the same template preset already exists, show toast: *“You already have a morning journey — edit it from the list.”*

### C. Clearer overlap message

When conflict name equals current name, say: *“Another journey already uses these hours (Morning into town). Delete the duplicate from Journeys or change the times.”*

### D. Wizard guard

If onboarding **Set up a journey** already created a morning journey this session, don’t offer the same template again without list cleanup.

---

## User workaround

**Journeys** → delete duplicate **Morning into town** (often shows **Set up…** on route) → save the one you want.

Or `?reset=1` for clean storage.

---

## Related

- `TESTING.md` test **13b** (double wizard / double template).
- Template save fix: `migrateSettings` + `normalizeJourneyList` (separate issue — templates now save on web).

---

## Acceptance criteria

1. Running setup wizard twice does **not** leave two morning journeys with identical default windows (unless user explicitly adds a second journey).
2. Save on a single morning journey with unique times does **not** show overlap with itself.
3. If overlap is real (two commutes), message distinguishes **another journey** from the one being edited.
