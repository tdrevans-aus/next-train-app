# FB-26: `pin-state.js` API + pin-resolution fixtures

**Status:** **Complete** (Aug 2026)  
**Backlog:** FB-26 (Phase 3 — pin / display contract)  
**Depends on:** FB-25 module split (`train-navigation.js`, `nearby-mode.js`)  
**Related:** `docs/jim-brief-journey-pin-preferred-target.md`, `docs/codebase-inventory.md` §3.1–3.2

---

## 1. Problem

Pin and hero-face logic is spread across:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Web journey pin | `public/train-navigation.js` | Override/dismiss/preferred resolution, swipe/skip, leave pin advance |
| Web hero render | `public/app.js` | `heroTrip = skip ? next : pinTrip ?? next`, secondary next line, leave card |
| Web nearby pin | `public/nearby-mode.js` | Session pin hold, board face, reminders |
| Android journey | `JourneyPinHelper.java` | Widget/reminder pin resolution |
| Android nearby | `NearbyPinHelper.java` | Near-me pin hold + trip lookup |
| Android widget | `WidgetPinResolver.java` | Soonest pinned across journeys + nearby |
| iOS | `ios/Shared/JourneyPinHelper.swift` | Mirrors Android journey rules |

Swipe, pin tap, and “Next train” advance can diverge because there is no single documented contract or shared test vectors.

---

## 2. Goal

1. **`public/pin-state.js`** — pure, clock-injectable module exporting one resolution entry point plus small predicates.
2. **`qa/fixtures/pin-resolution/*.json`** — shared vectors consumed by web QA, Android JVM tests, and (later) iOS XCTest.
3. **Naming cleanup** — align “true next”, “pin trip”, “hero trip”, and `resolveActiveNextTrip` comments across web + native.

Non-goals for FB-26: changing product rules, esbuild bundle (FB-35), or deleting native schedule code.

---

## 3. Module shape (Option A — matches FB-25)

Plain IIFE on `window.nextTrainPinState`, loaded after `journey-model.js` and before `train-navigation.js`:

```html
<script src="pin-state.js"></script>
<script src="train-navigation.js"></script>
```

`train-navigation.js` and `nearby-mode.js` become thin wrappers that delegate pin resolution / display face to `nextTrainPinState`, keeping swipe DOM and persistence in place.

---

## 4. Clock injection

All time-sensitive functions accept an optional `clock` (or use `init({ getClock })`):

```ts
type PinClock = {
  nowMs: number;           // epoch ms
  perthDateKey: string;    // "YYYY-MM-DD" Australia/Perth
};
```

Default: `Date.now()` + existing `getPerthLocalDateKey()` from deps. Fixtures always pass explicit `clock` so web and JVM tests agree.

---

## 5. Input model

```ts
type PinMode = "journey" | "nearby";

type PinResolutionInput = {
  mode: PinMode;
  clock: PinClock;
  payload: ApiTrainPayload | null;   // normalized board / journey API data
  journey?: Journey | null;          // active journey when mode === "journey"
  nearbyPin?: NearbyPinSnapshot | null;
  skipTrains?: number;               // client skip index (journey swipe preview)
  journeyModeActive?: boolean;       // active-from/until gate
  nearbyModeActive?: boolean;
};
```

`ApiTrainPayload` matches existing `{ next, upcoming[], following? }` after `normalizeApiTrainData`.

---

## 6. Output model (`PinResolutionResult`)

Single object returned by `resolvePinState(input)`:

```ts
type PinResolutionResult = {
  // Trips (departure ISO is canonical identity)
  trueNextDeparture: string | null;
  pinDeparture: string | null;       // resolved pin target (override > preferred)
  heroDeparture: string | null;        // what the big hero shows
  leaveDeparture: string | null;       // leave-by / reminder target
  secondaryNextDeparture: string | null; // muted "Next · …" line; null = hidden

  // Flags
  isPinnedToday: boolean;              // pin chrome / filled icon
  heroShowsPin: boolean;               // hero matches pin (not swipe preview)
  isOverrideActiveToday: boolean;
  isPinDismissedToday: boolean;
  isSkipPreview: boolean;              // skipTrains > 0
  isHeroPinLockingSwipe: boolean;
  showSecondaryNext: boolean;
  leaveCardArmed: boolean;             // existing journeyLeaveCardArmed equivalent

  // Display
  heroLabel: "Next Train" | "Target train" | "Later train" | "Pinned Train";

  // Widget (native can ignore web-only fields)
  widgetFaceDeparture: string | null;  // same as hero when journey/nearby pin owns face
};
```

Trip objects stay in callers; the contract keys trips by **`departure` ISO** (same as `journeysDepartureMatch` / `CommuteSchedule.tripDepartureIso`).

---

## 7. Public API

### 7.1 Lifecycle

```js
nextTrainPinState.init(deps)
```

| Dep | Purpose |
|-----|---------|
| `getPerthLocalDateKey(clock?)` | Perth calendar day |
| `normalizeApiTrainData` | From train-times client |
| `normalizeJourney` | From journey-model |
| `preferredMinutesForLiveGlance(journey)` | Target clock parse |
| `liveHorizonMinutes(journey)` | `defaultUntil` horizon |
| `tripHasDeparted(trip, clock)` | Minute-granularity departed check |
| `journeyMatchesSchedule(journey, clock)` | Active window gate |
| `isNearbyPinHolding(pin, clock)` | Delegates nearby hold rules |

