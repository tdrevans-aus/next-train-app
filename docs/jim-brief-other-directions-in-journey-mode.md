# Jim brief: Hide “Other directions” in My Journeys mode

**For:** Jim  
**From:** Tim (QA)  
**Priority:** Medium — confusing layout in Journey mode  
**Related:** `public/app.js` (`render`, `renderNearbyBoard`, `closeJourneysDialog`, `exitNearbyMode`), `public/index.html` (`#nearby-directions`)

---

## Problem

In **My Journeys** mode, the **Other directions** block (`#nearby-directions`) sometimes stays visible below the hero. It shows the **Near me** station board UI (direction chips + platform/status/Then under that label) — not journey leave-by layout.

**Tim’s screenshot (9:30):** My Journeys active, Armadale morning journey, hero shows next train, but **OTHER DIRECTIONS** + leave/platform/Then block appears underneath — should not.

**Near me only:** `#nearby-directions` + `renderNearbyBoard()` are for the nearby station board. Journey mode should use hero + leave card + detail strip + **Then** (no “Other directions” label).

---

## Repro (automated)

```text
1. Configured journey in localStorage (e.g. Armadale → Perth).
2. Journey mode → open Journeys dialog (`enterJourneyMode` + `openJourneys`).
3. While dialog still open, tap **Near me** (`enterNearbyMode` → nearby board loads, Other directions shown).
4. Tap **Done** on Journeys dialog (`closeJourneysDialog`).
```

**Result:** `journeyModeActive === true`, route shows journey, **Manage journeys** visible, but `#nearby-directions.hidden === false`.

Playwright one-liner path: see QA repro in `qa/repros/other-directions-journey-repro.mjs`.

---

## Root cause

1. **`closeJourneysDialog`** sets `journeyModeActive = true` and calls `fetchNextTrain()` but **does not call `exitNearbyMode()`**, so `#nearby-directions` stays unhidden if Near me was shown while the dialog was open.

2. **`render()`** (journey hero) never sets `nearbyDirectionsEl.hidden = true` — relies on `exitNearbyMode()` having run earlier.

3. **`renderNearbyBoard()`** has no guard — if a stale nearby fetch completes after `exitNearbyMode()`, it can set `nearbyDirectionsEl.hidden = false` again (async race).

---

## Fix (recommended)

1. **`closeJourneysDialog`:** when committing configured journeys, call **`exitNearbyMode()`** (or at minimum `nearbyDirectionsEl.hidden = true` + clear list) before `fetchNextTrain()`.

2. **`render()`:** at start or end, if `journeyModeActive`, force **`nearbyDirectionsEl.hidden = true`**.

3. **`renderNearbyBoard()`:** early return if **`!isNearbyModeActive()`** (or `journeyModeActive`) so journey mode never gets nearby UI from stale callbacks.

4. **Optional:** `enterJourneyMode` / `applyCommuteMode` — already call `exitNearbyMode()`; keep consistent.

---

## QA acceptance

| Mode | Other directions |
|------|------------------|
| **Near me** | Visible when board has directions |
| **My Journeys** | **Never** visible (hidden, empty list) |

**TESTING.md test 23** + `node qa/repros/other-directions-journey-repro.mjs` → **PASS**.

Manual: Journey mode after any path (save journey, switch from Near me, cold start in active window) — no “Other directions” label.

---

## Slack-ready

> **Other directions** leaks into My Journeys — repro: open Journeys dialog → tap Near me → Done. `closeJourneysDialog` doesn’t call `exitNearbyMode`; `render()` doesn’t hide `#nearby-directions`. Fix: exit nearby on dialog close + guard `renderNearbyBoard` + hide in `render()`.
