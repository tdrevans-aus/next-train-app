# Jim brief: Widget Phase B — advance reliability

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P1** (after Phase A) → **Implemented** (2026-08-10)  
**Depends on:** `docs/jim-brief-widget-phase-a-trust.md`  
**Hub:** `docs/widget-redesign-v2.md` §6.2, §10 Phase B  
**Related:** `CommuteSchedule` following\* cache, `WidgetDepartureAdvanceScheduler`, `WidgetLocalPaintScheduler`, `CommuteRefreshService`  
**Out of scope:** Live Near me board on widget; dual journey instances; Phase C debug UI

---

## 1. Goal

Most weekday departures should **advance to the next train without** hitting Updating → degraded. Reduce dependence on perfect alarm timing + instant network at the departure minute.

**Also (Tim — hard trust):** status-bar clock + widget **X min** must equal the next-train clock face. When the phone minute rolls, **X** must roll with it — not lag until the next network refresh.

---

## 2. Work items

### B0 — Wall-clock minute alignment (Tim P0 inside B)

**Invariant:** for a live commute face showing a numeric primary (`14` / `14 min`) and train clock `HH:MM`:

> `phone wall-clock minute + X ≈ train clock` (same Perth minute faces)

Today the **math** is already wall-clock (`PerthTime.minutesUntilWallClock` / app `minutesUntilPerthWallClock`). The failure is **when we repaint**:

| Gap | Effect |
|-----|--------|
| `needsLocalRepaint` only true within ~**60 min** of leave/departure | Outside that window, **X** only updates on ~15‑min network refresh → phone advances, widget digit stays stale |
| Local-paint alarm delayed (Doze / OEM) | Status bar already `:43`, widget still shows minutes for `:42` |
| Paint chain breaks after one tick | Digit freezes mid-commute |

**Do:**

1. **Schedule minute-boundary local paint whenever** the widget is showing a **live numeric countdown** (or leave-by line that depends on minutes) — **not** only inside the 60‑min window. Keep skipping empty / Near me idle / pure degraded-without-clock if there’s nothing to tick.  
2. Every successful local paint / `repaintFromCache` that still needs ticks **must re-schedule** the next `PerthTime.nextMinuteBoundaryMs()` (chain must not die).  
3. Keep using **wall-clock minutes** (ignore seconds) for primary / leave secondary — do **not** switch back to `Math.round(ms)`.  
4. On unlock / screen-on / widget tap refresh paths: **repaint from cache immediately** (already partly true) so a missed alarm heals as soon as the user looks.  
5. Do **not** use `setAlarmClock` just for this (status-bar alarm icon). Prefer `setExactAndAllowWhileIdle` at the boundary; document Doze limits in TESTING.

**Acceptance:**

- Phone shows `8:43`, train clock `8:56` → primary **`13`** (not 14 left over from 8:42).  
- Same check with train **90+ min** out: digit still drops each status-bar minute (or at worst recovers on unlock within one glance).  
- Unit tests: wall-clock diff cases; `needsLocalRepaint` true for far-but-live countdowns.

### B1 — Strengthen following-train cache

On every successful network fetch that builds a live snapshot:

- Always persist **at least one** following departure when `upcoming[]` has a later trip (existing following\* fields — verify they’re filled whenever possible).  
- If only one upcoming trip exists, following may be empty — that’s OK; B2 helps.

Acceptance: after a normal multi-train payload, local promote after departure does **not** need network for the immediate next train.

### B2 — Pre-departure prefetch

When live snapshot has a departure within **~2–3 minutes** and following is missing or thin:

- Schedule / trigger a **network refresh** so following is warm before the minute rolls.  
- Reuse existing schedulers if possible (departure advance, local paint + refresh) — don’t invent a fourth alarm family unless needed.

Acceptance: thin morning boards still usually have following ready by departure.

### B3 — Opportunistic refresh on local paint

When `repaintFromCache` / local paint runs:

- If `refreshedAtMs` age &gt; threshold (lean: **10–15 min**) **and** widget is showing live commute (not empty / not Near me idle) → also kick `refreshAll` (debounced; don’t storm).  
- Keep existing `needsNetworkRefresh` when departure passed.

Acceptance: commuting with phone unlocked, widget doesn’t sit on 20‑min-old network data until the 15‑min wall clock alone.

### B4 — QA matrix

Document / automate what you can:

| Case | Expect |
|------|--------|
| Departure boundary, following in cache, airplane briefly | Promote locally → live next |
| Departure boundary, no following, network OK | Fetching → live next within ~90s (Phase A) |
| Emulator idle / Doze through departure | Unlock or opportunistic path recovers |
| Outside hours | Near me idle unchanged |
| Status bar rolls; live face | **X** matches wall-clock + train clock (B0) |

Add or extend unit tests where pure (following promote, age gate, `needsLocalRepaint` for far countdown, wall-clock mins). Manual notes in TESTING.md for Doze + minute roll.

---

## 3. Summary for Jim

> Phase B (after A): **B0 wall-clock minute alignment** (digit rolls with phone clock), harden **following** cache, **pre-departure prefetch**, **opportunistic refresh** on local paint when stale, plus departure/Doze QA. Hub: `docs/widget-redesign-v2.md`.
