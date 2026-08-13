# v8 overnight report — for Tim (morning)

**Branch:** `cursor/v8-overnight`  
**Version:** `2.1.1` / **versionCode 8**  
**Date:** 2026-08-13 (overnight)

---

## 1) Pro wired (FB-13)

- Re-enabled Menu **Try Pro free** for `free_no_trial`.
- Click path: close Menu → `setTimeout(0)` → widget help sheet (same trial-start path as Add widget).
- Copy stays trial-focused (`30 days · widget + no ads · then one-time`), not “full widget”.

**Please verify on device:** Menu → Try Pro free opens Add widget sheet.

---

## 2) Target train — options (FB-12)

Today’s rule remains **first live train at or after** the target clock.

| Option | Behaviour | Status |
|--------|-----------|--------|
| **A. At-or-after + gap warn** | Keep current pick; if next armed train is ≥ **25 min** after target, live hint becomes `Target 7:00 · next is 40 min later` | **Shipped in v8** |
| **B. Nearest to target** | Pick min \|departure − target\| (may arm an *earlier* train) | Not shipped — say if you want this |
| **C. Confirm train** | Sheet: “Arm reminders for 7:40?” with alternate | Not shipped — best if surprises are unacceptable |

Recommendation stays **A** unless you want earlier trains included (B) or explicit confirm (C).

---

## 3) Other v8 backlog done

| Item | What shipped |
|------|----------------|
| **FB-07** direction process | Heuristic + Perth line map; Butler + Fremantle←Claremont groups |
| Late-night **Location needed** mislabel | Board/API failures → hero **Times unavailable**; empty overnight board → **No upcoming trains** (not location) |
| Timetable when live empty | Directions: static line map; times: Transperth **GTFS rail** fallback (soft-fail / 12s timeout) |
| Version | Bumped to **8 / 2.1.1** |

Still backlog (not overnight): FB-01 theme, FB-02/03 other cities, FB-09/10 Play mapping/symbols, Target options B/C.

---

## 4) Location vs times (your late-night observation)

Confirmed: empty LiveTimes overnight was still painting hero **Location needed**.

Fix:
- `nearbyErrorKind` + classify board vs location
- Empty directions/trips with known station → quiet board, not error shell

---

## 5) Timetable / journey setup overnight

1. **`/api/directions`** (and destinations): if live destinations empty → **static line-map directions** (`source: static-line-map`).
2. **`/api/next-train`**: if live upcoming empty → try **GTFS static rail** (`scheduleSource: gtfs-static`, trips marked Scheduled). Soft-fails (12s timeout) to empty board with correct “no trains” UI — not a location error. Client Near me already calls this API.
3. Browser bundle stays live-only (GTFS is server-side so Capacitor assets stay small).

---

## 6) Perth rail map + world heuristic

- Full station/line audit: `lib/cities/perth/line-map.json` (7 lines, short-turn groups, coverage gaps).
- City-agnostic ruleset: `docs/direction-collapse-heuristic.md` + `lib/direction-collapse-heuristic.js` (R1–R4).
- Shipped groups now match Tim-approved brief: **Yanchep←Whitfords/Clarkson/Butler**, **Mandurah←Cockburn**, **Fremantle←Claremont**.
- Gaps noted: Ellenbrook line stations, Alkimos/Eglinton, Byford naming — not in `stations.json` yet.

QA: `node qa/perth-static-directions.mjs`, `node qa/yanchep-whitfords-direction.mjs`.

---

## Suggested morning smoke

1. Force-stop → open app overnight / quiet hours: hero should **not** say Location needed if station is known.
2. Menu → Try Pro free → widget sheet.
3. New Custom journey at quiet hours: direction list populated.
4. Journey with target 7:00 when next is 7:40: gap warn on live board.
5. Upload Play **versionCode 8** when happy (v7 already shipped).

Good night leftovers handled — ping if you want Option B/C or Ellenbrook stations added next.
