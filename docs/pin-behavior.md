# Pin behaviour — product rules & implementation

**Status:** Canonical reference (Aug 2026)  
**Audience:** Implementers, QA, widget/native parity  
**Related briefs:** `docs/jim-brief-nearby-pin-leave-by.md` (Near me), `docs/jim-brief-journey-pin-preferred-target.md` (Journeys target), `docs/fb-23-four-tab-chrome-design.md` (Routes), `docs/fb-26-pin-state-design.md` (resolution contract)

---

## 1. One global rule

**At most one train is pinned at a time** across:

| Surface | Pin type | Storage |
|---------|----------|---------|
| **Near me** | Session + persisted nearby pin | `settings.nearbyPin` |
| **My Journeys** (commute) | Target train (preferred by default) | `journey.preferredTrainTime` + `journeyPinDismissedDate` |
| **My Journeys** (commute) | Day override | `journeyPinOverrideIso` + `journeyPinOverrideDate` |
| **My Routes** | Day override only | Same override fields on route journey |

Pinning on any surface **must clear** the other pin types. Enforcement lives in `clearOtherPinnedTrains()` and `reconcileExclusivePinState()` in `public/app.js`.

---

## 2. Pin types in detail

### 2.1 Near me pin

- User pins a departure on the nearby board.
- **Hold window:** show pinned train until **1 minute after departure** (`NEARBY_PIN_HOLD_MS = 60_000`), or until `holdingUntilMs` in persisted settings (whichever applies).
- **Persists** in `settings.nearbyPin` so widget + cold start can restore it.
- **Does not** mutate journey `remindMe`, `preferredTrainTime`, or route settings.
- Leave card + **Time to station** slider appear while holding (`docs/jim-brief-nearby-pin-leave-by.md`).
- Swiping changes preview only; pin moves on **explicit pin tap** (or Next Train advance while pinned).

### 2.2 Journey target train (commute)

- In **Active hours**, a journey with **Preferred target** is pinned by default (hero shows at-or-after preferred departure).
- **Unpin today** sets `journeyPinDismissedDate` to today's Perth date key — target stays off for the rest of the day.
- **Does not** clear `preferredTrainTime`; next Active window (or explicit re-pin) restores default target pin.
- Re-pin on a commute with a preferred target **restores the default target pin** (clears dismiss + day override, focuses preferred slot) — hero stays **Target train** / blue chrome. Day override + green **Pinned Train** chrome applies only when pinning a **different** departure (e.g. after swiping to a later train).
- Day override (`journeyPinOverrideIso` + `journeyPinOverrideDate`) pins a different departure **for today only**.

### 2.3 Route pin (My Routes)

- Routes have no preferred target; pin sets **today's day override** on the route journey.
- Pinning a route **always dismisses** commute target pins on other journeys (even if `activeJourneyId` still points at a commute).

---

## 3. Exclusivity matrix

When the user pins train **X**, all other pin slots clear:

| New pin | Clears nearby | Clears route override | Dismisses commute target |
|---------|---------------|----------------------|--------------------------|
| Near me | — | Yes | Yes (`journeyPinDismissedDate = today`) |
| Journey / route | Yes | Yes (except kept journey) | Yes (except kept journey) |

**Kept journey** logic (`clearOtherPinnedTrains({ type: "journey", journeyId })`):

- Pinning a **route** keeps only that route's override; commute targets elsewhere are dismissed.
- Pinning a **commute** keeps that commute's target/override; does not keep a route pin on another id.

**Reconcile on tab entry:** if multiple pins are somehow active (stale storage, race), `reconcileExclusivePinState(keep)` picks one winner:

1. Explicit `keep` from caller (e.g. `{ type: "nearby" }` when entering Journeys with a nearby pin).
2. Else if Near me is active and has a pin → keep nearby.
3. Else if in Journeys/Routes mode → keep route pin or commute target on current tab.

---

## 4. Tab & mode transitions

### 4.1 Near me → My Journeys

