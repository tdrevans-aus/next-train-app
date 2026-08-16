# Jim brief: Journey mode pin + Preferred target (v2.2.0)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Release:** **v2.2.0** (with or just after Near me pin — FB-14)  
**Backlog:** **FB-20**  
**Supersedes for Journeys hero/widget:** **U-11 B** / `docs/jim-brief-leave-by-preferred-gate.md` (true-next-as-default-face). Leave-by maths and journey detail Target settings remain.  
**Related:** `docs/jim-brief-nearby-pin-leave-by.md` (Near me pin — same pin chrome language); `docs/jim-brief-preferred-always-visible.md` (Target in journey detail); `docs/jim-brief-target-train-master.md`  
**Out of scope:** Near me GPS walk time; FB-17 flag glyph (journey uses **pin**, not flag); Pro

---

## 1. Product rule (one sentence)

In **active journey** mode, the big hero (and widget) show the **pinned** train — by default the journey’s **Preferred target** — not every true-next departure; a quiet **Next** line appears only when true next ≠ pin.

**Why:** Busy lines (e.g. Edgewater every ~5 min) make “true next from Active-from” useless if you always leave ~7:20 — you do not want the face/widget narrating every train from 6:00.

---

## 2. Locked decisions

| Topic | Lock |
|-------|------|
| Settings name | Journey detail keeps a lasting **Preferred target** (storage may stay `preferredTrainTime`) |
| Default pin in Active window | Preferred target is **pinned by default** (hero = first departure **at or after** preferred clock time, same at-or-after rule as today) |
| Day override | Pinning another train sets **today’s pin only** — does **not** rewrite Preferred target |
| Restore preferred pin | Next Active window (next day / next Active start for that journey), **or** user explicitly pins the preferred train again |
| Swipe | Browse only — does **not** move the pin until user taps pin |
| Hero while pinned | Show **pinned** train (label as Target / Your train — not “Next Train”) |
| Secondary true next | **Only when true next ≠ pin** — one muted line under hero (e.g. `Next · 7:12 · Pl 2`). When pin *is* the soonest train, **omit** the line |
| Widget | Same face as hero while journey is active and pin holds — **pinned train**, not true-next spam |
| Active from / until | **Keep** on commutes (explicit journey window; target must sit inside — **U-14**) |
| Leave by / reminders | Follow **today’s pin** (preferred or day override) + existing walk buffer / Remind me / Live countdown for that journey |
| Pin icon | Same **map pin** as Near me: outline unpinned / filled accent pinned (**not** the FB-17 flag) |

---

## 3. Behaviour matrix (journey Active window)

| Situation | Hero | Secondary “Next” line | Widget |
|-----------|------|-------------------------|--------|
| Preferred set, no day override | At-or-after preferred (pinned) | Show iff a sooner true-next exists | Pinned |
| User pinned another departure today | That departure | Show iff true-next ≠ that pin | Pinned |
| Preferred already departed; no later override | Advance pin to next upcoming at-or-after preferred stack (or next upcoming on this journey) — **do not** fall back to 6:05 spam of every early board entry unless nothing is pinable | As above | As hero |
| No Preferred target set | True next (classic); pin optional | Hidden (hero already is next) | True next |
| User swipes but does not pin | Hero preview may follow swipe **or** stay on pin until pin tap — **prefer: swipe moves hero preview; pin still marks the “catch” train**; Leave by stays on **pin** not the mere preview. If that is too sharp for v1, acceptable v1: swipe moves both preview and requires re-pin to commit override. **Implement v1: swipe changes displayed train; pin required to make it today’s pin / leave-by target.** | Based on pin vs true next | Follow **pin**, not ephemeral swipe, once a pin exists |
| Outside Active window | Existing idle / next-commute / Near me rules | — | No journey pin takeover |

### 3.1 Day override persistence

- Store something like `journeyPinOverrideIso` + `journeyPinOverrideDate` (local calendar day in Perth) or equivalent per journey.  
- Cleared when: new local day / new Active window starts, user pins preferred again, user clears pin, journey deleted.  
- **Never** write override clock into `preferredTrainTime` unless we add a separate “Save as preferred” later (not this brief).

### 3.2 Unpin in journey mode

- If Preferred exists: unpinning day override → fall back to **preferred pin** (not “no pin”).  
- Clearing preferred in journey detail → no default pin; hero = true next.  
- Do not leave the user in a “no face” state during Active hours.

---

## 4. U-11 B — what changes

| Before (U-11 B) | After (this brief) |
|-----------------|-------------------|
| Hero = **true next** always in journey mode | Hero = **pin** (default = preferred) |
| Leave by gated to target / swipe | Leave by follows **pin** (preferred or day override) |
| Widget aligned to true next + gated leave | Widget shows **pin** during Active window |

Document U-11 / leave-by-preferred-gate as **superseded for hero/widget face** in Journeys. Do not reintroduce Catch this train.

---

## 5. UI notes (Simon)

- Hero eyebrow while pinned: **Target** / time toward destination — avoid calling the big number “Next Train” when it is not.  
- Secondary line: muted, one line, **only if next ≠ pin**.  
- Pin control: same chrome language as Near me (FB-14).  
- Journey detail: label lasting setting **Preferred target** (or “Preferred target train”) so it is not confused with today’s pin.

---

## 6. Code touchpoints

| Area | Where |
|------|--------|
| Face / skip / leave gate | `public/app.js` — replace true-next-as-default journey face with pin resolution; secondary next line |
| Preferred storage | Existing `preferredTrainTime` / Target master |
| Day override | New per-journey or session fields; Perth local date |
| Widget | Sync pinned journey trip in widget payload; `WidgetUiBuilder` / commute preview |
| Leave / strip | Schedule against pin departure, not raw true next |

---

## 7. Acceptance

1. Active journey + Preferred 7:30 → hero/widget show first at-or-after 7:30, not 6:00.  
2. If a sooner train exists, muted **Next · …** line shows; if pin is soonest, no secondary line.  
3. Pin another train → hero/widget/leave-by follow it **today only**; Preferred in settings unchanged.  
4. Next Active day → preferred pin restored.  
5. Swipe without pin does not permanently override; committing override requires pin tap (v1).  
6. Active from/until still control when journey owns the screen.  
7. Near me pin (FB-14) behaviour unchanged; when both could apply, follow existing mode (Near me vs Journeys chrome) — Journeys active face uses journey pin; Near me mode uses Near me pin.  
8. Regression: journey detail Preferred / walk / Remind me / Live countdown still save and schedule.

---

## 8. Non-goals

- Removing Active from/until on commutes (locked U-15 / U-14)  
- Auto-saving day pin into Preferred  
- Flag icon (FB-17) — use **pin**  
- Changing Near me FB-14 locks  
