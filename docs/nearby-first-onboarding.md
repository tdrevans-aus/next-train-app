# Design brief: Cold start = Nearby, then light wizard

**For:** Jim / Tim / Simon  
**Status:** **Implemented** — align with `public/app.js` / `public/index.html`  
**Supersedes in part:** first-run → empty commute / auto-open journey detail as the primary onboarding

---

## 1. Feedback received

Journeys still aren’t obvious. Proposal:

1. Initial load opens in **Nearest Station (Nearby) mode** — same as crosshair.  
2. After that board has populated, run a **small setup wizard**.  
3. Decide whether to keep default **Commute in / Commute out** journey shells, or start with **zero journeys**.

---

## 2. Verdict (short)

| Idea | Verdict |
|------|---------|
| Default home = Nearby Mode | **Yes — shipped.** |
| Coach / wizard after board loads | **Yes — shipped** (floating coach). |
| Seed empty “Daily Commute – in/out” | **No** — store starts with **zero** journeys. |
| Offer in/out as *templates when adding* | **Yes — shipped** (Morning / Evening / Custom). |

---

## 3. Why Nearby-first works

Friends don’t fail on icons; they fail on **abstract empty state** (“Set up your commute”) before they’ve felt the product.

Nearby answers the universal job in one glance: *next train near me.*  
Journeys answer a second job: *my repeat commute.* Lead with the first; introduce the second once they’ve seen value.

**Near me** stays meaningful: **recenter / re-enter Nearby** when they’re on a saved journey (or refresh location while already Nearby).

---

## 4. Wizard — as shipped

### Timing

1. Nearby board reaches a **useful populated state** (station + departure, or clear empty/error).  
   On return visits, **last Near me station** may paint departures immediately while GPS refines in the background (`nextTrainLastNearbyStation` in `localStorage`).  
2. Wait **6 seconds** of calm (`setTimeout` 6000 ms in app) with no meaningful tap — then show step 1.  
   Gives the board time to feel useful before the coach asks for attention.  
3. If the user taps meaningfully before that, **defer** for the session (`sessionStorage`).  
4. Never show over a loading spinner / while Nearby is still resolving.

**Unsupported region:** If nearest station is **> 50 km** away, Near me shows a **Perth rail only** empty state instead of a board. Onboarding step 1 uses softer copy: *Near me works when you're near Transperth stations.* See `docs/jim-brief-unsupported-region.md`.

*(Earlier builds used ~1.5–2.5s then 4s; current is **6s** so first open isn’t pushy.)*

### Structure (2 steps)

**Step 1 — title “Near you”**

- Body: *By default, Next Train shows departures at the station nearest you.*  
- Primary: **Got it**

**Step 2 — title “Saved commutes”**

- Body: *For a regular commute, save a journey (station, direction, when to leave). Open it anytime from Journeys.*  
- Pulses **Journeys** chrome control  
- Primary: **Set up a journey**  
- Secondary: **Maybe later** (sets `nextTrainOnboardingDone` — no nag every launch)

### Presentation — floating coach (shipped)

- Small card `min(92vw, 320px)`, translucent (~90% white), light scrim (~28% dim)  
- Not a heavy full-screen modal; app stays readable underneath  
- Step 1 lower on screen; step 2 anchored toward Journeys control  

---

## 5. Default journeys: in / out shells — dropped (shipped)

Fresh install: **`journeys: []`**. Templates only when adding.

---

## 6. Cold start after they have journeys (shipped intent)

1. **No journeys** → Nearby.  
2. **Has journeys** and current time in **active hours** → that journey.  
3. **Has journeys** but outside windows → **Nearby**.  
4. Manual journey pick / Near me tap overrides until context changes.

---

## 7. Chrome & mental model (shipped)

`Near me · Journeys · Menu`

- **Near me** = ephemeral / default utility board  
- **Journeys** = saved repeats only (never empty seeded shells)  
- **Menu** = help, widget, leave reminders, remove ads, About/Privacy, clear data  
- Onboarding teaches the Near me / Journeys split after they’ve seen trains  
- Widget + leave-reminder coaches are **staggered** across later app opens — not stacked after first journey save (`docs/jim-brief-stagger-stickiness-coaches.md`)

---

## 8. Acceptance criteria (met in current build)

1. First launch with location OK: Nearby board before any journey form.  
2. Wizard after populate + **6s** calm; floating translucent tip.  
3. Step 1 → Got it → Step 2; Set up / Maybe later as above.  
4. Fresh install: **zero** journeys.  
5. Add journey offers Morning / Evening / Custom templates.  
6. Active window → journey cold start; otherwise Nearby.

---

## 9. Summary

Nearby-first + floating post-load coach + empty journey store + create-time templates — **shipped**. Chrome is Near me · Journeys · Menu (not Help/Settings).
