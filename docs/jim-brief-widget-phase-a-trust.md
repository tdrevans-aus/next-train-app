# Jim brief: Widget Phase A — stop the bleeding (trust)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P0 / P1** → **Implemented** (2026-08-10)  
**Spec hub:** `docs/widget-redesign-v2.md` (locks W-01–W-04 below)  
**Related:** `CommuteSchedule.applyUpdatingState` / `applyStaleRefreshState`, `CommuteRefreshService`, `DeepLinkHelper`, `AndroidManifest`, `WidgetUiBuilder`, `public/widget.js`  
**Out of scope:** Phase B following-prefetch; Phase C debug menu; live Near me board on widget; layout redesign

---

## Locks (Tim — 2026-08-10)

| ID | Decision |
|----|----------|
| **W-01** | Degraded primary: keep **last train clock** if departure &lt; **20 min** past; else short **Open** (not bare **—**). Secondary: **Open app** (replace **Tap app** / Tap to refresh). Station stays. |
| **W-02** | Updating timeout **90s** (was 3 min) + **one** network retry before degraded. |
| **W-03** | Outside hours: keep **Near me idle** (not greyed last commute). |
| **W-04** | No live Near me times on widget in v2 — idle → app only. |

---

## 1. Problem

Widget can show **NEXT TRAIN / — / Tap app / Warwick** while the open app shows live **14 min**. That is `applyStaleRefreshState` after Updating timed out — looks like a broken product and kills stickiness trust.

Phase A stops the bleeding only.

---

## 2. Work items

### A1 — Fix `nexttrain://nearby` end-to-end

Today: widget fires `nexttrain://nearby`; JS can parse it; **`DeepLinkHelper` drops non-`journey` hosts**; Manifest may lack `nearby` intent-filter.

| Change | File |
|--------|------|
| Accept host `nearby` (and keep `journey`) | `DeepLinkHelper.java` |
| Add intent-filter `nexttrain` / `nearby` | `AndroidManifest.xml` |
| Confirm JS `consumeLaunchDeepLink` → `enterNearbyMode` | `public/widget.js` (already has nearby branch — verify) |

Acceptance: tap Near me idle widget → app opens in **Near me**.

### A2 — Degraded state (never bare —)

Replace `applyStaleRefreshState` behaviour:

| Field | New behaviour |
|-------|----------------|
| `primary` | If last `trainClock` / departure still useful (&lt;20 min past): show **clock** (e.g. `20:47`) as primary **or** keep compact countdown only if still ≥0 — **do not** use `"—"`. If &gt;20 min past / no clock: primary **Open** (short). |
| `secondary` | **Open app** (full); compact on 2×1 can stay **Open app** or **Open** — **not** Tap app / Tap to refresh |
| `stationLabel` | Keep |
| `stale` / `updatedLine` | Medium: *Times may be out of date*; small: Updated still hidden |

Update `WidgetUiBuilder.compactLeaveSecondary` mapping (remove Tap app ← Tap to refresh).

Unit tests: no longer expect primary `"—"` + Tap to refresh for this path.

### A3 — Updating timeout 90s + one retry

| Today | Target |
|-------|--------|
| `UPDATING_TIMEOUT_MS = 3 min` | **90_000** ms |
| Fail → degraded | Before degraded: **one** `refreshAll` / fetch retry if not already retried this updating episode (flag on snapshot e.g. `updatingRetried`) |

Still show Updating… / `…` + Fetching… during the wait (compact primary stays).

### A4 — Every widget tap triggers refresh

On widget root PendingIntent / when opening app from widget: ensure **`CommuteRefreshService.refreshAll`** runs (MainActivity onCreate/onNewIntent from widget tap, or paint path). Do not rely only on stale resume.

Acceptance: tap from degraded or live → network refresh attempted.

---

## 3. Acceptance (Phase A)

1. Near me idle tap → app in Near me (not ignored deep link).  
2. No commute tile with primary **—** and **Tap app**.  
3. After failed post-departure fetch: degraded shows clock or **Open** + **Open app** + station.  
4. Updating gives up by ~90s (+ one retry), not ~3 min.  
5. Widget tap triggers refresh.  
6. Unit tests updated (`CommuteScheduleTest`, `WidgetUiBuilderTest`).  
7. Rebuild APK to verify on device.

---

## 4. Summary for Jim

> Widget Phase A (locked W-01–W-04): fix **nearby** deep link; replace **—/Tap app** with degraded **Open app** (keep clock if &lt;20 min past); Updating **90s** + one retry; tap always refreshes. Spec: `docs/widget-redesign-v2.md`.
