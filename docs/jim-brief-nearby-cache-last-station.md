# Jim brief: Cache last Near me station → paint times first → refine with GPS

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** **Implemented** (2026-08-10)  
**Related:** `enterNearbyMode`, `locateNearbyInBackground`, `findNearestStation`, `fetchNearbyBoard` (`public/app.js`); `docs/jim-brief-location-wait-ux.md` (Don’t wait / coarse GPS — keep); `docs/nearby-first-onboarding.md`  
**Out of scope:** Favourite-station setting UI; changing Journey-mode cold start; widget Near me idle copy (separate outside-hours brief); undoing parallel direction fetches (already shipped)

---

## 1. Problem

Near me first paint waits on **GPS** before any station or times. Station nearest-math is cheap; train API is secondary. GPS (up to ~15s) is the circle-of-death feel.

Tim: use the **last successful Near me station** so we can show times **before** GPS finishes, then refine.

---

## 2. Decision (locked)

**Cache last Near me station → paint times first → refine with GPS.**

| Step | Behaviour |
|------|-----------|
| 1 | On auto Near me enter (no manual station): if a **cached last station** exists, set `nearbySession.station` immediately and start **`fetchNearbyBoard`** (show *Loading departures…* / board as today). |
| 2 | GPS + nearest lookup still runs in the **background** (same `locateNearbyInBackground` / coarse-first path). |
| 3 | When GPS nearest is ready: if **same** station → update distance crumb only if useful; if **different** → switch station, refetch board, quiet note (see copy). |
| 4 | Persist cache whenever Near me successfully resolves a station (GPS nearest **or** user pick from Don’t wait / picker). |

Do **not** invent a separate “favourite station” preference in this pass.

---

## 3. Cache shape

`localStorage` key e.g. `nextTrainLastNearbyStation` (Jim may name consistently with existing keys):

```json
{
  "station": "Warwick Stn",
  "distanceKm": 0.4,
  "savedAtMs": 1723290000000
}
```

- `station` required (canonical name matching stations list).  
- `distanceKm` optional (last known; may be stale — don’t treat as live until GPS returns).  
- No hard TTL required for v1 (home/work users stay near the same stop). Optional: ignore cache older than **30 days** if easy.

Clear / ignore cache on `?reset=1` / clear-all-data with other prefs.

---

## 4. UI / copy

### First paint with cache

- Route line can show station immediately (e.g. station name; avoid claiming a fake live km until GPS returns — use **Near you · Warwick** or plain **Warwick** without stale km, or *Checking location…* in muted crumb).  
- Hero: load departures for cached station (not *Finding your nearest station…* as the only state).

### First paint **without** cache (first install / cleared)

- Keep today’s locate UX: *Finding your nearest station…* + spinner; **Don’t wait** at ~7s (`jim-brief-location-wait-ux.md`).

### GPS refine when station changes

Quiet, one-line (pick simplest that fits existing crumb patterns):

- *Updated to nearest station*  
  or swap route line to new station without a toast if that’s cleaner.

Do **not** interrupt with a modal.

### Manual pick wins

If user already chose a station via Don’t wait / picker (`nearbyUserPickedStation`), **do not** clobber with GPS nearest (existing rule). Still **write** their pick into the last-station cache.

### Unsupported region

If GPS says >50 km: existing Perth-rail-only empty state. Do **not** keep showing a Perth cached board as if they’re still there once unsupported is confirmed — clear/hide board per existing unsupported behaviour.

---

## 5. Interaction with `findNearestStation`

Today `findNearestStation` short-circuits on in-memory `nearbySession.station`. After optimistic cache paint, that session station is set — GPS must still compute **true** nearest.

Options (pick one, keep simple):

- Pass `{ forceFresh: true }` / skip session short-circuit inside `locateNearbyInBackground`, **or**  
- Separate `resolveNearestFromGps()` used only by the background refine path.

Do not let the optimistic station permanently block GPS refine.

---

## 6. Acceptance

1. Second+ open with cache: departures for last station start **without** waiting for GPS.  
2. GPS later same station → board stays; no jarring reload if data still valid (refetch OK if simpler).  
3. GPS later different station → board switches; user sees new station.  
4. First open / no cache → locate copy + Don’t wait unchanged.  
5. Manual pick not overwritten by late GPS; pick saved to cache.  
6. Clear all data / `?reset=1` clears cache.  
7. `npm run cap:sync` after web changes.

---

## 7. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | Read/write cache; optimistic `enterNearbyMode`; force-fresh GPS refine |
| `TESTING.md` / small QA | Optional: note cold vs cached Near me behaviour |
| `docs/nearby-first-onboarding.md` | One line: cached last station paints first |

---

## 8. Summary for Jim

> Near me P1: persist last station; on open paint that station’s times immediately; GPS refine in background and swap if nearest changed. No favourite-station settings UI. Keep Don’t wait for first-ever / no-cache.
