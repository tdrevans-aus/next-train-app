# Jim brief: 2×1 live face — route on bottom bar

**For:** Implement + QA  
**From:** Tim (product)  
**Status:** Ready to code  
**Backlog:** **FB-43** Phase 1.5 (supersedes “route fold into clock” from Phase 1)  
**Related:** `android/.../WidgetUiBuilder.java` · `android/.../CommuteScheduleSnapshot.java` · `android/.../WidgetPinResolver.java` · `docs/widget-homescreen.md` · `docs/jim-brief-outside-day-hero-browse.md`  
**Out of scope:** 3×1 / 2×2 layout (FB-43 Phase 2); Brief 2 journey schedule; changing snapshot/route data sources; Glance migration

---

## 1. Problem

On the **default 2×1** widget, the **route** (`Edgewater → Perth`) is visible when showing a **target commute** (outside-hours idle — e.g. Saturday “Monday · 15:30”), but **not** when showing a **live** face — especially a **Near me** pinned train.

Tim expectation: **route always on the bottom bar** on 2×1 for any face that has route data — same visual anchor as the idle target face.

---

## 2. Root cause (not two layouts)

Same layout XML (`widget_small.xml`). Two different **binders**:

| Face | When | Binder | Route today |
|------|------|--------|-------------|
| **Idle** (target preview) | Outside active hours / `outsideHoursIdle` | `bindOutsideHoursIdleFace` | **Bottom** `widget_route` ✓ |
| **Live** (countdown + leave twin) | Pinned nearby, journey pin, in-window commute | `bindLiveFace` | **Folded** into `widget_train_clock`; `widget_route` **GONE** |

Phase 1 FB-43 implemented **fold on compact live** (`isCompactLiveFace` / `isShortCell`):

```java
boolean foldRouteIntoClock = showRouteAtBottom && size.isShortCell();
if (foldRouteIntoClock) {
  views.setViewVisibility(R.id.widget_route, android.view.View.GONE);
  // "5:42 pm · Edgewater→Perth" on widget_train_clock
}
```

That diverges from idle and fails in practice:

1. **User looks at the bottom** — idle has route there; live does not.  
2. **Near me** almost always has **LEAVE IN** twin → left column is half width; folded `time · route` **ellipsizes** (`maxLines=1`) and route is clipped.  
3. **Fold gap** — if `trainClock` is empty but `route` is set, compact live hides bottom route and never paints route anywhere.

Snapshot data is fine for both paths (`result.route` from journey or `NearbyPinHelper.formatRoute(pin)`). This is **layout binding**, not missing JSON.

---

## 3. Decision (locked — Tim)

| Topic | Lock |
|-------|------|
| 2×1 **live** route placement | **Bottom bar** `widget_route` — match idle outside-hours face |
| `widget_train_clock` on live 2×1 | **Departure time only** (e.g. `5:42 pm`) — **no** route fold |
| Journey target (live) | Bottom route |
| Near me pin (live) | Bottom route |
| Outside-hours idle | **Unchanged** — already bottom route |
| Medium 3×1+ | **Unchanged** in this brief — already uses bottom route when not folding |
| Route string | Full `Station → Direction` via `formatWidgetRouteLine` / `compactRouteLine` as today for narrow width |
| Empty route | Hide `widget_route` (no placeholder) |

**Revert** compact-live **route fold** — the class comment on `bindLiveFace` (“Station → Direction on the bottom”) was correct; fold was a regression for Tim’s expectation.

---

## 4. Target layout (2×1 live)

```
┌─────────────────────────────┐
│ TARGET TRAIN    LEAVE IN    │
│ 11 min              4 min  │
│ 5:42 pm                     │
│         (spacer)            │
│    Edgewater → Perth        │  ← widget_route (bottom, centered)
└─────────────────────────────┘
```

Idle face unchanged (primary = preferred clock or window; `trainClock` = day word; route bottom).

---

## 5. Implementation

### 5.1 `WidgetUiBuilder.bindLiveFace`

For `isCompactLiveFace(size)` (default 2×1):

1. **Remove** `foldRouteIntoClock` branch (or force `foldRouteIntoClock = false` on compact).  
2. **Always** paint route via the existing `showRouteAtBottom` / `widget_route` path (same as non-compact short cells).  
3. Keep `widget_train_clock` = `trainClock` only (set in `build()` before `bindLiveFace` — do not overwrite with folded string).  
4. **Fallback:** if `trainClock` is empty and `routeLine` is non-empty, still show bottom route.

