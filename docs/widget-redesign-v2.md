# Widget redesign v2 — stickiness without brand-killing staleness

**For:** Tim (product) / Simon (design) / Jim (implement after Tim locks)  
**Date:** 2026-08-10  
**Status:** Design locked (W-01–W-04) — Phase A ready to code: `docs/jim-brief-widget-phase-a-trust.md`  
**Context:** Widget is stickiness #1 and likely the strongest revenue lever. It’s also the surface that most often looks broken (Updating…, Tap app / —, app shows 14 min while widget shows dash). This doc is a top-to-bottom rethink: what widgets can do, what Next Train should do, and how we never ship a glance that lies.

**Related:** `docs/widget-homescreen.md` (v1 shipped), `docs/stickiness-ideas.md`, post-departure / stuck-updating / empty-leave / outside-hours briefs

---

## 0. Executive take

**Keep fighting for the widget.** Glanceable leave-by on the home screen is the habit loop. Abandoning it to “just use the app” throws away the highest-leverage stickiness surface.

**But change the contract.** Today we try to be a live countdown clock with periodic network and clever local paint. When that fails, we show states that look like a dead product (**—** + **Tap app**). Users compare that to the open app’s fresh 14 min and lose trust.

**New contract (proposed):**

> The widget always shows **the best honest answer we can stand behind right now** — never a fake countdown, never a silent lie, never a dead dash without a recovery path that actually works.

Concretely:

1. **Prefer last-known-good times** over empty/Tap-app dashes whenever the clock math is still valid.  
2. **Self-heal aggressively** after departure and on unlock / resume / tap.  
3. **One truth pipeline** with the app where possible (shared station + departure identity).  
4. **Honest degraded modes** that still look like Next Train, not a broken tile.  
5. **Fix deep links** so tap always lands in the right mode.

---

## 1. Why the widget matters (and why it hurts)

### Stickiness / revenue

| Surface | Why it retains |
|---------|----------------|
| Widget | Zero-friction glance before walking out — habit without opening the app |
| Leave reminders | Interruptive; high value if correct; easy to mute |
| App open | High intent, lower frequency |

Widget wins when it’s **correct at a glance**. It loses when it’s **wrong or dead** — users remove it and D7 dies.

### Why it’s hard (platform truth)

Android home-screen widgets are not mini-apps:

| Constraint | Implication for us |
|------------|-------------------|
| **RemoteViews only** | No WebView, no rich custom drawing, limited layout |
| **No reliable 1s refresh** | Minute-level local paint is the best we get near leave |
| **Doze / OEM battery** | Exact alarms slip; 15‑min ticks miss; overnight sleep kills freshness |
| **Separate process from WebView** | Settings must sync via Capacitor; widget can’t see live JS state |
| **Network optional** | API can fail while user is on Wi‑Fi in the app (different path/timing) |

So “always as fresh as the open app” is **not** a free goal — we design for **trust under constraint**.

---

## 2. Capability map — what widgets can / should do

### Generally useful widget jobs (industry)

| Job | Example | Fit for Next Train |
|-----|---------|-------------------|
| **Status glance** | Weather now, battery | **Core** — next train + leave-by |
| **Countdown / timer** | Meeting in 12m | **Core** — but only if we can keep it honest |
| **Quick action** | Tap to open / play | **Core** — open correct mode |
| **Multi-instance** | One per account/city | Later — one smart journey first |
| **Configurable face** | Themes, density | Later |
| **Interactive lists** | Inbox rows | Poor fit (RemoteViews + our data) |
| **Live GPS board** | Nearby map | **Avoid in widget** — use idle → app |

### Next Train — proposed capability tiers

| Tier | In widget | Not in widget |
|------|-----------|---------------|
| **Must** | Next train mins + clock; leave-by when buffer on; station; correct tap target; honest freshness | Editing journeys; ads; Then list; full Nearby board |
| **Should** | Post-departure auto-advance without human tap; unlock/resume heal; medium Updated line | Second-by-second tick |
| **Could** | Delay crumb on medium; dual journey pins later | In-widget station search |
| **Won’t (v2)** | Live GPS nearest board; swipe trains; preferred-train reminder UI | — |

