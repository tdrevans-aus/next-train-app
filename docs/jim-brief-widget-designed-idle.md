# Jim brief: Widget outside hours — designed idle / next commute (not live all day)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P1** (supersedes all-day live Near me) → **Implemented** (2026-08-10)  
**Supersedes:** `docs/jim-brief-widget-nearby-live-cache.md` (**stop** that work if in progress)  
**Hub:** `docs/widget-redesign-v2.md` (locks **W-03** / **W-04** revised again)  
**Depends on:** Phase A deep link + degraded honesty; JourneySelector Active hours; preferred train / Active hours fields on journeys  
**Out of scope:** All-day GPS Near me countdown on widget; corridor/home direction heuristics; PiP; dual widgets

---

## 1. Pivot (Tim — 2026-08-10 evening)

**Wrong question:** How do we keep a live next-train glance honest 24/7?  
**Right question:** When the widget isn’t earning its keep, how does it stay **calm and on-brand** instead of looking broken or fake-busy?

At work / midday, a ticking countdown is mostly noise. Fighting staleness all day is expensive for low value. What Tim hated was **Fetching… / — / Tap app** looking dead — not “no live board at 10pm.”

---

## 2. Decision (locked)

| When | Widget face |
|------|-------------|
| **In Active hours** (journey selected) | **Live commute countdown** — current Phase A/B behaviour. Fight staleness / minute alignment / following promote **here**. |
| **Outside Active hours** (journeys configured) | **Designed idle / next commute preview** — **not** a live Near me board. |
| **No journeys configured** | Soft **Near me** tap face (intentional CTA, not a failed load). |

**Do not** poll GPS + nearby boards every 15 min just to feed the widget outside hours.

**Tap outside hours:** `nexttrain://nearby` (or journey list if that’s clearer later — v1 keep **nearby**).

---

## 3. Outside-hours face (designed idle)

### Goal

Look **intentional**, not empty, not Fetching, not a fake live clock.

### Content (pick richest available; fall back down the list)

1. **Next commute preview** (preferred):  
- Label: **NEXT JOURNEY** (textAllCaps from “Next Journey” — signals idle until the next Active-hours commute, not a live countdown).  
- Primary: preferred train clock (**7:30**) or window range if no preferred.  
- Under clock: **Tomorrow** / **Today** / **Tue**.  
- Full-width route under that (**Warwick → Perth**) — not the squeezed right column.
2. If we can’t compute next window cleanly:  
   - Primary: **Morning** / **Evening** / **Weekdays** (from journey windows).  
   - Secondary: route line.  
3. Last resort with journeys:  
   - Primary: **Near me**  
   - Secondary: **See trains near you** — but styled as calm CTA, never after a stuck Updating state.

### Computing “next commute”

From settings journeys (remind days + `defaultFrom`/`defaultUntil` + preferred train if set):

- Find the **next** remind-day window after now (Perth).  
- Prefer showing **preferred train clock** when set (e.g. **7:30**) with route; else window (**6:00–9:00**) or **Leave ~…** only if leave-before is knowable without a live fetch — **v1: preferred time or window is enough; no network required**.

All of this is **static from settings** — no API for the idle face.

### Honesty

- Never show **Updating… / Fetching…** on this face.  
- Never show a minute digit outside Active hours unless Tim re-opens live Near me later.  
- If somehow still in Updating when hours end: **immediately** switch to this idle/preview (fix the outside-hours stuck-Fetching bug path).

### No journeys

- **NEAR ME** / **Near me** / **See trains near you** (or **Tap for trains near you**).  
- Tap → nearby. Not an error state.

---

## 4. In-hours (unchanged priority)

Keep investing reliability **only** while a journey is active:

- Local minute paint (B0)  
- Following promote  
- 90s Updating → degraded Open app  
- Outside-hours transition must clear Updating into designed idle

---

## 5. Implementation sketch

- `JourneySelector.selectJourney == null` + has configured journeys → build **nextCommuteIdleSnapshot** (new), **not** live nearby board, **not** (only) soft Near me if preview data exists.  
- Reuse Perth day/time helpers; unit-test next-window picking (Fri evening → Mon morning, etc.).  
- `buildWidgetSnapshot` / `nearbyFallbackIfOutsideHours`: replace pure Near me idle with preview when possible.  
- Cancel aggressive nearby GPS work for widget-only outside hours if any was started for the superseded brief.  
- Layout: reuse small/medium RemoteViews; don’t add a new widget size.  
- Docs: TESTING outside hours = preview face; in hours = live.

---

## 6. Acceptance

1. Midday with Edgewater↔Perth journeys: widget shows **next commute preview** (day/window or preferred time + route) — **not** live N min, **not** stuck Fetching.  
2. Enter Active hours → live countdown as today.  
3. Leave Active hours → preview/idle within one refresh/paint (no Fetching hang).  
4. No journeys → calm Near me CTA.  
5. Unit tests for next-window selection.  
6. APK for Tim.

---

## 7. Parked (do not build now)

From superseded brief — park unless Tim re-asks:

- All-day cached Near me countdown  
- Journey-direction / toward-home corridor heuristics on the widget  
- GPS every 15 min for widget outside hours  

Backup glance remains: `docs/jim-brief-commute-strip-notification.md` (preferred-train window notification).

---

## 8. Summary for Jim

> **Stop** all-day live Near me on the widget. Outside hours = **designed idle / next commute preview** (settings only, no live digit). Fight staleness **in Active hours only**. Spec: `docs/jim-brief-widget-designed-idle.md`. Supersedes `docs/jim-brief-widget-nearby-live-cache.md`.
