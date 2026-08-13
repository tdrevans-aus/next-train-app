# Jim brief: Target train as master (journey detail)

**For:** Jim / Tim  
**From:** Simon + Tim (product lock 13 Aug 2026)  
**Status:** Implement now  
**Related:** `docs/jim-brief-reminders-nuclear-ia.md`, `docs/jim-brief-preferred-always-visible.md`

---

## 1. Decision

**Target train** is the master gate for leave-by + reminders.

| Target train | Time to station | Remind me | Live countdown |
|---|---|---|---|
| **Off** | Hidden / off (`useLeaveBefore: false`) | Hidden / off | Hidden / off |
| **On** | Slider shown (always on with Target) | Shown | Shown |

No separate **Time to station** checkbox. Walk buffer is a slider nested under Target.

If there is no target train, there is **no** leave-by, **no** reminders, **no** Live countdown.

---

## 2. Layout (journey detail)

```
Name
Route
Active days
Active from / until   ← journey schedule (moved up)

☐ Target train   [ 7:30 ]
   Time to station  — slider —
   ☐ Remind me
   ☐ Live countdown
```

Hints / outside-active-hours stay near Active hours or Target as today.

---

## 3. Storage (keep field names)

| UI | Persist |
|---|---|
| Target master **on** + time | `preferredTrainTime`, `useLeaveBefore: true`, `leaveBeforeMinutes` |
| Target master **off** | `preferredTrainTime: ""`, `useLeaveBefore: false`, `remindMe: false` (keep `leaveBeforeMinutes` for re-enable) |
| Remind me / Live countdown | unchanged (`remindMe`, `commuteStripEnabled`) |

Legacy: journey with `useLeaveBefore` but empty preferred → treat Target **off** on load (or prompt on Save). Do not invent leave-by without a target.

---

## 4. Acceptance

1. Active days + Active hours sit above Target (after Route).  
2. No Time to station checkbox; slider only when Target is on.  
3. Target off → nest hidden; Save clears leave/remind for that journey.  
4. Target on + empty time → Save blocked (“Choose your target train”).  
5. Remind me / Live countdown only visible when Target is on.  
6. Wizard + Help use Target / reminders wording (no “Leave alerts”).  
7. Templates still seed Target + walk buffer + Remind me on.

---

## 5. Non-goals

- Changing native scheduler math beyond existing `useLeaveBefore` / preferred gates  
- Bringing back Early Reminder  
- Leave-by for “next train” with no target  