---

## 3. Diagnosis — how we got to “Tap app / — / Warwick”

### What that screenshot meant

| UI | Code meaning |
|----|----------------|
| **NEXT TRAIN** + teal **—** | `applyStaleRefreshState` — primary forced to `"—"` |
| **Tap app** | Compact **Tap to refresh** |
| **Warwick** | Cached station label kept |

Entered when: cached departure passed → **Updating…** waiting on network → **≥3 min** without success → abandon countdown and ask for a tap.

Meanwhile the **app** fetched live Near me / journey times (14 min). Two pipelines, two ages, one brand.

### Root causes (stack ranked)

1. **Post-departure gap** — After a train leaves, local cache may not have a “following” trip; we enter Updating and hope network + alarms fire.  
2. **OEM / Doze** — Departure-advance and 15‑min alarms can slip; unlock helps but isn’t enough if user never unlocks.  
3. **Death spiral UI** — We replace a still-useful last train (or blank) with **—** / Tap app, which looks more broken than showing **last good + stale badge**.  
4. **Tap may not heal** — Near me idle uses `nexttrain://nearby` but deep-link helper is journey-only → tap can open app without fixing mode or triggering the right refresh.  
5. **App ≠ widget clock** — WebView live fetch vs native snapshot; disagreement is inevitable unless we share identity + heal on open.

### Brand risk

Staleness isn’t just “wrong number.” It’s:

- **Silent wrong** (NOW forever) — worst; we partly fixed  
- **Loud dead** (— / Tap app) — still brand-killing  
- **Quiet drift** (widget 16 min, app 14 min) — tolerable for a minute; toxic if hours  

**Principle:** Prefer **loud honesty with a working recovery** over **dead chrome**. Prefer **last-known-good with “may be out of date”** over **empty dash** when clock math still applies.

---

## 4. Redesign — product principles

### P1 — Never lie about the next train

| Situation | Show | Never show |
|-----------|------|------------|
| Valid cached departure in the future | Live `N min` + clock | — |
| Departure just passed, following in cache | Promote following immediately | Stuck NOW on old clock |
| Departure passed, no following, network in flight | Keep **last primary crossed out?** or **Updating…** max **60–90s**, then degrade | Updating… for 3+ minutes |
| Network failed, last departure still in future | Keep times + **stale** on medium | Clear to — |
| Network failed, departure past, no following | **Open app for next train** (actionable) + station — **or** show last clock with **Ended** — pick one | Silent — with no action |

**Proposed change to today’s Tap-app state:**  
Don’t clear primary to **—**. Either:

- **A (lean):** Keep last train clock + **NEXT** label → **Open app** as secondary (still actionable), or  
- **B:** Primary **Next?** / **Open** short word; secondary **Tap for times**; station stays.

Tim to lock A vs B; Simon lean **A** if last clock < ~20 min past, else **B**.

### P2 — Self-heal before the user notices

| Trigger | Action |
|---------|--------|
| Departure minute boundary | Local promote following **or** start network refresh **immediately** (already mostly true) |
| Updating > **90s** (tighten from 3 min) | Retry network once; if fail → degraded honest state |
| **USER_PRESENT** / boot | Network refresh (keep) |
| **App resume** | Refresh widget snapshot (keep) + push same result identity to prefs |
| **Widget tap** | Always `refreshAll` **and** open correct deep link (journey or nearby) |
| Periodic | Keep ~15 min; add **opportunistic** refresh when local paint runs and age > N min |

### P3 — One journey identity in-hours; Near me idle out-of-hours

Keep locked outside-hours behaviour. Strengthen:

- In-hours commute widget must use **same station + direction** as the journey the app would auto-select.  
- Out-of-hours: **NEAR ME** idle is fine — but tap **must** open Near me (fix deep link).  
- Do **not** show commute **—** while user is looking at live Near me for the same station — if outside hours, widget should already be Near me idle, not a dead commute tile.

