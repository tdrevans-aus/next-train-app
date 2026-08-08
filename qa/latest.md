# Smoke Test Report — http://localhost:3000

**Run:** Saturday 8 Aug 2026, ~13:14–13:19 AWST  
**Environment:** Local dev server (`npm start`), Cursor IDE browser automation  
**Playbook:** `TESTING.md` smoke tests 1–11 with fixture URLs

**Summary:** 11 PASS · 0 FAIL (smoke) · 0 open bugs

| # | Test | Result | Notes |
|---|---|------|--------|
| 1 | First launch (`?reset=1&test=1`) | **PASS** | Setup hero “Tap to get started”; leave card + switcher hidden; hero tap opens My Journeys |
| 2 | Configured journey (`fixture=normal`) | **PASS** | Route `Edgewater, towards Perth`; hero **18 minutes** / 13:34; leave in **8 min**; platform 2; Then row visible |
| 3 | Journey switcher | **PASS** | Two journeys (in 06:00–09:00, out 15:00–18:00). Switched to **Daily Commute - out** → `Perth, towards Mandurah`; after 35s refresh still out journey |
| 4 | Swipe left (`fixture=normal`) | **PASS** | Depart 13:33→13:49 (~**34 min**); swipe hint dismissed (`nextTrainSwipeHintSeen=1`) |
| 5 | Swipe right (undo) | **PASS** | Returned to first train (~18 min / 13:33) |
| 6 | Urgent styling (`fixture=urgent`) | **PASS** | Leave card `urgent` class; “Leave in **2 minutes**” |
| 7 | Late styling (`fixture=late`) | **PASS** | Label “You should have left”; `late` class; “**3 minutes late**” |
| 8 | Empty state (`fixture=empty`) | **PASS** | “No upcoming trains”; leave card hidden; no crash |
| 9 | API error (`fixture=error`) | **PASS** | Cold load: “Couldn't refresh times” + error banner. After normal load then error refresh: stale hero (**18 min** kept), “Update failed — times may be out of date”, leave card `stale`; settings still opens |
| 10 | Overlap validation | **PASS** | Overlapping 06:00–09:00 on out journey blocked with overlap alert; window stayed 15:00–18:00 |
| 11 | Save vs Done | **PASS** | Changed leave-home buffer to 15, back + Done without save → still 10; detail Done (save) → persisted 15 |

## Failures & risks

| Issue | Severity | Test | Status |
|-------|----------|------|--------|
| Leave-buffer sliders icon → Cancel → Done wipes all journeys | **High** | Ad hoc (late leave card) | **Fixed** — retest **PASS** (14:31 AWST) |
| Hero `stale` class not applied on error refresh (leave card dims; timestamp message correct) | Low | 9 | Open |

### Leave-buffer editor wipes journeys (High) — fixed

**Originally reproduced:** Saturday 8 Aug 2026, ~13:50 AWST · local `npm start`

**Steps**

1. Fresh install — clear storage (`/?reset=1`) or new user with auto-configured **Daily Commute - in/out**
2. Reach late leave state (“You should have left”) — e.g. `?test=1&fixture=late` with configured journeys
3. Tap **Edit leave-home buffer** (sliders icon on leave card)
4. Tap **Cancel** on journey detail
5. Tap **Done** to close settings

**Expected:** Journeys unchanged; main screen still shows configured commute.

**Actual (before fix):** Journey routes cleared. `localStorage.nextTrainSettings` reverted to empty **Daily Commute - in/out** (no station/direction). App returned to setup hero (“Set up your commute”). After Cancel, My Journeys list showed **0 items** (settings draft never loaded).

**Fix:** `openLeaveBufferSettings()` now loads `settingsDraftJourneys` before opening detail; `saveJourneyListToSettings()` refuses to persist an empty draft over configured journeys; cancel restores the snapshot even when the draft was not pre-loaded.

**Retest:** Saturday 8 Aug 2026, ~14:31 AWST · **PASS**

- Before: 2 configured journeys (Edgewater→Perth, Perth→Mandurah)
- After sliders → Cancel → Done: **2** journeys in list after Cancel; both still configured in `localStorage`; route `Edgewater, towards Perth`; no setup hero

## Recommended follow-ups

1. **Test 9:** Optionally add `stale` class to hero element for visual parity with leave card.
2. **Android:** Re-verify tests 3–5 on device (fixtures N/A on Vercel/Capacitor).
