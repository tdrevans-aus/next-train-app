# Jim brief: Allow deleting the last journey

**Copy-paste for Jim:**

```
Jim fix this docs/jim-brief-delete-last-journey.md — regression FAIL: delete sole journey clears storage but journeys dialog stays open and hero not empty (finishAfterAllJourneysDeleted → enterJourneyMode re-opens dialog).
```

**For:** Jim (implement)  
**From:** QA (Tim) / Mark  
**Date:** 10 Aug 2026  
**Status:** Implemented (2026-08-11) — `qa/delete-last-journey.mjs` **PASS**  
**Related:** `deleteJourneyBtn`, `saveJourneyListToSettings`, `renderJourneyEmptyState` (`public/app.js`)

---

## Problem

Users cannot delete their **only configured** journey — delete icon is hidden and the click handler no-ops. For cleanup (e.g. test data) they must use **Clear all data** or `?reset=1`, even though zero journeys is already supported end-to-end.

---

## Decision

Allow deleting the last journey. Land on the same **empty setup** as fresh install / clear all data.

Confirm before deleting sole configured journey:

> Delete your only journey? You can add a new one anytime.

## Regression failure (11 Aug 2026)

`node qa/delete-last-journey.mjs` after confirm delete:

| Check | Expected | Actual |
|-------|----------|--------|
| `journeys.length` | 0 | **0** ✓ |
| Journeys dialog | closed | **still open** |
| Hero | "No journeys yet" | route still **Edgewater, towards Perth** |

**Likely cause:** `finishAfterAllJourneysDeleted()` calls `enterJourneyMode()` while `journeyModeActive` is already true → `openJourneys()` reopens dialog instead of `renderJourneyEmptyState()`.

**Fix:** After last delete, close dialog and show empty setup without re-opening Journeys list (e.g. `renderJourneyEmptyState()` + `syncChromeMode`, or `enterJourneyMode` branch when zero configured).

---


1. **Delete button** visible on journey detail whenever editing (including sole configured journey).
2. **Sole configured journey** → confirm dialog → delete → persist `journeys: []`, `activeJourneyId: null`.
3. Close journeys dialog → main shows **No journeys yet** + **Add a journey**.
4. **Near me**, widget empty state, reminders empty state — unchanged (already support 0 journeys).
5. `saveJourneyListToSettings({ allowEmpty: true })` on explicit delete only; other paths keep empty-draft guard.

---

## Acceptance

1. One journey → detail → Delete → confirm → empty setup; storage has 0 journeys.
2. Two journeys → delete one → other remains; no confirm for non-sole delete.
3. `node qa/delete-last-journey.mjs` **PASS**.

---

## Automated

```bash
node qa/delete-last-journey.mjs
```
