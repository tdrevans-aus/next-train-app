# Testing — Next Train App

Manual smoke-test playbook and fixture API for local QA (including Cursor testing agents).

Fixture mode works **only with the local dev server** (`npm start`). Production / Vercel always uses live Transperth data.

## Quick start

```bash
npm start
```

Open in a browser:

```
http://localhost:3000/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth
```

| Query param | Purpose |
|-------------|---------|
| `reset=1` | Clears `localStorage` + `sessionStorage` once, then removes itself from the URL |
| `test=1` | Skips geolocation auto-setup so the first-run hero is reachable (for QA) |
| `fixture=<name>` | Uses deterministic mock train data (see table below) |
| `station` + `direction` | Seeds a configured journey (same as share links) |

List fixtures:

```bash
curl http://localhost:3000/api/fixtures
```

## Fixtures

Times are relative to **now** when the API responds, so countdowns stay stable for the session but drift on refresh (by design).

| Fixture | What you should see |
|---------|---------------------|
| `normal` | Hero: **18 minutes** to departure. Leave card: calm, leave in ~8 min. **Then** section shows a following train. Four trains available for swipe-left. |
| `urgent` | Leave card in **urgent** styling (~2 min to leave). |
| `late` | Leave card shows **you should have left** (~3 min late). Train still in 7 min. |
| `delayed` | Hero scheduled line visible. Status shows **5 min late**. |
| `ahead` | Live 1 min before schedule. Status **On Time**. No scheduled subline. |
| `estimated` | Live 2 min before schedule. Status **Estimated**. Hero subline shows **Estimated**. |
| `empty` | Hero: no upcoming trains. Leave card hidden. |
| `error` | Red error banner; “Update failed” timestamp. |

Example URLs:

```
/?reset=1&fixture=urgent&station=Edgewater%20Stn&direction=Perth
/?reset=1&fixture=late&station=Edgewater%20Stn&direction=Perth
/?reset=1&fixture=empty&station=Edgewater%20Stn&direction=Perth
/?reset=1&fixture=error&station=Edgewater%20Stn&direction=Perth
```

Direct API check:

```bash
curl "http://localhost:3000/api/next-train?fixture=normal&station=Edgewater%20Stn&direction=Perth"
```

## Smoke tests

Run against `http://localhost:3000` unless noted. Report each as **PASS** / **FAIL** with steps and what you observed.

### 1. First launch (no journey)

1. Open `http://localhost:3000/?reset=1&test=1` (no `station` / `direction`).
2. **Expect:** Setup hero — “Tap to get started”. Leave card hidden. Journey switcher hidden. Settings opens when hero is tapped.

`test=1` skips geolocation auto-configuration so this flow is reliable in automation.

### 2. Configured journey (fixture)

1. Open the quick-start URL above (`fixture=normal`).
2. **Expect:** Route shows `Edgewater Stn, towards Perth`. Hero shows **18 minutes** + departure time. Leave card visible below. Platform + Status populated. “Then” section visible.

### 3. Journey switcher

1. From test 2, open journey switcher and pick **Daily Commute - out** (or add a second configured journey in settings).
2. **Expect:** Switcher label updates. Selection does not snap back on refresh.

### 4. Swipe — later train

1. `fixture=normal` URL.
2. Swipe **left** on the hero card.
3. **Expect:** Departure time advances to the next train (~34 min bucket). Swipe hint disappears and does not return (stored in `localStorage` key `nextTrainSwipeHintSeen`).

### 5. Swipe — earlier train (undo)

1. After test 4, swipe **right** on the hero.
2. **Expect:** Returns to the first train (~18 min).

### 6. Urgent leave styling

1. Open `fixture=urgent` URL.
2. **Expect:** Leave card uses urgent border/colour. Countdown says leave in ~2 minutes.

### 7. Late leave styling

1. Open `fixture=late` URL.
2. **Expect:** Leave card label “You should have left”. Late styling on leave card.

### 8. Empty state

1. Open `fixture=empty` URL.
2. **Expect:** No crash. Hero shows no trains message. No leave card.

### 9. API error

1. Open `fixture=error` URL (or mock a 500 after a successful empty response).
2. **Expect:** Error message visible. App remains usable (settings still open).
3. If the last good response had trains → hero stays visible, dimmed, with **Update failed — times may be out of date**.
4. If the last good response had no trains (or none loaded) → hero shows **Couldn't refresh times**, not “No upcoming trains”.

### 10. Settings — overlap validation

1. Open settings → edit a journey → set default window **06:00–09:00** on journey A and overlapping window on journey B → Save.
2. **Expect:** Alert / block with overlap message. Invalid window not saved.

### 11. Settings — Save vs Done

1. Edit leave-before minutes, tap **Done** without Save, reopen journey.
2. **Expect:** Value unchanged. After **Save**, value persists.

### 12. Live API (optional)

1. Open `http://localhost:3000/?reset=1&station=Edgewater%20Stn&direction=Perth` (no `fixture`).
2. **Expect:** Real Transperth times load. Countdowns change over time.

## Testing agent prompt

Paste into a **fresh** Cursor agent chat (not the coding session):

> You are a QA agent. Follow `TESTING.md` in this repo. Run `npm start` if needed. Execute smoke tests 1–11 using fixture URLs. Use the browser tools. Output a table: test #, PASS/FAIL, notes. Do not fix code unless I ask.

## Android / Capacitor

The native app loads the hosted Vercel API — **fixtures do not apply**. After web smoke passes:

1. `npm run cap:sync`
2. Run on device/emulator
3. Manually verify swipe gestures and journey switcher (tests 4–5, 3)

## Storage keys (for debugging)

| Key | Storage | Purpose |
|-----|---------|---------|
| `nextTrainSettings` | localStorage | Journeys + active journey |
| `nextTrainSkip:<journeyId>` | sessionStorage | Client-side train skip offset |
| `nextTrainManualJourneyOverride` | localStorage | Manual journey picker override |
| `nextTrainSwipeHintSeen` | localStorage | Swipe hint dismissed |

Clear everything: `/?reset=1` or DevTools → Application → Clear site data.