### P4 — Freshness is a feature on medium; silence on small

Keep: **no Updated on 2×1**; station wins.  
Medium: full **Updated …** + stale warning.  
Small degraded: action copy (**Open app**) beats freshness crumb.

### P5 — Layout hierarchy (keep what works)

Locked v1 layout still right:

```
NEXT TRAIN          Leave in / Leave now   (or empty)
  14  min           Warwick
  08:42
```

Dual-size primary stays. Leave hide after 1‑min grace stays. Station over Updated on 2×1 stays.

---

## 5. Target experience (happy path day)

### Morning commute (in Active hours)

1. Unlock phone → widget already shows **14 min · 07:42 · Leave in 6m · Edgewater**.  
2. Walk to station; local paint ticks minutes.  
3. Leave now → urgency on leave line.  
4. Train departs → **within one minute** next train appears (following cache or network).  
5. User never sees Tap app.

### Midday (outside hours)

1. Widget shows **designed idle / next commute preview** (e.g. tomorrow’s window or preferred time + route) — not a live digit.  
2. Tap → Near me in the app.  
3. Live countdown only returns when Active hours start.  
3. No fake commute countdown.

### Failure day (API down)

1. Widget keeps last good times with medium **Times may be out of date**.  
2. If departure passed with no following: **Open app** + station — not a teal dash.  
3. Reminder notifications still use their own scheduler (don’t depend on widget paint).

---

## 6. Architecture changes (for Jim, after lock)

### 6.1 Snapshot policy rewrite

| Today | Proposed |
|-------|----------|
| Updating 3 min → primary `—` + Tap to refresh | Updating **90s** → retry → degraded state **without clearing useful clock** when possible |
| Tap to refresh compact → Tap app | Copy: **Open app** (clearer) |
| Stale trust 120 min | Keep 120 for “show last times”; tighten *retry* cadence |

### 6.2 Following-train reliability

- On every successful network fetch, always store **at least one following** departure when API returns upcoming[].  
- If upcoming is thin, **prefetch next** on a short alarm 2–3 min before current departure.  
- Goal: local promote succeeds **most** weekday mornings without network at the exact departure minute.

### 6.3 Deep link + tap heal

| Intent | Required behaviour |
|--------|-------------------|
| `nexttrain://journey/{id}` | Open that journey (keep) |
| `nexttrain://nearby` | **Fix** Manifest + `DeepLinkHelper` + JS consume → enter Near me |
| Any widget tap | `refreshAll` before/while opening |

### 6.4 Align app open with widget

On app resume / widget tap open:

1. Native refresh completes.  
2. Web reads settings + optional “last widget snapshot” for station hint.  
3. Near me cache-last-station brief complements this (paint times before GPS).

### 6.5 Observability (lightweight)

Debug-only or QA menu (optional): last refresh age, last error, updatingSince — so Tim can see *why* without logcat. Not user-facing.

---

## 7. State machine (target)

```text
                    ┌──────────────┐
                    │  Empty setup │
                    └──────┬───────┘
                           │ has journeys
              ┌────────────┴────────────┐
              ▼                         ▼
     In Active hours?                 No
              │                         │
              ▼                         ▼
        ┌─────────┐              ┌─────────────┐
        │  LIVE   │◄──refresh───│ NEAR ME idle │
        └────┬────┘              └─────────────┘
             │ departure passed
             ▼
        ┌─────────┐   following?
        │ ADVANCE │────yes──► LIVE (next)
        └────┬────┘
             │ no following
             ▼
        ┌─────────┐  success     ┌──────┐
        │ FETCHING│─────────────►│ LIVE │
        └────┬────┘              └──────┘
             │ fail / timeout
             ▼
        ┌──────────────────┐
        │ DEGRADED         │  last clock if useful + Open app
        │ (never bare —)   │  OR Near me idle if outside hours
        └──────────────────┘
```

