# Jim brief: Target train always on journey detail + rename (U-13)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Why now:** (1) Field drives Leave By / widget / reminders but was buried under Remind me. (2) **Preferred → Target** everywhere in UI — shorter, fits widgets.  
**Related:** `docs/jim-brief-leave-by-preferred-gate.md` (same Target copy); `public/index.html` `#detail-preferred-field`; widget idle label in `CommuteSchedule` / `WidgetUiBuilder`  
**Out of scope:** Preferred-arms-reminder (Option C); renaming storage keys; **hard-blocking** Target vs Active hours; Menu Reminder settings layout; Save confirm modal (hint only unless Tim reopens)

---

## 1. Decisions (locked)

| Topic | Lock |
|-------|------|
| Placement | **Target train** always visible on journey detail — **not** inside Remind me expand |
| Order | Route → **Target train** → Remind me → Timing |
| Naming | User-facing **Preferred** → **Target** / **Target train** (see §3) |
| Storage | Keep `preferredTrainTime` (and native field names) — **UI copy only** unless a rename is trivial and safe |
| Active hours vs Target | **Do not** block Save or force amend. **Do** show a soft inline hint when Target is outside Active from/until (see §2.1) |

---

## 2. Journey detail

```
Name
Route (station + direction)
Target train             [ time / Not set  ✕ ]
  Hint: First train at or after this time.
Remind me                [on/off]
  (when on: permission hint only — no Target nested here)
Timing …
```

| Element | Copy |
|---------|------|
| Label | **Target train** |
| Hint | **First train at or after this time.** |
| Clear | `aria-label`: **Clear target train** |
| Empty display | **Not set** (unchanged) |

**Behaviour:** same as before for preferred — always show field; Remind me on + empty Target → focus + block Save; Remind me off keeps stored value; templates still seed the time.

Wizard Reminder step: don’t imply Target only exists when Reminder is on. Reminder step ≈ toggle + “uses your target train.”

### 2.1 Soft hint — Target outside Active hours

When **Target** is set **and** Active **from** + **until** are both set **and** Target clock is **not** inside that window (inclusive of from/until minutes):

Show a muted inline hint (same visual language as other `settings-section-hint`s):

**Copy:** **Target train is outside Active hours.**

**Where:** Under **Active hours** (preferred — that’s what they just edited) **or** under Target if Active hours aren’t on screen; one place is enough — don’t duplicate.

| Do | Don’t |
|----|--------|
| Show/hide live as from / until / Target change | Block Save |
| Allow Save with hint visible | Modal / “Save anyway?” confirm (v1) |
| Clear hint when Target is empty or back inside the window | Auto-clear or auto-move Target |
| Overnight Active windows: use the same overnight rules the app already uses for Active hours if any; if ambiguous, treat as outside and show hint | Invent a new overnight model |

Empty Active from or until → **no** “outside hours” mismatch hint (incomplete window). See §2.2 for missing-window / missing-target cases.

### 2.2 Config combos — behaviour matrix (locked)

Today the product already treats **no Active from+until** as “not in window” for auto-select (`hasDefaultWindow` / `JourneySelector.hasWindow`). Lock the user-facing meaning of each combo:

| # | Active from+until | Target | Auto-show (app + widget live) | When user is **viewing** this journey | Leave By | Widget idle preview | Detail soft hints |
|---|-------------------|--------|-------------------------------|----------------------------------------|----------|---------------------|-------------------|
| **A** | Set | Set | In window + Active days → live | True next; Leave By if at/after Target (or swipe) | As leave-by brief | **TARGET TRAIN** + clock if preview uses Target; else window | Outside-window Target → §2.1 hint |
| **B** | **Empty** | Set | **No** (never matches clock window) | Manual / post-Save override only. True next; Leave By gated by Target | Gated by Target | Prefer other journeys that have windows. If this is the only previewable commute, show **TARGET TRAIN** + clock (extend idle finder to allow Target-only when no windowed journey ranks higher — see below) | Hint under Timing: **Set Active hours so this journey can show automatically.** |
| **C** | Set | **Empty** | In window → live | True next; **Leave By on soonest** (no Target gate) | Always (with time-to-station) | Primary = **window** (6:00–9:00); label **NEXT JOURNEY** (not Target) | No Target/Active mismatch hint. Remind me on still needs Target to Save |
| **D** | **Empty** | **Empty** | **No** | Manual view: true next; Leave By on soonest | On soonest | Skip for idle ranking (no window to schedule). Fall through to other journeys or Near me idle | Optional quiet Timing hint: **Add Active hours to show this journey on a schedule.** (only if no stronger hint). Target stays optional |