### 7.2 Pure resolution (fixture-tested)

```js
// Primary entry — hero + leave + secondary line contract
resolvePinState(input: PinResolutionInput): PinResolutionResult

// Granular helpers (used by native parity tests)
isJourneyOverrideActiveToday(journey, clock): boolean
isJourneyPinDismissedToday(journey, clock): boolean
isJourneyPinnedToday(journey, clock): boolean
sanitizeJourneyPinFields(journey, clock): Journey

resolveJourneyPinDeparture(payload, journey, clock): string | null
resolveTrueNextDeparture(payload, clock): string | null
resolveNearbyPinDeparture(payload, nearbyPin, clock): string | null
```

### 7.3 Display helpers (thin wrappers)

```js
resolveHeroDeparture(input): string | null
resolveLeaveDeparture(input): string | null
resolveSecondaryNextDeparture(input): string | null
getHeroLabel({ heroShowsPin, isSkipPreview, pinnedChrome }): string
```

### 7.4 Behaviour locks (from Jim brief + current code)

| Rule | `resolvePinState` behaviour |
|------|------------------------------|
| Journey hero default | `heroDeparture = pinDeparture ?? trueNextDeparture` when `skipTrains === 0` |
| Swipe preview | `skipTrains > 0` → `heroDeparture = trueNextDeparture` (after skip index), `isSkipPreview = true` |
| Leave-by target | `leaveDeparture = pinDeparture ?? trueNextDeparture` (pin wins over swipe preview) |
| Secondary line | Show iff `trueNextDeparture !== pinDeparture` and both non-null |
| Override today | Wins over preferred; stale override date → cleared |
| Dismissed today | **Target contract:** `pinDeparture = null`, hero/leave/widget use `trueNextDeparture` (align native `JourneyPinHelper`) |
| No preferred | `pinDeparture = null`, `isPinnedToday = false`, hero = true next |
| Nearby holding | `heroDeparture = pinDeparture` when mode nearby + holding |
| Swipe lock | `isHeroPinLockingSwipe`: journey override active OR nearby pin holding |

---

## 8. Known divergences to fix during implementation

| Area | Web today | Native today | FB-26 target |
|------|-----------|--------------|--------------|
| Dismissed + journey pin | `resolveJourneyPinTrip` → `null`; hero falls back in `app.js` | `resolvePinnedTrip` → true next | Explicit `trueNext` fallback in `pin-state.js` |
| No preferred | `resolveJourneyPinTrip` → `null` | true next fallback | Same as native |
| Widget journey face | Via Android/iOS helpers | `JourneyPinHelper.resolvePinnedTrip` | Fixtures assert `widgetFaceDeparture` |
| `isJourneyTargetPinnedToday` vs `isJourneyPinnedToday` | Web name in train-navigation | `isJourneyPinnedToday` in Java/Swift | Export both; deprecate web alias |

Document in PR description; do not change behaviour silently.

---

## 9. Migration plan (implementation PR after FB-25)

1. Add `pin-state.js` + fixture QA (`qa/pin-resolution-fixtures.mjs`).
2. Move pure functions from `train-navigation.js` into `pin-state.js`; re-export via `nextTrainNavigation` for compatibility.
3. Replace hero math in `app.js` `render()` with `resolvePinState(...)`.
4. Add `PinResolutionFixtureTest.java` reading JSON from assets or test resources (copy fixtures in Gradle task).
5. Rename native comments: “true next” = soonest non-departed upcoming; “active next” = hero face (may be pin).

---

## 10. Fixture schema

See `qa/fixtures/pin-resolution/schema.json` and `qa/fixtures/pin-resolution/README.md`.

Run validation (safe before FB-26 lands):

```bash
node qa/pin-resolution-fixtures.mjs --validate-only
```

Full resolution assertions run only when `IMPLEMENT_PIN_STATE=1` and `public/pin-state.js` is wired.

---

## 11. Acceptance

- [x] Every fixture passes `schema.json` validation (`node qa/pin-resolution-fixtures.mjs --validate-only`).
- [x] `resolvePinState` passes all 12 fixtures with `IMPLEMENT_PIN_STATE=1`.
- [x] `train-navigation.js` delegates pin resolution to `nextTrainPinState` (local fallbacks kept when module absent).
- [x] Android `PinResolutionFixtureTest` loads same JSON files (`copyPinResolutionFixtures` → `test/resources/pin-resolution/`).
- [x] `qa/pin-swipe-notify.mjs` green (5 scenarios, behaviour unchanged).
- [x] `qa/pin-behavior.mjs` green (global exclusivity + tab transitions — see `docs/pin-behavior.md`).
- [x] Hero / widget / leave-by use the same `pinDeparture` for identical inputs (`app.js` → `resolveJourneyPinState` / `resolvePinState`).

---

## 12. File map

| File | Purpose |
|------|---------|
| `docs/fb-26-pin-state-design.md` | This document |
| `public/pin-state.js` | Pure resolution module (`window.nextTrainPinState`) |
| `android/app/src/main/java/.../PinResolutionHelper.java` | Android parity implementation |
| `android/app/src/test/java/.../PinResolutionFixtureTest.java` | JVM fixture runner |
| `qa/fixtures/pin-resolution/schema.json` | JSON Schema |
| `qa/fixtures/pin-resolution/*.json` | 12 shared vectors |
| `qa/pin-resolution-fixtures.mjs` | Schema + optional resolution runner |