---

## 8. Copy dictionary (proposed)

| State | Label | Primary | Secondary (2×1) | Station |
|-------|-------|---------|-----------------|---------|
| Live | NEXT TRAIN | `14` + `min` | Leave in / Leave now / empty | Yes |
| Fetching next | NEXT TRAIN | `…` | Fetching… | Yes |
| Degraded | NEXT TRAIN | last clock (&lt;20m past) or **Open** | **Open app** | Yes |
| Near me idle | NEAR ME | Near me | See trains near you | Optional |
| Empty | NEXT TRAIN | Tap to add journey | — | — |

**Open app** replaces **Tap app** / Tap to refresh.

---

## 9. What we keep from v1 (don’t thrash)

- Train-first hierarchy + teal on train / urgency on leave  
- 2×1 default; medium gets Updated  
- Station over Updated on small  
- Leave hide after 1‑min grace (no Leave N min ago)  
- Outside hours → Near me idle  
- Dual-size primary digits  
- Pin-first help + already-have dialog  
- Shared `CommuteSchedule` with reminders  

---

## 10. Phased delivery (suggested)

### Phase A — Stop the bleeding (P0 / P1)

1. Fix `nexttrain://nearby` deep link end-to-end.  
2. Replace **— / Tap app** with **degraded** state (keep station + actionable Open app; don’t blank primary when a clock still exists).  
3. Tighten Updating timeout **3 min → 90s** + one retry.  
4. Widget tap always triggers `refreshAll`.

### Phase B — Advance reliability (P1)

5. **Wall-clock minute alignment:** phone clock + **X min** = train clock; local paint every minute whenever a live countdown is shown (not only ≤60 min).  
6. Strengthen following-train cache + pre-departure prefetch.  
7. Opportunistic refresh on local paint when age > threshold.  
8. QA script / manual matrix: departure boundary, minute-roll, emulator + Doze.

### Phase C — Trust polish (P2)

8. Medium stale copy pass.  
9. Optional debug freshness line for Tim’s builds.  
10. Revisit dual-instance journeys only after A/B stable.

---

## 11. Success metrics

| Signal | Target |
|--------|--------|
| Widget still pinned D7 (among pin-ers) | Rising |
| Tap-through that lands correct mode | ~100% in QA |
| Time spent in Updating / Tap-app states during commute window | Near zero on happy path |
| Support / Tim screenshots of — + Tap app | Cease |
| Journey-saver D7 | Widget cohort ≥ non-widget (directional) |

---

## 12. Locks (Tim — 2026-08-10)

| ID | Question | Decision |
|----|----------|----------|
| **W-01** | Degraded primary | **A/B hybrid:** keep **last train clock** if &lt;20 min past departure; else short **Open**. Secondary **Open app** (never bare **—** / Tap app). |
| **W-02** | Updating timeout | **90s** + one retry, then degraded |
| **W-03** | Outside hours | **Designed idle / next commute preview** (settings only). Not live all-day Near me. Brief: `docs/jim-brief-widget-designed-idle.md` |
| **W-04** | Live Near me on widget | **Not now** — live digits only in Active hours (commute face). All-day Near me brief superseded. |
| **W-05** | Countdown vs phone clock | **Align** when showing a live commute countdown (in-hours) |

Phase A–C shipped.  
**Next P1:** `docs/jim-brief-widget-designed-idle.md` (supersedes `docs/jim-brief-widget-nearby-live-cache.md`).  
**P2 backup:** `docs/jim-brief-commute-strip-notification.md`.

---

## 13. Summary

The widget is annoying because we treated it like a fragile live clock and punished failure with a dead tile. It’s still the right stickiness bet.

**Redesign in one line:** always show an honest, recoverable glance — advance trains without waiting on luck; heal on unlock/tap; fix Near me deep links; never replace a usable commute face with a teal dash and “Tap app.”

**Next:** Jim implements A → B → C (all briefed in `docs/jim-prompt-latest.md`).