**Rules of thumb**

1. **Active hours** = when the journey may **auto-appear** (app schedule + widget live). No pair → never auto-live; user must open it (or U-05 override after create).  
2. **Target** = which train gets **Leave By** (and reminders / idle clock). No Target → Leave By = soonest; idle must not say TARGET TRAIN.  
3. **Neither** is valid for a route-only journey (planning / visitor). Don’t block Save.  
4. Soft hints **nudge**; they never block Save (except existing Remind me ↔ empty Target).

**Widget idle — Target-only journeys (combo B):**  
`NextCommutePreview` today skips `!hasWindow`. **Change:** if no windowed journey wins the next-commute search, allow a configured journey that has **Target + Active days** (no window) as idle preview: label **TARGET TRAIN**, primary = Target clock, day word from Active days. If multiple, pick soonest Target on an allowed day (same day-offset search spirit as today).

**App main when combo B/D and not manually overridden:** existing scheduled-journey logic (no match) → other journey in window or Near me — unchanged.

---

## 3. Rename map (all user-visible “Preferred”)

Sweep app + widget + About/Help/privacy if they say Preferred in this sense. **Ship this table:**

| Surface | Old | New |
|---------|-----|-----|
| Journey detail label | Preferred train | **Target train** |
| Journey detail hint | (keep meaning) | **First train at or after this time.** |
| Live app orientation (when Leave By hidden) | Preferred 7:30 | **Target 7:30** |
| Widget medium live hint | Preferred 7:30 | **Target 7:30** |
| Widget idle face label | NEXT JOURNEY (with preferred clock as primary) | **TARGET TRAIN** when showing the target clock; if no target and showing window range (6:00–9:00), keep a journey/window label — **NEXT JOURNEY** or **ACTIVE HOURS** is OK for window-only; Tim locked **Target Train** for the preferred-clock idle case |
| Toasts / errors / Save block | “preferred” / “usual train” if any | **target train** |
| Template wizard / coaches | preferred train | **target train** |
| `#preferred-hint` on main (if used) | Preferred… | **Target…** |

**Widget idle (explicit):** When idle primary is the target clock (e.g. **7:30**), label = **TARGET TRAIN** (textAllCaps → TARGET TRAIN), not **NEXT JOURNEY**. Day word under the clock unchanged (Today / Thursday / …).

Code/IDs may stay `preferred*` / `preferredHint` — update **strings** Jim paints to the user.

---

## 4. Implementation notes

1. Move `#detail-preferred-field` (+ hint) out of `#detail-remind-expanded`.  
2. Stop JS that hides the field when Remind me is off.  
3. Grep `Preferred` / `preferred train` / `NEXT JOURNEY` in `public/` + Android widget bind paths; replace user strings per §3.  
4. `preferredHintForJourney` (or equivalent) → `"Target " + clock`.  
5. Idle snapshot label today `"Next Journey"` → `"Target Train"` when primary is target clock.  
6. Wire Active hours ↔ Target outside check → soft hint (§2.1).  
7. Combo hints §2.2 (B/D Timing copy); idle Target-only fallback when no windowed next commute.  
8. Leave By / live face follow leave-by brief; combo **C** = no Target gate.

---

## 5. Acceptance

| Check | Pass |
|-------|------|
| Remind me **off** | **Target train** visible and editable |
| No user-visible “Preferred train” in journey detail / live hint / medium widget | Yes |
| Idle widget with target 7:30 + Active window | Label **TARGET TRAIN**, primary **7:30** |
| Idle with Active window, no Target | Window primary; **not** TARGET TRAIN |
| Combo **B**: Target set, Active empty | Timing hint to set Active hours; Save OK; manual view Leave By uses Target |
| Combo **C**: Active set, Target empty | Live Leave By on soonest; Remind me on still blocks Save without Target |
| Combo **D**: neither | Save OK; no auto-show; Leave By on soonest when viewing |
| Target 7:30, Active 8:00–9:00 | Hint **Target train is outside Active hours.**; Save still works |
| Widen Active to include 7:30 | Hint clears |
| Leave-by brief acceptance | Uses **Target** copy |

---

## 6. After web + widget string changes

`npm run cap:sync` + debug install for Tim.
