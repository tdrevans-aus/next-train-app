# Jim brief: Widget departure handoff — stale face + prefetch (W-05)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P1** (LB-02 trust; after Phase A security bull run)  
**Triggered by:** Device QA 11 Aug — ~3 min of `…` / **UPDATING** after train departed; fetch eventually recovered to live **N min** + Leave in.  
**Depends on:** `docs/jim-brief-widget-phase-a-trust.md` (W-01–W-04 shipped)  
**Extends:** `docs/jim-brief-widget-phase-b-advance.md` (B1 following cache, B2 prefetch — verify on device)  
**Hub:** `docs/widget-redesign-v2.md` §6.1 row “Departure passed, no following”  
**Related:** `CommuteSchedule.applyUpdatingState`, `finishUpdatingEpisode`, `tryPromoteFollowing`, `WidgetUiBuilder.parseLeaveParts`, `CommuteRefreshService.paintFromCache`  
**Out of scope:** Live Near me board on widget; layout redesign; Phase C debug UI; changing API poll cadence all day

---

## 1. Product rule (one sentence)

When the current train’s departure minute passes, the widget must **never sit on blank dots for minutes** — either **promote the next train instantly** (cache) or show **last honest time + stale styling** while refresh runs, then live or degraded **Open app**.

---

## 2. Locks (Tim — 2026-08-11)

| ID | Decision |
|----|----------|
| **W-05a** | **Visible “Updating…” chrome** capped at **~45s** total per handoff episode (not 90s × 2 on screen). |
| **W-05b** | After that cap (or immediately when following missing): **stale face** — keep **last train clock** or last useful primary; **do not** blank primary to `…` for the whole wait. |
| **W-05c** | **One** network retry per handoff (keep today’s `updatingRetried` / `triggerFetchRetry`); retry may run **while stale face is shown** — no second full-screen Updating episode. |
| **W-05d** | After retry exhausts: existing degrade — **Open app** + *Times may be out of date* (W-01). **Optional:** one quiet background fetch ~60s later (D-lite); **no** all-day polling. |
| **W-05e** | **Prefetch following** (Phase B) is the primary fix; stale face is the fallback when cache is empty or fetch is slow. **Ship both.** |

---

## 3. Problem today

Phase A shortened timeout to **90s + one retry**, but the **on-screen** experience is still:

| Column | While waiting |
|--------|----------------|
| NEXT TRAIN | `…` (from `Updating…` / `compactPrimary`) |
| Right | **UPDATING** `…` (from `Fetching next train…`) |

That can run **twice** (~3 min wall clock) before live or degrade. Tim experience: felt broken; data was fine once fetch completed.

**Root cause split:**

1. **No following in cache** at departure → must network (C gap).  
2. **UI policy** blanks the face during fetch (B gap) even when last clock is still useful.

---

## 4. Target behaviour

### 4.1 Happy path (C — prevent)

| Step | Widget |
|------|--------|
| Live countdown for train A | `14 min` + Leave in + clock |
| Departure minute passes, **following in cache** | **Instant promote** to train B — no Updating, no stale |
| Network refresh | Updates following for C+1 in background |

Verify / harden **Phase B B1 + B2** (`putFollowingCache`, `needsPreDeparturePrefetch`, pre-departure `refreshAll`). If following is still empty on multi-train payloads, fix that first.

### 4.2 Fallback path (B — cushion)

When departure passed and **no promotable following**:

| Phase | Duration | Face |
|-------|----------|------|
| **Optional brief fetch** | **0–45s** max | May show compact **Refreshing…** (leave column or footer) — **or** skip visible Updating entirely (Tim lean: **skip** if stale clock is visible) |
| **Stale while fetching** | Until fetch succeeds or retry exhausts | **Primary:** last `trainClock` (e.g. `13:05`) if &lt;20 min past, else short **Open** / last countdown per W-01. **Stale** styling on medium footer: *Times may be out of date* or *Refreshing…*. **Not** bare `…` / `…` twin. |
| **Background** | During stale face | `triggerFetchRetry` once; `refreshAll` on worker — **do not** flip UI back to full Updating episode |
| **Success** | Fetch returns next train | Live `N min` + **Leave in** (what Tim saw eventually) |
| **Failure** | After retry exhausted | Degraded W-01: clock or **Open** + **Open app** |

### 4.3 What stale face is **not**

- Not pretending the departed train is still “next” without stale labeling.  
- Not showing a **live** countdown for a train that already left (no fake `14 min` for 13:05 departure at 13:06).  
- Prefer **static clock** + stale crumb over animated dots.

---

## 5. Implementation notes

### 5.1 Constants (A inside B)