### 5.2 `restoreLiveLayoutChrome`

Compact live currently sets `widget_bottom_spacer` **GONE**. For bottom route to sit on the true bottom edge (like idle), use the same chrome as idle or short non-compact live:

- Option A (preferred): on compact live **with route**, use **invisible weighted spacer** (`widget_bottom_spacer` `INVISIBLE`, `layout_weight=1`) to push route down — matches `widget_small.xml` comment.  
- Option B: keep TOP gravity if route reads fine in device QA — ship A if route floats too high.

Align with `bindOutsideHoursIdleLayoutChrome` (spacer GONE, content CENTER) only if vertical centering is desired for live; Tim asked for **bottom** route, so prefer **spacer pushes route down**.

### 5.3 Snapshot / data (no change expected)

Verify only — no new fields:

| Source | `route` / `stationLabel` |
|--------|--------------------------|
| `CommuteScheduleSnapshot.buildLiveSnapshot` | `result.route`, `stationLabel` |
| `WidgetPinResolver.loadNearbyPinResult` | `NearbyPinHelper.formatRoute(pin)` |
| `WidgetUiBuilder.resolveRouteLine` | `route` then `stationLabel` fallback |

### 5.4 Files

| File | Change |
|------|--------|
| `WidgetUiBuilder.java` | `bindLiveFace`, possibly `restoreLiveLayoutChrome` |
| `WidgetUiBuilderRobolectricTest.java` | Update live 2×1 expectations |
| `WidgetUiBuilderTest.java` | Any pure helpers if fold removed |
| `docs/widget-homescreen.md` | Note live 2×1 route on bottom |
| `docs/feature-backlog.md` | FB-43 Phase 1.5 note |

---

## 6. Tests

### 6.1 Update `small2x1_liveFace_showsPrimaryLeaveAndRouteAtBottom`

**Before:**

- `widget_train_clock` = `"5:42 pm · Warwick Stn→Perth"`  
- `widget_route` = `GONE`

**After:**

- `widget_train_clock` = `"5:42 pm"`  
- `widget_route` = `VISIBLE`, contains `Warwick` / `Perth`

### 6.2 Add `small2x1_liveNearbyPin_showsRouteAtBottom`

Fixture snapshot: `label` = `Pinned train`, `route` = `Edgewater → Perth`, `secondary` = leave armed, `trainClock` = `15:30`.

Assert bottom route visible; clock line time-only.

### 6.3 Add `small2x1_liveFace_emptyClockStillShowsRoute`

`trainClock` = `""`, `route` = `Edgewater → Perth` → `widget_route` visible (regression for fold gap).

### 6.4 Run

```bash
cd android && .\gradlew.bat :app:testDebugUnitTest --tests "com.tdrevans.nexttrain.WidgetUiBuilderRobolectricTest" --tests "com.tdrevans.nexttrain.WidgetUiBuilderTest"
```

---

## 7. Manual QA (Tim)

1. **2×1 live journey target** (in window, leave armed) — bottom shows `Edgewater → Perth`; clock = departure time only.  
2. **2×1 Near me pin** — same bottom route; not clipped by leave twin.  
3. **2×1 outside-hours idle** (Saturday → Monday) — unchanged.  
4. **3×1** — no regression; route still visible.  
5. Long station names — ellipsize on **bottom** route line only, not on clock.

---

## 8. Non-goals

- Changing route abbreviation rules for medium widgets.  
- Second line for destination-only on 2×1 (keep full route or existing `compactRouteLine`).  
- Web / app hero route (widget only).  
- Brief 2 Active hours work.

---

## 9. Acceptance checklist

- [ ] Live 2×1 journey + nearby pin show route on **bottom** `widget_route`.  
- [ ] `widget_train_clock` is **time-only** on live 2×1 (no ` · route` fold).  
- [ ] Empty `trainClock` + non-empty `route` still shows bottom route.  
- [ ] Idle outside-hours face unchanged.  
- [ ] Robolectric tests updated and green.  
- [ ] Device verified on SM-S926B (or Tim’s phone) for pinned Near me.

---

## 10. FB-43 note

Phase 1 shipped “route fold” for space. **Phase 1.5** (this brief) restores **bottom route parity** between idle target and live faces. Phase 2 (3×1 / 2×2 screenshots) remains separate.
