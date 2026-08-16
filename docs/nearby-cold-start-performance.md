# Near me cold-start performance invariants

**Status:** Active — do not regress during refactors (FB-23 module splits, init reorder, etc.)  
**Related:** `public/app.js` (`init`, `findNearestStation`, `ensureGeoBridge`) · `public/nearby-mode.js` (`enterNearbyMode`) · `docs/nearby-first-onboarding.md`

---

## Problem

Near me felt ~1s slower after some refactors because startup work ran **serially** before the first board paint.

---

## Required behaviour (keep all of these)

### 1. Nearby before deep-link bridge

In `init()`, **do not** `await consumeLaunchDeepLink()` before `applyJourneysMode({ coldStart: true })`.

```javascript
const deepLinkTask = window.nextTrainWidget?.consumeLaunchDeepLink?.();
await applyJourneysMode({ coldStart: true });
await deepLinkTask;
```

Widget / paywall deep links still win after the first paint. Normal cold starts should not wait on the native bridge.

### 2. Preload native geo bridge

On native cold start, kick off geo bundle load in parallel with settings/stations:

```javascript
if (isNativeApp()) {
  void ensureGeoBridge().catch(() => {});
}
```

`enterNearbyMode` must not pay the script load cost on the critical path.

### 3. Parallel GPS + station catalog

`findNearestStation()` must load station coords and GPS **in parallel** (`Promise.all`), not serially.

### 4. Optimistic last-station paint

When `nextTrainLastNearbyStation` exists, paint station (+ cached board if fresh) **immediately**; GPS refine and network refresh run in the background.

Keys: `nextTrainLastNearbyStation` in `localStorage`; board cache max age `LAST_NEARBY_BOARD_MAX_AGE_MS` (15 min) in `nearby-mode.js`.

---

## Not the same thing

| Constant | Purpose |
|----------|---------|
| `ONBOARDING_QUIET_MS` (4000) | Delay before the **first-run coach** appears after the face is ready — not board load time |
| `NEARBY_LOCATE_DONT_WAIT_MS` (7000) | When to offer manual station picker during slow GPS |

Changing onboarding timing does **not** fix Near me load regressions.

---

## QA smoke

- Cold start with location allowed: departures or locating UI within one paint — not a blank hero waiting on deep link.
- Second open same day: cached station/board paints instantly.
- Widget deep link to a commute still switches mode after launch.

---

## History

| Date | Change |
|------|--------|
| 2026-08-13 | v2.1.2 — parallel coords + GPS; optimistic station cache |
| 2026-08-16 | Restored parallel deep link + geo preload after FB-23 init reorder slowed cold start |
