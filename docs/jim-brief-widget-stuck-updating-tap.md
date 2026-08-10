# Jim brief: Widget stuck “Updating…” + tap won’t open app

**For:** Jim  
**From:** Tim (QA)  
**Priority:** **High** — widget unusable + launcher tap appears broken  
**Related:** `CommuteSchedule.applyUpdatingState`, `CommuteRefreshService`, `MainActivity.onResume`, `WidgetUiBuilder`

---

## Problem

Tim left **Android emulator** running ~1 hour. Widget now shows:

- Large teal text truncated to **“Upd”** (full string is **“Updating…”**)
- **Fetching…** on the right
- **58m ago** (last successful network refresh)

**Tap widget:** tries to open app but **fails** (no launch / flash and die).

---

## What the widget is showing (code)

This matches **`applyUpdatingState`** in `CommuteSchedule.java` — entered when:

1. Cached train’s **departure minute has passed**
2. No **following** trip in cache to promote locally
3. Widget is waiting on **network refresh** for the next train

```text
primary:    Updating…     → clips to “Upd” on 2×1 (26sp, narrow column)
secondary:  Fetching next train… → compact “Fetching…”
updatedLine: formatUpdatedAgo(refreshedAtMs) → “58m ago”
```

So the widget is **not** live-updating — it’s **stuck in “trying to fetch next train”** with a **58‑minute-old** successful refresh timestamp.

---

## Why it stays stuck ~1 hour

1. After departure, `needsNetworkRefresh` is true → local repaint shows **Updating…** (not old countdown).
2. `repaintFromCache` / schedulers call `refreshAll` → **network** fetch.
3. If fetch **fails** (emulator idle, network drop, API timeout), `buildWidgetSnapshot` falls back to `repaintSnapshot(cached)` → **Updating…** again.
4. `needsLocalRepaint` is false while network refresh needed → **no further local ticks** until something triggers `refreshAll` again.
5. **15‑minute** periodic refresh may also fail → indefinite **Updating…** + stale **58m ago**.

---

## Why tap may fail to open app

`MainActivity.onResume()`:

```java
NextTrainWidgetProvider.requestRefresh(this);
CommuteRefreshService.refreshAll(this);  // synchronous HTTP on main thread
```

`CommuteSchedule.load` → `NextTrainApiClient.fetchNextTrain` — **up to 15s** connect/read timeout on the **UI thread**.

When widget tap starts/resumes the activity, **refreshAll can block or ANR** before WebView appears → feels like “app won’t open”. Emulator after long sleep is a common trigger (slow/cold network stack).

Deep link itself (`nexttrain://journey/{id}`) looks fine; likely **blocked by sync on resume**, not bad URI.

---

## Layout bug (same screenshot)

**“Updating…”** at **26sp** in 2×1 left column → clips to **“Upd”**. Compact layout should use shorter primary (**“…”** / **“Update”**) — same class as train-clock clip (#9).

---

## Fix direction

| # | Change |
|---|--------|
| 1 | **Never block UI thread** — `refreshAll` on background executor; update widgets when done |
| 2 | **onResume** — open WebView first; schedule widget refresh async (or only if snapshot age > N) |
| 3 | **Failed refresh after Updating…** — fall back to **stale last good times** + “Times may be out of date” / “Tap to refresh”, not perpetual Updating + old “58m ago” |
| 4 | **Compact primary** for updating state: **“…”** or smaller text — not truncated “Upd” |
| 5 | **Retry** — if stuck in updating >2–3 min, force network refresh or show error state |

---

## Tim workaround (now)

1. Open app from **launcher icon** (not widget) — if ANR, force-stop app in emulator settings, reopen.
2. Confirm emulator **network** (Wi‑Fi on, can reach Vercel API).
3. Remove widget and re-pin after `cap:sync` + fix.

---

## QA acceptance

1. Leave emulator 1h with widget pinned through a departure → widget recovers (next train or honest stale), not endless Updating + 58m ago.
2. Tap widget → app **always** opens within ~1s; refresh happens after UI visible.
3. 2×1 updating state readable (not “Upd”).
4. `CommuteScheduleTest` + manual test 22.

---

## Slack-ready

> Widget stuck **Updating…** / **58m ago** after 1h; tap won’t open app (suspect **sync on main thread in onResume**). Brief: `docs/jim-brief-widget-stuck-updating-tap.md`.
