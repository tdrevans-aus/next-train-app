# Jim brief: Leave By gated to target / chosen train (U-11 B + U-12 option 1)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Locks:** **U-11 B** (true next + gated Leave By); **U-12 option 1** (app matches widget — **no** “Catch this train”)  
**Copy:** User-facing **Target train** / **Target** — see `docs/jim-brief-preferred-always-visible.md` §3 (rename Preferred → Target). Storage may stay `preferredTrainTime`.  
**Related:** Widget partially shipped (true next, `leaveByArmed`, medium hint). App still uses `applyPreferredOrLaterFilter` + always shows Leave By.  
**Out of scope:** Catch this train; Option C; Near me leave redesign; Target vs Active hours validation (not for v1)

---

## 1. Product rule (one sentence)

**Next Train** always shows the **true next** departure for the active journey. **Leave By** appears only when that departure is the rider’s **target** train (or later in-window), **or** they have **chosen** a train via swipe / Next / Earlier on the hero.

---

## 2. Behaviour matrix (journey mode, Active hours)

| Situation | Hero (Next Train) | Leave By card |
|-----------|-------------------|---------------|
| No target set | Soonest upcoming | **Show** (today) |
| Target set, soonest **before** target, `skipTrains === 0` | That soonest train | **Hide** |
| Target set, hero train **at/after** target (still in Active until when set) | That train | **Show** |
| User swiped / Next / Earlier (`skipTrains !== 0`) | The chosen upcoming trip | **Show** for that trip |
| Target already gone / only later trains left | True next among remaining | **Show** |
| **No Active window** (from/until empty) but journey open | True next | Target gate still applies if Target set; else soonest — see `jim-brief-preferred-always-visible.md` §2.2 |
| Near me | Unchanged | Unchanged |
| Outside hours idle | See preferred-always-visible §2.2 / §3 | — |

**Do not** invent a Catch this train control. Choosing = existing swipe / cue buttons only.

---

## 3. App (`public/app.js`) — required

### 3.1 Stop preferred-or-later filtering on the live face

- Remove `applyPreferredOrLaterFilter` from `prepareDisplayData` / fetch so `upcoming` / `next` are **true next**.  
- Keep or mirror “at/after target” helpers for Leave By gating (`tripMatchesPreferredOrLater` equivalent).  
- Skip / Then / swipe on the **unfiltered** list.

### 3.2 Gate Leave By

```text
showLeaveCard =
  journeyUsesLeaveBefore(journey)
  && !leaveAcknowledged
  && leaveByArmedForDisplayedTrip(next, journey, skipTrains)
```

Armed when: no target time, **or** `skipTrains !== 0`, **or** trip is at/after target (horizon = Active until when applicable).

### 3.3 Target orientation (app)

When Leave By is hidden for an earlier-than-target train, quiet muted line: **Target 7:30** (same clock style as journey field).

Hide that line when Leave By shows.

### 3.4 Reset

Normal skip / journey change resets gate via existing `skipTrains` — no extra “catch” flag.

---

## 4. Widget (Android)

**Live (already / finish):**

- True next selection  
- `leaveByArmed` clears leave twin when gated  
- Medium hint: **Target 7:30** (not “Preferred …”)

**Idle (copy lock with U-13):**

- When primary is the target clock → label **TARGET TRAIN** (not **NEXT JOURNEY**)  
- When no target and showing Active window range → do **not** use Target Train; keep a window/journey idle label  

---

## 5. Explicit non-goals

- No Catch this train  
- No return to FB-06 preferred-or-later as hero  
- Scheduler still uses stored target time field (same math)

---

## 6. Acceptance

| Check | Pass |
|-------|------|
| Target 7:30, earlier train, no swipe | Next Train = earlier; **no** Leave By |
| Medium widget | **Target 7:30** hint |
| Idle with target clock | Label **TARGET TRAIN** |
| Swipe Next | Leave By for chosen train |
| No target | Leave By on soonest |
| No user-facing “Preferred” on these surfaces | Yes |

---

## 7. After changes

`npm run cap:sync` + debug APK. Do **with** `docs/jim-brief-preferred-always-visible.md` so Target rename stays consistent.