1. `exitNearbyMode()` — syncs session pin to settings **only when a nearby session exists** (must not wipe `nearbyPin` on a cold path with no session).
2. `ensureActiveJourneyForTab("journeys")` — if a commute has an **active target pin** today, that journey becomes active (before schedule auto-pick).
3. If `hasPersistedNearbyPin()` → `reconcileExclusivePinState({ type: "nearby" })` **before** restoring journey face.
4. `requestJourneyTargetFaceRestore()` + `restoreJourneyTargetPinFace()` — positions the hero on the **preferred target slot** (skip index), even when the target is **unpinned** for today. Re-applied after the next board fetch in `render()`.
5. `restoreJourneyTargetPinFace()` must **not** call `clearJourneyPinDismissed()` (that would re-pin a target the user dismissed).

### 4.2 My Journeys → Near me

1. Entering Near me may call `syncRestoredNearbyPinState()` → reconcile with nearby keep if settings pin is holding.
2. Pinning in Near me calls `clearOtherPinnedTrains({ type: "nearby" })` first.

### 4.3 Cold start / page load

1. `readStoredSettings()` drops expired `nearbyPin` (`isNearbyPinSettingsHolding`).
2. `applyJourneysMode` or `enterNearbyMode` reconciles if multiple pins detected.
3. `isNearbyPinHolding()` (session) and `hasPersistedNearbyPin()` (settings) must use the **same** hold semantics (`holdingUntilMs` when present, else departure + 60s).

---

## 5. Storage fields

| Field | Journey | Meaning |
|-------|---------|---------|
| `preferredTrainTime` | Commute | Lasting target clock (`HH:MM`); default pin in Active window |
| `journeyPinDismissedDate` | Commute | Perth date key when user unpinned target **today** |
| `journeyPinOverrideIso` | Commute / route | ISO departure pinned for today only |
| `journeyPinOverrideDate` | Commute / route | Perth date key for override |
| `nearbyPin` | Root settings | `{ station, direction, departureIso, holdingUntilMs, … }` |
| `nearbyLeaveBeforeMinutes` | Root | Walk buffer for Near me leave card (separate from journey) |

Dismissed date and override date are cleared automatically when the calendar day rolls (Perth) during `sanitizeJourneyPinDismissed` / `sanitizeJourneyPinOverride`.

---

## 6. Hero / widget face (resolution)

Display contract is implemented in `public/pin-state.js` (`resolvePinState`). Summary:

| Mode | Hero shows | Secondary "Next" line |
|------|------------|------------------------|
| Near me, pin holding | Pinned departure | If true next ≠ pin |
| Journey, target pinned | Target / override | If true next ≠ pin |
| Journey, dismissed today | True next | Hidden |
| Route, override today | Override departure | Per route rules |
| Swipe preview (`skipTrains > 0`) | Preview train | Leave-by still follows pin |
| **Unpinned target** | When hero shows the **preferred target** departure, label **Target train** + blue chrome — even if `journeyPinDismissedDate` is today. Other trains use Next/Later. Pin icon stays **unfilled**. | Hidden when not on target |
| **C. Outside active day** (e.g. Sat for Mon–Fri) | Default: next **remind-day target** (live trip or **preview** `Monday · 07:30`, no countdown). Swipe browse: today's **Next train** / **Later train** — never Target chrome on today's board. | Optional muted true next on default target face |
| **C browse (unpinned)** | Live board train user swiped to | Hidden; leave-by hidden until user pins |

**Outside active day swipe:** `isHeroPinLockingSwipe` is **false** — user may browse today's board; tab return / jump-to-target restores remind-day target (preview or live slot). Inside the active window, FB-20 pin/target swipe lock is unchanged.

**Preview hero** (`heroMode: preview`): when the remind-day target is not in `upcoming`, hero shows preferred clock + day word (widget parity); no departure countdown; pin icon unfilled.

**Widget** (native + `widgetFaceDeparture` in pin-state) uses a stricter priority than the in-app hero:

