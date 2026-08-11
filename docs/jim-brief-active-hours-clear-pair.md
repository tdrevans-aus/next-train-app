# Jim brief: Clear Active from → clear Active until (no error on Save)

**Copy-paste for Jim:**

```
Jim fix this docs/jim-brief-active-hours-clear-pair.md
```

**For:** Jim  
**From:** QA (Tim)  
**Date:** 10 Aug 2026  
**Priority:** Low (UX polish) → **Implemented** (2026-08-10)

---

## Summary

Tim clears **Active from** (× or empty) and taps **Save**. App alerts:

> Set both default from and until times, or leave both blank.

**Wanted:** Treat as “no active hours” — **clear Active until** automatically and **Save** succeeds (no alert).

Same intent as overlap “Fix for me” clearing both windows — blank hours = journey not auto-selected by clock (`hasDefaultWindow` false). See `docs/jim-brief-outside-hours-nearby.md`.

---

## Current code

`readJourneyDetailDraft()` in `public/app.js`:

```javascript
const defaultFrom = readOptionalTimeField(detailDefaultFromField);
const defaultUntil = readOptionalTimeField(detailDefaultUntilField);
if (Boolean(defaultFrom) !== Boolean(defaultUntil)) {
  throw new Error("Set both default from and until times, or leave both blank.");
}
```

Clearing only **from** leaves **until** set → mismatch → `alert()` on Save.

---

## Fix

**On Save (required):** If only one side is set, **clear the other** instead of throwing:

```javascript
let defaultFrom = readOptionalTimeField(detailDefaultFromField);
let defaultUntil = readOptionalTimeField(detailDefaultUntilField);
if (defaultFrom && !defaultUntil) {
  defaultUntil = "";
  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    ""
  );
} else if (!defaultFrom && defaultUntil) {
  defaultFrom = "";
  setOptionalTimeField(
    detailDefaultFromInput,
    detailDefaultFromDisplay,
    detailDefaultFromField,
    detailDefaultFromClear,
    ""
  );
}
```

(Or equivalent — normalize to both blank or both set before save.)

**Optional (nice):** When user taps × on **Active from**, clear **Active until** in the UI immediately (mirror pairing). Same if clearing **until** alone → clear **from**.

**Do not** change overlap logic — two journeys with blank windows still allowed per existing rules.

---

## Repro

1. Journey detail with **06:00–09:00** active hours.
2. Clear **Active from** (×).
3. **Save**.

| | Current | Fixed |
|---|--------|-------|
| | Alert, no save | Both blank, save OK |

---

## Acceptance criteria

1. Clear **from** only → Save → `defaultFrom` and `defaultUntil` both `""` in storage.
2. Clear **until** only → Save → both blank (symmetric).
3. Both set or both blank → unchanged.
4. No alert for half-filled pair.

---

## QA log

`qa/latest.md` — 10 Aug 2026 ~23:25 AWST
