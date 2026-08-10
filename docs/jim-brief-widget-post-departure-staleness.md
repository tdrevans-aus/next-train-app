# Jim brief: Widget stale after departure (NOW + old clock)

**For:** Jim  
**From:** Tim (QA)  
**Priority:** High — recurring widget regression  
**Related:** `CommuteSchedule.java`, `WidgetDepartureAdvanceScheduler.java`, `CommuteRefreshService.java`, `WidgetLocalPaintScheduler.java`, TESTING.md **22**

---

## Problem

After the scheduled departure minute passes, the homescreen widget can sit on a **stale** train instead of advancing.

**Tim’s screenshot (~10:48):** Phone clock **10:48**; widget shows **NOW** + scheduled **10:47**, **Leave 11 min ago**, **Ashfield**, **Updated 3m ago**.

The 10:47 train has left. The widget still paints that row — not the next train, not a clear “updating” state.

---

## Root cause (confirmed in code review)

1. **Local repaint** — `repaintSnapshot()` recomputes from cached ISO. When `minutesUntilDeparture ≤ 0`, primary becomes **NOW** but **`trainClock` stays the old scheduled time** (e.g. 10:47).

2. **Departure-advance alarm** — `WidgetDepartureAdvanceScheduler` should network-refresh at the **start of the minute after departure** (`departureAdvanceAtMs`). If the alarm was missed (Doze, etc.), `scheduleIfNeeded` only **cancels** when `now >= advanceAt` — it does **not** trigger refresh.

3. **No offline following** — App can skip to `following` / `upcoming`; widget snapshot does not cache or promote the next train when the current one departs.

4. **`needsLocalRepaint` stops** when `needsNetworkRefresh` is true — if nothing triggers network refresh, widget can stick on **NOW** + old clock until the 15‑minute periodic refresh.

---

## Fix direction

| # | Change | Where |
|---|--------|--------|
| 1 | When departure minute passed and no next train cached → **Updating…** + **Fetching next train…** (empty `trainClock`), not **NOW** + old clock | `CommuteSchedule.repaintSnapshot` |
| 2 | On network refresh, **skip departed `next`**; use `following` / `upcoming[1+]` | `CommuteSchedule.load` / resolve next |
| 3 | **Cache following** in widget snapshot (`followingDepartureIso`, display time, leave-by) | `buildLiveSnapshot` |
| 4 | On local repaint after departure, **promote cached following** before waiting on network | `repaintSnapshot` |
| 5 | If `now >= departureAdvanceAt` when scheduling, **call `refreshAll`** (missed-alarm recovery) | `WidgetDepartureAdvanceScheduler.scheduleIfNeeded` |

`CommuteRefreshService.repaintFromCache` already calls `refreshAll` when `needsNetworkRefresh` — ensure that path always runs when departure minute passes (local paint or scheduler).

---

## Acceptance (TESTING.md test 22)

| Time | Expect |
|------|--------|
| Before departure minute ends | **NOW** / **N min** + scheduled clock OK |
| **Start of next minute** after departure | Next train countdown **or** brief **Updating…** then next train |
| **Never** | **NOW** + old scheduled clock + stale **Updated** for many minutes after departure |

**JUnit:** extend `CommuteScheduleTest` — post-departure repaint shows **Updating…** without following; with cached following advances to next train.

**Manual:** `cap:sync` + device; watch widget across a real departure; compare with app at same moment.

---

## Slack-ready

> Widget regression: after departure minute, **NOW** + old **10:47** at **10:48** (Updated 3m ago). Local repaint doesn’t advance; missed departure-advance alarm doesn’t refresh. Brief: `docs/jim-brief-widget-post-departure-staleness.md`.