1. **Any pinned train** — nearby pin (when holding), route override, or commute target pin (not dismissed today).
2. **No pin → target train** — preferred target in Active hours, even when dismissed/unpinned. No true-next fallback.
3. **Neither → nothing** — empty/idle widget face (outside Active hours with no overnight departed target also yields nothing).

Nearby pin beats journey when holding. See `docs/jim-brief-nearby-pin-leave-by.md` § D1.

**Widget live header** (when a train is shown): **Pinned train** or **Target train** only — never "Next Train". Pinned train when nearby pin, day override, or commute target is pinned today; Target train when showing the preferred train without an active pin. Idle outside-hours faces keep **Target Train** / **Next Journey** unchanged.

---

## 7. Code map

| Concern | Primary file |
|---------|----------------|
| Global exclusivity | `public/app.js` — `clearOtherPinnedTrains`, `reconcileExclusivePinState`, `hasPersistedNearbyPin` |
| Journey pin tap / dismiss | `public/train-navigation.js` — `toggleHeroPin`, `persistJourneyPinDismissed`, `restoreJourneyTargetPinFace` |
| Nearby pin session | `public/nearby-mode.js` — `setNearbyPinFromTrip`, `syncNearbyPinSettings`, `exitNearbyMode`, `isNearbyPinHolding` |
| Pure resolution | `public/pin-state.js` — `resolvePinState` |
| Settings normalize | `public/journey-model.js` — `isNearbyPinSettingsHolding`, journey pin sanitize |
| Native widget | `android/.../JourneyPinHelper.java`, `NearbyPinHelper.java`, `WidgetPinResolver.java` |

---

## 8. Regression tests

Automated (web, Playwright):

```bash
node qa/pin-resolution-fixtures.mjs --validate-only
IMPLEMENT_PIN_STATE=1 node qa/pin-resolution-fixtures.mjs
```

Fixtures for outside active day: `journey-saturday-monday-target`, `journey-saturday-monday-preview-no-trip`, `journey-saturday-browse-true-next`, `journey-saturday-monday-target-stale-skip`. See `docs/jim-brief-outside-day-hero-browse.md`.

```bash
node qa/pin-behavior.mjs
```

Included in release gate:

```bash
npm run test:web:release
# or
node qa/run-all.mjs --release
```

| Test area | What it guards |
|-----------|----------------|
| Journey pin clears nearby + route | `clearOtherPinnedTrains({ type: "journey" })` |
| Route pin dismisses commute target | Route keep must not preserve commute target |
| Nearby pin dismisses commute target | Nearby keep + target dismissed |
| Tab return | `enterJourneyMode()` does not re-pin dismissed target |
| Persisted nearby survives exit | `exitNearbyMode` without session does not wipe `nearbyPin` |
| Hold expiry consistency | `holdingUntilMs` respected after page load |

Fixture-level resolution (web + Android JVM):

```bash
node qa/pin-resolution-fixtures.mjs --validate-only
IMPLEMENT_PIN_STATE=1 node qa/pin-resolution-fixtures.mjs
```

Pin + swipe + Next Train matrix:

```bash
node qa/pin-swipe-notify.mjs
```

Manual: `TESTING.md` §45 (pin exclusivity & tab transitions).

---

## 9. Common failure modes (fixed Aug 2026)

| Symptom | Cause | Fix |
|---------|-------|-----|
| Both target + Near me pinned | Reconcile not run on pin or tab entry | `clearOtherPinnedTrains` on pin; reconcile in `enterJourneyMode` |
| Target re-pins after unpin + tab switch | `restoreJourneyTargetPinFace` cleared dismiss | Removed `clearJourneyPinDismissed` from restore |
| Nearby pin lost leaving Near me | `exitNearbyMode` synced null snapshot | Sync only when `nearbySession` exists |
| Nearby pin cleared on load | Session hold used departure+60s but settings used `holdingUntilMs` | Align `nearbyPinExpiryMs` / restore `holdingUntilMs` on session pin |

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-08-17 | Document exclusivity, tab transitions, hold semantics; add `qa/pin-behavior.mjs` release gate |
