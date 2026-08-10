# Design: Homescreen widget (stickiness #1)

**For:** Jim (implement) / Tim (product) / Simon (design)  
**Backlog:** Rank **#1** in `docs/stickiness-ideas.md`  
**Status:** **Shipped (Android)** — redesign: train-first + 2×1 default  
**Job:** Let Journey-savers see **next train** and **when to leave** without opening the app  

**As-shipped notes:** Coach *“See your next train — and when to leave — on your home screen.”* Menu **Add home screen widget**. Shared `CommuteSchedule`; 120‑min stale trust; deep link `nexttrain://journey/{id}`. Widget shows **next** train/leave for the selected journey (not preferred-train reminder targeting).  

---

## 1. Goal & non-goals

### Goal

A glanceable home-screen widget that matches the main screen hierarchy for the user’s **active saved journey**:

> **Next Train** · **N min** · clock · **Leave in N min** · route

Tap opens the app into **Journey mode** for that journey.

### Non-goals

- Nearby / nearest-station board in the widget  
- Ads in the widget  
- Configuring journeys inside the widget  
- Second-by-second live countdown (OS won’t allow reliable 1s refresh)  
- Preferred-train targeting (that’s leave reminders only)  
- Watch / CarPlay / Tesla (separate backlog items)  
- Multiple widget instances with different journeys (nice later; v1 = one smart journey)

---

## 2. Who it’s for

**Journey-savers only** as the happy path.  
If they have **zero journeys**, the widget still installs but shows an empty/setup state that deep-links to **Add a journey** (see §6).

Not aimed at Nearby-only users — those people open the app for Near me; widget stickiness is the commute habit.

---

## 3. Which journey does the widget show?

Same rules as Journey mode cold start / in-app active journey:

1. If current time falls in a journey’s **active hours** → that journey  
2. Else if user has a **last-selected / manual override** journey (same spirit as in-app) → that one  
3. Else if exactly **one** journey exists → that one  
4. Else (multiple, none in window) → last selected / first configured journey — still show **next** leave/train if computable; **do not** fall back to Nearby; **do not** show “Outside active hours” on the widget (quiet; journey still visible)

**Shipped pick:** Active-hours match → else `activeJourneyId` → else sole journey without a window → else first configured.

**Time to station** off: hide the leave line; right side can show route only.

---

## 4. Content hierarchy (match main screen)

### Left / primary — brand + train

- Label: **`NEXT TRAIN`** (same words as in-app hero label)  
- Big number: relative **`12 min`** / **`NOW`** (minutes until **departure**)  
- Train clock under number: `3:52` (device time format)

### Right / secondary — leave (buffer on)

- **`Leave in 8 min`** / **`Leave now`** / **`Leave 8 min ago`** (overdue leave-by — not bare “8 min late”, so it isn’t read as a delayed train)  
- Urgency colour on the **leave line only** (teal stays on the train number — mirrors main screen)  
- Station crumb under leave: **`Edgewater`** only (not `Edgewater → Perth` — fits 2×1)  
- Tiny: `Updated 3:41` (or stale warning)
- **No** swipe between trains on the widget (in-app only)

### Buffer off

- No leave line; show route (+ updated) on the right.

### Do not show

- Packed sausage lines (`Train … · Leave … · Outside active hours`)  
- “Outside active hours” crumb  
- Platform / Then / ads  

---

## 5. Sizes & layouts

### Android

| Size | Cells | Role |
|------|-------|------|
| **Small (default)** | **2×1** | Horizontal strip: left Next Train + countdown + clock · right leave + route + updated |
| **Medium** | Resize up (wider/taller) | Same hierarchy, more breathing room + delay status crumb |
| **Large** | Optional later | Still no “Then” |

**Default add size is 2×1** (`targetCellWidth=2`, `targetCellHeight=1`) — two icon slots, not a 2×2 square.

### iOS (with iOS app)

| Family | Layout intent |
|--------|----------------|
| **systemSmall** | Same train-first hierarchy (tight) |
| **systemMedium** | Same as Android medium |
| **accessory** / lock-screen (later) | Out of scope for widget v1 |

Visual language: light surface, teal accent on the **train** number, urgency on leave copy only.

