# Jim brief: Widget leave-late copy — don’t read as train delay

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Superseded by `docs/jim-brief-widget-hide-leave-when-late.md` (U-03 option 1 — hide leave after 1-min grace; no “ago”)  
**Related:** `android/.../CommuteSchedule.java` (`formatLeaveSecondary`), `docs/widget-homescreen.md` § right/secondary  
**Out of scope:** Widget layout, refresh timing, train delay badges

---

## 1. Problem

When leave-by is overdue, the widget secondary line shows **`8 min late`** (red). Next to **NEXT TRAIN · 2 min**, that reads as **the train is delayed** — not “you’re late to leave.”

Happy-path copy keeps the word Leave (`Leave in 8 min` / `Leave now`). The late state drops it.

---

## 2. Decision

Always keep a **Leave** cue on the secondary line.

| Phase | New copy |
|-------|----------|
| Upcoming | `Leave in N min` / `Leave in 1 min` (unchanged) |
| Now | `Leave now` (unchanged) |
| Late / missed | **`Leave N min ago`** / **`Leave 1 min ago`** |
| Late, 0 min edge | `Leave now` (unchanged) |

Do **not** use bare `N min late` or `Left N min ago`.

Examples: overdue by 8 minutes → **`Leave 8 min ago`**.

---

## 3. Code

Update `formatLeaveSecondary` in `CommuteSchedule.java` (both call sites share this helper).

Align `docs/widget-homescreen.md` late-line examples with **`Leave N min ago`**.

Add/adjust unit coverage if `CommuteScheduleTest` asserts secondary strings.

---

## 4. Acceptance

1. Leave overdue by 8 min → secondary **`Leave 8 min ago`** (red), not `8 min late`.  
2. Train countdown on the left unchanged (still next departure).  
3. `Leave in` / `Leave now` paths unchanged.  
4. Readable on default 2×1; `Leave` must remain visible (not ellipsized away).

---

## 5. Summary for Jim

> Widget late leave copy: **`Leave N min ago`** (e.g. `Leave 8 min ago`) — never bare `N min late`, so it can’t be read as a delayed train.
