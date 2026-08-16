# Commute target train face — restore on Journeys enter

**Status:** Shipped (Aug 2026) — regression-prone; keep behaviour + QA  
**Related:** `public/train-navigation.js` (`restoreCommuteTargetPinFace`) · `public/app.js` (`enterJourneyMode`, `render`) · `public/pin-state.js` (`showsTargetTrain`)

---

## User expectation

Journey with **Preferred target** 7:30 at 7:03:

1. Opening **My Journeys** lands on the first train at/after 7:30 (e.g. 7:34), not an earlier swipe skip.
2. Hero label is **Target train** (blue chrome), including after swiping away and back to that departure.
3. Day-override **Pinned train** still wins over settings target.

---

## Implementation invariants

### `restoreCommuteTargetPinFace(journey)`

Call when entering Journeys mode (`enterJourneyMode`, `applyJourneysMode`, widget open) **unless** a day override pin is active:

- Clear `journeyPinDismissedDate` for settings target (unpin must not block target for the rest of the day).
- Clear skip state (`skipTrains = 0`).

Do **not** replace this with `skipTrains = readSkipState().count` on tab enter — that restores stale swipes.

### `showsTargetTrain`

Hero matches preferred pin trip and it is **not** a day override:

- Label **Target train** even when `skipTrains > 0` (user swiped to the target slot).
- Blue `hero--target-train` chrome without requiring `skipTrains === 0`.

### Unpin default target

Dismiss pin + skip to **true next** train — not leave hero on target with pin cleared. Dismissed date is cleared again on next Journeys enter via `restoreCommuteTargetPinFace`.

---

## Do not confuse with

| Concept | Label |
|---------|--------|
| Settings preferred target | **Target train** |
| Manual day override pin | **Pinned Train** |

See commit `1993dd6` and `8070a79`.

---

## QA

- `qa/leave-by-preferred-gate.mjs`
- `qa/pin-swipe-notify.mjs`
- Manual: target 7:30 at ~7:03 → My Journeys → 7:34 **Target train**; swipe away/back → still **Target train**.
