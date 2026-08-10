# Jim brief: Unsupported region — flag + block Near me

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/app.js` (`findNearestStation`, `enterNearbyMode`, `applyCommuteMode`, cold start), `docs/nearby-first-onboarding.md`, `docs/feature-backlog.md`  
**Out of scope:** Multi-city APIs (FB-02/FB-03), changing journey create/edit, iOS

---

## 1. Decision (locked)

When the user is **too far from the Perth Transperth rail network**:

| Capability | Behaviour |
|------------|-----------|
| **Near me** | **Not available** — do not show a nearby departures board |
| **Flag** | Clear message that this app is for Perth rail |
| **My Journeys** | **Still allowed** — add/edit journeys (e.g. planning ahead, visiting Perth later, VPN/geo quirks) |
| **Menu / Reminders / Widget help** | Unchanged |

---

## 2. Threshold

**Unsupported** when nearest catalog station is **> 50 km** away (`findNearestStation()` → `distanceKm > 50`).

- Use the same station list / haversine path as today.  
- If location **denied** or **fails**: do **not** treat as unsupported region — use existing permission / error UX for Near me. Unsupported is only “we know where you are and you’re too far.”

Constant: e.g. `UNSUPPORTED_REGION_KM = 50` in `app.js` (named, easy to tweak).

---

## 3. UX

### Entering Near me while unsupported

Tap **Near me** (or cold-start that would open Nearby):

- Do **not** populate a live nearby board.  
- Show a **full-canvas empty state** (same visual language as journey empty / nearby fallback):

**Title:** Perth rail only  

**Body:** Next Train’s live **Near me** board works near Transperth stations. You’re outside that area right now.  

**Secondary:** You can still save journeys under **My Journeys** for when you’re in Perth.  

**Optional button:** **My Journeys** → `enterJourneyMode()` / empty setup or live journey if they have one.

Chrome: **Near me** can stay visible but should not look “active” with a fake board. Prefer:

- Enter a dedicated **unsupported nearby** state (not journey mode), **or**  
- Soft-disable: tap Near me → show the empty state above (still a mode, just no departures).

**Do not** auto-jump to Journey mode without explanation — show the flag first.

### Cold start

If `shouldDefaultToNearby()` and location resolves unsupported:

- Same Perth-rail empty state (not spinner forever, not a wrong “nearest” station 2000 km away).  
- Skip or soften Nearby onboarding step 1 if it claims “shows departures nearest you” while unsupported — either skip step 1 or use copy: *Near me works when you’re near Transperth stations.*

### Journey mode / templates

- **Unchanged.** Morning/Evening may still try nearest station; if geo is far, existing “couldn’t auto-fill” / pick station UX is fine.  
- Do **not** block opening My Journeys or saving routes.

### Returning to coverage

When user later taps Near me and `distanceKm ≤ 50` → normal Nearby board.

---

## 4. Copy (final)

| Surface | Copy |
|---------|------|
| Title | **Perth rail only** |
| Body | **Next Train’s Near me board works near Transperth stations. You’re outside that area right now.** |
| Hint | **You can still save journeys under My Journeys for when you’re in Perth.** |
| CTA (optional) | **My Journeys** |

---

## 5. Acceptance

1. Simulate / adb location far from WA (e.g. Sydney) → Near me shows **Perth rail only**, no direction chips / fake board.  
2. From that state, user can open **My Journeys** and create a journey.  
3. Location ≤ 50 km from a Transperth station → Near me works as today.  
4. Location denied ≠ unsupported empty state (existing permission messaging).  
5. Web + Android webview both behave.

---

## 6. Files (expected)

| File | Change |
|------|--------|
| `public/app.js` | Threshold helper; gate `enterNearbyMode` / cold start |
| `public/index.html` | Empty-state markup if not built purely in JS |
| `public/styles.css` | Empty-state styles (reuse nearby-fallback / hero-empty patterns) |
| `docs/nearby-first-onboarding.md` | Note unsupported gate |
| `TESTING.md` | Unsupported region row |
| `docs/feature-backlog.md` | Mark related item if listed |

---

## 7. Summary for Jim

> If nearest station &gt; 50 km, **block Near me** with a **Perth rail only** empty state. **Allow My Journeys** as normal. Location errors stay separate from unsupported.
