# Jim brief: Soften location waits (first open + Morning wizard)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/app.js` (`findNearestStation`, `renderNearbyBoard`, `createJourneyFromCommuteTemplate`, `completeTemplateRouteSetup`, `showTemplateRouteCoach`), `public/index.html` (`#template-route-coach`), Nearby-first onboarding  
**Out of scope:** Changing onboarding coach copy/timing (6s gate stays), widget coaches, reminders, multi-city / unsupported-region logic beyond existing briefs

---

## 1. Problem

Two places make a slow GPS fix feel like a broken app:

1. **First open (Nearby)** — Screen sits on *Finding nearest station…* / hero *—* / *Locating you* with little motion or escape. `enableHighAccuracy: true` + up to **15s** timeout. User can dislike the app before it has shown a train.  
2. **Morning into town / Evening home** — `completeTemplateRouteSetup` **awaits** geolocation, **then** starts the 3-step template wizard. Dead wait on a blank-feeling detail before any coaching.

---

## 2. Goal

1. **First open:** Make locating feel alive, honest when slow, and escapable without waiting for GPS failure.  
2. **Commute templates:** Start the wizard **immediately**; run geo in the **background**; use a new first step about **Name** to mask the wait.

Do **not** drop Nearby-first or auto-route for Morning/Evening — only remove the *blocking* wait before useful UI.

---

## 3. Part A — First open / Near me locating UX

### Alive waiting state

While `nearbyLoading` (and equivalent first locate):

- Keep brand + chrome visible (as today).  
- Replace static *—* / *Locating you* with:
  - A small **spinner / wheel** in the hero (reuse an existing spinner pattern if one exists; otherwise a minimal CSS spinner).  
  - Primary status copy that can **advance by time**:

| After locate starts | Copy / UI |
|---------------------|----------|
| 0s | **Finding your nearest station…** + spinner — stay on this through a normal fix |
| ~7s | Same Finding… copy + **Don’t wait** button (no picker yet) |
| Don’t wait tapped | Show station picker (**Choose a station below**) |

Do **not** auto-open the station picker at 7s. Do **not** escalate copy at 12s (*This is taking a while…* dropped).

### Escape hatch

- **Don’t wait** (from ~7s) reveals the station picker on tap only.  
- Picking a station loads the board immediately (soonest direction — **no** direction step).  
- If GPS **succeeds later**, fill nearest station and refresh the board (unless user already picked).  
- If GPS **fails** after user already picked: keep their pick; don’t clobber.  

### Faster first fix

- **First locate** in a cold session: prefer **`enableHighAccuracy: false`** (or try low-accuracy first, then optionally refine). High accuracy is a common cause of long first waits.  
- Keep a reasonable timeout (15s OK for the slow path; prefer succeeding earlier with coarse fix).  
- Cache last successful nearby station for **subsequent** opens — **full brief:** `docs/jim-brief-nearby-cache-last-station.md` (paint times first, refine with GPS).  

### Onboarding

- Do **not** fire the Nearby onboarding coach while still in a hung locate with no board and no picker. Existing delay/gate stays; if still locating past the gate, wait until board shows **or** user has a station pick path (Don’t wait → picker counts).

### Acceptance (Part A)

1. First open shows spinner + *Finding your nearest station…* (not a dead *—*).  
2. A normal ~1–4s fix never shows Don’t wait — stays on Finding… until done.  
3. ~7s: **Don’t wait** appears; picker only after tap; Finding… copy stays.  
4. Late GPS success updates to nearest without wiping a manual pick.  
5. First fix is not stuck on high-accuracy-only when a coarse fix would work.

---

## 4. Part B — Morning / Evening wizard: Name-first while geo loads

Applies to **Morning into town** and **Evening home** on **first template setup** (same `shouldShowTemplateRouteCoach` / once-per-setup rules already in app). **Custom** already opens the wizard without a geo wait — leave Custom’s step order as today unless sharing the Name step is trivial; **not required**.

### Sequence

```
Tap Morning / Evening
  → open journey detail (Name + form visible)
  → start applyTemplateRoute / findNearestStation in background (do not await before coach)
  → show wizard step 1 (Name) immediately
  → user can Next anytime
  → step 2 (Route): show result if ready; else short “Finding…” then result / manual / error
  → step 3 Time to station
  → step 4 Active hours
  → Got it → mark wizard seen (existing behaviour)
```

### Wizard steps (4 when coach shows)

| Step | Title | Body (lean) | Highlight |
|------|--------|-------------|-----------|
| 1 | **Name** | *We’ve called this **Morning into town** (or **Evening home**). Change it anytime.* | `#detail-journey-name` |
| 2 | **Route picked for you** / **Pick your route** | Existing route copy when `configured`; if still locating: *Finding your nearest station…* + spinner; on fail: existing denial / couldn’t-fill copy | Route section |
| 3 | **Time to station** | Existing | Leave / time-to-station field |
| 4 | **Active hours** | Existing warmer copy | Active hours / window |

Primary button: **Next** on 1–3, **Got it** on 4.

### Race rules

1. Geo finishes on step 1 → fill station/direction quietly (hint under Use nearest OK). Do **not** auto-advance.  
2. User taps **Next** before geo done → step 2 may show locating state; **Next** enabled once station+direction set **or** user can pick manually (don’t soft-lock forever).  
3. Geo fails → step 2 uses existing error / pick-yourself copy.  
4. Reusable unfinished Morning shell: if coach should show, same Name-first + background route; if coach skipped (already seen / has journeys), still run auto-route without blocking on a blank wait if cheap — at minimum don’t regress auto-route.

### Acceptance (Part B)

1. Morning/Evening: wizard (when shown) appears **immediately** — no multi-second blank wait for GPS first.  
2. Step 1 is Name; geo runs in parallel.  
3. Step 2 reflects success, in-progress, or failure correctly.  
4. Time to station + Active hours unchanged in meaning.  
5. Wizard-once rules unchanged (no re-coach after first Got it / configured journey).  
6. Custom path still gets a coach on first setup without requiring geo.

---

## 5. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | Nearby loading copy timer + early picker; low-accuracy first locate; commute template: don’t await geo before `showTemplateRouteCoach`; 4-step wizard + Name step; background `completeTemplateRouteSetup` / apply route |
| `public/index.html` | Template wizard step markup for Name; optional spinner in hero / coach |
| `public/styles.css` | Spinner, locating states, Name-step highlight |
| `TESTING.md` | Rows for first-open locate + Morning Name-first |

---

## 6. Summary for Jim

> Soften GPS waits: (A) first Nearby open — spinner + *Finding…* for a normal fix; **Don’t wait** ~7s (no copy escalate at 12s); picker only on tap. Prefer faster/coarse first fix. (B) Morning/Evening — start wizard immediately with a **Name** step while nearest-station runs in the background; Route / Time to station / Active hours follow. Don’t block the UI on geolocation.
