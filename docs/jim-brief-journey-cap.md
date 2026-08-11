# Jim brief: Journey cap (6 max) — not enforced + Morning chip + cap hint

**Copy-paste for Jim:**

```
Jim fix this docs/jim-brief-journey-cap.md
```

**For:** Jim  
**From:** QA (Tim)  
**Date:** 10 Aug 2026  
**Priority:** Medium (Tim saved **8** journeys on device; cap is cosmetic only)

**Related:** `docs/jim-brief-duplicate-morning-template.md` (overlap when duplicate Morning rows exist)

---

## Summary

Tim expected a **6 journey limit**. Today:

1. **7th and 8th journeys save successfully** — no hard enforcement.
2. **“Morning into town” template chip** still appears when that journey already exists (if active hours were edited off preset).
3. At 6 journeys the **Add section vanishes silently** — no explanation.

---

## Root cause (confirmed)

### A. Cap is UI-only

`updateJourneyTemplatesVisibility()` hides `#journey-templates` when `settingsDraftJourneys.length >= 6`:

```javascript
const atCap = settingsDraftJourneys.length >= 6;
journeyTemplatesEl.hidden = atCap || !anyChipVisible;
```

**No guard** in:

- `createJourneyFromTemplate()`
- `createJourneyFromCommuteTemplate()` (`settingsDraftJourneys.push`)
- `saveJourneyDetailFromForm()` / `saveJourneyListToSettings()`
- `completeTemplateRouteSetup()` → `saveJourneyListToSettings()` on auto-route

Web repro: `node qa/journey-cap-repro.mjs` (chips hidden at 6; persist has no max).

### B. Morning chip when journey already exists

`journeyMatchesTemplate()` hides the Morning chip only if:

- `journey.templateKey === "morning"`, **or**
- legacy: name `"Morning into town"` **and** `defaultFrom === "06:00"` **and** `defaultUntil === "09:00"`

**`templateKey` is not persisted** — `normalizeJourney()` omits `templateKey` / `autoRoute`. After Save, matching is legacy-only. If Tim kept the name but changed hours, the chip stays visible → duplicate Morning / Warwick → Perth rows.

### C. No cap message

When `atCap`, entire `#journey-templates` is `hidden` with no replacement copy.

---

## Fix (implement all three)

### 1. Hard cap — `MAX_JOURNEYS = 6`

- Single constant (replace magic `6` in `updateJourneyTemplatesVisibility`).
- Count **configured** journeys (`!isUnconfiguredJourney`), not draft shells.
- **Block create:** early return in `createJourneyFromTemplate` / `createJourneyFromCommuteTemplate` when at cap (optional: toast *“Maximum 6 journeys — delete one to add another.”*).
- **Block save:** in `saveJourneyDetailFromForm`, if **new** configured save would exceed `MAX_JOURNEYS`, reject (inline error or toast; do not persist).
- **Block auto-save:** `completeTemplateRouteSetup` / `saveJourneyListToSettings` — do not persist a 7th configured journey.
- **Trim on load (optional safety):** `migrateSettings` could cap stored journeys to 6 (keep first 6 or active + others) — only if you want belt-and-braces; prefer block-at-save.

### 2. Template chip matching

- **Persist** `templateKey` and `autoRoute` in `normalizeJourney()`.
- **Broaden** `journeyMatchesTemplate`: hide morning/evening chip when `templateKey` matches **or** `journey.name === preset.name` (hours may differ after edit).

### 3. Cap hint UX

When `configuredCount >= MAX_JOURNEYS`:

- Hide template chips (as today).
- Show muted hint in same slot (reuse `.settings-hint` / `.journey-templates-hint`):

  > **6 journeys — that's the limit for now.** Delete one to add another.

HTML: e.g. `#journey-templates-cap-hint` toggled in `updateJourneyTemplatesVisibility()`.

---

## Repro (device — Tim)

1. `?reset=1` or delete journeys until &lt; 6.
2. Add journeys via **Custom** (and **Morning** if chip visible) with non-overlapping hour slots.
3. **Expect (current bug):** 7th and 8th save; duplicate routes (e.g. Warwick → Perth + Morning into town).
4. **Expect (fixed):** 7th create/save refused; Morning chip hidden when Morning into town exists; cap hint at 6.

## Automated

```bash
node qa/journey-cap-repro.mjs
```

Extend script or add case: assert `journeys.length` cannot exceed 6 after attempted 7th save.

---

## Acceptance criteria

1. Cannot persist more than **6 configured** journeys via any UI path.
2. **Morning into town** chip hidden when a journey with that name (or `templateKey: morning`) already exists, even if active hours ≠ 06:00–09:00.
3. At 6 journeys, cap hint visible; template chips hidden.
4. `node qa/journey-cap-repro.mjs` **PASS**.
5. Duplicate Morning overlap scenario reduced (see `jim-brief-duplicate-morning-template.md`).

---

## QA log

`qa/latest.md` — entries ~17:40–17:56 AWST (10 Aug 2026).