---

## 6. States

| State | Widget shows | Tap opens |
|-------|----------------|-----------|
| **Loading / first paint** | Journey route if known · `…` · no fake times | App → Journey mode |
| **Live OK** | §4 content | App → that journey in Journey mode |
| **Stale** (cached times, refresh failed) | Last times + dimmed or warning updated line | Same |
| **No upcoming trains** | Route · `No trains` · updated | Same |
| **No journeys** | `Next Train` · `Add a journey` · short subcopy | App → Journey empty / add flow |
| **Location/API N/A** | N/A for journey widget — uses saved station, not GPS | — |

Empty state copy (no journeys):

- Primary: **Add journey**  
- Sub: **Save your commute**

---

## 7. Interaction

- **Single tap anywhere on widget** → deep link:  
  - Has journey: `…` open app → **Journey mode**, select that journey id, refresh times  
  - No journey: open app → **Add a journey** / empty Journey mode CTA  
- **No** dedicated Refresh button — tap opens app (hard refresh).  
- Widget does **not** switch to Nearby on tap (even if app default is Nearby) — respect commute intent  

Deep link: `nexttrain://journey/{id}` and `nexttrain://journey/new`.

---

## 8. Refresh & data

### Sources

1. Journey config mirrored into native prefs (widget cannot read WebView `localStorage`).  
2. Fetch live times via `/api/next-train`.  
3. Cache last successful payload + absolute leave-by / departure for local recompute.

### Update cadence

| Trigger | Behaviour |
|---------|-----------|
| Widget added / unlock / app open | Network refresh ASAP |
| Periodic network | ~**15 minutes** |
| Local paint (countdown) | **Every 1 minute** when leave-in / train-in ≤ ~45–60 min (recompute from cached absolutes; no API) |
| Departure minute passed | Promote cached **following** train locally, or show **Updating…** until network refresh; missed advance alarm triggers refresh |
| Far from leave / idle | No extra local tick — next network refresh is enough |

Show honest **Updated** timestamps. Never pretend second-level accuracy.

### Fail softly

Network fail → keep last good times + stale line. Don’t blank the big number if cache exists.

---

## 9. Discovery in product (so people add it)

1. After first journey save → **do not** auto-prompt widget/reminders that session. Stagger per `docs/jim-brief-stagger-stickiness-coaches.md` (2nd open → widget; 3rd / weekday → reminders).  
2. Menu → **Add home screen widget** (always) — help dialog: one-line benefit + **Add widget** button (Android request-pin); long-press widget-picker steps only if pin fails or is unsupported.  
3. Do **not** block Nearby board or spam daily.

---

## 10. Naming & store listing

- Widget label in picker: **Next Train**  
- Description: **Next train and leave-by for your saved journey**  
- Screenshot: 2×1 strip with Next Train countdown + Leave in  

---

## 11. Privacy & monetization

- No ads in widget  
- No extra personal data beyond what the app already uses for that journey  
- Ad-free IAP unrelated to widget

---

## 12. Acceptance criteria

1. Default add size is **2×1**; user can resize up to a roomier layout.  
2. Hierarchy matches main screen: **Next Train** primary, leave secondary (hidden if buffer off).  
3. **Updated** (or stale) line present after first successful load.  
4. Tap → **Journey mode** for that journey (not Nearby).  
5. Zero journeys → empty CTA → tap to add.  
6. No “Outside active hours” / packed secondary sausage.  
7. Journey edits sync to widget after refresh.  
8. No ads.  
9. iOS parity with iOS app ship.

---

## 13. Out of scope → later

| Later | Backlog |
|-------|---------|
| Denser countdown / Live Activity | Stickiness #4 |
| Preferred-train on widget | No — reminders only |
| Nearby widget | Don’t dilute commute widget |

---

## 14. Summary for Jim

> Android widget default **2×1**: **Next Train** countdown + clock on the left; **Leave in** + **station** + Updated on the right. Station only (not full route). No swipe. Match main-screen hierarchy and label. Network ~15 min; local 1‑min paint near leave from cached absolutes. Next train for display; preferred train stays reminders-only. Tap → Journey mode. No Nearby, no ads.
