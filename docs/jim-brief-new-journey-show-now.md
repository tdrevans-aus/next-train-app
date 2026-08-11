# Jim brief: After saving a new journey, show it on the main screen (U-05 B)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **locked B**  
**Related:** `saveJourneyDetailFromForm`, `setManualJourneyOverride`, `maybeAutoSelectJourney`, `isUnconfiguredJourney` (`public/app.js`)  
**Out of scope:** Changing Active hours matching rules; widget journey selection; forcing Reminder on

---

## 1. Problem

User adds a **3rd (Custom)** journey, leaves Active from/until blank, Saves. Main screen still shows **Evening home** because that journey’s Active hours match now. Correct for the clock — but after creating a journey, people expect to **see the one they just made**.

---

## 2. Decision (locked — Tim)

**Option B:** On **first successful Save of a new journey** (was unconfigured / first time this id becomes a real configured journey), select it on the main screen **now**.

Do **not** steal the screen on every edit of an already-saved journey.

---

## 3. Behaviour

When `saveJourneyDetailFromForm` succeeds and the save is a **new** journey:

1. Set `activeJourneyId` to that journey’s id.  
2. Call **`setManualJourneyOverride(journeyId)`** (same path as picking a journey from the switcher) so `maybeAutoSelectJourney` / Active-hours auto-pick does not immediately snap back to Evening home.  
3. Close / return to main → Journey mode showing the new journey (fetch times as today).

### What counts as “new”

Treat as new if **before** this save the journey was **unconfigured** (`isUnconfiguredJourney`) **or** it did not exist yet in persisted `settings.journeys` as configured — i.e. first time this row becomes a configured commute.

Re-saving an already configured journey (edit name, times, etc.) → keep today’s active-journey logic (no forced switch).

### Override lifetime

Reuse existing manual-override rules (clears when the Active-hours window context changes, etc.). No new persistence model.

### Edge cases

- First-ever journey Save — already selects a journey; still fine to set override.  
- New journey **with** Active hours that overlap another — Save may still block on overlap; if Save succeeds, show the new one.  
- User then picks another journey from the switcher — existing override behaviour.

---

## 4. Acceptance

1. Evening home active by hours; add Custom (no Active from/until) → Save → main shows **Custom**, not Evening home.  
2. Later, when override expires / window context changes, auto Active hours can select Evening again.  
3. Edit an existing Evening home and Save → does **not** force a jump solely because of this brief (unless other existing logic does).  
4. `npm run cap:sync` after web changes.

---

## 5. Files (likely)

| File | Change |
|------|--------|
| `public/app.js` | In `saveJourneyDetailFromForm`: detect new journey; set active + `setManualJourneyOverride` |
| `TESTING.md` | New journey Save shows that journey |
| `docs/undecided-issues.md` | U-05 → Resolved B |

---

## 6. Summary for Jim

> First Save of a **new** journey → show it on the main screen now (`activeJourneyId` + `setManualJourneyOverride`). Don’t do this on every edit of an already-configured journey. Active hours auto-select resumes under existing override rules.