| Constant | Today | Target |
|----------|-------|--------|
| `UPDATING_TIMEOUT_MS` | 90_000 | Keep for **network / retry timing** **or** split: `UPDATING_VISIBLE_MS = 45_000` vs `FETCH_RETRY_MS = 90_000` |
| Visible Updating episode | 90s + 90s on face | **≤45s** on face, then stale face |

Recommendation: introduce **`STALE_FETCH_VISIBLE_MS = 45_000`** for when to switch from optional brief Updating → **staleWhileFetching** snapshot. Retry logic can still use 90s internally if needed.

### 5.2 New snapshot mode (or branch in `applyUpdatingState`)

Replace long-running `primary = "Updating…"` / `secondary = "Fetching next train…"` with something like:

```text
staleWhileFetching: true
primary: degradedPrimary(cached) or trainClock
secondary: "" or quiet "Refreshing…" (not UPDATING twin)
stale: true
updatedLine: "Refreshing…" or "Times may be out of date"
```

`finishUpdatingEpisode` + `triggerFetchRetry`: keep firing **`refreshAll`**, but **return staleWhileFetching** snapshot, not second Updating face.

`WidgetUiBuilder`: when `staleWhileFetching`, do **not** map secondary to **UPDATING** `…`; hide leave twin or use muted single-line refresh copy.

### 5.3 C — following cache (Phase B alignment)

On every successful `buildLiveSnapshot`:

- `putFollowingCache(snapshot, resolveFollowingTrip(payload, next))` must run when `upcoming[]` has a later trip.  
- **Pre-departure:** when departure within **3 min** and following empty → `needsPreDeparturePrefetch` → `refreshAll` (already wired in `paintFromCache` — confirm on device).

Acceptance: Edgewater morning board with 10-min spacing → after normal refresh, `followingDepartureIso` populated; `tryPromoteFollowing` returns live next **without network** at boundary.

### 5.4 D-lite (optional, after B+C)

After full degrade (`applyStaleRefreshState`):

- Schedule **one** extra `refreshAll` ~60s later if still degraded and journey in Active hours.  
- **Do not** add periodic refresh beyond existing 15 min + opportunistic (Phase B B3) + departure-boundary triggers.

### 5.5 Files (expected touch)

| Area | Files |
|------|--------|
| Handoff / stale logic | `CommuteSchedule.java` |
| Paint / retry | `CommuteRefreshService.java` |
| Face binding | `WidgetUiBuilder.java` |
| Tests | `CommuteScheduleTest.java`, `WidgetUiBuilderTest.java` |
| Manual | `TESTING.md` widget §22 handoff matrix |

---

## 6. Acceptance

| Check | Pass |
|-------|------|
| Departure passes, **following cached** | Live next train **without** Updating / dots |
| Departure passes, **no following**, network slow | Within **~45s**, face shows **clock + stale** (not `…`/`…` for 3 min) |
| Fetch succeeds during stale | Snaps to live **N min** + **Leave in** |
| Fetch fails after retry | Degraded **Open app** + W-01 clock rules |
| Medium widget | User can tell stale (*Refreshing…* / *Times may be out of date*) vs live (**Updated Xm ago**) |
| Right column during stale fetch | **Not** stuck **UPDATING** `…` for minutes |
| Unit tests | Handoff promote, staleWhileFetching, visible timeout ≤45s |
| Device | Tim repro route: Edgewater → Perth handoff no longer “eternity” |

---

## 7. QA script (manual)

1. Journey in Active hours, live widget showing **N min**.  
2. Let departure minute pass (or use test payload / time override).  
3. **With following cached:** next train appears immediately.  
4. **Without following** (clear following fields in snapshot or use thin board): within **45s** see **clock + stale**, not twin dots.  
5. Restore network if off → within one retry, live countdown returns.  
6. Airplane through retry → degrade **Open app**; optional D-lite recovery within ~1 min of network restore.

Add `qa/widget-handoff-stale-face.mjs` only if a deterministic JS-free Android unit path is insufficient (prefer JUnit).

---

## 8. Relation to A / B / C / D (Tim FAQ)

| Option | In this brief? |
|--------|----------------|
| **A** Shorter timeout | **Yes** — 45s visible cap (§5.1) |
| **B** Stale face while fetching | **Yes** — core UX (§4.2, §5.2) |
| **C** Prefetch following | **Yes** — Phase B verify/harden (§4.1, §5.3) |
| **D** Aggressive background refresh | **D-lite only** — one post-degrade retry (§5.4); **no** extra all-day polling |

---

## 9. Summary for Jim

> **W-05:** At departure handoff, **promote following from cache** when possible; otherwise show **stale clock** (not blank Updating) within **~45s**, **one** background retry without a second Updating face, then existing degrade. Fixes LB-02 “eternity” dots. Layer on Phase A degrade + Phase B following prefetch.
